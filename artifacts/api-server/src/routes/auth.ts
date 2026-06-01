import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { sendPasswordResetEmail } from "../lib/email";
import { requireAuth, JWT_SECRET, JWT_REFRESH_SECRET } from "../middleware/auth";
import { authLimiter, refreshLimiter } from "../middleware/rateLimits";

// ── Apple JWKS verification ──────────────────────────────────────────────────

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_BUNDLE_ID = process.env["APPLE_BUNDLE_ID"] ?? "com.halochat.app";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

interface AppleJWK { kid: string; kty: string; n: string; e: string; [k: string]: unknown }
let _appleKeysCache: { keys: AppleJWK[]; fetchedAt: number } | null = null;

async function getApplePublicKey(kid: string): Promise<string> {
  const now = Date.now();
  if (!_appleKeysCache || now - _appleKeysCache.fetchedAt > 60 * 60 * 1000) {
    const res = await fetch(APPLE_JWKS_URL);
    if (!res.ok) throw new Error("Failed to fetch Apple JWKS");
    const { keys } = await res.json() as { keys: AppleJWK[] };
    _appleKeysCache = { keys, fetchedAt: now };
  }
  const jwk = _appleKeysCache.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error(`Apple public key not found for kid: ${kid}`);
  const pubKey = crypto.createPublicKey({ key: jwk as any, format: "jwk" });
  return pubKey.export({ type: "spki", format: "pem" }) as string;
}

async function verifyAppleToken(identityToken: string): Promise<{ sub: string; email?: string }> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw new Error("Malformed Apple identity token");
  }
  const pem = await getApplePublicKey(decoded.header.kid);
  const payload = jwt.verify(identityToken, pem, {
    algorithms: ["RS256"],
    issuer: APPLE_ISSUER,
    audience: APPLE_BUNDLE_ID,
  }) as { sub?: string; email?: string };
  if (!payload.sub) throw new Error("Missing sub in Apple token");
  return { sub: payload.sub, email: payload.email?.toLowerCase() };
}

const APP_SCHEME = process.env["APP_SCHEME"] ?? "halochat";

const router = Router();

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(userId: string, version: number): string {
  return jwt.sign({ sub: userId, rtv: version }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

function userPayload(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    gender: user.gender ?? null,
    dateOfBirth: user.dateOfBirth ?? null,
  };
}

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// POST /auth/signup
router.post("/auth/signup", authLimiter, async (req, res) => {
  const { email, password, name, gender, dateOfBirth } = req.body as {
    email?: string; password?: string; name?: string;
    gender?: string; dateOfBirth?: string;
  };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const pwError = validatePassword(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }
  if (!gender?.trim()) {
    res.status(400).json({ error: "Gender is required" });
    return;
  }
  if (!dateOfBirth?.trim()) {
    res.status(400).json({ error: "Date of birth is required" });
    return;
  }
  const dobDate = new Date(dateOfBirth);
  if (isNaN(dobDate.getTime())) {
    res.status(400).json({ error: "Invalid date of birth" });
    return;
  }
  const age = calcAge(dateOfBirth);
  if (age < 17) {
    res.status(403).json({ error: "You must be at least 17 years old to create an account" });
    return;
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, emailLower));

    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 14);
    const [user] = await db
      .insert(usersTable)
      .values({ email: emailLower, passwordHash, name: name?.trim() ?? "", gender: gender.trim(), dateOfBirth })
      .returning();

    res.status(201).json({
      user: userPayload(user),
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id, user.refreshTokenVersion ?? 0),
    });
  } catch (err) {
    logger.error({ err }, "Signup error");
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /auth/login
router.post("/auth/login", authLimiter, async (req, res) => {
  const { identifier, password } = req.body as { identifier?: string; password?: string };

  if (!identifier?.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const id = identifier.trim().toLowerCase();

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, id));

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.json({
      user: userPayload(user),
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id, user.refreshTokenVersion ?? 0),
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/apple — Sign in with Apple
router.post("/auth/apple", async (req, res) => {
  const { identityToken, fullName } = req.body as { identityToken?: string; fullName?: string };

  if (!identityToken) {
    res.status(400).json({ error: "identityToken required" });
    return;
  }

  try {
    const { sub: appleId, email } = await verifyAppleToken(identityToken);

    // Find existing Apple user
    let [user] = await db.select().from(usersTable).where(eq(usersTable.appleId, appleId));

    if (!user) {
      if (email) {
        // Link Apple ID to an existing email account if present
        const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (byEmail) {
          [user] = await db
            .update(usersTable)
            .set({ appleId })
            .where(eq(usersTable.id, byEmail.id))
            .returning();
        }
      }

      if (!user) {
        [user] = await db
          .insert(usersTable)
          .values({ email: email ?? null, appleId, name: fullName?.trim() || null })
          .returning();
      }
    }

    res.json({
      user: userPayload(user),
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id, user.refreshTokenVersion ?? 0),
    });
  } catch (err: any) {
    const isTokenError = err?.message?.includes("jwt") || err?.message?.includes("token") || err?.message?.includes("Apple");
    logger.error({ err }, "Apple auth error");
    res.status(isTokenError ? 401 : 500).json({ error: isTokenError ? "Invalid Apple identity token" : "Authentication failed" });
  }
});

// POST /auth/google — Sign in with Google
router.post("/auth/google", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };

  if (!accessToken) {
    res.status(400).json({ error: "accessToken required" });
    return;
  }

  try {
    const r = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
    if (!r.ok) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }
    const info = await r.json() as { sub?: string; email?: string; name?: string; given_name?: string };

    const googleId = info.sub;
    if (!googleId) {
      res.status(400).json({ error: "Could not get Google user ID" });
      return;
    }

    const email = info.email?.toLowerCase() ?? null;
    const name = (info.name || info.given_name || null) as string | null;

    // Try to find user by googleId first, then by email
    const conditions = email
      ? or(eq(usersTable.googleId, googleId), eq(usersTable.email, email))
      : eq(usersTable.googleId, googleId);
    let [user] = await db.select().from(usersTable).where(conditions);

    if (!user) {
      [user] = await db.insert(usersTable).values({ googleId, email, name }).returning();
    } else if (!user.googleId) {
      // Link Google ID to existing email account
      [user] = await db.update(usersTable).set({ googleId }).where(eq(usersTable.id, user.id)).returning();
    }

    res.json({
      user: userPayload(user),
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id, user.refreshTokenVersion ?? 0),
    });
  } catch (err) {
    logger.error({ err }, "Google auth error");
    res.status(500).json({ error: "Authentication failed" });
  }
});

