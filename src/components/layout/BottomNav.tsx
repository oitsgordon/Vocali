"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, Trophy, UserRound } from "lucide-react";

const items = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Progress", href: "/progress", icon: Trophy },
  { label: "Practice", href: "/practice", icon: Mic },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="vocali-bottom-nav fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 rounded-t-[2rem] border border-white/70 bg-white/95 px-5 pb-4 pt-3 shadow-[0_-14px_40px_rgb(7_50_71/0.12)] backdrop-blur sm:bottom-4 sm:w-[calc(100%-2rem)] sm:rounded-[2rem] sm:pb-3">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                isActive
                  ? "flex flex-col items-center gap-1 rounded-2xl text-vocali-teal"
                  : "flex flex-col items-center gap-1 rounded-2xl text-[#8a857d]"
              }
            >
              <Icon className="h-7 w-7" strokeWidth={isActive ? 3 : 2.5} />
              <span className="text-xs font-extrabold">{item.label}</span>
              <span
                className={
                  isActive
                    ? "h-1 w-8 rounded-full bg-vocali-teal"
                    : "h-1 w-8 rounded-full bg-transparent"
                }
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
