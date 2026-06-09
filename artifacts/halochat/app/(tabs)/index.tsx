import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompanionCard } from "@/components/CompanionCard";
import { useCompanions, type Companion } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";
import { hapticsImpact } from "@/utils/haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const CARD_H_PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_H_PAD * 2 - CARD_GAP) / 2;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function CompanionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { companions, deleteCompanion, togglePin, isLoaded, loadError, retryLoad } = useCompanions();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePress = (companion: Companion) => router.push(`/chat/${companion.id}`);

  const handleLongPress = (companion: Companion) => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(companion.name, "What would you like to do?", [
      { text: "View Profile", onPress: () => router.push(`/profile/${companion.id}`) },
      { text: companion.pinned ? "Unpin" : "Pin to top", onPress: () => togglePin(companion.id) },
      {
        text: "Delete", style: "destructive",
        onPress: () => Alert.alert(
          "Delete Companion",
          `Delete ${companion.name}? All conversations will be lost.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteCompanion(companion.id) },
          ]
        ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const sorted = [...companions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.lastMessageTime ?? b.createdAt) - (a.lastMessageTime ?? a.createdAt);
  });

  const showError = loadError && companions.length === 0;
  const showEmpty = !showError && companions.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header — floats transparently over HaloBackground ──────── */}
      <View style={styles.headerArea}>
        {/* Soft gradient scrim: just enough contrast for text, fades to nothing */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(42,26,22,0.78)", "rgba(42,26,22,0.0)"]
              : ["rgba(255,255,255,0.62)", "rgba(255,255,255,0.0)"]
          }
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Top row: greeting + New button */}
        <View style={[styles.topRow, { paddingTop: topPadding + 14 }]}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {getGreeting()}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <LinearGradient
              colors={["#E8A0C8", "#B890D8"]}
              style={styles.newBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={15} color="#FFFFFF" />
              <Text style={styles.newBtnText}>New</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Your Companions
          </Text>
        </View>
      </View>

      {/* ── Content ────────────────────────────────────────────────── */}
      {!isLoaded ? (
        <LoadingSkeleton />
      ) : showError ? (
        <ErrorState onRetry={retryLoad} />
      ) : showEmpty ? (
        <EmptyState />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 110 }]}
          renderItem={({ item }) => (
            <CompanionCard
              companion={item}
              onPress={() => handlePress(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.skeletonGrid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card, opacity: 1 - i * 0.15 }]} />
      ))}
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.centeredState}>
      <View style={[styles.stateIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>Couldn't connect</Text>
      <Text style={[styles.stateSub, { color: colors.mutedForeground }]}>Check your connection and try again</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" }}>Try again</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View style={styles.centeredState}>
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        style={styles.emptyGradientCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="sparkles" size={36} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>No companions yet</Text>
      <Text style={[styles.stateSub, { color: colors.mutedForeground }]}>
        Create your first AI companion to begin your journey
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/explore")}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={[colors.accent, colors.primary]}
          style={styles.emptyButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Create Companion</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerArea: {},
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },

  list: { paddingHorizontal: CARD_H_PAD, paddingTop: 8, gap: CARD_GAP },
  row: { gap: CARD_GAP },

  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: CARD_H_PAD,
    paddingTop: 8,
    gap: CARD_GAP,
  },
  skeletonCard: { width: CARD_WIDTH, height: 240, borderRadius: 24 },

  centeredState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  stateIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stateTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "center" },
  stateSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1 },
  emptyGradientCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 28, marginTop: 8 },
  emptyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
