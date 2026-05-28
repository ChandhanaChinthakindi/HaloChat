import { vi } from "vitest";

// Silence pino logging and prevent pino-pretty worker thread from spawning.
vi.mock("pino", () => ({
  default: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("pino-http", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

// Prevent expo-server-sdk from making real network calls.
vi.mock("expo-server-sdk", () => ({
  Expo: class {
    static isExpoPushToken(_token: string) { return true; }
  },
}));

// Prevent node-cron from scheduling anything during tests.
vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
  schedule: vi.fn(),
}));
