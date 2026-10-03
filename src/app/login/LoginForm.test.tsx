// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ signup: vi.fn(), login: vi.fn(), reset: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("@/components/layout/ScreenFrame", () => ({ ScreenFrame: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/brand/VocaliLogo", () => ({ VocaliLogo: () => null }));
vi.mock("@/lib/userPreferences", () => ({ defaultUserPreferences: {}, saveUserPreferences: vi.fn() }));
vi.mock("@/lib/authStore", () => ({
  useAuth: () => ({ isReady: true, user: null }), isNativeAppleSignInAvailable: () => false,
  signUpWithEmail: mocks.signup, signInWithEmail: mocks.login, requestPasswordReset: mocks.reset,
  signInWithApple: vi.fn(), signInWithGoogle: vi.fn(),
}));
vi.mock("@/components/auth/TurnstileChallenge", () => ({
  TurnstileChallenge: ({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) => <div>
    <button type="button" onClick={() => onToken(`token-${resetKey}`)}>Verify security</button>
    <button type="button" onClick={() => onToken(null)}>Expire security</button>
  </div>,
}));
import { LoginForm } from "./LoginForm";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signup.mockResolvedValue({ ok: false, error: "Security check rejected. Please try again." });
  mocks.login.mockResolvedValue({ ok: false, error: "Invalid login credentials" });
  mocks.reset.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

function fillSignup() {
  fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), { target: { value: "Sam" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "sam@example.com" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("Confirm password", { exact: true }), { target: { value: "password123" } });
}

describe("email CAPTCHA", () => {
  it("requires a token, preserves signup destination and fields, and renews a consumed token", async () => {
    render(<LoginForm initialMode="signup" redirectPath="/paywall?redirect=%2Fhome" />);
    fillSignup();
    const submit = screen.getByRole("button", { name: "Create account" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.submit(submit.closest("form")!);
    expect(mocks.signup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Verify security"));
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByText(/Security check rejected/)).toBeTruthy());
    expect(mocks.signup).toHaveBeenCalledWith({ displayName: "Sam", email: "sam@example.com", password: "password123", captchaToken: "token-0", redirectPath: "/paywall?redirect=%2Fhome" });
    expect(submit.disabled).toBe(true);
    expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe("sam@example.com");
    mocks.signup.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByText("Verify security"));
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Check your email" })).toBeTruthy());
    expect(mocks.signup.mock.calls[1][0].captchaToken).toBe("token-1");
  });

  it("invalidates expired and mode-switched tokens and supplies a fresh token for recovery", async () => {
    render(<LoginForm initialMode="login" redirectPath="/home" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "sam@example.com" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Verify security"));
    fireEvent.click(screen.getByText("Expire security"));
    expect((screen.getByRole("button", { name: "Log in" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("Verify security"));
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith({ email: "sam@example.com", password: "password123", captchaToken: "token-0" }));
    await waitFor(() => expect(screen.getByText("Invalid login credentials")).toBeTruthy());
    fireEvent.click(screen.getByText("Verify security"));
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledWith("sam@example.com", "token-1"));
    await waitFor(() => expect(screen.getByText(/reset link is on its way/)).toBeTruthy());
    fireEvent.click(screen.getByText("Verify security"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect((screen.getByRole("button", { name: "Create account" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
