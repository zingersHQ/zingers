// A tiny bridge between "where the music plays" (the single Ambience engine
// owned by <AmbientToggle/>) and "where the mood changes" (battle overlays deep
// in the Grounds tree). Rather than thread the engine through props/context, the
// toggle registers its engine here and anyone can call setMood() to morph it.
import type { Ambience } from "@/lib/ambience";
import { resolveAmbienceMood, type Mood } from "@/lib/ambience-scores";

export type { Mood } from "@/lib/ambience-scores";
export { resolveAmbienceMood, MOOD_LABELS } from "@/lib/ambience-scores";

let engine: Ambience | null = null;
let current: Mood = "concord";
// 0..1 user volume scalar; the engine's musical headroom is ~0.28, so we scale
// that target by this. Tracked here so a volume change made before the engine
// spins up (or while muted) is applied the moment it registers/starts.
let volumeScalar = 1;
// 0..1 battle heat, tracked for the same late-registration reason as volume.
let intensity = 0;
const BASE_MUSIC_VOL = 0.28;
/** Host (AmbienceEngine) marks the gesture-armed latch so visibility resume works. */
let armHost: (() => void) | null = null;

// Called by <AmbientToggle/> when it creates / disposes its engine. Applies the
// current mood immediately so a fight that started before the engine existed is
// reflected as soon as it spins up.
export function registerAmbience(e: Ambience | null) {
  engine = e;
  if (e) {
    e.setMood(current);
    e.setVolume(BASE_MUSIC_VOL * volumeScalar);
    e.setIntensity(intensity);
  }
}

/** AmbienceEngine registers this so startAmbience() can latch the gesture arm. */
export function registerAmbienceArm(fn: (() => void) | null) {
  armHost = fn;
}

// User music-volume scalar (0..1), shared with the SFX/voice master so one
// slider rules the whole soundscape.
export function setAmbienceVolume(v: number) {
  volumeScalar = Math.max(0, Math.min(1, v));
  engine?.setVolume(BASE_MUSIC_VOL * volumeScalar);
}

export function setMood(mood: Mood) {
  const prev = current;
  current = mood;
  engine?.setMood(mood);
  // Only release battle heat when *leaving* combat — never wipe Flight / region
  // intensity that was just set (setMood("circuit") used to zero it every time).
  if (prev === "battle" && mood !== "battle") setAmbienceIntensity(0);
}

export function currentMood(): Mood {
  return current;
}

/** Battle heat 0..1 — morphs the playing score (tempo, brightness, layers). */
export function setAmbienceIntensity(v: number) {
  intensity = Math.max(0, Math.min(1, v));
  engine?.setIntensity(intensity);
}

/** Sidechain dip under a loud SFX / voice moment (fast dip, eased recovery). */
export function duckAmbience(amount?: number, holdMs?: number) {
  engine?.duck(amount, holdMs);
}

/** One-shot verdict phrase in the current score's harmony (bout end). */
export function ambienceFlourish(kind: "victory" | "defeat" = "victory") {
  engine?.flourish(kind);
}

/** Start the registered engine (call from a user gesture — e.g. Flight hold / CTA). */
export function startAmbience() {
  // Never kick the score while the tab is in the background.
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  // Prefer the host kick — it latches the gesture arm and honors mute/visibility.
  if (armHost) {
    armHost();
    return;
  }
  engine?.start();
}
