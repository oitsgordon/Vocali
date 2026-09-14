import { describe, expect, it } from "vitest";
import { appleManagementUrl, loginPaywallHref, paywallReturn, periodLabel, planPresentation, safeInternalDestination, subscriptionStatus } from "./subscriptionPresentation";

describe("subscription navigation", () => {
  it("keeps only safe return destinations", () => {
    expect(safeInternalDestination("/practice?source=home")).toBe("/practice?source=home");
    expect(safeInternalDestination("//attacker.test")).toBe("/home");
    expect(safeInternalDestination("/%2Fattacker.test")).toBe("/home");
    expect(safeInternalDestination("/login?redirect=/login")).toBe("/home");
    expect(safeInternalDestination("/practice\\\\outside")).toBe("/home");
  });

  it("preserves login context and uses deterministic fallbacks", () => {
    expect(loginPaywallHref("signup", "/practice")).toContain("from=login");
    expect(loginPaywallHref("signup", "/practice")).toContain("mode=signup");
    expect(paywallReturn({ from: "settings" }, true)).toBe("/settings");
    expect(paywallReturn({}, true)).toBe("/home");
    expect(paywallReturn({}, false)).toBe("/login");
  });

  it("allows only Apple's management URLs", () => {
    expect(appleManagementUrl("https://apps.apple.com/account/subscriptions")).toContain("apps.apple.com");
    expect(appleManagementUrl("https://example.com/steal")).toBe("https://apps.apple.com/account/subscriptions");
  });
});

describe("store-backed subscription copy", () => {
  const product = {
    priceString: "$7.99",
    subscriptionPeriod: "P1M",
    introPrice: { price: 0, priceString: "$0.00", cycles: 1, period: "P3D" },
  };

  it("formats subscription periods", () => {
    expect(periodLabel("P1Y")).toBe("year");
    expect(periodLabel("P3D")).toBe("3 days");
    expect(periodLabel("bad")).toBeNull();
  });

  it("promises a trial only when eligibility is confirmed", () => {
    const eligible = planPresentation("monthly", product as never, 2);
    const unknown = planPresentation("monthly", product as never, 0);
    expect(eligible.cta).toBe("Start 3-day free trial");
    expect(unknown.cta).toBe("Subscribe");
    expect(unknown.renewal).toContain("$7.99/month");
  });

  it("never offers a new trial while changing plans", () => {
    const switching = planPresentation("monthly", product as never, 2, false, true);
    expect(switching.offer).toBe("Same Vocali Pro access");
    expect(switching.cta).toBe("Subscribe");
  });
});

describe("subscription status copy", () => {
  const base = {
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
  } as const;

  it("never calls an unknown state a free plan", () => {
    expect(subscriptionStatus({ ...base, customerStatus: "loading" })).toBe("Checking your subscription...");
    expect(subscriptionStatus({ ...base, status: "unavailable" })).toContain("iPhone app");
    expect(subscriptionStatus({ ...base, status: "configuration_required", errorMessage: "Configuration needed" })).toBe("Configuration needed");
  });

  it("reports a confirmed customer with no entitlement clearly", () => {
    expect(subscriptionStatus(base)).toBe("No active subscription");
  });
});
