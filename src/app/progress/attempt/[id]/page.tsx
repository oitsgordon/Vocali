"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, Mic, Play } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { ExpandableTranscript } from "@/components/shared/ExpandableTranscript";
import { formatAttemptDate, formatAttemptDuration } from "@/lib/attemptFormat";
import {
  getFeedbackInsights,
  getLimitedFeedbackRows,
} from "@/lib/feedbackInsights";
import { getRecording } from "@/lib/recordingStorage";
import {
  getFillerBreakdownText,
  getRepetitionBreakdownText,
} from "@/lib/speakingBreakdownText";
import { calculateSpeakingMetrics } from "@/lib/speakingMetrics";
import type { FeedbackSignal, LocalAttempt, SpeakingMetrics } from "@/lib/types";
import { useLocalAttempts } from "@/lib/useLocalAttempts";

export default function AttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const attemptId = typeof params.id === "string" ? decodeURIComponent(params.id) : "";
  const { attempts, hasLoadedAttempts } = useLocalAttempts();
  const attempt = useMemo(
    () => attempts.find((item) => item.id === attemptId) ?? null,
    [attemptId, attempts],
  );

  if (hasLoadedAttempts && !attempt) {
    return (
      <AuthGate>
        <MissingAttemptState />
      </AuthGate>
    );
  }

  if (!attempt) {
    return (
      <AuthGate>
        <ScreenFrame>
          <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-5 pb-7 pt-7 sm:min-h-[860px]">
            <AttemptHeader />
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base font-black text-vocali-muted">
                Loading attempt...
              </p>
            </div>
          </section>
        </ScreenFrame>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <ScreenFrame>
        <section className="vocali-safe-top vocali-safe-bottom min-h-dvh px-5 pb-7 pt-7 sm:min-h-[860px]">
        <AttemptHeader />

        <div className="mt-7 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-vocali-teal/12 px-3 py-1.5 text-xs font-black text-vocali-teal">
              {attempt.category}
            </span>
            <span className="rounded-full bg-vocali-orange/12 px-3 py-1.5 text-xs font-black text-vocali-orange">
              {attempt.label}
            </span>
          </div>

          <h1 className="mt-4 text-[1.95rem] font-black leading-[1.08] tracking-[-0.04em] text-vocali-teal-deep">
            {attempt.prompt}
          </h1>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SummaryMeta
              icon={CalendarDays}
              label="Completed"
              value={formatAttemptDate(attempt.completedAt, { year: "numeric" })}
            />
            <SummaryMeta
              icon={Clock3}
              label="Duration"
              value={formatAttemptDuration(attempt)}
            />
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <TryNextCard nextAction={attempt.nextAction} />
          <TranscriptSection attempt={attempt} />
          <RecordingReplay attempt={attempt} />
          <FeedbackSection attempt={attempt} />
        </div>
        </section>
      </ScreenFrame>
    </AuthGate>
  );
}

function AttemptHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/progress"
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-vocali-teal-deep shadow-[0_10px_24px_rgb(7_50_71/0.08)]"
        aria-label="Back to progress"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
      </Link>
      <VocaliLogo size="xs" variant="mark" />
      <span className="rounded-full bg-vocali-teal/12 px-3 py-2 text-xs font-black text-vocali-teal">
        Attempt
      </span>
    </header>
  );
}

function MissingAttemptState() {
  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-5 pb-7 pt-7 sm:min-h-[860px]">
        <AttemptHeader />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-vocali-teal/12 text-vocali-teal">
            <Mic className="h-10 w-10" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-[2.1rem] font-black leading-[1.08] tracking-[-0.04em] text-vocali-teal-deep">
            Attempt not found.
          </h1>
          <p className="mt-3 max-w-xs text-base font-bold leading-6 text-vocali-muted">
            This attempt may have been cleared from this browser.
          </p>
        </div>
        <Link
          href="/progress"
          className="flex h-16 w-full items-center justify-center rounded-[1.2rem] bg-vocali-orange text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)]"
        >
          Back to progress
        </Link>
      </section>
    </ScreenFrame>
  );
}

function SummaryMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] bg-vocali-cream/75 p-3">
      <Icon className="h-5 w-5 text-vocali-teal" strokeWidth={3} />
      <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.1em] text-vocali-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-black leading-5 text-vocali-teal-deep">
        {value}
      </p>
    </div>
  );
}

function TryNextCard({ nextAction }: { nextAction?: string }) {
  return (
    <section className="rounded-[1.5rem] bg-vocali-teal-deep p-5 text-white shadow-[0_20px_45px_rgb(7_50_71/0.16)]">
      <p className="text-sm font-black text-[#8be4dd]">Try next</p>
      <p className="mt-2 text-xl font-black leading-7">
        {nextAction ||
          "Keep your next answer simple: one point, then one example."}
      </p>
    </section>
  );
}

