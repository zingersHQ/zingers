"use client";
import type { Champion, CreatureType } from "@/lib/types";
import { ChampionPortrait } from "@/components/render/champion-portrait";
import type { KeeperKind } from "@/components/grounds/keeper-regalia";
import type { RenderPresetId } from "@/lib/render/presets";

export function CanonRenderTile({
  rosterKey,
  type,
  champion,
  preset = "portrait",
  colorHex,
  label,
  scale = 1,
  keeper,
}: {
  rosterKey: string;
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  label: string;
  /** Per-tile multiplier on the fitted body size (1 = preset default). */
  scale?: number;
  /** render this figure as a Keeper boss with its signature regalia */
  keeper?: KeeperKind;
}) {
  return (
    <div style={{ position: "relative", width: "100%", background: "#0a0812" }}>
      <ChampionPortrait rosterKey={rosterKey} type={type} champion={champion} preset={preset} colorHex={colorHex} scale={scale} keeper={keeper} />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{label}</span>
    </div>
  );
}
