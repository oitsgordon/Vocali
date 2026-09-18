"use client";

import Link from "next/link";
import { ArrowLeft, AudioLines, Check } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { useAuth } from "@/lib/authStore";
import { DEFAULT_PAYWALL_PLAN_ID, PAYWALL_PLANS, type PaywallPlanId } from "@/lib/paywallPlans";
import { getRevenueCatPackage, initializeRevenueCat, purchaseRevenueCatPlan, restoreRevenueCatPurchases, trackVocaliPaywallImpression, useRevenueCat } from "@/lib/revenueCat";
import { paywallHref, publicPageHref } from "@/lib/publicNavigation";
import { paywallReturn, planPresentation, type PaywallEntry } from "@/lib/subscriptionPresentation";

const benefits = ["Daily prompts", "Transcript review", "Streak tracking"];
const safeBottomStyle = { "--vocali-safe-bottom-base": "0.5rem" } as CSSProperties;

export function PaywallScreen({ entry = {} }: { entry?: PaywallEntry }) {
  const auth = useAuth();
  const revenueCat = useRevenueCat();
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(entry.plan === "monthly" ? "monthly" : DEFAULT_PAYWALL_PLAN_ID);
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const actionLock = useRef(false);
  const returnHref = paywallReturn(entry, Boolean(auth.user));
  const isBrowserPreview = revenueCat.status === "unavailable";
  const selectedPackage = getRevenueCatPackage(selectedPlanId, revenueCat.offering);
  const selectedCopy = planPresentation(
    selectedPlanId,
    selectedPackage?.product ?? null,
    selectedPackage ? revenueCat.eligibility[selectedPackage.product.identifier]?.status : undefined,
    isBrowserPreview,
  );

  useEffect(() => {
    if (revenueCat.status === "ready") void trackVocaliPaywallImpression();
  }, [revenueCat.status]);

  async function run(action: "purchase" | "restore") {
    if (actionLock.current || revenueCat.busy) return;
    actionLock.current = true;
    setMessage(action === "purchase" ? "Connecting to the App Store..." : "Restoring purchases...");
    try {
      const result = action === "purchase" ? await purchaseRevenueCatPlan(selectedPlanId) : await restoreRevenueCatPurchases();
      if (result.ok) {
        setCompleted(true);
        setMessage(action === "purchase" ? "Vocali Pro is active." : "Your Vocali Pro subscription has been restored.");
      } else {
        setMessage(result.cancelled ? "Purchase cancelled. You have not been charged." : result.error);
      }
    } catch {
      setMessage("The request could not be completed. Please try again.");
    } finally {
      actionLock.current = false;
    }
  }

  const purchaseDisabled = !auth.isReady || revenueCat.busy || retrying || completed || revenueCat.status !== "ready" || !selectedCopy.available;
  const connectionError = isBrowserPreview ? null : revenueCat.errorMessage ?? revenueCat.offeringError ?? revenueCat.customerError;

  async function retryConnection() {
    if (actionLock.current || revenueCat.busy) return;
    actionLock.current = true;
    setRetrying(true);
    setMessage(null);
    try { await initializeRevenueCat(auth.user?.id ?? null, true); }
    catch { setMessage("Subscriptions could not connect. Please try again or contact support."); }
    finally { actionLock.current = false; setRetrying(false); }
  }

  return (
    <ScreenFrame>
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-vocali-cream sm:min-h-[860px]">
        <header className="vocali-safe-top vocali-safe-top-tight relative z-10 grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 pb-1 [@media(max-height:600px)]:[--vocali-safe-top-base:1rem]">
          <Link href={returnHref} aria-label="Back" className="flex min-h-11 items-center gap-1.5 justify-self-start text-xs font-black text-vocali-teal">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Back
          </Link>
          <span className="text-xl font-black tracking-[-0.02em] text-vocali-teal-deep">Vocali</span>
          <button type="button" disabled={!auth.isReady || retrying || revenueCat.busy || isBrowserPreview} onClick={() => void run("restore")} className="min-h-11 justify-self-end text-xs font-black text-vocali-teal disabled:opacity-55">Restore</button>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 -translate-y-2 flex-col items-center justify-center px-6 pb-2 text-center [@media(max-height:600px)]:-translate-y-1">
          <div className="relative mb-3.5 flex h-16 w-[4.5rem] items-center justify-center rounded-[1.4rem] rounded-bl-[0.5rem] bg-vocali-teal/10 text-vocali-teal shadow-[0_12px_28px_rgb(0_167_165/0.1)] [@media(max-height:600px)]:mb-2 [@media(max-height:600px)]:h-11 [@media(max-height:600px)]:w-12" aria-hidden="true">
            <AudioLines className="h-8 w-8 [@media(max-height:600px)]:h-6 [@media(max-height:600px)]:w-6" strokeWidth={2.75} />
            <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[3px] border-vocali-cream bg-vocali-orange" />
          </div>
          <h1 className="max-w-[19rem] text-[clamp(1.75rem,4.25dvh,2.25rem)] font-black leading-[1.04] tracking-[-0.045em] text-vocali-teal-deep">Keep your streak going</h1>
          <p className="mt-2.5 max-w-[19rem] text-sm font-bold leading-5 text-vocali-muted [@media(max-height:600px)]:mt-1.5 [@media(max-height:600px)]:text-xs">Unlock daily prompts, transcripts, and streaks.</p>
        </div>

        <div className="vocali-safe-bottom relative z-10 flex min-h-[clamp(24rem,51dvh,27rem)] shrink-0 flex-col rounded-t-[2rem] border-t border-vocali-teal-deep/[0.06] bg-white px-4 pt-5 shadow-[0_-16px_40px_rgb(7_50_71/0.1)] min-[351px]:px-5 [@media(max-height:600px)]:min-h-[21.5rem] [@media(max-height:600px)]:pt-3" style={safeBottomStyle}>
          <ul className="divide-y divide-vocali-teal-deep/[0.065] text-[0.82rem] font-black leading-5 text-vocali-teal-deep [@media(max-height:600px)]:text-xs" aria-label="Subscription benefits">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex min-h-8 items-center gap-2.5 [@media(max-height:600px)]:min-h-6">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vocali-teal/10 text-vocali-teal"><Check className="h-3 w-3" strokeWidth={4} /></span>{benefit}
              </li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-3 [@media(max-height:600px)]:mt-2 [@media(max-height:600px)]:gap-2" aria-label="Choose a subscription">
            {PAYWALL_PLANS.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const item = getRevenueCatPackage(plan.id, revenueCat.offering);
              const copy = planPresentation(plan.id, item?.product ?? null, item ? revenueCat.eligibility[item.product.identifier]?.status : undefined, isBrowserPreview);
              const cardClass = "relative flex min-h-[7.4rem] min-w-0 flex-col rounded-[1.1rem] border p-3.5 text-left transition [@media(max-height:600px)]:min-h-[6rem] [@media(max-height:600px)]:p-2.5 " + (selected ? "border-vocali-teal bg-vocali-teal/[0.085] shadow-[0_10px_24px_rgb(0_167_165/0.1)]" : "border-vocali-teal-deep/15 bg-vocali-cream/25");
              const checkClass = "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border " + (selected ? "border-vocali-teal bg-vocali-teal text-white" : "border-vocali-teal/45 bg-white text-transparent");
              return (
                <button key={plan.id} type="button" disabled={revenueCat.busy || retrying || completed} aria-pressed={selected} onClick={() => { setSelectedPlanId(plan.id); setMessage(null); }} className={cardClass}>
                  <span className={checkClass}><Check className="h-3.5 w-3.5" strokeWidth={4} /></span>
                  <span className="pr-7 text-[0.95rem] font-black text-vocali-teal-deep">{plan.name}</span>
                  {plan.badge ? <span className="mt-1.5 w-fit rounded-full bg-vocali-teal/10 px-2 py-0.5 text-[0.62rem] font-black leading-4 text-vocali-teal">{plan.badge}</span> : <span className="h-[1.75rem]" aria-hidden="true" />}
                  <span className="mt-auto block break-words text-[1.05rem] font-black leading-5 text-vocali-teal-deep">{copy.price}{copy.cadence ? <span className="text-[0.7rem] text-vocali-muted">{" / " + copy.cadence}</span> : null}</span>
                  <span className="mt-1 block text-[0.68rem] font-bold leading-4 text-vocali-muted">{copy.offer}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-5 [@media(max-height:600px)]:pt-2.5">
            {completed ? <Link href={returnHref} className="flex min-h-14 w-full items-center justify-center rounded-[1rem] bg-vocali-orange px-4 text-base font-black text-white">Continue</Link> : (
              <button type="button" disabled={purchaseDisabled} onClick={() => void run("purchase")} className="flex min-h-14 w-full items-center justify-center rounded-[1rem] bg-vocali-orange px-4 text-base font-black text-white shadow-[0_12px_24px_rgb(255_122_26/0.24)] disabled:opacity-55">{revenueCat.busy ? "Connecting to App Store..." : selectedCopy.cta}</button>
            )}
            {isBrowserPreview ? <p className="mt-2 text-center text-[0.68rem] font-bold text-vocali-teal">Price preview in Australian dollars. Purchase in the Vocali iPhone app.</p> : null}
            <p className="mx-auto mt-2 max-w-[19.5rem] text-center text-[0.68rem] font-bold leading-[1.45] text-vocali-muted">{selectedCopy.renewal}</p>
            <p role="status" aria-live="polite" className="mx-auto min-h-4 max-w-[19.5rem] text-center text-xs font-bold leading-5 text-vocali-teal">{message ?? connectionError ?? (!isBrowserPreview && revenueCat.status === "loading" ? "Loading subscription information..." : "")}</p>
            {connectionError && !completed ? <div className="flex justify-center gap-4 text-sm font-bold text-vocali-teal"><button type="button" disabled={retrying || revenueCat.busy} onClick={() => void retryConnection()} className="min-h-11">{retrying ? "Retrying..." : "Retry connection"}</button><Link className="flex min-h-11 items-center" href={publicPageHref("/support", paywallHref(entry, selectedPlanId))}>Support</Link></div> : null}
            <nav className="mt-1.5 flex justify-center gap-6 text-xs font-black text-vocali-teal-deep" aria-label="Subscription information">
              <Link href={publicPageHref("/privacy", paywallHref(entry, selectedPlanId))}>Privacy</Link>
              <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Terms</a>
            </nav>
          </div>
        </div>
      </section>
    </ScreenFrame>
  );
}
