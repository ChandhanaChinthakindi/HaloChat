import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/AvatarImage";
import { MoodCanvas } from "@/components/MoodCanvas";
import { useAuth } from "@/context/AuthContext";
import { useCompanions, API_BASE } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

// ─── Activity config ──────────────────────────────────────────────────────────

export type ActivityType = "checkin" | "breathing" | "journal" | "gratitude";

const ACTIVITIES = [
  {
    type: "breathing" as ActivityType,
    title: "Breathing",
    subtitle: "4-4-4 guided breath to calm your nervous system",
    icon: "leaf-outline" as const,
    gradient: ["#A8D4C0", "#72B8A0"] as [string, string],
    accentColor: "#267A60",
    duration: "3 min",
    tag: "Calm",
  },
  {
    type: "journal" as ActivityType,
    title: "Journal Prompt",
    subtitle: "Reflect on your day with a personalized prompt",
    icon: "journal-outline" as const,
    gradient: ["#C4B8E4", "#A094CC"] as [string, string],
    accentColor: "#5840A4",
    duration: "5 min",
    tag: "Reflect",
  },
  {
    type: "gratitude" as ActivityType,
    title: "Gratitude",
    subtitle: "Name three things that made today worth it",
    icon: "heart-outline" as const,
    gradient: ["#F4B4C8", "#E890B0"] as [string, string],
    accentColor: "#B04068",
    duration: "3 min",
    tag: "Uplift",
  },
] as const;

const DONE_GRADIENT: [string, string] = ["#B8D4BC", "#94C4A8"];
const STORAGE_PREFIX = "halochat_activity_done_";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Mood messages ────────────────────────────────────────────────────────────

const MOOD_MESSAGES: Record<string, string[]> = {
  "Serene · Calm · Peaceful": [
    "You're carrying a quiet kind of light today. Let it stay.",
    "This stillness in you is rare. Don't rush past it.",
    "You found your centre today. That's not nothing.",
  ],
  "Joyful · Excited · Energised": [
    "This energy looks really good on you. Make something of it.",
    "Whatever you've got going on today — lean into it.",
    "You're lit up right now. I hope it lasts all day.",
  ],
  "Content · Happy · Good": [
    "Hold onto this feeling. You built it.",
    "Good days like this are worth noticing.",
    "You seem settled today. That's a good place to be.",
  ],
  "Drained · Withdrawn · Low": [
    "Rest isn't giving up. It's how you come back.",
    "Low days happen to everyone. You don't have to push through alone.",
    "It's okay to be quiet today. I'm still here.",
  ],
  "Tense · Anxious · Stressed": [
    "Whatever's pulling at you right now — you don't have to solve it all today.",
    "Take one breath. Then another. You've gotten through hard days before.",
    "Your feelings are real, but they're not the whole picture.",
  ],
  "Down · Heavy · Unsettled": [
    "Some days just sit heavy. That doesn't mean something is wrong with you.",
    "You don't have to perform okay right now. Just be.",
    "I'm glad you checked in. That took something.",
  ],
  "Quiet · Still · Subdued": [
    "There's something gentle about being this way today.",
    "Not every day needs to be loud. This kind of quiet has its own worth.",
    "You're moving slower today. That's allowed.",
  ],
  "Alert · Charged · Active": [
    "You've got something going on today. Use it well.",
    "That edge you're feeling? Channel it into something that matters.",
    "You're switched on right now. Don't let it go to waste.",
  ],
  "Balanced · Neutral · Present": [
    "Being here, just as you are, is enough.",
    "Even steady days have their own kind of grace.",
    "Not every day is a peak. Middle days are where life actually happens.",
  ],
};

function pickMessage(moodText: string, dateSeed: string): string {
  const list = MOOD_MESSAGES[moodText] ?? MOOD_MESSAGES["Balanced · Neutral · Present"];
  const idx = dateSeed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % list.length;
  return list[idx];
}

// ─── Mood card ────────────────────────────────────────────────────────────────

