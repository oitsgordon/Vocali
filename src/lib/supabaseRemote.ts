"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import type { LocalAttempt, PromptCategory, TranscriptStatus } from "@/lib/types";
import {
  dailyGoalOptions,
  defaultUserPreferences,
  focusAreaOptions,
  type UserPreferences,
} from "@/lib/userPreferences";

type RemoteProfileRow = Record<string, unknown>;
type RemoteAttemptRow = Record<string, unknown>;

let activeUserId: string | null = null;

export function setSupabaseSyncUserId(userId: string | null) {
  activeUserId = userId;
}

export async function syncProfilePreferences(
  preferences: UserPreferences,
  userId = activeUserId,
) {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    return { ok: false, error: "Sign in to sync profile preferences." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: preferences.displayName,
    focus_area: preferences.focusArea,
    daily_goal: preferences.dailyGoal,
  });

  return error
    ? { ok: false, error: error.message }
    : { ok: true, error: null };
}

export async function fetchRemoteProfile(userId = activeUserId) {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    return { profile: null, error: "Sign in to load profile preferences." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: mapRemoteProfile(data), error: null };
}

export async function syncPracticeAttempt(
  attempt: LocalAttempt,
  userId = activeUserId,
) {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    return { ok: false, error: "Sign in to sync practice attempts." };
  }

  const { error } = await supabase.from("practice_attempts").upsert(
    {
      id: attempt.id,
      user_id: userId,
      challenge_id: attempt.challengeId ?? null,
      prompt: attempt.prompt,
      category: attempt.category,
      completed_at: attempt.completedAt,
      speaking_duration_seconds: attempt.speakingDurationSeconds,
      actual_duration_seconds: attempt.actualDurationSeconds ?? null,
      feedback: attempt.feedback,
      next_action: attempt.nextAction,
      label: attempt.label,
      transcript: attempt.transcript ?? null,
      transcript_status: attempt.transcriptStatus ?? "not_started",
      speaking_metrics: attempt.speakingMetrics ?? null,
      is_daily_challenge: attempt.isDailyChallenge ?? false,
      daily_challenge_date: attempt.dailyChallengeDate ?? null,
      source: attempt.source ?? "practice",
    },
    { onConflict: "id" },
  );

  return error
    ? { ok: false, error: error.message }
    : { ok: true, error: null };
}

export async function syncPracticeAttempts(
  attempts: LocalAttempt[],
  userId = activeUserId,
) {
  for (const attempt of attempts) {
    const result = await syncPracticeAttempt(attempt, userId);

    if (!result.ok) {
      return result;
    }
  }

  return { ok: true, error: null };
}

export async function fetchRemoteAttempts(userId = activeUserId) {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    return { attempts: [] as LocalAttempt[], error: "Sign in to load attempts." };
  }

  const { data, error } = await supabase
    .from("practice_attempts")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (error) {
    return { attempts: [] as LocalAttempt[], error: error.message };
  }

  return {
    attempts: (data ?? []).map(mapRemoteAttempt).filter(isLocalAttempt),
    error: null,
  };
}

function mapRemoteProfile(row: RemoteProfileRow | null): UserPreferences | null {
  if (!row) {
    return null;
  }

  const focusArea = focusAreaOptions.includes(row.focus_area as never)
    ? row.focus_area
    : defaultUserPreferences.focusArea;
  const dailyGoal = dailyGoalOptions.includes(row.daily_goal as never)
    ? row.daily_goal
    : defaultUserPreferences.dailyGoal;
  const displayName =
    typeof row.display_name === "string" && row.display_name.trim()
      ? row.display_name.trim()
      : defaultUserPreferences.displayName;

  return {
    dailyGoal,
    displayName,
    focusArea,
  } as UserPreferences;
}

function mapRemoteAttempt(row: RemoteAttemptRow): LocalAttempt | null {
  if (
    typeof row.id !== "string" ||
    typeof row.prompt !== "string" ||
    typeof row.category !== "string" ||
    typeof row.completed_at !== "string" ||
    typeof row.speaking_duration_seconds !== "number" ||
    typeof row.next_action !== "string" ||
    typeof row.label !== "string" ||
    !isRecord(row.feedback)
  ) {
    return null;
  }

  return {
    id: row.id,
    challengeId:
      typeof row.challenge_id === "string" ? row.challenge_id : undefined,
    prompt: row.prompt,
    category: row.category as PromptCategory,
    completedAt: row.completed_at,
    speakingDurationSeconds: row.speaking_duration_seconds,
    actualDurationSeconds:
      typeof row.actual_duration_seconds === "number"
        ? row.actual_duration_seconds
        : undefined,
    feedback: row.feedback as LocalAttempt["feedback"],
    nextAction: row.next_action,
    label: row.label,
    transcript: typeof row.transcript === "string" ? row.transcript : undefined,
    transcriptStatus: isTranscriptStatus(row.transcript_status)
      ? row.transcript_status
      : undefined,
    speakingMetrics: isRecord(row.speaking_metrics)
      ? (row.speaking_metrics as LocalAttempt["speakingMetrics"])
      : undefined,
    isDailyChallenge:
      typeof row.is_daily_challenge === "boolean"
        ? row.is_daily_challenge
        : undefined,
    dailyChallengeDate:
      typeof row.daily_challenge_date === "string"
        ? row.daily_challenge_date
        : undefined,
    source: row.source === "daily" ? "daily" : "practice",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLocalAttempt(value: LocalAttempt | null): value is LocalAttempt {
  return value !== null;
}

function isTranscriptStatus(value: unknown): value is TranscriptStatus {
  return (
    value === "not_started" ||
    value === "processing" ||
    value === "ready" ||
    value === "failed"
  );
}
