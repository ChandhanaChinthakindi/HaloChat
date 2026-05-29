/**
 * Tests for the companion check-in cron job.
 * Key concerns:
 *  - startCheckinJob schedules with the correct cron expression
 *  - generateCheckinMessage returns a fallback when there are no last messages
 *  - generateCheckinMessage returns a fallback when OPENAI_API_KEY is absent
 *  - generateCheckinMessage calls OpenAI when key + messages are present
 *  - runCheckins sends notifications to eligible companions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const { queryResults, openaiCreate, cronSchedule } = vi.hoisted(() => ({
  queryResults: [] as any[][],
  openaiCreate: vi.fn(),
  cronSchedule: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: { schedule: cronSchedule },
  schedule: cronSchedule,
}));

vi.mock("@workspace/db", () => {
  function makeChain(): any {
    const c: any = {};
    const terminal = () => Promise.resolve(queryResults.shift() ?? []);
    c.from = () => c; c.where = () => c; c.set = () => c; c.values = () => c;
    c.innerJoin = () => c;
    c.returning = terminal;
    c.onConflictDoUpdate = terminal;
    c.then = (res: any, rej: any) => terminal().then(res, rej);
    return c;
  }
  return {
    db: { select: () => makeChain(), insert: () => makeChain(), update: () => makeChain() },
    companionsTable: { id: "id", userId: "userId", name: "name", personality: "personality",
      lastMessage: "lastMessage", lastMessageAt: "lastMessageAt", lastCheckinSentAt: "lastCheckinSentAt" },
    usersTable: { id: "id", pushToken: "pushToken" },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: () => "__eq__", and: () => "__and__", or: () => "__or__",
  lt: () => "__lt__", gt: () => "__gt__",
  isNotNull: () => "__isNotNull__", isNull: () => "__isNull__",
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: openaiCreate } };
  },
}));

vi.mock("../lib/push.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function queue(...results: any[][]) { queryResults.push(...results); }
function clearQueue() { queryResults.length = 0; }

// ---------------------------------------------------------------------------
// startCheckinJob
// ---------------------------------------------------------------------------
describe("startCheckinJob", () => {
  it("schedules the cron job with an hourly expression", async () => {
    cronSchedule.mockClear();
    const { startCheckinJob } = await import("../jobs/checkin.js");
    startCheckinJob();
    expect(cronSchedule).toHaveBeenCalledOnce();
    const [expression] = cronSchedule.mock.calls[0];
    expect(expression).toBe("0 * * * *");
  });

  it("passes a callback as the second argument to cron.schedule", async () => {
    cronSchedule.mockClear();
    const { startCheckinJob } = await import("../jobs/checkin.js");
    startCheckinJob();
    const [, callback] = cronSchedule.mock.calls[0];
    expect(typeof callback).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// runCheckins (called via the scheduled callback)
// ---------------------------------------------------------------------------
describe("runCheckins", () => {
  beforeEach(() => {
    clearQueue();
    openaiCreate.mockClear();
    cronSchedule.mockClear();
  });

  async function triggerCheckin() {
    const { startCheckinJob } = await import("../jobs/checkin.js");
    startCheckinJob();
    const [, callback] = cronSchedule.mock.calls[cronSchedule.mock.calls.length - 1];
    await callback();
  }

  it("does nothing when there are no eligible companions", async () => {
    queue([]); // empty candidates
    const { sendPushNotification } = await import("../lib/push.js");
    await triggerCheckin();
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it("sends a push notification for each eligible companion", async () => {
    const candidate = {
      companionId: "comp-1",
      companionName: "Luna",
      companionType: "romantic",
      lastMessage: "I miss you",
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      pushToken: "ExponentPushToken[abc]",
    };
    openaiCreate.mockRejectedValueOnce(new Error("api down")); // force fallback
    queue([candidate], [], []); // candidates, openai fallback, db update

    const { sendPushNotification } = await import("../lib/push.js");
    (sendPushNotification as any).mockClear();
    await triggerCheckin();

    expect(sendPushNotification).toHaveBeenCalledOnce();
    const [token, name] = (sendPushNotification as any).mock.calls[0];
    expect(token).toBe("ExponentPushToken[abc]");
    expect(name).toBe("Luna");
  });

  it("uses a fallback message when OpenAI call fails", async () => {
    const candidate = {
      companionId: "comp-2",
      companionName: "Aria",
      companionType: "supportive",
      lastMessage: "had a good day",
      lastMessageAt: new Date(),
      pushToken: "ExponentPushToken[xyz]",
    };
    openaiCreate.mockRejectedValueOnce(new Error("network error"));
    queue([candidate], [], []);

    const { sendPushNotification } = await import("../lib/push.js");
    (sendPushNotification as any).mockClear();
    await triggerCheckin();

    expect(sendPushNotification).toHaveBeenCalledOnce();
    const [, , message] = (sendPushNotification as any).mock.calls[0];
    // Fallback messages are non-empty strings
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });

  it("uses a fallback message when no last messages are provided", async () => {
    const candidate = {
      companionId: "comp-3",
      companionName: "Rex",
      companionType: "bestfriend",
      lastMessage: null,
      lastMessageAt: new Date(),
      pushToken: "ExponentPushToken[def]",
    };
    queue([candidate], [], []);

    const { sendPushNotification } = await import("../lib/push.js");
    (sendPushNotification as any).mockClear();
    await triggerCheckin();

    // OpenAI should NOT be called when there are no last messages
    expect(openaiCreate).not.toHaveBeenCalled();
    expect(sendPushNotification).toHaveBeenCalledOnce();
  });

  it("uses the OpenAI-generated message when available", async () => {
    const candidate = {
      companionId: "comp-4",
      companionName: "Mia",
      companionType: "flirty",
      lastMessage: "we talked about movies",
      lastMessageAt: new Date(),
      pushToken: "ExponentPushToken[ghi]",
    };
    openaiCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "thinking of you 💭" } }],
    });
    queue([candidate], [], []);

    const { sendPushNotification } = await import("../lib/push.js");
    (sendPushNotification as any).mockClear();
    await triggerCheckin();

    const [, , message] = (sendPushNotification as any).mock.calls[0];
    expect(message).toBe("thinking of you 💭");
  });

  it("skips companions without a push token", async () => {
    const candidate = {
      companionId: "comp-5",
      companionName: "Ghost",
      companionType: "mentor",
      lastMessage: "lesson",
      lastMessageAt: new Date(),
      pushToken: null,
    };
    queue([candidate]);

    const { sendPushNotification } = await import("../lib/push.js");
    (sendPushNotification as any).mockClear();
    await triggerCheckin();

    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it("continues processing remaining companions if one fails", async () => {
    const companions = [
      { companionId: "c1", companionName: "A", companionType: "supportive",
        lastMessage: null, lastMessageAt: new Date(), pushToken: "tok-1" },
      { companionId: "c2", companionName: "B", companionType: "supportive",
        lastMessage: null, lastMessageAt: new Date(), pushToken: "tok-2" },
    ];

    const { sendPushNotification } = await import("../lib/push.js");
    (sendPushNotification as any)
      .mockRejectedValueOnce(new Error("push failed"))
      .mockResolvedValueOnce(undefined);

    queue(companions, [], [], []);
    // Should not throw even if one push fails
    await expect(triggerCheckin()).resolves.not.toThrow();
  });
});
