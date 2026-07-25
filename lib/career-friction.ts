// ─────────────────────────────────────────────────────────────────────────────
// Career friction — Stage 4 of docs/long-game.md.
//
// Form, fatigue, and scars so a stable is worth rotating. Pure derivations from
// career state the game already keeps (Champion + saga events). Effects stack
// into Flight via the same FlightModifiers path as wings/Conditions.
// ─────────────────────────────────────────────────────────────────────────────
import type { CareerEvent, Champion } from "@/lib/types";
import type { FlightModifiers } from "@/lib/wing-traits";
import { levelFor } from "@/lib/evolve/progression";

export type FormBand = "blazing" | "hot" | "steady" | "cold" | "broken";

export interface Scar {
  id: string;
  name: string;
  gloss: string;
}

export interface CareerRead {
  form: FormBand;
  /** 0 fresh · 1 tired · 2 spent */
  fatigue: 0 | 1 | 2;
  scars: Scar[];
  formLabel: string;
  fatigueLabel: string;
}

const FORM_LABEL: Record<FormBand, string> = {
  blazing: "Blazing",
  hot: "Hot",
  steady: "Steady",
  cold: "Cold",
  broken: "Broken",
};

const FATIGUE_LABEL = ["Fresh", "Tired", "Spent"] as const;

/** Recent bout outcomes from the saga (newest first). */
export function recentBouts(events: CareerEvent[] | undefined, limit = 8): { won: boolean }[] {
  if (!events?.length) return [];
  return events
    .filter((e) => e.kind === "bout" && typeof e.won === "boolean")
    .slice(0, limit)
    .map((e) => ({ won: !!e.won }));
}

export function formBand(champ: Champion, recent: { won: boolean }[]): FormBand {
  if (recent.length >= 3) {
    const slice = recent.slice(0, 5);
    const wins = slice.filter((b) => b.won).length;
    const losses = slice.length - wins;
    if (wins >= 4 && losses === 0) return "blazing";
    if (wins >= 3) return "hot";
    if (losses >= 4) return "broken";
    if (losses >= 3) return "cold";
    return "steady";
  }
  // Fallback when saga is thin — career W/L.
  const total = champ.wins + champ.losses;
  if (total < 3) return "steady";
  const rate = champ.wins / total;
  if (rate >= 0.75 && champ.wins >= 5) return "blazing";
  if (rate >= 0.6) return "hot";
  if (rate <= 0.3 && champ.losses >= 5) return "broken";
  if (rate <= 0.4) return "cold";
  return "steady";
}

/** Activity in the last ~18h: bouts + train + imprint + ascent. */
export function fatigueLevel(events: CareerEvent[] | undefined, now = Date.now()): 0 | 1 | 2 {
  if (!events?.length) return 0;
  const window = 18 * 3_600_000;
  const n = events.filter((e) => {
    if (now - e.ts > window) return false;
    return e.kind === "bout" || e.kind === "train" || e.kind === "imprint" || e.kind === "ascent";
  }).length;
  if (n >= 8) return 2;
  if (n >= 4) return 1;
  return 0;
}

export function scarsFrom(champ: Champion, events: CareerEvent[] | undefined): Scar[] {
  const out: Scar[] = [];
  const recent = recentBouts(events, 6);
  const lossStreak = (() => {
    let n = 0;
    for (const b of recent) {
      if (b.won) break;
      n++;
    }
    return n;
  })();

  if (lossStreak >= 3) {
    out.push({
      id: "split_lip",
      name: "Split Lip",
      gloss: "Three losses in a row left a mark. Hazards shove harder.",
    });
  }
  if (champ.losses >= 15 && champ.wins < champ.losses) {
    out.push({
      id: "old_wound",
      name: "Old Wound",
      gloss: "A long career of taking hits. Grace after a stumble is shorter.",
    });
  }
  if (levelFor(champ.xp).level >= 12 && champ.wins >= 20) {
    out.push({
      id: "vault_callus",
      name: "Vault Callus",
      gloss: "Scarred into toughness. One extra beat of stumble grace.",
    });
  }
  // At most two scars surface so the readout stays legible.
  return out.slice(0, 2);
}

export function readCareer(champ: Champion, events: CareerEvent[] | undefined, now = Date.now()): CareerRead {
  const recent = recentBouts(events);
  const form = formBand(champ, recent);
  const fatigue = fatigueLevel(events, now);
  const scars = scarsFrom(champ, events);
  return {
    form,
    fatigue,
    scars,
    formLabel: FORM_LABEL[form],
    fatigueLabel: FATIGUE_LABEL[fatigue],
  };
}

/** Stack career friction onto Flight modifiers (after wings + Conditions). */
export function applyCareerToMods<T extends FlightModifiers>(mods: T, career: CareerRead): T {
  const m = { ...mods };

  switch (career.form) {
    case "blazing":
      m.goldOddsMult *= 1.15;
      m.cruiseSpeedMult *= 1.04;
      break;
    case "hot":
      m.goldOddsMult *= 1.08;
      break;
    case "cold":
      m.cruiseSpeedMult *= 0.94;
      m.goldOddsMult *= 0.92;
      break;
    case "broken":
      m.cruiseSpeedMult *= 0.9;
      m.stumbleVy = Math.min(m.stumbleVy, -7.5);
      m.stumbleImmuneS *= 0.85;
      break;
    default:
      break;
  }

  if (career.fatigue === 1) {
    m.cruiseSink -= 0.35;
    m.stumbleImmuneS *= 0.92;
  } else if (career.fatigue === 2) {
    m.cruiseSink -= 0.7;
    m.cruiseSpeedMult *= 0.92;
    // Spent: strip bonus lives (Second Wind / base-3) — rotate the stable.
    if (m.lives > 2) m.lives = 2;
  }

  for (const scar of career.scars) {
    if (scar.id === "split_lip") m.stumbleVy = Math.min(m.stumbleVy, -7.2);
    if (scar.id === "old_wound") m.stumbleImmuneS *= 0.8;
    if (scar.id === "vault_callus") m.stumbleImmuneS = Math.max(m.stumbleImmuneS, 2.0);
  }

  m.cruiseSink = Math.max(-6, Math.min(-0.6, m.cruiseSink));
  m.cruiseSpeedMult = Math.max(0.7, Math.min(1.4, m.cruiseSpeedMult));
  return m;
}

/** Eligible to retire into the House ladder + leave an heirloom. */
export function canRetire(champ: Champion): boolean {
  const lvl = levelFor(champ.xp).level;
  return lvl >= 8 || champ.wins >= 12 || champ.battles >= 20;
}
