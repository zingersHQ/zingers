// Compact Climb ghost-path codec for challenge URLs (nail-it P1).
// Samples: (t ms, y, z) sparsely during a run → base64url blob on ?gp=

export interface ClimbGhostSample {
  t: number;
  y: number;
  z: number;
}

const MAX_SAMPLES = 48;
const VERSION = 1;

/** Keep URL under ~400 chars of path payload. */
export function encodeGhostPath(samples: ClimbGhostSample[]): string | null {
  if (!samples.length) return null;
  const picked = thinSamples(samples, MAX_SAMPLES);
  if (picked.length < 2) return null;

  const y0 = picked[0]!.y;
  const z0 = picked[0]!.z;
  const full = new Uint8Array(6 + picked.length * 5);
  full[0] = VERSION;
  full[1] = picked.length;
  writeI16(full, 2, Math.round(y0 * 10));
  writeU16(full, 4, Math.max(0, Math.round(z0)));

  let prevT = 0;
  for (let i = 0; i < picked.length; i++) {
    const s = picked[i]!;
    const dt = Math.min(255, Math.max(0, Math.round((s.t - prevT) / 20))); // 20ms units
    prevT = s.t;
    const yq = Math.min(255, Math.max(0, Math.round((s.y - y0 + 12) * (255 / 24))));
    const dz = Math.min(65535, Math.max(0, Math.round((s.z - z0) * 10)));
    const o = 6 + i * 5;
    full[o] = dt;
    full[o + 1] = yq;
    writeU16(full, o + 2, dz);
    full[o + 4] = 0;
  }
  return bytesToB64url(full);
}

export function decodeGhostPath(raw: string | null | undefined): ClimbGhostSample[] | null {
  if (!raw) return null;
  try {
    const buf = b64urlToBytes(raw);
    if (buf.length < 11 || buf[0] !== VERSION) return null;
    const n = buf[1]!;
    if (n < 2 || n > MAX_SAMPLES) return null;
    if (buf.length < 6 + n * 5) return null;
    const y0 = readI16(buf, 2) / 10;
    const z0 = readU16(buf, 4);
    const out: ClimbGhostSample[] = [];
    let t = 0;
    for (let i = 0; i < n; i++) {
      const o = 6 + i * 5;
      t += buf[o]! * 20;
      const y = y0 - 12 + (buf[o + 1]! / 255) * 24;
      const dz = readU16(buf, o + 2);
      out.push({ t, y, z: z0 + dz / 10 });
    }
    return out;
  } catch {
    return null;
  }
}

/** Sample Y/Z at time t (ms) along the path. */
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
