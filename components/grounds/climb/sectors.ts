// The Climb — 100 sectors, generated deterministically (docs/climb.md §2–3,
// docs/climb-feel.md §1).
//
// Feel-pass law: challenge is altitude timing + gap rhythm + hazards. Soft
// lateral rail curves (flight-rail.ts) bend the corridor from Reach II up —
// flyer settles onto the rail; Hold/release stays the only skill axis.
//
// Hard law (2026-07): never a ring ladder. Enforce a minimum |ΔY| between
// consecutive gates and break near-collinear YZ runs so "five rings inline"
// cannot happen even when a role wants a staircase (staircases stay short).

import type { CircuitCheckpoint, CircuitTrackDef } from "../circuit";
import { hash01 } from "../landmarks";
import { CLIMB_SECTOR_COUNT, roleIndex, roleOf, sectorDifficulty, type Role } from "./difficulty";
import { pathKindFor, pathLateralAt } from "./flight-rail";
import { clampDeltaToBudget, maxClimbDeltaY } from "./flyer-budget";
import { reachTheme } from "./reaches";

const SIGNATURE_NAMES: Record<number, string> = {
  9: "First Gate Trial",
  24: "The Silver Span",
  49: "The Open Roof",
  74: "Zenith Crossing",
  89: "The Corona Gauntlet",
  99: "The Hum",
};

const ROLE_WORD: Record<number, string> = {
  1: "Arrival",
  2: "Approach",
  3: "Weave",
  4: "Rhythm",
  5: "Pressure",
  6: "Vista",
  7: "Twist",
  8: "Surge",
  9: "Gauntlet",
  10: "Gate Trial",
};

function sectorName(i: number): string {
  if (SIGNATURE_NAMES[i]) return SIGNATURE_NAMES[i]!;
  const theme = reachTheme(i);
  return `${theme.name} · ${ROLE_WORD[roleIndex(i)] ?? "Climb"}`;
}

/** Campaign seed "" keeps the Hundred frozen; Expeditions pass a week seed. */
function makeRng(i: number, seed = ""): () => number {
  const key = seed ? `climb:sector:${seed}:${i}` : `climb:sector:${i}`;
  let s = Math.floor(hash01(key) * 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647);
}

/**
 * Reach salt so Arrival@1 ≠ Arrival@11 ≠ Arrival@21 by amplitude / phase /
 * which gap bites — role bar stays, choreography doesn't photocopy.
 */
function reachFlavor(reach: number, rnd: () => number) {
  const r = Math.max(0, Math.min(9, reach));
  // Stable per-Reach bias + tiny per-sector jitter (rnd already sector-seeded).
  const ampMul = 0.92 + r * 0.035 + rnd() * 0.1;
  const phase = r * 0.73 + rnd() * 0.45;
  const dipGate = (1 + (r % 3)) % Math.max(2, 4); // early dip slot drifts by Reach
  const biteMod = (r + 1) % 3; // which gap gets the pressure "bite"
  const stagger = 0.18 + (r % 4) * 0.06;
  const latSign = r % 2 === 0 ? 1 : -1;
  return { ampMul, phase, dipGate, biteMod, stagger, latSign };
}

