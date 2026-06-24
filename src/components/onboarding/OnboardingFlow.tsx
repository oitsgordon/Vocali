"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { MascotPlaceholder } from "@/components/brand/MascotPlaceholder";
import { VocaliLogo } from "@/components/brand/VocaliLogo";

const focusOptions = [
  "Speaking more naturally",
  "Thinking on the spot",
  "Explaining ideas clearly",
  "Social situations",
  "Interview practice",
] as const;

const habitOptions = ["1 short prompt", "3 minutes", "5 minutes"] as const;

type FocusOption = (typeof focusOptions)[number];
type HabitOption = (typeof habitOptions)[number];

const focusQuickRepPrompts: Record<
  FocusOption,
  {
    challengeId: string;
    prompt: string;
  }
> = {
  "Speaking more naturally": {
    challengeId: "onboarding-speaking-natural",
    prompt: "What is something you enjoy talking about?",
  },
  "Thinking on the spot": {
    challengeId: "onboarding-thinking-spot",
    prompt: "What would you do with an extra free hour today?",
  },
  "Explaining ideas clearly": {
    challengeId: "onboarding-explain-idea",
    prompt: "Explain one app, game, or tool you like using.",
  },
  "Social situations": {
    challengeId: "onboarding-social-situations",
    prompt: "What is a simple way to start a conversation with someone new?",
  },
  "Interview practice": {
    challengeId: "onboarding-interview-practice",
    prompt: "Tell me one thing you are good at.",
  },
};

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedFocus, setSelectedFocus] = useState<FocusOption>(
    "Speaking more naturally",
  );
  const [selectedHabit, setSelectedHabit] =
    useState<HabitOption>("1 short prompt");

  function saveOnboardingChoices() {
    try {
      window.localStorage.setItem(
        "vocali:onboarding",
        JSON.stringify({
          focus: selectedFocus,
          habit: selectedHabit,
          completedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Safari private mode can block storage; onboarding should still continue.
    }
  }

  function finishOnboarding() {
    saveOnboardingChoices();
    router.push("/home");
  }

  function startQuickRep() {
    saveOnboardingChoices();
    const quickRep = focusQuickRepPrompts[selectedFocus];
    const params = new URLSearchParams({
      challenge: quickRep.challengeId,
      plan: "15",
      speak: "30",
      source: "onboarding",
    });

    router.push(`/practice/session?${params.toString()}`);
  }

  return (
    <section
      className={`vocali-safe-top vocali-safe-top-loose vocali-safe-bottom flex min-h-dvh flex-col px-7 pb-7 pt-10 sm:min-h-[860px] sm:pt-12 ${
        step === 0 ? "vocali-onboarding-welcome-screen" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <VocaliLogo size="sm" />
        <StepDots activeStep={step} />
      </div>

      {step === 0 ? (
        <WelcomeStep onNext={() => setStep(1)} />
      ) : step === 1 ? (
        <ChoiceStep
          eyebrow="Your focus"
          question="What do you want to practise most?"
          options={focusOptions}
          selectedOption={selectedFocus}
          onSelect={setSelectedFocus}
          onNext={() => setStep(2)}
          buttonLabel="Continue"
        />
      ) : step === 2 ? (
        <ChoiceStep
          eyebrow="Daily habit"
          question="What feels doable each day?"
          supportText="Start small. Confidence comes from reps."
          options={habitOptions}
          selectedOption={selectedHabit}
          onSelect={setSelectedHabit}
          onNext={() => setStep(3)}
          buttonLabel="Continue"
        />
      ) : (
        <QuickRepStep
          focus={selectedFocus}
          prompt={focusQuickRepPrompts[selectedFocus].prompt}
          onSkip={finishOnboarding}
          onStart={startQuickRep}
        />
      )}
    </section>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="vocali-onboarding-welcome flex flex-1 flex-col justify-between text-center">
      <div>
        <h1 className="vocali-onboarding-welcome-heading text-[2.65rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
          Build speaking confidence, one short prompt at a time.
        </h1>
        <p className="vocali-onboarding-welcome-copy mx-auto mt-5 max-w-xs text-lg font-bold leading-7 text-vocali-muted">
          Practise thinking out loud, explaining ideas, and speaking more
          naturally.
        </p>
      </div>

      <div className="vocali-onboarding-mascot my-4">
        <MascotPlaceholder />
      </div>

      <div className="vocali-onboarding-actions space-y-4">
        <button
          type="button"
          onClick={onNext}
          className="vocali-onboarding-action flex h-16 w-full items-center justify-center rounded-[1.15rem] bg-vocali-orange px-6 text-xl font-black text-white shadow-[0_14px_24px_rgb(255_122_26/0.26)] transition hover:-translate-y-0.5"
        >
          Get started
        </button>
        <Link
          href="/login"
          className="vocali-onboarding-action flex h-16 w-full items-center justify-center rounded-[1.15rem] border-2 border-vocali-teal bg-white/55 px-6 text-lg font-black text-vocali-teal transition hover:bg-white"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}

type ChoiceStepProps<T extends string> = {
  eyebrow: string;
  question: string;
  supportText?: string;
  options: readonly T[];
  selectedOption: T;
  onSelect: (option: T) => void;
  onNext: () => void;
  buttonLabel: string;
};

function ChoiceStep<T extends string>({
  eyebrow,
  question,
  supportText,
  options,
  selectedOption,
  onSelect,
  onNext,
  buttonLabel,
}: ChoiceStepProps<T>) {
  return (
    <div className="flex flex-1 flex-col pt-10">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-vocali-teal/12 text-vocali-teal">
          <Sparkles className="h-8 w-8" strokeWidth={3} />
        </div>
        <p className="mt-7 text-center text-sm font-black uppercase tracking-[0.14em] text-vocali-teal">
          {eyebrow}
        </p>
        <h1 className="mx-auto mt-3 max-w-sm text-center text-[2.35rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
          {question}
        </h1>
        {supportText ? (
          <p className="mx-auto mt-4 max-w-xs text-center text-lg font-bold leading-7 text-vocali-muted">
            {supportText}
          </p>
        ) : null}
      </div>

      <div className="mt-8 space-y-3">
        {options.map((option) => {
          const isSelected = selectedOption === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option)}
              className={`flex min-h-16 w-full items-center justify-between gap-4 rounded-[1.25rem] p-4 text-left text-base font-black shadow-[0_12px_28px_rgb(7_50_71/0.08)] transition ${
                isSelected
                  ? "bg-vocali-teal-deep text-white"
                  : "bg-white text-vocali-teal-deep"
              }`}
            >
              <span>{option}</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isSelected
                    ? "bg-vocali-orange text-white"
                    : "bg-vocali-teal/12 text-vocali-teal"
                }`}
              >
                {isSelected ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-7">
        <button
          type="button"
          onClick={onNext}
          className="flex h-16 w-full items-center justify-center rounded-[1.15rem] bg-vocali-orange px-6 text-xl font-black text-white shadow-[0_14px_24px_rgb(255_122_26/0.26)]"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function QuickRepStep({
  focus,
  prompt,
  onSkip,
  onStart,
}: {
  focus: FocusOption;
  prompt: string;
  onSkip: () => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pt-10">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-vocali-teal/12 text-vocali-teal">
          <Sparkles className="h-8 w-8" strokeWidth={3} />
        </div>
        <p className="mt-7 text-center text-sm font-black uppercase tracking-[0.14em] text-vocali-teal">
          First rep
        </p>
        <h1 className="mx-auto mt-3 max-w-sm text-center text-[2.35rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
          Try your first quick rep?
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-center text-lg font-bold leading-7 text-vocali-muted">
          We&apos;ll give you a short prompt based on your focus.
        </p>
      </div>

      <div className="mt-8 rounded-[1.65rem] bg-white p-5 text-left shadow-vocali-card">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-vocali-teal">
          {focus}
        </p>
        <p className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-vocali-teal-deep">
          {prompt}
        </p>
        <p className="mt-4 text-sm font-black text-vocali-muted">
          15 sec plan &middot; 30 sec speak
        </p>
      </div>

      <div className="mt-auto space-y-4 pt-7">
        <button
          type="button"
          onClick={onStart}
          className="flex h-16 w-full items-center justify-center rounded-[1.15rem] bg-vocali-orange px-6 text-xl font-black text-white shadow-[0_14px_24px_rgb(255_122_26/0.26)]"
        >
          Try quick rep
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex h-16 w-full items-center justify-center rounded-[1.15rem] border-2 border-vocali-teal bg-white/55 px-6 text-lg font-black text-vocali-teal"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function StepDots({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${activeStep + 1} of 4`}>
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={
            index === activeStep
              ? "h-2.5 w-8 rounded-full bg-vocali-orange"
              : "h-2.5 w-2.5 rounded-full bg-vocali-teal/20"
          }
        />
      ))}
    </div>
  );
}
