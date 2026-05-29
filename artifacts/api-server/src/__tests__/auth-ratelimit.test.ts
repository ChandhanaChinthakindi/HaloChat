/**
 * Tests for rate-limiting on auth endpoints.
 *
 * Two levels:
 *  1. "headers present" — a single request proves the limiter middleware is attached.
 *  2. "blocks after max" — an isolated Express app with a low max verifies the
 *     429 behaviour without polluting the real app's in-memory counter.
 */
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import rateLimit from "express-rate-limit";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const { queryResults, jwtMock } = vi.hoisted(() => ({
  queryResults: [] as any[][],
  jwtMock: {
    sign: vi.fn().mockReturnValue("tok"),
    verify: vi.fn().mockReturnValue({ sub: "user-1" }),
    decode: vi.fn(),
  },
}));

vi.mock("@workspace/db", () => {
  function makeChain(): any {
    const c: any = {};
    const terminal = () => Promise.resolve(queryResults.shift() ?? []);
    c.from = () => c; c.where = () => c; c.orderBy = () => c; c.limit = () => c;
    c.set = () => c; c.values = () => c;
    c.returning = terminal;
    c.onConflictDoUpdate = terminal;
    c.then = (res: any, rej: any) => terminal().then(res, rej);
    return c;
  }
  return {
    db: { select: () => makeChain(), insert: () => makeChain(), update: () => makeChain(), delete: () => makeChain() },
    pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
    usersTable: { id: "id", email: "email", username: "username", passwordHash: "passwordHash",
      gender: "gender", dateOfBirth: "dateOfBirth", name: "name", appleId: "appleId",
      googleId: "googleId", resetTokenHash: "resetTokenHash", resetTokenExpiry: "resetTokenExpiry" },
    companionsTable: {}, messagesTable: {}, memoryNotesTable: {}, dailyUsageTable: {},
  };
});

vi.mock("drizzle-orm", () => ({
  eq: () => "__eq__", or: () => "__or__", and: () => "__and__",
  ilike: () => "__ilike__", sql: () => "__sql__", desc: () => "__desc__",
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

vi.mock("../lib/email.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("openai", () => ({
  default: class { chat = { completions: { create: vi.fn() } }; },
}));

import app from "../app.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function hasRateLimitHeaders(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase().startsWith("ratelimit-"));
}

// ---------------------------------------------------------------------------
// 1. Rate-limit headers are present (confirms middleware is attached)
// ---------------------------------------------------------------------------
describe("Rate-limit headers on auth endpoints", () => {
  it("POST /auth/login exposes RateLimit-* headers", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "x@x.com", password: "pw" });
    expect(hasRateLimitHeaders(res.headers)).toBe(true);
  });

  it("POST /auth/signup exposes RateLimit-* headers", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "x@x.com", password: "pw12345678" });
    expect(hasRateLimitHeaders(res.headers)).toBe(true);
  });

  it("POST /auth/forgot-password exposes RateLimit-* headers", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: "x@x.com" });
    expect(hasRateLimitHeaders(res.headers)).toBe(true);
  });

  it("POST /auth/reset-password exposes RateLimit-* headers", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "abc", password: "password123" });
    expect(hasRateLimitHeaders(res.headers)).toBe(true);
  });

  it("POST /auth/refresh exposes RateLimit-* headers", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "tok" });
    expect(hasRateLimitHeaders(res.headers)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. RateLimit-Limit values match the configured caps
// ---------------------------------------------------------------------------
describe("Rate-limit caps are correctly configured", () => {
  it("auth endpoints have a cap of 20 per window", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "x@x.com", password: "pw" });
    const limitHeader =
      res.headers["ratelimit-limit"] ?? res.headers["x-ratelimit-limit"];
    expect(Number(limitHeader)).toBe(20);
  });

  it("refresh endpoint has a cap of 60 per window", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "tok" });
    const limitHeader =
      res.headers["ratelimit-limit"] ?? res.headers["x-ratelimit-limit"];
    expect(Number(limitHeader)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// 3. 429 behaviour — isolated apps with low max so we don't burn the real app
// ---------------------------------------------------------------------------
describe("Rate limiter blocks after max+1 requests (isolated app)", () => {
  it("authLimiter pattern: returns 429 on the 3rd request when max=2", async () => {
    const testApp = express();
    testApp.use(express.json());
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many attempts. Please try again in 15 minutes." },
    });
    testApp.post("/test", limiter, (_req, res) => res.json({ ok: true }));

    await request(testApp).post("/test").expect(200);
    await request(testApp).post("/test").expect(200);
    const blocked = await request(testApp).post("/test");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain("Too many attempts");
  });

  it("refreshLimiter pattern: returns 429 on the 2nd request when max=1", async () => {
    const testApp = express();
    testApp.use(express.json());
    const limiter = rateLimit({
      windowMs: 60 * 60_000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many refresh attempts. Please try again later." },
    });
    testApp.post("/refresh", limiter, (_req, res) => res.json({ ok: true }));

    await request(testApp).post("/refresh").expect(200);
    const blocked = await request(testApp).post("/refresh");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain("Too many refresh attempts");
  });

  it("blocked response includes RateLimit-Limit and RateLimit-Remaining headers", async () => {
    const testApp = express();
    testApp.use(express.json());
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many attempts." },
    });
    testApp.post("/test", limiter, (_req, res) => res.json({ ok: true }));

    await request(testApp).post("/test").expect(200);
    const blocked = await request(testApp).post("/test");
    expect(blocked.status).toBe(429);
    expect(hasRateLimitHeaders(blocked.headers)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Custom userKey — no req.ip reference so no IPv6 validation error
// ---------------------------------------------------------------------------
describe("userKey generator (authenticated limiter)", () => {
  it("does not throw at startup (no ERR_ERL_KEY_GEN_IPV6 error)", async () => {
    // If the keyGenerator triggered the IPv6 validation error, importing
    // rateLimits.ts would throw and this test file would fail to load.
    // Reaching this assertion proves the module loaded cleanly.
    const mod = await import("../middleware/rateLimits.js");
    expect(mod.chatLimiter).toBeDefined();
    expect(mod.ttsLimiter).toBeDefined();
    expect(mod.transcribeLimiter).toBeDefined();
    expect(mod.backgroundLimiter).toBeDefined();
    expect(mod.authLimiter).toBeDefined();
    expect(mod.refreshLimiter).toBeDefined();
  });
});
