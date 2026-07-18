export const runtime = "nodejs";

import {
  encryptAppleRefreshToken,
  exchangeAppleAuthorizationCode,
} from "@/lib/appleTokens";
import {
  authenticateSupabaseRequest,
  createSupabaseAdminClient,
} from "@/lib/supabaseServer";

type ExchangeRequest = { authorizationCode?: unknown };

export async function POST(request: Request) {
  const authResult = await authenticateSupabaseRequest(request);

  if (!authResult.ok) {
    return Response.json(
      {
        ok: false,
        error:
          authResult.status === 503
            ? "Account services are temporarily unavailable."
            : "Please sign in again.",
      },
      { status: authResult.status },
    );
  }

  let body: ExchangeRequest;

  try {
    body = (await request.json()) as ExchangeRequest;
  } catch {
    return Response.json(
      { ok: false, error: "The Apple authorization code was not provided." },
      { status: 400 },
    );
  }

  const authorizationCode =
    typeof body.authorizationCode === "string"
      ? body.authorizationCode.trim()
      : "";

  if (!authorizationCode) {
    return Response.json(
      { ok: false, error: "The Apple authorization code was not provided." },
      { status: 400 },
    );
  }

  const appleIdentity = authResult.auth.user.identities?.find(
    (identity) => identity.provider === "apple",
  );
  const identitySubject =
    typeof appleIdentity?.identity_data?.sub === "string"
      ? appleIdentity.identity_data.sub
      : null;

  if (!identitySubject) {
    return Response.json(
      { ok: false, error: "The signed-in account is not an Apple account." },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    return Response.json(
      { ok: false, error: "Account services are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const exchangedToken =
      await exchangeAppleAuthorizationCode(authorizationCode);

    if (exchangedToken.subject !== identitySubject) {
      return Response.json(
        { ok: false, error: "The Apple authorization did not match this account." },
        { status: 403 },
      );
    }

    const { error } = await admin.from("apple_auth_tokens").upsert({
      user_id: authResult.auth.user.id,
      encrypted_refresh_token: encryptAppleRefreshToken(
        exchangedToken.refreshToken,
      ),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Apple authorization storage failed", {
      error: error instanceof Error ? error.message : String(error),
      userId: authResult.auth.user.id,
    });

    return Response.json(
      { ok: false, error: "Apple account setup could not be completed." },
      { status: 502 },
    );
  }
}
