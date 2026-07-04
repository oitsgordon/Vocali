import type { LocalAttempt } from "@/lib/types";
import { syncPracticeAttempt } from "@/lib/supabaseRemote";

const attemptsStorageKey = "vocali:attempts:v1";
const attemptsChangedEvent = "vocali:attempts-changed";
const emptyAttempts: LocalAttempt[] = [];
let cachedRawAttempts: string | null = null;
let cachedAttempts: LocalAttempt[] = emptyAttempts;

function canUseStorage() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTranscriptStatus(value: unknown) {
  return (
    value === "not_started" ||
    value === "processing" ||
    value === "ready" ||
    value === "failed"
  );
}

function isSpeakingMetrics(value: unknown) {
  function isFillerBreakdown(value: unknown) {
    return (
      value === undefined ||
      (Array.isArray(value) &&
        value.every(
          (item) =>
            isRecord(item) &&
            typeof item.phrase === "string" &&
            typeof item.count === "number",
        ))
    );
  }

  function isRepetitionBreakdown(value: unknown) {
    return (
      value === undefined ||
      (Array.isArray(value) &&
        value.every(
          (item) =>
            isRecord(item) &&
            typeof item.phrase === "string" &&
            typeof item.count === "number" &&
            (item.type === "adjacent_repeat" ||
              item.type === "repeated_start"),
        ))
    );
  }

  return (
    value === undefined ||
    (isRecord(value) &&
      typeof value.wordCount === "number" &&
      typeof value.wordsPerMinute === "number" &&
      typeof value.fillerWordCount === "number" &&
      typeof value.repetitionCount === "number" &&
      isFillerBreakdown(value.fillerBreakdown) &&
      isRepetitionBreakdown(value.repetitionBreakdown) &&
      typeof value.actualDurationSeconds === "number" &&
      typeof value.targetDurationSeconds === "number" &&
      typeof value.timeUsedLabel === "string" &&
      typeof value.paceLabel === "string" &&
      typeof value.paceNote === "string" &&
      typeof value.fillerLabel === "string" &&
      typeof value.fillerNote === "string" &&
      typeof value.repetitionLabel === "string" &&
      typeof value.repetitionNote === "string")
  );
}

function isLocalAttempt(value: unknown): value is LocalAttempt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.challengeId === undefined || typeof value.challengeId === "string") &&
    typeof value.prompt === "string" &&
    typeof value.category === "string" &&
    typeof value.completedAt === "string" &&
    typeof value.speakingDurationSeconds === "number" &&
    isRecord(value.feedback) &&
    typeof value.nextAction === "string" &&
    typeof value.label === "string" &&
    (value.transcript === undefined || typeof value.transcript === "string") &&
    (value.transcriptStatus === undefined ||
      isTranscriptStatus(value.transcriptStatus)) &&
    isSpeakingMetrics(value.speakingMetrics) &&
    (value.isDailyChallenge === undefined ||
      typeof value.isDailyChallenge === "boolean") &&
    (value.dailyChallengeDate === undefined ||
      typeof value.dailyChallengeDate === "string") &&
    (value.source === undefined ||
      value.source === "daily" ||
      value.source === "practice")
  );
}

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getAttemptDaySet(attempts: LocalAttempt[]) {
  return new Set(
    attempts.map((attempt) => toDayKey(new Date(attempt.completedAt))),
  );
}

function countConsecutiveDaysFrom(
  attemptDays: Set<string>,
  startDate: Date,
) {
  let streak = 0;
  let cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  while (attemptDays.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function getAttempts(): LocalAttempt[] {
  if (!canUseStorage()) {
    return emptyAttempts;
  }

  try {
    const rawAttempts = window.localStorage.getItem(attemptsStorageKey);

    if (rawAttempts === cachedRawAttempts) {
      return cachedAttempts;
    }

    cachedRawAttempts = rawAttempts;

    if (!rawAttempts) {
      cachedAttempts = emptyAttempts;
      return cachedAttempts;
    }

    const parsedAttempts: unknown = JSON.parse(rawAttempts);

    if (!Array.isArray(parsedAttempts)) {
      cachedAttempts = emptyAttempts;
      return cachedAttempts;
    }

    cachedAttempts = parsedAttempts
      .filter(isLocalAttempt)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
    return cachedAttempts;
  } catch {
    cachedAttempts = emptyAttempts;
    return cachedAttempts;
  }
}

export function saveAttempt(attempt: LocalAttempt) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const attempts = getAttempts();
    const existingIndex = attempts.findIndex((item) => item.id === attempt.id);
    const nextAttempts =
      existingIndex >= 0
        ? attempts.map((item) => (item.id === attempt.id ? attempt : item))
        : [attempt, ...attempts];

    const rawAttempts = JSON.stringify(nextAttempts);
    cachedRawAttempts = rawAttempts;
    cachedAttempts = nextAttempts;
    window.localStorage.setItem(attemptsStorageKey, rawAttempts);
    dispatchAttemptsChanged();
    void syncPracticeAttempt(attempt);
  } catch {
    cachedRawAttempts = null;
    cachedAttempts = emptyAttempts;
  }
}

