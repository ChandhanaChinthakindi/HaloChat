import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
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
import { calcAge } from "@/utils/chatUtils";

const GENDER_OPTIONS = [
  { value: "female" as const, label: "Female", icon: "♀" },
  { value: "male" as const, label: "Male", icon: "♂" },
  { value: "nonbinary" as const, label: "Non-binary", icon: "⚧" },
];

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<"female" | "male" | "nonbinary" | null>(null);
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const dobFull =
    dobDay.length === 2 && dobMonth.length === 2 && dobYear.length === 4
      ? `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
      : null;
  const dobDate = dobFull ? new Date(dobFull) : null;
  const isDobValid = dobDate !== null && !isNaN(dobDate.getTime());
  const userAge = isDobValid && dobFull ? calcAge(dobFull) : null;
  const isValidAge = userAge !== null && userAge >= 17;
  const showAgeError = isDobValid && userAge !== null && userAge < 17;

  const pwRules = [
    { key: "len",     label: "At least 8 characters",      ok: password.length >= 8 },
    { key: "upper",   label: "One uppercase letter",        ok: /[A-Z]/.test(password) },
    { key: "lower",   label: "One lowercase letter",        ok: /[a-z]/.test(password) },
    { key: "num",     label: "One number",                  ok: /[0-9]/.test(password) },
    { key: "special", label: "One special character",       ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const pwAllValid = password.length > 0 && pwRules.every((r) => r.ok);

  const canSubmit =
    email.trim().length > 0 &&
    pwAllValid &&
    password === confirmPassword &&
    gender !== null &&
    isValidAge;

  const handleSignup = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    try {
      const dateOfBirth = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;
      await signup(email.trim(), password, "", gender!, dateOfBirth);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Sign Up Failed", e.message || "Please try again.");
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
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          {/* Brand */}
          <View style={styles.brand}>
            <LinearGradient
              colors={["#818263", "#A3A380"]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-add" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.foreground }]}>Create account</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Join HaloChat and meet your companions
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: email ? "#818263" : colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View>
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
              {password.length > 0 && (
                <View style={styles.pwChecklist}>
                  {pwRules.map((rule) => (
                    <View key={rule.key} style={styles.pwRuleRow}>
                      <Ionicons
                        name={rule.ok ? "checkmark-circle" : "ellipse-outline"}
                        size={14}
                        color={rule.ok ? "#22C55E" : colors.mutedForeground}
                      />
                      <Text style={[styles.pwRuleText, { color: rule.ok ? "#22C55E" : colors.mutedForeground }]}>
                        {rule.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[
              styles.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: confirmPassword
                  ? confirmPassword === password ? "#22C55E" : "#EF4444"
                  : colors.border,
              },
            ]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                ref={confirmRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((opt) => {
                  const selected = gender === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setGender(opt.value)}
                      style={({ pressed }) => [
                        styles.genderChip,
                        {
                          backgroundColor: selected ? "#818263" : colors.card,
                          borderColor: selected ? "#818263" : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.genderIcon, { color: selected ? "#FFFFFF" : colors.mutedForeground }]}>
                        {opt.icon}
                      </Text>
                      <Text style={[styles.genderLabel, { color: selected ? "#FFFFFF" : colors.foreground }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date of Birth</Text>
              <View style={styles.dobRow}>
                <View style={[styles.dobField, { backgroundColor: colors.card, borderColor: dobDay ? "#818263" : colors.border }]}>
                  <TextInput
                    style={[styles.dobInput, { color: colors.foreground }]}
                    placeholder="DD"
                    placeholderTextColor={colors.mutedForeground}
                    value={dobDay}
                    onChangeText={(t) => {
                      const val = t.replace(/\D/g, "").slice(0, 2);
                      setDobDay(val);
                      if (val.length === 2) monthRef.current?.focus();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
                <Text style={[styles.dobSep, { color: colors.mutedForeground }]}>/</Text>
                <View style={[styles.dobField, { backgroundColor: colors.card, borderColor: dobMonth ? "#818263" : colors.border }]}>
                  <TextInput
                    ref={monthRef}
                    style={[styles.dobInput, { color: colors.foreground }]}
                    placeholder="MM"
                    placeholderTextColor={colors.mutedForeground}
                    value={dobMonth}
                    onChangeText={(t) => {
                      const val = t.replace(/\D/g, "").slice(0, 2);
                      setDobMonth(val);
                      if (val.length === 2) yearRef.current?.focus();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
                <Text style={[styles.dobSep, { color: colors.mutedForeground }]}>/</Text>
                <View style={[styles.dobFieldYear, { backgroundColor: colors.card, borderColor: dobYear ? "#818263" : colors.border }]}>
                  <TextInput
                    ref={yearRef}
                    style={[styles.dobInput, { color: colors.foreground }]}
                    placeholder="YYYY"
                    placeholderTextColor={colors.mutedForeground}
                    value={dobYear}
                    onChangeText={(t) => {
                      const val = t.replace(/\D/g, "").slice(0, 4);
                      setDobYear(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                </View>
              </View>
              {showAgeError && (
                <Text style={[styles.fieldError, { color: "#EF4444" }]}>
                  You must be at least 17 years old to create an account.
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleSignup}
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
                    <Text style={styles.buttonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Already have an account?{"  "}
            </Text>
            <Pressable onPress={() => router.replace("/auth/login")} hitSlop={8}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
          </View>

          <Text style={[styles.terms, { color: colors.mutedForeground }]}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, gap: 28 },
  backBtn: { alignSelf: "flex-start", padding: 4 },
  brand: { alignItems: "center", gap: 10 },
  logoCircle: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 12 },
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
  atSign: { fontSize: 16, fontFamily: "Inter_400Regular", marginRight: -4 },
  eyeBtn: { padding: 2 },
  fieldError: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, paddingHorizontal: 4 },
  pwChecklist: { gap: 5, marginTop: 8, paddingHorizontal: 4 },
  pwRuleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pwRuleText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const, paddingHorizontal: 4 },
  genderRow: { flexDirection: "row", gap: 8 },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  genderIcon: { fontSize: 16 },
  genderLabel: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  dobRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dobField: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dobFieldYear: {
    flex: 1.5,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dobSep: { fontSize: 18, fontFamily: "Inter_400Regular" },
  dobInput: { fontSize: 16, fontFamily: "Inter_400Regular", minWidth: 40, textAlign: "center" },
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
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" as const },
  terms: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16, paddingHorizontal: 16 },
});
