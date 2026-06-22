"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mic,
  RotateCcw,
  Send,
  Shuffle,
  Square,
} from "lucide-react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ExpandableTranscript } from "@/components/shared/ExpandableTranscript";
import {
  getCategoryBySlug,
  getChallengeById,
  getChallengesByCategory,
  getRandomChallenge,
  mockChallenges,
} from "@/data/mockChallenges";
import { mockDailyFeedback } from "@/data/mockFeedback";
import { getAttempts, getTodayAttempt, saveAttempt } from "@/lib/attemptStorage";
import { getTodayKey } from "@/lib/dailyChallenge";
import {
  getFeedbackInsights,
  getLimitedFeedbackRows,
} from "@/lib/feedbackInsights";
import { saveRecording } from "@/lib/recordingStorage";
import {
  getFillerBreakdownText,
  getRepetitionBreakdownText,
} from "@/lib/speakingBreakdownText";
import { calculateSpeakingMetrics } from "@/lib/speakingMetrics";
import { queueStreakCelebration } from "@/lib/streakCelebration";
import type {
  Challenge,
  FeedbackSignal,
  SpeakingMetrics,
  TranscriptStatus,
} from "@/lib/types";

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type PracticePhase =
  | "shuffle"
  | "planning"
  | "mic_setup"
  | "countdown"
  | "recording"
  | "stopped"
  | "transcribing"
  | "feedback";

type LeaveConfirmation = {
  title: string;
  description: string;
  actionLabel: string;
};

type RecordingErrorKind = "permission" | "recording" | "unsupported";

type BackControlProps = {
  backHref: string;
  backLabel: string;
  isBackDisabled?: boolean;
  isTimerPaused?: boolean;
  onBackRequest?: () => void;
};

const countdownDuration = 3;
const millisecondsPerSecond = 1000;
const microphonePermissionMessage =
  "Microphone access is needed to record your answer. You can enable it in your browser settings and try again.";
const unsupportedRecordingMessage =
  "Recording is not supported in this browser yet. Try Chrome, Safari, or Edge.";
const recordingFailedMessage =
  "Something went wrong while recording. Please try again.";
const recordingSaveFailedMessage =
  "Recording could not be saved. Please try again.";
const transcriptionFallbackMessage =
  "Transcript preparation did not finish, but you can still continue with basic feedback.";
const recorderMimeTypeCandidates = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
];

function logRecordingEvent(message: string, details?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (details === undefined) {
    console.info(`[Vocali recording] ${message}`);
    return;
  }

  console.info(`[Vocali recording] ${message}`, details);
}

function getSupportedRecorderMimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return undefined;
  }

  return recorderMimeTypeCandidates.find((mimeType) => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  });
}

function createAttemptId() {
  return `attempt-${new Date().getTime()}`;
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getDisplaySeconds(remainingMs: number) {
  return Math.max(0, Math.ceil(remainingMs / millisecondsPerSecond));
}

function getTimerProgress(remainingMs: number, durationSeconds: number) {
  const durationMs = durationSeconds * millisecondsPerSecond;

  if (durationMs <= 0) {
    return 100;
  }

  return clampProgress(((durationMs - remainingMs) / durationMs) * 100);
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext ?? null;
}

function useSmoothCountdown({
  durationSeconds,
  isActive,
  isPaused,
  onComplete,
  resetKey,
}: {
  durationSeconds: number;
  isActive: boolean;
  isPaused: boolean;
  onComplete: () => void;
  resetKey: string | number;
}) {
  const durationMs = durationSeconds * millisecondsPerSecond;
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const remainingMsRef = useRef(durationMs);
  const lastFrameAtRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    remainingMsRef.current = durationMs;
    lastFrameAtRef.current = null;
    hasCompletedRef.current = false;

    const resetFrame = window.requestAnimationFrame(() => {
      setRemainingMs(durationMs);
    });

    return () => window.cancelAnimationFrame(resetFrame);
  }, [durationMs, resetKey]);

  useEffect(() => {
    if (!isActive || isPaused || remainingMsRef.current <= 0) {
      lastFrameAtRef.current = null;
      return;
    }

    function tick(frameTime: number) {
      if (lastFrameAtRef.current === null) {
        lastFrameAtRef.current = frameTime;
      }

      const elapsedMs = frameTime - lastFrameAtRef.current;
      lastFrameAtRef.current = frameTime;
      const nextRemainingMs = Math.max(
        0,
        remainingMsRef.current - elapsedMs,
      );

      remainingMsRef.current = nextRemainingMs;
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0) {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current();
        }

        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    }

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrameAtRef.current = null;
    };
  }, [isActive, isPaused, resetKey]);

  return {
    displaySeconds: getDisplaySeconds(remainingMs),
    progress: getTimerProgress(remainingMs, durationSeconds),
    remainingMs,
  };
}

type PracticeSessionProps = {
  categorySlug?: string;
  challengeId?: string;
  isDailyChallenge?: boolean;
  planningSeconds?: number;
  source?: "home" | "onboarding" | "practice";
  speakingSeconds?: number;
};

