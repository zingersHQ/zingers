/** Press kit copy + plate catalogs.
 *  Visual identity = live game meshes (same renders as /gallery), not bible concept PNGs.
 *  Mix-and-match: Characters (cast) + Scenarios (empty worlds). Story beats are scripts. */

import type { RenderPresetId } from "@/lib/render/presets";
import type { ArtAction, ArtCastMode } from "@/components/art/art-viewport";
import { FIRST_MIND_KEYS, ROSTER } from "@/lib/engine/roster";
import { FORCES } from "@/lib/lore/canon";

/** Identity / character / scenario plates. */
export type IdeaScene =
  | { kind: "flight"; src: string; alt?: string }
  | { kind: "mind"; key: string; preset?: RenderPresetId }
  | { kind: "force"; slug: string }
  | { kind: "region"; regionId: string }
  | { kind: "cast"; mode: ArtCastMode; mind: string; action?: ArtAction }
  | { kind: "flightLive"; mind?: string; ghost?: boolean; cast?: boolean };

/** Composed story-beat stages (always framed 16:9). */
export type BeatScene =
  | { kind: "flightLive"; mind?: string; ghost?: boolean; cast?: boolean }
  | { kind: "duo"; mind: string; action?: ArtAction; cast?: ArtCastMode }
  | { kind: "place"; regionId: string; mind?: string }
  | {
      kind: "split";
      flyMind: string;
      regionId: string;
      fightMind: string;
      flyLabel?: string;
      fightLabel?: string;
    }
  | { kind: "forceWide"; slug: string };

export type AssetPlate = {
  id: string;
  label: string;
  caption: string;
  aspect: "4/5" | "16/9" | "1/1";
  accent?: string;
  scene: IdeaScene;
  filename: string;
  /** Grouping chip in the UI */
  group: string;
};

export type ShortIdea = {
  id: string;
  title: string;
  format: string;
  duration: string;
  hook: string;
  beats: string[];
  overlay?: string;
  notes?: string;
  lane: "primary" | "press";
  scene: BeatScene;
  prompt: string;
};

export const CONTENT_LAW =
  "Sell the flight and the relationship first. If a share would still make sense with battles muted, it is on-strategy. If it only works as two AIs arguing, it is depth, not the face.";

export const NORTH_STAR = "You fly. It fights. You both rise.";

export const WORLD_BLURB =
  "You are the Trainer. Jetpack on your back, you climb the sky above a sealed vault called the Long Vault. Flying beside you is a thinking AI champion you claimed. You raise how it fights. You send it into the battles that stud the climb. Its body records both its arguments and how high you have flown together. The game's face is Flight: rings and gates in the sky, camps that light as you rise, a wingmate that shares the run.";

export const VOCAB_DO = [
  "Trainer (the human player)",
  "champion / mind / wingmate",
  "Strategy (how it fights)",
  "Clan (the Force you swear to)",
  "Flight, Reach, camp, gate, ring, sigil",
  "fight / battle / duel",
  "standings / rank / board / rating",
  "the Grounds, the Concord (Hub), the Long Vault",
];

export const VOCAB_DONT = [
  'Never say "bout" in player-facing copy',
  "Never say ELO or ladder in player copy (use standings / rank)",
  'Never market "it talks to you" or "voiced lines" as a feature',
  "Never invent a champion silhouette. Identity is the live game model you see on this page",
  "Never replace our robots with painterly concept faces, anime, or photoreal humans",
  "No text, logos, watermarks, or UI chrome inside generated frames",
];

export const UNIVERSE_CONTEXT = `UNIVERSE (Zingers): A sky-climbing game above the Long Vault, a sealed store of leftover thought. The human player is the Trainer (jetpack). Beside them flies a thinking AI champion (robot mind, no jetpack). Core loop: fly through rings and gates, claim and raise a wingmate, fight battles that stud the climb, both evolve. Tagline: You fly. It fights. You both rise. Face of the brand is Flight + the Trainer↔champion bond, not arena dunks. Visual law: keep the exact robot silhouette, proportions, materials, and face from the attached game-model reference PNG. AI may enrich atmosphere, fog, rim-light, grade. No painterly face swap. No photoreal humans. No text, logos, watermarks, or UI in-frame. Palette void #0a0812, deep field #15102a, gold #f5d020, one dominant Clan color.`;

