import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/AvatarImage";
import { MoodCanvas } from "@/components/MoodCanvas";
import { useAuth } from "@/context/AuthContext";
import { useCompanions } from "@/context/CompanionContext";
import { API_BASE } from "@/utils/api";
import { useColors } from "@/hooks/useColors";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = "checkin" | "breathing" | "journal" | "gratitude";

// Warm, muted palette matching the app theme
const ACTIVITY_META: Record<
  ActivityType,
  { title: string; gradient: [string, string]; btnGradient: [string, string]; icon: string; accentColor: string }
> = {
  checkin:   {
    title: "Daily Check-in",
    gradient: ["#FDDCA4", "#F5B06A"],
    btnGradient: ["#D99030", "#C47028"],
    accentColor: "#B87020",
    icon: "sunny-outline",
  },
  breathing: {
    title: "Breathing",
    gradient: ["#A8D4C0", "#72B8A0"],
    btnGradient: ["#4EA888", "#2E9070"],
    accentColor: "#267A60",
    icon: "leaf-outline",
  },
  journal:   {
    title: "Journal Prompt",
    gradient: ["#C4B8E4", "#A094CC"],
    btnGradient: ["#8070C0", "#6050A8"],
    accentColor: "#5840A4",
    icon: "journal-outline",
  },
  gratitude: {
    title: "Gratitude",
    gradient: ["#F4B4C8", "#E890B0"],
    btnGradient: ["#C87090", "#B05878"],
    accentColor: "#B04068",
    icon: "heart-outline",
  },
};


const STORAGE_PREFIX = "halochat_activity_done_";
const STREAK_PREFIX  = "halochat_activity_streak_";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function markDone(type: ActivityType) {
  const today = todayKey();
  await AsyncStorage.setItem(`${STORAGE_PREFIX}${type}_${today}`, "1");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const didYesterday = await AsyncStorage.getItem(`${STORAGE_PREFIX}${type}_${yKey}`);
  const current = parseInt((await AsyncStorage.getItem(`${STREAK_PREFIX}${type}`)) ?? "0", 10);
  const newStreak = didYesterday === "1" ? current + 1 : 1;
  await AsyncStorage.setItem(`${STREAK_PREFIX}${type}`, String(newStreak));
}

// ─── Companion Picker ─────────────────────────────────────────────────────────

function CompanionPicker({
  selected,
  onSelect,
  colors,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { companions } = useCompanions();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.companionRow}
    >
      {companions.map((c) => (
        <Pressable key={c.id} onPress={() => onSelect(c.id)} style={styles.companionItem}>
          <View
            style={[
              styles.companionRing,
              {
                borderColor: selected === c.id ? c.avatarGradient[0] : "transparent",
              },
            ]}
          >
            <AvatarImage
              avatarId={c.avatarId}
              gradient={c.avatarGradient}
              name={c.name}
              size={46}
            />
          </View>
          <Text
            style={[
              styles.companionName,
              { color: selected === c.id ? c.avatarGradient[0] : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {c.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Companion response block ─────────────────────────────────────────────────

function CompanionResponse({
  text,
  loading,
  companionName,
  companionGradient,
  colors,
}: {
  text: string | null;
  loading: boolean;
  companionName: string;
  companionGradient: [string, string];
  colors: ReturnType<typeof useColors>;
}) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })), -1);
      dot2.value = withRepeat(withSequence(withTiming(0, { duration: 200 }), withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })), -1);
      dot3.value = withRepeat(withSequence(withTiming(0, { duration: 400 }), withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })), -1);
    } else {
      dot1.value = 0; dot2.value = 0; dot3.value = 0;
    }
  }, [loading]);

  const d1Style = useAnimatedStyle(() => ({ opacity: 0.3 + dot1.value * 0.7, transform: [{ translateY: -dot1.value * 4 }] }));
  const d2Style = useAnimatedStyle(() => ({ opacity: 0.3 + dot2.value * 0.7, transform: [{ translateY: -dot2.value * 4 }] }));
  const d3Style = useAnimatedStyle(() => ({ opacity: 0.3 + dot3.value * 0.7, transform: [{ translateY: -dot3.value * 4 }] }));

  if (!loading && !text) return null;

  return (
    <View style={[styles.responseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.responseHeader}>
        <AvatarImage
          avatarId={undefined}
          gradient={companionGradient}
          name={companionName}
          size={32}
        />
        <Text style={[styles.responseCompanionName, { color: colors.foreground }]}>{companionName}</Text>
      </View>
      {loading ? (
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, { backgroundColor: companionGradient[0] }, d1Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: companionGradient[0] }, d2Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: companionGradient[0] }, d3Style]} />
        </View>
      ) : (
        <Text style={[styles.responseText, { color: colors.foreground }]}>{text}</Text>
      )}
    </View>
  );
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function askCompanion(
  accessToken: string,
  companion: { type: string; name: string; gender?: string; traits?: string[]; customPersonality?: string; memoryNotes?: string[]; relationshipLevel?: number },
  userMessage: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/companion/chat-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      companionType: companion.type,
      companionName: companion.name,
      companionGender: companion.gender,
      traits: companion.traits,
      customPersonality: companion.customPersonality,
      memoryNotes: companion.memoryNotes ?? [],
      relationshipLevel: companion.relationshipLevel ?? 0,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json() as { content: string };
  return data.content;
}

