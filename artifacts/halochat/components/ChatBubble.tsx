import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { type Message } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  message: Message;
  companionGradient: [string, string];
  companionInitials: string;
  isStreaming?: boolean;
}

export function ChatBubble({
  message,
  companionGradient,
  companionInitials,
  isStreaming,
}: Props) {
  const colors = useColors();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.userBubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.userText}>{message.content}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <LinearGradient
        colors={companionGradient}
        style={styles.smallAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.smallAvatarText}>{companionInitials[0]}</Text>
      </LinearGradient>
      <View
        style={[
          styles.assistantBubble,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.assistantText, { color: colors.foreground }]}>
          {message.content}
          {isStreaming && <Text style={{ color: colors.primary }}>▋</Text>}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    marginBottom: 12,
    paddingLeft: 64,
    paddingRight: 16,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    paddingLeft: 16,
    paddingRight: 64,
    gap: 8,
  },
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "100%",
  },
  userText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  assistantBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "100%",
    flex: 1,
    borderWidth: 1,
  },
  assistantText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  smallAvatarText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
});
