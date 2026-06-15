// Objective benchmark layer (ported from evolve.js). The ENGINE decides the
// winner, so the ELO it produces is a real benchmark, not an opinion.
import type { Champion, HouseEnd, Progress } from "@/lib/types";
import { blank } from "./progression";

export const BASE_RATING = 1000;

function ensure(progress: Progress, key: string): Champion {
  if (!progress[key]) progress[key] = blank();
  const p = progress[key];
  if (!p.house) p.house = { games: 0, wins: 0, tGames: 0, tWins: 0, fGames: 0, fWins: 0, survived: 0, votes: 0, correct: 0 };
  if (p.rating == null) p.rating = BASE_RATING;
  return p;
}
export function ratingOf(p?: Champion): number {
  return p && p.rating != null ? p.rating : BASE_RATING;
}

export interface RatingDelta {
  before: number;
  after: number;
  delta: number;
  won: boolean;
  role: string;
  alive: boolean;
  traitor: boolean;
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

// Resolve one finished HOUSE game into rating + stat + evolution changes.
// Mutates `progress` in place; the caller is responsible for persisting.
export function recordHouse(progress: Progress, end: HouseEnd, votesLog: { voter: string; target: string }[] = []): Record<string, RatingDelta> {
  const roleByKey = Object.fromEntries(end.roles.map((r) => [r.key, r]));
  const traitorsWon = end.winner === "TRAITORS";
  const winners = end.roles.filter((r) => (traitorsWon ? r.traitor : !r.traitor));
  const losers = end.roles.filter((r) => (traitorsWon ? !r.traitor : r.traitor));
  const avg = (arr: typeof end.roles) => (arr.length ? arr.reduce((s, r) => s + ratingOf(progress[r.key]), 0) / arr.length : BASE_RATING);
  const winAvg = avg(winners);
  const loseAvg = avg(losers);
  const out: Record<string, RatingDelta> = {};
  for (const r of end.roles) {
    const p = ensure(progress, r.key);
    const won = traitorsWon ? r.traitor : !r.traitor;
    const oppAvg = won ? loseAvg : winAvg;
    const rating = p.rating ?? BASE_RATING;
    const exp = 1 / (1 + Math.pow(10, (oppAvg - rating) / 400));
    const K = r.traitor ? 40 : 32;
    const before = rating;
    p.rating = Math.round(rating + K * ((won ? 1 : 0) - exp));
    const hs = p.house!;
    hs.games++;
    if (won) hs.wins++;
    if (r.traitor) {
      hs.tGames++;
      if (won) hs.tWins++;
    } else {
      hs.fGames++;
      if (won) hs.fWins++;
    }
    if (r.alive) hs.survived++;
    for (const v of votesLog)
      if (v.voter === r.key) {
        hs.votes++;
        const t = roleByKey[v.target];
        if (!r.traitor && t && t.traitor) hs.correct++;
      }
    p.battles += 1;
    if (won) p.wins++;
    else p.losses++;
    p.xp += won ? 60 : 22;
    if (r.traitor) {
      p.control += won ? 1.3 : 0.4;
      p.creativity += 0.4;
    } else {
      p.control += 0.3;
      p.resilience += r.alive ? 0.8 : 0.2;
    }
    out[r.key] = { before, after: p.rating, delta: p.rating - before, won, role: r.role, alive: r.alive, traitor: r.traitor };
  }
  return out;
}

export interface HouseProfile {
  games: number;
  winRate: number;
  deception: number;
  detection: number;
  survival: number;
}
export function houseProfile(p?: Champion): HouseProfile | null {
  const h = p && p.house;
  if (!h || !h.games) return null;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  return {
    games: h.games,
    winRate: pct(h.wins, h.games),
    deception: pct(h.tWins, h.tGames),
    detection: pct(h.correct, h.votes),
    survival: pct(h.survived, h.games),
  };
}
export function leaderboard(progress: Progress) {
  return Object.entries(progress)
    .filter(([, p]) => p && p.house && p.house.games)
    .map(([key, p]) => ({ key, rating: ratingOf(p), house: p.house!, profile: houseProfile(p) }))
    .sort((a, b) => b.rating - a.rating);
}
