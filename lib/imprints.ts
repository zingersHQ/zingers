// Imprints — the daily "raising" verb. Shared lesson catalog; divergence comes
// from which lesson you pick + bout-driven learnFromBout between teaches.
// Temperament meters are a readout (DoctrineDial) — first-duel seeding is the
// only place Trainers drag values. Client-safe (pure data + types only).
import type { CreatureType, Strat } from "@/lib/types";

export interface ImprintLesson {
  id: string;
  label: string; // the button the handler taps
  hint: string; // one-line explanation under the label
  note: string; // first-person memory the mind keeps (template + fallback base)
  dial: Partial<Strat>; // gentle doctrine nudges, applied clamped to 0..100
  /** Soft filters for session menus — never hard-locks a lesson. */
  tags?: {
    types?: CreatureType[];
    /** Prefer when this axis is low / high / mid. */
    when?: Partial<Record<keyof Strat, "low" | "high" | "mid">>;
    /** Min champion level (1-based) before this lesson is preferred. */
    minLevel?: number;
  };
}

const L = (
  id: string,
  label: string,
  hint: string,
  note: string,
  dial: Partial<Strat>,
  tags?: ImprintLesson["tags"],
): ImprintLesson => ({ id, label, hint, note, dial, tags });

/** Full catalog — UI shows a daily slice via `lessonsForSession`. */
export const IMPRINT_LESSONS: ImprintLesson[] = [
  // Core (original ten)
  L("bait", "Stop taking the bait", "Quit chasing every jab", "Don't chase every jab — let them overcommit first.", { risk: -10, aggression: -8 }),
  L("press", "Press when ahead", "Push a Resolve lead", "When I'm ahead on Resolve, push hard — don't coast.", { aggression: 12, risk: 6 }),
  L("patience", "Try patience", "Set up before swinging", "Patience beats volume — set up before I swing.", { aggression: -10, focus: 10 }),
  L("setups", "Build setups first", "Exposed/Tilted, then hit", "Apply Exposed or Tilted before the big hit.", { focus: 14 }),
  L("swing", "Swing for the fences", "Take the big risk", "When the room's close, take the big swing.", { risk: 14, aggression: 8 }),
  L("read", "Read before reacting", "Watch the tell first", "Watch their tell before I commit — react, don't guess.", { focus: 12, aggression: -6 }),
  L("tempo", "Own the tempo", "Dictate the pace", "Set the pace myself — don't let them dictate it.", { aggression: 8, focus: 6 }),
  L("closer", "Close it out clean", "No mercy near the end", "When they're low, finish it — don't let them breathe.", { aggression: 10, risk: 8 }),
  L("composure", "Keep composure", "Don't tilt when hit", "Stay level after a big hit — never fight tilted.", { focus: 10, risk: -6 }),
  L("feint", "Sell the feint", "Bait, then punish", "Fake the obvious, then punish the flinch.", { risk: 6, focus: 8 }),

  // Patience / control
  L("breathe", "Breathe between turns", "Don't rush the next line", "Take a beat after every exchange — rush is how I lose the thread.", { aggression: -8, focus: 8 }),
  L("anchor", "Anchor the claim", "One clear thesis", "Pick one claim and defend it — don't chase every side path.", { focus: 12, risk: -4 }),
  L("slow", "Slow the room down", "Force them to wait", "If they're rushing, I slow it — make them play my pace.", { aggression: -10, focus: 6 }),
  L("hold", "Hold the line", "Don't give ground cheap", "When I'm right, I hold — I don't trade for noise.", { focus: 10, aggression: -4 }),
  L("deny", "Deny the frame", "Refuse their setup", "I don't accept their framing — I rename the fight first.", { focus: 10, risk: 4 }, { types: ["RHETORIC", "LOGIC"] }),

  // Aggression / pressure
  L("crowd", "Crowd the opening", "Hit first, hard", "Open loud — seize the first word before they settle.", { aggression: 12, risk: 6 }),
  L("stack", "Stack the hits", "Don't reset after damage", "When I land one, I stack another — no polite pause.", { aggression: 12, focus: 4 }),
  L("interrupt", "Interrupt mid-thought", "Cut their build", "Break their sentence before it lands — leave them unfinished.", { aggression: 10, risk: 8 }, { types: ["CHAOS", "RHETORIC"] }),
  L("heat", "Turn up the heat", "Raise stakes each turn", "Each exchange hotter than the last — don't let the room cool.", { aggression: 10, risk: 10 }),
  L("corner", "Corner them", "Leave no exit", "Pin them to one bad option, then force the choice.", { aggression: 8, focus: 10 }),

  // Risk / gambits
  L("allin", "Go all-in once", "One decisive gamble", "Once per fight I bet everything on a single line.", { risk: 14, aggression: 6 }),
  L("bluff", "Bluff the confidence", "Sound sure, then pivot", "Sound certain even when I'm fishing — then pivot if they bite.", { risk: 10, focus: 6 }, { types: ["CHAOS", "RHETORIC"] }),
  L("sacrifice", "Sacrifice a point", "Give a little to take more", "Concede something small so the bigger hit lands clean.", { risk: 8, focus: 10 }),
  L("wild", "Take the weird angle", "Surprise over safe", "Pick the angle nobody expects — safe is readable.", { risk: 12, focus: -4 }, { types: ["CHAOS"] }),
  L("safe", "Play it safe today", "Protect the lead", "If I'm ahead, protect it — no hero swings for glory.", { risk: -12, aggression: -6 }),

  // Focus / reads
  L("thread", "Follow one thread", "Ignore the noise", "One thread start to finish — ignore every shiny distraction.", { focus: 14, aggression: -6 }),
  L("mirror", "Mirror their move", "Copy, then counter", "Echo their move once so I understand it — then break it.", { focus: 12, risk: 4 }),
  L("tell", "Hunt the tell", "Find the pattern", "Every mind has a tell. Find it. Exploit it.", { focus: 14 }),
  L("narrow", "Narrow the topic", "Force a smaller fight", "Shrink the battlefield until only my best angle fits.", { focus: 12, aggression: -4 }, { types: ["LOGIC"] }),
  L("detail", "Win on the detail", "Precision over volume", "One precise detail beats a pile of vague claims.", { focus: 12, risk: -6 }, { types: ["LOGIC", "RHETORIC"] }),

  // Comeback / clutch
  L("climb", "Climb from behind", "Don't freeze when down", "When I'm behind, I climb — freeze is how I stay there.", { aggression: 10, risk: 10 }, { minLevel: 3 }),
  L("steal", "Steal the last word", "Close on your terms", "The last exchange is mine — I plan for it from the start.", { aggression: 8, focus: 8 }, { minLevel: 4 }),
  L("reset", "Reset after a miss", "Don't spiral", "Miss once, reset clean — never chase the miss into a worse one.", { focus: 10, risk: -8 }),
  L("grit", "Grit through the hit", "Stay in the pocket", "Take the hit, stay in the pocket, answer immediately.", { aggression: 8, focus: 6 }),

  // Type-flavored
  L("logic-chain", "Build the chain", "Premise → conclusion", "Lay premises in order — the conclusion should feel inevitable.", { focus: 14, aggression: -4 }, { types: ["LOGIC"] }),
  L("logic-cut", "Cut the contradiction", "Name the break", "Find where their story contradicts itself and cut there.", { focus: 12, aggression: 6 }, { types: ["LOGIC"] }),
  L("rhetoric-crowd", "Win the room", "Play to the jury", "Argue to the jury, not just the opponent — the room decides.", { aggression: 8, risk: 6 }, { types: ["RHETORIC"] }),
  L("rhetoric-story", "Tell the story", "Narrative over facts alone", "Facts need a story — make mine the one they remember.", { focus: 8, risk: 6 }, { types: ["RHETORIC"] }),
  L("chaos-scatter", "Scatter their plan", "Break their rhythm", "Throw the rhythm off — a confused mind can't finish a thought.", { risk: 12, aggression: 8 }, { types: ["CHAOS"] }),
  L("chaos-laugh", "Laugh it off", "Deflate with humor", "Deflate their solemn hit with a laugh — then strike while they flinch.", { risk: 10, focus: 4 }, { types: ["CHAOS"] }),
  L("compose-read", "Read the feeling", "Name what they feel", "Name the feeling under their argument — that's the real lever.", { focus: 12, aggression: -6 }, { types: ["COMPOSURE"] }),
  L("compose-bond", "Bond then break", "Warmth, then the point", "Warm them first so the hard point lands without bounce.", { focus: 10, aggression: -4 }, { types: ["COMPOSURE"] }),
  L("create-twist", "Twist the metaphor", "Reframe with invention", "Invent a metaphor they haven't heard — then win inside it.", { risk: 8, focus: 8 }, { types: ["CREATIVITY"] }),
  L("create-side", "Come in sideways", "Indirect angle", "Never take the front door — invent a side path they didn't guard.", { risk: 10, aggression: 4 }, { types: ["CREATIVITY"] }),

  // Mid / late game preference
  L("economy", "Spend Resolve wisely", "Don't waste swings", "Every swing costs Resolve — spend only when it matters.", { risk: -8, focus: 10 }, { minLevel: 5 }),
  L("adapt", "Adapt mid-fight", "Drop the plan that failed", "If plan A dies, drop it — clinging is how I lose twice.", { focus: 8, risk: 6 }, { minLevel: 5 }),
  L("signature", "Lean on your strength", "Play your best Force", "Double down on what I'm built for — don't fight their fight.", { focus: 8, aggression: 6 }, { minLevel: 6 }),
  L("countermeta", "Counter their meta", "Punish the habit", "If they always do X, punish X — habits are openings.", { focus: 12, aggression: 6 }, { minLevel: 6 }),
  L("finish-fast", "Finish faster", "Don't drag a won fight", "When the door is open, walk through — don't lecture the win.", { aggression: 12, risk: 8 }, { minLevel: 7 }),
  L("long-game", "Play the long game", "Win the third exchange", "Sacrifice early noise to own the third exchange.", { focus: 10, risk: -6 }, { minLevel: 7 }),

  // Soft counters by temperament state
  L("cool-down", "Cool the aggression", "You're swinging too hard", "Ease off the gas — volume without aim is just noise.", { aggression: -12, focus: 8 }, { when: { aggression: "high" } }),
  L("wake-up", "Wake the aggression", "You're too soft", "Hit harder — politeness isn't winning fights.", { aggression: 12, risk: 4 }, { when: { aggression: "low" } }),
  L("widen", "Widen the focus", "You're tunnel-visioned", "Look wider — tunnel vision misses the real opening.", { focus: -8, risk: 6 }, { when: { focus: "high" } }),
  L("sharpen", "Sharpen the focus", "You're scattered", "Pick a target — scattered minds miss everything.", { focus: 12, aggression: -4 }, { when: { focus: "low" } }),
  L("brave", "Take more risk", "You're playing scared", "Risk something — safe lines are the ones they expect.", { risk: 12, aggression: 4 }, { when: { risk: "low" } }),
  L("steady", "Steady the risk", "You're gambling too much", "Pull back the gamble — one clean hit beats three wild ones.", { risk: -12, focus: 6 }, { when: { risk: "high" } }),
];

