import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";

export default function LoginPage() {
  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-top-loose vocali-safe-bottom flex min-h-dvh flex-col px-7 pb-7 pt-10 text-center sm:min-h-[860px]">
        <div className="flex justify-center">
          <VocaliLogo size="sm" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-vocali-teal/12 text-vocali-teal">
            <LogIn className="h-12 w-12" strokeWidth={3} />
          </div>
          <h1 className="mt-8 text-[2.65rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
            Welcome back.
          </h1>
          <p className="mx-auto mt-5 max-w-xs text-lg font-bold leading-7 text-vocali-muted">
            Accounts are coming soon. For now, you can continue into the Vocali
            demo.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/home"
            className="flex h-16 w-full items-center justify-center gap-3 rounded-[1.15rem] bg-vocali-orange px-6 text-xl font-black text-white shadow-[0_14px_24px_rgb(255_122_26/0.26)]"
          >
            Continue to Vocali
            <ArrowRight className="h-6 w-6" strokeWidth={3} />
          </Link>
          <Link
            href="/"
            className="flex h-16 w-full items-center justify-center rounded-[1.15rem] border-2 border-vocali-teal bg-white/55 px-6 text-lg font-black text-vocali-teal"
          >
            Back to onboarding
          </Link>
        </div>
      </section>
    </ScreenFrame>
  );
}
