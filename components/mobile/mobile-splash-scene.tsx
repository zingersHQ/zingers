"use client";
// Mobile Take flight — shared infinite-flight hero. Thin entry so the splash
// can keep its dynamic(ssr:false) import path.
import InfiniteFlightHero from "@/components/home/infinite-flight-hero";

export default function MobileSplashScene({ onReady }: { onReady?: () => void }) {
  return <InfiniteFlightHero variant="mobile" showPoster={false} onReady={onReady} />;
}
