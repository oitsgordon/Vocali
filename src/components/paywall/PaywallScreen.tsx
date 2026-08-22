"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
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

export function PaywallScreen() {
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(
    DEFAULT_PAYWALL_PLAN_ID,
  );
  const selectedPlan = getPaywallPlan(selectedPlanId);

  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-4 pb-5 pt-4 min-[351px]:px-5 sm:min-h-[860px]">
        <header className="flex min-h-9 items-center justify-between gap-3">
          <span className="text-lg font-black tracking-[-0.02em] text-vocali-teal">
            Vocali
          </span>
          <button
            type="button"
            disabled
            aria-describedby="paywall-preview-status"
            className="min-h-11 px-0 text-xs font-black text-vocali-teal disabled:cursor-not-allowed"
          >
            Restore purchases
          </button>
        </header>

        <div className="pb-3 pt-3 text-center min-[351px]:pt-4">
          <h1 className="text-[1.65rem] font-black leading-[1.08] tracking-[-0.04em] text-vocali-teal-deep min-[351px]:text-[1.85rem]">
            Keep your streak going
          </h1>
          <p className="mx-auto mt-2 max-w-[19rem] text-sm font-bold leading-5 text-vocali-muted">
            Unlock daily practice, transcripts, and progress.
          </p>
        </div>

        <ul
          className="mb-3 grid gap-1 text-[0.7rem] font-bold leading-4 text-vocali-teal-deep min-[351px]:mb-4 min-[351px]:grid-cols-3 min-[351px]:gap-2"
          aria-label="Subscription benefits"
        >
          {benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-1.5 min-[351px]:justify-center"
            >
              <Check
                className="h-3.5 w-3.5 shrink-0 text-vocali-teal"
                strokeWidth={3}
                aria-hidden="true"
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="grid gap-2.5" aria-label="Choose a subscription">
          {PAYWALL_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`grid min-h-[4.25rem] w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[1.1rem] border px-3 py-2.5 text-left transition min-[351px]:gap-3 min-[351px]:px-3.5 ${
                  isSelected
                    ? "border-vocali-teal bg-vocali-teal/[0.055] shadow-[0_0_0_1px_rgb(0_167_165/0.04)]"
                    : "border-vocali-border bg-white"
                }`}
              >
                <span
                  className={`flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-vocali-teal bg-vocali-teal text-white"
                      : "border-vocali-teal/40 bg-transparent text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3" strokeWidth={4} />
                </span>

                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-[0.95rem] font-black text-vocali-teal-deep">
                      {plan.name}
                    </span>
                    {plan.badge ? (
                      <span className="rounded-full bg-vocali-teal/10 px-2 py-0.5 text-[0.58rem] font-black leading-4 text-vocali-teal">
                        {plan.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] font-bold text-vocali-muted">
                    {plan.trialDays}-day free trial
                  </span>
                </span>

                <span className="text-right">
                  <span className="block whitespace-nowrap text-[0.95rem] font-black text-vocali-teal-deep">
                    {plan.price}
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-[0.62rem] font-bold text-vocali-muted">
                    per {plan.cadence}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 min-[351px]:mt-3.5">
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
            <Link href="/privacy" className="underline-offset-2 hover:underline">
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

        <p id="paywall-preview-status" className="sr-only">
          Purchases are not connected on this preview screen.
        </p>
      </section>
    </ScreenFrame>
  );
}