export function PracticeSession({
  categorySlug,
  challengeId,
  isDailyChallenge = false,
  planningSeconds = 30,
  source = "practice",
  speakingSeconds = 60,
}: PracticeSessionProps) {
  const router = useRouter();
  const selectedChallenge = challengeId ? getChallengeById(challengeId) : null;
  const [phase, setPhase] = useState<PracticePhase>(
    selectedChallenge ? "planning" : "shuffle",
  );
  const [leaveConfirmation, setLeaveConfirmation] =
    useState<LeaveConfirmation | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(
    selectedChallenge,
  );
  const [planTimerResetKey, setPlanTimerResetKey] = useState(0);
  const [countdownTimerResetKey, setCountdownTimerResetKey] = useState(0);
  const [speakTimerResetKey, setSpeakTimerResetKey] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingErrorKind, setRecordingErrorKind] =
    useState<RecordingErrorKind | null>(null);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [speakingMetrics, setSpeakingMetrics] = useState<
    SpeakingMetrics | undefined
  >();
  const [transcriptStatus, setTranscriptStatus] =
    useState<TranscriptStatus>("not_started");
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null,
  );
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [isStoppingRecording, setIsStoppingRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(
    null,
  );
  const [actualDurationSeconds, setActualDurationSeconds] = useState<
    number | undefined
  >();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const recorderMimeTypeRef = useRef<string | undefined>(undefined);
  const stopFallbackRef = useRef<number | null>(null);
  const hasFinalizedRecordingRef = useRef(false);
  const hasStartedMicSetupRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const speakRemainingMsRef = useRef(speakingSeconds * millisecondsPerSecond);
  const wasRecorderPausedByLeaveRef = useRef(false);
  const category = getCategoryBySlug(categorySlug);
  const challengePool = getChallengesByCategory(category.slug);
  const backHref = source === "practice" ? "/practice" : "/home";
  const backLabel =
    source === "practice" ? "Back to practice" : "Back to home";
  const backControls = {
    backHref,
    backLabel,
    isTimerPaused: Boolean(leaveConfirmation),
    onBackRequest: requestLeave,
  };

  const stopMicrophoneTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecordingStream(null);
  }, []);

  const clearStopFallback = useCallback(() => {
    if (stopFallbackRef.current !== null) {
      window.clearTimeout(stopFallbackRef.current);
      stopFallbackRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setAudioUrl(null);
    setAudioBlob(null);
    audioChunksRef.current = [];
    setRecordingError(null);
    setRecordingErrorKind(null);
    setTranscript(undefined);
    setSpeakingMetrics(undefined);
    setTranscriptStatus("not_started");
    setTranscriptionError(null);
    hasFinalizedRecordingRef.current = false;
    setActualDurationSeconds(undefined);
  }, []);

  const discardCurrentAttempt = useCallback(() => {
    clearStopFallback();

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;

      try {
        recorder.stop();
      } catch {
        // The recorder may already be stopping on some browsers.
      }
    }

    mediaRecorderRef.current = null;
    recorderMimeTypeRef.current = undefined;
    stopMicrophoneTracks();
    recordingStartedAtRef.current = null;
    clearRecording();
  }, [clearRecording, clearStopFallback, stopMicrophoneTracks]);

  const pauseRecordingForConfirmation = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (recorder?.state !== "recording") {
      return;
    }

    try {
      recorder.pause();
      wasRecorderPausedByLeaveRef.current = true;
    } catch {
      wasRecorderPausedByLeaveRef.current = false;
    }
  }, []);

  const resumeRecordingAfterConfirmation = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!wasRecorderPausedByLeaveRef.current) {
      return;
    }

    wasRecorderPausedByLeaveRef.current = false;

    if (recorder?.state !== "paused") {
      return;
    }

    try {
      recorder.resume();
    } catch {
      setRecordingError(recordingFailedMessage);
      setRecordingErrorKind("recording");
    }
  }, []);

  const finalizeRecording = useCallback(
    (mimeType?: string) => {
      if (hasFinalizedRecordingRef.current) {
        return;
      }

      hasFinalizedRecordingRef.current = true;
      clearStopFallback();

      const chunkMimeType = audioChunksRef.current.find((chunk) => chunk.type)
        ?.type;
      const finalMimeType =
        mimeType || recorderMimeTypeRef.current || chunkMimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, {
        type: finalMimeType,
      });

      logRecordingEvent("finalized recording blob", {
        blobSize: audioBlob.size,
        chunkCount: audioChunksRef.current.length,
        mimeType: finalMimeType,
      });

      stopMicrophoneTracks();
      mediaRecorderRef.current = null;
      recorderMimeTypeRef.current = undefined;
      setIsPreparingRecording(false);
      setIsStoppingRecording(false);
      wasRecorderPausedByLeaveRef.current = false;
      setActualDurationSeconds(
        Math.min(
          speakingSeconds,
          Math.max(
            1,
            Math.round(
              (speakingSeconds * millisecondsPerSecond -
                speakRemainingMsRef.current) /
                millisecondsPerSecond,
            ),
          ),
        ),
      );
      recordingStartedAtRef.current = null;

      if (audioBlob.size === 0) {
        setAudioBlob(null);
        setRecordingError(recordingSaveFailedMessage);
        setRecordingErrorKind("recording");
        setPhase("mic_setup");
        return;
      }

      const nextAudioUrl = URL.createObjectURL(audioBlob);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      audioUrlRef.current = nextAudioUrl;
      setAudioBlob(audioBlob);
      setAudioUrl(nextAudioUrl);
      setRecordingError(null);
      setRecordingErrorKind(null);
      setPhase("stopped");
    },
    [clearStopFallback, speakingSeconds, stopMicrophoneTracks],
  );

  const scheduleFinalizeRecording = useCallback(
    (mimeType?: string, delayMs = 120) => {
      clearStopFallback();
      stopFallbackRef.current = window.setTimeout(() => {
        finalizeRecording(mimeType);
      }, delayMs);
    },
    [clearStopFallback, finalizeRecording],
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      logRecordingEvent("stop requested without active recorder", {
        recorderState: recorder?.state ?? "missing",
      });
      stopMicrophoneTracks();
      setIsPreparingRecording(false);
      setIsStoppingRecording(false);
      recordingStartedAtRef.current = null;
      recorderMimeTypeRef.current = undefined;
      setRecordingError(recordingSaveFailedMessage);
      setRecordingErrorKind("recording");
      setPhase((currentPhase) =>
        currentPhase === "recording" ? "mic_setup" : currentPhase,
      );
      return;
    }

    setIsStoppingRecording(true);

    try {
      recorder.requestData();
    } catch {
      // Some browsers only allow data to be emitted during stop.
    }

    try {
      logRecordingEvent("stopping recorder", { state: recorder.state });
      recorder.stop();
    } catch {
      finalizeRecording(recorder.mimeType);
      return;
    }

    clearStopFallback();
    stopFallbackRef.current = window.setTimeout(() => {
      finalizeRecording(recorder.mimeType);
    }, 1800);
  }, [
    clearStopFallback,
    finalizeRecording,
    stopMicrophoneTracks,
  ]);

  const startRecording = useCallback(() => {
    const stream = mediaStreamRef.current;

    if (
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError(unsupportedRecordingMessage);
      setRecordingErrorKind("unsupported");
      return;
    }

    if (!stream) {
      setRecordingError(microphonePermissionMessage);
      setRecordingErrorKind("permission");
      setPhase("mic_setup");
      return;
    }

    try {
      const selectedMimeType = getSupportedRecorderMimeType();
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
      const effectiveMimeType =
        recorder.mimeType || selectedMimeType || undefined;

      mediaRecorderRef.current = recorder;
      recorderMimeTypeRef.current = effectiveMimeType;
      audioChunksRef.current = [];
      hasFinalizedRecordingRef.current = false;
      recordingStartedAtRef.current = Date.now();
      speakRemainingMsRef.current = speakingSeconds * millisecondsPerSecond;
      setSpeakTimerResetKey((current) => current + 1);
      setIsStoppingRecording(false);
      logRecordingEvent("created recorder", {
        requestedMimeType: selectedMimeType ?? "browser default",
        recorderMimeType: recorder.mimeType || "not reported",
      });

      recorder.ondataavailable = (event) => {
        logRecordingEvent("recorder dataavailable", {
          size: event.data.size,
          type: event.data.type || "not reported",
        });

        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        logRecordingEvent("recorder started", { state: recorder.state });
        setIsPreparingRecording(false);
      };

      recorder.onpause = () => {
        logRecordingEvent("recorder paused", { state: recorder.state });
      };

      recorder.onresume = () => {
        logRecordingEvent("recorder resumed", { state: recorder.state });
      };

      recorder.onerror = (event) => {
        logRecordingEvent("recorder error", event);
        setRecordingError(recordingFailedMessage);
        setRecordingErrorKind("recording");
        clearStopFallback();
        stopMicrophoneTracks();
        setIsPreparingRecording(false);
        setIsStoppingRecording(false);
        setPhase("mic_setup");
      };

      recorder.onstop = () => {
        logRecordingEvent("recorder stopped", { state: recorder.state });
        scheduleFinalizeRecording(recorder.mimeType || effectiveMimeType);
      };

      setRecordingError(null);
      setRecordingErrorKind(null);
      recorder.start(1000);
      setIsPreparingRecording(false);
      setPhase("recording");
    } catch (error) {
      logRecordingEvent("recorder start failed", error);
      stopMicrophoneTracks();
      setIsPreparingRecording(false);
      setIsStoppingRecording(false);
      recordingStartedAtRef.current = null;
      setRecordingError(recordingFailedMessage);
      setRecordingErrorKind("recording");
      setPhase("mic_setup");
    }
  }, [
    clearStopFallback,
    scheduleFinalizeRecording,
    speakingSeconds,
    stopMicrophoneTracks,
  ]);

  const setupMicrophone = useCallback(async () => {
    hasStartedMicSetupRef.current = true;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError(unsupportedRecordingMessage);
      setRecordingErrorKind("unsupported");
      setIsPreparingRecording(false);
      return;
    }

    clearRecording();
    stopMicrophoneTracks();
    setCountdownTimerResetKey((current) => current + 1);
    setIsPreparingRecording(true);
    setIsStoppingRecording(false);
    setTranscript(undefined);
    setSpeakingMetrics(undefined);
    setTranscriptStatus("not_started");
    setTranscriptionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaStreamRef.current = stream;
      setRecordingStream(stream);
      setRecordingError(null);
      setRecordingErrorKind(null);
      setIsPreparingRecording(false);
      setPhase("countdown");
    } catch (error) {
      stopMicrophoneTracks();
      setIsPreparingRecording(false);
      const isPermissionError =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");

      logRecordingEvent(
        isPermissionError ? "microphone permission error" : "microphone setup error",
        error,
      );
      setRecordingError(
        isPermissionError ? microphonePermissionMessage : recordingFailedMessage,
      );
      setRecordingErrorKind(isPermissionError ? "permission" : "recording");
      setPhase("mic_setup");
    }
  }, [clearRecording, stopMicrophoneTracks]);

  const enterMicrophoneSetup = useCallback(() => {
    hasStartedMicSetupRef.current = false;
    setPhase("mic_setup");
  }, []);

  useEffect(() => {
    if (phase !== "shuffle") {
      return;
    }

    const carouselTimer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % challengePool.length);
    }, 180);

    const selectTimer = window.setTimeout(() => {
      setChallenge(getRandomChallenge(category.slug));
      setPlanTimerResetKey((current) => current + 1);
      setPhase("planning");
    }, 2200);

    return () => {
      window.clearInterval(carouselTimer);
      window.clearTimeout(selectTimer);
    };
  }, [category.slug, challengePool.length, phase]);

  useEffect(() => {
    if (
      phase !== "mic_setup" ||
      hasStartedMicSetupRef.current ||
      leaveConfirmation
    ) {
      return;
    }

    void setupMicrophone();
  }, [leaveConfirmation, phase, setupMicrophone]);

  const planTimer = useSmoothCountdown({
    durationSeconds: planningSeconds,
    isActive: phase === "planning",
    isPaused: Boolean(leaveConfirmation),
    onComplete: enterMicrophoneSetup,
    resetKey: `plan-${challenge?.id ?? "none"}-${planTimerResetKey}`,
  });
  const countdownTimer = useSmoothCountdown({
    durationSeconds: countdownDuration,
    isActive: phase === "countdown",
    isPaused: Boolean(leaveConfirmation),
    onComplete: startRecording,
    resetKey: countdownTimerResetKey,
  });
  const speakTimer = useSmoothCountdown({
    durationSeconds: speakingSeconds,
    isActive: phase === "recording",
    isPaused: Boolean(leaveConfirmation) || isStoppingRecording,
    onComplete: stopRecording,
    resetKey: speakTimerResetKey,
  });

  useEffect(() => {
    speakRemainingMsRef.current = speakTimer.remainingMs;
  }, [speakTimer.remainingMs]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      clearStopFallback();

      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        recorder.stop();
      }

      mediaRecorderRef.current = null;
      recorderMimeTypeRef.current = undefined;
      stopMicrophoneTracks();

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [clearStopFallback, stopMicrophoneTracks]);

  function resetFlow() {
    stopRecording();
    clearRecording();
    setChallenge(selectedChallenge);
    setCarouselIndex(0);
    speakRemainingMsRef.current = speakingSeconds * millisecondsPerSecond;
    setPlanTimerResetKey((current) => current + 1);
    setCountdownTimerResetKey((current) => current + 1);
    setSpeakTimerResetKey((current) => current + 1);
    hasStartedMicSetupRef.current = false;
    setPhase(selectedChallenge ? "planning" : "shuffle");
  }

  function startSpeaking() {
    speakRemainingMsRef.current = speakingSeconds * millisecondsPerSecond;
    setActualDurationSeconds(undefined);
    setTranscript(undefined);
    setSpeakingMetrics(undefined);
    setTranscriptStatus("not_started");
    setTranscriptionError(null);
    enterMicrophoneSetup();
  }

  async function submitAttempt() {
    if (!audioBlob) {
      setTranscript(undefined);
      setTranscriptStatus("failed");
      setTranscriptionError(transcriptionFallbackMessage);
      setPhase("feedback");
      return;
    }

    setTranscript(undefined);
    setTranscriptStatus("processing");
    setTranscriptionError(null);
    setPhase("transcribing");

    const transcription = await requestTranscription(audioBlob);

    setTranscript(transcription.transcript || undefined);
    setTranscriptStatus(transcription.transcriptStatus);
    setTranscriptionError(transcription.error ?? null);
    setSpeakingMetrics(
      transcription.transcript
        ? calculateSpeakingMetrics({
            transcript: transcription.transcript,
            actualDurationSeconds,
            targetDurationSeconds: speakingSeconds,
          })
        : undefined,
    );
    setPhase("feedback");
  }

  function getLeaveConfirmationForPhase(
    currentPhase: PracticePhase,
  ): LeaveConfirmation | null {
    switch (currentPhase) {
      case "planning":
      case "mic_setup":
      case "countdown":
        return {
          title: "Leave this attempt?",
          description: "Your current practice will reset.",
          actionLabel: "Leave attempt",
        };
      case "recording":
        return {
          title: "Stop and leave this attempt?",
          description: "Your recording will not be saved.",
          actionLabel: "Stop and leave",
        };
      case "stopped":
        return {
          title: "Leave without saving?",
          description: "Your recording and feedback will be lost.",
          actionLabel: "Leave without saving",
        };
      default:
        return null;
    }
  }

  function requestLeave() {
    if (phase === "transcribing") {
      return;
    }

    const confirmation = getLeaveConfirmationForPhase(phase);

    if (!confirmation) {
      router.push(backHref);
      return;
    }

    if (phase === "recording") {
      pauseRecordingForConfirmation();
    }

    setLeaveConfirmation(confirmation);
  }

  function confirmLeave() {
    discardCurrentAttempt();
    setLeaveConfirmation(null);
    router.push(backHref);
  }

  function renderWithLeaveConfirmation(content: ReactNode) {
    return (
      <>
        {content}
        {leaveConfirmation ? (
          <LeaveAttemptDialog
            confirmation={leaveConfirmation}
            onCancel={() => {
              setLeaveConfirmation(null);
              resumeRecordingAfterConfirmation();
            }}
            onConfirm={confirmLeave}
          />
        ) : null}
      </>
    );
  }

  if (phase === "feedback" && challenge) {
    return (
      <FeedbackView
        actualDurationSeconds={actualDurationSeconds}
        audioBlob={audioBlob}
        backHref={backHref}
        backLabel={backLabel}
        challenge={challenge}
        isDailyChallenge={isDailyChallenge}
        onTryAgain={resetFlow}
        speakingSeconds={speakingSeconds}
        speakingMetrics={speakingMetrics}
        transcript={transcript}
        transcriptStatus={transcriptStatus}
        transcriptionError={transcriptionError}
      />
    );
  }

  if (phase === "transcribing") {
    return (
      <TranscribingView
        backHref={backHref}
        backLabel="Finishing your attempt..."
        isBackDisabled
      />
    );
  }

  if (phase === "shuffle") {
    return (
      <ShuffleView
        backHref={backHref}
        backLabel={backLabel}
        carouselIndex={carouselIndex}
        categoryLabel={category.label}
        challenges={challengePool}
        planningSeconds={planningSeconds}
      />
    );
  }

  if (phase === "planning" && challenge) {
    return renderWithLeaveConfirmation(
      <PlanningView
        {...backControls}
        challenge={challenge}
        planningSeconds={planningSeconds}
        progress={planTimer.progress}
        secondsLeft={planTimer.displaySeconds}
        speakingSeconds={speakingSeconds}
        onStartSpeaking={startSpeaking}
      />,
    );
  }

  if (phase === "mic_setup") {
    return renderWithLeaveConfirmation(
      <MicrophoneSetupView
        {...backControls}
        challenge={challenge ?? challengePool[carouselIndex] ?? mockChallenges[0]}
        errorKind={recordingErrorKind}
        isPreparingRecording={isPreparingRecording}
        onRetry={() => void setupMicrophone()}
      />,
    );
  }

  if (phase === "countdown") {
    return renderWithLeaveConfirmation(
      <CountdownView
        {...backControls}
        challenge={challenge ?? challengePool[carouselIndex] ?? mockChallenges[0]}
        progress={countdownTimer.progress}
        secondsLeft={countdownTimer.displaySeconds}
        speakingSeconds={speakingSeconds}
      />,
    );
  }

  return renderWithLeaveConfirmation(
    <SpeakingView
      challenge={challenge ?? challengePool[carouselIndex] ?? mockChallenges[0]}
      phase={phase}
      audioUrl={audioUrl}
      audioMeterStream={recordingStream}
      {...backControls}
      errorMessage={recordingError}
      errorKind={recordingErrorKind}
      isPreparingRecording={isPreparingRecording}
      isStoppingRecording={isStoppingRecording}
      planningSeconds={planningSeconds}
      progress={speakTimer.progress}
      secondsLeft={speakTimer.displaySeconds}
      speakingSeconds={speakingSeconds}
      onStart={startRecording}
      onStop={stopRecording}
      onSubmit={submitAttempt}
      onTryAgain={resetFlow}
    />,
  );
}

