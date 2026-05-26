"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  MessageCircle,
} from "lucide-react";
import { mockChallenges } from "@/data/mockChallenges";
import { mockProgress, mockRecentFeedback, mockUser } from "@/data/mockDashboard";
import {
  getCompletedWeekdays,
  getCurrentStreak,
  getPracticeTotals,
  getStreakStatus,
} from "@/lib/attemptStorage";
import {
  getDailyChallenge,
  getDailyChallengeSessionHref,
  getFallbackDailyChallenge,
  getTodayDailyAttempt,
} from "@/lib/dailyChallenge";
import { useLocalAttempts } from "@/lib/useLocalAttempts";
import { useEffect, useState } from "react";

const practiceRoute = "/practice/session?source=home";

export function StreakCard() {
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const streakStatus = hasLoadedAttempts
    ? getStreakStatus(attempts)
    : {
        count: mockUser.streakDays,
        message: mockUser.streakDays > 0 ? "Continue it today" : "Start with one prompt",
        status: "due_today" as const,
      };
  const streakDays = streakStatus.count;
  const completedWeekdays = hasLoadedAttempts
    ? getCompletedWeekdays(attempts)
    : new Set<number>();
  const week = ["M", "T", "W", "T", "F", "S", "S"];
  const fallbackCompletedDays = mockUser.completedThisWeek;

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-vocali-card">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ffe6b8]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ffd27b] text-vocali-orange">
            <Flame className="h-8 w-8 fill-vocali-orange" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-vocali-teal-deep">Your streak</p>
          <p className="text-4xl font-black tracking-[-0.04em] text-vocali-orange">
            {streakDays} {streakDays === 1 ? "day" : "days"}
          </p>
          <p className="text-sm font-bold text-vocali-muted">
            {streakStatus.message}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {week.map((day, index) => {
          const isComplete = hasLoadedAttempts
            ? completedWeekdays.has(index)
            : index < fallbackCompletedDays;

          return (
            <div key={`${day}-${index}`} className="flex flex-col items-center gap-1">
              <span className="text-xs font-black text-vocali-muted">{day}</span>
              <span
                className={
                  isComplete
                    ? "flex h-7 w-7 items-center justify-center rounded-full bg-vocali-orange text-white"
                    : "h-7 w-7 rounded-full bg-[#e8e2d7]"
                }
              >
                {isComplete ? <Check className="h-4 w-4" strokeWidth={4} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TodayChallengeCard() {
  const challenge = mockChallenges[0];
  const challengeHref = `${practiceRoute}&challenge=${challenge.id}`;

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-vocali-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-vocali-teal">Today&apos;s Challenge</h2>
        <span className="rounded-full bg-vocali-teal/15 px-4 py-2 text-sm font-black text-vocali-teal">
          New
        </span>
      </div>
      <Link href={challengeHref} className="flex items-center gap-2.5">
        <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-[1.15rem] bg-gradient-to-br from-[#bff3e9] to-[#4eb8ad]">
          <div className="absolute bottom-0 left-0 h-12 w-[5.5rem] bg-[#087f78]" />
          <div className="absolute bottom-5 left-4 h-14 w-14 rotate-45 bg-[#0b6f67]" />
          <div className="absolute right-3 top-5 h-8 w-11 rounded-full bg-white/80" />
          <div className="absolute bottom-6 right-2 flex h-10 w-12 items-center justify-center rounded-[0.9rem] bg-white text-vocali-teal">
            <MessageCircle className="h-6 w-6 fill-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.05rem] font-black leading-[1.08] tracking-[-0.01em] text-vocali-teal-deep">
            {challenge.prompt}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold text-vocali-muted">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" /> 60 sec
            </span>
            <span>/</span>
            <span>{challenge.difficulty}</span>
          </div>
        </div>
        <span
          aria-label="Start today's challenge"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vocali-teal/15 text-vocali-teal-deep"
        >
          <ArrowRight className="h-6 w-6" strokeWidth={3} />
        </span>
      </Link>
    </section>
  );
}

export function DailyChallengeHero() {
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const [dailyChallenge, setDailyChallenge] = useState(() =>
    getFallbackDailyChallenge(),
  );
  const completedAttempt = hasLoadedAttempts
    ? getTodayDailyAttempt(attempts)
    : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDailyChallenge(getDailyChallenge());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (completedAttempt) {
    return (
      <section className="rounded-[2rem] bg-vocali-teal-deep p-5 text-white shadow-[0_20px_45px_rgb(7_50_71/0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#8be4dd]">
              Today&apos;s action
            </p>
            <h1 className="mt-2 text-[2.1rem] font-black leading-[1.05] tracking-[-0.04em]">
              Daily challenge complete
            </h1>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-vocali-orange">
            <CheckCircle2 className="h-8 w-8" strokeWidth={3} />
          </div>
        </div>

        <p className="mt-4 max-w-[18rem] text-base font-bold leading-6 text-white/78">
          Nice work. You got today&apos;s speaking rep done.
        </p>

        <div className="mt-5 rounded-[1.4rem] bg-white p-4 text-vocali-teal-deep">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-vocali-muted">
            Today&apos;s note
          </p>
          <p className="mt-2 text-xl font-black leading-tight tracking-[-0.03em]">
            {completedAttempt.label}
          </p>
          <p className="mt-2 text-sm font-bold leading-5 text-vocali-muted">
            {completedAttempt.nextAction}
          </p>
        </div>

        <Link
          href="/practice"
          className="mt-5 flex h-[3.75rem] w-full touch-manipulation items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)] transition active:scale-[0.99]"
        >
          Practice more
          <ArrowRight className="h-6 w-6" strokeWidth={3} />
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] bg-vocali-teal-deep p-5 text-white shadow-[0_20px_45px_rgb(7_50_71/0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[#8be4dd]">
            Today&apos;s challenge
          </p>
          <h1 className="mt-2 text-[2rem] font-black leading-[1.05] tracking-[-0.04em]">
            Build your speaking confidence
          </h1>
        </div>
      </div>

      <div className="mt-5 rounded-[1.35rem] bg-white p-4 text-vocali-teal-deep">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-vocali-muted/85">
          Today&apos;s prompt
        </p>
        <p className="mt-2 text-xl font-black leading-tight tracking-[-0.03em]">
          Revealed when your planning timer starts.
        </p>
        <p className="mt-2 text-xs font-black text-vocali-muted">
          30 sec plan &middot; 60 sec speak
        </p>
      </div>

      <Link
        href={getDailyChallengeSessionHref(dailyChallenge)}
        className="mt-5 flex h-[3.75rem] w-full touch-manipulation items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)] transition active:scale-[0.99] hover:-translate-y-0.5"
      >
        Start daily challenge
        <ArrowRight className="h-6 w-6" strokeWidth={3} />
      </Link>
    </section>
  );
}

export function ProgressPreviewCard() {
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const totals = hasLoadedAttempts ? getPracticeTotals(attempts) : null;
  const streakDays = hasLoadedAttempts ? getCurrentStreak(attempts) : 0;

  if (hasLoadedAttempts && attempts.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-vocali-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-vocali-teal-deep">Progress</h2>
          <BarChart3 className="h-6 w-6 text-vocali-teal" />
        </div>
        <p className="text-base font-bold leading-6 text-vocali-muted">
          Complete your first prompt and Vocali will start tracking your local
          practice habit here.
        </p>
      </section>
    );
  }

  const localProgress = totals
    ? [
        { label: "Attempts", value: totals.attemptsCompleted },
        { label: "Minutes", value: totals.minutesSpoken },
        { label: "Streak", value: streakDays },
      ]
    : mockProgress.map((item) => ({
        label: item.label,
        value: item.value,
      }));

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-vocali-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-vocali-teal-deep">Progress</h2>
        <BarChart3 className="h-6 w-6 text-vocali-teal" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {localProgress.map((item) => (
          <div key={item.label} className="rounded-[1.1rem] bg-vocali-cream p-3 text-center">
            <p className="text-2xl font-black tracking-[-0.04em] text-vocali-teal-deep">
              {item.value}
            </p>
            <p className="mt-1 text-xs font-black text-vocali-muted">
              <span className="text-vocali-teal-deep">{item.label}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentFeedbackCard() {
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const latestAttempt = hasLoadedAttempts ? attempts[0] : null;
  const hasNoAttempts = hasLoadedAttempts && attempts.length === 0;
  const label = latestAttempt?.label ?? (hasNoAttempts ? "New" : mockRecentFeedback.score);
  const category = latestAttempt?.category ?? (hasNoAttempts ? "No attempts yet" : mockRecentFeedback.title);
  const feedbackCopy = latestAttempt
    ? latestAttempt.nextAction
    : hasNoAttempts
      ? "Complete a short prompt and your latest coaching note will appear here."
      : mockRecentFeedback.summary;

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-vocali-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-vocali-orange" strokeWidth={3} />
            <h2 className="text-lg font-black leading-6 text-vocali-teal-deep">
              Recent feedback
            </h2>
          </div>
          <p className="mt-1 text-xs font-black leading-4 text-vocali-muted/90">
            {category}
          </p>
        </div>
        <span className="mt-0.5 max-w-[7.25rem] shrink-0 rounded-full bg-vocali-teal/10 px-2.5 py-1 text-[0.68rem] font-black leading-3 text-vocali-teal">
          {label}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 text-vocali-muted">
        {feedbackCopy}
      </p>
    </section>
  );
}
