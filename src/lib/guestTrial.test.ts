// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://vocali.test"}
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GUEST_TRIAL_COMPLETED_KEY, hasCompletedGuestTrial, isAccessGateEnabled, isAnonymousUser, markGuestTrialCompleted } from "./guestTrial";

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  get length() { return storage.size; },
  clear: () => storage.clear(),
  getItem: (key) => storage.get(key) ?? null,
  key: (index) => Array.from(storage.keys())[index] ?? null,
  removeItem: (key) => { storage.delete(key); },
  setItem: (key, value) => { storage.set(key, value); },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

describe("guest trial state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("records completion per installation", () => {
    expect(hasCompletedGuestTrial()).toBe(false);
    markGuestTrialCompleted();
    expect(window.localStorage.getItem(GUEST_TRIAL_COMPLETED_KEY)).toBe("true");
    expect(hasCompletedGuestTrial()).toBe(true);
  });

  it("distinguishes anonymous users and keeps the launch gate off by default", () => {
    expect(isAnonymousUser({ is_anonymous: true } as never)).toBe(true);
    expect(isAnonymousUser({ is_anonymous: false } as never)).toBe(false);
    expect(isAccessGateEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ACCESS_GATE_ENABLED", "true");
    expect(isAccessGateEnabled()).toBe(true);
  });
});
