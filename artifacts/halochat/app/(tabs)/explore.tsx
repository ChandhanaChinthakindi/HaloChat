import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COMPANION_TYPES, type CompanionType } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

const CARD_GAP = 12;
const H_PAD    = 16;

const TYPE_TAGLINE: Record<CompanionType, string> = {
  romantic:   "Affectionate & intimate",
  supportive: "Always here to listen",
  uplift:     "Your biggest believer",
  bestfriend: "Honest, funny & real",
};

const TYPE_BEST_FOR: Record<CompanionType, string> = {
  romantic:   "When you want closeness",
  supportive: "When you need to vent",
  uplift:     "When you need a push",
  bestfriend: "When you want realness",
};

const TYPE_ORBS: Record<CompanionType, { size: number; top: number; left: number; opacity: number }[]> = {
  romantic: [
    { size: 160, top: -50,  left: -40,  opacity: 0.18 },
    { size: 100, top: 30,   left: 80,   opacity: 0.12 },
    { size:  70, top: 110,  left: -20,  opacity: 0.09 },
  ],
  supportive: [
    { size: 140, top: -40,  left: 60,   opacity: 0.18 },
    { size:  90, top: 80,   left: -30,  opacity: 0.12 },
    { size:  60, top: 20,   left: 20,   opacity: 0.08 },
  ],
  uplift: [
    { size: 120, top: -30,  left: -30,  opacity: 0.20 },
    { size: 100, top: 60,   left: 70,   opacity: 0.14 },
    { size:  80, top: 120,  left: 20,   opacity: 0.10 },
    { size:  50, top: -10,  left: 90,   opacity: 0.08 },
  ],
  bestfriend: [
    { size: 130, top: -20,  left: 50,   opacity: 0.16 },
    { size:  80, top: 90,   left: -20,  opacity: 0.12 },
    { size:  60, top: 30,   left: 10,   opacity: 0.09 },
  ],
};

const TYPE_TRAITS: Record<CompanionType, [string, string]> = {
  romantic:   ["Caring", "Devoted"],
  supportive: ["Empathetic", "Patient"],
  uplift:     ["Encouraging", "Radiant"],
  bestfriend: ["Loyal", "Real Talk"],
};

