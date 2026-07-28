// Server-side persistence for the SHARED world: one global ladder, registered
// champions, and a live bout feed. Backed by Upstash Redis when configured,
// with an in-memory fallback so dev/build/preview never crash before the store
// is provisioned. The in-memory backend is per-instance (not shared) — fine for
// local dev, but the real shared ladder requires the Redis env vars.
import "server-only";
import { Redis } from "@upstash/redis";
import type { AxisSnapshot, CareerEvent, CareerEventKind, CreatureType, ForcePoints, PlayerSave, Recipe, Style } from "@/lib/types";
import { sanitizeClimb } from "@/lib/climb-campaign";
import { STARTING_CROWNS } from "@/lib/economy";

const FORCES: readonly CreatureType[] = ["LOGIC", "CHAOS", "COMPOSURE", "RHETORIC", "CREATIVITY"];

// Coerce an untrusted pledge into a valid Force or null — the server is the last
// line of defence, so a junk `force` can never poison the war aggregation.
function cleanForce(raw: unknown): CreatureType | null {
  return typeof raw === "string" && (FORCES as readonly string[]).includes(raw) ? (raw as CreatureType) : null;
}

function cleanForcePoints(raw: unknown): ForcePoints {
  const p = (raw ?? {}) as Partial<ForcePoints>;
  const season = Number(p.season);
  const points = Number(p.points);
  return {
    season: Number.isFinite(season) && season >= 1 ? Math.floor(season) : 1,
    // clamp: points can't go negative, and a sane ceiling stops a forged blob
    // from ever dominating the season war.
    points: Number.isFinite(points) ? Math.max(0, Math.min(100_000, Math.floor(points))) : 0,
  };
}

// ── Saga ledger (v5) sanitization ────────────────────────────────────────────
// The saga is the player's own biography of their champion; it never gates rank
// or economy, so we only bound it (sizes + string lengths) to keep the save blob
// small and safe — not to arbitrate truth.
const EVENT_KINDS: readonly CareerEventKind[] = ["claimed", "bout", "levelup", "tierup", "trial", "train", "imprint", "keeper", "season", "sealed", "ascent"];
const MAX_EVENTS_PER_CHAMPION = 80;
const MAX_SNAPSHOTS_PER_CHAMPION = 60;
const AXIS_KEYS: readonly (keyof Style)[] = ["aggression", "control", "resilience", "flair", "creativity"];

function cleanEvents(raw: unknown): Record<string, CareerEvent[]> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, CareerEvent[]> = {};
  for (const [key, list] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_PROGRESS_KEYS)) {
    if (!Array.isArray(list)) continue;
    const events: CareerEvent[] = [];
    for (const e of (list as unknown[]).slice(-MAX_EVENTS_PER_CHAMPION)) {
      if (!e || typeof e !== "object") continue;
      const ev = e as Partial<CareerEvent>;
      if (typeof ev.id !== "string" || typeof ev.kind !== "string" || !(EVENT_KINDS as readonly string[]).includes(ev.kind)) continue;
      if (typeof ev.ts !== "number" || !Number.isFinite(ev.ts)) continue;
      events.push({
        id: ev.id.slice(0, 48),
        ts: Math.floor(ev.ts),
        kind: ev.kind as CareerEventKind,
        title: typeof ev.title === "string" ? ev.title.slice(0, 120) : "",
        detail: typeof ev.detail === "string" ? ev.detail.slice(0, 200) : undefined,
        won: typeof ev.won === "boolean" ? ev.won : undefined,
        opponent: typeof ev.opponent === "string" ? ev.opponent.slice(0, 48) : undefined,
        level: typeof ev.level === "number" && Number.isFinite(ev.level) ? Math.floor(ev.level) : undefined,
        tier: typeof ev.tier === "string" ? ev.tier.slice(0, 24) : undefined,
        season: typeof ev.season === "number" && Number.isFinite(ev.season) ? Math.floor(ev.season) : undefined,
        rank: typeof ev.rank === "number" && Number.isFinite(ev.rank) ? Math.floor(ev.rank) : undefined,
      });
    }
    if (events.length) out[key.slice(0, 64)] = events;
  }
  return out;
}

