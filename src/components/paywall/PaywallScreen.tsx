"use client";

import Link from "next/link";
import { AudioLines, Check } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import {
  DEFAULT_PAYWALL_PLAN_ID,
  getPaywallCta,
  getPaywallPlan,
  getPaywallRenewalCopy,
  PAYWALL_PLANS,
  type PaywallPlanId,
} from "@/lib/paywallPlans";
import {
  getRevenueCatPackage,
  purchaseRevenueCatPlan,
  restoreRevenueCatPurchases,
  trackVocaliPaywallImpression,
  useRevenueCat,
} from "@/lib/revenueCat";

const benefits = ["Daily prompts", "Transcript review", "Streak tracking"];
const paywallSafeBottomStyle = {
  "--vocali-safe-bottom-base": "0.5rem",
} as CSSProperties;

export function PaywallScreen() {
  const revenueCat = useRevenueCat();
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(
    DEFAULT_PAYWALL_PLAN_ID,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const selectedPlan = getPaywallPlan(selectedPlanId);

  useEffect(() => {
    if (revenueCat.status === "ready") {
      void trackVocaliPaywallImpression();
    }
  }, [revenueCat.status]);

  async function handlePurchase() {
    if (isProcessing || revenueCat.isPro) {
      return;
    }

    setIsProcessing(true);
    setPurchaseMessage(null);
    const result = await purchaseRevenueCatPlan(selectedPlanId);
    setIsProcessing(false);
    setPurchaseMessage(
      result.ok
        ? "Vocali Pro is active. Your subscription is ready."
        : result.error,
    );
  }

  async function handleRestore() {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setPurchaseMessage(null);
    const result = await restoreRevenueCatPurchases();
    setIsProcessing(false);
    setPurchaseMessage(
      result.ok
        ? "Your Vocali Pro subscription has been restored."
        : result.error,
    );
  }

  return (
    <ScreenFrame>
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-vocali-cream sm:min-h-[860px]">
        <header className="vocali-safe-top vocali-safe-top-tight relative z-10 flex min-h-14 items-center justify-between gap-3 px-5 pb-1 [@media(max-height:600px)]:[--vocali-safe-top-base:1rem]">
          <span className="text-xl font-black tracking-[-0.02em] text-vocali-teal-deep">
            Vocali
          </span>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => void handleRestore()}
            aria-describedby="paywall-status"
            className="min-h-11 px-0 text-xs font-black text-vocali-teal disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isProcessing ? "Working..." : "Restore"}
          </button>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 -translate-y-2 flex-col items-center justify-center px-6 pb-2 text-center [@media(max-height:600px)]:-translate-y-1">
          <div
            className="relative mb-3.5 flex h-16 w-[4.5rem] items-center justify-center rounded-[1.4rem] rounded-bl-[0.5rem] bg-vocali-teal/10 text-vocali-teal shadow-[0_12px_28px_rgb(0_167_165/0.1)] [@media(max-height:600px)]:mb-2 [@media(max-height:600px)]:h-11 [@media(max-height:600px)]:w-12 [@media(max-height:600px)]:rounded-[1rem] [@media(max-height:600px)]:rounded-bl-sm"
            aria-hidden="true"
          >
            <AudioLines
              className="h-8 w-8 [@media(max-height:600px)]:h-6 [@media(max-height:600px)]:w-6"
              strokeWidth={2.75}
            />
            <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[3px] border-vocali-cream bg-vocali-orange" />
          </div>
          <h1 className="max-w-[19rem] text-[clamp(1.75rem,4.25dvh,2.25rem)] font-black leading-[1.04] tracking-[-0.045em] text-vocali-teal-deep">
            Keep your streak going
          </h1>
          <p className="mt-2.5 max-w-[19rem] text-sm font-bold leading-5 text-vocali-muted [@media(max-height:600px)]:mt-1.5 [@media(max-height:600px)]:text-xs [@media(max-height:600px)]:leading-4">
            Unlock daily prompts, transcripts, and streaks.
          </p>
        </div>

        <div
          className="vocali-safe-bottom relative z-10 flex min-h-[clamp(24rem,51dvh,27rem)] shrink-0 flex-col rounded-t-[2rem] border-t border-vocali-teal-deep/[0.06] bg-white px-4 pt-5 shadow-[0_-16px_40px_rgb(7_50_71/0.1)] min-[351px]:px-5 [@media(max-height:600px)]:min-h-[21.5rem] [@media(max-height:600px)]:pt-3"
          style={paywallSafeBottomStyle}
        >
          <ul
            className="divide-y divide-vocali-teal-deep/[0.065] text-[0.82rem] font-black leading-5 text-vocali-teal-deep [@media(max-height:600px)]:text-xs"
            aria-label="Subscription benefits"
          >
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex min-h-8 items-center gap-2.5 [@media(max-height:600px)]:min-h-6"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vocali-teal/10 text-vocali-teal [@media(max-height:600px)]:h-4.5 [@media(max-height:600px)]:w-4.5">
                  <Check
                    className="h-3 w-3"
                    strokeWidth={4}
                    aria-hidden="true"
                  />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div
            className="mt-4 grid grid-cols-2 gap-3 [@media(max-height:600px)]:mt-2 [@media(max-height:600px)]:gap-2"
            aria-label="Choose a subscription"
          >
            {PAYWALL_PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const revenueCatPackage = getRevenueCatPackage(
                plan.id,
                revenueCat.offering,
              );
              const displayPrice =
                revenueCatPackage?.product.priceString ?? plan.price;

              return (
                <button
                  key={plan.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative flex min-h-[7.4rem] min-w-0 flex-col rounded-[1.1rem] border p-3.5 text-left transition [@media(max-height:600px)]:min-h-[6rem] [@media(max-height:600px)]:p-2.5 ${
                    isSelected
                      ? "border-vocali-teal bg-vocali-teal/[0.085] shadow-[0_10px_24px_rgb(0_167_165/0.1)]"
                      : "border-vocali-teal-deep/15 bg-vocali-cream/25"
                  }`}
                >
                  <span
                    className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border [@media(max-height:600px)]:right-2.5 [@media(max-height:600px)]:top-2.5 [@media(max-height:600px)]:h-5 [@media(max-height:600px)]:w-5 ${
                      isSelected
                        ? "border-vocali-teal bg-vocali-teal text-white"
                        : "border-vocali-teal/45 bg-white text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={4} />
                  </span>

                  <span className="pr-7 text-[0.95rem] font-black text-vocali-teal-deep [@media(max-height:600px)]:text-sm">
                    {plan.name}
                  </span>
                  {plan.badge ? (
                    <span className="mt-1.5 w-fit rounded-full bg-vocali-teal/10 px-2 py-0.5 text-[0.62rem] font-black leading-4 text-vocali-teal [@media(max-height:600px)]:mt-1 [@media(max-height:600px)]:text-[0.56rem]">
                      {plan.badge}
                    </span>
                  ) : (
                    <span className="h-[1.75rem] [@media(max-height:600px)]:h-[1.5rem]" aria-hidden="true" />
                  )}
                  <span className="mt-auto block whitespace-nowrap text-[1.05rem] font-black leading-5 text-vocali-teal-deep [@media(max-height:600px)]:text-[0.92rem]">
                    {displayPrice}
                    <span className="text-[0.7rem] text-vocali-muted [@media(max-height:600px)]:text-[0.62rem]">
                      {` / ${plan.cadence}`}
                    </span>
                  </span>
                  <span className="mt-1 block text-[0.72rem] font-bold leading-4 text-vocali-muted [@media(max-height:600px)]:mt-0.5 [@media(max-height:600px)]:text-[0.64rem]">
                    {plan.trialDays}-day free trial
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-5 [@media(max-height:600px)]:pt-2.5">
            <button
              type="button"
              disabled={isProcessing || revenueCat.isPro}
              onClick={() => void handlePurchase()}
              aria-describedby="paywall-status"
              className="flex min-h-14 w-full items-center justify-center rounded-[1rem] bg-vocali-orange px-4 text-base font-black text-white shadow-[0_12px_24px_rgb(255_122_26/0.24)] disabled:cursor-not-allowed disabled:opacity-65 [@media(max-height:600px)]:min-h-12 [@media(max-height:600px)]:text-[0.92rem]"
            >
              {isProcessing
                ? "Connecting to App Store..."
                : revenueCat.isPro
                  ? "Vocali Pro is active"
                  : getPaywallCta(selectedPlan)}
            </button>
            <p
              className="mx-auto mt-2.5 max-w-[19.5rem] text-center text-[0.68rem] font-bold leading-[1.45] text-vocali-muted [@media(max-height:600px)]:mt-1.5 [@media(max-height:600px)]:text-[0.62rem]"
              aria-live="polite"
            >
              {purchaseMessage ?? getPaywallRenewalCopy(selectedPlan)}
            </p>
            <nav
              className="mt-2.5 flex justify-center gap-6 text-xs font-black text-vocali-teal-deep [@media(max-height:600px)]:mt-1.5 [@media(max-height:600px)]:text-[0.68rem]"
              aria-label="Subscription information"
            >
              <Link
                href="/privacy"
                className="underline-offset-2 hover:underline"
              >
                Privacy
              </Link>
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Terms
              </a>
            </nav>
          </div>
        </div>

        <p id="paywall-status" className="sr-only">
          {revenueCat.status === "ready"
            ? "App Store subscriptions are ready."
            : "Subscription controls require the Vocali iPhone app and RevenueCat configuration."}
        </p>
      </section>
    </ScreenFrame>
  );
}
