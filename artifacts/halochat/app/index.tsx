import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useCompanions } from "@/context/CompanionContext";

const FIRST_LAUNCH_KEY = "halochat_launched_v1";

const { width: SW, height: SH } = Dimensions.get("window");

// Icon proportions mirror the splash.png layout
const ICON_SIZE = SW * 0.58;
const ICON_TOP  = SH * 0.27;

const BG    = "#09090F";
const ROLES = ["Friend", "Lover", "Therapist", "Supporter"];

function LoadingScreen() {
  const [roleIndex, setRoleIndex] = useState(0);

  const iconFade  = useSharedValue(1); // starts visible (matches splash)
  const textFade  = useSharedValue(0);
  const textY     = useSharedValue(10);
  const roleAlpha = useSharedValue(0);
  const roleY     = useSharedValue(8);
  const dot1      = useSharedValue(0.3);
  const dot2      = useSharedValue(0.3);
  const dot3      = useSharedValue(0.3);

  useEffect(() => {
    // Text block fades in shortly after splash hands off
    textFade.value = withDelay(200, withTiming(1, { duration: 500 }));
    textY.value    = withDelay(200, withTiming(0, { duration: 500 }));

    // Role word fades in after text
    setTimeout(() => {
      roleAlpha.value = withTiming(1, { duration: 400 });
      roleY.value     = withTiming(0, { duration: 400 });
    }, 800);

    // Cycle roles
    const interval = setInterval(() => {
      roleAlpha.value = withTiming(0, { duration: 260 });
      roleY.value     = withTiming(-8, { duration: 260 });
      setTimeout(() => {
        setRoleIndex((prev) => (prev + 1) % ROLES.length);
        roleY.value     = 10;
        roleAlpha.value = withTiming(1, { duration: 320 });
        roleY.value     = withTiming(0, { duration: 320 });
      }, 280);
    }, 2200);

    // Loading dots
    const dotAnim = (shared: SharedValue<number>, delay: number) => {
      shared.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1,   { duration: 450 }),
            withTiming(0.3, { duration: 450 }),
          ),
          -1, false,
        ),
      );
    };
    dotAnim(dot1, 0);
    dotAnim(dot2, 200);
    dotAnim(dot3, 400);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ opacity: iconFade.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textFade.value,
    transform: [{ translateY: textY.value }],
  }));
  const roleStyle = useAnimatedStyle(() => ({
    opacity: roleAlpha.value,
    transform: [{ translateY: roleY.value }],
  }));
  const d1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.container}>

      {/* App icon — same position as native splash */}
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.iconImg}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text block fades in below icon */}
      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.appName}>HaloChat</Text>

        <View style={styles.roleRow}>
          <Text style={styles.roleSep}>— </Text>
          <Animated.View style={roleStyle}>
            <Text style={styles.roleText}>{ROLES[roleIndex]}</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Loading dots at bottom */}
      <View style={styles.bottomDots}>
        <Animated.View style={[styles.dot, d1Style]} />
        <Animated.View style={[styles.dot, d2Style]} />
        <Animated.View style={[styles.dot, d3Style]} />
      </View>
    </View>
  );
}

export default function Index() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { hasOnboarded, isLoaded } = useCompanions();

  // null = still checking, true = first launch timer running, false = done
  const [minTimePending, setMinTimePending] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FIRST_LAUNCH_KEY).then((val) => {
      if (val === null) {
        // First ever launch — show loading for 3.5s then mark as seen
        setMinTimePending(true);
        AsyncStorage.setItem(FIRST_LAUNCH_KEY, "1");
        setTimeout(() => setMinTimePending(false), 3500);
      } else {
        setMinTimePending(false);
      }
    });
  }, []);

  const stillLoading =
    minTimePending !== false ||          // first-launch timer running (or AsyncStorage not read yet)
    isAuthLoading ||                     // auth check in progress
    (isAuthenticated && !isLoaded);      // companions not fetched yet

  if (stillLoading) return <LoadingScreen />;

  if (!isAuthenticated) return <Redirect href="/auth/login" />;
  if (!hasOnboarded)    return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Icon */
  iconWrap: {
    position: "absolute",
    top: ICON_TOP,
    left: (SW - ICON_SIZE) / 2,
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  iconImg: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },

  /* Text */
  textWrap: {
    position: "absolute",
    top: ICON_TOP + ICON_SIZE + 28,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
  },
  appName: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    fontFamily: "Inter_700Bold",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 26,
  },
  roleSep: {
    fontSize: 17,
    color: "rgba(129,130,99,0.55)",
    fontFamily: "Inter_400Regular",
  },
  roleText: {
    fontSize: 17,
    color: "#818263",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },

  /* Loading dots */
  bottomDots: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#818263",
  },
});
