"use client";

import { useCallback, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { orgCanonical } from "@/lib/org/hosts";
import { FORCES, FOUNDING_REGIONS } from "@/lib/lore/canon";
import { ROSTER } from "@/lib/engine/roster";
import { CreativeScene, sceneAspect } from "@/components/org/creative-scene";
import { CreativeBeatStage, BEAT_ASPECT } from "@/components/org/creative-beat-stage";
import { CreativeRenderModal, type CreativeModalPayload } from "@/components/org/creative-render-modal";
import {
  CHARACTER_PLATES,
  CONTENT_LAW,
  NORTH_STAR,
  PALETTE,
  PROMPT_SKELETON,
  SCENARIO_PLATES,
  SHORT_IDEAS,
  VOCAB_DO,
  VOCAB_DONT,
  WORLD_BLURB,
  type AssetPlate,
  type ShortIdea,
} from "@/lib/org/creative-brief-data";

const LANE_LABEL: Record<ShortIdea["lane"], string> = {
  primary: "Flight & bond",
  press: "Press",
};

function plateAccent(plate: AssetPlate): string | undefined {
  if (plate.accent) return plate.accent;
  const s = plate.scene;
  if (s.kind === "mind") return FORCES[ROSTER[s.key]?.type]?.hex;
  if (s.kind === "cast" || (s.kind === "flightLive" && s.mind)) {
    const key = s.kind === "cast" ? s.mind : s.mind!;
    return FORCES[ROSTER[key]?.type]?.hex;
  }
  if (s.kind === "force") {
    const entry = Object.values(FORCES).find((f) => {
      const slug =
        f.type === "LOGIC"
          ? "lattice"
          : f.type === "CHAOS"
            ? "static"
            : f.type === "COMPOSURE"
              ? "stillness"
              : f.type === "RHETORIC"
                ? "chorus"
                : "spark";
      return slug === s.slug;
    });
    return entry?.hex;
  }
  if (s.kind === "region") {
    const region = FOUNDING_REGIONS.find((r) => r.id === s.regionId);
    return region ? FORCES[region.bias]?.hex : undefined;
  }
  return undefined;
}

function LivePlate({ plate, onOpen }: { plate: AssetPlate; onOpen: (p: CreativeModalPayload) => void }) {
  const accent = plateAccent(plate);
  const aspect = plate.aspect || sceneAspect(plate.scene);
  return (
    <figure className="creative-brief__plate" style={accent ? { ["--ac" as string]: accent } : undefined}>
      <button
        type="button"
        className="creative-brief__plate-btn"
        style={{ aspectRatio: aspect }}
        onClick={() =>
          onOpen({
            title: plate.label,
            caption: `${plate.group} · ${plate.caption}`,
            scene: plate.scene,
            filename: plate.filename,
          })
        }
        aria-label={`Open ${plate.label} fullscreen`}
      >
        <CreativeScene scene={plate.scene} />
        <span className="mono creative-brief__plate-hint">View · Download PNG</span>
      </button>
      <figcaption>
        <span className="mono creative-brief__plate-group">{plate.group}</span>
        <strong>{plate.label}</strong>
        <span>{plate.caption}</span>
      </figcaption>
    </figure>
  );
}

function IdeaCard({ idea, onOpen }: { idea: ShortIdea; onOpen: (p: CreativeModalPayload) => void }) {
  const openDetails = () =>
    onOpen({
      title: idea.title,
      caption: `${idea.format} · ${idea.duration}`,
      beat: idea.scene,
      prompt: idea.prompt,
      filename: `zingers-idea-${idea.id}`,
      idea: {
        hook: idea.hook,
        beats: idea.beats,
        overlay: idea.overlay,
        notes: idea.notes,
        format: idea.format,
        duration: idea.duration,
        lane: idea.lane,
      },
    });

  return (
    <article className="creative-brief__idea" data-lane={idea.lane}>
      <button type="button" className="creative-brief__idea-scene" style={{ aspectRatio: BEAT_ASPECT }} onClick={openDetails}>
        <CreativeBeatStage scene={idea.scene} />
        <span className="mono creative-brief__idea-scene-hint">View details</span>
      </button>
      <div className="creative-brief__idea-body creative-brief__idea-body--compact">
        <span className="mono creative-brief__lane">{LANE_LABEL[idea.lane]}</span>
        <h3>{idea.title}</h3>
        <p className="creative-brief__meta mono">
          {idea.format} · {idea.duration}
        </p>
        <button type="button" className="btn creative-brief__idea-open" onClick={openDetails}>
          View details
        </button>
      </div>
    </article>
  );
}

function PlateSection({
  title,
  lede,
  plates,
  onOpen,
}: {
  title: string;
  lede: string;
  plates: AssetPlate[];
  onOpen: (p: CreativeModalPayload) => void;
}) {
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, AssetPlate[]>();
    for (const p of plates) {
      if (!map.has(p.group)) {
        map.set(p.group, []);
        order.push(p.group);
      }
      map.get(p.group)!.push(p);
    }
    return order.map((g) => ({ group: g, plates: map.get(g)! }));
  }, [plates]);

  return (
    <section className="creative-brief__section">
      <h2>{title}</h2>
      <p>{lede}</p>
      {groups.map(({ group, plates: gp }) => (
        <div key={group} className="creative-brief__subgroup">
          <h3 className="mono creative-brief__subgroup-title">{group}</h3>
          <div className="creative-brief__grid">
            {gp.map((plate) => (
              <LivePlate key={plate.id} plate={plate} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function CreativeBrief() {
  const [modal, setModal] = useState<CreativeModalPayload | null>(null);
  const open = useCallback((p: CreativeModalPayload) => setModal(p), []);
  const close = useCallback(() => setModal(null), []);

  const primary = SHORT_IDEAS.filter((i) => i.lane === "primary");
  const press = SHORT_IDEAS.filter((i) => i.lane === "press");

  return (
    <div className="creative-brief">
      <header className="creative-brief__hero">
        <p className="mono creative-brief__kicker">
          {BRAND.siteTech.replace("https://", "")} · press kit · mix &amp; match
        </p>
        <h1>Press kit</h1>
        <p className="creative-brief__tagline">{NORTH_STAR}</p>
        <p className="creative-brief__lede">
          Download <strong>Characters</strong> and <strong>Scenarios</strong> separately, then composite. Every plate is a{" "}
          <strong>live game render</strong>. Story beats are scripts: open View details for the description and full
          studio prompt. Gallery: <a href={`${BRAND.siteTech}/gallery`}>Visual gallery</a>. Pitch:{" "}
          <a href={orgCanonical("product/onepager")}>one-pager</a>. Lore:{" "}
          <a href={orgCanonical("bible/ascent")}>Flight</a>. Contact:{" "}
          <a href={BRAND.twitterUrl} target="_blank" rel="noopener noreferrer">
            @{BRAND.twitter}
          </a>
          .
        </p>
        <p className="creative-brief__warn">
          Character identity is the robot mesh on this page. Keep Trainer larger than the champion (~3:1 height). Do not
          replace champions with painterly faces, anime, or photoreal humans.
        </p>
      </header>

      <section className="creative-brief__section">
        <h2>How to use</h2>
        <ol className="creative-brief__rules">
          <li>
            <strong>Pick a Scenario</strong> (empty Flight sky or a founding region).
          </li>
          <li>
            <strong>Pick a Character</strong> (one of the 8 champions for shape + Clan color, Trainer, couple, Flight cast, or ghost race).
          </li>
          <li>
            <strong>Composite</strong> in your tool, or use a Story beat prompt that already describes the scene.
          </li>
          <li>
            <strong>AI enrich</strong> atmosphere only. Lock silhouettes to the downloaded PNGs.
          </li>
        </ol>
        <p className="creative-brief__law">{CONTENT_LAW}</p>
        <p>{WORLD_BLURB}</p>
      </section>

      <section className="creative-brief__section">
        <h2>Vocabulary</h2>
        <div className="creative-brief__split">
          <div>
            <h3 className="mono">Use</h3>
            <ul>
              {VOCAB_DO.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mono">Never</h3>
            <ul>
              {VOCAB_DONT.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Palette</h2>
        <ul className="creative-brief__swatches">
          {PALETTE.map((p) => (
            <li key={p.role}>
              <span style={{ background: p.hex }} aria-hidden />
              <code className="mono">
                {p.role} {p.hex}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <PlateSection
        title="Characters"
        lede="Start with Champions: eight First Minds, each a different body shape and Clan color (Forces live in the mesh, not a separate gallery). Then Trainer, couples, Flight cast, and ghost races. Download a PNG and drop it into a Scenario."
        plates={CHARACTER_PLATES}
        onOpen={open}
      />

      <PlateSection
        title="Scenarios"
        lede="Empty worlds: Flight belt with rings and vegetation, plus the three founding regions. No heroes in the shot so you can place Characters freely."
        plates={SCENARIO_PLATES}
        onOpen={open}
      />

      <section className="creative-brief__section">
        <h2>Story beats · Flight &amp; bond</h2>
        <p>Scripts for shorts. Grid shows the live reference only. Open View details for description + full prompt.</p>
        <div className="creative-brief__ideas">
          {primary.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onOpen={open} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Press &amp; beauty</h2>
        <p>
          Stills and key art for articles, decks, and launch. Prefer empty Scenario plates for world beauty; add a Character
          plate when you need the pair or a roster face.
        </p>
        <div className="creative-brief__ideas">
          {press.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onOpen={open} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Prompt skeleton</h2>
        <pre className="creative-brief__prompt">{PROMPT_SKELETON}</pre>
      </section>

      <footer className="creative-brief__foot">
        <p className="mono">
          Play · {BRAND.site.replace("https://", "")} · @{BRAND.twitter} · Docs ·{" "}
          {BRAND.siteTech.replace("https://", "")}
        </p>
        <p>
          Assets on this page are for press, partners, and approved creative work about Zingers. Keep champion identity
          locked to the live models. For licensing questions, reach @{BRAND.twitter}.
        </p>
      </footer>

      <CreativeRenderModal payload={modal} onClose={close} />
    </div>
  );
}
