import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { getAvatarById } from "@/constants/avatars";
import { API_BASE, COMPANION_TRAITS, COMPANION_TYPES, useCompanions } from "@/context/CompanionContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { hapticsNotification } from "@/utils/haptics";

const { width: SW, height: SH } = Dimensions.get("window");
const HERO_H = Math.round(SH * 0.62);

const BOND_STAGES = ["New", "Acquaintance", "Friend", "Close", "Bonded"] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMoodDays(
  logs: { date: string; mood: number }[]
): { label: string; mood: number | null }[] {
  const map = new Map(logs.map((l) => [l.date, l.mood]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { label: DAY_LABELS[d.getDay()], mood: map.get(key) ?? null };
  });
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companions, updateCompanion, deleteCompanion, clearMessages } = useCompanions();
  const { authFetch } = useAuth();

  const companion = companions.find((c) => c.id === id);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPersonality, setEditPersonality] = useState("");
  const [editTraits, setEditTraits] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [moodHistory, setMoodHistory] = useState<{ date: string; mood: number }[]>([]);

  useEffect(() => {
    if (!id) return;
    authFetch(`${API_BASE}/companions/${id}/mood`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMoodHistory(data); })
      .catch(() => {});
  }, [id, authFetch]);

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!companion) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Companion not found</Text>
      </View>
    );
  }

  const typeInfo = COMPANION_TYPES[companion.type] ?? COMPANION_TYPES["supportive"];
  const avatar = getAvatarById(companion.avatarId);
  const rel = companion.relationshipLevel;
  const stageIdx = rel < 20 ? 0 : rel < 40 ? 1 : rel < 60 ? 2 : rel < 80 ? 3 : 4;
  const stageName = BOND_STAGES[stageIdx];
  const ptsToNext = stageIdx < 4 ? (stageIdx + 1) * 20 - rel : 0;

  const handleStartEdit = () => {
    setEditName(companion.name);
    setEditPersonality(companion.customPersonality ?? "");
    setEditTraits([...(companion.traits ?? [])]);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateCompanion(companion.id, {
        name: editName.trim(),
        customPersonality: editPersonality.trim(),
        traits: editTraits,
      });
      hapticsNotification();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert("Clear Conversation", "This will delete all messages with this companion.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => clearMessages(companion.id) },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Companion",
      `Delete ${companion.name}? All conversations and memories will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCompanion(companion.id);
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const memorySummary = (() => {
    if (companion.memoryNotes.length === 0) return "Nothing collected yet";
    const s = companion.memoryNotes.filter(n => n.startsWith("[STRENGTH]")).length;
    const f = companion.memoryNotes.filter(
      n => !n.startsWith("[EMOTION]") && !n.startsWith("[TOPIC]") && !n.startsWith("[MOMENT]") && !n.startsWith("[STRENGTH]")
    ).length;
    const e = companion.memoryNotes.filter(n => n.startsWith("[EMOTION]")).length;
    const parts: string[] = [];
    if (s) parts.push(`${s} strength${s !== 1 ? "s" : ""}`);
    if (f) parts.push(`${f} fact${f !== 1 ? "s" : ""}`);
    if (e) parts.push(`${e} pattern${e !== 1 ? "s" : ""}`);
    return parts.join(" · ") || `${companion.memoryNotes.length} note${companion.memoryNotes.length !== 1 ? "s" : ""}`;
  })();

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">

      {/* Fixed floating nav — stays put as content scrolls */}
      <View style={[styles.floatLeft, { top: topPad + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.floatBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          {Platform.OS === "ios" ? (
            <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
          )}
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.floatRight, { top: topPad + 8 }]}>
        <Pressable
          onPress={handleStartEdit}
          style={({ pressed }) => [styles.floatBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          {Platform.OS === "ios" ? (
            <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
          )}
          <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: botPad + 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── HERO ─── */}
        <View style={styles.hero}>
          {avatar?.source ? (
            <Image
              source={avatar.source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={{ top: 0 }}
            />
          ) : (
            <LinearGradient
              colors={companion.avatarGradient}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
            />
          )}

          {/* Top vignette for button legibility */}
          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "transparent"]}
            style={styles.heroTopVignette}
            pointerEvents="none"
          />

          {/* Bottom scrim into name area */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.72)"]}
            style={styles.heroBottomScrim}
            pointerEvents="none"
          />

          {/* Name + type at bottom */}
          <View style={styles.heroBottom}>
            {/* Type pill */}
            <View style={[styles.heroTypePill, { overflow: "hidden" }]}>
              <LinearGradient
                colors={companion.avatarGradient}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.heroTypeText}>{typeInfo.label}</Text>
            </View>

            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>{companion.name}</Text>
              {(companion.streak ?? 0) > 1 && (
                <View style={styles.heroStreak}>
                  <Text style={styles.heroStreakText}>🔥 {companion.streak}d</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroDesc} numberOfLines={2}>{typeInfo.description}</Text>
          </View>
        </View>

        {/* ─── CONTENT PANEL ─── */}
        <View style={styles.panel}>
          {/* Glass backing */}
          {Platform.OS === "ios" ? (
            <BlurView intensity={92} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,253,248,0.88)" }]} />
          )}
          {/* Warm tint overlay */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "ios" ? "rgba(255,250,242,0.52)" : "transparent" }]} />

          {/* Edit form */}
          {isEditing && (
            <View style={[styles.editWrap, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
              <View style={styles.editHead}>
                <Text style={[styles.editHeadTitle, { color: colors.foreground }]}>Edit Companion</Text>
                <Pressable
                  onPress={() => setIsEditing(false)}
                  hitSlop={12}
                >
                  <Ionicons name="close-circle" size={24} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
              <View
                style={[
                  styles.fieldBox,
                  { borderColor: editName.trim() ? companion.avatarGradient[0] : colors.border, backgroundColor: "rgba(255,250,242,0.65)" },
                ]}
              >
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground }]}
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={30}
                  autoFocus
                  returnKeyType="done"
                  placeholder="Companion name…"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PERSONALITY (OPTIONAL)</Text>
              <View style={[styles.fieldBox, { borderColor: "rgba(180,160,140,0.35)", backgroundColor: "rgba(255,250,242,0.65)" }]}>
                <TextInput
                  style={[styles.fieldInput, styles.fieldMulti, { color: colors.foreground }]}
                  value={editPersonality}
                  onChangeText={setEditPersonality}
                  maxLength={500}
                  multiline
                  textAlignVertical="top"
                  placeholder="Describe your companion's personality…"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{editPersonality.length}/500</Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                TRAITS ({editTraits.length}/3)
              </Text>
              <View style={styles.traitGrid}>
                {(COMPANION_TRAITS[companion.type] ?? []).map((trait) => {
                  const active = editTraits.includes(trait);
                  const disabled = !active && editTraits.length >= 3;
                  return (
                    <Pressable
                      key={trait}
                      onPress={() => {
                        if (disabled) return;
                        setEditTraits((prev) =>
                          prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
                        );
                      }}
                      style={({ pressed }) => [
                        styles.traitChip,
                        {
                          borderColor: active ? companion.avatarGradient[0] : colors.border,
                          overflow: "hidden" as const,
                          opacity: disabled ? 0.38 : pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      {active ? (
                        <LinearGradient
                          colors={companion.avatarGradient}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,250,242,0.65)" }]} />
                      )}
                      <Text style={[styles.traitChipText, { color: active ? "#fff" : colors.foreground }]}>
                        {trait}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.editActions}>
                <Pressable
                  onPress={() => setIsEditing(false)}
                  style={({ pressed }) => [
                    styles.editCancelBtn,
                    { borderColor: "rgba(180,160,140,0.35)", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.editCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={!editName.trim() || isSaving}
                  style={({ pressed }) => [{ flex: 1, opacity: pressed || isSaving ? 0.7 : 1 }]}
                >
                  <LinearGradient
                    colors={companion.avatarGradient}
                    style={styles.editSaveBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.editSaveText}>{isSaving ? "Saving…" : "Save Changes"}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Bond section ── */}
          <View style={[styles.bondSection, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
            <View style={styles.bondHeadRow}>
              <Text style={[styles.bondStage, { color: colors.foreground }]}>{stageName}</Text>
              <Text style={[styles.bondPct, { color: colors.mutedForeground }]}>{rel}%</Text>
            </View>
            <View style={styles.bondSegRow}>
              {BOND_STAGES.map((_, i) => {
                const fill = i < stageIdx ? 1.0 : i === stageIdx ? (rel - stageIdx * 20) / 20 : 0;
                return (
                  <View key={i} style={[styles.bondSeg, { backgroundColor: "rgba(180,160,140,0.22)" }]}>
                    {fill > 0 && (
                      <LinearGradient
                        colors={companion.avatarGradient}
                        style={{
                          position: "absolute",
                          top: 0, left: 0, bottom: 0,
                          width: `${Math.round(fill * 100)}%`,
                        }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            {stageIdx < 4 && (
              <Text style={[styles.bondSub, { color: colors.mutedForeground }]}>
                {ptsToNext} pts to {BOND_STAGES[stageIdx + 1]}
              </Text>
            )}
            {stageIdx === 4 && (
              <Text style={[styles.bondSub, { color: companion.avatarGradient[0] }]}>
                Fully bonded ✦
              </Text>
            )}
          </View>

          {/* ── Stats row ── */}
          <View style={[styles.statsStrip, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {companion.messageCount > 999
                  ? `${(companion.messageCount / 1000).toFixed(1)}k`
                  : companion.messageCount}
              </Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Messages</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: "rgba(180,160,140,0.25)" }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{companion.memoryNotes.length}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Memories</Text>
            </View>
            {(companion.streak ?? 0) > 0 && (
              <>
                <View style={[styles.statDiv, { backgroundColor: "rgba(180,160,140,0.25)" }]} />
                <View style={styles.statCell}>
                  <Text style={[styles.statVal, { color: colors.foreground }]}>{companion.streak}d</Text>
                  <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Streak</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Voice ── */}
          {companion.customVoice && (
            <View style={[styles.listRow, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
              <View style={[styles.listIcon, { backgroundColor: `${companion.avatarGradient[0]}1A` }]}>
                <Ionicons name="volume-medium-outline" size={17} color={companion.avatarGradient[0]} />
              </View>
              <View style={styles.listBody}>
                <Text style={[styles.listSub, { color: colors.mutedForeground }]}>Voice</Text>
                <Text style={[styles.listTitle, { color: colors.foreground }]}>{companion.customVoice}</Text>
              </View>
            </View>
          )}

          {/* ── Traits ── */}
          {companion.traits && companion.traits.length > 0 && (
            <View style={[styles.traitsWrap, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PERSONALITY</Text>
              <View style={styles.traitPillRow}>
                {companion.traits.map((trait) => (
                  <View key={trait} style={[styles.traitPill, { overflow: "hidden" }]}>
                    <LinearGradient
                      colors={[`${companion.avatarGradient[0]}1E`, `${companion.avatarGradient[1]}1E`]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { borderRadius: 20, borderWidth: 1, borderColor: `${companion.avatarGradient[0]}44` },
                      ]}
                    />
                    <Text style={[styles.traitPillText, { color: companion.avatarGradient[0] }]}>{trait}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Memories ── */}
          <Pressable
            onPress={() => router.push(`/memories/${companion.id}`)}
            style={({ pressed }) => [styles.listRow, { borderBottomColor: "rgba(180,160,140,0.25)", opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.listIcon, { backgroundColor: `${companion.avatarGradient[0]}1A` }]}>
              <Ionicons name="sparkles" size={17} color={companion.avatarGradient[0]} />
            </View>
            <View style={styles.listBody}>
              <Text style={[styles.listSub, { color: colors.mutedForeground }]}>Memories</Text>
              <Text style={[styles.listTitle, { color: colors.foreground }]} numberOfLines={1}>
                {memorySummary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
          </Pressable>

          {/* ── Mood this week ── */}
          {moodHistory.length > 0 && (
            <View style={[styles.moodWrap, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MOOD THIS WEEK</Text>
              <View style={styles.moodRow}>
                {buildMoodDays(moodHistory).map(({ label, mood }, i) => (
                  <View key={i} style={styles.moodDay}>
                    <Text style={styles.moodEmoji}>
                      {mood != null ? ["😔", "😕", "😐", "🙂", "😊"][mood - 1] : "·"}
                    </Text>
                    <Text style={[styles.moodLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── CTAs ── */}
          <View style={[styles.ctaRow, { borderBottomColor: "rgba(180,160,140,0.25)" }]}>
            <Pressable
              onPress={() => router.push(`/chat/${companion.id}`)}
              style={({ pressed }) => [styles.ctaChat, { opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={companion.avatarGradient}
                style={styles.ctaChatInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="chatbubble-ellipses" size={17} color="#FFFFFF" />
                <Text style={styles.ctaChatText}>Open Chat</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/call/${companion.id}`)}
              style={({ pressed }) => [
                styles.ctaCall,
                { borderColor: `${companion.avatarGradient[0]}60`, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Ionicons name="call-outline" size={19} color={companion.avatarGradient[0]} />
            </Pressable>
          </View>

          {/* ── Manage ── */}
          <View style={styles.manageWrap}>
            <Text style={[styles.sectionLabel, styles.manageHeader, { color: colors.mutedForeground }]}>
              MANAGE
            </Text>
            <Pressable
              onPress={handleClearChat}
              style={({ pressed }) => [
                styles.listRow,
                { borderBottomColor: "rgba(180,160,140,0.25)", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.listIcon, { backgroundColor: "rgba(180,160,140,0.18)" }]}>
                <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.listTitle, { color: colors.foreground, flex: 1 }]}>Clear Chat History</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.listRow, { borderBottomWidth: 0, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.listIcon, { backgroundColor: "rgba(192,57,43,0.10)" }]}>
                <Ionicons name="person-remove-outline" size={16} color={colors.destructive} />
              </View>
              <Text style={[styles.listTitle, { color: colors.destructive, flex: 1 }]}>Delete Companion</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.destructive} />
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },

  // Floating nav buttons (fixed over scroll)
  floatLeft: { position: "absolute", left: 16, zIndex: 30 },
  floatRight: { position: "absolute", right: 16, zIndex: 30 },
  floatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  hero: {
    width: "100%",
    height: HERO_H,
    overflow: "hidden",
  },
  heroTopVignette: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 110,
  },
  heroBottomScrim: {
    position: "absolute",
    left: 0, right: 0,
    bottom: 0,
    height: HERO_H * 0.52,
  },
  heroBottom: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    gap: 5,
  },
  heroTypePill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  heroTypeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    flex: 1,
    lineHeight: 40,
  },
  heroStreak: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  heroStreakText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  heroDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.60)",
    lineHeight: 18,
  },

  // Panel
  panel: {
    flex: 1,
    overflow: "hidden",
  },

  // Edit form
  editWrap: {
    padding: 20,
    paddingBottom: 24,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  editHeadTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 2,
  },
  fieldBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },
  fieldMulti: {
    minHeight: 74,
    textAlignVertical: "top",
    paddingTop: 12,
    paddingBottom: 12,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: -6,
  },
  traitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  traitChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  traitChipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  editCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  editCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  editSaveBtn: {
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  editSaveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  // Bond
  bondSection: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bondHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  bondStage: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  bondPct: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bondSegRow: { flexDirection: "row", gap: 5, height: 7 },
  bondSeg: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  bondSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statCell: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDiv: { width: StyleSheet.hairlineWidth, height: 30 },

  // Generic list row
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listBody: { flex: 1 },
  listSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 1 },
  listTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Traits
  traitsWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  traitPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  traitPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  traitPillText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Mood
  moodWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moodRow: { flexDirection: "row", justifyContent: "space-between" },
  moodDay: { alignItems: "center", gap: 4 },
  moodEmoji: { fontSize: 20 },
  moodLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },

  // CTAs
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ctaChat: { flex: 1 },
  ctaChatInner: {
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaChatText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  ctaCall: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  // Manage
  manageWrap: { paddingTop: 24, paddingBottom: 8 },
  manageHeader: { paddingHorizontal: 20, marginBottom: 8 },
});
