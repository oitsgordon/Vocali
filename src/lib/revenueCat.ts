"use client";

import { Capacitor } from "@capacitor/core";
import {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  Purchases,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import {
  PAYWALL_RESULT,
  PaywallPresentationConfiguration,
  RevenueCatUI,
} from "@revenuecat/purchases-capacitor-ui";
import { useSyncExternalStore } from "react";
import type { PaywallPlanId } from "@/lib/paywallPlans";
import {
  getRevenueCatProductId,
  hasVocaliProEntitlement,
  REVENUECAT_ENTITLEMENT_ID,
} from "@/lib/revenueCatConfig";

type RevenueCatStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unavailable"
  | "configuration_required"
  | "error";

type RevenueCatSnapshot = {
  customerInfo: CustomerInfo | null;
  errorMessage: string | null;
  isPro: boolean;
  offering: PurchasesOffering | null;
  status: RevenueCatStatus;
};

export type RevenueCatActionResult =
  | {
      cancelled: false;
      customerInfo: CustomerInfo | null;
      ok: true;
    }
  | {
      cancelled: boolean;
      customerInfo: null;
      error: string;
      ok: false;
    };

const listeners = new Set<() => void>();
const serverSnapshot: RevenueCatSnapshot = {
  customerInfo: null,
  errorMessage: null,
  isPro: false,
  offering: null,
  status: "idle",
};
let snapshot = serverSnapshot;
let configurePromise: Promise<RevenueCatActionResult> | null = null;
let hasConfigured = false;
let identifiedUserId: string | null = null;
let customerInfoListenerId: string | null = null;

export function useRevenueCat() {
  return useSyncExternalStore(
    subscribeToRevenueCat,
    getRevenueCatSnapshot,
    getRevenueCatServerSnapshot,
  );
}

export async function initializeRevenueCat(appUserId: string | null) {
  if (!isNativeRevenueCatAvailable()) {
    updateSnapshot({
      errorMessage: null,
      status: "unavailable",
    });
    return failure(
      "Subscriptions are available in the Vocali iPhone app.",
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY?.trim();

  if (!apiKey) {
    updateSnapshot({
      errorMessage: "RevenueCat is not configured for this build.",
      status: "configuration_required",
    });
    return failure("RevenueCat is not configured for this build.");
  }

  if (configurePromise) {
    const result = await configurePromise;
    return result.ok ? synchronizeRevenueCatUser(appUserId) : result;
  }

  if (hasConfigured) {
    return synchronizeRevenueCatUser(appUserId);
  }

  configurePromise = configureRevenueCat(apiKey, appUserId);
  const result = await configurePromise;
  configurePromise = null;
  return result;
}

export async function refreshRevenueCatCustomerInfo() {
  if (!hasConfigured) {
    return failure("Subscriptions are still loading. Please try again.");
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    setCustomerInfo(customerInfo);
    return success(customerInfo);
  } catch (error) {
    return handleRevenueCatError(
      error,
      "Your subscription status could not be refreshed.",
    );
  }
}

export async function purchaseRevenueCatPlan(planId: PaywallPlanId) {
  if (!hasConfigured || snapshot.status !== "ready") {
    return failure(
      snapshot.errorMessage ??
        "Subscriptions are still loading. Please try again.",
    );
  }

  const selectedPackage = getRevenueCatPackage(planId, snapshot.offering);

  if (!selectedPackage) {
    return failure(
      `The ${planId} subscription is not available. Check the current RevenueCat offering.`,
    );
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: selectedPackage,
    });
    setCustomerInfo(customerInfo);

    if (!hasVocaliProEntitlement(customerInfo)) {
      return failure(
        "The purchase completed, but Vocali Pro is not active yet. Try Restore or contact support.",
      );
    }

    return success(customerInfo);
  } catch (error) {
    return handleRevenueCatError(error, "Your purchase could not be completed.");
  }
}

export async function restoreRevenueCatPurchases() {
  if (!hasConfigured) {
    return failure(
      snapshot.errorMessage ??
        "Subscriptions are still loading. Please try again.",
    );
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    setCustomerInfo(customerInfo);

    if (!hasVocaliProEntitlement(customerInfo)) {
      return failure("No active Vocali Pro subscription was found to restore.");
    }

    return success(customerInfo);
  } catch (error) {
    return handleRevenueCatError(
      error,
      "Your purchases could not be restored.",
    );
  }
}

export async function presentRevenueCatPaywall() {
  if (!hasConfigured) {
    return failure(
      snapshot.errorMessage ??
        "Subscriptions are still loading. Please try again.",
    );
  }

  try {
    const { result } = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
      offering: snapshot.offering ?? undefined,
      presentationConfiguration:
        PaywallPresentationConfiguration.FULL_SCREEN,
    });

    if (result === PAYWALL_RESULT.CANCELLED) {
      return failure("The subscription screen was closed.", true);
    }

    if (result === PAYWALL_RESULT.ERROR) {
      return failure("The subscription screen could not complete the request.");
    }

    return refreshRevenueCatCustomerInfo();
  } catch (error) {
    return handleRevenueCatError(
      error,
      "The subscription screen could not be opened.",
    );
  }
}

export async function presentRevenueCatCustomerCenter() {
  if (!hasConfigured) {
    return failure(
      snapshot.errorMessage ??
        "Subscriptions are still loading. Please try again.",
    );
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
    return refreshRevenueCatCustomerInfo();
  } catch (error) {
    return handleRevenueCatError(
      error,
      "Subscription management could not be opened.",
    );
  }
}

