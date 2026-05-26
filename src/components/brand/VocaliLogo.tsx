import { AudioLines } from "lucide-react";

type VocaliLogoProps = {
  size?: "sm" | "lg";
};

export function VocaliLogo({ size = "lg" }: VocaliLogoProps) {
  const isLarge = size === "lg";

  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className={
          isLarge
            ? "relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-vocali-teal text-white shadow-[0_12px_25px_rgb(0_167_165/0.25)]"
            : "relative flex h-11 w-11 items-center justify-center rounded-2xl bg-vocali-teal text-white shadow-[0_10px_20px_rgb(0_167_165/0.22)]"
        }
      >
        <span className="absolute -bottom-1 left-2 h-4 w-4 rounded-bl-[10px] bg-vocali-teal" />
        <AudioLines className={isLarge ? "h-9 w-9" : "h-6 w-6"} strokeWidth={3} />
      </div>
      <span
        className={
          isLarge
            ? "text-5xl font-black tracking-[-0.03em] text-vocali-teal-deep"
            : "text-3xl font-black tracking-[-0.03em] text-vocali-teal-deep"
        }
      >
        Vocali
      </span>
    </div>
  );
}
