"use client";

import { clearAttempts } from "@/lib/attemptStorage";
import { clearStoredDailyChallenge } from "@/lib/dailyChallenge";
import { clearRecordings } from "@/lib/recordingStorage";
import { clearStreakCelebration } from "@/lib/streakCelebration";
import { clearUserPreferences } from "@/lib/userPreferences";

const vocaliStoragePrefix = "vocali:";

function clearMatchingStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (key?.startsWith(vocaliStoragePrefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export async function clearAllLocalVocaliData() {
  clearAttempts();
  const recordingsCleared = await clearRecordings();
  const preferencesCleared = clearUserPreferences();
  const challengeCleared = clearStoredDailyChallenge();
  const celebrationCleared = clearStreakCelebration();
  let browserStorageCleared = false;

  try {
    clearMatchingStorage(window.localStorage);
    clearMatchingStorage(window.sessionStorage);
    browserStorageCleared = true;
  } catch {
    browserStorageCleared = false;
  }

  return {
    ok:
      recordingsCleared &&
      preferencesCleared &&
      challengeCleared &&
      celebrationCleared &&
      browserStorageCleared,
    recordingsCleared,
  };
}
