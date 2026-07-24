"use client";
// Reads the live store and hands the Director its snapshot (docs/long-game.md §6).
// Every surface that shows a "next thing" goes through here, so mobile and desktop
// can never disagree about what the Trainer should do.
import { useMemo, useSyncExternalStore } from "react";

import { dailyNumber, nextObjective, type DirectorPlan } from "@/lib/director";
import { imprintDayIndex, lessonsForSession } from "@/lib/imprints";
import { levelFor } from "@/lib/evolve/progression";
import { ROSTER } from "@/lib/engine/roster";
import { DEFAULT_STRAT } from "@/lib/types";
import { isFirstDuelComplete } from "@/lib/first-duel";
import { readCareer, canRetire } from "@/lib/career-friction";
import { currentRival, loadRivalMemory, rivalStance } from "@/lib/lore/rival";
import { isExpeditionOpen } from "@/lib/expeditions";
import { useChampions } from "@/store/champions";

const subscribeNever = () => () => {};

/**
 * `null` until the persisted store has rehydrated — surfaces should render
 * nothing rather than flash a directive computed from empty defaults.
 */
export function useDirective(): DirectorPlan | null {
  // False through SSR and the hydration pass, true on the re-render after it —
  // the persisted store isn't readable until then.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const owned = useChampions((s) => s.owned);
  const champion = useChampions((s) => (s.owned ? s.progress[s.owned] : undefined));
  const recipe = useChampions((s) => (s.owned ? s.recipes[s.owned] : undefined));
  const taught = useChampions((s) => (s.owned ? s.imprintDays[s.owned] : undefined));
  const events = useChampions((s) => (s.owned ? s.events[s.owned] : undefined));
  const climb = useChampions((s) => s.climb);
  const daily = useChampions((s) => s.daily);
  const trainerXp = useChampions((s) => s.trainerXp);
  const roster = useChampions((s) => s.roster);

  return useMemo(() => {
    if (!mounted) return null;
    const entry = owned ? ROSTER[owned] : null;
    const lf = levelFor(champion?.xp ?? 0);

    let imprintReady = false;
    if (owned && entry) {
      const day = imprintDayIndex();
      imprintReady = lessonsForSession({
        ckey: owned,
        type: entry.type,
        level: lf.level,
        strat: recipe?.strat ?? DEFAULT_STRAT,
      }).some((l) => taught?.[l.id] !== day);
    }

    const rosterCount = owned
      ? new Set([owned, ...roster]).size
      : roster.length;

    const career = champion ? readCareer(champion, events) : null;
    const mem = loadRivalMemory();
    const rival = currentRival(mem);
    const stance = rivalStance(mem);
    const rivalDue =
      !!owned &&
      (stance === "first" || stance === "behind" || stance === "grudge" || mem.chapter > 0);

    return nextObjective({
      owned: entry ? owned : null,
      championName: entry?.name ?? null,
      levelPct: entry ? lf.into / Math.max(1, lf.span) : 0,
      climb,
      dailyDone: daily.lastDay >= dailyNumber(),
      dailyStreak: daily.streak,
      imprintReady,
      trainerXp,
      wins: champion?.wins ?? 0,
      rosterCount,
      firstDuelDone: isFirstDuelComplete(),
      form: career?.form,
      fatigue: career?.fatigue,
      canRetire: champion ? canRetire(champion) : false,
      rivalName: rival.name,
      rivalDue,
      expeditionOpen: isExpeditionOpen(climb.bestSectors, climb.campsLit),
    });
  }, [mounted, owned, champion, recipe, taught, events, climb, daily, trainerXp, roster]);
}
