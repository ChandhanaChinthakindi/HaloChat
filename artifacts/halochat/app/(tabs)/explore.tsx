import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TypeCard } from "@/components/TypeBadge";
import { type CompanionType } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

const ALL_TYPES: CompanionType[] = [
  "romantic",
  "supportive",
  "anime",
  "bestfriend",
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
          return (
            <View key={type} style={styles.gridItem}>
              <TypeCard type={type} selected={false} onPress={() => handleTypePress(type)} />
            </View>
          );
        })}

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
});
