import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { queryResults, jwtMock } = vi.hoisted(() => {
  const queryResults: any[][] = [];
  const jwtMock = {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn().mockReturnValue({ sub: "owner-id" }),
    decode: vi.fn(),
  };
  return { queryResults, jwtMock };
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
  ilike: () => "__ilike__",
  inArray: () => "__inArray__",
  sql: () => "__sql__",
  unique: () => ({ on: () => "__unique__" }),
}));

vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

import app from "../app.js";

function queueResults(...results: any[][]) { queryResults.push(...results); }
function clearQueue() { queryResults.length = 0; }

const AUTH_HEADER = { Authorization: "Bearer mock.token" };

const MOCK_COMPANION = {
  id: "comp-id-1",
  userId: "owner-id",
  name: "Aria",
  personality: "supportive",
  gender: "female",
  customPersonality: null,
  avatarColor: "purple",
  relationshipLevel: 0,
  messageCount: 0,
};

describe("GET /api/companions", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/companions");
    expect(res.status).toBe(401);
  });

  it("returns an array of companions for the authenticated user", async () => {
    queueResults([MOCK_COMPANION]);
    const res = await request(app).get("/api/companions").set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Aria");
  });

  it("returns empty array when user has no companions", async () => {
    queueResults([]);
    const res = await request(app).get("/api/companions").set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/companions", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/companions").send({ name: "X", personality: "supportive" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/companions").set(AUTH_HEADER).send({ personality: "supportive" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it("returns 400 when personality is missing", async () => {
    const res = await request(app).post("/api/companions").set(AUTH_HEADER).send({ name: "Aria" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/personality/i);
  });

  it("creates companion and returns it", async () => {
    queueResults([MOCK_COMPANION]);
    const res = await request(app)
      .post("/api/companions")
      .set(AUTH_HEADER)
      .send({ name: "Aria", personality: "supportive", gender: "female" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Aria");
  });

  it("stores the companion gender field", async () => {
    const withGender = { ...MOCK_COMPANION, gender: "male" };
    queueResults([withGender]);
    const res = await request(app)
      .post("/api/companions")
      .set(AUTH_HEADER)
      .send({ name: "Leo", personality: "flirty", gender: "male" });
    expect(res.status).toBe(200);
    expect(res.body.gender).toBe("male");
  });
});

describe("PATCH /api/companions/:id", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/api/companions/comp-id-1").send({ relationshipLevel: 10 });
    expect(res.status).toBe(401);
  });

  it("returns 404 when companion not found or not owned", async () => {
    queueResults([]); // update returns nothing (not owner)
    const res = await request(app)
      .patch("/api/companions/comp-id-1")
      .set(AUTH_HEADER)
      .send({ relationshipLevel: 10 });
    expect(res.status).toBe(404);
  });

  it("updates and returns the companion", async () => {
    queueResults([{ ...MOCK_COMPANION, relationshipLevel: 10 }]);
    const res = await request(app)
      .patch("/api/companions/comp-id-1")
      .set(AUTH_HEADER)
      .send({ relationshipLevel: 10 });
    expect(res.status).toBe(200);
    expect(res.body.relationshipLevel).toBe(10);
  });
});

describe("DELETE /api/companions/:id", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/companions/comp-id-1");
    expect(res.status).toBe(401);
  });

  it("deletes the companion and returns success", async () => {
    queueResults([]); // delete op
    const res = await request(app).delete("/api/companions/comp-id-1").set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/companions/:id/messages", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/companions/comp-id-1/messages");
    expect(res.status).toBe(401);
  });

  it("returns 404 when companion not owned by user", async () => {
    queueResults([]); // ownership check fails
    const res = await request(app).get("/api/companions/comp-id-1/messages").set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  it("returns messages array for owned companion", async () => {
    const msgs = [
      { id: "msg-1", companionId: "comp-id-1", role: "user", content: "hello", createdAt: new Date() },
      { id: "msg-2", companionId: "comp-id-1", role: "assistant", content: "hi there!", createdAt: new Date() },
    ];
    queueResults([{ id: "comp-id-1" }], msgs); // ownership + messages
    const res = await request(app).get("/api/companions/comp-id-1/messages").set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("POST /api/companions/:id/messages", () => {
  beforeEach(clearQueue);

  it("returns 400 when messages array is empty", async () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "owner-id" });
    queueResults([{ id: "comp-id-1" }]);
    const res = await request(app)
      .post("/api/companions/comp-id-1/messages")
      .set(AUTH_HEADER)
      .send({ messages: [] });
    expect(res.status).toBe(400);
  });

  it("inserts messages and returns them", async () => {
    const inserted = [{ id: "msg-new", role: "user", content: "hey" }];
    queueResults([{ id: "comp-id-1" }], inserted);
    const res = await request(app)
      .post("/api/companions/comp-id-1/messages")
      .set(AUTH_HEADER)
      .send({ messages: [{ role: "user", content: "hey" }] });
    expect(res.status).toBe(200);
    expect(res.body[0].content).toBe("hey");
  });
});

describe("GET /api/companions/:id/memory", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/companions/comp-id-1/memory");
    expect(res.status).toBe(401);
  });

  it("returns array of note strings", async () => {
    const notes = [
      { note: "likes coffee", createdAt: new Date() },
      { note: "has a dog", createdAt: new Date() },
    ];
    queueResults([{ id: "comp-id-1" }], notes);
    const res = await request(app).get("/api/companions/comp-id-1/memory").set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["likes coffee", "has a dog"]);
  });
});

describe("PUT /api/companions/:id/memory", () => {
  beforeEach(clearQueue);

  it("returns 400 when notes is not an array", async () => {
    queueResults([{ id: "comp-id-1" }]);
    const res = await request(app)
      .put("/api/companions/comp-id-1/memory")
      .set(AUTH_HEADER)
      .send({ notes: "not-array" });
    expect(res.status).toBe(400);
  });

  it("replaces memory notes and returns success", async () => {
    queueResults([{ id: "comp-id-1" }], [], []); // ownership, delete, insert
    const res = await request(app)
      .put("/api/companions/comp-id-1/memory")
      .set(AUTH_HEADER)
      .send({ notes: ["likes pizza", "has a cat"] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
