"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  HardDrive,
  History,
  KeyRound,
  LifeBuoy,
  Pencil,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
  UserRoundX,
  Volume2,
  X,
} from "lucide-react";
import { useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ScreenFrame } from "@/components/layout/ScreenFrame";
import { deleteAccount, signOut, useAuth } from "@/lib/authStore";
import { clearAllLocalVocaliData } from "@/lib/localDataCleanup";
import { clearAttempts } from "@/lib/attemptStorage";
import { clearRecordings } from "@/lib/recordingStorage";
import { useUserPreferences } from "@/lib/useUserPreferences";
import {
  dailyGoalOptions,
  defaultUserPreferences,
  focusAreaOptions,
  type DailyGoal,
  type FocusArea,
  type UserPreferences,
} from "@/lib/userPreferences";

type LocalDataMessage = {
  tone: "success" | "warning";
  text: string;
};

type SavePreferenceStatus = "idle" | "saving" | "saved";

export default function SettingsPage() {
  const {
    hasLoadedPreferences,
    preferences: storedPreferences,
    savePreferences,
  } = useUserPreferences();
  const preferencesKey = hasLoadedPreferences
    ? `${storedPreferences.displayName}-${storedPreferences.focusArea}-${storedPreferences.dailyGoal}`
    : "loading";

  return (
    <SettingsContent
      key={preferencesKey}
      initialPreferences={storedPreferences}
      savePreferences={savePreferences}
    />
  );
}

