/** Studio pack copy for the unlinked /creative brief.
 *  Visual identity = live game meshes (same renders as /gallery), not bible concept PNGs.
 *  Player-facing vocabulary: Trainer, Strategy, Clan, fight/battle, Flight, standings.
 *  No bout / ELO / ladder. No spaced em dash. */

import type { RenderPresetId } from "@/lib/render/presets";

export type IdeaScene =
  | { kind: "flight"; src: string; alt?: string }
  | { kind: "mind"; key: string; preset?: RenderPresetId }
  | { kind: "force"; slug: string }
  | { kind: "keeper"; name: string }
  | { kind: "region"; regionId: string }
  | { kind: "pair"; left: string; right: string }
  | { kind: "regionMind"; regionId: string; key: string };

export type ShortIdea = {
  id: string;
  title: string;
  format: string;
  duration: string;
  hook: string;
  beats: string[];
  overlay?: string;
  notes?: string;
  /** primary | depth — depth = fight/Keeper ok as secondary, not the face */
  lane: "primary" | "depth" | "press";
  /** Live reference scene for the agency to seed from */
  scene: IdeaScene;
  /** Full generative prompt: universe context + locked scene description */
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
  "the Grounds, the Concord (Hub), the Long Vault, Keepers",
];

export const VOCAB_DONT = [
  'Never say "bout" in player-facing copy',
  "Never say ELO or ladder in player copy (use standings / rank)",
  'Never market "it talks to you" or "voiced lines" as a feature',
  "Never invent a champion silhouette. Identity is the live game model you see on this page",
  "Never replace our robots with painterly concept faces, anime, or photoreal humans",
  "No text, logos, watermarks, or UI chrome inside generated frames",
];

/** Shared universe block prepended conceptually into each idea prompt. */
export const UNIVERSE_CONTEXT = `UNIVERSE (Zingers): A sky-climbing game above the Long Vault, a sealed store of leftover thought. The human player is the Trainer (jetpack). Beside them flies a thinking AI champion (robot mind, no jetpack). Core loop: fly through rings and gates, claim and raise a wingmate, fight battles that stud the climb, both evolve. Tagline: You fly. It fights. You both rise. Face of the brand is Flight + the Trainer↔champion bond, not arena dunks. Visual law: keep the exact robot silhouette, proportions, materials, and face from the attached game-model reference PNG. AI may enrich atmosphere, fog, rim-light, grade. No painterly face swap. No photoreal humans. No text, logos, watermarks, or UI in-frame. Palette void #0a0812, deep field #15102a, gold #f5d020, one dominant Clan color.`;

/** Real-model Flight captures only (not concept art). */
export const FLIGHT_CAPTURES = [
  {
    src: "/img/home/flight-hero-poster.jpg",
    alt: "Trainer and champion in Flight. Real game models.",
    caption: "Flight hero from our meshes. Trainer with jetpack; champion flies beside without one.",
    label: "Flight hero",
    scene: { kind: "flight" as const, src: "/img/home/flight-hero-poster.jpg", alt: "Flight hero" },
  },
  {
    src: "/img/home/flight-hero-poster-sm.jpg",
    alt: "Compact Flight hero still for vertical crops.",
    caption: "Same capture, smaller. Prefer for 9:16 crops.",
    label: "Flight hero (sm)",
    scene: { kind: "flight" as const, src: "/img/home/flight-hero-poster-sm.jpg", alt: "Flight hero compact" },
  },
] as const;

