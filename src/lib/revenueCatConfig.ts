import type { PaywallPlanId } from "@/lib/paywallPlans";

export const REVENUECAT_ENTITLEMENT_ID = "vocali_pro";
export const REVENUECAT_PRODUCT_IDS: Record<PaywallPlanId, string> = {
  annual: "yearly",
  monthly: "monthly",
};

type CustomerInfoEntitlements = {
  entitlements?: {
    active?: Record<string, { isActive?: boolean } | undefined>;
  };
};

export function hasVocaliProEntitlement(
  customerInfo: CustomerInfoEntitlements | null | undefined,
) {
  return (
    customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_ID]
      ?.isActive === true
  );
}

export function isRevenueCatTestStoreKey(apiKey: string | null | undefined) {
  return apiKey?.trim().startsWith("test_") === true;
}

export function isRevenueCatIosPublicKey(apiKey: string | null | undefined) {
  return apiKey?.trim().startsWith("appl_") === true;
}

export function getRevenueCatProductId(planId: PaywallPlanId) {
  return REVENUECAT_PRODUCT_IDS[planId];
}
