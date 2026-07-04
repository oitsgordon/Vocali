import { syncProfilePreferences } from "@/lib/supabaseRemote";

const userPreferencesStorageKey = "vocali:user-preferences:v1";
const userPreferencesChangedEvent = "vocali:user-preferences-changed";

export const focusAreaOptions = [
  "Speaking more naturally",
  "Thinking on the spot",
  "Explaining ideas clearly",
  "Social situations",
  "Interview practice",
] as const;

export const dailyGoalOptions = [
  "1 short prompt",
  "3 minutes",
  "5 minutes",
] as const;

export type FocusArea = (typeof focusAreaOptions)[number];
export type DailyGoal = (typeof dailyGoalOptions)[number];

export type UserPreferences = {
  dailyGoal: DailyGoal;
  displayName: string;
  focusArea: FocusArea;
};

export const defaultUserPreferences: UserPreferences = {
  dailyGoal: "1 short prompt",
  displayName: "there",
  focusArea: "Speaking more naturally",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFocusArea(value: unknown): value is FocusArea {
  return focusAreaOptions.includes(value as FocusArea);
}

function isDailyGoal(value: unknown): value is DailyGoal {
  return dailyGoalOptions.includes(value as DailyGoal);
}

function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") {
    return defaultUserPreferences.displayName;
  }

  const trimmedValue = value.trim();
  return trimmedValue || defaultUserPreferences.displayName;
}

function dispatchUserPreferencesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new Event(userPreferencesChangedEvent));
  } catch {
    // Preferences should never break app interactivity.
  }
}

export function getUserPreferences(): UserPreferences {
  if (!canUseStorage()) {
    return defaultUserPreferences;
  }

  try {
    const rawPreferences = window.localStorage.getItem(userPreferencesStorageKey);

    if (!rawPreferences) {
      return defaultUserPreferences;
    }

    const parsedPreferences: unknown = JSON.parse(rawPreferences);

    if (!isRecord(parsedPreferences)) {
      return defaultUserPreferences;
    }

    return {
      dailyGoal: isDailyGoal(parsedPreferences.dailyGoal)
        ? parsedPreferences.dailyGoal
        : defaultUserPreferences.dailyGoal,
      displayName: normalizeDisplayName(parsedPreferences.displayName),
      focusArea: isFocusArea(parsedPreferences.focusArea)
        ? parsedPreferences.focusArea
        : defaultUserPreferences.focusArea,
    };
  } catch {
    return defaultUserPreferences;
  }
}

export function saveUserPreferences(preferences: UserPreferences) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      userPreferencesStorageKey,
      JSON.stringify({
        dailyGoal: preferences.dailyGoal,
        displayName: normalizeDisplayName(preferences.displayName),
        focusArea: preferences.focusArea,
      }),
    );
    dispatchUserPreferencesChanged();
    void syncProfilePreferences(preferences);
    return true;
  } catch {
    return false;
  }
}

export function clearUserPreferences() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(userPreferencesStorageKey);
    dispatchUserPreferencesChanged();
    return true;
  } catch {
    return false;
  }
}

export function subscribeToUserPreferences(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === userPreferencesStorageKey) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(userPreferencesChangedEvent, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(userPreferencesChangedEvent, listener);
  };
}
