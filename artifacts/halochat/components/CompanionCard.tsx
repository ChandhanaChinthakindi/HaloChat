import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { COMPANION_TYPES, type Companion } from "@/context/CompanionContext";
import { getAvatarById } from "@/constants/avatars";

const WAITING_THRESHOLD_MS = 4 * 60 * 60 * 1000;

// Type-tinted bottom overlay — adds personality while keeping text readable
const TYPE_OVERLAY: Record<string, [string, string, string]> = {
  romantic:   ["transparent", "rgba(154,  75, 107, 0.20)", "rgba(120,  40,  75, 0.52)"],
  supportive: ["transparent", "rgba(129, 130,  99, 0.20)", "rgba( 90,  95,  60, 0.52)"],
  uplift:     ["transparent", "rgba(124,  58, 237, 0.20)", "rgba( 90,  30, 190, 0.55)"],
  bestfriend: ["transparent", "rgba( 90, 122,  94, 0.20)", "rgba( 50,  90,  55, 0.52)"],
};
const FALLBACK_OVERLAY: [string, string, string] = [
  "transparent", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.52)",
];

interface Props {
  companion: Companion;
  onPress: () => void;
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CompanionCard({ companion, onPress, onLongPress }: Props) {
  const scale = useSharedValue(1);
  const avatar = getAvatarById(companion.avatarId);
  const hasAvatar = !!avatar?.source;

  const isWaiting =
    (companion.messageCount ?? 0) >= 2 &&
    companion.lastMessageTime != null &&
    Date.now() - companion.lastMessageTime > WAITING_THRESHOLD_MS;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const typeInfo = COMPANION_TYPES[companion.type] ?? COMPANION_TYPES["supportive"];
  const overlayColors = TYPE_OVERLAY[companion.type] ?? FALLBACK_OVERLAY;

  return (
    <AnimatedPressable
      style={[styles.card, animStyle]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
    >
      {/* Avatar — full bleed image or gradient fallback */}
      {hasAvatar ? (
        <Image
          source={avatar!.source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: 0 }}
        />
      ) : (
        <LinearGradient
          colors={companion.avatarGradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Overlays — only shown when avatar image is present */}
      {hasAvatar && (
        <>
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "transparent"]}
            style={styles.topVignette}
            pointerEvents="none"
          />
          <LinearGradient
            colors={overlayColors}
            style={styles.bottomOverlay}
            pointerEvents="none"
          />
        </>
      )}

      {/* Top badges */}
      <View style={styles.topRow}>
        {companion.pinned && (
          <View style={styles.pinBadge}>
            <Ionicons name="pin" size={9} color="#FFF" />
          </View>
        )}
        <View style={{ flex: 1 }} />
        {(companion.streak ?? 0) > 1 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {companion.streak}</Text>
          </View>
        )}
      </View>

      {/* Info — bottom-anchored when avatar present, centered when gradient-only */}
      <View style={hasAvatar ? styles.bottomInfo : styles.centeredInfo}>
        <Text
          style={[styles.name, !hasAvatar && styles.nameCentered]}
          numberOfLines={1}
        >
          {companion.name}
        </Text>
        <View style={styles.typePill}>
          <Text style={styles.typeEmoji}>{typeInfo.emoji}</Text>
          <Text style={styles.typeLabel}>{typeInfo.label}</Text>
        </View>
        {isWaiting && (
          <View style={[styles.waitingPill, !hasAvatar && { alignSelf: "auto" }]}>
            <WaitingDot />
            <Text style={styles.waitingText}>thinking of you</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

function WaitingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false
    );
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.waitingDot, dotStyle]} />;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  topVignette: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 60,
  },
  bottomOverlay: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: 130,
  },
  topRow: {
    position: "absolute",
    top: 12, left: 12, right: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  pinBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: 5,
  },
  streakBadge: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  streakText: {
    fontSize: 11,
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  // Avatar present → text anchored to bottom
  bottomInfo: {
    position: "absolute",
    bottom: 14, left: 14, right: 14,
    gap: 5,
  },
  // No avatar → text centered in card
  centeredInfo: {
    position: "absolute",
    top: 0, bottom: 0, left: 14, right: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  nameCentered: {
    textAlign: "center",
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeEmoji: { fontSize: 11 },
  typeLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_400Regular",
  },
  waitingPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  waitingDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  waitingText: {
    fontSize: 10,
    color: "#FFF",
    fontFamily: "Inter_400Regular",
  },
});
