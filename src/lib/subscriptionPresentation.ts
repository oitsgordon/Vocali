import { INTRO_ELIGIBILITY_STATUS, type CustomerInfo, type PurchasesStoreProduct } from "@revenuecat/purchases-capacitor";
import { getPaywallPlan, type PaywallPlanId } from "./paywallPlans";
import type { RevenueCatSnapshot } from "./revenueCat";
import { REVENUECAT_ENTITLEMENT_ID } from "./revenueCatConfig";

export type PaywallEntry = { from?: string; mode?: string; redirect?: string; plan?: string };
export function safeInternalDestination(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/home";
  try {
    const url = new URL(value, "https://vocali.invalid");
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== "https://vocali.invalid" || path.startsWith("//") || path.includes("\\") || /^\/(login|paywall|auth)(\/|$)/.test(path)) return "/home";
    return url.pathname + url.search + url.hash;
  } catch { return "/home"; }
}
export function loginPaywallHref(mode: string, redirect: string) {
  return "/paywall?" + new URLSearchParams({ from: "login", mode: mode === "signup" ? "signup" : "login", redirect: safeInternalDestination(redirect) });
}
export function paywallReturn(entry: PaywallEntry, signedIn: boolean) {
  if (entry.from === "settings") return "/settings";
  if (entry.from === "subscription") return "/settings/subscription";
  if (entry.from === "login" && !signedIn) return "/login?" + new URLSearchParams({ mode: entry.mode === "signup" ? "signup" : "login", redirect: safeInternalDestination(entry.redirect) });
  return signedIn ? "/home" : "/login";
}
export function subscriptionStatus(state: RevenueCatSnapshot) {
  if (state.status === "unavailable") return "Subscription status is available in the iPhone app.";
  if (state.status === "configuration_required") return state.errorMessage ?? "Subscriptions need configuration.";
  if (state.status === "error") return state.errorMessage ?? "Subscription status is unavailable.";
  if (state.customerStatus === "error") return state.customerError ?? "Subscription status is unavailable.";
  if (state.customerStatus !== "ready") return "Checking your subscription...";
  const entitlement = state.customerInfo?.entitlements.all[REVENUECAT_ENTITLEMENT_ID];
  if (state.isPro) return entitlement?.periodType === "TRIAL" ? "Vocali Pro trial is active" : "Vocali Pro is active";
  return entitlement ? "Your subscription has expired" : "No active subscription";
}
export function subscriptionDate(info: CustomerInfo | null) {
  const entitlement = info?.entitlements.all[REVENUECAT_ENTITLEMENT_ID];
  if (!entitlement?.expirationDate) return null;
  const date = new Date(entitlement.expirationDate);
  if (Number.isNaN(date.getTime())) return null;
  const label = !entitlement.isActive ? "Access ended" : !entitlement.willRenew ? "Access until" : entitlement.periodType === "TRIAL" ? "Trial ends" : "Renews";
  return label + " " + date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
export function periodLabel(period: string | null) {
  const match = /^P(\d+)([DWMY])$/.exec(period ?? "");
  if (!match || Number(match[1]) < 1) return null;
  const unit = ({ D: "day", W: "week", M: "month", Y: "year" } as Record<string, string>)[match[2]];
  return Number(match[1]) === 1 ? unit : match[1] + " " + unit + "s";
}
function introductoryDuration(period: string | null, cycles: number, adjective = false) {
  const match = /^P(\d+)([DWMY])$/.exec(period ?? "");
  if (!match || cycles < 1) return null;
  const total = Number(match[1]) * cycles;
  const unit = ({ D: "day", W: "week", M: "month", Y: "year" } as Record<string, string>)[match[2]];
  return adjective ? total + "-" + unit : total + " " + unit + (total === 1 ? "" : "s");
}
export function planPresentation(planId: PaywallPlanId, product: PurchasesStoreProduct | null, eligibility?: number, preview = false, switching = false) {
  const fallback = getPaywallPlan(planId);
  const cadence = product ? periodLabel(product.subscriptionPeriod) : preview ? fallback.cadence : null;
  const price = product?.priceString || (preview ? fallback.price : "Unavailable");
  const intro = product?.introPrice;
  const duration = intro ? introductoryDuration(intro.period, intro.cycles) : null;
  const trialDuration = intro ? introductoryDuration(intro.period, intro.cycles, true) : null;
  const eligible = !switching && eligibility === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE && intro && duration;
  const trial = switching ? null : preview ? fallback.trialDays + "-day free trial" : eligible && intro.price === 0 && trialDuration ? trialDuration + " free trial" : null;
  const offer = trial ?? (eligible ? intro.priceString + " for " + duration : switching ? "Same Vocali Pro access" : "Auto-renewing subscription");
  const regular = cadence ? price + "/" + cadence : null;
  const renewal = regular
    ? (trial || eligible ? "Then " : "") + regular + ". Renews automatically. Cancel anytime in Apple settings."
    : "Pricing is currently unavailable.";
  return { price, cadence, offer, cta: trial ? "Start " + trial : "Subscribe", renewal, available: Boolean(product && cadence) };
}

export function appleManagementUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    if (url.protocol === "https:" && ["apps.apple.com", "buy.itunes.apple.com"].includes(url.hostname) && !url.username && !url.password) return url.href;
  } catch { /* Fall back to Apple's subscription management, never arbitrary URLs. */ }
  return "https://apps.apple.com/account/subscriptions";
}
