// The Force War — server-authoritative aggregation of every Reader's ranked-win
// contribution into one season-long standing between the five Forces. The
// winning Force (the warLeader) feeds region growth (lib/lore/growth.ts), the
// last dormant input now made live. Only the server writes here, off engine-
// decided bouts, so the war can't be forged from a client blob.
import "server-only";
import type { CreatureType, WarState } from "@/lib/types";
import { currentSeasonNumber } from "@/lib/lore/season";
import { getStore } from "./store";

// Credit a pledged Force for one ranked win — both the collective Force tally and
// the Reader's own season contribution, in one authoritative step. No-op for
// unsworn Readers (an unsworn win feeds no Force). `weight` lets a home-advantage
// win (fought in a region aligned to the Clan) count for more.
export async function creditWarWin(token: string, force: CreatureType | null, weight = 1, season = currentSeasonNumber()): Promise<void> {
  if (!force || weight <= 0) return;
  const store = getStore();
  await Promise.all([store.incrWar(season, force, weight), store.incrWarMember(token, season, weight)]);
}

// The Reader's authoritative contribution to this season's war (0 if unsworn or
// none yet). The client shows this instead of its optimistic local mirror.
export async function getMyWar(token: string, season = currentSeasonNumber()): Promise<number> {
  if (!token) return 0;
  return getStore().warMember(token, season);
}

export async function getWarState(season = currentSeasonNumber()): Promise<WarState> {
  const tally = await getStore().warStandings(season);
  const standings = (Object.entries(tally) as [CreatureType, number][])
    .map(([force, points]) => ({ force, points }))
    .sort((a, b) => b.points - a.points);
  const top = standings[0];
  // A leader only exists once a Force is genuinely ahead with > 0 points; a flat
  // 0–0 board (or a tie at the top) has no leader, so growth stays neutral.
  const leader = top && top.points > 0 && (standings.length < 2 || standings[1].points < top.points) ? top.force : null;
  return { season, standings, leader };
}