function cleanSnapshots(raw: unknown): Record<string, AxisSnapshot[]> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, AxisSnapshot[]> = {};
  for (const [key, list] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_PROGRESS_KEYS)) {
    if (!Array.isArray(list)) continue;
    const snaps: AxisSnapshot[] = [];
    for (const s of (list as unknown[]).slice(-MAX_SNAPSHOTS_PER_CHAMPION)) {
      if (!s || typeof s !== "object") continue;
      const snap = s as Partial<AxisSnapshot>;
      if (typeof snap.ts !== "number" || !Number.isFinite(snap.ts)) continue;
      const src = (snap.axes ?? {}) as Partial<Style>;
      const axes = {} as Style;
      for (const a of AXIS_KEYS) {
        const v = Number(src[a]);
        axes[a] = Number.isFinite(v) ? Math.max(0, Math.min(1000, v)) : 0;
      }
      snaps.push({
        ts: Math.floor(snap.ts),
        level: typeof snap.level === "number" && Number.isFinite(snap.level) ? Math.floor(snap.level) : 1,
        axes,
      });
    }
    if (snaps.length) out[key.slice(0, 64)] = snaps;
  }
  return out;
}

export interface LadderChampion {
  id: string;
  key: string; // base roster creature (moveset + type)
  name: string; // display name
  handle: string; // owner's public handle (optional, "" if none)
  type: CreatureType;
  brain: { provider: "grok" | "http"; endpoint?: string };
  strat: { risk: number; focus: number; aggression: number };
  rating: number;
  wins: number;
  losses: number;
  battles: number;
  house: boolean; // seeded house champion (always on the ladder)
  ownerToken: string; // "" for house champions
  createdAt: number;
}

export interface FeedEntry {
  t: number; // timestamp
  winner: string; // name
  loser: string; // name
  topic: string;
  delta: number; // rating swing
  mode: "ladder";
}

