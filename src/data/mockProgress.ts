import type { PracticeAttempt, PracticeTotals, SpeakingPattern } from "@/lib/types";

export const mockPracticeTotals: PracticeTotals = {
  attemptsCompleted: 14,
  minutesSpoken: 22,
  daysPractisedThisWeek: 4,
};

export const mockRecentAttempts: PracticeAttempt[] = [
  {
    id: "attempt-1",
    title: "A place I feel comfortable",
    date: "Today",
    patternLabel: "Clear",
    feedback: "Warm and clear. Add one sensory detail to make it vivid.",
  },
  {
    id: "attempt-2",
    title: "Keep a conversation going",
    date: "Yesterday",
    patternLabel: "Try pauses",
    feedback: "Friendly tone. Try ending with a simple follow-up question.",
  },
  {
    id: "attempt-3",
    title: "Why people like music",
    date: "Mon",
    patternLabel: "Good flow",
    feedback: "Nice explanation. Your final sentence sounded confident.",
  },
];

export const mockSpeakingPatterns: SpeakingPattern[] = [
  {
    label: "Pace",
    signal: "Steady pace",
    note: "Your rhythm is starting to feel more natural across attempts.",
  },
  {
    label: "Filler words",
    signal: "Some, improving",
    note: "Short pauses are helping you think without rushing the next sentence.",
  },
  {
    label: "Structure",
    signal: "Main point earlier",
    note: "Your answers are clearest when you start with the main idea first.",
  },
];
