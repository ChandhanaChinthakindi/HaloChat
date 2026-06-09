import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useCompanions } from "@/context/CompanionContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { NOTIFICATIONS_PREF_KEY, requestNotificationPermission } from "@/utils/notifications";
import { HAPTICS_PREF_KEY } from "@/utils/haptics";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: any }[] = [
  { value: "light",  label: "Light", icon: "sunny-outline"          },
  { value: "dark",   label: "Dark",  icon: "moon-outline"           },
  { value: "system", label: "Auto",  icon: "phone-portrait-outline" },
];

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: string | number; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── ThemePreviewCard ─────────────────────────────────────────────────────────

function ThemePreviewCard({
  option,
  active,
  onPress,
}: {
  option: (typeof THEME_OPTIONS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  const renderPreview = () => {
    if (option.value === "system") {
      return (
        <LinearGradient
          colors={["#FFFDF8", "#3B2A25"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.themePreview}
        >
          <View style={[styles.themePreviewCard, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
            <View style={[styles.themePreviewLine, { backgroundColor: "rgba(255,255,255,0.7)" }]} />
            <View style={[styles.themePreviewLine, { backgroundColor: "rgba(255,255,255,0.4)", width: "55%" }]} />
          </View>
        </LinearGradient>
      );
    }
    const isLight = option.value === "light";
    const bg   = isLight ? "#FFFDF8" : "#3B2A25";
    const card = isLight ? "#F6EAD4" : "#4E3830";
    const line = isLight ? "#2A2416" : "#F2E6D9";
    const sub  = isLight ? "#DCD4C1" : "#6B4E43";
    return (
      <View style={[styles.themePreview, { backgroundColor: bg }]}>
        <View style={[styles.themePreviewCard, { backgroundColor: card }]}>
          <View style={[styles.themePreviewLine, { backgroundColor: line }]} />
          <View style={[styles.themePreviewLine, { backgroundColor: sub, width: "55%" }]} />
        </View>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeCard,
        {
          backgroundColor: colors.card,
          borderColor: active ? colors.primary : colors.border,
          borderWidth: active ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      {renderPreview()}
      <View style={styles.themeCardBottom}>
        <Ionicons name={option.icon} size={13} color={active ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.themeCardLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
          {option.label}
        </Text>
      </View>
      {active && (
        <View style={[styles.themeCardBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={9} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  value,
  iconGradient,
  hideCaret,
  children,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  value?: string;
  iconGradient?: [string, string];
  hideCaret?: boolean;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const gradient: [string, string] =
    iconGradient ?? (destructive
      ? ["#C04040", "#962828"]
      : [colors.primary, colors.accent]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed && onPress ? 0.7 : 1 }]}
    >
      <LinearGradient colors={gradient} style={styles.rowIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={icon} size={17} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        )}
      </View>
      {children ?? (
        value
          ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
          : !hideCaret && onPress
            ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            : null
      )}
    </Pressable>
  );
}

// ─── SettingGroup ─────────────────────────────────────────────────────────────
// Shadow on outer wrapper; overflow:hidden on inner so press states clip cleanly

function SettingGroup({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.groupShadow}>
      <View style={[styles.groupInner, { backgroundColor: colors.card }]}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && <View style={[styles.groupDivider, { backgroundColor: colors.border }]} />}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions, userName, setUserName } = useCompanions();
  const { themePreference, setThemePreference } = useTheme();
  const { logout, deleteAccount, user } = useAuth();
  const [editingName, setEditingName]           = useState(false);
  const [nameInput, setNameInput]               = useState(userName);
  const [notificationsEnabled, setNotifications] = useState(true);
  const [hapticsEnabled, setHaptics]            = useState(true);
  const [dangerOpen, setDangerOpen]             = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_PREF_KEY).then((v) => {
      if (v === "0") setNotifications(false);
    });
    AsyncStorage.getItem(HAPTICS_PREF_KEY).then((v) => {
      if (v === "0") setHaptics(false);
    });
  }, []);

  const topPadding    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const firstCreated  = companions.length > 0 ? Math.min(...companions.map((c) => c.createdAt)) : null;
  const daysTogether  = firstCreated ? Math.floor((Date.now() - firstCreated) / 86400000) : 0;
  const totalMemories = companions.reduce((s, c) => s + c.memoryNotes.length, 0);
  const bestStreak    = companions.length > 0 ? Math.max(...companions.map((c) => c.streak)) : 0;

  const handleSaveName = async () => {
    await setUserName(nameInput.trim());
    setEditingName(false);
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotifications(val);
    await AsyncStorage.setItem(NOTIFICATIONS_PREF_KEY, val ? "1" : "0");
    if (val) await requestNotificationPermission();
  };

  const handleToggleHaptics = async (val: boolean) => {
    setHaptics(val);
    await AsyncStorage.setItem(HAPTICS_PREF_KEY, val ? "1" : "0");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => { await logout(); router.replace("/auth/login"); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try { await deleteAccount(); router.replace("/auth/login"); }
            catch { Alert.alert("Error", "Failed to delete account. Please try again."); }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all companions and conversations. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert("Done", "All data cleared. Please restart the app.");
          },
        },
      ]
    );
  };

  const toggleDanger = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDangerOpen((v) => !v);
  };

  const memberText =
    daysTogether === 0
      ? "Day 1 with HaloChat"
      : daysTogether < 30
        ? `${daysTogether} day${daysTogether !== 1 ? "s" : ""} with HaloChat`
        : daysTogether < 365
          ? `${Math.floor(daysTogether / 30)} month${Math.floor(daysTogether / 30) !== 1 ? "s" : ""} with HaloChat`
          : `${Math.floor(daysTogether / 365)} year${Math.floor(daysTogether / 365) !== 1 ? "s" : ""} with HaloChat`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 12, paddingBottom: bottomPadding + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Hero ──────────────────────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          {/* Banner */}
          <View style={styles.profileBannerWrap}>
            <LinearGradient
              colors={["#9A4B6B", "#C4786A", "#D8A48F"]}
              style={styles.profileBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Fade banner into card background */}
            <LinearGradient
              colors={[`${colors.card}00`, colors.card]}
              style={styles.profileBannerFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>

          {/* Centered identity block */}
          <View style={styles.profileIdentity}>
            {/* Avatar */}
            <LinearGradient
              colors={["#818263", "#BB8588"]}
              style={styles.profileAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.profileInitial}>
                {(userName || user?.name || "?")[0].toUpperCase()}
              </Text>
            </LinearGradient>

            {editingName ? (
              /* ── Edit state ── */
              <>
                <TextInput
                  style={[
                    styles.profileNameInput,
                    { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.primary },
                  ]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  placeholder="Your name…"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="center"
                />
                <View style={styles.editActions}>
                  <Pressable
                    onPress={() => setEditingName(false)}
                    style={({ pressed }) => [
                      styles.editCancelBtn,
                      { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.editCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveName}
                    style={({ pressed }) => [
                      styles.editSaveBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                    ]}
                  >
                    <Text style={styles.editSaveText}>Save</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              /* ── View state ── */
              <>
                <Pressable
                  onPress={() => { setNameInput(userName); setEditingName(true); }}
                  style={({ pressed }) => [styles.profileNameRow, { opacity: pressed ? 0.7 : 1 }]}
                  hitSlop={8}
                >
                  <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
                    {userName || user?.name || "Your Account"}
                  </Text>
                  <View style={[styles.editIconWrap, { backgroundColor: colors.muted }]}>
                    <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                  </View>
                </Pressable>

                {user?.email && (
                  <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                )}

                <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>
                  {memberText}
                </Text>
              </>
            )}
          </View>

          {/* Stats strip */}
          <View style={[styles.statsStrip, { borderTopColor: colors.border }]}>
            <StatCell value={companions.length} label="companions" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatCell value={totalMemories} label="memories" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatCell value={bestStreak > 0 ? `${bestStreak}d` : "—"} label="best streak" />
          </View>
        </View>

        {/* ── Appearance ────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={styles.themeCards}>
          {THEME_OPTIONS.map((opt) => (
            <ThemePreviewCard
              key={opt.value}
              option={opt}
              active={themePreference === opt.value}
              onPress={() => setThemePreference(opt.value)}
            />
          ))}
        </View>

        {/* ── Preferences ───────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <SettingGroup>
          <SettingRow
            icon="notifications-outline"
            label="Check-in Notifications"
            subtitle="Hear from your companion when you're away"
            iconGradient={["#C9856A", "#D8A070"]}
            hideCaret
          >
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.muted, true: `${colors.primary}55` }}
              thumbColor={notificationsEnabled ? colors.primary : colors.mutedForeground}
            />
          </SettingRow>
          <SettingRow
            icon="phone-portrait-outline"
            label="Haptic Feedback"
            subtitle="Feel every interaction"
            iconGradient={["#7A8860", "#9A9872"]}
            hideCaret
          >
            <Switch
              value={hapticsEnabled}
              onValueChange={handleToggleHaptics}
              trackColor={{ false: colors.muted, true: `${colors.primary}55` }}
              thumbColor={hapticsEnabled ? colors.primary : colors.mutedForeground}
            />
          </SettingRow>
        </SettingGroup>

        {/* ── Account ───────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <SettingGroup>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            iconGradient={["#8A7A68", "#A49080"]}
          />
        </SettingGroup>

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <Pressable
          onPress={toggleDanger}
          style={({ pressed }) => [
            styles.dangerToggle,
            {
              backgroundColor: dangerOpen ? `${colors.destructive}0C` : colors.card,
              borderColor: dangerOpen ? `${colors.destructive}35` : colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.dangerToggleLeft}>
            <View style={[styles.dangerIconWrap, { backgroundColor: dangerOpen ? `${colors.destructive}18` : colors.muted }]}>
              <Ionicons
                name="warning-outline"
                size={16}
                color={dangerOpen ? colors.destructive : colors.mutedForeground}
              />
            </View>
            <Text style={[styles.dangerToggleLabel, { color: dangerOpen ? colors.destructive : colors.mutedForeground }]}>
              Danger Zone
            </Text>
          </View>
          <Ionicons
            name={dangerOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={dangerOpen ? colors.destructive : colors.mutedForeground}
          />
        </Pressable>

        {dangerOpen && (
          <View style={[styles.dangerBody, { backgroundColor: `${colors.destructive}07`, borderColor: `${colors.destructive}28` }]}>
            <SettingRow
              icon="person-remove-outline"
              label="Delete Account"
              subtitle="Permanently deletes your account and all data"
              onPress={handleDeleteAccount}
              destructive
            />
            <View style={[styles.dangerBodyDivider, { backgroundColor: `${colors.destructive}20` }]} />
            <SettingRow
              icon="trash-outline"
              label="Clear All Data"
              subtitle="Deletes all companions and conversations"
              onPress={handleClearAll}
              destructive
            />
          </View>
        )}

        {/* ── Footer ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            HaloChat · v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: { padding: 16, gap: 8 },

  // ── Profile card ────────────────────────────────────────────────────────────
  profileCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 4,
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  profileBannerWrap: {
    position: "relative",
  },
  profileBanner: { height: 104 },
  profileBannerFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  profileIdentity: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 18,
    marginTop: -44,
    gap: 4,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginBottom: 4,
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  profileMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  profileNameInput: {
    fontSize: 19,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
    minWidth: 180,
    textAlign: "center",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  editCancelBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editSaveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 22,
  },
  editCancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  editSaveText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: "#FFFFFF",
  },
  editIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Stats strip ─────────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
  },

  // ── Theme cards ─────────────────────────────────────────────────────────────
  themeCards: {
    flexDirection: "row",
    gap: 10,
  },
  themeCard: {
    flex: 1,
    borderRadius: 16,
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  themePreview: {
    height: 76,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  themePreviewCard: {
    borderRadius: 6,
    padding: 7,
    gap: 5,
  },
  themePreviewLine: {
    height: 4,
    borderRadius: 2,
    width: "100%",
  },
  themeCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  themeCardLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  themeCardBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── SettingGroup ─────────────────────────────────────────────────────────────
  groupShadow: {
    borderRadius: 18,
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  groupInner: {
    borderRadius: 18,
    overflow: "hidden",
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },

  // ── SettingRow ───────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  // ── Danger zone ──────────────────────────────────────────────────────────────
  dangerToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dangerToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dangerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerToggleLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  dangerBody: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginTop: 6,
  },
  dangerBodyDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: { alignItems: "center", paddingTop: 20 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
