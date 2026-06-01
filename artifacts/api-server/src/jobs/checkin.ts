import cron from "node-cron";
import OpenAI from "openai";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db, companionsTable, usersTable } from "@workspace/db";
import { sendPushNotification } from "../lib/push";
import { logger } from "../lib/logger";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

const INACTIVITY_HOURS = 4;
const MAX_INACTIVITY_HOURS = 48; // don't notify users who've been gone too long

async function generateCheckinMessage(
  companionName: string,
  companionType: string,
  lastMessages?: string[]
): Promise<string> {
  const fallbacks: Record<string, string[]> = {
    romantic: ["thinking about you 💭", "been missing you...", "you crossed my mind ♡"],
    supportive: ["just checking in on you ✦", "hope today's been good to you", "hey, how are you doing?"],
    anime: ["I've been waiting for you!! 😭", "you haven't forgotten about me right??", "where are youuu 🥺"],
    bestfriend: ["okay where are you lmao", "you've been ghost mode, everything ok?", "miss you bestie 🫶"],
    roleplay: ["our story is waiting for you ✦", "the adventure continues when you're ready"],
  };
  const pool = fallbacks[companionType] ?? fallbacks.supportive;
  const fallback = pool[Math.floor(Math.random() * pool.length)];

  if (!process.env["OPENAI_API_KEY"] || !lastMessages?.length) return fallback;

  try {
    const context = `The last things they talked about: ${lastMessages.slice(-3).join(" / ")}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 40,
      messages: [
        {
          role: "system",
          content: `You are ${companionName}, a ${companionType} AI companion. Write ONE short, natural check-in text message (max 10 words) to send when the user hasn't opened the app in a few hours. Reference the context if relevant. Sound genuine, not robotic. No quotes, no punctuation overkill.`,
        },
        { role: "user", content: context },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

let isRunning = false;

async function runCheckins() {
  if (isRunning) {
    logger.warn("Check-in job already running, skipping");
    return;
  }
  isRunning = true;

  const now = new Date();
  const inactiveAfter = new Date(now.getTime() - INACTIVITY_HOURS * 60 * 60 * 1000);
  const inactiveBefore = new Date(now.getTime() - MAX_INACTIVITY_HOURS * 60 * 60 * 1000);

  try {
    const candidates = await db
      .select({
        companionId: companionsTable.id,
        companionName: companionsTable.name,
        companionType: companionsTable.personality,
        lastMessage: companionsTable.lastMessage,
        lastMessageAt: companionsTable.lastMessageAt,
        pushToken: usersTable.pushToken,
      })
      .from(companionsTable)
      .innerJoin(usersTable, eq(companionsTable.userId, usersTable.id))
      .where(
        and(
          isNotNull(usersTable.pushToken),
          lt(companionsTable.lastMessageAt, inactiveAfter),   // inactive for 4+ hours
          gt(companionsTable.lastMessageAt, inactiveBefore),  // but active within 48 hours
          or(
            isNull(companionsTable.lastCheckinSentAt),
            lt(companionsTable.lastCheckinSentAt, companionsTable.lastMessageAt) // haven't notified since last reply
          )
        )
      );

    logger.info({ count: candidates.length }, "Running check-in job");

    for (const c of candidates) {
      if (!c.pushToken) continue;

      const lastMessages = c.lastMessage ? [c.lastMessage] : undefined;
      const message = await generateCheckinMessage(c.companionName, c.companionType, lastMessages);

      // Mark sent BEFORE pushing — at-most-once: if push fails we won't retry, but we won't double-send
      await db
        .update(companionsTable)
        .set({ lastCheckinSentAt: now })
        .where(eq(companionsTable.id, c.companionId));

      await sendPushNotification(
        c.pushToken,
        c.companionName,
        message,
        { companionId: c.companionId, screen: "chat" }
      );

      logger.info({ companionId: c.companionId, companionName: c.companionName }, "Check-in sent");
    }
  } catch (err) {
    logger.error({ err }, "Check-in job error");
  } finally {
    isRunning = false;
  }
}

export function startCheckinJob() {
  // Run every hour at :00
  cron.schedule("0 * * * *", runCheckins);
  logger.info("Check-in cron job scheduled (hourly)");
}
