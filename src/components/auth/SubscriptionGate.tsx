"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/lib/authStore";
import { isAccessGateEnabled, isAnonymousUser } from "@/lib/guestTrial";
import { getSubscriptionAccessState, useRevenueCat } from "@/lib/revenueCat";
import { safeInternalDestination } from "@/lib/subscriptionPresentation";

function SubscriptionGateContent({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const revenueCat = useRevenueCat();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const destination = safeInternalDestination(
    `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
  );
  const accessState = getSubscriptionAccessState({
    enabled: isAccessGateEnabled(),
    isAnonymous: isAnonymousUser(auth.user),
    state: revenueCat,
  });

  useEffect(() => {
    if (
      accessState === "expired_or_missing" &&
      auth.isReady &&
      auth.user &&
      !isAnonymousUser(auth.user)
    ) {
      router.replace(
        `/paywall?${new URLSearchParams({ from: "gate", redirect: destination })}`,
      );
    }
  }, [accessState, auth.isReady, auth.user, destination, router]);

  if (accessState === "disabled") return children;

  if (accessState === "error" || accessState === "unavailable") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-vocali-cream px-6 text-center">
        <h1 className="text-2xl font-black text-vocali-teal-deep">
          We couldn&apos;t confirm your access
        </h1>
        <p className="mt-3 max-w-sm font-bold leading-6 text-vocali-muted">
          Check your connection and try again in the Vocali iPhone app. Your subscription has not been changed.
        </p>
        <div className="mt-6 flex gap-5 font-black text-vocali-teal">
          <Link href={`/paywall?${new URLSearchParams({ from: "gate", redirect: destination })}`}>Try again</Link>
          <Link href="/support">Support</Link>
        </div>
      </div>
    );
  }

  if (accessState !== "active" && accessState !== "active_until_expiry") {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-3 bg-vocali-cream text-vocali-teal">
        <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin" />
        <span className="font-bold">Checking your Vocali access...</span>
      </div>
    );
  }

  return children;
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <Suspense fallback={<div role="status" className="flex min-h-dvh items-center justify-center bg-vocali-cream font-bold text-vocali-teal">Checking your Vocali access...</div>}>
        <SubscriptionGateContent>{children}</SubscriptionGateContent>
      </Suspense>
    </AuthGate>
  );
}
