// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CustomerInfo, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import type { RevenueCatSnapshot } from "@/lib/revenueCat";

const mocks = vi.hoisted(() => ({
  state: {} as RevenueCatSnapshot,
  auth: { isReady: true, user: { id: "test-user" } as { id: string } | null, errorMessage: null, syncMessage: null },
  purchase: vi.fn(), restore: vi.fn(), initialize: vi.fn(), refresh: vi.fn(), replace: vi.fn(), push: vi.fn(), deleteAccount: vi.fn(), signInForGuestTrial: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("@/components/layout/ScreenFrame", () => ({ ScreenFrame: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/brand/VocaliLogo", () => ({ VocaliLogo: () => <span>Vocali</span> }));
vi.mock("@/components/brand/MascotPlaceholder", () => ({ MascotPlaceholder: () => null }));
vi.mock("@/components/auth/AuthGate", () => ({ AuthGate: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/auth/TurnstileChallenge", () => ({
  TurnstileChallenge: ({ onToken }: { onToken: (token: string) => void }) => <button type="button" onClick={() => onToken("captcha-token")}>Complete security check</button>,
}));
vi.mock("@/lib/authStore", () => ({
  useAuth: () => mocks.auth, isNativeAppleSignInAvailable: () => false, deleteAccount: mocks.deleteAccount,
  signInWithApple: vi.fn(), signInWithGoogle: vi.fn(), signInWithEmail: vi.fn(), signUpWithEmail: vi.fn(), requestPasswordReset: vi.fn(), signOut: vi.fn(), signInForGuestTrial: mocks.signInForGuestTrial,
}));
vi.mock("@/lib/revenueCat", () => ({
  useRevenueCat: () => mocks.state,
  getRevenueCatPackage: (plan: string) => mocks.state.offering?.availablePackages.find((p) => p.identifier === plan) ?? null,
  purchaseRevenueCatPlan: mocks.purchase, restoreRevenueCatPurchases: mocks.restore,
  initializeRevenueCat: mocks.initialize, refreshSubscriptionInformation: mocks.refresh, trackVocaliPaywallImpression: vi.fn(),
}));
vi.mock("@/lib/useUserPreferences", () => ({ useUserPreferences: () => ({ hasLoadedPreferences: true, preferences: { displayName: "Test", focusArea: "Speaking more naturally", dailyGoal: "1 short prompt" }, savePreferences: vi.fn() }) }));
vi.mock("@/lib/localDataCleanup", () => ({ clearAllLocalVocaliData: vi.fn() }));
vi.mock("@/lib/attemptStorage", () => ({ clearAttempts: vi.fn() }));
vi.mock("@/lib/recordingStorage", () => ({ clearRecordings: vi.fn() }));

import { SubscriptionScreen } from "./SubscriptionScreen";
import { SubscriptionControls } from "./SubscriptionControls";
import { PaywallScreen } from "@/components/paywall/PaywallScreen";
import { LoginForm } from "@/app/login/LoginForm";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { PublicPageLinks } from "@/components/shared/PublicPageLinks";
import SettingsPage from "@/app/settings/page";

const packages = [
  { identifier: "annual", product: { identifier: "yearly", priceString: "A$69.99", subscriptionPeriod: "P1Y", introPrice: null } },
  { identifier: "monthly", product: { identifier: "monthly", priceString: "A$9.99", subscriptionPeriod: "P1M", introPrice: null } },
] as PurchasesPackage[];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.isReady = true;
  mocks.auth.user = { id: "test-user" };
  mocks.state = {
    status: "ready", customerStatus: "ready", isPro: true, busy: false, eligibility: {},
    customerError: null, offeringError: null, errorMessage: null,
    customerInfo: { entitlements: { all: { vocali_pro: { isActive: true, productIdentifier: "yearly", willRenew: true } }, active: { vocali_pro: { isActive: true } } } } as unknown as CustomerInfo,
    offering: { availablePackages: packages } as RevenueCatSnapshot["offering"],
  };
  mocks.initialize.mockResolvedValue({ ok: true });
  mocks.refresh.mockResolvedValue({ ok: true });
  mocks.purchase.mockResolvedValue({ ok: true });
  mocks.signInForGuestTrial.mockResolvedValue({ ok: true, error: null });
});
afterEach(cleanup);

describe("subscription interactions", () => {
  it("shows one selected plan and lets the user return to the current plan", () => {
    render(<SubscriptionScreen />);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Monthly/ }));
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^Annual/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Current plan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Annual/ }));
    expect((screen.getByRole("button", { name: "Review plan change" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("requires review and confirmation, guards duplicate taps, and preserves the current plan for deferred changes", async () => {
    let resolve!: (result: { ok: boolean }) => void;
    mocks.purchase.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<SubscriptionScreen />);
    fireEvent.click(screen.getByRole("button", { name: /^Monthly/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review plan change" }));
    expect(mocks.purchase).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Review your plan change" }).textContent).toContain("No new trial");
    const confirm = screen.getByRole("button", { name: "Confirm with Apple" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(mocks.purchase).toHaveBeenCalledExactlyOnceWith("monthly");
    resolve({ ok: true });
    await waitFor(() => expect(screen.getByText(/Your request was accepted/)).toBeTruthy());
    expect(screen.getByRole("button", { name: /^Annual/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: "Cancel subscription" }).getAttribute("href")).toBe("https://apps.apple.com/account/subscriptions");
  });
  it("keeps the current plan without purchasing and handles Apple cancellation", async () => {
    mocks.purchase.mockResolvedValue({ ok: false, cancelled: true });
    render(<SubscriptionScreen />);
    fireEvent.click(screen.getByRole("button", { name: /^Monthly/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review plan change" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep current plan" }));
    expect(mocks.purchase).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Monthly/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review plan change" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm with Apple" }));
    await waitFor(() => expect(screen.getByText(/Plan change cancelled/)).toBeTruthy());
  });
  it("does not allow switching when prices or subscription status are unknown", () => {
    mocks.state.offering = null;
    mocks.state.customerStatus = "error";
    render(<SubscriptionScreen />);
    fireEvent.click(screen.getByRole("button", { name: /^Monthly/ }));
    expect((screen.getByRole("button", { name: "Review plan change" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Cancel subscription" })).toBeTruthy();
  });
  it("reports refresh failures without claiming success", async () => {
    mocks.refresh.mockResolvedValue({ ok: false, error: "Unable to refresh your subscription." });
    render(<SubscriptionControls />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh / retry connection" }));
    await waitFor(() => expect(screen.getByText("Unable to refresh your subscription.")).toBeTruthy());
    expect(screen.queryByText("Subscription information refreshed.")).toBeNull();
  });
  it("explains initialization failures on the paywall and permits retry", async () => {
    mocks.state.status = "configuration_required";
    mocks.state.errorMessage = "This build needs configuration.";
    render(<PaywallScreen />);
    expect(screen.getByRole("status").textContent).toContain("This build needs configuration.");
    fireEvent.click(screen.getByRole("button", { name: "Retry connection" }));
    await waitFor(() => expect(mocks.initialize).toHaveBeenCalledWith("test-user", true));
  });
  it("retains monthly selection through the privacy and support journey", () => {
    const { unmount } = render(<PaywallScreen entry={{ from: "login", mode: "login", redirect: "/practice", plan: "monthly" }} />);
    expect(screen.getByRole("button", { name: /^Monthly/ }).getAttribute("aria-pressed")).toBe("true");
    const privacy = new URL(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")!, "https://vocali.invalid");
    const returnTo = privacy.searchParams.get("returnTo")!;
    unmount();
    render(<PublicPageLinks page="/privacy" returnTo={returnTo} />);
    expect(screen.getByRole("link", { name: "Back to plans" }).getAttribute("href")).toContain("plan=monthly");
    expect(new URL(screen.getByRole("link", { name: "Support" }).getAttribute("href")!, "https://vocali.invalid").searchParams.get("returnTo")).toBe(returnTo);
  });
  it("keeps subscription management reachable while status loads", () => {
    mocks.state.status = "loading"; mocks.state.isPro = false;
    render(<SettingsPage />);
    expect(screen.getByRole("link", { name: "Manage subscription" }).getAttribute("href")).toBe("/settings/subscription");
    expect(screen.getByRole("link", { name: "View subscription options" })).toBeTruthy();
  });
  it("renders account deletion failures inside the confirmation dialog", async () => {
    mocks.deleteAccount.mockResolvedValue({ ok: false, error: "Please try again later." });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Delete account permanently/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "DELETE" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete account permanently" }));
    await waitFor(() => expect(within(dialog).getByRole("alert").textContent).toBe("Please try again later."));
  });
});

describe("account and onboarding navigation", () => {
  it("does not flash a login form during session loading or a signed-in redirect", () => {
    mocks.auth.isReady = false; mocks.auth.user = null;
    const { rerender } = render(<LoginForm initialMode="login" redirectPath="/home" />);
    expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull();
    mocks.auth.isReady = true; mocks.auth.user = { id: "test-user" };
    rerender(<LoginForm initialMode="login" redirectPath="/home" />);
    expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith("/home");
    mocks.auth.user = null;
    rerender(<LoginForm initialMode="login" redirectPath="/home" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeTruthy();
  });
  it("preserves onboarding choices when going back", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    fireEvent.click(screen.getByRole("button", { name: "Interview practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Interview practice" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("starts one guest rep only after the security check", async () => {
    mocks.auth.user = null;
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByRole("button", { name: "Try quick rep" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Complete security check" }));
    fireEvent.click(screen.getByRole("button", { name: "Try quick rep" }));
    await waitFor(() => expect(mocks.signInForGuestTrial).toHaveBeenCalledWith("captcha-token"));
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("source=onboarding"));
  });
});
