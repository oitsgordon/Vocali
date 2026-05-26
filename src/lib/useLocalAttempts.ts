"use client";

import { useSyncExternalStore } from "react";
import {
  getAttempts,
  getEmptyAttemptsSnapshot,
  subscribeToAttempts,
} from "@/lib/attemptStorage";

export function useLocalAttempts() {
  const attempts = useSyncExternalStore(
    subscribeToAttempts,
    getAttempts,
    getEmptyAttemptsSnapshot,
  );

  return { attempts, hasLoadedAttempts: true };
}
