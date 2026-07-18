import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAttempts: vi.fn(),
  clearStoredDailyChallenge: vi.fn(() => true),
  clearRecordings: vi.fn(async () => true),
  clearStreakCelebration: vi.fn(() => true),
  clearUserPreferences: vi.fn(() => true),
}));

vi.mock("@/lib/attemptStorage", () => ({ clearAttempts: mocks.clearAttempts }));
vi.mock("@/lib/dailyChallenge", () => ({
  clearStoredDailyChallenge: mocks.clearStoredDailyChallenge,
}));
vi.mock("@/lib/recordingStorage", () => ({
  clearRecordings: mocks.clearRecordings,
}));
vi.mock("@/lib/streakCelebration", () => ({
  clearStreakCelebration: mocks.clearStreakCelebration,
}));
vi.mock("@/lib/userPreferences", () => ({
  clearUserPreferences: mocks.clearUserPreferences,
}));

import { clearAllLocalVocaliData } from "./localDataCleanup";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("clearAllLocalVocaliData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    localStorage.setItem("vocali:user-preferences:v1", "stored");
    localStorage.setItem("unrelated", "keep");
    sessionStorage.setItem("vocali:oauth-redirect", "/home");

    vi.stubGlobal("window", { localStorage, sessionStorage });
  });

  it("clears recordings, cached data, preferences, and Vocali storage", async () => {
    const result = await clearAllLocalVocaliData();

    expect(result.ok).toBe(true);
    expect(mocks.clearAttempts).toHaveBeenCalledOnce();
    expect(mocks.clearRecordings).toHaveBeenCalledOnce();
    expect(mocks.clearUserPreferences).toHaveBeenCalledOnce();
    expect(mocks.clearStoredDailyChallenge).toHaveBeenCalledOnce();
    expect(mocks.clearStreakCelebration).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("vocali:user-preferences:v1")).toBeNull();
    expect(window.sessionStorage.getItem("vocali:oauth-redirect")).toBeNull();
    expect(window.localStorage.getItem("unrelated")).toBe("keep");
  });
});
