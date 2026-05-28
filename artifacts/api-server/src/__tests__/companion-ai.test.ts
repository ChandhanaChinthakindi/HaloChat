/**
 * Tests for the AI companion chat routes.
 * Key concerns:
 *  - Auth enforcement
 *  - System prompt construction (companion gender, user gender, user age, FIRST MEETING)
 *  - Graceful degradation when OPENAI_API_KEY is absent
 *  - SSE streaming response format
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------
const { queryResults, jwtMock, openaiCreate } = vi.hoisted(() => {
  const queryResults: any[][] = [];
  const jwtMock = {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn().mockReturnValue({ sub: "user-id" }),
    decode: vi.fn(),
  };

  // Captures every call so tests can inspect the system prompt sent to OpenAI.
  const openaiCreate = vi.fn();

  return { queryResults, jwtMock, openaiCreate };
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
    chain.values = () => chain;
    chain.returning = terminal;
    chain.onConflictDoUpdate = terminal;
    chain.then = (resolve: any, reject: any) => terminal().then(resolve, reject);
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
    dailyUsageTable: {},
  };
});

vi.mock("drizzle-orm", () => ({
  eq: () => "__eq__",
  or: () => "__or__",
  and: () => "__and__",
  desc: () => "__desc__",
  sql: () => "__sql__",
  unique: () => ({ on: () => "__unique__" }),
}));

vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

// OpenAI mock — streaming variant returns async iterable; sync returns object.
vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: { create: openaiCreate },
    };
  },
}));

import app from "../app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function queueResults(...results: any[][]) { queryResults.push(...results); }
function clearQueue() { queryResults.length = 0; }

const AUTH = { Authorization: "Bearer mock.token" };

/** Daily-limit middleware DB calls: select usage row + insert/update row. */
function queueDailyLimitPass() {
  queueResults([{ requests: 0 }], []); // under limit + increment
}

/** Make openaiCreate resolve with a streaming async iterable. */
function mockStreamingResponse(text = "Hello!") {
  openaiCreate.mockResolvedValueOnce({
    [Symbol.asyncIterator]: async function* () {
      yield { choices: [{ delta: { content: text } }] };
    },
  });
}

/** Make openaiCreate resolve with a sync (chat-sync) response. */
function mockSyncResponse(text = "Hey there!") {
  openaiCreate.mockResolvedValueOnce({
    choices: [{ message: { content: text } }],
  });
}

/** Extract the system prompt from the last OpenAI call. */
function capturedSystemPrompt(): string {
  const calls = openaiCreate.mock.calls;
  const lastCall = calls[calls.length - 1][0] as { messages: Array<{ role: string; content: string }> };
  return lastCall.messages[0]?.content ?? "";
}

// Base payload for /companion/chat
const BASE_CHAT = {
  companionId: "comp-id-1",
  companionType: "supportive",
  companionName: "Aria",
  messages: [{ role: "user", content: "hi" }],
  relationshipLevel: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/companion/chat — auth & validation", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("returns 401 without a bearer token", async () => {
    const res = await request(app).post("/api/companion/chat").send(BASE_CHAT);
    expect(res.status).toBe(401);
  });

  it("returns 400 when messages array is missing", async () => {
    queueDailyLimitPass();
    const res = await request(app)
      .post("/api/companion/chat")
      .set(AUTH)
      .send({ ...BASE_CHAT, messages: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/messages/i);
  });
});

describe("POST /api/companion/chat — SSE streaming", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("returns SSE data with companion reply", async () => {
    queueDailyLimitPass();
    mockStreamingResponse("Hello there!");

    const res = await request(app)
      .post("/api/companion/chat")
      .set(AUTH)
      .send(BASE_CHAT)
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(res.text).toContain("Hello there!");
    expect(res.text).toContain("[DONE]");
  });

  it("returns placeholder message when OPENAI_API_KEY is not set", async () => {
    const original = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];
    queueDailyLimitPass();

    const res = await request(app)
      .post("/api/companion/chat")
      .set(AUTH)
      .send(BASE_CHAT)
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.text).toContain("OPENAI_API_KEY");
    process.env["OPENAI_API_KEY"] = original;
  });
});

describe("POST /api/companion/chat — system prompt: companion gender", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("injects she/her pronouns for female companion", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, companionGender: "female" }).buffer(true);

    expect(capturedSystemPrompt()).toContain("she/her");
    expect(capturedSystemPrompt()).toContain("present as female");
  });

  it("injects he/him pronouns for male companion", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, companionGender: "male" }).buffer(true);

    expect(capturedSystemPrompt()).toContain("he/him");
  });

  it("injects they/them for non-binary companion", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, companionGender: "nonbinary" }).buffer(true);

    expect(capturedSystemPrompt()).toContain("they/them");
    expect(capturedSystemPrompt()).toContain("non-binary");
  });
});

