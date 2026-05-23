import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble } from "@/components/ChatBubble";
import {
  COMPANION_TYPES,
  type Message,
  useCompanions,
} from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = DOMAIN
  ? `https://${DOMAIN}/api`
  : Platform.OS === "web"
  ? "/api"
  : "http://localhost:3000/api";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, getMessages, addMessage, updateRelationshipLevel } =
    useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

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

  useEffect(() => {
    if (!id) return;
    getMessages(id).then((msgs) => {
      setMessages(msgs);
      setIsLoaded(true);
    });
  }, [id]);

  const displayMessages = [...messages];
  if (isStreaming && streamingContent) {
    displayMessages.push({
      id: "__streaming__",
      role: "assistant",
      content: streamingContent,
      timestamp: Date.now(),
    });
  }
  const reversedMessages = [...displayMessages].reverse();

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || !companion) return;
      const userContent = text.trim();
      setInput("");

      const userMsg: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };

      const currentMessages = [...messages];
      setMessages((prev) => [...prev, userMsg]);
      await addMessage(companion.id, userMsg);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const apiMessages = [
        ...currentMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userContent },
      ];

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;
      let fullContent = "";

      try {
        const response = await fetch(`${API_BASE}/companion/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companionId: companion.id,
            companionType: companion.type,
            companionName: companion.name,
            memoryNotes: companion.memoryNotes,
            customPersonality: companion.customPersonality,
            messages: apiMessages,
          }),
          signal: controller.signal,
        });

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
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        fullContent = "I'm having trouble connecting. Please check that OPENAI_API_KEY is set on the server. ✦";
        setStreamingContent(fullContent);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;

        if (fullContent) {
          const assistantMsg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            role: "assistant",
            content: fullContent,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          await addMessage(companion.id, assistantMsg);
          await updateRelationshipLevel(companion.id, 2);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    },
    [input, isStreaming, companion, messages, addMessage, updateRelationshipLevel]
  );

  const handleSend = () => sendTextMessage(input);

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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

      const res = await fetch(`${API_BASE}/companion/transcribe`, {
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
          onPress={() => { abortRef.current?.abort(); router.back(); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={() => router.push(`/profile/${companion.id}`)}
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
              {companion.name}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {typeInfo.emoji} {typeInfo.label}
              {isStreaming ? " · typing..." : ""}
              {isTranscribing ? " · transcribing..." : ""}
            </Text>
          </View>
        </Pressable>

        {/* Call button */}
        <Pressable
          onPress={() => router.push(`/call/${companion.id}`)}
          style={({ pressed }) => [
            styles.headerBtn,
            { backgroundColor: pressed ? `${colors.primary}15` : "transparent" },
          ]}
        >
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

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
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              companionGradient={companion.avatarGradient}
              companionInitials={initials}
              isStreaming={item.id === "__streaming__" && isStreaming}
            />
          )}
          ListFooterComponent={
            messages.length === 0 && !isStreaming ? (
              <GreetingCard companion={companion} colors={colors} />
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: bottomPadding + 12,
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
            onChangeText={setInput}
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
      </View>
    </KeyboardAvoidingView>
  );
}

function GreetingCard({ companion, colors }: { companion: any; colors: any }) {
  const typeInfo = COMPANION_TYPES[companion.type];
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
    </View>
  );
}

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
  greeting: { alignItems: "center", paddingHorizontal: 40, paddingVertical: 32, gap: 8 },
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
});
