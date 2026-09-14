"use client";

import { Capacitor } from "@capacitor/core";
import { LOG_LEVEL, Purchases, type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { useSyncExternalStore } from "react";
import type { PaywallPlanId } from "@/lib/paywallPlans";
import { getRevenueCatProductId, hasVocaliProEntitlement, REVENUECAT_ENTITLEMENT_ID } from "@/lib/revenueCatConfig";
import { subscriptionError } from "@/lib/revenueCatErrors";

type Status = "idle" | "loading" | "ready" | "unavailable" | "configuration_required" | "error";
export type RevenueCatSnapshot = {
  status: Status;
  customerStatus: "idle" | "loading" | "ready" | "error";
  customerInfo: CustomerInfo | null;
  customerError: string | null;
  errorMessage: string | null;
  offeringError: string | null;
  offering: PurchasesOffering | null;
  eligibility: Record<string, { status: number }>;
  isPro: boolean;
  busy: boolean;
};
export type RevenueCatActionResult =
  | { ok: true; cancelled: false; customerInfo: CustomerInfo | null }
  | { ok: false; cancelled: boolean; customerInfo: null; error: string };

const serverSnapshot: RevenueCatSnapshot = {
  status: "idle", customerStatus: "idle", customerInfo: null, customerError: null,
  errorMessage: null, offeringError: null, offering: null, eligibility: {}, isPro: false, busy: false,
};
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
let configured = false;
let identifiedUser: string | null = null;
let requestedUser: string | null = null;
let identityRevision = 0;
let listenerAdded = false;
let initialization: Promise<RevenueCatActionResult> | null = null;

export function useRevenueCat() {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function update(next: Partial<RevenueCatSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}
function success(customerInfo = snapshot.customerInfo): RevenueCatActionResult { return { ok: true, cancelled: false, customerInfo }; }
function failure(error: string, cancelled = false): RevenueCatActionResult { return { ok: false, cancelled, customerInfo: null, error }; }

export async function initializeRevenueCat(userId: string | null, refresh = false): Promise<RevenueCatActionResult> {
  if (requestedUser !== userId) {
    requestedUser = userId;
    identityRevision++;
    update({ customerInfo: null, customerStatus: "idle", eligibility: {}, isPro: false });
  }
  // Serialize identity changes and retries; never configure the SDK concurrently.
  while (initialization) {
    await initialization;
    if (userId !== requestedUser) return failure("Your account changed. Please try again.");
  }
  if (configured && identifiedUser === userId && snapshot.status === "ready" && !refresh) return success();
  const revision = identityRevision;
  initialization = configureAndLoad(userId, revision);
  try { return await initialization; } finally { initialization = null; }
}

async function configureAndLoad(userId: string | null, revision: number): Promise<RevenueCatActionResult> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    const message = "Purchases and restore are available in the Vocali iPhone app.";
    update({ status: "unavailable", errorMessage: message });
    return failure(message);
  }
  if (!Capacitor.isPluginAvailable("Purchases")) {
    const message = "This app build does not include purchases. Update Vocali and try again.";
    update({ status: "configuration_required", errorMessage: message });
    return failure(message);
  }
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY?.trim();
  if (!apiKey) {
    const message = "Subscriptions are not configured for this build. Please contact support.";
    update({ status: "configuration_required", errorMessage: message });
    return failure(message);
  }
  update({ status: "loading", errorMessage: null });
  try {
    if (!configured) {
      const state = await Purchases.isConfigured();
      if (!state.isConfigured) {
        await Purchases.setLogLevel({ level: process.env.NODE_ENV === "development" ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO });
        await Purchases.configure({ apiKey, appUserID: userId ?? undefined, automaticDeviceIdentifierCollectionEnabled: false });
      } else {
        const { appUserID } = await Purchases.getAppUserID();
        if (userId && appUserID !== userId) {
          await Purchases.logIn({ appUserID: userId });
        } else if (!userId && !appUserID.startsWith("$RCAnonymousID:")) {
          await Purchases.logOut();
        }
      }
      configured = true;
      identifiedUser = userId;
    } else if (identifiedUser !== userId) {
      if (userId) await Purchases.logIn({ appUserID: userId });
      else await Purchases.logOut();
      identifiedUser = userId;
    }
    if (!listenerAdded) {
      await Purchases.addCustomerInfoUpdateListener((info) => {
        if (identifiedUser === requestedUser && !initialization) setCustomer(info);
      });
      listenerAdded = true;
    }
    if (revision !== identityRevision) return failure("Your account changed. Please try again.");
    update({ status: "ready" });
    // One failed source must not hide the other (especially restore/customer info).
    await Promise.all([loadCustomer(revision), loadOffering(revision)]);
    return success();
  } catch (error) {
    const result = subscriptionError(error, "Subscriptions could not connect. Please try again.");
    if (!result.ok && revision === identityRevision) update({ status: "error", errorMessage: result.error });
    return result;
  }
}