async function requestTranscription(audioBlob: Blob) {
  const formData = new FormData();
  const recordingType = audioBlob.type || "audio/webm";
  const extension = recordingType.includes("mp4")
    ? "mp4"
    : recordingType.includes("wav")
      ? "wav"
      : "webm";

  formData.append(
    "audio",
    new File([audioBlob], `vocali-recording.${extension}`, {
      type: recordingType,
    }),
  );

  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as {
      transcript?: unknown;
      transcriptStatus?: unknown;
      error?: unknown;
    };

    if (
      response.ok &&
      data.transcriptStatus === "ready" &&
      typeof data.transcript === "string"
    ) {
      return {
        transcript: data.transcript,
        transcriptStatus: "ready" as const,
      };
    }

    return {
      transcript: "",
      transcriptStatus: "failed" as const,
      error:
        typeof data.error === "string"
          ? data.error
          : transcriptionFallbackMessage,
    };
  } catch {
    return {
      transcript: "",
      transcriptStatus: "failed" as const,
      error: transcriptionFallbackMessage,
    };
  }
}

function PracticeHeader({
  backHref = "/practice",
  backLabel = "Back to practice",
  isBackDisabled = false,
  onBackRequest,
}: {
  backHref?: string;
  backLabel?: string;
  isBackDisabled?: boolean;
  onBackRequest?: () => void;
}) {
  const backClassName =
    "flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-vocali-teal-deep shadow-[0_10px_24px_rgb(7_50_71/0.08)]";

  return (
    <header className="flex items-center justify-between">
      {isBackDisabled ? (
        <button
          type="button"
          disabled
          className={`${backClassName} opacity-55`}
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={3} />
        </button>
      ) : onBackRequest ? (
        <button
          type="button"
          onClick={onBackRequest}
          className={backClassName}
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={3} />
        </button>
      ) : (
        <Link href={backHref} className={backClassName} aria-label={backLabel}>
          <ArrowLeft className="h-5 w-5" strokeWidth={3} />
        </Link>
      )}
      <VocaliLogo size="sm" />
      <div className="h-11 w-11" />
    </header>
  );
}