const ALL_TYPES: CompanionType[] = ["romantic", "supportive", "uplift", "bestfriend"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TypeCard({ type, index }: { type: CompanionType; index: number }) {
  const info   = COMPANION_TYPES[type] ?? COMPANION_TYPES["supportive"];
  const orbs   = TYPE_ORBS[type];
  const traits = TYPE_TRAITS[type];
  const scale  = useSharedValue(1);

  // Entrance animation — staggered spring from below + fade
  const translateY = useSharedValue(40);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    const delay = index * 90;
    opacity.value    = withDelay(delay, withTiming(1, { duration: 340, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []); // eslint-disable-line

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.cardWrap, entranceStyle]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/create", params: { type } });
      }}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 14, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 14, stiffness: 300 }); }}
    >
      <LinearGradient
        colors={info.gradient}
        style={[styles.card, { shadowColor: info.gradient[0] }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative orbs */}
        {orbs.map((orb, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              backgroundColor: `rgba(255,255,255,${orb.opacity})`,
              top: orb.top,
              left: orb.left,
            }}
          />
        ))}

        {/* All content centered */}
        <View style={styles.cardCenter}>
          {/* Emoji in a soft circle */}
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{info.emoji}</Text>
          </View>

          {/* Type name */}
          <Text style={styles.cardName}>{info.label}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Tagline */}
          <Text style={styles.cardTagline}>{TYPE_TAGLINE[type]}</Text>

          {/* Best-for line */}
          <Text style={styles.bestFor}>{TYPE_BEST_FOR[type]}</Text>

          {/* Trait pills */}
          <View style={styles.traitRow}>
            {traits.map((t) => (
              <View key={t} style={styles.traitPill}>
                <Text style={styles.traitText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

// ─── Help me choose ───────────────────────────────────────────────────────────

const HELP_OPTIONS: { type: CompanionType; icon: string; headline: string; sub: string }[] = [
  { type: "supportive", icon: "💙", headline: "Someone to listen",  sub: "No judgment, just presence"  },
  { type: "uplift",     icon: "⚡", headline: "A push forward",     sub: "Energy, belief, momentum"    },
  { type: "bestfriend", icon: "💛", headline: "Honest company",     sub: "Real talk & good vibes"      },
  { type: "romantic",   icon: "💗", headline: "Closeness & warmth", sub: "Affection & intimacy"        },
];

// Panel rendered only when open — takes zero layout space when closed
function HelpPanel() {
  const colors       = useColors();
  const panelOpacity = useSharedValue(0);
  const panelY       = useSharedValue(16);

  useEffect(() => {
    panelOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
    panelY.value       = withSpring(0, { damping: 18, stiffness: 200 });
  }, []); // eslint-disable-line

  // Panel renders above the trigger: slide up from below
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelY.value }],
  }));

  return (
    <Animated.View style={[hStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }, panelStyle]}>
      {HELP_OPTIONS.map((opt, i) => {
        const info = COMPANION_TYPES[opt.type] ?? COMPANION_TYPES["supportive"];
        return (
          <Pressable
            key={opt.type}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/create", params: { type: opt.type } });
            }}
            style={({ pressed }) => [
              hStyles.row,
              i < HELP_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <LinearGradient colors={info.gradient} style={hStyles.dot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={hStyles.dotIcon}>{opt.icon}</Text>
            </LinearGradient>
            <View style={hStyles.rowText}>
              <Text style={[hStyles.headline, { color: colors.foreground }]}>{opt.headline}</Text>
              <Text style={[hStyles.sub, { color: colors.mutedForeground }]}>{opt.sub}</Text>
            </View>
            <Text style={[hStyles.chevron, { color: colors.mutedForeground }]}>›</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const hStyles = StyleSheet.create({
  trigger:  { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", letterSpacing: 0.2 },
  panel:    { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  dot:      { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  dotIcon:  { fontSize: 18 },
  rowText:  { flex: 1, gap: 2 },
  headline: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  sub:      { fontSize: 12, fontFamily: "Inter_400Regular" },
  chevron:  { fontSize: 22, fontFamily: "Inter_400Regular", marginRight: -4 },
});

// ─── Pulsing hint ─────────────────────────────────────────────────────────────

function PulsingHint({ color }: { color: string }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
  }, []); // eslint-disable-line

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text style={[styles.hint, { color }, style]}>
      Tap a card to begin
    </Animated.Text>
  );
}

export default function ExploreScreen() {
  const colors      = useColors();
  const insets      = useSafeAreaInsets();
  const topPadding  = Platform.OS === "web" ? 67 : insets.top;
  const btmPadding  = Platform.OS === "web" ? 34 : insets.bottom;

  const [helpOpen, setHelpOpen]   = useState(false);
  const [footerH,  setFooterH]    = useState(0);

  // Grid dim when help is open
  const dimOpacity = useSharedValue(0);
  useEffect(() => {
    dimOpacity.value = withTiming(helpOpen ? 1 : 0, { duration: 200 });
  }, [helpOpen]); // eslint-disable-line
  const dimStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

  // Header entrance
  const headerOpacity = useSharedValue(0);
  const headerY       = useSharedValue(-12);
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    headerY.value       = withSpring(0, { damping: 20, stiffness: 140 });
  }, []); // eslint-disable-line
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  // Panel sits above the footer — bottom offset = tab area + footer height + gap
  const panelBottom = btmPadding + 90 + footerH + 8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 10, paddingBottom: btmPadding + 90 }]}>

      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={[styles.eyebrow, { color: colors.label }]}>
          Create a companion
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Who do you need{"\n"}right now?
        </Text>
      </Animated.View>

      {/* Grid — disabled & dimmed when help is open */}
      <View style={styles.grid} pointerEvents={helpOpen ? "none" : "auto"}>
        <View style={styles.row}>
          <TypeCard type="romantic"   index={0} />
          <TypeCard type="supportive" index={1} />
        </View>
        <View style={styles.row}>
          <TypeCard type="uplift"     index={2} />
          <TypeCard type="bestfriend" index={3} />
        </View>
        {/* Dim overlay — animated, non-interactive */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.gridDim, dimStyle]} pointerEvents="none" />
      </View>

      {/* Footer — hint + trigger in normal flow, always fixed height */}
      <View
        style={styles.footer}
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
      >
        <PulsingHint color={colors.label} />
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHelpOpen((v) => !v); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[hStyles.trigger, { color: colors.label }]}>
            {helpOpen ? "Never mind ✕" : "Not sure? Help me choose →"}
          </Text>
        </Pressable>
      </View>

      {/* Panel — absolutely positioned, floats above footer, never affects grid size */}
      {helpOpen && footerH > 0 && (
        <View style={[styles.panelWrap, { bottom: panelBottom }]}>
          <HelpPanel />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: H_PAD },

  header: { marginBottom: 16, gap: 4 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.6 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },

  grid:     { flex: 1, gap: CARD_GAP },
  gridDim:  { backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 28 },
  footer:   { gap: 8 },
  panelWrap:{ position: "absolute", left: H_PAD, right: H_PAD, zIndex: 20, elevation: 20 },
  row:  { flexDirection: "row", gap: CARD_GAP, flex: 1 },

  cardWrap: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 12,
  },

  cardCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emoji: { fontSize: 24 },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  divider: {
    width: 28,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginVertical: 2,
  },
  cardTagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    lineHeight: 15,
  },
  bestFor: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
    fontStyle: "italic",
  },
  traitRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 2,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  traitPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  traitText: {
    fontSize: 10,
    color: "#FFF",
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },

  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 10,
  },
});
