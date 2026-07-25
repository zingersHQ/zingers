// Ascent challenge links — async rivalry (nail-it P0/P1).
// Preferred share URL (minted on share only):
//   /ascent/<shortId>            → payload in Redis
// Still accepted:
//   /ascent?c=<shortId>          (redirects to path form)
//   /ascent?climb=…&gp=…         (fat legacy)
// Path samples are ALWAYS in Climb-canonical space (mobile units).

import { BRAND } from "@/lib/brand";
import {
  CLIMB_SECTOR_COUNT,
  climbChallengeMark,
  isChallengeTipSectorClear,
  isClimbChallengeBeat,
  type ClimbChallengeMark,
} from "@/lib/ascent-rules";
import {
  buildShareGhostPaths,
  challengeTipFurthestZ,
  decodeGhostPath,
  encodeGhostPath,
  type ClimbGhostSectors,
} from "@/lib/climb-ghost";

const MAX_SECTORS = CLIMB_SECTOR_COUNT;

export {
  isClimbChallengeBeat,
  climbChallengeMark,
  isChallengeTipSectorClear,
  CLIMB_SECTOR_COUNT,
  buildShareGhostPaths,
  challengeTipFurthestZ,
};
export type { ClimbChallengeMark };

export type ClimbDoor = "thumb" | "flight";

export interface ClimbChallenge {
  sectors: number;
  totalMs: number;
  /** Optional challenger display name (URL-safe). */
  name?: string;
  /** Challenger's champion key (e.g. AXIOM) — ghost shows this mind. */
  mind?: string;
  /** Per-sector ghost paths (canonical Climb space). v1 links decode as one sector. */
  path?: ClimbGhostSectors;
  /** Which body the challenge was shared from (boards stay split). */
  door?: ClimbDoor;
}

const PARAM = "climb";
const PATH_PARAM = "gp";
const DOOR_PARAM = "ascent";
const MIND_PARAM = "mk";
/** Legacy short-id query (middleware redirects to /ascent/<id>). */
const SHORT_PARAM = "c";

/** Redis share ids are 6–16 alphanumerics (no punctuation — path-safe). */
export function isClimbShareId(id: string): boolean {
  return /^[a-zA-Z0-9]{6,16}$/.test(id);
}

/** Pull share id from `/ascent/<id>` (preferred) or null. */
export function readClimbShareIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/ascent\/([a-zA-Z0-9]{6,16})\/?$/);
  return m?.[1] ?? null;
}

/** Encode a finished run into a shareable challenge query value. */
export function encodeClimbChallenge(c: ClimbChallenge): string {
  const sec = Math.max(0, Math.min(MAX_SECTORS, Math.floor(c.sectors)));
  const ms = Math.max(0, Math.floor(c.totalMs));
  const name = (c.name || "").trim().slice(0, 24).replace(/[^a-zA-Z0-9_-]/g, "");
  return name ? `${sec}-${ms}-${encodeURIComponent(name)}` : `${sec}-${ms}`;
}

export function decodeClimbChallenge(raw: string | null | undefined): ClimbChallenge | null {
  if (!raw) return null;
  const parts = raw.split("-");
  if (parts.length < 2) return null;
  const sectors = Number(parts[0]);
  const totalMs = Number(parts[1]);
  if (!Number.isFinite(sectors) || !Number.isFinite(totalMs)) return null;
  if (sectors < 0 || sectors > MAX_SECTORS || totalMs < 0) return null;
  let name: string | undefined;
  if (parts.length >= 3) {
    try {
      name = decodeURIComponent(parts.slice(2).join("-")).slice(0, 24);
    } catch {
      name = undefined;
    }
  }
  return { sectors: Math.floor(sectors), totalMs: Math.floor(totalMs), name };
}

/** Absolute URL for an Ascent challenge — always `/ascent` (device picks the body). */
export function climbChallengeUrl(
  c: ClimbChallenge,
  origin?: string,
  door: ClimbDoor = c.door ?? "thumb",
): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : BRAND.site);
  const q = new URLSearchParams();
  q.set(PARAM, encodeClimbChallenge(c));
  if (c.path?.length) {
    const gp = encodeGhostPath(c.path);
    if (gp) q.set(PATH_PARAM, gp);
  }
  const mind = (c.mind || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 24);
  if (mind) q.set(MIND_PARAM, mind);
  // Record share body for split boards; never forks the path.
  if (door === "flight" || door === "thumb") q.set(DOOR_PARAM, door);
  return `${base}/ascent?${q.toString()}`;
}