export interface Store {
  // Liveness probe for the dashboard/health checks. Resolves true when the
  // backing store actually answers (a real Redis round-trip), false on error.
  ping(): Promise<boolean>;
  getChampion(id: string): Promise<LadderChampion | null>;
  putChampion(c: LadderChampion): Promise<void>;
  /** Drop a ladder row (used to prune accidental dex-wide house seeds). */
  removeChampion(id: string): Promise<void>;
  topChampions(limit: number): Promise<LadderChampion[]>;
  countChampions(): Promise<number>;
  pushFeed(e: FeedEntry): Promise<void>;
  getFeed(limit: number): Promise<FeedEntry[]>;
  addOwned(token: string, id: string): Promise<void>;
  getOwned(token: string): Promise<LadderChampion[]>;
  getSave(token: string): Promise<PlayerSave | null>;
  putSave(token: string, save: PlayerSave): Promise<void>;
  // Force war: per-season tally of ranked-win contributions per Force, the input
  // to the season's warLeader. Authoritative — only the server increments it.
  incrWar(season: number, force: CreatureType, by?: number): Promise<void>;
  warStandings(season: number): Promise<Record<CreatureType, number>>;
  // The single Reader's own contribution to the season war — the authoritative
  // counterpart to the client's optimistic forcePoints mirror. Incremented in the
  // SAME path as incrWar so the shown number always matches what actually counted.
  incrWarMember(token: string, season: number, by?: number): Promise<void>;
  warMember(token: string, season: number): Promise<number>;
  // LLM usage accounting: per-UTC-day token/call totals for the house model, so
  // spend is MEASURED (not guessed) before any aggressive monetization.
  incrUsage(day: number, calls: number, inTok: number, outTok: number): Promise<void>;
  getUsage(day: number): Promise<UsageDay>;
  // Per-owner, per-UTC-day Imprint counter — the guardrail that caps how many
  // model-backed lessons one player can spend our budget on in a day. Atomic
  // INCR; returns the post-increment count so the route can gate the LLM call.
  incrImprint(token: string, day: number): Promise<number>;
  // Server-authoritative wallet (online-first): the balance lives here, not in
  // the client save blob. adjustWallet is atomic and rejects overdraft.
  getWallet(token: string): Promise<number>;
  adjustWallet(token: string, delta: number): Promise<WalletResult>;
  // Fragment inventory for buy/sell — Crowns alone can't prove a fragment exists.
  getFragments(token: string): Promise<number>;
  adjustFragments(token: string, delta: number): Promise<WalletResult>;
  // Collection roster (recruited mind keys). Authoritative Redis set so a
  // last-write-wins save blob can't drop a recruit paid for on another device.
  // addRoster unions keys and returns the full set (capped).
  getRoster(token: string): Promise<string[]>;
  addRoster(token: string, keys: string[]): Promise<string[]>;
  // One-shot claim keys (cache node / goal id) — SET NX so the same reward can't
  // be cashed twice. ttlSeconds lets day/season scoped keys self-expire.
  claimOnce(key: string, ttlSeconds: number): Promise<boolean>;
  // Per-owner UTC-day counters for variable earns (total Crowns + gauntlet count).
  incrDailyEarn(token: string, day: number, crowns: number): Promise<number>;
  incrGauntletPayout(token: string, day: number): Promise<number>;
  // Pending bet for commit-reveal betting: staked BEFORE the outcome is known,
  // settled by the server when the engine decides the bout.
  getPendingBet(token: string): Promise<PendingBet | null>;
  setPendingBet(token: string, bet: PendingBet): Promise<void>;
  clearPendingBet(token: string): Promise<void>;
  // Behaviour analytics: per-UTC-day event counters (a hash of {event → count})
  // plus a daily set of distinct owner tokens for active-player counts. Counts
  // are aggregate-only (no per-user trails), so this is privacy-light by design.
  trackEvent(day: number, field: string, by?: number): Promise<void>;
  getEvents(day: number): Promise<Record<string, number>>;
  // Distinct active players. Backed by Redis HyperLogLog (≈12KB/day regardless
  // of volume); uniqueCount unions the given days (DAU/WAU/MAU all fall out).
  trackUnique(day: number, token: string): Promise<void>;
  uniqueCount(days: number[]): Promise<number>;
}

export interface UsageDay {
  calls: number;
  inTok: number;
  outTok: number;
}

export interface WalletResult {
  ok: boolean; // false = overdraft rejected, balance unchanged
  balance: number;
}

export interface PendingBet {
  stake: number;
  side: "me" | "opp";
  nonce: string; // ties the bet to one specific bout
  ts: number;
}

const K = {
  champ: (id: string) => `z:champ:${id}`,
  ladder: "z:ladder",
  feed: "z:feed",
  owner: (token: string) => `z:owner:${token}`,
  save: (token: string) => `z:save:${token}`,
  war: (season: number) => `z:war:${season}`,
  warMember: (token: string, season: number) => `z:warme:${season}:${token}`,
  usage: (day: number) => `z:cost:${day}`,
  imprint: (token: string, day: number) => `z:imp:${day}:${token}`,
  wallet: (token: string) => `z:wallet:${token}`,
  frag: (token: string) => `z:frag:${token}`,
  roster: (token: string) => `z:roster:${token}`,
  claim: (key: string) => `z:claim:${key}`,
  earnDay: (token: string, day: number) => `z:earn:${day}:${token}`,
  gauntletDay: (token: string, day: number) => `z:gpay:${day}:${token}`,
  bet: (token: string) => `z:bet:${token}`,
  events: (day: number) => `z:ev:${day}`,
  dau: (day: number) => `z:dau:${day}`,
};

// A pending bet self-expires so an abandoned wager can never settle on a later bout.
const BET_TTL_SECONDS = 15 * 60;

const USAGE_TTL_SECONDS = 400 * 86_400; // keep ~13 months of daily spend history

