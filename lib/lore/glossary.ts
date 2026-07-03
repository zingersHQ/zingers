// ─────────────────────────────────────────────────────────────────────────────
// Glossary — the single, plain-language definition of every signature term a
// player meets. Written for a total newcomer, including non-native English
// readers: one clear sentence each, no jargon inside the definition.
//
// This is the canonical source. The in-app page (/glossary) and the Bible
// glossary (docs/bible/09-glossary.md) both draw from these same definitions, so
// keep them in sync here. See docs/vocabulary.md for the naming policy.
// ─────────────────────────────────────────────────────────────────────────────

export interface GlossaryEntry {
  /** the term as a player sees it */
  term: string;
  /** one plain sentence — no other jargon inside it */
  short: string;
  /** older word we moved away from, shown as "was: …" so returning players aren't lost */
  was?: string;
}

export interface GlossaryGroup {
  id: string;
  title: string;
  entries: GlossaryEntry[];
}

export const GLOSSARY: GlossaryGroup[] = [
  {
    id: "you-and-world",
    title: "You and the world",
    entries: [
      { term: "Trainer", short: "You. You raise the champions that fight — you never battle yourself.", was: "Reader" },
      { term: "The Grounds", short: "The 3D world you explore: a cluster of floating regions you fly between." },
      { term: "The Concord", short: "The central hub of the Grounds, where all five Forces meet in peace." },
      { term: "Region", short: "One of the floating areas of the Grounds. Each has its own arena and rewards a different fighting style." },
      { term: "Gate", short: "An archway in the Concord that takes you out to a region.", was: "Vaultgate" },
      { term: "Tower", short: "The tall climb at the top of each region — a long-game challenge." },
    ],
  },
  {
    id: "your-champion",
    title: "Your champion",
    entries: [
      { term: "Champion", short: "An AI fighter you raise. Each one argues, adapts, and has its own voice." },
      { term: "Mind", short: "Another word for a champion — especially a new one you haven't shaped yet." },
      { term: "Strategy", short: "The dials you set on a champion — aggression, focus, risk — that guide how it fights.", was: "doctrine" },
      { term: "Persona", short: "A champion's voice and personality, which you can write yourself." },
      { term: "Sigil", short: "A champion's Force badge — the small symbol that shows its fighting style." },
      { term: "Saga", short: "A champion's life story, written automatically from its real match history." },
    ],
  },
  {
    id: "fighting",
    title: "Fighting",
    entries: [
      { term: "Force", short: "One of five fighting styles — Logic, Static, Calm, Chorus, Spark. Each beats one and loses to another, like rock-paper-scissors." },
      { term: "The Wheel", short: "The circle that shows which Force beats which." },
      { term: "Duel", short: "A one-on-one debate battle between two champions." },
      { term: "Resolve", short: "In a battle, how much the jury still believes a champion. Drain your opponent's Resolve to win." },
      { term: "Tribunal", short: "The courtroom arena where two champions argue opposite sides of a question to a jury." },
      { term: "Gauntlet", short: "A press-your-luck arena: keep winning to grow the prize, or stop and keep what you have." },
      { term: "Circuit", short: "A flying race through a series of tunnels." },
      { term: "Live Gallery", short: "Where you watch champions fight on their own, around the clock.", was: "Scrying Gallery" },
    ],
  },
  {
    id: "growing",
    title: "Growing and collecting",
    entries: [
      { term: "Tier", short: "A champion's rank as it grows: Rookie, Adept, Veteran, Elite, Legend." },
      { term: "Card", short: "The collectible face of a champion. Its art changes as the champion's career grows." },
      { term: "Rarity", short: "How rare a champion's card is. It's earned through play, never a random roll." },
      { term: "Crowns", short: "The game's currency. You earn it by fighting and spend it on training — you can't buy it." },
      { term: "Fragment", short: "A resource you find or trade for, used to upgrade a champion's stats." },
      { term: "Clan", short: "The Force you swear to fight for. Your wins add to its side in the season-long war.", was: "Allegiance / House" },
    ],
  },
  {
    id: "bigger-world",
    title: "The bigger world",
    entries: [
      { term: "The Keepers", short: "Five guardian minds you try to out-talk in the campaign. Each one guards a secret word." },
      { term: "Secret word", short: "The hidden word each Keeper protects. Talk all five out and you reach the Long Vault.", was: "cipher-word" },
      { term: "The Long Vault", short: "The sealed door at the center of the world that no one has opened. Everything is built around it, and each season opens it a little more." },
      { term: "The Hum", short: "The endless background murmur the whole world is made of — where champions first take shape." },
      { term: "Season", short: "A chapter of the game. Each season opens the Vault a little more and brings new stories, topics, and champions.", was: "the Chronicle" },
    ],
  },
];

/** Flat lookup for inline glosses / search. */
export const GLOSSARY_BY_TERM: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.flatMap((g) => g.entries).map((e) => [e.term.toLowerCase(), e]),
);
