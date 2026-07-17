"use client";
// Mobile Take flight poster — shared infinite-flight hero (Trainer + champion
// over a looping Void Garden island belt). Kept as a thin entry so the splash
// can keep its dynamic(ssr:false) import path.
import InfiniteFlightHero from "@/components/home/infinite-flight-hero";

export default function MobileSplashScene() {
  return <InfiniteFlightHero variant="mobile" />;
}
