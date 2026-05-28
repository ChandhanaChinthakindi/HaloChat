/**
 * Unit tests for Express middleware:
 *   - requireAuth
 *   - dailyLimit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
const { queryResults, jwtMock } = vi.hoisted(() => {
  const queryResults: any[][] = [];
  const jwtMock = {
    sign: vi.fn().mockReturnValue("tok"),
    verify: vi.fn().mockReturnValue({ sub: "user-id" }),
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
  sql: () => "__sql__",
  unique: () => ({ on: () => "__unique__" }),
}));

vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

import { requireAuth } from "../middleware/auth.js";
import { dailyLimit } from "../middleware/dailyLimit.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function queueResults(...results: any[][]) { queryResults.push(...results); }
function clearQueue() { queryResults.length = 0; }

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    userId: undefined,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _body: any } {
  const res: any = {};
  res._status = 200;
  res._body = null;
  res.status = vi.fn().mockImplementation((code: number) => { res._status = code; return res; });
  res.json = vi.fn().mockImplementation((body: any) => { res._body = body; return res; });
  res.setHeader = vi.fn();
  return res;
}

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------
describe("requireAuth middleware", () => {
  beforeEach(() => { clearQueue(); });

  it("rejects with 401 when Authorization header is absent", () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res as any, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects with 401 when header does not start with 'Bearer '", () => {
    const req = mockReq({ headers: { authorization: "Token abc" } });
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res as any, next);

    expect(res._status).toBe(401);
  });

  it("rejects with 401 when JWT verification throws", () => {
    jwtMock.verify.mockImplementationOnce(() => { throw new Error("bad token"); });
    const req = mockReq({ headers: { authorization: "Bearer bad.token" } });
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res as any, next);

    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/invalid|expired/i);
  });

  it("calls next() and sets req.userId on a valid token", () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "user-abc" });
    const req = mockReq({ headers: { authorization: "Bearer valid.token" } });
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe("user-abc");
  });
});

// ---------------------------------------------------------------------------
// dailyLimit
// ---------------------------------------------------------------------------
describe("dailyLimit middleware", () => {
  beforeEach(() => { clearQueue(); });

  it("calls next() immediately when userId is not set", async () => {
    const req = mockReq({ body: { companionId: "comp-1" } });
    const res = mockRes();
    const next = vi.fn();

    await dailyLimit(req as any, res as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("calls next() when no companionId is present (skips tracking)", async () => {
    const req = mockReq({ body: {} });
    (req as any).userId = "user-1";
    const res = mockRes();
    const next = vi.fn();

    await dailyLimit(req as any, res as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows the request and increments the counter when under the limit", async () => {
    queueResults([{ requests: 10 }], []); // usage row + upsert
    const req = mockReq({ body: { companionId: "comp-1" } });
    (req as any).userId = "user-1";
    const res = mockRes();
    const next = vi.fn();

    await dailyLimit(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith("X-Daily-Requests-Limit", 200);
  });

  it("blocks with 429 when the daily limit is reached", async () => {
    queueResults([{ requests: 200 }]); // at limit
    const req = mockReq({ body: { companionId: "comp-1" } });
    (req as any).userId = "user-1";
    const res = mockRes();
    const next = vi.fn();

    await dailyLimit(req as any, res as any, next);

    expect(res._status).toBe(429);
    expect(res._body.error).toBe("DAILY_LIMIT_REACHED");
    expect(next).not.toHaveBeenCalled();
  });

  it("starts from zero when no usage row exists yet (first request today)", async () => {
    queueResults([], []); // no row → inserts fresh row
    const req = mockReq({ body: { companionId: "comp-1" } });
    (req as any).userId = "user-1";
    const res = mockRes();
    const next = vi.fn();

    await dailyLimit(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("fails open (calls next) when a DB error occurs", async () => {
    queryResults.push(Promise.reject(new Error("db down")) as any);
    const req = mockReq({ body: { companionId: "comp-1" } });
    (req as any).userId = "user-1";
    const res = mockRes();
    const next = vi.fn();

    await dailyLimit(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
