import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261002084457_guest_trial_subscription_access.sql"),
  "utf8",
);

describe("guest trial database migration", () => {
  it("denies anonymous profile and attempt access in every ownership policy", () => {
    expect(migration.match(/create policy /g)).toHaveLength(8);
    expect(migration.match(/auth\.jwt\(\)->>'is_anonymous'/g)).toHaveLength(11);
  });

  it("keeps one atomic lifetime transcription for anonymous users", () => {
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(migration).toContain("if is_anonymous_user then");
    expect(migration).toContain("if lifetime_count >= 1 then");
    expect(migration).toContain("'guest'::text");
  });

  it("schedules fallback removal of anonymous users older than 30 days", () => {
    expect(migration).toContain("create extension if not exists pg_cron");
    expect(migration).toContain("vocali-cleanup-anonymous-users");
    expect(migration).toContain("is_anonymous is true");
    expect(migration).toContain("interval '30 days'");
  });
});
