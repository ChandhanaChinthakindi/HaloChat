import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ImpactFeedbackStyle } from "expo-haptics";
import { hapticsImpact, hapticsSelection } from "@/utils/haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const SW = Dimensions.get("window").width;
const AVATAR_CARD_W = SW - 48 - 24;
const AVATAR_CARD_H = AVATAR_CARD_W * 1.38;
const AVATAR_SNAP   = AVATAR_CARD_W + 12;

import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { TypeCard } from "@/components/TypeBadge";
import { getAvatarById, getAvatarsByGender } from "@/constants/avatars";
import {
  API_BASE,
  COMPANION_TRAITS,
  COMPANION_TYPES,
  type CompanionType,
  useCompanions,
} from "@/context/CompanionContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { HaloBackground } from "@/components/HaloBackground";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_SAMPLES: Record<CompanionType, string> = {
  romantic:   "I've been thinking about you all day. It's really good to hear from you.",
  supportive: "Hey, I'm here. Whatever's on your mind — I'm listening, no rush.",
  uplift:     "You are doing so much better than you think. I see it — even when you can't.",
  bestfriend: "Okay spill. What happened? I need to know absolutely everything right now.",
};

const VOICES_BY_GENDER: Record<string, { id: string; label: string }[]> = {
  female:    [{ id: "nova", label: "Nova" }, { id: "shimmer", label: "Shimmer" }, { id: "fable", label: "Fable" }],
  male:      [{ id: "onyx", label: "Onyx" }, { id: "echo", label: "Echo" }, { id: "alloy", label: "Alloy" }],
  nonbinary: [{ id: "nova", label: "Nova" }, { id: "shimmer", label: "Shimmer" }, { id: "onyx", label: "Onyx" }, { id: "echo", label: "Echo" }, { id: "alloy", label: "Alloy" }, { id: "fable", label: "Fable" }],
};

const ALL_VOICES = [
  { id: "nova",    label: "Nova"    }, { id: "shimmer", label: "Shimmer" },
  { id: "fable",   label: "Fable"   }, { id: "onyx",    label: "Onyx"    },
  { id: "echo",    label: "Echo"    }, { id: "alloy",   label: "Alloy"   },
];

const VOICE_DESCRIPTORS: Record<string, string> = {
  nova:    "Warm",
  shimmer: "Bright",
  fable:   "Mellow",
  onyx:    "Deep",
  echo:    "Crisp",
  alloy:   "Rich",
};

const COMPANION_SAMPLES: Record<CompanionType, string> = {
  romantic:   "thinking about you... hope your day's been good ♡",
  supportive: "hey, I'm here. whatever you need — no pressure.",
  uplift:     "you are doing so much better than you think ✨",
  bestfriend: "okay spill. what happened. I need to know everything",
};

const ALL_TYPES: CompanionType[] = ["romantic", "supportive", "uplift", "bestfriend"];

const GENDER_OPTIONS: { value: "female" | "male" | "nonbinary"; label: string; icon: string; pronouns: string }[] = [
  { value: "female",    label: "Female",     icon: "♀", pronouns: "She / Her"    },
  { value: "male",      label: "Male",       icon: "♂", pronouns: "He / Him"     },
  { value: "nonbinary", label: "Non-binary", icon: "⚧", pronouns: "They / Them" },
];

type Step = "type" | "name" | "gender" | "avatar" | "traits" | "voice" | "preview";

const STEP_TITLES: Record<Step, string> = {
  type:    "Personality",
  name:    "Name",
  gender:  "Gender",
  avatar:  "Face",
  traits:  "Vibe",
  voice:   "Voice",
  preview: "Preview",
};

// ─── Step progress segments ───────────────────────────────────────────────────

