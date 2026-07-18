import type { Metadata } from "next";
import { Landing } from "@/components/home/landing";
import { FLIGHT_HERO_POSTER } from "@/lib/flight-hero-poster";

export const metadata: Metadata = {
  openGraph: {
    images: [{ url: FLIGHT_HERO_POSTER, width: 1600, height: 900, alt: "Trainer and champion taking flight" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [FLIGHT_HERO_POSTER],
  },
};

export default function Home() {
  return (
    <>
      {/* LCP / SEO: real captured first frame of the flight hero (our models). */}
      <link rel="preload" as="image" href={FLIGHT_HERO_POSTER} fetchPriority="high" />
      <Landing />
    </>
  );
}
