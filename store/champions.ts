"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AxisSnapshot, CareerEvent, CareerEventKind, Champion, CreatureType, DailyResult, DailyState, ForcePoints, PlayerSave, PredictState, Progress, Recipe, Strat, Style } from "@/lib/types";
import { DEFAULT_STRAT, SAVE_VERSION } from "@/lib/types";
import { applyResult, blank, blankStyle, levelFor, tierIndex, TIERS } from "@/lib/evolve/progression";
import { recordArena } from "@/lib/evolve/elo";
import { TRAINER_XP, trainerLevel } from "@/lib/evolve/trainer";
import { recruitSlotsOpen } from "@/lib/unlock-ladder";
import { consumePendingHeirloom, retireChampion as retireToLegacy } from "@/lib/legacy";
import { canRetire } from "@/lib/career-friction";
import { currentSeasonNumber } from "@/lib/lore/season";
import { STORAGE } from "@/lib/brand";
import {
  STARTING_CROWNS,
  TRAIN_COST,
  FRAGMENT_BUY,
  FRAGMENT_SELL,
  RECRUIT_COST,
} from "@/lib/economy";
import { commitBet as commitBetRequest, fetchBalance, walletEvent } from "@/lib/wallet-client";
import { ROSTER } from "@/lib/engine/roster";
import { getOwnerToken } from "@/lib/owner";
import { championImprintAck } from "@/lib/lore/character-beats";
import { lessonById, clampDial, imprintDayIndex } from "@/lib/imprints";
import { TRIALS } from "@/lib/flags";
import { guestDepthXp, takeGuestClimbDepth } from "@/lib/guest-climb";
import {
  EMPTY_CLIMB,
  lightCamp as applyLightCamp,
  milestoneCrowns,
  sanitizeClimb,
  SCOUT_CROWNS_DAY_CAP,
  type ClimbProgress,
  type LightCampResult,
} from "@/lib/climb-campaign";

const nameOf = (key: string): string => ROSTER[key]?.name ?? key;

// Re-export the canonical economy numbers so existing imports from the store
// keep working; the single source of truth now lives in lib/economy.ts.
export { TRAIN_COST, FRAGMENT_BUY, FRAGMENT_SELL, RECRUIT_COST };

// Wild, maximally-distinct starting archetypes (key, xp, axis, val, axis2, val2, w, l)
const SEED: [string, number, keyof Champion, number, keyof Champion, number, number, number][] = [
  ["AXIOM", 14000, "control", 34, "flair", 6, 58, 11],
  ["VOX", 52000, "flair", 40, "control", 6, 96, 9],
  ["GLITCH", 1200, "aggression", 46, "flair", 4, 11, 14],
  ["BASTION", 30000, "resilience", 30, "aggression", 6, 71, 7],
  ["MUSE", 6000, "creativity", 44, "control", 8, 33, 12],
  ["EMBER", 9000, "aggression", 28, "flair", 12, 40, 18],
  ["PARADOX", 8000, "control", 40, "creativity", 36, 35, 13],
  ["WIT", 11000, "flair", 36, "aggression", 32, 52, 15],
];

// one training session's worth of growth: +XP and a doctrine-shaped nudge to the
// style axes. Shared by paid (Crowns) and fragment-funded sessions.
function evolveTrained(prev: Champion | undefined, strat: Strat | undefined): Champion {
  const c = { ...(prev || blank()) };
  const r = strat || DEFAULT_STRAT;
  c.xp += 220;
  c.aggression += (r.aggression / 100) * 1.6 + 0.2;
  c.control += (r.focus / 100) * 1.6 + 0.2;
  c.flair += (r.risk / 100) * 1.4 + 0.1;
  c.resilience += ((100 - r.aggression) / 100) * 0.9;
  c.creativity += 0.3;
  return c;
}

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

// UTC day index — discovery caches refresh at the rollover, so the ledger of
// what you've already grabbed resets each day.
const today = () => Math.floor(Date.now() / 86_400_000);

interface NodeLedger {
  day: number; // the day the claimed list belongs to
  claimed: string[]; // node ids already grabbed today
}

// world goals cleared this season (peak/depth/secret per region). Resets at the
// season turn so the spotlight rotates and there's a fresh hunt each season.
interface GoalLedger {
  season: number;
  done: string[]; // goal ids completed this season
}

// A transient "your champion just evolved" signal, set by recordBattle when the
// OWNED champion crosses a level/tier in a bout. The HUD reads it to celebrate
// the moment (level-up, tier-up, and the body part the new tier bolts on) then
// calls clearEvolution(). Not meant to persist — it's a one-shot flash.
export interface EvolutionFlash {
  key: string;
  won: boolean;
  leveledUp: boolean;
  newLevel: number;
  tieredUp: boolean;
  tier: string;
  unlocked: string | null; // the phenotype slot a tier-up reveals, if any
  // Promotion Trials: the bout crossed into a new tier the champion hasn't
  // claimed yet — a trial is owed before the heraldry lands (TRIALS flag on).
  pendingTrial?: boolean;
}

// Which solid body part each tier bolts on (mirrors lib/render/phenotype.ts gating).
const TIER_UNLOCK: Record<string, string> = {
  ADEPT: "Headgear",
  VETERAN: "Shoulder guards",
  ELITE: "Chest core",
  LEGEND: "Back unit & crown",
};

