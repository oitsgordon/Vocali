"use client";

import {
  DailyChallengeHero,
  ProgressPreviewCard,
  RecentFeedbackCard,
  StreakCard,
} from "@/components/dashboard/DashboardCards";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { useUserPreferences } from "@/lib/useUserPreferences";

export default function HomeDashboard() {
  const { hasLoadedPreferences, preferences } = useUserPreferences();
  const greetingName = hasLoadedPreferences
    ? preferences.displayName
    : "there";

  return (
    <ScreenFrame withNavPadding>
      <section className="vocali-safe-top px-5 pb-8 pt-7">
        <p className="text-lg font-black text-vocali-teal">Hi {greetingName}</p>

        <div className="mt-3 space-y-5">
          <DailyChallengeHero />
          <StreakCard />
          <ProgressPreviewCard />
          <RecentFeedbackCard />
        </div>
      </section>
      <BottomNav />
    </ScreenFrame>
  );
}
