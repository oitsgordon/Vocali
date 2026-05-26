import Link from "next/link";
import type { ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({
  children,
  href,
  variant = "primary",
}: PrimaryButtonProps) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "flex h-16 w-full items-center justify-center rounded-[1.15rem] bg-vocali-orange px-6 text-xl font-black text-white shadow-[0_14px_24px_rgb(255_122_26/0.26)] transition hover:-translate-y-0.5"
          : "flex h-16 w-full items-center justify-center rounded-[1.15rem] border-2 border-vocali-teal bg-white/55 px-6 text-lg font-black text-vocali-teal transition hover:bg-white"
      }
    >
      {children}
    </Link>
  );
}
