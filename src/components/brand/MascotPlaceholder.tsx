import { Mic } from "lucide-react";

export function MascotPlaceholder() {
  return (
    <div className="relative mx-auto flex h-64 w-full max-w-[21rem] items-center justify-center sm:h-72">
      <div className="absolute bottom-6 h-20 w-64 rounded-[50%] bg-vocali-teal/10" />
      <div className="absolute left-8 top-8 h-5 w-5 rotate-45 rounded-[0.35rem] border-4 border-vocali-teal" />
      <div className="absolute right-10 top-14 h-4 w-4 rotate-45 rounded bg-vocali-orange" />
      <div className="absolute left-2 top-28 h-3 w-3 rotate-45 rounded bg-vocali-teal/50" />
      <div className="absolute right-3 top-32 h-8 w-8 rotate-45 rounded-lg bg-vocali-teal" />

      <div className="relative h-48 w-48 rounded-[45%_45%_48%_48%] bg-gradient-to-br from-[#55ddd1] to-vocali-teal shadow-[0_28px_45px_rgb(0_167_165/0.24)] sm:h-52 sm:w-52">
        <div className="absolute left-12 top-16 h-7 w-5 rounded-full bg-vocali-teal-deep shadow-[58px_0_0_#073247]" />
        <div className="absolute left-[4.35rem] top-[6.55rem] h-8 w-16 rounded-b-full rounded-t-sm bg-vocali-teal-deep">
          <div className="mx-auto mt-4 h-3 w-7 rounded-full bg-[#5fe5dc]" />
        </div>
        <div className="absolute -left-7 bottom-10 flex h-24 w-14 -rotate-[22deg] items-center justify-center rounded-full bg-vocali-teal">
          <div className="flex h-28 w-10 translate-y-4 flex-col items-center">
            <div className="flex h-16 w-14 items-center justify-center rounded-full bg-vocali-orange text-white shadow-[0_12px_20px_rgb(255_122_26/0.3)]">
              <Mic className="h-8 w-8" strokeWidth={3} />
            </div>
            <div className="h-16 w-7 rounded-b-full bg-vocali-orange" />
          </div>
        </div>
        <div className="absolute -right-3 bottom-16 h-16 w-10 rotate-12 rounded-full bg-[#24bcb5]" />
      </div>
    </div>
  );
}
