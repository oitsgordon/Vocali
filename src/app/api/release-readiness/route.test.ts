import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
  } else {
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY = originalKey;
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
});
