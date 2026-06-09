# HaloChat — AI Companion App

HaloChat is an iOS app that lets you build meaningful relationships with personalised AI companions. Each companion has a distinct personality, voice, and style — it remembers what you share, evolves its tone as the relationship deepens, and is always available to chat or voice call.

---

## Recent Changes (v2.0 — June 2026)

### Breathing Pattern

- **4-4-4 pattern** — Breathing exercise changed to equal-ratio box breathing (inhale 4s, hold 4s, exhale 4s); subtitle, in-session pattern chip, and actual timer all consistent

### Explore Screen
- **Staggered card entrance** — Personality cards spring in from below with 90 ms staggered delays (index × 90 ms) on mount, giving the screen a premium reveal feel
- **Animated header** — Header fades + slides down on mount
- **Pulsing hint** — "Tap a card to begin" breathes with a looping opacity animation instead of being static text
- **"Best for" line** — Each card now shows a one-line contextual descriptor ("When you need to vent", "When you want realness", etc.) below the tagline
- **"Help me choose" panel** — New "Not sure? Help me choose →" trigger below the cards; expands a floating panel with 4 plain-language option rows (one per type) that each route directly to `/create?type=X`; panel is absolutely positioned so it never changes card size; cards dim and become non-interactive while the panel is open

### Create Wizard
- **Slide transition** — Steps slide left/right (direction-aware) as the user navigates forward and back, instead of the previous opacity-only fade
- **Segmented progress indicator** — The thin bar is replaced with individual pill segments per step; the active step's name label appears below its segment
- **Waveform animation** — Voice preview cards show 5 animated bars during audio playback instead of a static stop icon
- **"✨ Surprise me" button** — Randomly selects 3 traits in the Vibe step
- **Voice descriptors** — Each voice card shows a one-word descriptor (Warm, Bright, Mellow, Deep, Crisp, Rich) so users know what to expect before previewing
- **Type auto-advance** — Selecting a personality type in the wizard auto-advances to the next step after 220 ms (saves a tap)
- **Name character counter** — Shows "12 / 30" right-aligned below the input as the user types; turns accent colour near the 30-character limit
- **Preview hero breathes** — The companion hero card on the Preview step gently pulses with a 1.2 % scale animation
- **Single back button** — Removed the redundant back arrow in the footer; back navigation is handled by the header chevron only
- **Gender-strict avatar filter** — Avatar picker now shows only the gender-matching avatars (male → 4M, female → 4F); non-binary and unset show all 8; switching gender resets the selected avatar
- **Voice "Continue" button** — The Next button on the Voice step always shows "Continue" (not "Skip") since a default voice is always pre-selected
- **`autoCapitalize="words"`** on the name input

### Visual Polish
- **`label` colour token** — New `colors.label` (`#7A6252` light / `#C4A898` dark) — warmer and slightly richer than `mutedForeground`; applied to eyebrow text ("Create a companion"), step hints, step counter, pulsing hint, and "Help me choose" trigger

### Previous (v1.9)

- **"Halo" ambient background** — Global animated background rendered at z-index −1 behind every screen via `HaloBackground` in root layout. Four slowly-breathing gradient orbs (one per companion type: rose, sage, violet, amber) independently scale (0.88 → 1.12) and fade with staggered delays so they are never in sync. Dark mode gets 60 % opacity.

### Previous (v1.8)

- **Chat bubbles** — User bubble uses companion gradient; companion bubble uses ultra-light gradient tint (~5 % opacity wash); companion mini-avatar shows real photo; softer shadows, larger radii
- **TypeCard** — Full gradient background card with large emoji, white text, premium shadow; affects Explore + Create wizard type step
- **Explore screen** — Full-width TypeCards; "Who do you need right now?" header
- **Settings** — Gradient icon circles; profile card has gradient header strip + avatar overlap
- **Create wizard** — Larger step question (26 px), centered input with shadow, premium gender cards and trait chips with shadows

### Previous (v1.7)

- **CompanionCard** — Full-bleed portrait photo in 2-column grid; name/type overlaid on dark gradient; bond bar + streak/waiting indicators
- **Home screen** — Greeting header (Good morning/evening), 2-column FlatList grid, gradient add button
- **Activities screen** — Cards with soft gradient tint, gradient icon with shadow, duration/streak/done pills, compact progress pill in header

### Previous (v1.6)

- **Replika-style profile page** — Avatar fills top 62 % of screen; name, type badge, and edit button overlaid on gradient-darkened bottom; scrollable stats/memories/mood/actions below
- **Create wizard avatar picker** — Large swipe-to-browse portrait cards with gender-filtered display

### Previous (v1.5)

- **Uplift companion type** — Replaced Motivator with Uplift (self-affirmation, violet→pink gradient, ✨); detects and reframes inner-critic language; voice: shimmer
- **`[STRENGTH]` memory category** — 5th memory type (bond weight +5); highlights acts of courage and resilience; surfaced when user is doubting themselves
- **Affirmation Builder activity** — User fills 3 prompts; companion generates 3 personalised affirmations in gradient cards

### Previous (v1.4)

- **Avatar system** — `constants/avatars.ts` defines 8 avatar slots (4F, 4M); `components/AvatarImage.tsx` is the single display component used across all screens; "Face" step in create wizard with swipeable portrait cards; `avatarId` stored per-companion

### Previous (v1.3)

- **Personality Evolution** — Bond milestones (20/40/60/80) show an animated celebration card with unlocked-behavior reveal; companion sends an in-chat acknowledgment in its own voice; fires once per tier

### Previous (v1.2)

- **Activities tab** — Dedicated bottom nav tab with 5 daily wellbeing practices (Check-in, Breathing, Journal, Gratitude, Goal Check-in); per-day completion + streak tracking in AsyncStorage
- **Deep Memory system** — Notes categorised into `[FACT]`, `[EMOTION]`, `[TOPIC]`, `[MOMENT]`, `[STRENGTH]`; bond weights vary by category; grouped block injected into every system prompt
- **Memories screen** — Colour-coded categorical sections with icon, colour, and count badge

### Previous (v1.1)

