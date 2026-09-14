import { PURCHASES_ERROR_CODE, type PurchasesError } from "@revenuecat/purchases-capacitor";

function failure(error: string, cancelled = false) {
  return { ok: false as const, cancelled, customerInfo: null, error };
}

export function subscriptionError(error: unknown, fallback: string) {
  const detail = (error ?? {}) as Partial<PurchasesError>;
  if (detail.userCancelled || detail.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return failure("Purchase cancelled.", true);
  }
  if (detail.code === PURCHASES_ERROR_CODE.NETWORK_ERROR || detail.code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR) {
    return failure("Check your internet connection and try again.");
  }
  if (detail.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
    return failure("This subscription is not available from the App Store yet.");
  }
  if (detail.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
    return failure("Purchases are not allowed on this device.");
  }
  if (detail.code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR) {
    return failure("Subscriptions are not configured correctly. Please contact support.");
  }
  return failure(fallback);
}
