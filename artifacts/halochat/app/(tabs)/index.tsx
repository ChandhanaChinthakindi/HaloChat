import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompanionCard } from "@/components/CompanionCard";
import { COMPANION_TYPES, useCompanions, type Companion } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";
import { hapticsImpact } from "@/utils/haptics";

export default function CompanionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions, deleteCompanion, togglePin, isLoaded, loadError, retryLoad } = useCompanions();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  // Animate search bar height: 0 → 52
  const searchHeight = useSharedValue(0);
  const searchOpacity = useSharedValue(0);
  const searchBarStyle = useAnimatedStyle(() => ({
    height: searchHeight.value,
    opacity: searchOpacity.value,
    overflow: "hidden",
  }));

  const openSearch = () => {
    setIsSearching(true);
    searchHeight.value = withTiming(52, { duration: 220 });
    searchOpacity.value = withTiming(1, { duration: 220 });
    setTimeout(() => searchInputRef.current?.focus(), 230);
    hapticsImpact();
  };

  const closeSearch = () => {
    searchInputRef.current?.blur();
    searchHeight.value = withTiming(0, { duration: 180 });
    searchOpacity.value = withTiming(0, { duration: 180 });
    setTimeout(() => {
      setIsSearching(false);
      setSearchQuery("");
    }, 180);
  };

  const handlePress = (companion: Companion) => {
    router.push(`/chat/${companion.id}`);
  };

  const handleCallPress = (companion: Companion) => {
    router.push(`/call/${companion.id}`);
  };

  const handleLongPress = (companion: Companion) => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      companion.name,
      "What would you like to do?",
      [
        { text: "View Profile", onPress: () => router.push(`/profile/${companion.id}`) },
        {
          text: companion.pinned ? "Unpin" : "Pin to top",
          onPress: () => togglePin(companion.id),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete Companion",
              `Are you sure you want to delete ${companion.name}? All conversations will be lost.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteCompanion(companion.id),
                },
              ]
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? companions.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          COMPANION_TYPES[c.type].label.toLowerCase().includes(q)
      )
    : companions;

  const sorted = [...filtered].sort((a, b) => {
    if (!q) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
    }
    return (b.lastMessageTime ?? b.createdAt) - (a.lastMessageTime ?? a.createdAt);
  });

  const showError = loadError && companions.length === 0;
  const showEmpty = !showError && companions.length === 0;
  const showNoResults = !showEmpty && !showError && q.length > 0 && sorted.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 16, borderBottomColor: colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            HaloChat
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {showEmpty
              ? "No companions yet"
              : q
              ? `${sorted.length} result${sorted.length !== 1 ? "s" : ""}`
              : `${companions.length} companion${companions.length > 1 ? "s" : ""}`}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {companions.length > 0 && (
            <Pressable
              onPress={isSearching ? closeSearch : openSearch}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor:
                    pressed || isSearching
                      ? `${colors.primary}15`
                      : "transparent",
                },
              ]}
            >
              <Ionicons
                name={isSearching ? "close" : "search-outline"}
                size={20}
                color={isSearching ? colors.primary : colors.foreground}
              />
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.addButtonInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Animated search bar */}
      <Animated.View style={searchBarStyle}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or type..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* List states */}
      {!isLoaded ? (
        <LoadingSkeleton colors={colors} />
      ) : showError ? (
        <ErrorState onRetry={retryLoad} colors={colors} />
      ) : showEmpty ? (
        <EmptyState />
      ) : showNoResults ? (
        <NoResults query={searchQuery} colors={colors} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          renderItem={({ item }) => (
            <CompanionCard
              companion={item}
              onPress={() => handlePress(item)}
              onCallPress={() => handleCallPress(item)}
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

function LoadingSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, paddingTop: 16, paddingHorizontal: 16, gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            height: 80,
            borderRadius: 16,
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            opacity: 1 - i * 0.2,
          }}
        />
      ))}
    </View>
  );
}

function ErrorState({ onRetry, colors }: { onRetry: () => void; colors: any }) {
  return (
    <View style={styles.noResults}>
      <View style={[styles.noResultsIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>
        {"Couldn't connect"}
      </Text>
      <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
        Check your connection and try again
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          {
            marginTop: 8,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 20,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const }}>
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

function NoResults({ query, colors }: { query: string; colors: any }) {
  return (
    <View style={styles.noResults}>
      <View style={[styles.noResultsIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name="search-outline" size={32} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>
        No companions found
      </Text>
      <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
        {`Nothing matches "${query}"`}
      </Text>
    </View>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name="chatbubbles-outline" size={40} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No companions yet
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
        Create your first AI companion to begin your journey
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/explore")}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={["#818263", "#6B5E45"]}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    borderRadius: 22,
    overflow: "hidden",
  },
  addButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  list: { paddingTop: 16 },
  noResults: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  noResultsIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  noResultsSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
});
