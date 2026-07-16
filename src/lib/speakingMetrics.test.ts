import { describe, expect, it } from "vitest";
import { getFeedbackInsights } from "./feedbackInsights";
import { calculateSpeakingMetrics } from "./speakingMetrics";

describe("calculateSpeakingMetrics", () => {
  it("calculates pace and clean-speech signals", () => {
    const metrics = calculateSpeakingMetrics({
      transcript:
        "I enjoy speaking because it helps me share ideas with other people every day.",
      actualDurationSeconds: 30,
      targetDurationSeconds: 30,
    });

    expect(metrics).toMatchObject({
      actualDurationSeconds: 30,
      fillerWordCount: 0,
      paceLabel: "Measured pace",
      repetitionCount: 0,
      targetDurationSeconds: 30,
      wordCount: 14,
      wordsPerMinute: 28,
    });
  });

  it("counts common fillers and simple repetitions", () => {
    const metrics = calculateSpeakingMetrics({
      transcript: "Um um, I think I think this is like actually useful.",
      actualDurationSeconds: 20,
      targetDurationSeconds: 30,
    });

    expect(metrics.fillerWordCount).toBe(4);
    expect(metrics.repetitionCount).toBe(2);
    expect(metrics.fillerBreakdown).toEqual(
      expect.arrayContaining([
        { phrase: "um", count: 2 },
        { phrase: "like", count: 1 },
        { phrase: "actually", count: 1 },
      ]),
    );
  });

  it("normalizes missing or invalid durations to at least one second", () => {
    const metrics = calculateSpeakingMetrics({
      transcript: "Hello",
      actualDurationSeconds: 0,
      targetDurationSeconds: 30,
    });

    expect(metrics.actualDurationSeconds).toBe(1);
    expect(metrics.wordsPerMinute).toBe(60);
  });
});

describe("getFeedbackInsights", () => {
  it("marks a fuller answer at a steady pace as having few fillers", () => {
    const transcript = Array.from({ length: 60 }, (_, index) => `word${index}`).join(
      " ",
    );
    const metrics = calculateSpeakingMetrics({
      transcript,
      actualDurationSeconds: 30,
      targetDurationSeconds: 30,
    });

    const insights = getFeedbackInsights(metrics);

    expect(insights.attemptLabel).toBe("Few fillers");
    expect(insights.feedback.pace.label).toBe("Steady pace");
    expect(insights.feedback.fillerWords.label).toBe("Few fillers");
  });

  it("prioritizes adding detail for a very short response", () => {
    const metrics = calculateSpeakingMetrics({
      transcript: "A short answer",
      actualDurationSeconds: 4,
      targetDurationSeconds: 30,
    });

    const insights = getFeedbackInsights(metrics);

    expect(insights.attemptLabel).toBe("Short attempt");
    expect(insights.nextAction).toBe("Add one reason or example before finishing.");
  });
});