describe("POST /api/companion/chat — system prompt: user gender", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("injects USER GENDER section for female user", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userGender: "female" }).buffer(true);

    const prompt = capturedSystemPrompt();
    expect(prompt).toContain("USER GENDER");
    expect(prompt).toContain("female");
    expect(prompt).toContain("she/her");
  });

  it("injects USER GENDER section for male user", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userGender: "male" }).buffer(true);

    const prompt = capturedSystemPrompt();
    expect(prompt).toContain("USER GENDER");
    expect(prompt).toContain("he/him");
  });

  it("injects USER GENDER section for non-binary user", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userGender: "nonbinary" }).buffer(true);

    const prompt = capturedSystemPrompt();
    expect(prompt).toContain("USER GENDER");
    expect(prompt).toContain("they/them");
    expect(prompt).toContain("non-binary");
  });

  it("does not inject USER GENDER when userGender is not provided", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT }).buffer(true);

    expect(capturedSystemPrompt()).not.toContain("USER GENDER");
  });
});

describe("POST /api/companion/chat — system prompt: user age", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("adds strict age restriction for users 17-19", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userAge: 17 }).buffer(true);

    const prompt = capturedSystemPrompt();
    expect(prompt).toContain("USER AGE");
    expect(prompt).toContain("17 years old");
    expect(prompt).toMatch(/age-appropriate|strictly/i);
  });

  it("adds strict age restriction for age 19", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userAge: 19 }).buffer(true);

    expect(capturedSystemPrompt()).toContain("19 years old");
  });

  it("adds young adult context for users 20-24", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userAge: 22 }).buffer(true);

    const prompt = capturedSystemPrompt();
    expect(prompt).toContain("USER AGE");
    expect(prompt).toContain("22");
    expect(prompt).toMatch(/young adult/i);
  });

  it("adds no USER AGE section for users 25 and older", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, userAge: 30 }).buffer(true);

    expect(capturedSystemPrompt()).not.toContain("USER AGE");
  });

  it("does not include USER AGE when userAge is not provided", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT }).buffer(true);

    expect(capturedSystemPrompt()).not.toContain("USER AGE");
  });
});

describe("POST /api/companion/chat — system prompt: FIRST MEETING", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("includes FIRST MEETING when messages.length <= 10", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    const msgs = Array.from({ length: 5 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` }));
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, messages: msgs }).buffer(true);

    expect(capturedSystemPrompt()).toContain("FIRST MEETING");
    expect(capturedSystemPrompt()).toContain("do NOT know their name");
  });

  it("includes FIRST MEETING when messages.length is exactly 10", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    const msgs = Array.from({ length: 10 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` }));
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, messages: msgs }).buffer(true);

    expect(capturedSystemPrompt()).toContain("FIRST MEETING");
  });

  it("omits FIRST MEETING when messages.length > 10", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    const msgs = Array.from({ length: 11 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` }));
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, messages: msgs }).buffer(true);

    expect(capturedSystemPrompt()).not.toContain("FIRST MEETING");
  });
});

describe("POST /api/companion/chat — system prompt: memory & bond", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("includes memory notes in the system prompt", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, memoryNotes: ["likes jazz music", "has two cats"] }).buffer(true);

    const prompt = capturedSystemPrompt();
    expect(prompt).toContain("likes jazz music");
    expect(prompt).toContain("has two cats");
  });

  it("includes companion name in system prompt", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, companionName: "Zara" }).buffer(true);

    expect(capturedSystemPrompt()).toContain("Zara");
  });

  it("includes custom personality in system prompt", async () => {
    queueDailyLimitPass();
    mockStreamingResponse();
    await request(app).post("/api/companion/chat").set(AUTH)
      .send({ ...BASE_CHAT, customPersonality: "speaks in riddles" }).buffer(true);

    expect(capturedSystemPrompt()).toContain("speaks in riddles");
  });
});

describe("POST /api/companion/chat-sync", () => {
  beforeEach(() => { clearQueue(); openaiCreate.mockReset(); });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/companion/chat-sync").send(BASE_CHAT);
    expect(res.status).toBe(401);
  });

  it("returns sync reply as JSON", async () => {
    queueDailyLimitPass();
    mockSyncResponse("Hey, how are you?");
    const res = await request(app)
      .post("/api/companion/chat-sync")
      .set(AUTH)
      .send(BASE_CHAT);
    expect(res.status).toBe(200);
    expect(res.body.content).toBe("Hey, how are you?");
  });

  it("injects user gender into sync system prompt", async () => {
    queueDailyLimitPass();
    mockSyncResponse();
    await request(app).post("/api/companion/chat-sync").set(AUTH)
      .send({ ...BASE_CHAT, userGender: "male" });

    expect(capturedSystemPrompt()).toContain("USER GENDER");
    expect(capturedSystemPrompt()).toContain("he/him");
  });

  it("injects FIRST MEETING into sync prompt for short history", async () => {
    queueDailyLimitPass();
    mockSyncResponse();
    await request(app).post("/api/companion/chat-sync").set(AUTH)
      .send({ ...BASE_CHAT, messages: [{ role: "user", content: "hi" }] });

    expect(capturedSystemPrompt()).toContain("FIRST MEETING");
  });

  it("returns 503 when OPENAI_API_KEY is absent", async () => {
    const original = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];
    queueDailyLimitPass();

    const res = await request(app).post("/api/companion/chat-sync").set(AUTH).send(BASE_CHAT);
    expect(res.status).toBe(503);
    process.env["OPENAI_API_KEY"] = original;
  });
});
