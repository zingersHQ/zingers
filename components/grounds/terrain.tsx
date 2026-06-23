"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";

// flat central plaza (arena + champions live here); procedural wilds beyond
export const PLAZA_R = 36; // flat central plaza radius (+50% layout)
export const TERRAIN_HALF = 165; // terrain spans 330 x 330 (+50% layout)
export const RAMP = 27; // transition band width from plaza into the hills (+50%)

// ── the spawn knoll ─────────────────────────────────────────────────────────
// The Reader spawns at the outer extreme of the rift (+z for flat regions),
// then walks inward toward the plaza. The dome gives a clear opening view down
// the chasm and tapers to 0 at its foot.
export interface SpawnKnoll {
  x: number;
  z: number;
  radius: number;
  peak: number;
}

export const SPAWN_KNOLL: SpawnKnoll = { x: 0, z: 52, radius: 16, peak: 6 };

// The rift's outer lip — furthest from the plaza, where the Depth approach begins.
export const RIFT_OUTER_MARGIN = 22;
export const RIFT_OUTER_ALONG = TERRAIN_HALF - RIFT_OUTER_MARGIN;

export function hasRift(t: TerrainShape): boolean {
  return t.canyonDepth > 0;
}

export function riftDir(t: TerrainShape): { dirx: number; dirz: number } {
  return { dirx: Math.cos(t.canyonAngle), dirz: Math.sin(t.canyonAngle) };
}

export function riftAlong(x: number, z: number, t: TerrainShape): number {
  const { dirx, dirz } = riftDir(t);
  return x * dirx + z * dirz;
}

export function riftPerp(x: number, z: number, t: TerrainShape): number {
  const { dirx, dirz } = riftDir(t);
  return Math.abs(-dirz * x + dirx * z);
}

/** Deepest point on the rift centreline — where the Depth goal sits. */
export function riftDepthEnd(t: TerrainShape, knoll: SpawnKnoll = SPAWN_KNOLL): [number, number, number] {
  const { dirx, dirz } = riftDir(t);
  let bestY = Infinity;
  let best: [number, number, number] = [0, 0, 0];
  const start = PLAZA_R + 16;
  const end = TERRAIN_HALF - 24;
  for (let along = start; along <= end; along += 2) {
    const x = dirx * along;
    const z = dirz * along;
    const y = terrainHeight(x, z, t, knoll);
    if (y < bestY) {
      bestY = y;
      best = [x, y, z];
    }
  }
  return best;
}

// Spawn at the outer extreme of the rift (+z for flat regions) — the far lip where
// the Depth begins. You walk inward toward the plaza to claim it and enter.
export function spawnKnollFor(biome: BiomeConfig): SpawnKnoll {
  const shape = shapeOf(biome);
  if (hasRift(shape)) {
    const { dirx, dirz } = riftDir(shape);
    return { x: dirx * RIFT_OUTER_ALONG, z: dirz * RIFT_OUTER_ALONG, radius: 14, peak: 6 };
  }
  return { x: 0, z: RIFT_OUTER_ALONG, radius: 14, peak: 6 };
}

// height contribution of the spawn knoll at (x,z): a smooth dome that tops out at
// `peak` over its centre and tapers to 0 at its foot (which lands on the plaza
// rim, so it never pokes through the flat plaza floor disc).
function knollHeight(x: number, z: number, knoll: SpawnKnoll): number {
  const d = Math.hypot(x - knoll.x, z - knoll.z);
  if (d >= knoll.radius) return 0;
  const w = 1 - d / knoll.radius; // 1 at the peak → 0 at the foot
  return knoll.peak * w * w * (3 - 2 * w); // smoothstep dome
}

// ---- deterministic value-noise fbm ----
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const tl = hash(xi, zi), tr = hash(xi + 1, zi), bl = hash(xi, zi + 1), br = hash(xi + 1, zi + 1);
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v;
}
function fbm(x: number, z: number) {
  let a = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) {
    a += vnoise(x * f, z * f) * amp;
    f *= 2;
    amp *= 0.5;
  }
  return a; // ~0..0.93
}

// The SHAPE of the land — independent of its skin. Different worlds pass a
// different shape, so the geometry you walk through actually changes, not just
// the colours. Derived from a biome's terrain block via `shapeOf`.
export interface TerrainShape {
  seed: number;
  scale: number;
  rollAmp: number;
  ridgeAmp: number;
  rollFreq: number;
  ridgeFreq: number;
  ridged: boolean;
  // ── the great rift (optional) ────────────────────────────────────────────
  // A chasm carved OUTWARD from the plaza along a single bearing: real low
  // ground (negative height) you descend into or fly across. Depth 0 = no rift.
  canyonAngle: number; // bearing of the rift from plaza centre
  canyonHalfWidth: number; // half the rift's width
  canyonDepth: number; // how far the floor drops below datum (0 = flat region)
}

export function shapeOf(biome: BiomeConfig): TerrainShape {
  const t = biome.terrain;
  return {
    seed: t.seed,
    scale: t.heightScale,
    rollAmp: t.rollAmp,
    ridgeAmp: t.ridgeAmp,
    rollFreq: t.rollFreq,
    ridgeFreq: t.ridgeFreq,
    ridged: t.ridged,
    canyonAngle: t.canyonAngle ?? 0,
    canyonHalfWidth: t.canyonHalfWidth ?? 0,
    canyonDepth: t.canyonDepth ?? 0,
  };
}

