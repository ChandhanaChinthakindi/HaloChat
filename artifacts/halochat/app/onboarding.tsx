import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCompanions } from "@/context/CompanionContext";
import { hapticsImpact } from "@/utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    title: "Welcome to\nHaloChat",
    subtitle: "AI companions that truly listen, remember, and grow with you over time",
    gradient: ["#818263", "#A3A380"] as [string, string],
    icon: "sparkles" as const,
  },
  {
    title: "Every Kind\nof Bond",
    subtitle: "Romantic, mentor, best friend, or therapist — find the connection you need right now",
    gradient: ["#9A4B6B", "#D8A48F"] as [string, string],
    icon: "heart" as const,
  },
  {
    title: "It Learns\nAbout You",
    subtitle: "The more you share, the deeper the bond. Your companion remembers what matters to you",
    gradient: ["#4A6A7E", "#7BA3A8"] as [string, string],
    icon: "infinite" as const,
  },
];

const NAME_GRADIENT: [string, string] = ["#818263", "#BB8588"];
const TOTAL_STEPS = SLIDES.length + 1;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setHasOnboarded, setUserName } = useCompanions();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const nameInputRef = useRef<TextInput>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const isNameStep = step === SLIDES.length;
  const activeGradient = isNameStep ? NAME_GRADIENT : SLIDES[step].gradient;

  const contentOpacity = useSharedValue(1);
  const contentTranslateX = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
  }));

  const animateTransition = (direction: "forward" | "back", callback: () => void) => {
    const outX = direction === "forward" ? -32 : 32;
    const inX = direction === "forward" ? 32 : -32;

    contentTranslateX.value = withTiming(outX, { duration: 150 });
    contentOpacity.value = withTiming(0, { duration: 150 });

    setTimeout(() => {
      callback();
      contentTranslateX.value = inX;
      contentTranslateX.value = withTiming(0, { duration: 220 });
      contentOpacity.value = withTiming(1, { duration: 220 });
    }, 155);
  };

  const handleNext = async () => {
    if (isNameStep) {
      hapticsImpact();
      Keyboard.dismiss();
      if (name.trim()) await setUserName(name.trim());
      await setHasOnboarded(true);
      router.replace("/(tabs)");
      return;
    }

    hapticsImpact();
    animateTransition("forward", () => {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep === SLIDES.length) {
        setTimeout(() => nameInputRef.current?.focus(), 350);
      }
    });
  };

  const handleBack = () => {
    if (step === 0) return;
    hapticsImpact();
    animateTransition("back", () => setStep(s => s - 1));
  };

  const buttonLabel = isNameStep
    ? (name.trim() ? "Let's go" : "Continue")
    : step === SLIDES.length - 1
    ? "Get Started"
    : "Continue";

  return (
    <LinearGradient
      colors={[colors.background, colors.muted]}
      style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
    >
      {/* Ambient glow behind content */}
      <View
        style={[
          styles.glow,
          { backgroundColor: activeGradient[0] },
        ]}
      />

      {/* Top bar: back + dots + spacer */}
      <View style={styles.topBar}>
        <View style={styles.sideSlot}>
          {step > 0 && (
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            >
              <Ionicons name="chevron-back" size={24} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === step ? activeGradient[0] : colors.border,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.sideSlot} />
      </View>

      {/* Slide content */}
      <Animated.View style={[styles.center, contentStyle]}>
        {isNameStep ? (
          <>
            <LinearGradient
              colors={NAME_GRADIENT}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person" size={48} color="#FFFFFF" />
            </LinearGradient>

            <Text style={[styles.tag, { color: activeGradient[0] }]}>
              One last thing
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {"What should\nI call you?"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your companions will use your name to make every conversation feel personal
            </Text>

            <View
              style={[
                styles.nameInputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: name.length > 0 ? NAME_GRADIENT[0] : colors.border,
                },
              ]}
            >
              <TextInput
                ref={nameInputRef}
                style={[styles.nameInputText, { color: colors.foreground }]}
                placeholder="Your name..."
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleNext}
                autoCapitalize="words"
              />
            </View>

            <Text style={[styles.skipHint, { color: colors.mutedForeground }]}>
              You can skip this — tap {name.trim() ? "Let's go" : "Continue"}
            </Text>
          </>
        ) : (
          <>
            <LinearGradient
              colors={SLIDES[step].gradient}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={SLIDES[step].icon} size={48} color="#FFFFFF" />
            </LinearGradient>

            <Text style={[styles.title, { color: colors.foreground }]}>
              {SLIDES[step].title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {SLIDES[step].subtitle}
            </Text>
          </>
        )}
      </Animated.View>

      {/* CTA button */}
      <Pressable
        onPress={handleNext}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={activeGradient}
          style={styles.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
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
  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: "18%",
    alignSelf: "center",
    opacity: 0.07,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 8,
  },
  sideSlot: {
    width: 32,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tag: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: -8,
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
  nameInputWrapper: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  nameInputText: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  skipHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: -4,
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
