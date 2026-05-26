"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  defaultUserPreferences,
  getUserPreferences,
  saveUserPreferences,
  subscribeToUserPreferences,
  type UserPreferences,
} from "@/lib/userPreferences";

let cachedPreferences = defaultUserPreferences;

function arePreferencesEqual(
  firstPreferences: UserPreferences,
  secondPreferences: UserPreferences,
) {
  return (
    firstPreferences.dailyGoal === secondPreferences.dailyGoal &&
    firstPreferences.displayName === secondPreferences.displayName &&
    firstPreferences.focusArea === secondPreferences.focusArea
  );
}

function getPreferencesSnapshot() {
  const nextPreferences = getUserPreferences();

  if (!arePreferencesEqual(cachedPreferences, nextPreferences)) {
    cachedPreferences = nextPreferences;
  }

  return cachedPreferences;
}

function getServerPreferencesSnapshot() {
  return defaultUserPreferences;
}

function subscribeToHydrationStatus() {
  return () => {};
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

export function useUserPreferences() {
  const preferences = useSyncExternalStore(
    subscribeToUserPreferences,
    getPreferencesSnapshot,
    getServerPreferencesSnapshot,
  );
  const hasLoadedPreferences = useSyncExternalStore(
    subscribeToHydrationStatus,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const savePreferences = useCallback((nextPreferences: UserPreferences) => {
    return saveUserPreferences(nextPreferences);
  }, []);

  return {
    hasLoadedPreferences,
    preferences,
    savePreferences,
  };
}
