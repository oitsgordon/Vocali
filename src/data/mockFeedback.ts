import type { FeedbackResult } from "@/lib/types";

export const mockDailyFeedback: FeedbackResult = {
  pace: {
    label: "A little fast",
    note: "Try pausing after your first sentence so the idea has room to land.",
  },
  fillerWords: {
    label: "Some filler words",
    note: "You used a few filler words while thinking. Short pauses can do the same job.",
  },
  repetition: {
    label: "Low repetition",
    note: "You mostly kept moving forward and did not circle around the same point.",
  },
  clarity: {
    label: "Clear main idea",
    note: "Your answer was easy to follow overall, especially once your example began.",
  },
  structure: {
    label: "Main point could come earlier",
    note: "Start with the answer first, then add the details that support it.",
  },
  nextAction: "Open with your main point in one sentence.",
};
