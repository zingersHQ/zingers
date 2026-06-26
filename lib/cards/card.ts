// ─────────────────────────────────────────────────────────────────────────────
// The Collection layer — a champion as a CARD. A card is a deterministic view of
// a mind's career: its evolving art (the genome → body), its earned sigils, its
// moveset-as-abilities, its rarity, and its saga. Pure (no React/three) so it can
// render server-side (OG cards) or client-side (the dex) from the same record.
//
// Provenance fields are present but INERT — the ownership layer (docs/bible/08)
// fills them in later without a schema change. See docs/bible/07-collection.md.
// ─────────────────────────────────────────────────────────────────────────────
import type { Champion, CreatureType, StyleAxis } from "@/lib/types";
import { ROSTER, type Move, type StatKey } from "@/lib/engine/roster";
import { levelFor, tierFor, tierIndex, doctrine, sigils, skillLevel, skillsOf, type Skill } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { appearanceOf, type Appearance } from "@/lib/evolve/appearance";
import { FORCES, FIRST_MINDS, RARITY_LABEL, RARITY_HEX, type ForceLore, type Rarity } from "@/lib/lore/canon";

// A move, presented as a collectible "ability" line.
export interface CardAbility {
  id: string;
  name: string;
  stat: StatKey;
  power: number;
  text: string;
  finisher: boolean;
}

// Inert ownership hook — wired to a chain later, never affects gameplay.
export interface CardProvenance {
  mintId: string | null;
  owner: string | null; // handle or wallet
  chain: string | null;
  mintedSeason: number | null;
}

export interface CardSigil {
  axis: StyleAxis;
  glyph: string;
  color: string;
  label: string;
  lvl: number; // I / II / III
}

export interface Card {
  key: string;
  name: string;
  type: CreatureType;
  force: ForceLore; // in-world flavour of the type
  lineage: string; // the First Mind this card echoes (its key)
  level: number;
  skillLevel: number; // SL — the headline KPI (depth + acquired skills)
  skills: Skill[]; // acquired abilities (axis thresholds crossed)
  tier: string;
  doctrine: string; // earned title ("The Annihilator", …)
  rarity: Rarity;
  rarityLabel: string;
  rarityHex: string;
  stats: Record<StatKey, number>;
  elo: number;
  wins: number;
  losses: number;
  battles: number;
  sigils: CardSigil[];
  abilities: CardAbility[];
  saga: string; // short evolving bio (deterministic fallback; LLM-enrichable)
  art: Appearance; // genome → body params for rendering the card's portrait
  provenance: CardProvenance;
}

// Player-facing description of a move's effect (pure; no engine import).
function abilityText(m: Move): string {
  const fx: string[] = [];
  if (m.base > 0) fx.push(`${m.base} power`);
  if (m.apply) fx.push(`inflicts ${m.apply[0]}`);
  if (m.self_hyped) fx.push("self Hyped");
  if (m.self_guard) fx.push(`+${m.self_guard[0]} Guard`);
  if (m.heal) fx.push(`heal ${m.heal}`);
  if (m.deflect) fx.push("braces (halves next hit)");
  if (m.after_deflect) fx.push("+50% after Deflect");
  if (m.bonus_if_tilted) fx.push("+30% vs Tilted");
  if (m.widen_jitter) fx.push("wild variance");
  if (m.recoil) fx.push(`recoil ${m.recoil}`);
  if (m.scale_low_hp) fx.push("clutch (scales with damage taken)");
  if (m.requires === "opp_open") fx.push("needs opponent Exposed/Tilted");
  if (m.requires === "two_cre") fx.push("needs 2 prior Spark moves");
  if (m.finisher) fx.push("FINISHER");
  return fx.join(" · ") || "utility";
}

// Rarity is EARNED (by tier), then escalated to Mythic only by a one-of-a-kind
// season event (cracking a Keeper, winning a season). Never a random roll.
export function rarityOf(level: number, opts: { mythic?: boolean } = {}): Rarity {
  if (opts.mythic) return "mythic";
  const ti = tierIndex(level);
  return (["common", "uncommon", "rare", "epic", "legendary"] as const)[ti] ?? "common";
}

// The First Mind a card descends from. Base roster keys map to themselves;
// generated minds pass an explicit lineage.
function lineageOf(key: string, explicit?: string): string {
  if (explicit) return explicit;
  return FIRST_MINDS.find((m) => m.key === key)?.key ?? key;
}

// A short, deterministic saga — narrated from the real record. The season engine
// (or a model) can replace this with richer prose; this is the always-available
// fallback so a card is never blank.
function deterministicSaga(name: string, force: ForceLore, level: number, c: Champion, memory?: string[]): string {
  const record = `${c.wins}W·${c.losses}L`;
  const note = memory && memory.length ? ` ${memory[0]}` : "";
  if (c.battles === 0) return `${name}, newly cohered from ${force.name}. Unproven: its argument has yet to leave a mark.`;
  return `${name} of ${force.name}: ${record} across the Wheel, level ${level}.${note}`;
}

export interface CardOptions {
  name?: string; // display override (defaults to roster name)
  lineage?: string; // for generated minds
  mythic?: boolean; // season trophy → Mythic rarity
  memory?: string[]; // recent lessons, to flavour the saga
  saga?: string; // an explicit (e.g. model-generated) saga
  provenance?: Partial<CardProvenance>;
}

const NO_PROVENANCE: CardProvenance = { mintId: null, owner: null, chain: null, mintedSeason: null };

// Build the full card view for a champion's current career state.
export function cardOf(key: string, champion: Champion, opts: CardOptions = {}): Card {
  const base = ROSTER[key];
  const type = (base?.type ?? "LOGIC") as CreatureType;
  const force = FORCES[type];
  const lf = levelFor(champion.xp);
  const tier = tierFor(lf.level);
  const name = opts.name?.trim() || base?.name || key;
  const rarity = rarityOf(lf.level, { mythic: opts.mythic });

  return {
    key,
    name,
    type,
    force,
    lineage: lineageOf(key, opts.lineage),
    level: lf.level,
    skillLevel: skillLevel(champion),
    skills: skillsOf(champion),
    tier: tier.name,
    doctrine: doctrine(champion, lf.level),
    rarity,
    rarityLabel: RARITY_LABEL[rarity],
    rarityHex: RARITY_HEX[rarity],
    stats: base ? { ...base.stats } : { LOG: 0, CMP: 0, RHE: 0, CRE: 0, CHA: 0 },
    elo: ratingOf(champion),
    wins: champion.wins,
    losses: champion.losses,
    battles: champion.battles,
    sigils: sigils(champion).map((s) => ({ axis: s.k, glyph: s.glyph, color: s.color, label: s.label, lvl: s.lvl })),
    abilities: (base?.moves ?? []).map((m) => ({ id: m.id, name: m.name, stat: m.stat, power: m.base, text: abilityText(m), finisher: !!m.finisher })),
    saga: opts.saga?.trim() || deterministicSaga(name, force, lf.level, champion, opts.memory),
    art: appearanceOf(champion),
    provenance: { ...NO_PROVENANCE, ...(opts.provenance ?? {}) },
  };
}
