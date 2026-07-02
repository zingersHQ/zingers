// ─────────────────────────────────────────────────────────────────────────────
// Creature animation vocabulary — shared timings + modes for portraits, intro
// beats, battles, and the catalogue animation lab.
// ─────────────────────────────────────────────────────────────────────────────

/** Clips shipped in public/models/RobotExpressive.glb (14 total). */
export const RIG_CLIPS = [
  "Dance",
  "Death",
  "Idle",
  "Jump",
  "No",
  "Punch",
  "Running",
  "Sitting",
  "Standing",
  "ThumbsUp",
  "Walking",
  "WalkJump",
  "Wave",
  "Yes",
] as const;

/** Base loop the figure returns to between gestures. Standing is calmer than Idle
 *  (no head-nod) — use it anywhere the character should feel at peace. */
export type RestPose = "idle" | "standing" | "sitting";

/** One-shot clips wired for showcases, reactions, and combat finales. */
export type GestureClip = "wave" | "jump" | "punch" | "dance" | "thumbsUp" | "yes" | "no" | "death";

/** Reviewable animation states — each maps to a distinct on-screen feel. */
export type CreatureAnimMode =
  | "standing" // planted Standing clip — peaceful, almost still
  | "breathing" // Standing + slow procedural chest rise
  | "bounce" // Standing + breathing + soft vertical bob
  | "sitting" // seated rest
  | "wave"
  | "punch"
  | "jump"
  | "dance"
  | "thumbsUp"
  | "yes"
  | "no"
  | "death"
  | "battle" // alternating strike / recoil with standing beats
  | "train"; // intro Shape beat — patient stand → jump → land → jump → drill → reward

/** One step in a scripted showcase loop. */
export type ChoreoStep = { stand: number } | { gesture: GestureClip; hold: number };

/** Per-fighter beat in a duel / battle loop. */
export type BattleFighter = "hero" | "rival";
export type BattleAction = { kind: "punch" } | { kind: "gesture"; clip: GestureClip };
export type BattleStep = { stand: number } | { fighter: BattleFighter; action: BattleAction; hold: number };

export const ANIM_MODES: { mode: CreatureAnimMode; label: string; blurb: string }[] = [
  { mode: "standing", label: "Standing", blurb: "The rig's Standing clip — planted, peaceful, no head-nod." },
  { mode: "breathing", label: "Breathing", blurb: "Standing + slow organic chest rise." },
  { mode: "bounce", label: "Bounce", blurb: "Standing + breathing + a soft vertical bob." },
  { mode: "sitting", label: "Sitting", blurb: "Seated rest — train pad, hub, catalogue." },
  { mode: "wave", label: "Wave", blurb: "Friendly greeting, long pauses between." },
  { mode: "punch", label: "Punch", blurb: "Training strike with recovery time." },
  { mode: "jump", label: "Jump", blurb: "Victory leap — held airborne, then settles." },
  { mode: "dance", label: "Dance", blurb: "Celebration loop — tier-up, legend beat." },
  { mode: "thumbsUp", label: "Thumbs up", blurb: "Quest clear, positive feedback." },
  { mode: "yes", label: "Yes", blurb: "Affirmative reaction — dialogue beat." },
  { mode: "no", label: "No", blurb: "Dismissive shake — rival taunt." },
  { mode: "death", label: "Death", blurb: "Knockout collapse — arena finisher." },
  { mode: "battle", label: "Battle", blurb: "Rap-battle energy: constant bounce, feints, vibes, and quick exchanges." },
  { mode: "train", label: "Train", blurb: "Intro drill loop: long stand → jump → land → jump → strike → reward." },
];

