// Compact Climb ghost-path codec for challenge URLs (nail-it P1).
// Samples: (t ms, y, z) per sector → base64url blob on ?gp=
//
// v1: single continuous path (legacy links)
// v2: per-sector paths so each sector start restarts the race beside you

export interface ClimbGhostSample {
  t: number;
  y: number;
  z: number;
}

/** Outer array = sector index; each sector's t is ms since that sector started. */
export type ClimbGhostSectors = ClimbGhostSample[][];

const MAX_SECTORS = 12;
const MAX_PER_SECTOR = 28;
const VERSION_V1 = 1;
const VERSION_V2 = 2;

/** Encode one or more sector paths. Prefer per-sector arrays (v2). */
export function encodeGhostPath(sectors: ClimbGhostSectors | ClimbGhostSample[]): string | null {
  const list = normalizeSectors(sectors);
  if (!list.length) return null;

  if (list.length === 1) {
    // Keep v1 for single-sector shares (shorter + legacy-compatible).
    return encodeV1(list[0]!);
  }

  const thinned = list
    .slice(0, MAX_SECTORS)
    .map((s) => thinSamples(s, MAX_PER_SECTOR))
    .filter((s) => s.length >= 2);
  if (!thinned.length) return null;

  let size = 2;
  for (const s of thinned) size += 5 + s.length * 5;
  const full = new Uint8Array(size);
  full[0] = VERSION_V2;
  full[1] = thinned.length;
  let o = 2;
  for (const s of thinned) {
    o = writeSectorBlock(full, o, s);
  }
  return bytesToB64url(full);
}

