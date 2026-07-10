"use client";

import { useSyncExternalStore } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import type { Provider, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
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

type NativeOAuthCallbackDiagnostic = {
  hasCode: boolean;
  hasError: boolean;
  hasHash: boolean;
  hashKeys: string[];
  queryKeys: string[];
  startsWithExpectedRedirect: boolean;
};

const NATIVE_OAUTH_REDIRECT_URL = "com.vocali.app://auth/callback";
const OAUTH_REDIRECT_STORAGE_KEY = "vocali:oauth-redirect";
const listeners = new Set<() => void>();
let hasInitialized = false;
let hasRegisteredNativeOAuthCallbacks = false;
let isHandlingNativeOAuthCallback = false;
let isNativeOAuthFlowActive = false;
let lastHandledNativeOAuthUrl: string | null = null;
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

  registerNativeOAuthCallbacks();

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

export async function signInWithGoogle(redirectPath = "/home") {
  return signInWithOAuthProvider("google", redirectPath);
}

export async function signInWithApple(redirectPath = "/home") {
  return signInWithOAuthProvider("apple", redirectPath);
}

export async function completeOAuthSignIn(codeOverride?: string): Promise<AuthResult> {
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
  provider: Extract<Provider, "apple" | "google">,
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

  if (isNativeIosApp()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_OAUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error("[Vocali OAuth] Supabase OAuth error", error);
      return {
        ok: false,
        error: "Could not open sign-in. Please try again.",
      };
    }

    if (!data.url) {
      return {
        ok: false,
        error: "Sign-in URL was not created.",
      };
    }

    console.info("[Vocali OAuth] Native OAuth start", {
      provider,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      hasUrl: Boolean(data.url),
      urlStart: data.url?.slice(0, 80),
    });

    if (!Capacitor.isPluginAvailable("Browser")) {
      console.error("[Vocali OAuth] Browser plugin unavailable");
      return {
        ok: false,
        error: "Sign-in is not available in this build.",
      };
    }

    try {
      isNativeOAuthFlowActive = true;
      await Browser.open({ url: data.url });
    } catch (error) {
      console.error("[Vocali OAuth] Browser.open failed", error);
      isNativeOAuthFlowActive = false;
      return {
        ok: false,
        error: "Could not open the sign-in window.",
      };
    }

    return { ok: true, error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

function registerNativeOAuthCallbacks() {
  if (!isNativeIosApp() || hasRegisteredNativeOAuthCallbacks) {
    return;
  }

  hasRegisteredNativeOAuthCallbacks = true;

  void App.addListener("appUrlOpen", (event) => {
    void handleNativeOAuthCallback(event.url);
  });

  void Browser.addListener("browserFinished", () => {
    if (!isNativeOAuthFlowActive || isHandlingNativeOAuthCallback) {
      return;
    }

    isNativeOAuthFlowActive = false;
    updateSnapshot({
      errorMessage: "Sign-in was cancelled or could not finish.",
      isReady: true,
    });
  });

  void App.getLaunchUrl().then((launchUrl) => {
    if (launchUrl?.url) {
      void handleNativeOAuthCallback(launchUrl.url);
    }
  });
}

async function handleNativeOAuthCallback(url: string) {
  const callbackDiagnostic = getNativeOAuthCallbackDiagnostic(url);

  console.info("[Vocali OAuth] Native callback received", callbackDiagnostic);

  if (
    !callbackDiagnostic.startsWithExpectedRedirect ||
    url === lastHandledNativeOAuthUrl ||
    isHandlingNativeOAuthCallback
  ) {
    return;
  }

  lastHandledNativeOAuthUrl = url;
  isHandlingNativeOAuthCallback = true;
  isNativeOAuthFlowActive = false;

  try {
    await Browser.close();
  } catch {
    // Browser may already be closed by the system.
  }

  const callbackParams = getNativeOAuthCallbackParams(url);
  const oauthError =
    callbackParams.get("error_description") ?? callbackParams.get("error");

  if (oauthError) {
    console.error("[Vocali OAuth] Native callback error", oauthError);
    updateSnapshot({
      errorMessage: "Sign-in was cancelled or could not finish.",
      isReady: true,
    });
    isHandlingNativeOAuthCallback = false;
    return;
  }

  const code = callbackParams.get("code");

  if (!code) {
    console.error(
      "[Vocali OAuth] Native callback missing code",
      callbackDiagnostic,
    );
    updateSnapshot({
      errorMessage: "Sign-in returned without a code.",
      isReady: true,
    });
    isHandlingNativeOAuthCallback = false;
    return;
  }

  const result = await completeOAuthSignIn(code);
  isHandlingNativeOAuthCallback = false;

  if (!result.ok) {
    updateSnapshot({
      errorMessage: result.error ?? "Sign-in could not finish.",
      isReady: true,
    });
    return;
  }

  window.location.assign(consumeOAuthRedirectPath("/home"));
}

function getNativeOAuthCallbackParams(url: string) {
  const callbackUrl = new URL(url);
  const params = new URLSearchParams(callbackUrl.search);

  if (callbackUrl.hash) {
    const hashParams = new URLSearchParams(callbackUrl.hash.slice(1));
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  }

  return params;
}

function getNativeOAuthCallbackDiagnostic(
  url: string,
): NativeOAuthCallbackDiagnostic {
  const callbackUrl = new URL(url);
  const queryParams = callbackUrl.searchParams;
  const hashParams = new URLSearchParams(callbackUrl.hash.slice(1));

  return {
    startsWithExpectedRedirect: url.startsWith(NATIVE_OAUTH_REDIRECT_URL),
    hasCode: queryParams.has("code") || hashParams.has("code"),
    hasError:
      queryParams.has("error") ||
      queryParams.has("error_description") ||
      hashParams.has("error") ||
      hashParams.has("error_description"),
    hasHash: Boolean(callbackUrl.hash),
    queryKeys: Array.from(queryParams.keys()),
    hashKeys: Array.from(hashParams.keys()),
  };
}

function isNativeIosApp() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "ios"
  );
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
