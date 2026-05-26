import type {
  FillerBreakdownItem,
  RepetitionBreakdownItem,
  SpeakingMetrics,
} from "@/lib/types";

const fillerPhrases: FillerBreakdownItem[] = [
  { phrase: "um", count: 0 },
  { phrase: "uh", count: 0 },
  { phrase: "like", count: 0 },
  { phrase: "you know", count: 0 },
  { phrase: "basically", count: 0 },
  { phrase: "actually", count: 0 },
  { phrase: "kind of", count: 0 },
  { phrase: "sort of", count: 0 },
  { phrase: "I mean", count: 0 },
];

const repeatedPhraseStarts = [
  "i think",
  "i feel",
  "i guess",
  "i mean",
  "the thing is",
];

function getWords(transcript: string) {
  return (
    transcript
      .toLowerCase()
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu) ?? []
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countPhrase(text: string, phrase: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
  return text.match(pattern)?.length ?? 0;
}

function getTopItems<T extends { count: number }>(items: T[], limit: number) {
  return items
    .filter((item) => item.count > 0)
    .sort((first, second) => second.count - first.count)
    .slice(0, limit);
}

function getFillerBreakdown(transcript: string) {
  return getTopItems(
    fillerPhrases.map((item) => ({
      phrase: item.phrase,
      count: countPhrase(transcript, item.phrase),
    })),
    3,
  );
}

function getAdjacentRepeatBreakdown(words: string[]) {
  const repeatCounts = new Map<string, number>();

  words.forEach((word, index) => {
    if (index === 0) {
      return;
    }

    if (word !== words[index - 1]) {
      return;
    }

    const phrase = `${word} ${word}`;
    repeatCounts.set(phrase, (repeatCounts.get(phrase) ?? 0) + 1);
  });

  return Array.from(repeatCounts.entries()).map(
    ([phrase, count]): RepetitionBreakdownItem => ({
      phrase,
      count,
      type: "adjacent_repeat",
    }),
  );
}

function getRepeatedStartBreakdown(transcript: string) {
  return repeatedPhraseStarts.flatMap((phrase): RepetitionBreakdownItem[] => {
    const count = countPhrase(transcript, phrase);

    if (count <= 1) {
      return [];
    }

    return [
      {
        phrase,
        count,
        type: "repeated_start",
      },
    ];
  });
}

function getRepetitionBreakdown(words: string[], transcript: string) {
  return getTopItems(
    [...getAdjacentRepeatBreakdown(words), ...getRepeatedStartBreakdown(transcript)],
    2,
  );
}

function countFillers(fillerBreakdown: FillerBreakdownItem[]) {
  return fillerBreakdown.reduce((total, item) => total + item.count, 0);
}

function countRepetition(repetitionBreakdown: RepetitionBreakdownItem[]) {
  return repetitionBreakdown.reduce((total, item) => {
    if (item.type === "repeated_start") {
      return total + Math.max(1, item.count - 1);
    }

    return total + item.count;
  }, 0);
}

function getPaceLabel(wordCount: number, durationSeconds: number, wordsPerMinute: number) {
  if (durationSeconds < 10 || wordCount < 5) {
    return "Short attempt";
  }

  if (wordsPerMinute >= 165) {
    return "A little quick";
  }

  if (wordsPerMinute >= 95 && wordsPerMinute <= 165) {
    return "Steady";
  }

  return "Measured pace";
}

function getFillerLabel(fillerWordCount: number) {
  if (fillerWordCount === 0) {
    return "Few fillers";
  }

  if (fillerWordCount <= 3) {
    return "Some filler words";
  }

  return "A few fillers";
}

function getRepetitionLabel(repetitionCount: number) {
  if (repetitionCount === 0) {
    return "Low repetition";
  }

  if (repetitionCount <= 2) {
    return "Some repetition";
  }

  return "Repeated a few words";
}

export function calculateSpeakingMetrics({
  transcript,
  actualDurationSeconds,
  targetDurationSeconds,
}: {
  transcript: string;
  actualDurationSeconds?: number;
  targetDurationSeconds: number;
}): SpeakingMetrics {
  const words = getWords(transcript);
  const durationSeconds = Math.max(
    1,
    Math.round(actualDurationSeconds ?? targetDurationSeconds),
  );
  const wordCount = words.length;
  const wordsPerMinute = Math.round(wordCount / (durationSeconds / 60));
  const fillerBreakdown = getFillerBreakdown(transcript);
  const repetitionBreakdown = getRepetitionBreakdown(words, transcript);
  const fillerWordCount = countFillers(fillerBreakdown);
  const repetitionCount = countRepetition(repetitionBreakdown);
  const paceLabel = getPaceLabel(wordCount, durationSeconds, wordsPerMinute);
  const fillerLabel = getFillerLabel(fillerWordCount);
  const repetitionLabel = getRepetitionLabel(repetitionCount);

  return {
    wordCount,
    wordsPerMinute,
    fillerWordCount,
    repetitionCount,
    fillerBreakdown,
    repetitionBreakdown,
    actualDurationSeconds: durationSeconds,
    targetDurationSeconds,
    timeUsedLabel: `You used ${durationSeconds} of ${targetDurationSeconds} seconds.`,
    paceLabel,
    paceNote:
      paceLabel === "Short attempt"
        ? `You spoke ${wordCount} words. Short reps still count, and you can build from here.`
        : `You spoke ${wordCount} words at about ${wordsPerMinute} words per minute.`,
    fillerLabel,
    fillerNote:
      fillerWordCount === 0
        ? "No common filler words stood out in this transcript."
        : `The transcript includes ${fillerWordCount} common filler word${fillerWordCount === 1 ? "" : "s"}. Pauses can do the same job while you think.`,
    repetitionLabel,
    repetitionNote:
      repetitionCount === 0
        ? "No obvious repeated words or phrase starts stood out."
        : `There ${repetitionCount === 1 ? "was" : "were"} ${repetitionCount} simple repetition cue${repetitionCount === 1 ? "" : "s"} while you were thinking.`,
  };
}
