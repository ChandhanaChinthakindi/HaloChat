import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { ImpactFeedbackStyle } from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble } from "@/components/ChatBubble";
import {
  API_BASE,
  COMPANION_TYPES,
  type CompanionType,
  type Message,
  useCompanions,
} from "@/context/CompanionContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { cancelCheckin, scheduleCheckin } from "@/utils/notifications";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { splitIntoMessages, detectMood, formatLastSeen, formatDate } from "@/utils/chatUtils";

const ABSENCE_MS = 4 * 60 * 60 * 1000;

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, getMessages, addMessage, deleteMessages, updateRelationshipLevel, addMemoryNote, clearMessages, deleteCompanion } =
    useCompanions();
  const { authFetch, accessToken, user } = useAuth();

  const companion = companions.find((c) => c.id === id);

  const userAge = React.useMemo(() => {
    if (!user?.dateOfBirth) return undefined;
    const birth = new Date(user.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [user?.dateOfBirth]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [milestoneLevel, setMilestoneLevel] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [mood, setMood] = useState("🌿");
  const serverIdMapRef = useRef<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [retryContent, setRetryContent] = useState<string | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const moodScale = useSharedValue(1);
  const moodStyle = useAnimatedStyle(() => ({ transform: [{ scale: moodScale.value }] }));

  const abortRef = useRef<AbortController | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const checkinFiredRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const companionIdRef = useRef<string | undefined>(undefined);
  const companionNameRef = useRef<string>("");
  const companionTypeRef = useRef<string>("");
  const addMemoryNoteRef = useRef(addMemoryNote);
  const updateRelationshipLevelRef = useRef(updateRelationshipLevel);
  const authFetchRef = useRef(authFetch);
  const accessTokenRef = useRef(accessToken);
  const sessionExchangesRef = useRef(0); // meaningful exchanges (user msg > 15 chars) this session

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { progress: kbProgress } = useReanimatedKeyboardAnimation();
  const inputBarPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      kbProgress.value,
      [0, 1],
      [bottomPadding + 8, 8],
      Extrapolation.CLAMP,
    ),
  }));

  const recordPulse = useSharedValue(1);
  const recordStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordPulse.value }],
    opacity: recordPulse.value,
  }));

  useEffect(() => {
    if (isRecording) {
      recordPulse.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1, false
      );
    } else {
      recordPulse.value = withTiming(1);
    }
  }, [isRecording]);

  // Keep refs current so the unmount cleanup can read latest values
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { companionIdRef.current = companion?.id; }, [companion?.id]);
  useEffect(() => { companionNameRef.current = companion?.name ?? ""; }, [companion?.name]);
  useEffect(() => { companionTypeRef.current = companion?.type ?? ""; }, [companion?.type]);
  useEffect(() => { addMemoryNoteRef.current = addMemoryNote; }, [addMemoryNote]);
  useEffect(() => { updateRelationshipLevelRef.current = updateRelationshipLevel; }, [updateRelationshipLevel]);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

  // On mount: cancel any pending check-in (user came back)
  useEffect(() => {
    if (companion?.id) cancelCheckin(companion.id);
  }, [companion?.id]);

  // On unmount: summarize session + schedule a check-in notification
  useEffect(() => {
    return () => {
      const msgs = messagesRef.current;
      const cId = companionIdRef.current;
      const cName = companionNameRef.current;
      const cType = companionTypeRef.current;
      const assistantCount = msgs.filter((m) => m.role === "assistant").length;
      if (!cId) return;

      // Schedule a check-in if the user had a real conversation
      if (assistantCount >= 2) {
        const recentContent = msgs
          .slice(-6)
          .filter((m) => m.role === "user")
          .map((m) => m.content.slice(0, 80));
        scheduleCheckin(cId, cName, cType as any, 4, recentContent);
      }

      // Session depth bond bonus — rewards staying in a real conversation
      const exchanges = sessionExchangesRef.current;
      if (exchanges >= 4 && cId) {
        const sessionBonus = exchanges >= 8 ? 4 : 2;
        updateRelationshipLevelRef.current(cId, sessionBonus).catch(() => {});
      }

      // Generate conversation summary if long enough
      if (assistantCount >= 3) {
        authFetchRef.current(`${API_BASE}/companion/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: msgs.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.summary) {
              addMemoryNoteRef.current(cId, `Recent chat: ${data.summary}`);
            }
          })
          .catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!id || !companion) return;
    getMessages(id).then(({ messages: msgs }) => {
      initialMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      setMessages(msgs);
      setIsLoaded(true);

      if (msgs.length === 0) {
        // Brand-new conversation — show typing bubble immediately, then let companion break the ice
        setIsStreaming(true);
        setTimeout(() => triggerIntroduction(), 800);
        return;
      }

      // If the user has been away for 4+ hours and had a real conversation before,
      // let the companion reach out first
      const timeSinceLast = companion.lastMessageTime
        ? Date.now() - companion.lastMessageTime
        : Infinity;
      const hadRealConvo = msgs.filter((m) => m.role === "assistant").length >= 2;

      if (hadRealConvo && timeSinceLast > ABSENCE_MS && !checkinFiredRef.current) {
        checkinFiredRef.current = true;
        setTimeout(() => triggerCompanionCheckin(msgs), 1000);
      }
    });
  }, [id]);

  const baseMessages = [...messages];
  if (isStreaming) {
    baseMessages.push(
      streamingContent
        ? { id: "__streaming__", role: "assistant" as const, content: streamingContent, timestamp: Date.now() }
        : { id: "__typing__", role: "assistant" as const, content: "", timestamp: Date.now() }
    );
  }

  // Inject date separators between days
  type FlatItem =
    | (Message & { kind?: undefined })
    | { id: string; kind: "separator"; label: string; timestamp: number };

  const withSeparators: FlatItem[] = [];
  let lastDateStr = "";
  const filteredBase = searchQuery
    ? baseMessages.filter(
        (m) => !m.id.startsWith("__") && m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : baseMessages;
  for (const msg of filteredBase) {
    const dateStr = formatDate(msg.timestamp);
    if (dateStr !== lastDateStr && !msg.id.startsWith("__")) {
      withSeparators.push({ id: `__sep_${dateStr}__`, kind: "separator", label: dateStr, timestamp: msg.timestamp });
      lastDateStr = dateStr;
    }
    withSeparators.push(msg as FlatItem);
  }
  const reversedMessages = [...withSeparators].reverse();

  const triggerIntroduction = useCallback(async () => {
    if (!companion) return;

    setIsStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;
    let fullContent = "";
    const savedMessages: Message[] = [];

    const apiMessages = [
      {
        role: "user" as const,
        content: `[New conversation — first ever message. Send your opening message: introduce yourself in your own voice, make it feel like genuinely meeting someone new. You don't know their name yet — ask for it naturally. One message only.]`,
      },
    ];

    try {
      const response = await fetch(`${API_BASE}/companion/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
        },
        body: JSON.stringify({
          companionId: companion.id,
          companionType: companion.type,
          companionGender: companion.gender,
          userAge,
          userGender: user?.gender || undefined,
          companionName: companion.name,
          memoryNotes: companion.memoryNotes,
          customPersonality: companion.customPersonality,
          relationshipLevel: companion.relationshipLevel,
          messages: apiMessages,
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error === "DAILY_LIMIT_REACHED" ? "DAILY_LIMIT_REACHED" : "RATE_LIMITED");
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) fullContent += parsed.content;
          } catch { /* ignore */ }
        }
      }

      setStreamingContent("");
      const parts = splitIntoMessages(fullContent);
      for (let i = 0; i < parts.length; i++) {
        if (controller.signal.aborted) break;
        const delay = Math.min(Math.max(parts[i].length * 28, 500), 2200);
        await new Promise<void>((r) => setTimeout(r, delay));
        if (controller.signal.aborted) break;

        const msg: Message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          role: "assistant",
          content: parts[i],
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, msg]);
        const serverId = await addMessage(companion.id, msg);
        if (serverId) serverIdMapRef.current.set(msg.id, serverId);
        savedMessages.push(msg);

        if (i < parts.length - 1) {
          await new Promise<void>((r) => setTimeout(r, 250 + Math.random() * 250));
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      // Non-critical — if intro fails, user can still type first
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortRef.current = null;

      if (savedMessages.length > 0) {
        setMood(detectMood(savedMessages[savedMessages.length - 1].content));
        moodScale.value = withSequence(
          withSpring(1.4, { damping: 8 }),
          withSpring(1, { damping: 12 })
        );
      }
    }
  }, [companion, user?.gender, addMessage]);

  const triggerCompanionCheckin = useCallback(
    async (loadedMessages: Message[]) => {
      if (!companion) return;

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;
      let fullContent = "";
      const savedMessages: Message[] = [];

      const apiMessages = [
        ...loadedMessages.slice(-8).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        {
          role: "user" as const,
          content:
            "[The user just returned after being away for a while. Reach out naturally — a brief, warm message as if you noticed they were gone. 1-2 sentences only. No need to explain or mention the time gap.]",
        },
      ];

      try {
        const response = await fetch(`${API_BASE}/companion/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
          },
          body: JSON.stringify({
            companionId: companion.id,
            companionType: companion.type,
            companionGender: companion.gender,
            userAge,
            userGender: user?.gender || undefined,
            companionName: companion.name,
            memoryNotes: companion.memoryNotes,
            customPersonality: companion.customPersonality,
            relationshipLevel: companion.relationshipLevel,
            messages: apiMessages,
          }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error === "DAILY_LIMIT_REACHED" ? "DAILY_LIMIT_REACHED" : "RATE_LIMITED");
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No response body");

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) fullContent += parsed.content;
            } catch { /* ignore */ }
          }
        }

        const parts = splitIntoMessages(fullContent);
        for (let i = 0; i < parts.length; i++) {
          if (controller.signal.aborted) break;
          const delay = Math.min(Math.max(parts[i].length * 28, 500), 2200);
          await new Promise<void>((r) => setTimeout(r, delay));
          if (controller.signal.aborted) break;

          const msg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            role: "assistant",
            content: parts[i],
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, msg]);
          const checkinServerId = await addMessage(companion.id, msg);
          if (checkinServerId) serverIdMapRef.current.set(msg.id, checkinServerId);
          savedMessages.push(msg);

          if (i < parts.length - 1) {
            await new Promise<void>((r) => setTimeout(r, 250 + Math.random() * 250));
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (err?.message === "DAILY_LIMIT_REACHED") {
          Alert.alert("Daily limit reached", "You've used today's credits for this companion. Come back tomorrow!", [{ text: "OK" }]);
          return;
        }
        if (err?.message === "RATE_LIMITED") {
          Alert.alert("Slow down!", "You're sending too many messages. Wait a moment and try again.", [{ text: "OK" }]);
          return;
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;

        if (savedMessages.length > 0) {
          const lastContent = savedMessages[savedMessages.length - 1].content;
          setMood(detectMood(lastContent));
          moodScale.value = withSequence(
            withSpring(1.4, { damping: 8 }),
            withSpring(1, { damping: 12 })
          );
          await hapticsNotification();
        }
      }
    },
    [companion, addMessage]
  );

  const extractMemories = useCallback(
    async (msgs: Message[]) => {
      if (!companion || msgs.length < 4) return;
      try {
        const res = await authFetchRef.current(`${API_BASE}/companion/extract-memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: msgs.slice(-12).map((m) => ({ role: m.role, content: m.content })),
            existingNotes: companion.memoryNotes,
          }),
        });
        const data = (await res.json()) as { facts?: string[] };
        for (const fact of data.facts ?? []) {
          if (fact.trim()) {
            await addMemoryNote(companion.id, fact);
            await updateRelationshipLevel(companion.id, 3); // +3 bond per personal fact learned
          }
        }
      } catch { /* silent */ }
    },
    [companion, addMemoryNote, updateRelationshipLevel]
  );

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || !companion) return;
      const userContent = text.trim();
      setInput("");
      setRetryContent(null);

      const userMsg: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };

      const currentMessages = [...messages];
      const prevLevel = companion.relationshipLevel;
      setMessages((prev) => [...prev, userMsg]);
      const userServerId = await addMessage(companion.id, userMsg);
      if (userServerId) serverIdMapRef.current.set(userMsg.id, userServerId);
      await hapticsImpact();

      const apiMessages = [
        ...currentMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userContent },
      ];

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;
      let fullContent = "";
      const savedMessages: Message[] = [];

      try {
        const response = await fetch(`${API_BASE}/companion/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
          },
          body: JSON.stringify({
            companionId: companion.id,
            companionType: companion.type,
            companionGender: companion.gender,
            userAge,
            userGender: user?.gender || undefined,
            companionName: companion.name,
            memoryNotes: companion.memoryNotes,
            customPersonality: companion.customPersonality,
            relationshipLevel: companion.relationshipLevel,
            messages: apiMessages,
          }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error === "DAILY_LIMIT_REACHED" ? "DAILY_LIMIT_REACHED" : "RATE_LIMITED");
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No response body");

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) fullContent += parsed.content;
            } catch { /* ignore */ }
          }
        }

        // Display each part separately with typing indicator between them
        const parts = splitIntoMessages(fullContent);
        for (let i = 0; i < parts.length; i++) {
          if (controller.signal.aborted) break;
          const delay = Math.min(Math.max(parts[i].length * 28, 500), 2200);
          await new Promise<void>((r) => setTimeout(r, delay));
          if (controller.signal.aborted) break;

          const msg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            role: "assistant",
            content: parts[i],
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, msg]);
          const serverId = await addMessage(companion.id, msg);
          if (serverId) serverIdMapRef.current.set(msg.id, serverId);
          savedMessages.push(msg);

          // Brief pause between parts so typing indicator reappears
          if (i < parts.length - 1) {
            await new Promise<void>((r) => setTimeout(r, 250 + Math.random() * 250));
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (err?.message === "DAILY_LIMIT_REACHED") {
          Alert.alert("Daily limit reached", "You've used today's credits for this companion. Come back tomorrow!", [{ text: "OK" }]);
          return;
        }
        if (err?.message === "RATE_LIMITED") {
          Alert.alert("Slow down!", "You're sending too many messages. Wait a moment and try again.", [{ text: "OK" }]);
          return;
        }
        setRetryContent(userContent);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;

        if (savedMessages.length > 0 && !savedMessages[0].content.includes("having trouble")) {
          // Bond score: quality of user message + bonus for returning after absence
          const msgLen = userContent.length;
          const msgPoints = msgLen < 15 ? 0 : msgLen < 60 ? 1 : msgLen < 150 ? 2 : 3;
          const absenceBonus =
            companion.lastMessageTime && Date.now() - companion.lastMessageTime > ABSENCE_MS ? 2 : 0;
          const bondPoints = msgPoints + absenceBonus;

          if (bondPoints > 0) {
            await updateRelationshipLevel(companion.id, bondPoints);
            const newLevel = Math.min(100, prevLevel + bondPoints);
            const crossed = [20, 40, 60, 80].find((m) => prevLevel < m && newLevel >= m);
            if (crossed !== undefined) setMilestoneLevel(crossed);
          }

          if (msgPoints > 0) sessionExchangesRef.current += 1;

          const lastContent = savedMessages[savedMessages.length - 1].content;
          setMood(detectMood(lastContent));
          moodScale.value = withSequence(withSpring(1.4, { damping: 8 }), withSpring(1, { damping: 12 }));
          await hapticsNotification();
          const allMsgs = [...currentMessages, userMsg, ...savedMessages];
          extractMemories(allMsgs);
        }
      }
    },
    [isStreaming, companion, messages, addMessage, updateRelationshipLevel, extractMemories]
  );

  const handleSend = () => sendTextMessage(input);

  const handleMessageAction = useCallback((msgId: string, content: string) => {
    if (isSelectMode) return; // in select mode, tap toggles selection instead
    Alert.alert("Message", undefined, [
      {
        text: "Copy text",
        onPress: () => Share.share({ message: content }),
      },
      {
        text: "Select messages",
        onPress: () => {
          setIsSelectMode(true);
          setSelectedIds(new Set([msgId]));
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const serverId = serverIdMapRef.current.get(msgId) ?? msgId;
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
          deleteMessages(companion!.id, [serverId]).catch(() => {});
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [isSelectMode, companion, deleteMessages]);

  const getMessageStatus = useCallback((msg: Message): "sent" | "seen" | undefined => {
    if (msg.role !== "user" || msg.id.startsWith("__")) return undefined;
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx === -1) return undefined;
    return messages.slice(idx + 1).some((m) => m.role === "assistant") ? "seen" : "sent";
  }, [messages]);

  const handleMessageTap = useCallback((msgId: string) => {
    if (!isSelectMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, [isSelectMode]);

  const handleDeleteSelected = useCallback(async () => {
    if (!companion || selectedIds.size === 0) return;
    const clientIds = Array.from(selectedIds);
    const serverIds = clientIds.map((id) => serverIdMapRef.current.get(id) ?? id);
    setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    setIsSelectMode(false);
    setSelectedIds(new Set());
    await deleteMessages(companion.id, serverIds);
  }, [companion, selectedIds, deleteMessages]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Voice", "Voice messages are available on iOS and Android only.");
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Microphone permission is needed for voice messages.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      await hapticsImpact(ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) throw new Error("No recording URI");

      const formData = new FormData();
      formData.append("audio", { uri, type: "audio/m4a", name: "voice.m4a" } as any);

      const res = await authFetchRef.current(`${API_BASE}/companion/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Transcription failed");
      const data = (await res.json()) as { transcript?: string };
      const transcript = data.transcript?.trim();

      if (transcript) {
        await sendTextMessage(transcript);
      } else {
        Alert.alert("No speech detected", "Please try speaking more clearly.");
      }
    } catch {
      Alert.alert("Error", "Failed to transcribe. Please check your API key.");
    } finally {
      setIsTranscribing(false);
    }
  }, [sendTextMessage]);

  const handleMicPress = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleMoodSelect = async (moodValue: number) => {
    setShowMoodModal(false);
    if (companion && moodValue > 0) {
      try {
        await authFetch(`${API_BASE}/companions/${companion.id}/mood`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood: moodValue }),
        });
      } catch {}
    }
    router.back();
  };

  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Companion not found</Text>
      </View>
    );
  }

  const typeInfo = COMPANION_TYPES[companion.type];
  const initials = companion.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const relLabel =
    companion.relationshipLevel < 20 ? "New" :
    companion.relationshipLevel < 40 ? "Acquaintance" :
    companion.relationshipLevel < 60 ? "Friend" :
    companion.relationshipLevel < 80 ? "Close" : "Bonded";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.background, colors.muted, colors.background] as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (isSelectMode) { setIsSelectMode(false); setSelectedIds(new Set()); return; }
            abortRef.current?.abort();
            if (sessionExchangesRef.current > 0) {
              setShowMoodModal(true);
            } else {
              router.back();
            }
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={() => !isSelectMode && router.push(`/profile/${companion.id}`)}
          style={styles.headerCenter}
        >
          <LinearGradient
            colors={companion.avatarGradient}
            style={styles.headerAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </LinearGradient>
          <View>
            <Text style={[styles.headerName, { color: colors.foreground }]}>
              {isSelectMode ? `${selectedIds.size} selected` : companion.name}
            </Text>
            {!isSelectMode && (
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                {isStreaming
                  ? `${typeInfo.emoji} typing...`
                  : isTranscribing
                  ? `${typeInfo.emoji} transcribing...`
                  : `${typeInfo.emoji} ${formatLastSeen(companion.lastMessageTime)}`}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Mood indicator — hidden in select mode */}
        {!isSelectMode && (
          <Animated.Text style={[styles.moodEmoji, moodStyle]}>
            {mood}
          </Animated.Text>
        )}

        {/* Search button — hidden in select mode */}
        {!isSelectMode && <Pressable
          onPress={() => { setIsSearching((s) => !s); setSearchQuery(""); }}
          style={({ pressed }) => [
            styles.headerBtn,
            { backgroundColor: pressed || isSearching ? `${colors.primary}15` : "transparent" },
          ]}
        >
          <Ionicons name={isSearching ? "close" : "search-outline"} size={20} color={colors.primary} />
        </Pressable>}

        {/* Call button — hidden in select mode */}
        {!isSelectMode && <Pressable
          onPress={() => router.push(`/call/${companion.id}`)}
          style={({ pressed }) => [
            styles.headerBtn,
            { backgroundColor: pressed ? `${colors.primary}15` : "transparent" },
          ]}
        >
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </Pressable>}

        {/* More actions — hidden in select mode */}
        {!isSelectMode && <Pressable
          onPress={() => {
            hapticsImpact();
            Alert.alert(companion.name, undefined, [
              { text: "View Profile", onPress: () => router.push(`/profile/${companion.id}`) },
              {
                text: "Clear Chat",
                onPress: () =>
                  Alert.alert("Clear Chat", "Delete all messages with this companion?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear", style: "destructive", onPress: () => { clearMessages(companion.id); setMessages([]); } },
                  ]),
              },
              {
                text: "Delete Companion",
                style: "destructive",
                onPress: () =>
                  Alert.alert("Delete Companion", `Delete ${companion.name}? This cannot be undone.`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: async () => { abortRef.current?.abort(); await deleteCompanion(companion.id); router.replace("/(tabs)"); } },
                  ]),
              },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
          style={({ pressed }) => [
            styles.headerBtn,
            { backgroundColor: pressed ? `${colors.primary}15` : "transparent" },
          ]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.primary} />
        </Pressable>}

        {/* Cancel select mode button */}
        {isSelectMode && (
          <Pressable
            onPress={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.cancelSelectText, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Search bar */}
      {isSearching && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search messages..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {/* Messages */}
      {!isLoaded ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={[styles.messageList, { paddingBottom: 8 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          windowSize={10}
          maxToRenderPerBatch={20}
          initialNumToRender={20}
          renderItem={({ item }) => {
            if ((item as any).kind === "separator") {
              return (
                <DateSeparator
                  label={(item as any).label}
                  colors={colors}
                />
              );
            }
            if (item.id === "__typing__") {
              return (
                <TypingBubble
                  companionGradient={companion.avatarGradient}
                  companionInitials={initials}
                  colors={colors}
                />
              );
            }
            const msgId = item.id;
            const isSystemMsg = msgId.startsWith("__");
            return (
              <ChatBubble
                message={item as Message}
                companionGradient={companion.avatarGradient}
                companionInitials={initials}
                isStreaming={msgId === "__streaming__" && isStreaming}
                isNew={!initialMessageIdsRef.current.has(msgId)}
                selected={isSelectMode && !isSystemMsg ? selectedIds.has(msgId) : undefined}
                status={!isSystemMsg ? getMessageStatus(item as Message) : undefined}
                onPress={() => !isSystemMsg && handleMessageTap(msgId)}
                onLongPress={() => {
                  if (isSystemMsg) return;
                  hapticsImpact(ImpactFeedbackStyle.Medium);
                  handleMessageAction(msgId, (item as Message).content);
                }}
              />
            );
          }}
          ListFooterComponent={
            messages.length === 0 && !isStreaming && isLoaded ? (
              <GreetingCard
                companion={companion}
                colors={colors}
                chips={STARTER_CHIPS[companion.type] ?? STARTER_CHIPS.supportive}
                onChipPress={sendTextMessage}
              />
            ) : null
          }
        />
      )}

      {/* Retry banner */}
      {retryContent !== null && (
        <View style={[styles.retryBanner, { backgroundColor: `${colors.destructive}10`, borderColor: `${colors.destructive}25` }]}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.destructive} />
          <Text style={[styles.retryLabel, { color: colors.mutedForeground }]}>Couldn't reach the server</Text>
          <Pressable
            onPress={() => {
              const content = retryContent;
              setRetryContent(null);
              sendTextMessage(content);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.retryBtn, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Input bar */}
      <Animated.View
        style={[
          styles.inputBar,
          inputBarPaddingStyle,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {isRecording && (
          <Animated.View
            style={[
              styles.recordingBanner,
              { backgroundColor: "rgba(239,68,68,0.10)" },
              recordStyle,
            ]}
          >
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingText, { color: "#ef4444" }]}>
              Recording… tap stop when done
            </Text>
          </Animated.View>
        )}

        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.card,
              borderColor: isRecording ? "#ef4444" : colors.border,
            },
          ]}
        >
          {Platform.OS !== "web" && (
            <Pressable
              onPress={handleMicPress}
              disabled={isStreaming || isTranscribing}
              style={({ pressed }) => [
                styles.micBtn,
                {
                  backgroundColor: isRecording ? "rgba(239,68,68,0.12)" : "transparent",
                  opacity: pressed ? 0.7 : isStreaming || isTranscribing ? 0.4 : 1,
                },
              ]}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={22}
                color={isRecording ? "#ef4444" : colors.mutedForeground}
              />
            </Pressable>
          )}

          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={
              isTranscribing
                ? "Transcribing…"
                : isRecording
                ? "Recording voice…"
                : `Message ${companion.name}…`
            }
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={(t) => { setInput(t); }}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            editable={!isRecording && !isTranscribing}
          />

          <Pressable
            onPress={isStreaming ? () => abortRef.current?.abort() : handleSend}
            disabled={!isStreaming && !input.trim()}
            style={({ pressed }) => [styles.sendBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <LinearGradient
              colors={
                input.trim() || isStreaming
                  ? companion.avatarGradient
                  : [colors.muted, colors.muted]
              }
              style={styles.sendBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isStreaming ? "stop" : "arrow-up"}
                size={18}
                color={input.trim() || isStreaming ? "#FFFFFF" : colors.mutedForeground}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

      {/* Multi-select delete bar */}
      {isSelectMode && (
        <View style={[styles.selectBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Text style={[styles.selectBarCount, { color: colors.mutedForeground }]}>
            {selectedIds.size} message{selectedIds.size !== 1 ? "s" : ""} selected
          </Text>
          <Pressable
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            style={({ pressed }) => [
              styles.selectBarDeleteBtn,
              { backgroundColor: selectedIds.size > 0 ? "rgba(239,68,68,0.12)" : colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={selectedIds.size > 0 ? colors.destructive : colors.mutedForeground} />
            <Text style={[styles.selectBarDeleteText, { color: selectedIds.size > 0 ? colors.destructive : colors.mutedForeground }]}>
              Delete
            </Text>
          </Pressable>
        </View>
      )}

      {milestoneLevel !== null && (
        <MilestoneCelebration
          level={milestoneLevel}
          companionName={companion.name}
          companionGradient={companion.avatarGradient}
          onDismiss={() => setMilestoneLevel(null)}
        />
      )}

      {showMoodModal && (
        <MoodCheckIn
          companionName={companion.name}
          colors={colors}
          onSelect={handleMoodSelect}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function GreetingCard({
  companion,
  colors,
  chips,
  onChipPress,
}: {
  companion: any;
  colors: any;
  chips: string[];
  onChipPress: (text: string) => void;
}) {
  const typeInfo = COMPANION_TYPES[companion.type as CompanionType];
  const initials = companion.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <View style={styles.greeting}>
      <LinearGradient
        colors={companion.avatarGradient}
        style={styles.greetingAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.greetingAvatarText}>{initials}</Text>
      </LinearGradient>
      <Text style={[styles.greetingName, { color: colors.foreground }]}>
        {companion.name}
      </Text>
      <Text style={[styles.greetingType, { color: colors.primary }]}>
        {typeInfo.emoji} {typeInfo.label}
      </Text>
      <Text style={[styles.greetingDesc, { color: colors.mutedForeground }]}>
        {typeInfo.description}
      </Text>
      <Text style={[styles.greetingHint, { color: colors.mutedForeground }]}>
        Say hello to start chatting · tap the call button to voice call
      </Text>

      {chips.length > 0 && (
        <View style={styles.greetingChips}>
          {chips.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => onChipPress(chip)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed
                    ? `${companion.avatarGradient[0]}22`
                    : colors.card,
                  borderColor: pressed
                    ? companion.avatarGradient[0]
                    : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.foreground }]}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const MOOD_EMOJIS = ["😔", "😕", "😐", "🙂", "😊"];

function MoodCheckIn({
  companionName,
  colors,
  onSelect,
}: {
  companionName: string;
  colors: any;
  onSelect: (mood: number) => void;
}) {
  return (
    <View style={styles.moodOverlay}>
      <View style={[styles.moodSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.moodTitle, { color: colors.foreground }]}>
          How are you feeling?
        </Text>
        <Text style={[styles.moodSub, { color: colors.mutedForeground }]}>
          After chatting with {companionName}
        </Text>
        <View style={styles.moodRow}>
          {MOOD_EMOJIS.map((emoji, i) => (
            <Pressable
              key={i}
              onPress={() => onSelect(i + 1)}
              style={({ pressed }) => [styles.moodBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => onSelect(0)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.moodSkip, { color: colors.mutedForeground }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const STARTER_CHIPS: Record<string, string[]> = {
  romantic:    ["Tell me about your day ♡", "I've been thinking about you", "How are you feeling?"],
  flirty:      ["Okay, impress me ✦", "What's on your mind?", "Tell me something interesting"],
  supportive:  ["I need to talk", "Something's been bothering me", "I had a rough day"],
  mentor:      ["What should I focus on?", "I have a decision to make", "Challenge me on something"],
  anime:       ["Let's go on an adventure!", "I have big news!", "Tell me your favorite thing"],
  bestfriend:  ["Okay spill, what's the tea", "I'm bored, entertain me", "Something weird happened"],
  therapist:   ["I've been feeling off lately", "Can we talk?", "I need to process something"],
  roleplay:    ["Let's start a story", "I want to be the hero", "Set the scene for us"],
};



function DateSeparator({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={dateSepStyles.row}>
      <View style={[dateSepStyles.line, { backgroundColor: colors.border }]} />
      <Text style={[dateSepStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[dateSepStyles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const dateSepStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginVertical: 8, paddingHorizontal: 16, gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", fontWeight: "500" as const, letterSpacing: 0.5 },
});


const MILESTONE_DATA: Record<number, { label: string; sub: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  20: { label: "Acquaintance", sub: "You're starting to know each other", icon: "hand-right-outline" },
  40: { label: "Friends", sub: "A real friendship is forming", icon: "heart-outline" },
  60: { label: "Close Friends", sub: "You've grown genuinely close", icon: "heart" },
  80: { label: "Bonded", sub: "An unbreakable bond", icon: "infinite" },
};

function MilestoneCelebration({
  level,
  companionName,
  companionGradient,
  onDismiss,
}: {
  level: number;
  companionName: string;
  companionGradient: [string, string];
  onDismiss: () => void;
}) {
  const colors = useColors();
  const milestone = MILESTONE_DATA[level];
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.82);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 280 });
    cardScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    const t = setTimeout(onDismiss, 3800);
    return () => clearTimeout(t);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, milestoneStyles.overlay, overlayStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <Animated.View style={[milestoneStyles.card, { backgroundColor: colors.card, borderColor: colors.border }, cardStyle]}>
        <LinearGradient
          colors={companionGradient}
          style={milestoneStyles.iconCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={milestone.icon} size={34} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[milestoneStyles.newMilestone, { color: colors.mutedForeground }]}>New milestone</Text>
        <Text style={[milestoneStyles.label, { color: colors.foreground }]}>{milestone.label}</Text>
        <Text style={[milestoneStyles.companionLine, { color: colors.mutedForeground }]}>with {companionName}</Text>
        <Text style={[milestoneStyles.sub, { color: colors.mutedForeground }]}>{milestone.sub}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const milestoneStyles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 100,
  },
  card: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 36,
    paddingHorizontal: 40,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    minWidth: 260,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  newMilestone: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 26,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  companionLine: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 2,
  },
});

function TypingBubble({
  companionGradient,
  companionInitials,
  colors,
}: {
  companionGradient: string[];
  companionInitials: string;
  colors: any;
}) {
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    const bounce = () =>
      withRepeat(
        withSequence(withTiming(-5, { duration: 280 }), withTiming(0, { duration: 280 })),
        -1,
        false
      );
    d1.value = bounce();
    d2.value = withDelay(130, bounce());
    d3.value = withDelay(260, bounce());
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: d2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: d3.value }] }));

  return (
    <View style={typingStyles.row}>
      <LinearGradient
        colors={companionGradient as [string, string]}
        style={typingStyles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={typingStyles.avatarText}>{companionInitials}</Text>
      </LinearGradient>
      <View
        style={[
          typingStyles.bubble,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Animated.View style={[typingStyles.dot, { backgroundColor: colors.mutedForeground }, s1]} />
        <Animated.View style={[typingStyles.dot, { backgroundColor: colors.mutedForeground }, s2]} />
        <Animated.View style={[typingStyles.dot, { backgroundColor: colors.mutedForeground }, s3]} />
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  headerName: { fontSize: 16, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageList: { paddingHorizontal: 0, paddingTop: 24 },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  recordingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  recordingText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendBtn: { borderRadius: 20, overflow: "hidden", flexShrink: 0 },
  sendBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelSelectText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
    paddingHorizontal: 4,
  },
  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectBarCount: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  selectBarDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  selectBarDeleteText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },
  retryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  retryBtn: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontWeight: "600" as const },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  greeting: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 32, gap: 8 },
  greetingAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  greetingAvatarText: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  greetingName: { fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textAlign: "center" },
  greetingType: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  greetingDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  greetingHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
  moodOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  moodSheet: {
    width: "90%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  moodTitle: { fontSize: 18, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  moodSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -4 },
  moodRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  moodBtn: { padding: 6 },
  moodEmoji: { fontSize: 26 },
  moodSkip: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
});
