"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/authStore";
import { initializeRevenueCat } from "@/lib/revenueCat";

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;

  useEffect(() => {
    if (auth.isReady) {
      void initializeRevenueCat(userId);
    }
  }, [auth.isReady, userId]);

  return children;
}
