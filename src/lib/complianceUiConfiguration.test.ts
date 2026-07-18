import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("App Store compliance UI", () => {
  it("provides password recovery and password management", () => {
    const login = readRepositoryFile("src/app/login/LoginForm.tsx");
    const settings = readRepositoryFile("src/app/settings/page.tsx");
    const resetPassword = readRepositoryFile(
      "src/app/reset-password/page.tsx",
    );

    expect(login).toContain("Forgot password?");
    expect(login).toContain("requestPasswordReset");
    expect(settings).toContain('href="/reset-password"');
    expect(resetPassword).toContain("updatePassword");
  });

  it("requires the exact destructive account deletion confirmation", () => {
    const settings = readRepositoryFile("src/app/settings/page.tsx");
    const accountRoute = readRepositoryFile("src/app/api/account/route.ts");

    expect(settings).toContain('deleteConfirmation !== "DELETE"');
    expect(settings).toContain("Delete account permanently");
    expect(accountRoute).toContain('body.confirmation !== "DELETE"');
    expect(settings).toContain("clearAllLocalVocaliData");
  });

  it("keeps privacy and support public and configuration-driven", () => {
    const privacy = readRepositoryFile("src/app/privacy/page.tsx");
    const support = readRepositoryFile("src/app/support/page.tsx");

    expect(privacy).toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
    expect(support).toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
    expect(privacy).toContain("OpenAI");
    expect(privacy).toContain("Supabase");
    expect(support).toContain("mailto:");
  });
});
