"use client";
import type { Champion, CreatureType } from "@/lib/types";
import { ChampionPortrait } from "@/components/render/champion-portrait";
import type { RenderPresetId } from "@/lib/render/presets";

export function CanonRenderTile({
  rosterKey,
  type,
  champion,
  preset = "portrait",
  colorHex,
  label,
  scale = 1,
  eager = false,
  fill = false,
}: {
  rosterKey: string;
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  label: string;
  /** Per-tile multiplier on the fitted body size (1 = preset default). */
  scale?: number;
  /** Skip intersection lazy-mount (modals / hero tiles). */
  eager?: boolean;
  /** Fill parent instead of preset aspect (beat overlays). */
  fill?: boolean;
}) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#0a0812" }}>
      <ChampionPortrait
        rosterKey={rosterKey}
        type={type}
        champion={champion}
        preset={preset}
        colorHex={colorHex}
        scale={scale}
        eager={eager}
        fill={fill}
      />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{label}</span>
    </div>
  );
}
