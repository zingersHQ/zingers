// ─────────────────────────────────────────────────────────────────────────────
// Expeditions — Stage 5 of docs/long-game.md.
//
// A weekly shared Flight route: one seed (layouts), one Condition (weather), one
// board. Sectors stay pure functions of (seed, index) — infinite variety without
// new art. Ranked Hundred + Scout stay untouched; Expedition is a third mode.
// ─────────────────────────────────────────────────────────────────────────────
import {
  FLIGHT_CONDITIONS,
  conditionById,
  type RunCondition,
} from "@/lib/conditions";

/** How many sectors the weekly route runs (two Reaches of spice). */
export const EXPEDITION_SECTORS = 20;

/** Local PB key prefix — week rolls clear the old best automatically. */
const PB_PREFIX = "zingers_expedition_pb_v1:";

export interface ExpeditionMeta {
  /** UTC week id, e.g. "2026-W30". */
  weekId: string;
  /** Numeric week since epoch — stable for Condition rotation. */
  weekNumber: number;
  /** Layout seed passed into climb generators. */
  seed: string;
  name: string;
  gloss: string;
  condition: RunCondition;
  sectors: number;
}

const NAMES = [
  "Silver Corridor",
  "Ash Wake",
  "Quiet Ladder",
  "Storm Ledger",
  "Crown Detour",
  "Fog Span",
  "Brittle Ascent",
  "Gale Margin",
  "Still Vault",
  "Gold Thread",
  "Crosswind Cut",
  "Thin Spine",
] as const;

/** Monday 00:00 UTC of the containing ISO-ish week (Mon–Sun). */
export function expeditionWeekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun … 6 Sat
  const monOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + monOffset);
  return d;
}

export function expeditionWeekNumber(now = new Date()): number {
  const start = expeditionWeekStart(now).getTime();
  const epoch = Date.UTC(2024, 0, 1);
  return Math.max(1, Math.floor((start - epoch) / (7 * 86_400_000)) + 1);
}

export function expeditionWeekId(now = new Date()): string {
  const start = expeditionWeekStart(now);
  const y = start.getUTCFullYear();
  // Week-of-year from that Monday.
  const jan1 = Date.UTC(y, 0, 1);
  const week = Math.floor((start.getTime() - jan1) / (7 * 86_400_000)) + 1;
  return `${y}-W${String(week).padStart(2, "0")}`;
}

export function expeditionSeed(weekNumber = expeditionWeekNumber()): string {
  return `exp:${weekNumber}`;
}

/** Weekly sky — offset from the daily rotator so the Expedition rarely mirrors Today. */
export function expeditionCondition(weekNumber = expeditionWeekNumber()): RunCondition {
  const idx = (weekNumber * 3 + 5) % FLIGHT_CONDITIONS.length;
  return FLIGHT_CONDITIONS[idx] ?? conditionById("thin_air");
}

export function expeditionName(weekNumber = expeditionWeekNumber()): string {
  return NAMES[(weekNumber - 1) % NAMES.length]!;
}

export function thisWeekExpedition(now = new Date()): ExpeditionMeta {
  const weekNumber = expeditionWeekNumber(now);
  const weekId = expeditionWeekId(now);
  const condition = expeditionCondition(weekNumber);
  const name = expeditionName(weekNumber);
  return {
    weekId,
    weekNumber,
    seed: expeditionSeed(weekNumber),
    name,
    gloss: `${condition.name} · ${EXPEDITION_SECTORS} sectors · one board until next Monday`,
    condition,
    sectors: EXPEDITION_SECTORS,
  };
}

/** Open once the Trainer has tasted ranked Flight. */
export function isExpeditionOpen(bestSectors: number, campsLit: number): boolean {
  return bestSectors >= 5 || campsLit >= 1;
}

export interface ExpeditionPersonalBest {
  weekId: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
}

export function loadExpeditionPersonalBest(
  body: "thumb" | "flight",
  weekId = expeditionWeekId(),
): ExpeditionPersonalBest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PB_PREFIX + body);
    if (!raw) return null;
    const p = JSON.parse(raw) as ExpeditionPersonalBest;
    if (p.weekId !== weekId) return null;
    if (typeof p.sectors !== "number" || typeof p.totalMs !== "number") return null;
    return p;
  } catch {
    return null;
  }
}

export function saveExpeditionPersonalBest(
  run: ExpeditionPersonalBest,
  body: "thumb" | "flight",
): void {
  try {
    localStorage.setItem(PB_PREFIX + body, JSON.stringify(run));
  } catch {}
}

export function isExpeditionRunBetter(
  next: ExpeditionPersonalBest,
  prev: ExpeditionPersonalBest | null,
): boolean {
  if (!prev || prev.weekId !== next.weekId) return true;
  if (next.sectors !== prev.sectors) return next.sectors > prev.sectors;
  return next.totalMs < prev.totalMs;
}

/** Fractional XP vs ranked (route is shorter; board is the prestige). */
export const EXPEDITION_XP_MULT = 0.75;
export const EXPEDITION_CROWN_MULT = 0.5;
