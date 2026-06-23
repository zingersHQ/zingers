"use client";
import { RegionScene } from "@/components/lore/region-scene";

/** Org/docs region figure — the actual 3D region world, not a champion. */
export function OrgRegionFigure({ regionId, alt }: { regionId: string; alt?: string }) {
  return (
    <figure className="org-prose__figure org-prose__figure--live">
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <RegionScene regionId={regionId} />
      </div>
      {alt ? <figcaption className="org-prose__caption">{alt}</figcaption> : null}
    </figure>
  );
}
