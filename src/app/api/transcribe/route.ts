export const runtime = "nodejs";

const maxAudioSizeBytes = 25 * 1024 * 1024;
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

function getTranscriptionErrorMessage({
  status,
  data,
  rawMessage,
}: ParsedOpenAiError & { status: number }) {
  const apiMessage =
    typeof data.error?.message === "string" ? data.error.message : "";
  const code = typeof data.error?.code === "string" ? data.error.code : "";
  const message = apiMessage || rawMessage;
  const lowerMessage = message.toLowerCase();

  if (status === 401) {
    return "The OpenAI API key was rejected. Check your .env.local key and restart the dev server.";
  }

  if (status === 403) {
    return "The OpenAI API key does not have access to this transcription model yet.";
  }

  if (status === 429) {
    return "OpenAI rate limits or billing limits blocked this transcription. Try again shortly.";
  }

  if (
    code.includes("model") ||
    lowerMessage.includes("model") ||
    lowerMessage.includes("does not exist")
  ) {
    return `The selected transcription model was not available for this API key. OpenAI said: ${message}`;
  }

  if (lowerMessage.includes("format")) {
    return `OpenAI could not read the recording format. OpenAI said: ${message}`;
  }

  if (message) {
    return `OpenAI transcription failed: ${message}`;
  }

  return "Transcription could not be completed.";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      {
        transcript: "",
        transcriptStatus: "failed",
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
        error: "This audio format is not supported for transcription yet.",
      },
      400,
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
          error: getTranscriptionErrorMessage({
            status: response.status,
            ...parsedError,
          }),
        },
        response.status >= 500 ? 502 : 400,
      );
    }

    const data = (await response.json()) as { text?: unknown };
    const transcript = typeof data.text === "string" ? data.text.trim() : "";

    if (!transcript) {
      return jsonResponse(
        {
          transcript: "",
          transcriptStatus: "failed",
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
        error: "Transcription failed. You can still continue with mock feedback.",
      },
      502,
    );
  }
}