// ── The Saga ledger (v5) ─────────────────────────────────────────────────────
// Append-only per-champion life events, capped so a long career stays light in
// the save blob. Milestone kinds are PINNED — a legend's tier crossings and
// Keeper cracks are never trimmed; only routine bouts/trains age out.
const EVENT_CAP = 60;
const PINNED_EVENTS: Set<CareerEventKind> = new Set(["claimed", "tierup", "trial", "keeper", "sealed", "season"]);

/** Camp lights age out; clearing the Hundred stays pinned (climb-p2 §P2.5). */
function eventPinned(e: CareerEvent): boolean {
  if (PINNED_EVENTS.has(e.kind)) return true;
  return e.kind === "ascent" && e.detail === "hundred";
}

function appendCapped(list: CareerEvent[] | undefined, ev: CareerEvent): CareerEvent[] {
  const next = [...(list || []), ev];
  if (next.length <= EVENT_CAP) return next;
  const pinned = next.filter(eventPinned);
  const loose = next.filter((e) => !eventPinned(e));
  const room = Math.max(0, EVENT_CAP - pinned.length);
  const keptLoose = room >= loose.length ? loose : loose.slice(loose.length - room);
  return [...pinned, ...keptLoose].sort((a, b) => a.ts - b.ts);
}

// Snapshot the axes when the build actually shifts (level change) or at most
// every 12h — enough to draw a growth curve without bloating the save.
const SNAP_CAP = 40;
const SNAP_MIN_MS = 12 * 60 * 60 * 1000;

function styleFrom(c: Champion): Style {
  return { aggression: c.aggression, control: c.control, resilience: c.resilience, flair: c.flair, creativity: c.creativity };
}

function shouldSnapshot(list: AxisSnapshot[] | undefined, level: number, now: number): boolean {
  if (!list || list.length === 0) return true;
  const last = list[list.length - 1];
  return last.level !== level || now - last.ts > SNAP_MIN_MS;
}

// The origin event — written once, the first time a mind becomes the player's.
function ensureClaimed(events: Record<string, CareerEvent[]>, key: string): Record<string, CareerEvent[]> {
  const list = events[key] || [];
  if (list.some((e) => e.kind === "claimed")) return events;
  const now = Date.now();
  const ev: CareerEvent = { id: `${now}-claimed-${key}`, ts: now, kind: "claimed", title: "Claimed from the Hum", detail: "You pulled this mind out of the murmur before it faded." };
  return { ...events, [key]: appendCapped(list, ev) };
}

// Shared patch for a training session: append a "train" event + axis snapshot
// for one of the player's own champions. Used by both paid and fragment training.
function trainPatch(
  events: Record<string, CareerEvent[]>,
  snapshots: Record<string, AxisSnapshot[]>,
  mine: boolean,
  key: string,
  evolved: Champion,
): { events: Record<string, CareerEvent[]>; snapshots: Record<string, AxisSnapshot[]> } {
  if (!mine) return { events, snapshots };
  const now = Date.now();
  const ev: CareerEvent = { id: `${now}-train-${Math.random().toString(36).slice(2, 6)}`, ts: now, kind: "train", title: "Trained at the pad" };
  const nextEvents = { ...events, [key]: appendCapped(events[key], ev) };
  const lvl = levelFor(evolved.xp).level;
  let nextSnaps = snapshots;
  if (shouldSnapshot(snapshots[key], lvl, now)) {
    nextSnaps = { ...snapshots, [key]: [...(snapshots[key] || []), { ts: now, level: lvl, axes: styleFrom(evolved) }].slice(-SNAP_CAP) };
  }
  return { events: nextEvents, snapshots: nextSnaps };
}

