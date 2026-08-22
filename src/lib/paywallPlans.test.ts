import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAYWALL_PLAN_ID,
  getPaywallCta,
  getPaywallPlan,
  getPaywallRenewalCopy,
} from "./paywallPlans";

function readRepositoryFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("paywall presentation", () => {
  it("defaults to the annual best-value plan", () => {
    const plan = getPaywallPlan(DEFAULT_PAYWALL_PLAN_ID);

    expect(plan).toMatchObject({
      id: "annual",
      price: "A$69.99",
      trialDays: 7,
      badge: "Best value",
    });
    expect(getPaywallCta(plan)).toBe("Start 7-day free trial");
    expect(getPaywallRenewalCopy(plan)).toBe(
      "Then A$69.99/year. Renews automatically. Cancel anytime in Apple settings.",
    );
  });

  it("updates presentation copy for the monthly plan", () => {
    const plan = getPaywallPlan("monthly");

    expect(getPaywallCta(plan)).toBe("Start 3-day free trial");
    expect(getPaywallRenewalCopy(plan)).toBe(
      "Then A$9.99/month. Renews automatically. Cancel anytime in Apple settings.",
    );
  });

  it("keeps required value, legal, and visual-only affordances on screen", () => {
    const screen = readRepositoryFile(
      "src/components/paywall/PaywallScreen.tsx",
    );

    expect(screen).toContain("Keep your streak going");
    expect(screen).toContain(
      "Unlock daily practice, transcripts, and progress.",
    );
    expect(screen).toContain('const benefits = ["Daily prompts", "Transcript review", "Streak tracking"]');
    expect(screen).toContain('href="/privacy"');
    expect(screen).toContain("itunes/dev/stdeula");
    expect(screen).toContain("Purchases are not connected on this preview screen.");
  });
});
