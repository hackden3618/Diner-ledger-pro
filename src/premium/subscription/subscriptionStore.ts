import { getSetting, initDatabase, updateSetting } from "@/database/db";
import { getPlan, SubscriptionPlanId, TRIAL_DAYS } from "./plans";

export type SubscriptionStatus = "loading" | "trial" | "active" | "expired" | "none";

export type SubscriptionState = {
  status: SubscriptionStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  planId?: SubscriptionPlanId;
  paidUntil?: string;
  lifetime: boolean;
  lastCheckoutReference?: string;
};

const KEYS = {
  trialStartedAt: "premium_trial_started_at",
  trialEndsAt: "premium_trial_ends_at",
  planId: "premium_plan_id",
  paidUntil: "premium_paid_until",
  lifetime: "premium_lifetime",
  lastCheckoutReference: "premium_last_checkout_reference",
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function readRawState(): Omit<SubscriptionState, "status"> {
  initDatabase();

  return {
    trialStartedAt: getSetting(KEYS.trialStartedAt) || undefined,
    trialEndsAt: getSetting(KEYS.trialEndsAt) || undefined,
    planId: (getSetting(KEYS.planId) as SubscriptionPlanId | null) || undefined,
    paidUntil: getSetting(KEYS.paidUntil) || undefined,
    lifetime: getSetting(KEYS.lifetime) === "true",
    lastCheckoutReference: getSetting(KEYS.lastCheckoutReference) || undefined,
  };
}

export function getSubscriptionState(now = new Date()): SubscriptionState {
  const raw = readRawState();

  if (raw.lifetime) {
    return { ...raw, status: "active" };
  }

  if (raw.paidUntil && new Date(raw.paidUntil).getTime() > now.getTime()) {
    return { ...raw, status: "active" };
  }

  if (raw.trialEndsAt && new Date(raw.trialEndsAt).getTime() > now.getTime()) {
    return { ...raw, status: "trial" };
  }

  if (raw.trialStartedAt || raw.paidUntil) {
    return { ...raw, status: "expired" };
  }

  return { ...raw, status: "none" };
}

export function startTrial(now = new Date()): SubscriptionState {
  initDatabase();

  if (getSetting(KEYS.trialStartedAt)) {
    return getSubscriptionState(now);
  }

  const trialStartedAt = now.toISOString();
  const trialEndsAt = addDays(now, TRIAL_DAYS).toISOString();
  updateSetting(KEYS.trialStartedAt, trialStartedAt);
  updateSetting(KEYS.trialEndsAt, trialEndsAt);
  return getSubscriptionState(now);
}

export function rememberCheckoutReference(reference: string) {
  initDatabase();
  updateSetting(KEYS.lastCheckoutReference, reference);
}

export function activateVerifiedSubscription(
  planId: SubscriptionPlanId,
  receiptReference: string,
  now = new Date(),
): SubscriptionState {
  initDatabase();
  const plan = getPlan(planId);
  updateSetting(KEYS.planId, planId);
  updateSetting(KEYS.lastCheckoutReference, receiptReference);

  if (plan.durationDays === null) {
    updateSetting(KEYS.lifetime, "true");
    updateSetting(KEYS.paidUntil, "");
  } else {
    const currentState = getSubscriptionState(now);
    const baseDate =
      currentState.paidUntil && new Date(currentState.paidUntil).getTime() > now.getTime()
        ? new Date(currentState.paidUntil)
        : now;
    updateSetting(KEYS.lifetime, "false");
    updateSetting(KEYS.paidUntil, addDays(baseDate, plan.durationDays).toISOString());
  }

  return getSubscriptionState(now);
}

export function getDaysRemaining(dateIso?: string, now = new Date()) {
  if (!dateIso) return 0;
  const diff = new Date(dateIso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
