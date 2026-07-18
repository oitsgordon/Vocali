"use client";

import { useSyncExternalStore } from "react";
import {
  SocialLogin,
  type AppleProviderResponse,
  type SocialLoginError,
} from "@capgo/capacitor-social-login";
import { Capacitor } from "@capacitor/core";
import type { Provider, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  fetchRemoteProfile,
  setSupabaseSyncUserId,
  syncProfilePreferences,
} from "@/lib/supabaseRemote";
import { syncSignedInUserData } from "@/lib/supabaseSync";
import { defaultUserPreferences } from "@/lib/userPreferences";

type AuthSnapshot = {
  errorMessage: string | null;
  isReady: boolean;
  isSyncing: boolean;
  syncMessage: string | null;
  user: User | null;
};

type AuthResult = {
  error: string | null;
  ok: boolean;
};

export type DeleteAccountResult = AuthResult & {
  manualAppleRevocationRequired: boolean;
};

const OAUTH_REDIRECT_STORAGE_KEY = "vocali:oauth-redirect";
const listeners = new Set<() => void>();
let hasInitialized = false;
let hasInitializedNativeAppleSignIn = false;
let syncUserId: string | null = null;
let snapshot: AuthSnapshot = {
  errorMessage: null,
  isReady: false,
  isSyncing: false,
  syncMessage: null,
  user: null,
};

export function initializeAuthStore() {
  const supabase = getSupabaseClient();

  if (hasInitialized) {
    return;
  }

  hasInitialized = true;

  if (!supabase) {
    updateSnapshot({
      errorMessage:
        "Account sync is not configured on this build. Local practice still works on this device.",
      isReady: true,
    });
    return;
  }

  void supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      updateSnapshot({
        errorMessage: "We could not restore your account session.",
        isReady: true,
        user: null,
      });
      setSupabaseSyncUserId(null);
      return;
    }

    const user = data.session?.user ?? null;
    updateSnapshot({ isReady: true, user });
    setSupabaseSyncUserId(user?.id ?? null);

    if (user) {
      void runUserSync(user.id);
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    updateSnapshot({ isReady: true, user });
    setSupabaseSyncUserId(user?.id ?? null);

    if (user) {
      void runUserSync(user.id);
    } else {
      syncUserId = null;
    }
  });
}

export function useAuth() {
  return useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getAuthSnapshot,
  );
}

export async function signUpWithEmail({
  displayName,
  email,
  password,
}: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: getEmailConfirmationRedirectUrl(),
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.user) {
    await syncProfilePreferences(
      {
        ...defaultUserPreferences,
        displayName,
      },
      data.user.id,
    );
  }

  return { ok: true, error: null };
}

export async function signInWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  if (typeof window === "undefined") {
    return { ok: false, error: "Password recovery needs a browser window." };
  }

  const redirectUrl = new URL("/auth/callback", window.location.origin);
  redirectUrl.searchParams.set("redirect", "/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl.toString(),
  });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account services are not configured on this build.",
      manualAppleRevocationRequired: false,
    };
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (sessionError || !accessToken) {
    return {
      ok: false,
      error: "Please sign in again before deleting your account.",
      manualAppleRevocationRequired: false,
    };
  }

  try {
    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    const responseBody = (await response.json().catch(() => ({}))) as {
      error?: unknown;
      manualAppleRevocationRequired?: unknown;
    };

    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof responseBody.error === "string"
            ? responseBody.error
            : "Your account could not be deleted. Please try again.",
        manualAppleRevocationRequired: false,
      };
    }

    return {
      ok: true,
      error: null,
      manualAppleRevocationRequired:
        responseBody.manualAppleRevocationRequired === true,
    };
  } catch {
    return {
      ok: false,
      error: "Your account could not be deleted. Please try again.",
      manualAppleRevocationRequired: false,
    };
  }
}

export async function signInWithGoogle(redirectPath = "/home") {
  return signInWithOAuthProvider("google", redirectPath);
}

