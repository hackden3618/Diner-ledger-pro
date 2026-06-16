export type SubscriptionPlanId = "weekly" | "monthly" | "lifetime";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  label: string;
  priceKes: number;
  durationDays: number | null;
  badge: string;
  description: string;
};

export const TRIAL_DAYS = 14;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "weekly",
    label: "Weekly",
    priceKes: 100,
    durationDays: 7,
    badge: "Starter",
    description: "KES 100 every week for active restaurants testing the workflow.",
  },
  {
    id: "monthly",
    label: "Monthly",
    priceKes: 300,
    durationDays: 30,
    badge: "Best value",
    description: "KES 300 per month with maintenance, support, updates, and improvements.",
  },
  {
    id: "lifetime",
    label: "Lifetime",
    priceKes: 9999,
    durationDays: null,
    badge: "One time",
    description: "KES 9,999 once for lifetime access plus standard updates and support.",
  },
];

export function getPlan(planId: SubscriptionPlanId) {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
  if (!plan) throw new Error(`Unknown subscription plan: ${planId}`);
  return plan;
}
