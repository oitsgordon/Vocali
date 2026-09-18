"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Crown, LifeBuoy, RefreshCcw } from "lucide-react";
import { useRef, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { SubscriptionControls, useSubscriptionRefresh } from "@/components/subscriptions/SubscriptionControls";
import { PAYWALL_PLANS, type PaywallPlanId } from "@/lib/paywallPlans";
import { getRevenueCatPackage, purchaseRevenueCatPlan, useRevenueCat } from "@/lib/revenueCat";
import { getRevenueCatProductId, REVENUECAT_ENTITLEMENT_ID } from "@/lib/revenueCatConfig";
import { appleManagementUrl, planPresentation, subscriptionDate, subscriptionStatus } from "@/lib/subscriptionPresentation";

function SubscriptionScreenContent() {
  const state = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlanId | null>(null);
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const lock = useRef(false);
  useSubscriptionRefresh();

  const entitlement = state.customerInfo?.entitlements.all[REVENUECAT_ENTITLEMENT_ID];
  const currentPlan = entitlement?.isActive ? PAYWALL_PLANS.find((plan) =>
    (getRevenueCatPackage(plan.id, state.offering)?.product.identifier ?? getRevenueCatProductId(plan.id)) === entitlement.productIdentifier
  )?.id ?? null : null;
  const selection = selectedPlan ?? currentPlan;
  const selectedPackage = selection ? getRevenueCatPackage(selection, state.offering) : null;
  const selectedCopy = selection ? planPresentation(selection, selectedPackage?.product ?? null, undefined, false, true) : null;
  const canChange = Boolean(selection && selection !== currentPlan && currentPlan && state.isPro && state.customerStatus === "ready" && state.status === "ready" && selectedCopy?.available && !state.busy);
  const dateLine = subscriptionDate(state.customerInfo);
  const managementUrl = appleManagementUrl(state.customerInfo?.managementURL);

  async function changePlan() {
    if (!selection || !reviewing || !canChange || lock.current) return;
    lock.current = true;
    setMessage("Opening Apple’s confirmation...");
    try {
      const result = await purchaseRevenueCatPlan(selection);
      if (result.ok) setSelectedPlan(null);
      setMessage(
        result.ok
          ? "Your request was accepted. Apple controls when the new billing period starts; check Apple settings to confirm it."
          : result.cancelled
            ? "Plan change cancelled. You have not been charged."
            : result.error,
      );
    } catch {
      setMessage("The plan change could not be completed. Please try again.");
    } finally {
      lock.current = false;
      setReviewing(false);
    }
  }

  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom min-h-dvh bg-vocali-cream px-5 pb-7 pt-7 sm:min-h-[860px]">
        <header className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <Link href="/settings" aria-label="Back to Settings" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-vocali-teal-deep shadow-[0_10px_24px_rgb(7_50_71/0.08)]">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
          </Link>
          <p className="text-center text-base font-black text-vocali-teal-deep">Subscription</p>
        </header>

        <div className="mt-6">
          <p className="text-lg font-black text-vocali-teal">Vocali Pro</p>
          <h1 className="mt-2 text-[2.35rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">Your plan, clearly.</h1>
        </div>

        <section className="mt-6 rounded-[1.75rem] bg-vocali-teal-deep p-5 text-white shadow-vocali-card">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-vocali-orange"><Crown className="h-6 w-6" strokeWidth={3} /></span>
            <div>
              <h2 className="text-xl font-black">{subscriptionStatus(state)}</h2>
              {currentPlan ? <p className="mt-1 text-sm font-bold text-white/75">{currentPlan === "annual" ? "Annual plan" : "Monthly plan"}</p> : null}
              {dateLine ? <p className="mt-2 flex items-center gap-2 text-sm font-bold text-white/75"><CalendarDays className="h-4 w-4" />{dateLine}</p> : null}
              {entitlement?.billingIssueDetectedAt ? <p className="mt-2 text-sm font-black text-vocali-orange">Apple reported a billing issue. Update your payment method in Apple settings.</p> : null}
            </div>
          </div>
        </section>

        <a href={managementUrl} target="_blank" rel="noreferrer" className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-vocali-teal/25 bg-white px-4 text-center text-sm font-black text-vocali-teal">
          Cancel subscription
        </a>
        <p className="mt-2 text-center text-xs font-semibold leading-5 text-vocali-muted">Opens Apple’s subscription settings. Vocali will refresh your status when you return.</p>

        <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <h2 className="text-xl font-black text-vocali-teal-deep">Change plan</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-vocali-muted">Both plans include the same Vocali Pro access. Apple confirms when a change begins.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {PAYWALL_PLANS.map((plan) => {
              const item = getRevenueCatPackage(plan.id, state.offering);
              const copy = planPresentation(plan.id, item?.product ?? null, undefined, state.status === "unavailable", true);
              const isCurrent = currentPlan === plan.id;
              const isSelected = selection === plan.id;
              return (
                <button key={plan.id} type="button" disabled={state.busy} aria-pressed={isSelected} onClick={() => { setSelectedPlan(plan.id); setReviewing(false); setMessage(""); }} className={"relative min-h-[7.8rem] min-w-0 rounded-[1.15rem] border p-3.5 text-left " + (isSelected ? "border-vocali-teal bg-vocali-teal/[0.08]" : "border-vocali-teal-deep/15 bg-vocali-cream/35")}>
                  {isSelected ? <Check aria-hidden="true" className="absolute right-3 top-3 h-5 w-5 rounded-full bg-vocali-teal p-1 text-white" strokeWidth={4} /> : null}
                  <p className="pr-6 text-base font-black text-vocali-teal-deep">{plan.name}</p>
                  <p className="mt-4 text-lg font-black text-vocali-teal-deep">{copy.price}<span className="text-[0.68rem] text-vocali-muted">{copy.cadence ? " / " + copy.cadence : ""}</span></p>
                  <p className="mt-1 text-xs font-bold text-vocali-muted">{isCurrent ? "Current plan" : copy.offer}</p>
                </button>
              );
            })}
          </div>
          {reviewing && selectedCopy ? (
            <section aria-label="Review your plan change" className="mt-4 rounded-2xl bg-vocali-cream p-4" aria-live="polite">
              <h3 className="font-black text-vocali-teal-deep">Switch to {selection === "annual" ? "Annual" : "Monthly"}</h3>
              <p className="mt-2 text-sm font-bold">{selectedCopy.price} / {selectedCopy.cadence}</p>
              <p className="mt-2 text-sm leading-5 text-vocali-muted">No new trial. Apple confirms when the change takes effect. Your current access stays in place until your subscription updates.</p>
              <p className="mt-2 text-xs leading-5 text-vocali-muted">{selectedCopy.renewal}</p>
              <button type="button" disabled={!canChange} onClick={() => void changePlan()} className="mt-4 min-h-14 w-full rounded-2xl bg-vocali-orange px-3 py-2 font-black text-white disabled:opacity-50">{state.busy ? "Opening App Store..." : "Confirm with Apple"}</button>
              <button type="button" disabled={state.busy} onClick={() => { setReviewing(false); setSelectedPlan(null); }} className="mt-2 min-h-11 w-full text-sm font-bold text-vocali-teal">Keep current plan</button>
            </section>
          ) : <button type="button" disabled={!canChange} onClick={() => setReviewing(true)} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-[1rem] bg-vocali-orange px-4 py-2 text-base font-black text-white disabled:opacity-50">Review plan change</button>}
          {!currentPlan ? <p className="mt-3 text-sm leading-5 text-vocali-muted">A confirmed current plan is needed to switch here. Check your subscription in Apple settings, or <Link className="font-bold text-vocali-teal underline" href="/paywall?from=subscription">view subscription options</Link>.</p> : null}
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-xs font-bold leading-5 text-vocali-muted">{message}</p>
        </section>

        <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <h2 className="text-xl font-black text-vocali-teal-deep">Subscription help</h2>
          <div className="mt-4"><SubscriptionControls /></div>
          <a href={managementUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-vocali-teal/25 text-sm font-black text-vocali-teal">
            <RefreshCcw className="h-4 w-4" /> Check changes in Apple settings
          </a>
          <Link href="/support?returnTo=%2Fsettings%2Fsubscription" className="mt-3 flex min-h-12 items-center justify-center gap-2 text-sm font-black text-vocali-teal-deep">
            <LifeBuoy className="h-4 w-4" /> Contact support
          </Link>
        </section>
      </section>
    </ScreenFrame>
  );
}

export function SubscriptionScreen() {
  return <AuthGate><SubscriptionScreenContent /></AuthGate>;
}
