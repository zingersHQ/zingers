"use client";
// Captured still of InfiniteFlightHero's opening frame (our Robot + champion +
// terrain). Regenerated via: node scripts/capture-flight-hero.mjs
import { FLIGHT_HERO_POSTER, FLIGHT_HERO_POSTER_SM } from "@/lib/flight-hero-poster";

export { FLIGHT_HERO_POSTER, FLIGHT_HERO_POSTER_SM };

const SKY =
  "radial-gradient(120% 90% at 50% 10%, #f0c090 0%, #c88858 42%, #2a1830 100%)";

export function FlightHeroPoster({
  visible = true,
  priority = true,
  alt = "Trainer and champion taking flight over the world",
}: {
  visible?: boolean;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        background: SKY,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.55s ease",
      }}
    >
      <picture>
        <source media="(max-width: 640px)" srcSet={FLIGHT_HERO_POSTER_SM} />
        <img
          src={FLIGHT_HERO_POSTER}
          alt={alt}
          width={1600}
          height={900}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : {})}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 45%",
          }}
        />
      </picture>
    </div>
  );
}
