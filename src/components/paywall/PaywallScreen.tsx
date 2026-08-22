"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import {
  DEFAULT_PAYWALL_PLAN_ID,
  getPaywallCta,
  getPaywallPlan,
  getPaywallRenewalCopy,
  PAYWALL_PLANS,
  type PaywallPlanId,
} from "@/lib/paywallPlans";

const benefits = ["Daily prompts", "Transcript review", "Streak tracking"];
const paywallSafeBottomStyle = {
  "--vocali-safe-bottom-base": "0.5rem",
} as CSSProperties;

export function PaywallScreen() {
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(
    DEFAULT_PAYWALL_PLAN_ID,
  );
  const selectedPlan = getPaywallPlan(selectedPlanId);

  return (
    <ScreenFrame>
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-vocali-teal sm:min-h-[860px]">
        <div
          className="pointer-events-none absolute -right-24 top-16 h-64 w-64 rounded-full border-[2.75rem] border-white/[0.055]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-14 top-[38%] h-28 w-28 rounded-full bg-vocali-orange/10"
          aria-hidden="true"
        />

        <header className="vocali-safe-top vocali-safe-top-tight relative z-10 flex min-h-14 items-center justify-between gap-3 px-5 pb-1 [@media(max-height:600px)]:[--vocali-safe-top-base:1rem]">
          <span className="text-xl font-black tracking-[-0.02em] text-white">
            Vocali
          </span>
          <button
            type="button"
            disabled
            aria-describedby="paywall-preview-status"
            className="min-h-11 px-0 text-xs font-black text-white/90 disabled:cursor-not-allowed"
          >
            Restore purchases
          </button>
        </header>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-[clamp(1.5rem,4dvh,3rem)] pt-[clamp(0.75rem,2dvh,1.5rem)] [@media(max-height:600px)]:pb-4">
          <span
            className="mb-4 h-1.5 w-12 rounded-full bg-vocali-orange"
            aria-hidden="true"
          />
          <h1 className="max-w-[20rem] text-[clamp(2rem,5.2dvh,2.65rem)] font-black leading-[1.02] tracking-[-0.045em] text-white">
            Keep your streak going
          </h1>
          <p className="mt-3 max-w-[19rem] text-sm font-bold leading-5 text-white/80">
            Unlock daily practice, transcripts, and progress.
          </p>
        </div>

        <div
          className="vocali-safe-bottom relative z-10 flex min-h-[clamp(21rem,48dvh,25rem)] shrink-0 flex-col rounded-t-[2rem] bg-vocali-cream px-4 pt-[clamp(1rem,3dvh,1.75rem)] shadow-[0_-18px_40px_rgb(7_50_71/0.12)] min-[351px]:px-5 [@media(max-height:600px)]:min-h-[18rem] [@media(max-height:600px)]:pt-3"
          style={paywallSafeBottomStyle}
        >
          <ul
            className="grid gap-1.5 text-xs font-black leading-5 text-vocali-teal-deep"
            aria-label="Subscription benefits"
          >
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-vocali-teal text-white">
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
            className="mt-3 grid grid-cols-2 gap-2.5"
            aria-label="Choose a subscription"
          >
            {PAYWALL_PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative flex min-h-[6.35rem] min-w-0 flex-col rounded-[1rem] border p-3 text-left transition [@media(max-height:600px)]:min-h-[5.5rem] [@media(max-height:600px)]:py-2 ${
                    isSelected
                      ? "border-vocali-teal bg-vocali-teal/[0.065] shadow-[0_8px_20px_rgb(0_167_165/0.1)]"
                      : "border-vocali-border bg-white/75"
                  }`}
                >
                  <span
                    className={`absolute right-3 top-3 flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-vocali-teal bg-vocali-teal text-white"
                        : "border-vocali-teal/40 text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" strokeWidth={4} />
                  </span>

                  <span className="pr-6 text-sm font-black text-vocali-teal-deep">
                    {plan.name}
                  </span>
                  {plan.badge ? (
                    <span className="mt-1 w-fit rounded-full bg-vocali-teal/10 px-2 py-0.5 text-[0.56rem] font-black leading-4 text-vocali-teal">
                      {plan.badge}
                    </span>
                  ) : (
                    <span className="h-[1.5rem]" aria-hidden="true" />
                  )}
                  <span className="mt-auto block whitespace-nowrap text-sm font-black text-vocali-teal-deep">
                    {plan.price}
                    <span className="text-[0.62rem] text-vocali-muted">
                      {` / ${plan.cadence}`}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.64rem] font-bold text-vocali-muted">
                    {plan.trialDays}-day free trial
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-3">
            <button
              type="button"
              disabled
              aria-describedby="paywall-preview-status"
              className="flex min-h-[3.35rem] w-full items-center justify-center rounded-[1rem] bg-vocali-orange px-4 text-[0.95rem] font-black text-white shadow-[0_10px_22px_rgb(255_122_26/0.22)] disabled:cursor-not-allowed"
            >
              {getPaywallCta(selectedPlan)}
            </button>
            <p
              className="mx-auto mt-2 max-w-[19.5rem] text-center text-[0.62rem] font-bold leading-[1.4] text-vocali-muted"
              aria-live="polite"
            >
              {getPaywallRenewalCopy(selectedPlan)}
            </p>
            <nav
              className="mt-2 flex justify-center gap-4 text-[0.65rem] font-black text-vocali-teal-deep"
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

        <p id="paywall-preview-status" className="sr-only">
          Purchases are not connected on this preview screen.
        </p>
      </section>
    </ScreenFrame>
  );
}