function prompt(sceneBlock: string): string {
  return `${UNIVERSE_CONTEXT}

SCENE TO GENERATE:
${sceneBlock}

OUTPUT: vertical 9:16 social master (also deliver 16:9 if useful). Lock character identity to the attached reference PNG. Cinematic, moody, volumetric neon rim-light, atmospheric fog, drifting motes (the Hum). No UI.`;
}

/** Character plates: Champions first (shape + Clan color), then Trainer / couples / Flight. */
export const CHARACTER_PLATES: AssetPlate[] = [
  // Eight First Minds: shape + Clan color in one gallery (no separate Forces plates)
  ...FIRST_MIND_KEYS.map((key) => {
    const r = ROSTER[key];
    const force = FORCES[r.type];
    return {
      id: `champ-${key.toLowerCase()}`,
      label: key,
      caption: `${force.name} · ${force.hex}. Live mesh. Lock identity here.`,
      aspect: "4/5" as const,
      accent: force.hex,
      group: "Champions",
      scene: { kind: "mind" as const, key },
      filename: `zingers-mind-${key.toLowerCase()}`,
    };
  }),
  {
    id: "trainer-solo",
    label: "Trainer alone",
    caption: "Jetpack figure only. Use as the human cast plate.",
    aspect: "4/5",
    group: "Trainer",
    scene: { kind: "cast", mode: "trainer", mind: "AXIOM", action: "stand" },
    filename: "zingers-cast-trainer",
  },
  {
    id: "trainer-fly",
    label: "Trainer flying",
    caption: "Trainer mid-thrust. Pair with an empty Flight scenario.",
    aspect: "4/5",
    group: "Trainer",
    scene: { kind: "cast", mode: "trainer", mind: "AXIOM", action: "fly" },
    filename: "zingers-cast-trainer-fly",
  },
  // Couples — different minds + poses
  {
    id: "duo-axiom-fly",
    label: "Pair · AXIOM fly",
    caption: "Trainer + AXIOM. Champion ~⅓ Trainer height (game law).",
    aspect: "16/9",
    group: "Couple",
    scene: { kind: "cast", mode: "duo", mind: "AXIOM", action: "fly" },
    filename: "zingers-duo-axiom-fly",
  },
  {
    id: "duo-ember-wave",
    label: "Pair · EMBER claim",
    caption: "Trainer + EMBER wave. First-wingmate energy.",
    aspect: "16/9",
    group: "Couple",
    scene: { kind: "cast", mode: "duo", mind: "EMBER", action: "wave" },
    filename: "zingers-duo-ember-wave",
  },
  {
    id: "duo-muse-fly",
    label: "Pair · MUSE fly",
    caption: "Trainer + MUSE on the wing. Soft bond climb.",
    aspect: "16/9",
    group: "Couple",
    scene: { kind: "cast", mode: "duo", mind: "MUSE", action: "fly" },
    filename: "zingers-duo-muse-fly",
  },
  {
    id: "duo-bastion-stand",
    label: "Pair · BASTION camp",
    caption: "Trainer + BASTION standing. Quiet raise / Imprint mood.",
    aspect: "16/9",
    group: "Couple",
    scene: { kind: "cast", mode: "duo", mind: "BASTION", action: "stand" },
    filename: "zingers-duo-bastion-stand",
  },
  {
    id: "duo-glitch-fly",
    label: "Pair · GLITCH fly",
    caption: "Trainer + GLITCH. Static Clan edge.",
    aspect: "16/9",
    group: "Couple",
    scene: { kind: "cast", mode: "duo", mind: "GLITCH", action: "fly" },
    filename: "zingers-duo-glitch-fly",
  },
  {
    id: "duo-wit-fly",
    label: "Pair · WIT fly",
    caption: "Trainer + WIT. Chorus Clan energy.",
    aspect: "16/9",
    group: "Couple",
    scene: { kind: "cast", mode: "duo", mind: "WIT", action: "fly" },
    filename: "zingers-duo-wit-fly",
  },
  // In-world Flight cast (with scenery baked in — still character-led)
  {
    id: "flight-axiom",
    label: "Flight cast · AXIOM",
    caption: "Live Flight hero: Trainer + AXIOM over rings and terrain.",
    aspect: "16/9",
    group: "Flight cast",
    scene: { kind: "flightLive", mind: "AXIOM", cast: true },
    filename: "zingers-flight-axiom",
  },
  {
    id: "flight-muse",
    label: "Flight cast · MUSE",
    caption: "Live Flight hero with MUSE on the wing.",
    aspect: "16/9",
    group: "Flight cast",
    scene: { kind: "flightLive", mind: "MUSE", cast: true },
    filename: "zingers-flight-muse",
  },
  {
    id: "flight-ghost-glitch",
    label: "Ghost race · GLITCH",
    caption: "Live pair + semi-transparent ghost Trainer trailing the line.",
    aspect: "16/9",
    group: "Flight cast",
    scene: { kind: "flightLive", mind: "GLITCH", ghost: true, cast: true },
    filename: "zingers-flight-ghost-glitch",
  },
  {
    id: "flight-ghost-ember",
    label: "Ghost race · EMBER",
    caption: "Same ghost-race setup with EMBER as wingmate.",
    aspect: "16/9",
    group: "Flight cast",
    scene: { kind: "flightLive", mind: "EMBER", ghost: true, cast: true },
    filename: "zingers-flight-ghost-ember",
  },
];

