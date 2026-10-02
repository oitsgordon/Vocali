import { describe, expect, it } from "vitest";
import { parseRevenueCatEntitlement } from "./revenueCatEntitlement";

describe("RevenueCat server entitlement parsing", () => {
  const now = new Date("2026-10-02T00:00:00.000Z");

  it("accepts an entitlement that has not expired", () => {
    expect(parseRevenueCatEntitlement({ subscriber: { entitlements: { vocali_pro: { expires_date: "2026-10-03T00:00:00.000Z" } } } }, now)).toMatchObject({ ok: true, active: true });
  });

  it("keeps lifetime access active", () => {
    expect(parseRevenueCatEntitlement({ subscriber: { entitlements: { vocali_pro: { expires_date: null } } } }, now)).toEqual({ ok: true, active: true, expiresAt: null });
  });

  it("rejects expired, missing, and malformed entitlement data safely", () => {
    expect(parseRevenueCatEntitlement({ subscriber: { entitlements: { vocali_pro: { expires_date: "2026-10-01T00:00:00.000Z" } } } }, now)).toMatchObject({ ok: true, active: false });
    expect(parseRevenueCatEntitlement({ subscriber: { entitlements: {} } }, now)).toEqual({ ok: true, active: false, expiresAt: null });
    expect(parseRevenueCatEntitlement({ subscriber: { entitlements: { vocali_pro: { expires_date: "invalid" } } } }, now)).toEqual({ ok: false, reason: "provider" });
  });
});
