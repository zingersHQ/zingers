// Shared Flight rail — soft lateral curves with path settle.
// Hold/release stays world-Y skill; the corridor may bend in X while Z advances.
// Both bodies sample the same checkpoint polyline (desktop-scaled track).

export type PathKind = "straight" | "sine" | "sCurve" | "bowl";

type GatePos =
  | { pos: [number, number, number] }
  | { pos: readonly [number, number, number] }
  | { pos: { x: number; y: number; z: number } };

function gateXYZ(g: GatePos): [number, number, number] {
  const p = g.pos as [number, number, number] | { x: number; y: number; z: number };
  if (Array.isArray(p)) return [p[0], p[1], p[2]];
  return [p.x, p.y, p.z];
}

/** Lateral offset (climb-canonical X) for gate index `g` of `gates` total. */
export function pathLateralAt(
  kind: PathKind,
  g: number,
  gates: number,
  amp: number,
  phase: number,
): number {
  if (amp < 0.05 || kind === "straight" || gates <= 1) return 0;
  const u = g / Math.max(1, gates - 1); // 0..1 along the sector
  switch (kind) {
    case "sine":
      // Full period weave — classic S through the corridor.
      return Math.sin(u * Math.PI * 2 + phase) * amp;
    case "sCurve":
      // Single half-wave: enter one side, exit the other.
      return Math.sin(u * Math.PI + phase) * amp;
    case "bowl":
      // Out and back — scenic Vista bend that returns to center for the finish.
      return Math.sin(u * Math.PI) * amp * (phase >= 0 ? 1 : -1);
    default:
      return 0;
  }
}

/** Pick a path shape from role + Reach so the bar doesn't photocopy every altitude. */
export function pathKindFor(role: string, reach: number): PathKind {
  if (reach <= 0) return "straight"; // Reach I teaches flap on a straight corridor
  switch (role) {
    case "arrival":
      return reach >= 3 ? "sine" : "straight";
    case "teach":
    case "combine":
      return reach % 2 === 0 ? "sine" : "straight";
    case "rhythm":
      return "sine";
    case "vista":
      return "bowl";
    case "twist":
    case "gauntlet":
    case "trial":
      return "sCurve";
    case "pressure":
    case "pressure2":
      return reach % 2 === 0 ? "sine" : "sCurve";
    default:
      return reach >= 2 ? "sine" : "straight";
  }
}

/**
 * Sample the rail at world Z by lerping the checkpoint polyline.
 * Returns centerline X/Y and a soft yaw hint (radians, + = toward +X).
 */
export function railAtZ(
  checkpoints: GatePos[],
  z: number,
): { x: number; y: number; yaw: number } {
  if (!checkpoints.length) return { x: 0, y: 2.5, yaw: 0 };
  if (checkpoints.length === 1) {
    const p = gateXYZ(checkpoints[0]!);
    return { x: p[0], y: p[1], yaw: 0 };
  }

  // Before first / after last — clamp to end segments.
  const first = gateXYZ(checkpoints[0]!);
  const last = gateXYZ(checkpoints[checkpoints.length - 1]!);
  if (z <= first[2]) {
    const b = gateXYZ(checkpoints[1]!);
    const yaw = Math.atan2(b[0] - first[0], Math.max(0.5, b[2] - first[2]));
    return { x: first[0], y: first[1], yaw };
  }
  if (z >= last[2]) {
    const a = gateXYZ(checkpoints[checkpoints.length - 2]!);
    const yaw = Math.atan2(last[0] - a[0], Math.max(0.5, last[2] - a[2]));
    return { x: last[0], y: last[1], yaw };
  }

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const a = gateXYZ(checkpoints[i]!);
    const b = gateXYZ(checkpoints[i + 1]!);
    if (z < a[2] || z > b[2]) continue;
    const span = Math.max(0.001, b[2] - a[2]);
    const t = (z - a[2]) / span;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const yaw = Math.atan2(b[0] - a[0], span);
    return { x, y, yaw };
  }

  return { x: last[0], y: last[1], yaw: 0 };
}

/** Frame-rate independent settle onto the rail (exponential damping). */
export function settleAxis(current: number, target: number, dt: number, lambda = 10): number {
  const k = 1 - Math.exp(-lambda * Math.max(0, dt));
  return current + (target - current) * k;
}
