"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FORCES, FOUNDING_REGIONS } from "@/lib/lore/canon";
import { worldByRegion, REGION_WORLDS } from "@/components/grounds/worlds";
import { RegionPoster } from "@/components/lore/region-poster";

// The real region scene, mounted passively (no player, auto-orbit camera). Heavy
// (full WebGL world), so it's lazy-loaded and only mounts when scrolled near.
const World = dynamic(() => import("@/components/grounds/world"), { ssr: false });

/** Org/docs region figure — the actual 3D region world, not a champion. */
export function OrgRegionFigure({ regionId, alt }: { regionId: string; alt?: string }) {
  const world = worldByRegion(regionId) ?? REGION_WORLDS[0];
  const biome = world.biome;
  const region = FOUNDING_REGIONS.find((r) => r.id === regionId);
  const accent = region ? FORCES[region.bias].hex : undefined;

  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  // Mount when near the viewport, tear down once scrolled well away — each live
  // world holds its own WebGL context and browsers cap those at ~16.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (off) clearTimeout(off);
          setLive(true);
        } else {
          off = setTimeout(() => setLive(false), 500);
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => {
      if (off) clearTimeout(off);
      io.disconnect();
    };
  }, []);

  return (
    <figure className="org-prose__figure org-prose__figure--live">
      <div
        ref={rootRef}
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: biome.bg,
        }}
        aria-label={`${world.biome.name} region scene`}
      >
        <RegionPoster biome={biome} accent={accent} />
        {live ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <World
              champions={[]}
              ownedKey={null}
              onNear={() => {}}
              match={null}
              controlsEnabled={false}
              biome={biome}
              towerAgents={[]}
              nodes={[]}
              goals={[]}
              gates={[]}
              pledged={null}
              tier={3}
              featured={false}
              featuredWorld={null}
              showcase
            />
          </div>
        ) : null}
      </div>
      {alt ? <figcaption className="org-prose__caption">{alt}</figcaption> : null}
    </figure>
  );
}
