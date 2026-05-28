type VocaliLogoProps = {
  size?: "sm" | "lg";
};

export function VocaliLogo({ size = "lg" }: VocaliLogoProps) {
  const isLarge = size === "lg";

  return (
    <div className="flex items-center justify-center gap-3">
      <svg
        aria-hidden="true"
        viewBox="184 180 656 658"
        className={
          isLarge
            ? "h-16 w-16 overflow-visible drop-shadow-[0_12px_18px_rgb(0_167_165/0.22)]"
            : "h-11 w-11 overflow-visible drop-shadow-[0_10px_14px_rgb(0_167_165/0.18)]"
        }
      >
        <path
          d="M332 664C320 724 292 804 284 838C345 798 424 748 480 706C426 706 372 690 332 664Z"
          fill="url(#vocali-logo-bubble-gradient)"
        />
        <ellipse
          cx="512"
          cy="481"
          rx="328"
          ry="301"
          fill="url(#vocali-logo-bubble-gradient)"
        />
        <rect x="311" y="426" width="42" height="110" rx="21" fill="white" />
        <rect x="398" y="366" width="48" height="230" rx="24" fill="white" />
        <rect x="487" y="316" width="50" height="330" rx="25" fill="white" />
        <rect x="578" y="366" width="48" height="230" rx="24" fill="white" />
        <rect x="671" y="426" width="42" height="110" rx="21" fill="white" />
        <defs>
          <linearGradient
            id="vocali-logo-bubble-gradient"
            x1="268"
            y1="239"
            x2="767"
            y2="735"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#00B9B5" />
            <stop offset="1" stopColor="#008F8D" />
          </linearGradient>
        </defs>
      </svg>
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
