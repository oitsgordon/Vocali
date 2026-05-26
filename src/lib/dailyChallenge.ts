import {
  dailyChallenges,
  getChallengeById,
  mockChallenges,
} from "@/data/mockChallenges";
import type { Challenge, LocalAttempt } from "@/lib/types";

const dailyChallengeStorageKey = "vocali:daily-challenge:v1";

type StoredDailyChallenge = {
  dateKey: string;
  challengeId: string;
};

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isStoredDailyChallenge(value: unknown): value is StoredDailyChallenge {
  return (
    typeof value === "object" &&
    value !== null &&
    "dateKey" in value &&
    "challengeId" in value &&
    typeof value.dateKey === "string" &&
    typeof value.challengeId === "string"
  );
}

function hashDateKey(dateKey: string) {
  return Array.from(dateKey).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

function getDailyChallengePool() {
  return dailyChallenges.length > 0 ? dailyChallenges : mockChallenges;
}

export function getTodayKey() {
  return toLocalDateKey();
}

export function getFallbackDailyChallenge(dateKey = getTodayKey()): Challenge {
  const pool = getDailyChallengePool();
  const index = hashDateKey(dateKey) % pool.length;

  return pool[index] ?? mockChallenges[0];
}

export function getDailyChallenge(): Challenge {
  const dateKey = getTodayKey();
  const fallbackChallenge = getFallbackDailyChallenge(dateKey);

  if (typeof window === "undefined") {
    return fallbackChallenge;
  }

  try {
    const rawDailyChallenge = window.localStorage.getItem(
      dailyChallengeStorageKey,
    );

    if (rawDailyChallenge) {
      const parsedChallenge: unknown = JSON.parse(rawDailyChallenge);

      if (isStoredDailyChallenge(parsedChallenge)) {
        const storedChallenge = getChallengeById(parsedChallenge.challengeId);

        if (
          parsedChallenge.dateKey === dateKey &&
          storedChallenge.id === parsedChallenge.challengeId
        ) {
          return storedChallenge;
        }
      }
    }

    window.localStorage.setItem(
      dailyChallengeStorageKey,
      JSON.stringify({
        dateKey,
        challengeId: fallbackChallenge.id,
      } satisfies StoredDailyChallenge),
    );
  } catch {
    return fallbackChallenge;
  }

  return fallbackChallenge;
}

export function getDailyChallengeSessionHref(challenge = getDailyChallenge()) {
  const params = new URLSearchParams({
    challenge: challenge.id,
    source: "home",
  });

  return `/practice/session?${params.toString()}`;
}

export function getTodayDailyAttempt(attempts: LocalAttempt[]) {
  const todayKey = getTodayKey();

  return (
    attempts.find(
      (attempt) =>
        attempt.isDailyChallenge && attempt.dailyChallengeDate === todayKey,
    ) ?? null
  );
}

export function clearStoredDailyChallenge() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(dailyChallengeStorageKey);
    return true;
  } catch {
    return false;
  }
}
