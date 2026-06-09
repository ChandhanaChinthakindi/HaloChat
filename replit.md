# HaloChat — Developer Quick Reference

An iOS AI companion app where users build relationships with personalised AI companions — text chat, voice calls, persistent memory, and relationship progression that changes how the companion talks to you over time.

---

## Run & Operate

```bash
# API server — dev mode with file watching
pnpm --filter @workspace/api-server run dev

# iOS Simulator
cd artifacts/halochat && pnpm exec expo run:ios

# Physical iPhone (recommended — native modules require a native build)
cd artifacts/halochat && pnpm exec expo run:ios --device

# Full typecheck across all workspace packages
pnpm run typecheck

# Build all packages
pnpm run build

# Database migrations — interactive (requires TTY)
DATABASE_URL="..." pnpm run push

# Database migrations — non-interactive (CI / scripts)
DATABASE_URL="..." pnpm run push-force

# Run all tests
pnpm --filter @workspace/api-server run test
cd artifacts/halochat && pnpm run test
```

---

## Environment Variables

**API server** (`artifacts/api-server/.env`):

```
DATABASE_URL          # PostgreSQL connection string
OPENAI_API_KEY        # OpenAI key (chat, TTS, Whisper)
JWT_SECRET            # 64-char random string
JWT_REFRESH_SECRET    # Different 64-char random string
PORT                  # Server port (e.g. 3000)
RESEND_API_KEY        # For password reset emails
FROM_EMAIL            # Sender address (noreply@yourdomain.com)
APPLE_BUNDLE_ID       # com.halochat.app (Apple Sign-In verification)
DAILY_COMPANION_LIMIT # Max AI requests/day/companion (default: 200)
NODE_ENV              # Set to production on Railway
```

**Mobile** (`artifacts/halochat/.env`):

```
EXPO_PUBLIC_DOMAIN    # Base URL of the API server
                      # Must be local network IP — not localhost — when on a physical device
                      # e.g. http://192.168.1.42:3000
```

---

## Stack

- **Monorepo:** pnpm workspaces, TypeScript 5.9, Node.js 20+
- **Mobile:** React Native 0.81 + Expo SDK 54, Expo Router v6, React Native Reanimated 4
- **API:** Express 5 (ESM), Drizzle ORM, PostgreSQL
- **AI:** OpenAI — GPT-4o-mini (chat), TTS-1 (voice), Whisper-1 (transcription)
- **Auth:** JWT (bcryptjs + jsonwebtoken), Apple Sign-In, Google OAuth
- **Deploy:** Railway (Docker)

---

## Where Things Live

| What | Path |
|---|---|
| DB schema | `lib/db/src/schema/index.ts` |
| API routes | `artifacts/api-server/src/routes/` |
| Mobile screens | `artifacts/halochat/app/` |
| Auth + companion state | `artifacts/halochat/context/` |
| Companion types, voices, traits | `artifacts/halochat/context/CompanionContext.tsx` |
| Personality system prompts | `artifacts/api-server/src/routes/companion.ts` |
| Avatar definitions | `artifacts/halochat/constants/avatars.ts` |
| Colour palette | `artifacts/halochat/constants/colors.ts` |
| Activity screen (breathing, journal…) | `artifacts/halochat/app/activity/[type].tsx` |
| Ambient background | `artifacts/halochat/components/HaloBackground.tsx` |
| pnpm Metro resolver | `artifacts/halochat/metro.config.js` |

---

## Architecture Decisions

- **SSE for chat streaming** — `POST /companion/chat` streams tokens via Server-Sent Events; the sync endpoint (`/chat-sync`) is used only in voice calls where the full response is needed before TTS begins
- **Optimistic UI for memory notes** — add/remove updates local state immediately and rolls back on server failure
- **`isAliveRef` in call screen** — set to `false` immediately on call end to prevent dangling async operations (setState, audio objects) from firing after unmount
- **JWT token refresh mid-call** — `authFetch` auto-retries on 401 with a fresh token; voice calls can exceed the 15-min access token TTL without interruption
- **`onConflictDoUpdate` for mood upserts** — daily mood logs use a unique constraint on `(companionId, date)` and upsert semantics so re-checking the same day updates rather than duplicates
- **`extraNodeModules` in metro.config.js** — resolves pnpm symlinks (`expo-speech`, `expo-notifications`, etc.) to their real paths so Metro can bundle them correctly in a pnpm monorepo
- **Breathing audio fallback** — expo-speech is gated by `NativeModules.ExpoSpeech` check (new architecture uses JSI proxy so `NativeModules` doesn't list it even when compiled); if unavailable, `makeToneWav()` generates 8-bit PCM WAV tones in pure JS and plays them via expo-av
- **`newArchEnabled: true`** — React Native new architecture is enabled; some bridge-dependent native modules may behave differently

---

## Product

Users create companions, each with one of **4 personality types**:

| Type | Feel |
|---|---|
| **Romantic** | Affectionate, devoted, emotionally present |
| **Supportive** | Empathetic, patient, a safe space |
| **Uplift** | Encouraging, reframes inner-critic language |
| **Best Friend** | Honest, casual, no-filter |

They can text chat with streaming responses, send voice messages, or start a full voice call. The companion auto-extracts personal facts into 5 memory categories (Facts, Emotions, Topics, Moments, Strengths) and injects them into every prompt. A bond score (0–100) tracks relationship depth through 5 tiers, shifting the companion's tone. Daily activities (breathing, journal, gratitude, mood check-in) are tracked with streaks. Companions send personalised push check-ins when the user has been away 4+ hours.

---

## Gotchas

- **`push-force` not `push` in scripts** — `push` requires a TTY and hangs in non-interactive shells (CI, scripts)
- **`EXPO_PUBLIC_DOMAIN` must be local network IP** — not `localhost`; the physical device cannot reach the host machine at localhost
- **Railway internal Postgres URL** — `postgres.railway.internal` only works within Railway; use the public proxy URL for local migrations
- **`reactCompiler: true` removed from app.json** — caused crashes on iOS 26 beta; do not re-enable
- **`staysActiveInBackground: true` required in all call audio phases** — without it, AVAudioSession falls back to Ambient and is silenced by the ringer switch
- **`Audio.setAudioModeAsync({ playsInSilentModeIOS: true })`** — must be called before any audio playback (breathing tones, voice preview, TTS) for sound to play when the iOS ringer switch is off
- **expo-speech on new architecture** — `NativeModules.ExpoSpeech` is `undefined` on new-arch builds even when the native module is compiled (JSI proxy doesn't expose it to the bridge). The breathing screen checks this before requiring expo-speech and falls back to WAV tones. Do not gate with `requireOptionalNativeModule` — it also returns null on new arch.
- **Avatar picker gender filter** — `getAvatarsByGender` strictly filters: male → 4M only, female → 4F only, nonbinary/null → all 8. Switching gender resets `selectedAvatar`.
- **Back navigation in modals** — use `router.canGoBack() ? router.back() : router.replace("/(tabs)/...")` to avoid `GO_BACK action not handled by any navigator` errors when a screen is opened without navigation history (e.g. from a notification)

---

## Pointers

- Full API reference, DB schema, screen navigation, component details: **`README.md`**
- Business context, personas, feature roadmap, marketing, competitive analysis: **`docs/PROJECT_DOCUMENTATION.md`**
- Privacy policy (GDPR/CCPA): **`docs/PRIVACY_POLICY.md`**
- Terms and conditions: **`docs/TERMS_AND_CONDITIONS.md`**
