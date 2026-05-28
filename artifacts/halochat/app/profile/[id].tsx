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

import { TypeBadge } from "@/components/TypeBadge";
import { COMPANION_TYPES, useCompanions } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";
import { hapticsNotification } from "@/utils/haptics";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, updateCompanion, deleteCompanion, clearMessages } = useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPersonality, setEditPersonality] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Companion not found</Text>
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

  const handleStartEdit = () => {
    setEditName(companion!.name);
    setEditPersonality(companion!.customPersonality ?? "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateCompanion(companion!.id, {
        name: editName.trim(),
        customPersonality: editPersonality.trim(), // empty string = clear
      });
      hapticsNotification();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert("Clear Conversation", "This will delete all messages with this companion.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => clearMessages(companion.id),
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Companion",
      `Delete ${companion.name}? All conversations and memories will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCompanion(companion.id);
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const relPercent = companion.relationshipLevel;
  const relLabel =
    relPercent < 20
      ? "New"
      : relPercent < 40
      ? "Acquaintance"
      : relPercent < 60
      ? "Friend"
      : relPercent < 80
      ? "Close"
      : "Bonded";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[...companion.avatarGradient, colors.background] as any}
          style={[styles.heroSection, { paddingTop: topPadding + 8 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { opacity: 1 }]}
          >
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.avatarLarge}>
            <LinearGradient
              colors={companion.avatarGradient}
              style={styles.avatarCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarInitials}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.heroName}>{companion.name}</Text>
          <TypeBadge type={companion.type} />
          <Text style={[styles.heroSub, { color: "rgba(255,255,255,0.75)" }]}>
            {typeInfo.description}
          </Text>
          <Pressable
            onPress={handleStartEdit}
            style={({ pressed }) => [styles.editHeroBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.editHeroBtnText}>Edit</Text>
          </Pressable>
        </LinearGradient>

        {/* Edit form */}
        {isEditing && (
          <View style={[styles.editForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editFormTitle, { color: colors.foreground }]}>Edit Companion</Text>

            <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
            <View style={[styles.editFieldBox, { backgroundColor: colors.background, borderColor: editName.trim() ? colors.primary : colors.border }]}>
              <TextInput
                style={[styles.editFieldInput, { color: colors.foreground }]}
                value={editName}
                onChangeText={setEditName}
                maxLength={30}
                returnKeyType="done"
                placeholder="Companion name..."
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
            </View>

            <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>CUSTOM PERSONALITY (OPTIONAL)</Text>
            <View style={[styles.editFieldBox, styles.editFieldBoxMulti, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.editFieldInput, styles.editFieldMulti, { color: colors.foreground }]}
                value={editPersonality}
                onChangeText={setEditPersonality}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder="Add a custom personality description..."
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <Text style={[styles.editCharCount, { color: colors.mutedForeground }]}>{editPersonality.length}/500</Text>

            <View style={styles.editActions}>
              <Pressable
                onPress={() => setIsEditing(false)}
                style={({ pressed }) => [styles.editCancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.editCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                disabled={!editName.trim() || isSaving}
                style={({ pressed }) => [{ opacity: pressed || isSaving ? 0.7 : 1, flex: 1 }]}
              >
                <LinearGradient
                  colors={companion.avatarGradient}
                  style={styles.editSaveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.editSaveText}>{isSaving ? "Saving…" : "Save Changes"}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard label="Bond" value={`${relPercent}%`} colors={colors} />
          <StatCard label="Status" value={relLabel} colors={colors} />
          {(companion.streak ?? 0) > 1 && (
            <StatCard label="Streak" value={`🔥 ${companion.streak}d`} colors={colors} />
          )}
        </View>

        <View style={[styles.section, { paddingHorizontal: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Bond Progress
          </Text>
          <View style={[styles.bondTrack, { backgroundColor: colors.muted }]}>
            <LinearGradient
              colors={companion.avatarGradient}
              style={[styles.bondFill, { width: `${relPercent}%` as any }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={[styles.bondLabel, { color: colors.mutedForeground }]}>
            {relLabel} · {relPercent} / 100
          </Text>
        </View>

        <View style={[styles.section, { paddingHorizontal: 20 }]}>
          <Pressable
            onPress={() => router.push(`/memories/${companion.id}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[styles.memoriesBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={companion.avatarGradient}
                style={styles.memoriesIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.memoriesBtnBody}>
                <Text style={[styles.memoriesBtnTitle, { color: colors.foreground }]}>
                  Memories
                </Text>
                <Text style={[styles.memoriesBtnSub, { color: colors.mutedForeground }]}>
                  {companion.memoryNotes.length === 0
                    ? "Nothing collected yet"
                    : `${companion.memoryNotes.length} thing${companion.memoryNotes.length !== 1 ? "s" : ""} learned about you`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </View>

        <View style={[styles.actions, { paddingHorizontal: 20 }]}>
          <Pressable
            onPress={() => router.push(`/chat/${companion.id}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, flex: 1 }]}
          >
            <LinearGradient
              colors={companion.avatarGradient}
              style={styles.chatButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
              <Text style={styles.chatButtonText}>Open Chat</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={[styles.dangerZone, { paddingHorizontal: 20 }]}>
          <Pressable
            onPress={handleClearChat}
            style={[styles.dangerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dangerBtnText, { color: colors.mutedForeground }]}>
              Clear Chat History
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.dangerBtn, { borderColor: colors.destructive, backgroundColor: "rgba(239,68,68,0.06)" }]}
          >
            <Ionicons name="person-remove-outline" size={16} color={colors.destructive} />
            <Text style={[styles.dangerBtnText, { color: colors.destructive }]}>
              Delete Companion
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 10,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLarge: {
    marginBottom: 4,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  heroName: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  section: {
    marginTop: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  bondTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  bondFill: {
    height: 8,
    borderRadius: 4,
  },
  bondLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  memoriesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  memoriesIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memoriesBtnBody: {
    flex: 1,
    gap: 2,
  },
  memoriesBtnTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  memoriesBtnSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    marginTop: 20,
    flexDirection: "row",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  dangerZone: {
    marginTop: 24,
    gap: 10,
    marginBottom: 16,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dangerBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  editHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  editHeroBtnText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  editForm: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  editFormTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: -4,
  },
  editFieldBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  editFieldBoxMulti: { paddingVertical: 10 },
  editFieldInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  editFieldMulti: { minHeight: 72 },
  editCharCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: -6,
  },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  editCancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editCancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  editSaveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },
});
