import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { COMPANION_TYPES, type CompanionType } from "@/context/CompanionContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TypeCardProps {
  type: CompanionType;
  selected: boolean;
  onPress: () => void;
}

export function TypeCard({ type, selected, onPress }: TypeCardProps) {
  const info  = COMPANION_TYPES[type] ?? COMPANION_TYPES["supportive"];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={animStyle}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 14, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 14, stiffness: 300 }); }}
    >
      <View style={[
        styles.card,
        {
          shadowColor: info.gradient[0],
          shadowOpacity: selected ? 0.5 : 0.22,
          shadowRadius: selected ? 22 : 14,
        },
      ]}>
        {/* Gradient base — full opacity when selected, muted when not */}
        <LinearGradient
          colors={info.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Glass overlay — thinner when selected so gradient shows through */}
        <View style={[
          styles.glassOverlay,
          { backgroundColor: selected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.46)" },
          { borderColor:       selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.68)" },
        ]} />

        {/* Refraction highlight — top edge catches the "light" */}
        <View style={styles.refraction} />

        {/* Content */}
        <Text style={styles.emoji}>{info.emoji}</Text>
        <Text style={[styles.label, { opacity: selected ? 1 : 0.9 }]}>{info.label}</Text>
        <Text style={styles.desc} numberOfLines={2}>{info.description}</Text>

        {selected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          </View>
        )}
      </View>
    </AnimatedPressable>
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
        <Text style={styles.badgeText}>{info.emoji} {info.label}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 8,
    overflow: "hidden",
    minHeight: 150,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  // Glass surface sits on top of gradient
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },

  // Thin bright line at top — simulates light hitting glass edge
  refraction: {
    position: "absolute",
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 1,
  },

  emoji:    { fontSize: 32, marginBottom: 4, zIndex: 1 },
  label: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    zIndex: 1,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.88)",
    lineHeight: 17,
    zIndex: 1,
  },
  checkmark: { position: "absolute", top: 14, right: 14, zIndex: 2 },

  badge:      { alignSelf: "flex-start", borderRadius: 20, overflow: "hidden" },
  badgeInner: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText:  { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" },
});
