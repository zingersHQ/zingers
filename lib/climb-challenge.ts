// Ascent challenge links — async rivalry (nail-it P0/P1).
// Canonical share URL (phone + desktop):
//   /ascent?climb=<sectors>-<ms>-<name>&gp=<ghostPath>
// Optional ascent=flight|thumb records which body shared (boards stay split).
// Path samples are ALWAYS in Climb-canonical space (mobile units).
// Legacy /m?… and /grounds?…&ascent=flight still decode.

import { BRAND } from "@/lib/brand";
import {
  decodeGhostPath,
  encodeGhostPath,
  type ClimbGhostSectors,
} from "@/lib/climb-ghost";

/** Keep in sync with CLIMB_SECTOR_COUNT (components/grounds/climb/sectors). */
const MAX_SECTORS = 100;

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

export {
  PARAM as CLIMB_CHALLENGE_PARAM,
  PATH_PARAM as CLIMB_GHOST_PARAM,
  DOOR_PARAM as CLIMB_DOOR_PARAM,
  MIND_PARAM as CLIMB_MIND_PARAM,
};
