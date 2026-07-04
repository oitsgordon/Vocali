"use client";

import {
  cacheSyncedAttempts,
  getAttempts,
} from "@/lib/attemptStorage";
import {
  fetchRemoteAttempts,
  fetchRemoteProfile,
  syncPracticeAttempts,
  syncProfilePreferences,
} from "@/lib/supabaseRemote";
import {
  defaultUserPreferences,
  getUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from "@/lib/userPreferences";

type SyncResult = {
  message: string | null;
  ok: boolean;
};

const migrationKeyPrefix = "vocali:supabase-migration:v1:";

export async function syncSignedInUserData(userId: string): Promise<SyncResult> {
  const localAttempts = getAttempts();
  const localPreferences = getUserPreferences();
  const migrationKey = `${migrationKeyPrefix}${userId}`;
  const hasCompletedMigration = getMigrationComplete(migrationKey);
  const hasLocalPreferences = !arePreferencesEqual(
    localPreferences,
    defaultUserPreferences,
  );

  try {
    const remoteProfileResult = await fetchRemoteProfile(userId);

    if (remoteProfileResult.error) {
      return {
        ok: false,
        message:
          "Your account is connected, but profile sync could not finish. You can retry by reopening the app.",
      };
    }

    if (!remoteProfileResult.profile || hasLocalPreferences) {
      const profileSyncResult = await syncProfilePreferences(
        localPreferences,
        userId,
      );

      if (!profileSyncResult.ok) {
        return {
          ok: false,
          message:
            "Your account is connected, but profile preferences could not sync yet.",
        };
      }
    } else {
      saveUserPreferences(remoteProfileResult.profile);
    }

    if (!hasCompletedMigration && localAttempts.length > 0) {
      const attemptsSyncResult = await syncPracticeAttempts(
        localAttempts,
        userId,
      );

      if (!attemptsSyncResult.ok) {
        return {
          ok: false,
          message:
            "Your local progress is still on this device. We could not sync it yet, but you can retry by signing in again.",
        };
      }
    }

    const remoteAttemptsResult = await fetchRemoteAttempts(userId);

    if (remoteAttemptsResult.error) {
      return {
        ok: false,
        message:
          "Your account is connected, but synced progress could not load yet.",
      };
    }

    cacheSyncedAttempts(remoteAttemptsResult.attempts);
    setMigrationComplete(migrationKey);

    return { ok: true, message: null };
  } catch {
    return {
      ok: false,
      message:
        "Your account is connected, but progress sync could not finish. Please retry in a moment.",
    };
  }
}

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

function getMigrationComplete(migrationKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(migrationKey) === "true";
  } catch {
    return false;
  }
}

function setMigrationComplete(migrationKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(migrationKey, "true");
  } catch {
    // Migration status is helpful, but sync should keep working without it.
  }
}
