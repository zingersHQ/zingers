"use client";
import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { BIOMES } from "@/components/grounds/biomes";
import { RENDER_PRESETS } from "@/lib/render/presets";
import { showcaseForRegion } from "@/lib/render/showcase";

const REGION_BIOME: Record<string, number> = { colosseum: 0, wastes: 1, garden: 2 };

export default function RenderRegionPage() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const w = Number(q.get("w") ?? 1280);
  const h = Number(q.get("h") ?? 720);
  const regionId = id ?? "colosseum";
  const { type, champion } = showcaseForRegion(regionId);
  const biome = BIOMES[REGION_BIOME[regionId] ?? 0];

  useEffect(() => {
    document.documentElement.style.background = biome.bg;
    document.body.style.margin = "0";
    const fallback = window.setTimeout(() => {
      document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true");
    }, 8000);
    return () => window.clearTimeout(fallback);
  }, [biome.bg]);

  return (
    <div data-render-ready="false" style={{ width: w, height: h, background: biome.bg }}>
      <ChampionPortraitScene
        type={type}
        champion={champion}
        preset="region"
        colorHex={biome.lights.arenaPoint}
        paused
        onReady={() => document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true")}
      />
    </div>
  );
}