function LeaveAttemptDialog({
  confirmation,
  onCancel,
  onConfirm,
}: {
  confirmation: LeaveConfirmation;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-vocali-teal-deep/36 px-4 pb-5 pt-8 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-attempt-title"
      aria-describedby="leave-attempt-description"
    >
      <div className="w-full max-w-[430px] rounded-[2rem] bg-vocali-cream p-5 shadow-[0_24px_70px_rgb(7_50_71/0.28)]">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_10px_24px_rgb(7_50_71/0.08)]">
          <p
            id="leave-attempt-title"
            className="text-2xl font-black tracking-[-0.04em] text-vocali-teal-deep"
          >
            {confirmation.title}
          </p>
          <p
            id="leave-attempt-description"
            className="mt-2 text-base font-bold leading-6 text-vocali-muted"
          >
            {confirmation.description}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-16 min-h-16 w-full items-center justify-center rounded-[1.2rem] bg-vocali-orange px-5 text-base font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.24)]"
          >
            Stay and continue
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-14 w-full items-center justify-center rounded-[1.1rem] border-2 border-vocali-orange/55 bg-white px-5 text-base font-black text-vocali-orange"
          >
            {confirmation.actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShuffleView({
  backHref,
  backLabel,
  carouselIndex,
  categoryLabel,
  challenges,
  planningSeconds,
}: {
  backHref: string;
  backLabel: string;
  carouselIndex: number;
  categoryLabel: string;
  challenges: Challenge[];
  planningSeconds: number;
}) {
  const visibleChallenge = challenges[carouselIndex] ?? mockChallenges[0];

  return (
    <section className="vocali-session-timed">
      <PracticeHeader backHref={backHref} backLabel={backLabel} />

      <div className="vocali-session-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-vocali-teal text-white shadow-[0_18px_35px_rgb(0_167_165/0.24)]">
          <Shuffle className="h-8 w-8" strokeWidth={3} />
        </div>
        <p className="vocali-session-status mt-5 text-sm font-black uppercase tracking-[0.14em] text-vocali-teal">
          {categoryLabel}
        </p>
        <h1 className="vocali-session-heading mt-2 font-black tracking-[-0.04em] text-vocali-teal-deep">
          Finding today&apos;s prompt...
        </h1>
        <div className="vocali-session-prompt-card w-full bg-white shadow-vocali-card">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-vocali-muted">
            Shuffling
          </p>
          <p className="vocali-session-prompt-title font-black tracking-[-0.03em] text-vocali-teal-deep">
            {visibleChallenge.prompt}
          </p>
        </div>
        <p className="vocali-session-helper mx-auto mt-4 max-w-xs text-sm font-bold leading-5 text-vocali-muted">
          The app will choose one prompt, then your {planningSeconds}-second
          planning timer starts.
        </p>
      </div>
    </section>
  );
}

type SmoothTimerRingProps = {
  children?: ReactNode;
  color: string;
  outerClassName: string;
  staticProgress: number;
  trackColor: string;
};

function SmoothTimerRing({
  children,
  color,
  outerClassName,
  staticProgress,
  trackColor,
}: SmoothTimerRingProps) {
  const ringStyle = {
    "--timer-color": color,
    "--timer-static-progress": `${staticProgress}%`,
    "--timer-track": trackColor,
  } as CSSProperties;

  return (
    <div
      className={`vocali-timer-ring ${outerClassName}`}
      style={ringStyle}
    >
      {children}
    </div>
  );
}

type PlanningViewProps = {
  challenge: Challenge;
  planningSeconds: number;
  progress: number;
  secondsLeft: number;
  speakingSeconds: number;
  onStartSpeaking: () => void;
} & BackControlProps;

function PlanningView({
  backHref,
  backLabel,
  onBackRequest,
  challenge,
  planningSeconds,
  progress,
  secondsLeft,
  speakingSeconds,
  onStartSpeaking,
}: PlanningViewProps) {
  return (
    <section className="vocali-session-timed">
      <PracticeHeader
        backHref={backHref}
        backLabel={backLabel}
        onBackRequest={onBackRequest}
      />

      <div className="vocali-session-prompt-card bg-vocali-teal-deep text-white shadow-[0_20px_45px_rgb(7_50_71/0.16)]">
        <div className="vocali-session-chip-row flex flex-wrap">
          <span className="vocali-session-chip vocali-session-chip--dark-teal">
            <Clock3 className="h-3.5 w-3.5" />
            {planningSeconds}-second planning time
          </span>
          <span className="vocali-session-chip vocali-session-chip--dark-orange">
            {speakingSeconds} sec speak
          </span>
        </div>

        <p className="vocali-session-eyebrow font-black uppercase tracking-[0.12em] text-[#8be4dd]">
          Your prompt
        </p>
        <h1 className="vocali-session-prompt-title font-black tracking-[-0.04em]">
          {challenge.prompt}
        </h1>
      </div>

      <div className="vocali-session-center">
        <SmoothTimerRing
          color="#ff7a1a"
          outerClassName="vocali-ring-plan flex items-center justify-center rounded-full bg-white shadow-vocali-card"
          staticProgress={progress}
          trackColor="#ffffff"
        >
          <div className="vocali-ring-plan-inner flex flex-col items-center justify-center rounded-full bg-white text-vocali-orange">
            <span className="vocali-timer-number font-black tracking-[-0.06em]">
              {secondsLeft}
            </span>
            <span className="text-sm font-black uppercase tracking-[0.12em]">
              seconds
            </span>
          </div>
        </SmoothTimerRing>
        <p className="vocali-session-status mt-5 text-lg font-black text-vocali-teal">
          Plan your answer
        </p>
        <p className="vocali-planning-instruction mt-2 max-w-xs text-sm font-bold text-vocali-muted">
          Think of your opening point and one example.
        </p>
      </div>

      <button
        type="button"
        onClick={onStartSpeaking}
        className="vocali-session-action flex w-full items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)]"
      >
        Start speaking
        <Mic className="h-6 w-6" strokeWidth={3} />
      </button>
    </section>
  );
}

type MicrophoneSetupViewProps = {
  challenge: Challenge;
  errorKind: RecordingErrorKind | null;
  isPreparingRecording: boolean;
  onRetry: () => void;
} & BackControlProps;

function MicrophoneSetupView({
  backHref,
  backLabel,
  onBackRequest,
  challenge,
  errorKind,
  isPreparingRecording,
  onRetry,
}: MicrophoneSetupViewProps) {
  const isRecordingProblem = errorKind === "recording";
  const isUnsupported = errorKind === "unsupported";
  const heading = isRecordingProblem
    ? "Recording didn't save"
    : isUnsupported
      ? "Recording is not supported here"
      : "Allow microphone access";
  const helper = isRecordingProblem
    ? "Your mic worked, but the replay could not be prepared. Try again."
    : isUnsupported
      ? "Try Safari, Chrome, or Edge on a secure HTTPS link."
      : "Vocali needs your mic to record your answer.";
  const retryLabel = isPreparingRecording
    ? "Opening mic..."
    : isUnsupported
      ? "Back to practice"
      : "Try again";
  const actionClassName =
    "vocali-session-action flex w-full items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)] disabled:opacity-70";

  return (
    <section className="vocali-session-timed">
      <PracticeHeader
        backHref={backHref}
        backLabel={backLabel}
        onBackRequest={onBackRequest}
      />

      <div className="vocali-session-prompt-card bg-white shadow-vocali-card">
        <p className="vocali-session-eyebrow font-black uppercase tracking-[0.12em] text-vocali-muted">
          Speaking prompt
        </p>
        <h1 className="vocali-session-prompt-title font-black tracking-[-0.04em] text-vocali-teal-deep">
          {challenge.prompt}
        </h1>
      </div>

      <div className="vocali-session-center">
        <div className="flex h-[clamp(8rem,28dvh,11rem)] w-[clamp(8rem,28dvh,11rem)] items-center justify-center rounded-full bg-white text-vocali-orange shadow-vocali-card">
          <Mic className="h-[clamp(3.5rem,12dvh,5rem)] w-[clamp(3.5rem,12dvh,5rem)]" strokeWidth={3} />
        </div>
        <h2 className="vocali-session-heading mt-5 max-w-xs font-black tracking-[-0.04em] text-vocali-teal-deep">
          {heading}
        </h2>
        <p className="vocali-session-body mt-3 max-w-xs text-sm font-bold leading-5 text-vocali-muted">
          {helper}
        </p>
      </div>

      {isUnsupported ? (
        <Link href="/practice" className={actionClassName}>
          {retryLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          disabled={isPreparingRecording}
          aria-label={retryLabel}
          className={actionClassName}
        >
          <Mic className="h-6 w-6" strokeWidth={3} />
          {retryLabel}
        </button>
      )}
    </section>
  );
}

type CountdownViewProps = {
  challenge: Challenge;
  progress: number;
  secondsLeft: number;
  speakingSeconds: number;
} & BackControlProps;

function CountdownView({
  backHref,
  backLabel,
  onBackRequest,
  challenge,
  progress,
  secondsLeft,
  speakingSeconds,
}: CountdownViewProps) {
  return (
    <section className="vocali-session-timed">
      <PracticeHeader
        backHref={backHref}
        backLabel={backLabel}
        onBackRequest={onBackRequest}
      />

      <div className="vocali-session-prompt-card bg-white shadow-vocali-card">
        <div className="vocali-session-chip-row flex flex-wrap">
          <span className="vocali-session-chip vocali-session-chip--teal">
            {speakingSeconds} sec speak
          </span>
          <span className="vocali-session-chip vocali-session-chip--orange">
            Mic ready
          </span>
        </div>
        <p className="vocali-session-eyebrow font-black uppercase tracking-[0.12em] text-vocali-muted">
          Speaking prompt
        </p>
        <h1 className="vocali-session-prompt-title font-black tracking-[-0.04em] text-vocali-teal-deep">
          {challenge.prompt}
        </h1>
      </div>

      <div className="vocali-session-center">
        <SmoothTimerRing
          color="#ff7a1a"
          outerClassName="vocali-ring-countdown flex items-center justify-center rounded-full bg-white shadow-vocali-card"
          staticProgress={progress}
          trackColor="#ffffff"
        >
          <div className="vocali-ring-countdown-inner flex flex-col items-center justify-center rounded-full bg-white text-vocali-orange">
            <span className="vocali-countdown-number font-black tracking-[-0.07em]">
              {secondsLeft}
            </span>
          </div>
        </SmoothTimerRing>
        <p className="vocali-session-status mt-5 text-sm font-black uppercase tracking-[0.14em] text-vocali-teal">
          Get ready
        </p>
        <h2 className="vocali-session-heading mt-2 font-black tracking-[-0.04em] text-vocali-teal-deep">
          Recording starts in...
        </h2>
        <p className="vocali-session-helper mt-3 max-w-xs text-sm font-bold leading-5 text-vocali-muted">
          Take a breath. Start with one clear sentence.
        </p>
      </div>
    </section>
  );
}

type SpeakingViewProps = {
  challenge: Challenge;
  phase: PracticePhase;
  audioUrl: string | null;
  audioMeterStream: MediaStream | null;
  errorMessage: string | null;
  errorKind: RecordingErrorKind | null;
  isPreparingRecording: boolean;
  isStoppingRecording: boolean;
  planningSeconds: number;
  progress: number;
  secondsLeft: number;
  speakingSeconds: number;
  onStart: () => void;
  onStop: () => void;
  onSubmit: () => void;
  onTryAgain: () => void;
} & BackControlProps;

function SoundLevelMeter({
  isActive,
  stream,
}: {
  isActive: boolean;
  stream: MediaStream | null;
}) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isActive || !stream) {
      return;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      return;
    }

    let animationFrame: number | null = null;
    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let isDisposed = false;
    let lastStateUpdateAt = 0;

    try {
      audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;

      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const sampleData = new Uint8Array(analyser.fftSize);

      function updateLevel(frameTime: number) {
        analyser.getByteTimeDomainData(sampleData);

        let sumSquares = 0;
        for (const sample of sampleData) {
          const centeredSample = (sample - 128) / 128;
          sumSquares += centeredSample * centeredSample;
        }

        const rootMeanSquare = Math.sqrt(sumSquares / sampleData.length);
        const nextLevel = Math.min(1, rootMeanSquare * 3.4);

        if (frameTime - lastStateUpdateAt > 48) {
          lastStateUpdateAt = frameTime;
          setLevel((currentLevel) => currentLevel * 0.68 + nextLevel * 0.32);
        }

        animationFrame = window.requestAnimationFrame(updateLevel);
      }

      const startMeter = () => {
        if (!isDisposed) {
          animationFrame = window.requestAnimationFrame(updateLevel);
        }
      };

      if (audioContext.state === "suspended") {
        void audioContext.resume().then(startMeter).catch(() => {
          // Audio metering is optional; recording continues if analysis fails.
        });
      } else {
        startMeter();
      }
    } catch {
      // Audio metering is optional; recording continues if analysis fails.
    }

    return () => {
      isDisposed = true;

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      source?.disconnect();
      void audioContext?.close().catch(() => undefined);
    };
  }, [isActive, stream]);

  const barMultipliers = [0.46, 0.72, 1, 0.72, 0.46];
  const displayLevel = isActive && stream ? level : 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[18%] left-1/2 flex -translate-x-1/2 items-end gap-1.5"
    >
      {barMultipliers.map((multiplier, index) => {
        const barLevel = Math.max(0.12, displayLevel * multiplier);

        return (
          <span
            key={`${multiplier}-${index}`}
            className="w-1.5 rounded-full bg-white/90 shadow-[0_3px_8px_rgb(7_50_71/0.12)] transition-[height,opacity] duration-75 ease-out"
            style={{
              height: `${0.45 + barLevel * 1.65}rem`,
              opacity: 0.62 + barLevel * 0.38,
            }}
          />
        );
      })}
    </div>
  );
}

