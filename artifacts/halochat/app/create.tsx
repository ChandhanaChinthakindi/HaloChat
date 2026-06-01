import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ImpactFeedbackStyle } from "expo-haptics";
import { hapticsImpact, hapticsSelection } from "@/utils/haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";

import { TypeCard } from "@/components/TypeBadge";
import {
  API_BASE,
  COMPANION_TYPES,
  type CompanionType,
  useCompanions,
} from "@/context/CompanionContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const VOICE_SAMPLES: Record<CompanionType, string> = {
  romantic:   "I've been thinking about you all day. It's really good to hear from you.",
  confidant: "Hey, I'm here. Whatever's on your mind — I'm listening, no rush.",
  anime:      "YOU'RE HERE! I've been waiting so long — this is literally the best day!",
  bestfriend: "Okay spill. What happened? I need to know absolutely everything right now.",
  roleplay:   "The story is waiting... wherever you want to begin, I'll be right there with you.",
};

const VOICES_BY_GENDER: Record<string, { id: string; label: string }[]> = {
  female:   [
    { id: "nova",    label: "Nova" },
    { id: "coral",   label: "Coral" },
    { id: "shimmer", label: "Shimmer" },
    { id: "ballad",  label: "Ballad" },
    { id: "alloy",   label: "Alloy" },
  ],
  male:     [
    { id: "onyx",  label: "Onyx" },
    { id: "echo",  label: "Echo" },
    { id: "ash",   label: "Ash" },
    { id: "fable", label: "Fable" },
    { id: "sage",  label: "Sage" },
  ],
  nonbinary: [
    { id: "nova",    label: "Nova" },
    { id: "coral",   label: "Coral" },
    { id: "shimmer", label: "Shimmer" },
    { id: "alloy",   label: "Alloy" },
    { id: "onyx",    label: "Onyx" },
    { id: "echo",    label: "Echo" },
    { id: "ash",     label: "Ash" },
    { id: "sage",    label: "Sage" },
  ],
};

const COMPANION_SAMPLES: Record<CompanionType, string> = {
  romantic: "thinking about you... hope your day's been good ♡",
  confidant: "hey, I'm here. whatever you need — no pressure.",
  anime: "YOU'RE HERE!! I've been waiting omg 😭✨",
  bestfriend: "okay spill. what happened. I need to know everything",
  roleplay: "the story is waiting... where shall we begin? ✦",
};

const ALL_TYPES: CompanionType[] = [
  "romantic", "confidant", "anime", "bestfriend", "roleplay",
];