// ─── Check-in Activity ────────────────────────────────────────────────────────

function CheckinActivity({
  colors,
  meta,
  onDone,
}: {
  colors: ReturnType<typeof useColors>;
  meta: (typeof ACTIVITY_META)[ActivityType];
  onDone: () => void;
}) {
  const { companions } = useCompanions();
  const { accessToken } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(companions[0]?.id ?? null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const companion = companions.find((c) => c.id === selectedCompanion);

  const handleSubmit = async () => {
    if (!selectedMood || !companion || !accessToken) return;
    setLoading(true);
    setSubmitted(true);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = note.trim()
        ? `I'm feeling ${selectedMood} today. ${note.trim()}`
        : `I'm feeling ${selectedMood} today.`;
      const reply = await askCompanion(accessToken, companion, msg);
      setResponse(reply);
      await markDone("checkin");
      hapticsNotification();
      onDone();
    } catch {
      setResponse("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.activityBody}>
      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
        How are you feeling right now?
      </Text>

      {/* 2-D mood canvas */}
      <MoodCanvas
        colors={colors}
        onMoodChange={(text) => setSelectedMood(text.split(" · ")[0])}
      />

      {selectedMood && !submitted && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 12 }]}>
            Anything on your mind? (optional)
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Share what's going on..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={note}
            onChangeText={setNote}
            maxLength={300}
          />

          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 12 }]}>
            Share with
          </Text>
          <CompanionPicker selected={selectedCompanion} onSelect={setSelectedCompanion} colors={colors} />

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1, marginTop: 16 }]}
          >
            <LinearGradient
              colors={meta.btnGradient}
              style={styles.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitBtnText}>Share with {companion?.name}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </>
      )}

      {submitted && companion && (
        <CompanionResponse
          text={response}
          loading={loading}
          companionName={companion.name}
          companionGradient={companion.avatarGradient}
          colors={colors}
        />
      )}
    </View>
  );
}

// ─── Tone fallback ────────────────────────────────────────────────────────────
// Generates a WAV sine-wave tone and writes it to the device cache so expo-av
// can play it. Used when expo-speech is not available (Expo Go / link issues).
function makeToneWav(hz: number, ms: number): string {
  const sr = 8000;
  const n = Math.floor(sr * ms / 1000);
  const fade = Math.min(300, Math.floor(n * 0.15));
  const buf = new Uint8Array(44 + n);
  const w4 = (o: number, s: string) => { for (let i = 0; i < 4; i++) buf[o + i] = s.charCodeAt(i); };
  const u32 = (o: number, v: number) => { buf[o]=v&255; buf[o+1]=(v>>8)&255; buf[o+2]=(v>>16)&255; buf[o+3]=(v>>24)&255; };
  const u16 = (o: number, v: number) => { buf[o]=v&255; buf[o+1]=(v>>8)&255; };
  w4(0,"RIFF"); u32(4,36+n); w4(8,"WAVE"); w4(12,"fmt "); u32(16,16);
  u16(20,1); u16(22,1); u32(24,sr); u32(28,sr); u16(32,1); u16(34,8);
  w4(36,"data"); u32(40,n);
  for (let i = 0; i < n; i++) {
    const amp = i < fade ? i/fade : i > n-fade ? (n-i)/fade : 1;
    buf[44+i] = Math.round(128 + 90 * amp * Math.sin(2 * Math.PI * hz * i / sr));
  }
  let b = ""; for (let i = 0; i < buf.length; i++) b += String.fromCharCode(buf[i]);
  return btoa(b);
}