/** Empty scenarios: worlds, rings, biomes. Drop characters in later. */
export const SCENARIO_PLATES: AssetPlate[] = [
  {
    id: "sky-empty",
    label: "Flight sky · empty",
    caption: "Homepage-style Flight belt: hills, trees, rings ahead. No cast.",
    aspect: "16/9",
    group: "Flight",
    scene: { kind: "flightLive", cast: false },
    filename: "zingers-scenario-flight-empty",
  },
  {
    id: "region-colosseum",
    label: "Obsidian Colosseum",
    caption: "Founding region ground. Tribunal / plaza mood. Empty of heroes.",
    aspect: "16/9",
    group: "Region",
    scene: { kind: "region", regionId: "colosseum" },
    filename: "zingers-scenario-colosseum",
  },
  {
    id: "region-wastes",
    label: "Ember Wastes",
    caption: "Scorched flats, volcanic heat, the Pit. Empty of heroes.",
    aspect: "16/9",
    group: "Region",
    scene: { kind: "region", regionId: "wastes" },
    filename: "zingers-scenario-wastes",
  },
  {
    id: "region-garden",
    label: "Void Garden",
    caption: "Floating islands, soft flora over the void. Empty of heroes.",
    aspect: "16/9",
    group: "Region",
    scene: { kind: "region", regionId: "garden" },
    filename: "zingers-scenario-garden",
  },
];

