// Procedural score presets — one distinct theme per place in the world.
// Still Web Audio (no shipped files). Each mood is harmony + melody pool +
// motifs arranged in a classical phrase form (AABA / period) so loops breathe
// instead of cycling three sparse bars forever.
//
// Motifs are indices into `melody` (-1 = rest). Forms are motif indices per bar.
// Inspiration is public-domain craft (hymnody, sequences, modes) — not copies
// of copyrighted tunes.

export type Mood =
  | "concord"
  | "colosseum"
  | "ember"
  | "void"
  | "amphitheatre"
  | "circuit"
  | "battle";

/** Arpeggiator texture — one soft chord tone per step (indices into the chord, -1 rest). */
export interface ArpConfig {
  pattern: number[];
  gain: number;
}

/** Pad texture — a sustained low voicing that swells and breathes under each bar. */
export interface PadConfig {
  gain: number;
  /** Lowpass cutoff (Hz) — lower = a duskier, rounder swell. */
  cutoff: number;
}

export interface ScoreConfig {
  /** Chord voicings as MIDI note numbers. */
  chords: number[][];
  /** Melody pool as MIDI note numbers. */
  melody: number[];
  /** Eight-step bars; values are indices into `melody`, or -1 rest. */
  motifs: number[][];
  /**
   * Phrase form — motif index per bar. Classic AABA / periods so themes return
   * after contrast instead of 0→1→2→0. Omit to cycle motifs in order.
   */
  form?: number[];
  tempo: number;
  /** Cheerful distant birds — open wilds, not hub or void. */
  birds: boolean;
  /** Low downbeat thump — tension / heat / speed. */
  pulse: boolean;
  /** Master voice gain for this score (defaults applied in engine). */
  voiceGain?: number;
  /** Optional arpeggiator layer — blooms further as battle intensity rises. */
  arp?: ArpConfig;
  /** Optional pad swell layer under each bar. */
  pad?: PadConfig;
  /** Sparse counter-melody (indices into `melody`, -1 rest) — answers on the offbeats an octave down. */
  counter?: number[];
  /** Looping filtered-noise air bed (wind / shimmer) gain, 0..~0.05. */
  shimmer?: number;
}

// ── Concord — Seal Hymn: open fifths, plagal breath, processional ───────────
// Mode: D Dorian feel. Sparse gold bells over a long amen-shaped period.
const CONCORD_CHORDS = [
  [50, 57, 62, 69], // D5
  [53, 60, 65, 72], // F
  [55, 62, 67, 74], // G
  [48, 55, 60, 67], // C
  [50, 57, 62, 69], // D
  [45, 52, 57, 64], // A
  [47, 54, 59, 66], // Bb
  [43, 50, 55, 62], // G
];
// D E F G A Bb C D
const CONCORD_MELODY = [62, 64, 65, 67, 69, 70, 72, 74];

// ── Colosseum — Tribunal fanfare: bright Ionian, rising thirds ──────────────
const COLOSSEUM_CHORDS = [
  [60, 64, 67, 72], // C
  [55, 59, 62, 67], // G
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [60, 64, 67, 72], // C
  [52, 55, 59, 64], // Em
  [50, 53, 57, 62], // Dm
  [55, 59, 62, 67], // G
];
// G A B C D E F G
const COLOSSEUM_MELODY = [67, 69, 71, 72, 74, 76, 77, 79];

// ── Ember Wastes — Phrygian heat: half-step scrape, low pulse ───────────────
const EMBER_CHORDS = [
  [52, 55, 59, 64], // Em
  [53, 56, 60, 65], // F
  [50, 53, 57, 62], // Dm
  [47, 50, 55, 59], // G
  [52, 55, 59, 64], // Em
  [48, 52, 55, 60], // C
  [45, 48, 52, 57], // Am
  [50, 53, 56, 62], // D / F
];
// E F G A Bb C D E
const EMBER_MELODY = [64, 65, 67, 69, 70, 72, 74, 76];

// ── Void Garden — Lydian drift: #4 sparkle, wide suspended leaps ────────────
const VOID_CHORDS = [
  [53, 57, 60, 67], // Fmaj7-ish / open
  [55, 59, 62, 69], // G
  [57, 60, 64, 71], // Am + B
  [52, 55, 59, 66], // Em
  [53, 57, 60, 67], // F
  [50, 53, 57, 64], // Dm
  [48, 52, 55, 62], // C
  [55, 59, 62, 69], // G
];
// F G A B C D E F  (Lydian #4 = B)
const VOID_MELODY = [65, 67, 69, 71, 72, 74, 76, 77];

