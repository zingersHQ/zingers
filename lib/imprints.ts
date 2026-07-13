// Imprints — the daily "raising" verb. A handler teaches one lesson; the mind
// acknowledges it in character, writes it to memory, and nudges its doctrine.
// These presets are the source of truth shared by the mobile/desktop UI AND the
// server route's deterministic fallback, so a lesson means the same thing with
// or without a live model. Client-safe (pure data + types only).
import type { Strat } from "@/lib/types";

export interface ImprintLesson {
  id: string;
  label: string; // the button the handler taps
  hint: string; // one-line explanation under the label
  note: string; // first-person memory the mind keeps (template + fallback base)
  dial: Partial<Strat>; // gentle doctrine nudges, applied clamped to 0..100
}

export const IMPRINT_LESSONS: ImprintLesson[] = [
  { id: "bait", label: "Stop taking the bait", hint: "Quit chasing every jab", note: "Don't chase every jab — let them overcommit first.", dial: { risk: -10, aggression: -8 } },
  { id: "press", label: "Press when ahead", hint: "Push a Resolve lead", note: "When I'm ahead on Resolve, push hard — don't coast.", dial: { aggression: 12, risk: 6 } },
  { id: "patience", label: "Try patience", hint: "Set up before swinging", note: "Patience beats volume — set up before I swing.", dial: { aggression: -10, focus: 10 } },
  { id: "setups", label: "Build setups first", hint: "Exposed/Tilted, then hit", note: "Apply Exposed or Tilted before the big hit.", dial: { focus: 14 } },
  { id: "swing", label: "Swing for the fences", hint: "Take the big risk", note: "When the room's close, take the big swing.", dial: { risk: 14, aggression: 8 } },
];

export function lessonById(id: string): ImprintLesson | undefined {
  return IMPRINT_LESSONS.find((l) => l.id === id);
}

// Clamp a doctrine nudge to a sane per-call range so neither a model nor a
// forged payload can yank a champion's strategy across the board in one lesson.
export function clampDial(dial: Partial<Strat> | undefined): Partial<Strat> {
  const out: Partial<Strat> = {};
  if (!dial) return out;
  for (const k of ["risk", "focus", "aggression"] as const) {
    const v = Number(dial[k]);
    if (Number.isFinite(v) && v !== 0) out[k] = Math.max(-20, Math.min(20, Math.round(v)));
  }
  return out;
}
