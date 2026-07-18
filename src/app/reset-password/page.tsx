"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { AuthGate } from "@/components/auth/AuthGate";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { updatePassword } from "@/lib/authStore";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmation) {
      setMessage("The passwords do not match yet.");
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setPassword("");
    setConfirmation("");
    setIsComplete(true);
    setMessage("Your password has been updated.");
  }

  return (
    <AuthGate>
      <ScreenFrame>
        <section className="vocali-safe-top vocali-safe-bottom mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-7 pt-8 sm:min-h-[760px]">
          <div className="flex items-center justify-center gap-2">
            <VocaliLogo size="xs" variant="mark" />
            <span className="text-xl font-extrabold text-vocali-teal-deep">
              Vocali
            </span>
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-white p-5 shadow-vocali-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
              {isComplete ? (
                <CheckCircle2 className="h-7 w-7" strokeWidth={3} />
              ) : (
                <KeyRound className="h-7 w-7" strokeWidth={3} />
              )}
            </div>
            <h1 className="mt-5 text-[2rem] font-black tracking-[-0.04em] text-vocali-teal-deep">
              Update password
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-vocali-muted">
              Choose a password with at least 8 characters.
            </p>

            {!isComplete ? (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <PasswordInput
                  label="New password"
                  value={password}
                  onChange={setPassword}
                />
                <PasswordInput
                  label="Confirm new password"
                  value={confirmation}
                  onChange={setConfirmation}
                />
                {message ? (
                  <p className="rounded-[1rem] bg-vocali-orange/10 p-3 text-sm font-bold leading-5 text-vocali-orange">
                    {message}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-vocali-orange px-5 text-base font-black text-white disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
                  ) : null}
                  {isSubmitting ? "Updating..." : "Update password"}
                </button>
              </form>
            ) : (
              <p className="mt-5 rounded-[1rem] bg-vocali-teal/10 p-4 text-sm font-black text-vocali-teal">
                {message}
              </p>
            )}
          </div>

          <Link
            href="/settings"
            className="mt-4 flex h-14 items-center justify-center text-base font-black text-vocali-teal"
          >
            Back to Settings
          </Link>
        </section>
      </ScreenFrame>
    </AuthGate>
  );
}

function PasswordInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-vocali-teal-deep">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
        minLength={8}
        required
        className="mt-2 h-12 w-full rounded-[1rem] border-2 border-vocali-border bg-vocali-cream px-4 text-base font-black text-vocali-teal-deep outline-none focus:border-vocali-teal"
      />
    </label>
  );
}
