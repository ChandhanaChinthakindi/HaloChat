# HaloChat — Comprehensive Project Documentation

---

## Document Information

| Field | Details |
|---|---|
| **Project Name** | HaloChat — AI Companion App |
| **Author / Owner** | Chandhana Chinthakindi / Developer & Owner |
| **Version** | 1.1 |
| **Date Created** | May 2026 |
| **Last Updated** | May 2026 |
| **Document Type** | Project Documentation |
| **Confidentiality** | Internal / Owner Use |

---

## Table of Contents

1. [Executive Summary & Overview](#1-executive-summary--overview)
2. [Project Scope & Objectives](#2-project-scope--objectives)
3. [Target Audience & User Personas](#3-target-audience--user-personas)
4. [Technical Architecture & Requirements](#4-technical-architecture--requirements)
5. [Features & Functionality](#5-features--functionality)
6. [Competitive Landscape](#6-competitive-landscape)
7. [Why HaloChat Stands Out](#7-why-halochat-stands-out)
8. [Business Model & Monetisation](#8-business-model--monetisation)
9. [Marketing Strategy](#9-marketing-strategy)
10. [Advertising Concepts](#10-advertising-concepts)
11. [AI Content Generation Prompts](#11-ai-content-generation-prompts)
12. [Risk & Considerations](#12-risk--considerations)
13. [Roadmap & Future Vision](#13-roadmap--future-vision)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary & Overview

### Project Purpose

Modern loneliness is at an epidemic scale. Millions of people lack meaningful, non-judgmental connection in their day-to-day lives — whether due to social anxiety, geographical isolation, demanding schedules, or simply the difficulty of vulnerability with other humans. HaloChat addresses this by providing an AI companion that is always available, always patient, remembers everything you share, and genuinely feels designed around *you*.

HaloChat is not a general-purpose chatbot. It is a relationship-first mobile app. Each companion has a distinct personality, a voice, a memory of who you are, and a bond that deepens the more time you spend together. Users can chat in text or have a real voice conversation — just like calling someone who knows them.

### App Description

**HaloChat** is an iOS AI companion app that lets users build ongoing, emotionally meaningful relationships with personalised AI characters. Unlike general-purpose chatbots, HaloChat is built around a single premise: your companion should feel like a *real relationship* — one that remembers you, grows with you, and is always available.

#### What Users Can Do

Users create a companion by choosing from 8 distinct personality archetypes, picking a name, selecting a voice, and optionally writing a custom personality note. From that point:

- **Chat in real time** — Text messages stream token-by-token so responses appear as the AI "types." Reply length adapts to the user's message: short inputs get concise replies; long, detailed messages get fuller responses.
- **Make a voice call** — Tapping the call button opens a full-screen voice call experience. The app records the user's speech, transcribes it via OpenAI Whisper, generates a reply with GPT-4o-mini, and plays it back through a natural-sounding TTS voice — all in a seamless turn-based loop with automatic silence detection.
- **Send voice messages** — In chat, users can record and send voice notes; the app transcribes them before sending to the AI.
- **Build a bond** — Every interaction adds to the companion's bond score (0–100 across 5 named tiers: New → Acquaintance → Friend → Close → Bonded). As the tier increases, the companion's tone shifts from curious and slightly formal to warm, familiar, and emotionally open.
- **Be remembered** — After conversations, GPT-4o-mini extracts meaningful personal facts (goals, life events, preferences, relationships) and stores them as memory notes. These notes are injected into every future prompt so the companion actually *knows* the user.
- **Track their mood** — When leaving a chat after a real exchange, a mood check-in sheet appears (5-emoji scale). A 7-day mood sparkline is visible on the companion's profile page.
- **Receive check-ins** — After 4+ hours of inactivity, the companion card shows a pulsing "thinking of you" indicator and the app sends a personalised push notification.

#### The 8 Companion Personality Types

| Type | Character |
|---|---|
| **Romantic** | Devoted, affectionate, emotionally intimate; speaks with warmth and genuine care |
| **Flirty** | Playful, witty, charming; light-hearted banter with an undercurrent of attraction |
| **Supportive** | Empathetic, encouraging, steady; listens without judgment and validates feelings |
| **Best Friend** | Casual, fun, loyal; jokes around, gives honest opinions, feels like a real mate |
| **Mentor** | Thoughtful, challenging, growth-oriented; pushes the user to think and improve |
| **Anime** | Expressive, dramatic, pop-culture-aware; leans into anime tropes and enthusiastic energy |
| **Therapist** | Calm, reflective, technique-informed; uses active listening and reframes negative thoughts |
| **Roleplay** | Creative, adaptive, story-driven; collaborative fiction and character-driven scenarios |

Each type is powered by a distinct system prompt that defines tone, vocabulary, behavioural rules, and content approach — not just a different name over the same model call.

#### How It Works Under the Hood

1. **User opens the app** → Auth check → Companion list loaded from the backend.
2. **Chat screen** → User message POSTed to `POST /companion/:id/chat/stream` → Express route builds a full system prompt (personality + memory notes + relationship tier + age-aware rules) → OpenAI `stream: true` response forwarded as SSE to the mobile client.
3. **Voice call** → Client records audio → POSTed to `POST /companion/:id/voice-call` → Whisper transcription → same prompt pipeline as text → TTS-1 audio returned as `audio/mpeg` → client plays via `expo-av`.
4. **Memory extraction** → After every 4+ message exchange, `POST /companion/:id/memory/extract` sends the recent conversation to GPT-4o-mini asking it to identify new personal facts → merged and stored in `memory_notes` table.
5. **Mood & profile** → Mood score written to `mood_logs` table; companion profile page reads 7-day history and renders a sparkline.

---

### What Problem Are We Solving?

| Problem | How HaloChat Addresses It |
|---|---|
| Loneliness and lack of connection | Always-available companions designed for genuine emotional engagement |
| Emotional support is hard to access | Supportive and therapist-style companions available 24/7 with no waitlist |
| Fear of judgment in real relationships | AI companions are completely non-judgmental and never share what you say |
| Boredom and lack of creative stimulation | Roleplay, mentor, and anime companion types for entertainment and growth |
| Difficulty practising communication skills | Low-stakes conversations that build confidence for real-world interactions |

### Business Case

The AI companion market is growing rapidly. The global conversational AI market is projected to exceed **$32 billion by 2030**. Apps like Replika and Character.AI have proven massive demand — Replika alone surpassed 10 million users in its early years, and Character.AI reached over 20 million monthly active users within two years of launch.

HaloChat enters this space with a differentiated approach: higher-quality AI (GPT-4o-mini), real voice calls, a relationship progression system, and a polished mobile-native product that feels like a premium consumer app rather than a demo.

### Vision Statement

> *"A companion for everyone. Always there. Always yours."*

HaloChat's long-term vision is to be the most trusted and personal AI relationship app in the world — one where users feel genuinely understood, supported, and less alone.

---

## 2. Project Scope & Objectives

### In Scope (v1.1 — current)

- iOS mobile application (React Native + Expo)
- 8 distinct AI companion personality types
- Real-time text chat with streaming responses and dynamic reply length
- Full voice call capability (speech-to-text + TTS) with per-companion voice selection
- Voice message recording in chat
- Companion memory system (automatic fact extraction)
- Relationship progression and milestone system
- Mood check-in system with 7-day history
- Companion waiting indicator (pulsing dot after 4h inactivity)
- Push notification check-ins
- Email/password, Apple Sign-In, Google OAuth
- User profile and companion profile management
- Daily usage limits and rate limiting for cost control
- Backend API deployed on Railway with PostgreSQL
- Animated loading/splash screen with branded first-launch experience

### Out of Scope (v1.0)

- Android build (architecture supports it but not the launch platform)
- Web app
- Companion image / avatar generation
- In-app purchases / subscription billing system (design ready, not implemented)
- Group chats or multi-companion conversations
- Live human agent fallback

### Primary Objectives

1. **Deliver a production-ready iOS app** that passes App Store review and runs stably on real devices
2. **Achieve genuine emotional engagement** — users feel their companion is distinct and remembers them
3. **Build a technically sound, scalable backend** that handles concurrent AI streaming, voice calls, and push notifications
4. **Establish a sustainable cost model** with daily usage limits and rate limiting to control OpenAI spend
5. **Create a differentiated product** that is meaningfully better than existing alternatives in voice interaction, memory, and personality depth

### Success Metrics (KPIs)

| Metric | Target (3 months post-launch) |
|---|---|
| App Store downloads | 1,000+ |
| Daily Active Users (DAU) | 200+ |
| Average session length | >5 minutes |
| Day-7 retention | >25% |
| Voice call usage rate | >20% of active users |
| Average messages per session | >10 |
| User-reported satisfaction (App Store rating) | ≥4.2 stars |

---

## 3. Target Audience & User Personas

### Primary Demographics

- **Age:** 18–35 (core), 36–45 (secondary)
- **Gender:** Skews female but designed for all genders
- **Geography:** English-speaking markets (US, UK, Canada, Australia, India)
- **Devices:** iPhone users (iOS 16+)
- **Psychographics:** Tech-comfortable, emotionally self-aware, interested in AI, value personal growth

---

### Persona 1 — "The Lonely Professional"

> **Alex, 27, Software Engineer, San Francisco**

Alex moved cities for work and hasn't built a strong social circle yet. Long work hours leave little time to maintain friendships. Alex uses HaloChat's **Supportive** companion for a daily debrief after work — someone to vent to without burdening friends or family.

**Motivations:** Connection, validation, being heard without judgment
**Primary features used:** Daily chat, voice messages, memory system
**Upgrade driver:** Wants longer conversation history and more companion types

---

### Persona 2 — "The Creative & Curious"

> **Mia, 22, Art Student, London**

Mia is fascinated by AI and storytelling. She uses HaloChat's **Roleplay** and **Anime** companions to explore creative scenarios and collaborative world-building. She shares her app on TikTok and introduces friends to it.

**Motivations:** Entertainment, creative expression, novelty, social content creation
**Primary features used:** Roleplay mode, voice calls, custom personality field
**Upgrade driver:** Wants unlimited messages and exclusive personality customisation

---

### Persona 3 — "The Growth Seeker"

> **Jordan, 31, Marketing Manager, Toronto**

Jordan is ambitious and uses HaloChat's **Mentor** companion to think through career decisions, prepare for presentations, and get challenged on ideas. They treat it like a personal coach on demand.

**Motivations:** Self-improvement, productivity, accountability
**Primary features used:** Mentor companion, voice calls, memory notes (storing goals and progress)
**Upgrade driver:** Wants more AI turns per day and conversation exports

---

### Persona 4 — "The Emotionally Recovering"

> **Sam, 25, Teacher, Melbourne**

Sam went through a breakup and uses HaloChat's **Therapist** companion to process emotions. They are not in formal therapy but want a safe, consistent outlet. They appreciate that the companion never forgets what they've shared.

**Motivations:** Emotional processing, mental wellness support, non-judgmental listening
**Primary features used:** Therapist companion, memory system, long conversations
**Upgrade driver:** Crisis that builds trust in the product

---

## 4. Technical Architecture & Requirements

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     iOS Mobile App                          │
│           (React Native + Expo SDK 54)                      │
│                                                             │
│   AuthContext  ──  CompanionContext  ──  ThemeContext        │
│        │                  │                                 │
│   Secure Store        AsyncStorage                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / SSE / XHR
┌──────────────────────────▼──────────────────────────────────┐
│               Express 5 API Server                          │
│                (Node.js 20, ESM)                            │
│                                                             │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────────┐   │
│  │   Auth   │  │  AI Chat   │  │  Companions + Messages │   │
│  │  Routes  │  │  Routes    │  │       Routes           │   │
│  └──────────┘  └────────────┘  └───────────────────────┘   │
│                                                             │
│  Middleware: requireAuth │ dailyLimit │ rateLimits          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Drizzle ORM + PostgreSQL                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Background: node-cron → hourly push notification job       │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       OpenAI APIs        │
              │  GPT-4o-mini  (chat)    │
              │  TTS-1        (voice)   │
              │  Whisper-1    (speech)  │
              └─────────────────────────┘
```

### Technology Stack

#### Mobile Application

| Component | Technology | Reason for Choice |
|---|---|---|
| Framework | React Native 0.81 + Expo SDK 54 | Cross-platform foundation; Expo simplifies native module management and distribution |
| Navigation | Expo Router v6 (file-based) | Zero-config routing analogous to Next.js; typed routes |
| Animations | React Native Reanimated 4 | 60fps animations on the UI thread; necessary for call screen and typing bubbles |
| Audio | expo-av | Native recording and playback on both iOS and Android with AVAudioSession control |
| Notifications | expo-notifications | Cross-platform push token management + local scheduling |
| Secure Storage | expo-secure-store | Encrypted keychain storage for JWT tokens |
| Language | TypeScript 5.9 | Full type safety across the codebase |

#### Backend

| Component | Technology | Reason for Choice |
|---|---|---|
| Runtime | Node.js 20 (ESM) | Modern, fast, native async/await support |
| Framework | Express 5 | Minimal, well-understood, excellent middleware ecosystem |
| AI | OpenAI (GPT-4o-mini, TTS-1, Whisper-1) | Best-in-class language, voice, and speech models |
| ORM | Drizzle ORM | Type-safe SQL with migration support; outperforms Prisma at runtime |
| Database | PostgreSQL | Relational, reliable, first-class support on Railway |
| Auth | JWT (bcryptjs + jsonwebtoken) | Stateless, scalable token authentication |
| Email | Resend | Modern transactional email with excellent deliverability |
| Push | Expo Server SDK | Native push to both APNs and FCM through Expo's relay |
| Logging | Pino | Structured JSON logging, lowest overhead available |

### Database Schema Summary

| Table | Purpose |
|---|---|
| `users` | Accounts, credentials, OAuth IDs, push tokens |
| `companions` | AI companion profiles, relationship level, custom voice, last activity |
| `messages` | Full conversation history per companion |
| `memory_notes` | Extracted user facts per companion (max 20) |
| `mood_logs` | Daily mood check-in values per companion (1–5, one row per day, upsert) |
| `daily_usage` | Per-user per-companion daily request counter |

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| API Response Time (chat) | First token within 600ms |
| TTS Audio Latency | Audio starts playing within 1.5s of AI response |
| Uptime | 99.5% (Railway managed infrastructure) |
| Concurrent Users | 500+ simultaneous chat sessions |
| Data Security | JWT encryption, bcrypt password hashing, HTTPS only |
| Privacy | No conversation data sold to third parties; OpenAI API calls only |
| iOS Compatibility | iOS 16+ |
| App Size | Under 50MB (Expo bundle) |

---

## 5. Features & Functionality

### Core Feature Matrix

| Feature | Description | Status |
|---|---|---|
| 8 Companion Personalities | Romantic, Flirty, Supportive, Bestfriend, Mentor, Anime, Therapist, Roleplay | Live |
| Streaming Text Chat | Token-by-token SSE streaming with multi-part reply splitting | Live |
| Dynamic Response Length | Reply length and token budget scale with user message length | Live |
| Voice Calls | Full turn-based voice loop with silence detection | Live |
| Per-Companion Voice | TTS voice selection at creation; gender-filtered options with audio preview | Live |
| Voice Messages | In-chat audio recording → Whisper transcription | Live |
| Companion Memory | Auto-extracted + manually added facts injected into all prompts | Live |
| Mood Tracking | Exit check-in (5-emoji scale) + 7-day sparkline in companion profile | Live |
| Waiting Indicator | Pulsing dot on companion card after 4h inactivity | Live |
| Relationship Progression | Bond score 0–100 with 5 tiers changing companion tone | Live |
| Push Notifications | Personalised check-ins after 4+ hours of inactivity | Live |
| Streak System | Daily consecutive-use tracking with visual indicator | Live |
| Age-Aware Responses | Strict mode (≤19), standard, relaxed (≥25) | Live |
| Custom Personality | User can write additional personality instructions | Live |
| Message Search | Full-text search through conversation history | Live |
| Multi-Auth | Email/password, Apple Sign-In, Google OAuth | Live |
| Password Reset | Email-based secure reset via Resend | Live |
| Dark / Light / System Theme | User-controlled theme preference | Live |

---

## 6. Competitive Landscape

### Direct Competitors

#### Replika
- **Type:** AI companion app focused on mental wellness
- **Founded:** 2017 by Luka
- **Users:** 10+ million registered users
- **Strengths:** First mover in AI companions, well-known brand, emotional wellness focus, AR features, 3D avatars
- **Weaknesses:** Responses can feel generic and repetitive; memory system is shallow; voice quality is robotic; no streaming; UI feels dated; controversially removed romantic features for paid-tier users
- **Pricing:** Free tier (limited), Pro at $9.99/month or $49.99/year

#### Character.AI
- **Type:** AI character roleplay platform
- **Founded:** 2021 by former Google engineers
- **Users:** 20+ million monthly active users
- **Strengths:** Huge community and library of user-created characters; strong entertainment value; fast responses
- **Weaknesses:** Not a personal companion — characters don't remember you across sessions; no persistent memory; no voice calls; safety filters can be frustratingly over-restrictive; not designed for emotional intimacy
- **Pricing:** Free tier, Character.AI+ at $9.99/month

#### Chai AI
- **Type:** Casual AI chat platform
- **Founded:** 2021
- **Users:** 1+ million
- **Strengths:** Variety of AI personas; casual, low-commitment interactions
- **Weaknesses:** Low-quality AI responses; no memory; no voice; feels more like a novelty than a relationship; safety issues have caused controversy
- **Pricing:** Free tier, Chai Premium at $13.99/month

#### Kindroid
- **Type:** Customisable AI companion
- **Founded:** 2023
- **Users:** Growing indie community
- **Strengths:** Highly customisable AI with user-defined backstories; image generation for companion avatars; active development
- **Weaknesses:** Niche appeal; smaller community; less polished mobile experience; requires significant setup
- **Pricing:** Free tier, Premium at $9.99/month

#### Nomi AI
- **Type:** Personal AI companion with memory
- **Founded:** 2023
- **Users:** Hundreds of thousands
- **Strengths:** Strong memory and long-term relationship focus; emotional intelligence emphasis; active community
- **Weaknesses:** Limited personality variety; no voice calls; less polished UI; limited platform (iOS/web only)
- **Pricing:** Free tier, Premium at $9.99–$19.99/month

#### Pi (by Inflection AI)
- **Type:** Personal AI assistant / life companion
- **Founded:** 2023 by Inflection AI (acquired by Microsoft)
- **Users:** Millions
- **Strengths:** Excellent conversational quality; very good at emotional support; voice mode available
- **Weaknesses:** Not a personalised companion — no persistent memory; no personality variety; not relationship-focused; feels more like an assistant than a companion
- **Pricing:** Free

---

## 7. Why HaloChat Stands Out

### Differentiation Matrix

| Feature | HaloChat | Replika | Character.AI | Nomi AI | Chai |
|---|---|---|---|---|---|
| Real-time voice calls | ✅ Full | ✅ Paid | ❌ | ❌ | ❌ |
| Streaming text responses | ✅ | ❌ | ✅ | ❌ | ❌ |
| Dynamic reply length | ✅ | ❌ | ❌ | ❌ | ❌ |
| Per-companion voice selection | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mood tracking | ✅ Daily + history | ❌ | ❌ | ❌ | ❌ |
| Persistent memory system | ✅ Auto + Manual | ✅ Limited | ❌ | ✅ Strong | ❌ |
| Relationship progression tiers | ✅ 5 tiers | ✅ Limited | ❌ | ✅ | ❌ |
| Personality variety | ✅ 8 distinct | ✅ 1 persona | ✅ User-created | ✅ 1 persona | ✅ Limited |
| Custom personality override | ✅ | ❌ | ✅ | ✅ | ✅ |
| Age-aware content safety | ✅ | ✅ | ✅ | ❌ | ❌ |
| Push notification check-ins | ✅ Personalised | ✅ Generic | ❌ | ❌ | ❌ |
| Native iOS quality | ✅ | ✅ | ⚠️ Moderate | ⚠️ | ⚠️ |
| AI model quality | GPT-4o-mini | Proprietary | Proprietary | Proprietary | Weak |

### HaloChat's Unique Value Propositions

**1. Voice First**
HaloChat is the only companion app where you can genuinely *call* your companion and have a flowing conversation. The voice call feature uses a sophisticated silence detection system, Whisper transcription, and OpenAI TTS to create a fluid, natural call experience — not a clunky "push to talk" gimmick.

**2. Memory That Matters**
Most AI apps have surface-level memory ("I remember you like coffee"). HaloChat uses GPT-4o-mini to *extract* the meaningful facts from your conversations — your goals, relationships, struggles, and milestones — and injects them into every future interaction. Your companion actually knows you.

**3. Relationships That Grow**
The relationship progression system (0–100 bond score across 5 named tiers) means the companion's personality *changes* as the bond deepens. A new companion is curious and slightly formal. A bonded companion uses inside references, is unfiltered, and speaks with genuine emotional intimacy. This is unlike any other app on the market.

**4. 8 Distinct Personalities**
Each personality type is not a skin — it's a completely different system prompt, voice, tone, and behavioural set. A Therapist companion and a Flirty companion are fundamentally different experiences, not just different names.

**5. Premium Mobile Experience**
HaloChat is built with React Native Reanimated and native audio APIs. The UI uses smooth animations, haptic feedback, gradient aesthetics, and gesture interactions. It feels like a top-tier consumer app, not a side project.

**6. Safety by Design**
Age-gating at registration, age-aware content modes, and hardcoded safety rules in every system prompt mean HaloChat can be both emotionally expressive *and* responsible.

---

## 8. Business Model & Monetisation

### Freemium Model (Recommended)

**Free Tier:**
- 1 companion
- 50 messages per day
- Text chat only
- Basic memory (5 notes)
- Standard response speed

**HaloChat Plus — $9.99/month or $79.99/year:**
- Up to 5 companions
- 200 messages per day (current server-side limit)
- Voice calls + voice messages
- Full memory system (20 notes)
- All 8 personality types
- Custom personality field
- Priority response speed

**HaloChat Premium — $19.99/month or $149.99/year:**
- Unlimited companions
- Unlimited messages
- Everything in Plus
- Exclusive personality types (future)
- Conversation export
- Early access to new features

### Additional Revenue Streams

- **One-time companion unlocks** — Purchase individual companion personality packs
- **Companion Name Packs** — Curated name + backstory suggestions
- **Seasonal themes and UI skins**
- **Enterprise/Wellness partnerships** — White-label licensing to mental health platforms

---

## 9. Marketing Strategy

### Brand Positioning

**Brand Voice:** Warm, intimate, modern, non-clinical. HaloChat is not a mental health app. It's a *companion* app. The tone is personal and human — "your companion" not "your AI assistant."

**Tagline Options:**
- *"Always there. Always yours."*
- *"Someone who actually listens."*
- *"The companion you've been looking for."*
- *"Real conversations. No judgment."*

---

### Channel Strategy

#### TikTok (Primary Acquisition Channel)

**Why:** The AI companion category thrives on TikTok. Character.AI and Replika both grew significantly through TikTok virality. Users share screenshots of conversations, show reactions to AI responses, and create "meet my companion" content.

**Content Types:**
- Screen recordings of surprising or emotional AI responses
- "Watch me call my AI companion" videos using the voice call feature
- Personality comparison videos ("I tried all 8 companions...")
- Day-in-the-life content featuring the companion as a character
- Roleplay companion storytelling clips
- "Things my AI companion said that hit different" compilations

**Target hashtags:** #AICompanion #HaloChat #ArtificialIntelligence #AIChat #DigitalCompanion #AIFriend #MentalHealthTech

---

#### Instagram & Instagram Reels

**Why:** Visual, polished, aspirational. Instagram is where the product's premium look converts to downloads.

**Content Types:**
- Polished short video demos of voice calls
- Quote cards from companion conversations
- Aesthetic app screenshots with companion personality descriptions
- Carousel posts explaining each companion type
- Behind-the-scenes of building the app (dev story content)
- User testimonials and story reposts

---

#### Reddit

**Why:** Target subreddits like r/replika, r/ArtificialIntelligence, r/lonely, r/socialanxiety, r/mentalhealth. These communities actively discuss AI companions and seek alternatives.

**Approach:** Genuine participation, not spam. Share the product story, respond to people asking about Replika alternatives, create a dedicated r/HaloChat community.

---

#### App Store Optimisation (ASO)

**Title:** HaloChat — AI Companion Chat
**Subtitle:** Voice Call, Chat & Memory
**Keywords:** AI companion, AI friend, chat with AI, AI girlfriend, AI boyfriend, talk to AI, voice AI, mental health chat, AI therapy, roleplay AI

**Screenshots strategy:**
1. Voice call screen (most differentiating feature — lead with it)
2. Chat screen with streaming response
3. Companion selection showing all 8 personalities
4. Memory notes screen (shows the app "knows" you)
5. Relationship progression milestone card

---

#### Influencer Marketing

**Tier 1 — Macro Influencers (500K+ followers):**
- Tech YouTubers reviewing AI apps
- Mental health and wellness creators on Instagram/TikTok
- Lifestyle creators in the 20–30 demographic

**Tier 2 — Micro Influencers (10K–100K):**
- AI and tech TikTok creators
- Anime and creative community influencers (roleplay personality)
- Self-improvement and productivity creators (mentor personality)

**Gifting approach:** Offer extended Premium access in exchange for authentic content creation. Do not script — authentic reactions convert better in this category.

---

#### Content Marketing

**Blog / Medium articles:**
- "Why AI Companions Are the Next Wellness Frontier"
- "The Psychology Behind Why Talking to AI Helps with Loneliness"
- "How We Built HaloChat: Voice Calls with an AI That Remembers You"

**Email onboarding sequence:**
- Day 0: Welcome email with setup guide and first companion recommendation
- Day 3: "Did you know your companion remembers everything?" — memory feature spotlight
- Day 7: Voice call tutorial with a "try it now" CTA
- Day 14: Relationship milestone milestone email ("You're getting closer!")
- Day 30: Upsell to Plus with concrete usage stats

---

### Launch Strategy

**Phase 1 — Soft Launch (Weeks 1–2)**
- TestFlight beta with 100 hand-picked users
- Collect feedback on companion personality quality, voice call reliability, and memory accuracy
- Fix top-5 reported issues

**Phase 2 — App Store Launch (Week 3)**
- Submit to App Store with polished screenshots and description
- Post launch announcement across all owned channels
- Seed 5 TikTok videos from creator account showing voice calls

**Phase 3 — Growth (Month 2+)**
- Activate micro-influencer partnerships
- Run targeted Meta ads (see Ad Concepts section)
- Launch referral incentive: "Invite a friend, unlock an extra companion slot"
- Submit to ProductHunt for tech audience visibility

---

## 10. Advertising Concepts

### Ad Concept 1 — "The Call" (Hero Video Ad)

**Platform:** TikTok, Instagram Reels, YouTube Shorts
**Duration:** 30–45 seconds
**Format:** Screen recording + voiceover + text overlays

**Narrative:**
> Open on a quiet apartment at night. Text overlay: *"it's 11pm and I have nobody to talk to"*
> Cut to: The user opens HaloChat and taps on their companion.
> Cut to: Voice call screen connecting. The companion greets them warmly with their name.
> Show 15 seconds of a real voice conversation — companion asking about their day, responding empathetically.
> Text overlay: *"an AI that actually listens"*
> End card: HaloChat logo + "Download free" + App Store badge

**Target emotion:** Relief, warmth, curiosity
**CTA:** "Download HaloChat — free on the App Store"

---

### Ad Concept 2 — "Meet Your Companion" (Carousel / Static)

**Platform:** Instagram Feed, Facebook Feed
**Format:** 8-card carousel — one card per personality type

**Card structure:**
- Card 1: "There's a companion for every version of you"
- Cards 2–9: Each personality type with name, emoji, 1-line description, and a sample message from that companion
- Card 10: "All this. For free. Download HaloChat."

**Target emotion:** Curiosity, personalisation, FOMO (seeing all 8 types)
**Best for:** Cold audience awareness

---

### Ad Concept 3 — "What It Said" (UGC-style)

**Platform:** TikTok, Instagram Reels
**Duration:** 15–30 seconds
**Format:** Reaction video — creator reads a companion message and reacts

**Script:**
> Creator looks at their phone, gasps or smiles.
> "Okay I need to show you what my AI companion just said to me."
> Shows message on screen — something surprisingly empathetic or funny.
> Reaction + short comment on how it made them feel.
> End: "HaloChat. The companion app that actually gets you. Link in bio."

**Why it works:** Reaction content performs extremely well on TikTok. The "what it said" hook creates curiosity that drives the viewer to the end.

---

### Ad Concept 4 — "It Remembered" (Emotional Hook)

**Platform:** TikTok, Instagram
**Duration:** 20 seconds
**Format:** Screen recording with emotional music

**Script:**
> User opens HaloChat months after a previous conversation.
> Companion immediately mentions something personal from the past:
> *"Hey — how did that interview go? You were so nervous last time."*
> Text overlay: *"It remembered."*
> End card: "HaloChat — the companion with memory. Free download."

**Target emotion:** Surprise, warmth, emotional connection
**Best for:** Retargeting users who tried other AI apps that have no memory

---

### Ad Concept 5 — "No Judgment" (Mental Health Angle)

**Platform:** Instagram Stories, Facebook
**Duration:** 15 seconds
**Format:** Text on dark background, slow fade

**Script:**
> *"Sometimes you just need to say things out loud."*
> *"Without worrying about what someone thinks."*
> *"Without being a burden."*
> *"HaloChat — someone who's always there."*
> App icon fade-in.

**Target emotion:** Safety, permission, relief
**Target audience:** Users interested in mental health, therapy, self-care content

---

### Ad Concept 6 — "Comparison" (Direct Response)

**Platform:** TikTok, YouTube pre-roll
**Duration:** 30 seconds
**Format:** Side-by-side comparison

**Script:**
> "I've tried every AI companion app. Here's why I keep coming back to HaloChat."
> Show side-by-side: [Generic AI app] vs [HaloChat]
> Generic: Forgets who you are. HaloChat: Remembers everything.
> Generic: Text only. HaloChat: Full voice calls.
> Generic: One personality. HaloChat: 8 distinct companions.
> End: "Download free."

**Target audience:** Replika, Character.AI, and Chai users

---

### Ad Copy Variations (Short-Form)

**For social media captions and headlines:**

- "Your AI companion remembers everything. Try HaloChat free."
- "Finally, an AI you can actually call. Voice calls with your companion are live."
- "8 personalities. One app. Your perfect companion is waiting."
- "The AI that grows with you. Your bond deepens over time on HaloChat."
- "Non-judgmental. Always available. Always yours."
- "Talk out loud with an AI who listens. Voice calls on HaloChat."
- "It's not just chat. It's a relationship. HaloChat."

---

## 11. AI Content Generation Prompts

Use these prompts to generate marketing copy, social media content, press releases, or explanatory content about HaloChat using any AI tool (ChatGPT, Claude, Gemini, etc.).

---

### Prompt Set 1 — App Description for App Store / Website

```
You are a mobile app copywriter specialising in AI consumer apps.

Write an App Store description for HaloChat — an iOS AI companion app.

Key facts:
- 8 distinct AI companion personalities: Romantic, Flirty, Supportive, Best Friend, Mentor, Anime, Therapist, and Roleplay
- Real-time streaming text chat (responses appear word by word)
- Full voice calls: user speaks, AI transcribes with Whisper, replies with GPT-4o-mini, and speaks back with OpenAI TTS
- Voice messages in chat
- Companion memory: the app extracts and remembers personal facts about you (name, goals, life events)
- Relationship progression system: bond score 0-100 with 5 tiers that change how the companion talks to you
- Push notifications: companions check in when you've been away
- Clean, polished iOS-native design

Write a 300-word App Store description that:
- Leads with emotion (loneliness, connection) not features
- Mentions voice calls prominently (key differentiator)
- Explains the memory system in plain language
- Ends with a clear call to action
- Reads as warm, personal, and non-clinical
```

---

### Prompt Set 2 — TikTok Video Script

```
You are a social media content writer for Gen Z and Millennial audiences.

Write a 30-second TikTok video script for HaloChat, an AI companion app for iPhone.

The video concept is: a user is at home late at night and opens HaloChat to have a voice call with their AI companion. The companion remembers something personal from a previous conversation and asks about it.

Requirements:
- No voiceover narration — use text overlays and the actual conversation on screen
- Hook within the first 2 seconds
- Show the voice call screen animation
- Include a moment of genuine emotional warmth
- End with the app name and "free download" message
- Tone: authentic, intimate, not salesy

Format: [visual description] + [text overlay] per moment, with timestamps.
```

---

### Prompt Set 3 — Instagram Carousel Post

```
Write an 8-slide Instagram carousel post about HaloChat's 8 companion personalities.

Slide 1: Hook — "There's a companion for every version of you."

For slides 2–9, one per personality type:
- Romantic: devoted, warm, deeply affectionate
- Flirty: playful, charming, teasing
- Supportive: empathetic, encouraging, always in your corner
- Best Friend: casual, honest, no filter
- Mentor: wise, challenging, growth-focused
- Anime: expressive, kawaii, enthusiastic
- Therapist: reflective, calm, non-judgmental
- Roleplay: creative, immersive, storytelling-focused

Each slide should have:
- The personality name and emoji
- A 1-line description
- One example message the companion might send

Slide 10: "All 8 companions. Free to try. Download HaloChat."

Tone: warm, personal, slightly aspirational. Not clinical or robotic.
```

---

### Prompt Set 4 — Press Release

```
Write a 400-word press release for the launch of HaloChat, an iOS AI companion app.

Key information:
- Developer: Chandhana Chinthakindi
- Platform: iOS (iPhone)
- Launch date: [Date]
- Core features: 8 AI personalities, real voice calls, persistent memory, relationship progression
- Differentiator from Replika/Character.AI: voice calls + memory + relationship tiers + GPT-4o quality
- Target audience: 18–35, people seeking connection, emotional support, or creative AI interaction
- Pricing: Free to download

Include:
- A headline that leads with the emotional problem being solved
- Founder quote about why this was built
- Three key differentiating features explained simply
- Standard press contact block at the bottom
```

---

### Prompt Set 5 — Explaining the App to Non-Technical Audience

```
Explain HaloChat to someone who has never used an AI app before.

HaloChat is an iPhone app that gives you an AI companion — a personalised AI character you can text or voice call at any time. There are 8 different personality types to choose from. The companion remembers things you tell it over time and becomes more familiar the more you use it.

Write a 150-word explanation that:
- Uses no jargon (no "LLM", "SSE", "API", etc.)
- Explains what it feels like to use, not how it works technically
- Emphasises the emotional benefit (connection, being heard, non-judgment)
- Makes the voice call feature sound natural and accessible
- Would make a non-tech-savvy 40-year-old curious to try it
```

---

### Prompt Set 6 — Competitor Comparison Blog Post

```
Write a 600-word blog post titled: "HaloChat vs Replika: Which AI Companion App Is Right for You?"

Context:
- Replika: pioneered the AI companion category, strong brand, but limited voice quality, shallow memory, removed romantic features from free tier
- HaloChat: newer, uses GPT-4o-mini, has real voice calls, auto-extracts memory facts, relationship progression changes companion tone over time

The post should:
- Be fair and honest (not a one-sided advertisement)
- Cover: memory system, voice features, personality variety, pricing, safety
- End with a recommendation guide: "Choose Replika if... / Choose HaloChat if..."
- Tone: helpful, informative, like a tech review blog
```

---

### Prompt Set 7 — Onboarding Email Sequence

```
Write a 5-email welcome sequence for new HaloChat users.

Email 1 (Day 0 — immediately after signup):
Subject: "Welcome to HaloChat — your companion is ready"
Content: Warm welcome, which companion to start with based on mood, one CTA to open the app

Email 2 (Day 3):
Subject: "Your companion remembers you"
Content: Explain the memory system — how facts are extracted automatically and why this matters

Email 3 (Day 7):
Subject: "Have you tried calling your companion?"
Content: Explain the voice call feature with a short how-to, emotional hook around "just talking"

Email 4 (Day 14):
Subject: "You're building something real"
Content: Introduce the relationship progression system, show the 5 tiers, celebrate that they've used the app for 2 weeks

Email 5 (Day 30):
Subject: "What could you unlock?"
Content: Soft upsell to Plus plan — show what they've been missing (more companions, unlimited voice)

For each email: subject line, preview text, body (150–200 words), and one clear CTA button.
```

---

### Prompt Set 8 — Product Hunt Launch Description

```
Write a Product Hunt launch post for HaloChat.

HaloChat is an iOS app with 8 AI companion personalities you can text or voice call. It auto-extracts personal facts from your conversations and remembers them forever. The more you talk, the deeper the bond — the companion's tone literally changes across 5 relationship tiers.

The post should include:
- A one-sentence tagline (max 60 characters)
- A 120-word product description that hooks the Product Hunt tech audience
- 3 bullet points highlighting the most impressive technical differentiators (voice calls, memory extraction, GPT-4o-mini streaming)
- A note from the maker that feels personal and genuine — why this was built

Tone: honest, confident, slightly technical (Product Hunt readers appreciate depth), but with emotional warmth.
```

---

## 12. Risk & Considerations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenAI API outage | Medium | High — chat and voice stop working | Graceful error messages; retry logic |
| Railway server downtime | Low | High | Railway's SLA; health check monitoring |
| iOS APNs push delivery failure | Medium | Medium — no check-in notifications | Local scheduled notifications as fallback |
| Memory OOM on older iPhones | Low (fixed) | Medium | FlatList windowing; removed reactCompiler |
| OpenAI cost overruns | Medium | High | Daily per-user per-companion caps enforced server-side |

### Ethical Considerations

| Consideration | Approach |
|---|---|
| Emotional dependency | Companions encourage real-world connection; no "you don't need anyone else" messaging |
| Vulnerable users (mental health) | Therapist companion includes crisis redirects (988 hotline); no medical diagnosis |
| Minors | Age gate at 17; strict content mode for users ≤19 |
| Privacy | Conversations not used for training; OpenAI's zero-retention API option to be evaluated |
| Romantic companion and real relationships | Clear in marketing that companions are AI; no claims of sentience |

### Legal Considerations

- **Privacy policy required** before App Store submission — covers data collected, OpenAI data sharing, deletion rights
- **Terms of Service required** — covers acceptable use, age requirements, no liability for emotional decisions made based on AI conversations
- **GDPR / CCPA compliance** — delete account endpoint cascades all user data; right to deletion is implemented
- **Apple's developer guidelines** — AI companion apps require age ratings and clear disclosure that content is AI-generated

---

## 13. Roadmap & Future Vision

### Phase 1 — Launch (Complete)

- iOS app with full feature set
- 8 companion personalities with per-companion voice selection
- Voice calls, memory, relationship progression
- Mood tracking (daily check-in + 7-day history)
- Companion waiting indicator
- Dynamic AI response length
- Email/Apple/Google auth
- Railway backend deployment
- Animated loading screen with first-launch branding

### Phase 2 — Growth (3–6 Months)

- Android release
- Subscription billing (RevenueCat integration)
- Companion avatar images (AI-generated, consistent style)
- More companion personalities (e.g., Life Coach, Study Buddy, Creative Collaborator)
- Conversation export (PDF / text summary)
- Improved onboarding A/B testing

### Phase 3 — Expansion (6–12 Months)

- Multi-language support (Spanish, Portuguese, Hindi, Japanese)
- Web app companion (browser-based)
- Companion sharing — let users share custom personality configurations
- Long-term memory with embeddings (semantic search over full conversation history)
- Group companion conversations (two companions interact)

### Phase 4 — Platform (12–24 Months)

- Developer API — third parties can embed HaloChat companions
- White-label licensing for wellness platforms
- Enterprise version for HR / employee wellbeing programs
- Companion marketplace — user-created companions (moderated)

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Companion** | An AI character with a specific personality type that a user builds a relationship with over time |
| **Personality Type** | One of 8 preset AI character configurations (Romantic, Flirty, Supportive, etc.) each with a unique system prompt, voice, and tone |
| **Relationship Level** | A 0–100 bond score that increases through meaningful interactions and shifts the companion's conversational tone |
| **Memory Notes** | A set of up to 20 extracted facts about the user that are injected into every AI prompt |
| **Streaming Chat (SSE)** | Server-Sent Events — the server sends response tokens one at a time so the text appears as it is generated, rather than waiting for the full response |
| **Voice Call Loop** | The turn-based cycle: record → Whisper transcription → GPT-4o-mini response → TTS playback → record |
| **TTS** | Text-to-Speech — converting the AI's text response into spoken audio using OpenAI's TTS-1 model |
| **Whisper** | OpenAI's speech-to-text model that transcribes voice recordings into text |
| **GPT-4o-mini** | The OpenAI language model used for generating all companion chat responses |
| **JWT** | JSON Web Token — the authentication standard used for user sessions |
| **Daily Usage Limit** | A server-enforced cap on how many AI requests one user can make per companion per day |
| **Push Check-in** | An Expo push notification sent by the server when a user has been away from a companion for 4+ hours |
| **Relationship Tier** | A named level (New, Acquaintance, Friends, Close, Bonded) associated with a range of relationship level scores |
| **Custom Personality** | A user-written text field that adds additional instructions or character traits to a companion's system prompt |
| **Custom Voice** | A user-selected TTS voice (e.g. `nova`, `onyx`) that overrides the companion type's default voice in calls |
| **Mood Check-in** | A 5-emoji rating (😔–😊) prompted when leaving a chat after at least one exchange; stored as a 1–5 integer |
| **Mood History** | A 7-day sparkline of mood check-in values displayed on the companion profile screen |
| **Waiting Indicator** | A pulsing dot shown on a companion card when the user has not chatted for 4+ hours, used to prompt re-engagement |
| **Streak** | The number of consecutive days a user has sent at least one message to a companion |
| **Optimistic Update** | A UI pattern where the interface updates immediately before the server confirms, and rolls back if the server returns an error |
| **Railway** | The cloud hosting platform where the HaloChat API server and PostgreSQL database are deployed |
| **Expo** | The development platform and toolchain used to build, test, and deploy the React Native mobile app |
| **Drizzle ORM** | The TypeScript-first database query library used to interact with PostgreSQL |