export async function trackVocaliPaywallImpression() {
  if (!hasConfigured || !snapshot.offering) {
    return;
  }

  try {
    await Purchases.trackCustomPaywallImpression({
      offering: snapshot.offering,
      paywallId: "vocali-custom-paywall",
    });
  } catch {
    // Analytics must never block the purchase screen.
  }
}

export function getRevenueCatPackage(
  planId: PaywallPlanId,
  offering: PurchasesOffering | null = snapshot.offering,
): PurchasesPackage | null {
  if (!offering) {
    return null;
  }

  const productId = getRevenueCatProductId(planId);
  const matchingProduct = offering.availablePackages.find(
    (candidate) => candidate.product.identifier === productId,
  );

  if (matchingProduct) {
    return matchingProduct;
  }

  return planId === "annual" ? offering.annual : offering.monthly;
}

async function configureRevenueCat(
  apiKey: string,
  appUserId: string | null,
): Promise<RevenueCatActionResult> {
  updateSnapshot({ errorMessage: null, status: "loading" });

  try {
    const { isConfigured } = await Purchases.isConfigured();

    if (!isConfigured) {
      await Purchases.setLogLevel({
        level:
          process.env.NODE_ENV === "development"
            ? LOG_LEVEL.DEBUG
            : LOG_LEVEL.INFO,
      });
      await Purchases.configure({
        apiKey,
        appUserID: appUserId ?? undefined,
        automaticDeviceIdentifierCollectionEnabled: false,
      });
    }

    hasConfigured = true;
    identifiedUserId = appUserId;
    await addCustomerInfoListener();
    await loadRevenueCatState();
    return success(snapshot.customerInfo);
  } catch (error) {
    const result = handleRevenueCatError(
      error,
      "RevenueCat could not be initialized.",
    );
    if (!result.ok) {
      updateSnapshot({ errorMessage: result.error, status: "error" });
    }
    return result;
  }
}

async function synchronizeRevenueCatUser(appUserId: string | null) {
  try {
    if (appUserId && appUserId !== identifiedUserId) {
      const { customerInfo } = await Purchases.logIn({ appUserID: appUserId });
      identifiedUserId = appUserId;
      setCustomerInfo(customerInfo);
    } else if (!appUserId && identifiedUserId) {
      const { customerInfo } = await Purchases.logOut();
      identifiedUserId = null;
      setCustomerInfo(customerInfo);
    }

    if (snapshot.status !== "ready") {
      await loadRevenueCatState();
    }

    return success(snapshot.customerInfo);
  } catch (error) {
    return handleRevenueCatError(
      error,
      "Your subscription account could not be synchronized.",
    );
  }
}

async function loadRevenueCatState() {
  const [offerings, customer] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
  ]);

  snapshot = {
    customerInfo: customer.customerInfo,
    errorMessage: offerings.current
      ? null
      : "No current RevenueCat offering is configured.",
    isPro: hasVocaliProEntitlement(customer.customerInfo),
    offering: offerings.current,
    status: "ready",
  };
  emitRevenueCatChange();
}

async function addCustomerInfoListener() {
  if (customerInfoListenerId) {
    return;
  }

  customerInfoListenerId = await Purchases.addCustomerInfoUpdateListener(
    (customerInfo) => setCustomerInfo(customerInfo),
  );
}

function setCustomerInfo(customerInfo: CustomerInfo) {
  updateSnapshot({
    customerInfo,
    isPro: hasVocaliProEntitlement(customerInfo),
  });
}

function handleRevenueCatError(error: unknown, fallback: string) {
  const purchasesError = error as Partial<PurchasesError>;
  const cancelled =
    purchasesError.code ===
      PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    purchasesError.userCancelled === true;

  if (cancelled) {
    return failure("Purchase cancelled.", true);
  }

  const errorMessage =
    purchasesError.code === PURCHASES_ERROR_CODE.NETWORK_ERROR ||
    purchasesError.code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR
      ? "Check your internet connection and try again."
      : purchasesError.code ===
            PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR
        ? "This subscription is not available from the App Store yet."
        : purchasesError.code ===
              PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR
          ? "Purchases are not allowed on this device."
          : purchasesError.code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR
            ? "RevenueCat or App Store products are not configured correctly."
            : fallback;

  updateSnapshot({ errorMessage });
  return failure(errorMessage);
}

function success(customerInfo: CustomerInfo | null): RevenueCatActionResult {
  return {
    cancelled: false,
    customerInfo,
    ok: true,
  };
}

function failure(
  error: string,
  cancelled = false,
): RevenueCatActionResult {
  return {
    cancelled,
    customerInfo: null,
    error,
    ok: false,
  };
}

function isNativeRevenueCatAvailable() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isPluginAvailable("Purchases") &&
    Capacitor.isPluginAvailable("RevenueCatUI")
  );
}

function subscribeToRevenueCat(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getRevenueCatSnapshot() {
  return snapshot;
}

function getRevenueCatServerSnapshot() {
  return serverSnapshot;
}

function updateSnapshot(next: Partial<RevenueCatSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emitRevenueCatChange();
}

function emitRevenueCatChange() {
  for (const listener of listeners) {
    listener();
  }
}

export { REVENUECAT_ENTITLEMENT_ID };
