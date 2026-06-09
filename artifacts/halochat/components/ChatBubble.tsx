import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import { getAvatarById } from "@/constants/avatars";
import { useColors } from "@/hooks/useColors";

interface Props {
  message: Message;
  companionGradient: [string, string];
  companionInitials: string;
  companionAvatarId?: string;
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
  companionAvatarId,
  isStreaming,
  isNew,
  selected,
  status,
  onPress,
  onLongPress,
}: Props) {
  const colors = useColors();
  const isUser = message.role === "user";
  const avatar = getAvatarById(companionAvatarId);

  const translateY = useSharedValue(isNew ? 14 : 0);
  const opacity = useSharedValue(isNew ? 0 : 1);

  useEffect(() => {
    if (isNew) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 280 });
      opacity.value = withTiming(1, { duration: 160 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const timestamp = message.id.startsWith("__") ? null : (
    <Text style={[styles.timestamp, { color: colors.foreground }]}>
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
              colors={selected ? ["#9CA3AF", "#6B7280"] : [companionGradient[1], companionGradient[0]]}
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
                  color={status === "seen" ? companionGradient[0] : colors.mutedForeground}
                />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  // Companion bubble tint: very light wash of companion's first gradient color
  const bubbleTint = selected ? colors.muted : "rgba(255,253,248,0.35)";
  const bubbleBorder = selected ? colors.primary : `${companionGradient[0]}55`;

  return (
    <Animated.View style={[styles.assistantRow, animStyle]}>
      {selectionDot}
      {/* Mini avatar — photo if available, else gradient circle */}
      <View style={styles.smallAvatarWrap}>
        {avatar?.source ? (
          <Image
            source={avatar.source}
            style={styles.smallAvatarImg}
            contentFit="cover"
            contentPosition={{ top: 0 }}
          />
        ) : (
          <LinearGradient
            colors={companionGradient}
            style={styles.smallAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.smallAvatarText}>{companionInitials[0]}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.assistantContent}>
        <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350}>
          <View style={[styles.assistantBubble, { backgroundColor: bubbleTint, borderColor: bubbleBorder }]}>
            <Text style={[styles.assistantText, { color: colors.foreground }]}>
              {message.content}
              {isStreaming && <Text style={{ color: companionGradient[0] }}>▋</Text>}
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
    marginBottom: 14,
    paddingLeft: 64,
    paddingRight: 16,
    gap: 8,
  },
  userBubbleWrapper: { alignItems: "flex-end", gap: 4 },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 14,
    paddingLeft: 16,
    paddingRight: 64,
    gap: 10,
  },
  assistantContent: { flex: 1, gap: 4 },

  userBubble: {
    borderRadius: 22,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Soft shadow
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  userText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },

  assistantBubble: {
    borderRadius: 22,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    // Soft shadow
    shadowColor: "#5A3A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  assistantText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },

  smallAvatarWrap: { flexShrink: 0 },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  smallAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  smallAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },

  timestamp: { fontSize: 12, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  userMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  selectionDot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
});
