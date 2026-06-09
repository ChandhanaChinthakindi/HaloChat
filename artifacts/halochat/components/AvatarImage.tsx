import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

import { getAvatarById } from "@/constants/avatars";

interface Props {
  avatarId?: string | null;
  gradient: [string, string];
  name: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function AvatarImage({ avatarId, gradient, name, size, style }: Props) {
  const avatar = getAvatarById(avatarId ?? undefined);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const radius = size / 2;

  if (avatar?.source) {
    return (
      <Image
        source={avatar.source}
        style={[{ width: size, height: size, borderRadius: radius, overflow: "hidden" }, style as any]}
        contentFit="cover"
        contentPosition={{ top: 0 }}
      />
    );
  }

  // Fallback — gradient circle with initial
  return (
    <LinearGradient
      colors={gradient}
      style={[{ width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center" }, style as any]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  initial: { fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
