"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/authStore";
import { initializeRevenueCat, refreshSubscriptionInformation } from "@/lib/revenueCat";
import { isAnonymousUser } from "@/lib/guestTrial";

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user && !isAnonymousUser(auth.user) ? auth.user.id : null;

  useEffect(() => {
    if (auth.isReady) {
      void initializeRevenueCat(userId);
    }
  }, [auth.isReady, userId]);

  useEffect(() => {
    function refreshOnForeground() {
      if (document.visibilityState === "visible" && auth.isReady) {
        void refreshSubscriptionInformation(userId);
      }
    }

    document.addEventListener("visibilitychange", refreshOnForeground);
    return () => document.removeEventListener("visibilitychange", refreshOnForeground);
  }, [auth.isReady, userId]);

  return children;
}
