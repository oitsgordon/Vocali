import { describe, expect, it } from "vitest";
import { getSubscriptionAccessState, type RevenueCatSnapshot } from "./revenueCat";

function state(overrides: Partial<RevenueCatSnapshot> = {}): RevenueCatSnapshot {
  return {
    status: "ready",
    customerStatus: "ready",
    customerInfo: null,
    customerError: null,
    errorMessage: null,
    offeringError: null,
    offering: null,
    eligibility: {},
    isPro: false,
    busy: false,
    ...overrides,
  };
}

describe("subscription access state", () => {
  it("distinguishes disabled, guest, loading, and unavailable access", () => {
    expect(getSubscriptionAccessState({ enabled: false, isAnonymous: false, state: state() })).toBe("disabled");
    expect(getSubscriptionAccessState({ enabled: true, isAnonymous: true, state: state() })).toBe("anonymous_guest");
    expect(getSubscriptionAccessState({ enabled: true, isAnonymous: false, state: state({ customerStatus: "loading" }) })).toBe("loading");
    expect(getSubscriptionAccessState({ enabled: true, isAnonymous: false, state: state({ status: "unavailable" }) })).toBe("unavailable");
  });

  it("distinguishes active, cancelled-but-active, and expired access", () => {
    expect(getSubscriptionAccessState({ enabled: true, isAnonymous: false, state: state({ isPro: true, customerInfo: { entitlements: { all: { vocali_pro: { willRenew: true } } } } as never }) })).toBe("active");
    expect(getSubscriptionAccessState({ enabled: true, isAnonymous: false, state: state({ isPro: true, customerInfo: { entitlements: { all: { vocali_pro: { willRenew: false } } } } as never }) })).toBe("active_until_expiry");
    expect(getSubscriptionAccessState({ enabled: true, isAnonymous: false, state: state() })).toBe("expired_or_missing");
  });
});
