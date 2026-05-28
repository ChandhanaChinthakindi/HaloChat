import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calcAge, splitIntoMessages, detectMood, formatLastSeen, formatDate } from "../utils/chatUtils";

// ---------------------------------------------------------------------------
// calcAge
// ---------------------------------------------------------------------------
describe("calcAge", () => {
  it("returns the correct age for a past birthday this year", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 25, 0, 1); // Jan 1, 25 years ago
    expect(calcAge(dob.toISOString().slice(0, 10))).toBe(25);
  });

  it("returns age minus one when birthday has not yet occurred this year", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 25, 11, 31); // Dec 31, 25 years ago
    const age = calcAge(dob.toISOString().slice(0, 10));
    // If today is not Dec 31, birthday is still upcoming — age should be 24
    if (today.getMonth() < 11 || today.getDate() < 31) {
      expect(age).toBe(24);
    } else {
      expect(age).toBe(25);
    }
  });

  it("detects a 16-year-old as under 17", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 16);
    dob.setDate(dob.getDate() - 1); // birthday was yesterday, so full 16 years
    expect(calcAge(dob.toISOString().slice(0, 10))).toBe(16);
    expect(calcAge(dob.toISOString().slice(0, 10))).toBeLessThan(17);
  });

  it("detects a 17-year-old as meeting the minimum age requirement", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 17);
    dob.setDate(dob.getDate() - 1);
    expect(calcAge(dob.toISOString().slice(0, 10))).toBe(17);
    expect(calcAge(dob.toISOString().slice(0, 10))).toBeGreaterThanOrEqual(17);
  });

  it("returns 0 for a date of birth that is today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(calcAge(today)).toBe(0);
  });

  it("handles a future date of birth by returning a negative age", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(calcAge(future.toISOString().slice(0, 10))).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// splitIntoMessages
// ---------------------------------------------------------------------------
describe("splitIntoMessages", () => {
  it("splits on newlines", () => {
    expect(splitIntoMessages("Hello!\nHow are you?")).toEqual(["Hello!", "How are you?"]);
  });

  it("handles multiple blank lines between parts", () => {
    const result = splitIntoMessages("Hey\n\n\nWhat's up?");
    expect(result).toEqual(["Hey", "What's up?"]);
  });

  it("returns a single-element array for a short message without newlines", () => {
    expect(splitIntoMessages("Just a quick hi!")).toEqual(["Just a quick hi!"]);
  });

  it("returns an empty array for whitespace-only input", () => {
    expect(splitIntoMessages("   \n   \n   ")).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(splitIntoMessages("")).toEqual([]);
  });

  it("keeps short lines intact (≤ 100 chars)", () => {
    const short = "This is under 100 characters long.";
    expect(splitIntoMessages(short)).toEqual([short]);
  });

  it("splits long lines at sentence boundaries", () => {
    const long =
      "This is the very first sentence that has many words. This is the second sentence that also has many words. And here is the third sentence.";
    const result = splitIntoMessages(long);
    expect(result.length).toBeGreaterThan(1);
    // Each part should be within a reasonable length
    result.forEach((part) => expect(part.length).toBeLessThanOrEqual(150));
  });

  it("trims leading/trailing whitespace from each line", () => {
    expect(splitIntoMessages("  hello  \n  world  ")).toEqual(["hello", "world"]);
  });
});

// ---------------------------------------------------------------------------
// detectMood
// ---------------------------------------------------------------------------
describe("detectMood", () => {
  it("returns 😄 for laughter signals", () => {
    expect(detectMood("haha that's hilarious")).toBe("😄");
    expect(detectMood("lol okay")).toBe("😄");
    expect(detectMood("lmao no way")).toBe("😄");
  });

  it("returns 🥺 for empathy/difficulty signals", () => {
    expect(detectMood("that's tough, I hear you")).toBe("🥺");
    expect(detectMood("sounds hard")).toBe("🥺");
    expect(detectMood("that must be exhausting")).toBe("🥺");
  });

  it("returns 🤔 for curiosity/interest signals", () => {
    expect(detectMood("wait really? that's interesting")).toBe("🤔");
    expect(detectMood("tell me more, I'm curious")).toBe("🤔");
  });

  it("returns 🥰 for joy/love signals", () => {
    expect(detectMood("I love this, so happy!")).toBe("🥰");
    expect(detectMood("amazing and wonderful, yay")).toBe("🥰");
  });

  it("returns 💭 for thoughtful/reflective signals", () => {
    expect(detectMood("honestly I think we should consider this")).toBe("💭");
    expect(detectMood("I feel like maybe we need to look at it differently")).toBe("💭");
  });

  it("returns 🌿 (default) for neutral text", () => {
    expect(detectMood("sure")).toBe("🌿");
    expect(detectMood("ok")).toBe("🌿");
    expect(detectMood("")).toBe("🌿");
  });

  it("is case-insensitive", () => {
    expect(detectMood("HAHA")).toBe("😄");
    expect(detectMood("Sounds Hard")).toBe("🥺");
  });
});

// ---------------------------------------------------------------------------
// formatLastSeen
// ---------------------------------------------------------------------------
describe("formatLastSeen", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns 'active recently' when timestamp is undefined", () => {
    expect(formatLastSeen(undefined)).toBe("active recently");
  });

  it("returns 'active now' when less than 2 minutes ago", () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const ts = new Date("2026-01-01T11:59:00Z").getTime(); // 1 min ago
    expect(formatLastSeen(ts)).toBe("active now");
  });

  it("returns minutes ago for 2–59 minutes", () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const ts = new Date("2026-01-01T11:45:00Z").getTime(); // 15 min ago
    expect(formatLastSeen(ts)).toBe("active 15m ago");
  });

  it("returns hours ago for 1–23 hours", () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const ts = new Date("2026-01-01T09:00:00Z").getTime(); // 3 hrs ago
    expect(formatLastSeen(ts)).toBe("active 3h ago");
  });

  it("returns 'active yesterday' for 24–47 hours ago", () => {
    vi.setSystemTime(new Date("2026-01-02T12:00:00Z"));
    const ts = new Date("2026-01-01T12:00:00Z").getTime(); // exactly 24h ago
    expect(formatLastSeen(ts)).toBe("active yesterday");
  });

  it("returns days ago for 48+ hours", () => {
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"));
    const ts = new Date("2026-01-01T12:00:00Z").getTime(); // 4 days ago
    expect(formatLastSeen(ts)).toBe("active 4d ago");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns 'Today' for a timestamp from today", () => {
    vi.setSystemTime(new Date("2026-05-27T10:00:00Z"));
    const ts = new Date("2026-05-27T08:00:00Z").getTime();
    expect(formatDate(ts)).toBe("Today");
  });

  it("returns 'Yesterday' for a timestamp from yesterday", () => {
    vi.setSystemTime(new Date("2026-05-27T10:00:00Z"));
    const ts = new Date("2026-05-26T14:00:00Z").getTime();
    expect(formatDate(ts)).toBe("Yesterday");
  });

  it("returns a formatted date string for older timestamps", () => {
    vi.setSystemTime(new Date("2026-05-27T10:00:00Z"));
    const ts = new Date("2026-05-20T12:00:00Z").getTime();
    const result = formatDate(ts);
    expect(result).not.toBe("Today");
    expect(result).not.toBe("Yesterday");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
