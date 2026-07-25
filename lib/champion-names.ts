// Ubuntu-style champion names — "Adjective Noun", curated and unique on the
// ranked board. Trainers stay nameless drivers. Client-safe (no I/O).
//
// Pool: ~150 × ~150 ≈ 22,500 base pairs, plus numeric suffixes if exhausted.
// Mint only when a champion enters the standings (claim / ranked mirror).

import { trainerNameKey } from "@/lib/trainer-label";

/** Wholesome adjectives — no slurs, violence, or sexual terms. */
export const CHAMPION_ADJECTIVES = [
  "Amber", "Ample", "Arctic", "Ashen", "Astral", "Azure", "Balmy", "Blithe",
  "Bold", "Boreal", "Brave", "Breezy", "Bright", "Brisk", "Calm", "Candid",
  "Cedar", "Celeste", "Clear", "Clever", "Coral", "Cosmic", "Crisp", "Crystal",
  "Cunning", "Curious", "Dapper", "Dawn", "Deep", "Dusky", "Eager", "Earnest",
  "Elder", "Ember", "Fable", "Faint", "Fair", "Feral", "Fern", "Fleet",
  "Flint", "Floral", "Foggy", "Frost", "Gentle", "Gilded", "Glimmer", "Golden",
  "Grand", "Halcyon", "Hollow", "Honest", "Hushed", "Ivory", "Jade", "Jolly",
  "Keen", "Kind", "Lively", "Lucid", "Lunar", "Lush", "Maple", "Merry",
  "Mist", "Modest", "Noble", "Northern", "Open", "Opal", "Pale", "Pearl",
  "Pine", "Placid", "Polar", "Proud", "Pure", "Quick", "Quiet", "Radiant",
  "Rapid", "Rare", "Rosy", "Royal", "Rustic", "Sage", "Sable", "Sandy",
  "Sapphire", "Silent", "Silver", "Sleek", "Soft", "Solar", "Solid", "Southern",
  "Spry", "Stark", "Steady", "Still", "Storm", "Sturdy", "Sunny", "Swift",
  "Tender", "Tide", "True", "Ultra", "Umber", "Valiant", "Vast", "Velvet",
  "Verdant", "Vivid", "Warm", "Western", "Wild", "Windy", "Wise", "Woven",
  "Young", "Zeal", "Zesty", "Able", "Acute", "Ageless", "Agile", "Aloof",
  "Ancient", "Apex", "Ardent", "Austere", "Awake", "Basic", "Beaming", "Beige",
  "Blessed", "Blue", "Brassy", "Bronze", "Buoyant", "Canny", "Cherry", "Chill",
  "Civil", "Cobalt", "Copper", "Cozy", "Daring", "Dazzling", "Decent", "Delphic",
] as const;

/** Concrete nouns — animals, craft, sky, stone. Same safety bar. */
export const CHAMPION_NOUNS = [
  "Acorn", "Anchor", "Anvil", "Arbor", "Arrow", "Ash", "Atlas", "Badger",
  "Barrow", "Beacon", "Birch", "Bolt", "Bramble", "Breeze", "Brook", "Buzzard",
  "Canyon", "Cedar", "Cipher", "Cliff", "Comet", "Compass", "Coral", "Cove",
  "Crane", "Crest", "Crux", "Delta", "Dove", "Drift", "Eagle", "Echo",
  "Elm", "Ember", "Fable", "Falcon", "Fern", "Finch", "Fir", "Flare",
  "Fox", "Gale", "Glyph", "Gorge", "Grove", "Harbor", "Haven", "Hawk",
  "Hearth", "Heron", "Hill", "Ibex", "Iris", "Isle", "Ivory", "Jay",
  "Keel", "Kite", "Lark", "Lemma", "Lichen", "Loom", "Lynx", "Maple",
  "Marsh", "Meadow", "Meridian", "Moor", "Moss", "Moth", "Nimbus", "Node",
  "Oak", "Orbit", "Otter", "Owl", "Pebble", "Pike", "Pillar", "Pine",
  "Pinnacle", "Plume", "Pond", "Prism", "Quill", "Quorum", "Raven", "Reef",
  "Ridge", "Rift", "River", "Robin", "Rune", "Sable", "Sigil", "Sketch",
  "Spar", "Sparrow", "Spire", "Spruce", "Squall", "Stag", "Stone", "Strand",
  "Summit", "Swan", "Teal", "Thorn", "Tide", "Torch", "Vale", "Vault",
  "Vector", "Vista", "Vole", "Warden", "Willow", "Wolf", "Wren", "Yew",
  "Zephyr", "Aether", "Basin", "Bison", "Bluff", "Briar", "Boulder", "Cairn",
  "Cascade", "Citadel", "Cricket", "Current", "Dune", "Eddy", "Fjord", "Glade",
  "Glacier", "Gull", "Hedge", "Horizon", "Inlet", "Lagoon", "Ledger", "Lotus",
  "Mirror", "Monolith", "Needle", "Orchard", "Oxbow", "Pinnace", "Quarry", "Rapids",
] as const;

export function composeChampionName(adj: string, noun: string, suffix = 0): string {
  const base = `${adj} ${noun}`;
  if (suffix <= 0) return base.slice(0, 24);
  const tag = ` ${suffix}`;
  return `${base.slice(0, Math.max(2, 24 - tag.length))}${tag}`;
}

/** Approximate base runway (no suffixes). */
export const CHAMPION_NAME_BASE_POOL =
  CHAMPION_ADJECTIVES.length * CHAMPION_NOUNS.length;

export function nameHash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Yield candidate champion names. First picks are stable for the seed; later
 * ones walk the grid, then numbered suffixes (viral overflow).
 */
export function* championNameCandidates(seed: string): Generator<string> {
  const a0 = Math.floor(nameHash01(seed) * CHAMPION_ADJECTIVES.length);
  const n0 = Math.floor(nameHash01(`${seed}:n`) * CHAMPION_NOUNS.length);
  const seen = new Set<string>();
  const push = (name: string) => {
    const k = trainerNameKey(name);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  };

  const total = CHAMPION_ADJECTIVES.length * CHAMPION_NOUNS.length;
  for (let i = 0; i < total; i++) {
    const adj = CHAMPION_ADJECTIVES[(a0 + i) % CHAMPION_ADJECTIVES.length]!;
    const noun = CHAMPION_NOUNS[(n0 + Math.floor(i / CHAMPION_ADJECTIVES.length)) % CHAMPION_NOUNS.length]!;
    const name = composeChampionName(adj, noun);
    if (push(name)) yield name;
  }

  // Overflow runway — still unique, uglier, never blocks a claim.
  for (let s = 2; s <= 9999; s++) {
    const adj = CHAMPION_ADJECTIVES[(a0 + s) % CHAMPION_ADJECTIVES.length]!;
    const noun = CHAMPION_NOUNS[(n0 + s * 7) % CHAMPION_NOUNS.length]!;
    const name = composeChampionName(adj, noun, s);
    if (push(name)) yield name;
  }
}

// Back-compat aliases while call sites migrate.
export const TRAINER_ADJECTIVES = CHAMPION_ADJECTIVES;
export const TRAINER_NOUNS = CHAMPION_NOUNS;
export const composeTrainerName = composeChampionName;
export const trainerNameCandidates = championNameCandidates;
