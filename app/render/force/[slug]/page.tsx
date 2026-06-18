"use client";
import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { RENDER_PRESETS } from "@/lib/render/presets";
import { showcaseForForce } from "@/lib/render/showcase";
import { FORCES } from "@/lib/lore/canon";

const SLUG_TYPE = {
  lattice: "LOGIC",
  static: "CHAOS",
  stillness: "COMPOSURE",
  chorus: "RHETORIC",
  spark: "CREATIVITY",
} as const;

export default function RenderForcePage() {
  const { slug } = useParams<{ slug: string }>();
  const q = useSearchParams();
  const size = Number(q.get("size") ?? 768);
  const s = (slug ?? "lattice").toLowerCase();
  const { type, champion } = showcaseForForce(s);
  const forceType = SLUG_TYPE[s as keyof typeof SLUG_TYPE] ?? type;
  const hex = FORCES[forceType].hex;

  useEffect(() => {
    document.documentElement.style.background = "#0a0812";
    document.body.style.margin = "0";
    const fallback = window.setTimeout(() => {
      document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true");
    }, 8000);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div data-render-ready="false" style={{ width: size, height: size, background: RENDER_PRESETS.force.bg }}>
      <ChampionPortraitScene
        type={type}
        champion={champion}
        preset="force"
        colorHex={hex}
        paused
        onReady={() => document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true")}
      />
    </div>
  );
}
