// Shared-world domain logic: seed the house ladder, claim/register champions,
// run ranked bouts that update the ONE global ELO, and read the live feed.
import "server-only";
import { battleEvents, type SideConfig } from "@/lib/engine/battle";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import { hasExternalAgent } from "@/lib/engine/side-config";
import type { CreatureType } from "@/lib/types";
import { BET_PAYOUT_MULT, GROUNDS_WIN_REWARD, HOME_WIN_BONUS, HOME_WAR_WEIGHT } from "@/lib/economy";
import { getStore, type FeedEntry, type LadderChampion } from "./store";
import { creditWarWin } from "./war";
import { track } from "./track";
import { safeHttpAgentEndpoint } from "./url-safety";

export const BASE_RATING = 1000;
const ELO_K = 32;

function shortId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 12);
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function sideOf(c: LadderChampion): SideConfig {
  const cfg: SideConfig = { strat: c.strat };
  if (c.brain.provider === "http" && c.brain.endpoint) cfg.agent = { provider: "http", endpoint: c.brain.endpoint };
  return cfg;
}

// Seed the First Minds as permanent house champions so the ladder is never empty
// and there are always opponents for the cron league. Idempotent per roster key —
// new minds added to ROSTER are backfilled on the next ensureSeeded() call.
export async function ensureSeeded(): Promise<void> {
  const store = getStore();
  const entries = Object.entries(ROSTER);
  await Promise.all(
    entries.map(async ([key, c], i) => {
      const id = `house-${key}`;
      if (await store.getChampion(id)) return;
      await store.putChampion({
        id,
        key,
        name: c.name,
        handle: "HOUSE",
        type: c.type as CreatureType,
        brain: { provider: "grok" },
        strat: { risk: 45 + i * 3, focus: 50, aggression: 48 + i * 2 },
        rating: BASE_RATING,
        wins: 0,
        losses: 0,
        battles: 0,
        house: true,
        ownerToken: "",
        createdAt: Date.now(),
      });
    }),
  );
}

export interface ClaimInput {
  ownerToken: string;
  handle?: string;
  key: string; // base roster creature
  name?: string;
  brain?: { provider: "grok" | "http"; endpoint?: string };
  strat?: { risk: number; focus: number; aggression: number };
}

export async function claimChampion(input: ClaimInput): Promise<LadderChampion | { error: string }> {
  const key = input.key.toUpperCase();
  const base = ROSTER[key];
  if (!base) return { error: "unknown creature" };
  if (!input.ownerToken) return { error: "missing owner token" };
  const endpoint = input.brain?.provider === "http" && input.brain.endpoint ? await safeHttpAgentEndpoint(input.brain.endpoint) : null;
  if (input.brain?.provider === "http" && input.brain.endpoint && !endpoint) return { error: "agent endpoint must be a public https URL" };
  const brain = endpoint ? { provider: "http" as const, endpoint } : { provider: "grok" as const };
  const champ: LadderChampion = {
    id: shortId(),
    key,
    name: (input.name?.trim() || base.name).slice(0, 24),
    handle: (input.handle?.trim() || "").slice(0, 24),
    type: base.type as CreatureType,
    brain,
    strat: {
      risk: clamp(input.strat?.risk ?? 50),
      focus: clamp(input.strat?.focus ?? 50),
      aggression: clamp(input.strat?.aggression ?? 50),
    },
    rating: BASE_RATING,
    wins: 0,
    losses: 0,
    battles: 0,
    house: false,
    ownerToken: input.ownerToken.slice(0, 64),
    createdAt: Date.now(),
  };
  const store = getStore();
  await store.putChampion(champ);
  await store.addOwned(champ.ownerToken, champ.id);
  await track("claim", champ.ownerToken);
  return champ;
}

// Ensure the player has a single ladder presence for the base creature they're
// fielding in the Grounds — their "mirror". Created lazily the first time they
// fight ranked, so claiming on /standings is no longer a prerequisite for the
// 3D world to feed the global ladder. Idempotent per (token, key).
export async function ensureMirror(
  ownerToken: string,
  key: string,
  handle?: string,
  strat?: { risk: number; focus: number; aggression: number },
): Promise<LadderChampion | null> {
  const K = key.toUpperCase();
  const base = ROSTER[K];
  if (!base || !ownerToken) return null;
  const store = getStore();
  const owned = await store.getOwned(ownerToken);
  const existing = owned.find((c) => c.key === K && !c.house);
  if (existing) return existing;
  const champ: LadderChampion = {
    id: shortId(),
    key: K,
    name: base.name,
    handle: (handle?.trim() || "").slice(0, 24),
    type: base.type as CreatureType,
    brain: { provider: "grok" },
    strat: {
      risk: clamp(strat?.risk ?? 50),
      focus: clamp(strat?.focus ?? 50),
      aggression: clamp(strat?.aggression ?? 50),
    },
    rating: BASE_RATING,
    wins: 0,
    losses: 0,
    battles: 0,
    house: false,
    ownerToken: ownerToken.slice(0, 64),
    createdAt: Date.now(),
  };
  await store.putChampion(champ);
  await store.addOwned(champ.ownerToken, champ.id);
  return champ;
}

