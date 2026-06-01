import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import type { CompanionType } from "@/context/CompanionContext";
import { API_BASE } from "@/context/CompanionContext";

// Reads EAS projectId from app.json (added by `npx eas init`)
const EAS_PROJECT_ID: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any).easConfig?.projectId;

export const NOTIFICATIONS_PREF_KEY = "halochat_notifications_enabled";

// Detect whether the expo-notifications native layer is actually present.
// It is available in Expo Go and in custom builds that include the module.
// It is absent in custom builds where expo-notifications was never linked.
const NOTIFICATIONS_AVAILABLE =
  Platform.OS !== "web" && !!NativeModules.ExpoPushTokenManager;

// Only set up the foreground handler once, and only if the native module exists.
if (NOTIFICATIONS_AVAILABLE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const N = require("expo-notifications");
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // ignore — notifications will just be no-ops
  }
}

const CHECKIN_MESSAGES: Record<CompanionType, string[]> = {
  romantic: [
    "thinking about you 💭",
    "been missing you...",
    "you crossed my mind ♡",
    "hey, you okay? haven't heard from you",
  ],
  confidant: [
    "just checking in on you ✦",
    "hope today's been good to you",
    "hey, how are you doing?",
    "something came to mind — come chat when you can",
  ],
  anime: [
    "I've been waiting for you!! 😭",
    "you haven't forgotten about me right??",
    "where are youuu 🥺",
    "come back!! I miss you so much",
  ],
  bestfriend: [
    "okay where are you lmao",
    "you've been ghost mode, everything ok?",
    "bro come talk to me I'm bored",
    "miss you bestie 🫶",
  ],
  roleplay: [
    "our story is waiting for you ✦",
    "the adventure continues when you're ready",
    "I've been thinking about where our story goes next",
    "come back — I have a plot twist in mind 👀",
  ],
};

function pickMessage(type: CompanionType): string {
  const msgs = CHECKIN_MESSAGES[type] ?? CHECKIN_MESSAGES.confidant;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!NOTIFICATIONS_AVAILABLE) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const N = require("expo-notifications");
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleCheckin(
  companionId: string,
  companionName: string,
  companionType: CompanionType,
  delayHours = 4,
  lastMessages?: string[]
): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  try {
    const notifPref = await AsyncStorage.getItem(NOTIFICATIONS_PREF_KEY);
    if (notifPref === "0") return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const N = require("expo-notifications");
    await N.cancelScheduledNotificationAsync(`checkin-${companionId}`);
    const granted = await requestNotificationPermission();
    if (!granted) return;

    // Try to generate a personalized message from the last conversation
    let body = pickMessage(companionType);
    if (lastMessages && lastMessages.length > 0) {
      try {
        const res = await fetch(`${API_BASE}/companion/generate-checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companionType, companionName, lastMessages }),
        });
        if (res.ok) {
          const data = (await res.json()) as { message?: string };
          if (data.message) body = data.message;
        }
      } catch {
        // fall back to random message
      }
    }

    await N.scheduleNotificationAsync({
      identifier: `checkin-${companionId}`,
      content: {
        title: companionName,
        body,
        data: { companionId, screen: "chat" },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayHours * 60 * 60,
        repeats: false,
      },
    });
  } catch {
    // silent — notifications are non-critical
  }
}

export async function registerPushToken(
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const N = require("expo-notifications");
    const tokenData = await N.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined
    );
    const token: string = tokenData.data;
    if (!token) return;

    await authFetch(`${API_BASE}/notifications/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // non-critical — silently ignore
  }
}

export async function unregisterPushToken(
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  try {
    await authFetch(`${API_BASE}/notifications/token`, { method: "DELETE" });
  } catch {
    // non-critical
  }
}

export async function cancelCheckin(companionId: string): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const N = require("expo-notifications");
    await N.cancelScheduledNotificationAsync(`checkin-${companionId}`);
  } catch {
    // silent
  }
}
