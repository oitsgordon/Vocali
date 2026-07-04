"use client";

import {
  ChevronRight,
  LogOut,
  Mic,
  Settings,
  ShieldCheck,
  Target,
} from "lucide-react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/AuthGate";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { retryAccountSync, signOut, useAuth } from "@/lib/authStore";
import { useUserPreferences } from "@/lib/useUserPreferences";

export default function ProfilePage() {
  const { hasLoadedPreferences, preferences } = useUserPreferences();
  const displayName =
    hasLoadedPreferences && preferences.displayName !== "there"
      ? preferences.displayName
      : "Your profile";

  return (
    <AuthGate>
      <ScreenFrame withNavPadding>
        <section className="vocali-safe-top px-5 pb-8 pt-7">
          <div className="rounded-[2rem] bg-white p-5 text-center shadow-vocali-card">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#5adfd4] to-vocali-teal text-white shadow-[0_18px_35px_rgb(0_167_165/0.22)]">
              <Mic className="h-14 w-14" strokeWidth={3} />
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-vocali-teal-deep">
              {displayName}
            </h1>
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
    </AuthGate>
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
          <p className="text-xl font-black leading-7">
            Confidence comes from reps. One short answer today is enough.
          </p>
        </div>
      </div>
    </section>
  );
}

function FutureSettingsCard() {
  const auth = useAuth();
  const rows = [
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Privacy", icon: ShieldCheck, href: "/privacy" },
  ];

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
      <h2 className="text-xl font-black text-vocali-teal-deep">Settings</h2>
      <p className="mt-1 text-sm font-bold leading-5 text-vocali-muted">
        {auth.user
          ? `Signed in as ${auth.user.email ?? "your account"}`
          : "Sign in to sync progress across devices."}
      </p>
      {auth.syncMessage ? (
        <div className="mt-4 rounded-[1rem] bg-vocali-orange/10 p-3">
          <p className="text-sm font-black leading-5 text-vocali-orange">
            {auth.syncMessage}
          </p>
          {auth.user ? (
            <button
              type="button"
              onClick={() => void retryAccountSync()}
              className="mt-2 text-sm font-black text-vocali-teal"
            >
              Retry sync
            </button>
          ) : null}
        </div>
      ) : null}
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
        {auth.user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-12 w-full items-center justify-between rounded-[1rem] bg-vocali-cream px-4 py-3 text-vocali-muted"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5" strokeWidth={3} />
              <span className="text-sm font-black">Log out</span>
            </div>
            <ChevronRight className="h-5 w-5 text-vocali-teal" strokeWidth={3} />
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-12 items-center justify-between rounded-[1rem] bg-vocali-cream px-4 py-3 text-vocali-muted"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 rotate-180" strokeWidth={3} />
              <span className="text-sm font-black">Log in</span>
            </div>
            <ChevronRight className="h-5 w-5 text-vocali-teal" strokeWidth={3} />
          </Link>
        )}
      </div>
    </section>
  );
}
