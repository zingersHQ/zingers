// Short climb-challenge share IDs — fat ?climb=&gp= URLs become /ascent/<id>.
// Created only when someone shares (not every run). Redis-backed with memory fallback.
import "server-only";
import { Redis } from "@upstash/redis";
import { CLIMB_SECTOR_COUNT } from "@/lib/ascent-rules";
import type { ClimbChallenge, ClimbDoor } from "@/lib/climb-challenge";
import type { ClimbGhostSectors } from "@/lib/climb-ghost";

const TTL_SEC = 180 * 86_400; // ~6 months — long enough for viral shares
const ID_LEN = 10;
const KEY = (id: string) => `z:climbshare:${id}`;
const MAX_JSON = 48_000; // ghost paths stay compact; reject absurd blobs

export type ClimbShareRecord = {
  sectors: number;
  totalMs: number;
  name?: string;
  mind?: string;
  path?: ClimbGhostSectors;
  door?: ClimbDoor;
  at: number;
};

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function makeId(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(ID_LEN);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < ID_LEN; i++) out += alphabet[bytes[i]! % 62]!;
  return out;
}

function sanitize(raw: unknown): ClimbShareRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const sectors = Number(b.sectors);
  const totalMs = Number(b.totalMs);
  if (!Number.isFinite(sectors) || !Number.isFinite(totalMs)) return null;
  if (sectors < 0 || sectors > CLIMB_SECTOR_COUNT || totalMs < 0 || totalMs > 90 * 60 * 1000) return null;

  let name: string | undefined;
  if (typeof b.name === "string") {
    const n = b.name.trim().slice(0, 24).replace(/[^a-zA-Z0-9 _.\-']/g, "");
    if (n.length >= 1) name = n;
  }
  let mind: string | undefined;
  if (typeof b.mind === "string") {
    const m = b.mind.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 24);
    if (m) mind = m;
  }
  const door: ClimbDoor | undefined =
    b.door === "flight" ? "flight" : b.door === "thumb" ? "thumb" : undefined;

  let path: ClimbGhostSectors | undefined;
  if (Array.isArray(b.path)) {
    // Trust shape lightly — codec already thins; drop if empty.
    const sectorsPath = b.path as ClimbGhostSectors;
    if (sectorsPath.some((s) => Array.isArray(s) && s.length >= 2)) path = sectorsPath;
  }

  return {
    sectors: Math.floor(sectors),
    totalMs: Math.floor(totalMs),
    name,
    mind,
    path,
    door,
    at: Date.now(),
  };
}

class MemoryShares {
  private map = new Map<string, { rec: ClimbShareRecord; exp: number }>();
  async put(id: string, rec: ClimbShareRecord) {
    this.map.set(id, { rec, exp: Date.now() + TTL_SEC * 1000 });
  }
  async get(id: string): Promise<ClimbShareRecord | null> {
    const e = this.map.get(id);
    if (!e) return null;
    if (e.exp < Date.now()) {
      this.map.delete(id);
      return null;
    }
    return e.rec;
  }
}

class RedisShares {
  constructor(private r: Redis) {}
  async put(id: string, rec: ClimbShareRecord) {
    await this.r.set(KEY(id), rec, { ex: TTL_SEC });
  }
  async get(id: string): Promise<ClimbShareRecord | null> {
    return (await this.r.get<ClimbShareRecord>(KEY(id))) ?? null;
  }
}

type ShareStore = RedisShares | MemoryShares;
let cached: ShareStore | null = null;

function store(): ShareStore {
  if (cached) return cached;
  const r = redis();
  cached = r ? new RedisShares(r) : new MemoryShares();
  return cached;
}

export function isValidShareId(id: string): boolean {
  return /^[a-zA-Z0-9]{6,16}$/.test(id);
}

/** Persist a challenge; returns the short id. */
export async function createClimbShare(raw: unknown): Promise<{ id: string } | { error: string }> {
  const rec = sanitize(raw);
  if (!rec) return { error: "Invalid challenge." };
  try {
    if (JSON.stringify(rec).length > MAX_JSON) return { error: "Challenge too large." };
  } catch {
    return { error: "Invalid challenge." };
  }

  const s = store();
  for (let i = 0; i < 5; i++) {
    const id = makeId();
    const existing = await s.get(id);
    if (existing) continue;
    await s.put(id, rec);
    return { id };
  }
  return { error: "Could not allocate id." };
}

export async function getClimbShare(id: string): Promise<ClimbChallenge | null> {
  if (!isValidShareId(id)) return null;
  const rec = await store().get(id);
  if (!rec) return null;
  return {
    sectors: rec.sectors,
    totalMs: rec.totalMs,
    name: rec.name,
    mind: rec.mind,
    path: rec.path,
    door: rec.door,
  };
}
