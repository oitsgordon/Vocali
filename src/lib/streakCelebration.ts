const streakCelebrationStorageKey = "vocali:streak-celebration:v1";

export type PendingStreakCelebration = {
  attemptId: string;
  dateKey: string;
};

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

function isPendingStreakCelebration(
  value: unknown,
): value is PendingStreakCelebration {
  return (
    typeof value === "object" &&
    value !== null &&
    "attemptId" in value &&
    "dateKey" in value &&
    typeof value.attemptId === "string" &&
    typeof value.dateKey === "string"
  );
}

export function queueStreakCelebration(
  celebration: PendingStreakCelebration,
) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      streakCelebrationStorageKey,
      JSON.stringify(celebration),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeStreakCelebration() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const rawCelebration = window.localStorage.getItem(
      streakCelebrationStorageKey,
    );
    window.localStorage.removeItem(streakCelebrationStorageKey);

    if (!rawCelebration) {
      return null;
    }

    const parsedCelebration: unknown = JSON.parse(rawCelebration);

    return isPendingStreakCelebration(parsedCelebration)
      ? parsedCelebration
      : null;
  } catch {
    return null;
  }
}

export function clearStreakCelebration() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(streakCelebrationStorageKey);
    return true;
  } catch {
    return false;
  }
}
