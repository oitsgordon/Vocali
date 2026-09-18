import { safeInternalDestination, type PaywallEntry } from "./subscriptionPresentation";

export function paywallHref(entry: PaywallEntry, plan?: string) {
  const params = new URLSearchParams();
  if (["settings", "subscription", "login"].includes(entry.from ?? "")) params.set("from", entry.from!);
  if (entry.from === "login") {
    params.set("mode", entry.mode === "signup" ? "signup" : "login");
    params.set("redirect", safeInternalDestination(entry.redirect));
  }
  if (plan === "monthly" || plan === "annual") params.set("plan", plan);
  return "/paywall" + (params.size ? "?" + params : "");
}

// Only known entry screens may be carried through public help/legal pages.
export function publicReturnDestination(value?: string | string[]) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, "https://vocali.invalid");
    if (url.origin !== "https://vocali.invalid") return null;
    if (["/", "/home", "/profile", "/settings", "/settings/subscription"].includes(url.pathname)) return url.pathname;
    if (url.pathname === "/paywall") return paywallHref({ from: url.searchParams.get("from") ?? undefined, mode: url.searchParams.get("mode") ?? undefined, redirect: url.searchParams.get("redirect") ?? undefined }, url.searchParams.get("plan") ?? undefined);
    if (url.pathname === "/login") return "/login?" + new URLSearchParams({ mode: url.searchParams.get("mode") === "signup" ? "signup" : "login", redirect: safeInternalDestination(url.searchParams.get("redirect") ?? undefined) });
  } catch { /* Unknown or malformed destinations use a safe session-aware fallback. */ }
  return null;
}

export function publicPageHref(page: "/privacy" | "/support", returnTo: string | null) {
  const safe = publicReturnDestination(returnTo ?? undefined);
  return page + (safe ? "?" + new URLSearchParams({ returnTo: safe }) : "");
}
