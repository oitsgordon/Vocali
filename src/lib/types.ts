export type ChallengeType =
  | "random_topic"
  | "interview"
  | "star"
  | "conciseness"
  | "pressure";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type PromptCategory =
  | "Talk About Yourself"
  | "Think On The Spot"
  | "Explain An Idea"
  | "Social Situations"
  | "Interview Practice";

export type Challenge = {
  id: string;
  type: ChallengeType;
  category: PromptCategory;
  title: string;
  prompt: string;
  prepTimeSeconds: number;
  responseTimeSeconds: number;
  difficulty: Difficulty;
  tags: string[];
};

export type FeedbackSignal = {
  label: string;
  note: string;
};

export type FeedbackResult = {
  pace: FeedbackSignal;
  fillerWords: FeedbackSignal;
  repetition: FeedbackSignal;
  clarity: FeedbackSignal;
  structure: FeedbackSignal;
  nextAction: string;
};

export type FillerBreakdownItem = {
  phrase: string;
  count: number;
};

export type RepetitionBreakdownItem = {
  phrase: string;
  count: number;
  type: "adjacent_repeat" | "repeated_start";
};

export type SpeakingMetrics = {
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  repetitionCount: number;
  fillerBreakdown?: FillerBreakdownItem[];
  repetitionBreakdown?: RepetitionBreakdownItem[];
  actualDurationSeconds: number;
  targetDurationSeconds: number;
  timeUsedLabel: string;
  paceLabel: string;
  paceNote: string;
  fillerLabel: string;
  fillerNote: string;
  repetitionLabel: string;
  repetitionNote: string;
};

export type TranscriptStatus =
  | "not_started"
  | "processing"
  | "ready"
  | "failed";

export type LocalAttempt = {
  id: string;
  challengeId?: string;
  prompt: string;
  category: PromptCategory;
  completedAt: string;
  speakingDurationSeconds: number;
  actualDurationSeconds?: number;
  feedback: FeedbackResult;
  nextAction: string;
  label: string;
  hasLocalRecording?: boolean;
  recordingId?: string;
  transcript?: string;
  transcriptStatus?: TranscriptStatus;
  speakingMetrics?: SpeakingMetrics;
  isDailyChallenge?: boolean;
  dailyChallengeDate?: string;
  source?: "daily" | "practice";
};

export type UserProfile = {
  name: string;
  streakDays: number;
  weeklyGoal: number;
  completedThisWeek: number;
};

export type RecentFeedback = {
  id: string;
  title: string;
  score: number;
  summary: string;
};

export type ProgressPreview = {
  label: string;
  value: number;
  change: string;
};

export type PracticeAttempt = {
  id: string;
  title: string;
  date: string;
  patternLabel: string;
  feedback: string;
};

export type PracticeTotals = {
  attemptsCompleted: number;
  minutesSpoken: number;
  daysPractisedThisWeek: number;
};

export type SpeakingPattern = {
  label:
    | "Pace"
    | "Time used"
    | "Filler words"
    | "Repetition"
    | "Answer depth"
    | "Structure";
  priority?: number;
  signal: string;
  note: string;
};
