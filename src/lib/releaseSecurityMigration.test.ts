import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202607180001_release_security.sql",
  ),
  "utf8",
);

describe("release security migration", () => {
  it("enforces ownership policies for user-controlled data", () => {
    expect(migration).toContain("alter table public.profiles enable row level security");
    expect(migration).toContain(
      "alter table public.practice_attempts enable row level security",
    );
    expect(migration).toContain("using (id = auth.uid())");
    expect(migration).toContain("using (user_id = auth.uid())");
    expect(migration).toContain("with check (user_id = auth.uid())");
  });

  it("keeps sensitive server tables inaccessible to clients", () => {
    expect(migration).toContain(
      "revoke all on public.transcription_requests from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on public.apple_auth_tokens from anon, authenticated",
    );
  });

  it("serializes quota reservations per user", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("minute_count >= minute_limit");
    expect(migration).toContain("daily_count >= daily_limit");
    expect(migration).toContain(
      "grant execute on function public.reserve_transcription_request",
    );
  });
});
