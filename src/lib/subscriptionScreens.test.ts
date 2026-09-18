import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("custom Vocali subscription screens", () => {
  it("routes Settings to Vocali screens and keeps feedback local", () => {
    const settings = read("src/app/settings/page.tsx");
    expect(settings).toContain("/paywall?from=settings");
    expect(settings).toContain("/settings/subscription");
    expect(settings).toContain("SubscriptionControls");
    expect(settings).not.toContain("presentRevenueCatPaywall");
    expect(settings).not.toContain("presentRevenueCatCustomerCenter");
  });

  it("does not invoke RevenueCat-provided layouts", () => {
    const service = read("src/lib/revenueCat.ts");
    expect(service).not.toContain("RevenueCatUI");
    expect(service).not.toContain("presentPaywall");
    expect(service).not.toContain("presentCustomerCenter");
    expect(service).toContain('Capacitor.isPluginAvailable("Purchases")');
    expect(service).toContain("Promise.all([loadCustomer(revision), loadOffering(revision)])");
  });

  it("provides a custom plan-management screen", () => {
    const screen = read("src/components/subscriptions/SubscriptionScreen.tsx");
    const controls = read("src/components/subscriptions/SubscriptionControls.tsx");
    expect(screen).toContain("Change plan");
    expect(controls).toContain("Restore purchases");
    expect(screen).toContain("Cancel subscription");
    expect(screen).toContain("purchaseRevenueCatPlan");
  });
});