/** Role → raw height delta before anti-ladder enforcement. */
function gateHeightDelta(
  role: Role,
  g: number,
  d: ReturnType<typeof sectorDifficulty>,
  rnd: () => number,
  flavor: ReturnType<typeof reachFlavor>,
): number {
  // Push closer to flyer-budget — shallow stairs were the monotone feel.
  const amp = Math.max(d.gateRadius * 1.3, d.vertStep * 1.6) * flavor.ampMul;
  switch (role) {
    case "arrival": {
      // short rising staircase — Reach salt on step size; rare mid dip later
      const step = d.vertStep * (1.15 + rnd() * 0.3) * flavor.ampMul;
      if (d.reach >= 2 && g === flavor.dipGate && rnd() < 0.4 + d.reach * 0.05) {
        return -amp * (0.45 + rnd() * 0.2);
      }
      return step;
    }
    case "teach":
      // mostly up; dip gate drifts by Reach so Approach never feels identical
      return g === flavor.dipGate ? -amp * (0.5 + rnd() * 0.15) : d.vertStep * (1.1 + rnd() * 0.3) * flavor.ampMul;
    case "rhythm":
      return Math.sin((g + 1) * Math.PI + flavor.phase) * amp * (0.95 + rnd() * 0.12);
    case "combine":
    case "twist": {
      const a = g % 2 === 0 ? 1 : -0.85;
      // Reach flips the opening polarity so Weave/Twist alternate feel
      const pol = d.reach % 2 === 0 ? a : -a;
      return pol * amp * (0.85 + rnd() * 0.25);
    }
    case "pressure":
    case "pressure2":
      // bite slot = every-3rd offset by Reach (not always g%3===1)
      return (g + flavor.biteMod) % 3 === 1 ? -amp * (1.05 + rnd() * 0.2) : amp * (1.05 + rnd() * 0.2);
    case "vista":
      return (g % 2 === 0 ? 0.7 : -0.5) * d.vertStep * (1.05 + rnd() * 0.3) * flavor.ampMul;
    case "gauntlet":
      return Math.sin(g * 1.7 + 0.4 + flavor.phase) * amp * (1.15 + rnd() * 0.15);
    case "trial": {
      const a = g % 2 === 0 ? 1.1 : -0.95;
      const pol = d.reach % 2 === 0 ? a : -a * 0.95;
      return pol * amp * (1.05 + rnd() * 0.15);
    }
  }
}

function gapFor(
  role: Role,
  g: number,
  gapMin: number,
  gapMax: number,
  rnd: () => number,
  gates: number,
  flavor: ReturnType<typeof reachFlavor>,
): number {
  if (role === "rhythm") {
    // Equal cadence with a Reach-staggered micro swing so bars don't clone
    const mid = (gapMin + gapMax) * 0.5;
    return mid * (1 + ((g + flavor.biteMod) % 2 === 0 ? flavor.stagger * 0.15 : -flavor.stagger * 0.1));
  }
  if (role === "vista") {
    const mid = Math.floor(gates / 2);
    if (g === mid) return gapMax;
    return gapMin + (gapMax - gapMin) * (0.2 + flavor.stagger) * rnd();
  }
  if (role === "pressure" || role === "pressure2" || role === "gauntlet") {
    // Bite gap drifts with Reach so surge rhythm changes altitude-to-altitude
    return (g + flavor.biteMod) % 3 === 2
      ? gapMax * (0.8 + flavor.stagger * 0.3)
      : gapMin + (gapMax - gapMin) * (0.15 + flavor.stagger) * rnd();
  }
  // Soft Reach bias on the random band so gap rhythm drifts with altitude
  const lo = gapMin + (gapMax - gapMin) * flavor.stagger * 0.35;
  return lo + (gapMax - lo) * rnd();
}

/**
 * Kill flat / same-direction ladders. Consecutive gates must swing by at least
 * `minSwing`; after two steps the same way, force a reverse so YZ never reads
 * as a straight diagonal of rings. Amplifying a small delta PRESERVES its sign
 * (don't turn a rising staircase into a bounce).
 */
function enforceSwing(
  raw: number,
  minSwing: number,
  sameDirStreak: number,
  lastSign: number,
  allowMono: boolean,
): { dy: number; sign: number; streak: number } {
  let dy = raw;
  let sign = dy === 0 ? lastSign || 1 : Math.sign(dy);

  if (Math.abs(dy) < minSwing) {
    if (dy !== 0) sign = Math.sign(dy);
    else if (allowMono && lastSign !== 0) sign = lastSign;
    else sign = lastSign <= 0 ? 1 : -1;
    dy = sign * minSwing;
  }

  if (!allowMono && sameDirStreak >= 2 && sign === lastSign) {
    sign = -sign;
    dy = sign * Math.max(minSwing, Math.abs(dy));
  }

  const streak = sign === lastSign ? sameDirStreak + 1 : 1;
  return { dy, sign, streak };
}

