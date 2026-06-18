"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Champion, DailyResult, DailyState, HouseEnd, PlayerSave, PredictState, Progress, Recipe, Strat, Style } from "@/lib/types";
import { DEFAULT_STRAT, SAVE_VERSION } from "@/lib/types";
import { applyResult, blank, blankStyle, levelFor, tierIndex } from "@/lib/evolve/progression";
import { recordHouse, recordArena, type RatingDelta } from "@/lib/evolve/elo";
import { STORAGE } from "@/lib/brand";

// Wild, maximally-distinct starting archetypes (key, xp, axis, val, axis2, val2, w, l)
const SEED: [string, number, keyof Champion, number, keyof Champion, number, number, number][] = [
  ["AXIOM", 14000, "control", 34, "flair", 6, 58, 11],
  ["VOX", 52000, "flair", 40, "control", 6, 96, 9],
  ["GLITCH", 1200, "aggression", 46, "flair", 4, 11, 14],
  ["BASTION", 30000, "resilience", 30, "aggression", 6, 71, 7],
  ["MUSE", 6000, "creativity", 44, "control", 8, 33, 12],
  ["EMBER", 9000, "aggression", 28, "flair", 12, 40, 18],
];

function seeded(): Progress {
  const p: Progress = {};
  for (const [key, xp, ax, av, ax2, av2, w, l] of SEED) {
    const c = blank();
    c.xp = xp;
    (c[ax] as number) = av;
    (c[ax2] as number) = av2;
    c.wins = w;
    c.losses = l;
    c.battles = w + l;
    p[key] = c;
  }
  return p;
}

const STARTING_CROWNS = 500;
export const TRAIN_COST = 60;

interface ChampionStore {
  progress: Progress;
  recipes: Record<string, Recipe>;
  crowns: number;
  owned: string | null;
  predict: PredictState;
  daily: DailyState;
  lastServerSync: number; // updatedAt of the last save we reconciled with the server
  applyServerSave: (save: PlayerSave) => void;
  snapshotSave: () => PlayerSave;
  get: (key: string) => Champion;
  getRecipe: (key: string) => Recipe;
  setStrat: (key: string, strat: Strat) => void;
  setPersona: (key: string, persona: string) => void;
  setAgent: (key: string, agent: Recipe["agent"]) => void;
  learnFromBout: (args: { key: string; opponentName: string; won: boolean; axisLabel: string }) => void;
  setOwned: (key: string) => void;
  earn: (n: number) => void;
  spend: (n: number) => boolean;
  trainChampion: (key: string) => boolean;
  recordBattle: (winnerKey: string, loserKey: string, styles: Record<string, Style>) => void;
  recordHouseGame: (end: HouseEnd, votesLog: { voter: string; target: string }[]) => Record<string, RatingDelta>;
  predictResult: (correct: boolean) => void;
  recordDaily: (r: DailyResult) => boolean;
  reseed: () => void;
  setChampion: (key: string, c: Champion) => void;
}

