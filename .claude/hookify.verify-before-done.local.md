---
name: verify-before-done
enabled: true
event: stop
pattern: .*
---

Before stopping, run this quick self-check:

**If you made code changes:**
- [ ] TypeScript compiles without errors (`pnpm --filter halochat exec tsc --noEmit`)
- [ ] No hardcoded hex colors added (use `useColors()` hook instead)
- [ ] `colors.dark.background` is still `"#3B2A25"` if colors.ts was touched

**If you updated documentation:**
- [ ] Ran a grep to confirm zero stale companion-type references (Flirty, Mentor, Anime, Therapist, Roleplay, "8 personalities", "8 archetypes", "8 distinct")
- [ ] Ran a grep to confirm activities description matches actual app (3 tracked cards + Mood Canvas, not "4 activities")

**For any task:**
- [ ] Goal is fully met — not partially met
- [ ] State what you verified and what (if anything) could not be confirmed