/** Sync decode of fat query params only (no network). Prefer `resolveClimbChallengeFromSearch`. */
export function readClimbChallengeFromSearch(search: string): ClimbChallenge | null {
  try {
    const q = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    const base = decodeClimbChallenge(q.get(PARAM));
    if (!base) return null;
    const path = decodeGhostPath(q.get(PATH_PARAM) || undefined) || undefined;
    const doorRaw = q.get(DOOR_PARAM);
    const door: ClimbDoor | undefined =
      doorRaw === "flight" ? "flight" : doorRaw === "thumb" ? "thumb" : undefined;
    const mk = (q.get(MIND_PARAM) || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 24);
    const mind = mk || undefined;
    return { ...base, path, door, mind };
  } catch {
    return null;
  }
}

async function fetchClimbShare(id: string): Promise<ClimbChallenge | null> {
  if (!isClimbShareId(id)) return null;
  try {
    const r = await fetch(`/api/climb-share?id=${encodeURIComponent(id)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { challenge?: ClimbChallenge };
    if (j.challenge && Number.isFinite(j.challenge.sectors)) return j.challenge;
  } catch {
    /* miss */
  }
  return null;
}

/**
 * Resolve a challenge from pathname + search:
 *   /ascent/<id>  → Redis
 *   ?c=<id>       → Redis (legacy; middleware usually redirects)
 *   ?climb=&gp=   → fat decode
 * Call from client effects — never during SSR render.
 */
export async function resolveClimbChallengeFromLocation(
  pathname?: string,
  search?: string,
): Promise<ClimbChallenge | null> {
  const path =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  const q =
    search ?? (typeof window !== "undefined" ? window.location.search : "");

  const fromPath = readClimbShareIdFromPath(path);
  if (fromPath) {
    const hit = await fetchClimbShare(fromPath);
    if (hit) return hit;
  }

  try {
    const params = new URLSearchParams(q.startsWith("?") ? q : `?${q}`);
    const short = (params.get(SHORT_PARAM) || "").trim();
    if (short) {
      const hit = await fetchClimbShare(short);
      if (hit) return hit;
    }
  } catch {
    /* fall through */
  }

  return readClimbChallengeFromSearch(q);
}

/** @deprecated prefer resolveClimbChallengeFromLocation */
export async function resolveClimbChallengeFromSearch(search: string): Promise<ClimbChallenge | null> {
  return resolveClimbChallengeFromLocation(
    typeof window !== "undefined" ? window.location.pathname : "",
    search,
  );
}

/**
 * Mint a short share URL (Redis). Falls back to the fat query URL if the API is down.
 * Only call when the Trainer actually shares — not on every run end.
 */
export async function createClimbChallengeUrl(
  c: ClimbChallenge,
  origin?: string,
  door: ClimbDoor = c.door ?? "thumb",
): Promise<string> {
  const fat = climbChallengeUrl(c, origin, door);
  try {
    const r = await fetch("/api/climb-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectors: c.sectors,
        totalMs: c.totalMs,
        name: c.name,
        mind: c.mind,
        path: c.path,
        door,
      }),
    });
    if (!r.ok) return fat;
    const j = (await r.json()) as { path?: string; id?: string };
    const base = (origin || (typeof window !== "undefined" ? window.location.origin : BRAND.site)).replace(
      /\/$/,
      "",
    );
    if (typeof j.path === "string" && /^\/ascent\/[a-zA-Z0-9]{6,16}$/.test(j.path)) {
      return `${base}${j.path}`;
    }
    if (typeof j.id === "string" && isClimbShareId(j.id)) {
      return `${base}/ascent/${j.id}`;
    }
  } catch {
    /* fat fallback */
  }
  return fat;
}

export {
  PARAM as CLIMB_CHALLENGE_PARAM,
  PATH_PARAM as CLIMB_GHOST_PARAM,
  DOOR_PARAM as CLIMB_DOOR_PARAM,
  MIND_PARAM as CLIMB_MIND_PARAM,
  SHORT_PARAM as CLIMB_SHORT_PARAM,
};