// Daily analytics keys self-expire on the same ~13-month horizon as spend, so a
// long history is queryable without the store growing forever.
const ANALYTICS_TTL_SECONDS = 400 * 86_400;

// Old season war tallies expire so the store doesn't accrete dead keys forever.
const WAR_TTL_SECONDS = 120 * 86_400; // ~4 months (a season is 28 days)

function zeroWar(): Record<CreatureType, number> {
  return { LOGIC: 0, CHAOS: 0, COMPOSURE: 0, RHETORIC: 0, CREATIVITY: 0 };
}

const FEED_CAP = 60;
// Defensive caps so one owner's blob can't grow unbounded in the store.
const MAX_PROGRESS_KEYS = 400;
const MAX_RECIPE_KEYS = 400;

// Strip everything we refuse to persist server-side — most importantly model
// API keys, which are client-only by design — and clamp the blob to sane sizes.
// Returns a fresh, safe PlayerSave; the server is the last line of defence even
// if a client sends something it shouldn't.
export function sanitizeSave(raw: unknown): PlayerSave | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<PlayerSave>;
  if (typeof s.progress !== "object" || !s.progress) return null;

  const trim = <T,>(obj: Record<string, T>, max: number): Record<string, T> =>
    Object.fromEntries(Object.entries(obj).slice(0, max));

  const recipes: Record<string, Recipe> = {};
  for (const [key, r] of Object.entries((s.recipes ?? {}) as Record<string, Recipe>).slice(0, MAX_RECIPE_KEYS)) {
    if (!r || typeof r !== "object") continue;
    const agent = r.agent
      ? {
          provider: r.agent.provider,
          model: r.agent.model,
          baseUrl: r.agent.baseUrl,
          endpoint: r.agent.endpoint,
          label: r.agent.label,
          // apiKey deliberately omitted — never stored server-side.
        }
      : undefined;
    const nick =
      typeof r.nick === "string" ? r.nick.trim().slice(0, 24).replace(/[^\w\s\-'.]/g, "") : undefined;
    recipes[key] = { strat: r.strat, persona: r.persona, memory: r.memory, agent, nick: nick || undefined };
  }

  return {
    v: typeof s.v === "number" ? s.v : 1,
    progress: trim(s.progress as Record<string, unknown>, MAX_PROGRESS_KEYS) as PlayerSave["progress"],
    recipes,
    // Crowns intentionally not read from the client blob — the wallet is the
    // authority (see /api/wallet). Any client-supplied balance is ignored.
    owned: typeof s.owned === "string" ? s.owned.slice(0, 64) : null,
    roster: Array.isArray(s.roster)
      ? (s.roster as unknown[]).filter((k): k is string => typeof k === "string").map((k) => k.slice(0, 64)).slice(0, MAX_PROGRESS_KEYS)
      : [],
    trainerXp: typeof s.trainerXp === "number" && Number.isFinite(s.trainerXp) ? Math.max(0, Math.floor(s.trainerXp)) : 0,
    predict:
      s.predict && typeof s.predict === "object"
        ? { streak: Number(s.predict.streak) || 0, best: Number(s.predict.best) || 0 }
        : { streak: 0, best: 0 },
    daily:
      s.daily && typeof s.daily === "object"
        ? s.daily
        : { lastDay: 0, streak: 0, best: 0, plays: 0, result: null },
    force: cleanForce(s.force),
    forceSeason: typeof s.forceSeason === "number" && Number.isFinite(s.forceSeason) ? Math.floor(s.forceSeason) : null,
    forcePoints: cleanForcePoints(s.forcePoints),
    events: cleanEvents(s.events),
    snapshots: cleanSnapshots(s.snapshots),
    lastVisit: typeof s.lastVisit === "number" && Number.isFinite(s.lastVisit) ? Math.floor(s.lastVisit) : undefined,
    climb: s.climb != null ? sanitizeClimb(s.climb) : undefined,
    updatedAt: Date.now(),
  };
}

/** Normalize mind keys for the authoritative collection set. */
export function cleanRosterKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys) {
    if (typeof raw !== "string") continue;
    const k = raw.trim().slice(0, 64);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MAX_PROGRESS_KEYS) break;
  }
  return out;
}

