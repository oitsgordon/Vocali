import type { Metadata } from "next";
import { PaywallScreen } from "@/components/paywall/PaywallScreen";

export const metadata: Metadata = {
  title: "Choose a plan | Vocali",
  description: "Choose a Vocali speaking practice subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

type PaywallPageProps = {
  searchParams: Promise<{ from?: string | string[]; mode?: string | string[]; redirect?: string | string[]; plan?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaywallPage({ searchParams }: PaywallPageProps) {
  const params = await searchParams;
  const source = first(params.from);
  return <PaywallScreen entry={{
    from: source === "settings" || source === "subscription" || source === "login" || source === "onboarding" || source === "gate" ? source : undefined,
    mode: first(params.mode) === "signup" ? "signup" : "login",
    redirect: first(params.redirect),
    plan: first(params.plan),
  }} />;
}
