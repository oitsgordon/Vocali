"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Crown, LifeBuoy, RefreshCcw } from "lucide-react";
import { useRef, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { SubscriptionControls, useSubscriptionRefresh } from "@/components/subscriptions/SubscriptionControls";
import { PAYWALL_PLANS, type PaywallPlanId } from "@/lib/paywallPlans";
import { getRevenueCatPackage, purchaseRevenueCatPlan, useRevenueCat } from "@/lib/revenueCat";
import { REVENUECAT_ENTITLEMENT_ID } from "@/lib/revenueCatConfig";
import { appleManagementUrl, planPresentation, subscriptionDate, subscriptionStatus } from "@/lib/subscriptionPresentation";

function SubscriptionScreenContent() {
  const state = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlanId | null>(null);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  useSubscriptionRefresh();

  const entitlement = state.customerInfo?.entitlements.all[REVENUECAT_ENTITLEMENT_ID];
  const currentPlan = PAYWALL_PLANS.find((plan) => getRevenueCatPackage(plan.id, state.offering)?.product.identifier === entitlement?.productIdentifier)?.id ?? null;
  const dateLine = subscriptionDate(state.customerInfo);
  const managementUrl = appleManagementUrl(state.customerInfo?.managementURL);

  async function changePlan() {
    if (!selectedPlan || selectedPlan === currentPlan || lock.current || state.busy) return;
    lock.current = true;
    setMessage("Opening Apple’s confirmation...");
    try {
      const result = await purchaseRevenueCatPlan(selectedPlan);
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

        <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <h2 className="text-xl font-black text-vocali-teal-deep">Change plan</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-vocali-muted">Both plans include the same Vocali Pro access. Apple confirms when a change begins.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {PAYWALL_PLANS.map((plan) => {
              const item = getRevenueCatPackage(plan.id, state.offering);
              const copy = planPresentation(plan.id, item?.product ?? null, undefined, state.status === "unavailable", true);
              const isCurrent = currentPlan === plan.id;
              const isSelected = selectedPlan === plan.id;
              return (
                <button key={plan.id} type="button" disabled={isCurrent} aria-pressed={isSelected} onClick={() => setSelectedPlan(plan.id)} className={"relative min-h-[7.8rem] rounded-[1.15rem] border p-3.5 text-left " + (isCurrent || isSelected ? "border-vocali-teal bg-vocali-teal/[0.08]" : "border-vocali-teal-deep/15 bg-vocali-cream/35")}>
                  {(isCurrent || isSelected) ? <Check className="absolute right-3 top-3 h-5 w-5 rounded-full bg-vocali-teal p-1 text-white" strokeWidth={4} /> : null}
                  <p className="pr-6 text-base font-black text-vocali-teal-deep">{plan.name}</p>
                  <p className="mt-4 text-lg font-black text-vocali-teal-deep">{copy.price}<span className="text-[0.68rem] text-vocali-muted">{copy.cadence ? " / " + copy.cadence : ""}</span></p>
                  <p className="mt-1 text-xs font-bold text-vocali-muted">{isCurrent ? "Current plan" : copy.offer}</p>
                </button>
              );
            })}
          </div>
          <button type="button" disabled={!selectedPlan || selectedPlan === currentPlan || state.busy || state.status !== "ready"} onClick={() => void changePlan()} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-[1rem] bg-vocali-orange px-4 text-base font-black text-white disabled:opacity-50">
            {state.busy ? "Opening App Store..." : "Review plan change"}
          </button>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-xs font-bold leading-5 text-vocali-muted">{message}</p>
        </section>

        <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <h2 className="text-xl font-black text-vocali-teal-deep">Subscription help</h2>
          <div className="mt-4"><SubscriptionControls /></div>
          <a href={managementUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-vocali-teal/25 text-sm font-black text-vocali-teal">
            <RefreshCcw className="h-4 w-4" /> Cancel or confirm in Apple settings
          </a>
          <Link href="/support" className="mt-3 flex min-h-12 items-center justify-center gap-2 text-sm font-black text-vocali-teal-deep">
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