/**
 * Union client/save roster keys into the authoritative set and return the full
 * collection. Seeds from a legacy save blob when the Redis set is still empty.
 */
export async function syncAuthoritativeRoster(
  store: Store,
  token: string,
  keys: string[],
  owned?: string | null,
): Promise<string[]> {
  const seed = cleanRosterKeys([...(keys || []), ...(owned ? [owned] : [])]);
  const existing = await store.getRoster(token);
  if (existing.length === 0 && seed.length === 0) return [];
  if (seed.length === 0) return existing;
  return store.addRoster(token, seed);
}

// ── Upstash backend ──────────────────────────────────────────────────────────
class UpstashStore implements Store {
  constructor(private r: Redis) {}

  async ping() {
    try {
      const pong = await this.r.ping();
      return typeof pong === "string" && pong.toUpperCase() === "PONG";
    } catch {
      return false;
    }
  }
  async getChampion(id: string) {
    return (await this.r.get<LadderChampion>(K.champ(id))) ?? null;
  }
  async putChampion(c: LadderChampion) {
    await this.r.set(K.champ(c.id), c);
    await this.r.zadd(K.ladder, { score: c.rating, member: c.id });
  }
  async removeChampion(id: string) {
    await this.r.del(K.champ(id));
    await this.r.zrem(K.ladder, id);
  }
  async topChampions(limit: number) {
    const ids = (await this.r.zrange<string[]>(K.ladder, 0, limit - 1, { rev: true })) || [];
    if (!ids.length) return [];
    const champs = await Promise.all(ids.map((id) => this.getChampion(id)));
    return champs.filter((c): c is LadderChampion => !!c);
  }
  async countChampions() {
    return (await this.r.zcard(K.ladder)) || 0;
  }
  async pushFeed(e: FeedEntry) {
    await this.r.lpush(K.feed, e);
    await this.r.ltrim(K.feed, 0, FEED_CAP - 1);
  }
  async getFeed(limit: number) {
    return (await this.r.lrange<FeedEntry>(K.feed, 0, limit - 1)) || [];
  }
  async addOwned(token: string, id: string) {
    await this.r.sadd(K.owner(token), id);
  }
  async getOwned(token: string) {
    const ids = (await this.r.smembers(K.owner(token))) || [];
    if (!ids.length) return [];
    const champs = await Promise.all(ids.map((id) => this.getChampion(id)));
    return champs.filter((c): c is LadderChampion => !!c);
  }
  async getSave(token: string) {
    return (await this.r.get<PlayerSave>(K.save(token))) ?? null;
  }
  async putSave(token: string, save: PlayerSave) {
    await this.r.set(K.save(token), save);
  }
  async incrWar(season: number, force: CreatureType, by = 1) {
    await this.r.zincrby(K.war(season), by, force);
    await this.r.expire(K.war(season), WAR_TTL_SECONDS);
  }
  async warStandings(season: number) {
    const out = zeroWar();
    // zrange withScores returns a flat [member, score, member, score, …] array.
    const flat = (await this.r.zrange<(string | number)[]>(K.war(season), 0, -1, { withScores: true })) || [];
    for (let i = 0; i < flat.length; i += 2) {
      const f = String(flat[i]) as CreatureType;
      if (f in out) out[f] = Number(flat[i + 1]) || 0;
    }
    return out;
  }
  async incrWarMember(token: string, season: number, by = 1) {
    await this.r.incrby(K.warMember(token, season), by);
    await this.r.expire(K.warMember(token, season), WAR_TTL_SECONDS);
  }
  async warMember(token: string, season: number) {
    return Number(await this.r.get<number>(K.warMember(token, season))) || 0;
  }
  async incrUsage(day: number, calls: number, inTok: number, outTok: number) {
    const k = K.usage(day);
    await Promise.all([
      this.r.hincrby(k, "calls", calls),
      this.r.hincrby(k, "in", inTok),
      this.r.hincrby(k, "out", outTok),
    ]);
    await this.r.expire(k, USAGE_TTL_SECONDS);
  }
  async getUsage(day: number) {
    const h = (await this.r.hgetall<Record<string, string>>(K.usage(day))) || {};
    return { calls: Number(h.calls) || 0, inTok: Number(h.in) || 0, outTok: Number(h.out) || 0 };
  }
  async incrImprint(token: string, day: number) {
    const k = K.imprint(token, day);
    const n = await this.r.incr(k);
    if (n === 1) await this.r.expire(k, 2 * 86_400); // self-expire after 2 days
    return n;
  }
  private async ensureWallet(token: string) {
    await this.r.set(K.wallet(token), STARTING_CROWNS, { nx: true });
  }
  async getWallet(token: string) {
    await this.ensureWallet(token);
    return Number(await this.r.get<number>(K.wallet(token))) || 0;
  }
  async adjustWallet(token: string, delta: number) {
    await this.ensureWallet(token);
    const d = Math.round(delta);
    const balance = await this.r.incrby(K.wallet(token), d);
    if (balance < 0) {
      // overdraft: atomically undo and report failure with the unchanged balance
      const reverted = await this.r.incrby(K.wallet(token), -d);
      return { ok: false, balance: reverted };
    }
    return { ok: true, balance };
  }
  async getFragments(token: string) {
    return Number(await this.r.get<number>(K.frag(token))) || 0;
  }
  async adjustFragments(token: string, delta: number) {
    const d = Math.round(delta);
    const balance = await this.r.incrby(K.frag(token), d);
    if (balance < 0) {
      const reverted = await this.r.incrby(K.frag(token), -d);
      return { ok: false, balance: Math.max(0, reverted) };
    }
    return { ok: true, balance };
  }
  async getRoster(token: string) {
    const members = (await this.r.smembers(K.roster(token))) || [];
    return cleanRosterKeys(members);
  }
  async addRoster(token: string, keys: string[]) {
    const clean = cleanRosterKeys(keys);
    if (!clean.length) return this.getRoster(token);
    const cur = await this.getRoster(token);
    const room = Math.max(0, MAX_PROGRESS_KEYS - cur.length);
    if (room <= 0) return cur;
    const add = clean.filter((k) => !cur.includes(k)).slice(0, room);
    if (add.length) {
      // Upstash typings want a rest tuple; add one-by-one (small roster caps).
      for (const k of add) await this.r.sadd(K.roster(token), k);
    }
    return this.getRoster(token);
  }
  async claimOnce(key: string, ttlSeconds: number) {
    const k = K.claim(key.slice(0, 180));
    // Upstash returns "OK" on set, null when NX loses the race.
    const ok = await this.r.set(k, 1, { nx: true, ex: Math.max(60, Math.floor(ttlSeconds)) });
    return typeof ok === "string" ? ok === "OK" : Boolean(ok);
  }
  async incrDailyEarn(token: string, day: number, crowns: number) {
    const k = K.earnDay(token, day);
    const d = Math.round(crowns);
    const n = await this.r.incrby(k, d);
    await this.r.expire(k, 2 * 86_400);
    return n;
  }
  async incrGauntletPayout(token: string, day: number) {
    const k = K.gauntletDay(token, day);
    const n = await this.r.incr(k);
    if (n === 1) await this.r.expire(k, 2 * 86_400);
    return n;
  }
  async getPendingBet(token: string) {
    return (await this.r.get<PendingBet>(K.bet(token))) ?? null;
  }
  async setPendingBet(token: string, bet: PendingBet) {
    await this.r.set(K.bet(token), bet, { ex: BET_TTL_SECONDS });
  }
  async clearPendingBet(token: string) {
    await this.r.del(K.bet(token));
  }
  async trackEvent(day: number, field: string, by = 1) {
    const k = K.events(day);
    await this.r.hincrby(k, field, by);
    await this.r.expire(k, ANALYTICS_TTL_SECONDS);
  }
  async getEvents(day: number) {
    const h = (await this.r.hgetall<Record<string, string | number>>(K.events(day))) || {};
    const out: Record<string, number> = {};
    for (const [f, v] of Object.entries(h)) out[f] = Number(v) || 0;
    return out;
  }
  async trackUnique(day: number, token: string) {
    const k = K.dau(day);
    await this.r.pfadd(k, token);
    await this.r.expire(k, ANALYTICS_TTL_SECONDS);
  }
  async uniqueCount(days: number[]) {
    if (!days.length) return 0;
    // PFCOUNT over multiple keys returns the cardinality of their UNION, so
    // WAU/MAU are a single round-trip over the relevant day keys. The client
    // types the first key separately, hence the head/tail split.
    const keys = days.map(K.dau);
    return Number(await this.r.pfcount(keys[0], ...keys.slice(1))) || 0;
  }
}