/** Decode to per-sector paths. v1 becomes a single-sector array. */
export function decodeGhostPath(raw: string | null | undefined): ClimbGhostSectors | null {
  if (!raw) return null;
  try {
    const buf = b64urlToBytes(raw);
    if (buf.length < 11) return null;
    const ver = buf[0]!;
    if (ver === VERSION_V1) {
      const one = decodeV1Body(buf);
      return one ? [one] : null;
    }
    if (ver !== VERSION_V2) return null;
    const nSec = buf[1]!;
    if (nSec < 1 || nSec > MAX_SECTORS) return null;
    const out: ClimbGhostSectors = [];
    let o = 2;
    for (let i = 0; i < nSec; i++) {
      const block = readSectorBlock(buf, o);
      if (!block) return null;
      out.push(block.samples);
      o = block.next;
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** Path for the live sector — falls back to sector 0 so old links still race. */
export function ghostPathForSector(
  sectors: ClimbGhostSectors | null | undefined,
  sectorIdx: number,
): ClimbGhostSample[] | null {
  if (!sectors?.length) return null;
  const direct = sectors[sectorIdx];
  if (direct && direct.length >= 2) return direct;
  const fallback = sectors[0];
  return fallback && fallback.length >= 2 ? fallback : null;
}

export function ghostPathHasSamples(sectors: ClimbGhostSectors | null | undefined): boolean {
  return !!sectors?.some((s) => s.length >= 2);
}

/** Sample Y/Z at time t (ms) along a single sector path. */
export function sampleGhostAt(path: ClimbGhostSample[], tMs: number): { y: number; z: number } | null {
  if (!path.length) return null;
  if (tMs <= path[0]!.t) return { y: path[0]!.y, z: path[0]!.z };
  const last = path[path.length - 1]!;
  if (tMs >= last.t) return { y: last.y, z: last.z };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    if (tMs <= b.t) {
      const u = (tMs - a.t) / Math.max(1, b.t - a.t);
      return {
        y: a.y + (b.y - a.y) * u,
        z: a.z + (b.z - a.z) * u,
      };
    }
  }
  return { y: last.y, z: last.z };
}

function normalizeSectors(sectors: ClimbGhostSectors | ClimbGhostSample[]): ClimbGhostSectors {
  if (!sectors.length) return [];
  const first = sectors[0];
  // ClimbGhostSample has numeric t; a sector array's [0] is a sample or empty.
  if (first && typeof (first as ClimbGhostSample).t === "number") {
    return [sectors as ClimbGhostSample[]];
  }
  return (sectors as ClimbGhostSectors).filter((s) => s.length >= 2);
}

function encodeV1(samples: ClimbGhostSample[]): string | null {
  const picked = thinSamples(samples, MAX_PER_SECTOR);
  if (picked.length < 2) return null;
  const full = new Uint8Array(6 + picked.length * 5);
  full[0] = VERSION_V1;
  full[1] = picked.length;
  writeSectorPayload(full, 2, picked);
  return bytesToB64url(full);
}

function decodeV1Body(buf: Uint8Array): ClimbGhostSample[] | null {
  const n = buf[1]!;
  if (n < 2 || n > MAX_PER_SECTOR * 2) return null;
  if (buf.length < 6 + n * 5) return null;
  return readSamples(buf, 2, n);
}

function writeSectorBlock(buf: Uint8Array, o: number, samples: ClimbGhostSample[]): number {
  buf[o] = samples.length;
  writeSectorPayload(buf, o + 1, samples);
  return o + 5 + samples.length * 5;
}

function readSectorBlock(
  buf: Uint8Array,
  o: number,
): { samples: ClimbGhostSample[]; next: number } | null {
  if (o + 5 > buf.length) return null;
  const n = buf[o]!;
  if (n < 2 || n > MAX_PER_SECTOR) return null;
  if (buf.length < o + 5 + n * 5) return null;
  const samples = readSamples(buf, o + 1, n);
  if (!samples) return null;
  return { samples, next: o + 5 + n * 5 };
}

function writeSectorPayload(buf: Uint8Array, o: number, samples: ClimbGhostSample[]) {
  const y0 = samples[0]!.y;
  const z0 = samples[0]!.z;
  writeI16(buf, o, Math.round(y0 * 10));
  writeU16(buf, o + 2, Math.max(0, Math.round(z0)));
  let prevT = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    const dt = Math.min(255, Math.max(0, Math.round((s.t - prevT) / 20)));
    prevT = s.t;
    const yq = Math.min(255, Math.max(0, Math.round((s.y - y0 + 12) * (255 / 24))));
    const dz = Math.min(65535, Math.max(0, Math.round((s.z - z0) * 10)));
    const p = o + 4 + i * 5;
    buf[p] = dt;
    buf[p + 1] = yq;
    writeU16(buf, p + 2, dz);
    buf[p + 4] = 0;
  }
}

function readSamples(buf: Uint8Array, o: number, n: number): ClimbGhostSample[] | null {
  const y0 = readI16(buf, o) / 10;
  const z0 = readU16(buf, o + 2);
  const out: ClimbGhostSample[] = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    const p = o + 4 + i * 5;
    t += buf[p]! * 20;
    const y = y0 - 12 + (buf[p + 1]! / 255) * 24;
    const dz = readU16(buf, p + 2);
    out.push({ t, y, z: z0 + dz / 10 });
  }
  return out;
}

function thinSamples(samples: ClimbGhostSample[], max: number): ClimbGhostSample[] {
  if (samples.length <= max) return samples;
  const out: ClimbGhostSample[] = [];
  const step = (samples.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    out.push(samples[Math.round(i * step)]!);
  }
  return out;
}

function writeI16(buf: Uint8Array, o: number, v: number) {
  const x = Math.max(-32768, Math.min(32767, v)) & 0xffff;
  buf[o] = (x >> 8) & 0xff;
  buf[o + 1] = x & 0xff;
}

function writeU16(buf: Uint8Array, o: number, v: number) {
  buf[o] = (v >> 8) & 0xff;
  buf[o + 1] = v & 0xff;
}

function readI16(buf: Uint8Array, o: number): number {
  const x = (buf[o]! << 8) | buf[o + 1]!;
  return x >= 0x8000 ? x - 0x10000 : x;
}

function readU16(buf: Uint8Array, o: number): number {
  return (buf[o]! << 8) | buf[o + 1]!;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
