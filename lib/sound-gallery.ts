// Onboarding + UI stingers — when each fires (pairs with lib/sfx.ts generators).
import { evolveStinger, pickStinger, pitchStinger, trainStinger } from "@/lib/sfx";
import { setMood, startAmbience } from "@/lib/ambience-bus";

export type OnboardingSound = "pitch" | "pick" | "train" | "evolve" | "concord";

export const SOUND_GALLERY: Record<OnboardingSound, { label: string; when: string }> = {
  pitch: { label: "Welcome arpeggio", when: "Act 1 opens — pitch slide or first gesture" },
  pick: { label: "Selection blip", when: "Champion chosen on the wheel" },
  train: { label: "Doctrine lock-in", when: "Train & enter the arena" },
  evolve: { label: "Growth shimmer", when: "First-win evolve card" },
  concord: { label: "Hub calm", when: "Concord landing — returns to Grounds mood" },
};

export function playOnboardingSound(id: OnboardingSound) {
  switch (id) {
    case "pitch":
      startAmbience();
      pitchStinger();
      break;
    case "pick":
      pickStinger();
      break;
    case "train":
      trainStinger();
      break;
    case "evolve":
      evolveStinger();
      break;
    case "concord":
      setMood("concord");
      break;
  }
}

/** Arm ambience + welcome sting on first pointer/key (browser gesture policy). */
export function armOnboardingAudio() {
  const go = () => playOnboardingSound("pitch");
  const opts = { once: true } as const;
  window.addEventListener("pointerdown", go, opts);
  window.addEventListener("keydown", go, opts);
  return () => {
    window.removeEventListener("pointerdown", go);
    window.removeEventListener("keydown", go);
  };
}
