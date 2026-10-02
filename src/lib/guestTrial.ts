"use client";

import type { User } from "@supabase/supabase-js";

export const GUEST_TRIAL_COMPLETED_KEY = "vocali:guest-trial-completed:v1";

export function isAnonymousUser(user: User | null | undefined) {
  return user?.is_anonymous === true;
}

export function hasCompletedGuestTrial() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(GUEST_TRIAL_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markGuestTrialCompleted() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(GUEST_TRIAL_COMPLETED_KEY, "true");
  } catch {
    // The server-side one-use quota still protects the current guest account.
  }
}

export function isAccessGateEnabled() {
  return process.env.NEXT_PUBLIC_ACCESS_GATE_ENABLED === "true";
}
