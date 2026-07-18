"use client";
// Local capture surface — full-bleed frozen InfiniteFlightHero for still export.
// Not linked from nav. Visit /dev/flight-hero-still then run scripts/capture-flight-hero.mjs
import InfiniteFlightHero from "@/components/home/infinite-flight-hero";

export default function FlightHeroStillPage() {
  return (
    <div
      data-flight-hero-still
      style={{ position: "fixed", inset: 0, background: "#e8b878" }}
    >
      <InfiniteFlightHero variant="desktop" showPoster={false} freeze />
    </div>
  );
}
