import { BottomNav } from "@/components/layout/BottomNav";
import { PracticeHub } from "@/components/practice/PracticeHub";
import { ScreenFrame } from "@/components/layout/ScreenFrame";

export default function PracticePage() {
  return (
    <ScreenFrame withNavPadding>
      <PracticeHub />
      <BottomNav />
    </ScreenFrame>
  );
}