// ── In-memory fallback (per-instance; not shared across serverless workers) ────
class MemoryStore implements Store {
  private champs = new Map<string, LadderChampion>();
  private feed: FeedEntry[] = [];
  private owners = new Map<string, Set<string>>();
  private saves = new Map<string, PlayerSave>();
  private war = new Map<number, Record<CreatureType, number>>();
  private warMembers = new Map<string, number>(); // `${season}:${token}` → points
  private usage = new Map<number, UsageDay>();
  private imprints = new Map<string, number>(); // `${day}:${token}` → count
  private wallets = new Map<string, number>();
  private frags = new Map<string, number>();
  private rosters = new Map<string, Set<string>>();
  private claims = new Set<string>();
  private earnDay = new Map<string, number>();
  private gauntletDay = new Map<string, number>();
  private bets = new Map<string, PendingBet>();
  private events = new Map<number, Map<string, number>>();
  private dau = new Map<number, Set<string>>();

  async ping() {
    return true; // the in-memory store is always reachable (but never shared)
  }
  async getChampion(id: string) {
    return this.champs.get(id) ?? null;
  }
  async putChampion(c: LadderChampion) {
    this.champs.set(c.id, { ...c });
  }
  async removeChampion(id: string) {
    this.champs.delete(id);
  }
  async topChampions(limit: number) {
    return [...this.champs.values()].sort((a, b) => b.rating - a.rating).slice(0, limit);
  }
  async countChampions() {
    return this.champs.size;
  }
  async pushFeed(e: FeedEntry) {
    this.feed.unshift(e);
    this.feed = this.feed.slice(0, FEED_CAP);
  }
  async getFeed(limit: number) {
    return this.feed.slice(0, limit);
  }
  async addOwned(token: string, id: string) {
    if (!this.owners.has(token)) this.owners.set(token, new Set());
    this.owners.get(token)!.add(id);
  }
  async getOwned(token: string) {
    const ids = [...(this.owners.get(token) ?? [])];
    return ids.map((id) => this.champs.get(id)).filter((c): c is LadderChampion => !!c);
  }
  async getSave(token: string) {
    return this.saves.get(token) ?? null;
  }
  async putSave(token: string, save: PlayerSave) {
    this.saves.set(token, save);
  }
  async incrWar(season: number, force: CreatureType, by = 1) {
    const cur = this.war.get(season) ?? zeroWar();
    cur[force] = (cur[force] ?? 0) + by;
    this.war.set(season, cur);
  }
  async warStandings(season: number) {
    return { ...zeroWar(), ...(this.war.get(season) ?? {}) };
  }
  async incrWarMember(token: string, season: number, by = 1) {
    const k = `${season}:${token}`;
    this.warMembers.set(k, (this.warMembers.get(k) ?? 0) + by);
  }
  async warMember(token: string, season: number) {
    return this.warMembers.get(`${season}:${token}`) ?? 0;
  }
  async incrUsage(day: number, calls: number, inTok: number, outTok: number) {
    const cur = this.usage.get(day) ?? { calls: 0, inTok: 0, outTok: 0 };
    this.usage.set(day, { calls: cur.calls + calls, inTok: cur.inTok + inTok, outTok: cur.outTok + outTok });
  }
  async getUsage(day: number) {
    return this.usage.get(day) ?? { calls: 0, inTok: 0, outTok: 0 };
  }
  async incrImprint(token: string, day: number) {
    const k = `${day}:${token}`;
    const n = (this.imprints.get(k) ?? 0) + 1;
    this.imprints.set(k, n);
    return n;
  }
  async getWallet(token: string) {
    if (!this.wallets.has(token)) this.wallets.set(token, STARTING_CROWNS);
    return this.wallets.get(token)!;
  }
  async adjustWallet(token: string, delta: number) {
    const cur = await this.getWallet(token);
    const next = cur + Math.round(delta);
    if (next < 0) return { ok: false, balance: cur };
    this.wallets.set(token, next);
    return { ok: true, balance: next };
  }
  async getFragments(token: string) {
    return this.frags.get(token) ?? 0;
  }
  async adjustFragments(token: string, delta: number) {
    const cur = await this.getFragments(token);
    const next = cur + Math.round(delta);
    if (next < 0) return { ok: false, balance: cur };
    this.frags.set(token, next);
    return { ok: true, balance: next };
  }
  async getRoster(token: string) {
    return cleanRosterKeys([...(this.rosters.get(token) ?? [])]);
  }
  async addRoster(token: string, keys: string[]) {
    const clean = cleanRosterKeys(keys);
    if (!this.rosters.has(token)) this.rosters.set(token, new Set());
    const set = this.rosters.get(token)!;
    for (const k of clean) {
      if (set.size >= MAX_PROGRESS_KEYS) break;
      set.add(k);
    }
    return cleanRosterKeys([...set]);
  }
  async claimOnce(key: string, ttlSeconds: number) {
    const k = key.slice(0, 180);
    if (this.claims.has(k)) return false;
    this.claims.add(k);
    if (ttlSeconds > 0) {
      setTimeout(() => this.claims.delete(k), Math.min(ttlSeconds, 7 * 86_400) * 1000).unref?.();
    }
    return true;
  }
  async incrDailyEarn(token: string, day: number, crowns: number) {
    const k = `${day}:${token}`;
    const n = (this.earnDay.get(k) ?? 0) + Math.round(crowns);
    this.earnDay.set(k, n);
    return n;
  }
  async incrGauntletPayout(token: string, day: number) {
    const k = `${day}:${token}`;
    const n = (this.gauntletDay.get(k) ?? 0) + 1;
    this.gauntletDay.set(k, n);
    return n;
  }
  async getPendingBet(token: string) {
    return this.bets.get(token) ?? null;
  }
  async setPendingBet(token: string, bet: PendingBet) {
    this.bets.set(token, bet);
  }
  async clearPendingBet(token: string) {
    this.bets.delete(token);
  }
  async trackEvent(day: number, field: string, by = 1) {
    const m = this.events.get(day) ?? new Map<string, number>();
    m.set(field, (m.get(field) ?? 0) + by);
    this.events.set(day, m);
  }
  async getEvents(day: number) {
    return Object.fromEntries(this.events.get(day) ?? []);
  }
  async trackUnique(day: number, token: string) {
    const s = this.dau.get(day) ?? new Set<string>();
    s.add(token);
    this.dau.set(day, s);
  }
  async uniqueCount(days: number[]) {
    const u = new Set<string>();
    for (const d of days) {
      const s = this.dau.get(d);
      if (s) for (const t of s) u.add(t);
    }
    return u.size;
  }
}

let cached: Store | null = null;
let warnedMemory = false;

export function isShared(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cached = new UpstashStore(new Redis({ url, token }));
  } else {
    if (!warnedMemory) {
      console.warn("[zingers] No Redis env — using in-memory store (not shared across instances). Provision Upstash to enable shared standings.");
      warnedMemory = true;
    }
    cached = new MemoryStore();
  }
  return cached;
}
