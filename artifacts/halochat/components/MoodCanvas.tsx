import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const BALL_SIZE = 44;

function lerpColor(c1: string, c2: string, t: number): string {
  const p = (s: string, o: number) => parseInt(s.slice(o, o + 2), 16);
  const r = Math.round(p(c1, 1) + (p(c2, 1) - p(c1, 1)) * t);
  const g = Math.round(p(c1, 3) + (p(c2, 3) - p(c1, 3)) * t);
  const b = Math.round(p(c1, 5) + (p(c2, 5) - p(c1, 5)) * t);
  return `rgb(${r},${g},${b})`;
}

// 4-corner bilinear blend: tl=calm sage, tr=warm amber, bl=muted lavender, br=warm rose
export function getMoodColor(nx: number, ny: number): string {
  return lerpColor(
    lerpColor("#78C4A0", "#E8A840", nx),
    lerpColor("#9080C0", "#D07898", nx),
    ny
  );
}

export function getMoodText(nx: number, ny: number): string {
  const v = 1 - ny;
  const e = nx;
  if (v > 0.72 && e < 0.35) return "Serene · Calm · Peaceful";
  if (v > 0.72 && e > 0.65) return "Joyful · Excited · Energised";
  if (v > 0.72)             return "Content · Happy · Good";
  if (v < 0.28 && e < 0.35) return "Drained · Withdrawn · Low";
  if (v < 0.28 && e > 0.65) return "Tense · Anxious · Stressed";
  if (v < 0.28)             return "Down · Heavy · Unsettled";
  if (e < 0.35)             return "Quiet · Still · Subdued";
  if (e > 0.65)             return "Alert · Charged · Active";
  return "Balanced · Neutral · Present";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onMoodChange?: (moodText: string, dotColor: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  canvasHeight?: number;
}

export function MoodCanvas({
  onMoodChange,
  onInteractionStart,
  onInteractionEnd,
  canvasHeight = 168,
}: Props) {
  const colors = useColors();
  const canvasRef    = useRef({ w: 300, h: canvasHeight });
  const ballAnim     = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const ballScale    = useRef(new Animated.Value(0)).current;
  const promptOpacity = useRef(new Animated.Value(1)).current;
  const hasShownBall = useRef(false);

  const [hasTouched, setHasTouched] = useState(false);
  const [moodText, setMoodText]     = useState("Balanced · Neutral · Present");
  const [dotColor, setDotColor]     = useState(getMoodColor(0.5, 0.5));

  const onMoodChangeRef       = useRef(onMoodChange);
  const onInteractionStartRef = useRef(onInteractionStart);
  const onInteractionEndRef   = useRef(onInteractionEnd);
  useEffect(() => { onMoodChangeRef.current = onMoodChange; }, [onMoodChange]);
  useEffect(() => { onInteractionStartRef.current = onInteractionStart; }, [onInteractionStart]);
  useEffect(() => { onInteractionEndRef.current = onInteractionEnd; }, [onInteractionEnd]);

  // Gentle prompt pulse before first touch
  useEffect(() => {
    if (hasTouched) {
      promptOpacity.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(promptOpacity, {
          toValue: 0.45,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(promptOpacity, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [hasTouched, promptOpacity]);

  const handlePosition = useCallback(
    (rawX: number, rawY: number) => {
      const { w, h } = canvasRef.current;
      if (!w || !h) return;
      const nx = Math.max(0, Math.min(1, rawX / w));
      const ny = Math.max(0, Math.min(1, rawY / h));

      ballAnim.setValue({
        x: Math.max(0, Math.min(w - BALL_SIZE, nx * w - BALL_SIZE / 2)),
        y: Math.max(0, Math.min(h - BALL_SIZE, ny * h - BALL_SIZE / 2)),
      });

      const text  = getMoodText(nx, ny);
      const color = getMoodColor(nx, ny);

      if (!hasShownBall.current) {
        hasShownBall.current = true;
        setHasTouched(true);
        Animated.spring(ballScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
      }

      setMoodText(text);
      setDotColor(color);
      onMoodChangeRef.current?.(text, color);
    },
    [ballAnim, ballScale]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant: (e) => {
        onInteractionStartRef.current?.();
        handlePosition(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) =>
        handlePosition(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease:   () => onInteractionEndRef.current?.(),
      onPanResponderTerminate: () => onInteractionEndRef.current?.(),
    })
  ).current;

  return (
    <View style={styles.wrap}>
      {/* Descriptor row */}
      <View style={styles.descRow}>
        {hasTouched && (
          <>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.descText, { color: colors.foreground }]} numberOfLines={1}>
              {moodText}
            </Text>
          </>
        )}
      </View>

      {/* Canvas */}
      <View
        style={[styles.canvas, { height: canvasHeight }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          canvasRef.current = { w: width, h: height };
          ballAnim.setValue({ x: width / 2 - BALL_SIZE / 2, y: height / 2 - BALL_SIZE / 2 });
        }}
        {...panResponder.panHandlers}
      >
        {/* Horizontal: Quiet (sage) → Intense (amber) */}
        <LinearGradient
          colors={["#B0D8C0", "#EEC488"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Vertical overlay: Pleasant (transparent) → Unpleasant (rose) */}
        <LinearGradient
          colors={["rgba(196,144,172,0.0)", "rgba(204,132,164,0.72)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Axis labels */}
        <Text style={styles.axisTop}>Pleasant</Text>
        <Text style={styles.axisBottom}>Unpleasant</Text>
        <View style={styles.axisLeftWrap}>
          <Text style={[styles.axisSide, { transform: [{ rotate: "-90deg" }] }]}>Quiet</Text>
        </View>
        <View style={styles.axisRightWrap}>
          <Text style={[styles.axisSide, { transform: [{ rotate: "90deg" }] }]}>Intense</Text>
        </View>

        {/* Pre-touch prompt — pulses gently */}
        {!hasTouched && (
          <Animated.View
            style={[styles.hintWrap, { opacity: promptOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.canvasPrompt}>How are you feeling?</Text>
          </Animated.View>
        )}

        {/* Ball — springs in on first touch, glows with mood color */}
        {hasTouched && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ball,
              {
                shadowColor: dotColor,
                transform: [
                  { translateX: ballAnim.x },
                  { translateY: ballAnim.y },
                  { scale: ballScale },
                ],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { gap: 8 },

  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  dot: { width: 13, height: 13, borderRadius: 7 },
  descText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    flex: 1,
  },

  canvas: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },

  axisTop: {
    position: "absolute",
    top: 7,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
  },
  axisBottom: {
    position: "absolute",
    bottom: 7,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
  },
  axisLeftWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  axisRightWrap: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  axisSide: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    width: 56,
    textAlign: "center",
  },

  hintWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasPrompt: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.1,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  ball: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
});
