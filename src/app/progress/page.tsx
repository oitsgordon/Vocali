"use client";

import Link from "next/link";
import {
  CalendarCheck2,
  ChevronRight,
  Clock3,
  Flame,
  MessageCircle,
} from "lucide-react";
import { StreakCard } from "@/components/dashboard/DashboardCards";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { mockPracticeTotals } from "@/data/mockProgress";
import { getPracticeTotals } from "@/lib/attemptStorage";
import { formatRelativeAttemptDate } from "@/lib/attemptFormat";
import { getSpeakingPatternInsights } from "@/lib/speakingPatternInsights";
import type { LocalAttempt } from "@/lib/types";
import { useLocalAttempts } from "@/lib/useLocalAttempts";

export default function ProgressPage() {
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const totals = hasLoadedAttempts
    ? getPracticeTotals(attempts)
    : mockPracticeTotals;
  const hasAttempts = attempts.length > 0;
  const patternInsights = getSpeakingPatternInsights(attempts);

  return (
    <ScreenFrame withNavPadding>
      <section className="vocali-safe-top px-5 pb-8 pt-7">
        <div>
          <p className="text-lg font-black text-vocali-teal">Keep going</p>
          <h1 className="mt-2 text-[2.35rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
            Your speaking habit is taking shape.
          </h1>
        </div>

        <div className="mt-6 space-y-5">
          <StreakCard />
          <PracticeTotalsGrid totals={totals} />
          {hasLoadedAttempts && !hasAttempts ? (
            <FirstAttemptEmptyState />
          ) : (
            <>
              <SpeakingPatternCards
                insights={patternInsights.insights}
                usableAttemptCount={patternInsights.usableAttemptCount}
              />
              <RecentAttemptsList attempts={hasLoadedAttempts ? attempts : []} />
            </>
          )}
        </div>
      </section>
      <BottomNav />
    </ScreenFrame>
  );
}

function PracticeTotalsGrid({
  totals,
}: {
  totals: {
    attemptsCompleted: number;
    minutesSpoken: number;
    daysPractisedThisWeek: number;
  };
}) {
  const totalItems = [
    {
      label: "Attempts",
      value: totals.attemptsCompleted,
      icon: MessageCircle,
    },
    {
      label: "Minutes",
      value: totals.minutesSpoken,
      icon: Clock3,
    },
    {
      label: "This week",
      value: totals.daysPractisedThisWeek,
      icon: CalendarCheck2,
    },
  ];

  return (
    <section className="grid grid-cols-3 gap-3">
      {totalItems.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-[1.35rem] bg-white p-4 text-center shadow-[0_12px_28px_rgb(7_50_71/0.08)]"
          >
            <Icon className="mx-auto h-6 w-6 text-vocali-teal" strokeWidth={3} />
            <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-vocali-teal-deep">
              {item.value}
            </p>
            <p className="text-xs font-black text-vocali-muted">{item.label}</p>
          </div>
        );
      })}
    </section>
  );
}

function FirstAttemptEmptyState() {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
      <div className="rounded-[1.5rem] bg-vocali-cream p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vocali-teal text-white shadow-[0_14px_28px_rgb(0_167_165/0.2)]">
          <MessageCircle className="h-7 w-7" strokeWidth={3} />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-vocali-teal-deep">
          Record your first attempt
        </h2>
        <p className="mt-2 text-sm font-semibold leading-5 text-vocali-muted">
          Complete one short speaking prompt and Vocali will start showing your
          speaking patterns here.
        </p>
        <Link
          href="/practice"
          className="mt-5 flex h-14 w-full items-center justify-center rounded-[1.1rem] bg-vocali-orange px-5 text-base font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.24)]"
        >
          Start practice
        </Link>
      </div>
    </section>
  );
}

function MoreAttemptsNeededState() {
  return (
    <div className="mt-4 rounded-[1.25rem] bg-vocali-cream p-4">
      <p className="text-base font-black text-vocali-teal-deep">
        More attempts needed
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-vocali-muted">
        Vocali needs a transcript or saved speaking metrics before it can show
        measured patterns. Complete one recorded attempt and submit it to start.
      </p>
    </div>
  );
}

