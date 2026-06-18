"use client";
import { useEffect, useRef, useState } from "react";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { RENDER_PRESETS, type RenderPresetId } from "@/lib/render/presets";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";

/** Live 3D portrait — the model idles in-frame; mounts only when scrolled near. */
export function ChampionPortrait({
  rosterKey,
  type,
  champion,
  preset = "portrait",
  colorHex,
  className,
  eager = false,
}: {
  rosterKey: string;
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  className?: string;
  /** Skip intersection lazy-mount (single hero tiles). */
  eager?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(eager);
  const aspect = RENDER_PRESETS[preset].aspect;
  const accent = colorHex ?? TYPE_COLOR[type];

  useEffect(() => {
    if (eager || live) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLive(true);
          io.disconnect();
        }
      },
      { rootMargin: "160px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, live]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: String(aspect),
        overflow: "hidden",
        background: `radial-gradient(120% 120% at 50% 18%, color-mix(in srgb, ${accent} 22%, #0a0812), #0a0812)`,
      }}
      aria-label={`${rosterKey} living portrait`}
    >
      {live ? (
        <ChampionPortraitScene type={type} champion={champion} preset={preset} colorHex={colorHex} />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: accent,
            opacity: 0.35,
            fontSize: 28,
          }}
          aria-hidden
        >
          ◆
        </div>
      )}
    </div>
  );
}
