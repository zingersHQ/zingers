"use client";

import Image from "next/image";
import { CanonRenderTile } from "@/components/bible/canon-render-tile";
import { RegionScene } from "@/components/lore/region-scene";
import { FORCES } from "@/lib/lore/canon";
import { showcaseChampion, showcaseForForce } from "@/lib/render/showcase";
import type { IdeaScene } from "@/lib/org/creative-brief-data";

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

/** Identity plates (minds / forces / regions / flight stills). */
export function CreativeScene({
  scene,
  eager = false,
  className,
}: {
  scene: IdeaScene;
  eager?: boolean;
  className?: string;
}) {
  if (scene.kind === "flight") {
    return (
      <div className={className} style={{ position: "relative", width: "100%", height: "100%", background: "#0a0812" }}>
        <Image src={scene.src} alt={scene.alt ?? "Flight capture"} fill sizes="100vw" style={{ objectFit: "cover" }} priority={eager} />
      </div>
    );
  }

  if (scene.kind === "mind") {
    const { key, type, champion } = showcaseChampion(scene.key);
    const force = FORCES[type];
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <CanonRenderTile
          rosterKey={key}
          type={type}
          champion={champion}
          preset={scene.preset ?? "portrait"}
          colorHex={force.hex}
          label={`${key} reference`}
          eager={eager}
        />
      </div>
    );
  }

  if (scene.kind === "force") {
    const { key, type, champion } = showcaseForForce(scene.slug);
    const force = Object.values(FORCES).find((f) => FORCE_SLUG[f.type] === scene.slug);
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <CanonRenderTile
          rosterKey={key}
          type={type}
          champion={champion}
          preset="force"
          colorHex={force?.hex}
          label={`${scene.slug} force reference`}
          eager={eager}
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <RegionScene regionId={scene.regionId} />
    </div>
  );
}

export function sceneAspect(scene: IdeaScene): string {
  switch (scene.kind) {
    case "flight":
    case "region":
      return "16/9";
    case "force":
      return "1/1";
    default:
      return "4/5";
  }
}