export async function signInWithApple() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  if (!isNativeAppleSignInAvailable()) {
    return {
      ok: false,
      error: "Apple sign-in is not available in this build.",
    };
  }

  console.info("[Vocali Apple Sign-In] native start");

  try {
    await initializeNativeAppleSignIn();
    const rawNonce = createAppleSignInNonce();
    const hashedNonce = await sha256Hex(rawNonce);
    const appleLoginResult = await SocialLogin.login({
      provider: "apple",
      options: {
        nonce: hashedNonce,
      },
    });
    const appleIdToken = getAppleIdentityToken(appleLoginResult.result);

    if (!appleIdToken) {
      console.error(
        "[Vocali Apple Sign-In] missing identity token",
        getSafeAppleLoginShape(appleLoginResult.result),
      );
      return { ok: false, error: "Apple sign-in could not finish." };
    }

    const tokenDiagnostics = getAppleTokenDiagnostics(appleIdToken);
    console.info(
      "[Vocali Apple Sign-In] identity token diagnostics",
      tokenDiagnostics,
    );

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: appleIdToken,
      nonce: rawNonce,
    });

    if (error) {
      console.error(
        "[Vocali Apple Sign-In] Supabase signInWithIdToken failed",
        {
          message: error.message,
          status: getErrorStatus(error),
          token: tokenDiagnostics,
        },
      );
      return { ok: false, error: "Apple sign-in could not finish." };
    }

    const user = data.user ?? data.session?.user ?? null;

    if (!user) {
      return { ok: false, error: "Apple sign-in could not finish." };
    }

    const authorizationCode = getStringValue(
      appleLoginResult.result.authorizationCode,
    );

    if (authorizationCode && data.session?.access_token) {
      await saveAppleAuthorizationForDeletion(
        authorizationCode,
        data.session.access_token,
      );
    }

    await saveAppleNameIfAvailable(user, appleLoginResult.result.profile);
    updateSnapshot({ errorMessage: null, isReady: true, user });
    setSupabaseSyncUserId(user.id);
    await runUserSync(user.id);

    return { ok: true, error: null };
  } catch (error) {
    if (isAppleSignInCancelled(error)) {
      return { ok: false, error: "Apple sign-in was cancelled." };
    }

    console.error("[Vocali Apple Sign-In] native failed", error);
    return { ok: false, error: "Apple sign-in could not finish." };
  }
}

export async function completeOAuthSignIn(
  codeOverride?: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  const code =
    codeOverride ??
    (typeof window !== "undefined"
      ? new URL(window.location.href).searchParams.get("code")
      : null);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        console.error("[Vocali OAuth] Code exchange failed", error);
        return { ok: false, error: "Sign-in could not finish." };
      }
    }
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, error: error.message };
  }

  const user = data.session?.user ?? null;

  if (!user) {
    return {
      ok: false,
      error: "We could not finish signing you in. Please try again.",
    };
  }

  updateSnapshot({ errorMessage: null, isReady: true, user });
  setSupabaseSyncUserId(user.id);
  await runUserSync(user.id);

  return { ok: true, error: null };
}

export function consumeOAuthRedirectPath(fallback = "/home") {
  if (typeof window === "undefined") {
    return sanitizeLocalRedirectPath(fallback);
  }

  const storedRedirectPath = window.sessionStorage.getItem(
    OAUTH_REDIRECT_STORAGE_KEY,
  );
  window.sessionStorage.removeItem(OAUTH_REDIRECT_STORAGE_KEY);

  return sanitizeLocalRedirectPath(storedRedirectPath ?? fallback);
}

export async function signOut() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
  setSupabaseSyncUserId(null);
  updateSnapshot({
    isSyncing: false,
    syncMessage: null,
    user: null,
  });
}

export async function retryAccountSync() {
  if (!snapshot.user) {
    return;
  }

  await runUserSync(snapshot.user.id);
}

function subscribeToAuth(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getAuthSnapshot() {
  return snapshot;
}

async function runUserSync(userId: string) {
  if (syncUserId === userId && snapshot.isSyncing) {
    return;
  }

  syncUserId = userId;
  updateSnapshot({ isSyncing: true, syncMessage: null });

  const result = await syncSignedInUserData(userId);

  updateSnapshot({
    isSyncing: false,
    syncMessage: result.message,
  });
}

async function signInWithOAuthProvider(
  provider: Extract<Provider, "google">,
  redirectPath: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Account sync is not configured on this build.",
    };
  }

  if (typeof window === "undefined") {
    return {
      ok: false,
      error: "OAuth sign-in needs a browser window.",
    };
  }

  const safeRedirectPath = sanitizeLocalRedirectPath(redirectPath);
  window.sessionStorage.setItem(OAUTH_REDIRECT_STORAGE_KEY, safeRedirectPath);
  updateSnapshot({ errorMessage: null });

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export function isNativeAppleSignInAvailable() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isPluginAvailable("SocialLogin")
  );
}

async function initializeNativeAppleSignIn() {
  if (hasInitializedNativeAppleSignIn) {
    return;
  }

  await SocialLogin.initialize({
    apple: {
      redirectUrl: "",
    },
  });
  hasInitializedNativeAppleSignIn = true;
}