const GENDER_OPTIONS: { value: "female" | "male" | "nonbinary"; label: string; icon: string }[] = [
  { value: "female", label: "Female", icon: "♀" },
  { value: "male", label: "Male", icon: "♂" },
  { value: "nonbinary", label: "Non-binary", icon: "⚧" },
];

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createCompanion } = useCompanions();
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{ type?: CompanionType }>();

  const preselected = params.type ?? null;

  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<CompanionType | null>(preselected);
  const [gender, setGender] = useState<"female" | "male" | "nonbinary" | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Reset voice selection when gender changes
  useEffect(() => { setSelectedVoice(null); }, [gender]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { height: kbHeight, progress: kbProgress } = useReanimatedKeyboardAnimation();
  const footerAnimStyle = useAnimatedStyle(() => ({
    bottom: -kbHeight.value,
    paddingBottom: interpolate(kbProgress.value, [0, 1], [bottomPadding + 16, 8], Extrapolation.CLAMP),
  }));

  const canCreate = name.trim().length > 0 && selectedType !== null;

  const activeGradient: [string, string] = selectedType
    ? COMPANION_TYPES[selectedType].gradient
    : ["#818263", "#6B5E45"];

  const voiceOptions = gender ? VOICES_BY_GENDER[gender] ?? [] : [];
  const defaultVoice = selectedType ? COMPANION_TYPES[selectedType].voice : "nova";
  const effectiveVoice = selectedVoice ?? defaultVoice;

  const handlePlayVoice = async (voiceId: string) => {
    // Stop current playback
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }
    setLoadingVoice(voiceId);
    try {
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      }
      const sample = selectedType ? VOICE_SAMPLES[selectedType] : VOICE_SAMPLES.confidant;
      const url = `${API_BASE}/companion/tts?text=${encodeURIComponent(sample)}&voice=${voiceId}`;
      const source = { uri: url, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined };
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingVoice(voiceId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingVoice(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch {
      // silent fail — voice preview is best-effort
    } finally {
      setLoadingVoice(null);
    }
  };

  const handleCreate = async () => {
    if (!canCreate || !selectedType) return;
    // Stop any playing preview before creating
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsCreating(true);
    await hapticsImpact(ImpactFeedbackStyle.Medium);
    try {
      const companion = await createCompanion(
        name.trim(),
        selectedType,
        undefined,
        gender ?? undefined,
        selectedVoice ?? undefined,
      );
      router.replace(`/chat/${companion.id}`);
    } catch {
      Alert.alert("Error", "Failed to create companion. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Companion</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {preselected ? (
          /* ── Focused flow: type already chosen ── */
          <>
            {/* Hero card for the selected type */}
            <LinearGradient
              colors={activeGradient}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.heroEmoji}>{COMPANION_TYPES[preselected].emoji}</Text>
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>{COMPANION_TYPES[preselected].label}</Text>
                <Text style={styles.heroDesc}>{COMPANION_TYPES[preselected].description}</Text>
              </View>
            </LinearGradient>

            {/* Sample message bubble */}
            <View style={[styles.sampleBubble, { backgroundColor: `${activeGradient[0]}15`, borderColor: `${activeGradient[0]}30` }]}>
              <Text style={[styles.sampleQuote, { color: colors.foreground }]}>
                {`"${COMPANION_SAMPLES[preselected]}"`}
              </Text>
            </View>

            {/* Name */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NAME</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: name.length > 0 ? activeGradient[0] : colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Give your companion a name..."
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                maxLength={30}
                returnKeyType="done"
                autoFocus
              />
            </View>

            {/* Gender */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GENDER</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => {
                const active = gender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => { hapticsSelection(); setGender(active ? null : opt.value); }}
                    style={[
                      styles.genderChip,
                      {
                        backgroundColor: active ? activeGradient[0] : colors.card,
                        borderColor: active ? activeGradient[0] : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.genderIcon, { color: active ? "#fff" : colors.mutedForeground }]}>{opt.icon}</Text>
                    <Text style={[styles.genderLabel, { color: active ? "#fff" : colors.foreground }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Voice picker */}
            {voiceOptions.length > 0 && (
              <VoicePicker
                voices={voiceOptions}
                selectedVoice={effectiveVoice}
                defaultVoice={defaultVoice}
                playingVoice={playingVoice}
                loadingVoice={loadingVoice}
                activeGradient={activeGradient}
                colors={colors}
                onSelect={(id) => { hapticsSelection(); setSelectedVoice(id === defaultVoice ? null : id); }}
                onPlay={handlePlayVoice}
              />
            )}

          </>
        ) : (
          /* ── Full flow: choose type first ── */
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>COMPANION NAME</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: name.length > 0 ? activeGradient[0] : colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Give your companion a name..."
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                maxLength={30}
                returnKeyType="done"
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PERSONALITY TYPE</Text>
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

            {selectedType && (
              <>
                {/* Gender */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GENDER</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((opt) => {
                    const active = gender === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => { hapticsSelection(); setGender(active ? null : opt.value); }}
                        style={[
                          styles.genderChip,
                          {
                            backgroundColor: active ? activeGradient[0] : colors.card,
                            borderColor: active ? activeGradient[0] : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.genderIcon, { color: active ? "#fff" : colors.mutedForeground }]}>{opt.icon}</Text>
                        <Text style={[styles.genderLabel, { color: active ? "#fff" : colors.foreground }]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Preview */}
                <View style={[styles.preview, { backgroundColor: colors.card, borderColor: `${activeGradient[0]}40` }]}>
                  <LinearGradient colors={activeGradient} style={styles.previewAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.previewEmoji}>{COMPANION_TYPES[selectedType].emoji}</Text>
                  </LinearGradient>
                  <View style={styles.previewBody}>
                    <Text style={[styles.previewName, { color: colors.foreground }]}>
                      {name.trim() || "Your companion"} · {COMPANION_TYPES[selectedType].label}
                    </Text>
                    <Text style={[styles.previewDesc, { color: colors.mutedForeground }]}>
                      {COMPANION_TYPES[selectedType].description}
                    </Text>
                    <View style={[styles.previewBubble, { backgroundColor: `${activeGradient[0]}18` }]}>
                      <Text style={[styles.previewSample, { color: colors.foreground }]}>
                        {`"${COMPANION_SAMPLES[selectedType]}"`}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Voice picker — only once gender is chosen */}
            {voiceOptions.length > 0 && (
              <VoicePicker
                voices={voiceOptions}
                selectedVoice={effectiveVoice}
                defaultVoice={defaultVoice}
                playingVoice={playingVoice}
                loadingVoice={loadingVoice}
                activeGradient={activeGradient}
                colors={colors}
                onSelect={(id) => { hapticsSelection(); setSelectedVoice(id === defaultVoice ? null : id); }}
                onPlay={handlePlayVoice}
              />
            )}

          </>
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Footer CTA */}
      <Animated.View style={[styles.footer, footerAnimStyle, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate || isCreating}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={canCreate ? activeGradient : [colors.muted, colors.muted]}
            style={styles.createButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="sparkles" size={20} color={canCreate ? "#FFFFFF" : colors.mutedForeground} />
            <Text style={[styles.createButtonText, { color: canCreate ? "#FFFFFF" : colors.mutedForeground }]}>
              {isCreating ? "Creating..." : "Create Companion"}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function VoicePicker({
  voices, selectedVoice, defaultVoice, playingVoice, loadingVoice,
  activeGradient, colors, onSelect, onPlay,
}: {
  voices: { id: string; label: string }[];
  selectedVoice: string;
  defaultVoice: string;
  playingVoice: string | null;
  loadingVoice: string | null;
  activeGradient: [string, string];
  colors: any;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
}) {
  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>VOICE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voiceScroll} contentContainerStyle={styles.voiceScrollContent}>
        {voices.map((v) => {
          const isSelected = selectedVoice === v.id;
          const isDefault = defaultVoice === v.id;
          const isPlaying = playingVoice === v.id;
          const isLoading = loadingVoice === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => onSelect(v.id)}
              style={[
                styles.voiceChip,
                {
                  backgroundColor: isSelected ? `${activeGradient[0]}18` : colors.card,
                  borderColor: isSelected ? activeGradient[0] : colors.border,
                },
              ]}
            >
              <View style={styles.voiceChipTop}>
                {isSelected && <Ionicons name="checkmark-circle" size={13} color={activeGradient[0]} />}
                <Text style={[styles.voiceChipLabel, { color: isSelected ? activeGradient[0] : colors.foreground }]}>
                  {v.label}
                </Text>
                {isDefault && (
                  <Text style={[styles.voiceChipDefault, { color: colors.mutedForeground }]}>default</Text>
                )}
              </View>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onPlay(v.id); }}
                style={[styles.voicePlayBtn, { backgroundColor: isPlaying ? `${activeGradient[0]}25` : `${colors.mutedForeground}15` }]}
                hitSlop={6}
              >
                {isLoading ? (
                  <ActivityIndicator size={12} color={activeGradient[0]} />
                ) : (
                  <Ionicons
                    name={isPlaying ? "stop" : "play"}
                    size={12}
                    color={isPlaying ? activeGradient[0] : colors.mutedForeground}
                  />
                )}
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: -4,
    marginTop: 8,
  },
  // Hero card (focused flow)
  heroCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  heroEmoji: { fontSize: 36, color: "#fff" },
  heroText: { flex: 1 },
  heroLabel: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold", color: "#fff" },
  heroDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2, lineHeight: 18 },
  sampleBubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  sampleQuote: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 20 },
  // Inputs
  inputWrapper: { borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular" },
  // Gender
  genderRow: { flexDirection: "row", gap: 10 },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  genderIcon: { fontSize: 15 },
  genderLabel: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  // Type grid (full flow)
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCell: { width: "47%" },
  // Preview card (full flow)
  preview: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, marginTop: 4 },
  previewAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  previewEmoji: { fontSize: 20, color: "#FFFFFF" },
  previewBody: { flex: 1, gap: 4 },
  previewName: { fontSize: 13, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  previewDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  previewBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 4 },
  previewSample: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 19 },
  // Voice picker
  voiceScroll: { marginHorizontal: -4 },
  voiceScrollContent: { paddingHorizontal: 4, gap: 8, flexDirection: "row" },
  voiceChip: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    minWidth: 90,
    alignItems: "center",
  },
  voiceChipTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  voiceChipLabel: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  voiceChipDefault: { fontSize: 10, fontFamily: "Inter_400Regular" },
  voicePlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // Footer
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  createButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 32 },
  createButtonText: { fontSize: 17, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
});
