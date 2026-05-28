import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
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

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const confirmRef = useRef<TextInput>(null);

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColors = ["#ccc", "#FF6B6B", "#FFA94D", "#51CF66"];
  const strengthLabels = ["", "Too short", "Fair", "Strong"];

  const canSubmit = password.length >= 8 && password === confirm && !!token;

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;
    if (!token) {
      Alert.alert("Invalid Link", "This reset link is missing a token. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Reset Failed", data.error || "Unable to reset password. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      Alert.alert("Error", "Could not reset password. Please check your connection and try again.");
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
          {!done && (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
          )}

          {done ? (
            // ── Success state ──────────────────────────────────────────────
            <View style={styles.successCard}>
              <LinearGradient
                colors={["#818263", "#BB8588"]}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={36} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.title, { color: colors.foreground }]}>Password updated!</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Your password has been reset successfully. You can now sign in with your new password.
              </Text>
              <Pressable
                onPress={() => router.replace("/auth/login")}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.fullWidth]}
              >
                <LinearGradient
                  colors={["#818263", "#BB8588"]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            // ── Form state ─────────────────────────────────────────────────
            <>
              <View style={styles.header}>
                <LinearGradient
                  colors={["#818263", "#BB8588"]}
                  style={styles.iconCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="lock-closed-outline" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.title, { color: colors.foreground }]}>New password</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Choose a strong password for your account.
                </Text>
              </View>

              <View style={styles.form}>
                {/* Password */}
                <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: password ? "#818263" : colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="New password"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[1, 2, 3].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: passwordStrength >= level ? strengthColors[passwordStrength] : colors.border },
                        ]}
                      />
                    ))}
                    <Text style={[styles.strengthLabel, { color: strengthColors[passwordStrength] }]}>
                      {strengthLabels[passwordStrength]}
                    </Text>
                  </View>
                )}

                {/* Confirm */}
                <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: confirm ? (confirm === password ? "#51CF66" : "#FF6B6B") : colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    ref={confirmRef}
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.mutedForeground}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  {confirm.length > 0 && (
                    <Ionicons
                      name={confirm === password ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={confirm === password ? "#51CF66" : "#FF6B6B"}
                    />
                  )}
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || isLoading}
                  style={({ pressed }) => [{ opacity: pressed || !canSubmit ? 0.65 : 1 }]}
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
                        <Text style={styles.buttonText}>Reset Password</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
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
  eyeBtn: { padding: 2 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontFamily: "Inter_400Regular", width: 60, textAlign: "right" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  fullWidth: { width: "100%", marginTop: 8 },
});
