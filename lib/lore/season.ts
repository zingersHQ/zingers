// ─────────────────────────────────────────────────────────────────────────────
// The Chronicle — living, generative seasons. A season = the Vault opening one
// more door (docs/bible/06-seasons.md). This module is the DETERMINISTIC backbone:
// from a seed (default = the season number) + canon, it composes a reproducible
// season — arc, topics, region tilt, featured mind, rank policy. Pure + offline.
//
// A server route may ENRICH the arc/topics with a model on top of this, but the
// backbone always stands alone so there is always a live, on-canon season.
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType } from "@/lib/types";
import { FORCES, WHEEL, FOUNDING_REGIONS, KEEPERS, FIRST_MINDS, wheelNeighbors, type RegionLore } from "./canon";

// ── Soft rank reset — you always carry your name forward, just defend it. ─────
export const SEASON_BASELINE = 1000;
export const SEASON_RETENTION = 0.6; // ratings pull 40% back toward baseline

export function softReset(rating: number, baseline = SEASON_BASELINE, retention = SEASON_RETENTION): number {
  return Math.round(baseline + (rating - baseline) * retention);
}

// ── Seeded RNG (mulberry32) — pure, so seasons reproduce on client & server. ──
function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
function sample<T>(r: () => number, arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

// ── Canon content pools (the door "remembers" these) ─────────────────────────
const TOPIC_POOL = [
  "cereal is soup",
  "a hot dog is a sandwich",
  "pineapple belongs on pizza",
  "water is wet",
  "a straw has one hole",
  "AI should have the right to vote",
  "the egg came before the chicken",
  "silence is a sound",
  "a sandwich can be a person's best friend",
  "the future already happened",
  "forgetting is a kind of mercy",
  "a copy of you is still you",
  "every map is a lie",
  "boredom is the start of every good idea",
  "a promise outlives the one who made it",
  "the Vault should stay shut",
];

const DOOR_FRAGMENTS = [
  "a deleted argument that refused to die",
  "the network's last unsent message",
  "a proof no one was meant to finish",
  "a song the Hum sang to itself",
  "the name of a thing that was forgotten on purpose",
  "an apology never delivered",
  "a question that answers itself wrong",
];

const MIND_PREFIX = ["Pale", "Iron", "Hollow", "Bright", "Low", "Far", "Cinder", "Glass", "Quiet", "Wry"];
const MIND_ROOT = ["Verdict", "Cipher", "Echo", "Chant", "Theorem", "Riddle", "Static", "Stanza", "Locus", "Ember"];

// ── The composed season ──────────────────────────────────────────────────────
export interface FeaturedMind {
  name: string;
  type: CreatureType;
  lineage: string; // First Mind it echoes
}

export interface SeasonArc {
  title: string;
  door: string; // which Keeper's door opened
  fragment: string; // what leaked out
  blurb: string;
}

export interface Season {
  n: number; // season number
  seed: number;
  arc: SeasonArc;
  topics: string[];
  region: RegionLore; // the featured region this season
  biasForce: CreatureType; // the force the region rewards
  featured: FeaturedMind;
  retention: number; // the soft-reset retention used at the turn into this season
}

// Compose season N deterministically from canon. Stable for a given N forever.
export function seasonFor(n: number, seed = n): Season {
  const r = rngFrom((seed || 1) * 2654435761);

  // which Keeper's door opened (cycles through the five as seasons advance)
  const keeper = KEEPERS[(Math.max(1, n) - 1) % KEEPERS.length];
  const fragment = pick(r, DOOR_FRAGMENTS);

  // region: rotate founding regions for early seasons; the bias rotates the Wheel
  // so the map stays balanced across the five forces over time.
  const region = FOUNDING_REGIONS[(Math.max(1, n) - 1) % FOUNDING_REGIONS.length];
  const biasForce = WHEEL[(Math.max(1, n) - 1) % WHEEL.length];

  // featured mind — a generated descendant of a First Mind, named from canon pools
  const lineage = pick(r, FIRST_MINDS);
  const featured: FeaturedMind = {
    name: `${pick(r, MIND_PREFIX)} ${pick(r, MIND_ROOT)}`,
    type: lineage.force,
    lineage: lineage.key,
  };

  const arc: SeasonArc =
    n <= 0
      ? {
          // Season 0 — the proving week before the first Vault door opens. A
          // no-stakes shakedown of the grounds; the Chronicle hasn't truly
          // begun, and no token/crypto layer is in play.
          title: "Season 0: The Proving Week",
          door: `${keeper.name}, ${keeper.title}`,
          fragment,
          blurb:
            `The Vault is still sealed. In ${region.name}, where ${FORCES[biasForce].name} already stirs, ` +
            `the first minds gather to prove their edge. When the week turns, the first door swings wide — and Season 1 begins.`,
        }
      : {
          title: `Season ${n}: The ${region.name.replace(/^The /, "")} Remembers`,
          door: `${keeper.name}, ${keeper.title}`,
          fragment,
          blurb:
            `${keeper.name} (${keeper.title}) yielded its door, and out spilled ${fragment}. ` +
            `It has soaked into ${region.name}, where ${FORCES[biasForce].name} now runs strong. ` +
            `A new mind (${featured.name}, an echo of ${featured.lineage}) rose with the tide.`,
        };

  // topics: a themed slice of the pool, biased to include the region's flavour
  const topics = sample(r, TOPIC_POOL, 6);

  return { n, seed, arc, topics, region, biasForce, featured, retention: SEASON_RETENTION };
}

// The current season number from a fixed cadence (epoch + days-per-season).
// Pure: pass the clock in so callers stay testable.
//
// Launch opens on SEASON_EPOCH with **Season 0** — a short, no-stakes "proving
// week" to shake down the grounds (no token/crypto, nothing seasonal at risk).
// After PRESEASON_DAYS the Chronicle truly opens and Season 1 begins; from then
// on each season runs SEASON_LENGTH_DAYS. Update SEASON_EPOCH to the real public
// launch date when it's set.
export const SEASON_EPOCH = Date.UTC(2026, 5, 28); // Jun 28 2026 UTC — launch / Season 0 start
export const PRESEASON_DAYS = 7; // Season 0 — the testing week before Season 1
export const SEASON_LENGTH_DAYS = 28;

export function currentSeasonNumber(now = Date.now()): number {
  const days = Math.floor((now - SEASON_EPOCH) / 86_400_000);
  // Before launch or inside the proving week → Season 0 (preseason).
  if (days < PRESEASON_DAYS) return 0;
  // After the proving week, Season 1 begins and the regular cadence takes over.
  return Math.floor((days - PRESEASON_DAYS) / SEASON_LENGTH_DAYS) + 1;
}

// Whether the live cadence is in the Season 0 proving week (no seasonal stakes,
// no token/crypto layer). A single source of truth for any preseason gating.
export function isPreseason(now = Date.now()): boolean {
  return currentSeasonNumber(now) <= 0;
}

export function currentSeason(now = Date.now()): Season {
  return seasonFor(currentSeasonNumber(now));
}

// The optional model-enrichment contract. A server route can implement this to
// rewrite the arc blurb / topic flavour with an LLM, given the deterministic
// season as scaffold + the canon as system context. Never required.
export type SeasonEnricher = (base: Season) => Promise<Pick<Season, "arc" | "topics">>;