function SettingsContent({
  initialPreferences,
  savePreferences,
}: {
  initialPreferences: UserPreferences;
  savePreferences: (preferences: UserPreferences) => boolean;
}) {
  const auth = useAuth();
  const [message, setMessage] = useState<LocalDataMessage | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [savePreferenceStatus, setSavePreferenceStatus] =
    useState<SavePreferenceStatus>("idle");
  const [preferences, setPreferences] = useState<UserPreferences>(
    initialPreferences,
  );

  function confirmAction(message: string) {
    return window.confirm(message);
  }

  function handleClearAttempts() {
    if (
      !confirmAction(
        "Clear your local practice history from this browser? Saved recordings will stay unless you clear them separately.",
      )
    ) {
      return;
    }

    clearAttempts();
    setMessage({
      tone: "success",
      text: "Practice history cleared from this browser.",
    });
  }

  async function handleClearRecordings() {
    if (
      !confirmAction(
        "Clear saved replay recordings from this browser? Your practice history will stay unless you clear it separately.",
      )
    ) {
      return;
    }

    setIsClearing(true);
    const didClear = await clearRecordings();
    setIsClearing(false);
    setMessage({
      tone: didClear ? "success" : "warning",
      text: didClear
        ? "Saved recordings cleared from this browser."
        : "Recording storage could not be opened in this browser.",
    });
  }

  function handleResetOnboarding() {
    if (
      !confirmAction(
        "Reset your onboarding choices? You can go through onboarding again from the welcome screen.",
      )
    ) {
      return;
    }

    let didClear = false;

    try {
      window.localStorage.removeItem("vocali:onboarding");
      didClear = true;
    } catch {
      didClear = false;
    }
    setMessage({
      tone: didClear ? "success" : "warning",
      text: didClear
        ? "Onboarding choices reset."
        : "Onboarding storage could not be opened in this browser.",
    });
  }

  function handleSavePreferences() {
    if (savePreferenceStatus !== "idle") {
      return;
    }

    setSavePreferenceStatus("saving");
    const didSave = savePreferences(preferences);
    if (didSave) {
      setSavePreferenceStatus("saved");
      window.setTimeout(() => {
        setSavePreferenceStatus("idle");
      }, 1600);
    } else {
      setSavePreferenceStatus("idle");
    }

    setMessage({
      tone: didSave ? "success" : "warning",
      text: didSave
        ? "Profile preferences saved on this browser."
        : "Profile preferences could not be saved in this browser.",
    });
  }

  async function handleResetAll() {
    if (
      !confirmAction(
        "Reset all local Vocali data in this browser? This clears practice history, saved recordings, onboarding choices, profile preferences, and practice preferences.",
      )
    ) {
      return;
    }

    setIsClearing(true);
    const result = await clearAllLocalVocaliData();
    setPreferences(defaultUserPreferences);
    setIsClearing(false);
    setMessage({
      tone: result.ok ? "success" : "warning",
      text: result.ok
        ? "All local Vocali data has been reset in this browser."
        : "Practice history was cleared. Some browser storage could not be opened.",
    });
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "DELETE" || isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setMessage(null);
    const result = await deleteAccount();

    if (!result.ok) {
      setIsDeletingAccount(false);
      setMessage({
        tone: "warning",
        text: result.error ?? "Your account could not be deleted.",
      });
      return;
    }

    await clearAllLocalVocaliData();
    await signOut();

    if (result.manualAppleRevocationRequired) {
      window.alert(
        "Your Vocali account was deleted. To remove the remaining Apple authorization, open iPhone Settings, tap your name, choose Sign in with Apple, select Vocali, then tap Delete.",
      );
    }

    window.location.replace("/");
  }

  return (
    <AuthGate>
      <ScreenFrame>
        <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-5 pb-7 pt-7 sm:min-h-[860px]">
        <header className="flex items-center justify-between">
          <Link
            href="/profile"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-vocali-teal-deep shadow-[0_10px_24px_rgb(7_50_71/0.08)]"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
          </Link>
          <p className="text-base font-black text-vocali-teal-deep">Settings</p>
          <div className="h-11 w-11" />
        </header>

        <div className="mt-6">
          <p className="text-lg font-black text-vocali-teal">Settings</p>
          <h1 className="mt-2 text-[2.5rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
            Personalise Vocali.
          </h1>
        </div>

        {message ? (
          <div
            className={`mt-5 rounded-[1.1rem] p-4 text-sm font-black ${
              message.tone === "success"
                ? "bg-vocali-teal/12 text-vocali-teal"
                : "bg-vocali-orange/12 text-vocali-orange"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
              <Pencil className="h-6 w-6" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-vocali-teal-deep">
                Personalisation
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="text-sm font-black text-vocali-teal-deep">
                Display name
              </span>
              <input
                type="text"
                value={preferences.displayName}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                className="mt-2 h-12 w-full rounded-[1rem] border-2 border-vocali-border bg-vocali-cream px-4 text-base font-black text-vocali-teal-deep outline-none focus:border-vocali-teal"
                maxLength={32}
              />
            </label>

            <PreferenceChoices
              label="Focus area"
              options={focusAreaOptions}
              selectedValue={preferences.focusArea}
              onSelect={(focusArea) =>
                setPreferences((current) => ({ ...current, focusArea }))
              }
            />

            <PreferenceChoices
              label="Daily goal"
              options={dailyGoalOptions}
              selectedValue={preferences.dailyGoal}
              onSelect={(dailyGoal) =>
                setPreferences((current) => ({ ...current, dailyGoal }))
              }
            />

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={savePreferenceStatus !== "idle"}
              className={`flex h-14 w-full items-center justify-center gap-2 rounded-[1.1rem] px-5 text-base font-black text-white shadow-[0_12px_24px_rgb(255_122_26/0.24)] transition disabled:cursor-not-allowed ${
                savePreferenceStatus === "saved"
                  ? "bg-vocali-teal shadow-[0_12px_24px_rgb(0_167_165/0.2)]"
                  : "bg-vocali-orange disabled:opacity-85"
              }`}
            >
              {savePreferenceStatus === "saved" ? (
                <Check className="h-5 w-5" strokeWidth={4} />
              ) : null}
              {savePreferenceStatus === "saving"
                ? "Saving..."
                : savePreferenceStatus === "saved"
                  ? "Saved"
                  : "Save preferences"}
            </button>
            {savePreferenceStatus === "saved" ? (
              <p className="text-center text-sm font-black text-vocali-teal">
                Preferences saved on this device.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.75} />
            </div>
            <div>
              <h2 className="text-xl font-black text-vocali-teal-deep">
                Account and privacy
              </h2>
              <p className="mt-1 text-sm font-bold leading-5 text-vocali-muted">
                {auth.user?.email ?? "Your signed-in Vocali account"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {auth.user?.identities?.some(
              (identity) => identity.provider === "email",
            ) ? (
              <SettingsLink
                href="/reset-password"
                icon={KeyRound}
                label="Change password"
              />
            ) : null}
            <SettingsLink href="/privacy" icon={ShieldCheck} label="Privacy" />
            <SettingsLink href="/support" icon={LifeBuoy} label="Support" />
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmation("");
                setIsDeleteDialogOpen(true);
              }}
              className="flex w-full items-center justify-between gap-4 rounded-[1.1rem] bg-vocali-orange/10 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <UserRoundX
                  className="h-5 w-5 shrink-0 text-vocali-orange"
                  strokeWidth={3}
                />
                <div>
                  <p className="text-sm font-black text-vocali-orange">
                    Delete account permanently
                  </p>
                  <p className="mt-1 text-xs font-bold leading-4 text-vocali-muted">
                    Removes your account and synced data, not just this device.
                  </p>
                </div>
              </div>
              <ChevronRightIcon />
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
              <HardDrive className="h-6 w-6" strokeWidth={2.75} />
            </div>
            <div>
              <h2 className="text-xl font-black text-vocali-teal-deep">
                Local data
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <SettingsAction
              icon={History}
              label="Clear practice history"
              onClick={handleClearAttempts}
            />
            <SettingsAction
              disabled={isClearing}
              icon={Volume2}
              label="Clear saved recordings"
              onClick={handleClearRecordings}
            />
            <SettingsAction
              icon={RotateCcw}
              label="Reset onboarding"
              onClick={handleResetOnboarding}
            />
          </div>
        </section>

        <section className="mt-5 rounded-[1.75rem] border-2 border-vocali-orange/20 bg-white p-5 shadow-[0_12px_28px_rgb(7_50_71/0.08)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vocali-orange/12 text-vocali-orange">
              <Settings className="h-6 w-6" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-vocali-teal-deep">
                Reset device data
              </h2>
              <p className="mt-2 text-sm font-bold leading-5 text-vocali-muted">
                Use this if you want Vocali to feel fresh on this device,
                including practice preferences.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAll}
            disabled={isClearing}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-vocali-orange px-4 text-base font-black text-white shadow-[0_12px_24px_rgb(255_122_26/0.22)] disabled:opacity-70"
          >
            <Trash2 className="h-5 w-5" strokeWidth={3} />
            {isClearing ? "Resetting..." : "Reset all local data"}
          </button>
        </section>

        <Link
          href="/profile"
          className="mt-auto flex h-16 w-full items-center justify-center gap-3 text-base font-black text-vocali-teal"
        >
          Back to profile
        </Link>
        </section>
        {isDeleteDialogOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-vocali-teal-deep/55 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="w-full max-w-[430px] rounded-[1.75rem] bg-white p-5 shadow-[0_24px_60px_rgb(7_50_71/0.3)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-vocali-orange">
                    Permanent action
                  </p>
                  <h2
                    id="delete-account-title"
                    className="mt-1 text-2xl font-black text-vocali-teal-deep"
                  >
                    Delete your account?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeletingAccount}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vocali-cream text-vocali-teal-deep disabled:opacity-50"
                  aria-label="Close account deletion confirmation"
                >
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>
              <p className="mt-4 text-sm font-bold leading-6 text-vocali-muted">
                This removes your Vocali account, profile, synced practice
                history, transcripts, and metrics. It cannot be undone. Type
                DELETE to continue.
              </p>
              <label className="mt-4 block">
                <span className="sr-only">Type DELETE to confirm</span>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  autoComplete="off"
                  placeholder="DELETE"
                  className="h-12 w-full rounded-[1rem] border-2 border-vocali-border bg-vocali-cream px-4 text-base font-black text-vocali-teal-deep outline-none focus:border-vocali-orange"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={
                  deleteConfirmation !== "DELETE" || isDeletingAccount
                }
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-vocali-orange px-4 text-base font-black text-white disabled:opacity-45"
              >
                <Trash2 className="h-5 w-5" strokeWidth={3} />
                {isDeletingAccount
                  ? "Deleting account..."
                  : "Delete account permanently"}
              </button>
            </div>
          </div>
        ) : null}
      </ScreenFrame>
    </AuthGate>
  );
}

type SettingsActionProps = {
  disabled?: boolean;
  icon: typeof History;
  label: string;
  onClick: () => void | Promise<void>;
};

function SettingsLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof History;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-between gap-4 rounded-[1.1rem] bg-vocali-cream px-4 py-3 text-left"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-vocali-teal" strokeWidth={3} />
        <p className="text-sm font-black text-vocali-teal-deep">{label}</p>
      </div>
      <ChevronRightIcon />
    </Link>
  );
}

function PreferenceChoices<T extends FocusArea | DailyGoal>({
  label,
  onSelect,
  options,
  selectedValue,
}: {
  label: string;
  onSelect: (value: T) => void;
  options: readonly T[];
  selectedValue: T;
}) {
  return (
    <div>
      <p className="text-sm font-black text-vocali-teal-deep">{label}</p>
      <div className="mt-2 space-y-2">
        {options.map((option) => {
          const isSelected = option === selectedValue;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option)}
              className={`flex min-h-11 w-full items-center justify-between rounded-[1rem] px-4 py-3 text-left text-sm font-black transition ${
                isSelected
                  ? "bg-vocali-teal text-white shadow-[0_10px_20px_rgb(0_167_165/0.16)]"
                  : "bg-vocali-cream text-vocali-muted"
              }`}
            >
              {option}
              {isSelected ? (
                <Check className="h-4 w-4 shrink-0" strokeWidth={4} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingsAction({
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: SettingsActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-4 rounded-[1.1rem] bg-vocali-cream px-4 py-3 text-left transition disabled:opacity-65"
    >
      <div className="flex items-center gap-3">
        <Icon
          className="h-5 w-5 shrink-0 text-vocali-teal"
          strokeWidth={3}
        />
        <div>
          <p className="text-sm font-black text-vocali-teal-deep">{label}</p>
        </div>
      </div>
      <ChevronRightIcon />
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-vocali-teal">
      <ArrowLeft className="h-4 w-4 rotate-180" strokeWidth={3} />
    </span>
  );
}
