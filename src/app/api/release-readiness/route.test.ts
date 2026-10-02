import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
const originalGate = process.env.NEXT_PUBLIC_ACCESS_GATE_ENABLED;
const originalSupport = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const originalTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
  } else {
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY = originalKey;
  }
  for (const [name, value] of [
    ["NEXT_PUBLIC_ACCESS_GATE_ENABLED", originalGate],
    ["NEXT_PUBLIC_SUPPORT_EMAIL", originalSupport],
    ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", originalTurnstile],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("GET /api/release-readiness", () => {
  it("rejects a Test Store key for production releases", async () => {
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY = "test_example";

    const response = GET();

    await expect(response.json()).resolves.toMatchObject({
      revenueCat: {
        configured: true,
        entitlement: "vocali_pro",
        productionKey: false,
        products: ["yearly", "monthly"],
      },
    });
  });

  it("accepts an iOS public SDK key without returning the key", async () => {
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY = "appl_example";

    const response = GET();
    const body = await response.json();

    expect(body.revenueCat.productionKey).toBe(true);
    expect(JSON.stringify(body)).not.toContain("appl_example");
  });

  it("reports ready only when every hosted release control is configured", async () => {
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY = "appl_example";
    process.env.NEXT_PUBLIC_ACCESS_GATE_ENABLED = "true";
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "vocalisupport@gmail.com";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "turnstile-public-example";

    const response = GET();

    await expect(response.json()).resolves.toMatchObject({
      ready: true,
      accessGateEnabled: true,
      supportEmailConfigured: true,
      turnstileConfigured: true,
    });
  });

  it("does not expose configuration values and fails closed when the gate is disabled", async () => {
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY = "appl_example";
    process.env.NEXT_PUBLIC_ACCESS_GATE_ENABLED = "false";
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "vocalisupport@gmail.com";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "turnstile-public-example";

    const body = await GET().json();

    expect(body.ready).toBe(false);
    expect(JSON.stringify(body)).not.toContain("vocalisupport@gmail.com");
    expect(JSON.stringify(body)).not.toContain("turnstile-public-example");
  });
});
