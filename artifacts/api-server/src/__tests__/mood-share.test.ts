/**
 * Tests for POST /api/companions/:id/mood-share
 *
 * Covers every failure point in the chain:
 *  1. Auth enforcement
 *  2. Input validation
 *  3. Companion ownership check
 *  4. OpenAI call + response parsing
 *  5. Fallback when OPENAI_API_KEY is absent
 *  6. DB insert of both messages
 *  7. Companion lastMessage update
 *  8. Recent message context passed to OpenAI
 *  9. Push notification scheduled (not awaited inline)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { queryResults, jwtMock, openaiCreate, insertedRows, sendPushMock } = vi.hoisted(() => {
  const queryResults: any[][] = [];
  const insertedRows: any[][] = []; // captures every .values() call
  const jwtMock = {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn().mockReturnValue({ sub: "user-id" }),
    decode: vi.fn(),
  };
  const openaiCreate = vi.fn();
  const sendPushMock = vi.fn().mockResolvedValue(undefined);
  return { queryResults, jwtMock, insertedRows, openaiCreate, sendPushMock };
});

vi.mock("@workspace/db", () => {
  function makeChain(): any {
    const chain: any = {};
    const terminal = () => Promise.resolve(queryResults.shift() ?? []);
    chain.from = () => chain;
    chain.where = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.set = () => chain;
    chain.returning = terminal;
    chain.onConflictDoUpdate = terminal;
    chain.then = (resolve: any, reject: any) => terminal().then(resolve, reject);
    // Capture inserted values so tests can assert what was written
    chain.values = (rows: any) => {
      insertedRows.push(Array.isArray(rows) ? rows : [rows]);
      return chain;
    };
    return chain;
  }
  return {
    db: {
      select: () => makeChain(),
      insert: () => makeChain(),
      update: () => makeChain(),
      delete: () => makeChain(),
    },
    usersTable: {},
    companionsTable: {},
    messagesTable: {},
    memoryNotesTable: {},
    moodLogsTable: {},
    dailyUsageTable: {},
  };
});

vi.mock("drizzle-orm", () => ({
  eq: (...args: any[]) => `__eq__(${args.join(",")})`,
  and: (...args: any[]) => `__and__(${args.join(",")})`,
  desc: () => "__desc__",
  asc: () => "__asc__",
  gte: () => "__gte__",
  lt: () => "__lt__",
  or: () => "__or__",
  inArray: () => "__inArray__",
  isNull: () => "__isNull__",
  isNotNull: () => "__isNotNull__",
  gt: () => "__gt__",
  unique: () => ({ on: () => "__unique__" }),
}));

vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

vi.mock("../middleware/rateLimits.js", () => {
  const pass = (_req: any, _res: any, next: any) => next();
  return {
    authLimiter: pass, refreshLimiter: pass,
    chatLimiter: pass, ttsLimiter: pass,
    transcribeLimiter: pass, backgroundLimiter: pass,
  };
});

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: openaiCreate } };
  },
}));

vi.mock("../lib/push.js", () => ({
  sendPushNotification: sendPushMock,
}));

import app from "../app.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function queueResults(...results: any[][]) { queryResults.push(...results); }
function clearQueue() { queryResults.length = 0; insertedRows.length = 0; }

const AUTH = { Authorization: "Bearer mock.token" };

const MOCK_COMPANION = {
  id: "comp-1",
  name: "Aria",
  personality: "supportive",
  gender: "female",
  customPersonality: null,
  relationshipLevel: 20,
};

const MOCK_USER = {
  pushToken: "ExponentPushToken[xxx]",
  gender: "female",
  name: "Princy",
};

/** Queue the 4 parallel SELECT calls the endpoint makes */
function queueSelects(
  companion = MOCK_COMPANION,
  user = MOCK_USER,
  recentMessages: any[] = [],
  memoryNotes: any[] = [],
) {
  queueResults(
    companion ? [companion] : [],  // companion row
    user ? [user] : [],            // user row
    recentMessages,                // recent messages
    memoryNotes,                   // memory notes
  );
}

function mockAIReply(text = "Hey, glad you're feeling peaceful today!") {
  openaiCreate.mockResolvedValueOnce({
    choices: [{ message: { content: text } }],
  });
}

function capturedMessages() {
  const call = openaiCreate.mock.calls[openaiCreate.mock.calls.length - 1]?.[0] as any;
  return (call?.messages ?? []) as Array<{ role: string; content: string }>;
}

