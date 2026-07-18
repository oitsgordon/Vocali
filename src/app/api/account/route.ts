export const runtime = "nodejs";

import {
  decryptAppleRefreshToken,
  revokeAppleRefreshToken,
} from "@/lib/appleTokens";
import {
  authenticateSupabaseRequest,
  createSupabaseAdminClient,
} from "@/lib/supabaseServer";

export async function DELETE(request: Request) {
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

  let body: { confirmation?: unknown };

  try {
    body = (await request.json()) as { confirmation?: unknown };
  } catch {
    body = {};
  }

  if (body.confirmation !== "DELETE") {
    return Response.json(
      { ok: false, error: "Type DELETE to confirm permanent account deletion." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    return Response.json(
      { ok: false, error: "Account services are temporarily unavailable." },
      { status: 503 },
    );
  }

  const user = authResult.auth.user;
  const hasAppleIdentity = Boolean(
    user.identities?.some((identity) => identity.provider === "apple"),
  );
  let manualAppleRevocationRequired = false;

  if (hasAppleIdentity) {
    const { data: tokenRow, error: tokenError } = await admin
      .from("apple_auth_tokens")
      .select("encrypted_refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError || !tokenRow?.encrypted_refresh_token) {
      manualAppleRevocationRequired = true;
    } else {
      try {
        await revokeAppleRefreshToken(
          decryptAppleRefreshToken(tokenRow.encrypted_refresh_token),
        );
      } catch (error) {
        manualAppleRevocationRequired = true;
        console.error("Apple token revocation failed during account deletion", {
          error: error instanceof Error ? error.message : String(error),
          userId: user.id,
        });
      }
    }
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(
    user.id,
    false,
  );

  if (deletionError) {
    console.error("Supabase account deletion failed", {
      error: deletionError.message,
      userId: user.id,
    });

    return Response.json(
      { ok: false, error: "Your account could not be deleted. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, manualAppleRevocationRequired });
}
