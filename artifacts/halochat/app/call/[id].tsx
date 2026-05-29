import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
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

import { useAuth } from "@/context/AuthContext";
import { API_BASE, COMPANION_TYPES, useCompanions } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

type CallPhase =
  | "connecting"
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

const PHASE_LABELS: Record<CallPhase, string> = {
  connecting: "Connecting...",
  idle: "Ready...",
  recording: "Listening...",
  transcribing: "Processing...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

// Whisper hallucination detection — known phrases Whisper produces on silence/noise
const WHISPER_HALLUCINATION_PHRASES = [
  "thank you for watching",
  "thanks for watching",
  "please subscribe",
  "don't forget to subscribe",
  "subtitles by",
  "like and subscribe",
  "[music]",
  "[applause]",
  "[laughter]",
  "[silence]",
  "www.",
  ".com",
];
// CJK Unicode block — Whisper hallucinates Chinese/Japanese/Korean on silence
const CJK_REGEX = /[　-鿿가-힯]/;

function isSilenceOrHallucination(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || t.length < 3) return true;
  if (CJK_REGEX.test(t)) return true;
  return WHISPER_HALLUCINATION_PHRASES.some((p) => t.includes(p));
}

const SILENCE_RESPONSES = [
  "I didn't catch that — say something?",
  "Hello? Did you say something?",
  "I'm here, go ahead — I'm listening.",
  "You there? I didn't hear anything.",
  "I missed that. Can you say it again?",
  "Hmm, I didn't hear you. Go ahead!",
];

// Silence detection
const SILENCE_THRESHOLD_DB = -40;   // dBFS — above this = speech detected
const SILENCE_DURATION_MS = 1800;   // ms of silence after speech → stop
const NO_SPEECH_TIMEOUT_MS = 5000;  // ms total before giving up if no speech detected
const MIN_RECORDING_MS = 800;       // minimum recording before silence check kicks in
const MAX_RECORDING_MS = 30000;     // hard cutoff regardless of speech
const POLL_INTERVAL_MS = 100;       // how often we poll audio levels
const SILENCE_POPUP_THRESHOLD = 4;  // consecutive silences before "Are you still there?" popup

// AAC preset: metering works on iOS (LPCM doesn't report levels), produces .m4a on both platforms
const RECORDING_PRESET: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
};

