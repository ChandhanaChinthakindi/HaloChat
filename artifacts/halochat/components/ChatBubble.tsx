import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { type Message } from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  message: Message;
  companionGradient: [string, string];
  companionInitials: string;
  isStreaming?: boolean;
  isSpeaking?: boolean;
  onSpeakPress?: () => void;
}

export function ChatBubble({
  message,
  companionGradient,
  companionInitials,
  isStreaming,
  isSpeaking,
  onSpeakPress,
}: Props) {
  const colors = useColors();
  const isUser = message.role === "user";

  // Waveform bars animation when speaking
  const bar1 = useSharedValue(0.4);
  const bar2 = useSharedValue(0.7);
  const bar3 = useSharedValue(0.5);

  const bar1Style = useAnimatedStyle(() => ({ transform: [{ scaleY: bar1.value }] }));
  const bar2Style = useAnimatedStyle(() => ({ transform: [{ scaleY: bar2.value }] }));
  const bar3Style = useAnimatedStyle(() => ({ transform: [{ scaleY: bar3.value }] }));

  React.useEffect(() => {
    if (isSpeaking) {
      bar1.value = withRepeat(
        withSequence(withTiming(1, { duration: 300 }), withTiming(0.3, { duration: 300 })),
        -1, false
      );
      bar2.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 200 }), withTiming(1, { duration: 200 })),
        -1, false
      );
      bar3.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 350 }), withTiming(0.2, { duration: 350 })),
        -1, false
      );
    } else {
      bar1.value = withTiming(0.4);
      bar2.value = withTiming(0.7);
      bar3.value = withTiming(0.5);
    }
  }, [isSpeaking]);

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

      <View style={styles.assistantCol}>
        <View
          style={[
            styles.assistantBubble,
            {
              backgroundColor: colors.card,
              borderColor: isSpeaking ? colors.primary : colors.border,
              borderWidth: isSpeaking ? 1.5 : 1,
            },
          ]}
        >
          {isSpeaking ? (
            <View style={styles.waveformRow}>
              <Text style={[styles.assistantText, { color: colors.foreground, flex: 1 }]}>
                {message.content}
              </Text>
              <View style={styles.waveform}>
                <Animated.View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    bar1Style,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    bar2Style,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    bar3Style,
                  ]}
                />
              </View>
            </View>
          ) : (
            <Text style={[styles.assistantText, { color: colors.foreground }]}>
              {message.content}
              {isStreaming && <Text style={{ color: colors.primary }}>▋</Text>}
            </Text>
          )}
        </View>

        {/* Speak button — appears on long-press or tap below bubble */}
        {onSpeakPress && !isStreaming && (
          <Pressable
            onPress={onSpeakPress}
            style={({ pressed }) => [
              styles.speakBtn,
              {
                backgroundColor: isSpeaking
                  ? `${colors.primary}18`
                  : "transparent",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name={isSpeaking ? "stop-circle-outline" : "volume-medium-outline"}
              size={13}
              color={isSpeaking ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.speakBtnText,
                { color: isSpeaking ? colors.primary : colors.mutedForeground },
              ]}
            >
              {isSpeaking ? "stop" : "speak"}
            </Text>
          </Pressable>
        )}
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
  assistantCol: {
    flex: 1,
    gap: 3,
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
  },
  assistantText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  waveformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 18,
    flexShrink: 0,
  },
  waveBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
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
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  speakBtnText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
