"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  isNativeAppleSignInAvailable,
  useAuth,
} from "@/lib/authStore";
import {
  defaultUserPreferences,
  saveUserPreferences,
} from "@/lib/userPreferences";

type AuthMode = "login" | "signup";
type OAuthProvider = "apple" | "google";

const isGoogleSignInEnabled = false;

export function LoginForm({
  initialMode,
  redirectPath,
}: {
  initialMode: AuthMode;
  redirectPath: string;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAppleSignInEnabled = useSyncExternalStore(
    subscribeToNativeAuthAvailability,
    isNativeAppleSignInAvailable,
    getUnavailableNativeAuthSnapshot,
  );
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(
    null,
  );
  const suppressAuthRedirectRef = useRef(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (auth.isReady && auth.user && !suppressAuthRedirectRef.current) {
      router.replace(redirectPath);
    }
  }, [auth.isReady, auth.user, redirectPath, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    const trimmedDisplayName = displayName.trim();

    if (isSignup && !trimmedDisplayName) {
      setMessage("Add the name you want Vocali to use.");
      setIsSubmitting(false);
      return;
    }

    if (isSignup && password !== confirmedPassword) {
      setMessage("Passwords do not match yet. Please retype them.");
      setIsSubmitting(false);
      return;
    }

    suppressAuthRedirectRef.current = isSignup;

    const result = isSignup
      ? await signUpWithEmail({
          displayName: trimmedDisplayName,
          email,
          password,
        })
      : await signInWithEmail({
          email,
          password,
        });

    if (result.ok && isSignup) {
      saveUserPreferences({
        ...defaultUserPreferences,
        displayName: trimmedDisplayName,
      });
    }

    setIsSubmitting(false);

    if (!result.ok) {
      suppressAuthRedirectRef.current = false;
      setMessage(result.error);
      return;
    }

    if (isSignup) {
      setIsCheckingEmail(true);
      setMessage("Check your email to confirm your account.");
      return;
    }

    setMessage("Signing you in...");
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    setMessage(null);
    setOauthProvider(provider);

    const result =
      provider === "apple"
        ? await signInWithApple()
        : await signInWithGoogle(redirectPath);

    if (!result.ok) {
      setMessage(result.error);
      setOauthProvider(null);
      return;
    }

    setMessage("Signing you in...");
    router.replace(redirectPath);
  }

  const activeOAuthProvider = auth.errorMessage ? null : oauthProvider;
  const shouldShowSocialAuth =
    isAppleSignInEnabled || isGoogleSignInEnabled;

  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-top-tight vocali-safe-bottom mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-5 pt-8 sm:min-h-[760px]">
        <div className="flex items-center justify-center gap-2">
          <VocaliLogo size="xs" variant="mark" />
          <span className="text-xl font-extrabold text-vocali-teal-deep">
            Vocali
          </span>
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-white/85 p-4 shadow-[0_18px_40px_rgb(20_64_62/0.08)] ring-1 ring-white/80">
          <div className="text-center">
            <h1 className="text-[1.78rem] font-extrabold leading-tight text-vocali-teal-deep">
              {isCheckingEmail
                ? "Check your email"
                : isSignup
                  ? "Create your account"
                  : "Welcome back"}
            </h1>
            <p className="mx-auto mt-2 max-w-[18rem] text-[0.93rem] font-medium leading-6 text-vocali-muted">
              {isCheckingEmail
                ? "Open the confirmation link we sent you."
                : isSignup
                  ? "Save your streak."
                  : "Pick up where you left off."}
            </p>
          </div>

          {isCheckingEmail ? (
            <div className="mt-5 rounded-[1rem] bg-vocali-teal/10 p-4 text-center">
              <p className="text-sm font-semibold leading-5 text-vocali-teal">
                {message}
              </p>
              <button
                type="button"
                onClick={() => {
                  suppressAuthRedirectRef.current = false;
                  setIsCheckingEmail(false);
                  setMode("login");
                  setMessage(null);
                }}
                className="mt-3 text-sm font-bold text-vocali-teal-deep"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="mt-5">
              {shouldShowSocialAuth ? (
                <>
                  <div className="space-y-2.5">
                    {isAppleSignInEnabled ? (
                      <OAuthButton
                        disabled={
                          isSubmitting ||
                          Boolean(activeOAuthProvider) ||
                          !auth.isReady
                        }
                        isLoading={activeOAuthProvider === "apple"}
                        onClick={() => void handleOAuthSignIn("apple")}
                        variant="apple"
                      >
                        Continue with Apple
                      </OAuthButton>
                    ) : null}
                    {isGoogleSignInEnabled ? (
                      <OAuthButton
                        disabled={
                          isSubmitting ||
                          Boolean(activeOAuthProvider) ||
                          !auth.isReady
                        }
                        isLoading={activeOAuthProvider === "google"}
                        onClick={() => void handleOAuthSignIn("google")}
                        variant="google"
                      >
                        Continue with Google
                      </OAuthButton>
                    ) : null}
                  </div>

                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-vocali-border" />
                    <span className="text-xs font-bold text-vocali-muted">
                      or use email
                    </span>
                    <span className="h-px flex-1 bg-vocali-border" />
                  </div>
                </>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-3">
                {isSignup ? (
                  <label className="block">
                    <span className="text-sm font-semibold text-vocali-teal-deep">
                      Display name
                    </span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="mt-1.5 h-11 w-full rounded-[1rem] border border-vocali-border bg-vocali-cream/80 px-4 text-base font-semibold text-vocali-teal-deep outline-none transition focus:border-vocali-teal focus:bg-white"
                      maxLength={32}
                      placeholder="Your name"
                      required
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="text-sm font-semibold text-vocali-teal-deep">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-[1rem] border border-vocali-border bg-vocali-cream/80 px-4 text-base font-semibold text-vocali-teal-deep outline-none transition focus:border-vocali-teal focus:bg-white"
                    autoComplete="email"
                    required
                  />
                </label>

                <PasswordField
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  isVisible={isPasswordVisible}
                  label="Password"
                  onToggleVisibility={() =>
                    setIsPasswordVisible((current) => !current)
                  }
                  onValueChange={setPassword}
                  value={password}
                />

                {isSignup ? (
                  <PasswordField
                    autoComplete="new-password"
                    isVisible={isPasswordVisible}
                    label="Confirm password"
                    onToggleVisibility={() =>
                      setIsPasswordVisible((current) => !current)
                    }
                    onValueChange={setConfirmedPassword}
                    value={confirmedPassword}
                  />
                ) : null}

                {message || auth.syncMessage || auth.errorMessage ? (
                  <p className="rounded-[1rem] bg-vocali-teal/10 p-3 text-sm font-semibold leading-5 text-vocali-teal">
                    {message ?? auth.syncMessage ?? auth.errorMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={
                    isSubmitting || Boolean(activeOAuthProvider) || !auth.isReady
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-vocali-orange px-5 text-base font-extrabold text-white shadow-[0_14px_24px_rgb(255_122_26/0.22)] disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
                  ) : (
                    <ArrowRight className="h-5 w-5" strokeWidth={3} />
                  )}
                  {isSignup ? "Create account" : "Log in"}
                </button>
              </form>
            </div>
          )}
        </div>

        {!isCheckingEmail ? (
          <p className="mt-3 text-center text-sm font-medium text-vocali-muted">
            {isSignup ? "Already have an account?" : "New to Vocali?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? "login" : "signup");
                setMessage(null);
              }}
              className="font-extrabold text-vocali-teal"
            >
              {isSignup ? "Log in" : "Create account"}
            </button>
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-2 flex h-8 w-full items-center justify-center rounded-[1rem] text-sm font-bold text-vocali-teal"
        >
          Back to welcome
        </Link>
      </section>
    </ScreenFrame>
  );
}

function subscribeToNativeAuthAvailability(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timeoutId = window.setTimeout(onStoreChange, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function getUnavailableNativeAuthSnapshot() {
  return false;
}

function OAuthButton({
  children,
  disabled,
  isLoading,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
  variant: OAuthProvider;
}) {
  const variantClasses =
    variant === "apple"
      ? "bg-[#111111] text-white shadow-[0_14px_24px_rgb(17_17_17/0.14)]"
      : "border border-vocali-border bg-white text-vocali-teal-deep shadow-[0_10px_24px_rgb(20_64_62/0.06)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-full items-center justify-center gap-3 rounded-[1rem] px-5 text-base font-semibold disabled:opacity-70 ${variantClasses}`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
      ) : variant === "apple" ? (
        <AppleIcon />
      ) : (
        <GoogleIcon />
      )}
      {children}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M16.4 13.1c0-2.5 2.1-3.7 2.2-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9c-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.3-1.2 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9-.1-.1-3-1.2-3-4.1ZM14 5.8c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.7-3.2 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.5-.6 3.2-1.4Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.4c-.2 1.2-.9 2.2-2 2.9v2.4h3.2c1.9-1.7 3-4.2 3-7.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-.9 6.6-2.6l-3.2-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.5C4.8 19.7 8.2 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.7H3.1C2.4 9 2 10.4 2 12s.4 3 1.1 4.3l3.3-2.5Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.3 3.1 7.7l3.3 2.5C7.2 7.9 9.4 6.1 12 6.1Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function PasswordField({
  autoComplete,
  isVisible,
  label,
  onToggleVisibility,
  onValueChange,
  value,
}: {
  autoComplete: "current-password" | "new-password";
  isVisible: boolean;
  label: string;
  onToggleVisibility: () => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <label className="block">
      <span className="text-sm font-semibold text-vocali-teal-deep">
        {label}
      </span>
      <div className="mt-1.5 flex h-11 items-center rounded-[1rem] border border-vocali-border bg-vocali-cream/80 transition focus-within:border-vocali-teal focus-within:bg-white">
        <input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-vocali-teal-deep outline-none"
          autoComplete={autoComplete}
          minLength={6}
          required
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] text-vocali-teal"
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          <Icon className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>
    </label>
  );
}
