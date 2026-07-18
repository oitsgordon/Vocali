import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Cloud,
  Database,
  Mail,
  Mic,
  UserRound,
} from "lucide-react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";

const privacySections = [
  {
    title: "Account and profile",
    icon: UserRound,
    copy:
      "Vocali stores your email address, account identifier, display name, focus area, and daily goal so you can sign in and keep your profile consistent across devices. Apple may provide a private relay email when you choose Hide My Email.",
  },
  {
    title: "Practice history",
    icon: Database,
    copy:
      "Your prompts, transcripts, speaking metrics, feedback, streak information, and completion dates are linked to your account and stored in Supabase so your progress can sync across signed-in devices.",
  },
  {
    title: "Recordings and transcription",
    icon: Mic,
    copy:
      "Saved replay recordings remain in this device’s browser storage and are not synced to your Vocali account. When you request transcription, the selected audio is sent through Vocali’s server to OpenAI’s audio transcription API. Vocali does not keep a server copy of the raw audio.",
  },
  {
    title: "Service providers",
    icon: Cloud,
    copy:
      "Supabase provides authentication and synced data storage. OpenAI processes submitted audio to return a transcript. Vercel hosts the Vocali web application and server routes. These providers process data only as needed to operate Vocali under their service terms.",
  },
  {
    title: "Retention and deletion",
    icon: Clock3,
    copy:
      "Synced account data remains until you delete your Vocali account. Device recordings and local practice data remain until you clear them, reset the app, remove site data, or delete your account. Permanent account deletion is available in Settings and removes your account and associated synced data.",
  },
];

export default function PrivacyPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-5 pb-7 pt-7 sm:min-h-[860px]">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <VocaliLogo size="xs" variant="mark" />
            <p className="text-base font-black text-vocali-teal-deep">
              Privacy
            </p>
          </div>
          <span className="rounded-full bg-vocali-teal/12 px-4 py-2 text-sm font-black text-vocali-teal">
            No advertising
          </span>
        </header>

        <div className="mt-6">
          <p className="text-lg font-black text-vocali-teal">Privacy policy</p>
          <h1 className="mt-2 text-[2.5rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
            How Vocali handles your data.
          </h1>
          <p className="mt-4 text-base font-bold leading-6 text-vocali-muted">
            This policy explains what Vocali stores, when audio leaves your
            device, who processes it, and how to remove your information.
          </p>
          <p className="mt-3 text-sm font-bold text-vocali-muted">
            Last updated: 18 July 2026
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

        <section className="mt-3 rounded-[1.5rem] bg-vocali-teal-deep p-5 text-white">
          <div className="flex items-start gap-4">
            <Mail className="mt-1 h-6 w-6 shrink-0 text-vocali-orange" strokeWidth={3} />
            <div>
              <h2 className="text-lg font-black">Questions and requests</h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-white/75">
                Use Settings to delete your account. For privacy questions or
                help with a request, contact Vocali support.
              </p>
              {supportEmail ? (
                <a
                  href={`mailto:${supportEmail}`}
                  className="mt-3 inline-flex text-sm font-black text-vocali-orange"
                >
                  {supportEmail}
                </a>
              ) : (
                <p className="mt-3 text-sm font-black text-vocali-orange">
                  Support email must be configured before public release.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/support"
            className="flex h-14 items-center justify-center rounded-[1.1rem] bg-white text-base font-black text-vocali-teal shadow-vocali-card"
          >
            Support
          </Link>
          <Link
            href="/profile"
            className="flex h-14 items-center justify-center gap-2 rounded-[1.1rem] bg-vocali-orange text-base font-black text-white"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
            Back to profile
          </Link>
        </div>
      </section>
    </ScreenFrame>
  );
}
