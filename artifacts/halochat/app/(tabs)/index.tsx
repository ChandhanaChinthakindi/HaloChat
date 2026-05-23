import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompanionCard } from "@/components/CompanionCard";
import { useCompanions, type Companion } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

export default function CompanionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions, deleteCompanion } = useCompanions();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePress = (companion: Companion) => {
    router.push(`/chat/${companion.id}`);
  };

  const handleLongPress = (companion: Companion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      companion.name,
      "What would you like to do?",
      [
        { text: "View Profile", onPress: () => router.push(`/profile/${companion.id}`) },
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

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            HaloChat
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {companions.length === 0
              ? "No companions yet"
              : `${companions.length} companion${companions.length > 1 ? "s" : ""}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/create")}
          style={({ pressed }) => [
            styles.addButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
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

      {companions.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={[...companions].sort(
            (a, b) => (b.lastMessageTime ?? b.createdAt) - (a.lastMessageTime ?? a.createdAt)
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPadding + 100 },
          ]}
          renderItem={({ item }) => (
            <CompanionCard
              companion={item}
              onPress={() => handlePress(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIcon, { backgroundColor: colors.muted }]}
      >
        <Ionicons name="chatbubbles-outline" size={40} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No companions yet
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
        Create your first AI companion to begin your journey
      </Text>
      <Pressable
        onPress={() => router.push("/create")}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={["#A855F7", "#6D28D9"]}
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
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
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
  list: {
    paddingTop: 16,
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
