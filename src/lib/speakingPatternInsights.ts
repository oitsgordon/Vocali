import { calculateSpeakingMetrics } from "@/lib/speakingMetrics";
import type { LocalAttempt, SpeakingMetrics, SpeakingPattern } from "@/lib/types";

type MeasuredAttempt = {
  actualDurationSeconds: number;
  metrics: SpeakingMetrics;
  targetDurationSeconds: number;
};

function getMeasuredAttempt(attempt: LocalAttempt): MeasuredAttempt | null {
  if (attempt.speakingMetrics) {
    return {
      actualDurationSeconds:
        attempt.actualDurationSeconds ??
        attempt.speakingMetrics.actualDurationSeconds,
      metrics: attempt.speakingMetrics,
      targetDurationSeconds:
        attempt.speakingMetrics.targetDurationSeconds ??
        attempt.speakingDurationSeconds,
    };
  }

  if (!attempt.transcript) {
    return null;
  }

  const targetDurationSeconds = attempt.speakingDurationSeconds;
  const metrics = calculateSpeakingMetrics({
    transcript: attempt.transcript,
    actualDurationSeconds: attempt.actualDurationSeconds,
    targetDurationSeconds,
  });

  return {
    actualDurationSeconds: metrics.actualDurationSeconds,
    metrics,
    targetDurationSeconds,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function rounded(value: number) {
  return Math.round(value);
}

function getPaceInsight(measuredAttempts: MeasuredAttempt[]): SpeakingPattern {
  const totalWords = measuredAttempts.reduce(
    (total, attempt) => total + attempt.metrics.wordCount,
    0,
  );
  const totalSeconds = measuredAttempts.reduce(
    (total, attempt) => total + attempt.actualDurationSeconds,
    0,
  );
  const averageWords = average(
    measuredAttempts.map((attempt) => attempt.metrics.wordCount),
  );
  const averageSeconds = average(
    measuredAttempts.map((attempt) => attempt.actualDurationSeconds),
  );
  const wordsPerMinute =
    totalSeconds > 0 ? rounded(totalWords / (totalSeconds / 60)) : 0;

  if (averageSeconds < 10 || averageWords < 5) {
    return {
      label: "Pace",
      priority: 5,
      signal: "Short attempt",
      note: "Your recent attempts are very short, so pace will become clearer after one fuller answer.",
    };
  }

  if (wordsPerMinute < 90) {
    return {
      label: "Pace",
      priority: 6,
      signal: "Measured pace",
      note: `You are speaking at about ${wordsPerMinute} words/min. Try adding one extra detail when you feel ready.`,
    };
  }

  if (wordsPerMinute <= 160) {
    return {
      label: "Pace",
      priority: 7,
      signal: "Steady pace",
      note: `Your pace is landing around ${wordsPerMinute} words/min, which should feel easy to follow.`,
    };
  }

  if (wordsPerMinute <= 190) {
    return {
      label: "Pace",
      priority: 4,
      signal: "A little quick",
      note: `You are around ${wordsPerMinute} words/min. A short pause after your first sentence can help ideas land.`,
    };
  }

  return {
    label: "Pace",
    priority: 4,
    signal: "Very quick",
    note: `You are around ${wordsPerMinute} words/min. Try slowing the opening sentence and breathing before examples.`,
  };
}

function getTimeInsight(measuredAttempts: MeasuredAttempt[]): SpeakingPattern {
  const averageActual = average(
    measuredAttempts.map((attempt) => attempt.actualDurationSeconds),
  );
  const averageTarget = average(
    measuredAttempts.map((attempt) => attempt.targetDurationSeconds),
  );
  const timeRatio = averageTarget > 0 ? averageActual / averageTarget : 0;
  const timeCopy = `You usually use around ${rounded(averageActual)} of ${rounded(
    averageTarget,
  )} seconds.`;

  if (timeRatio < 0.35) {
    return {
      label: "Time used",
      priority: 4,
      signal: "Short response",
      note: `${timeCopy} Try adding one reason or example before stopping.`,
    };
  }

  if (timeRatio < 0.75) {
    return {
      label: "Time used",
      priority: 10,
      signal: "Room to expand",
      note: `${timeCopy} One extra detail would give your answer more shape.`,
    };
  }

  if (timeRatio <= 1.05) {
    return {
      label: "Time used",
      priority: 10,
      signal: "Good use of time",
      note: `${timeCopy} You are using the practice window well.`,
    };
  }

  return {
    label: "Time used",
    priority: 3,
    signal: "Went over time",
    note: `${timeCopy} Try ending with one clear final sentence.`,
  };
}

function getFillerInsight(measuredAttempts: MeasuredAttempt[]): SpeakingPattern {
  const totalFillers = measuredAttempts.reduce(
    (total, attempt) => total + attempt.metrics.fillerWordCount,
    0,
  );
  const totalMinutes =
    measuredAttempts.reduce(
      (total, attempt) => total + attempt.actualDurationSeconds,
      0,
    ) / 60;
  const fillersPerMinute =
    totalMinutes > 0 ? totalFillers / totalMinutes : totalFillers;
  const averageFillers = average(
    measuredAttempts.map((attempt) => attempt.metrics.fillerWordCount),
  );

  if (totalFillers === 0) {
    return {
      label: "Filler words",
      priority: 5,
      signal: "Few fillers",
      note: "Few common filler words are showing up. Keep using short pauses while you think.",
    };
  }

  if (fillersPerMinute <= 3) {
    return {
      label: "Filler words",
      priority: 5,
      signal: "Some fillers",
      note: `About ${rounded(averageFillers)} filler word${rounded(averageFillers) === 1 ? "" : "s"} per attempt. Try replacing one with a pause.`,
    };
  }

  if (fillersPerMinute <= 7) {
    return {
      label: "Filler words",
      priority: 2,
      signal: "Noticeable fillers",
      note: "Filler words are appearing while you think. A quiet pause can make the answer sound calmer.",
    };
  }

  return {
    label: "Filler words",
    priority: 2,
    signal: "Frequent fillers",
    note: "Filler words are showing up often. Try pausing for one beat before continuing.",
  };
}

function getRepetitionInsight(
  measuredAttempts: MeasuredAttempt[],
): SpeakingPattern {
  const averageRepetition = average(
    measuredAttempts.map((attempt) => attempt.metrics.repetitionCount),
  );

  if (averageRepetition === 0) {
    return {
      label: "Repetition",
      priority: 6,
      signal: "Low repetition",
      note: "You are mostly moving forward without restarting the same words.",
    };
  }

  if (averageRepetition < 3) {
    return {
      label: "Repetition",
      priority: 3,
      signal: "Some repetition",
      note: "A few restarts are showing up. Try finishing one sentence before reshaping it.",
    };
  }

  return {
    label: "Repetition",
    priority: 3,
    signal: "Repeated starts",
    note: "You sometimes restart phrases while thinking. Slow down and complete one sentence at a time.",
  };
}

function getAnswerDepthInsight(
  measuredAttempts: MeasuredAttempt[],
): SpeakingPattern {
  const averageWords = average(
    measuredAttempts.map((attempt) => attempt.metrics.wordCount),
  );
  const averageTarget = average(
    measuredAttempts.map((attempt) => attempt.targetDurationSeconds),
  );
  const durationScale = averageTarget > 0 ? averageTarget / 60 : 1;
  const veryBriefLimit = 25 * durationScale;
  const simpleLimit = 60 * durationScale;
  const developedLimit = 130 * durationScale;

  if (averageWords < veryBriefLimit) {
    return {
      label: "Answer depth",
      priority: 1,
      signal: "Very brief",
      note: `Your answers average about ${rounded(averageWords)} words. Add one reason or example before finishing.`,
    };
  }

  if (averageWords < simpleLimit) {
    return {
      label: "Answer depth",
      priority: 4,
      signal: "Simple answer",
      note: `Your answers average about ${rounded(averageWords)} words. One extra detail can make them feel fuller.`,
    };
  }

  if (averageWords < developedLimit) {
    return {
      label: "Answer depth",
      priority: 8,
      signal: "Developed answer",
      note: `Your answers average about ${rounded(averageWords)} words, with enough room for a main point and detail.`,
    };
  }

  return {
    label: "Answer depth",
    priority: 8,
    signal: "Detailed answer",
    note: `Your answers average about ${rounded(averageWords)} words. Keep the opening sentence clear so details stay easy to follow.`,
  };
}

export function getSpeakingPatternInsights(attempts: LocalAttempt[]) {
  const measuredAttempts = attempts
    .map(getMeasuredAttempt)
    .filter((attempt): attempt is MeasuredAttempt => attempt !== null);

  if (measuredAttempts.length === 0) {
    return {
      insights: [],
      usableAttemptCount: 0,
    };
  }

  const insights = [
    getPaceInsight(measuredAttempts),
    getTimeInsight(measuredAttempts),
    getFillerInsight(measuredAttempts),
    getRepetitionInsight(measuredAttempts),
    getAnswerDepthInsight(measuredAttempts),
  ]
    .sort(
      (first, second) => (first.priority ?? 99) - (second.priority ?? 99),
    )
    .slice(0, 4);

  return {
    insights,
    usableAttemptCount: measuredAttempts.length,
  };
}