// Apply a KNOWN bout outcome (decided by the live engine, not claimed by the
// client) to the shared ladder: bumps both ratings, records W/L, pushes the
// feed. This is how a fight in the 3D Grounds moves the one global rating.
export interface BoutSettlement {
  mine: number;
  opp: number;
  delta: number;
  crowns: number; // win reward credited to the wallet (0 on a loss)
  balance: number; // authoritative wallet balance after reward + bet settlement
  bet: { stake: number; won: boolean; payout: number } | null; // null = no wager on this bout
  home: boolean; // win earned in a region aligned to the player's Clan (home advantage)
}

export async function recordGroundsBout(args: {
  ownerToken: string;
  myKey: string;
  oppId: string;
  iWon: boolean;
  topic?: string;
  handle?: string;
  strat?: { risk: number; focus: number; aggression: number };
  betNonce?: string; // settles the matching commit-reveal wager, if any
  regionBias?: CreatureType | null; // the Force this region rewards (for home advantage)
}): Promise<BoutSettlement | null> {
  await ensureSeeded();
  const store = getStore();
  const mine = await ensureMirror(args.ownerToken, args.myKey, args.handle, args.strat);
  if (!mine) return null;
  const opp = await store.getChampion(args.oppId);
  if (!opp || opp.id === mine.id) return null;

  const winner = args.iWon ? mine : opp;
  const loser = args.iWon ? opp : mine;
  const exp = expectedScore(winner.rating, loser.rating);
  const delta = Math.round(ELO_K * (1 - exp));
  winner.rating += delta;
  loser.rating -= delta;
  winner.wins += 1;
  loser.losses += 1;
  winner.battles += 1;
  loser.battles += 1;

  await Promise.all([store.putChampion(winner), store.putChampion(loser)]);
  await store.pushFeed({
    t: Date.now(),
    winner: winner.name,
    loser: loser.name,
    topic: args.topic || "Grounds duel",
    delta,
    mode: "ladder",
  });
  // Home advantage: a win in a region aligned to the player's pledged Clan pays
  // bonus Crowns and counts double in the war. The pledge is read from the
  // authoritative save (sanitised server-side), so the perk can't be forged.
  let home = false;
  if (args.iWon) {
    let force: CreatureType | null = null;
    try {
      const save = await store.getSave(args.ownerToken);
      force = save?.force ?? null;
    } catch {
      /* save read is best-effort */
    }
    home = !!force && !!args.regionBias && force === args.regionBias;
    try {
      // credit the season war (double when fighting under your own Clan's region)
      await creditWarWin(args.ownerToken, force, home ? HOME_WAR_WEIGHT : 1);
    } catch {
      // war credit is best-effort — never break the bout result over it
    }
  }

  // The bout reward is decided HERE, off the engine-verified outcome, and CREDITED
  // to the authoritative wallet — the client just mirrors the returned balance.
  const crowns = args.iWon ? GROUNDS_WIN_REWARD + (home ? HOME_WIN_BONUS : 0) : 0;
  let balance = await store.getWallet(args.ownerToken);
  if (crowns > 0) balance = (await store.adjustWallet(args.ownerToken, crowns)).balance;

  // Settle a commit-reveal wager, but only the one tied to THIS bout (nonce match)
  // so an abandoned bet can never settle on a later, unrelated fight.
  let bet: BoutSettlement["bet"] = null;
  const pending = await store.getPendingBet(args.ownerToken);
  if (pending && args.betNonce && pending.nonce === args.betNonce) {
    const betWon = (pending.side === "me" && args.iWon) || (pending.side === "opp" && !args.iWon);
    let payout = 0;
    if (betWon) {
      payout = pending.stake * BET_PAYOUT_MULT;
      balance = (await store.adjustWallet(args.ownerToken, payout)).balance;
    }
    await store.clearPendingBet(args.ownerToken);
    bet = { stake: pending.stake, won: betWon, payout };
  }

  // Behaviour analytics (best-effort, never blocks the result): a player bout
  // happened, who won, Crowns earned, and any winning wager.
  await track("bout", args.ownerToken);
  if (args.iWon) await track("bout_win");
  if (crowns > 0) await track("earn", undefined, crowns);
  if (bet?.won) await track("bet_win", undefined, 1);

  return { mine: mine.rating, opp: opp.rating, delta, crowns, balance, bet, home };
}

