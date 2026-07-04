import type { ProgressPreview, RecentFeedback, UserProfile } from "@/lib/types";

export const mockUser: UserProfile = {
  name: "there",
  streakDays: 7,
  weeklyGoal: 5,
  completedThisWeek: 4,
};

export const mockProgress: ProgressPreview[] = [
  {
    label: "Clarity",
    value: 78,
    change: "+8%",
  },
  {
    label: "Structure",
    value: 72,
    change: "+5%",
  },
  {
    label: "Confidence",
    value: 81,
    change: "+11%",
  },
];

export const mockRecentFeedback: RecentFeedback = {
  id: "feedback-1",
  title: "Social confidence prompt",
  score: 82,
  summary: "Friendly tone. Next, add one concrete detail to sound more natural.",
};
