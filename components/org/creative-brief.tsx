"use client";

import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { orgCanonical } from "@/lib/org/hosts";
import { FORCES, FOUNDING_REGIONS, KEEPERS } from "@/lib/lore/canon";
import { FIRST_MIND_KEYS, ROSTER } from "@/lib/engine/roster";
import { CanonRenderTile } from "@/components/bible/canon-render-tile";
import { RegionScene } from "@/components/lore/region-scene";
import { keeperKindForName } from "@/components/grounds/keeper-regalia";
import { showcaseChampion, showcaseForForce, showcaseForKeeper } from "@/lib/render/showcase";
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
  type ShortIdea,
} from "@/lib/org/creative-brief-data";

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

function IdeaCard({ idea }: { idea: ShortIdea }) {
  return (
    <article className="creative-brief__idea" data-lane={idea.lane}>
      <header>
        <span className="mono creative-brief__lane">{idea.lane}</span>
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
    </article>
  );
}

function LivePlate({
  label,
  caption,
  aspect,
  accent,
  children,
}: {
  label: string;
  caption: string;
  aspect: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="creative-brief__plate" style={accent ? { ["--ac" as string]: accent } : undefined}>
      <div className="creative-brief__plate-frame" style={{ aspectRatio: aspect }}>
        {children}
      </div>
      <figcaption>
        <strong>{label}</strong>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function CreativeBrief() {
  const primary = SHORT_IDEAS.filter((i) => i.lane === "primary");
  const press = SHORT_IDEAS.filter((i) => i.lane === "press");
  const depth = SHORT_IDEAS.filter((i) => i.lane === "depth");

  return (
    <main className="creative-brief">
      <header className="creative-brief__hero">
        <p className="mono creative-brief__kicker">
          {BRAND.siteTech.replace("https://", "")} · private studio pack · noindex
        </p>
        <h1>{BRAND.nameUpper}</h1>
        <p className="creative-brief__tagline">{NORTH_STAR}</p>
        <p className="creative-brief__lede">
          Unlinked creative brief for short clips, social, press, and stills. Every character and region below is a{" "}
          <strong>live game render</strong> of our current models. Same soul as{" "}
          <a href={`${BRAND.siteTech}/gallery`}>zingers.org/gallery</a>. Screenshot these, or pose more in{" "}
          <a href={`${BRAND.site}/art-studio`}>Art Studio</a>. Written canon:{" "}
          <a href={orgCanonical("bible/ascent")}>Flight</a>,{" "}
          <a href={orgCanonical("product/onepager")}>one-pager</a>.
        </p>
        <p className="creative-brief__warn">
          Do not use old painterly bible concept art as character identity. If it is not the robot mesh on this page,
          it is wrong.
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
          The face of the game. Trainer wears the jetpack. The champion needs none and flies beside you. These stills
          are captured from our meshes.
        </p>
        <div className="creative-brief__grid creative-brief__grid--flight">
          {FLIGHT_CAPTURES.map((p) => (
            <figure key={p.src} className="creative-brief__plate">
              <a href={p.src} target="_blank" rel="noopener noreferrer" className="creative-brief__plate-link" download>
                <span className="creative-brief__plate-frame" style={{ aspectRatio: "16/9" }}>
                  <Image src={p.src} alt={p.alt} fill sizes="(max-width: 700px) 100vw, 480px" className="creative-brief__plate-img" />
                </span>
              </a>
              <figcaption>
                <strong>{p.label}</strong>
                <span>{p.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>First Minds · live game models</h2>
        <p>
          Identity plates. Screenshot these. Do not invent a lookalike. Every later mind echoes one of these bodies.
        </p>
        <div className="creative-brief__grid">
          {FIRST_MIND_KEYS.map((key) => {
            const r = ROSTER[key];
            const force = FORCES[r.type];
            const { type, champion } = showcaseChampion(key);
            return (
              <LivePlate
                key={key}
                label={key}
                caption={`${force.name}. ${r.persona.split(",")[0]}.`}
                aspect="4/5"
                accent={force.hex}
              >
                <CanonRenderTile rosterKey={key} type={type} champion={champion} preset="portrait" label={`${key} live model`} />
              </LivePlate>
            );
          })}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Forces · live game models</h2>
        <div className="creative-brief__grid creative-brief__grid--forces">
          {Object.values(FORCES).map((f) => {
            const slug = FORCE_SLUG[f.type];
            const { key, type, champion } = showcaseForForce(slug);
            return (
              <LivePlate
                key={f.type}
                label={`${f.sigil} ${f.name}`}
                caption={`the ${f.inWorld.replace(/^The /, "")} · ${f.hex}`}
                aspect="1/1"
                accent={f.hex}
              >
                <CanonRenderTile
                  rosterKey={key}
                  type={type}
                  champion={champion}
                  preset="force"
                  colorHex={f.hex}
                  label={`${f.name} live model`}
                />
              </LivePlate>
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
              >
                <RegionScene regionId={region.id} />
              </LivePlate>
            );
          })}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Keepers · live game models · depth only</h2>
        <p>Useful for lore depth. Not the default short-form face.</p>
        <div className="creative-brief__grid">
          {KEEPERS.map((keeper) => {
            const { key, type, champion, accentHex } = showcaseForKeeper(keeper.name);
            return (
              <LivePlate
                key={keeper.name}
                label={keeper.name}
                caption={`Level ${keeper.level} · ${keeper.title}`}
                aspect="4/5"
                accent={keeper.hex}
              >
                <CanonRenderTile
                  rosterKey={key}
                  type={type}
                  champion={champion}
                  preset="keeper"
                  colorHex={accentHex}
                  label={`${keeper.name} live model`}
                  keeper={keeperKindForName(keeper.name)}
                />
              </LivePlate>
            );
          })}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Short ideas · primary (Flight + bond)</h2>
        <div className="creative-brief__ideas">
          {primary.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Press and beauty</h2>
        <div className="creative-brief__ideas">
          {press.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Depth ideas · under the climb</h2>
        <p>Ship after Flight content is established. Never let these redefine the brand face.</p>
        <div className="creative-brief__ideas">
          {depth.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>AI enrichment rules</h2>
        <ol className="creative-brief__rules">
          <li>
            <strong>Render-first, AI-enrich second.</strong> Screenshot the live models on this page (or Art Studio).
            AI may dress atmosphere, fog, rim-light, and grade. AI must not redesign the character.
          </li>
          <li>
            <strong>Lock to the Flight hero + the specific mind render</strong> for every batch of that character.
          </li>
          <li>
            <strong>One dominant Clan color</strong> per image, plus gold accents. Avoid rainbow.
          </li>
          <li>
            <strong>Forbidden:</strong> painterly bible concept faces, invented silhouettes, text/logos/watermarks,
            UI/HUD, gore, photoreal humans, robot-mark chrome inside the art.
          </li>
          <li>
            <strong>Aspects:</strong> characters 4:5 · regions 16:9 · force icons 1:1 · social often 9:16 crop from a
            16:9 master.
          </li>
        </ol>
        <pre className="creative-brief__prompt">{PROMPT_SKELETON}</pre>
      </section>

      <footer className="creative-brief__foot">
        <p className="mono">
          Play · {BRAND.site.replace("https://", "")} · @{BRAND.twitter} · Canon ·{" "}
          {BRAND.siteTech.replace("https://", "")}
        </p>
        <p>
          This page is intentionally unlinked. Share the URL with the studio. Do not submit it to search indexes.
        </p>
      </footer>
    </main>
  );
}
