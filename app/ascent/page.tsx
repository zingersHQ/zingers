import type { Metadata } from "next";
import AscentGate from "@/components/ascent/ascent-gate";
import { FLIGHT_HERO_POSTER, FLIGHT_HERO_POSTER_SM } from "@/lib/flight-hero-poster";

export const metadata: Metadata = {
  title: "Zingers — Flight",
  description: "Fly through one hundred sectors of sky. Same game on phone and desktop.",
  openGraph: {
    images: [{ url: FLIGHT_HERO_POSTER, width: 1600, height: 900, alt: "Trainer and champion taking flight" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [FLIGHT_HERO_POSTER_SM],
  },
};

export default function AscentPage() {
  return (
    <>
      <link rel="preload" as="image" href={FLIGHT_HERO_POSTER} fetchPriority="high" />
      <AscentGate />
    </>
  );
}
