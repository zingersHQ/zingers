// Ten authored sectors for The Circuit run — generated deterministically from tier
// so layout stays testable. Each sector is short; clearing one unlocks the next.
// Fall off anywhere → the whole run resets to sector 1.

import type { CircuitCheckpoint, CircuitPlatform, CircuitTrackDef } from "./circuit";

import { hash01 } from "./landmarks";

export const CIRCUIT_SECTOR_COUNT = 10;

const BASE_SECTOR_NAMES = [
  "Warmup",
  "Drift",
  "Climb",
  "Switch",
  "Narrows",
  "Cloud Hop",
  "Razor",
  "Skyline",
  "Freefall",
  "Gauntlet",
] as const;

const WORLD_SECTOR_PREFIX: Record<string, string[]> = {
  concord: ["Gate", "Lane", "Rise", "Bend", "Tight", "Hop", "Edge", "Span", "Drop", "Final"],
  grounds: ["Trial", "Pillar", "Spire", "Switch", "Gorge", "Vault", "Edge", "Crown", "Fall", "Summit"],
  gauntlet: ["Spark", "Ash", "Heat", "Rift", "Narrow", "Flare", "Blade", "Furnace", "Plunge", "Inferno"],
  void: ["Drift", "Bloom", "Deep", "Weave", "Hush", "Float", "Razor", "Abyss", "Sway", "Zenith"],
};

function sectorName(worldId: string, tier: number): string {
  const list = WORLD_SECTOR_PREFIX[worldId] ?? BASE_SECTOR_NAMES;
  return list[tier] ?? BASE_SECTOR_NAMES[tier] ?? `Sector ${tier + 1}`;
}

function buildSector(tier: number, worldId: string): CircuitTrackDef {
  const seed = hash01(worldId);
  const n = tier + 1;
  const lateral = 2.2 + (tier % 4) * 0.65 + (seed - 0.5) * 0.8;
  const vertStep = 2.35 + tier * 0.2 + seed * 0.25;
  const platW = Math.max(2.3, 3.7 - tier * 0.13 - seed * 0.15);
  const steps = 3 + Math.min(4, Math.floor(tier / 2) + (tier % 2));

  const platforms: CircuitPlatform[] = [
    { pos: [0, -0.25, 0], size: [Math.max(9, 12 - tier * 0.25), 0.5, 10], accent: "top" },
  ];

  const gatePos: { x: number; y: number; z: number }[] = [];
  let y = 0;
  let z = 0;

  for (let i = 0; i < steps; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    z += 9 + tier * 0.45 + (i === 0 ? 2 : 0);
    y += vertStep + (i % 3 === 0 ? 0.65 : 0);
    const x = side * lateral * (0.85 + Math.sin(i * 1.1 + tier * 0.4) * 0.25);
    platforms.push({ pos: [x, y - 0.25, z], size: [platW, 0.5, platW], accent: i % 2 ? "a" : "b" });
    gatePos.push({ x: x * 0.25, y: y + 1.4, z });
  }

  // Summit pad — slightly past the last hop
  const last = platforms[platforms.length - 1]!;
  const summitZ = last.pos[2] + 7;
  const summitY = last.pos[1] + vertStep * 0.85;
  platforms.push({ pos: [last.pos[0] * 0.4, summitY, summitZ], size: [platW + 1.8, 0.6, platW + 1.8], accent: "top" });
  gatePos.push({ x: last.pos[0] * 0.2, y: summitY + 1.5, z: summitZ });

  const checkpoints: CircuitCheckpoint[] = [
    { index: 0, label: "Start", pos: [0, 2, 7], radius: 3.5 },
    ...gatePos.slice(0, -1).map((g, i) => ({
      index: i + 1,
      label: `Gate ${i + 1}`,
      pos: [g.x, g.y, g.z] as [number, number, number],
      radius: Math.max(2.7, 3.2 - tier * 0.04),
    })),
    {
      index: gatePos.length,
      label: "Finish",
      pos: [gatePos[gatePos.length - 1]!.x, gatePos[gatePos.length - 1]!.y, gatePos[gatePos.length - 1]!.z] as [
        number,
        number,
        number,
      ],
      radius: Math.max(3, 3.6 - tier * 0.03),
      finish: true,
    },
  ];

  // Re-index checkpoints 0..n-1
  checkpoints.forEach((cp, i) => {
    cp.index = i;
  });

  return {
    id: `${worldId}:circuit-s${n}`,
    name: sectorName(worldId, tier),
    spawn: [0, 1.1, -2.5],
    platforms,
    checkpoints,
  };
}

export const CIRCUIT_SECTORS: CircuitTrackDef[] = buildCircuitRun("void");

export function buildCircuitRun(worldId: string): CircuitTrackDef[] {
  return Array.from({ length: CIRCUIT_SECTOR_COUNT }, (_, i) => buildSector(i, worldId));
}

export function circuitSector(index: number, worldId = "void"): CircuitTrackDef {
  return buildCircuitRun(worldId)[Math.max(0, Math.min(CIRCUIT_SECTOR_COUNT - 1, index))]!;
}

/** Bounds for the void safety net under a sector. */
export function sectorBounds(track: CircuitTrackDef): { maxY: number; maxZ: number } {
  let maxY = 0;
  let maxZ = 0;
  for (const p of track.platforms) {
    maxY = Math.max(maxY, p.pos[1] + p.size[1]);
    maxZ = Math.max(maxZ, p.pos[2] + p.size[2]);
  }
  for (const cp of track.checkpoints) {
    maxY = Math.max(maxY, cp.pos[1]);
    maxZ = Math.max(maxZ, cp.pos[2]);
  }
  return { maxY: maxY + 8, maxZ: maxZ + 12 };
}

// ── Local bests ──────────────────────────────────────────────────────────────

export interface CircuitPersonalBest {
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
}

export function loadCircuitPersonalBest(): CircuitPersonalBest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("zingers_circuit_best_v2");
    if (!raw) return null;
    const j = JSON.parse(raw) as CircuitPersonalBest;
    if (!Number.isFinite(j.sectors) || !Number.isFinite(j.totalMs)) return null;
    return { sectors: j.sectors, totalMs: j.totalMs, clearedAll: !!j.clearedAll };
  } catch {
    return null;
  }
}

export function saveCircuitPersonalBest(best: CircuitPersonalBest): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("zingers_circuit_best_v2", JSON.stringify(best));
  } catch {
    /* ignore */
  }
}

export function isCircuitRunBetter(a: CircuitPersonalBest, b: CircuitPersonalBest | null): boolean {
  if (!b) return true;
  if (a.sectors !== b.sectors) return a.sectors > b.sectors;
  return a.totalMs < b.totalMs;
}
