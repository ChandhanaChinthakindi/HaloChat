import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { NativeModules } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CompanionProvider } from "@/context/CompanionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { registerPushToken } from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function PushTokenRegistrar() {
  const { isAuthenticated, authFetch } = useAuth();
  useEffect(() => {
    if (isAuthenticated) registerPushToken(authFetch);
  }, [isAuthenticated, authFetch]);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen
        name="create"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="memories/[id]" />
      <Stack.Screen
        name="call/[id]"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!NativeModules.ExpoPushTokenManager) return;

    let sub: { remove: () => void } | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require("expo-notifications");

      sub = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = response.notification.request.content.data;
          if (data?.companionId && data?.screen === "chat") {
            router.push(`/chat/${data.companionId}`);
          }
        }
      );

      Notifications.getLastNotificationResponseAsync()
        .then((response: any) => {
          if (!response) return;
          const data = response.notification.request.content.data;
          if (data?.companionId && data?.screen === "chat") {
            router.push(`/chat/${data.companionId}`);
          }
        })
        .catch(() => {});
    } catch {
      // expo-notifications not available
    }

    return () => {
      try { sub?.remove(); } catch { /* ignore */ }
    };
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AuthProvider>
                  <PushTokenRegistrar />
                  <CompanionProvider>
                    <RootLayoutNav />
                  </CompanionProvider>
                </AuthProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
