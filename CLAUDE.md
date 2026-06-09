# HaloChat — Claude Code Instructions

## General Workflow

- Do not declare a task complete until it has been verified end-to-end. State what was checked and what remains uncertain.
- When asked to audit or update documentation against the codebase, do a complete pass: verify every reference against actual code before claiming the task is complete. Run a final grep to confirm zero stale references remain.
- Before starting work on a non-trivial task, give a short numbered plan and wait for confirmation if the approach is unclear.

## Documentation

- Whenever editing documentation (README.md, replit.md, docs/PROJECT_DOCUMENTATION.md), cross-check every factual claim against the live source files using Grep and Read.
- After completing a documentation pass, run a targeted grep for the most common stale reference patterns before reporting done.
- Keep README.md in sync with the current project state on every commit.

## UI / Styling

- For UI or theming changes that should apply app-wide (e.g. backgrounds, colors), first map the navigation/screen component tree to identify any opaque layers (tab navigator, screen wrappers, layout containers) that could block the change.
- Verify the result on every affected screen before reporting done — not just the screen where it was first applied.
- Do not make multiple trial-and-error edits without first understanding why a previous attempt failed.

## Project Context

- Monorepo: `artifacts/halochat` (Expo React Native) + `artifacts/api-server` (Express 5 + Node.js)
- Package manager: pnpm with workspace symlinks resolved via `extraNodeModules` in metro.config.js
- 4 companion types: `romantic`, `supportive`, `uplift`, `bestfriend`
- Dark mode background `colors.dark.background = "#3B2A25"` must never be changed
- Activities tab has 3 streak-tracked cards (Breathing 4-4-4, Journal, Gratitude) + a Mood Canvas (not streak-tracked)
- `useColors()` hook returns the active theme palette; always use it instead of hardcoded hex values
- New architecture enabled (`newArchEnabled: true`); expo-speech does not work in new arch — use OpenAI TTS instead
