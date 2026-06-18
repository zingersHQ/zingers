"use client";
import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { RENDER_PRESETS } from "@/lib/render/presets";
import { showcaseForKeeper } from "@/lib/render/showcase";

export default function RenderKeeperPage() {
  const { name } = useParams<{ name: string }>();
  const q = useSearchParams();
  const w = Number(q.get("w") ?? 800);
  const h = Number(q.get("h") ?? 1000);
  const { type, champion, accentHex } = showcaseForKeeper(name ?? "Tibble");

  useEffect(() => {
    document.documentElement.style.background = "#0a0812";
    document.body.style.margin = "0";
    const fallback = window.setTimeout(() => {
      document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true");
    }, 8000);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div data-render-ready="false" style={{ width: w, height: h, background: RENDER_PRESETS.keeper.bg }}>
      <ChampionPortraitScene
        type={type}
        champion={champion}
        preset="keeper"
        colorHex={accentHex}
        paused
        onReady={() => document.querySelector("[data-render-ready]")?.setAttribute("data-render-ready", "true")}
      />
    </div>
  );
}
