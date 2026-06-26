"use client";
// Quaternius Stylized Nature MegaKit — reinterprets the Grounds' procedural scatter,
// obelisks, spawn camino, and rift river as instanced rocks, landmark trees, path
// stones, and glowing understory. CC0 assets in public/models/nature/.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { BiomeConfig } from "./biomes";
import {
  PLAZA_R,
  TERRAIN_HALF,
  terrainHeight,
  spawnKnollFor,
  riftDir,
  riftAlong,
  riftDepthEnd,
  hasRift,
  type TerrainShape,
  type SpawnKnoll,
} from "./terrain";
import { ALL_NATURE_MODELS, naturePreset, natureUrl } from "@/lib/render/nature-kit";

for (const m of ALL_NATURE_MODELS) useGLTF.preload(natureUrl(m));

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── organic placement — patchy density + min-distance rejection ───────────────
function hash2(x: number, z: number, seed: number) {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 17.3) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, z: number, seed: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const tl = hash2(xi, zi, seed);
  const tr = hash2(xi + 1, zi, seed);
  const bl = hash2(xi, zi + 1, seed);
  const br = hash2(xi + 1, zi + 1, seed);
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v;
}

/** 0..1 patch mask — meadows vs bare dirt. */
function patchDensity(x: number, z: number, seed: number): number {
  let amp = 1, f = 0.026, sum = 0, norm = 0;
  for (let i = 0; i < 4; i++) {
    sum += vnoise(x * f + seed, z * f - seed * 0.3, seed + i * 41) * amp;
    norm += amp;
    f *= 2.05;
    amp *= 0.52;
  }
  return sum / norm;
}

