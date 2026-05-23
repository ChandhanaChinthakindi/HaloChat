import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TypeCard } from "@/components/TypeBadge";
import { COMPANION_TYPES, type CompanionType } from "@/context/CompanionContext";
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

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleTypePress = (type: CompanionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/create", params: { type } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Explore
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Choose a companion personality
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {ALL_TYPES.map((type) => {
          const info = COMPANION_TYPES[type];
          return (
            <View key={type} style={styles.gridItem}>
              <TypeCard type={type} selected={false} onPress={() => handleTypePress(type)} />
            </View>
          );
        })}

        <View style={styles.featuredSection}>
          <LinearGradient
            colors={["#A855F7", "#EC4899"]}
            style={styles.featuredCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.featuredTitle}>Custom Companion</Text>
            <Text style={styles.featuredDesc}>
              Design a one-of-a-kind companion with your own personality description
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/create");
              }}
              style={({ pressed }) => [
                styles.featuredButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.featuredButtonText}>Create Custom</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  grid: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: "47%",
  },
  featuredSection: {
    width: "100%",
    marginTop: 4,
  },
  featuredCard: {
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  featuredDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  featuredButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  featuredButtonText: {
    color: "#FFFFFF",
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
