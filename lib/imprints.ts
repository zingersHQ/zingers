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
  { id: "read", label: "Read before reacting", hint: "Watch the tell first", note: "Watch their tell before I commit — react, don't guess.", dial: { focus: 12, aggression: -6 } },
  { id: "tempo", label: "Own the tempo", hint: "Dictate the pace", note: "Set the pace myself — don't let them dictate it.", dial: { aggression: 8, focus: 6 } },
  { id: "closer", label: "Close it out clean", hint: "No mercy near the end", note: "When they're low, finish it — don't let them breathe.", dial: { aggression: 10, risk: 8 } },
  { id: "composure", label: "Keep composure", hint: "Don't tilt when hit", note: "Stay level after a big hit — never fight tilted.", dial: { focus: 10, risk: -6 } },
  { id: "feint", label: "Sell the feint", hint: "Bait, then punish", note: "Fake the obvious, then punish the flinch.", dial: { risk: 6, focus: 8 } },
];

export function lessonById(id: string): ImprintLesson | undefined {
  return IMPRINT_LESSONS.find((l) => l.id === id);
}

// UTC-day index — the Imprint cooldown resets with the rest of the daily loop
// (mirrors the node ledger and the route's per-owner day counter). A given
// lesson can be internalised once per champion per UTC day.
export const imprintDayIndex = (): number => Math.floor(Date.now() / 86_400_000);

// Human-readable summary of a doctrine nudge, e.g. "Aggression +12 · Risk +6".
// Used by the UI to show the handler exactly what a lesson moved.
const DIAL_LABEL: Record<keyof Strat, string> = { risk: "Risk", focus: "Focus", aggression: "Aggression" };
export function describeDial(dial: Partial<Strat> | undefined): string {
  const d = clampDial(dial);
  return (["aggression", "focus", "risk"] as const)
    .filter((k) => d[k])
    .map((k) => `${DIAL_LABEL[k]} ${d[k]! > 0 ? "+" : ""}${d[k]}`)
    .join(" · ");
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
