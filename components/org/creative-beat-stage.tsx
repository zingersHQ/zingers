"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArtDuoScene } from "@/components/art/art-viewport";
import { CanonRenderTile } from "@/components/bible/canon-render-tile";
import { RegionScene } from "@/components/lore/region-scene";
import { FORCES } from "@/lib/lore/canon";
import { showcaseChampion, showcaseForForce } from "@/lib/render/showcase";
import type { BeatScene } from "@/lib/org/creative-brief-data";
import type { ArtAction } from "@/components/art/art-viewport";

const InfiniteFlightHero = dynamic(() => import("@/components/home/infinite-flight-hero"), { ssr: false });

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

function StageChrome({
  kicker,
  title,
  accent,
}: {
  kicker: string;
  title: string;
  accent?: string;
}) {
  return (
    <div className="creative-beat__chrome" style={accent ? { ["--ac" as string]: accent } : undefined}>
      <span className="mono">{kicker}</span>
      <strong>{title}</strong>
    </div>
  );
}

function PortraitOverlay({
  mindKey,
  eager,
  size = "card",
}: {
  mindKey: string;
  eager?: boolean;
  /** card = corner plate; battle = half-pane fighter over the ground */
  size?: "card" | "battle";
}) {
  const cls = size === "battle" ? "creative-beat__overlay creative-beat__overlay--battle" : "creative-beat__overlay";
  const { key, type, champion } = showcaseChampion(mindKey);
  const force = FORCES[type];
  return (
    <div className={cls}>
      <CanonRenderTile
        rosterKey={key}
        type={type}
        champion={champion}
        preset="portrait"
        colorHex={force.hex}
        label={`${key} overlay`}
        eager={eager}
        fill
      />
    </div>
  );
}

function BeatBody({ scene, eager }: { scene: BeatScene; eager?: boolean }) {
  if (scene.kind === "flightLive") {
    return (
      <>
        <InfiniteFlightHero
          variant="desktop"
          showPoster={false}
          freeze={!eager}
          mindKey={scene.mind}
          ghost={scene.ghost}
        />
        <StageChrome
          kicker={scene.ghost ? "Flight · ghost race" : "Flight · live"}
          title={scene.mind}
          accent={FORCES[showcaseChampion(scene.mind).type].hex}
        />
      </>
    );
  }

  if (scene.kind === "duo") {
    const force = FORCES[showcaseChampion(scene.mind).type];
    const action = (scene.action ?? "fly") as ArtAction;
    return (
      <>
        <ArtDuoScene mindKey={scene.mind} action={action} accent={force.hex} paused={false} />
        <StageChrome kicker={`Trainer + ${scene.mind}`} title={action === "fly" ? "On the wing" : "Bond"} accent={force.hex} />
      </>
    );
  }

  if (scene.kind === "place") {
    return (
      <>
        <RegionScene regionId={scene.regionId} />
        {scene.mind ? <PortraitOverlay mindKey={scene.mind} eager={eager} /> : null}
        <StageChrome kicker={`Region · ${scene.regionId}`} title={scene.mind ?? scene.regionId} />
      </>
    );
  }

  if (scene.kind === "split") {
    const fight = showcaseChampion(scene.fightMind);
    const flyLabel = scene.flyLabel ?? "You fly";
    const fightLabel = scene.fightLabel ?? "It fights";
    return (
      <div className="creative-beat__split">
        <div className="creative-beat__split-pane">
          <InfiniteFlightHero variant="mobile" showPoster={false} freeze={!eager} mindKey={scene.flyMind} />
          <StageChrome kicker={flyLabel} title={scene.flyMind} />
        </div>
        <div className="creative-beat__split-pane creative-beat__split-pane--ground">
          {/* Full founding-region ground first; fighter reads as half the pane, not a postage stamp. */}
          <RegionScene regionId={scene.regionId} />
          <PortraitOverlay mindKey={scene.fightMind} eager={eager} size="battle" />
          <StageChrome kicker={fightLabel} title={scene.fightMind} accent={FORCES[fight.type].hex} />
        </div>
      </div>
    );
  }

  // forceWide
  const { key, type, champion } = showcaseForForce(scene.slug);
  const force = Object.values(FORCES).find((f) => FORCE_SLUG[f.type] === scene.slug);
  return (
    <>
      <div className="creative-beat__force-stage" style={{ ["--ac" as string]: force?.hex ?? "#f5d020" }}>
        <CanonRenderTile
          rosterKey={key}
          type={type}
          champion={champion}
          preset="force"
          colorHex={force?.hex}
          label={`${scene.slug} force`}
          eager={eager}
          fill
        />
      </div>
      <StageChrome kicker="Clan" title={force?.name ?? scene.slug} accent={force?.hex} />
    </>
  );
}

/** Fixed 16:9 story-beat stage. Lazy-mounts heavy GL when near viewport. */
export function CreativeBeatStage({
  scene,
  eager = false,
  className,
}: {
  scene: BeatScene;
  eager?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(eager);

  useEffect(() => {
    if (eager) {
      setLive(true);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (off) clearTimeout(off);
          setLive(true);
        } else {
          off = setTimeout(() => setLive(false), 600);
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => {
      if (off) clearTimeout(off);
      io.disconnect();
    };
  }, [eager]);

  return (
    <div ref={rootRef} className={`creative-beat${className ? ` ${className}` : ""}`}>
      {live ? (
        <BeatBody scene={scene} eager={eager} />
      ) : (
        <div className="creative-beat__placeholder" aria-hidden>
          ◆
        </div>
      )}
    </div>
  );
}

export const BEAT_ASPECT = "16/9";
