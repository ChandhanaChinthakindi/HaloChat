import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { API_BASE } from "@/utils/api";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = identifier.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });
      // Always show success — never reveal whether email exists
      setSent(true);
    } catch {
      Alert.alert("Error", "Could not send reset email. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.muted]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.inner}>
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          {sent ? (
            // ── Success state ──────────────────────────────────────────────
            <View style={styles.successCard}>
              <LinearGradient
                colors={["#818263", "#BB8588"]}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="mail-open-outline" size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.title, { color: colors.foreground }]}>Check your inbox</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                If <Text style={{ color: colors.foreground }}>{identifier.trim()}</Text>{" is linked to an account, you'll receive a reset link within a minute."}
              </Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {"Check your spam folder if you don't see it."}
              </Text>
              <Pressable
                onPress={() => router.replace("/auth/login")}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.backToLoginBtn]}
              >
                <LinearGradient
                  colors={["#818263", "#BB8588"]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>Back to Sign In</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            // ── Form state ─────────────────────────────────────────────────
            <>
              <View style={styles.header}>
                <LinearGradient
                  colors={["#818263", "#A3A380"]}
                  style={styles.iconCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="lock-open-outline" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.title, { color: colors.foreground }]}>Forgot password?</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {"Enter your email or username and we'll send you a link to reset your password."}
                </Text>
              </View>

              <View style={styles.form}>
                <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: identifier ? "#818263" : colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Email or username"
                    placeholderTextColor={colors.mutedForeground}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={!identifier.trim() || isLoading}
                  style={({ pressed }) => [{ opacity: pressed || !identifier.trim() ? 0.65 : 1 }]}
                >
                  <LinearGradient
                    colors={["#818263", "#BB8588"]}
                    style={styles.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Send Reset Link</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={({ pressed }) => [styles.footerLink, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                  Remembered your password?{"  "}
                  <Text style={{ color: colors.primary }}>Sign In</Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 32,
  },
  backBtn: { alignSelf: "flex-start", padding: 4 },
  header: { alignItems: "center", gap: 12, paddingTop: 12 },
  successCard: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 8 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  backToLoginBtn: { width: "100%", marginTop: 8 },
  footerLink: { alignSelf: "center" },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
