import type { Metadata } from "next";
import MobileShell from "@/components/mobile/mobile-shell";
import { FLIGHT_HERO_POSTER_SM } from "@/lib/flight-hero-poster";

export const metadata: Metadata = {
  title: "Zingers — mobile",
  openGraph: {
    images: [{ url: FLIGHT_HERO_POSTER_SM, width: 1280, height: 720, alt: "Trainer and champion taking flight" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [FLIGHT_HERO_POSTER_SM],
  },
};

// The phone-native shell (docs/mobile.md). The spectate/predict/share lane;
// desktop keeps the immersive 3D Grounds. Phones are routed here from the "Play"
// nav; the Climb tab folds in the one-thumb Circuit so it's no longer an island.
export default function MobilePage() {
  return (
    <>
      <link rel="preload" as="image" href={FLIGHT_HERO_POSTER_SM} fetchPriority="high" />
      <MobileShell />
    </>
  );
}
