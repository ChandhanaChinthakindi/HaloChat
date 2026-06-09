import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/AvatarImage";
import { useCompanions } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    prefix: "[STRENGTH]",
    label: "Strengths",
    sub: "Courage and growth moments",
    icon: "flash-outline" as const,
    color: "#C77E11",          // amber-600 — readable on light bg
    orbGradient: ["#FFFBEB", "#FEF3C7"] as [string, string],  // pastel amber glass
    gradient: ["#FDE68A", "#F59E0B"] as [string, string],     // sheet accent
  },
  {
    prefix: "[FACT]",
    label: "Personal Facts",
    sub: "Concrete details about you",
    icon: "person-outline" as const,
    color: "#7C3AED",          // violet-600
    orbGradient: ["#F5F3FF", "#EDE9FE"] as [string, string],  // pastel violet glass
    gradient: ["#C7D2FE", "#7C3AED"] as [string, string],
  },
  {
    prefix: "[EMOTION]",
    label: "Patterns",
    sub: "How you feel about things",
    icon: "heart-outline" as const,
    color: "#C2185B",          // pink-700
    orbGradient: ["#FDF2F8", "#FCE4F0"] as [string, string],  // pastel rose glass
    gradient: ["#FBCFE8", "#C2185B"] as [string, string],
  },
  {
    prefix: "[TOPIC]",
    label: "Topics",
    sub: "Things you care about",
    icon: "chatbubble-outline" as const,
    color: "#0369A1",          // sky-700
    orbGradient: ["#F0F9FF", "#E0F2FE"] as [string, string],  // pastel sky glass
    gradient: ["#BAE6FD", "#0369A1"] as [string, string],
  },
  {
    prefix: "[MOMENT]",
    label: "Moments",
    sub: "Experiences you've shared",
    icon: "star-outline" as const,
    color: "#047857",          // emerald-700
    orbGradient: ["#ECFDF5", "#D1FAE5"] as [string, string],  // pastel mint glass
    gradient: ["#A7F3D0", "#047857"] as [string, string],
  },
] as const;

// Offset from orbital center → each orb center (Replika-style scatter)
const ORB_OFFSETS = [
  { dx: 0,    dy: -160 }, // Strengths   → top-center
  { dx: 132,  dy: -42  }, // Facts       → right
  { dx: -138, dy: -28  }, // Patterns    → left
  { dx: -98,  dy: 150  }, // Topics      → bottom-left
  { dx: 108,  dy: 154  }, // Moments     → bottom-right
];

const ORB_W = 88;
const ORB_H = 108;
const SHEET_H = SH * 0.66;

function parseNote(note: string): { categoryPrefix: string; text: string } {
  for (const cat of CATEGORIES) {
    if (note.startsWith(cat.prefix)) {
      return { categoryPrefix: cat.prefix, text: note.slice(cat.prefix.length).trim() };
    }
  }
  return { categoryPrefix: "[FACT]", text: note };
}

// ─── Breathing orb ───────────────────────────────────────────────────────────

