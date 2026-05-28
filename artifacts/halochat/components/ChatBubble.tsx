import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { type Message } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  message: Message;
  companionGradient: [string, string];
  companionInitials: string;
  isStreaming?: boolean;
  isNew?: boolean;
  selected?: boolean;
  status?: "sent" | "seen";
  onPress?: () => void;
  onLongPress?: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatBubble({
  message,
  companionGradient,
  companionInitials,
  isStreaming,
  isNew,
  selected,
  status,
  onPress,
  onLongPress,
}: Props) {
  const colors = useColors();
  const isUser = message.role === "user";

  const translateY = useSharedValue(isNew ? 14 : 0);
  const opacity = useSharedValue(isNew ? 0 : 1);

  useEffect(() => {
    if (isNew) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 280 });
      opacity.value = withTiming(1, { duration: 160 });
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const timestamp = message.id.startsWith("__") ? null : (
    <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
      {formatTime(message.timestamp)}
    </Text>
  );

  const selectionDot = selected !== undefined ? (
    <View style={[
      styles.selectionDot,
      selected
        ? { backgroundColor: colors.primary, borderColor: colors.primary }
        : { backgroundColor: "transparent", borderColor: colors.mutedForeground },
    ]}>
      {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
    </View>
  ) : null;

  if (isUser) {
    return (
      <Animated.View style={[styles.userRow, animStyle]}>
        {selectionDot}
        <View style={styles.userBubbleWrapper}>
          <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350}>
            <LinearGradient
              colors={selected ? ["#9CA3AF", "#6B7280"] : [colors.primary, colors.accent]}
              style={styles.userBubble}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.userText}>{message.content}</Text>
            </LinearGradient>
          </Pressable>
          {timestamp && (
            <View style={styles.userMeta}>
              {timestamp}
              {status && !selected && (
                <Ionicons
                  name={status === "seen" ? "checkmark-done" : "checkmark"}
                  size={11}
                  color={status === "seen" ? colors.primary : colors.mutedForeground}
                />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.assistantRow, animStyle]}>
      {selectionDot}
      <LinearGradient
        colors={companionGradient}
        style={styles.smallAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.smallAvatarText}>{companionInitials[0]}</Text>
      </LinearGradient>
      <View style={styles.assistantContent}>
        <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350}>
          <View
            style={[
              styles.assistantBubble,
              {
                backgroundColor: selected ? colors.muted : colors.card,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.assistantText, { color: colors.foreground }]}>
              {message.content}
              {isStreaming && <Text style={{ color: colors.primary }}>▋</Text>}
            </Text>
          </View>
        </Pressable>
        {timestamp}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
    paddingLeft: 48,
    paddingRight: 16,
    gap: 8,
  },
  userBubbleWrapper: {
    alignItems: "flex-end",
    gap: 3,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    paddingLeft: 16,
    paddingRight: 48,
    gap: 8,
  },
  assistantContent: { flex: 1, gap: 3 },
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
  timestamp: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