function SpeakingView({
  challenge,
  phase,
  audioUrl,
  audioMeterStream,
  backHref,
  backLabel,
  isTimerPaused,
  onBackRequest,
  errorMessage,
  isPreparingRecording,
  isStoppingRecording,
  planningSeconds,
  progress,
  secondsLeft,
  speakingSeconds,
  onStart,
  onStop,
  onSubmit,
  onTryAgain,
}: SpeakingViewProps) {
  const isRecordingPhase = phase === "recording";
  const isStoppedPhase = phase === "stopped";
  const staticProgress = clampProgress(
    phase === "recording"
      ? progress
      : phase === "stopped"
        ? 100
        : 0,
  );

  const helperText =
    isPreparingRecording
      ? "Opening your microphone. Your recording stays only on this device."
      : isStoppingRecording
        ? "Saving your replay on this device."
      : phase === "recording"
      ? null
      : phase === "stopped"
        ? "Listen back once, then submit when you are ready."
        : `Planning is done. You have ${speakingSeconds} seconds to speak your answer out loud.`;

  return (
    <section
      className={
        isRecordingPhase || isStoppedPhase
          ? "vocali-session-timed"
          : "flex min-h-dvh flex-col px-5 pb-7 pt-6 sm:min-h-[860px]"
      }
    >
      <PracticeHeader
        backHref={backHref}
        backLabel={backLabel}
        onBackRequest={onBackRequest}
      />

      <div
        className={
          isRecordingPhase || isStoppedPhase
            ? "vocali-session-prompt-card bg-white shadow-vocali-card"
            : "mt-8 rounded-[2rem] bg-white p-5 shadow-vocali-card"
        }
      >
        <div className="vocali-session-chip-row flex flex-wrap">
          <span className="vocali-session-chip vocali-session-chip--teal">
            Daily 60-second prompt
          </span>
          <span className="vocali-session-chip vocali-session-chip--orange">
            {planningSeconds} sec plan
          </span>
          <span className="vocali-session-chip vocali-session-chip--teal">
            {speakingSeconds} sec speak
          </span>
        </div>

        <p className="vocali-session-eyebrow font-black uppercase tracking-[0.12em] text-vocali-muted">
          Speaking prompt
        </p>
        <h1 className="vocali-session-prompt-title font-black tracking-[-0.04em] text-vocali-teal-deep">
          {challenge.prompt}
        </h1>
      </div>

      <div
        className={
          isRecordingPhase || isStoppedPhase
            ? "vocali-session-center"
            : "flex flex-1 flex-col items-center justify-center py-8 text-center"
        }
      >
        {isStoppedPhase ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-vocali-teal/12 text-vocali-teal">
            <CheckCircle2 className="h-8 w-8" strokeWidth={3} />
          </div>
        ) : (
          <>
            <div className="vocali-recording-stage relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#E2F3EF]/70" />
              <SmoothTimerRing
                color="#00A7A5"
                outerClassName="vocali-recording-ring absolute rounded-full bg-[#E2F3EF] shadow-[inset_0_0_0_1px_rgb(0_167_165/0.12)]"
                staticProgress={staticProgress}
                trackColor="#E2F3EF"
              />
              <button
                type="button"
                onClick={phase === "recording" ? onStop : onStart}
                disabled={isPreparingRecording || isStoppingRecording}
                aria-label={
                  phase === "recording" ? "Stop recording answer" : "Record answer"
                }
                className={
                  phase === "recording"
                    ? "vocali-recording-button relative flex items-center justify-center rounded-full bg-vocali-orange text-white shadow-[0_18px_34px_rgb(255_122_26/0.24)]"
                    : "vocali-recording-button relative flex items-center justify-center rounded-full bg-vocali-orange text-white shadow-[0_18px_34px_rgb(255_122_26/0.24)] disabled:bg-vocali-teal"
                }
              >
              {phase === "recording" ? (
                <>
                  <Square className="mb-6 h-[clamp(2.2rem,7dvh,3rem)] w-[clamp(2.2rem,7dvh,3rem)] fill-white" />
                  <SoundLevelMeter
                    isActive={!isStoppingRecording && !isTimerPaused}
                    stream={audioMeterStream}
                  />
                </>
              ) : (
                  <Mic className="h-[clamp(2.7rem,8dvh,4rem)] w-[clamp(2.7rem,8dvh,4rem)]" strokeWidth={3} />
                )}
              </button>
            </div>

            <p className="vocali-timer-number font-black tracking-[-0.06em] text-vocali-teal-deep">
              {secondsLeft}
            </p>
          </>
        )}
        <p className={`vocali-session-status text-base font-black text-vocali-teal ${isStoppedPhase ? "mt-2" : "mt-1"}`}>
          {isPreparingRecording
            ? "Opening mic"
            : isStoppingRecording
              ? "Preparing replay"
            : phase === "recording"
            ? "Recording"
            : phase === "stopped"
              ? "Attempt ready"
              : "Ready to speak"}
        </p>
        {helperText && !isStoppedPhase ? (
          <p className="vocali-session-helper mt-2 max-w-xs text-sm font-bold leading-5 text-vocali-muted">
            {helperText}
          </p>
        ) : null}
        {errorMessage ? (
          <div className="mt-5 rounded-[1.25rem] border-2 border-vocali-orange/30 bg-white p-4 text-left shadow-[0_10px_24px_rgb(7_50_71/0.08)]">
            <p className="text-sm font-black text-vocali-orange">
              Recording needs attention
            </p>
            <p className="mt-1 text-sm font-bold leading-5 text-vocali-muted">
              {errorMessage}
            </p>
          </div>
        ) : null}
      </div>

      <SpeakingActions
        phase={phase}
        audioUrl={audioUrl}
        isPreparingRecording={isPreparingRecording}
        isStoppingRecording={isStoppingRecording}
        onStart={onStart}
        onStop={onStop}
        onSubmit={onSubmit}
        onTryAgain={onTryAgain}
      />
    </section>
  );
}

