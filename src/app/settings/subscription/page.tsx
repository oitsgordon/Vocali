import type { Metadata } from "next";
import { SubscriptionScreen } from "@/components/subscriptions/SubscriptionScreen";

export const metadata: Metadata = {
  title: "Manage subscription | Vocali",
  robots: { index: false, follow: false },
};

export default function SubscriptionPage() {
  return <SubscriptionScreen />;
}