// POST /auth/forgot-password — send a reset email
router.post("/auth/forgot-password", authLimiter, async (req, res) => {
  const { identifier } = req.body as { identifier?: string };
  if (!identifier?.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Always return 200 to avoid leaking which accounts are registered
  res.json({ message: "If that account exists you'll receive a reset link shortly." });

  try {
    const id = identifier.trim().toLowerCase();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, id));
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.update(usersTable)
      .set({ resetTokenHash: tokenHash, resetTokenExpiry: expiry })
      .where(eq(usersTable.id, user.id));

    const resetUrl = `${APP_SCHEME}://auth/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email!, resetUrl);
  } catch (err) {
    logger.error({ err }, "Forgot password error");
  }
});

// POST /auth/reset-password — validate token and set new password
router.post("/auth/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }
  const pwError2 = validatePassword(password);
  if (pwError2) {
    res.status(400).json({ error: pwError2 });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.resetTokenHash, tokenHash));

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      res.status(400).json({ error: "Reset link is invalid or has expired. Please request a new one." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 14);
    await db.update(usersTable)
      .set({ passwordHash, resetTokenHash: null, resetTokenExpiry: null })
      .where(eq(usersTable.id, user.id));

    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    logger.error({ err }, "Reset password error");
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// POST /auth/refresh — validate version, rotate both tokens
router.post("/auth/refresh", refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: string; rtv?: number };
    const [user] = await db
      .select({ id: usersTable.id, refreshTokenVersion: usersTable.refreshTokenVersion })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub));

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Reject if version doesn't match — token was already rotated or is stale
    const tokenVersion = payload.rtv ?? 0;
    if (tokenVersion !== (user.refreshTokenVersion ?? 0)) {
      res.status(401).json({ error: "Refresh token already used" });
      return;
    }

    // Increment version so this token can never be used again
    const newVersion = (user.refreshTokenVersion ?? 0) + 1;
    await db.update(usersTable).set({ refreshTokenVersion: newVersion }).where(eq(usersTable.id, user.id));

    res.json({
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id, newVersion),
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(userPayload(user));
  } catch (err) {
    logger.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /auth/account — deletes user + all data via cascade
router.delete("/auth/account", requireAuth, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.userId!));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete account error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