// ─── Breathing Activity ───────────────────────────────────────────────────────

function BreathingActivity({
  colors,
  meta,
  onDone,
}: {
  colors: ReturnType<typeof useColors>;
  meta: (typeof ACTIVITY_META)[ActivityType];
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "countdown" | "inhale" | "hold" | "exhale" | "done">("idle");
  const [cycle, setCycle] = useState(0);
  const [countDown, setCountDown] = useState(0);
  const [startCount, setStartCount] = useState(3);
  const totalCycles = 4;

  const breathe   = useSharedValue(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.93 + breathe.value * 0.12 }],
  }));
  // Rings: filled blobs that bloom outward — more visceral than just borders
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.28 }],
    opacity: 0.28 + breathe.value * 0.3,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.52 }],
    opacity: 0.12 + breathe.value * 0.18,
  }));

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const [voiceMuted, setVoiceMuted] = useState(false);
  const voiceMutedRef = useRef(false);
  useEffect(() => { voiceMutedRef.current = voiceMuted; }, [voiceMuted]);

  // speechRef is loaded in useEffect (post-mount) so new-arch TurboModules are
  // fully instantiated before we touch them. Null = expo-speech not available.
  const speechRef = useRef<{ speak(t: string, o?: object): void; stop(): void } | null>(null);
  const toneRef   = useRef<any>(null);

  const playTone = useCallback(async (hz: number, ms: number) => {
    try {
      if (toneRef.current) { await toneRef.current.stopAsync().catch(() => {}); await toneRef.current.unloadAsync().catch(() => {}); toneRef.current = null; }
      const path = (FileSystem.cacheDirectory ?? "") + "hc_breath_tone.wav";
      await FileSystem.writeAsStringAsync(path, makeToneWav(hz, ms), { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true, volume: 1 });
      toneRef.current = sound;
    } catch { /* noop */ }
  }, []);

  const speak = useCallback((text: string) => {
    if (voiceMutedRef.current) return;
    const S = speechRef.current;
    if (S) {
      try { S.stop(); S.speak(text, { language: "en-US", rate: 0.75, pitch: 1.15 }); } catch { /* noop */ }
      return;
    }
    // expo-speech unavailable — play a distinct tone for each phase
    const tones: Record<string, [number, number]> = {
      "Breathe in":  [370, 380],
      "Hold":        [330, 280],
      "Breathe out": [280, 480],
      "Well done":   [440, 420],
    };
    const [hz, ms] = tones[text] ?? [370, 300];
    playTone(hz, ms);
  }, [playTone]);

  const stopSpeech = useCallback(() => {
    try { speechRef.current?.stop(); } catch { /* noop */ }
    toneRef.current?.stopAsync().catch(() => {});
  }, []);

  const runPhase = useCallback(
    (p: "inhale" | "hold" | "exhale", durationSec: number, nextFn: () => void) => {
      setPhase(p);
      setCountDown(durationSec);
      cancelAnimation(breathe);

      // Voice cue
      if (p === "inhale") speak("Breathe in");
      else if (p === "hold") speak("Hold");
      else speak("Breathe out");

      // Animation
      if (p === "inhale") {
        breathe.value = withTiming(1, { duration: durationSec * 1000, easing: Easing.out(Easing.ease) });
      } else if (p === "hold") {
        breathe.value = withRepeat(
          withSequence(
            withTiming(0.91, { duration: 800 }),
            withTiming(1, { duration: 800 }),
          ), -1, true
        );
      } else {
        breathe.value = withTiming(0, { duration: durationSec * 1000, easing: Easing.in(Easing.ease) });
      }

      let remaining = durationSec;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountDown(remaining);
        if (remaining <= 0) { clearTimer(); nextFn(); }
      }, 1000);
    },
    [breathe]
  );

  const startCycle = useCallback(
    (cycleNum: number) => {
      if (cycleNum >= totalCycles) {
        setPhase("done");
        cancelAnimation(breathe);
        breathe.value = withTiming(0.2, { duration: 1000 });
        speak("Well done");
        markDone("breathing");
        hapticsNotification();
        onDone();
        return;
      }
      setCycle(cycleNum);
      runPhase("inhale", 4, () =>
        runPhase("hold", 4, () =>
          runPhase("exhale", 4, () => startCycle(cycleNum + 1))
        )
      );
    },
    [runPhase, onDone, breathe]
  );

  const beginCountdown = useCallback(() => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setPhase("countdown");
    setStartCount(3);
    cancelAnimation(breathe);
    // Gentle anticipation pulse while counting down
    breathe.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.04, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ), -1, false
    );
    let remaining = 3;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setStartCount(remaining);
      if (remaining <= 0) { clearTimer(); startCycle(0); }
    }, 1000);
  }, [breathe, startCycle]);

  useEffect(() => {
    // 1. Override the iOS silent switch — AVSpeechSynthesizer inherits the
    //    AVAudioSession category set here, so audio plays even with ringer off.
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false }).catch(() => {});

    // 2. Only load expo-speech when NativeModules confirms it's registered.
    //    This is a plain JS object lookup — never throws, never emits errors.
    //    On new-arch the module goes through a JSI proxy so NativeModules may
    //    not list it; in that case the tone fallback below handles audio.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NativeModules } = require("react-native");
      if (NativeModules?.ExpoSpeech != null) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        speechRef.current = require("expo-speech");
      }
    } catch { /* noop */ }

    return () => {
      clearTimer();
      stopSpeech();
      toneRef.current?.unloadAsync().catch(() => {});
    };
  }, [stopSpeech]);

  const phaseLabel: Record<typeof phase, string> = {
    idle:      "Tap to begin",
    countdown: "Get ready",
    inhale:    "Breathe in",
    hold:      "Hold",
    exhale:    "Breathe out",
    done:      "Complete",
  };

  return (
    <View style={styles.breathingScreen}>
      {/* Pattern chip + mute toggle */}
      <View style={styles.breathingMeta}>
        <View style={styles.breathingMetaRow}>
          <View style={[styles.breathingPatternChip, { backgroundColor: `${meta.gradient[0]}28`, borderColor: `${meta.gradient[0]}50` }]}>
            <Text style={[styles.breathingPatternText, { color: meta.accentColor }]}>
              Inhale 4  ·  Hold 4  ·  Exhale 4
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setVoiceMuted((m) => !m);
              if (!voiceMuted) stopSpeech();
              hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.muteBtn,
              {
                backgroundColor: voiceMuted ? `${meta.gradient[0]}18` : `${meta.accentColor}18`,
                borderColor: voiceMuted ? colors.border : `${meta.accentColor}50`,
              },
            ]}
          >
            <Ionicons
              name={voiceMuted ? "volume-mute-outline" : "volume-medium-outline"}
              size={17}
              color={voiceMuted ? colors.mutedForeground : meta.accentColor}
            />
          </Pressable>
        </View>
        <Text style={[styles.breathingCycleHint, { color: colors.mutedForeground }]}>
          {totalCycles} cycles · about 3 min
        </Text>
      </View>

      {/* Circle area */}
      <View style={styles.breathingCircleWrap}>
        {/* Filled bloom rings — same gradient family, expand on inhale */}
        <Animated.View style={[styles.breathingRing2, { backgroundColor: meta.gradient[0] }, ring2Style]} />
        <Animated.View style={[styles.breathingRing1, { backgroundColor: meta.gradient[0] }, ring1Style]} />

        {/* Solid gradient orb — the complement of the pink HaloBackground */}
        <Animated.View style={[styles.breathingInnerWrap, innerStyle]}>
          <LinearGradient
            colors={[meta.gradient[0], meta.gradient[1]]}
            style={styles.breathingInner}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
          >
            <Pressable
              onPress={() => { if (phase === "idle") beginCountdown(); }}
              style={styles.breathingPressable}
            >
              <Text style={styles.breathingPhase}>{phaseLabel[phase]}</Text>
              {phase === "countdown" && startCount > 0 && (
                <Text style={styles.breathingCount}>{startCount}</Text>
              )}
              {phase !== "countdown" && phase !== "idle" && phase !== "done" && countDown > 0 && (
                <Text style={styles.breathingCount}>{countDown}</Text>
              )}
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Footer: cycle dots or done card */}
      <View style={styles.breathingFooter}>
        {phase !== "idle" && phase !== "countdown" && phase !== "done" && (
          <View style={styles.cycleRow}>
            {Array.from({ length: totalCycles }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.cycleDot,
                  {
                    backgroundColor:
                      i < cycle   ? meta.accentColor :
                      i === cycle ? meta.gradient[0] :
                      `${meta.accentColor}30`,
                    transform: [{ scale: i === cycle ? 1.5 : 1 }],
                  },
                ]}
              />
            ))}
          </View>
        )}

        {phase === "done" && (
          <View style={[styles.breathingDoneCard, { backgroundColor: `${meta.accentColor}10`, borderColor: `${meta.accentColor}30` }]}>
            <View style={[styles.breathingDoneIcon, { backgroundColor: `${meta.accentColor}20` }]}>
              <Ionicons name="checkmark" size={22} color={meta.accentColor} />
            </View>
            <View style={styles.breathingDoneTextWrap}>
              <Text style={[styles.breathingDoneTitle, { color: colors.foreground }]}>Session complete</Text>
              <Text style={[styles.breathingDoneText, { color: colors.mutedForeground }]}>
                {totalCycles} cycles done. Notice how you feel — a little clearer, a little calmer.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Journal Activity ─────────────────────────────────────────────────────────

function JournalActivity({
  colors,
  meta,
  onDone,
}: {
  colors: ReturnType<typeof useColors>;
  meta: (typeof ACTIVITY_META)[ActivityType];
  onDone: () => void;
}) {
  const { companions } = useCompanions();
  const { accessToken } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(companions[0]?.id ?? null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [entry, setEntry] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const companion = companions.find((c) => c.id === selectedCompanion);

  const fetchPrompt = async () => {
    if (!companion || !accessToken) return;
    setLoadingPrompt(true);
    try {
      const p = await askCompanion(
        accessToken,
        companion,
        "Give me one thoughtful journal prompt for today — something that makes me reflect on my feelings, values, or experiences. Just the prompt, no extra commentary. Keep it to 1-2 sentences."
      );
      setPrompt(p);
    } catch {
      setPrompt("What's one thing that happened today that you didn't expect? How did it make you feel?");
    } finally {
      setLoadingPrompt(false);
    }
  };

  useEffect(() => { if (selectedCompanion) fetchPrompt(); }, [selectedCompanion]);

  const handleSubmit = async () => {
    if (!entry.trim() || !companion || !accessToken) return;
    setLoadingReply(true);
    setSubmitted(true);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = `I journaled today. The prompt was: "${prompt}"\n\nHere's what I wrote:\n${entry.trim()}\n\nPlease respond with warmth and reflection — no more than 3-4 sentences.`;
      const r = await askCompanion(accessToken, companion, msg);
      setReply(r);
      await markDone("journal");
      hapticsNotification();
      onDone();
    } catch {
      setReply("Something went wrong. Please try again.");
    } finally {
      setLoadingReply(false);
    }
  };

  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.activityBody}>
      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Write with</Text>
      <CompanionPicker selected={selectedCompanion} onSelect={setSelectedCompanion} colors={colors} />

      {loadingPrompt ? (
        <View style={[styles.promptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={meta.accentColor} />
        </View>
      ) : prompt ? (
        <View style={[styles.journalPromptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.journalPromptStripe, { backgroundColor: meta.accentColor }]} />
          <View style={styles.journalPromptBody}>
            <Text style={[styles.journalPromptLabel, { color: meta.accentColor }]}>TODAY'S PROMPT</Text>
            <Text style={[styles.promptText, { color: colors.foreground }]}>{prompt}</Text>
          </View>
        </View>
      ) : null}

      {!submitted && prompt && (
        <>
          <View
            style={[
              styles.journalTextareaWrap,
              {
                backgroundColor: colors.card,
                borderColor: focused ? meta.accentColor : colors.border,
                borderWidth: focused ? 1.5 : 1,
              },
            ]}
          >
            <TextInput
              style={[styles.journalTextarea, { color: colors.foreground }]}
              placeholder="Start writing..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              value={entry}
              onChangeText={setEntry}
              maxLength={1000}
              textAlignVertical="top"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <Text style={[styles.journalCharCount, { color: colors.mutedForeground }]}>
              {entry.length} / 1000
            </Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={!entry.trim()}
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : entry.trim() ? 1 : 0.4, marginTop: 4 }]}
          >
            <LinearGradient
              colors={meta.btnGradient}
              style={styles.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitBtnText}>Share with {companion?.name}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </>
      )}

      {submitted && companion && (
        <CompanionResponse
          text={reply}
          loading={loadingReply}
          companionName={companion.name}
          companionGradient={companion.avatarGradient}
          colors={colors}
        />
      )}
    </View>
  );
}

