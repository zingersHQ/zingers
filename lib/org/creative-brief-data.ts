/** Studio pack copy + asset index for the unlinked /creative brief.
 *  Player-facing vocabulary: Trainer, Strategy, Clan, fight/battle, Flight, standings.
 *  No bout / ELO / ladder. No spaced em dash. */

export type RefPlate = {
  src: string;
  alt: string;
  caption: string;
  /** Optional download/filename hint */
  label?: string;
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
  /** primary | depth — depth = fight/Keeper ok as secondary, not the face */
  lane: "primary" | "depth" | "press";
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
  "Never invent a champion silhouette. Identity comes from our reference plates",
  "No text, logos, watermarks, or UI chrome inside generated frames",
  "No photoreal human faces. These are stylized minds",
];

export const STYLE_KEY: RefPlate = {
  src: "/img/bible/bible-the-grounds-over-the-vault.png",
  alt: "The Grounds over the Long Vault. Style key for the universe.",
  caption: "Style key. Lock every AI batch to this plate so the universe does not drift.",
  label: "Style key",
};

export const FLIGHT_PLATES: RefPlate[] = [
  {
    src: "/img/home/flight-hero-poster.jpg",
    alt: "Trainer and champion in Flight above the vault.",
    caption: "Flight hero. Trainer with jetpack; champion flies beside without one. You fly. It fights.",
    label: "Flight hero",
  },
  {
    src: "/img/home/flight-hero-poster-sm.jpg",
    alt: "Compact Flight hero still for vertical crops.",
    caption: "Same Flight still, smaller. Prefer for 9:16 crops and posters.",
    label: "Flight hero (sm)",
  },
];

export const MIND_PLATES: RefPlate[] = [
  { src: "/img/bible/minds/mind-axiom.png", alt: "AXIOM", caption: "AXIOM. Logic. Cold proof.", label: "AXIOM" },
  { src: "/img/bible/minds/mind-vox.png", alt: "VOX", caption: "VOX. Chorus. Orator to an imaginary jury.", label: "VOX" },
  { src: "/img/bible/minds/mind-glitch.png", alt: "GLITCH", caption: "GLITCH. Static. Non-sequitur gremlin.", label: "GLITCH" },
  { src: "/img/bible/minds/mind-muse.png", alt: "MUSE", caption: "MUSE. Spark. Wins by changing the question.", label: "MUSE" },
  { src: "/img/bible/minds/mind-bastion.png", alt: "BASTION", caption: "BASTION. Calm. Unflappable stoic.", label: "BASTION" },
  { src: "/img/bible/minds/mind-ember.png", alt: "EMBER", caption: "EMBER. Static. Hot-headed firebrand.", label: "EMBER" },
  { src: "/img/bible/minds/mind-paradox.png", alt: "PARADOX", caption: "PARADOX. Logic. Hunts contradictions.", label: "PARADOX" },
  { src: "/img/bible/minds/mind-wit.png", alt: "WIT", caption: "WIT. Chorus. Surgical comebacks.", label: "WIT" },
];

/** Legacy stills. Useful as secondary pose refs; bible plates are identity. */
export const LEGACY_STILLS: RefPlate[] = [
  { src: "/img/AXIOM.jpg", alt: "AXIOM still", caption: "AXIOM mesh still.", label: "AXIOM still" },
  { src: "/img/VOX.jpg", alt: "VOX still", caption: "VOX mesh still.", label: "VOX still" },
  { src: "/img/GLITCH.jpg", alt: "GLITCH still", caption: "GLITCH mesh still.", label: "GLITCH still" },
  { src: "/img/MUSE.jpg", alt: "MUSE still", caption: "MUSE mesh still.", label: "MUSE still" },
  { src: "/img/BASTION.jpg", alt: "BASTION still", caption: "BASTION mesh still.", label: "BASTION still" },
  { src: "/img/EMBER.jpg", alt: "EMBER still", caption: "EMBER mesh still.", label: "EMBER still" },
];

export const FORCE_PLATES: RefPlate[] = [
  { src: "/img/bible/forces/force-lattice.png", alt: "The Lattice", caption: "The Lattice (Logic) #4aa3ff", label: "Lattice" },
  { src: "/img/bible/forces/force-static.png", alt: "The Static", caption: "The Static (Chaos) #ff4ad1", label: "Static" },
  { src: "/img/bible/forces/force-stillness.png", alt: "The Stillness", caption: "The Stillness (Calm) #36d39a", label: "Stillness" },
  { src: "/img/bible/forces/force-chorus.png", alt: "The Chorus", caption: "The Chorus (Rhetoric) #f0a93a", label: "Chorus" },
  { src: "/img/bible/forces/force-spark.png", alt: "The Spark", caption: "The Spark (Creativity) #f5d020", label: "Spark" },
];

