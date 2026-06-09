import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  value,
  iconGradient,
  children,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  value?: string;
  iconGradient?: [string, string];
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const defaultGradient: [string, string] = [colors.primary, colors.accent];
  const destructiveGradient: [string, string] = ["#EF4444", "#DC2626"];
  const gradient = destructive ? destructiveGradient : (iconGradient ?? defaultGradient);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, opacity: pressed && onPress ? 0.75 : 1 },
      ]}
    >
      <LinearGradient
        colors={gradient}
        style={styles.rowIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
      {children ?? (value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      ) : null)}
    </Pressable>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: any }[] = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions, userName, setUserName } = useCompanions();
  const { themePreference, setThemePreference } = useTheme();
  const { logout, deleteAccount, user } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_PREF_KEY).then((val) => {
      if (val === "0") setNotificationsEnabled(false);
    });
    AsyncStorage.getItem(HAPTICS_PREF_KEY).then((val) => {
      if (val === "0") setHapticsEnabled(false);
    });
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const firstCreated = companions.length > 0 ? Math.min(...companions.map((c) => c.createdAt)) : null;
  const daysTogther = firstCreated ? Math.floor((Date.now() - firstCreated) / 86400000) : 0;

  const handleSaveName = async () => {
    await setUserName(nameInput.trim());
    setEditingName(false);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIFICATIONS_PREF_KEY, value ? "1" : "0");
    if (value) await requestNotificationPermission();
  };

  const handleToggleHaptics = async (value: boolean) => {
    setHapticsEnabled(value);
    await AsyncStorage.setItem(HAPTICS_PREF_KEY, value ? "1" : "0");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
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
            try {
              await deleteAccount();
              router.replace("/auth/login");
            } catch {
              Alert.alert("Error", "Failed to delete account. Please try again.");
            }
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
            Alert.alert("Done", "All data has been cleared. Please restart the app.");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          {/* Gradient header strip */}
          <LinearGradient
            colors={["#9A4B6B", "#D8A48F"]}
            style={styles.profileCardHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <View style={styles.profileTop}>
            <LinearGradient colors={["#818263", "#BB8588"]} style={styles.profileAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.profileInitial}>
                {(userName || user?.name || "?")[0].toUpperCase()}
              </Text>
            </LinearGradient>

            <View style={styles.profileInfo}>
              {editingName ? (
                <TextInput
                  style={[styles.profileNameInput, { color: colors.foreground, borderBottomColor: colors.border }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  placeholder="Your name..."
                  placeholderTextColor={colors.mutedForeground}
                />
              ) : (
                <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
                  {userName || user?.name || "Your Account"}
                </Text>
              )}
            </View>

            <Pressable
              onPress={editingName ? handleSaveName : () => { setNameInput(userName); setEditingName(true); }}
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              {editingName ? (
                <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
              ) : (
                <View style={[styles.editIconWrap, { backgroundColor: colors.muted }]}>
                  <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                </View>
              )}
            </Pressable>
          </View>

          <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />

          <View style={styles.profileDetails}>
            {user?.email && (
              <View style={styles.profileDetailRow}>
                <Ionicons name="mail-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.profileDetailText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            )}
            <View style={styles.profileDetailRow}>
              <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.profileDetailText, { color: colors.mutedForeground }]}>
                {companions.length} companion{companions.length !== 1 ? "s" : ""} · {daysTogther === 0 ? "day 1" : `${daysTogther} day${daysTogther !== 1 ? "s" : ""} together`}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          APPEARANCE
        </Text>
        <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {THEME_OPTIONS.map((opt) => {
            const active = themePreference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setThemePreference(opt.value)}
                style={[
                  styles.themeOption,
                  active && { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={active ? "#FFFFFF" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.themeLabel,
                    { color: active ? "#FFFFFF" : colors.mutedForeground },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          PREFERENCES
        </Text>
        <SettingRow
          icon="notifications-outline"
          label="Check-in Notifications"
          subtitle="Get notified when your companion misses you"
          iconGradient={["#F59E0B", "#EF4444"]}
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
          subtitle="Vibrations for interactions and responses"
          iconGradient={["#6366F1", "#8B5CF6"]}
        >
          <Switch
            value={hapticsEnabled}
            onValueChange={handleToggleHaptics}
            trackColor={{ false: colors.muted, true: `${colors.primary}55` }}
            thumbColor={hapticsEnabled ? colors.primary : colors.mutedForeground}
          />
        </SettingRow>

        {/* AI */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          AI
        </Text>
        <SettingRow
          icon="sparkles-outline"
          label="AI Model"
          subtitle="Powered by OpenAI"
          value="GPT-4o mini"
          iconGradient={["#7C3AED", "#EC4899"]}
        />

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          ABOUT
        </Text>
        <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" iconGradient={["#818263", "#A3A380"]} />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacy"
          subtitle="Your data is stored securely on our servers"
          iconGradient={["#10B981", "#059669"]}
          onPress={() =>
            Alert.alert(
              "Privacy",
              "Your conversations and companion data are stored securely on our servers and are only accessible to your account. Messages are sent to OpenAI to generate responses and are subject to OpenAI's privacy policy.",
              [{ text: "OK" }]
            )
          }
        />

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          ACCOUNT
        </Text>
        <SettingRow
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleSignOut}
        />
        <SettingRow
          icon="person-remove-outline"
          label="Delete Account"
          subtitle="Permanently delete your account and all data"
          onPress={handleDeleteAccount}
          destructive
        />

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          DATA
        </Text>
        <SettingRow
          icon="trash-outline"
          label="Clear All Data"
          subtitle="Delete all companions and conversations"
          onPress={handleClearAll}
          destructive
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            HaloChat — Your AI Companion
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  content: { padding: 16, gap: 8 },
  profileCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 8,
    // No border, just shadow
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  profileCardHeader: {
    height: 56,
    width: "100%",
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginTop: -28, // Pull up to overlap the gradient header
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  profileInfo: { flex: 1 },
  profileNameInput: {
    fontSize: 17,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    paddingVertical: 0,
    borderBottomWidth: 1,
    paddingBottom: 2,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  editIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  profileDetails: { gap: 6 },
  profileDetailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileDetailText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 18,
    // Shadow instead of border
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: "500" as const,
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
  themeRow: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 6,
    gap: 4,
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 13,
  },
  themeLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  footer: { alignItems: "center", paddingTop: 16 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