// ─── Gratitude Activity ───────────────────────────────────────────────────────

function GratitudeActivity({
  colors,
  meta,
  onDone,
}: {
  colors: ReturnType<typeof useColors>;
  meta: (typeof ACTIVITY_META)[ActivityType];
  onDone: () => void;
}) {
  const { companions } = useCompanions();
  const { accessToken } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(companions[0]?.id ?? null);
  const [items, setItems] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const companion = companions.find((c) => c.id === selectedCompanion);
  const filled = items.filter((i) => i.trim().length > 0);

  const handleSubmit = async () => {
    if (filled.length < 1 || !companion || !accessToken) return;
    setLoading(true);
    setSubmitted(true);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const list = filled.map((item, i) => `${i + 1}. ${item}`).join("\n");
      const msg = `Today I'm grateful for:\n${list}\n\nRespond warmly to my gratitude list in 2-3 sentences. Be genuine, not generic.`;
      const r = await askCompanion(accessToken, companion, msg);
      setReply(r);
      await markDone("gratitude");
      hapticsNotification();
      onDone();
    } catch {
      setReply("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const PLACEHOLDERS = [
    "Something that made you smile today...",
    "Someone who showed up for you...",
    "A small moment that felt good...",
  ];

  return (
    <View style={styles.activityBody}>
      {/* Header with live progress */}
      <View style={styles.gratitudeHeader}>
        <View style={{ gap: 3 }}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            Three things you're grateful for
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Big or small — anything counts.
          </Text>
        </View>
        <View style={styles.gratitudeProgressDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.gratitudeProgressDot,
                { backgroundColor: items[i].trim() ? meta.accentColor : colors.muted },
              ]}
            />
          ))}
        </View>
      </View>

      {items.map((val, i) => (
        <View
          key={i}
          style={[
            styles.gratitudeRow,
            {
              backgroundColor: colors.card,
              borderColor: val.trim() ? `${meta.accentColor}40` : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.gratitudeNum,
              { backgroundColor: val.trim() ? meta.accentColor : `${meta.accentColor}12` },
            ]}
          >
            {val.trim() ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : (
              <Text style={[styles.gratitudeNumText, { color: meta.accentColor }]}>{i + 1}</Text>
            )}
          </View>
          <TextInput
            style={[styles.gratitudeInput, { color: colors.foreground }]}
            placeholder={PLACEHOLDERS[i]}
            placeholderTextColor={colors.mutedForeground}
            value={val}
            onChangeText={(t) => setItems((prev) => { const n = [...prev]; n[i] = t; return n; })}
            maxLength={150}
            returnKeyType={i < 2 ? "next" : "done"}
          />
        </View>
      ))}

      {!submitted && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 8 }]}>Share with</Text>
          <CompanionPicker selected={selectedCompanion} onSelect={setSelectedCompanion} colors={colors} />
          <Pressable
            onPress={handleSubmit}
            disabled={filled.length < 1}
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : filled.length >= 1 ? 1 : 0.4, marginTop: 16 }]}
          >
            <LinearGradient
              colors={meta.btnGradient}
              style={styles.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitBtnText}>Share with {companion?.name}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </>
      )}

      {submitted && companion && (
        <CompanionResponse
          text={reply}
          loading={loading}
          companionName={companion.name}
          companionGradient={companion.avatarGradient}
          colors={colors}
        />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [done, setDone] = useState(false);

  const activityType = (type as ActivityType) ?? "checkin";
  const meta = ACTIVITY_META[activityType] ?? ACTIVITY_META.checkin;

  const handleDone = useCallback(() => setDone(true), []);

  const renderActivity = () => {
    switch (activityType) {
      case "checkin":
        return <CheckinActivity colors={colors} meta={meta} onDone={handleDone} />;
      case "breathing":
        return <BreathingActivity colors={colors} meta={meta} onDone={handleDone} />;
      case "journal":
        return <JournalActivity colors={colors} meta={meta} onDone={handleDone} />;
      case "gratitude":
        return <GratitudeActivity colors={colors} meta={meta} onDone={handleDone} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      {/* Gradient header */}
      <LinearGradient
        colors={meta.gradient}
        style={[styles.header, { paddingTop: topPadding + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/activities")}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.headerCircleBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </View>
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerCircleBtn}>
            <Ionicons name={meta.icon as any} size={20} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>{meta.title}</Text>
        </View>

        {done && (
          <View style={styles.doneChip}>
            <Ionicons name="checkmark-circle" size={15} color="#FFF" />
            <Text style={styles.doneChipText}>Done</Text>
          </View>
        )}
      </LinearGradient>

      {activityType === "breathing" ? (
        // Breathing needs flex:1 so the circle can truly center itself
        <View style={{ flex: 1 }}>
          <BreathingActivity colors={colors} meta={meta} onDone={handleDone} />
          {done && (
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/activities")}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginHorizontal: 20, marginBottom: bottomPadding + 16 }]}
            >
              <LinearGradient
                colors={["#A89A8C", "#8A7C70"]}
                style={styles.backToList}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.backToListText}>Back to Activities</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </LinearGradient>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderActivity()}

          {done && (
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/activities")}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 24 }]}
            >
              <LinearGradient
                colors={["#A89A8C", "#8A7C70"]}
                style={styles.backToList}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.backToListText}>Back to Activities</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </LinearGradient>
            </Pressable>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  doneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  doneChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", fontWeight: "600", color: "#FFFFFF" },

  scroll: { padding: 20 },
  activityBody: { gap: 10 },

  sectionLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6, marginBottom: 2 },

  // 2-D mood canvas
  moodCanvasWrap: { gap: 8 },
  moodDescRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  moodDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  moodDescText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    flex: 1,
  },
  moodCanvas: {
    width: "100%",
    height: 172,
    borderRadius: 20,
    overflow: "hidden",
  },
  // Inputs
  textarea: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 88,
    textAlignVertical: "top",
  },
  textareaLarge: { minHeight: 150 },

  // Prompt card
  promptCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  promptText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },

  // Gratitude
  gratitudeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 10,
  },
  gratitudeNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gratitudeNumText: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  gratitudeInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },

  // Companion picker
  companionRow: { paddingVertical: 8, gap: 14 },
  companionItem: { alignItems: "center", gap: 6 },
  companionRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  companionName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    maxWidth: 64,
    textAlign: "center",
  },

  // Submit button
  submitBtn: {
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#3A2A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },

  // Companion response
  responseCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    marginTop: 16,
  },
  responseHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  responseCompanionName: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  responseText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  typingDots: { flexDirection: "row", gap: 6, paddingLeft: 4, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Breathing — full-screen layout
  breathingScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  breathingMeta: { alignItems: "center", gap: 6, marginBottom: 0 },
  breathingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  breathingPatternChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  breathingPatternText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  breathingCycleHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  breathingCircleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  breathingRing1: {
    position: "absolute",
    width: 248,
    height: 248,
    borderRadius: 124,
  },
  breathingRing2: {
    position: "absolute",
    width: 316,
    height: 316,
    borderRadius: 158,
  },
  breathingInnerWrap: {
    // Animated scale wrapper — keeps shadow outside gradient overflow:hidden
    shadowColor: "#267A60",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
    borderRadius: 96,
  },
  breathingInner: {
    width: 192,
    height: 192,
    borderRadius: 96,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  breathingPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  breathingPhase: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
    color: "#FFFFFF",
  },
  breathingCount: {
    fontSize: 58,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    lineHeight: 62,
    color: "#FFFFFF",
  },
  breathingFooter: {
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    paddingBottom: 8,
  },
  cycleRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  cycleDot: { width: 10, height: 10, borderRadius: 5 },
  breathingDoneCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    alignItems: "flex-start",
  },
  breathingDoneIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  breathingDoneTextWrap: { flex: 1, gap: 5 },
  breathingDoneTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  breathingDoneText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },

  // Journal
  journalPromptCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    minHeight: 72,
  },
  journalPromptStripe: {
    width: 4,
  },
  journalPromptBody: {
    flex: 1,
    padding: 14,
    gap: 5,
  },
  journalPromptLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  journalTextareaWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
  },
  journalTextarea: {
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 160,
    lineHeight: 24,
  },
  journalCharCount: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },

  // Gratitude
  gratitudeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  gratitudeProgressDots: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 3,
  },
  gratitudeProgressDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  // Back to list
  backToList: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: "#3A2A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  backToListText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: "#FFF",
    flex: 1,
    textAlign: "center",
  },
});
