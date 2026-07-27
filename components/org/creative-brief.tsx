"use client";

import { useCallback, useState } from "react";
import { BRAND } from "@/lib/brand";
import { orgCanonical } from "@/lib/org/hosts";
import { FORCES, FOUNDING_REGIONS, KEEPERS } from "@/lib/lore/canon";
import { FIRST_MIND_KEYS, ROSTER } from "@/lib/engine/roster";
import { CreativeScene, sceneAspect } from "@/components/org/creative-scene";
import { CreativeRenderModal, type CreativeModalPayload } from "@/components/org/creative-render-modal";
import {
  CONTENT_LAW,
  FLIGHT_CAPTURES,
  NORTH_STAR,
  PALETTE,
  PROMPT_SKELETON,
  SHORT_IDEAS,
  VOCAB_DO,
  VOCAB_DONT,
  WORLD_BLURB,
  type IdeaScene,
  type ShortIdea,
} from "@/lib/org/creative-brief-data";

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const LANE_LABEL: Record<ShortIdea["lane"], string> = {
  primary: "Flight & bond",
  press: "Press",
  depth: "Depth",
};

function IdeaCard({ idea, onOpen }: { idea: ShortIdea; onOpen: (p: CreativeModalPayload) => void }) {
  const aspect = sceneAspect(idea.scene);
  return (
    <article className="creative-brief__idea" data-lane={idea.lane}>
      <button
        type="button"
        className="creative-brief__idea-scene"
        style={{ aspectRatio: aspect }}
        onClick={() =>
          onOpen({
            title: idea.title,
            caption: `${idea.format} · ${idea.duration} · ${idea.hook}`,
            scene: idea.scene,
            prompt: idea.prompt,
            filename: `zingers-idea-${idea.id}`,
          })
        }
      >
        <CreativeScene scene={idea.scene} />
        <span className="mono creative-brief__idea-scene-hint">Open · PNG · prompt</span>
      </button>
      <header>
        <span className="mono creative-brief__lane">{LANE_LABEL[idea.lane]}</span>
        <h3>{idea.title}</h3>
        <p className="creative-brief__meta mono">
          {idea.format} · {idea.duration}
        </p>
      </header>
      <p className="creative-brief__hook">{idea.hook}</p>
      <ol>
        {idea.beats.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ol>
      {idea.overlay ? (
        <p className="creative-brief__overlay">
          <span className="mono">Overlay</span> {idea.overlay}
        </p>
      ) : null}
      {idea.notes ? <p className="creative-brief__notes">{idea.notes}</p> : null}
      <button
        type="button"
        className="btn creative-brief__idea-open"
        onClick={() =>
          onOpen({
            title: idea.title,
            caption: `${idea.format} · ${idea.duration} · ${idea.hook}`,
            scene: idea.scene,
            prompt: idea.prompt,
            filename: `zingers-idea-${idea.id}`,
          })
        }
      >
        Fullscreen reference + prompt
      </button>
    </article>
  );
}

function LivePlate({
  label,
  caption,
  aspect,
  accent,
  scene,
  filename,
  onOpen,
}: {
  label: string;
  caption: string;
  aspect: string;
  accent?: string;
  scene: IdeaScene;
  filename: string;
  onOpen: (p: CreativeModalPayload) => void;
}) {
  return (
    <figure className="creative-brief__plate" style={accent ? { ["--ac" as string]: accent } : undefined}>
      <button
        type="button"
        className="creative-brief__plate-btn"
        style={{ aspectRatio: aspect }}
        onClick={() => onOpen({ title: label, caption, scene, filename })}
        aria-label={`Open ${label} fullscreen`}
      >
        <CreativeScene scene={scene} />
        <span className="mono creative-brief__plate-hint">View · Download PNG</span>
      </button>
      <figcaption>
        <strong>{label}</strong>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function CreativeBrief() {
  const [modal, setModal] = useState<CreativeModalPayload | null>(null);
  const open = useCallback((p: CreativeModalPayload) => setModal(p), []);
  const close = useCallback(() => setModal(null), []);

  const primary = SHORT_IDEAS.filter((i) => i.lane === "primary");
  const press = SHORT_IDEAS.filter((i) => i.lane === "press");
  const depth = SHORT_IDEAS.filter((i) => i.lane === "depth");

  return (
    <div className="creative-brief">
      <header className="creative-brief__hero">
        <p className="mono creative-brief__kicker">
          {BRAND.siteTech.replace("https://", "")} · press kit · assets &amp; story
        </p>
        <h1>Press kit</h1>
        <p className="creative-brief__tagline">{NORTH_STAR}</p>
        <p className="creative-brief__lede">
          Official assets and narrative beats for press, partners, and creative studios. Every portrait and region below
          is a <strong>live game render</strong> of our current models. Click any plate for fullscreen, download a PNG
          seed, and open short ideas for a full prompt with universe context. Companion gallery:{" "}
          <a href={`${BRAND.siteTech}/gallery`}>Visual gallery</a>. Pitch:{" "}
          <a href={orgCanonical("product/onepager")}>one-pager</a>. Lore:{" "}
          <a href={orgCanonical("bible/ascent")}>Flight</a>. Contact / social:{" "}
          <a href={BRAND.twitterUrl} target="_blank" rel="noopener noreferrer">
            @{BRAND.twitter}
          </a>
          .
        </p>
        <p className="creative-brief__warn">
          Character identity is the robot mesh on this page. Do not replace champions with painterly concept faces,
          anime, or photoreal humans. AI may enrich atmosphere only.
        </p>
      </header>

      <section className="creative-brief__section">
        <h2>Content law</h2>
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

      <section className="creative-brief__section">
        <h2>Flight · real-model captures</h2>
        <p>
          The face of the game. Trainer wears the jetpack. The champion needs none and flies beside you. Click to
          fullscreen and download a PNG seed.
        </p>
        <div className="creative-brief__grid creative-brief__grid--flight">
          {FLIGHT_CAPTURES.map((p) => (
            <LivePlate
              key={p.src}
              label={p.label}
              caption={p.caption}
              aspect="16/9"
              scene={p.scene}
              filename={`zingers-${slugify(p.label)}`}
              onOpen={open}
            />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>First Minds · live game models</h2>
        <p>Identity plates. Click any mind for fullscreen + PNG download. Do not invent a lookalike.</p>
        <div className="creative-brief__grid">
          {FIRST_MIND_KEYS.map((key) => {
            const r = ROSTER[key];
            const force = FORCES[r.type];
            return (
              <LivePlate
                key={key}
                label={key}
                caption={`${force.name}. ${r.persona.split(",")[0]}.`}
                aspect="4/5"
                accent={force.hex}
                scene={{ kind: "mind", key }}
                filename={`zingers-mind-${key.toLowerCase()}`}
                onOpen={open}
              />
            );
          })}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Forces · live game models</h2>
        <div className="creative-brief__grid creative-brief__grid--forces">
          {Object.values(FORCES).map((f) => {
            const slug = FORCE_SLUG[f.type];
            return (
              <LivePlate
                key={f.type}
                label={`${f.sigil} ${f.name}`}
                caption={`the ${f.inWorld.replace(/^The /, "")} · ${f.hex}`}
                aspect="1/1"
                accent={f.hex}
                scene={{ kind: "force", slug }}
                filename={`zingers-force-${slug}`}
                onOpen={open}
              />
            );
          })}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Founding regions · live scenes</h2>
        <div className="creative-brief__grid creative-brief__grid--regions">
          {FOUNDING_REGIONS.map((region) => {
            const force = FORCES[region.bias];
            return (
              <LivePlate
                key={region.id}
                label={region.name}
                caption={`${region.arena} · ${force.name}. ${region.blurb}`}
                aspect="16/9"
                accent={force.hex}
                scene={{ kind: "region", regionId: region.id }}
                filename={`zingers-region-${region.id}`}
                onOpen={open}
              />
            );
          })}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Keepers · live game models · depth only</h2>
        <p>Useful for lore depth. Not the default short-form face.</p>
        <div className="creative-brief__grid">
          {KEEPERS.map((keeper) => (
            <LivePlate
              key={keeper.name}
              label={keeper.name}
              caption={`Level ${keeper.level} · ${keeper.title}`}
              aspect="4/5"
              accent={keeper.hex}
              scene={{ kind: "keeper", name: keeper.name }}
              filename={`zingers-keeper-${slugify(keeper.name)}`}
              onOpen={open}
            />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Story beats · Flight &amp; bond</h2>
        <p>
          Short-form and social ideas that lead with the climb and the Trainer↔champion relationship. Each beat includes
          a live reference scene, a PNG seed, and a full studio prompt.
        </p>
        <div className="creative-brief__ideas">
          {primary.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onOpen={open} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Press &amp; beauty</h2>
        <p>Launch stills and wide vistas for articles, decks, and key art.</p>
        <div className="creative-brief__ideas">
          {press.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onOpen={open} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Depth · under the climb</h2>
        <p>
          Arena and Keeper beats that belong under Flight, not as the brand face. Useful once the sky story is
          established.
        </p>
        <div className="creative-brief__ideas">
          {depth.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onOpen={open} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Usage for generative enrichment</h2>
        <ol className="creative-brief__rules">
          <li>
            <strong>Render-first, AI-enrich second.</strong> Download the PNG from the modal. AI may dress atmosphere,
            fog, rim-light, and grade. AI must not redesign the character.
          </li>
          <li>
            <strong>Use each beat&apos;s full prompt</strong> (Copy in the modal). It includes universe context plus the
            locked scene.
          </li>
          <li>
            <strong>One dominant Clan color</strong> per image, plus gold accents. Avoid rainbow.
          </li>
          <li>
            <strong>Forbidden in-frame:</strong> painterly bible concept faces, invented silhouettes, text, logos,
            watermarks, UI/HUD, gore, photoreal humans.
          </li>
        </ol>
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
