"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/authStore";
import { publicPageHref, publicReturnDestination } from "@/lib/publicNavigation";

export function PublicPageLinks({ page, returnTo }: { page: "/privacy" | "/support"; returnTo?: string | string[] }) {
  const auth = useAuth();
  const destination = publicReturnDestination(returnTo) ?? (auth.user ? "/profile" : "/");
  const label = destination.startsWith("/paywall") ? "Back to plans" : destination === "/settings/subscription" ? "Back to subscription" : destination === "/settings" ? "Back to Settings" : destination === "/profile" ? "Back to profile" : destination.startsWith("/login") ? "Back to sign in" : destination === "/home" ? "Back to Home" : "Back to welcome";
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Link href={publicPageHref(page === "/privacy" ? "/support" : "/privacy", destination)} className="flex min-h-14 items-center justify-center rounded-[1.1rem] bg-white px-3 py-2 text-base font-black text-vocali-teal shadow-vocali-card">{page === "/privacy" ? "Support" : "Privacy policy"}</Link>
      <Link href={destination} className="flex min-h-14 items-center justify-center gap-2 rounded-[1.1rem] bg-vocali-orange px-3 py-2 text-center text-base font-black text-white"><ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0" />{label}</Link>
    </div>
  );
}
