# HaloChat — AI Companion App

A mobile app that lets you build meaningful conversations with personalised AI companions. Each companion has a distinct personality, remembers what you share, and can chat or talk with you in real time.

---

## Features

- **8 companion personalities** — Romantic, Flirty, Supportive, Best Friend, Mentor, Anime, Therapist, Roleplay
- **Real-time streaming chat** — Responses stream token-by-token via SSE
- **Voice calls** — Full duplex: speak to your companion, hear them reply via OpenAI TTS; speaker toggle, silence detection, hallucination filtering, token auto-refresh, unmount-safe async guards
- **Voice messages** — Record and send audio; transcribed via OpenAI Whisper
- **Companion memory** — Key facts are extracted from conversations and injected into future prompts
- **Push notifications** — Companions check in when you've been away
- **Age-aware responses** — Companion tone adapts based on your age (strict mode ≤19, relaxed ≥25)
- **Gender-aware responses** — Companion uses correct pronouns and adapts conversation style
- **Daily usage limits** — Per-user, per-companion request caps tracked in the database
- **Auth** — Email/password, Apple Sign-In, Google OAuth; JWT access + refresh tokens
- **Password reset** — Email-based reset flow via Resend

---

## Tech Stack

### Mobile (`artifacts/halochat`)
| | |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router v6 (file-based) |
| State | React Context + TanStack Query |
| Audio | expo-av (recording + playback) |
| Storage | expo-secure-store, expo-file-system |
| Notifications | expo-notifications |

### API Server (`artifacts/api-server`)
| | |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| AI | OpenAI (GPT-4o, TTS-1, Whisper) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (bcryptjs, jsonwebtoken) |
| Security | helmet, express-rate-limit, CORS |
| Email | Resend |
| Push | Expo Server SDK |
| Logging | Pino |
| Deploy | Railway |

### Shared Libraries (`lib/`)
| Package | Purpose |
|---|---|
| `@workspace/db` | Drizzle schema + pool |
| `@workspace/api-zod` | Shared Zod schemas |
| `@workspace/api-spec` | API type definitions |
| `@workspace/api-client-react` | Typed API client hooks |

---

## Project Structure

```
Halo-Chat/
├── artifacts/
│   ├── halochat/          # Expo mobile app
│   │   ├── app/           # Expo Router screens
│   │   │   ├── (tabs)/    # Tab navigation (home, profile, settings)
│   │   │   ├── auth/      # Login, signup
│   │   │   ├── chat/      # Chat screen [id].tsx
│   │   │   ├── call/      # Voice call screen [id].tsx
│   │   │   ├── create.tsx # Companion creation
│   │   │   └── memories/  # Companion memory viewer
│   │   ├── context/       # AuthContext, CompanionContext
│   │   └── utils/         # chatUtils, api, haptics
│   │
│   └── api-server/        # Express API
│       └── src/
│           ├── routes/    # auth, companion, companions-db, notifications
│           ├── middleware/ # requireAuth, dailyLimit, rateLimits
│           ├── jobs/      # checkin cron job
│           └── lib/       # logger, email, push
│
└── lib/                   # Shared workspace packages
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database
- OpenAI API key

### 1. Install dependencies (from monorepo root)
```bash
pnpm install
```

### 2. Configure the API server
```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Fill in DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3. Run database migrations
```bash
cd lib/db && pnpm run migrate
```

### 4. Start the API server
```bash
cd artifacts/api-server
pnpm run build && node --env-file=.env --enable-source-maps dist/index.mjs
```

### 5. Configure the mobile app
```bash
# artifacts/halochat/.env
EXPO_PUBLIC_DOMAIN=http://<your-local-ip>:3000
```

### 6. Start the Expo app
```bash
cd artifacts/halochat
pnpm exec expo run:ios    # or run:android
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register with email, password, gender, DOB |
| POST | `/api/auth/login` | Login (email or username) |
| POST | `/api/auth/refresh` | Rotate JWT tokens |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/companions` | List user's companions |
| POST | `/api/companions` | Create a companion |
| GET | `/api/companion/chat` | Stream chat response (SSE) |
| POST | `/api/companion/chat-sync` | Synchronous chat (used in calls) |
| GET | `/api/companion/tts` | Text-to-speech audio (mp3) |
| POST | `/api/companion/transcribe` | Whisper transcription |
| GET | `/api/companion/memory` | Get companion memory notes |
| PUT | `/api/companion/memory` | Update companion memory |
| GET | `/api/healthz` | Health check + DB ping |

---

## Voice Call Architecture

The voice call screen (`app/call/[id].tsx`) runs a turn-based loop: **record → transcribe → AI reply → TTS playback → repeat**.

### Audio routing (iOS)
`expo-av` maps `allowsRecordingIOS` + `staysActiveInBackground` to AVAudioSession categories:

| Phase | `allowsRecordingIOS` | `staysActiveInBackground` | iOS category |
|---|---|---|---|
| Recording | `true` | `true` | PlayAndRecord (earpiece or speaker) |
| Playback (speaker on) | `false` | `true` | Playback (speaker) |
| Playback (earpiece) | `true` | `true` | PlayAndRecord (earpiece) |

`staysActiveInBackground: true` is required in all phases — without it expo-av falls back to `AVAudioSessionCategoryAmbient` which is silenced by the ringer switch.

### Recording format
Uses a custom AAC preset (`RECORDING_PRESET`) instead of `HIGH_QUALITY` (LPCM). LPCM on iOS does not report metering levels, so silence detection never triggers. AAC with `isMeteringEnabled: true` gives reliable dB readings.

### Whisper hallucination filtering
Whisper produces known garbage on silence (CJK characters, "thank you for watching", etc.). `isSilenceOrHallucination()` filters these before they reach the AI turn. The server also passes `language: "en"` to reduce hallucination rate.

### Consecutive silence handling
Each filtered transcript increments `consecutiveSilencesRef`. At 4 consecutive silences the loop pauses and shows an **"Are you still there?"** alert with **Continue** and **End Call** buttons. Receiving real speech resets the counter.

### Token refresh mid-call
JWT access tokens expire in 15 minutes. Both TTS playback (via `authFetch` + base64 file write) and Whisper transcription (XHR with 401-retry) auto-refresh the token to keep long calls alive.

---

## Deployment (Railway)

The `railway.toml` at the repo root configures the build and start commands. Set these environment variables in your Railway service:

```
DATABASE_URL        # Injected automatically by Railway Postgres add-on
OPENAI_API_KEY
JWT_SECRET
JWT_REFRESH_SECRET
RESEND_API_KEY
FROM_EMAIL
APP_SCHEME
CORS_ORIGIN
DAILY_COMPANION_LIMIT
```

After deploy, update `EXPO_PUBLIC_DOMAIN` in the Expo app to your Railway service URL and rebuild the native binary.

---

## Environment Variables

See [`artifacts/api-server/.env.example`](artifacts/api-server/.env.example) for the full reference with descriptions.
