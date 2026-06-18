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
}: {
  rosterKey: string;
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  label: string;
}) {
  return (
    <div style={{ position: "relative", width: "100%", background: "#0a0812" }}>
      <ChampionPortrait rosterKey={rosterKey} type={type} champion={champion} preset={preset} colorHex={colorHex} />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{label}</span>
    </div>
  );
}
