"use client";

import {
  ChevronRight,
  Mic,
  Settings,
  ShieldCheck,
  Target,
} from "lucide-react";
import Link from "next/link";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { useUserPreferences } from "@/lib/useUserPreferences";

export default function ProfilePage() {
  const { hasLoadedPreferences, preferences } = useUserPreferences();
  const displayName = hasLoadedPreferences
    ? preferences.displayName
    : "Your profile";

  return (
    <ScreenFrame withNavPadding>
      <section className="px-5 pb-8 pt-7">
        <header className="flex items-center">
          <VocaliLogo size="sm" />
        </header>

        <div className="mt-7 rounded-[2rem] bg-white p-5 text-center shadow-vocali-card">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#5adfd4] to-vocali-teal text-white shadow-[0_18px_35px_rgb(0_167_165/0.22)]">
            <Mic className="h-14 w-14" strokeWidth={3} />
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-vocali-teal-deep">
            {displayName}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-base font-bold leading-6 text-vocali-muted">
            Building confidence with {preferences.dailyGoal.toLowerCase()} each
            day.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <GoalSummaryCard
            dailyGoal={preferences.dailyGoal}
            focusArea={preferences.focusArea}
          />
          <MotivationCard />
          <FutureSettingsCard />
        </div>
      </section>
      <BottomNav />
    </ScreenFrame>
  );
}

function GoalSummaryCard({
  dailyGoal,
  focusArea,
}: {
  dailyGoal: string;
  focusArea: string;
}) {
  const goals = [
    `Focus: ${focusArea}`,
    `Daily goal: ${dailyGoal}`,
  ];

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
          <Target className="h-7 w-7" strokeWidth={3} />
        </div>
        <h2 className="text-xl font-black text-vocali-teal-deep">Your goal</h2>
      </div>
      <div className="mt-4 space-y-2">
        {goals.map((goal) => (
          <div
            key={goal}
            className="rounded-[1rem] bg-vocali-cream px-4 py-3 text-sm font-black text-vocali-teal-deep"
          >
            {goal}
          </div>
        ))}
      </div>
    </section>
  );
}

function MotivationCard() {
  return (
    <section className="rounded-[1.75rem] bg-vocali-teal-deep p-5 text-white shadow-[0_20px_45px_rgb(7_50_71/0.16)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-vocali-orange">
          <ShieldCheck className="h-7 w-7" strokeWidth={3} />
        </div>
        <div>
          <p className="text-sm font-black text-[#8be4dd]">Support note</p>
          <p className="mt-2 text-xl font-black leading-7">
            Confidence comes from reps. One short answer today is enough.
          </p>
        </div>
      </div>
    </section>
  );
}

function FutureSettingsCard() {
  const rows = [
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Privacy", icon: ShieldCheck, href: "/privacy" },
  ];

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
      <h2 className="text-xl font-black text-vocali-teal-deep">Settings</h2>
      <div className="mt-4 space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <Link
              key={row.label}
              href={row.href}
              className="flex min-h-12 items-center justify-between rounded-[1rem] bg-vocali-cream px-4 py-3 text-vocali-muted"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" strokeWidth={3} />
                <span className="text-sm font-black">{row.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-vocali-teal" strokeWidth={3} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