export function cacheSyncedAttempts(syncedAttempts: LocalAttempt[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const localAttemptsById = new Map(
      getAttempts().map((attempt) => [attempt.id, attempt]),
    );
    const mergedAttemptsById = new Map<string, LocalAttempt>();

    for (const syncedAttempt of syncedAttempts) {
      const localAttempt = localAttemptsById.get(syncedAttempt.id);

      mergedAttemptsById.set(syncedAttempt.id, {
        ...syncedAttempt,
        hasLocalRecording: localAttempt?.hasLocalRecording,
        recordingId: localAttempt?.recordingId,
      });
    }

    for (const localAttempt of localAttemptsById.values()) {
      if (!mergedAttemptsById.has(localAttempt.id)) {
        mergedAttemptsById.set(localAttempt.id, localAttempt);
      }
    }

    const nextAttempts = Array.from(mergedAttemptsById.values()).sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const rawAttempts = JSON.stringify(nextAttempts);
    cachedRawAttempts = rawAttempts;
    cachedAttempts = nextAttempts;
    window.localStorage.setItem(attemptsStorageKey, rawAttempts);
    dispatchAttemptsChanged();
  } catch {
    cachedRawAttempts = null;
    cachedAttempts = emptyAttempts;
  }
}

export function clearAttempts() {
  if (!canUseStorage()) {
    return;
  }

  try {
    cachedRawAttempts = null;
    cachedAttempts = emptyAttempts;
    window.localStorage.removeItem(attemptsStorageKey);
    dispatchAttemptsChanged();
  } catch {
    cachedRawAttempts = null;
    cachedAttempts = emptyAttempts;
  }
}

export function getEmptyAttemptsSnapshot() {
  return emptyAttempts;
}

export function subscribeToAttempts(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === attemptsStorageKey) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(attemptsChangedEvent, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(attemptsChangedEvent, listener);
  };
}

function dispatchAttemptsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new Event(attemptsChangedEvent));
  } catch {
    // Local progress should never break app interactivity.
  }
}

export function getLatestAttempt() {
  return getAttempts()[0] ?? null;
}

export function getTodayAttempt(attempts = getAttempts(), today = new Date()) {
  const todayKey = toDayKey(today);

  return (
    attempts.find(
      (attempt) => toDayKey(new Date(attempt.completedAt)) === todayKey,
    ) ?? null
  );
}

export function getPracticeTotals(attempts = getAttempts()) {
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() + mondayOffset);

  const daysThisWeek = new Set(
    attempts
      .filter((attempt) => new Date(attempt.completedAt) >= weekStart)
      .map((attempt) => toDayKey(new Date(attempt.completedAt))),
  );

  const spokenSeconds = attempts.reduce(
    (total, attempt) =>
      total + (attempt.actualDurationSeconds ?? attempt.speakingDurationSeconds),
    0,
  );

  return {
    attemptsCompleted: attempts.length,
    minutesSpoken: Math.max(0, Math.round(spokenSeconds / 60)),
    daysPractisedThisWeek: daysThisWeek.size,
  };
}

export function getStreakStatus(attempts = getAttempts(), today = new Date()) {
  if (attempts.length === 0) {
    return {
      count: 0,
      message: "Start with one prompt",
      status: "expired" as const,
    };
  }

  const attemptDays = getAttemptDaySet(attempts);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const yesterday = addDays(todayStart, -1);

  if (attemptDays.has(toDayKey(todayStart))) {
    return {
      count: countConsecutiveDaysFrom(attemptDays, todayStart),
      message: "Completed today",
      status: "completed_today" as const,
    };
  }

  if (attemptDays.has(toDayKey(yesterday))) {
    return {
      count: countConsecutiveDaysFrom(attemptDays, yesterday),
      message: "Continue it today",
      status: "due_today" as const,
    };
  }

  return {
    count: 0,
    message: "Start a new streak",
    status: "expired" as const,
  };
}

export function getCurrentStreak(attempts = getAttempts()) {
  return getStreakStatus(attempts).count;
}

export function getCompletedWeekdays(attempts = getAttempts()) {
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() + mondayOffset);

  return new Set(
    attempts
      .map((attempt) => new Date(attempt.completedAt))
      .filter((date) => date >= weekStart)
      .map((date) => {
        const day = date.getDay();
        return day === 0 ? 6 : day - 1;
      }),
  );
}
