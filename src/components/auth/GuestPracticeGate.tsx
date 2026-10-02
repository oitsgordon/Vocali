"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/authStore";
import { hasCompletedGuestTrial, isAnonymousUser } from "@/lib/guestTrial";

export function GuestPracticeGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [eligibleAtEntry] = useState(() => !hasCompletedGuestTrial());
  const guestAllowed =
    auth.isReady && isAnonymousUser(auth.user) && eligibleAtEntry;

  useEffect(() => {
    if (!auth.isReady || guestAllowed) return;

    router.replace(
      auth.user && !isAnonymousUser(auth.user)
        ? "/paywall?from=onboarding&redirect=%2Fhome"
        : "/login?mode=signup&redirect=%2Fpaywall%3Ffrom%3Donboarding%26redirect%3D%252Fhome",
    );
  }, [auth.isReady, auth.user, guestAllowed, router]);

  if (!guestAllowed) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-3 bg-vocali-cream text-vocali-teal">
        <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin" />
        <span className="font-bold">Preparing your practice...</span>
      </div>
    );
  }

  return children;
}