interface ChampionStore {
  progress: Progress;
  recipes: Record<string, Recipe>;
  // Mirror of the server-authoritative wallet (lib/economy.ts + /api/wallet).
  // Persisted only as an offline cache; syncWallet() reconciles it (server wins).
  crowns: number;
  // exploration loot: spent for a free training session (feeds champion power,
  // not the betting/training economy). Client-only for now — not server-synced.
  fragments: number;
  nodes: NodeLedger;
  // trainer identity — the account-level "I'm level 12" spine, fed by all activity
  trainerXp: number;
  force: CreatureType | null; // pledged Clan (faction)
  forceSeason: number | null; // the season the current Clan was joined in (locks switching for that season)
  forcePoints: ForcePoints; // this season's contribution to that faction
  goals: GoalLedger; // world goals cleared this season
  owned: string | null; // the single ACTIVE/adopted champion (unchanged behaviour)
  // The collection acquisition loop: every mind you've RECRUITED into your roster
  // (a deterministic Crown sink, see recruit()). Your adopted `owned` champion is
  // always implicitly recruited. Client-only mirror for now (like `fragments`) —
  // the spend itself is server-authoritative via the wallet.
  roster: string[];
  predict: PredictState;
  daily: DailyState;
  // transient one-shot "owned champion evolved this bout" flash (see EvolutionFlash)
  lastEvolution: EvolutionFlash | null;
  clearEvolution: () => void;
  // ── The Saga ledger (v5) ───────────────────────────────────────────────────
  // Per-champion life events + axis-history for the growth radar, and the
  // last-visit stamp that windows the mobile "while you were away" Report.
  events: Record<string, CareerEvent[]>;
  snapshots: Record<string, AxisSnapshot[]>;
  lastVisit: number;
  // Append a life event to a champion's saga (id + ts generated here).
  pushEvent: (key: string, ev: Omit<CareerEvent, "id" | "ts"> & { ts?: number }) => void;
  // Capture the champion's current axes if the build has meaningfully shifted.
  snapshotAxes: (key: string) => void;
  // Stamp "now" as the last time the player looked (call after showing Report).
  touchVisit: () => void;
  // Promotion Trials: grant the next tier a champion has EARNED by winning its
  // trial — bumps claimedTier, writes a `trial` saga event, and fires the tier-up
  // Celebration flash. No-op if nothing is owed. (TRIALS flow; see grounds.)
  claimTier: (key: string) => void;
  lastServerSync: number; // updatedAt of the last save we reconciled with the server
  applyServerSave: (save: PlayerSave) => void;
  snapshotSave: () => PlayerSave;
  get: (key: string) => Champion;
  getRecipe: (key: string) => Recipe;
  setStrat: (key: string, strat: Strat) => void;
  setNick: (key: string, nick: string) => void;
  setPersona: (key: string, persona: string) => void;
  setAgent: (key: string, agent: Recipe["agent"]) => void;
  learnFromBout: (args: { key: string; opponentName: string; won: boolean; axisLabel: string }) => void;
  // Apply a taught lesson locally: append a memory note, gently nudge doctrine,
  // snapshot, and write an `imprint` saga event. Pure — `imprint` does the call.
  applyImprint: (key: string, args: { note: string; dial: Partial<Strat> }) => void;
  // Per-champion Imprint cooldown ledger: lessonId → UTC-day it was last taught.
  // A lesson can be internalised once per champion per day so it's a real daily
  // decision, not a spam button. Resets with the daily loop (imprintDayIndex()).
  imprintDays: Record<string, Record<string, number>>;
  // Flight campaign (v6) — camps lit, best depth, scout day cap (climb-p2).
  climb: ClimbProgress;
  /** Ranked depth → light camps; returns newly lit + hundred flag. */
  lightCamp: (sectors: number, clearedAll?: boolean, opts?: { silent?: boolean }) => LightCampResult;
  /** Remaining scout Crowns allowance today (0 when capped). */
  scoutCrownsRemaining: () => number;
  /** Record scout Crowns paid today (after clamp). */
  noteScoutCrowns: (amount: number) => void;
  // Whether a given lesson can be taught to a champion right now (off cooldown).
  canImprint: (key: string, lessonId: string) => boolean;
  // The full Imprint flow: POST /api/imprint (capped house LLM, template
  // fallback) then applyImprint with the result. `applied` is false when the
  // lesson is still on its daily cooldown; `dial` is what actually moved.
  imprint: (key: string, lessonId: string) => Promise<{ reply: string; live: boolean; applied: boolean; dial: Partial<Strat> }>;
  setOwned: (key: string) => void;
  adoptStarterRookie: (key: string) => void;
  /**
   * Retire the active champion into legacy memory + leave an heirloom wing for
   * the next claim (docs/long-game.md Stage 4). Clears `owned`.
   */
  retireOwned: () => { ok: boolean; detail?: string };
  // Whether a mind is in the player's roster (recruited, or the adopted champion).
  isRecruited: (key: string) => boolean;
  // Recruit a new mind for RECRUIT_COST Crowns (server-authoritative spend). A
  // no-op returning false if already recruited or the wallet can't cover it.
  recruit: (key: string) => Promise<boolean>;
  // Mirror the authoritative balance returned by the server (bout reward, sync).
  setBalance: (n: number) => void;
  // Pull the authoritative balance from the server into the mirror (server wins).
  syncWallet: () => Promise<void>;
  // Credit a Gauntlet payout through the wallet (server clamps the amount).
  awardGauntlet: (amount: number) => Promise<void>;
  // One-shot Flight milestone (Hundred / first-light). Server decides the amount.
  claimMilestone: (claimId: string) => Promise<boolean>;
  // Commit-reveal wager: stake is taken server-side BEFORE the bout. Returns true
  // if the stake was placed (offline: optimistic local debit).
  commitBet: (stake: number, side: "me" | "opp", nonce: string) => Promise<boolean>;
  // claim a discovery cache once per day; returns false if already grabbed
  claimNode: (id: string, reward: { crowns?: number; fragments?: number }) => Promise<boolean>;
  // complete a world goal once per season; returns false if already cleared
  completeGoal: (id: string, reward: { crowns?: number; fragments?: number; trainerXp?: number; seasonPoints?: number }) => Promise<boolean>;
  trainChampion: (key: string) => Promise<boolean>;
  // spend one exploration fragment for a free training session
  trainWithFragment: (key: string) => boolean;
  // the Broker's exchange — convert between Crowns and Fragments
  buyFragment: () => Promise<boolean>; // FRAGMENT_BUY crowns → +1 fragment
  sellFragment: () => Promise<boolean>; // −1 fragment → FRAGMENT_SELL crowns
  // trainer rank + faction
  awardTrainerXp: (n: number) => void;
  // Join a Clan. Locked to one choice per season: returns false (a no-op) if a
  // Clan is already joined this season. A new season frees the choice again.
  pledgeForce: (f: CreatureType) => boolean;
  // Whether the Reader may choose/switch their Clan right now (no clan yet, or
  // the locked season has rolled over).
  canChangeClan: () => boolean;
  recordBattle: (winnerKey: string, loserKey: string, styles: Record<string, Style>) => void;
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
      fragments: 0,
      nodes: { day: today(), claimed: [] },
      trainerXp: 0,
      force: null,
      forceSeason: null,
      forcePoints: { season: currentSeasonNumber(), points: 0 },
      goals: { season: currentSeasonNumber(), done: [] },
      lastEvolution: null,
      clearEvolution: () => set({ lastEvolution: null }),
      events: {},
      snapshots: {},
      imprintDays: {},
      climb: { ...EMPTY_CLIMB, firstLit: {} },
      lastVisit: 0,
      owned: null,
      roster: [],
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
            // crowns intentionally not taken from the save — the wallet is the
            // authority and is reconciled by syncWallet().
            owned: save.owned ?? null,
            roster: Array.isArray(save.roster) ? save.roster.filter((k) => typeof k === "string") : [],
            trainerXp: typeof save.trainerXp === "number" && Number.isFinite(save.trainerXp) ? Math.max(0, save.trainerXp) : 0,
            predict: save.predict || { streak: 0, best: 0 },
            daily: save.daily || { lastDay: 0, streak: 0, best: 0, plays: 0, result: null },
            force: save.force ?? null,
            forceSeason: save.forceSeason ?? null,
            forcePoints: save.forcePoints || { season: currentSeasonNumber(), points: 0 },
            events: save.events && typeof save.events === "object" ? save.events : s.events,
            snapshots: save.snapshots && typeof save.snapshots === "object" ? save.snapshots : s.snapshots,
            climb: save.climb != null ? sanitizeClimb(save.climb) : s.climb,
            lastVisit: typeof save.lastVisit === "number" && Number.isFinite(save.lastVisit) ? save.lastVisit : s.lastVisit,
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
          owned: s.owned,
          roster: s.roster,
          trainerXp: s.trainerXp,
          predict: s.predict,
          daily: s.daily,
          force: s.force,
          forceSeason: s.forceSeason,
          forcePoints: s.forcePoints,
          events: s.events,
          snapshots: s.snapshots,
          lastVisit: s.lastVisit,
          climb: sanitizeClimb(s.climb),
          updatedAt: Date.now(),
        };
      },

      lightCamp: (sectors, clearedAll = false, opts) => {
        const result = applyLightCamp(get().climb, sectors, clearedAll, Date.now(), opts);
        set({ climb: result.climb });
        return result;
      },

      scoutCrownsRemaining: () => {
        const day = imprintDayIndex();
        const c = get().climb;
        if (c.scoutDay !== day) return SCOUT_CROWNS_DAY_CAP;
        return Math.max(0, SCOUT_CROWNS_DAY_CAP - (c.scoutCrownsToday ?? 0));
      },

      noteScoutCrowns: (amount) => {
        const pay = Math.max(0, Math.floor(amount));
        if (pay <= 0) return;
        const day = imprintDayIndex();
        set((s) => {
          const same = s.climb.scoutDay === day;
          const used = same ? (s.climb.scoutCrownsToday ?? 0) : 0;
          return {
            climb: {
              ...s.climb,
              scoutDay: day,
              scoutCrownsToday: Math.min(SCOUT_CROWNS_DAY_CAP, used + pay),
            },
          };
        });
      },

      get: (key) => get().progress[key] || blank(),
      getRecipe: (key) => get().recipes[key] || { strat: { ...DEFAULT_STRAT } },

      pushEvent: (key, ev) =>
        set((s) => {
          const ts = ev.ts ?? Date.now();
          const id = `${ts}-${ev.kind}-${Math.random().toString(36).slice(2, 6)}`;
          const full: CareerEvent = { ...ev, id, ts };
          return { events: { ...s.events, [key]: appendCapped(s.events[key], full) } };
        }),

      snapshotAxes: (key) =>
        set((s) => {
          const c = s.progress[key];
          if (!c) return {};
          const level = levelFor(c.xp).level;
          const now = Date.now();
          if (!shouldSnapshot(s.snapshots[key], level, now)) return {};
          const snap: AxisSnapshot = { ts: now, level, axes: styleFrom(c) };
          const next = [...(s.snapshots[key] || []), snap].slice(-SNAP_CAP);
          return { snapshots: { ...s.snapshots, [key]: next } };
        }),

      touchVisit: () => set({ lastVisit: Date.now() }),

      claimTier: (key) =>
        set((s) => {
          const c = s.progress[key];
          if (!c) return {};
          const lvl = levelFor(c.xp).level;
          const target = tierIndex(lvl);
          const cur = c.claimedTier ?? target;
          if (cur >= target) return {}; // nothing owed
          const claimedTier = cur + 1;
          const next = { ...c, claimedTier };
          const tierName = TIERS[claimedTier].name;
          const now = Date.now();
          const ev: CareerEvent = { id: `${now}-trial-${Math.random().toString(36).slice(2, 6)}`, ts: now, kind: "trial", title: `Won the ${tierName} trial`, tier: tierName, level: lvl, won: true };
          const events = { ...s.events, [key]: appendCapped(s.events[key], ev) };
          const flash: EvolutionFlash = { key, won: true, leveledUp: false, newLevel: lvl, tieredUp: true, tier: tierName, unlocked: TIER_UNLOCK[tierName] ?? null };
          return { progress: { ...s.progress, [key]: next }, events, lastEvolution: flash };
        }),

      setStrat: (key, strat) =>
        set((s) => ({ recipes: { ...s.recipes, [key]: { ...(s.recipes[key] || {}), strat } } })),
      setNick: (key, nick) =>
        set((s) => {
          const cur = s.recipes[key] || { strat: { ...DEFAULT_STRAT } };
          const clean = nick.trim().slice(0, 24).replace(/[^\w\s\-'.]/g, "");
          return { recipes: { ...s.recipes, [key]: { ...cur, nick: clean || undefined } } };
        }),
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

      applyImprint: (key, { note, dial }) =>
        set((s) => {
          const cur = s.recipes[key] || { strat: { ...DEFAULT_STRAT } };
          const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
          const strat = { ...(cur.strat || DEFAULT_STRAT) };
          const d = clampDial(dial);
          if (d.risk) strat.risk = clamp(strat.risk + d.risk);
          if (d.focus) strat.focus = clamp(strat.focus + d.focus);
          if (d.aggression) strat.aggression = clamp(strat.aggression + d.aggression);
          const trimmed = note.trim().slice(0, 160);
          const memory = trimmed
            ? [trimmed, ...(cur.memory || []).filter((n) => !n.startsWith(trimmed.split(" ").slice(0, 3).join(" ")))].slice(0, 6)
            : cur.memory || [];
          const recipes = { ...s.recipes, [key]: { ...cur, strat, memory } };
          const now = Date.now();
          const ev: CareerEvent = { id: `${now}-imprint-${Math.random().toString(36).slice(2, 6)}`, ts: now, kind: "imprint", title: "Took a lesson to heart", detail: trimmed || undefined };
          const events = { ...s.events, [key]: appendCapped(s.events[key], ev) };
          let snapshots = s.snapshots;
          const c = s.progress[key];
          if (c) {
            const lvl = levelFor(c.xp).level;
            if (shouldSnapshot(s.snapshots[key], lvl, now)) {
              snapshots = { ...s.snapshots, [key]: [...(s.snapshots[key] || []), { ts: now, level: lvl, axes: styleFrom(c) }].slice(-SNAP_CAP) };
            }
          }
          return { recipes, events, snapshots };
        }),

      canImprint: (key, lessonId) => get().imprintDays[key]?.[lessonId] !== imprintDayIndex(),

      imprint: async (key, lessonId) => {
        // Daily cooldown: a lesson only sticks once per champion per UTC day.
        // Guards against spamming the same lesson (which otherwise just saturates
        // the dials into a silent no-op); the UI disables cooled-down buttons too.
        if (!get().canImprint(key, lessonId)) {
          return { reply: "", live: false, applied: false, dial: {} };
        }
        const recipe = get().recipes[key] || { strat: { ...DEFAULT_STRAT } };
        const lesson = lessonById(lessonId);
        let note = lesson?.note ?? "";
        let dial: Partial<Strat> = lesson?.dial ?? {};
        let reply = championImprintAck(key);
        let live = false;
        try {
          const token = getOwnerToken();
          const { useSettings } = await import("@/store/settings");
          const locale = useSettings.getState().locale;
          const res = await fetch("/api/imprint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ownerToken: token,
              key,
              lessonId,
              lesson: lesson?.label,
              persona: recipe.persona,
              memory: recipe.memory,
              strat: recipe.strat,
              locale,
            }),
          });
          if (res.ok) {
            const dta = (await res.json()) as { reply?: string; note?: string; dial?: Partial<Strat>; live?: boolean };
            note = dta.note ?? note;
            dial = dta.dial ?? dial;
            reply = (dta.reply ?? reply).toString();
            live = !!dta.live;
          }
        } catch {
          /* offline / error → deterministic preset applied below */
        }
        get().applyImprint(key, { note, dial });
        const day = imprintDayIndex();
        set((s) => ({ imprintDays: { ...s.imprintDays, [key]: { ...(s.imprintDays[key] || {}), [lessonId]: day } } }));
        return { reply, live, applied: true, dial: clampDial(dial) };
      },

      // Adopting a champion also implicitly recruits it into the roster, so your
      // starter never shows as "locked" in the collection.
      setOwned: (key) =>
        set((s) => {
          const guestXp = !s.owned ? guestDepthXp(takeGuestClimbDepth()) : 0;
          // Switching active mind can inherit a retirement heirloom wing.
          if (typeof window !== "undefined") consumePendingHeirloom();
          return {
            owned: key,
            roster: s.roster.includes(key) ? s.roster : [...s.roster, key],
            events: ensureClaimed(s.events, key),
            ...(guestXp > 0 ? { trainerXp: s.trainerXp + guestXp } : {}),
          };
        }),

      // The ORIGIN moment: the very first champion a player adopts starts life as
      // a true rookie (level 1, ROOKIE tier) so they actually live the rookie →
      // legend arc instead of inheriting one of the house's seeded veteran
      // careers. We keep only a faint trace of the mind's signature axis so it
      // still reads as itself. Guarded on `owned`: once you have a champion, later
      // adoptions just recruit the established mind at its canon career — only
      // your first, your origin, is reset to green. Mock-battle outcomes don't use
      // career XP (movesets come from the creature key), so the scripted first
      // duel plays out identically.
      // Guest Climb depth (if any) converts into the first Trainer mark here.
      adoptStarterRookie: (key) =>
        set((s) => {
          if (typeof window !== "undefined") consumePendingHeirloom();
          if (s.owned) return { owned: key, roster: s.roster.includes(key) ? s.roster : [...s.roster, key], events: ensureClaimed(s.events, key) };
          const guestXp = guestDepthXp(takeGuestClimbDepth());
          const rookie = blank();
          const dir = SEED.find(([k]) => k === key);
          if (dir) (rookie[dir[2]] as number) = 5;
          return {
            owned: key,
            roster: s.roster.includes(key) ? s.roster : [...s.roster, key],
            progress: { ...s.progress, [key]: rookie },
            events: ensureClaimed(s.events, key),
            ...(guestXp > 0 ? { trainerXp: s.trainerXp + guestXp } : {}),
          };
        }),

      retireOwned: () => {
        const s = get();
        const key = s.owned;
        if (!key) return { ok: false, detail: "No active champion." };
        const champ = s.progress[key] || blank();
        if (!canRetire(champ)) {
          return { ok: false, detail: "Raise them further — rank 8, 12 wins, or 20 battles." };
        }
        const name = ROSTER[key]?.name ?? key;
        const result = retireToLegacy(key, champ, name);
        if (!result) return { ok: false, detail: "Already sealed into legend." };
        const now = Date.now();
        const sealed: CareerEvent = {
          id: `${now}-sealed-${key}`,
          ts: now,
          kind: "sealed",
          title: "Sealed in the Long Vault",
          detail: result.heirloom.gloss,
        };
        set((st) => ({
          owned: null,
          events: {
            ...st.events,
            [key]: [sealed, ...(st.events[key] || [])].slice(0, 80),
          },
        }));
        return { ok: true, detail: result.heirloom.gloss };
      },

      isRecruited: (key) => {
        const s = get();
        return s.owned === key || s.roster.includes(key);
      },
      recruit: async (key) => {
        const s = get();
        if (s.owned === key || s.roster.includes(key)) return false; // already yours
        // Unlock Ladder — roster slots drip with Trainer rank.
        const slots = recruitSlotsOpen(trainerLevel(s.trainerXp).level);
        const count = new Set([...(s.owned ? [s.owned] : []), ...s.roster]).size;
        if (count >= slots) return false;
        const res = await walletEvent("recruit");
        if (res) {
          if (!res.ok) return false; // server: can't afford
          set((st) => ({ crowns: res.balance, roster: [...st.roster, key] }));
          return true;
        }
        // offline fallback: optimistic local spend (reconciled by syncWallet)
        if (s.crowns < RECRUIT_COST) return false;
        set((st) => ({ crowns: st.crowns - RECRUIT_COST, roster: [...st.roster, key] }));
        return true;
      },

      setBalance: (n) => set({ crowns: Math.max(0, Math.round(n)) }),
      syncWallet: async () => {
        const balance = await fetchBalance();
        if (balance != null) set({ crowns: balance });
      },
      awardGauntlet: async (amount) => {
        const amt = Math.max(0, Math.round(amount));
        if (amt <= 0) return;
        const claimId = `g-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
        const res = await walletEvent("gauntlet", amt, claimId);
        if (res?.ok) set({ crowns: res.balance });
        else if (!res) set((s) => ({ crowns: s.crowns + amt })); // offline: optimistic
        // online reject (cap / duplicate): leave balance alone — server truth wins on sync
      },
      claimMilestone: async (claimId) => {
        const id = claimId.trim();
        if (!id) return false;
        const res = await walletEvent("milestone", undefined, id);
        if (res?.ok) {
          set({ crowns: res.balance });
          return true;
        }
        // offline: optimistic credit using the shared resolver (server reconciles)
        if (!res) {
          const amt = milestoneCrowns(id);
          if (amt != null && amt > 0) {
            set((s) => ({ crowns: s.crowns + amt }));
            return true;
          }
        }
        return false;
      },
      commitBet: async (stake, side, nonce) => {
        const res = await commitBetRequest(stake, side, nonce);
        if (res) {
          if (!res.ok) return false; // server rejected (can't afford)
          set({ crowns: res.balance });
          return true;
        }
        // offline: optimistic local debit (reconciled by syncWallet on reconnect)
        if (get().crowns < stake) return false;
        set((s) => ({ crowns: s.crowns - stake }));
        return true;
      },

      claimNode: async (id, reward) => {
        const day = today();
        const led = get().nodes;
        const claimed = led.day === day ? led.claimed : [];
        if (claimed.includes(id)) return false;
        const crownReward = reward.crowns ?? 0;
        let balance: number | null = null;
        if (crownReward > 0) {
          const res = await walletEvent("cache", crownReward, id);
          if (res?.ok) balance = res.balance;
          else if (!res) balance = null; // offline — optimistic below
          else return false; // online reject: already claimed / capped
        }
        set((s) => ({
          crowns: balance != null ? balance : s.crowns + crownReward,
          fragments: s.fragments + (reward.fragments ?? 0),
          nodes: { day, claimed: [...claimed, id] },
          trainerXp: s.trainerXp + (reward.fragments ? TRAINER_XP.cacheFragment : 0) + (reward.crowns ? TRAINER_XP.cacheCrown : 0),
        }));
        return true;
      },

      completeGoal: async (id, reward) => {
        const season = currentSeasonNumber();
        const led = get().goals;
        const done = led.season === season ? led.done : [];
        if (done.includes(id)) return false;
        const crownReward = reward.crowns ?? 0;
        let balance: number | null = null;
        if (crownReward > 0) {
          const res = await walletEvent("goal", crownReward, id);
          if (res?.ok) balance = res.balance;
          else if (!res) balance = null;
          else return false;
        }
        set((s) => {
          let forcePoints = s.forcePoints;
          if (reward.seasonPoints && s.force) {
            const base = forcePoints.season === season ? forcePoints.points : 0;
            forcePoints = { season, points: base + reward.seasonPoints };
          }
          return {
            crowns: balance != null ? balance : s.crowns + crownReward,
            fragments: s.fragments + (reward.fragments ?? 0),
            trainerXp: s.trainerXp + (reward.trainerXp ?? 0),
            goals: { season, done: [...done, id] },
            forcePoints,
          };
        });
        return true;
      },

      awardTrainerXp: (n) => set((s) => ({ trainerXp: s.trainerXp + Math.max(0, Math.round(n)) })),
      canChangeClan: () => {
        const s = get();
        return s.force === null || s.forceSeason !== currentSeasonNumber();
      },
      pledgeForce: (f) => {
        const season = currentSeasonNumber();
        const s = get();
        // one Clan per season — already joined this season is a hard no-op
        if (s.force !== null && s.forceSeason === season) return false;
        set({
          force: f,
          forceSeason: season,
          // a fresh season resets the contribution tally to the new Clan
          forcePoints: s.forcePoints.season === season ? s.forcePoints : { season, points: 0 },
        });
        return true;
      },
      // a paid training session: spends Crowns, adds XP + nudges style axes toward
      // the recipe dials — so money visibly evolves the body and shifts the build.
      trainChampion: async (key) => {
        const res = await walletEvent("train");
        if (res) {
          if (!res.ok) return false; // server says you can't afford it
          set((s) => {
            const evolved = evolveTrained(s.progress[key], s.recipes[key]?.strat);
            const patch = trainPatch(s.events, s.snapshots, s.owned === key || s.roster.includes(key), key, evolved);
            return { progress: { ...s.progress, [key]: evolved }, crowns: res.balance, trainerXp: s.trainerXp + TRAINER_XP.train, ...patch };
          });
          return true;
        }
        // offline fallback: optimistic local spend
        if (get().crowns < TRAIN_COST) return false;
        set((s) => {
          const evolved = evolveTrained(s.progress[key], s.recipes[key]?.strat);
          const patch = trainPatch(s.events, s.snapshots, s.owned === key || s.roster.includes(key), key, evolved);
          return { progress: { ...s.progress, [key]: evolved }, crowns: s.crowns - TRAIN_COST, trainerXp: s.trainerXp + TRAINER_XP.train, ...patch };
        });
        return true;
      },

      // a fragment found in the wilds buys the same session for free — exploration
      // feeds champion power directly.
      trainWithFragment: (key) => {
        if (get().fragments < 1) return false;
        set((s) => {
          const evolved = evolveTrained(s.progress[key], s.recipes[key]?.strat);
          const patch = trainPatch(s.events, s.snapshots, s.owned === key || s.roster.includes(key), key, evolved);
          return { progress: { ...s.progress, [key]: evolved }, fragments: s.fragments - 1, trainerXp: s.trainerXp + TRAINER_XP.train, ...patch };
        });
        return true;
      },

      buyFragment: async () => {
        const res = await walletEvent("fragment_buy");
        if (res) {
          if (!res.ok) return false;
          set((s) => ({ crowns: res.balance, fragments: s.fragments + 1 }));
          return true;
        }
        if (get().crowns < FRAGMENT_BUY) return false;
        set((s) => ({ crowns: s.crowns - FRAGMENT_BUY, fragments: s.fragments + 1 }));
        return true;
      },
      sellFragment: async () => {
        if (get().fragments < 1) return false;
        const res = await walletEvent("fragment_sell");
        if (res) {
          if (!res.ok) return false; // server has no fragment inventory
          set((s) => ({ fragments: Math.max(0, s.fragments - 1), crowns: res.balance }));
          return true;
        }
        // offline: optimistic local sell
        set((s) => ({ fragments: s.fragments - 1, crowns: s.crowns + FRAGMENT_SELL }));
        return true;
      },

      recordBattle: (winnerKey, loserKey, styles) =>
        set((s) => {
          const progress = { ...s.progress };
          const w = { ...(progress[winnerKey] || blank()) };
          const l = { ...(progress[loserKey] || blank()) };
          const dw = applyResult(w, { won: true, style: styles[winnerKey] || blankStyle() });
          const dl = applyResult(l, { won: false, style: styles[loserKey] || blankStyle() });
          progress[winnerKey] = w;
          progress[loserKey] = l;
          recordArena(progress, winnerKey, loserKey); // arena ELO: the honest climb

          // capture the OWNED champion's growth so the HUD can celebrate it. Under
          // the TRIALS flag a tier crossing is NOT auto-granted: we flag it as a
          // pending trial instead of firing the tier-up now (grounds runs the
          // trial, then calls claimTier to pay off the celebration).
          let lastEvolution = s.lastEvolution;
          const ownedDelta = s.owned === winnerKey ? dw : s.owned === loserKey ? dl : null;
          if (ownedDelta) {
            const gateTrial = TRIALS && ownedDelta.pendingTrial;
            const showTier = ownedDelta.tieredUp && !gateTrial;
            if (ownedDelta.leveledUp || showTier || gateTrial) {
              lastEvolution = {
                key: s.owned!,
                won: s.owned === winnerKey,
                leveledUp: ownedDelta.leveledUp,
                newLevel: ownedDelta.newLevel,
                tieredUp: showTier,
                tier: ownedDelta.tier,
                unlocked: showTier ? TIER_UNLOCK[ownedDelta.tier] ?? null : null,
                pendingTrial: gateTrial || undefined,
              };
            }
          }

          // The Saga ledger: write a life event for any of the player's OWN
          // champions in this bout (owned or recruited) — never for a random
          // matchup the player only spectated. Milestones (level/tier) ride
          // alongside the bout so the biography reads in order.
          const events = { ...s.events };
          const snapshots = { ...s.snapshots };
          const now = Date.now();
          const mine = (k: string) => s.owned === k || s.roster.includes(k);
          const sides: { key: string; delta: typeof dw; won: boolean; opp: string }[] = [
            { key: winnerKey, delta: dw, won: true, opp: loserKey },
            { key: loserKey, delta: dl, won: false, opp: winnerKey },
          ];
          for (const side of sides) {
            if (!mine(side.key)) continue;
            const oppName = nameOf(side.opp);
            const push = (ev: CareerEvent) => {
              events[side.key] = appendCapped(events[side.key], ev);
            };
            const stamp = (kind: CareerEventKind, salt: string): string => `${now}-${kind}-${salt}`;
            // A tier crossing on the OWNED champion is "gated" under TRIALS: the
            // tier isn't earned until a trial is won, so we don't stamp `tierup`
            // yet (claimTier does, as a `trial` event) and we pin claimedTier to
            // the pre-crossing tier so its body waits.
            const afterTier = tierIndex(side.delta.newLevel);
            const gated = TRIALS && side.key === s.owned && side.delta.pendingTrial;
            progress[side.key].claimedTier = gated ? Math.max(0, afterTier - 1) : afterTier;
            push({
              id: stamp("bout", side.key),
              ts: now,
              kind: "bout",
              won: side.won,
              opponent: oppName,
              title: side.won ? `Defeated ${oppName}` : `Lost to ${oppName}`,
              level: side.delta.newLevel,
            });
            if (side.delta.leveledUp && (!side.delta.tieredUp || gated)) {
              push({ id: stamp("levelup", side.key), ts: now + 1, kind: "levelup", title: `Reached level ${side.delta.newLevel}`, level: side.delta.newLevel });
            }
            if (side.delta.tieredUp && !gated) {
              push({ id: stamp("tierup", side.key), ts: now + 1, kind: "tierup", title: `Rose to ${side.delta.tier}`, tier: side.delta.tier, level: side.delta.newLevel });
            }
            // snapshot the (post-bout) axes if the build shifted
            const lvl = levelFor(progress[side.key].xp).level;
            if (shouldSnapshot(snapshots[side.key], lvl, now)) {
              snapshots[side.key] = [...(snapshots[side.key] || []), { ts: now, level: lvl, axes: styleFrom(progress[side.key]) }].slice(-SNAP_CAP);
            }
          }

          // trainer rank accrual + Force meta-war contribution (only when the
          // player's own champion is in the bout)
          let trainerXp = s.trainerXp;
          let forcePoints = s.forcePoints;
          const iWon = s.owned === winnerKey;
          const iFought = iWon || s.owned === loserKey;
          if (iFought) trainerXp += iWon ? TRAINER_XP.boutWin : TRAINER_XP.boutLoss;
          if (iWon && s.force) {
            const season = currentSeasonNumber();
            const base = forcePoints.season === season ? forcePoints.points : 0;
            forcePoints = { season, points: base + 1 };
          }
          return { progress, trainerXp, forcePoints, lastEvolution, events, snapshots };
        }),

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
            trainerXp: s.trainerXp + (r.winnerCorrect ? TRAINER_XP.dailyCorrect : 0),
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
        // never restore a stale evolution flash across reloads; default the v5
        // saga ledger fields for pre-v5 caches that never had them.
        return {
          ...current,
          ...p,
          progress,
          events: p.events && typeof p.events === "object" ? p.events : {},
          snapshots: p.snapshots && typeof p.snapshots === "object" ? p.snapshots : {},
          imprintDays: p.imprintDays && typeof p.imprintDays === "object" ? p.imprintDays : {},
          climb: p.climb != null ? sanitizeClimb(p.climb) : { ...EMPTY_CLIMB, firstLit: {} },
          lastVisit: typeof p.lastVisit === "number" ? p.lastVisit : 0,
          lastEvolution: null,
        } as ChampionStore;
      },
    },
  ),
);
