// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signup: vi.fn(), login: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ getSupabaseClient: () => ({ auth: {
  signUp: mocks.signup, signInWithPassword: mocks.login, resetPasswordForEmail: mocks.reset,
} }) }));
vi.mock("@/lib/supabaseRemote", () => ({ syncProfilePreferences: vi.fn(), setSupabaseSyncUserId: vi.fn(), fetchRemoteProfile: vi.fn() }));
vi.mock("@/lib/supabaseSync", () => ({ syncSignedInUserData: vi.fn() }));
import { signUpWithEmail, signInWithEmail, requestPasswordReset } from "./authStore";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signup.mockResolvedValue({ data: {}, error: null });
  mocks.login.mockResolvedValue({ error: null });
  mocks.reset.mockResolvedValue({ error: null });
});
describe("Supabase email CAPTCHA transport", () => {
  it("sends CAPTCHA options to signup, password login, and recovery", async () => {
    await signUpWithEmail({ displayName: "Sam", email: "sam@example.com", password: "password123", captchaToken: "signup-token", redirectPath: "/paywall" });
    expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ captchaToken: "signup-token", emailRedirectTo: expect.stringContaining("redirect=%2Fpaywall") }) }));
    await signInWithEmail({ email: "sam@example.com", password: "password123", captchaToken: "login-token" });
    expect(mocks.login).toHaveBeenCalledWith(expect.objectContaining({ options: { captchaToken: "login-token" } }));
    await requestPasswordReset("sam@example.com", "reset-token");
    expect(mocks.reset).toHaveBeenCalledWith("sam@example.com", expect.objectContaining({ captchaToken: "reset-token", redirectTo: expect.stringContaining("%2Freset-password") }));
  });
  it("returns a readable error for rejected CAPTCHA tokens", async () => {
    mocks.signup.mockResolvedValue({ data: {}, error: { message: "captcha protection: request disallowed" } });
    const result = await signUpWithEmail({ displayName: "Sam", email: "sam@example.com", password: "password123", captchaToken: "bad-token" });
    expect(result).toEqual({ ok: false, error: "The security check was not accepted. Complete the new check and try again." });
  });
});
