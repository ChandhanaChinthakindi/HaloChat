import rateLimit from "express-rate-limit";
import type { Request } from "express";

// Key on authenticated user ID so IP-sharing (VPN, office) doesn't bleed across accounts.
// requireAuth runs before every limiter so userId is always set; fallback is defensive only.
const userKey = (req: Request): string => (req as any).userId ?? "unauthenticated";

// Brute-force protection for unauthenticated auth endpoints.
// Uses the default IP-based key (express-rate-limit handles IPv6 normalisation internally).
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// Slightly looser limit for token refresh — legitimate clients refresh on every app open.
export const refreshLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh attempts. Please try again later." },
});

const limitReached = (msg: string) =>
  (_req: Request, res: any) => res.status(429).json({ error: msg });

// Streaming chat — 30 messages/min is generous for normal use (~1 every 2 s)
export const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyGenerator: userKey,
  handler: limitReached("Too many messages. Please wait a moment before sending another."),
  standardHeaders: true,
  legacyHeaders: false,
});

// TTS — each call generates and streams audio; 20/min is plenty
export const ttsLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: userKey,
  handler: limitReached("Too many voice requests. Please wait before generating more audio."),
  standardHeaders: true,
  legacyHeaders: false,
});

// Whisper transcription — most expensive per-call; 15/min is comfortable for voice messages
export const transcribeLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  keyGenerator: userKey,
  handler: limitReached("Too many transcription requests. Please wait a moment."),
  standardHeaders: true,
  legacyHeaders: false,
});

// Background/passive endpoints (summarize, extract-memory, generate-checkin)
// These are triggered automatically, not by the user typing, so lower ceiling is fine
export const backgroundLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: userKey,
  handler: limitReached("Too many background requests. Please wait a moment."),
  standardHeaders: true,
  legacyHeaders: false,
});
