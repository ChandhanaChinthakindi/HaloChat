# HaloChat

An iOS AI companion app where users build relationships with personalised AI companions — text chat, voice calls, persistent memory, and relationship progression that changes how the companion talks to you over time.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server in watch mode (default port from `.env`)
- `cd artifacts/halochat && pnpm exec expo run:ios` — run the Expo app on iOS Simulator
- `pnpm run typecheck` — full typecheck across all workspace packages
- `pnpm run build` — typecheck + build all packages
- `DATABASE_URL="..." pnpm run push` — push DB schema changes to PostgreSQL (dev/prod)
- `DATABASE_URL="..." pnpm run push-force` — push schema non-interactively (CI / non-TTY)

Required env (API server): `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`
Required env (mobile): `EXPO_PUBLIC_DOMAIN` — base URL of the API server

## Stack

- pnpm workspaces, Node.js 20+, TypeScript 5.9
- Mobile: React Native 0.81 + Expo SDK 54, Expo Router v6, React Native Reanimated 4
- API: Express 5 (ESM), Drizzle ORM, PostgreSQL
- AI: OpenAI — GPT-4o-mini (chat), TTS-1 (voice), Whisper-1 (transcription)
- Auth: JWT (bcryptjs + jsonwebtoken), Apple Sign-In, Google OAuth
- Deploy: Railway (Docker)

## Where things live

- DB schema: `lib/db/src/schema/index.ts` — single source of truth for all tables
- API routes: `artifacts/api-server/src/routes/` — auth, companion (AI), companions-db (CRUD)
- Mobile screens: `artifacts/halochat/app/` — Expo Router file-based routes
- Contexts: `artifacts/halochat/context/` — AuthContext, CompanionContext, ThemeContext
- Companion personalities & voices: `artifacts/api-server/src/routes/companion.ts`

## Architecture decisions

- **SSE for chat streaming** — `POST /companion/chat` streams tokens via Server-Sent Events; the sync endpoint (`/chat-sync`) is used only in voice calls where the full response is needed before TTS
- **Optimistic UI for memory notes** — add/remove operations update local state immediately and roll back on server failure, keeping the UI snappy
- **`isAliveRef` in call screen** — a ref that is set to false immediately on call end prevents dangling async operations (audio objects, setState calls) from firing after unmount
- **JWT token refresh mid-call** — `authFetch` auto-retries on 401 with a fresh token; voice calls can run longer than the 15-min access token TTL without interruption
- **`onConflictDoUpdate` for mood upserts** — daily mood logs use a unique constraint on `(companionId, date)` and upsert semantics so re-checking the same day updates rather than duplicates

## Product

Users create up to N companions, each with one of 8 personality types (Romantic, Flirty, Supportive, Best Friend, Mentor, Anime, Therapist, Roleplay). They can text chat with streaming responses, send voice messages, or start a full voice call. The companion auto-extracts personal facts from conversations and injects them into future prompts. A bond score (0–100) tracks relationship depth and shifts the companion's conversational tone through 5 tiers. Daily mood check-ins and a 7-day history track emotional patterns per companion.

## Gotchas

- Use `push-force` (not `push`) when running migrations from scripts or CI — `push` requires a TTY and hangs in non-interactive shells
- `EXPO_PUBLIC_DOMAIN` must be the machine's local network IP, not `localhost` — the physical device cannot reach `localhost` on the host machine
- The internal Railway Postgres URL (`postgres.railway.internal`) only works from within Railway — use the public proxy URL for local migrations
- `reactCompiler: true` was removed from `app.json` — it caused crashes on iOS 26 beta
- `staysActiveInBackground: true` is required in all audio phases for the call loop — without it, AVAudioSession falls back to Ambient and is silenced by the ringer switch

## Pointers

- Full API reference, DB schema, and architecture diagrams: `README.md`
- Business context, personas, marketing strategy, roadmap: `docs/PROJECT_DOCUMENTATION.md`