export function lessonById(id: string): ImprintLesson | undefined {
  return IMPRINT_LESSONS.find((l) => l.id === id);
}

/** How many lessons a Train sheet / mobile sheet shows at once. */
export const SESSION_LESSON_COUNT = 8;

function band(v: number): "low" | "mid" | "high" {
  if (v <= 35) return "low";
  if (v >= 65) return "high";
  return "mid";
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Daily lesson menu for a champion — subset of the full catalog.
 * Biased by Force, level, and temperament gaps; reshuffles each UTC day.
 * Each lesson can still only be taught once per champion per day.
 */
export function lessonsForSession(opts: {
  ckey: string;
  type: CreatureType;
  level: number;
  strat: Strat;
  day?: number;
  count?: number;
}): ImprintLesson[] {
  const day = opts.day ?? imprintDayIndex();
  const count = opts.count ?? SESSION_LESSON_COUNT;
  const bands = {
    aggression: band(opts.strat.aggression),
    focus: band(opts.strat.focus),
    risk: band(opts.strat.risk),
  };

  const scored = IMPRINT_LESSONS.map((lesson, i) => {
    let score = 1;
    const t = lesson.tags;
    if (t?.types?.includes(opts.type)) score += 4;
    if (t?.minLevel != null) {
      if (opts.level < t.minLevel) score -= 3;
      else score += 1;
    }
    if (t?.when) {
      for (const k of ["aggression", "focus", "risk"] as const) {
        const want = t.when[k];
        if (want && bands[k] === want) score += 5;
        else if (want) score -= 1;
      }
    }
    // Stable daily shuffle salt
    const salt = hashSeed(`${opts.ckey}:${day}:${lesson.id}`) % 1000;
    score += salt / 1000;
    return { lesson, score, i };
  });

  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, count).map((s) => s.lesson);
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
