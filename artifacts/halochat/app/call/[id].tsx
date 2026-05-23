import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COMPANION_TYPES, useCompanions, type Message } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = DOMAIN
  ? `https://${DOMAIN}/api`
  : Platform.OS === "web"
  ? "/api"
  : "http://localhost:3000/api";

type CallPhase =
  | "connecting"
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

const PHASE_LABELS: Record<CallPhase, string> = {
  connecting: "Connecting...",
  idle: "Tap to speak",
  recording: "Listening...",
  transcribing: "Processing...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

interface CallMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, addMessage, addMemoryNote } = useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [lastUserText, setLastUserText] = useState("");
  const [lastAiText, setLastAiText] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<CallMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // Animations
  const outerRingScale = useSharedValue(1);
  const outerRingOpacity = useSharedValue(0.3);
  const innerRingScale = useSharedValue(1);
  const micBtnScale = useSharedValue(1);

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerRingScale.value }],
    opacity: outerRingOpacity.value,
  }));
  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerRingScale.value }],
    opacity: innerRingScale.value > 1 ? 0.5 : 0.2,
  }));
  const micBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micBtnScale.value }],
  }));

  useEffect(() => {
    if (phase === "speaking") {
      outerRingScale.value = withRepeat(
        withSequence(withTiming(1.25, { duration: 600 }), withTiming(1.05, { duration: 600 })),
        -1, false
      );
      outerRingOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 600 }), withTiming(0.3, { duration: 600 })),
        -1, false
      );
    } else {
      outerRingScale.value = withTiming(1);
      outerRingOpacity.value = withTiming(0.2);
    }

    if (phase === "recording") {
      innerRingScale.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1, false
      );
    } else {
      innerRingScale.value = withTiming(1);
    }
  }, [phase]);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* ignore */ }
      soundRef.current = null;
    }
  }, []);

  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (!companion) return;
    const typeInfo = COMPANION_TYPES[companion.type];
    const url = `${API_BASE}/companion/tts?text=${encodeURIComponent(text.slice(0, 600))}&voice=${typeInfo.voice}`;

    return new Promise((resolve) => {
      const load = async () => {
        try {
          if (Platform.OS !== "web") {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
            });
          }
          const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              soundRef.current = null;
              resolve();
            }
          });
        } catch {
          resolve();
        }
      };
      load();
    });
  }, [companion]);

  const addToTranscript = useCallback((msg: CallMessage) => {
    transcriptRef.current = [...transcriptRef.current, msg];
    setCallMessages([...transcriptRef.current]);
    if (msg.role === "user") setLastUserText(msg.content);
    else setLastAiText(msg.content);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const runAITurn = useCallback(async (userText: string) => {
    if (!companion) return;

    addToTranscript({ role: "user", content: userText });

    setPhase("thinking");
    try {
      const res = await fetch(`${API_BASE}/companion/chat-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionType: companion.type,
          companionName: companion.name,
          memoryNotes: companion.memoryNotes,
          customPersonality: companion.customPersonality,
          messages: [...transcriptRef.current],
        }),
      });
      const data = await res.json() as { content: string };
      const aiText = data.content || "";

      if (aiText) {
        addToTranscript({ role: "assistant", content: aiText });
        setPhase("speaking");
        await playTTS(aiText);
      }
    } catch {
      // silently fail turn
    } finally {
      setPhase("idle");
    }
  }, [companion, addToTranscript, playTTS]);

  // Start call with greeting
  useEffect(() => {
    if (!companion) return;

    const init = async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS !== "web") {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Microphone access is needed for voice calls.", [
            { text: "OK", onPress: () => router.back() },
          ]);
          return;
        }
      }

      // Greeting turn
      setPhase("thinking");
      try {
        const typeInfo = COMPANION_TYPES[companion.type];
        const greetingPrompt = `You just received a voice call from the user. Greet them warmly and naturally in 1 sentence. Be yourself (${typeInfo.label} companion).`;
        const res = await fetch(`${API_BASE}/companion/chat-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companionType: companion.type,
            companionName: companion.name,
            memoryNotes: companion.memoryNotes,
            customPersonality: companion.customPersonality,
            messages: [{ role: "user", content: greetingPrompt }],
          }),
        });
        const data = await res.json() as { content: string };
        const greeting = data.content || `Hey! So great to hear from you!`;
        addToTranscript({ role: "assistant", content: greeting });
        setPhase("speaking");
        await playTTS(greeting);
      } catch {
        // skip greeting if API not available
      }
      setPhase("idle");

      // Start timer
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    };

    init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSound();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (phase !== "idle" || isMuted) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setPhase("recording");
      micBtnScale.value = withSpring(0.92, { damping: 10 });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Error", "Could not start recording.");
    }
  }, [phase, isMuted]);

  const stopRecording = useCallback(async () => {
    if (phase !== "recording" || !recordingRef.current) return;
    micBtnScale.value = withSpring(1, { damping: 10 });

    try {
      setPhase("transcribing");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) throw new Error("No URI");

      const formData = new FormData();
      formData.append("audio", { uri, type: "audio/m4a", name: "voice.m4a" } as any);

      const res = await fetch(`${API_BASE}/companion/transcribe`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as { transcript?: string };
      const transcript = data.transcript?.trim();

      if (transcript) {
        await runAITurn(transcript);
      } else {
        setPhase("idle");
      }
    } catch {
      setPhase("idle");
    }
  }, [phase, runAITurn]);

  const handleMicPress = () => {
    if (Platform.OS === "web") {
      Alert.alert("Voice Calls", "Voice calling is available on iOS and Android via Expo Go.");
      return;
    }
    if (phase === "recording") stopRecording();
    else if (phase === "idle") startRecording();
  };

  const extractMemories = useCallback(
    async (msgs: CallMessage[]) => {
      if (!companion || msgs.length < 2) return;
      try {
        const res = await fetch(`${API_BASE}/companion/extract-memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: msgs.map((m) => ({ role: m.role, content: m.content })),
            existingNotes: companion.memoryNotes,
          }),
        });
        const data = (await res.json()) as { facts?: string[] };
        for (const fact of data.facts ?? []) {
          if (fact.trim()) await addMemoryNote(companion.id, fact);
        }
      } catch { /* silent */ }
    },
    [companion, addMemoryNote]
  );

  const endCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await stopSound();
    await recordingRef.current?.stopAndUnloadAsync().catch(() => {});

    if (companion && transcriptRef.current.length > 0) {
      // Extract memories from call in the background
      extractMemories(transcriptRef.current);

      // Save transcript to chat history
      for (const msg of transcriptRef.current) {
        const chatMsg: Message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          role: msg.role,
          content: msg.content,
          timestamp: Date.now(),
        };
        await addMessage(companion.id, chatMsg);
      }
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  }, [companion, addMessage, stopSound, extractMemories]);

  if (!companion) {
    return (
      <View style={[styles.root, { backgroundColor: "#0D0D18" }]}>
        <Text style={{ color: "#fff", padding: 20 }}>Companion not found</Text>
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

  const durationStr = `${String(Math.floor(duration / 60)).padStart(2, "0")}:${String(duration % 60).padStart(2, "0")}`;

  const micActive = phase === "recording";
  const micDisabled = !["idle", "recording"].includes(phase) || isMuted;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0D0D18", "#1A1130", "#0D0D18"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Tinted glow from companion color */}
      <View
        style={[
          styles.colorGlow,
          { backgroundColor: companion.avatarGradient[0], opacity: 0.07 },
        ]}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={endCall}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-down" size={26} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <Text style={styles.headerTitle}>Voice Call</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Avatar area */}
      <View style={styles.avatarArea}>
        {/* Outer pulsing ring (speaking) */}
        <Animated.View
          style={[
            styles.outerRing,
            { borderColor: companion.avatarGradient[0] },
            outerRingStyle,
          ]}
        />
        {/* Inner ring (recording) */}
        <Animated.View
          style={[
            styles.innerRing,
            { borderColor: "#ffffff" },
            innerRingStyle,
          ]}
        />
        {/* Avatar */}
        <LinearGradient
          colors={companion.avatarGradient}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarInitials}>{initials}</Text>
        </LinearGradient>
      </View>

      {/* Companion info */}
      <View style={styles.companionInfo}>
        <Text style={styles.companionName}>{companion.name}</Text>
        <Text style={[styles.companionType, { color: companion.avatarGradient[0] }]}>
          {typeInfo.emoji} {typeInfo.label}
        </Text>
        <Text style={styles.durationLabel}>{durationStr}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusArea}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                phase === "recording"
                  ? "rgba(239,68,68,0.18)"
                  : phase === "speaking"
                  ? `${companion.avatarGradient[0]}22`
                  : "rgba(255,255,255,0.08)",
              borderColor:
                phase === "recording"
                  ? "rgba(239,68,68,0.4)"
                  : phase === "speaking"
                  ? `${companion.avatarGradient[0]}55`
                  : "rgba(255,255,255,0.12)",
            },
          ]}
        >
          {phase === "recording" && (
            <View style={styles.recDot} />
          )}
          <Text
            style={[
              styles.statusText,
              {
                color:
                  phase === "recording"
                    ? "#ef4444"
                    : phase === "speaking"
                    ? companion.avatarGradient[0]
                    : "rgba(255,255,255,0.7)",
              },
            ]}
          >
            {PHASE_LABELS[phase]}
          </Text>
        </View>
      </View>

      {/* Transcript */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
      >
        {callMessages.slice(-6).map((msg, i) => (
          <View
            key={i}
            style={[
              styles.transcriptLine,
              msg.role === "user" ? styles.transcriptUser : styles.transcriptAi,
            ]}
          >
            <Text
              style={[
                styles.transcriptLabel,
                {
                  color:
                    msg.role === "user"
                      ? "rgba(255,255,255,0.4)"
                      : companion.avatarGradient[0] + "99",
                },
              ]}
            >
              {msg.role === "user" ? "You" : companion.name}
            </Text>
            <Text
              style={[
                styles.transcriptText,
                {
                  color:
                    msg.role === "user"
                      ? "rgba(255,255,255,0.75)"
                      : "rgba(255,255,255,0.9)",
                },
              ]}
              numberOfLines={3}
            >
              {msg.content}
            </Text>
          </View>
        ))}
        {callMessages.length === 0 && phase === "connecting" && (
          <Text style={styles.connectingHint}>Connecting to {companion.name}...</Text>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 32 }]}>
        {/* Mute */}
        <Pressable
          onPress={() => { setIsMuted((m) => !m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.sideBtn, { backgroundColor: isMuted ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)" }]}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic-outline"}
            size={22}
            color={isMuted ? "#ffffff" : "rgba(255,255,255,0.6)"}
          />
        </Pressable>

        {/* Main mic button */}
        <Animated.View style={micBtnStyle}>
          <Pressable
            onPress={handleMicPress}
            disabled={micDisabled}
            style={({ pressed }) => [{ opacity: pressed && !micDisabled ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={
                micActive
                  ? ["#ef4444", "#dc2626"]
                  : micDisabled
                  ? ["#333", "#222"]
                  : companion.avatarGradient
              }
              style={styles.micBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={micActive ? "stop" : "mic"}
                size={30}
                color="#ffffff"
              />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* End call */}
        <Pressable
          onPress={endCall}
          style={[styles.sideBtn, { backgroundColor: "#ef444422", borderColor: "#ef444444", borderWidth: 1 }]}
        >
          <Ionicons name="call" size={22} color="#ef4444" style={{ transform: [{ rotate: "135deg" }] }} />
        </Pressable>
      </View>

      {/* Web notice */}
      {Platform.OS === "web" && phase === "idle" && (
        <View style={styles.webNotice}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.webNoticeText}>
            Voice calling works on iOS & Android via Expo Go
          </Text>
        </View>
      )}
    </View>
  );
}

const AVATAR_SIZE = 140;
const INNER_RING = AVATAR_SIZE + 28;
const OUTER_RING = AVATAR_SIZE + 60;

const styles = StyleSheet.create({
  root: { flex: 1 },
  colorGlow: {
    position: "absolute",
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    borderRadius: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    height: OUTER_RING + 20,
  },
  outerRing: {
    position: "absolute",
    width: OUTER_RING,
    height: OUTER_RING,
    borderRadius: OUTER_RING / 2,
    borderWidth: 2,
  },
  innerRing: {
    position: "absolute",
    width: INNER_RING,
    height: INNER_RING,
    borderRadius: INNER_RING / 2,
    borderWidth: 1.5,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 48,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  companionInfo: {
    alignItems: "center",
    marginTop: 24,
    gap: 4,
  },
  companionName: {
    fontSize: 26,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  companionType: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  durationLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
    letterSpacing: 1,
  },
  statusArea: {
    alignItems: "center",
    marginTop: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  transcript: {
    flex: 1,
    marginTop: 20,
    marginHorizontal: 24,
  },
  transcriptContent: {
    gap: 10,
    paddingBottom: 8,
  },
  transcriptLine: {
    gap: 2,
  },
  transcriptUser: {
    alignItems: "flex-end",
  },
  transcriptAi: {
    alignItems: "flex-start",
  },
  transcriptLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    maxWidth: "85%",
  },
  connectingHint: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 20,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingTop: 16,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingBottom: 12,
  },
  webNoticeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
});
