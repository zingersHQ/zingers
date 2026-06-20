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
  scale = 1,
}: {
  rosterKey: string;
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  className?: string;
  /** Skip intersection lazy-mount (single hero tiles). */
  eager?: boolean;
  /** Per-tile multiplier on the fitted body size (1 = preset default). */
  scale?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(eager);
  const aspect = RENDER_PRESETS[preset].aspect;
  const accent = colorHex ?? TYPE_COLOR[type];

  // Each live portrait holds its own WebGL context and browsers cap those at
  // ~16. Mount when near the viewport and tear down once scrolled well away so
  // a long gallery never starves the earliest tiles of a context.
  useEffect(() => {
    if (eager) return;
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
  }, [eager]);

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
        <ChampionPortraitScene type={type} champion={champion} preset={preset} colorHex={colorHex} scale={scale} identityKey={rosterKey} />
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
