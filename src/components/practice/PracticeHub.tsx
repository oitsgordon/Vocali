"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  MessageCircle,
  Mic,
  Shuffle,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import {
  getCategoryBySlug,
  practiceCategories,
  type PracticeCategorySlug,
} from "@/data/mockChallenges";

const planningTimes = [15, 30, 60] as const;
const speakingTimes = [30, 60, 90] as const;
const practicePreferencesKey = "vocali:practice-preferences";

const categoryIcons = {
  "talk-about-yourself": UserRound,
  "think-on-the-spot": Zap,
  "explain-an-idea": Sparkles,
  "social-situations": MessageCircle,
  "interview-practice": Mic,
};

type PracticeHubProps = {
  initialCategory?: PracticeCategorySlug;
  initialPlanningTime?: number;
  initialSpeakingTime?: number;
};

type PlanningTime = (typeof planningTimes)[number];
type SpeakingTime = (typeof speakingTimes)[number];

function getPlanningTime(value: number | undefined): PlanningTime {
  if (value === 15 || value === 30 || value === 60) {
    return value;
  }

  return 30;
}

function getSpeakingTime(value: number | undefined): SpeakingTime {
  if (value === 30 || value === 60 || value === 90) {
    return value;
  }

  return 60;
}

function getSavedPracticePreferences({
  initialPlanningTime,
  initialSpeakingTime,
}: {
  initialPlanningTime: number | undefined;
  initialSpeakingTime: number | undefined;
}) {
  const fallbackPreferences = {
    planningTime: getPlanningTime(initialPlanningTime),
    speakingTime: getSpeakingTime(initialSpeakingTime),
  };

  if (typeof window === "undefined") {
    return fallbackPreferences;
  }

  try {
    const rawPreferences = window.localStorage.getItem(practicePreferencesKey);

    if (!rawPreferences) {
      return fallbackPreferences;
    }

    const parsedPreferences: unknown = JSON.parse(rawPreferences);

    if (typeof parsedPreferences === "object" && parsedPreferences !== null) {
      const preferences = parsedPreferences as Record<string, unknown>;

      return {
        planningTime:
          preferences.planningTime === undefined
            ? fallbackPreferences.planningTime
            : getPlanningTime(Number(preferences.planningTime)),
        speakingTime:
          preferences.speakingTime === undefined
            ? fallbackPreferences.speakingTime
            : getSpeakingTime(Number(preferences.speakingTime)),
      };
    }
  } catch {
    return fallbackPreferences;
  }

  return fallbackPreferences;
}

function savePracticePreferences({
  planningTime,
  speakingTime,
}: {
  planningTime: PlanningTime;
  speakingTime: SpeakingTime;
}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      practicePreferencesKey,
      JSON.stringify({ planningTime, speakingTime }),
    );
  } catch {
    // Preference saving is non-critical for the practice flow.
  }
}

