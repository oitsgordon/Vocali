import type { ReactNode } from "react";

type ScreenFrameProps = {
  children: ReactNode;
  withNavPadding?: boolean;
};

export function ScreenFrame({ children, withNavPadding = false }: ScreenFrameProps) {
  return (
    <main className="min-h-dvh bg-background text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-background sm:min-h-[860px] sm:rounded-[2rem] sm:shadow-[0_28px_80px_rgb(7_50_71/0.12)]">
        <div className={withNavPadding ? "pb-16" : ""}>{children}</div>
      </div>
    </main>
  );
}
