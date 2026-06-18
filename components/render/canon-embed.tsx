"use client";
import type { CanonEmbedSpec } from "@/lib/render/embed-from-url";
import { showcaseChampion } from "@/lib/render/showcase";
import { RENDER_PRESETS } from "@/lib/render/presets";
import { ChampionPortrait } from "@/components/render/champion-portrait";

/** Org/docs markdown figure — living game model instead of a static PNG. */
export function CanonEmbed({ spec, alt }: { spec: CanonEmbedSpec; alt?: string }) {
  const { type, champion } = showcaseChampion(spec.rosterKey);
  const aspect = RENDER_PRESETS[spec.preset].aspect;

  return (
    <figure className="org-prose__figure org-prose__figure--live">
      <div style={{ aspectRatio: String(aspect), width: "100%", borderRadius: 12, overflow: "hidden" }}>
        <ChampionPortrait
          rosterKey={spec.rosterKey}
          type={type}
          champion={champion}
          preset={spec.preset}
          colorHex={spec.colorHex}
          eager
        />
      </div>
      {alt ? <figcaption className="org-prose__caption">{alt}</figcaption> : null}
    </figure>
  );
}
