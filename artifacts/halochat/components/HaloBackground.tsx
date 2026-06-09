/**
 * HaloBackground — the app's ambient theme layer.
 *
 * Four soft gradient orbs sit in the corners of every screen,
 * each slowly "breathing" (scale/opacity) at different rates.
 * Colors mirror the four companion types so the whole app feels alive
 * and cohesive without being distracting.
 *
 * Sits at zIndex -1, pointerEvents none — never blocks interaction.
 */
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Dimensions, Image, StyleSheet, useColorScheme, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

// Each orb: position anchor, size, gradient colours, animation timing
const ORBS_LIGHT = [
  // Romantic — blush/soft rose — top-left
  {
    size: 380,
    x: -140,
    y: -120,
    colors: ["#FADADD", "#F2709C"] as [string, string],
    opacity: 0.22,
    duration: 9200,
    delay: 0,
  },
  // Supportive — soft lavender — top-right
  {
    size: 340,
    x: W - 200,
    y: -100,
    colors: ["#E8D5F5", "#C084FC"] as [string, string],
    opacity: 0.18,
    duration: 11500,
    delay: 2800,
  },
  // Uplift — light peach/coral — bottom-left
  {
    size: 320,
    x: -120,
    y: H - 280,
    colors: ["#FFD6E0", "#FFB3BA"] as [string, string],
    opacity: 0.16,
    duration: 13000,
    delay: 5500,
  },
  // Best Friend — pale lilac/mauve — bottom-right
  {
    size: 360,
    x: W - 220,
    y: H - 320,
    colors: ["#DDD6FE", "#A78BFA"] as [string, string],
    opacity: 0.15,
    duration: 10800,
    delay: 3900,
  },
];

const ORBS_DARK = ORBS_LIGHT.map((o) => ({ ...o, opacity: o.opacity * 0.6 }));

function GlowOrb({
  size,
  x,
  y,
  colors,
  opacity,
  duration,
  delay,
}: (typeof ORBS_LIGHT)[0]) {
  const scale = useSharedValue(1);
  const fade  = useSharedValue(opacity);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration, easing: ease }),
          withTiming(0.88, { duration, easing: ease })
        ),
        -1,
        true
      )
    );

    fade.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(opacity * 1.25, { duration: duration * 0.9, easing: ease }),
          withTiming(opacity * 0.7,  { duration: duration * 0.9, easing: ease })
        ),
        -1,
        true
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: fade.value,
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2, left: x, top: y },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
    </Animated.View>
  );
}

export function HaloBackground() {
  const scheme = useColorScheme();
  const orbs   = scheme === "dark" ? ORBS_DARK : ORBS_LIGHT;

  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require("../assets/backgrounds/premium_vector-1752918871409-a21cfe3a621b.jpeg")}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
        {orbs.map((orb, i) => (
          <GlowOrb key={i} {...orb} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.80,
  },
  orb: {
    position: "absolute",
    overflow: "hidden",
  },
});
