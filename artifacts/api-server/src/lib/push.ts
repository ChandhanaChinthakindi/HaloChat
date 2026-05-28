import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { logger } from "./logger";

const expo = new Expo();

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) {
    logger.warn({ pushToken }, "Invalid Expo push token — skipping");
    return;
  }

  const message: ExpoPushMessage = { to: pushToken, title, body, data, sound: "default" };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    if (ticket.status === "error") {
      logger.warn({ details: ticket.details }, "Push notification error ticket");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send push notification");
  }
}
