"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "light";
      size: "compact";
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileChallenge({
  onError,
  onToken,
  resetKey = 0,
}: {
  onError: (message: string | null) => void;
  onToken: (token: string | null) => void;
  resetKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [scriptRetryKey, setScriptRetryKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const callbacks = useRef({ onError, onToken });
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    callbacks.current = { onError, onToken };
  }, [onError, onToken]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      size: "compact",
      callback: (token) => {
        setErrorMessage(null);
        callbacks.current.onError(null);
        callbacks.current.onToken(token);
      },
      "expired-callback": () => {
        const message = "The security check expired. Complete it again to continue.";
        callbacks.current.onToken(null);
        callbacks.current.onError(message);
        setErrorMessage(message);
      },
      "error-callback": () => {
        const message = "The security check could not load. Check your connection and try again.";
        callbacks.current.onToken(null);
        callbacks.current.onError(message);
        setErrorMessage(message);
      },
    });
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, siteKey, resetKey, retryKey]);

  if (!siteKey) {
    return (
      <p role="status" className="text-center text-sm font-bold leading-5 text-vocali-muted">
        The security check is unavailable. Please try again later or use Apple sign-in if available.
      </p>
    );
  }

  return (
    <>
      <Script
        key={scriptRetryKey}
        id={`cloudflare-turnstile-${scriptRetryKey}`}
        src={`https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit${scriptRetryKey ? `&retry=${scriptRetryKey}` : ""}`}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => {
          const message = "The security check could not load. Check your connection and try again.";
          callbacks.current.onToken(null);
          callbacks.current.onError(message);
          setErrorMessage(message);
        }}
      />
      <div ref={containerRef} className="flex min-h-[140px] justify-center" aria-label="Security check" />
      {errorMessage ? (
        <div className="text-center">
          <p role="alert" className="text-sm font-semibold text-vocali-muted">{errorMessage}</p>
          <button type="button" className="min-h-11 px-3 text-sm font-bold text-vocali-teal underline" onClick={() => {
            callbacks.current.onToken(null);
            callbacks.current.onError(null);
            setErrorMessage(null);
            if (!window.turnstile) setScriptRetryKey((value) => value + 1);
            setRetryKey((value) => value + 1);
          }}>Retry security check</button>
        </div>
      ) : null}
    </>
  );
}
