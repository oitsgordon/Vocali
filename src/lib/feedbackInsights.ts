import type { FeedbackResult, FeedbackSignal, SpeakingMetrics } from "@/lib/types";

export type MeasuredFeedbackRow = {
  signal: FeedbackSignal;
  title: "Filler words" | "Repetition" | "Pace" | "Answer depth";
  type: "filler" | "repetition" | "pace" | "answerDepth";
};

export type FeedbackInsights = {
  attemptLabel: string;
  feedback: FeedbackResult;
  feedbackRows: MeasuredFeedbackRow[];
  nextAction: string;
  timeUsedContext: string;
};

function getDurationMinutes(metrics: SpeakingMetrics) {
  return Math.max(metrics.actualDurationSeconds / 60, 1 / 60);
}

function getFillerRate(metrics: SpeakingMetrics) {
  return metrics.fillerWordCount / getDurationMinutes(metrics);
}

function getTimeRatio(metrics: SpeakingMetrics) {
  if (metrics.targetDurationSeconds <= 0) {
    return 0;
  }

  return metrics.actualDurationSeconds / metrics.targetDurationSeconds;
}

function getAnswerDepthSignal(metrics: SpeakingMetrics): FeedbackSignal {
  const durationScale = Math.max(metrics.targetDurationSeconds / 60, 0.5);
  const veryBriefLimit = 25 * durationScale;
  const simpleLimit = 60 * durationScale;
  const developedLimit = 130 * durationScale;

  if (metrics.wordCount < veryBriefLimit) {
    return {
      label: "Very brief",
      note: `You spoke ${metrics.wordCount} words. Add one reason or example before finishing.`,
    };
  }

  if (metrics.wordCount < simpleLimit) {
    return {
      label: "Simple answer",
      note: `You spoke ${metrics.wordCount} words. One extra detail can make the answer feel fuller.`,
    };
  }

  if (metrics.wordCount < developedLimit) {
    return {
      label: "Developed answer",
      note: `You spoke ${metrics.wordCount} words, with room for a point and a detail.`,
    };
  }

  return {
    label: "Detailed answer",
    note: `You spoke ${metrics.wordCount} words. Keep the opening simple so the detail stays easy to follow.`,
  };
}

function getPaceSignal(metrics: SpeakingMetrics): FeedbackSignal {
  if (metrics.actualDurationSeconds < 10 || metrics.wordCount < 5) {
    return {
      label: "Short attempt",
      note: "This attempt was short, so pace will become clearer after a fuller answer.",
    };
  }

  if (metrics.wordsPerMinute < 90) {
    return {
      label: "Measured pace",
      note: `You were around ${metrics.wordsPerMinute} words/min. Add one extra detail when you feel ready.`,
    };
  }

  if (metrics.wordsPerMinute <= 160) {
    return {
      label: "Steady pace",
      note: `You were around ${metrics.wordsPerMinute} words/min, which should feel easy to follow.`,
    };
  }

  if (metrics.wordsPerMinute <= 190) {
    return {
      label: "A little quick",
      note: `You were around ${metrics.wordsPerMinute} words/min. Try pausing after your first sentence.`,
    };
  }

  return {
    label: "Very quick",
    note: `You were around ${metrics.wordsPerMinute} words/min. Slow the opening sentence before adding details.`,
  };
}

function getFillerSignal(metrics: SpeakingMetrics): FeedbackSignal {
  const fillersPerMinute = getFillerRate(metrics);

  if (metrics.fillerWordCount === 0) {
    return {
      label: "Few fillers",
      note: "No common filler words stood out in this transcript.",
    };
  }

  if (fillersPerMinute <= 3) {
    return {
      label: "Some fillers",
      note: `${metrics.fillerWordCount} filler word${metrics.fillerWordCount === 1 ? "" : "s"} appeared. A short pause can do the same job while you think.`,
    };
  }

  if (fillersPerMinute <= 7) {
    return {
      label: "Noticeable fillers",
      note: "Filler words appeared while you were thinking. Try replacing one with a short pause.",
    };
  }

  return {
    label: "Frequent fillers",
    note: "Filler words showed up often. Try pausing for one beat before continuing.",
  };
}

function getRepetitionSignal(metrics: SpeakingMetrics): FeedbackSignal {
  if (metrics.repetitionCount === 0) {
    return {
      label: "Low repetition",
      note: "No obvious repeated words or phrase starts stood out.",
    };
  }

  if (metrics.repetitionCount <= 2) {
    return {
      label: "Some repetition",
      note: "A few restarts appeared. Try finishing one sentence before reshaping it.",
    };
  }

  return {
    label: "Repeated starts",
    note: "Several restarts appeared while you were thinking. Slow down and complete one sentence at a time.",
  };
}

