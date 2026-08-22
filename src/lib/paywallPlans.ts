export type PaywallPlanId = "monthly" | "annual";

export type PaywallPlan = {
  id: PaywallPlanId;
  name: string;
  price: string;
  cadence: string;
  trialDays: number;
  badge?: string;
};

export const DEFAULT_PAYWALL_PLAN_ID: PaywallPlanId = "annual";

export const PAYWALL_PLANS: readonly PaywallPlan[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: "A$9.99",
    cadence: "month",
    trialDays: 3,
  },
  {
    id: "annual",
    name: "Annual",
    price: "A$69.99",
    cadence: "year",
    trialDays: 7,
    badge: "Best value",
  },
];

export function getPaywallPlan(planId: PaywallPlanId) {
  const plan = PAYWALL_PLANS.find(({ id }) => id === planId);

  if (!plan) {
    throw new Error(`Unknown paywall plan: ${planId}`);
  }

  return plan;
}

export function getPaywallCta(plan: PaywallPlan) {
  return `Start ${plan.trialDays}-day free trial`;
}

export function getPaywallRenewalCopy(plan: PaywallPlan) {
  return `Then ${plan.price}/${plan.cadence}. Renews automatically. Cancel anytime in Apple settings.`;
}
