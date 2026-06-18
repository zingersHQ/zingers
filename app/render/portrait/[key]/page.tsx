"use client";
import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { RENDER_PRESETS } from "@/lib/render/presets";
import { showcaseChampion } from "@/lib/render/showcase";

export default function RenderPortraitPage() {
  const { key } = useParams<{ key: string }>();
  const q = useSearchParams();
  const w = Number(q.get("w") ?? 800);
  const h = Number(q.get("h") ?? 1000);
  const { type, champion } = showcaseChampion(key ?? "AXIOM");

  useEffect(() => {
    document.documentElement.style.background = "#0a0812";
    document.body.style.margin = "0";
    const fallback = window.setTimeout(() => {
      document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true");
    }, 8000);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div
      data-render-ready="false"
      style={{ width: w, height: h, margin: 0, background: RENDER_PRESETS.portrait.bg }}
    >
      <ChampionPortraitScene
        type={type}
        champion={champion}
        preset="portrait"
        paused
        onReady={() => {
          const el = document.querySelector("[data-render-ready]");
          if (el) el.setAttribute("data-render-ready", "true");
        }}
      />
    </div>
  );
}