function StepProgress({ steps, currentIndex, gradient }: {
  steps: Step[];
  currentIndex: number;
  gradient: [string, string];
}) {
  const colors = useColors();
  return (
    <View style={spStyles.wrap}>
      {steps.map((step, i) => {
        const done   = i < currentIndex;
        const active = i === currentIndex;
        return (
          <View key={step} style={spStyles.segWrap}>
            <LinearGradient
              colors={done || active ? gradient : [colors.muted, colors.muted]}
              style={[
                spStyles.seg,
                { opacity: active ? 1 : done ? 0.65 : 0.28 },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {active && (
              <Text style={[spStyles.label, { color: gradient[0] }]}>{STEP_TITLES[step]}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const spStyles = StyleSheet.create({
  wrap:   { flexDirection: "row", gap: 4, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 2 },
  segWrap:{ flex: 1, alignItems: "center", gap: 4 },
  seg:    { height: 3, borderRadius: 2, width: "100%" },
  label:  { fontSize: 9, fontFamily: "Inter_600SemiBold", fontWeight: "600", letterSpacing: 0.3 },
});

// ─── Waveform bars (voice playback indicator) ─────────────────────────────────

function AnimatedBar({ maxH, duration, delay, playing }: { maxH: number; duration: number; delay: number; playing: boolean }) {
  const h = useSharedValue(3);
  useEffect(() => {
    if (playing) {
      h.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(maxH, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(3,    { duration, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false
        )
      );
    } else {
      cancelAnimation(h);
      h.value = withTiming(3, { duration: 150 });
    }
  }, [playing]); // eslint-disable-line
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[waveStyles.bar, style]} />;
}

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <View style={waveStyles.wrap}>
      <AnimatedBar maxH={16} duration={260} delay={0}   playing={playing} />
      <AnimatedBar maxH={22} duration={300} delay={80}  playing={playing} />
      <AnimatedBar maxH={18} duration={240} delay={160} playing={playing} />
      <AnimatedBar maxH={24} duration={320} delay={40}  playing={playing} />
      <AnimatedBar maxH={14} duration={280} delay={120} playing={playing} />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 3, alignItems: "center", height: 28 },
  bar:  { width: 3, borderRadius: 2, backgroundColor: "#FFF" },
});

// ─── GenderCard ───────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function GenderCard({ opt, active, gradient, onPress }: {
  opt: { value: string; label: string; icon: string; pronouns: string };
  active: boolean;
  gradient: [string, string];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      style={animStyle}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 14, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1,   { damping: 14, stiffness: 300 }); }}
    >
      <View style={[gStyles.card, { shadowColor: gradient[0], shadowOpacity: active ? 0.45 : 0.15, shadowRadius: active ? 18 : 10 }]}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={[gStyles.glass, { backgroundColor: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.52)", borderColor: active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.65)" }]} />
        <View style={gStyles.refraction} />
        <Text style={gStyles.icon}>{opt.icon}</Text>
        <Text style={[gStyles.label, { color: "#FFF", opacity: active ? 1 : 0.85 }]}>{opt.label}</Text>
        <Text style={[gStyles.pronouns, { color: active ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.6)" }]}>{opt.pronouns}</Text>
        {active && <View style={gStyles.check}><Ionicons name="checkmark-circle" size={15} color="#FFF" /></View>}
      </View>
    </AnimatedPressable>
  );
}

const gStyles = StyleSheet.create({
  card: {
    width: 105, height: 122, borderRadius: 26,
    alignItems: "center", justifyContent: "center", gap: 5,
    overflow: "hidden", shadowOffset: { width: 0, height: 8 }, elevation: 7,
  },
  glass:      { ...StyleSheet.absoluteFillObject, borderRadius: 26, borderWidth: 1 },
  refraction: { position: "absolute", top: 1, left: 16, right: 16, height: 1, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 1 },
  icon:       { fontSize: 26, marginBottom: 2 },
  label:      { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  pronouns:   { fontSize: 10, fontFamily: "Inter_400Regular" },
  check:      { position: "absolute", top: 8, right: 8 },
});

// ─── TraitPill ────────────────────────────────────────────────────────────────

function TraitPill({ trait, active, disabled, gradient, onPress }: {
  trait: string; active: boolean; disabled: boolean; gradient: [string, string]; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      style={[animStyle, { opacity: disabled ? 0.28 : 1 }]}
      onPress={onPress}
      onPressIn={() => { if (!disabled) scale.value = withSpring(0.92, { damping: 14 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14 }); }}
    >
      <View style={[tStyles.chip, { shadowColor: gradient[0], shadowOpacity: active ? 0.35 : 0.12, shadowRadius: active ? 12 : 6 }]}>
        <LinearGradient colors={gradient} style={[StyleSheet.absoluteFill, { borderRadius: 100 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <View style={[tStyles.glass, { backgroundColor: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.55)", borderColor: active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.7)" }]} />
        <View style={tStyles.refraction} />
        {active && <Ionicons name="checkmark" size={11} color="#FFF" style={{ zIndex: 1 }} />}
        <Text style={[tStyles.text, { color: "#FFF", opacity: active ? 1 : 0.82, zIndex: 1 }]}>{trait}</Text>
      </View>
    </AnimatedPressable>
  );
}

const tStyles = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 100,
    overflow: "hidden", shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  glass:      { ...StyleSheet.absoluteFillObject, borderRadius: 100, borderWidth: 1 },
  refraction: { position: "absolute", top: 1, left: 14, right: 14, height: 1, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 1 },
  text:       { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createCompanion } = useCompanions();
  const { accessToken, authFetch } = useAuth();
  const params = useLocalSearchParams<{ type?: CompanionType }>();
  const preselected = params.type ?? null;

  const [name, setName]                       = useState("");
  const [selectedType, setSelectedType]       = useState<CompanionType | null>(preselected);
  const [selectedTraits, setSelectedTraits]   = useState<string[]>([]);
  const [gender, setGender]                   = useState<"female" | "male" | "nonbinary" | null>(null);
  const [selectedAvatar, setSelectedAvatar]   = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice]     = useState<string | null>(null);
  const [playingVoice, setPlayingVoice]       = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice]       = useState<string | null>(null);
  const [isCreating, setIsCreating]           = useState(false);
  const soundRef           = useRef<Audio.Sound | null>(null);
  const activeVoiceReqRef  = useRef<number>(0);

  const steps: Step[] = preselected
    ? ["name", "gender", "avatar", "traits", "voice", "preview"]
    : ["type", "name", "gender", "avatar", "traits", "voice", "preview"];

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep  = steps[stepIndex];
  const isLastStep   = stepIndex === steps.length - 1;

  // ── Slide + fade transition ──
  const opacity      = useSharedValue(1);
  const slideX       = useSharedValue(0);
  const directionRef = useRef<1 | -1>(1);
  const animStyle    = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: slideX.value }],
  }));

  // Preview hero breathe
  const previewPulse = useSharedValue(1);
  useEffect(() => {
    if (currentStep === "preview") {
      previewPulse.value = withRepeat(
        withSequence(
          withTiming(1.012, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.988, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(previewPulse);
      previewPulse.value = 1;
    }
  }, [currentStep]); // eslint-disable-line
  const previewPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: previewPulse.value }] }));

  useEffect(() => { setSelectedVoice(null); setSelectedAvatar(null); }, [gender]);
  useEffect(() => { setSelectedTraits([]); }, [selectedType]);
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  // Auto-advance when a type is chosen — saves a tap
  useEffect(() => {
    if (currentStep !== "type" || selectedType === null) return;
    const t = setTimeout(() => {
      stopAudio();
      hapticsSelection();
      directionRef.current = 1;
      opacity.value = withTiming(0, { duration: 110 }, (done) => {
        if (done) runOnJS(applyStep)(stepIndex + 1);
      });
      slideX.value = withTiming(-28, { duration: 110 });
    }, 220);
    return () => clearTimeout(t);
  }, [selectedType]); // eslint-disable-line

  const topPadding    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { height: kbHeight, progress: kbProgress } = useReanimatedKeyboardAnimation();
  const footerAnimStyle = useAnimatedStyle(() => ({
    bottom: -kbHeight.value,
    paddingBottom: interpolate(kbProgress.value, [0, 1], [bottomPadding + 16, 8], Extrapolation.CLAMP),
  }));

  const activeGradient: [string, string] = selectedType
    ? COMPANION_TYPES[selectedType].gradient
    : ["#818263", "#6B5E45"];

  const voiceOptions = gender ? (VOICES_BY_GENDER[gender] ?? ALL_VOICES) : ALL_VOICES;
  const defaultVoice = selectedType ? COMPANION_TYPES[selectedType].voice : "nova";
  const effectiveVoice = selectedVoice ?? defaultVoice;

  const canProceed = (): boolean => {
    if (currentStep === "type") return selectedType !== null;
    if (currentStep === "name") return name.trim().length > 0;
    return true;
  };

  const isOptionalStep = currentStep === "gender" || currentStep === "avatar" || currentStep === "traits" || currentStep === "voice";
  const hasOptionalSelection =
    (currentStep === "gender"  && gender !== null) ||
    (currentStep === "avatar"  && selectedAvatar !== null) ||
    (currentStep === "traits"  && selectedTraits.length > 0) ||
    (currentStep === "voice"   && selectedVoice !== null);
  const nextLabel = currentStep === "voice"
    ? "Continue"
    : isOptionalStep ? (hasOptionalSelection ? "Continue" : "Skip") : "Next";

  // ── Navigation with slide ──
  const applyStep = (newIdx: number) => {
    setStepIndex(newIdx);
    slideX.value  = directionRef.current === 1 ? 36 : -36;
    opacity.value = 0;
    slideX.value  = withSpring(0, { damping: 20, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 200 });
  };

  const stopAudio = () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setPlayingVoice(null);
    setLoadingVoice(null);
    activeVoiceReqRef.current++;
  };

  const goNext = () => {
    if (!canProceed() || stepIndex >= steps.length - 1) return;
    stopAudio();
    Keyboard.dismiss();
    hapticsSelection();
    directionRef.current = 1;
    opacity.value = withTiming(0, { duration: 110 }, (done) => {
      if (done) runOnJS(applyStep)(stepIndex + 1);
    });
    slideX.value = withTiming(-28, { duration: 110 });
  };

  const goBack = () => {
    if (stepIndex === 0) {
      stopAudio();
      router.canGoBack() ? router.back() : router.replace("/(tabs)");
      return;
    }
    stopAudio();
    Keyboard.dismiss();
    hapticsSelection();
    directionRef.current = -1;
    opacity.value = withTiming(0, { duration: 110 }, (done) => {
      if (done) runOnJS(applyStep)(stepIndex - 1);
    });
    slideX.value = withTiming(28, { duration: 110 });
  };

  // ── Voice preview ──
  const handlePlayVoice = async (voiceId: string) => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (playingVoice === voiceId) { setPlayingVoice(null); return; }

    const reqId = ++activeVoiceReqRef.current;
    setLoadingVoice(voiceId);
    setPlayingVoice(null);

    try {
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      }
      const sample = selectedType ? VOICE_SAMPLES[selectedType] : VOICE_SAMPLES.uplift;
      const url = `${API_BASE}/companion/tts?text=${encodeURIComponent(sample)}&voice=${voiceId}`;
      let playUri = url;

      if (Platform.OS !== "web") {
        const localPath = `${FileSystem.cacheDirectory}voice_preview_${voiceId}.mp3`;
        const response = await authFetch(url);
        if (reqId !== activeVoiceReqRef.current) return;
        if (!response.ok) {
          try { console.warn("[TTS] server error:", await response.json()); } catch {}
          throw new Error(`TTS ${response.status}`);
        }
        const arrayBuf = await response.arrayBuffer();
        if (reqId !== activeVoiceReqRef.current) return;
        const bytes = new Uint8Array(arrayBuf);
        const chunks: string[] = [];
        for (let i = 0; i < bytes.length; i += 8192) {
          chunks.push(String.fromCharCode(...Array.from(bytes.subarray(i, Math.min(i + 8192, bytes.length)))));
        }
        await FileSystem.writeAsStringAsync(localPath, btoa(chunks.join("")), { encoding: "base64" as any });
        if (reqId !== activeVoiceReqRef.current) return;
        playUri = localPath;
      }

      if (reqId !== activeVoiceReqRef.current) return;

      const source = Platform.OS === "web"
        ? { uri: url, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined }
        : { uri: playUri };

      const { sound } = await Audio.Sound.createAsync(source as any, { shouldPlay: true });
      if (reqId !== activeVoiceReqRef.current) { sound.unloadAsync().catch(() => {}); return; }

      soundRef.current = sound;
      setPlayingVoice(voiceId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingVoice(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (err: any) {
      if (reqId === activeVoiceReqRef.current) {
        const msg = err?.message ?? "";
        if (msg.includes("500")) {
          Alert.alert("Voice preview unavailable", "The preview couldn't load right now. You can still select the voice — it'll work in chat.", [{ text: "OK" }]);
        }
      }
    } finally {
      if (reqId === activeVoiceReqRef.current) setLoadingVoice(null);
    }
  };

  // ── Create ──
  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsCreating(true);
    try {
      await hapticsImpact(ImpactFeedbackStyle.Medium);
      const companion = await createCompanion(
        name.trim(), selectedType, undefined,
        gender ?? undefined, selectedVoice ?? undefined,
        selectedTraits.length > 0 ? selectedTraits : undefined,
        selectedAvatar ?? undefined,
      );
      router.replace(`/chat/${companion.id}`);
    } catch (err: any) {
      console.error("[CreateCompanion]", err?.message ?? err);
      Alert.alert("Error", "Failed to create companion. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Step content ──
  const renderStep = () => {
    switch (currentStep) {

      case "type":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepQuestion, { color: colors.foreground }]}>
              What kind of companion{"\n"}are you looking for?
            </Text>
            <Text style={[styles.stepHint, { color: colors.label }]}>
              Each personality has a distinct voice and style
            </Text>
            <View style={styles.typeGrid}>
              {ALL_TYPES.map((type) => (
                <View key={type} style={styles.typeCell}>
                  <TypeCard
                    type={type}
                    selected={selectedType === type}
                    onPress={() => { hapticsSelection(); setSelectedType(type); }}
                  />
                </View>
              ))}
            </View>
          </View>
        );

      case "name":
        return (
          <View style={styles.stepContent}>
            {selectedType && (
              <LinearGradient
                colors={activeGradient}
                style={styles.typePill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.typePillText}>
                  {COMPANION_TYPES[selectedType].emoji}{"  "}{COMPANION_TYPES[selectedType].label}
                </Text>
              </LinearGradient>
            )}
            <Text style={[styles.stepQuestion, { color: colors.foreground }]}>
              What will you{"\n"}call them?
            </Text>
            <Text style={[styles.stepHint, { color: colors.label }]}>
              Give your companion a name that feels right
            </Text>
            <View style={[
              styles.inputWrapper,
              {
                borderColor: name.length > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.45)",
                shadowColor: activeGradient[0],
                shadowOpacity: name.length > 0 ? 0.4 : 0.15,
              },
            ]}>
              <LinearGradient
                colors={activeGradient}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: name.length > 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)", borderRadius: 20 }} />
              <View style={{ position: "absolute", top: 1, left: 20, right: 20, height: 1, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 1 }} />
              <TextInput
                style={[styles.input, { color: "#FFF", zIndex: 1 }]}
                placeholder="Enter a name..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={name}
                onChangeText={setName}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={goNext}
                autoFocus
                autoCapitalize="words"
              />
            </View>
            {/* Character counter */}
            {name.length > 0 && (
              <Text style={[styles.charCounter, { color: name.length >= 25 ? activeGradient[0] : colors.mutedForeground }]}>
                {name.length} / 30
              </Text>
            )}

            {selectedType && (
              <View style={[styles.sampleBubble, { backgroundColor: colors.card }]}>
                <LinearGradient
                  colors={activeGradient}
                  style={styles.sampleAvatarDot}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={{ fontSize: 12, color: "#FFF" }}>
                    {COMPANION_TYPES[selectedType].emoji}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sampleName, { color: activeGradient[0] }]}>
                    {name.trim() || COMPANION_TYPES[selectedType].label}
                  </Text>
                  <Text style={[styles.sampleText, { color: colors.foreground }]}>
                    {`"${COMPANION_SAMPLES[selectedType]}"`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );

      case "gender":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepQuestion, { color: colors.foreground }]}>
              {`What is ${name.trim() || "your companion"}'s gender?`}
            </Text>
            <Text style={[styles.stepHint, { color: colors.label }]}>
              Shapes voice options · optional
            </Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => {
                const active = gender === opt.value;
                return (
                  <GenderCard
                    key={opt.value}
                    opt={opt}
                    active={active}
                    gradient={activeGradient}
                    onPress={() => { hapticsSelection(); setGender(active ? null : opt.value); }}
                  />
                );
              })}
            </View>
          </View>
        );

      case "traits": {
        if (!selectedType) return null;
        const traits    = COMPANION_TRAITS[selectedType] ?? [];
        const remaining = 3 - selectedTraits.length;
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepQuestion, { color: colors.foreground }]}>
              {`Define ${name.trim() || "their"} personality`}
            </Text>
            {/* Header row: count pill + surprise button */}
            <View style={styles.traitHeaderRow}>
              <View style={[styles.traitCountPill, { backgroundColor: selectedTraits.length > 0 ? `${activeGradient[0]}18` : colors.card }]}>
                <Text style={[styles.traitCountText, { color: selectedTraits.length > 0 ? activeGradient[0] : colors.mutedForeground }]}>
                  {selectedTraits.length === 0
                    ? "Pick up to 3 traits · or skip"
                    : selectedTraits.length === 3
                    ? "✓  3 of 3 selected"
                    : `${selectedTraits.length} selected · ${remaining} more`}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  hapticsSelection();
                  const shuffled = [...traits].sort(() => Math.random() - 0.5);
                  setSelectedTraits(shuffled.slice(0, 3));
                }}
                style={({ pressed }) => [
                  styles.surpriseBtn,
                  { backgroundColor: `${activeGradient[0]}18`, borderColor: `${activeGradient[0]}40`, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.surpriseBtnText}>✨</Text>
                <Text style={[styles.surpriseBtnLabel, { color: activeGradient[0] }]}>Surprise me</Text>
              </Pressable>
            </View>
            <View style={styles.traitGrid}>
              {traits.map((trait) => {
                const active   = selectedTraits.includes(trait);
                const disabled = !active && selectedTraits.length >= 3;
                return (
                  <TraitPill
                    key={trait}
                    trait={trait}
                    active={active}
                    disabled={disabled}
                    gradient={activeGradient}
                    onPress={() => {
                      if (disabled) return;
                      hapticsSelection();
                      setSelectedTraits((prev) =>
                        prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
                      );
                    }}
                  />
                );
              })}
            </View>
          </View>
        );
      }

      case "voice":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepQuestion, { color: colors.foreground }]}>
              {`Choose ${name.trim() ? `${name.trim()}'s` : "their"} voice`}
            </Text>
            <Text style={[styles.stepHint, { color: colors.label }]}>
              Tap a card to select · tap ▶ to preview
            </Text>
            <View style={styles.voiceGrid}>
              {voiceOptions.map((v) => {
                const isSelected = effectiveVoice === v.id;
                const isDefault  = defaultVoice === v.id;
                const isPlaying  = playingVoice === v.id;
                const isLoading  = loadingVoice === v.id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => { hapticsSelection(); setSelectedVoice(v.id === defaultVoice ? null : v.id); }}
                    style={({ pressed }) => [
                      styles.voiceCard,
                      {
                        shadowColor: activeGradient[0],
                        shadowOpacity: isSelected ? 0.45 : 0.12,
                        shadowRadius: isSelected ? 18 : 8,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <LinearGradient colors={activeGradient} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    <View style={[styles.voiceGlass, { backgroundColor: isSelected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.52)", borderColor: isSelected ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.65)" }]} />
                    <View style={styles.voiceRefraction} />

                    {/* Play button or waveform */}
                    <Pressable onPress={(e) => { e.stopPropagation?.(); handlePlayVoice(v.id); }} hitSlop={6}>
                      <View style={[styles.voicePlayBtn, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
                        {isLoading ? (
                          <ActivityIndicator size={14} color="#FFF" />
                        ) : isPlaying ? (
                          <WaveformBars playing />
                        ) : (
                          <Ionicons name="play" size={14} color="#FFF" />
                        )}
                      </View>
                    </Pressable>

                    <View>
                      <Text style={[styles.voiceCardLabel, { color: "#FFF", opacity: isSelected ? 1 : 0.88 }]}>
                        {v.label}
                      </Text>
                      <Text style={[styles.voiceDescriptor, { color: isSelected ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.55)" }]}>
                        {VOICE_DESCRIPTORS[v.id] ?? ""}
                      </Text>
                    </View>
                    {isDefault && (
                      <Text style={[styles.voiceDefault, { color: "rgba(255,255,255,0.65)" }]}>default</Text>
                    )}
                    {isSelected && (
                      <View style={styles.voiceSelectedCheck}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case "avatar": {
        const avatarList  = getAvatarsByGender(gender);
        const withImages  = avatarList.filter((a) => a.source !== null);

        if (withImages.length === 0) {
          return (
            <View style={styles.stepContent}>
              <Text style={[styles.stepQuestion, { color: colors.foreground }]}>Choose a face</Text>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="images-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.avatarPlaceholderText, { color: colors.mutedForeground }]}>
                  No avatar images found.{"\n"}Drop images into assets/avatars/
                </Text>
              </View>
            </View>
          );
        }

        return (
          <View style={styles.avatarPickerWrap}>
            <View style={styles.avatarPickerHeader}>
              <Text style={[styles.stepQuestion, { color: colors.foreground, textAlign: "left" }]}>Choose a face</Text>
              <Text style={[styles.stepHint, { color: colors.mutedForeground, textAlign: "left", marginTop: 0 }]}>
                Swipe to browse · Tap to select
              </Text>
            </View>
            <FlatList
              data={withImages}
              keyExtractor={(av) => av.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={AVATAR_SNAP}
              decelerationRate="fast"
              contentContainerStyle={styles.avatarSwiperContent}
              renderItem={({ item: av }) => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <Pressable
                    onPress={() => { setSelectedAvatar(isSelected ? null : av.id); hapticsSelection(); }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                  >
                    <View
                      style={[
                        styles.avatarSwiperCard,
                        isSelected && { borderWidth: 3, borderColor: activeGradient[0], shadowColor: activeGradient[0], shadowOpacity: 0.5, shadowRadius: 18 },
                      ]}
                    >
                      <Image source={av.source!} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: 0 }} />
                      <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={styles.avatarSwiperOverlay} pointerEvents="none" />
                      {isSelected && (
                        <View style={[styles.avatarSwiperCheck, { backgroundColor: activeGradient[0] }]}>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </View>
                      )}
                      {!isSelected && (
                        <View style={styles.avatarSwiperHint}>
                          <Text style={styles.avatarSwiperHintText}>Tap to select</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        );
      }

      case "preview": {
        if (!selectedType) return null;
        const typeInfo   = COMPANION_TYPES[selectedType];
        const voiceName  = effectiveVoice
          ? effectiveVoice.charAt(0).toUpperCase() + effectiveVoice.slice(1)
          : null;
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepQuestion, { color: colors.foreground }]}>
              {`Meet ${name.trim() || "your companion"}`}
            </Text>

            {/* Hero card — breathes gently */}
            <Animated.View style={[styles.previewHero, previewPulseStyle]}>
              {(() => {
                const av = getAvatarById(selectedAvatar ?? undefined);
                return av?.source ? (
                  <Image source={av.source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: 0 }} />
                ) : (
                  <LinearGradient colors={activeGradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                );
              })()}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={styles.previewHeroOverlay} pointerEvents="none" />
              <View style={styles.previewHeroInfo}>
                <Text style={styles.previewName}>{name.trim() || "Your companion"}</Text>
                <Text style={styles.previewTypeLabel}>{typeInfo.emoji}{"  "}{typeInfo.label}</Text>
              </View>
            </Animated.View>

            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {selectedAvatar && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Face</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]}>Custom avatar selected</Text>
                </View>
              )}
              {gender && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Gender</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </View>
              )}
              {voiceName && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Voice</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]}>{voiceName}</Text>
                </View>
              )}
              {selectedTraits.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Traits</Text>
                  <View style={styles.summaryTraits}>
                    {selectedTraits.map((t) => (
                      <View key={t} style={[styles.summaryTrait, { backgroundColor: `${activeGradient[0]}15`, borderColor: `${activeGradient[0]}35` }]}>
                        <Text style={[styles.summaryTraitText, { color: activeGradient[0] }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {!selectedAvatar && !gender && !selectedVoice && selectedTraits.length === 0 && (
                <Text style={[styles.summaryEmpty, { color: colors.mutedForeground }]}>
                  Using all default settings
                </Text>
              )}
            </View>
          </View>
        );
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HaloBackground />

      {/* Header — title + counter only (back is in footer) */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {STEP_TITLES[currentStep]}
        </Text>
        <Text style={[styles.stepCounter, { color: colors.label }]}>
          {stepIndex + 1} / {steps.length}
        </Text>
      </View>

      {/* Segmented step progress */}
      <StepProgress steps={steps} currentIndex={stepIndex} gradient={activeGradient} />

      {/* Content */}
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={animStyle}>
          {renderStep()}
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      {/* Footer */}
      <Animated.View style={[styles.footer, footerAnimStyle, { borderTopColor: colors.border, backgroundColor: "transparent" }]}>
        {isLastStep ? (
          <Pressable
            onPress={handleCreate}
            disabled={isCreating}
            style={({ pressed }) => [{ opacity: pressed || isCreating ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={activeGradient}
              style={styles.createBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {isCreating ? (
                <ActivityIndicator size={20} color="#FFF" />
              ) : (
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.createBtnText}>
                {isCreating ? "Creating..." : "Create Companion"}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={goNext}
            disabled={!canProceed()}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={canProceed() ? activeGradient : [colors.muted, colors.muted]}
              style={styles.nextBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.nextBtnText, { color: canProceed() ? "#FFFFFF" : colors.mutedForeground }]}>
                {nextLabel}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={canProceed() ? "#FFFFFF" : colors.mutedForeground} />
            </LinearGradient>
          </Pressable>
        )}
      </Animated.View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle:  { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  stepCounter:  { fontSize: 13, fontFamily: "Inter_400Regular", minWidth: 36, textAlign: "right" },

  scrollContent: { padding: 24, gap: 0, flexGrow: 1, justifyContent: "center" },

  stepContent:  { gap: 20, width: "100%", alignItems: "center" },
  stepQuestion: {
    fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold",
    lineHeight: 34, textAlign: "center", letterSpacing: -0.5,
  },
  stepHint: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    marginTop: -10, textAlign: "center", lineHeight: 20,
  },
  typePill:     { alignSelf: "center", borderRadius: 20, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 7 },
  typePillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontWeight: "600", color: "#FFF" },

  inputWrapper: {
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 20, paddingVertical: 18,
    width: "100%", overflow: "hidden",
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 4,
  },
  input:       { fontSize: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  charCounter: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "flex-end", marginTop: -12 },

  sampleBubble: {
    borderRadius: 20, padding: 16, width: "100%",
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    shadowColor: "#5A3A2A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  sampleAvatarDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sampleName:  { fontSize: 12, fontFamily: "Inter_600SemiBold", fontWeight: "600", marginBottom: 4 },
  sampleText:  { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 20 },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, width: "100%" },
  typeCell: { width: "47%" },

  genderRow: { flexDirection: "row", gap: 14, justifyContent: "center", width: "100%" },

  // Traits
  traitHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%", flexWrap: "wrap", justifyContent: "center" },
  traitCountPill: { alignSelf: "center", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  traitCountText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  surpriseBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  surpriseBtnText:  { fontSize: 13 },
  surpriseBtnLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  traitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" },

  // Voice
  voiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, width: "100%" },
  voiceCard: {
    width: "47%", borderRadius: 20, padding: 16, gap: 10,
    alignItems: "flex-start", overflow: "hidden",
    shadowOffset: { width: 0, height: 5 }, shadowRadius: 12, elevation: 5,
  },
  voiceCardLabel:    { fontSize: 15, fontFamily: "Inter_700Bold", fontWeight: "700" },
  voiceDefault:      { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: -6 },
  voiceDescriptor:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  voicePlayBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  voiceSelectedCheck:{ position: "absolute", top: 10, right: 10 },
  voiceGlass:        { ...StyleSheet.absoluteFillObject, borderRadius: 20, borderWidth: 1 },
  voiceRefraction:   { position: "absolute", top: 1, left: 14, right: 14, height: 1, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 1 },

  // Preview
  previewHero: {
    borderRadius: 24, overflow: "hidden", height: 300,
    position: "relative", width: "100%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  previewHeroOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 140 },
  previewHeroInfo:    { position: "absolute", bottom: 20, left: 20, right: 20, gap: 4 },
  previewName:        { fontSize: 26, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  previewTypeLabel:   { fontSize: 14, color: "rgba(255,255,255,0.88)", fontFamily: "Inter_500Medium" },

  summaryCard:      { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, width: "100%" },
  summaryRow:       { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  summaryKey:       { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500", width: 52, paddingTop: 2 },
  summaryVal:       { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  summaryTraits:    { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  summaryTrait:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  summaryTraitText: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" },
  summaryEmpty:     { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  backBtn: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 32,
  },
  nextBtnText: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 18, borderRadius: 32,
  },
  createBtnText: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  // Avatar
  avatarPickerWrap:    { width: "100%", gap: 14 },
  avatarPickerHeader:  { paddingHorizontal: 2, gap: 4 },
  avatarSwiperContent: { paddingRight: 24, gap: 12 },
  avatarSwiperCard: {
    width: AVATAR_CARD_W, height: AVATAR_CARD_H, borderRadius: 24, overflow: "hidden",
    shadowColor: "#5A3A2A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16,
    elevation: 8, borderWidth: 0, borderColor: "transparent",
  },
  avatarSwiperOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: "40%" },
  avatarSwiperCheck: {
    position: "absolute", top: 14, right: 14,
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  avatarSwiperHint:     { position: "absolute", bottom: 16, left: 0, right: 0, alignItems: "center" },
  avatarSwiperHintText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  avatarPlaceholder:    { borderWidth: 1, borderRadius: 20, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 12, width: "100%" },
  avatarPlaceholderText:{ fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
