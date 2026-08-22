import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260822013226_supabase_security_cleanup.sql",
  ),
  "utf8",
);

const databaseTests = readFileSync(
  resolve(
    process.cwd(),
    "supabase/tests/supabase_security_cleanup_test.sql",
  ),
  "utf8",
);

describe("Supabase security cleanup migration", () => {
  it("normalizes ownership policies around cached authenticated identity", () => {
    expect(migration).toContain("policyname ilike '%own%'");
    expect(migration.match(/create policy /g)).toHaveLength(8);
    expect(migration.match(/to authenticated\r?\n/g)).toHaveLength(8);
    expect(migration).toContain("using ((select auth.uid()) = id)");
    expect(migration).toContain("with check ((select auth.uid()) = id)");
    expect(migration).toContain("using ((select auth.uid()) = user_id)");
    expect(migration).toContain("with check ((select auth.uid()) = user_id)");
  });

  it("preserves server-only table isolation", () => {
    expect(migration).toContain(
      "revoke all on table public.apple_auth_tokens from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.transcription_requests from anon, authenticated",
    );
    expect(migration).not.toMatch(
      /create policy[\s\S]+on public\.(apple_auth_tokens|transcription_requests)/,
    );
  });

  it("hardens quota reservation without changing its API contract", () => {
    expect(migration).toContain(
      "public.reserve_transcription_request(integer, integer)",
    );
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("minute_limit is distinct from 5");
    expect(migration).toContain("daily_limit is distinct from 20");
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to authenticated");
  });

  it("ships database tests for authorization, ownership, quota, and locking", () => {
    expect(databaseTests).toContain("cross-user profiles are hidden");
    expect(databaseTests).toContain(
      "practice-attempt ownership cannot be reassigned on update",
    );
    expect(databaseTests).toContain(
      "anonymous callers cannot reserve transcription quota",
    );
    expect(databaseTests).toContain(
      "an authenticated user can reserve quota with deployed limits",
    );
    expect(databaseTests).toContain(
      "caller-supplied minute limits are rejected",
    );
    expect(databaseTests).toContain(
      "quota reservations retain the per-user transaction lock",
    );
    expect(databaseTests).toContain(
      "authenticated callers cannot read transcription requests directly",
    );
  });
});
