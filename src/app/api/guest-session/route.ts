export const runtime = "nodejs";

import { authenticateSupabaseRequest, createSupabaseAdminClient } from "@/lib/supabaseServer";

export async function DELETE(request: Request) {
  const authResult = await authenticateSupabaseRequest(request);

  if (!authResult.ok) {
    return Response.json(
      { error: authResult.status === 503 ? "Account services are unavailable." : "Authentication required." },
      { status: authResult.status },
    );
  }

  if (authResult.auth.user.is_anonymous !== true) {
    return Response.json(
      { error: "Only temporary guest sessions can be removed here." },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    return Response.json({ error: "Account services are unavailable." }, { status: 503 });
  }

  const { error } = await admin.auth.admin.deleteUser(authResult.auth.user.id);

  if (error) {
    console.error("Guest account cleanup failed", {
      error: error.message,
      userId: authResult.auth.user.id,
    });
    return Response.json({ error: "Guest cleanup will be retried automatically." }, { status: 503 });
  }

  return Response.json({ deleted: true });
}
