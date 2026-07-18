export const runtime = "nodejs";

import { authenticateSupabaseRequest } from "@/lib/supabaseServer";

const maxAudioSizeBytes = 10 * 1024 * 1024;
const minuteTranscriptionLimit = 5;
const dailyTranscriptionLimit = 20;
const defaultTranscriptionModel = "gpt-4o-mini-transcribe";
const supportedAudioTypes = new Set([
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/ogg",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
]);

type TranscriptionResponse = {
  transcript: string;
  transcriptStatus: "ready" | "failed";
  errorCode?:
    | "invalid_audio"
    | "not_authenticated"
    | "provider_unavailable"
    | "quota_exceeded"
    | "service_unavailable";
  error?: string;
};

type OpenAiErrorResponse = {
  error?: {
    code?: unknown;
    message?: unknown;
    type?: unknown;
  };
};

type ParsedOpenAiError = {
  data: OpenAiErrorResponse;
  rawMessage: string;
};

function jsonResponse(body: TranscriptionResponse, status = 200) {
  return Response.json(body, { status });
}

function isAudioFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3";
  }

  if (mimeType.includes("mpga")) {
    return "mpga";
  }

  if (mimeType.includes("m4a")) {
    return "m4a";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

async function parseOpenAiError(response: Response): Promise<ParsedOpenAiError> {
  const rawMessage = await response.text().catch(() => "");

  if (!rawMessage) {
    return { data: {}, rawMessage: "" };
  }

  try {
    return {
      data: JSON.parse(rawMessage) as OpenAiErrorResponse,
      rawMessage,
    };
  } catch {
    return { data: {}, rawMessage };
  }
}

export async function POST(request: Request) {
  const authResult = await authenticateSupabaseRequest(request);

  if (!authResult.ok) {
    const isUnavailable = authResult.status === 503;

    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: isUnavailable
          ? "service_unavailable"
          : "not_authenticated",
        error: isUnavailable
          ? "Account services are temporarily unavailable."
          : "Please sign in again before transcribing.",
      },
      authResult.status,
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "service_unavailable",
        error: "Transcription is not configured yet.",
      },
      503,
    );
  }

  let audioFile: File;

  try {
    const formData = await request.formData();
    const file = formData.get("audio");

    if (!isAudioFile(file)) {
      return jsonResponse(
        {
          transcript: "",
          transcriptStatus: "failed",
          errorCode: "invalid_audio",
          error: "No audio recording was provided.",
        },
        400,
      );
    }

    audioFile = file;
  } catch {
    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "invalid_audio",
        error: "The recording could not be read.",
      },
      400,
    );
  }

  if (audioFile.size === 0 || audioFile.size > maxAudioSizeBytes) {
    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "invalid_audio",
        error: "The recording is too large or empty.",
      },
      400,
    );
  }

  const audioMimeType = audioFile.type.split(";")[0]?.toLowerCase();

  if (audioMimeType && !supportedAudioTypes.has(audioMimeType)) {
    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "invalid_audio",
        error: "This audio format is not supported for transcription yet.",
      },
      400,
    );
  }

  const { data: quotaRows, error: quotaError } = await authResult.auth.client.rpc(
    "reserve_transcription_request",
    {
      daily_limit: dailyTranscriptionLimit,
      minute_limit: minuteTranscriptionLimit,
    },
  );
  const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;

  if (quotaError || !quota || typeof quota.allowed !== "boolean") {
    console.error("Transcription quota check failed", {
      error: quotaError?.message ?? "Invalid quota response",
      userId: authResult.auth.user.id,
    });

    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "service_unavailable",
        error: "Transcription is temporarily unavailable.",
      },
      503,
    );
  }

  if (!quota.allowed) {
    const retryAfter =
      typeof quota.retry_after_seconds === "number"
        ? Math.max(1, Math.ceil(quota.retry_after_seconds))
        : 60;

    return new Response(
      JSON.stringify({
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "quota_exceeded",
        error:
          quota.limit_reason === "daily"
            ? "You have reached today’s transcription limit. Try again tomorrow."
            : "You are transcribing too quickly. Try again shortly.",
      } satisfies TranscriptionResponse),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfter),
        },
      },
    );
  }

  const normalizedMimeType = audioMimeType || "audio/webm";
  const normalizedAudioFile = new File(
    [await audioFile.arrayBuffer()],
    `vocali-recording.${getAudioExtension(normalizedMimeType)}`,
    { type: normalizedMimeType },
  );

  const openAiFormData = new FormData();
  openAiFormData.append("file", normalizedAudioFile);
  openAiFormData.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
      defaultTranscriptionModel,
  );
  openAiFormData.append("response_format", "json");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiFormData,
    });

    if (!response.ok) {
      const parsedError = await parseOpenAiError(response);
      console.error("OpenAI transcription failed", {
        model:
          process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
          defaultTranscriptionModel,
        rawResponse: parsedError.rawMessage,
        status: response.status,
      });

      return jsonResponse(
        {
          transcript: "",
          transcriptStatus: "failed",
          errorCode: "provider_unavailable",
          error: "Transcription is temporarily unavailable. You can still continue with basic feedback.",
        },
        502,
      );
    }

    const data = (await response.json()) as { text?: unknown };
    const transcript = typeof data.text === "string" ? data.text.trim() : "";

    if (!transcript) {
      return jsonResponse(
        {
          transcript: "",
          transcriptStatus: "failed",
          errorCode: "provider_unavailable",
          error: "No transcript was returned.",
        },
        502,
      );
    }

    return jsonResponse({
      transcript,
      transcriptStatus: "ready",
    });
  } catch (error) {
    console.error("OpenAI transcription request failed", {
      error: error instanceof Error ? error.message : String(error),
      model:
        process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
        defaultTranscriptionModel,
    });

    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
        errorCode: "provider_unavailable",
        error: "Transcription failed. You can still continue with basic feedback.",
      },
      502,
    );
  }
}
