import type { Metadata } from "next";
import MobileShell from "@/components/mobile/mobile-shell";

export const metadata: Metadata = {
  title: "Zingers — mobile",
};

// The phone-native shell (docs/mobile.md). The spectate/predict/share lane;
// desktop keeps the immersive 3D Grounds. Phones are routed here from the "Play"
// nav; the Climb tab folds in the one-thumb Circuit so it's no longer an island.
export default function MobilePage() {
  return <MobileShell />;
}
