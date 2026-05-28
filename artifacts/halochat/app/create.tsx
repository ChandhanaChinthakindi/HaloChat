import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ImpactFeedbackStyle } from "expo-haptics";
import { hapticsImpact, hapticsSelection } from "@/utils/haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { TypeCard } from "@/components/TypeBadge";
import {
  COMPANION_TYPES,
  type CompanionType,
  useCompanions,
} from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

const COMPANION_SAMPLES: Record<CompanionType, string> = {
  romantic: "thinking about you... hope your day's been good ♡",
  flirty: "okay so I was going to play it cool but that's not happening",
  supportive: "hey, I'm here. whatever you need — no pressure.",
  mentor: "what's the real thing you're trying to figure out?",
  anime: "YOU'RE HERE!! I've been waiting omg 😭✨",
  bestfriend: "okay spill. what happened. I need to know everything",
  therapist: "take your time — what's been sitting heavy lately?",
  roleplay: "the story is waiting... where shall we begin? ✦",
};

const ALL_TYPES: CompanionType[] = [
  "romantic", "flirty", "supportive", "mentor",
  "anime", "bestfriend", "therapist", "roleplay",
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
  const params = useLocalSearchParams<{ type?: CompanionType }>();

  const preselected = params.type ?? null;

  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<CompanionType | null>(preselected);
  const [gender, setGender] = useState<"female" | "male" | "nonbinary" | null>(null);
  const [customPersonality, setCustomPersonality] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const canCreate = name.trim().length > 0 && selectedType !== null;

  const activeGradient: [string, string] = selectedType
    ? COMPANION_TYPES[selectedType].gradient
    : ["#818263", "#6B5E45"];

  const handleCreate = async () => {
    if (!canCreate || !selectedType) return;
    setIsCreating(true);
    await hapticsImpact(ImpactFeedbackStyle.Medium);
    try {
      const companion = await createCompanion(
        name.trim(),
        selectedType,
        customPersonality.trim() || undefined,
        gender ?? undefined,
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
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Companion</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 120 }]}
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
                "{COMPANION_SAMPLES[preselected]}"
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

            {/* Custom personality */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              CUSTOM PERSONALITY <Text style={{ fontWeight: "400" as const }}>(OPTIONAL)</Text>
            </Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.foreground }]}
                placeholder="Add anything that makes them uniquely yours..."
                placeholderTextColor={colors.mutedForeground}
                value={customPersonality}
                onChangeText={setCustomPersonality}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
            {customPersonality.length > 0 && (
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{customPersonality.length}/500</Text>
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
                        "{COMPANION_SAMPLES[selectedType]}"
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              CUSTOM PERSONALITY <Text style={{ fontWeight: "400" as const }}>(OPTIONAL)</Text>
            </Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.foreground }]}
                placeholder="Add a custom personality description to make them uniquely yours..."
                placeholderTextColor={colors.mutedForeground}
                value={customPersonality}
                onChangeText={setCustomPersonality}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{customPersonality.length}/500</Text>
          </>
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: bottomPadding + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
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
      </View>
    </View>
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
  textAreaWrapper: { paddingVertical: 12 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 80 },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -8 },
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
  // Footer
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  createButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 32 },
  createButtonText: { fontSize: 17, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
});
