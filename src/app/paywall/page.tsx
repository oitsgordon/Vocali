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

export default function PaywallPage() {
  return <PaywallScreen />;
}
