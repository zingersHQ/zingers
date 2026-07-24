import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AscentGate from "@/components/ascent/ascent-gate";
import { FLIGHT_HERO_POSTER, FLIGHT_HERO_POSTER_SM } from "@/lib/flight-hero-poster";
import { isClimbShareId } from "@/lib/climb-challenge";

export const metadata: Metadata = {
  title: "Zingers — Flight challenge",
  description: "Beat this Flight run. Same game on phone and desktop.",
  openGraph: {
    images: [{ url: FLIGHT_HERO_POSTER, width: 1600, height: 900, alt: "Trainer and champion taking flight" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [FLIGHT_HERO_POSTER_SM],
  },
};

export default async function AscentSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  if (!isClimbShareId(shareId)) notFound();

  return (
    <>
      <link rel="preload" as="image" href={FLIGHT_HERO_POSTER} fetchPriority="high" />
      <AscentGate />
    </>
  );
}
