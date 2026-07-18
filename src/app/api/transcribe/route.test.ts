import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateSupabaseRequest } = vi.hoisted(() => ({
  authenticateSupabaseRequest: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({ authenticateSupabaseRequest }));

import { POST } from "./route";

function createAuthenticatedResult(
  quota: { allowed: boolean; [key: string]: unknown } = { allowed: true },
) {
  return {
    ok: true as const,
    auth: {
      accessToken: "access-token",
      client: {
        rpc: vi.fn().mockResolvedValue({ data: [quota], error: null }),
      },
      user: { id: "user-1" },
    },
  };
}

function createAudioRequest(size = 4, type = "audio/webm") {
  const formData = new FormData();
  formData.append(
    "audio",
    new File([new Uint8Array(size)], "recording.webm", { type }),
  );

  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    headers: { Authorization: "Bearer access-token" },
    body: formData,
  });
}

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    authenticateSupabaseRequest.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it("rejects unauthenticated requests", async () => {
    authenticateSupabaseRequest.mockResolvedValue({ ok: false, status: 401 });

    const response = await POST(createAudioRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      errorCode: "not_authenticated",
      transcriptStatus: "failed",
    });
  });

  it("rejects unsupported audio before reserving provider capacity", async () => {
    const auth = createAuthenticatedResult();
    authenticateSupabaseRequest.mockResolvedValue(auth);

    const response = await POST(createAudioRequest(4, "text/plain"));

    expect(response.status).toBe(400);
    expect(auth.auth.client.rpc).not.toHaveBeenCalled();
  });

  it("returns quota details and Retry-After", async () => {
    authenticateSupabaseRequest.mockResolvedValue(
      createAuthenticatedResult({
        allowed: false,
        limit_reason: "minute",
        retry_after_seconds: 27,
      }),
    );

    const response = await POST(createAudioRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("27");
    await expect(response.json()).resolves.toMatchObject({
      errorCode: "quota_exceeded",
    });
  });

  it("maps provider failures to a safe 502 response", async () => {
    authenticateSupabaseRequest.mockResolvedValue(createAuthenticatedResult());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "secret detail" } }), {
          status: 403,
        }),
      ),
    );

    const response = await POST(createAudioRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ errorCode: "provider_unavailable" });
    expect(JSON.stringify(body)).not.toContain("secret detail");
  });

  it("returns a transcript for an authenticated request within quota", async () => {
    authenticateSupabaseRequest.mockResolvedValue(createAuthenticatedResult());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ text: "A clear practice response." }),
      ),
    );

    const response = await POST(createAudioRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      transcript: "A clear practice response.",
      transcriptStatus: "ready",
    });
  });
});
