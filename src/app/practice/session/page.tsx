import { PracticeSession } from "@/components/practice/PracticeSession";
import { ScreenFrame } from "@/components/layout/ScreenFrame";

type PracticeSessionPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    challenge?: string | string[];
    plan?: string | string[];
    speak?: string | string[];
    source?: string | string[];
  }>;
};

function getPlanningSeconds(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number(rawValue);

  if (parsedValue === 15 || parsedValue === 30 || parsedValue === 60) {
    return parsedValue;
  }

  return 30;
}

function getSpeakingSeconds(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number(rawValue);

  if (parsedValue === 30 || parsedValue === 60 || parsedValue === 90) {
    return parsedValue;
  }

  return 60;
}

function getSessionSource(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === "home" || rawValue === "onboarding") {
    return rawValue;
  }

  return "practice";
}

export default async function PracticeSessionPage({
  searchParams,
}: PracticeSessionPageProps) {
  const params = await searchParams;
  const categorySlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const challengeId = Array.isArray(params.challenge)
    ? params.challenge[0]
    : params.challenge;
  const planningSeconds = getPlanningSeconds(params.plan);
  const speakingSeconds = getSpeakingSeconds(params.speak);
  const source = getSessionSource(params.source);

  return (
    <ScreenFrame>
      <PracticeSession
        categorySlug={categorySlug}
        challengeId={challengeId}
        isDailyChallenge={source === "home" || source === "onboarding"}
        planningSeconds={planningSeconds}
        source={source}
        speakingSeconds={speakingSeconds}
      />
    </ScreenFrame>
  );
}
