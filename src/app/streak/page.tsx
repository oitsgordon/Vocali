"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { getCompletedWeekdays, getStreakStatus } from "@/lib/attemptStorage";
import { getTodayKey } from "@/lib/dailyChallenge";
import { consumeStreakCelebration } from "@/lib/streakCelebration";
import { useLocalAttempts } from "@/lib/useLocalAttempts";

type CelebrationStatus = "checking" | "ready";

export default function StreakCelebrationPage() {
  const router = useRouter();
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const [status, setStatus] = useState<CelebrationStatus>("checking");
  const streakStatus = hasLoadedAttempts
    ? getStreakStatus(attempts)
    : {
        count: 0,
        message: "Nice work. Come back tomorrow.",
        status: "completed_today" as const,
      };
  const completedWeekdays = hasLoadedAttempts
    ? getCompletedWeekdays(attempts)
    : new Set<number>();
  const week = ["M", "T", "W", "T", "F", "S", "S"];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const pendingCelebration = consumeStreakCelebration();

      if (!pendingCelebration || pendingCelebration.dateKey !== getTodayKey()) {
        router.replace("/home");
        return;
      }

      setStatus("ready");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  if (status !== "ready") {
    return (
      <ScreenFrame>
        <section className="flex min-h-dvh items-center justify-center bg-vocali-teal-deep px-6 text-center text-white sm:min-h-[860px]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8be4dd]">
            Loading streak
          </p>
        </section>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame>
      <section className="vocali-streak-screen flex h-dvh min-h-dvh flex-col bg-vocali-teal-deep px-6 pb-4 pt-4 text-white sm:h-[860px] sm:min-h-[860px] sm:pb-6 sm:pt-6">
        <header className="vocali-streak-header flex h-8 shrink-0 items-center justify-center overflow-visible">
          <div className="opacity-90">
            <VocaliLogo size="xs" variant="mark" />
          </div>
        </header>

        <div className="vocali-streak-content flex min-h-0 flex-1 flex-col items-center justify-center py-2 text-center sm:py-4">
          <div className="vocali-streak-flame-shell relative flex h-[clamp(8.6rem,25dvh,15rem)] w-[clamp(8.6rem,25dvh,15rem)] items-center justify-center rounded-full bg-white/8 shadow-[0_20px_46px_rgb(0_0_0/0.14)]">
            <div className="vocali-streak-flame-core relative flex h-[clamp(7rem,20.5dvh,11.4rem)] w-[clamp(7rem,20.5dvh,11.4rem)] items-center justify-center rounded-full bg-vocali-orange text-white shadow-[0_20px_42px_rgb(255_122_26/0.30)]">
              <Flame
                className="vocali-streak-flame h-[clamp(4.2rem,12dvh,7rem)] w-[clamp(4.2rem,12dvh,7rem)] fill-white"
                strokeWidth={2.5}
              />
            </div>
          </div>

          <h1 className="vocali-streak-heading mt-4 text-[clamp(1.9rem,4.5dvh,3rem)] font-black leading-none tracking-[-0.05em] sm:mt-7">
            You&apos;re on a streak!
          </h1>

          <p className="vocali-streak-stat mt-3 flex items-baseline justify-center gap-2.5 font-black leading-none tracking-[-0.07em] text-vocali-orange sm:mt-5 sm:gap-3">
            <span className="text-[clamp(3.4rem,9.2dvh,6.2rem)]">
              {streakStatus.count}
            </span>
            <span className="text-[clamp(1.85rem,5dvh,3.3rem)] tracking-[-0.05em]">
              {streakStatus.count === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="vocali-streak-support mt-2 text-sm font-bold text-white/72 sm:mt-4 sm:text-base">
            That&apos;s {streakStatus.count}{" "}
            {streakStatus.count === 1 ? "day" : "days"} of showing up.
          </p>

          <div className="vocali-streak-week mt-4 flex w-full max-w-xs justify-between rounded-[1rem] bg-white/7 px-3 py-2.5 sm:mt-7 sm:rounded-[1.2rem] sm:px-3.5 sm:py-3">
            {week.map((day, index) => {
              const isComplete = completedWeekdays.has(index);

              return (
                <div
                  key={`${day}-${index}`}
                  className="flex flex-col items-center gap-1.5 sm:gap-2"
                >
                  <span className="text-[0.68rem] font-black text-white/58 sm:text-xs">
                    {day}
                  </span>
                  <span
                    className={
                      isComplete
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-vocali-orange text-white sm:h-7 sm:w-7"
                        : "h-6 w-6 rounded-full bg-white/14 sm:h-7 sm:w-7"
                    }
                  >
                    {isComplete ? (
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={4} />
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="vocali-streak-actions shrink-0 space-y-2.5 sm:space-y-3">
          <Link
            href="/home"
            className="flex h-[3.25rem] w-full items-center justify-center rounded-[1.05rem] bg-vocali-orange px-5 text-base font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.24)] sm:h-[3.75rem] sm:rounded-[1.2rem] sm:text-lg"
          >
            Continue
          </Link>
          <Link
            href="/practice"
            className="flex h-11 min-h-11 w-full items-center justify-center rounded-[1rem] border-2 border-white/24 bg-white/7 px-5 text-sm font-black text-white sm:h-13 sm:min-h-13 sm:rounded-[1.1rem] sm:text-base"
          >
            Practice more
          </Link>
        </div>
      </section>
    </ScreenFrame>
  );
}