async function saveAppleNameIfAvailable(
  user: User,
  profile: AppleProviderResponse["profile"],
) {
  const appleDisplayName = getAppleDisplayName(profile);

  if (!appleDisplayName) {
    return;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  const currentMetadataName =
    getStringValue(user.user_metadata?.display_name) ??
    getStringValue(user.user_metadata?.name) ??
    getStringValue(user.user_metadata?.full_name);

  if (isBlankOrDefaultDisplayName(currentMetadataName)) {
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: appleDisplayName,
        full_name: appleDisplayName,
        name: appleDisplayName,
      },
    });

    if (error) {
      console.error("[Vocali Apple Sign-In] metadata update failed", error);
    }
  }

  const remoteProfileResult = await fetchRemoteProfile(user.id);
  const currentProfileName = remoteProfileResult.profile?.displayName;

  if (isBlankOrDefaultDisplayName(currentProfileName)) {
    await syncProfilePreferences(
      {
        ...(remoteProfileResult.profile ?? defaultUserPreferences),
        displayName: appleDisplayName,
      },
      user.id,
    );
  }
}

function getAppleDisplayName(profile: AppleProviderResponse["profile"]) {
  return [profile.givenName, profile.familyName]
    .map((namePart) => namePart?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getAppleIdentityToken(result: AppleProviderResponse) {
  const resultWithLegacyTokenName = result as AppleProviderResponse & {
    identityToken?: string | null;
  };

  return (
    getStringValue(result.idToken) ??
    getStringValue(resultWithLegacyTokenName.identityToken)
  );
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function saveAppleAuthorizationForDeletion(
  authorizationCode: string,
  accessToken: string,
) {
  try {
    const response = await fetch("/api/auth/apple/exchange", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ authorizationCode }),
    });

    if (!response.ok) {
      console.error("[Vocali Apple Sign-In] token storage failed", {
        status: response.status,
      });
    }
  } catch (error) {
    console.error("[Vocali Apple Sign-In] token storage request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function isAppleSignInCancelled(error: unknown) {
  const socialLoginError = error as Partial<SocialLoginError>;
  const message =
    typeof socialLoginError.message === "string"
      ? socialLoginError.message.toLowerCase()
      : "";

  return (
    socialLoginError.code === "USER_CANCELLED" ||
    message.includes("cancel")
  );
}

function isBlankOrDefaultDisplayName(value: string | null | undefined) {
  return !value || value === defaultUserPreferences.displayName;
}

function getSafeAppleLoginShape(result: AppleProviderResponse) {
  return {
    hasAccessToken: Boolean(result.accessToken),
    hasAuthorizationCode: Boolean(result.authorizationCode),
    hasIdentityToken: Boolean(
      (result as AppleProviderResponse & { identityToken?: string | null })
        .identityToken,
    ),
    hasIdToken: Boolean(result.idToken),
    profileKeys: Object.keys(result.profile ?? {}),
    resultKeys: Object.keys(result),
  };
}

function createAppleSignInNonce() {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(32);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function sha256Hex(value: string) {
  const encodedValue = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encodedValue);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function getAppleTokenDiagnostics(token: string) {
  const payload = decodeJwtPayload(token);
  const nonce = getStringValue(payload?.nonce);

  return {
    aud: getJwtClaimForDiagnostics(payload?.aud),
    iss: getJwtClaimForDiagnostics(payload?.iss),
    hasNonce: Boolean(nonce),
    nonceLength: nonce?.length ?? 0,
    hasEmail: Boolean(getStringValue(payload?.email)),
  };
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];

  if (!payload || typeof atob === "undefined") {
    return null;
  }

  try {
    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decodedPayload = atob(normalizedPayload);
    const parsedPayload: unknown = JSON.parse(decodedPayload);

    return typeof parsedPayload === "object" && parsedPayload !== null
      ? (parsedPayload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getJwtClaimForDiagnostics(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string");
  }

  return null;
}

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null;
}

function updateSnapshot(nextSnapshot: Partial<AuthSnapshot>) {
  snapshot = {
    ...snapshot,
    ...nextSnapshot,
  };

  for (const listener of listeners) {
    listener();
  }
}

function getEmailConfirmationRedirectUrl() {
  if (typeof window === "undefined") {
    return "https://vocali-zeta.vercel.app/auth/confirmed";
  }

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const origin = isLocalHost
    ? window.location.origin
    : "https://vocali-zeta.vercel.app";

  return `${origin}/auth/confirmed`;
}

function sanitizeLocalRedirectPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }

  return value;
}