function BreathingOrb({
  cat,
  count,
  onPress,
  breathDelay,
  textColor,
}: {
  cat: (typeof CATEGORIES)[number];
  count: number;
  onPress: () => void;
  breathDelay: number;
  textColor: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.07,
          duration: 3200,
          useNativeDriver: true,
          delay: breathDelay,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.93,
          duration: 3200,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orbPressable, { opacity: pressed ? 0.72 : 1 }]}
    >
      <Animated.View style={[styles.orbShadowWrap, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={cat.orbGradient}
          style={[styles.orb, { borderColor: `${cat.color}38` }]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
        >
          {/* top specular highlight */}
          <View style={styles.orbShimmer} />
          {/* bottom edge reflection */}
          <View style={styles.orbReflection} />
          <Ionicons name={cat.icon} size={26} color={cat.color} />
          {count > 0 && (
            <View style={[styles.orbBadge, { borderColor: `${cat.color}40` }]}>
              <Text style={[styles.orbBadgeText, { color: cat.color }]}>{count}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.orbLabel, { color: textColor }]}>{cat.label}</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, addMemoryNote, removeMemoryNote } = useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [selectedCat, setSelectedCat] = useState<(typeof CATEGORIES)[number] | null>(null);
  const [newNote, setNewNote] = useState("");
  const [canvasDims, setCanvasDims] = useState({ w: SW, h: 500 });

  const sheetAnim = useRef(new Animated.Value(SHEET_H)).current;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const openSheet = (cat: (typeof CATEGORIES)[number]) => {
    setSelectedCat(cat);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 78,
      friction: 12,
    }).start();
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    Animated.spring(sheetAnim, {
      toValue: SHEET_H,
      useNativeDriver: true,
      tension: 78,
      friction: 12,
    }).start(() => {
      setSelectedCat(null);
      setNewNote("");
    });
  };

  const categorized = useMemo(() => {
    if (!companion) return {} as Record<string, Array<{ text: string; originalIndex: number }>>;
    const map: Record<string, Array<{ text: string; originalIndex: number }>> = {};
    for (const cat of CATEGORIES) map[cat.prefix] = [];
    companion.memoryNotes.forEach((note, originalIndex) => {
      const { categoryPrefix, text } = parseNote(note);
      map[categoryPrefix]?.push({ text, originalIndex });
    });
    return map;
  }, [companion?.memoryNotes]);

  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Companion not found</Text>
      </View>
    );
  }

  const totalCount = companion.memoryNotes.length;

  const handleAddNote = async () => {
    const prefix = selectedCat?.prefix ?? "[FACT]";
    const trimmed = newNote.trim();
    if (!trimmed) return;
    await addMemoryNote(companion.id, `${prefix} ${trimmed}`);
    setNewNote("");
    hapticsNotification();
  };

  const handleDelete = (originalIndex: number, text: string) => {
    Alert.alert("Remove Memory", `Remove this memory?\n\n"${text}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
          removeMemoryNote(companion.id, originalIndex);
        },
      },
    ]);
  };

  // Orbital canvas center
  const cx = canvasDims.w / 2;
  const cy = canvasDims.h * 0.44;

  const catEntries = selectedCat ? (categorized[selectedCat.prefix] ?? []) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating back button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: topPadding + 8 }]}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.85)" }]} />
        )}
        <Ionicons name="chevron-back" size={22} color={colors.foreground} />
      </Pressable>

      {/* Title area */}
      <View style={[styles.titleArea, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {companion.name} holds{"\n"}your whole story.
        </Text>
        <Text style={[styles.titleSub, { color: colors.mutedForeground }]}>
          Chat naturally — memories build themselves
        </Text>
      </View>

      {/* Orbital canvas */}
      <View
        style={styles.canvas}
        onLayout={(e) =>
          setCanvasDims({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {/* Center: companion avatar or gradient fallback */}
        <View style={[styles.centerCircleWrap, { left: cx - 32, top: cy - 32 }]}>
          <AvatarImage
            avatarId={companion.avatarId}
            gradient={companion.avatarGradient}
            name={companion.name}
            size={64}
          />
        </View>

        {/* Center: name + count */}
        <View style={[styles.centerLabel, { left: cx - 60, top: cy + 40 }]}>
          <Text style={[styles.centerName, { color: colors.foreground }]}>{companion.name}</Text>
          <Text style={[styles.centerCount, { color: colors.mutedForeground }]}>
            {totalCount} {totalCount === 1 ? "memory" : "memories"}
          </Text>
        </View>

        {/* Category orbs */}
        {CATEGORIES.map((cat, i) => {
          const { dx, dy } = ORB_OFFSETS[i];
          const count = (categorized[cat.prefix] ?? []).length;
          return (
            <View
              key={cat.prefix}
              style={[
                styles.orbAnchor,
                { left: cx + dx - ORB_W / 2, top: cy + dy - ORB_H / 2 },
              ]}
            >
              <BreathingOrb
                cat={cat}
                count={count}
                onPress={() => openSheet(cat)}
                breathDelay={i * 650}
                textColor={colors.foreground}
              />
            </View>
          );
        })}
      </View>

      {/* Bottom sheet — slides up on orb tap */}
      {selectedCat !== null && (
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: bottomPadding + 8, transform: [{ translateY: sheetAnim }] },
          ]}
        >
          {/* Glass backing */}
          {Platform.OS === "ios" ? (
            <BlurView intensity={96} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,250,245,0.97)" }]}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor:
                  Platform.OS === "ios" ? "rgba(255,248,240,0.52)" : "transparent",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              },
            ]}
          />

          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <View
              style={[
                styles.sheetIconCircle,
                { backgroundColor: `${selectedCat.color}1C` },
              ]}
            >
              <Ionicons name={selectedCat.icon} size={18} color={selectedCat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {selectedCat.label}
              </Text>
              <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                {selectedCat.sub} · {catEntries.length}{" "}
                {catEntries.length === 1 ? "memory" : "memories"}
              </Text>
            </View>
            <Pressable
              onPress={closeSheet}
              style={[styles.closeBtn, { backgroundColor: "rgba(0,0,0,0.07)" }]}
            >
              <Ionicons name="close" size={16} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Divider */}
          <View
            style={[styles.sheetDivider, { backgroundColor: `${selectedCat.color}25` }]}
          />

          {/* Memory list */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {catEntries.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <LinearGradient
                  colors={selectedCat.gradient}
                  style={styles.sheetEmptyIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={selectedCat.icon} size={22} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
                <Text style={[styles.sheetEmptyTitle, { color: colors.foreground }]}>
                  Nothing here yet
                </Text>
                <Text style={[styles.sheetEmptyDesc, { color: colors.mutedForeground }]}>
                  Chat naturally and I'll pick up on {selectedCat.label.toLowerCase()} automatically.
                </Text>
              </View>
            ) : (
              catEntries.map(({ text, originalIndex }) => (
                <View
                  key={originalIndex}
                  style={[
                    styles.memItem,
                    {
                      backgroundColor: `${selectedCat.color}0D`,
                      borderColor: `${selectedCat.color}2A`,
                    },
                  ]}
                >
                  <View style={[styles.memDot, { backgroundColor: selectedCat.color }]} />
                  <Text style={[styles.memText, { color: colors.foreground }]}>{text}</Text>
                  <Pressable
                    onPress={() => handleDelete(originalIndex, text)}
                    hitSlop={10}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {/* Add input */}
          <View style={[styles.addRow, { borderTopColor: `${selectedCat.color}22` }]}>
            <TextInput
              style={[
                styles.addInput,
                {
                  color: colors.foreground,
                  backgroundColor: `${selectedCat.color}0C`,
                  borderColor: `${selectedCat.color}35`,
                },
              ]}
              placeholder={`Add to ${selectedCat.label}...`}
              placeholderTextColor={colors.mutedForeground}
              value={newNote}
              onChangeText={setNewNote}
              returnKeyType="done"
              onSubmitEditing={handleAddNote}
              maxLength={200}
            />
            <Pressable
              onPress={handleAddNote}
              disabled={!newNote.trim()}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : newNote.trim() ? 1 : 0.4 }]}
            >
              <LinearGradient
                colors={newNote.trim() ? selectedCat.gradient : ["#E5E5E5", "#D4D4D4"]}
                style={styles.addBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={newNote.trim() ? "#FFFFFF" : "#999999"}
                />
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  titleArea: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    alignItems: "center",
    zIndex: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 6,
  },
  titleSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  canvas: {
    flex: 1,
    position: "relative",
  },

  centerCircleWrap: {
    position: "absolute",
    zIndex: 2,
  },
  centerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  centerInitial: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  centerLabel: {
    position: "absolute",
    width: 120,
    alignItems: "center",
    zIndex: 2,
  },
  centerName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  centerCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 1,
  },

  orbAnchor: {
    position: "absolute",
    zIndex: 3,
  },
  orbPressable: {
    alignItems: "center",
    gap: 7,
  },
  orbShadowWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  orb: {
    width: ORB_W,
    height: ORB_H,
    borderRadius: ORB_W / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orbShimmer: {
    position: "absolute",
    top: 8,
    left: 10,
    width: ORB_W * 0.54,
    height: ORB_H * 0.30,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.72)",
    transform: [{ rotate: "-18deg" }],
  },
  orbReflection: {
    position: "absolute",
    bottom: 11,
    right: 9,
    width: ORB_W * 0.32,
    height: ORB_H * 0.13,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.42)",
    transform: [{ rotate: "-18deg" }],
  },
  orbBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  orbBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  orbLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: ORB_W + 16,
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_H,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    zIndex: 20,
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.14)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  sheetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sheetSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetDivider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 2,
  },

  sheetList: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },

  sheetEmpty: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 10,
    paddingHorizontal: 16,
  },
  sheetEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sheetEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sheetEmptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },

  memItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  memDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  memText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