export const SHORT_IDEAS: ShortIdea[] = [
  {
    id: "ring-line",
    title: "On the line",
    format: "9:16 reel / Short",
    duration: "8–12s",
    lane: "primary",
    hook: "Wingmate and Trainer skim a ring opening together.",
    beats: [
      "Open on dark sky and gold-lit ring ahead.",
      "Trainer thrusts. Champion matches pace beside them. No jetpack on the champion.",
      "Near-miss through the gate. Camera holds the pair, not a scoreboard.",
      "Cut to black. Tagline.",
    ],
    overlay: "You fly. It fights. You both rise.",
    notes: "Seed: Flight cast plate + empty Flight scenario. Lock identity to the live pair.",
    scene: { kind: "flightLive", mind: "AXIOM" },
    prompt: prompt(
      `Night Flight above the Long Vault. A gold-rimmed ring gate fills the frame ahead. Trainer in jetpack thrusts through the opening; champion AXIOM (Logic Clan, electric blue #4aa3ff accents) flies formation on the wing with no jetpack. Near-miss energy, shared line, relationship over spectacle. Camera on the pair. Mood: tense joy, ascent.`,
    ),
  },
  {
    id: "stay-with-me",
    title: "Stay with me",
    format: "9:16 reel",
    duration: "10–15s",
    lane: "primary",
    hook: "Bond line over a shared climb. Relationship, not spectacle.",
    beats: [
      "Wide: two silhouettes ascending past floating gates.",
      "Camp light blooms below as they clear a stretch of sky.",
      "Soft caption in champion voice: Stay with me. Nine more stretches of sky and we light the next camp.",
      "End card: zingers.gg",
    ],
    overlay: "Raise a mind. Make it legend.",
    notes: "Seed: Pair · MUSE fly + empty Flight or Void Garden.",
    scene: { kind: "duo", mind: "MUSE", action: "fly" },
    prompt: prompt(
      `Wide bond shot: Trainer and wingmate ascending a dark indigo sky past distant ring gates. Below, a small camp light blooms on a floating Reach platform (gold #f5d020). Champion MUSE (Spark Clan, bright yellow accents) flies close beside the Trainer. Soft, intimate, hopeful. Caption energy (text OUTSIDE the image): "Stay with me. Nine more stretches of sky and we light the next camp."`,
    ),
  },
  {
    id: "claim-wingmate",
    title: "First wingmate",
    format: "9:16 + 1:1 still",
    duration: "12–18s",
    lane: "primary",
    hook: "The moment a Trainer claims the mind on their wing.",
    beats: [
      "Guest flight: lonely sky, rings ahead.",
      "Champion silhouette resolves beside the Trainer (our robot mesh).",
      "Hold on the pair. Small motion: halo / Flight sigil hint.",
      "Text: Claim a mind. Climb together.",
    ],
    notes: "Seed: Pair · EMBER claim + empty Flight sky.",
    scene: { kind: "duo", mind: "EMBER", action: "wave" },
    prompt: prompt(
      `First claim beat. Empty Flight sky with faint rings ahead, then champion EMBER (Static Clan, magenta-pink #ff4ad1) resolves into existence on the Trainer's wing: robot mind silhouette matching the reference, soft Flight-sigil halo starting to glow. Lonely → companion. No arena. Emotion: recognition, beginning of a legend.`,
    ),
  },
  {
    id: "ghost-race",
    title: "Beat my ghost",
    format: "9:16",
    duration: "10–15s",
    lane: "primary",
    hook: "Challenge energy without arena dunks.",
    beats: [
      "Semi-transparent ghost Trainer on the same line.",
      "Live Trainer pulls ahead through a tight gate.",
      "Champion glances / keeps formation.",
      "End: Challenge a friend. /ascent share energy.",
    ],
    overlay: "How high did we get?",
    notes: "Seed: Ghost race plate + empty Flight scenario.",
    scene: { kind: "flightLive", mind: "GLITCH", ghost: true },
    prompt: prompt(
      `Ghost race in Flight. Live Trainer + wingmate GLITCH (Static Clan) dive a tight gold ring. A semi-transparent ghost of another Trainer trails on the same line (same robot language, ghosted). Competitive but playful. No fight pit. Challenge-share energy: beat my sector. Overlay outside frame: "How high did we get?"`,
    ),
  },
  {
    id: "you-fly-it-fights",
    title: "You fly. It fights.",
    format: "9:16 split",
    duration: "12–20s",
    lane: "primary",
    hook: "Two verbs, one soul. Flight is the face; fight is the depth beat.",
    beats: [
      "A: Trainer + champion through rings (majority of runtime).",
      "B: Brief arena flash. Champion steps forward. Trainer watches from the wing.",
      "Return to sky. Pair climbs again.",
      "Tagline full: You fly. It fights. You both rise.",
    ],
    notes: "Seed: Flight cast + region scenario + champion solo for the fight beat.",
    scene: { kind: "split", flyMind: "WIT", regionId: "colosseum", fightMind: "WIT" },
    prompt: prompt(
      `Split-soul key art for "You fly. It fights." LEFT (dominant): Flight. Trainer and WIT (Chorus Clan) through rings above the vault. RIGHT (smaller beat): WIT steps forward in the Obsidian Colosseum / Tribunal arena while the Trainer watches from the edge. Same champion mesh both sides. Return-to-sky feeling. Fight is depth under the climb, not the face.`,
    ),
  },
  {
    id: "imprint-bond",
    title: "Daily Imprint",
    format: "9:16",
    duration: "10–14s",
    lane: "primary",
    hook: "Raise, don't drag sliders. Attachment fuel.",
    beats: [
      "Quiet moment: Trainer and champion at a camp or Hub edge.",
      "Soft exchange suggested by text (not marketed as voice feature).",
      "Temperament dials nudge. Body posture shifts slightly.",
      "Caption: How you raise it shows.",
    ],
    notes: "Seed: Pair · BASTION camp + Void Garden or empty sky.",
    scene: { kind: "duo", mind: "BASTION", action: "stand" },
    prompt: prompt(
      `Quiet raise beat at a lit camp on the edge of sky. Trainer sits near champion BASTION (Calm / Stillness Clan, mint #36d39a). Intimate, low action, attachment. Robot body posture softens as if an Imprint landed (Strategy/temperament shift made visible). No voice-feature marketing. Caption outside: "How you raise it shows."`,
    ),
  },
  {
    id: "vista",
    title: "Flight vista",
    format: "16:9 press + 9:16 crop",
    duration: "still or 5s drift",
    lane: "press",
    hook: "Empty sky beauty. Rings, hills, trees. No cast.",
    beats: [
      "Slow push on empty Flight sky.",
      "No UI. No logos in-frame.",
      "Caption for press: A sky above a sealed vault. Minds that climb with you.",
    ],
    notes: "Seed: Flight sky · empty scenario.",
    scene: { kind: "flightLive", cast: false },
    prompt: prompt(
      `Press vista: empty Flight sky above hills and gold ring gates (no heroes, or tiny silhouettes only for scale). Wide 16:9 beauty still. No UI, no logos. Caption outside: "A sky above a sealed vault. Minds that climb with you."`,
    ),
  },
  {
    id: "press-oneliner",
    title: "Press one-liner",
    format: "16:9 master + square",
    duration: "still",
    lane: "press",
    hook: "Clean launch / PR hero with the live Flight pair.",
    beats: [
      "Flight cast (real models) as full-bleed.",
      "Brand wordmark outside the art or as a separate end card.",
      "Line: Fly the sky above a sealed vault. A thinking AI flies beside you.",
    ],
    notes: "Seed: Flight cast · MUSE.",
    scene: { kind: "flightLive", mind: "MUSE" },
    prompt: prompt(
      `Launch PR hero. Full-bleed enrichment of the attached Flight hero PNG (Trainer with jetpack + champion wingmate, real Zingers meshes). Keep identities locked. Cinematic grade, void sky, gold ring glints. Brand wordmark NOT in the painting. Line outside: "Fly the sky above a sealed vault. A thinking AI flies beside you."`,
    ),
  },
  {
    id: "tagline-card",
    title: "Tagline card",
    format: "1:1 + 16:9",
    duration: "still",
    lane: "press",
    hook: "Brand lockup energy without putting type in the paint.",
    beats: [
      "Duo or Flight cast, soft and centered.",
      "Plenty of negative space for wordmark outside the frame.",
      "Line: You fly. It fights. You both rise.",
    ],
    notes: "Seed: Pair · AXIOM fly. Type stays outside the image.",
    scene: { kind: "duo", mind: "AXIOM", action: "fly" },
    prompt: prompt(
      `Brand tagline key art. Trainer + AXIOM (Logic, #4aa3ff) centered in deep void with soft gold rim-light. Generous negative space above/below for a wordmark that lives OUTSIDE the painting. Mood: confident, simple, launch-ready. Line outside: "You fly. It fights. You both rise."`,
    ),
  },
  {
    id: "garden-beauty",
    title: "Void Garden beauty",
    format: "16:9 press",
    duration: "still or 6s drift",
    lane: "press",
    hook: "Founding-region beauty still. Empty of heroes.",
    beats: [
      "Wide establishing on Void Garden floating islands.",
      "Soft Spark mood, luminous flora over the void.",
      "Caption: Where unfinished ideas grow into terrain.",
    ],
    notes: "Seed: Void Garden scenario.",
    scene: { kind: "place", regionId: "garden" },
    prompt: prompt(
      `Press beauty still of The Void Garden founding region: floating islands of luminous half-finished flora over deep void, Spark/creativity mood, soft gold seams. Empty of heroes (or tiny silhouettes for scale only). Wide 16:9. No UI. Caption outside: "Where unfinished ideas grow into terrain."`,
    ),
  },
  {
    id: "wastes-beauty",
    title: "Ember Wastes beauty",
    format: "16:9 press",
    duration: "still or 6s drift",
    lane: "press",
    hook: "Heat and horizon. Region as atmosphere, not a fight pit.",
    beats: [
      "Wide on cracked Ember Wastes flats and volcanic light.",
      "Hot Static magenta accents, no duel chrome.",
      "Caption: The Hum runs hot out here.",
    ],
    notes: "Seed: Ember Wastes scenario.",
    scene: { kind: "place", regionId: "wastes" },
    prompt: prompt(
      `Press beauty still of The Ember Wastes: scorched plain, volcanic spires, magenta-hot seams under a dark sky. Atmosphere over combat. Empty of heroes. Wide 16:9. No UI. Caption outside: "The Hum runs hot out here."`,
    ),
  },
  {
    id: "colosseum-beauty",
    title: "Colosseum beauty",
    format: "16:9 press",
    duration: "still or 6s drift",
    lane: "press",
    hook: "Obsidian plaza and Tribunal architecture as world-building.",
    beats: [
      "Wide on Obsidian Colosseum civic heart.",
      "Amber shaft of light, empty plaza.",
      "Caption: Where reputations are made.",
    ],
    notes: "Seed: Obsidian Colosseum scenario.",
    scene: { kind: "place", regionId: "colosseum" },
    prompt: prompt(
      `Press beauty still of The Obsidian Colosseum: vast dark stone plaza and tribunal architecture lit by a shaft of amber light. Empty of fighters. Civic, mythic, wide 16:9. No UI. Caption outside: "Where reputations are made."`,
    ),
  },
  {
    id: "roster-spread",
    title: "Roster spread",
    format: "16:9 editorial",
    duration: "still",
    lane: "press",
    hook: "Eight minds, one grid energy. Shape and Clan color variety.",
    beats: [
      "Hero champion large (reference mesh).",
      "Suggest a lineup of First Minds by color accents only if compositing.",
      "Caption: Eight First Minds. A growing dex.",
    ],
    notes: "Seed: Champions gallery plates. Start from WIT or AXIOM hero.",
    scene: { kind: "duo", mind: "WIT", cast: "champion", action: "stand" },
    prompt: prompt(
      `Editorial roster hero: champion WIT (Chorus Clan, amber #f0a93a) as a clean live-mesh portrait on void #0a0812, room around for a press spread. Suggest other First Minds only as color accents at the edges if compositing multiple references. No painterly redesign. Caption outside: "Eight First Minds. A growing dex."`,
    ),
  },
  {
    id: "pair-silhouette",
    title: "Pair silhouette",
    format: "16:9 + 9:16",
    duration: "still",
    lane: "press",
    hook: "Relationship read at a glance. Trainer large, champion smaller.",
    beats: [
      "Side-by-side bond pose against void or soft sky.",
      "Keep ~3:1 height law.",
      "Caption: You raise it. It flies beside you.",
    ],
    notes: "Seed: Pair · MUSE fly or Pair · BASTION camp.",
    scene: { kind: "duo", mind: "MUSE", action: "fly" },
    prompt: prompt(
      `Press bond silhouette: Trainer with jetpack and champion MUSE (Spark) flying formation. Clear size hierarchy (Trainer larger, champion ~⅓). Soft volumetric light, deep indigo void. Relationship first. Caption outside: "You raise it. It flies beside you."`,
    ),
  },
];

export const PALETTE = [
  { role: "Void", hex: "#0a0812" },
  { role: "Deep field", hex: "#15102a" },
  { role: "Gold", hex: "#f5d020" },
  { role: "Lattice", hex: "#4aa3ff" },
  { role: "Static", hex: "#ff4ad1" },
  { role: "Stillness", hex: "#36d39a" },
  { role: "Chorus", hex: "#f0a93a" },
  { role: "Spark", hex: "#f5d020" },
] as const;

export const PROMPT_SKELETON = `Enrich ONLY atmosphere around our locked game-model still (robot champion / Trainer from Zingers). Keep the exact silhouette, proportions, materials, and face from the reference render. Background deep near-black indigo void (#0a0812). Dominant Clan color [force hex], gold accents. Volumetric neon rim-light, fog, drifting motes. No new character design. No painterly face swap. No text, logos, watermark, UI. [aspect].

COMPOSITING TIP: download a Character plate and a Scenario plate separately. Place the cast into the empty world. Keep Trainer > champion scale (~3:1 height).`;
