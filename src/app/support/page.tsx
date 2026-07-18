import Link from "next/link";
import {
  ArrowLeft,
  CircleHelp,
  KeyRound,
  Mail,
  Mic,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { VocaliLogo } from "@/components/brand/VocaliLogo";
import { ScreenFrame } from "@/components/layout/ScreenFrame";

const supportTopics = [
  {
    title: "Password and sign-in",
    icon: KeyRound,
    copy:
      "Use Forgot password? on the login screen to request a recovery email. If the message does not arrive, check spam and confirm that you entered the address used for your Vocali account.",
  },
  {
    title: "Microphone access",
    icon: Mic,
    copy:
      "Vocali needs microphone permission to record practice. On iPhone, open Settings, find Vocali, and enable Microphone if access was previously declined.",
  },
  {
    title: "Transcription problems",
    icon: RefreshCcw,
    copy:
      "Check your connection and try the recording again. Temporary limits or provider outages may prevent a transcript, but basic practice feedback can still continue.",
  },
  {
    title: "Delete data or account",
    icon: Trash2,
    copy:
      "Settings separates device-only data controls from permanent account deletion. Deleting your account removes the account and synced data; resetting device data does not delete the account.",
  },
];

export default function SupportPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  return (
    <ScreenFrame>
      <section className="vocali-safe-top vocali-safe-bottom flex min-h-dvh flex-col px-5 pb-7 pt-7 sm:min-h-[860px]">
        <header className="flex items-center gap-2.5">
          <VocaliLogo size="xs" variant="mark" />
          <p className="text-base font-black text-vocali-teal-deep">Support</p>
        </header>

        <div className="mt-6">
          <p className="text-lg font-black text-vocali-teal">Vocali support</p>
          <h1 className="mt-2 text-[2.5rem] font-black leading-[1.05] tracking-[-0.04em] text-vocali-teal-deep">
            Help when you need it.
          </h1>
          <p className="mt-4 text-base font-bold leading-6 text-vocali-muted">
            Start with these common fixes, then contact support if the problem
            continues.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {supportTopics.map((topic) => {
            const Icon = topic.icon;

            return (
              <section
                key={topic.title}
                className="rounded-[1.5rem] bg-white p-5 shadow-vocali-card"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vocali-teal/12 text-vocali-teal">
                    <Icon className="h-6 w-6" strokeWidth={3} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-vocali-teal-deep">
                      {topic.title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-5 text-vocali-muted">
                      {topic.copy}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-3 rounded-[1.5rem] bg-vocali-teal-deep p-5 text-white">
          <div className="flex items-start gap-4">
            {supportEmail ? (
              <Mail className="mt-1 h-6 w-6 shrink-0 text-vocali-orange" strokeWidth={3} />
            ) : (
              <CircleHelp className="mt-1 h-6 w-6 shrink-0 text-vocali-orange" strokeWidth={3} />
            )}
            <div>
              <h2 className="text-lg font-black">Contact Vocali</h2>
              {supportEmail ? (
                <>
                  <p className="mt-2 text-sm font-semibold leading-5 text-white/75">
                    Include the device, iOS version, and what happened. Do not
                    send passwords or recordings containing sensitive details.
                  </p>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-3 inline-flex text-sm font-black text-vocali-orange"
                  >
                    {supportEmail}
                  </a>
                </>
              ) : (
                <p className="mt-2 text-sm font-black leading-5 text-vocali-orange">
                  A monitored support email must be configured before public
                  release.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/privacy"
            className="flex h-14 items-center justify-center rounded-[1.1rem] bg-white text-base font-black text-vocali-teal shadow-vocali-card"
          >
            Privacy policy
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