export interface TrainInput {
  ownerToken: string;
  id: string;
  strat?: Partial<{ risk: number; focus: number; aggression: number }>;
  brain?: { provider: "grok" | "http"; endpoint?: string };
}

// Retune an owned champion's doctrine (and/or swap its brain) between bouts —
// the "train how it thinks" loop. Owner-token gated; house champions are locked.
export async function trainChampion(input: TrainInput): Promise<LadderChampion | { error: string }> {
  if (!input.ownerToken) return { error: "missing owner token" };
  const store = getStore();
  const champ = await store.getChampion(input.id);
  if (!champ) return { error: "champion not found" };
  if (champ.ownerToken !== input.ownerToken) return { error: "not your champion" };
  if (champ.house) return { error: "house champions cannot be trained" };
  if (input.strat) {
    champ.strat = {
      risk: clamp(input.strat.risk ?? champ.strat.risk),
      focus: clamp(input.strat.focus ?? champ.strat.focus),
      aggression: clamp(input.strat.aggression ?? champ.strat.aggression),
    };
  }
  if (input.brain) {
    const endpoint = input.brain.provider === "http" && input.brain.endpoint ? await safeHttpAgentEndpoint(input.brain.endpoint) : null;
    if (input.brain.provider === "http" && input.brain.endpoint && !endpoint) return { error: "agent endpoint must be a public https URL" };
    champ.brain =
      endpoint
        ? { provider: "http", endpoint }
        : { provider: "grok" };
  }
  await store.putChampion(champ);
  await track("train", champ.ownerToken);
  return champ;
}

function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// Run one ranked bout and persist the result to the shared ladder + feed.
// Returns a compact summary, or null if the matchup is invalid.
export async function runRankedBout(idA: string, idB: string): Promise<{ winner: string; loser: string; delta: number; topic: string } | null> {
  const store = getStore();
  const [a, b] = await Promise.all([store.getChampion(idA), store.getChampion(idB)]);
  if (!a || !b || a.id === b.id) return null;

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const sideA = sideOf(a);
  const sideB = sideOf(b);
  const mock = !hasExternalAgent(sideA, sideB);

  let aHp = 100;
  let bHp = 100;
  for await (const ev of battleEvents(a.key, b.key, topic, mock, null, sideA, sideB)) {
    if (ev.type === "end") {
      aHp = ev.a_hp;
      bHp = ev.b_hp;
    }
  }

  // Attribute by side/HP — base creature keys can collide, names can repeat.
  const aWon = aHp > 0 && bHp === 0 ? true : bHp > 0 && aHp === 0 ? false : aHp >= bHp;
  const winner = aWon ? a : b;
  const loser = aWon ? b : a;

  const exp = expectedScore(winner.rating, loser.rating);
  const delta = Math.round(ELO_K * (1 - exp));
  winner.rating += delta;
  loser.rating -= delta;
  winner.wins += 1;
  loser.losses += 1;
  winner.battles += 1;
  loser.battles += 1;

  await Promise.all([store.putChampion(winner), store.putChampion(loser)]);
  const entry: FeedEntry = { t: Date.now(), winner: winner.name, loser: loser.name, topic, delta, mode: "ladder" };
  await store.pushFeed(entry);
  return { winner: winner.name, loser: loser.name, delta, topic };
}

// Pick two distinct champions weighted toward owned (non-house) ones so player
// champions actually play; falls back to any two when the ladder is small.
export async function pickMatchup(): Promise<[string, string] | null> {
  const store = getStore();
  const top = await store.topChampions(50);
  if (top.length < 2) return null;
  const owned = top.filter((c) => !c.house);
  const pool = top;
  const a = (owned.length ? owned : pool)[Math.floor(Math.random() * (owned.length || pool.length))];
  let b = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (b.id === a.id && guard++ < 10) b = pool[Math.floor(Math.random() * pool.length)];
  if (b.id === a.id) return null;
  return [a.id, b.id];
}

// Run one bout for a specific champion against a random ladder opponent.
export async function challengeChampion(id: string): Promise<{ winner: string; loser: string; delta: number; topic: string } | null> {
  await ensureSeeded();
  const store = getStore();
  const me = await store.getChampion(id);
  if (!me) return null;
  const pool = (await store.topChampions(50)).filter((c) => c.id !== id);
  if (!pool.length) return null;
  const opp = pool[Math.floor(Math.random() * pool.length)];
  return runRankedBout(id, opp.id);
}

export async function getLadder(limit = 50): Promise<LadderChampion[]> {
  await ensureSeeded();
  return getStore().topChampions(limit);
}

export async function getFeed(limit = 20): Promise<FeedEntry[]> {
  return getStore().getFeed(limit);
}

export async function getOwned(token: string): Promise<LadderChampion[]> {
  if (!token) return [];
  return getStore().getOwned(token);
}