export function buildClimbSector(i: number, seed = ""): CircuitTrackDef {
  const d = sectorDifficulty(i);
  const role = roleOf(i);
  const rnd = makeRng(i, seed);
  const flavor = reachFlavor(d.reach, rnd);
  const [gapMin, gapMax] = d.gapSec;
  // Arrival's short staircase may rise twice. Everything else reverses by the
  // third same-direction step so long diagonals can't form.
  const allowMono = role === "arrival";
  // Readable swing — use more of the flyer budget so altitude timing bites.
  const budgetFloor = maxClimbDeltaY(gapMin) * 0.78;
  const minSwing = Math.min(d.gateRadius * 1.2, Math.max(d.vertStep * 1.05, budgetFloor * 0.72));

  const pathKind = pathKindFor(role, d.reach);
  const latAmp = d.latAmp * flavor.latSign;

  const gatePos: { x: number; y: number; z: number }[] = [];

  let z = 0;
  let y = 2.8;
  const yFloor = 1.6;
  // Wide band so enforceSwing isn't crushed into a flat ceiling line.
  const yCeil = 2.8 + d.gates * Math.max(d.vertStep * 1.55, d.gateRadius * 1.65) + 10;

  let lastSign = 0;
  let sameDirStreak = 0;

  for (let g = 0; g < d.gates; g++) {
    const gap = gapFor(role, g, gapMin, gapMax, rnd, d.gates, flavor);
    z += d.speed * gap + (g === 0 ? 4 : 0);

    const raw = gateHeightDelta(role, g, d, rnd, flavor);
    const swung = enforceSwing(raw, minSwing, sameDirStreak, lastSign, allowMono);
    // Hard law: every gate-to-gate ΔY must be flappable in this gap's time.
    const dy = clampDeltaToBudget(swung.dy, gap);
    lastSign = dy === 0 ? swung.sign : Math.sign(dy);
    sameDirStreak = lastSign === swung.sign ? swung.streak : 1;
    y += dy;
    y = Math.max(yFloor, Math.min(yCeil, y));

    // If clamp flattened us against a neighbor, nudge off the wall (still budgeted).
    if (gatePos.length > 0) {
      const prevY = gatePos[gatePos.length - 1]!.y;
      if (Math.abs(y - prevY) < minSwing * 0.85) {
        const nudge = clampDeltaToBudget((y >= prevY ? 1 : -1) * minSwing, gap);
        y = Math.max(yFloor, Math.min(yCeil, prevY + nudge));
      }
    }

    const x = pathLateralAt(pathKind, g, d.gates, Math.abs(latAmp), flavor.phase) * Math.sign(latAmp || 1);
    gatePos.push({ x, y, z });
  }

  const checkpoints: CircuitCheckpoint[] = [
    { index: 0, label: "Start", pos: [0, 2, 6], radius: 3.5 },
    ...gatePos.map((g, idx) => {
      const isFinish = idx === gatePos.length - 1;
      return {
        index: idx + 1,
        label: isFinish ? "Finish" : `Gate ${idx + 1}`,
        pos: [g.x, g.y, g.z] as [number, number, number],
        radius: isFinish ? d.gateRadius + 0.5 : d.gateRadius,
        ...(isFinish ? { finish: true } : {}),
      };
    }),
  ];

  return {
    id: seed ? `climb:${seed}:s${i + 1}` : `climb:s${i + 1}`,
    name: sectorName(i),
    spawn: [0, 1.1, -2.5],
    platforms: [],
    checkpoints,
  };
}

export const CLIMB_SECTORS: CircuitTrackDef[] = Array.from({ length: CLIMB_SECTOR_COUNT }, (_, i) =>
  buildClimbSector(i),
);

const seededCache = new Map<string, CircuitTrackDef>();

export function climbSector(index: number, seed = ""): CircuitTrackDef {
  const i = Math.max(0, Math.min(CLIMB_SECTOR_COUNT - 1, index));
  if (!seed) return CLIMB_SECTORS[i]!;
  const key = `${seed}:${i}`;
  let t = seededCache.get(key);
  if (!t) {
    t = buildClimbSector(i, seed);
    seededCache.set(key, t);
  }
  return t;
}

export { CLIMB_SECTOR_COUNT } from "./difficulty";
