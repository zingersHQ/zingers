"use client";

import Image from "next/image";
import { CanonRenderTile } from "@/components/bible/canon-render-tile";
import { RegionScene } from "@/components/lore/region-scene";
import { keeperKindForName } from "@/components/grounds/keeper-regalia";
import { FORCES } from "@/lib/lore/canon";
import { showcaseChampion, showcaseForForce, showcaseForKeeper } from "@/lib/render/showcase";
import type { IdeaScene } from "@/lib/org/creative-brief-data";

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

/** Live (or flight still) reference scene for a studio idea / plate. */
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

  if (scene.kind === "keeper") {
    const { key, type, champion, accentHex } = showcaseForKeeper(scene.name);
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <CanonRenderTile
          rosterKey={key}
          type={type}
          champion={champion}
          preset="keeper"
          colorHex={accentHex}
          label={`${scene.name} keeper reference`}
          keeper={keeperKindForName(scene.name)}
          eager={eager}
        />
      </div>
    );
  }

  if (scene.kind === "region") {
    return (
      <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
        <RegionScene regionId={scene.regionId} />
      </div>
    );
  }

  if (scene.kind === "pair") {
    const left = showcaseChampion(scene.left);
    const right = showcaseChampion(scene.right);
    return (
      <div
        className={className}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", height: "100%", gap: 2, background: "#0a0812" }}
      >
        <CanonRenderTile
          rosterKey={left.key}
          type={left.type}
          champion={left.champion}
          preset="portrait"
          colorHex={FORCES[left.type].hex}
          label={`${left.key} left`}
          eager={eager}
        />
        <CanonRenderTile
          rosterKey={right.key}
          type={right.type}
          champion={right.champion}
          preset="portrait"
          colorHex={FORCES[right.type].hex}
          label={`${right.key} right`}
          eager={eager}
        />
      </div>
    );
  }

  // regionMind: place + wingmate
  const mind = showcaseChampion(scene.key);
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        width: "100%",
        height: "100%",
        gap: 2,
        background: "#0a0812",
      }}
    >
      <div style={{ position: "relative", minHeight: 0 }}>
        <RegionScene regionId={scene.regionId} />
      </div>
      <CanonRenderTile
        rosterKey={mind.key}
        type={mind.type}
        champion={mind.champion}
        preset="portrait"
        colorHex={FORCES[mind.type].hex}
        label={`${mind.key} at ${scene.regionId}`}
        eager={eager}
      />
    </div>
  );
}

export function sceneAspect(scene: IdeaScene): string {
  switch (scene.kind) {
    case "flight":
    case "region":
    case "regionMind":
    case "pair":
      return "16/9";
    case "force":
      return "1/1";
    default:
      return "4/5";
  }
}
