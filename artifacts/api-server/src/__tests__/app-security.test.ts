/**
 * Tests for app-level security hardening:
 *   - helmet security headers on every response
 *   - JSON body size limit (100kb)
 */
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Mocks — must be registered before app is imported
// ---------------------------------------------------------------------------
vi.mock("@workspace/db", () => ({
  db: {
    select: () => chain(),
    insert: () => chain(),
    update: () => chain(),
    delete: () => chain(),
  },
  // pool is used by the /api/healthz route
  pool: { query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }) },
  usersTable: {},
  companionsTable: {},
  messagesTable: {},
  memoryNotesTable: {},
  dailyUsageTable: {},
}));

function chain(): any {
  const c: any = {};
  const terminal = () => Promise.resolve([]);
  c.from = () => c; c.where = () => c; c.orderBy = () => c; c.limit = () => c;
  c.set = () => c; c.values = () => c;
  c.returning = terminal;
  c.onConflictDoUpdate = terminal;
  c.then = (res: any, rej: any) => terminal().then(res, rej);
  return c;
}

vi.mock("drizzle-orm", () => ({
  eq: () => "__eq__", or: () => "__or__", and: () => "__and__",
  sql: () => "__sql__", ilike: () => "__ilike__", lt: () => "__lt__",
  gt: () => "__gt__", isNotNull: () => "__isNotNull__", isNull: () => "__isNull__",
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn(), verify: vi.fn().mockReturnValue({ sub: "u1" }), decode: vi.fn() },
}));

vi.mock("../lib/email.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("openai", () => ({
  default: class { chat = { completions: { create: vi.fn() } }; audio = { speech: { create: vi.fn() }, transcriptions: { create: vi.fn() } }; },
}));

// Bypass rate limiters — this file tests security headers and body limits, not rate limiting.
vi.mock("../middleware/rateLimits.js", () => {
  const pt = (_req: any, _res: any, next: any) => next();
  return {
    authLimiter: pt, refreshLimiter: pt,
    chatLimiter: pt, ttsLimiter: pt,
    transcribeLimiter: pt, backgroundLimiter: pt,
  };
});

import app from "../app.js";

// ---------------------------------------------------------------------------
// Helmet security headers
// ---------------------------------------------------------------------------
describe("Helmet security headers", () => {
  it("sets x-content-type-options: nosniff on every response", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets x-frame-options to prevent clickjacking", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("sets x-dns-prefetch-control header", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
  });

  it("includes security headers on 4xx responses", async () => {
    // A login attempt with empty body returns 400 — proves headers are set on all responses
    const res = await request(app)
      .post("/api/auth/login")
      .send({});
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("includes security headers on 404 responses", async () => {
    const res = await request(app).get("/api/nonexistent-route");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});

// ---------------------------------------------------------------------------
// Body size limit (100 kb)
// ---------------------------------------------------------------------------
describe("Body size limit", () => {
  it("returns 413 for a JSON body exceeding 100kb", async () => {
    // ~110kb JSON object
    const bigBody = { data: "x".repeat(110 * 1024) };
    const res = await request(app)
      .post("/api/auth/login")
      .send(bigBody);
    expect(res.status).toBe(413);
  });

  it("accepts a JSON body within the 100kb limit", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "test@test.com", password: "password123" });
    // Any status other than 413 means the body was accepted
    expect(res.status).not.toBe(413);
  });

  it("returns 413 for a URL-encoded body exceeding 100kb", async () => {
    const bigValue = "x".repeat(110 * 1024);
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(`identifier=test&data=${bigValue}`);
    expect(res.status).toBe(413);
  });
});

// ---------------------------------------------------------------------------
// Health endpoint smoke test
// ---------------------------------------------------------------------------
describe("Health endpoint", () => {
  it("returns 200 and status:ok when DB is reachable", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("returns 503 when DB query fails", async () => {
    const { pool } = await import("@workspace/db");
    (pool.query as any).mockRejectedValueOnce(new Error("db down"));
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("error");
  });
});