export const REGION_PLATES: RefPlate[] = [
  {
    src: "/img/bible/regions/region-colosseum.png",
    alt: "The Obsidian Colosseum",
    caption: "The Obsidian Colosseum. Tribunal arena.",
    label: "Colosseum",
  },
  {
    src: "/img/bible/regions/region-wastes.png",
    alt: "The Ember Wastes",
    caption: "The Ember Wastes. Hot ground. Aggression thrives.",
    label: "Wastes",
  },
  {
    src: "/img/bible/regions/region-garden.png",
    alt: "The Void Garden",
    caption: "The Void Garden. Reframes bloom here.",
    label: "Garden",
  },
];

export const KEEPER_PLATES: RefPlate[] = [
  { src: "/img/bible/keepers/keeper-tibble.png", alt: "Keeper Tibble", caption: "Keeper Tibble.", label: "Tibble" },
  { src: "/img/bible/keepers/keeper-quill.png", alt: "Keeper Quill", caption: "Keeper Quill.", label: "Quill" },
  { src: "/img/bible/keepers/keeper-warden.png", alt: "Keeper Warden", caption: "Keeper Warden.", label: "Warden" },
  { src: "/img/bible/keepers/keeper-vesper.png", alt: "Keeper Vesper", caption: "Keeper Vesper.", label: "Vesper" },
  { src: "/img/bible/keepers/keeper-sable.png", alt: "Keeper Sable", caption: "Keeper Sable.", label: "Sable" },
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
    notes: "Use Flight hero + mind plate as identity. AI may dress fog and rim-light only.",
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
      "Soft VO or caption in champion voice: Stay with me. Nine more stretches of sky and we light the next camp.",
      "End card: zingers.gg",
    ],
    overlay: "Raise a mind. Make it legend.",
    notes: "Guiding voice is warm and direct (we/us). Never frame as a quest checklist.",
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
      "Champion silhouette resolves beside the Trainer.",
      "Hold on the pair. Small motion: halo / Flight sigil hint.",
      "Text: Claim a mind. Climb together.",
    ],
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
      "After: same champion, brighter Flight sigil / evolved silhouette.",
      "Caption: The sky writes on you.",
    ],
    notes: "Before/after of the pair in the sky. Not two fighters in a pit.",
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
  },
  {
    id: "force-mood",
    title: "Pick a Clan",
    format: "1:1 carousel or 5× 6s cuts",
    duration: "6s each",
    lane: "primary",
    hook: "Five Forces as mood, not a type chart lecture.",
    beats: [
      "One force plate each: Lattice, Static, Stillness, Chorus, Spark.",
      "Single motto per cut: Close the proof. / Break the frame. / Outlast the storm. / Move the room. / Change the question.",
      "End card: Swear a Clan. Claim a champion.",
    ],
    notes: "One dominant force color per image. Gold accents. Avoid rainbow.",
  },
  {
    id: "vista",
    title: "Vista",
    format: "16:9 press + 9:16 crop",
    duration: "still or 5s drift",
    lane: "press",
    hook: "Beauty shot of the Grounds over the Long Vault.",
    beats: [
      "Slow push on the style-key world: floating regions, void below, gold seams.",
      "No UI. No logos in-frame.",
      "Caption for press: A sky above a sealed vault. Minds that climb with you.",
    ],
  },
  {
    id: "press-oneliner",
    title: "Press one-liner",
    format: "16:9 master + square",
    duration: "still",
    lane: "press",
    hook: "Clean launch / PR hero.",
    beats: [
      "Flight hero or style key as full-bleed.",
      "Brand wordmark outside the art or as separate end card (never baked into the painting).",
      "Line: Fly the sky above a sealed vault. A thinking AI flies beside you.",
    ],
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
  },
  {
    id: "keeper-depth",
    title: "Crack a Keeper",
    format: "9:16",
    duration: "12–18s",
    lane: "depth",
    hook: "Secondary lore depth. Not the growth face.",
    beats: [
      "Keeper plate establishes the figure.",
      "Trainer and champion approach. Argument as tension, not gore.",
      "Crack of light / seal break metaphor.",
      "Return to Flight beat so the clip still points at the sky.",
    ],
    notes: "Ship only as a depth reveal under Flight content weeks. Never as the default weekly hero.",
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
      "Drop into a short Tribunal / duel flash (region plate).",
      "Champion returns to the wing. Resume climb.",
      "Overlay: Battles stud the climb.",
    ],
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

export const PROMPT_SKELETON = `[subject + pose/scene], embodiment of [force in-world name]. Painterly cinematic sci-fi-mythic concept key art. Background deep near-black indigo void (#0a0812). Dominant color [force hex], gold accents. Volumetric neon rim-light, atmospheric fog, drifting motes and faint glyph-text (the Hum). High detail, dramatic, moody. No text, no logos, no watermark, no UI. [aspect].`;