- **Dynamic AI response length** — Reply length scales with message length (short/medium/long inputs → 1–2 / 2–3 / 3–6 sentence replies)
- **Companion waiting indicator** — Pulsing olive dot after 4 h inactivity
- **Per-companion voice selection** — Voice picker with gender filter and live audio preview
- **Mood tracking** — 5-emoji check-in on chat exit; 7-day sparkline in companion profile
- **Keyboard-aware layouts** — Chat input and wizard footer animate with the keyboard
- **Animated loading screen** — App icon, title, and cycling role tagline on launch

### Previous (v1.0)

- Username uniqueness check, name collection in onboarding, offline error state, memory optimistic updates, cron job idempotency, call screen loading state, light theme default, 161-test suite

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture Overview](#architecture-overview)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Screens & Navigation](#screens--navigation)
10. [State Management](#state-management)
11. [Companion Personalities](#companion-personalities)
12. [Avatar System](#avatar-system)
13. [Activities System](#activities-system)
14. [Voice Call Architecture](#voice-call-architecture)
15. [Memory System](#memory-system)
16. [Relationship Progression](#relationship-progression)
17. [Push Notifications](#push-notifications)
18. [Authentication](#authentication)
19. [Content Safety](#content-safety)
20. [Rate Limiting & Usage Caps](#rate-limiting--usage-caps)
21. [Deployment](#deployment)

---

## Features

| Feature | Description |
|---|---|
| **4 Companion Personalities** | Romantic, Supportive, Uplift, Best Friend — each with a distinct voice, gradient, and system prompt |
| **Streaming Chat** | Responses stream token-by-token via SSE; multi-part replies shown with typing indicator between parts |
| **Dynamic Response Length** | AI reply length mirrors the user's message — short input gets a short reply; long input gets a fuller response |
| **Voice Calls** | Full turn-based voice loop: record speech → Whisper transcription → AI reply → TTS playback → repeat |
| **Voice Messages** | In-chat audio recording sent to Whisper; transcript sent as a text message |
| **Per-Companion Voice** | Select a TTS voice (Nova, Shimmer, Fable, Onyx, Echo, Alloy) during creation; voices filtered by companion gender with live audio preview |
| **Deep Memory** | Notes extracted into 5 categories (Facts, Emotions, Topics, Moments, Strengths) with weighted bond increments; rich grouped block injected into every system prompt |
| **Activities Tab** | 3 streak-tracked daily practices (Breathing 4-4-4, Journal Prompt, Gratitude) + Mood Canvas (2D colour-gradient drag to one of 9 named emotional states, shareable with a companion) |
| **Avatar System** | 8 pre-bundled face portraits (4F, 4M); gender-filtered picker in the create wizard; graceful gradient-circle fallback |
| **Mood Tracking** | 5-emoji check-in on chat exit; 7-day mood history sparkline in companion profile |
| **Relationship Progression** | Bond score (0–100) grows with meaningful exchanges; shifts companion tone through 5 tiers (New → Acquaintance → Friends → Close → Bonded) |
| **Personality Evolution** | Milestone celebrations at bond 20/40/60/80 with unlocked-behavior reveal; companion sends in-chat acknowledgment; fires once per tier |
| **Waiting Indicator** | Companion cards show a pulsing dot after 4 h inactivity to prompt re-engagement |
| **Push Notifications** | Personalised check-ins when away 4+ hours (local scheduled + server cron via Expo push) |
| **Age-Aware Responses** | Strict content mode for users ≤19; relaxed mode for users ≥25 |
| **Daily Usage Limits** | Per-user per-companion request caps tracked in the database for cost control |
| **Multi-Auth** | Email/password, Apple Sign-In, Google OAuth; JWT access + refresh token rotation |
| **Password Reset** | Secure email-based reset flow via Resend |
| **Message Search** | Full-text search through conversation history |
| **Streak System** | Daily consecutive-use tracking per companion |
| **HaloBackground** | Ambient animated gradient orbs rendered behind every screen for a living, atmospheric feel |

---

## Tech Stack

### Mobile App (`artifacts/halochat`)

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router v6 (file-based, similar to Next.js) |
| UI Animations | React Native Reanimated 4 (JSI, 60 fps) |
| Gestures | React Native Gesture Handler 2.28 |
| Keyboard | react-native-keyboard-controller |
| Audio | expo-av (recording + playback) |
| Images | expo-image (fast cached image component) |
| Gradients | expo-linear-gradient |
| Haptics | expo-haptics |
| Notifications | expo-notifications |
| Secure Storage | expo-secure-store (iOS Keychain / Android Keystore) |
| Local Storage | @react-native-async-storage/async-storage |
| Type Validation | Zod |
| Language | TypeScript 5.9 |

### API Server (`artifacts/api-server`)

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM modules) |
| Framework | Express 5 |
| AI Models | OpenAI — GPT-4o-mini (chat), TTS-1 (voice), Whisper-1 (transcription) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (bcryptjs + jsonwebtoken) |
| Security | Helmet, express-rate-limit, CORS |
| Email | Resend |
| Push | Expo Server SDK |
| Logging | Pino (structured JSON) |
| Background Jobs | node-cron |
| Build | esbuild |
| Tests | Vitest |
| Deploy | Railway (Docker container) |

### Shared Libraries (`lib/`)

| Package | Purpose |
|---|---|
| `@workspace/db` | Drizzle ORM schema + connection pool |
| `@workspace/api-zod` | Shared Zod validation schemas |
| `@workspace/api-spec` | API type definitions (orval codegen) |
| `@workspace/api-client-react` | Typed React hooks (TanStack Query v5) |
| `@workspace/integrations-openai-ai-server` | OpenAI integration utilities |

---

## Project Structure

```
Halo-Chat/
├── artifacts/
│   ├── halochat/                        # Expo mobile application
│   │   ├── app/                         # Expo Router screens (file-based routes)
│   │   │   ├── _layout.tsx              # Root layout — providers, HaloBackground, theme
│   │   │   ├── index.tsx                # Root redirect (auth check)
│   │   │   ├── onboarding.tsx           # First-launch onboarding flow
│   │   │   ├── create.tsx               # Companion creation wizard (7-step)
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx          # Tab bar definition
│   │   │   │   ├── index.tsx            # Companions list (home)
│   │   │   │   ├── explore.tsx          # Explore & choose companion type
│   │   │   │   ├── activities.tsx       # Daily activities hub
│   │   │   │   └── settings.tsx         # User settings & preferences
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── signup.tsx
│   │   │   │   ├── forgot-password.tsx
│   │   │   │   └── reset-password.tsx
│   │   │   ├── activity/
│   │   │   │   └── [type].tsx           # Individual activity screen (breathing, journal, etc.)
│   │   │   ├── chat/[id].tsx            # Chat screen
│   │   │   ├── call/[id].tsx            # Voice call screen
│   │   │   ├── profile/[id].tsx         # Companion profile & editor
│   │   │   └── memories/[id].tsx        # Memory notes viewer
│   │   │
│   │   ├── components/
│   │   │   ├── AvatarImage.tsx          # Single avatar display component (photo or gradient fallback)
│   │   │   ├── ChatBubble.tsx           # Gradient chat bubble with avatar
│   │   │   ├── CompanionCard.tsx        # Home screen companion grid card
│   │   │   ├── HaloBackground.tsx       # Ambient animated gradient orbs (rendered behind all screens)
│   │   │   ├── KeyboardAwareScrollViewCompat.tsx
│   │   │   ├── MoodCanvas.tsx           # Bilinear mood drag canvas
│   │   │   └── TypeBadge.tsx            # Personality type card/badge
│   │   │
│   │   ├── constants/
│   │   │   ├── avatars.ts               # 8 avatar definitions (id, gender, label, source)
│   │   │   └── colors.ts                # Full light/dark colour palette including label token
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx          # Auth state, token lifecycle
│   │   │   ├── CompanionContext.tsx     # Companions, messages, memory, COMPANION_TYPES map
│   │   │   └── ThemeContext.tsx         # Light/dark theme preference
│   │   │
│   │   ├── hooks/
│   │   │   └── useColors.ts             # Theme-aware colour palette hook
│   │   │
│   │   ├── utils/
│   │   │   ├── chatUtils.ts             # Message splitting, mood detection, date formatting
│   │   │   ├── haptics.ts               # Haptic feedback wrappers
│   │   │   └── notifications.ts         # Push notification scheduling
│   │   │
│   │   ├── assets/
│   │   │   ├── avatars/                 # PNG face portraits (f1–f4, m1–m4)
│   │   │   └── backgrounds/             # Background assets
│   │   │
│   │   ├── metro.config.js              # pnpm symlink resolver (extraNodeModules)
│   │   ├── app.json                     # Expo configuration (newArchEnabled: true)
│   │   └── ios/                         # Xcode project (native iOS)
│   │
│   └── api-server/                      # Express API server
│       └── src/
│           ├── index.ts                 # Entry point — mounts routes & middleware
│           ├── routes/
│           │   ├── auth.ts              # Authentication endpoints
│           │   ├── companion.ts         # AI chat, TTS, transcription, memory extraction
│           │   ├── companions-db.ts     # Companion CRUD, messages, mood logs
│           │   └── notifications.ts     # Push token registration
│           ├── middleware/
│           │   ├── auth.ts              # requireAuth (JWT validation)
│           │   ├── dailyLimit.ts        # Per-companion daily request cap
│           │   └── rateLimits.ts        # Per-endpoint rate limiters
│           ├── jobs/
│           │   └── checkin.ts           # Hourly check-in notification cron
│           └── lib/
│               ├── logger.ts            # Pino logger
│               ├── email.ts             # Resend email templates
│               └── push.ts             # Expo Server SDK wrapper
│
├── lib/                                 # Shared workspace packages
│   ├── db/src/schema/index.ts           # Drizzle table definitions (single source of truth)
│   ├── api-zod/
│   ├── api-spec/
│   └── api-client-react/
│
├── docs/
│   ├── PROJECT_DOCUMENTATION.md        # Business case, personas, marketing, roadmap
│   ├── PRIVACY_POLICY.md               # GDPR/CCPA-compliant privacy policy
│   └── TERMS_AND_CONDITIONS.md         # App Store T&C, age-gating, disclaimers
│
├── README.md                            # This file
├── replit.md                            # Quick developer reference
├── package.json                         # Root workspace config
├── pnpm-workspace.yaml                  # pnpm workspace + version catalog
└── railway.toml                         # Railway Docker deployment config
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Expo Mobile App                        │
│                                                             │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ AuthContext │  │ CompanionContext  │  │ ThemeContext   │  │
│  │  JWT tokens │  │ companions, msgs  │  │ light / dark   │  │
│  │ Keychain    │  │ memory, bond      │  │ AsyncStorage   │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
│                                                             │
│  Screens: home, explore, chat, call, profile, activities    │
│  HaloBackground (z-index -1, behind every screen)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / SSE
┌──────────────────────────▼──────────────────────────────────┐
│                    Express API Server                       │
│                                                             │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │  Auth    │  │  Companion    │  │   Companions (CRUD)  │  │
│  │  Routes  │  │  AI Routes    │  │   + Messages/Mood    │  │
│  └────┬─────┘  └──────┬────────┘  └──────────┬───────────┘  │
│       │               │                       │              │
│  ┌────▼───────────────▼───────────────────────▼──────────┐  │
│  │              Middleware Layer                          │  │
│  │   requireAuth  │  dailyLimit  │  rateLimits            │  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────▼─────────────────────────────┐  │
│  │            Drizzle ORM + PostgreSQL                    │  │
│  │   users │ companions │ messages │ memory_notes         │  │
│  │   mood_logs │ daily_usage                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  Background: node-cron hourly check-in job                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼───────────┐
              │      OpenAI APIs       │
              │  GPT-4o-mini  (chat)   │
              │  TTS-1        (voice)  │
              │  Whisper-1    (stt)    │
              └────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (local or Railway)
- OpenAI API key

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the API server

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Fill in the required values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/halochat
OPENAI_API_KEY=sk-...
JWT_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<different random 64-char string>
PORT=3000
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Run database migrations

```bash
DATABASE_URL="postgresql://..." pnpm run push
```

### 4. Start the API server (dev mode with watch)

```bash
pnpm --filter @workspace/api-server run dev
```

Or build + run in production mode:

```bash
cd artifacts/api-server
pnpm run build
node --env-file=.env --enable-source-maps dist/index.mjs
```

Verify with:

```bash
curl http://localhost:3000/api/healthz
```

### 5. Configure the mobile app

```bash
# artifacts/halochat/.env
EXPO_PUBLIC_DOMAIN=http://<your-local-network-ip>:3000
```

Use your machine's local network IP (not `localhost`) — the physical device cannot reach `localhost` on the host machine.

### 6. Start the Expo app

```bash
cd artifacts/halochat

# iOS Simulator
pnpm exec expo run:ios

# Physical iPhone (recommended for audio features)
pnpm exec expo run:ios --device

# Android
pnpm exec expo run:android
```

> **Note:** `expo-speech` and other native modules require a native build (`expo run:ios`). They will not work in Expo Go.

---

## Environment Variables

### API Server (`artifacts/api-server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key (chat, TTS, Whisper) |
| `JWT_SECRET` | Yes | Secret for signing access tokens (15-min expiry) |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens (30-day expiry) |
| `PORT` | Yes | Server port (e.g. `3000`) |
| `RESEND_API_KEY` | Yes | Resend API key for password reset emails |
| `FROM_EMAIL` | Yes | Sender address (e.g. `noreply@yourdomain.com`) |
| `APP_SCHEME` | No | Deep link scheme (e.g. `halochat`) |
| `CORS_ORIGIN` | No | Allowed CORS origin for web clients |
| `DAILY_COMPANION_LIMIT` | No | Max AI requests/day/companion (default: `200`) |
| `NODE_ENV` | No | Set to `production` on Railway |
| `APPLE_BUNDLE_ID` | No | `com.halochat.app` (required for Apple Sign-In verification) |

### Mobile App (`artifacts/halochat/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_DOMAIN` | Yes | Base URL of the API server (e.g. `http://192.168.1.x:3000`) |

---

## Database Schema

All tables are defined in `lib/db/src/schema/index.ts` using Drizzle ORM.

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `email` | text, unique | |
| `passwordHash` | text, nullable | bcrypt hash; null for OAuth-only accounts |
| `appleId` | text, unique, nullable | Apple Sign-In subject identifier |
| `googleId` | text, unique, nullable | Google OAuth subject identifier |
| `name` | text | Display name (set during onboarding) |
| `username` | text, unique | Unique handle (set during signup) |
| `gender` | text, nullable | User-reported gender |
| `dateOfBirth` | text, nullable | ISO date string (used for age-aware responses) |
| `pushToken` | text, nullable | Expo push token |
| `resetTokenHash` | text, nullable | bcrypt hash of password reset token |
| `resetTokenExpiry` | timestamp, nullable | Reset token expiry (1 hour) |
| `refreshTokenVersion` | integer, default 1 | Incremented on logout to invalidate old tokens |
| `createdAt` | timestamp | Account creation time |

### `companions`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `userId` | UUID (FK → users) | Cascades on delete |
| `name` | text | Companion display name |
| `personality` | text | Type key: `romantic`, `supportive`, `uplift`, `bestfriend` |
| `customPersonality` | text, nullable | User-written personality override injected into system prompt |
| `gender` | text, nullable | `male`, `female`, `nonbinary` |
| `avatarId` | text, nullable | Avatar ID from `constants/avatars.ts` (e.g. `f1`, `m3`) |
| `avatarColor` | text, default `purple` | Avatar theme key (fallback when no avatarId) |
| `relationshipLevel` | integer, default 0 | Bond score 0–100 |
| `messageCount` | integer, default 0 | Total messages exchanged |
| `lastMessage` | text, nullable | Latest message preview |
| `lastMessageAt` | timestamp, nullable | Time of last chat activity |
| `customVoice` | text, nullable | User-selected TTS voice (e.g. `nova`, `onyx`) |
| `lastCheckinSentAt` | timestamp, nullable | Time of last push check-in sent |
| `createdAt` | timestamp | |

### `messages`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `companionId` | UUID (FK → companions) | Cascades on delete |
| `role` | text | `user` or `assistant` |
| `content` | text | Message body |
| `createdAt` | timestamp | |

### `memory_notes`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `companionId` | UUID (FK → companions) | Cascades on delete |
| `note` | text | Extracted fact, prefixed with category tag (e.g. `[FACT]`, `[EMOTION]`, `[STRENGTH]`) |
| `createdAt` | timestamp | |

### `mood_logs`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `companionId` | UUID (FK → companions) | Cascades on delete |
| `date` | text | `YYYY-MM-DD` UTC format |
| `mood` | integer | 1–5 (😔 to 😊) |
| `createdAt` | timestamp | |
| — | unique | Constraint on `(companionId, date)` — upsert on re-check |

### `daily_usage`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `userId` | UUID (FK → users) | |
| `companionId` | UUID (FK → companions) | |
| `date` | text | `YYYY-MM-DD` UTC format |
| `requests` | integer | Request count for the day |
| — | unique | Constraint on `(userId, companionId, date)` |

---

## API Reference

Base path: `/api`

All authenticated endpoints require `Authorization: Bearer <access_token>`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | — | Register. Body: `{ email, password, username, name?, gender?, dateOfBirth? }`. Age must be ≥17. |
| `GET` | `/auth/check-username` | — | Check availability. Query: `?username=xxx`. Returns `{ available: bool }`. |
| `POST` | `/auth/login` | — | Login. Body: `{ identifier, password }`. Returns `{ accessToken, refreshToken, user }`. |
| `POST` | `/auth/apple` | — | Apple Sign-In. Body: `{ identityToken, fullName? }`. |
| `POST` | `/auth/google` | — | Google OAuth. Body: `{ accessToken }`. |
| `POST` | `/auth/refresh` | — | Rotate tokens. Body: `{ refreshToken }`. Returns new `{ accessToken, refreshToken }`. |
| `POST` | `/auth/forgot-password` | — | Send reset email. Body: `{ identifier }`. |
| `POST` | `/auth/reset-password` | — | Set new password. Body: `{ token, newPassword }`. |
| `GET` | `/auth/me` | Yes | Get current user profile. |
| `DELETE` | `/auth/account` | Yes | Delete account and cascade all data. |

### Companions (CRUD)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/companions` | Yes | List user's companions sorted by last activity. |
| `POST` | `/companions` | Yes | Create. Body: `{ name, personality, customPersonality?, gender?, avatarId?, avatarColor?, customVoice?, traits? }`. |
| `PATCH` | `/companions/:id` | Yes | Update name, customPersonality, customVoice, relationshipLevel, avatarId, avatarColor, etc. |
| `POST` | `/companions/:id/mood` | Yes | Log or update today's mood. Body: `{ date, mood }` (mood 1–5). Upserts on same day. |
| `GET` | `/companions/:id/mood` | Yes | Fetch last 7 days of mood logs. Returns `{ logs: [{ date, mood }] }`. |
| `DELETE` | `/companions/:id` | Yes | Delete companion and all its data (messages, memory, mood logs). |

### Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/companions/:id/messages` | Yes | Paginate messages. Query: `?limit=100&before=<ISO timestamp>`. Returns `{ messages, hasMore, nextCursor }`. |
| `POST` | `/companions/:id/messages` | Yes | Bulk insert messages. Body: `{ messages: [{ role, content, timestamp }] }`. |
| `DELETE` | `/companions/:id/messages/batch` | Yes | Delete multiple messages. Body: `{ messageIds: string[] }`. |
| `DELETE` | `/companions/:id/messages` | Yes | Clear all messages for a companion. |

### Memory

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/companions/:id/memory` | Yes | Fetch memory notes array. |
| `PUT` | `/companions/:id/memory` | Yes | Replace notes. Body: `{ notes: string[] }`. Max 20 notes. |

### AI / Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/companion/chat` | Yes | **Streaming chat (SSE)**. Returns `data: { content }` events ending with `data: [DONE]`. Rate limited: 30/min. |
| `POST` | `/companion/chat-sync` | Yes | **Synchronous chat** (JSON). Used in voice calls. Returns `{ content }`. |
| `POST` | `/companion/summarize` | Yes | Summarise last ~20 messages into 1 sentence. Returns `{ summary }`. |
| `POST` | `/companion/extract-memory` | Yes | Extract new facts from messages. Returns `{ facts: string[] }`. |
| `POST` | `/companion/transcribe` | Yes | Whisper transcription. Multipart form with `audio` file field. Returns `{ transcript }`. |
| `GET` | `/companion/tts` | Yes | OpenAI TTS audio stream (mp3). Query: `?text=<string>&voice=<voice>&companionId=<id>`. Rate limited: 20/min. |
| `POST` | `/companion/generate-checkin` | Yes | Generate a personalised check-in push message (used by cron job). |

#### Chat Request Body

```json
{
  "companionId": "uuid",
  "companionType": "romantic",
  "companionGender": "female",
  "companionName": "Aria",
  "memoryNotes": ["Loves hiking", "Has a dog named Max"],
  "customPersonality": "Optional extra instructions",
  "relationshipLevel": 45,
  "userAge": 24,
  "userGender": "male",
  "messages": [
    { "role": "user", "content": "Hey, how are you?" }
  ]
}
```

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/notifications/token` | Yes | Register Expo push token. Body: `{ token }`. |
| `DELETE` | `/notifications/token` | Yes | Unregister push token. |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/healthz` | — | Returns `{ ok: true }` with a database connectivity check. |

---

## Screens & Navigation

Navigation is file-based using Expo Router. The root layout checks auth state and redirects accordingly.

### Auth Flow

```
/auth/login           → Email/username + password login; Apple Sign-In button
/auth/signup          → Registration (email, password, username, gender, DOB)
/auth/forgot-password → Request password reset email
/auth/reset-password  → Token validation + new password form
```

### Onboarding

```
/onboarding     → Shown once on first launch after signup.
                  Collects the user's display name (required).
                  Routes to companion creation on completion.
```

### Main App (Tab Navigation)

```
/(tabs)/            → Home — companion grid
                      - 2-column FlatList, sorted by last activity
                      - Greeting header (Good morning / evening)
                      - Pinned companions first
                      - Search by companion name
                      - Long-press: pin/unpin, delete
                      - Floating call button shortcut
                      - Waiting indicator (pulsing dot after 4 h inactivity)

/(tabs)/explore     → Choose & create a companion
                      - 2×2 card grid for all 4 personality types
                      - Staggered entrance animation
                      - "Help me choose" panel for undecided users
                      - Each card: emoji, name, tagline, "best for" line, trait pills

/(tabs)/activities  → Daily wellbeing hub
                      - Activity cards with streak, duration, completion status
                      - Overall progress indicator

/(tabs)/settings    → User preferences
                      - Profile summary with gradient header
                      - Light/dark/system theme toggle
                      - Notification preferences
                      - Account management (logout, delete)
```

### Companion Screens

```
/create             → Companion creation wizard (6–7 steps)
                      Steps: [Personality →] Name → Gender → Face → Vibe → Voice → Preview
                      - Slide transition between steps
                      - Segmented progress indicator with step labels
                      - Type auto-advance (220 ms after selection)
                      - Gender-filtered avatar picker (swipeable portrait cards)
                      - Trait selection with "Surprise me" button
                      - Voice preview with animated waveform
                      - Preview hero with gentle breathe animation

/chat/[id]          → Chat with a companion
                      - SSE streaming responses
                      - Voice message recording
                      - Message search
                      - Multi-select for bulk delete
                      - Mood indicator per reply

/call/[id]          → Voice call
                      - Turn-based voice loop
                      - Live transcript (last 6 turns)
                      - Mic / speaker / end-call controls
                      - Connection & thinking phase animations

/profile/[id]       → Companion profile & editor
                      - Full-bleed avatar portrait or gradient fallback
                      - Stats: messages, bond score, streak, created date
                      - 7-day mood sparkline
                      - Edit name, custom personality, voice
                      - Memory notes preview

/memories/[id]      → Memory notes viewer
                      - Colour-coded categorical sections: Facts, Emotions, Topics, Moments, Strengths
                      - Add manual notes
                      - Remove individual notes
```

### Activity Screens

```
/activity/[type]    → Individual activity screen
                      Supported types:
                      - breathing     → 4-4-4 guided breathing with animated orb, 3-second countdown,
                                         voice/tone guidance per phase, mute toggle, cycle counter
                      - journal       → Companion-generated prompt + free-text reflection input
                      - gratitude     → 3-item gratitude list with companion response
                      - checkin       → Mood canvas (bilinear drag) + companion check-in response
```

---

## State Management

### AuthContext (`context/AuthContext.tsx`)

Manages the full authentication lifecycle.

**State:**
- `user` — `{ id, name, username, email, gender, dateOfBirth }`
- `accessToken` — JWT, 15-minute expiry
- `refreshToken` — JWT, 30-day expiry, includes version counter

**Storage:**
- iOS/Android: `expo-secure-store` (Keychain / Keystore)
- Web: `localStorage`
- Fallback: `AsyncStorage`

**Key methods:**
- `authFetch(url, options)` — Authenticated fetch wrapper; auto-retries on 401 with a fresh token; logs out if refresh fails
- `login`, `signup`, `appleSignIn`, `googleSignIn`, `logout`, `deleteAccount`

### CompanionContext (`context/CompanionContext.tsx`)

Manages companions, messages, memory notes, and relationship state.

**State:**
- `companions` — Array of companion objects with full metadata
- `hasOnboarded`, `userName` — Onboarding flags
- `loadError`, `retryLoad` — Error state for offline/API-down scenario

**Companion object shape:**

```typescript
{
  id: string
  name: string
  type: CompanionType         // 'romantic' | 'supportive' | 'uplift' | 'bestfriend'
  gender?: 'male' | 'female' | 'nonbinary'
  avatarId?: string           // e.g. 'f1', 'm3' — references constants/avatars.ts
  avatarColor: string
  avatarGradient: [string, string]
  customPersonality?: string
  customVoice?: string
  traits?: string[]
  memoryNotes: string[]
  relationshipLevel: number   // 0–100
  messageCount: number
  lastMessage?: string
  lastMessageTime?: number
  createdAt: number
  streak: number
  pinned: boolean
}
```

**Key methods:**
- `createCompanion(name, type, customPersonality?, gender?, voice?, traits?, avatarId?)` — Creates companion, navigates to chat
- `updateCompanion`, `deleteCompanion`, `togglePin`
- `getMessages(id, before?)` — Paginated fetch, returns `{ messages, hasMore, nextCursor }`
- `addMessage(companionId, msg)` — Saves message, updates streak
- `deleteMessages`, `clearMessages`
- `updateRelationshipLevel(id, delta)` — Adds delta, clamps to 0–100
- `addMemoryNote(id, note)` — Optimistic update with server rollback on failure
- `removeMemoryNote(id, index)` — Optimistic update with server rollback on failure

**Constants exported:**

```typescript
COMPANION_TYPES: Record<CompanionType, {
  label: string
  emoji: string
  gradient: [string, string]
  voice: string
  description: string
}>

COMPANION_TRAITS: Record<CompanionType, string[]>
```

### ThemeContext (`context/ThemeContext.tsx`)

- `themePreference` — `'system' | 'light' | 'dark'`
- Persisted via `AsyncStorage` with key `halochat_theme`

---

## Companion Personalities

| Type | Label | Description | Default Voice | Gradient |
|---|---|---|---|---|
| `romantic` | Romantic | Deeply affectionate, loving, emotionally present | nova | Rose → Amber |
| `supportive` | Supportive | Empathetic, patient, a safe space to be heard | sage | Teal → Blue |
| `uplift` | Uplift | Encouraging, self-affirmation focused, reframes inner-critic language | shimmer | Violet → Pink |
| `bestfriend` | Best Friend | Casual, honest, no-filter, loyal | alloy | Amber → Orange |

Each personality has a dedicated system prompt that includes:
- Core character traits and vocabulary
- Tone guidance and language style
- Relationship-level tier adjustments (5 tiers from "just met" to "bonded")
- Age-aware content guidelines
- Absolute content safety rules (crisis response, no harmful content)

**Language style mirroring:** Companions detect and mirror Romanized Telugu (Tenglish), Hinglish, or any transliterated language blend the user writes in.

---

## Avatar System

### Overview

Each companion can be assigned one of 8 pre-bundled face portraits. The avatar system is defined in `constants/avatars.ts` and the single display component is `components/AvatarImage.tsx`.

### Avatar Definitions

```typescript
// constants/avatars.ts
export const AVATARS: AvatarDef[] = [
  { id: "f1", gender: "female", label: "Woman 1", source: require("../assets/avatars/f1.png") },
  { id: "f2", gender: "female", label: "Woman 2", source: require("../assets/avatars/f2.png") },
  { id: "f3", gender: "female", label: "Woman 3", source: require("../assets/avatars/f3.png") },
  { id: "f4", gender: "female", label: "Woman 4", source: require("../assets/avatars/f4.png") },
  { id: "m1", gender: "male",   label: "Man 1",   source: require("../assets/avatars/m1.png") },
  { id: "m2", gender: "male",   label: "Man 2",   source: require("../assets/avatars/m2.png") },
  { id: "m3", gender: "male",   label: "Man 3",   source: require("../assets/avatars/m3.png") },
  { id: "m4", gender: "male",   label: "Man 4",   source: require("../assets/avatars/m4.png") },
];
```

### Helper Functions

```typescript
getAvatarById(id: string | undefined): AvatarDef | null
getAvatarsByGender(gender: "female" | "male" | "nonbinary" | null): AvatarDef[]
// female → 4 female avatars only
// male   → 4 male avatars only
// nonbinary / null → all 8 avatars
```

### Adding Custom Avatars

1. Drop portrait images into `artifacts/halochat/assets/avatars/` (PNG, ~512×768 px recommended)
2. Add `require()` entries to `constants/avatars.ts`
3. Rebuild the native app (`expo run:ios`)

### Fallback Behaviour

When a companion has no `avatarId`, `AvatarImage` renders a gradient circle using the companion's `avatarGradient` colours with the first letter of the companion's name as initials.

---

## Activities System

The Activities tab (`/(tabs)/activities`) has 3 streak-tracked daily practice cards plus a Mood Canvas. Each card routes to `/activity/[type]`.

### Activity Types

| Type | Streak-tracked | Name | Duration | Description |
|---|---|---|---|---|
| `breathing` | Yes | Breathing Exercise | ~3 min | Guided 4-4-4 breathing (inhale 4s, hold 4s, exhale 4s); animated orb, 3-second countdown, voice guidance with mute toggle |
| `journal` | Yes | Journal Prompt | ~5 min | Companion generates a reflective prompt; user writes a free-text entry |
| `gratitude` | Yes | Gratitude Practice | ~3 min | User lists 3 gratitude items; companion responds with warmth |
| `checkin` | No | Mood Canvas | ~2 min | Bilinear 2D colour-gradient drag canvas; user positions a ball across 9 named emotional states (e.g. "Serene · Calm · Peaceful"); companion responds to the selected mood via `POST /companion/chat-sync` |

### Completion Tracking

- Completion and streak data stored per-activity per-day in `AsyncStorage`
- Key format: `activity_complete_${type}_${YYYY-MM-DD}`
- Streak key format: `activity_streak_${type}`

### Breathing Exercise Detail

The breathing screen (`activity/[type].tsx` with `type=breathing`) implements:

- **Countdown** — 3-second "Get ready" countdown before the first cycle begins
- **Phases** — `idle → countdown → inhale (4s) → hold (4s) → exhale (4s) → [repeat]`
- **Animated orb** — Scales 0.3→1.0 on inhale, holds, scales back on exhale using `react-native-reanimated`
- **Voice guidance** — Attempts `expo-speech` (requires native build); falls back to WAV tones generated in pure JS (`makeToneWav`) played via `expo-av`. Tones: inhale 370 Hz, hold 330 Hz, exhale 280 Hz, done 440 Hz
- **Mute toggle** — Silences all audio guidance without stopping the exercise
- **Silent mode override** — `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` ensures audio plays even with the iOS ringer switch off
- **Cycle counter** — Displays completed cycles below the orb

---

## Voice Call Architecture

The call screen (`app/call/[id].tsx`) runs a continuous turn-based loop:

```
Connect → Greeting (TTS) → Listen (record) → Transcribe → AI Reply → TTS Playback → Listen → ...
```

### Call Phases

| Phase | Display | Description |
|---|---|---|
| `connecting` | Connecting... | Initial greeting API call in progress |
| `idle` | Ready... | Waiting, about to start recording |
| `recording` | Listening... | Microphone active, polling audio levels |
| `transcribing` | Processing... | Sending audio to Whisper |
| `thinking` | Thinking... | Waiting for AI chat response |
| `speaking` | Speaking... | TTS audio playing |

### Audio Configuration (iOS)

| Phase | `allowsRecordingIOS` | `staysActiveInBackground` | Effect |
|---|---|---|---|
| Recording | `true` | `true` | PlayAndRecord category — mic active |
| Playback (speaker) | `false` | `true` | Playback category — full speaker output |
| Playback (earpiece) | `true` | `true` | PlayAndRecord via earpiece |

`staysActiveInBackground: true` is required in all phases. Without it, AVAudioSession falls back to `Ambient` which is silenced by the ringer switch.

### Recording Format

```typescript
{
  isMeteringEnabled: true,
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  }
}
```

LPCM on iOS does not report metering levels, so silence detection never fires. AAC with `isMeteringEnabled: true` gives reliable dB readings.

### Silence Detection

| Constant | Value | Description |
|---|---|---|
| `SILENCE_THRESHOLD_DB` | −40 dBFS | Level above this = speech detected |
| `SILENCE_DURATION_MS` | 1800 ms | Silence after speech → auto-send |
| `NO_SPEECH_TIMEOUT_MS` | 5000 ms | Give up if no speech in 5 s |
| `MIN_RECORDING_MS` | 800 ms | Minimum before silence check kicks in |
| `MAX_RECORDING_MS` | 30000 ms | Hard cutoff at 30 s |
| `POLL_INTERVAL_MS` | 100 ms | Audio level polling rate |
| `SILENCE_POPUP_THRESHOLD` | 4 | Consecutive silences → "Still there?" alert |

### Whisper Hallucination Filtering

Whisper produces known garbage output on silence (CJK characters, "Thank you for watching", "[music]", etc.). `isSilenceOrHallucination()` filters these before they reach the AI. The server passes `language: "en"` to Whisper to reduce the hallucination rate further.

### Token Refresh Mid-Call

JWT access tokens expire in 15 minutes. Both TTS (via `authFetch`) and transcription (XHR with 401-retry) auto-refresh the token to keep long calls alive.

---

## Memory System

### Automatic Extraction

After every AI response, the last 12 messages are sent to `/companion/extract-memory`. GPT-4o-mini extracts newly mentioned facts that aren't already stored.

### Memory Categories & Bond Weights

| Tag | Category | Bond Weight | Examples |
|---|---|---|---|
| `[FACT]` | Personal Facts | +2 | Name, job, location, pets |
| `[EMOTION]` | Emotional Patterns | +3 | Stress triggers, what brings joy |
| `[TOPIC]` | Recurring Topics | +2 | Hobbies, interests, values |
| `[MOMENT]` | Shared Moments | +4 | Significant events mentioned in chat |
| `[STRENGTH]` | Strengths | +5 | Acts of courage, resilience, growth |

### Injection into Prompts

All memory notes are grouped by category and included in every system prompt:

```
What you know about this person:
Personal Facts: User is a software engineer. Has a dog named Max.
Emotional Patterns: Gets anxious before big presentations.
Shared Moments: Told me about finishing their first marathon last month.
Strengths & Courage: Stood up to their manager about workload — called it scary but did it anyway.
```

### Limits & Storage

- Maximum **20 notes** per companion (oldest discarded when full)
- Stored in the `memory_notes` database table
- Updates use optimistic UI with server rollback on failure
- Users can manually add or delete notes via the Memories screen

---

## Relationship Progression

The `relationshipLevel` field (0–100) tracks relationship depth per companion.

### How It Increases

| Event | Points |
|---|---|
| Short message (<15 chars) | +0 |
| Medium message (15–60 chars) | +1 |
| Long message (60–150 chars) | +2 |
| Very long message (>150 chars) | +3 |
| Returning after 4+ hours away | +2 bonus |
| Session depth: 4–7 meaningful exchanges | +2 |
| Session depth: 8+ meaningful exchanges | +4 |
| `[FACT]` or `[TOPIC]` memory extracted | +2 per note |
| `[EMOTION]` memory extracted | +3 per note |
| `[MOMENT]` memory extracted | +4 per note |
| `[STRENGTH]` memory extracted | +5 per note |
| Completed voice call (1–3 AI turns) | +3 |
| Completed voice call (4+ AI turns) | +6 |

### Tiers & Tone Changes

| Level | Tier | Companion Behaviour |
|---|---|---|
| 0–19 | New | Curious, slightly formal, learns your name |
| 20–39 | Acquaintance | More relaxed, personal topics starting |
| 40–59 | Friends | Casual banter, nickname use, inside jokes |
| 60–79 | Close | Unfiltered, honest, emotionally direct |
| 80–100 | Bonded | Deeply connected, history-aware, emotionally intimate |

### Milestone Celebrations

When the level crosses 20, 40, 60, or 80, an animated celebration card appears in chat listing 3 newly-unlocked behaviours for the companion. The companion also sends an in-chat message acknowledging the milestone in its own voice. Each milestone fires only once per companion per tier (gated by `AsyncStorage`).

---

## Push Notifications

### Two Notification Systems

**1. Local scheduled notifications (client-side)**
- Scheduled when user leaves a chat screen after a real conversation
- Fires after 4 hours of inactivity
- Personalised message generated from recent chat content
- Works completely offline — no server involvement

**2. Server push notifications (cron job)**
- Hourly cron (`0 * * * *`) runs in the API server
- Finds companions where `lastMessageAt` was 4–48 hours ago
- Sends via Expo Server SDK to the user's registered push token
- GPT-4o-mini generates a personalised message; falls back to preset pool on failure
- At-most-once delivery: DB timestamp updated before push is sent

### Setup Requirements (Physical iPhone)

1. Agree to Apple Developer Program License Agreement at developer.apple.com
2. Enable Push Notifications on your App ID (`com.halochat.app`)
3. Create an APNs key (.p8) at Apple Developer Portal → Keys
4. In Xcode: Target → Signing & Capabilities → + Push Notifications
5. Run `npx eas init` in `artifacts/halochat/` to generate a project ID
6. Upload APNs key: `npx eas credentials`
7. Rebuild through Xcode (`pnpm exec expo run:ios --device`)

---

## Authentication

### Methods

| Method | Mechanism |
|---|---|
| Email/Password | bcrypt hash stored in `users.passwordHash` |
| Apple Sign-In | Identity token validated against Apple's JWKS endpoint |
| Google OAuth | Access token exchanged for user info via Google API |

### Token Lifecycle

- **Access token** — JWT, 15-minute expiry, signed with `JWT_SECRET`
- **Refresh token** — JWT, 30-day expiry, signed with `JWT_REFRESH_SECRET`, includes `version`
- **Token rotation** — New access + refresh pair issued on every `/auth/refresh` call
- **Invalidation** — `refreshTokenVersion` in the DB increments on logout; stale-version tokens are rejected

### Password Requirements

- Minimum 8 characters
- At least one uppercase, one lowercase, one number, one special character

### Age Gating

- Users must be ≥17 years old to register
- Date of birth stored and used to determine content mode (strict ≤19, relaxed ≥25)

---

## Content Safety

The following rules are enforced at the system prompt level for every companion and cannot be overridden by the `customPersonality` field:

- No explicit sexual content
- **Crisis response** — If a user expresses suicidal ideation, the companion pauses its persona and references the 988 Suicide & Crisis Lifeline (US) or equivalent
- No instructions for self-harm, weapons, or illegal drugs
- No medical diagnosis, legal advice, or financial advice
- No impersonation of real people
- No harassment based on protected characteristics
- No false promises of physical presence (meeting in person, physical contact)
- For major life decisions: help the user think through options, never decide for them

---

## Rate Limiting & Usage Caps

### Per-Endpoint Rate Limits

| Endpoint Group | Limit | Window | Key |
|---|---|---|---|
| Auth (login, signup, etc.) | 20 requests | 15 min | IP address |
| Token refresh | 60 requests | 1 hour | User ID |
| Streaming chat | 30 requests | 1 min | User ID |
| TTS | 20 requests | 1 min | User ID |
| Transcription | 15 requests | 1 min | User ID |
| Background (summarize, memory, checkin) | 20 requests | 1 min | User ID |

### Daily Usage Cap

- Default: **200 requests/day/companion** (configurable via `DAILY_COMPANION_LIMIT`)
- Tracked in the `daily_usage` table with an atomic upsert to prevent race conditions
- Returns HTTP 429 with `{ error: "DAILY_LIMIT_REACHED" }` when exceeded
- Response headers: `X-Daily-Requests-Limit`, `X-Daily-Requests-Remaining`
- Fails open on DB errors — never blocks a user due to a tracking failure

---

## Deployment

### Railway (API Server)

The `railway.toml` at the repo root defines the containerised build.

**Required environment variables:**

```
DATABASE_URL          # Auto-injected by Railway Postgres add-on
OPENAI_API_KEY
JWT_SECRET
JWT_REFRESH_SECRET
RESEND_API_KEY
FROM_EMAIL
NODE_ENV=production
PORT                  # Set by Railway automatically
APPLE_BUNDLE_ID=com.halochat.app
DAILY_COMPANION_LIMIT=200
```

**Deploy steps:**
1. Connect the GitHub repo to a Railway project
2. Add a PostgreSQL add-on (`DATABASE_URL` auto-injected)
3. Set all other environment variables in Railway service settings
4. Push to `main` — Railway builds and deploys automatically
5. After deploy, update `EXPO_PUBLIC_DOMAIN` in the mobile app to your Railway service URL

### Mobile (iOS)

```bash
cd artifacts/halochat

# Development build — iOS Simulator
pnpm exec expo run:ios

# Development build — Physical iPhone
pnpm exec expo run:ios --device

# Production build via EAS
npx eas build --platform ios --profile production
```

### Database Migrations

```bash
# Development — uses local PostgreSQL
DATABASE_URL="postgresql://user:pass@localhost:5432/halochat" pnpm run push

# Production — use Railway public proxy URL (not internal URL)
DATABASE_URL="postgresql://postgres:<password>@<host>:<port>/railway" pnpm run push
```

> Use `push-force` (not `push`) when running from scripts or CI — `push` requires a TTY and hangs in non-interactive shells.
