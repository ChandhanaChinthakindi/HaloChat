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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, deleteCompanion, clearMessages, addMemoryNote, removeMemoryNote } = useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [newNote, setNewNote] = useState("");

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

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addMemoryNote(companion.id, newNote.trim());
    setNewNote("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            router.replace("/(tabs)/");
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
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard label="Messages" value={String(companion.messageCount)} colors={colors} />
          <StatCard label="Bond" value={`${relPercent}%`} colors={colors} />
          <StatCard label="Status" value={relLabel} colors={colors} />
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
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Memory
            </Text>
            {companion.memoryNotes.length > 0 && (
              <View style={[styles.memoryCountBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="sparkles" size={11} color={colors.primary} />
                <Text style={[styles.memoryCountText, { color: colors.primary }]}>
                  {companion.memoryNotes.length} facts learned
                </Text>
              </View>
            )}
          </View>
          {companion.memoryNotes.length === 0 ? (
            <View style={[styles.emptyMemory, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="sparkles-outline" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyMemoryText, { color: colors.mutedForeground }]}>
                No memories yet. Chat or call to let {companion.name} learn about you.
              </Text>
            </View>
          ) : (
            companion.memoryNotes.map((note, i) => (
              <View
                key={i}
                style={[
                  styles.noteChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="sparkles" size={13} color={colors.primary} />
                <Text style={[styles.noteText, { color: colors.foreground, flex: 1 }]}>
                  {note}
                </Text>
                <Pressable
                  onPress={() => removeMemoryNote(companion.id, i)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={[styles.section, { paddingHorizontal: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Add Memory
          </Text>
          <View
            style={[
              styles.noteInput,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.noteInputText, { color: colors.foreground }]}
              placeholder="Something to remember..."
              placeholderTextColor={colors.mutedForeground}
              value={newNote}
              onChangeText={setNewNote}
              returnKeyType="done"
              onSubmitEditing={handleAddNote}
            />
            <Pressable onPress={handleAddNote}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          </View>
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memoryCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  memoryCountText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  emptyMemory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyMemoryText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  noteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  noteInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  noteInputText: {
    flex: 1,
    fontSize: 14,
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
});
