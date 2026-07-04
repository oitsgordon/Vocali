"use client";

import { useEffect, type ReactNode } from "react";
import { initializeAuthStore } from "@/lib/authStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initializeAuthStore();
  }, []);

  return children;
}