// ── Amphitheatre — Mixolydian torch dance ───────────────────────────────────
const AMP_CHORDS = [
  [55, 59, 62, 67], // G
  [53, 57, 60, 65], // F
  [50, 53, 57, 62], // Dm
  [48, 52, 55, 60], // C
  [55, 59, 62, 67], // G
  [57, 60, 64, 67], // Am
  [52, 55, 59, 62], // Em
  [53, 57, 60, 65], // F
];
// G A Bb C D E F G
const AMP_MELODY = [67, 69, 70, 72, 74, 76, 77, 79];

// ── Flight (circuit) — ascending sequences, moto perpetuo climb ─────────────
// Distinct from battle: hopeful minor with rising sequential phrases.
const CIRCUIT_CHORDS = [
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [48, 52, 55, 60], // C
  [55, 59, 62, 67], // G
  [57, 60, 64, 69], // Am
  [50, 53, 57, 62], // Dm
  [52, 55, 59, 64], // Em
  [57, 60, 64, 69], // Am
];
// A B C D E F G A
const CIRCUIT_MELODY = [69, 71, 72, 74, 76, 77, 79, 81];

// ── Battle — coiled stakes: chromatic bite, short aggressive calls ──────────
const BATTLE_CHORDS = [
  [57, 60, 64, 69], // Am
  [56, 59, 63, 68], // Ab / tense
  [53, 57, 60, 65], // F
  [55, 58, 62, 67], // G / Bb
  [52, 55, 59, 64], // Em
  [50, 53, 56, 62], // Dm / F
  [56, 59, 63, 68], // Ab again
  [57, 60, 64, 69], // Am
];
// A C Eb E F Ab A C
const BATTLE_MELODY = [69, 72, 75, 76, 77, 80, 81, 84];

/** AABA-style period: statement, statement, contrast, return — then bridge. */
const FORM_AABA_BRIDGE = [0, 0, 1, 0, 2, 2, 1, 0, 3, 3, 1, 0];
/** Flight: longer arc before the loop feels like a restart. */
const FORM_FLIGHT = [0, 0, 1, 0, 2, 2, 1, 0, 3, 3, 4, 1, 0, 2, 1, 0];
/** Battle: punchier, shorter periods so heat stays urgent. */
const FORM_BATTLE = [0, 1, 0, 2, 0, 1, 3, 2];

