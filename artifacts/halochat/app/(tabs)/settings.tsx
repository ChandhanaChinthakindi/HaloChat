import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { useCompanions } from "@/context/CompanionContext";

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  value,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  value?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed && onPress ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: destructive
              ? "rgba(239,68,68,0.12)"
              : colors.muted,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.destructive : colors.primary}
        />
      </View>
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowLabel,
            { color: destructive ? colors.destructive : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions } = useCompanions();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const totalMessages = companions.reduce((s, c) => s + c.messageCount, 0);

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
        <View style={styles.profileCard}>
          <LinearGradient
            colors={["#A855F7", "#EC4899"]}
            style={styles.profileGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Your Account</Text>
              <Text style={styles.profileStats}>
                {companions.length} companion{companions.length !== 1 ? "s" : ""} · {totalMessages} messages
              </Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          AI SETUP
        </Text>

        <SettingRow
          icon="key-outline"
          label="OpenAI API Key"
          subtitle="Required for AI conversations"
          onPress={() =>
            Alert.alert(
              "API Key",
              "Set your OPENAI_API_KEY environment variable in the project to enable AI conversations. The key is used securely on the server.",
              [{ text: "OK" }]
            )
          }
        />
        <SettingRow
          icon="sparkles-outline"
          label="AI Model"
          value="GPT-5"
        />
        <SettingRow
          icon="speedometer-outline"
          label="Response Style"
          subtitle="Streaming enabled for real-time responses"
          value="Streaming"
        />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          ABOUT
        </Text>

        <SettingRow
          icon="information-circle-outline"
          label="Version"
          value="1.0.0"
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacy"
          subtitle="All conversations stored locally on your device"
        />
        <SettingRow
          icon="code-slash-outline"
          label="Open Source"
          subtitle="Built with Expo + OpenAI"
        />

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
  container: {
    flex: 1,
  },
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
  content: {
    padding: 16,
    gap: 8,
  },
  profileCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 8,
  },
  profileGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  profileStats: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
  },
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
  footer: {
    alignItems: "center",
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