export const useChampions = create<ChampionStore>()(
  persist(
    (set, get) => ({
      progress: seeded(),
      recipes: {},
      crowns: STARTING_CROWNS,
      owned: null,
      predict: { streak: 0, best: 0 },
      daily: { lastDay: 0, streak: 0, best: 0, plays: 0, result: null },
      lastServerSync: 0,

      // Reconcile the server's authoritative save into local state. Server
      // recipes never carry an API key (client-only), so we re-apply any key we
      // already hold locally — the rest of the recipe comes from the server.
      applyServerSave: (save) =>
        set((s) => {
          const recipes: Record<string, Recipe> = {};
          for (const [key, r] of Object.entries(save.recipes || {})) {
            const localKey = s.recipes[key]?.agent?.apiKey;
            recipes[key] = localKey && r.agent ? { ...r, agent: { ...r.agent, apiKey: localKey } } : r;
          }
          return {
            progress: { ...seeded(), ...(save.progress || {}) },
            recipes,
            crowns: save.crowns,
            owned: save.owned ?? null,
            predict: save.predict || { streak: 0, best: 0 },
            daily: save.daily || { lastDay: 0, streak: 0, best: 0, plays: 0, result: null },
            lastServerSync: save.updatedAt,
          };
        }),

      // Build the blob to push to the server — sanitized of API keys so a secret
      // never leaves the device (the server strips them too as a backstop).
      snapshotSave: () => {
        const s = get();
        const recipes: Record<string, Recipe> = {};
        for (const [key, r] of Object.entries(s.recipes)) {
          const agent = r.agent ? { ...r.agent, apiKey: undefined } : undefined;
          recipes[key] = { ...r, agent };
        }
        return {
          v: SAVE_VERSION,
          progress: s.progress,
          recipes,
          crowns: s.crowns,
          owned: s.owned,
          predict: s.predict,
          daily: s.daily,
          updatedAt: Date.now(),
        };
      },

      get: (key) => get().progress[key] || blank(),
      getRecipe: (key) => get().recipes[key] || { strat: { ...DEFAULT_STRAT } },

      setStrat: (key, strat) =>
        set((s) => ({ recipes: { ...s.recipes, [key]: { ...(s.recipes[key] || {}), strat } } })),
      setPersona: (key, persona) =>
        set((s) => {
          const cur = s.recipes[key] || { strat: { ...DEFAULT_STRAT } };
          return { recipes: { ...s.recipes, [key]: { ...cur, persona } } };
        }),
      setAgent: (key, agent) =>
        set((s) => {
          const cur = s.recipes[key] || { strat: { ...DEFAULT_STRAT } };
          return { recipes: { ...s.recipes, [key]: { ...cur, agent } } };
        }),

      // P1 — the MIND evolves: write an opponent-specific memory note and gently
      // auto-tune the doctrine toward what just worked. Bounded + visible.
      learnFromBout: ({ key, opponentName, won, axisLabel }) =>
        set((s) => {
          const cur = s.recipes[key] || { strat: { ...DEFAULT_STRAT } };
          const strat = { ...(cur.strat || DEFAULT_STRAT) };
          const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
          if (won) {
            if (axisLabel === "Aggression") strat.aggression = clamp(strat.aggression + 3);
            else if (axisLabel === "Control") strat.focus = clamp(strat.focus + 3);
            else if (axisLabel === "Flair") strat.risk = clamp(strat.risk + 3);
          } else {
            strat.focus = clamp(strat.focus + 2);
            strat.aggression = clamp(strat.aggression - 1);
          }
          const note = won
            ? `Beat ${opponentName} leaning ${axisLabel.toLowerCase()}. Keep pressing it.`
            : `Lost to ${opponentName}. Set up more, vary tactics.`;
          const memory = [note, ...(cur.memory || []).filter((n) => !n.startsWith(note.split(" ").slice(0, 3).join(" ")))].slice(0, 6);
          return { recipes: { ...s.recipes, [key]: { ...cur, strat, memory } } };
        }),

      setOwned: (key) => set({ owned: key }),

      earn: (n) => set((s) => ({ crowns: s.crowns + n })),
      spend: (n) => {
        if (get().crowns < n) return false;
        set((s) => ({ crowns: s.crowns - n }));
        return true;
      },

      // a paid training session: spends Crowns, adds XP + nudges style axes toward
      // the recipe dials — so money visibly evolves the body and shifts the build.
      trainChampion: (key) => {
        if (get().crowns < TRAIN_COST) return false;
        set((s) => {
          const c = { ...(s.progress[key] || blank()) };
          const r = s.recipes[key]?.strat || DEFAULT_STRAT;
          const before = tierIndex(levelFor(c.xp).level);
          c.xp += 220;
          c.aggression += (r.aggression / 100) * 1.6 + 0.2;
          c.control += (r.focus / 100) * 1.6 + 0.2;
          c.flair += (r.risk / 100) * 1.4 + 0.1;
          c.resilience += ((100 - r.aggression) / 100) * 0.9;
          c.creativity += 0.3;
          void before;
          return { progress: { ...s.progress, [key]: c }, crowns: s.crowns - TRAIN_COST };
        });
        return true;
      },

      recordBattle: (winnerKey, loserKey, styles) =>
        set((s) => {
          const progress = { ...s.progress };
          const w = { ...(progress[winnerKey] || blank()) };
          const l = { ...(progress[loserKey] || blank()) };
          applyResult(w, { won: true, style: styles[winnerKey] || blankStyle() });
          applyResult(l, { won: false, style: styles[loserKey] || blankStyle() });
          progress[winnerKey] = w;
          progress[loserKey] = l;
          recordArena(progress, winnerKey, loserKey); // arena ELO: the honest climb
          return { progress };
        }),

      recordHouseGame: (end, votesLog) => {
        const progress: Progress = JSON.parse(JSON.stringify(get().progress));
        const deltas = recordHouse(progress, end, votesLog);
        set({ progress });
        return deltas;
      },

      predictResult: (correct) =>
        set((s) => {
          const streak = correct ? s.predict.streak + 1 : 0;
          return { predict: { streak, best: Math.max(streak, s.predict.best) } };
        }),

      // Lock in today's daily call. No-ops (returns false) if this puzzle was
      // already solved, so a refresh or replay can never inflate the streak.
      recordDaily: (r) => {
        if (get().daily.lastDay >= r.day) return false;
        set((s) => {
          const streak = r.winnerCorrect ? s.daily.streak + 1 : 0;
          return {
            daily: {
              lastDay: r.day,
              streak,
              best: Math.max(streak, s.daily.best),
              plays: s.daily.plays + 1,
              result: r,
            },
          };
        });
        return true;
      },

      reseed: () => set({ progress: seeded() }),
      setChampion: (key, c) => set((s) => ({ progress: { ...s.progress, [key]: c } })),
    }),
    {
      name: STORAGE.state,
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name) ?? localStorage.getItem(STORAGE.stateLegacy),
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => {
          localStorage.removeItem(name);
          localStorage.removeItem(STORAGE.stateLegacy);
        },
      })),
      merge: (persisted, current) => {
        const p = (persisted as Partial<ChampionStore>) || {};
        const progress = { ...seeded(), ...(p.progress || {}) };
        return { ...current, ...p, progress } as ChampionStore;
      },
    },
  ),
);