class SpawnGrid {
  private cells = new Map<string, { x: number; z: number }[]>();
  constructor(
    private cellSize: number,
    private minDist: number,
  ) {}
  canPlace(x: number, z: number): boolean {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const r2 = this.minDist * this.minDist;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.cells.get(`${cx + dx},${cz + dz}`);
        if (!list) continue;
        for (const p of list) {
          if ((p.x - x) ** 2 + (p.z - z) ** 2 < r2) return false;
        }
      }
    }
    return true;
  }
  add(x: number, z: number) {
    const k = `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
    const list = this.cells.get(k) ?? [];
    list.push({ x, z });
    this.cells.set(k, list);
  }
}

function wildPoint(rng: () => number, edge: number, plazaR: number): { x: number; z: number } | null {
  for (let t = 0; t < 10; t++) {
    const x = (rng() * 2 - 1) * edge;
    const z = (rng() * 2 - 1) * edge;
    if (Math.hypot(x, z) >= plazaR) return { x, z };
  }
  return null;
}

function randomTilt(rng: () => number, amount = 0.22): [number, number, number] {
  return [(rng() - 0.5) * amount, rng() * Math.PI * 2, (rng() - 0.5) * amount * 0.6];
}

function randomScale3(rng: () => number, base: number, spread = 0.45): [number, number, number] {
  const s = base * (1 - spread * 0.5 + rng() * spread);
  return [s * (0.92 + rng() * 0.18), s * (0.78 + rng() * 0.55), s * (0.92 + rng() * 0.18)];
}

function firstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
  });
  return found;
}

/** How far to lift a model so its bounding-box base sits on y=0. */
function groundLift(root: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(root);
  return -box.min.y;
}

export interface PropPlacement {
  modelId: string;
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  scale3?: [number, number, number];
  emissive?: string;
  emissiveIntensity?: number;
}

function NatureProp({ modelId, pos, rot, scale, scale3, emissive, emissiveIntensity }: PropPlacement) {
  const { scene } = useGLTF(natureUrl(modelId));
  const lift = useMemo(() => groundLift(scene), [scene]);
  const s = scale3 ?? ([scale, scale, scale] as [number, number, number]);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (!emissive) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive = new THREE.Color(emissive);
          mat.emissiveIntensity = emissiveIntensity ?? 0.55;
        }
      }
    });
    return c;
  }, [scene, emissive, emissiveIntensity]);
  return (
    <primitive
      object={obj}
      position={[pos[0], pos[1] + lift * s[1], pos[2]]}
      rotation={rot}
      scale={s}
    />
  );
}

function InstancedNature({ modelId, matrices }: { modelId: string; matrices: THREE.Matrix4[] }) {
  const { scene } = useGLTF(natureUrl(modelId));
  const lift = useMemo(() => groundLift(scene), [scene]);
  const parts = useMemo(() => {
    const mesh = firstMesh(scene);
    if (!mesh) return null;
    const geo = mesh.geometry.clone();
    geo.computeBoundingSphere();
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone();
    return { geo, mat };
  }, [scene]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const up = new THREE.Matrix4().makeTranslation(0, lift, 0);
    for (let i = 0; i < matrices.length; i++) {
      im.setMatrixAt(i, up.clone().multiply(matrices[i]));
    }
    im.count = matrices.length;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [matrices, lift]);
  if (!parts || matrices.length === 0) return null;
  return <instancedMesh ref={ref} args={[parts.geo, parts.mat, matrices.length]} castShadow receiveShadow />;
}

function composeMatrix(
  x: number,
  y: number,
  z: number,
  rot: [number, number, number],
  scale: number,
  scale3?: [number, number, number],
): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  const s = scale3 ?? [scale, scale, scale];
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s[0], s[1], s[2]));
  return m;
}

function groupMatrices(placements: PropPlacement[]): Record<string, THREE.Matrix4[]> {
  const out: Record<string, THREE.Matrix4[]> = {};
  for (const p of placements) {
    (out[p.modelId] ??= []).push(composeMatrix(p.pos[0], p.pos[1], p.pos[2], p.rot, p.scale, p.scale3));
  }
  return out;
}

// ── turf carpet — patchy meadows, not a grid ──────────────────────────────────
export function NatureGround({ biome, shape }: { biome: BiomeConfig; shape: TerrainShape }) {
  const preset = naturePreset(biome.id);
  const instanced = useMemo(() => {
    const rng = mulberry(biome.terrain.seed + 66001);
    const knoll = spawnKnollFor(biome);
    const inst: PropPlacement[] = [];
    const edge = TERRAIN_HALF - 14;
    const seed = biome.terrain.seed;
    const target = biome.id === "ember" ? 420 : biome.id === "concord" ? 520 : 780;
    const grid = new SpawnGrid(3.2, biome.id === "ember" ? 2.4 : 1.85);
    const meadowCut = biome.id === "ember" ? 0.52 : 0.38;

    let tries = 0;
    while (inst.length < target && tries < target * 14) {
      tries++;
      const pt = wildPoint(rng, edge, PLAZA_R + 3);
      if (!pt) continue;
      const { x, z } = pt;
      const patch = patchDensity(x, z, seed);
      // sparse meadows on ember; lush irregular patches elsewhere
      const need = meadowCut + patch * (biome.id === "ember" ? 0.28 : 0.42);
      if (rng() > need) continue;
      if (!grid.canPlace(x, z)) continue;

      const y = terrainHeight(x, z, shape, knoll);
      if (y < 0.35) continue;

      grid.add(x, z);
      const modelId = preset.grass[Math.floor(rng() * preset.grass.length)];
      const base = 0.72 + patch * 0.35 + rng() * 0.28;
      inst.push({
        modelId,
        pos: [x, y, z],
        rot: randomTilt(rng, 0.28),
        scale: base,
        scale3: randomScale3(rng, base, 0.5),
      });

      // occasional buddy tuft hugging the first — breaks solo-grid feel
      if (patch > 0.55 && rng() > 0.62) {
        const ox = x + (rng() - 0.5) * 1.6;
        const oz = z + (rng() - 0.5) * 1.6;
        const oy = terrainHeight(ox, oz, shape, knoll);
        if (oy >= 0.35 && grid.canPlace(ox, oz)) {
          grid.add(ox, oz);
          const b = base * (0.82 + rng() * 0.35);
          inst.push({
            modelId: preset.grass[Math.floor(rng() * preset.grass.length)],
            pos: [ox, oy, oz],
            rot: randomTilt(rng, 0.35),
            scale: b,
            scale3: randomScale3(rng, b, 0.55),
          });
        }
      }
    }

    return groupMatrices(inst);
  }, [biome, shape, preset]);

  return (
    <>
      {Object.entries(instanced).map(([modelId, matrices]) => (
        <InstancedNature key={`turf-${modelId}`} modelId={modelId} matrices={matrices} />
      ))}
    </>
  );
}

export function NatureScatter({ biome, shape }: { biome: BiomeConfig; shape: TerrainShape }) {
  const preset = naturePreset(biome.id);
  const { instanced, props } = useMemo(() => {
    const rng = mulberry(biome.terrain.seed + 90210);
    const knoll = spawnKnollFor(biome);
    const inst: PropPlacement[] = [];
    const pr: PropPlacement[] = [];
    const edge = TERRAIN_HALF - 12;
    const seed = biome.terrain.seed;
    const rockGrid = new SpawnGrid(5.5, 4.5);
    const plantGrid = new SpawnGrid(7, 6.5);
    const accentGrid = new SpawnGrid(8, 7);

    const rockTarget = Math.floor(biome.scatter.count * 0.62);
    const plantTarget = Math.floor(biome.scatter.count * 0.22);
    const accentTarget = Math.floor(biome.scatter.count * biome.scatter.crystalRatio * 0.55);

    const placeRock = (x: number, z: number, y: number) => {
      if (!rockGrid.canPlace(x, z)) return false;
      rockGrid.add(x, z);
      const rotY = rng() * Math.PI * 2;
      if (rng() < 0.58) {
        const modelId = preset.pebbles[Math.floor(rng() * preset.pebbles.length)];
        const s = 0.45 + rng() * 1.0;
        inst.push({
          modelId,
          pos: [x, y + 0.02, z],
          rot: randomTilt(rng, 0.18),
          scale: s,
          scale3: randomScale3(rng, s, 0.35),
        });
      } else {
        const modelId = preset.rocks[Math.floor(rng() * preset.rocks.length)];
        const s = 0.75 + rng() * 1.35;
        inst.push({
          modelId,
          pos: [x, y, z],
          rot: randomTilt(rng, 0.32),
          scale: s,
          scale3: randomScale3(rng, s, 0.4),
        });
      }
      return true;
    };

    let guard = 0;
    while (inst.length < rockTarget && guard < rockTarget * 12) {
      guard++;
      const pt = wildPoint(rng, edge, PLAZA_R + 5);
      if (!pt) continue;
      const y = terrainHeight(pt.x, pt.z, shape, knoll);
      if (y < 1.0) continue;
      placeRock(pt.x, pt.z, y);
    }

    guard = 0;
    while (pr.length < plantTarget && guard < plantTarget * 16) {
      guard++;
      const pt = wildPoint(rng, edge, PLAZA_R + 4);
      if (!pt) continue;
      const patch = patchDensity(pt.x, pt.z, seed + 500);
      // plants live in lush patches, not everywhere
      if (patch < 0.42 + rng() * 0.18) continue;
      if (!plantGrid.canPlace(pt.x, pt.z)) continue;
      const y = terrainHeight(pt.x, pt.z, shape, knoll);
      if (y < 0.8) continue;

      plantGrid.add(pt.x, pt.z);
      const modelId = preset.plants[Math.floor(rng() * preset.plants.length)];
      const s = 0.7 + patch * 0.35 + rng() * 0.45;
      pr.push({
        modelId,
        pos: [pt.x, y, pt.z],
        rot: randomTilt(rng, 0.15),
        scale: s,
        scale3: randomScale3(rng, s, 0.38),
      });
    }

    let accents = 0;
    guard = 0;
    while (accents < accentTarget && guard < accentTarget * 18) {
      guard++;
      const pt = wildPoint(rng, edge, PLAZA_R + 6);
      if (!pt) continue;
      const patch = patchDensity(pt.x, pt.z, seed + 900);
      if (patch < 0.48 && rng() > 0.25) continue;
      if (!accentGrid.canPlace(pt.x, pt.z)) continue;
      const y = terrainHeight(pt.x, pt.z, shape, knoll);
      if (y < 0.6) continue;

      accentGrid.add(pt.x, pt.z);
      const modelId = preset.accents[Math.floor(rng() * preset.accents.length)];
      const s = 0.85 + rng() * 0.55;
      pr.push({
        modelId,
        pos: [pt.x, y, pt.z],
        rot: randomTilt(rng, 0.12),
        scale: s,
        scale3: randomScale3(rng, s, 0.3),
        emissive: biome.scatter.crystalEmissive,
        emissiveIntensity: biome.scatter.crystalEmissiveIntensity * 0.45,
      });
      accents++;
    }

    return { instanced: groupMatrices(inst), props: pr };
  }, [biome, shape, preset]);

  return (
    <>
      {Object.entries(instanced).map(([modelId, matrices]) => (
        <InstancedNature key={modelId} modelId={modelId} matrices={matrices} />
      ))}
      {props.map((p, i) => (
        <NatureProp key={`${p.modelId}-${i}`} {...p} />
      ))}
    </>
  );
}

export function NatureLandmarks({
  biome,
  shape,
  count,
  pillar,
}: {
  biome: BiomeConfig;
  shape: TerrainShape;
  count: number;
  pillar: "obelisk" | "basalt";
}) {
  const preset = naturePreset(biome.id);
  const props = useMemo(() => {
    const rng = mulberry(biome.terrain.seed + 44001);
    const out: PropPlacement[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = PLAZA_R + 14 + (i % 3) * 6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const base = terrainHeight(x, z, shape);
      const rotY = rng() * Math.PI * 2;

      if (pillar === "basalt") {
        if (i % 3 === 0) {
          out.push({
            modelId: preset.rocks[Math.floor(rng() * preset.rocks.length)],
            pos: [x, base, z],
            rot: [(rng() - 0.5) * 0.4, rotY, (rng() - 0.5) * 0.35],
            scale: 1.6 + rng() * 1.2,
          });
        } else {
          const treePool = preset.trees.filter((t) => t.startsWith("Dead") || t.startsWith("Twisted"));
          out.push({
            modelId: treePool[Math.floor(rng() * treePool.length)] ?? preset.trees[0],
            pos: [x, base, z],
            rot: [0, rotY, (rng() - 0.5) * 0.15],
            scale: 1.1 + rng() * 0.5,
          });
        }
      } else {
        const treePool = preset.trees.filter((t) => !t.startsWith("Dead"));
        out.push({
          modelId: treePool[Math.floor(rng() * treePool.length)] ?? preset.trees[0],
          pos: [x, base, z],
          rot: [0, rotY, 0],
          scale: 1.05 + rng() * 0.55,
        });
      }
    }
    return out;
  }, [biome, shape, count, pillar, preset]);

  return (
    <>
      {props.map((p, i) => (
        <NatureProp key={`lm-${i}`} {...p} />
      ))}
    </>
  );
}

export function NatureSpawnPath({
  biome,
  shape,
  knoll,
}: {
  biome: BiomeConfig;
  shape: TerrainShape;
  knoll: SpawnKnoll;
}) {
  const preset = naturePreset(biome.id);
  const props = useMemo(() => {
    const rng = mulberry(biome.terrain.seed + 77102);
    const out: PropPlacement[] = [];
    const STEP = 2.6;
    const ARENA_RIM = 9.2;

    const pushSeg = (x: number, z: number, heading: number, scale = 1) => {
      const modelId = preset.paths[Math.floor(rng() * preset.paths.length)];
      const y = terrainHeight(x, z, shape, knoll);
      out.push({
        modelId,
        pos: [x, y + 0.04, z],
        rot: [0, heading, 0],
        scale: scale * (0.85 + rng() * 0.25),
      });
    };

    if (hasRift(shape)) {
      const { dirx, dirz } = riftDir(shape);
      const perpx = -dirz;
      const perpz = dirx;
      const spawnAlong = riftAlong(knoll.x, knoll.z, shape);
      const [dx, , dz] = riftDepthEnd(shape, knoll);
      const depthAlong = riftAlong(dx, dz, shape);
      const heading = Math.atan2(-dirx, -dirz);

      for (let along = spawnAlong; along >= depthAlong; along -= STEP) {
        pushSeg(dirx * along, dirz * along, heading, 1.05);
        if (rng() > 0.55) {
          const w = 0.9 + rng() * 0.5;
          pushSeg(dirx * along + perpx * w, dirz * along + perpz * w, heading + (rng() - 0.5) * 0.15, 0.75);
          pushSeg(dirx * along - perpx * w, dirz * along - perpz * w, heading + (rng() - 0.5) * 0.15, 0.75);
        }
      }
      for (let along = depthAlong - STEP; along >= ARENA_RIM; along -= STEP) {
        const widen = along < PLAZA_R ? 1 + (PLAZA_R - along) * 0.05 : 1;
        pushSeg(dirx * along, dirz * along, heading, 1.0 * widen);
      }
      return out;
    }

    const heading = Math.PI;
    for (let z = knoll.z; z >= ARENA_RIM; z -= STEP) {
      const widen = z > PLAZA_R ? 1 : 1 + (PLAZA_R - z) * 0.05;
      pushSeg(0, z, heading, widen);
      if (rng() > 0.5) {
        pushSeg(widen * 1.1, z, heading + 0.08, 0.7);
        pushSeg(-widen * 1.1, z, heading - 0.08, 0.7);
      }
    }
    return out;
  }, [biome, shape, knoll, preset]);

  return (
    <>
      {props.map((p, i) => (
        <NatureProp key={`path-${i}`} {...p} />
      ))}
    </>
  );
}

export function NatureRift({ biome, shape }: { biome: BiomeConfig; shape: TerrainShape }) {
  const preset = naturePreset(biome.id);
  const { glow, pathProps, mounts } = useMemo(() => {
    if (shape.canyonDepth <= 0) return { glow: null, pathProps: [] as PropPlacement[], mounts: [] as PropPlacement[] };
    const rng = mulberry(biome.terrain.seed + 33007);
    const col = biome.id === "ember" ? "#ff4d14" : biome.id === "void" ? "#34ffd0" : "#8a5cff";
    const { dirx, dirz } = riftDir(shape);
    const start = PLAZA_R + 6;
    const end = TERRAIN_HALF - 16;
    const N = 18;
    const segs: { r: number; y: number; w: number }[] = [];
    const paths: PropPlacement[] = [];
    const mnts: PropPlacement[] = [];
    const heading = Math.atan2(dirx, dirz);

    for (let i = 0; i < N; i++) {
      const r = start + (i / (N - 1)) * (end - start);
      const x = dirx * r;
      const z = dirz * r;
      const y = terrainHeight(x, z, shape) + 0.06;
      const w = shape.canyonHalfWidth * (0.7 + 0.25 * Math.sin(i));
      segs.push({ r, y, w });

      const modelId = preset.paths[i % preset.paths.length];
      paths.push({
        modelId,
        pos: [x, y + 0.05, z],
        rot: [0, heading + (rng() - 0.5) * 0.12, 0],
        scale: 0.95 + (i % 3) * 0.08,
      });

      const perpx = -dirz;
      const perpz = dirx;
      const wall = w * 0.92;
      for (const side of [-1, 1] as const) {
        if (i % 2 === 1 && rng() > 0.35) continue;
        const rockId = preset.rocks[Math.floor(rng() * preset.rocks.length)];
        mnts.push({
          modelId: rockId,
          pos: [x + perpx * wall * side, y, z + perpz * wall * side],
          rot: [(rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.4],
          scale: 1.2 + rng() * 1.1,
        });
      }
    }

    return { glow: { col, segs, len: (end - start) / N + 1.8, lit: [2, 7, 12] as number[] }, pathProps: paths, mounts: mnts };
  }, [biome, shape, preset]);

  if (!glow) return null;
  const hazard = biome.id === "ember";

  return (
    <>
      <group rotation={[0, -shape.canyonAngle, 0]}>
        {glow.segs.map((s, i) => (
          <mesh key={`glow-${i}`} position={[s.r, s.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[glow.len, s.w * 0.55]} />
            <meshBasicMaterial
              color={glow.col}
              transparent
              opacity={hazard ? 0.72 : 0.42}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
              fog={false}
            />
          </mesh>
        ))}
        {glow.lit.map((li) =>
          glow.segs[li] ? (
            <pointLight
              key={`lit-${li}`}
              position={[glow.segs[li].r, glow.segs[li].y + 2.4, 0]}
              intensity={hazard ? 48 : 30}
              color={glow.col}
              distance={28}
            />
          ) : null,
        )}
      </group>
      {pathProps.map((p, i) => (
        <NatureProp key={`rift-path-${i}`} {...p} />
      ))}
      {mounts.map((p, i) => (
        <NatureProp key={`rift-mount-${i}`} {...p} />
      ))}
    </>
  );
}

export function NatureIslandDressing({
  biome,
  positions,
}: {
  biome: BiomeConfig;
  positions: [number, number, number][];
}) {
  const preset = naturePreset(biome.id);
  const props = useMemo(() => {
    const rng = mulberry(biome.terrain.seed + 55009);
    const out: PropPlacement[] = [];
    for (const pos of positions) {
      const treeId = preset.trees[Math.floor(rng() * preset.trees.length)];
      out.push({
        modelId: treeId,
        pos: [pos[0], pos[1] + 0.6, pos[2]],
        rot: [0, rng() * Math.PI * 2, 0],
        scale: 0.55 + rng() * 0.25,
      });
      if (rng() > 0.4) {
        const plantId = preset.plants[Math.floor(rng() * preset.plants.length)];
        out.push({
          modelId: plantId,
          pos: [pos[0] + (rng() - 0.5) * 2.5, pos[1] + 0.5, pos[2] + (rng() - 0.5) * 2.5],
          rot: [0, rng() * Math.PI * 2, 0],
          scale: 0.5 + rng() * 0.3,
          emissive: biome.floatCrystal.emissive,
          emissiveIntensity: 0.25,
        });
      }
    }
    return out;
  }, [biome, positions, preset]);

  return (
    <>
      {props.map((p, i) => (
        <NatureProp key={`isle-${i}`} {...p} />
      ))}
    </>
  );
}

export function NaturePeaks({ biome, shape }: { biome: BiomeConfig; shape: TerrainShape }) {
  const preset = naturePreset(biome.id);
  const props = useMemo(() => {
    const rng = mulberry(biome.terrain.seed + 12004);
    const knoll = spawnKnollFor(biome);
    const out: PropPlacement[] = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rng() * 0.4;
      const r = PLAZA_R + 28 + (i % 4) * 14;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = terrainHeight(x, z, shape, knoll);
      if (y < 4) continue;
      const modelId = preset.rocks[Math.floor(rng() * preset.rocks.length)];
      out.push({
        modelId,
        pos: [x, y, z],
        rot: [(rng() - 0.5) * 0.3, rng() * Math.PI * 2, (rng() - 0.5) * 0.25],
        scale: 1.8 + rng() * 1.6,
      });
      if (rng() > 0.45) {
        const treeId = preset.trees[Math.floor(rng() * preset.trees.length)];
        out.push({
          modelId: treeId,
          pos: [x + (rng() - 0.5) * 4, y, z + (rng() - 0.5) * 4],
          rot: [0, rng() * Math.PI * 2, 0],
          scale: 0.9 + rng() * 0.35,
        });
      }
    }
    return out;
  }, [biome, shape, preset]);

  return (
    <>
      {props.map((p, i) => (
        <NatureProp key={`peak-${i}`} {...p} />
      ))}
    </>
  );
}
