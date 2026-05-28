import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompanions } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";

export default function MemoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, addMemoryNote, removeMemoryNote } = useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [newNote, setNewNote] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Companion not found</Text>
      </View>
    );
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addMemoryNote(companion.id, newNote.trim());
    setNewNote("");
    hapticsNotification();
  };

  const handleDeleteNote = (index: number, note: string) => {
    Alert.alert("Remove Memory", `Remove this memory?\n\n"${note}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
          removeMemoryNote(companion.id, index);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerCenter}>
          <LinearGradient
            colors={companion.avatarGradient}
            style={styles.headerDot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Memories
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {companion.name} · {companion.memoryNotes.length} collected
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={companion.memoryNotes}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 100 },
          companion.memoryNotes.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient
              colors={companion.avatarGradient}
              style={styles.emptyIconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No memories yet
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Chat with {companion.name} and they'll learn things about you automatically. You can also add memories manually below.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.noteRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <LinearGradient
              colors={companion.avatarGradient}
              style={styles.noteIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.noteText, { color: colors.foreground }]}>
              {item}
            </Text>
            <Pressable
              onPress={() => handleDeleteNote(index, item)}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
      />

      {/* Add memory input pinned at bottom */}
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
        <View
          style={[
            styles.inputRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="sparkles-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Add a memory manually..."
            placeholderTextColor={colors.mutedForeground}
            value={newNote}
            onChangeText={setNewNote}
            returnKeyType="done"
            onSubmitEditing={handleAddNote}
            maxLength={200}
          />
          <Pressable
            onPress={handleAddNote}
            disabled={!newNote.trim()}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : newNote.trim() ? 1 : 0.4 }]}
          >
            <LinearGradient
              colors={newNote.trim() ? companion.avatarGradient : [colors.muted, colors.muted]}
              style={styles.addBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={20} color={newNote.trim() ? "#FFFFFF" : colors.mutedForeground} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
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
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  noteIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 4,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
