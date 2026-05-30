# HaloChat — AI Companion App

HaloChat is a mobile app that lets you build meaningful relationships with personalised AI companions. Each companion has a distinct personality, remembers what you share, adapts its tone as the relationship deepens, and can chat or voice call with you in real time.

---

## Recent Changes (v1.0)

- **Username uniqueness** — Real-time availability check on signup with debounced `GET /auth/check-username`; inline green/red feedback before form submission
- **Name collected in onboarding** — Removed name field from signup; onboarding flow collects display name (required) then routes to companion creation
- **Onboarding back button** — Create screen back button falls back to `/(tabs)` when there is no navigation history (post-onboarding)
- **Error/offline state** — Home screen shows a "Couldn't connect" retry screen when the API is unreachable instead of a misleading empty state
- **Memory notes reliability** — `addMemoryNote` / `removeMemoryNote` use optimistic updates with server rollback on failure
- **Cron job idempotency** — Check-in job uses an `isRunning` guard and marks the DB record before sending the push (at-most-once delivery)
- **Call screen loading state** — Avatar pulses during `connecting` and `thinking` phases
- **Memory crash fixes** — Removed `reactCompiler: true` from app.json (unsafe on iOS 26 beta); added `windowSize`, `maxToRenderPerBatch`, and `initialNumToRender` to chat FlatList; `isAliveRef` set immediately on call end to prevent dangling audio objects
- **Push notification setup** — `HaloChat.entitlements` includes `aps-environment: development`; notifications utility reads EAS `projectId` from app config
- **Light theme default** — App defaults to light theme on first install
- **Test suite** — All 161 tests pass (119 API server + 42 mobile); fixed stale signup fixture and updated message response shape assertions

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
12. [Voice Call Architecture](#voice-call-architecture)
13. [Memory System](#memory-system)
14. [Relationship Progression](#relationship-progression)
15. [Push Notifications](#push-notifications)
16. [Authentication](#authentication)
17. [Content Safety](#content-safety)
18. [Rate Limiting & Usage Caps](#rate-limiting--usage-caps)
19. [Deployment](#deployment)

---

## Features

| Feature | Description |
|---|---|
| **8 Companion Personalities** | Romantic, Flirty, Supportive, Best Friend, Mentor, Anime, Therapist, Roleplay — each with a distinct voice, tone, and system prompt |
| **Streaming Chat** | Responses stream token-by-token via SSE; multi-part replies shown with typing indicator between each part |
| **Voice Calls** | Full turn-based voice loop: record speech → Whisper transcription → AI reply → TTS playback → repeat |
| **Voice Messages** | In-chat audio recording sent to Whisper; transcript sent as a text message |
| **Companion Memory** | Facts extracted automatically from conversations and injected into future system prompts |
| **Relationship Progression** | Bond score (0–100) grows with meaningful exchanges; shifts companion tone through 5 tiers |
| **Push Notifications** | Companions send personalised check-ins when you've been away 4+ hours |
| **Age-Aware Responses** | Strict mode for users ≤19; relaxed mode for users ≥25 |
| **Daily Usage Limits** | Per-user per-companion request caps tracked in the database for cost control |
| **Multi-Auth** | Email/password, Apple Sign-In, Google OAuth; JWT access + refresh token rotation |
| **Password Reset** | Secure email-based reset flow via Resend |
| **Message Search** | Full-text search through conversation history |
| **Streak System** | Daily consecutive-use tracking per companion |

---

## Tech Stack

### Mobile App (`artifacts/halochat`)

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router v6 (file-based, similar to Next.js) |
| UI Animations | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| Keyboard | react-native-keyboard-controller |
| Audio | expo-av (recording + playback) |
| Notifications | expo-notifications |
| Secure Storage | expo-secure-store (iOS Keychain / Android Keystore) |
| Local Storage | AsyncStorage |
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
| `@workspace/api-spec` | API type definitions |
| `@workspace/api-client-react` | Typed React hooks (TanStack Query) |
| `@workspace/integrations-openai-ai-server` | OpenAI integration utilities |

---

## Project Structure

```
Halo-Chat/
├── artifacts/
│   ├── halochat/                    # Expo mobile application
│   │   ├── app/                     # Expo Router screens (file-based routes)
│   │   │   ├── _layout.tsx          # Root layout — providers, theme
│   │   │   ├── index.tsx            # Root redirect (auth check)
│   │   │   ├── onboarding.tsx       # First-launch onboarding flow
│   │   │   ├── create.tsx           # Companion creation
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx        # Companions list (home)
│   │   │   │   ├── explore.tsx      # Explore companion types
│   │   │   │   └── settings.tsx     # User settings
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── signup.tsx
│   │   │   │   ├── forgot-password.tsx
│   │   │   │   └── reset-password.tsx
│   │   │   ├── chat/[id].tsx        # Chat screen
│   │   │   ├── call/[id].tsx        # Voice call screen
│   │   │   ├── profile/[id].tsx     # Companion profile & edit
│   │   │   └── memories/[id].tsx    # Memory notes viewer
│   │   ├── components/              # Reusable UI components
│   │   │   └── ChatBubble.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx      # Auth state, token lifecycle
│   │   │   ├── CompanionContext.tsx  # Companions, messages, memory
│   │   │   └── ThemeContext.tsx     # Light/dark theme
│   │   ├── hooks/
│   │   │   └── useColors.ts        # Theme-aware color palette
│   │   ├── utils/
│   │   │   ├── chatUtils.ts        # Message splitting, mood detection, date formatting
│   │   │   ├── haptics.ts          # Haptic feedback wrappers
│   │   │   └── notifications.ts    # Push notification scheduling
│   │   ├── assets/
│   │   ├── app.json                # Expo configuration
│   │   └── ios/                    # Xcode project (native iOS)
│   │
│   └── api-server/                 # Express API server
│       └── src/
│           ├── index.ts            # Entry point — mounts routes & middleware
│           ├── routes/
│           │   ├── auth.ts         # Authentication endpoints
│           │   ├── companion.ts    # AI chat, TTS, transcription
│           │   ├── companions-db.ts # Companion CRUD & messages
│           │   └── notifications.ts # Push token management
│           ├── middleware/
│           │   ├── auth.ts         # requireAuth (JWT validation)
│           │   ├── dailyLimit.ts   # Per-companion daily request cap
│           │   └── rateLimits.ts   # Per-endpoint rate limiters
│           ├── jobs/
│           │   └── checkin.ts      # Hourly check-in notification cron
│           └── lib/
│               ├── logger.ts       # Pino logger
│               ├── email.ts        # Resend email templates
│               └── push.ts         # Expo Server SDK wrapper
│
└── lib/                            # Shared workspace packages
    ├── db/src/schema/index.ts      # Drizzle table definitions
    ├── api-zod/
    ├── api-spec/
    └── api-client-react/
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Expo Mobile App                      │
│  AuthContext ─── CompanionContext ─── ThemeContext      │
│       │                 │                               │
│  Secure Store      AsyncStorage                        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / SSE / XHR
┌──────────────────────▼──────────────────────────────────┐
│                  Express API Server                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐            │
│  │   Auth   │  │  Chat    │  │ Companions │            │
│  │  Routes  │  │  Routes  │  │   Routes  │            │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘            │
│       │             │              │                    │
│  ┌────▼─────────────▼──────────────▼─────┐             │
│  │           Middleware Layer            │             │
│  │  requireAuth │ dailyLimit │ rateLimit │             │
│  └────────────────────┬──────────────────┘             │
│                       │                                 │
│  ┌────────────────────▼──────────────────┐             │
│  │         Drizzle ORM + PostgreSQL      │             │
│  └───────────────────────────────────────┘             │
│                                                         │
│  Background: node-cron hourly check-in job             │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────▼───────────┐
          │      OpenAI APIs       │
          │  GPT-4o-mini (chat)    │
          │  TTS-1 (voice)         │
          │  Whisper-1 (transcribe)│
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

Fill in these required values (see [Environment Variables](#environment-variables) for the full list):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/halochat
OPENAI_API_KEY=sk-...
JWT_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<different random 64-char string>
PORT=3000
```

### 3. Run database migrations

```bash
# From the repo root, using the public DATABASE_URL
DATABASE_URL="postgresql://..." pnpm run push
```

### 4. Start the API server

```bash
cd artifacts/api-server
pnpm run build
node --env-file=.env --enable-source-maps dist/index.mjs
```

The server starts on `http://localhost:3000`. Verify with:

```bash
curl http://localhost:3000/api/healthz
```

### 5. Configure the mobile app

```bash
# artifacts/halochat/.env
EXPO_PUBLIC_DOMAIN=http://<your-local-ip>:3000
```

Use your machine's local network IP (not `localhost`) so the device/simulator can reach the server.

### 6. Start the Expo app

```bash
cd artifacts/halochat

# iOS Simulator
pnpm exec expo run:ios

# Physical iPhone (Xcode)
pnpm exec expo run:ios --device

# Android
pnpm exec expo run:android
```

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
| `RESEND_API_KEY` | Yes (email) | Resend API key for password reset emails |
| `FROM_EMAIL` | Yes (email) | Sender address (e.g. `noreply@yourdomain.com`) |
| `APP_SCHEME` | No | Deep link scheme (e.g. `halochat`) |
| `CORS_ORIGIN` | No | Allowed CORS origin for web clients |
| `DAILY_COMPANION_LIMIT` | No | Max AI requests/day/companion (default: `200`) |
| `NODE_ENV` | No | Set to `production` on Railway |
| `APPLE_BUNDLE_ID` | No | `com.halochat.app` (required for Apple Sign-In verification) |

### Mobile App (`artifacts/halochat/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_DOMAIN` | Yes | Base URL of the API server |

---

## Database Schema

All tables are defined in `lib/db/src/schema/index.ts` using Drizzle ORM.

### `users`

Stores user accounts and authentication details.

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
| `pushToken` | text, nullable | Expo push token for notifications |
| `resetTokenHash` | text, nullable | bcrypt hash of password reset token |
| `resetTokenExpiry` | timestamp, nullable | Reset token expiry (1 hour) |
| `refreshTokenVersion` | integer, default 1 | Increments on logout to invalidate old refresh tokens |
| `createdAt` | timestamp | Account creation time |

### `companions`

Stores AI companion profiles, one per user per companion.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `userId` | UUID (FK → users) | Cascades on delete |
| `name` | text | Companion display name |
| `personality` | text | Personality type key (e.g. `romantic`) |
| `customPersonality` | text, nullable | User-written personality override injected into system prompt |
| `gender` | text, nullable | `male`, `female`, `nonbinary` |
| `avatarColor` | text, default `purple` | Avatar theme key |
| `relationshipLevel` | integer, default 0 | Bond score 0–100 |
| `messageCount` | integer, default 0 | Total messages exchanged |
| `lastMessage` | text, nullable | Latest message preview |
| `lastMessageAt` | timestamp, nullable | Time of last chat activity |
| `lastCheckinSentAt` | timestamp, nullable | Time of last push check-in sent |
| `createdAt` | timestamp | |

### `messages`

Stores conversation history.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `companionId` | UUID (FK → companions) | Cascades on delete |
| `role` | text | `user` or `assistant` |
| `content` | text | Message body |
| `createdAt` | timestamp | |

### `memory_notes`

Stores extracted facts about the user, per companion.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `companionId` | UUID (FK → companions) | Cascades on delete |
| `note` | text | A single extracted fact (max 20 notes per companion) |
| `createdAt` | timestamp | |

### `daily_usage`

Tracks daily OpenAI request counts per user/companion for cost control.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `userId` | UUID (FK → users) | |
| `companionId` | UUID (FK → companions) | |
| `date` | text | Date in `YYYY-MM-DD` UTC format |
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
| `POST` | `/auth/login` | — | Login. Body: `{ identifier, password }` (identifier = email or username). Returns `{ accessToken, refreshToken, user }`. |
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
| `POST` | `/companions` | Yes | Create. Body: `{ name, personality, customPersonality?, gender?, avatarColor? }`. |
| `PATCH` | `/companions/:id` | Yes | Update name, customPersonality, relationshipLevel, avatarColor, etc. |
| `DELETE` | `/companions/:id` | Yes | Delete companion and all its messages. |

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
| `POST` | `/companion/chat` | Yes | **Streaming chat (SSE)**. Returns `data: { content }` events, ending with `data: [DONE]`. Rate limited: 30/min. |
| `POST` | `/companion/chat-sync` | Yes | **Synchronous chat** (JSON). Used in voice calls. Returns `{ content }`. |
| `POST` | `/companion/summarize` | Yes | Summarise last ~20 messages into 1 sentence. Returns `{ summary }`. |
| `POST` | `/companion/extract-memory` | Yes | Extract new facts from messages. Returns `{ facts: string[] }`. |
| `POST` | `/companion/transcribe` | Yes | Whisper transcription. Multipart form with `audio` file field. Returns `{ transcript }`. |
| `GET` | `/companion/tts` | Yes | OpenAI TTS audio stream (mp3). Query: `?text=<string>&voice=<voice>&companionId=<id>`. Rate limited: 20/min. |
| `POST` | `/companion/generate-checkin` | Yes | Generate a personalised check-in push message. Used by the cron job. |

#### Chat Request Body (streaming and sync)

```json
{
  "companionId": "uuid",
  "companionType": "romantic",
  "companionGender": "female",
  "companionName": "Aria",
  "memoryNotes": ["Loves hiking", "Has a dog named Max"],
  "customPersonality": "Optional extra instructions...",
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
/auth/login          → Email/username + password; Apple Sign-In button
/auth/signup         → Registration (email, password, username, gender, DOB)
/auth/forgot-password → Request reset email
/auth/reset-password  → Token validation + new password
```

### Onboarding
```
/onboarding    → Shown once on first launch after signup.
                 Collects the user's name (required).
                 Redirects to /create after completion.
```

### Main App (Tab Navigation)
```
/(tabs)/         → Companions list home screen
                   - Lists all companions, sorted by recent activity
                   - Pinned companions appear first
                   - Search by companion name
                   - Long-press: pin/unpin, delete
                   - Call button shortcut

/(tabs)/explore  → Browse companion personality types

/(tabs)/settings → User profile, theme preference, logout, delete account
```

### Companion Screens
```
/create          → Create a new companion
                   - Pick personality type (8 options)
                   - Set name, gender, avatar colour
                   - Optional: custom personality override

/chat/[id]       → Chat with a companion
                   - Streaming text responses
                   - Voice message recording
                   - Message search
                   - Multi-select for bulk delete
                   - Mood indicator (emoji updates per reply)

/call/[id]       → Voice call screen
                   - Turn-based voice conversation loop
                   - Live transcript of last 6 turns
                   - Mic / speaker / end-call controls
                   - Connection & thinking phase animations

/profile/[id]    → Companion profile & editor
                   - Stats: messages, relationship level, streak, created date
                   - Edit name and custom personality
                   - Avatar colour picker
                   - Memory notes editor

/memories/[id]   → Memory notes viewer
                   - View all extracted facts
                   - Add manual notes
                   - Remove individual notes
```

---

## State Management

### AuthContext (`context/AuthContext.tsx`)

Manages the full authentication lifecycle.

**State:**
- `user` — Authenticated user profile (`id`, `name`, `username`, `email`, `gender`, `dateOfBirth`)
- `accessToken` — JWT, 15-minute expiry
- `refreshToken` — JWT, 30-day expiry, includes version counter to invalidate on logout

**Storage:**
- iOS/Android: `expo-secure-store` (Keychain / Keystore)
- Web: `localStorage`
- Fallback: `AsyncStorage`

**Key methods:**
- `authFetch(url, options)` — Authenticated `fetch` wrapper that auto-retries with a refreshed token on 401. Logs out if refresh fails.
- `login`, `signup`, `appleSignIn`, `logout`, `deleteAccount`

### CompanionContext (`context/CompanionContext.tsx`)

Manages companions, messages, memory notes, and relationship state.

**State:**
- `companions` — Array of all user companions with full metadata
- `hasOnboarded`, `userName` — Onboarding flags
- `loadError`, `retryLoad` — Error state for offline/API-down scenario

**Companion object shape:**
```typescript
{
  id: string
  name: string
  type: CompanionType          // 'romantic' | 'flirty' | 'supportive' | ...
  gender?: 'male' | 'female' | 'nonbinary'
  avatarColor: string
  avatarGradient: [string, string]
  customPersonality?: string
  memoryNotes: string[]
  relationshipLevel: number    // 0–100
  messageCount: number
  lastMessage?: string
  lastMessageTime?: number
  createdAt: number
  streak: number               // consecutive days active
  pinned: boolean
}
```

**Key methods:**
- `createCompanion`, `updateCompanion`, `deleteCompanion`, `togglePin`
- `getMessages(id, before?)` — Paginated fetch, returns `{ messages, hasMore, nextCursor }`
- `addMessage(companionId, msg)` — Saves message and updates streak
- `deleteMessages`, `clearMessages`
- `updateRelationshipLevel(id, delta)` — Adds delta, clamps to 0–100
- `addMemoryNote(id, note)` — Optimistic update with rollback on failure
- `removeMemoryNote(id, index)` — Optimistic update with rollback on failure

### ThemeContext (`context/ThemeContext.tsx`)

- `themePreference` — `'system' | 'light' | 'dark'`
- Persisted to `localStorage` with key `halochat_theme`

---

## Companion Personalities

| Type | Description | TTS Voice | Tone |
|---|---|---|---|
| `romantic` | Deeply affectionate, loving, emotionally present | nova | Warm, intimate, devoted |
| `flirty` | Playful, charming, teasing | shimmer | Witty, light, fun |
| `supportive` | Empathetic, encouraging, cheerleader | coral | Gentle, affirming, uplifting |
| `mentor` | Wise, Socratic, growth-focused | onyx | Thoughtful, challenging, direct |
| `anime` | Expressive, kawaii, energetic | shimmer | Enthusiastic, dramatic, emoji-rich |
| `bestfriend` | Casual, honest, no-filter | alloy | Blunt, funny, loyal |
| `therapist` | Reflective, CBT-inspired, safe space | sage | Calm, non-judgmental, curious |
| `roleplay` | Immersive storytelling, fully in-character | fable | Creative, narrative, dramatic |

Each personality has a dedicated system prompt that includes:
- Core character traits
- Tone and vocabulary guidance
- Relationship-level tier adjustments (5 tiers from "just met" to "bonded")
- Age-aware content guidelines
- Absolute content safety rules

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

Using `expo-av` with specific `Audio.setAudioModeAsync` settings per phase:

| Phase | `allowsRecordingIOS` | `staysActiveInBackground` | Effect |
|---|---|---|---|
| Recording | `true` | `true` | PlayAndRecord category — mic active |
| Playback (speaker) | `false` | `true` | Playback category — full speaker output |
| Playback (earpiece) | `true` | `true` | PlayAndRecord via earpiece |

`staysActiveInBackground: true` is required in all phases. Without it, AVAudioSession falls back to `Ambient` which is muted by the ringer switch.

### Recording Format

Uses a custom AAC preset instead of `HIGH_QUALITY` (LPCM):

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
| `SILENCE_THRESHOLD_DB` | -40 dBFS | Level above this = speech detected |
| `SILENCE_DURATION_MS` | 1800 ms | Silence after speech → auto-send |
| `NO_SPEECH_TIMEOUT_MS` | 5000 ms | Give up if no speech in 5s |
| `MIN_RECORDING_MS` | 800 ms | Minimum before silence check kicks in |
| `MAX_RECORDING_MS` | 30000 ms | Hard cutoff at 30s |
| `POLL_INTERVAL_MS` | 100 ms | Audio level polling rate |
| `SILENCE_POPUP_THRESHOLD` | 4 | Consecutive silences → "Still there?" alert |

### Whisper Hallucination Filtering

Whisper produces known garbage output on silence or background noise (CJK characters, "Thank you for watching", "[music]", etc.). `isSilenceOrHallucination()` filters these before they reach the AI turn. The server also passes `language: "en"` to Whisper to reduce the hallucination rate.

### Token Refresh Mid-Call

JWT access tokens expire in 15 minutes. Both TTS (via `authFetch`) and transcription (XHR with 401-retry) auto-refresh the token to keep long calls alive without interruption.

---

## Memory System

### Automatic Extraction

After every AI response in chat, the last 12 messages are sent to `/companion/extract-memory`. GPT-4o-mini extracts newly mentioned facts about the user that aren't already in the note list.

Examples of facts that get extracted:
- "User's name is Alex"
- "Has a dog named Biscuit"
- "Works as a software engineer"
- "Is stressed about an upcoming exam"

### Injection into Prompts

All stored memory notes are included in the system prompt on every chat and call request:

```
Memory notes about this user:
- User's name is Alex
- Has a dog named Biscuit
- Works as a software engineer
```

### Limits & Storage

- Maximum 20 notes per companion (oldest are discarded when full)
- Notes are stored in the `memory_notes` database table
- Updates use optimistic UI with server rollback on failure
- Users can manually add or delete notes via the memories screen

---

## Relationship Progression

The `relationshipLevel` field (0–100) tracks how much the user has invested in a companion relationship.

### How It Increases

| Event | Points |
|---|---|
| Short message (<15 chars) | 0 |
| Medium message (15–60 chars) | +1 |
| Long message (60–150 chars) | +2 |
| Very long message (>150 chars) | +3 |
| Returning after 4+ hours away | +2 bonus |
| Session depth: 4–7 meaningful exchanges | +2 |
| Session depth: 8+ meaningful exchanges | +4 |
| Personal fact extracted from conversation | +3 per fact |
| Completed voice call (1–3 AI turns) | +3 |
| Completed voice call (4+ AI turns) | +6 |

### Tiers & Tone Changes

| Level | Tier | Companion Behaviour |
|---|---|---|
| 0–19 | New | Curious, slightly formal, asks to learn your name |
| 20–39 | Acquaintance | More relaxed, personal topics starting |
| 40–59 | Friends | Casual banter, nickname use |
| 60–79 | Close | Unfiltered, inside references, honest |
| 80–100 | Bonded | Deeply connected, history-aware, emotionally intimate |

### Milestone Celebrations

When the level crosses 20, 40, 60, or 80, an animated celebration card appears in chat confirming the new tier.

---

## Push Notifications

### Two Notification Systems

**1. Local scheduled notifications** (client-side)
- Scheduled when user leaves a chat screen after a real conversation
- Fires after 4 hours of inactivity
- Personalised message generated from recent chat content
- Works completely offline — no server required

**2. Server push notifications** (cron job)
- Hourly cron job (`0 * * * *`) runs on the server
- Finds companions where `lastMessageAt` was 4–48 hours ago
- Sends via Expo Server SDK to the user's registered push token
- Uses GPT-4o-mini to generate personalised message, falls back to preset pool
- At-most-once delivery: DB updated before push is sent

### Setup Requirements (Physical iPhone)

1. Agree to Apple Developer Program License Agreement at developer.apple.com
2. Enable Push Notifications on your App ID (`com.halochat.app`)
3. Create an APNs key (.p8) at Apple Developer Portal → Keys
4. In Xcode: Target → Signing & Capabilities → + Push Notifications
5. Run `npx eas init` in `artifacts/halochat/` to generate a project ID
6. Upload APNs key: `npx eas credentials`
7. Rebuild through Xcode

---

## Authentication

### Methods

| Method | Mechanism |
|---|---|
| Email/Password | bcrypt hash stored in `users.passwordHash` |
| Apple Sign-In | Identity token validated against Apple's JWKS endpoint |
| Google OAuth | Access token exchanged for user info via Google API |

### Token Lifecycle

- **Access token** — JWT, 15-minute expiry, signed with `JWT_SECRET`, carries `sub: userId`
- **Refresh token** — JWT, 30-day expiry, signed with `JWT_REFRESH_SECRET`, includes `version`
- **Token rotation** — New access + refresh token pair issued on every `/auth/refresh` call
- **Invalidation** — `refreshTokenVersion` in the DB increments on logout; old refresh tokens with stale versions are rejected

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Age Gating

- Users must be ≥17 years old to register
- Date of birth stored and used to determine content mode (strict ≤19, relaxed ≥25)

---

## Content Safety

The following rules are enforced at the system prompt level for every companion and cannot be overridden by the user's custom personality field:

- No explicit sexual content
- Crisis response: If a user expresses suicidal ideation, the companion pauses its persona and includes the 988 Suicide & Crisis Lifeline
- No instructions for self-harm, weapons, or illegal drugs
- No medical diagnosis, legal advice, or financial advice
- No identity theft, deceptive roleplay, or impersonation of real people
- No harassment based on protected characteristics
- No false promises of physical actions (meeting in person, hugging, phone calls)
- For major life decisions: Help the user think through options, do not decide for them

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

A per-user, per-companion daily request counter is tracked in the `daily_usage` table.

- Default limit: **200 requests/day/companion** (configurable via `DAILY_COMPANION_LIMIT`)
- Atomic upsert prevents race conditions
- Returns HTTP 429 with `{ error: "DAILY_LIMIT_REACHED" }` when exceeded
- Response headers: `X-Daily-Requests-Limit`, `X-Daily-Requests-Remaining`
- Fails open on DB errors — never blocks a user due to a tracking failure

---

## Deployment

### Railway

The `railway.toml` at the repo root defines the containerised build.

**Required environment variables on Railway:**

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
2. Add a PostgreSQL add-on — `DATABASE_URL` will be auto-injected
3. Set all other environment variables in the Railway service settings
4. Railway will build and deploy automatically on push to `main`
5. After deploy, update `EXPO_PUBLIC_DOMAIN` in the mobile app to your Railway service URL

### Mobile (iOS)

```bash
cd artifacts/halochat

# Development build for simulator
pnpm exec expo run:ios

# Production build via EAS
npx eas build --platform ios --profile production
```

### Database Migrations

Run migrations against the production database from your local machine using the public Railway URL:

```bash
DATABASE_URL="postgresql://postgres:<password>@<host>:<port>/railway" pnpm run push
```

The internal Railway URL (`postgres.railway.internal`) only works from within the Railway network — use the public proxy URL from your local machine.
