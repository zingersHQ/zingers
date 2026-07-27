// Objective benchmark layer (ported from evolve.js). The ENGINE decides the
// winner, so the ELO it produces is a real benchmark, not an opinion.
import type { Champion, Progress } from "@/lib/types";
import { blank } from "./progression";

export const BASE_RATING = 1000;

function ensure(progress: Progress, key: string): Champion {
  if (!progress[key]) progress[key] = blank();
  const p = progress[key];
  if (p.rating == null) p.rating = BASE_RATING;
  return p;
}
export function ratingOf(p?: Champion): number {
  return p && p.rating != null ? p.rating : BASE_RATING;
}

// Arena (1v1) ELO update. Mutates `progress`; returns the two rating deltas.
export function recordArena(
  progress: Progress,
  winnerKey: string,
  loserKey: string,
): { winner: number; loser: number } {
  const w = ensure(progress, winnerKey);
  const l = ensure(progress, loserKey);
  const rw = w.rating ?? BASE_RATING;
  const rl = l.rating ?? BASE_RATING;
  const expW = 1 / (1 + Math.pow(10, (rl - rw) / 400));
  const K = 32;
  const dw = Math.round(K * (1 - expW));
  w.rating = rw + dw;
  l.rating = rl - dw;
  return { winner: dw, loser: -dw };
}
