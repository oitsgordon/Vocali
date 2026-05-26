import type { LocalAttempt } from "@/lib/types";

export function formatAttemptDate(completedAt: string, options?: Intl.DateTimeFormatOptions) {
  const completedDate = new Date(completedAt);

  if (Number.isNaN(completedDate.getTime())) {
    return "Recently";
  }

  return completedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...options,
  });
}

export function formatRelativeAttemptDate(completedAt: string) {
  const completedDate = new Date(completedAt);

  if (Number.isNaN(completedDate.getTime())) {
    return "Recently";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (completedDate.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (completedDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return formatAttemptDate(completedAt);
}

export function formatAttemptDuration(attempt: LocalAttempt) {
  const duration =
    attempt.actualDurationSeconds ?? attempt.speakingDurationSeconds;

  if (!duration || duration < 1) {
    return `${attempt.speakingDurationSeconds} sec target`;
  }

  return `${duration} sec spoken`;
}