function setCustomer(info: CustomerInfo) {
  update({ customerInfo: info, customerStatus: "ready", customerError: null, isPro: hasVocaliProEntitlement(info) });
}
async function loadCustomer(revision: number) {
  update({ customerStatus: "loading", customerError: null });
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    if (revision === identityRevision) setCustomer(customerInfo);
    return success(customerInfo);
  } catch (error) {
    const result = subscriptionError(error, "Your subscription status could not be refreshed.");
    if (!result.ok && revision === identityRevision) update({ customerStatus: "error", customerError: result.error });
    return result;
  }
}
async function loadOffering(revision: number) {
  try {
    const { current } = await Purchases.getOfferings();
    if (revision !== identityRevision) return;
    update({ offering: current, offeringError: current ? null : "Plans are unavailable. Please try again or contact support.", eligibility: {} });
    if (current) {
      try {
        const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: current.availablePackages.map((item) => item.product.identifier) });
        if (revision === identityRevision) update({ eligibility });
      } catch { /* Unknown eligibility must never promise an introductory offer. */ }
    }
  } catch (error) {
    const result = subscriptionError(error, "Plans could not be loaded. Please try again.");
    if (!result.ok && revision === identityRevision) update({ offering: null, eligibility: {}, offeringError: result.error });
  }
}

export async function refreshRevenueCatCustomerInfo() {
  const result = await initializeRevenueCat(requestedUser);
  if (!result.ok) return result;
  return loadCustomer(identityRevision);
}

async function transaction(work: () => Promise<RevenueCatActionResult>) {
  if (snapshot.busy) return failure("A subscription request is already in progress.");
  update({ busy: true });
  try {
    const revision = identityRevision;
    const result = await initializeRevenueCat(requestedUser);
    if (!result.ok) return result;
    if (revision !== identityRevision) return failure("Your account changed. Please try again.");
    return await work();
  } catch (error) { return subscriptionError(error, "The subscription request failed. Please try again."); }
  finally { update({ busy: false }); }
}

export function purchaseRevenueCatPlan(planId: PaywallPlanId) {
  return transaction(async () => {
    const item = getRevenueCatPackage(planId);
    if (!item) return failure(snapshot.offeringError ?? "This plan is unavailable. Please try again.");
    const revision = identityRevision;
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: item });
    if (revision !== identityRevision) return failure("Your account changed. Restore purchases on the correct account.");
    setCustomer(customerInfo);
    return hasVocaliProEntitlement(customerInfo) ? success(customerInfo) : failure("The purchase was submitted, but Vocali Pro is not active yet. Try Restore or contact support.");
  });
}
export function restoreRevenueCatPurchases() {
  return transaction(async () => {
    const revision = identityRevision;
    const { customerInfo } = await Purchases.restorePurchases();
    if (revision !== identityRevision) return failure("Your account changed. Please try again.");
    setCustomer(customerInfo);
    return hasVocaliProEntitlement(customerInfo) ? success(customerInfo) : failure("No active Vocali Pro subscription was found to restore.");
  });
}
export function getRevenueCatPackage(plan: PaywallPlanId, offering = snapshot.offering): PurchasesPackage | null {
  if (!offering) return null;
  return offering.availablePackages.find((item) => item.product.identifier === getRevenueCatProductId(plan)) ?? (plan === "annual" ? offering.annual : offering.monthly);
}
export async function trackVocaliPaywallImpression() {
  if (!configured || !snapshot.offering) return;
  try { await Purchases.trackCustomPaywallImpression({ offering: snapshot.offering, paywallId: "vocali-custom-paywall" }); }
  catch { /* Analytics never blocks purchases. */ }
}
export { REVENUECAT_ENTITLEMENT_ID };