export function PracticeHub({
  initialCategory,
  initialPlanningTime,
  initialSpeakingTime,
}: PracticeHubProps) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<PracticeCategorySlug | null>(
    initialCategory ?? null,
  );
  const [selectedPlanningTime, setSelectedPlanningTime] = useState(
    () =>
      getSavedPracticePreferences({
        initialPlanningTime,
        initialSpeakingTime,
      }).planningTime,
  );
  const [selectedSpeakingTime, setSelectedSpeakingTime] = useState(() =>
    getSavedPracticePreferences({
      initialPlanningTime,
      initialSpeakingTime,
    }).speakingTime,
  );
  const category = useMemo(
    () => (selectedSlug ? getCategoryBySlug(selectedSlug) : null),
    [selectedSlug],
  );
  const sessionUrl = useMemo(() => {
    if (!selectedSlug) {
      return null;
    }

    const params = new URLSearchParams({
      category: selectedSlug,
      plan: String(selectedPlanningTime),
      speak: String(selectedSpeakingTime),
      source: "practice",
    });

    return `/practice/session?${params.toString()}`;
  }, [selectedPlanningTime, selectedSlug, selectedSpeakingTime]);

  function selectPlanningTime(time: PlanningTime) {
    setSelectedPlanningTime(time);
    savePracticePreferences({
      planningTime: time,
      speakingTime: selectedSpeakingTime,
    });
  }

  function selectSpeakingTime(time: SpeakingTime) {
    setSelectedSpeakingTime(time);
    savePracticePreferences({
      planningTime: selectedPlanningTime,
      speakingTime: time,
    });
  }

  function startPractice() {
    if (!sessionUrl) {
      return;
    }

    router.push(sessionUrl);
  }

  return (
    <div className="px-5 pb-8 pt-7">
      <header>
        <p className="text-lg font-black text-vocali-teal">Practice</p>
        <h1 className="mt-2 text-[2.45rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
          Choose your practice
        </h1>
        <p className="mt-3 text-base font-bold leading-6 text-vocali-muted">
          Pick a prompt style, then set your timing.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {practiceCategories.map((item) => {
          const Icon = categoryIcons[item.slug];
          const isSelected = selectedSlug === item.slug;

          return (
            <button
              key={item.slug}
              aria-pressed={isSelected}
              className={`flex w-full items-center gap-4 rounded-[1.5rem] p-4 text-left shadow-[0_12px_28px_rgb(7_50_71/0.08)] transition ${
                isSelected
                  ? "bg-vocali-teal-deep text-white shadow-[0_18px_38px_rgb(7_50_71/0.16)]"
                  : "bg-white text-vocali-teal-deep"
              }`}
              onClick={() => setSelectedSlug(item.slug)}
              type="button"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isSelected
                    ? "bg-white/12 text-vocali-orange"
                    : "bg-vocali-teal/12 text-vocali-teal"
                }`}
              >
                <Icon className="h-7 w-7" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black leading-5">
                  {item.label}
                </span>
                <span
                  className={`mt-1 block text-sm font-bold leading-5 ${
                    isSelected ? "text-white/72" : "text-vocali-muted"
                  }`}
                >
                  {item.copy}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-5 space-y-4 rounded-[1.75rem] bg-white p-5 shadow-vocali-card">
        <TimeSegmentedControl
          label="Planning time"
          options={planningTimes}
          selectedValue={selectedPlanningTime}
          onSelect={selectPlanningTime}
        />
        <div className="h-px bg-vocali-border/55" />
        <TimeSegmentedControl
          label="Speaking time"
          options={speakingTimes}
          selectedValue={selectedSpeakingTime}
          onSelect={selectSpeakingTime}
          variant="orange"
        />
        <p className="text-sm font-bold text-vocali-muted">
          Pick a little thinking time, then speak your answer out loud.
        </p>
      </section>

      <section className="mt-5 rounded-[2rem] bg-vocali-teal-deep p-5 text-white shadow-[0_20px_45px_rgb(7_50_71/0.16)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-vocali-orange">
            <Shuffle className="h-8 w-8" strokeWidth={3} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#8be4dd]">
              Session preview
            </p>
            <h2 className="mt-1 text-2xl font-black leading-7">
              {category?.label ?? "Choose a prompt type"}
            </h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black text-[#8be4dd]">
            <Clock3 className="h-3.5 w-3.5" />
            {selectedPlanningTime} sec planning
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-vocali-orange/20 px-3 py-1.5 text-xs font-black text-[#ffd0ad]">
            <Mic className="h-3.5 w-3.5" />
            {selectedSpeakingTime} sec speaking
          </span>
        </div>

        <p className="mt-4 text-base font-bold leading-6 text-white/78">
          {category
            ? "Random prompt chosen when you start."
            : "Pick a category to start a practice session."}
        </p>

        <button
          className="mt-5 flex h-16 w-full items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)] transition disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!category}
          onClick={startPractice}
          type="button"
        >
          {category ? "Start practice" : "Choose a category"}
          <ArrowRight className="h-6 w-6" strokeWidth={3} />
        </button>
      </section>
    </div>
  );
}

function TimeSegmentedControl<T extends number>({
  label,
  onSelect,
  options,
  selectedValue,
  variant = "teal",
}: {
  label: string;
  onSelect: (value: T) => void;
  options: readonly T[];
  selectedValue: T;
  variant?: "orange" | "teal";
}) {
  return (
    <div>
      <h2 className="text-base font-black text-vocali-teal-deep">{label}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-[1.2rem] bg-vocali-cream p-1.5">
        {options.map((time) => {
          const isSelected = selectedValue === time;

          return (
            <button
              key={time}
              aria-pressed={isSelected}
              className={`flex h-11 items-center justify-center rounded-[0.85rem] text-sm font-black transition ${
                isSelected
                  ? variant === "orange"
                    ? "bg-vocali-orange text-white shadow-[0_10px_20px_rgb(255_122_26/0.2)]"
                    : "bg-vocali-teal text-white shadow-[0_10px_20px_rgb(0_167_165/0.16)]"
                  : "text-vocali-muted"
              }`}
              onClick={() => onSelect(time)}
              type="button"
            >
              {time} sec
            </button>
          );
        })}
      </div>
    </div>
  );
}
