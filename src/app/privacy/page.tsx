import Link from "next/link";
import { ArrowLeft, Database, Mic, Sparkles } from "lucide-react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";

const privacySections = [
  {
    title: "Your recordings",
    icon: Mic,
    copy:
      "Saved audio replays stay on this device. When you submit a recording, the audio is sent securely to Vocali's transcription endpoint so it can prepare a transcript.",
  },
  {
    title: "Your practice history",
    icon: Database,
    copy:
      "Signed-in accounts store progress, transcripts, speaking metrics, and feedback in Supabase so history can sync across devices. Audio replay files are not synced to the cloud.",
  },
  {
    title: "Speaking metrics",
    icon: Sparkles,
    copy:
      "When a transcript is available, Vocali uses it to calculate simple signals like word count, pace, filler words, repetition, and time used.",
  },
  {
    title: "Payments and coaching",
    icon: Sparkles,
    copy:
      "Vocali does not use payments or subscriptions. Feedback is based on transcript-derived signals, not semantic judgement of answer quality.",
  },
];

export default function PrivacyPage() {
  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-5 pb-7 pt-7 sm:min-h-[860px]">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VocaliLogo size="xs" variant="mark" />
            <p className="text-base font-black text-vocali-teal-deep">
              Privacy
            </p>
          </div>
          <span className="rounded-full bg-vocali-teal/12 px-4 py-2 text-sm font-black text-vocali-teal">
            Audio stays local
          </span>
        </header>

        <div className="mt-6">
          <p className="text-lg font-black text-vocali-teal">Privacy</p>
          <h1 className="mt-2 text-[2.5rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
            Your practice stays close to you.
          </h1>
          <p className="mt-4 text-base font-bold leading-6 text-vocali-muted">
            Your account can sync progress, transcripts, and metrics. Audio
            replays stay on this device, and submitted audio is sent only when
            you ask Vocali to transcribe an attempt.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {privacySections.map((section) => {
            const Icon = section.icon;

            return (
              <section
                key={section.title}
                className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_28px_rgb(7_50_71/0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
                    <Icon className="h-6 w-6" strokeWidth={3} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-vocali-teal-deep">
                      {section.title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-5 text-vocali-muted">
                      {section.copy}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <Link
          href="/profile"
          className="mt-3 flex h-16 w-full items-center justify-center gap-3 rounded-[1.2rem] bg-vocali-orange px-5 text-lg font-black text-white shadow-[0_14px_26px_rgb(255_122_26/0.28)]"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={3} />
          Back to profile
        </Link>
      </section>
    </ScreenFrame>
  );
}