interface SentState {
  moodText: string;
  dotColor: string;
  message: string;
}

function MoodCard({
  colors,
  onCanvasInteractionStart,
  onCanvasInteractionEnd,
}: {
  colors: ReturnType<typeof useColors>;
  onCanvasInteractionStart: () => void;
  onCanvasInteractionEnd: () => void;
}) {
  const { companions, bumpCompanionActivity } = useCompanions();
  const { authFetch, user } = useAuth();
  const [moodText, setMoodText]       = useState("");
  const [dotColor, setDotColor]       = useState("");
  const [canShare, setCanShare]       = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sent, setSent]               = useState<SentState | null>(null);
  const [isSending, setIsSending]     = useState(false);

  // Animation for quote card entrance
  const quoteOpacity    = useRef(new Animated.Value(0)).current;
  const quoteTranslateY = useRef(new Animated.Value(16)).current;

  // Animation for companion section entrance
  const shareOpacity    = useRef(new Animated.Value(0)).current;
  const shareTranslateY = useRef(new Animated.Value(10)).current;

  const CARD_STATE_KEY = "halochat_mood_card_state";

  const animateQuoteIn = (instant = false) => {
    if (instant) {
      quoteOpacity.setValue(1);
      quoteTranslateY.setValue(0);
      return;
    }
    quoteOpacity.setValue(0);
    quoteTranslateY.setValue(16);
    Animated.parallel([
      Animated.timing(quoteOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(quoteTranslateY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
    ]).start();
  };

  // Restore or clear persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(CARD_STATE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as SentState & { date: string };
        if (saved.date === todayKey()) {
          setSent({ moodText: saved.moodText, dotColor: saved.dotColor, message: saved.message });
          animateQuoteIn(true);
        } else {
          AsyncStorage.removeItem(CARD_STATE_KEY);
        }
      } catch {}
    });
  }, []);

  const toggleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canSend = canShare && selectedIds.size > 0 && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const today = todayKey();
    const selected = companions.filter((c) => selectedIds.has(c.id));
    const currentMoodText = moodText;
    const currentUserName = user?.name;

    // Call the API first — messages land in the DB before the sent card shows
    const shareResults = await Promise.allSettled(
      selected.map(async (c) => {
        const res = await authFetch(`${API_BASE}/companions/${c.id}/mood-share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moodText: currentMoodText, userName: currentUserName }),
        });
        const body = await res.json().catch(() => ({}));
        if (body.breathingRecommended) {
          await AsyncStorage.setItem(`halochat_breathing_rec_${c.id}`, "1");
        }
        return body;
      })
    );

    // Bump each companion to the top of the home screen list
    selected.forEach((c) => bumpCompanionActivity(c.id));
    void shareResults; // consumed above

    // API done — now persist and show the sent card
    const message = pickMessage(currentMoodText, today);
    const sentState: SentState = { moodText: currentMoodText, dotColor, message };
    await AsyncStorage.setItem(CARD_STATE_KEY, JSON.stringify({ ...sentState, date: today }));
    setSent(sentState);
    animateQuoteIn();
    setIsSending(false);
  };

  const handleReset = async () => {
    await AsyncStorage.removeItem(CARD_STATE_KEY);
    setSent(null);
    setCanShare(false);
    setMoodText("");
    setDotColor("");
    setSelectedIds(new Set());
  };

  // ── Sent confirmation card ──────────────────────────────────────────────────
  if (sent) {
    return (
      <Animated.View
        style={[
          styles.moodCard,
          {
            borderColor: colors.border,
            overflow: "hidden",
            backgroundColor: colors.card,
            opacity: quoteOpacity,
            transform: [{ translateY: quoteTranslateY }],
          },
        ]}
      >
        {/* Tinted background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${sent.dotColor}14`, borderRadius: 24 }]} />

        {/* Message */}
        <View style={styles.sentQuoteBlock}>
          <Text style={[styles.sentQuoteText, { color: colors.foreground }]}>"{sent.message}"</Text>
        </View>

        {/* Footer: mood label + pen */}
        <View style={styles.sentFooter}>
          <View style={styles.sentMoodRow}>
            <View style={[styles.sentDot, { backgroundColor: sent.dotColor }]} />
            <Text style={[styles.sentMoodLabel, { color: colors.mutedForeground }]}>{sent.moodText}</Text>
          </View>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.sentEditBtn,
              { backgroundColor: `${sent.dotColor}28`, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="pencil" size={13} color={sent.dotColor} />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // ── Default card ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.moodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MoodCanvas
        canvasHeight={148}
        onMoodChange={(text, color) => {
          setMoodText(text);
          setDotColor(color ?? "");
          if (!canShare) {
            setCanShare(true);
            Animated.parallel([
              Animated.timing(shareOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
              Animated.spring(shareTranslateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
            ]).start();
          }
        }}
        onInteractionStart={onCanvasInteractionStart}
        onInteractionEnd={onCanvasInteractionEnd}
      />

      {/* Share section — appears after ball is placed */}
      {canShare && (
        <Animated.View style={{ opacity: shareOpacity, transform: [{ translateY: shareTranslateY }] }}>

      {/* Share with header */}
      <View style={styles.moodShareHeader}>
        <Text style={[styles.moodShareTitle, { color: colors.foreground }]}>Share with</Text>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.moodSendBtn,
            { backgroundColor: canSend ? "#D99030" : colors.muted, opacity: pressed ? 0.82 : 1 },
          ]}
        >
          {isSending
            ? <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
            : <Ionicons name="arrow-up" size={16} color={canSend ? "#FFFFFF" : colors.mutedForeground} />
          }
        </Pressable>
      </View>

      {/* Companion picker */}
      {companions.length === 0 ? (
        <Pressable onPress={() => router.push("/(tabs)/explore")} style={styles.emptyCompanions}>
          <Ionicons name="add-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.emptyCompanionsText, { color: colors.mutedForeground }]}>
            Create a companion to share your mood
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.companionRow}
        >
          {companions.map((c) => {
            const selected = selectedIds.has(c.id);
            return (
              <Pressable key={c.id} onPress={() => toggleSelect(c.id)} style={styles.companionItem}>
                <View
                  style={[
                    styles.companionRing,
                    { borderColor: selected ? "#C87898" : "transparent", borderWidth: 2.5 },
                  ]}
                >
                  <AvatarImage avatarId={c.avatarId} gradient={c.avatarGradient} name={c.name} size={58} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.companionName, { color: selected ? "#C87898" : colors.mutedForeground }]}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

        </Animated.View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 20 : insets.top;
  const scrollRef = useRef<ScrollView>(null);

  const [doneToday, setDoneToday] = useState<Set<ActivityType>>(new Set());
  const [streaks, setStreaks] = useState<Record<ActivityType, number>>(
    {} as Record<ActivityType, number>
  );

  const loadCompletions = useCallback(async () => {
    const today = todayKey();
    const done = new Set<ActivityType>();
    const streakMap: Record<string, number> = {};

    await Promise.all(
      ACTIVITIES.map(async ({ type }) => {
        const doneVal = await AsyncStorage.getItem(`${STORAGE_PREFIX}${type}_${today}`);
        if (doneVal === "1") done.add(type);
        const streakVal = await AsyncStorage.getItem(`halochat_activity_streak_${type}`);
        streakMap[type] = streakVal ? parseInt(streakVal, 10) : 0;
      })
    );

    setDoneToday(done);
    setStreaks(streakMap as Record<ActivityType, number>);
  }, []);

  useEffect(() => { loadCompletions(); }, [loadCompletions]);

  useEffect(() => {
    const interval = setInterval(loadCompletions, 1000);
    return () => clearInterval(interval);
  }, [loadCompletions]);

  const completedCount = doneToday.size;
  const totalCount = ACTIVITIES.length;
  const allDone = completedCount === totalCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 14 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activities</Text>
        <Text style={[styles.headerSub, { color: colors.foreground }]}>
          Daily practices for your wellbeing
        </Text>

        {/* Progress segments */}
        <View style={styles.progressRow}>
          {ACTIVITIES.map((a) => (
            <View
              key={a.type}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: doneToday.has(a.type)
                    ? a.gradient[0]
                    : colors.muted,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.progressLabel, { color: colors.foreground }]}>
          {allDone
            ? "All done for today"
            : `${completedCount} of ${totalCount} completed today`}
        </Text>
      </View>

      {/* ── Cards ── */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood card scrolls with content */}
        <MoodCard
          colors={colors}
          onCanvasInteractionStart={() => scrollRef.current?.setNativeProps({ scrollEnabled: false })}
          onCanvasInteractionEnd={() => scrollRef.current?.setNativeProps({ scrollEnabled: true })}
        />

        {ACTIVITIES.map((activity) => {
          const done = doneToday.has(activity.type);
          const streak = streaks[activity.type] ?? 0;

          return (
            <Pressable
              key={activity.type}
              onPress={() => router.push(`/activity/${activity.type}`)}
              style={({ pressed }) => [
                styles.cardWrap,
                { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.988 : 1 }] },
              ]}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: done
                      ? "rgba(100,180,140,0.28)"
                      : `${activity.gradient[0]}28`,
                  },
                ]}
              >
                {/* Subtle category tint overlay */}
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: done
                        ? "rgba(80,160,120,0.05)"
                        : `${activity.gradient[0]}07`,
                      borderRadius: 24,
                    },
                  ]}
                />

                {/* Icon square */}
                <LinearGradient
                  colors={done ? DONE_GRADIENT : activity.gradient}
                  style={styles.iconSquare}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                >
                  {/* Specular shimmer */}
                  <View style={styles.iconShimmer} />
                  <Ionicons
                    name={done ? "checkmark" : activity.icon}
                    size={28}
                    color="#FFFFFF"
                  />
                </LinearGradient>

                {/* Content */}
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    {activity.title}
                  </Text>
                  <Text
                    style={[styles.cardSub, { color: colors.mutedForeground }]}
                    numberOfLines={2}
                  >
                    {activity.subtitle}
                  </Text>

                  <View style={styles.metaRow}>
                    {/* Duration chip */}
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: `${activity.gradient[0]}18` },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={10}
                        color={activity.accentColor}
                      />
                      <Text style={[styles.chipText, { color: activity.accentColor }]}>
                        {activity.duration}
                      </Text>
                    </View>

                    {/* Streak chip */}
                    {streak > 0 && (
                      <View
                        style={[
                          styles.chip,
                          { backgroundColor: "rgba(196,120,32,0.12)" },
                        ]}
                      >
                        <Ionicons name="flame-outline" size={10} color="#B87020" />
                        <Text style={[styles.chipText, { color: "#B87020" }]}>
                          {streak}d streak
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right indicator */}
                {done ? (
                  <Ionicons name="checkmark-circle" size={22} color="#72B894" />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={`${activity.gradient[0]}90`}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
  },

  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },

  moodCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  moodShareHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  moodShareTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  moodSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  companionRow: {
    gap: 16,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  companionItem: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  companionRing: {
    borderRadius: 35,
    padding: 2,
  },
  companionName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    width: 68,
  },
  emptyCompanions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  emptyCompanionsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  // Sent state
  sentQuoteBlock: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: "center",
  },
  sentQuoteText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular_Italic",
    lineHeight: 26,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  sentFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  sentMoodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  sentMoodLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  sentEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  cardWrap: {},

  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    overflow: "hidden",
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  iconSquare: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  iconShimmer: {
    position: "absolute",
    top: 5,
    left: 6,
    width: 28,
    height: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.30)",
    transform: [{ rotate: "-15deg" }],
  },

  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  cardSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