export const SCORES: Record<Mood, ScoreConfig> = {
  concord: {
    chords: CONCORD_CHORDS,
    melody: CONCORD_MELODY,
    motifs: [
      // A — open rise, hymn breath
      [0, -1, 2, -1, 4, -1, 3, -1],
      // B — falling amen / plagal answer
      [4, 3, 2, 0, 1, -1, 0, -1],
      // A' — denser processional
      [0, 2, 3, 4, 3, -1, 7, -1],
      // C — lift toward the seal, then settle
      [3, -1, 4, 6, 7, -1, 4, 2],
    ],
    form: FORM_AABA_BRIDGE,
    tempo: 620,
    birds: false,
    pulse: false,
    voiceGain: 0.24,
    pad: { gain: 0.048, cutoff: 820 },
    shimmer: 0.011,
    counter: [-1, -1, 0, -1, -1, 2, -1, -1],
  },
  colosseum: {
    chords: COLOSSEUM_CHORDS,
    melody: COLOSSEUM_MELODY,
    motifs: [
      // A — bright fanfare thirds
      [0, 2, 4, -1, 4, 5, 4, 2],
      // B — answering descent
      [4, 5, 7, 5, 4, 2, 0, -1],
      // A' — leap and land
      [3, 4, 5, 7, 5, 4, 2, 0],
      // C — tribunal close
      [7, 5, 4, 2, 4, 3, 0, -1],
    ],
    form: FORM_AABA_BRIDGE,
    tempo: 500,
    birds: true,
    pulse: false,
    voiceGain: 0.26,
    counter: [0, -1, -1, 2, -1, -1, 1, -1],
    shimmer: 0.008,
  },
  ember: {
    chords: EMBER_CHORDS,
    melody: EMBER_MELODY,
    motifs: [
      // A — Phrygian scrape (E–F)
      [0, 1, 0, 2, 3, -1, 2, 0],
      // B — sink into the ash
      [3, 2, 1, 0, 1, 0, -1, -1],
      // A' — restless climb
      [4, 3, 2, 1, 0, 1, 3, -1],
      // C — forge hammer answer
      [0, -1, 1, 3, 4, 3, 1, 0],
    ],
    form: FORM_AABA_BRIDGE,
    tempo: 360,
    birds: false,
    pulse: true,
    voiceGain: 0.26,
    shimmer: 0.02,
    counter: [-1, 1, -1, -1, 0, -1, 2, -1],
  },
  void: {
    chords: VOID_CHORDS,
    melody: VOID_MELODY,
    motifs: [
      // A — wide suspended leaps
      [0, -1, 4, -1, 7, -1, 4, -1],
      // B — drift down the #4
      [7, 5, 3, 2, 4, -1, 0, -1],
      // A' — starlit answer
      [3, 5, 7, -1, 5, 3, 0, -1],
      // C — settle into mist
      [4, -1, 7, 5, 3, 0, -1, -1],
    ],
    form: FORM_AABA_BRIDGE,
    tempo: 560,
    birds: false,
    pulse: false,
    voiceGain: 0.22,
    pad: { gain: 0.058, cutoff: 1250 },
    shimmer: 0.028,
    counter: [-1, 4, -1, -1, 0, -1, -1, 2],
  },
  amphitheatre: {
    chords: AMP_CHORDS,
    melody: AMP_MELODY,
    motifs: [
      // A — torchlight step
      [0, 2, 3, 2, 4, -1, 3, 2],
      // B — crowd sway
      [4, 3, 2, 0, 1, 2, 3, -1],
      // A' — lift over the stands
      [3, 4, 5, 7, 5, 4, 2, 0],
      // C — dusk turn
      [2, 0, 2, 4, 3, 2, 0, -1],
    ],
    form: FORM_AABA_BRIDGE,
    tempo: 400,
    birds: false,
    pulse: true,
    voiceGain: 0.27,
    arp: { pattern: [0, 2, 1, 3, 0, 2, 1, 2], gain: 0.014 },
    counter: [3, -1, -1, 1, -1, 2, -1, -1],
  },
  circuit: {
    chords: CIRCUIT_CHORDS,
    melody: CIRCUIT_MELODY,
    motifs: [
      // A — ascending sequence (the climb itself)
      [0, 2, 3, 4, 3, 2, 0, 2],
      // B — crest and fall
      [4, 5, 7, 5, 4, 3, 2, 0],
      // A' — higher sequence
      [2, 3, 4, 5, 7, 5, 4, 3],
      // C — summit run
      [7, 5, 4, 2, 3, 4, 5, 7],
      // D — resolve home, breath before the next sector
      [0, 3, 5, 7, 5, 3, 2, 0],
    ],
    form: FORM_FLIGHT,
    tempo: 248,
    birds: false,
    pulse: true,
    voiceGain: 0.3,
    arp: { pattern: [0, 1, 2, 3, 2, 1, 0, 1], gain: 0.017 },
    counter: [-1, 0, -1, 2, -1, 4, -1, 3],
    shimmer: 0.01,
  },
  battle: {
    chords: BATTLE_CHORDS,
    melody: BATTLE_MELODY,
    motifs: [
      // A — coiled strike (not the Flight climb)
      [0, 3, 4, 3, 5, 4, 3, 0],
      // B — chromatic jab
      [4, 5, 6, 5, 4, 3, 1, 0],
      // C — pressure swell
      [3, 0, 3, 5, 6, -1, 4, 3],
      // D — verdict lean
      [6, 5, 4, 3, 1, 0, 3, -1],
    ],
    form: FORM_BATTLE,
    tempo: 290,
    birds: false,
    pulse: true,
    voiceGain: 0.28,
    arp: { pattern: [0, 3, 1, 2, 0, 3, 2, 1], gain: 0.016 },
    pad: { gain: 0.042, cutoff: 1350 },
  },
};

/** Map live world / venue context → which procedural score should play. */
export function resolveAmbienceMood(opts: {
  inBattle: boolean;
  worldId: string;
  activeVenue: "amphitheatre" | "circuit" | null;
}): Mood {
  if (opts.inBattle) return "battle";
  if (opts.activeVenue === "amphitheatre") return "amphitheatre";
  if (opts.activeVenue === "circuit") return "circuit";
  switch (opts.worldId) {
    case "concord":
      return "concord";
    case "grounds":
      return "colosseum";
    case "gauntlet":
      return "ember";
    case "void":
      return "void";
    default:
      return "colosseum";
  }
}

export const MOOD_LABELS: Record<Mood, string> = {
  concord: "The Concord",
  colosseum: "Obsidian Colosseum",
  ember: "Ember Wastes",
  void: "Void Garden",
  amphitheatre: "The Amphitheatre",
  circuit: "Flight",
  battle: "Combat",
};
