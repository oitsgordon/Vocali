"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import {
  completeOAuthSignIn,
  consumeOAuthRedirectPath,
} from "@/lib/authStore";

export function AuthCallbackClient({
  initialError,
  redirectPath,
}: {
  initialError: string | null;
  redirectPath: string;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState(initialError);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (initialError || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    async function finishSignIn() {
      const result = await completeOAuthSignIn();

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      router.replace(consumeOAuthRedirectPath(redirectPath));
    }

    void finishSignIn();
  }, [initialError, redirectPath, router]);

  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-7 pt-8 text-center sm:min-h-[760px]">
        <div className="flex items-center justify-center gap-2">
          <VocaliLogo size="xs" variant="mark" />
          <span className="text-xl font-extrabold text-vocali-teal-deep">
            Vocali
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.4rem] bg-white/85 text-vocali-teal shadow-[0_18px_40px_rgb(20_64_62/0.08)] ring-1 ring-white/80">
            {errorMessage ? (
              <AlertCircle className="h-9 w-9" strokeWidth={3} />
            ) : (
              <Loader2 className="h-9 w-9 animate-spin" strokeWidth={3} />
            )}
          </div>
          <h1 className="mt-7 text-[2rem] font-extrabold leading-tight text-vocali-teal-deep">
            {errorMessage ? "Try signing in again" : "Signing you in"}
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-base font-medium leading-7 text-vocali-muted">
            {errorMessage ?? "Getting your account ready."}
          </p>
        </div>
      </section>
    </ScreenFrame>
  );
}
