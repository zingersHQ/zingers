import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { orgCanonical } from "@/lib/org/hosts";
import {
  CONTENT_LAW,
  FLIGHT_PLATES,
  FORCE_PLATES,
  KEEPER_PLATES,
  LEGACY_STILLS,
  MIND_PLATES,
  NORTH_STAR,
  PALETTE,
  PROMPT_SKELETON,
  REGION_PLATES,
  SHORT_IDEAS,
  STYLE_KEY,
  VOCAB_DO,
  VOCAB_DONT,
  WORLD_BLURB,
  type RefPlate,
  type ShortIdea,
} from "@/lib/org/creative-brief-data";

function Plate({ plate, aspect = "4/5" }: { plate: RefPlate; aspect?: string }) {
  return (
    <figure className="creative-brief__plate">
      <a href={plate.src} target="_blank" rel="noopener noreferrer" className="creative-brief__plate-link" download>
        <span className="creative-brief__plate-frame" style={{ aspectRatio: aspect }}>
          <Image src={plate.src} alt={plate.alt} fill sizes="(max-width: 700px) 50vw, 220px" className="creative-brief__plate-img" />
        </span>
      </a>
      <figcaption>
        {plate.label ? <strong>{plate.label}</strong> : null}
        <span>{plate.caption}</span>
      </figcaption>
    </figure>
  );
}

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
          Unlinked creative brief for short clips, social, press, and beautiful stills. Reference plates below are
          canon. Right-click or open any image to save. Live 3D gallery:{" "}
          <a href={`${BRAND.siteTech}/gallery`}>zingers.org/gallery</a>. Written canon:{" "}
          <a href={orgCanonical("bible/art-direction")}>art direction</a>,{" "}
          <a href={orgCanonical("bible/ascent")}>Flight</a>,{" "}
          <a href={orgCanonical("product/onepager")}>one-pager</a>.
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
        <h2>Style key</h2>
        <p>Pass this as a reference on every AI batch so palette and rendering stay locked.</p>
        <div className="creative-brief__grid creative-brief__grid--wide">
          <Plate plate={STYLE_KEY} aspect="16/9" />
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Flight · Trainer and wingmate</h2>
        <p>
          The face of the game. Trainer wears the jetpack. The champion needs none and flies beside you. Rings and
          gates are the score. One fall returns you toward zero. The run marks the champion.
        </p>
        <div className="creative-brief__grid creative-brief__grid--flight">
          {FLIGHT_PLATES.map((p) => (
            <Plate key={p.src} plate={p} aspect="16/9" />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>First Minds · identity plates</h2>
        <p>
          These eight are the First Minds. Use them as the identity plate for any generated enrichment. Do not invent
          a lookalike silhouette.
        </p>
        <div className="creative-brief__grid">
          {MIND_PLATES.map((p) => (
            <Plate key={p.src} plate={p} />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Mesh stills · secondary pose refs</h2>
        <p>Legacy game stills for pose and body mass. Prefer bible mind plates for color and character lock.</p>
        <div className="creative-brief__grid">
          {LEGACY_STILLS.map((p) => (
            <Plate key={p.src} plate={p} aspect="1/1" />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Forces</h2>
        <div className="creative-brief__grid creative-brief__grid--forces">
          {FORCE_PLATES.map((p) => (
            <Plate key={p.src} plate={p} aspect="1/1" />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Regions</h2>
        <div className="creative-brief__grid creative-brief__grid--regions">
          {REGION_PLATES.map((p) => (
            <Plate key={p.src} plate={p} aspect="16/9" />
          ))}
        </div>
      </section>

      <section className="creative-brief__section">
        <h2>Keepers · depth only</h2>
        <p>Useful for lore and press worldbuilding. Not the default short-form face.</p>
        <div className="creative-brief__grid">
          {KEEPER_PLATES.map((p) => (
            <Plate key={p.src} plate={p} />
          ))}
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
            <strong>Render-first, AI-enrich second.</strong> Our plates and meshes are identity. AI dresses atmosphere,
            fog, rim-light, and grade.
          </li>
          <li>
            <strong>Lock to the style key</strong> on every batch. For a recurring mind, also lock to that mind&apos;s
            first approved plate.
          </li>
          <li>
            <strong>One dominant force color</strong> per image, plus gold accents. Avoid rainbow.
          </li>
          <li>
            <strong>Forbidden in-frame:</strong> text, logos, watermarks, UI/HUD, gore, photoreal human faces, robot-mark
            chrome inside lore art.
          </li>
          <li>
            <strong>Aspects:</strong> characters 4:5 · regions/scenarios 16:9 · force icons 1:1 · social often 9:16 crop
            from a 16:9 master.
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
