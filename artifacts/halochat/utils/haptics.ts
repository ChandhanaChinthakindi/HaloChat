import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HAPTICS_PREF_KEY = "halochat_haptics_enabled";

async function isEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(HAPTICS_PREF_KEY);
  return val !== "0";
}

export async function hapticsImpact(style = Haptics.ImpactFeedbackStyle.Light): Promise<void> {
  if (!(await isEnabled())) return;
  Haptics.impactAsync(style);
}

export async function hapticsNotification(type = Haptics.NotificationFeedbackType.Success): Promise<void> {
  if (!(await isEnabled())) return;
  Haptics.notificationAsync(type);
}

export async function hapticsSelection(): Promise<void> {
  if (!(await isEnabled())) return;
  Haptics.selectionAsync();
}
