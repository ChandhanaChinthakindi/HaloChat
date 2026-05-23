import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCompanions } from "@/context/CompanionContext";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    title: "Welcome to\nHaloChat",
    subtitle: "Your AI companion, always by your side",
    gradient: ["#A855F7", "#6D28D9"] as [string, string],
    icon: "sparkles" as const,
  },
  {
    title: "Choose Your\nConnection",
    subtitle: "Romantic, mentor, best friend, or something uniquely yours",
    gradient: ["#FF6B9D", "#C44569"] as [string, string],
    icon: "heart" as const,
  },
  {
    title: "It Remembers\nYou",
    subtitle: "Your companion grows with you, building real emotional continuity",
    gradient: ["#6EE7F7", "#3B82F6"] as [string, string],
    icon: "infinite" as const,
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setHasOnboarded } = useCompanions();
  const [step, setStep] = useState(0);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await setHasOnboarded(true);
      router.replace("/(tabs)/");
    }
  };

  const slide = SLIDES[step];

  return (
    <LinearGradient
      colors={[colors.background, colors.muted]}
      style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
    >
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === step ? slide.gradient[0] : colors.border,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.center}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.iconCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={slide.icon} size={48} color="#FFFFFF" />
        </LinearGradient>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {slide.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {slide.subtitle}
        </Text>
      </View>

      <Pressable
        onPress={handleNext}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={slide.gradient}
          style={styles.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>
            {step === SLIDES.length - 1 ? "Get Started" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingTop: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 300,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 32,
    marginBottom: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
});