type SpeakingActionsProps = {
  phase: PracticePhase;
  audioUrl: string | null;
  isPreparingRecording: boolean;
  isStoppingRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onSubmit: () => void;
  onTryAgain: () => void;
};

function SpeakingActions({
  phase,
  audioUrl,
  isPreparingRecording,
  isStoppingRecording,
  onStart,
  onStop,
  onSubmit,
  onTryAgain,
}: SpeakingActionsProps) {
  if (phase === "stopped") {
    return (
      <div className="vocali-speaking-actions space-y-2.5">
        {audioUrl ? (
          <div className="vocali-replay-card rounded-[1rem] bg-white p-3 shadow-[0_10px_24px_rgb(7_50_71/0.08)]">
            <p className="mb-2 text-sm font-black text-vocali-teal-deep">
              Your recording
            </p>
            <audio controls src={audioUrl} className="w-full" />
            <p className="vocali-replay-helper mt-2 text-xs font-bold leading-4 text-vocali-muted">
              Listen back once, then submit when you&apos;re ready.
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onTryAgain}
            className="flex h-12 items-center justify-center gap-2 rounded-[0.9rem] border-2 border-vocali-teal bg-white px-3 text-sm font-black text-vocali-teal"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex h-12 items-center justify-center gap-2 rounded-[0.9rem] bg-vocali-orange px-3 text-sm font-black text-white shadow-[0_12px_24px_rgb(255_122_26/0.24)]"
          >
            <Send className="h-4 w-4" />
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={phase === "recording" ? onStop : onStart}
      disabled={isPreparingRecording || isStoppingRecording}
      className={
        phase === "recording"
          ? "vocali-session-action flex w-full items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.24)]"
          : "flex h-16 w-full items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)] disabled:opacity-70"
      }
    >
      {phase === "recording" ? (
        <>
          <Square className="h-6 w-6" strokeWidth={3} />
          {isStoppingRecording ? "Preparing replay..." : "Stop attempt"}
        </>
      ) : (
        <>
          <Mic className="h-6 w-6" strokeWidth={3} />
          {isPreparingRecording ? "Opening mic..." : "Start recording"}
        </>
      )}
    </button>
  );
}

function TranscribingView({
  backHref,
  backLabel,
  isBackDisabled = false,
}: {
  backHref: string;
  backLabel: string;
  isBackDisabled?: boolean;
}) {
  return (
    <section className="flex min-h-dvh flex-col px-5 pb-7 pt-6 sm:min-h-[860px]">
      <PracticeHeader
        backHref={backHref}
        backLabel={backLabel}
        isBackDisabled={isBackDisabled}
      />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-white shadow-vocali-card">
          <div className="absolute inset-5 animate-pulse rounded-full bg-vocali-teal/12" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-vocali-teal text-white shadow-[0_18px_35px_rgb(0_167_165/0.24)]">
            <Mic className="h-12 w-12" strokeWidth={3} />
          </div>
        </div>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.14em] text-vocali-teal">
          Preparing transcript
        </p>
        <h1 className="mt-2 text-[2.35rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
          Turning your recording into text.
        </h1>
        <p className="mt-4 max-w-xs text-base font-bold leading-6 text-vocali-muted">
          Your audio is being sent for transcription only. Vocali will still
          show limited feedback if this step fails.
        </p>
      </div>
    </section>
  );
}

type FeedbackViewProps = {
  actualDurationSeconds?: number;
  audioBlob: Blob | null;
  backHref: string;
  backLabel: string;
  challenge: Challenge;
  isDailyChallenge: boolean;
  onTryAgain: () => void;
  speakingSeconds: number;
  speakingMetrics?: SpeakingMetrics;
  transcript?: string;
  transcriptStatus: TranscriptStatus;
  transcriptionError: string | null;
};

function FeedbackView({
  actualDurationSeconds,
  audioBlob,
  backHref,
  backLabel,
  challenge,
  isDailyChallenge,
  onTryAgain,
  speakingSeconds,
  speakingMetrics,
  transcript,
  transcriptStatus,
  transcriptionError,
}: FeedbackViewProps) {
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  const hasSavedAttemptRef = useRef(false);
  const measuredInsights = speakingMetrics
    ? getFeedbackInsights(speakingMetrics)
    : null;
  const feedbackRows: Array<{
    breakdown?: string | null;
    signal: FeedbackSignal;
    title: string;
  }> = (measuredInsights?.feedbackRows ?? getLimitedFeedbackRows(mockDailyFeedback)).map(
    (row) => ({
      ...row,
      breakdown:
        row.type === "filler"
          ? getFillerBreakdownText(speakingMetrics)
          : row.type === "repetition"
            ? getRepetitionBreakdownText(speakingMetrics)
            : null,
    }),
  );
  const nextAction = measuredInsights?.nextAction ?? mockDailyFeedback.nextAction;

  async function finishPractice() {
    if (hasSavedAttemptRef.current) {
      router.push("/home");
      return;
    }

    setIsFinishing(true);

    if (!hasSavedAttemptRef.current) {
      hasSavedAttemptRef.current = true;
      const attemptId = createAttemptId();
      const todayKey = getTodayKey();
      const shouldShowStreakCelebration =
        !getTodayAttempt(getAttempts());
      const hasLocalRecording = audioBlob
        ? await saveRecording(attemptId, audioBlob)
        : false;

      saveAttempt({
        id: attemptId,
        challengeId: challenge.id,
        prompt: challenge.prompt,
        category: challenge.category,
        completedAt: new Date().toISOString(),
        speakingDurationSeconds: speakingSeconds,
        actualDurationSeconds,
        feedback: measuredInsights?.feedback ?? mockDailyFeedback,
        nextAction,
        label: measuredInsights?.attemptLabel ?? "Limited feedback",
        hasLocalRecording,
        recordingId: hasLocalRecording ? attemptId : undefined,
        transcript,
        transcriptStatus,
        speakingMetrics,
        isDailyChallenge,
        dailyChallengeDate: isDailyChallenge ? todayKey : undefined,
        source: isDailyChallenge ? "daily" : "practice",
      });

      if (shouldShowStreakCelebration) {
        queueStreakCelebration({
          attemptId,
          dateKey: todayKey,
        });
        router.push("/streak");
        return;
      }
    }

    router.push("/home");
  }

  return (
    <section className="flex min-h-dvh flex-col px-5 pb-7 pt-6 sm:min-h-[860px]">
      <PracticeHeader backHref={backHref} backLabel={backLabel} />

      <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-vocali-card">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-vocali-teal/12 text-vocali-teal">
            <CheckCircle2 className="h-11 w-11" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-vocali-muted">
              Speaking snapshot
            </p>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-vocali-teal-deep">
              Your feedback
            </h1>
          </div>
        </div>

        <p className="mt-5 text-base font-bold leading-6 text-vocali-muted">
          {speakingMetrics
            ? "Measured from your transcript and recording time. No grades, just useful signals for the next attempt."
            : "Detailed feedback was limited for this attempt, so these are gentle practice notes rather than measured judgements."}
        </p>

        {transcript ? (
          <div className="mt-5 rounded-[1.25rem] bg-vocali-cream/70 p-4">
            <p className="text-sm font-black uppercase tracking-[0.1em] text-vocali-muted">
              Transcript
            </p>
            <ExpandableTranscript transcript={transcript} />
          </div>
        ) : transcriptionError ? (
          <div className="mt-5 rounded-[1.25rem] border border-vocali-orange/25 bg-vocali-orange/8 p-4">
            <p className="text-sm font-black text-vocali-orange">
              Transcript skipped
            </p>
            <p className="mt-1 text-sm font-semibold leading-5 text-vocali-muted">
              {transcriptionError}
            </p>
          </div>
        ) : null}

        {speakingMetrics && measuredInsights ? (
          <MetricsSnapshot
            metrics={speakingMetrics}
            timeUsedContext={measuredInsights.timeUsedContext}
          />
        ) : null}

        <div className="mt-6 space-y-3">
          {feedbackRows.map(({ breakdown, signal, title }) => (
            <div
              key={title}
              className="rounded-[1.25rem] border border-vocali-border/70 bg-vocali-cream/55 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.1em] text-vocali-muted">
                  {title}
                </p>
                <span className="shrink-0 rounded-full bg-vocali-teal/12 px-3 py-1 text-xs font-black text-vocali-teal">
                  {signal.label}
                </span>
              </div>
              <p className="mt-2 text-base font-bold leading-6 text-vocali-teal-deep">
                {signal.note}
              </p>
              {breakdown ? (
                <p className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-black leading-4 text-vocali-muted">
                  {breakdown}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[1.75rem] bg-vocali-teal-deep p-5 text-white shadow-[0_20px_45px_rgb(7_50_71/0.16)]">
        <p className="text-sm font-black text-[#8be4dd]">Try next</p>
        <p className="mt-2 text-xl font-black leading-7">
          {nextAction}
        </p>
        <p className="mt-3 text-sm font-bold leading-5 text-white/70">
          Keep the next attempt simple. One small adjustment is enough.
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-7">
        <button
          type="button"
          onClick={onTryAgain}
          className="flex h-16 items-center justify-center rounded-[1.2rem] border-2 border-vocali-teal bg-white text-lg font-black text-vocali-teal"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={finishPractice}
          disabled={isFinishing}
          className="flex h-16 items-center justify-center rounded-[1.2rem] bg-vocali-orange text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)]"
        >
          {isFinishing ? "Saving..." : "Finish"}
        </button>
      </div>
    </section>
  );
}

function MetricsSnapshot({
  metrics,
  timeUsedContext,
}: {
  metrics: SpeakingMetrics;
  timeUsedContext: string;
}) {
  const metricItems = [
    {
      label: "Words",
      value: `${metrics.wordCount}`,
      note: "spoken",
    },
    {
      label: "Pace",
      value: `${metrics.wordsPerMinute}`,
      note: "words/min",
    },
    {
      label: "Fillers",
      value: `${metrics.fillerWordCount}`,
      note: "noticed",
    },
  ];

  return (
    <div className="mt-5 rounded-[1.25rem] border border-vocali-border/70 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.1em] text-vocali-muted">
          Speaking metrics
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {metricItems.map((item) => (
          <div
            key={item.label}
            className="rounded-[1rem] bg-vocali-cream/70 p-3 text-center"
          >
            <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-vocali-muted">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-vocali-teal-deep">
              {item.value}
            </p>
            <p className="text-[0.68rem] font-bold text-vocali-muted">
              {item.note}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-vocali-muted">
        {timeUsedContext}
      </p>
    </div>
  );
}
