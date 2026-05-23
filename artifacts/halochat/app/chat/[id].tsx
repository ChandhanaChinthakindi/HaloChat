import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble } from "@/components/ChatBubble";
import {
  COMPANION_TYPES,
  type Message,
  useCompanions,
} from "@/context/CompanionContext";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = DOMAIN
  ? `https://${DOMAIN}/api`
  : Platform.OS === "web"
  ? "/api"
  : "http://localhost:3000/api";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    companions,
    getMessages,
    addMessage,
    updateRelationshipLevel,
  } = useCompanions();

  const companion = companions.find((c) => c.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (!id) return;
    getMessages(id).then((msgs) => {
      setMessages(msgs);
      setIsLoaded(true);
    });
  }, [id]);

  const displayMessages = [...messages];
  if (isStreaming && streamingContent) {
    displayMessages.push({
      id: "__streaming__",
      role: "assistant",
      content: streamingContent,
      timestamp: Date.now(),
    });
  }

  const reversedMessages = [...displayMessages].reverse();

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !companion) return;

    const userContent = input.trim();
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };

    const currentMessages = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    await addMessage(companion.id, userMsg);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const apiMessages = [
      ...currentMessages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: userContent },
    ];

    setIsStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    let fullContent = "";

    try {
      const response = await fetch(`${API_BASE}/companion/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionId: companion.id,
          companionType: companion.type,
          companionName: companion.name,
          memoryNotes: companion.memoryNotes,
          customPersonality: companion.customPersonality,
          messages: apiMessages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      fullContent = "I'm having trouble connecting right now. Please make sure the OpenAI API key is configured in the server environment. ✦";
      setStreamingContent(fullContent);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortRef.current = null;

      if (fullContent) {
        const assistantMsg: Message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          role: "assistant",
          content: fullContent,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await addMessage(companion.id, assistantMsg);
        await updateRelationshipLevel(companion.id, 2);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [input, isStreaming, companion, messages, addMessage, updateRelationshipLevel]);

  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Companion not found</Text>
      </View>
    );
  }

  const typeInfo = COMPANION_TYPES[companion.type];
  const initials = companion.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.background, colors.muted, colors.background] as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            abortRef.current?.abort();
            router.back();
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={() => router.push(`/profile/${companion.id}`)}
          style={styles.headerCenter}
        >
          <LinearGradient
            colors={companion.avatarGradient}
            style={styles.headerAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </LinearGradient>
          <View>
            <Text style={[styles.headerName, { color: colors.foreground }]}>
              {companion.name}
            </Text>
            <Text style={[styles.headerType, { color: colors.mutedForeground }]}>
              {typeInfo.emoji} {typeInfo.label}
              {isStreaming ? " · typing..." : ""}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/profile/${companion.id}`)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={colors.foreground}
          />
        </Pressable>
      </View>

      {!isLoaded ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              companionGradient={companion.avatarGradient}
              companionInitials={initials}
              isStreaming={item.id === "__streaming__" && isStreaming}
            />
          )}
          ListFooterComponent={
            messages.length === 0 && !isStreaming ? (
              <GreetingCard companion={companion} colors={colors} />
            ) : null
          }
        />
      )}

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: bottomPadding + 12,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={`Message ${companion.name}...`}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={isStreaming ? () => abortRef.current?.abort() : handleSend}
            disabled={!isStreaming && !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <LinearGradient
              colors={
                input.trim() || isStreaming
                  ? companion.avatarGradient
                  : [colors.muted, colors.muted]
              }
              style={styles.sendBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isStreaming ? "stop" : "arrow-up"}
                size={18}
                color={input.trim() || isStreaming ? "#FFFFFF" : colors.mutedForeground}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function GreetingCard({ companion, colors }: { companion: any; colors: any }) {
  const typeInfo = COMPANION_TYPES[companion.type];
  const initials = companion.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <View style={styles.greeting}>
      <LinearGradient
        colors={companion.avatarGradient}
        style={styles.greetingAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.greetingAvatarText}>{initials}</Text>
      </LinearGradient>
      <Text style={[styles.greetingName, { color: colors.foreground }]}>
        {companion.name}
      </Text>
      <Text style={[styles.greetingType, { color: colors.primary }]}>
        {typeInfo.emoji} {typeInfo.label}
      </Text>
      <Text style={[styles.greetingDesc, { color: colors.mutedForeground }]}>
        {typeInfo.description}
      </Text>
      <Text style={[styles.greetingHint, { color: colors.mutedForeground }]}>
        Say hello to begin your conversation
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  headerType: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    paddingVertical: 16,
    paddingTop: 24,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendBtn: {
    borderRadius: 20,
    overflow: "hidden",
    flexShrink: 0,
  },
  sendBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 32,
    gap: 8,
  },
  greetingAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  greetingAvatarText: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  greetingType: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  greetingDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  greetingHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
});
