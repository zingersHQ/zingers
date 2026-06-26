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

// Called by <AmbientToggle/> when it creates / disposes its engine. Applies the
// current mood immediately so a fight that started before the engine existed is
// reflected as soon as it spins up.
export function registerAmbience(e: Ambience | null) {
  engine = e;
  if (e) e.setMood(current);
}

export function setMood(mood: Mood) {
  current = mood;
  engine?.setMood(mood);
}

export function currentMood(): Mood {
  return current;
}

/** Start the registered engine (call from a user gesture — e.g. onboarding CTA). */
export function startAmbience() {
  engine?.start();
}