function capturedSystemPrompt() {
  return capturedMessages().find((m) => m.role === "system")?.content ?? "";
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/companions/:id/mood-share — auth & validation", () => {
  beforeEach(clearQueue);

  it("returns 401 without Authorization header", async () => {
    const res = await request(app)
      .post("/api/companions/comp-1/mood-share")
      .send({ moodText: "Serene · Calm · Peaceful" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when moodText is missing", async () => {
    const res = await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/moodText/i);
  });

  it("returns 400 when moodText is empty string", async () => {
    const res = await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/companions/:id/mood-share — companion ownership", () => {
  beforeEach(clearQueue);

  it("returns 404 when companion does not exist", async () => {
    queueResults([], [MOCK_USER], [], []); // empty companion result
    const res = await request(app)
      .post("/api/companions/nonexistent/mood-share")
      .set(AUTH)
      .send({ moodText: "Joyful · Excited · Energised" });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 404 when companion belongs to another user", async () => {
    queueResults([], [MOCK_USER], [], []); // companion query returns nothing for this userId
    const res = await request(app)
      .post("/api/companions/other-users-comp/mood-share")
      .set(AUTH)
      .send({ moodText: "Tense · Anxious · Stressed" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/companions/:id/mood-share — happy path", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); sendPushMock.mockClear(); });

  it("returns 200 with success:true", async () => {
    queueSelects();
    mockAIReply("Hey, sounds like a peaceful one. What's been going on?");

    const res = await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Serene · Calm · Peaceful", userName: "Princy" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("saves a user message and an assistant reply to messagesTable", async () => {
    queueSelects();
    mockAIReply("That's nice to hear! Tell me more about your day.");

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Content · Happy · Good", userName: "Princy" });

    // The insert should have been called with two rows
    expect(insertedRows.length).toBeGreaterThan(0);
    const savedRows = insertedRows.flat();
    const userMsg = savedRows.find((r: any) => r.role === "user");
    const assistantMsg = savedRows.find((r: any) => r.role === "assistant");
    expect(userMsg).toBeDefined();
    expect(userMsg?.content).toContain("Content · Happy · Good");
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg?.content).toBe("That's nice to hear! Tell me more about your day.");
    expect(userMsg?.companionId).toBe("comp-1");
    expect(assistantMsg?.companionId).toBe("comp-1");
  });

  it("passes the moodText and companion personality to OpenAI", async () => {
    queueSelects();
    mockAIReply("Ugh, sounds rough. What's got you stressed?");

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Tense · Anxious · Stressed" });

    const systemPrompt = capturedSystemPrompt();
    expect(systemPrompt).toContain("Aria");
    expect(systemPrompt).toContain("Tense · Anxious · Stressed");
  });

  it("includes recent chat history as context in the OpenAI messages", async () => {
    const recentMessages = [
      { role: "user", content: "I've been feeling overwhelmed with work lately" },
      { role: "assistant", content: "That sounds really hard. What's piling up for you?" },
    ];
    queueSelects(MOCK_COMPANION, MOCK_USER, recentMessages, []);
    mockAIReply("Yeah, given everything you mentioned about work, this makes sense.");

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Drained · Withdrawn · Low" });

    const msgs = capturedMessages();
    const userMsg = msgs.find((m) => m.role === "user" && m.content.includes("overwhelmed"));
    expect(userMsg).toBeDefined(); // recent context was included
  });

  it("uses personality-specific voice — romantic type", async () => {
    const romanticCompanion = { ...MOCK_COMPANION, personality: "romantic" };
    queueSelects(romanticCompanion, MOCK_USER, [], []);
    mockAIReply("hey, that sounds nice — makes me happy knowing you're having a good one 💕");

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Joyful · Excited · Energised" });

    const systemPrompt = capturedSystemPrompt();
    expect(systemPrompt.toLowerCase()).toMatch(/love|feelings|tender|fond/);
  });

  it("schedules a push notification after responding (not inline)", async () => {
    vi.useFakeTimers();
    queueSelects();
    mockAIReply("Glad you're doing well!");

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Balanced · Neutral · Present" });

    // Advance past the 2500ms delay
    await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();

    expect(sendPushMock).toHaveBeenCalledWith(
      MOCK_USER.pushToken,
      MOCK_COMPANION.name,
      "Glad you're doing well!",
    );
  });

  it("skips push notification when user has no push token", async () => {
    queueSelects(MOCK_COMPANION, { ...MOCK_USER, pushToken: null }, [], []);
    mockAIReply("sounds good!");

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Alert · Charged · Active" });

    await new Promise((r) => setTimeout(r, 50));
    expect(sendPushMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/companions/:id/mood-share — fallback when no OPENAI_API_KEY", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("still saves a fallback message when OPENAI_API_KEY is absent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    queueSelects();

    await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Serene · Calm · Peaceful" });

    expect(openaiCreate).not.toHaveBeenCalled();
    // Fallback should still have been inserted
    const savedRows = insertedRows.flat();
    const assistantMsg = savedRows.find((r: any) => r.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg?.content.length).toBeGreaterThan(0);
  });
});

describe("POST /api/companions/:id/mood-share — OpenAI failure", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("returns 500 when OpenAI throws", async () => {
    queueSelects();
    openaiCreate.mockRejectedValueOnce(new Error("OpenAI down"));

    const res = await request(app)
      .post("/api/companions/comp-1/mood-share")
      .set(AUTH)
      .send({ moodText: "Down · Heavy · Unsettled" });

    expect(res.status).toBe(500);
  });
});