/** Global multipliers applied on top of per-archetype idleSpeed. */
export const ANIM = {
  /** Scales locomotion / fidget clips — lower = calmer. */
  idleClipScale: 0.68,
  /** Standing / Sitting rest loops — very slow for a peaceful gallery read. */
  restClipScale: 0.32,
  /** Extra neck damp when on a peaceful rest clip (0 = full clip head swing). */
  peacefulNeckDamp: 0.85,
  /** Procedural chest breathing (radians / metres). */
  breathe: {
    hz: 0.38,
    hz2: 0.23,
    swayHz: 0.29,
    leanAmp: 0.024,
    rollAmp: 0.012,
    bobAmp: 0.001,
    torsoTwist: 0.015,
    shoulderRoll: 0.022,
  },
  /** Portrait / gallery wrapper motion (IdlePose in champion-portrait-scene). */
  portrait: {
    gazeSpeed: 0.055,
    glanceSpeed: 0.025,
    pitchAmp: 0.022,
    bobHz: 0.58,
    bobAmp: 0.009,
    /** faster bounce cadence while fighters are in the pocket */
    battleBobHz: 0.92,
    battleBobAmp: 0.016,
    battleSwayAmp: 0.042,
    standingBobAmp: 0.0008,
    standingGazeAmp: 0.04,
  },
  /** Intro deck + AgentShowcase choreography. */
  showcase: {
    gestureFirstMs: 1800,
    gestureEveryMs: { wave: 6400, punch: 5400, jump: 6200, dance: 7800, thumbsUp: 5600, yes: 4800, no: 4800 },
    idleSpeed: 0.58,
    /** Intro Fight slide + catalogue battle preview — batalla / boxing energy. */
    battle: [
      { stand: 900 },
      { fighter: "hero", action: { kind: "gesture", clip: "jump" }, hold: 650 },
      { fighter: "rival", action: { kind: "gesture", clip: "jump" }, hold: 650 },
      { fighter: "rival", action: { kind: "gesture", clip: "no" }, hold: 550 },
      { fighter: "hero", action: { kind: "gesture", clip: "yes" }, hold: 550 },
      { stand: 450 },
      { fighter: "rival", action: { kind: "gesture", clip: "dance" }, hold: 1100 },
      { fighter: "hero", action: { kind: "gesture", clip: "jump" }, hold: 600 },
      { stand: 350 },
      { fighter: "hero", action: { kind: "punch" }, hold: 650 },
      { stand: 400 },
      { fighter: "rival", action: { kind: "punch" }, hold: 650 },
      { stand: 500 },
      { fighter: "hero", action: { kind: "gesture", clip: "jump" }, hold: 550 },
      { fighter: "rival", action: { kind: "gesture", clip: "jump" }, hold: 550 },
      { fighter: "hero", action: { kind: "punch" }, hold: 600 },
      { fighter: "rival", action: { kind: "punch" }, hold: 600 },
      { fighter: "hero", action: { kind: "punch" }, hold: 650 },
      { stand: 550 },
      { fighter: "rival", action: { kind: "gesture", clip: "wave" }, hold: 600 },
      { fighter: "hero", action: { kind: "gesture", clip: "no" }, hold: 550 },
      { stand: 800 },
    ] satisfies BattleStep[],
    /** Shape slide — "Teach it how to think". Patient stands, playful jumps, one drill strike. */
    train: [
      { stand: 3600 },
      { gesture: "jump", hold: 1300 },
      { stand: 1000 },
      { gesture: "jump", hold: 1300 },
      { stand: 1100 },
      { gesture: "punch", hold: 900 },
      { stand: 2800 },
      { gesture: "thumbsUp", hold: 800 },
      { stand: 3200 },
    ] satisfies ChoreoStep[],
  },
} as const;

/** Idle clip tempo for a given animation mode (multiplier on archetype idleSpeed). */
export function idleSpeedForMode(mode: CreatureAnimMode, seed = 0): number {
  const jitter = (seed % 0.12) - 0.06;
  switch (mode) {
    case "standing":
      return 0.26 + jitter;
    case "breathing":
    case "bounce":
    case "battle":
      return 0.46 + jitter;
    case "train":
      return 0.34 + jitter;
    case "sitting":
      return 0.3 + jitter;
    default:
      return ANIM.showcase.idleSpeed + jitter;
  }
}

/** Which skeletal rest loop to drive for a mode. */
export function restPoseForMode(mode: CreatureAnimMode): RestPose {
  if (mode === "sitting") return "sitting";
  if (mode === "standing" || mode === "breathing" || mode === "bounce" || mode === "battle" || mode === "train") return "standing";
  return "idle";
}

/** Gesture replay interval for showcase loops (ms). */
export function gestureIntervalMs(mode: CreatureAnimMode): number | undefined {
  const every = ANIM.showcase.gestureEveryMs;
  if (mode === "wave") return every.wave;
  if (mode === "punch") return every.punch;
  if (mode === "jump") return every.jump;
  if (mode === "dance") return every.dance;
  if (mode === "thumbsUp") return every.thumbsUp;
  if (mode === "yes") return every.yes;
  if (mode === "no") return every.no;
  return undefined;
}

/** Map catalogue / lab modes to AgentShowcase gesture prop. */
export function showcaseGesture(mode: CreatureAnimMode): "idle" | GestureClip {
  if (mode === "wave" || mode === "punch" || mode === "jump" || mode === "dance" || mode === "thumbsUp" || mode === "yes" || mode === "no" || mode === "death") return mode;
  return "idle";
}

export function breatheIntensityForMode(mode: CreatureAnimMode): number {
  if (mode === "standing") return 0.35;
  if (mode === "train") return 0.48;
  if (mode === "battle") return 1.05;
  if (mode === "bounce") return 0.85;
  if (mode === "sitting") return 0.25;
  return 0.65;
}

export function bodyBobForMode(mode: CreatureAnimMode): number {
  if (mode === "battle") return ANIM.portrait.battleBobAmp;
  return mode === "bounce" ? ANIM.portrait.bobAmp * 2.2 : 0;
}

/** Jetpack flight attitude: pitch + roll from planar velocity in body-local space. */
export function flightAttitudePlanar(
  vx: number,
  vz: number,
  headingY: number,
  blend: number,
  opts?: { pitchGain?: number; rollGain?: number; maxPitch?: number; maxRoll?: number },
): { pitch: number; roll: number } {
  const b = Math.max(0, Math.min(1, blend));
  if (b < 0.001) return { pitch: 0, roll: 0 };
  const sinH = Math.sin(headingY);
  const cosH = Math.cos(headingY);
  const vf = vx * sinH + vz * cosH;
  const vr = vx * cosH - vz * sinH;
  const pitchGain = opts?.pitchGain ?? 0.042;
  const rollGain = opts?.rollGain ?? 0.24;
  const maxPitch = opts?.maxPitch ?? 0.48;
  const maxRoll = opts?.maxRoll ?? 0.36;
  const pitch = Math.max(-maxPitch * 0.35, Math.min(maxPitch, vf * pitchGain)) * b;
  const roll = Math.max(-maxRoll, Math.min(maxRoll, -vr * rollGain)) * b;
  return { pitch, roll };
}
