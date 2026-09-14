import { PURCHASES_ERROR_CODE } from "@revenuecat/purchases-capacitor";
import { describe, expect, it } from "vitest";
import { subscriptionError } from "./revenueCatErrors";

describe("RevenueCat action errors", () => {
  it("treats cancellation as a quiet, recoverable result", () => {
    expect(subscriptionError({ userCancelled: true }, "fallback")).toEqual({
      ok: false,
      cancelled: true,
      customerInfo: null,
      error: "Purchase cancelled.",
    });
  });

  it("gives useful network and configuration messages", () => {
    const network = subscriptionError({ code: PURCHASES_ERROR_CODE.NETWORK_ERROR }, "fallback");
    const configuration = subscriptionError({ code: PURCHASES_ERROR_CODE.CONFIGURATION_ERROR }, "fallback");
    expect(network.ok).toBe(false);
    expect(configuration.ok).toBe(false);
    if (!network.ok && !configuration.ok) {
      expect(network.error).toContain("internet connection");
      expect(configuration.error).toContain("not configured correctly");
    }
  });
});
