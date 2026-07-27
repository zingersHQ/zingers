// ─────────────────────────────────────────────────────────────────────────────
// Legacy — retirement + heirlooms (docs/long-game.md Stage 4).
//
// A retired champion leaves the active slot, joins legacy memory, and bequeaths
// one heirloom to the next mind you claim. Client localStorage for v1 (same
// pattern as RivalMemory) — numbers and strings, no new art.
// ─────────────────────────────────────────────────────────────────────────────
import type { Champion } from "@/lib/types";
import type { WingTraitId } from "@/lib/wing-traits";
import { innateTraitId, setHeirloomWingBonus, traitLabel } from "@/lib/wing-traits";
import { ROSTER } from "@/lib/engine/roster";
import { levelFor } from "@/lib/evolve/progression";

const KEY = "zingers_legacy_v1";

export interface Heirloom {
  id: string;
  fromKey: string;
  fromName: string;
  /** Wing trait the heir learns first. */
  wingTrait: WingTraitId;
  gloss: string;
  ts: number;
  /** Pending until the next claim consumes it. */
  pending: boolean;
}

export interface RetiredLegend {
  key: string;
  name: string;
  wins: number;
  losses: number;
  level: number;
  retiredAt: number;
}

export interface LegacyState {
  retired: RetiredLegend[];
  heirlooms: Heirloom[];
}

function blank(): LegacyState {
  return { retired: [], heirlooms: [] };
}

export function loadLegacy(): LegacyState {
  if (typeof window === "undefined") return blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw) as LegacyState;
    return {
      retired: Array.isArray(s.retired) ? s.retired : [],
      heirlooms: Array.isArray(s.heirlooms) ? s.heirlooms : [],
    };
  } catch {
    return blank();
  }
}

function saveLegacy(s: LegacyState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

function heirloomTraitFor(key: string, champ: Champion): WingTraitId {
  const type = ROSTER[key]?.type;
  // Bequeath the innate of their Force — the heir flies with the old mind's sky.
  if (type) return innateTraitId(type);
  if (champ.resilience >= champ.flair) return "thick_feathers";
  return "gold_eye";
}

/**
 * Retire an active champion. Returns the heirloom left behind, or null if
 * already retired / invalid.
 */
export function retireChampion(
  key: string,
  champ: Champion,
  displayName?: string,
): { legend: RetiredLegend; heirloom: Heirloom } | null {
  const state = loadLegacy();
  if (state.retired.some((r) => r.key === key)) return null;

  const name = displayName?.trim() || ROSTER[key]?.name || key;
  const trait = heirloomTraitFor(key, champ);
  const legend: RetiredLegend = {
    key,
    name,
    wins: champ.wins | 0,
    losses: champ.losses | 0,
    level: levelFor(champ.xp).level,
    retiredAt: Date.now(),
  };
  const heirloom: Heirloom = {
    id: `h-${key}-${Date.now()}`,
    fromKey: key,
    fromName: name,
    wingTrait: trait,
    gloss: `${name}'s wing. The next mind starts with ${traitLabel(trait)}.`,
    ts: Date.now(),
    pending: true,
  };

  // Only one pending heirloom — newer retirement replaces the waitlist.
  const heirlooms = [
    heirloom,
    ...state.heirlooms.map((h) => ({ ...h, pending: false })).filter((h) => h.id !== heirloom.id),
  ].slice(0, 12);

  saveLegacy({
    retired: [legend, ...state.retired].slice(0, 24),
    heirlooms,
  });
  return { legend, heirloom };
}

export function pendingHeirloom(): Heirloom | null {
  return loadLegacy().heirlooms.find((h) => h.pending) ?? null;
}

/** Call when a new champion is claimed — consumes the pending heirloom. */
export function consumePendingHeirloom(): Heirloom | null {
  const state = loadLegacy();
  const idx = state.heirlooms.findIndex((h) => h.pending);
  if (idx < 0) return null;
  const taken = state.heirlooms[idx]!;
  const heirlooms = state.heirlooms.map((h, i) => (i === idx ? { ...h, pending: false } : h));
  saveLegacy({ ...state, heirlooms });
  setHeirloomWingBonus(taken.wingTrait);
  return { ...taken, pending: false };
}

export function isRetired(key: string): boolean {
  return loadLegacy().retired.some((r) => r.key === key);
}
