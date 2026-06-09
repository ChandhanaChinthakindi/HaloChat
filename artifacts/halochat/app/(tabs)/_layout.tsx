import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS
              ? isDark ? "rgba(42, 26, 22, 0.82)" : "rgba(255, 250, 246, 0.82)"
              : colors.card,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={20}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Companions",
            tabBarIcon: ({ color, focused }) =>
              isIOS ? (
                <SymbolView
                  name={focused ? "bubble.left.and.bubble.right.fill" : "bubble.left.and.bubble.right"}
                  tintColor={color}
                  size={22}
                />
              ) : (
                <Ionicons
                  name={focused ? "chatbubbles" : "chatbubbles-outline"}
                  size={22}
                  color={color}
                />
              ),
          }}
        />
        <Tabs.Screen
          name="activities"
          options={{
            title: "Activities",
            tabBarIcon: ({ color, focused }) =>
              isIOS ? (
                <SymbolView
                  name={focused ? "heart.circle.fill" : "heart.circle"}
                  tintColor={color}
                  size={22}
                />
              ) : (
                <Ionicons
                  name={focused ? "heart-circle" : "heart-circle-outline"}
                  size={22}
                  color={color}
                />
              ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, focused }) =>
              isIOS ? (
                <SymbolView name="sparkles" tintColor={color} size={22} />
              ) : (
                <Ionicons
                  name={focused ? "sparkles" : "sparkles-outline"}
                  size={22}
                  color={color}
                />
              ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) =>
              isIOS ? (
                <SymbolView
                  name={focused ? "gearshape.fill" : "gearshape"}
                  tintColor={color}
                  size={22}
                />
              ) : (
                <Ionicons
                  name={focused ? "settings" : "settings-outline"}
                  size={22}
                  color={color}
                />
              ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