/** World-space terrain height at (x,z). Flat (0) inside the plaza, rising hills beyond. */
export function terrainHeight(x: number, z: number, t: TerrainShape, knoll: SpawnKnoll = SPAWN_KNOLL): number {
  const kh = knollHeight(x, z, knoll);
  const d = Math.hypot(x, z);
  // flat plaza, save for the spawn knoll riding on its outer rim
  if (d <= PLAZA_R) return kh;
  const e = Math.min(1, (d - PLAZA_R) / RAMP);
  const ease = e * e * (3 - 2 * e);
  const s = t.seed;
  const rolling = fbm(x * t.rollFreq + 5 + s, z * t.rollFreq + 5 + s);
  let ridges = fbm(x * t.ridgeFreq - 7 + s, z * t.ridgeFreq - 7 + s);
  if (t.ridged) {
    // fold the ridge layer into sharp volcanic spines/spires
    const k = Math.abs(ridges * 2 - 1);
    ridges = (1 - k) * (1 - k);
  }
  let h = (rolling * t.rollAmp + ridges * t.ridgeAmp) * ease * t.scale;

  // Carve the great rift: a single-sided chasm running outward from the plaza.
  // Smootherstep walls, faded in from the plaza edge (so there's no cliff at the
  // boundary) and tapered before the far rim. The floor drops below datum.
  if (t.canyonDepth > 0) {
    const dirx = Math.cos(t.canyonAngle), dirz = Math.sin(t.canyonAngle);
    const along = x * dirx + z * dirz; // projection along the rift
    const perp = Math.abs(-dirz * x + dirx * z); // distance from the rift line
    if (along > 0 && perp < t.canyonHalfWidth) {
      const wp = 1 - perp / t.canyonHalfWidth; // 1 at centre → 0 at the walls
      const wall = wp * wp * (3 - 2 * wp);
      const endFade = Math.max(0, Math.min(1, (TERRAIN_HALF - 6 - along) / 24));
      h -= t.canyonDepth * wall * ease * endFade;
    }
  }
  // the knoll rises proud of whatever the wilds do here, so the spawn mound reads
  // as a clean hill in every biome (it tapers to 0 by the plaza rim anyway)
  return Math.max(h, kh);
}

export function Terrain({ biome }: { biome: BiomeConfig }) {
  const geo = useMemo(() => {
    const SEG = 128;
    const shape = shapeOf(biome);
    const knoll = spawnKnollFor(biome);
    const low = new THREE.Color(biome.terrain.low);
    const mid = new THREE.Color(biome.terrain.mid);
    const high = new THREE.Color(biome.terrain.high);
    const band = biome.terrain.colorBand;
    const g = new THREE.PlaneGeometry(TERRAIN_HALF * 2, TERRAIN_HALF * 2, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(x, z, shape, knoll);
      pos.setY(i, h);
      const t = Math.max(0, Math.min(1, h / band));
      if (t < 0.5) c.lerpColors(low, mid, t / 0.5);
      else c.lerpColors(mid, high, (t - 0.5) / 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [biome]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial vertexColors metalness={biome.terrain.metalness} roughness={biome.terrain.roughness} envMapIntensity={biome.daylight ? 0.04 : 0.5} flatShading />
      </mesh>
    </RigidBody>
  );
}

/** Instanced decorative scatter (rocks + crystals) placed on the hills via height sampling. */
export function Scatter({ biome }: { biome: BiomeConfig }) {
  const { rocks, crystals } = useMemo(() => {
    const rocks: THREE.Matrix4[] = [];
    const crystals: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const shape = shapeOf(biome);
    const knoll = spawnKnollFor(biome);
    let placed = 0;
    let guard = 0;
    while (placed < biome.scatter.count && guard < 5000) {
      guard++;
      const a = Math.random() * Math.PI * 2;
      const r = PLAZA_R + 4 + Math.random() * (TERRAIN_HALF - PLAZA_R - 10);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = terrainHeight(x, z, shape, knoll);
      if (y < 1.2) continue; // keep scatter on the risen hills
      const isCrystal = Math.random() < biome.scatter.crystalRatio;
      e.set(0, Math.random() * Math.PI * 2, isCrystal ? 0 : Math.random() * 0.4);
      q.setFromEuler(e);
      if (isCrystal) {
        const sc = 0.5 + Math.random() * 1.3;
        s.set(sc, sc + Math.random() * 1.2, sc);
        p.set(x, y + sc * 0.6, z);
        m.compose(p, q, s);
        crystals.push(m.clone());
      } else {
        const sc = 0.6 + Math.random() * 1.8;
        s.set(sc, sc * (0.6 + Math.random() * 0.5), sc);
        p.set(x, y + sc * 0.2, z);
        m.compose(p, q, s);
        rocks.push(m.clone());
      }
      placed++;
    }
    return { rocks, crystals };
  }, [biome]);

  return (
    <>
      <instancedMesh key={`r${biome.id}`} args={[undefined, undefined, Math.max(1, rocks.length)]} receiveShadow ref={(im) => applyMatrices(im, rocks)}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={biome.scatter.rock} roughness={0.9} metalness={0.1} flatShading />
      </instancedMesh>
      <instancedMesh key={`c${biome.id}`} args={[undefined, undefined, Math.max(1, crystals.length)]} ref={(im) => applyMatrices(im, crystals)}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={biome.scatter.crystal} emissive={biome.scatter.crystalEmissive} emissiveIntensity={biome.scatter.crystalEmissiveIntensity} roughness={0.3} metalness={0.4} />
      </instancedMesh>
    </>
  );
}

function applyMatrices(im: THREE.InstancedMesh | null, mats: THREE.Matrix4[]) {
  if (!im) return;
  for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
  im.count = mats.length;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
}
