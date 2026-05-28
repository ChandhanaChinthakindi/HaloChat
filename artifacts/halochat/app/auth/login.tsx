import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = identifier.trim().length > 0 && password.length >= 1;

  const handleLogin = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Sign In Failed", e.message || "Please check your credentials and try again.");
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <LinearGradient
              colors={["#818263", "#A3A380"]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={36} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.foreground }]}>HaloChat</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Welcome back</Text>
          </View>

          {/* Form */}
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: password ? "#818263" : colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
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
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push("/auth/forgot-password")}
              hitSlop={8}
              style={({ pressed }) => [styles.forgotLink, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.forgotText, { color: colors.mutedForeground }]}>
                Forgot password?{"  "}
                <Text style={{ color: colors.primary }}>Reset it</Text>
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?{"  "}
            </Text>
            <Pressable onPress={() => router.push("/auth/signup")} hitSlop={8}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 32,
  },
  brand: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 32, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 16, fontFamily: "Inter_400Regular" },
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
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 4,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingTop: 8 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" as const },
  forgotLink: { alignSelf: "center", marginTop: 2 },
  forgotText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