function TranscriptSection({ attempt }: { attempt: LocalAttempt }) {
  const transcript = attempt.transcript?.trim();

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-vocali-card">
      <h2 className="text-xl font-black text-vocali-teal-deep">Transcript</h2>
      {attempt.transcriptStatus === "ready" && transcript ? (
        <ExpandableTranscript
          transcript={transcript}
          previewCharacterLimit={640}
          collapsedHeightClassName="max-h-40"
          className="[&>p]:text-vocali-muted"
        />
      ) : (
        <p className="mt-3 rounded-[1rem] bg-vocali-cream/75 p-4 text-sm font-bold leading-5 text-vocali-muted">
          Transcript unavailable for this attempt.
        </p>
      )}
    </section>
  );
}

function FeedbackSection({ attempt }: { attempt: LocalAttempt }) {
  const metrics = getAttemptMetrics(attempt);
  const measuredInsights = metrics ? getFeedbackInsights(metrics) : null;
  const feedbackRows: Array<{
    breakdown?: string | null;
    signal?: FeedbackSignal;
    title: string;
  }> = (measuredInsights?.feedbackRows ?? getLimitedFeedbackRows(attempt.feedback)).map(
    (row) => ({
      ...row,
      breakdown:
        row.type === "filler"
          ? getFillerBreakdownText(metrics)
          : row.type === "repetition"
            ? getRepetitionBreakdownText(metrics)
            : null,
    }),
  );

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-vocali-card">
      <h2 className="text-xl font-black text-vocali-teal-deep">Feedback</h2>
      {metrics && measuredInsights ? (
        <MetricsRow
          metrics={metrics}
          timeUsedContext={measuredInsights.timeUsedContext}
        />
      ) : (
        <p className="mt-3 rounded-[1rem] bg-vocali-cream/75 p-4 text-sm font-bold leading-5 text-vocali-muted">
          Detailed feedback was limited for this attempt.
        </p>
      )}
      <div className="mt-4 divide-y divide-vocali-border/55">
        {feedbackRows.map(({ breakdown, signal, title }) => (
          <div key={title} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-black text-vocali-teal-deep">
                {title}
              </p>
              <span className="rounded-full bg-vocali-teal/10 px-2.5 py-1 text-[0.68rem] font-black leading-3 text-vocali-teal">
                {signal?.label ?? "Noted"}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-5 text-vocali-muted">
              {signal?.note ?? "Feedback for this signal was not saved."}
            </p>
            {breakdown ? (
              <p className="mt-2 rounded-[0.9rem] bg-vocali-cream/75 px-3 py-2 text-xs font-black leading-4 text-vocali-muted">
                {breakdown}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function getAttemptMetrics(attempt: LocalAttempt) {
  if (attempt.speakingMetrics) {
    return attempt.speakingMetrics;
  }

  const transcript = attempt.transcript?.trim();

  if (attempt.transcriptStatus !== "ready" || !transcript) {
    return undefined;
  }

  return calculateSpeakingMetrics({
    transcript,
    actualDurationSeconds: attempt.actualDurationSeconds,
    targetDurationSeconds: attempt.speakingDurationSeconds,
  });
}

function MetricsRow({
  metrics,
  timeUsedContext,
}: {
  metrics: SpeakingMetrics;
  timeUsedContext: string;
}) {
  return (
    <div className="mt-4 rounded-[1.1rem] bg-vocali-cream/70 p-4">
      <p className="text-sm font-black text-vocali-teal-deep">
        Measured from transcript
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MetricPill label="Words" value={String(metrics.wordCount)} />
        <MetricPill label="WPM" value={String(metrics.wordsPerMinute)} />
        <MetricPill label="Fillers" value={String(metrics.fillerWordCount)} />
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-vocali-muted">
        {timeUsedContext}
      </p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] bg-white px-2 py-2">
      <p className="text-lg font-black tracking-[-0.03em] text-vocali-teal-deep">
        {value}
      </p>
      <p className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-vocali-muted">
        {label}
      </p>
    </div>
  );
}

function RecordingReplay({ attempt }: { attempt: LocalAttempt }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  if (!attempt.hasLocalRecording) {
    return null;
  }

  async function loadReplay() {
    if (audioUrl || isLoading) {
      return;
    }

    setIsLoading(true);
    setIsMissing(false);

    const recording = await getRecording(attempt.recordingId ?? attempt.id);

    if (!recording) {
      setIsMissing(true);
      setIsLoading(false);
      return;
    }

    setAudioUrl(URL.createObjectURL(recording));
    setIsLoading(false);
  }

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-vocali-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-vocali-teal-deep">Replay</h2>
          <p className="mt-1 text-xs font-semibold text-vocali-muted">
            Saved locally on this device
          </p>
        </div>
        {!audioUrl ? (
          <button
            type="button"
            onClick={loadReplay}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-vocali-orange/12 px-3 text-xs font-black text-vocali-orange disabled:opacity-70"
          >
            <Play className="h-3.5 w-3.5 fill-vocali-orange" />
            {isLoading ? "Loading" : "Replay"}
          </button>
        ) : null}
      </div>
      {audioUrl ? (
        <audio controls src={audioUrl} className="mt-3 h-9 w-full" />
      ) : null}
      {isMissing ? (
        <p className="mt-3 text-sm font-semibold text-vocali-muted">
          Recording unavailable for this attempt.
        </p>
      ) : null}
    </section>
  );
}
