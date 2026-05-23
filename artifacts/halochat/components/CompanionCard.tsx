import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { COMPANION_TYPES, type Companion } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  companion: Companion;
  onPress: () => void;
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CompanionCard({ companion, onPress, onLongPress }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const typeInfo = COMPANION_TYPES[companion.type];
  const initials = companion.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

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

  const timeAgo = companion.lastMessageTime
    ? formatTime(companion.lastMessageTime)
    : null;

  return (
    <AnimatedPressable
      style={animStyle}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={companion.avatarGradient}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.initials}>{initials}</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {companion.name}
            </Text>
            {timeAgo && (
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {timeAgo}
              </Text>
            )}
          </View>

          <View style={styles.typeRow}>
            <Text style={[styles.typeTag, { color: colors.primary }]}>
              {typeInfo.emoji} {typeInfo.label}
            </Text>
            <Text style={[styles.relLabel, { color: colors.mutedForeground }]}>
              {relLabel}
            </Text>
          </View>

          {companion.lastMessage ? (
            <Text
              style={[styles.lastMessage, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {companion.lastMessage}
            </Text>
          ) : (
            <Text style={[styles.noMessage, { color: colors.mutedForeground }]}>
              Start a conversation...
            </Text>
          )}

          <View style={styles.bondRow}>
            <View
              style={[styles.bondTrack, { backgroundColor: colors.muted }]}
            >
              <LinearGradient
                colors={companion.avatarGradient}
                style={[styles.bondFill, { width: `${relPercent}%` as any }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
        />
      </View>
    </AnimatedPressable>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeTag: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  relLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  lastMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  noMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 2,
  },
  bondRow: {
    marginTop: 6,
  },
  bondTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  bondFill: {
    height: 3,
    borderRadius: 2,
  },
});
