import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AuthenticatedSupabaseRequest = {
  accessToken: string;
  client: SupabaseClient;
  user: User;
};

export type ServerAuthResult =
  | { ok: true; auth: AuthenticatedSupabaseRequest }
  | { ok: false; status: 401 | 503 };

function getSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return url && anonKey ? { anonKey, url } : null;
}

export async function authenticateSupabaseRequest(
  request: Request,
): Promise<ServerAuthResult> {
  const configuration = getSupabaseConfiguration();

  if (!configuration) {
    return { ok: false, status: 503 };
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  if (!match?.[1]) {
    return { ok: false, status: 401 };
  }

  const accessToken = match[1].trim();
  const client = createClient(configuration.url, configuration.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    return { ok: false, status: 401 };
  }

  return {
    ok: true,
    auth: { accessToken, client, user: data.user },
  };
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