interface CallMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, addMemoryNote, updateRelationshipLevel } = useCompanions();
  const { authFetch, accessToken, user } = useAuth();
  const userAge = React.useMemo(() => {
    if (!user?.dateOfBirth) return undefined;
    const birth = new Date(user.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [user?.dateOfBirth]);

  const companion = companions.find((c) => c.id === id);
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<CallMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // Silence detection state (all refs to avoid stale closures)
  const lastSpokeRef = useRef<number>(0);
  const recordingStartRef = useRef<number>(0);
  const hasSpeechRef = useRef(false);   // true once any audio above threshold is detected
  const isStoppingRef = useRef(false);
  const isMutedRef = useRef(false);
  const isSpeakerOnRef = useRef(true);
  const phaseRef = useRef<CallPhase>("connecting");
  const consecutiveSilencesRef = useRef(0);
  const isAliveRef = useRef(true); // false after endCall — prevents state updates on unmounted component

  // Forward ref so the polling interval always calls the latest processRecording
  const processRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const endCallRef = useRef<(() => Promise<void>) | null>(null);
  const authFetchRef = useRef(authFetch);
  const accessTokenRef = useRef(accessToken);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isSpeakerOnRef.current = isSpeakerOn; }, [isSpeakerOn]);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

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
        withSequence(withTiming(1.2, { duration: 350 }), withTiming(1, { duration: 350 })),
        -1, false
      );
    } else {
      innerRingScale.value = withTiming(1);
    }
  }, [phase]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceCountdown(0);
  }, []);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* ignore */ }
      soundRef.current = null;
    }
  }, []);

  const playTTS = useCallback(async (text: string, onStart?: () => void): Promise<void> => {
    if (!companion) return;
    const typeInfo = COMPANION_TYPES[companion.type];
    const url = `${API_BASE}/companion/tts?text=${encodeURIComponent(text.slice(0, 600))}&voice=${typeInfo.voice}&companionId=${companion.id}`;
    const localUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;

    return new Promise((resolve) => {
      const load = async () => {
        let tempPath: string | null = null;
        try {
          if (Platform.OS !== "web") {
            const speakerOn = isSpeakerOnRef.current;
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: !speakerOn,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: !speakerOn,
            });

            // FileSystem.downloadAsync with auth header — avoids manual btoa conversion
            // which is O(n²) and can silently fail on large audio files.
            let result = await FileSystem.downloadAsync(url, localUri, {
              headers: accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {},
            });
            console.log("[TTS] Download status:", result.status);

            // Token expired — refresh once and retry
            if (result.status === 401) {
              await authFetchRef.current(`${API_BASE}/auth/me`).catch(() => {});
              result = await FileSystem.downloadAsync(url, localUri, {
                headers: accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {},
              });
            }

            if (result.status === 429) throw new Error("DAILY_LIMIT_REACHED");
            if (result.status >= 400) throw new Error(`TTS_HTTP_${result.status}`);
            tempPath = localUri;
          }

          const audioUri = tempPath ?? url;
          console.log("[TTS] Loading sound from:", audioUri);

          // Create without shouldPlay to avoid race: handler must be registered before playback starts
          const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: false });
          soundRef.current = sound;
          onStart?.();

          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) {
              if ((status as any).error) {
                console.warn("[TTS] Sound load error:", (status as any).error);
                soundRef.current = null;
                if (tempPath) FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
                resolve();
              }
              return;
            }
            if (status.didJustFinish) {
              soundRef.current = null;
              resolve();
              if (tempPath) FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
            }
          });

          await sound.playAsync();
          console.log("[TTS] Playback started");
        } catch (err: any) {
          console.warn("[TTS] Error:", err?.message ?? err);
          if (err?.message === "DAILY_LIMIT_REACHED" || err?.message === "RATE_LIMITED") {
            const msg = err.message === "DAILY_LIMIT_REACHED"
              ? "You've used today's credits for this companion. Come back tomorrow!"
              : "Too many requests. Wait a moment and try again.";
            Alert.alert("Limit reached", msg, [{ text: "OK", onPress: () => endCallRef.current?.() }]);
          } else if (err?.message?.startsWith("TTS_HTTP_") || err?.message === "Network request failed") {
            Alert.alert(
              "Voice unavailable",
              `Could not load audio (${err.message}). Check your connection and that the server is running.`
            );
          }
          onStart?.();
          if (tempPath) FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
          resolve();
        }
      };
      load();
    });
  }, [companion]);

  const addToTranscript = useCallback((msg: CallMessage) => {
    transcriptRef.current = [...transcriptRef.current, msg];
    setCallMessages([...transcriptRef.current]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Auto-start listening — stable (no deps), all mutable state via refs
  const startListening = useCallback(async () => {
    if (isMutedRef.current || Platform.OS === "web") return;
    if (recordingRef.current) return; // guard: already recording

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_PRESET);

      recordingRef.current = recording;
      const now = Date.now();
      lastSpokeRef.current = now;
      recordingStartRef.current = now;
      hasSpeechRef.current = false;
      isStoppingRef.current = false;

      // Poll audio levels via getStatusAsync — more reliable than setOnRecordingStatusUpdate
      clearSilenceTimer();
      silenceTimerRef.current = setInterval(async () => {
        if (!recordingRef.current || isStoppingRef.current) {
          clearSilenceTimer();
          return;
        }

        try {
          const status = await recordingRef.current.getStatusAsync();
          if (!status.isRecording) {
            clearSilenceTimer();
            return;
          }

          const level: number = (status as any).metering ?? -100;
          const t = Date.now();

          // Update last-spoke timestamp if sound detected
          if (level > SILENCE_THRESHOLD_DB) {
            lastSpokeRef.current = t;
            hasSpeechRef.current = true;
            setSilenceCountdown(0);
          }

          const elapsed = t - recordingStartRef.current;
          const silentFor = t - lastSpokeRef.current;

          // Show countdown only after speech has been detected
          if (hasSpeechRef.current && elapsed > MIN_RECORDING_MS && silentFor > 0) {
            const remaining = Math.max(0, SILENCE_DURATION_MS - silentFor);
            setSilenceCountdown(Math.ceil(remaining / 1000));
          }

          const shouldStop =
            // User spoke and then went silent for SILENCE_DURATION_MS
            (hasSpeechRef.current && elapsed > MIN_RECORDING_MS && silentFor >= SILENCE_DURATION_MS) ||
            // No speech at all detected after NO_SPEECH_TIMEOUT_MS (metering may not work)
            (!hasSpeechRef.current && elapsed >= NO_SPEECH_TIMEOUT_MS) ||
            elapsed >= MAX_RECORDING_MS;

          if (shouldStop) {
            isStoppingRef.current = true;
            clearSilenceTimer();
            processRecordingRef.current?.();
          }
        } catch {
          // polling error — ignore
        }
      }, POLL_INTERVAL_MS);

      setPhase("recording");
      phaseRef.current = "recording";
      micBtnScale.value = withSpring(0.92, { damping: 10 });
      await hapticsImpact(ImpactFeedbackStyle.Light);
    } catch {
      setPhase("idle");
      phaseRef.current = "idle";
      // Retry once after a delay — audio session may not have been ready
      setTimeout(() => {
        if (!recordingRef.current && !isMutedRef.current) startListening();
      }, 700);
    }
  }, [clearSilenceTimer]); // clearSilenceTimer is stable

  const toggleSpeaker = useCallback(async () => {
    const next = !isSpeakerOnRef.current;
    isSpeakerOnRef.current = next;
    setIsSpeakerOn(next);
    if (Platform.OS !== "web") {
      await Audio.setAudioModeAsync({
        // During recording always keep allowsRecordingIOS: true
        allowsRecordingIOS: phaseRef.current === "recording" ? true : !next,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !next,
      });
    }
    hapticsImpact(ImpactFeedbackStyle.Light);
  }, []);

  const handleSilence = useCallback(async () => {
    consecutiveSilencesRef.current += 1;

    if (consecutiveSilencesRef.current >= SILENCE_POPUP_THRESHOLD) {
      // Too many consecutive silences — pause the call and ask if user is still there
      consecutiveSilencesRef.current = 0;
      setPhase("idle");
      phaseRef.current = "idle";
      Alert.alert(
        "Are you still there?",
        "I haven't heard anything for a while.",
        [
          {
            text: "Continue",
            onPress: () => {
              startListening();
            },
          },
          {
            text: "End Call",
            style: "destructive",
            onPress: () => endCallRef.current?.(),
          },
        ],
        { cancelable: false }
      );
    } else {
      const response = SILENCE_RESPONSES[Math.floor(Math.random() * SILENCE_RESPONSES.length)];
      setPhase("speaking");
      phaseRef.current = "speaking";
      await playTTS(response, () => addToTranscript({ role: "assistant", content: response }));
      if (!isAliveRef.current) return;
      setPhase("idle");
      phaseRef.current = "idle";
      await new Promise<void>((r) => setTimeout(r, 250));
      startListening();
    }
  }, [playTTS, addToTranscript, startListening]);

  const runAITurn = useCallback(async (userText: string) => {
    if (!companion) return;

    setPhase("thinking");
    phaseRef.current = "thinking";

    try {
      const res = await authFetchRef.current(`${API_BASE}/companion/chat-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          messages: [...transcriptRef.current],
        }),
      });
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error === "DAILY_LIMIT_REACHED"
          ? "You've used today's credits for this companion. Come back tomorrow!"
          : "Too many requests. Wait a moment and try again.";
        Alert.alert("Limit reached", msg, [{ text: "OK", onPress: () => endCallRef.current?.() }]);
        return;
      }
      const data = await res.json() as { content: string };
      const aiText = data.content || "";

      if (aiText) {
        setPhase("speaking");
        phaseRef.current = "speaking";
        await playTTS(aiText, () => addToTranscript({ role: "assistant", content: aiText }));
      }
    } catch {
      // silently fail — will resume listening below
    } finally {
      if (!isAliveRef.current) return;
      setPhase("idle");
      phaseRef.current = "idle";
      await new Promise<void>((r) => setTimeout(r, 250));
      startListening();
    }
  }, [companion, addToTranscript, playTTS, startListening]);

  // Stops the active recording and sends it through transcription → AI
  const processRecording = useCallback(async () => {
    clearSilenceTimer();
    if (!recordingRef.current) {
      setPhase("idle");
      phaseRef.current = "idle";
      startListening();
      return;
    }

    micBtnScale.value = withSpring(1, { damping: 10 });
    setSilenceCountdown(0);

    try {
      setPhase("transcribing");
      phaseRef.current = "transcribing";

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !isSpeakerOnRef.current,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !isSpeakerOnRef.current,
      });

      if (!uri) throw new Error("No recording URI");

      // Use XHR for file upload — Expo's global fetch rejects the RN { uri, type, name } FormData pattern.
      // On 401 (token expired) we refresh via authFetch and retry once.
      const sendXHR = (token: string | null) =>
        new Promise<{ transcript?: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_BASE}/companion/transcribe`);
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
            } else if (xhr.status === 401) {
              reject(new Error("TOKEN_EXPIRED"));
            } else if (xhr.status === 429) {
              try {
                const body = JSON.parse(xhr.responseText);
                reject(new Error(body.error === "DAILY_LIMIT_REACHED" ? "DAILY_LIMIT_REACHED" : "RATE_LIMITED"));
              } catch { reject(new Error("RATE_LIMITED")); }
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.timeout = 30000;
          xhr.ontimeout = () => reject(new Error("Transcription timed out"));
          const form = new FormData();
          const mimeType = uri.endsWith(".wav") ? "audio/wav" : "audio/m4a";
          const fileName = uri.endsWith(".wav") ? "voice.wav" : "voice.m4a";
          form.append("audio", { uri, type: mimeType, name: fileName } as any);
          if (companion?.id) form.append("companionId", companion.id);
          xhr.send(form);
        });

      let data: { transcript?: string } = {};
      try {
        data = await sendXHR(accessTokenRef.current);
      } catch (xhrErr: any) {
        if (xhrErr?.message === "TOKEN_EXPIRED") {
          // Token expired — trigger authFetch which handles the /auth/refresh call internally
          await authFetchRef.current(`${API_BASE}/auth/me`).catch(() => {});
          // accessTokenRef is updated synchronously by tryRefresh in authFetch
          data = await sendXHR(accessTokenRef.current);
        } else {
          throw xhrErr;
        }
      }
      const transcript = data.transcript?.trim();

      if (transcript && !isSilenceOrHallucination(transcript)) {
        consecutiveSilencesRef.current = 0;
        addToTranscript({ role: "user", content: transcript });
        await runAITurn(transcript);
      } else {
        // No speech or Whisper hallucination — companion prompts user naturally
        await handleSilence();
      }
    } catch (err: any) {
      if (err?.message === "DAILY_LIMIT_REACHED" || err?.message === "RATE_LIMITED") {
        const msg = err.message === "DAILY_LIMIT_REACHED"
          ? "You've used today's credits for this companion. Come back tomorrow!"
          : "Too many requests. Wait a moment and try again.";
        Alert.alert("Limit reached", msg, [{ text: "OK", onPress: () => endCallRef.current?.() }]);
        return;
      }
      if (!isAliveRef.current) return;
      addToTranscript({ role: "user", content: `(transcription error: ${err?.message ?? "unknown"})` });
      setPhase("idle");
      phaseRef.current = "idle";
      startListening();
    }
  }, [clearSilenceTimer, runAITurn, handleSilence, startListening, addToTranscript]);

  // Keep processRecordingRef pointing at the latest closure
  useEffect(() => {
    processRecordingRef.current = processRecording;
  }, [processRecording]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // When user toggles mute on while recording, stop listening
  useEffect(() => {
    if (isMuted && phaseRef.current === "recording") {
      isStoppingRef.current = true;
      clearSilenceTimer();
      consecutiveSilencesRef.current = 0;
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      setPhase("idle");
      phaseRef.current = "idle";
    }
  }, [isMuted, clearSilenceTimer]);

  // Greeting → auto-listen
  useEffect(() => {
    if (!companion) return;

    const init = async () => {
      await hapticsNotification(NotificationFeedbackType.Success);

      if (Platform.OS !== "web") {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Microphone access is needed for voice calls.",
            [{ text: "OK", onPress: () => router.back() }]
          );
          return;
        }
      }

      setPhase("thinking");
      phaseRef.current = "thinking";

      try {
        const typeInfo = COMPANION_TYPES[companion.type];
        const greetingPrompt = `You just received a voice call from the user. Greet them warmly and naturally in 1 sentence. Be yourself (${typeInfo.label} companion).`;
        const res = await authFetchRef.current(`${API_BASE}/companion/chat-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
            messages: [{ role: "user", content: greetingPrompt }],
          }),
        });
        const data = await res.json() as { content: string };
        const greeting = data.content || `Hey! So great to hear from you!`;
        addToTranscript({ role: "assistant", content: greeting });
        setPhase("speaking");
        phaseRef.current = "speaking";
        await playTTS(greeting);
      } catch (err) {
        console.warn("[Call] Greeting failed:", err);
      }

      setPhase("idle");
      phaseRef.current = "idle";
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

      // Auto-start listening right after greeting
      startListening();
    };

    init();

    return () => {
      isAliveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      clearSilenceTimer();
      stopSound();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // Tap mic = stop and send immediately (don't wait for silence timeout)
  const handleMicPress = () => {
    if (Platform.OS === "web") {
      Alert.alert("Voice Calls", "Voice calling is available on iOS and Android via Expo Go.");
      return;
    }
    if (phase === "recording" && !isStoppingRef.current) {
      isStoppingRef.current = true;
      clearSilenceTimer();
      processRecording();
    }
  };

  const extractMemories = useCallback(
    async (msgs: CallMessage[]) => {
      if (!companion || msgs.length < 2) return;
      try {
        const res = await authFetchRef.current(`${API_BASE}/companion/extract-memory`, {
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
    isStoppingRef.current = true;
    clearSilenceTimer();
    await stopSound();
    await recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;

    if (companion && transcriptRef.current.length > 0) {
      extractMemories(transcriptRef.current);

      const aiTurns = transcriptRef.current.filter((m) => m.role === "assistant").length;
      if (aiTurns >= 1) {
        const callBonus = aiTurns >= 4 ? 6 : 3;
        await updateRelationshipLevel(companion.id, callBonus);
      }
    }

    // Release the active audio session so other apps (Music, etc.) resume normally
    if (Platform.OS !== "web") {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    }

    await hapticsNotification(NotificationFeedbackType.Warning);
    router.back();
  }, [companion, updateRelationshipLevel, stopSound, clearSilenceTimer, extractMemories]);

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
  const micDisabled = phase !== "recording" || isMuted;

  // Silence countdown hint (shows "sending in 1s", "sending in 2s", etc.)
  const showCountdown = phase === "recording" && silenceCountdown > 0 && silenceCountdown <= 3;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0D0D18", "#1A1130", "#0D0D18"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

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
        <Animated.View
          style={[
            styles.outerRing,
            { borderColor: companion.avatarGradient[0] },
            outerRingStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.innerRing,
            {
              borderColor:
                phase === "recording" ? "#ef4444" : "#ffffff",
            },
            innerRingStyle,
          ]}
        />
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
          {phase === "recording" && <View style={styles.recDot} />}
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

        {/* Dynamic hint below status pill */}
        <Text style={styles.hintText}>
          {showCountdown
            ? `Sending in ${silenceCountdown}s · tap mic to send now`
            : phase === "recording"
            ? "Speak now · tap mic to send early"
            : " "}
        </Text>
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
                  color: msg.content.startsWith("(")
                    ? "rgba(255,255,255,0.3)"
                    : msg.role === "user"
                    ? "rgba(255,255,255,0.75)"
                    : "rgba(255,255,255,0.9)",
                  fontStyle: msg.content.startsWith("(") ? "italic" : "normal",
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
          onPress={() => {
            setIsMuted((m) => !m);
            hapticsImpact(ImpactFeedbackStyle.Light);
          }}
          style={[
            styles.sideBtn,
            {
              backgroundColor: isMuted
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.08)",
            },
          ]}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic-outline"}
            size={22}
            color={isMuted ? "#ffffff" : "rgba(255,255,255,0.6)"}
          />
        </Pressable>

        {/* Speaker toggle */}
        <Pressable
          onPress={toggleSpeaker}
          style={[
            styles.sideBtn,
            {
              backgroundColor: isSpeakerOn
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.08)",
            },
          ]}
        >
          <Ionicons
            name={isSpeakerOn ? "volume-high" : "volume-off"}
            size={22}
            color={isSpeakerOn ? "#ffffff" : "rgba(255,255,255,0.6)"}
          />
        </Pressable>

        {/* Main button: send-early when recording, visual indicator otherwise */}
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
                  ? ["#2a2a2a", "#1a1a1a"]
                  : companion.avatarGradient
              }
              style={styles.micBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={micActive ? "stop" : "mic"}
                size={30}
                color={micDisabled && !micActive ? "rgba(255,255,255,0.2)" : "#ffffff"}
              />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* End call */}
        <Pressable
          onPress={endCall}
          style={[
            styles.sideBtn,
            {
              backgroundColor: "#ef444422",
              borderColor: "#ef444444",
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons
            name="call"
            size={22}
            color="#ef4444"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </Pressable>
      </View>

      {Platform.OS === "web" && (
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
    gap: 6,
    minHeight: 52,
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
  hintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.2,
    minHeight: 16,
  },
  transcript: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 24,
  },
  transcriptContent: {
    gap: 10,
    paddingBottom: 8,
  },
  transcriptLine: { gap: 2 },
  transcriptUser: { alignItems: "flex-end" },
  transcriptAi: { alignItems: "flex-start" },
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
    gap: 18,
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
