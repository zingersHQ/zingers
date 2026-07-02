// Procedural score presets — one distinct loop per place in the world.
// Still Web Audio (no shipped files); each mood is chords + melody + texture.

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
  motifs: number[][];
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

// ── Concord — ceremonial hub: sparse gold bells over open fifths ─────────────
const CONCORD_CHORDS = [
  [50, 57, 62, 69],
  [45, 52, 57, 64],
  [47, 54, 59, 66],
  [43, 50, 55, 62],
];

const CONCORD_MELODY = [62, 66, 69, 71, 74, 66, 69];

// ── Colosseum — violet tribunal home: the original bright grounds loop ───────
const COLOSSEUM_CHORDS = [
  [60, 64, 67, 72],
  [62, 67, 71, 74],
  [60, 64, 69, 72],
  [60, 65, 69, 72],
];

const COLOSSEUM_MELODY = [67, 69, 72, 74, 76, 79, 81, 84];

// ── Ember Wastes — molten pulse, low register, no birds ────────────────────
const EMBER_CHORDS = [
  [52, 55, 59, 64],
  [50, 53, 57, 62],
  [47, 50, 55, 59],
  [45, 48, 52, 57],
];

const EMBER_MELODY = [59, 62, 64, 67, 69, 62, 59];

// ── Void Garden — airy suspended harmony, slow drift ─────────────────────────
const VOID_CHORDS = [
  [57, 62, 69, 74],
  [55, 60, 67, 72],
  [53, 58, 65, 70],
  [52, 57, 64, 69],
];

const VOID_MELODY = [74, 76, 79, 81, 84, 79, 76];

// ── Amphitheatre — torchlit dusk, restless crowd energy ────────────────────
const AMP_CHORDS = [
  [57, 60, 64, 67],
  [55, 58, 62, 65],
  [53, 57, 60, 64],
  [52, 55, 59, 62],
];

const AMP_MELODY = [67, 69, 72, 74, 72, 69, 67, 65];

// ── Circuit — driving tunnel run ─────────────────────────────────────────────
const CIRCUIT_CHORDS = [
  [48, 55, 60, 64],
  [50, 57, 62, 65],
  [47, 54, 58, 62],
  [45, 52, 57, 60],
];

const CIRCUIT_MELODY = [64, 67, 69, 72, 69, 67, 64, 62];

// ── Battle — stakes overlay (unchanged character) ───────────────────────────
const BATTLE_CHORDS = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
  [52, 55, 59, 64],
];

const BATTLE_MELODY = [69, 72, 74, 76, 79, 81, 84, 88];

export const SCORES: Record<Mood, ScoreConfig> = {
  concord: {
    chords: CONCORD_CHORDS,
    melody: CONCORD_MELODY,
    motifs: [
      [2, -1, -1, 4, -1, -1, -1, -1],
      [0, -1, 2, -1, 4, -1, -1, -1],
      [4, -1, 2, -1, 0, -1, -1, -1],
    ],
    tempo: 640,
    birds: false,
    pulse: false,
    voiceGain: 0.24,
    // ceremonial breath — a slow low swell under the bells, and the faintest air
    pad: { gain: 0.045, cutoff: 850 },
    shimmer: 0.012,
  },
  colosseum: {
    chords: COLOSSEUM_CHORDS,
    melody: COLOSSEUM_MELODY,
    motifs: [
      [4, -1, 5, -1, 4, -1, 2, -1],
      [2, -1, 4, 5, -1, -1, 4, -1],
      [5, -1, 4, -1, 2, -1, 4, -1],
    ],
    tempo: 520,
    birds: true,
    pulse: false,
    // a low answering phrase on the offbeats keeps the bright loop grounded
    counter: [0, -1, -1, 2, -1, -1, 1, -1],
  },
  ember: {
    chords: EMBER_CHORDS,
    melody: EMBER_MELODY,
    motifs: [
      [3, -1, 2, -1, 4, -1, 2, -1],
      [2, 4, -1, 3, -1, 2, -1, -1],
      [4, -1, 3, 2, -1, -1, 4, -1],
    ],
    tempo: 380,
    birds: false,
    pulse: true,
    voiceGain: 0.26,
    // hot wind over the wastes + a smouldering low reply
    shimmer: 0.018,
    counter: [-1, 2, -1, -1, 0, -1, -1, -1],
  },
  void: {
    chords: VOID_CHORDS,
    melody: VOID_MELODY,
    motifs: [
      [3, -1, 5, -1, 4, -1, -1, -1],
      [5, -1, 4, -1, 3, -1, 6, -1],
      [4, -1, -1, 5, -1, 3, -1, -1],
    ],
    tempo: 580,
    birds: false,
    pulse: false,
    voiceGain: 0.22,
    // weightless: a wide suspended pad and a constant starlit hiss
    pad: { gain: 0.055, cutoff: 1200 },
    shimmer: 0.026,
  },
  amphitheatre: {
    chords: AMP_CHORDS,
    melody: AMP_MELODY,
    motifs: [
      [2, 4, -1, 3, 2, -1, 4, -1],
      [4, -1, 2, 3, -1, 4, -1, 2],
      [3, 2, -1, 4, 3, -1, 2, -1],
    ],
    tempo: 420,
    birds: false,
    pulse: true,
    voiceGain: 0.27,
    // restless crowd energy — a churning arpeggio under the torchlight
    arp: { pattern: [0, 2, 1, 3, 0, 2, 1, 2], gain: 0.014 },
    counter: [3, -1, -1, 1, -1, 2, -1, -1],
  },
  circuit: {
    chords: CIRCUIT_CHORDS,
    melody: CIRCUIT_MELODY,
    motifs: [
      [4, 2, -1, 3, 4, -1, 2, 1],
      [2, -1, 4, 3, 1, -1, 2, -1],
      [5, 4, -1, 2, 3, -1, 1, 2],
    ],
    tempo: 260,
    birds: false,
    pulse: true,
    voiceGain: 0.3,
    // tunnel run — a driving straight-eight arpeggio carries the momentum
    arp: { pattern: [0, 1, 2, 3, 2, 1, 0, 1], gain: 0.018 },
  },
  battle: {
    chords: BATTLE_CHORDS,
    melody: BATTLE_MELODY,
    motifs: [
      [4, 2, -1, 3, 4, -1, 2, 1],
      [2, -1, 4, 3, 1, -1, 2, -1],
      [5, 4, -1, 2, 3, -1, 1, 2],
    ],
    tempo: 300,
    birds: false,
    pulse: true,
    voiceGain: 0.28,
    // stakes: a coiled arpeggio + a dark pad floor for intensity to open up
    arp: { pattern: [0, 2, 1, 3, 0, 2, 3, 1], gain: 0.015 },
    pad: { gain: 0.04, cutoff: 1400 },
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
  circuit: "The Circuit",
  battle: "Combat",
};
