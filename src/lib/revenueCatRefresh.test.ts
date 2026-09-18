// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  isConfigured: vi.fn(), configure: vi.fn(), setLogLevel: vi.fn(), addCustomerInfoUpdateListener: vi.fn(),
  getCustomerInfo: vi.fn(), getOfferings: vi.fn(), restorePurchases: vi.fn(),
}));
vi.mock("@capacitor/core", async (importOriginal) => ({ ...await importOriginal<typeof import("@capacitor/core")>(), Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios", isPluginAvailable: () => true } }));
vi.mock("@revenuecat/purchases-capacitor", async (importOriginal) => ({ ...await importOriginal<typeof import("@revenuecat/purchases-capacitor")>(), Purchases: sdk }));
const info = { entitlements: { active: { vocali_pro: { isActive: true } }, all: { vocali_pro: { isActive: true } } } };

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_API_KEY", "test_mock_only");
  sdk.isConfigured.mockResolvedValue({ isConfigured: false });
  sdk.getCustomerInfo.mockResolvedValue({ customerInfo: info });
  sdk.getOfferings.mockResolvedValue({ current: null });
  sdk.restorePurchases.mockResolvedValue({ customerInfo: info });
});
afterEach(() => vi.unstubAllEnvs());

describe("customer refresh and restore", () => {
  it("does not turn a failed customer refresh into a success", async () => {
    sdk.getCustomerInfo.mockRejectedValue(new Error("offline"));
    const { refreshSubscriptionInformation } = await import("./revenueCat");
    const result = await refreshSubscriptionInformation("test-user");
    expect(result.ok).toBe(false);
  });
  it("recovers on explicit retry and tolerates an offerings failure", async () => {
    sdk.getCustomerInfo.mockRejectedValueOnce(new Error("offline"));
    sdk.getOfferings.mockRejectedValue(new Error("plans unavailable"));
    const { refreshSubscriptionInformation } = await import("./revenueCat");
    expect((await refreshSubscriptionInformation("test-user")).ok).toBe(false);
    expect((await refreshSubscriptionInformation("test-user")).ok).toBe(true);
  });
  it("still permits restore after customer and offering fetch failures", async () => {
    sdk.getCustomerInfo.mockRejectedValue(new Error("offline"));
    sdk.getOfferings.mockRejectedValue(new Error("plans unavailable"));
    const { initializeRevenueCat, restoreRevenueCatPurchases } = await import("./revenueCat");
    await initializeRevenueCat("test-user");
    expect((await restoreRevenueCatPurchases()).ok).toBe(true);
    expect(sdk.restorePurchases).toHaveBeenCalledTimes(1);
  });
});
