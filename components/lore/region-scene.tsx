"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FORCES, FOUNDING_REGIONS } from "@/lib/lore/canon";
import { worldByRegion, REGION_WORLDS } from "@/components/grounds/worlds";
import { RegionPoster } from "@/components/lore/region-poster";

// The real region scene, mounted passively (no player, auto-orbit camera). Heavy
// (full WebGL world), so it's lazy-loaded and only mounts when scrolled near.
const World = dynamic(() => import("@/components/grounds/world"), { ssr: false });

/** A region's actual terrain — a deterministic biome poster that upgrades to the
 *  live 3D world when scrolled near, then tears the WebGL context back down once
 *  scrolled away. Fills its (positioned) parent; render it inside a sized box. */
export function RegionScene({ regionId, live = true }: { regionId: string; live?: boolean }) {
  const world = worldByRegion(regionId) ?? REGION_WORLDS[0];
  const biome = world.biome;
  const region = FOUNDING_REGIONS.find((r) => r.id === regionId);
  const accent = region ? FORCES[region.bias].hex : undefined;

  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Each live world holds its own WebGL context and browsers cap those at ~16.
  // Mount when near the viewport, tear down once scrolled well away.
  useEffect(() => {
    if (!live) return;
    const el = rootRef.current;
    if (!el) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (off) clearTimeout(off);
          setMounted(true);
        } else {
          off = setTimeout(() => setMounted(false), 500);
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => {
      if (off) clearTimeout(off);
      io.disconnect();
    };
  }, [live]);

  return (
    <div
      ref={rootRef}
      style={{ position: "absolute", inset: 0, background: biome.bg }}
      aria-label={`${world.biome.name} region scene`}
    >
      <RegionPoster biome={biome} accent={accent} />
      {live && mounted ? (
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
  );
}
