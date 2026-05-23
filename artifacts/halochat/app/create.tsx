import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
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

const ALL_TYPES: CompanionType[] = [
  "romantic",
  "flirty",
  "supportive",
  "mentor",
  "anime",
  "bestfriend",
  "therapist",
  "roleplay",
];

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createCompanion } = useCompanions();
  const params = useLocalSearchParams<{ type?: CompanionType }>();

  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<CompanionType | null>(
    params.type ?? null
  );
  const [customPersonality, setCustomPersonality] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const canCreate = name.trim().length > 0 && selectedType !== null;

  const handleCreate = async () => {
    if (!canCreate || !selectedType) return;
    setIsCreating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const companion = await createCompanion(
        name.trim(),
        selectedType,
        customPersonality.trim() || undefined
      );
      router.replace(`/chat/${companion.id}`);
    } catch (e) {
      Alert.alert("Error", "Failed to create companion. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const activeGradient: [string, string] = selectedType
    ? COMPANION_TYPES[selectedType].gradient
    : ["#A855F7", "#6D28D9"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          New Companion
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          COMPANION NAME
        </Text>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.card,
              borderColor: name.length > 0 ? activeGradient[0] : colors.border,
            },
          ]}
        >
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

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          PERSONALITY TYPE
        </Text>
        <View style={styles.typeGrid}>
          {ALL_TYPES.map((type) => (
            <View key={type} style={styles.typeCell}>
              <TypeCard
                type={type}
                selected={selectedType === type}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedType(type);
                }}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          CUSTOM PERSONALITY (OPTIONAL)
        </Text>
        <View
          style={[
            styles.inputWrapper,
            styles.textAreaWrapper,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
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
        <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
          {customPersonality.length}/500
        </Text>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPadding + 16,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
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
            <Ionicons
              name="sparkles"
              size={20}
              color={canCreate ? "#FFFFFF" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.createButtonText,
                { color: canCreate ? "#FFFFFF" : colors.mutedForeground },
              ]}
            >
              {isCreating ? "Creating..." : "Create Companion"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: -4,
    marginTop: 8,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textAreaWrapper: {
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    minHeight: 90,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeCell: {
    width: "47%",
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: -8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 32,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
});