function getNextAction(metrics: SpeakingMetrics) {
  const fillersPerMinute = getFillerRate(metrics);
  const isVeryShort =
    metrics.actualDurationSeconds < 10 || metrics.wordCount < 5;
  const answerDepth = getAnswerDepthSignal(metrics);

  if (isVeryShort) {
    return "Add one reason or example before finishing.";
  }

  if (fillersPerMinute > 3) {
    return "Try replacing one filler word with a short pause.";
  }

  if (metrics.repetitionCount >= 3) {
    return "Try finishing one sentence before restarting the thought.";
  }

  if (metrics.wordsPerMinute > 160) {
    return "Try pausing after your first sentence.";
  }

  if (answerDepth.label === "Very brief") {
    return "Add one reason or example before finishing.";
  }

  if (metrics.wordsPerMinute < 90 && answerDepth.label === "Simple answer") {
    return "Add one extra detail when you feel ready.";
  }

  return "Keep your next answer simple: one point, then one example.";
}

function getAttemptLabel(metrics: SpeakingMetrics) {
  const fillersPerMinute = getFillerRate(metrics);
  const answerDepth = getAnswerDepthSignal(metrics);

  if (metrics.actualDurationSeconds < 10 || metrics.wordCount < 5) {
    return "Short attempt";
  }

  if (fillersPerMinute > 7) {
    return "Frequent fillers";
  }

  if (fillersPerMinute > 3) {
    return "Noticeable fillers";
  }

  if (metrics.repetitionCount >= 3) {
    return "Repeated starts";
  }

  if (metrics.repetitionCount > 0) {
    return "Some repetition";
  }

  if (metrics.wordsPerMinute > 190) {
    return "Very quick";
  }

  if (metrics.wordsPerMinute > 160) {
    return "A little quick";
  }

  if (answerDepth.label === "Very brief") {
    return answerDepth.label;
  }

  if (metrics.fillerWordCount === 0) {
    return "Few fillers";
  }

  if (metrics.repetitionCount === 0) {
    return "Low repetition";
  }

  if (metrics.wordsPerMinute >= 90 && metrics.wordsPerMinute <= 160) {
    return "Steady pace";
  }

  return answerDepth.label;
}

function getTimeUsedContext(metrics: SpeakingMetrics) {
  const timeRatio = getTimeRatio(metrics);
  const baseCopy = `You used ${metrics.actualDurationSeconds} of ${metrics.targetDurationSeconds} seconds.`;

  if (timeRatio < 0.35) {
    return `${baseCopy} This was a short response.`;
  }

  if (timeRatio > 1.05) {
    return `${baseCopy} Try landing one final sentence sooner.`;
  }

  return baseCopy;
}

export function getFeedbackInsights(metrics: SpeakingMetrics): FeedbackInsights {
  const pace = getPaceSignal(metrics);
  const fillerWords = getFillerSignal(metrics);
  const repetition = getRepetitionSignal(metrics);
  const answerDepth = getAnswerDepthSignal(metrics);
  const nextAction = getNextAction(metrics);

  return {
    attemptLabel: getAttemptLabel(metrics),
    feedback: {
      pace,
      fillerWords,
      repetition,
      clarity: {
        label: "Not measured",
        note: "Vocali has not measured semantic clarity for this attempt yet.",
      },
      structure: {
        label: "Not measured",
        note: "Vocali has not measured answer structure for this attempt yet.",
      },
      nextAction,
    },
    feedbackRows: [
      { title: "Filler words", type: "filler", signal: fillerWords },
      { title: "Repetition", type: "repetition", signal: repetition },
      { title: "Pace", type: "pace", signal: pace },
      { title: "Answer depth", type: "answerDepth", signal: answerDepth },
    ],
    nextAction,
    timeUsedContext: getTimeUsedContext(metrics),
  };
}

export function getLimitedFeedbackRows(feedback?: FeedbackResult) {
  const rows = [
    {
      title: "Filler words" as const,
      type: "filler" as const,
      signal: feedback?.fillerWords,
    },
    {
      title: "Repetition" as const,
      type: "repetition" as const,
      signal: feedback?.repetition,
    },
    {
      title: "Pace" as const,
      type: "pace" as const,
      signal: feedback?.pace,
    },
  ];

  return rows.flatMap((row): MeasuredFeedbackRow[] =>
    row.signal
      ? [
          {
            title: row.title,
            type: row.type,
            signal: row.signal,
          },
        ]
      : [],
  );
}