function SpeakingPatternCards({
  insights,
  usableAttemptCount,
}: {
  insights: Array<{
    label: string;
    signal: string;
    note: string;
  }>;
  usableAttemptCount: number;
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-vocali-teal-deep">
            Speaking patterns
          </h2>
          <p className="mt-1 text-xs font-bold text-vocali-muted">
            Based on local completed attempts
          </p>
        </div>
        {usableAttemptCount > 0 ? (
          <span className="rounded-full bg-vocali-teal/10 px-3 py-1 text-xs font-black text-vocali-teal">
            {usableAttemptCount} measured
          </span>
        ) : null}
      </div>

      {insights.length === 0 ? (
        <MoreAttemptsNeededState />
      ) : (
        <div className="mt-4 divide-y divide-vocali-border/55">
          {insights.map((pattern) => (
            <div key={pattern.label} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="text-vocali-teal-deep">{pattern.label}</span>
                <span className="shrink-0 rounded-full bg-vocali-teal/12 px-3 py-1 text-xs font-black text-vocali-teal">
                  {pattern.signal}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-vocali-muted">
                {getCompactPatternNote(pattern)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getCompactPatternNote(pattern: {
  label: string;
  note: string;
  signal: string;
}) {
  if (pattern.label === "Filler words") {
    if (
      pattern.signal === "Noticeable fillers" ||
      pattern.signal === "Frequent fillers" ||
      pattern.signal === "Some fillers"
    ) {
      return "Try replacing one with a short pause.";
    }

    return "Keep using short pauses.";
  }

  if (pattern.label === "Repetition") {
    if (pattern.signal === "Low repetition") {
      return "You usually keep moving forward.";
    }

    return "Finish one sentence before restarting.";
  }

  if (pattern.label === "Pace") {
    const wordsPerMinute = pattern.note.match(/around (\d+) words\/min/);

    if (wordsPerMinute?.[1]) {
      return `Around ${wordsPerMinute[1]} words/min.`;
    }

    if (pattern.signal === "Short attempt") {
      return "Try one fuller answer next.";
    }

    return "Use a short pause after your opener.";
  }

  if (pattern.label === "Answer depth") {
    const averageWords = pattern.note.match(/about (\d+) words/);

    if (averageWords?.[1]) {
      return `About ${averageWords[1]} words on average.`;
    }

    return "Add one reason or example.";
  }

  if (pattern.label === "Time used") {
    const seconds = pattern.note.match(/around (\d+) of (\d+) seconds/);

    if (seconds?.[1] && seconds[2]) {
      return `Around ${seconds[1]} of ${seconds[2]} seconds.`;
    }

    return "Use this as timing context.";
  }

  return pattern.note.length > 64
    ? `${pattern.note.slice(0, 61).trim()}...`
    : pattern.note;
}

function RecentAttemptsList({ attempts }: { attempts: LocalAttempt[] }) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-vocali-teal-deep">
          Recent attempts
        </h2>
        <Flame className="h-6 w-6 fill-vocali-orange text-vocali-orange" />
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-[1.25rem] bg-vocali-cream p-4">
          <p className="text-base font-black text-vocali-teal-deep">
            No completed attempts yet
          </p>
          <p className="mt-2 text-sm font-semibold leading-5 text-vocali-muted">
            Finish a short speaking prompt and your local practice history will
            appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-vocali-border/55">
          {attempts.slice(0, 5).map((attempt) => (
            <Link
              key={attempt.id}
              href={`/progress/attempt/${encodeURIComponent(attempt.id)}`}
              className="block py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[0.95rem] font-black leading-5 text-vocali-teal-deep">
                    {attempt.prompt}
                  </h3>
                  <p className="mt-1 text-[0.72rem] font-black leading-4 text-vocali-muted/85">
                    {formatRelativeAttemptDate(attempt.completedAt)} / {attempt.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="mt-0.5 max-w-[7.5rem] rounded-full bg-vocali-teal/10 px-2.5 py-1 text-[0.68rem] font-black leading-3 text-vocali-teal">
                    {attempt.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-vocali-muted/65" strokeWidth={3} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
