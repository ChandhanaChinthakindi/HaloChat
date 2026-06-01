import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COMPANION_TYPES, type CompanionType } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

interface TypeCardProps {
  type: CompanionType;
  selected: boolean;
  onPress: () => void;
}

export function TypeCard({ type, selected, onPress }: TypeCardProps) {
  const colors = useColors();
  const info = COMPANION_TYPES[type] ?? COMPANION_TYPES["supportive"];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: selected ? info.gradient[0] : colors.border,
            borderWidth: selected ? 2 : 1,
          },
        ]}
      >
        {selected && (
          <LinearGradient
            colors={[...info.gradient, "transparent"] as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={info.gradient}
            style={styles.iconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.emoji}>{info.emoji}</Text>
          </LinearGradient>
        </View>
        <Text
          style={[
            styles.label,
            {
              color: selected ? "#FFFFFF" : colors.foreground,
            },
          ]}
        >
          {info.label}
        </Text>
        <Text
          style={[
            styles.desc,
            {
              color: selected ? "rgba(255,255,255,0.8)" : colors.mutedForeground,
            },
          ]}
          numberOfLines={2}
        >
          {info.description}
        </Text>
      </View>
    </Pressable>
  );
}

interface TypeBadgeProps {
  type: CompanionType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const info = COMPANION_TYPES[type] ?? COMPANION_TYPES["supportive"];
  return (
    <View style={styles.badge}>
      <LinearGradient
        colors={info.gradient}
        style={styles.badgeInner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.badgeText}>
          {info.emoji} {info.label}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
    overflow: "hidden",
    minHeight: 120,
  },
  iconWrapper: {
    alignSelf: "flex-start",
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  desc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    overflow: "hidden",
  },
  badgeInner: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
});
