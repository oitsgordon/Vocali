import { describe, expect, it } from "vitest";
import {
  getRevenueCatProductId,
  hasVocaliProEntitlement,
  isRevenueCatIosPublicKey,
  isRevenueCatTestStoreKey,
  REVENUECAT_ENTITLEMENT_ID,
} from "./revenueCatConfig";

describe("RevenueCat configuration", () => {
  it("maps the Vocali plans to the configured RevenueCat products", () => {
    expect(getRevenueCatProductId("annual")).toBe("yearly");
    expect(getRevenueCatProductId("monthly")).toBe("monthly");
  });

  it("unlocks Vocali Pro only for the active configured entitlement", () => {
    expect(
      hasVocaliProEntitlement({
        entitlements: {
          active: {
            [REVENUECAT_ENTITLEMENT_ID]: { isActive: true },
          },
        },
      }),
    ).toBe(true);
    expect(
      hasVocaliProEntitlement({
        entitlements: {
          active: {
            [REVENUECAT_ENTITLEMENT_ID]: { isActive: false },
          },
        },
      }),
    ).toBe(false);
    expect(hasVocaliProEntitlement(null)).toBe(false);
  });

  it("detects Test Store keys so release checks can reject them", () => {
    expect(isRevenueCatTestStoreKey("test_example")).toBe(true);
    expect(isRevenueCatTestStoreKey("appl_example")).toBe(false);
    expect(isRevenueCatTestStoreKey(undefined)).toBe(false);
  });

  it("accepts only an Apple public SDK key for an iOS release", () => {
    expect(isRevenueCatIosPublicKey("appl_example")).toBe(true);
    expect(isRevenueCatIosPublicKey("test_example")).toBe(false);
    expect(isRevenueCatIosPublicKey("goog_example")).toBe(false);
  });
});
