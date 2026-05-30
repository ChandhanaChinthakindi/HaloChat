import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const WAITING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

import { COMPANION_TYPES, type Companion } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  companion: Companion;
  onPress: () => void;
  onCallPress?: () => void;
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CompanionCard({ companion, onPress, onCallPress, onLongPress }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const isWaiting =
    (companion.messageCount ?? 0) >= 2 &&
    companion.lastMessageTime != null &&
    Date.now() - companion.lastMessageTime > WAITING_THRESHOLD_MS;

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
        <View>
          <LinearGradient
            colors={companion.avatarGradient}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.initials}>{initials}</Text>
          </LinearGradient>
          {isWaiting && <WaitingDot />}
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {companion.name}
            </Text>
            {companion.pinned && (
              <Ionicons name="pin" size={12} color={colors.primary} style={{ marginRight: 2 }} />
            )}
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
            {(companion.streak ?? 0) > 1 && (
              <View style={[styles.streakBadge, { backgroundColor: "rgba(251,146,60,0.12)" }]}>
                <Text style={styles.streakText}>🔥 {companion.streak}</Text>
              </View>
            )}
          </View>

          {companion.lastMessage ? (
            <Text
              style={[styles.lastMessage, { color: isWaiting ? colors.primary : colors.mutedForeground }]}
              numberOfLines={1}
            >
              {isWaiting ? `${companion.name} is thinking of you...` : companion.lastMessage}
            </Text>
          ) : (
            <Text style={[styles.noMessage, { color: colors.mutedForeground }]}>
              Start a conversation...
            </Text>
          )}

          <View style={styles.bondRow}>
            <View style={[styles.bondTrack, { backgroundColor: colors.muted }]}>
              <LinearGradient
                colors={companion.avatarGradient}
                style={[styles.bondFill, { width: `${relPercent}%` as any }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </View>

        {/* Right actions */}
        <View style={styles.rightActions}>
          {onCallPress && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onCallPress();
              }}
              style={({ pressed }) => [
                styles.callBtn,
                {
                  backgroundColor: pressed
                    ? `${colors.primary}20`
                    : `${colors.primary}12`,
                  borderColor: `${colors.primary}30`,
                },
              ]}
            >
              <Ionicons name="call-outline" size={15} color={colors.primary} />
            </Pressable>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

function WaitingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.waitingDot,
        dotStyle,
      ]}
    />
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
  content: { flex: 1, gap: 3 },
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
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeTag: { fontSize: 12, fontFamily: "Inter_500Medium" },
  relLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  lastMessage: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  noMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 2,
  },
  bondRow: { marginTop: 6 },
  bondTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  bondFill: { height: 3, borderRadius: 2 },
  streakBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  streakText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  waitingDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#818263",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
