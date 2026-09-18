"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/authStore";
import { initializeRevenueCat, refreshSubscriptionInformation, restoreRevenueCatPurchases, useRevenueCat } from "@/lib/revenueCat";

export function useSubscriptionRefresh() {
  const { isReady, user } = useAuth();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!isReady) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void initializeRevenueCat(userId, true);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [isReady, userId]);
}

export function SubscriptionControls() {
  const state = useRevenueCat();
  const auth = useAuth();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  async function run(restore: boolean) {
    if (lock.current || state.busy) return;
    lock.current = true;
    setWorking(true);
    setMessage(restore ? "Restoring purchases..." : "Checking your subscription...");
    try {
      const result = restore ? await restoreRevenueCatPurchases() : await refreshSubscriptionInformation(auth.user?.id ?? null);
      setMessage(result.ok ? restore ? "Your Vocali Pro subscription has been restored." : "Subscription information refreshed." : result.error);
    } catch { setMessage("The request could not be completed. Please try again."); }
    finally { lock.current = false; setWorking(false); }
  }
  const unsupported = state.status === "unavailable";
  return (
    <div className="space-y-3">
      <button type="button" disabled={!auth.isReady || working || state.busy || unsupported} onClick={() => void run(true)} className="min-h-11 w-full rounded-2xl bg-vocali-cream px-4 py-3 text-left text-sm font-black text-vocali-teal-deep disabled:opacity-60">
        {working ? "Working..." : "Restore purchases"}
      </button>
      {!unsupported ? <button type="button" disabled={!auth.isReady || working || state.busy} onClick={() => void run(false)} className="min-h-11 text-sm font-bold text-vocali-teal disabled:opacity-60">Refresh / retry connection</button> : null}
      <div role="status" aria-live="polite" className="space-y-2 text-sm font-semibold leading-5 text-vocali-muted">
        {unsupported ? <p>Purchases and restore are available in the Vocali iPhone app. You can still browse plans here.</p> : null}
        {!unsupported && state.errorMessage ? <p>{state.errorMessage}</p> : null}
        {state.customerError ? <p>{state.customerError}</p> : null}
        {state.offeringError ? <p>{state.offeringError}</p> : null}
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