function prompt(sceneBlock: string): string {
  return `${UNIVERSE_CONTEXT}

SCENE TO GENERATE:
${sceneBlock}

OUTPUT: vertical 9:16 social master (also deliver 16:9 if useful). Lock character identity to the attached reference PNG. Cinematic, moody, volumetric neon rim-light, atmospheric fog, drifting motes (the Hum). No UI.`;
}

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
    notes: "Lock identity to Flight hero + the live First Mind render. AI may dress fog only.",
    scene: { kind: "flight", src: "/img/home/flight-hero-poster.jpg", alt: "On the line" },
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
    notes: "Guiding voice is warm and direct (we/us). Never frame as a quest checklist.",
    scene: { kind: "pair", left: "MUSE", right: "BASTION" },
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
    scene: { kind: "mind", key: "EMBER" },
    prompt: prompt(
      `First claim beat. Empty Flight sky with faint rings ahead, then champion EMBER (Static Clan, magenta-pink #ff4ad1) resolves into existence on the Trainer's wing: robot mind silhouette matching the reference, soft Flight-sigil halo starting to glow. Lonely → companion. No arena. Emotion: recognition, beginning of a legend.`,
    ),
  },
  {
    id: "sigil-grows",
    title: "The sigil remembers",
    format: "9:16",
    duration: "8–12s",
    lane: "primary",
    hook: "Climbs mark the body, not only battles.",
    beats: [
      "Before: champion at lower Reach, soft sigil.",
      "Hard cut montage: gates, camps lit, altitude rising.",
      "After: same champion mesh, brighter Flight sigil / evolved body.",
      "Caption: The sky writes on you.",
    ],
    notes: "Before/after of the pair in the sky. Not two fighters in a pit.",
    scene: { kind: "mind", key: "VOX", preset: "force" },
    prompt: prompt(
      `Before/after energy in one frame or diptych: champion VOX (Chorus Clan, amber #f0a93a) as the same robot mesh, now marked by Flight. Soft halo / Flight sigil brighter, body reading more legendary, still clearly VOX from the reference. Background: stacked ring gates climbing into void. Message: climbs mark the body. Caption outside frame: "The sky writes on you."`,
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
    scene: { kind: "flight", src: "/img/home/flight-hero-poster-sm.jpg", alt: "Ghost race" },
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
    notes: "Do not open on the fight. Fight is the mid-clip reveal, under 30% of runtime.",
    scene: { kind: "regionMind", regionId: "colosseum", key: "WIT" },
    prompt: prompt(
      `Split-soul key art for "You fly. It fights." LEFT (dominant): Flight. Trainer and WIT (Chorus Clan) through rings above the vault. RIGHT (smaller beat): WIT steps forward in the Obsidian Colosseum / Tribunal arena while the Trainer watches from the edge. Same champion mesh both sides. Return-to-sky feeling. Fight is depth under the climb, not the face.`,
    ),
  },
  {
    id: "force-mood",
    title: "Pick a Clan",
    format: "1:1 carousel or 5× 6s cuts",
    duration: "6s each",
    lane: "primary",
    hook: "Five Forces as mood, not a type chart lecture.",
    beats: [
      "One live Force render each: Lattice, Static, Stillness, Chorus, Spark.",
      "Single motto per cut: Close the proof. / Break the frame. / Outlast the storm. / Move the room. / Change the question.",
      "End card: Swear a Clan. Claim a champion.",
    ],
    notes: "One dominant force color per image. Gold accents. Avoid rainbow.",
    scene: { kind: "force", slug: "lattice" },
    prompt: prompt(
      `Clan mood plate for The Lattice (Logic), hex #4aa3ff. Centered embodiment using the attached Force/game-model reference (AXIOM lineage robot). One dominant blue + gold accents only. Motto energy outside frame: "Close the proof." Swear a Clan. Claim a champion. Square 1:1. Repeat formula for Static #ff4ad1, Stillness #36d39a, Chorus #f0a93a, Spark #f5d020 with their matching mind references.`,
    ),
  },
  {
    id: "vista",
    title: "Vista",
    format: "16:9 press + 9:16 crop",
    duration: "still or 5s drift",
    lane: "press",
    hook: "Beauty shot of Flight and the founding regions from the real world.",
    beats: [
      "Slow push on Flight hero or a founding-region game scene.",
      "No UI. No logos in-frame.",
      "Caption for press: A sky above a sealed vault. Minds that climb with you.",
    ],
    scene: { kind: "region", regionId: "garden" },
    prompt: prompt(
      `Press vista: The Void Garden founding region as a wide 16:9 beauty still from the game world (floating islands over void, Spark/creativity mood, gold seams). Optional tiny Trainer+champion silhouettes for scale. No UI, no logos. Caption outside: "A sky above a sealed vault. Minds that climb with you."`,
    ),
  },
  {
    id: "press-oneliner",
    title: "Press one-liner",
    format: "16:9 master + square",
    duration: "still",
    lane: "press",
    hook: "Clean launch / PR hero.",
    beats: [
      "Flight hero (real models) as full-bleed.",
      "Brand wordmark outside the art or as a separate end card.",
      "Line: Fly the sky above a sealed vault. A thinking AI flies beside you.",
    ],
    scene: { kind: "flight", src: "/img/home/flight-hero-poster.jpg", alt: "Press hero" },
    prompt: prompt(
      `Launch PR hero. Full-bleed enrichment of the attached Flight hero PNG (Trainer with jetpack + champion wingmate, real Zingers meshes). Keep identities locked. Cinematic grade, void sky, gold ring glints. Brand wordmark NOT in the painting. Line outside: "Fly the sky above a sealed vault. A thinking AI flies beside you."`,
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
    scene: { kind: "mind", key: "BASTION" },
    prompt: prompt(
      `Quiet raise beat at a lit camp on the edge of sky. Trainer sits near champion BASTION (Calm / Stillness Clan, mint #36d39a). Intimate, low action, attachment. Robot body posture softens as if an Imprint landed (Strategy/temperament shift made visible). No voice-feature marketing. Caption outside: "How you raise it shows."`,
    ),
  },
  {
    id: "keeper-depth",
    title: "Crack a Keeper",
    format: "9:16",
    duration: "12–18s",
    lane: "depth",
    hook: "Secondary lore depth. Not the growth face.",
    beats: [
      "Live Keeper render establishes the figure.",
      "Trainer and champion approach. Argument as tension, not gore.",
      "Crack of light / seal break metaphor.",
      "Return to Flight beat so the clip still points at the sky.",
    ],
    notes: "Ship only as a depth reveal under Flight content weeks.",
    scene: { kind: "keeper", name: "Quill" },
    prompt: prompt(
      `Depth lore still: Keeper Quill as the attached live Keeper/game-model reference, regalia intact. Trainer and a wingmate approach. Argument as luminous tension, seal-crack of light. No gore. End feeling should still point back to Flight / the sky. Not the weekly hero face.`,
    ),
  },
  {
    id: "tribunal-depth",
    title: "Under the climb",
    format: "9:16",
    duration: "10–15s",
    lane: "depth",
    hook: "Arena as a station on the ascent, not the product.",
    beats: [
      "Cold open in Flight.",
      "Drop into a short Tribunal / duel flash (founding-region game scene).",
      "Champion returns to the wing. Resume climb.",
      "Overlay: Battles stud the climb.",
    ],
    scene: { kind: "regionMind", regionId: "wastes", key: "EMBER" },
    prompt: prompt(
      `Depth beat: battles stud the climb. Open in Flight energy, then drop into The Ember Wastes / The Pit with champion EMBER (reference mesh) mid-duel heat, then imply return to the wing and the sky. Region + champion locked to attached references. Overlay outside: "Battles stud the climb."`,
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

export const PROMPT_SKELETON = `Enrich ONLY atmosphere around our locked game-model still (robot champion / Trainer from Zingers). Keep the exact silhouette, proportions, materials, and face from the reference render. Background deep near-black indigo void (#0a0812). Dominant Clan color [force hex], gold accents. Volumetric neon rim-light, fog, drifting motes. No new character design. No painterly face swap. No text, logos, watermark, UI. [aspect].`;
