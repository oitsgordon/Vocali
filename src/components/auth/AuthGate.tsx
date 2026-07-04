"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/authStore";

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isReady || auth.user) {
      return;
    }

    const redirectPath = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({
      mode: "signup",
      redirect: redirectPath,
    });

    router.replace(`/login?${params.toString()}`);
  }, [auth.isReady, auth.user, router]);

  if (!auth.isReady || !auth.user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-vocali-teal">
        <Loader2 className="h-8 w-8 animate-spin" strokeWidth={3} />
      </div>
    );
  }

  return children;
}
