import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Shared mock state — created via vi.hoisted so the vi.mock factories below
// can reference these variables (vi.mock factories are hoisted before imports).
// ---------------------------------------------------------------------------
const { queryResults, bcryptResults, jwtMock } = vi.hoisted(() => {
  const queryResults: any[][] = [];
  const bcryptResults = { hashResult: "hashed-pw", compareResult: true };
  const jwtMock = {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn().mockReturnValue({ sub: "user-id-123" }),
    decode: vi.fn().mockReturnValue(null),
  };
  return { queryResults, bcryptResults, jwtMock };
});

// Drizzle chain — every db method returns the same chain; terminal methods
// consume the next result from the shared queue.
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
    usersTable: { id: "id", email: "email", username: "username", passwordHash: "passwordHash", gender: "gender", dateOfBirth: "dateOfBirth", name: "name", appleId: "appleId", googleId: "googleId", resetTokenHash: "resetTokenHash", resetTokenExpiry: "resetTokenExpiry" },
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

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockImplementation(() => Promise.resolve(bcryptResults.hashResult)),
    compare: vi.fn().mockImplementation(() => Promise.resolve(bcryptResults.compareResult)),
  },
}));

vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

vi.mock("../lib/email.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import app after all mocks are registered
// ---------------------------------------------------------------------------
import app from "../app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function queueResults(...results: any[][]) {
  queryResults.push(...results);
}

function clearQueue() {
  queryResults.length = 0;
}

const VALID_SIGNUP = {
  email: "test@example.com",
  password: "password123",
  name: "Test User",
  username: "testuser",
  gender: "female",
  dateOfBirth: "1998-06-15", // age ~27
};

const MOCK_USER = {
  id: "user-id-123",
  email: "test@example.com",
  name: "Test User",
  username: "testuser",
  gender: "female",
  dateOfBirth: "1998-06-15",
  passwordHash: "hashed-pw",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/auth/signup", () => {
  beforeEach(clearQueue);

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, email: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, password: undefined });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8/);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, name: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it("returns 400 when username is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, username: undefined });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid username format", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, username: "ab" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/3.20/);
  });

  it("returns 400 when gender is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, gender: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gender/i);
  });

  it("returns 400 when dateOfBirth is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, dateOfBirth: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/date of birth/i);
  });

  it("returns 400 for an invalid date of birth", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...VALID_SIGNUP, dateOfBirth: "not-a-date" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid date/i);
  });

  it("returns 403 when user is under 17", async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 16);
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...VALID_SIGNUP, dateOfBirth: dob.toISOString().slice(0, 10) });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/17/);
  });

  it("allows signup at exactly 17 years old", async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 17);
    // No existing user, then insert new user
    queueResults([], [MOCK_USER]);
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...VALID_SIGNUP, dateOfBirth: dob.toISOString().slice(0, 10) });
    expect(res.status).toBe(201);
  });

  it("returns 409 when email is already taken", async () => {
    queueResults([{ ...MOCK_USER }]); // existing user found by email
    const res = await request(app).post("/api/auth/signup").send(VALID_SIGNUP);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/i);
  });

  it("returns 409 when username is already taken", async () => {
    const existing = { ...MOCK_USER, email: "other@example.com", username: "testuser" };
    queueResults([existing]); // existing user found by username
    const res = await request(app).post("/api/auth/signup").send(VALID_SIGNUP);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username/i);
  });

  it("returns 201 with tokens and user on success", async () => {
    queueResults([], [MOCK_USER]); // no existing user, then inserted user
    const res = await request(app).post("/api/auth/signup").send(VALID_SIGNUP);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.user).toMatchObject({ id: "user-id-123", email: "test@example.com" });
  });

  it("includes gender and dateOfBirth in returned user", async () => {
    queueResults([], [MOCK_USER]);
    const res = await request(app).post("/api/auth/signup").send(VALID_SIGNUP);
    expect(res.status).toBe(201);
    expect(res.body.user.gender).toBe("female");
    expect(res.body.user.dateOfBirth).toBe("1998-06-15");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(clearQueue);

  it("returns 400 when identifier is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "pass1234" });
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not found", async () => {
    queueResults([]); // no user
    const res = await request(app).post("/api/auth/login").send({ identifier: "nobody@x.com", password: "pass1234" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("returns 401 when password is wrong", async () => {
    bcryptResults.compareResult = false;
    queueResults([MOCK_USER]);
    const res = await request(app).post("/api/auth/login").send({ identifier: "test@example.com", password: "wrongpass" });
    expect(res.status).toBe(401);
    bcryptResults.compareResult = true;
  });

  it("returns 200 with tokens on valid credentials", async () => {
    bcryptResults.compareResult = true;
    queueResults([MOCK_USER]);
    const res = await request(app).post("/api/auth/login").send({ identifier: "test@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("accepts username as identifier", async () => {
    bcryptResults.compareResult = true;
    queueResults([MOCK_USER]);
    const res = await request(app).post("/api/auth/login").send({ identifier: "testuser", password: "password123" });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/refresh", () => {
  beforeEach(clearQueue);

  it("returns 400 when refreshToken is missing", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 when jwt.verify throws", async () => {
    jwtMock.verify.mockImplementationOnce(() => { throw new Error("invalid"); });
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "bad.token" });
    expect(res.status).toBe(401);
  });

  it("returns 401 when user no longer exists", async () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "ghost-id" });
    queueResults([]); // user not found
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "valid.token" });
    expect(res.status).toBe(401);
  });

  it("returns 200 with new tokens on success", async () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "user-id-123" });
    queueResults([{ id: "user-id-123" }]);
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "valid.token" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(clearQueue);

  it("returns 401 without a bearer token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 200 with user data when authenticated", async () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "user-id-123" });
    queueResults([MOCK_USER]);
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer mock.token");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test@example.com");
  });

  it("includes gender and dateOfBirth", async () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "user-id-123" });
    queueResults([MOCK_USER]);
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer mock.token");
    expect(res.body.gender).toBe("female");
    expect(res.body.dateOfBirth).toBe("1998-06-15");
  });
});

describe("DELETE /api/auth/account", () => {
  beforeEach(clearQueue);

  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/api/auth/account");
    expect(res.status).toBe(401);
  });

  it("returns 200 and deletes account when authenticated", async () => {
    jwtMock.verify.mockReturnValueOnce({ sub: "user-id-123" });
    queueResults([]); // delete op
    const res = await request(app).delete("/api/auth/account").set("Authorization", "Bearer mock.token");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("POST /api/auth/forgot-password", () => {
  beforeEach(clearQueue);

  it("always returns 200 (timing-safe response)", async () => {
    queueResults([]); // user not found
    const res = await request(app).post("/api/auth/forgot-password").send({ identifier: "nobody@x.com" });
    expect(res.status).toBe(200);
  });

  it("returns 400 when identifier is missing", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });
});
