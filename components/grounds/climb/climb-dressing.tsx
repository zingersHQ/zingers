"use client";
// Climb / Circuit scenography — lite terrain band + silhouette props under the
// corridor (docs/climb.md §2, §3 scenic Vista gaps; docs/circuit-world.md desktop).
//
// Mirror law: same biome palettes + nature kit as the Grounds. On desktop, ground
// + props prefer the HOST world biome (the region you portal'd from) while the
// Reach still skins sky/rings/lights. Perf: one low-poly terrain mesh, instanced
// props, corridor kept clear, graphics-tier budgets, no physics / no per-frame motion.
import { Suspense, memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { BiomeConfig } from "../biomes";
import type { CircuitTrackDef } from "../circuit";
import { sectorBounds } from "../circuit-tracks";
import { NaturePlacements, type PropPlacement } from "../nature";
import {
  climbNatureModels,
  naturePreset,
  natureTerrainPalette,
  natureUrl,
} from "@/lib/render/nature-kit";
import type { GraphicsTier } from "@/lib/graphics-tier";
import { roleOf, type Role } from "./difficulty";

const BASE_Y = -11.15;
const CORRIDOR_HALF = 5.4;
const SIDE_MIN = 7.2;
const SIDE_MAX = 19.5;

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rolling hills under the Climb — corridor stays low so rings stay readable. */
function climbHeight(x: number, z: number, seed: number, ridged: boolean): number {
  const n = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7 + seed * 17.3) * 43758.5453;
    return s - Math.floor(s);
  };
  const vn = (a: number, b: number) => {
    const xi = Math.floor(a);
    const zi = Math.floor(b);
    const xf = a - xi;
    const zf = b - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    const x1 = n(xi, zi) * (1 - u) + n(xi + 1, zi) * u;
    const x2 = n(xi, zi + 1) * (1 - u) + n(xi + 1, zi + 1) * u;
    return x1 * (1 - v) + x2 * v;
  };
  const fbm = (a: number, b: number, oct = 4) => {
    let amp = 0.5;
    let f = 1;
    let sum = 0;
    for (let i = 0; i < oct; i++) {
      sum += vn(a * f, b * f) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  };
  const ax = Math.abs(x);
  // Carve a soft trough under the flight lane so the pad/rings stay the focus.
  const corridor = ax < CORRIDOR_HALF ? Math.pow(1 - ax / CORRIDOR_HALF, 1.6) : 0;
  const rolling = fbm(x * 0.04 + 3, z * 0.032 + 3) * (ridged ? 2.8 : 2.1);
  const hills = fbm(x * 0.075 - 5, z * 0.068 - 5) * (ridged ? 1.9 : 1.25);
  const spire = ridged ? Math.max(0, fbm(x * 0.14 + 9, z * 0.14 + 9) - 0.55) * 3.4 : 0;
  const raw = Math.max(0, rolling + hills * 0.9 + spire);
  return raw * (1 - corridor * 0.92);
}

function roleDensity(role: Role): number {
  switch (role) {
    case "arrival":
      return 1.45;
    case "vista":
      return 1.6;
    case "trial":
      return 1.2;
    case "pressure":
    case "pressure2":
    case "gauntlet":
      return 0.72;
    default:
      return 1;
  }
}

function tierBudget(
  tier: GraphicsTier,
  densityScale: number,
): { props: number; segs: number; sky: boolean; scatter: number } {
  const d = Math.max(0.5, Math.min(2, densityScale));
  switch (tier) {
    case "high":
      return { props: Math.round(38 * d), segs: Math.min(40, Math.round(30 + (d - 1) * 8)), sky: true, scatter: 1 };
    case "mid":
      return { props: Math.round(20 * d), segs: Math.min(32, Math.round(22 + (d - 1) * 6)), sky: true, scatter: 0.72 };
    default:
      return { props: 0, segs: 14, sky: false, scatter: 0 };
  }
}

function ClimbSky({ top, bottom }: { top: string; bottom: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bottom) } },
        vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader:
          "varying vec3 v;uniform vec3 top;uniform vec3 bot;void main(){float h=normalize(v).y*0.5+0.5;gl_FragColor=vec4(mix(bot,top,pow(h,0.65)),1.0);}",
      }),
    [top, bottom],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} renderOrder={-2}>
      <sphereGeometry args={[240, 24, 12]} />
    </mesh>
  );
}

function TerrainBand({
  biome,
  track,
  seed,
  segs,
}: {
  biome: BiomeConfig;
  track: CircuitTrackDef;
  seed: number;
  segs: number;
}) {
  const earth = useMemo(() => natureTerrainPalette(biome.id), [biome.id]);
  const { maxZ } = useMemo(() => sectorBounds(track), [track]);
  const width = 46;
  const length = Math.max(48, maxZ + 28);
  const zCenter = maxZ * 0.42;

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, length, segs, Math.max(10, Math.floor(segs * (length / width))));
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(earth.low);
    const mid = new THREE.Color(earth.mid);
    const high = new THREE.Color(earth.high);
    const c = new THREE.Color();
    const band = biome.terrain.ridged ? 5.2 : 4.0;
    const ridged = !!biome.terrain.ridged;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = climbHeight(x, z + zCenter, seed, ridged);
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
  }, [earth, seed, width, length, segs, biome.terrain.ridged, zCenter]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh geometry={geo} position={[0, BASE_Y, zCenter]} receiveShadow={false}>
      <meshStandardMaterial vertexColors metalness={0.04} roughness={0.96} envMapIntensity={0.08} />
    </mesh>
  );
}

function reachTerrainSeed(biome: BiomeConfig, sector: number): number {
  // Stable within a Reach so the ground silhouette holds while props re-roll.
  return (biome.terrain.seed + Math.floor(sector / 10) * 131 + 90901) | 0;
}

function buildPlacements(
  biome: BiomeConfig,
  track: CircuitTrackDef,
  sector: number,
  role: Role,
  budget: number,
  scatter: number,
): PropPlacement[] {
  if (budget <= 0 || scatter <= 0) return [];
  const preset = naturePreset(biome.id);
  const models = climbNatureModels(biome.id);
  const treePool = models.filter((m) =>
    m.startsWith("CommonTree") || m.startsWith("DeadTree") || m.startsWith("TwistedTree") || m.startsWith("Pine"),
  );
  const rockPool = models.filter((m) => m.startsWith("Rock_"));
  const plantPool = models.filter((m) => preset.plants.includes(m) || preset.accents.includes(m));
  const grassPool = models.filter((m) => preset.grass.includes(m));
  const trees = treePool.length ? treePool : preset.trees.slice(0, 2);
  const rocks = rockPool.length ? rockPool : preset.rocks.slice(0, 2);
  const plants = plantPool.length ? plantPool : preset.plants.slice(0, 1);
  const grass = grassPool.length ? grassPool : preset.grass.slice(0, 2);

  const { maxZ } = sectorBounds(track);
  const ridged = !!biome.terrain.ridged;
  const heightSeed = reachTerrainSeed(biome, sector);
  const rng = mulberry((biome.terrain.seed + sector * 997 + 44001) | 0);
  const density = roleDensity(role);
  const target = Math.max(0, Math.round(budget * density * scatter));
  const out: PropPlacement[] = [];

  const sampleY = (x: number, z: number) => BASE_Y + climbHeight(x, z, heightSeed, ridged);

  // Arrival: denser near the launch; Vista/default: spread along the sector.
  const zBias = role === "arrival" ? 0.28 : 0.5;

  let tries = 0;
  while (out.length < target && tries < target * 18) {
    tries++;
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (SIDE_MIN + rng() * (SIDE_MAX - SIDE_MIN));
    const z = -6 + Math.pow(rng(), zBias) * (maxZ + 18);
    if (Math.abs(x) < CORRIDOR_HALF + 1.2) continue;
    const y = sampleY(x, z);
    const roll = rng();
    if (roll < 0.42) {
      out.push({
        modelId: trees[Math.floor(rng() * trees.length)]!,
        pos: [x, y, z],
        rot: [0, rng() * Math.PI * 2, (rng() - 0.5) * 0.05],
        scale: 0.95 + rng() * 0.7,
      });
    } else if (roll < 0.68) {
      out.push({
        modelId: rocks[Math.floor(rng() * rocks.length)]!,
        pos: [x + (rng() - 0.5) * 1.2, y, z + (rng() - 0.5) * 1.2],
        rot: [(rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2],
        scale: 0.55 + rng() * 0.85,
      });
    } else if (roll < 0.86 && plants.length) {
      out.push({
        modelId: plants[Math.floor(rng() * plants.length)]!,
        pos: [x, y, z],
        rot: [0, rng() * Math.PI * 2, 0],
        scale: 0.7 + rng() * 0.5,
      });
    } else if (grass.length) {
      out.push({
        modelId: grass[Math.floor(rng() * grass.length)]!,
        pos: [x, y, z],
        rot: [0, rng() * Math.PI * 2, 0],
        scale: 0.75 + rng() * 0.55,
      });
    }
  }

  // Vista — prop parade through the longest scenic gap (docs/climb.md §3).
  if (role === "vista") {
    const cps = track.checkpoints;
    let bestI = 0;
    let bestGap = 0;
    for (let i = 0; i < cps.length - 1; i++) {
      const gap = cps[i + 1]!.pos[2] - cps[i]!.pos[2];
      if (gap > bestGap) {
        bestGap = gap;
        bestI = i;
      }
    }
    const z0 = cps[bestI]!.pos[2] + bestGap * 0.18;
    const z1 = cps[bestI]!.pos[2] + bestGap * 0.82;
    const paradeN = Math.min(10, 5 + Math.floor(scatter * 4));
    for (let i = 0; i < paradeN; i++) {
      const t = paradeN <= 1 ? 0.5 : i / (paradeN - 1);
      const z = z0 + (z1 - z0) * t;
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (10.5 + (i % 3) * 1.4);
      const y = sampleY(x, z);
      out.push({
        modelId: trees[Math.floor(rng() * trees.length)]!,
        pos: [x, y, z],
        rot: [0, rng() * Math.PI * 2, 0],
        scale: 1.05 + rng() * 0.45,
      });
      if (rocks.length && rng() < 0.55) {
        out.push({
          modelId: rocks[Math.floor(rng() * rocks.length)]!,
          pos: [x + side * 1.8, y, z + (rng() - 0.5) * 2],
          rot: [0, rng() * Math.PI * 2, 0],
          scale: 0.7 + rng() * 0.5,
        });
      }
    }
  }

  // Gate Trial — one oversized signature landmark near the finish.
  if (role === "trial") {
    const finish = track.checkpoints[track.checkpoints.length - 1]!;
    const side = sector % 2 === 0 ? -1 : 1;
    const x = side * 14.5;
    const z = finish.pos[2] - 6;
    const y = sampleY(x, z);
    out.push({
      modelId: trees[0]!,
      pos: [x, y, z],
      rot: [0, 0.7, 0],
      scale: 1.85 + (sector % 5) * 0.08,
    });
    if (rocks[0]) {
      out.push({
        modelId: rocks[0],
        pos: [x - side * 3.2, y, z + 2.5],
        rot: [0.1, 1.2, 0],
        scale: 1.35,
      });
    }
  }

  return out;
}

function DressingProps({
  biome,
  track,
  sector,
  role,
  budget,
  scatter,
}: {
  biome: BiomeConfig;
  track: CircuitTrackDef;
  sector: number;
  role: Role;
  budget: number;
  scatter: number;
}) {
  const placements = useMemo(
    () => buildPlacements(biome, track, sector, role, budget, scatter),
    [biome, track, sector, role, budget, scatter],
  );
  if (placements.length === 0) return null;
  // Climb corridor is fog-lit — skip prop shadows (draw-call + fill cost).
  return <NaturePlacements placements={placements} castShadow={false} receiveShadow={false} />;
}

/** Corridor scenography shared by mobile Climb + desktop Circuit.
 *  `biome` = Reach skin (sky). `groundBiome` = host-world land (desktop). */
export const ClimbDressing = memo(function ClimbDressing({
  biome,
  track,
  sector,
  tier,
  groundBiome,
  showSky = true,
  densityScale = 1,
}: {
  biome: BiomeConfig;
  track: CircuitTrackDef;
  sector: number;
  tier: GraphicsTier;
  /** Host world land under the corridor (desktop Circuit). Defaults to Reach biome. */
  groundBiome?: BiomeConfig;
  /** Desktop World already mounts SkyDome — skip the lite Climb sky there. */
  showSky?: boolean;
  /** Desktop can push density; mobile stays at 1. */
  densityScale?: number;
}) {
  const land = groundBiome ?? biome;
  const role = roleOf(sector);
  const budget = tierBudget(tier, densityScale);
  // Host seed + Reach band so Ember chute stays ember-shaped but shifts per Reach.
  const seed = reachTerrainSeed(land, sector);

  useEffect(() => {
    if (budget.props <= 0) return;
    for (const id of climbNatureModels(land.id)) useGLTF.preload(natureUrl(id));
  }, [land.id, budget.props]);

  return (
    <group>
      {showSky && budget.sky && <ClimbSky top={biome.sky.top} bottom={biome.sky.bottom} />}
      <TerrainBand biome={land} track={track} seed={seed} segs={budget.segs} />
      {budget.props > 0 && (
        <Suspense fallback={null}>
          <DressingProps
            biome={land}
            track={track}
            sector={sector}
            role={role}
            budget={budget.props}
            scatter={budget.scatter}
          />
        </Suspense>
      )}
    </group>
  );
});

/** Mote count multiplier for role beats — Vista thickens the scenic glide. */
export function climbMoteScale(sector: number): number {
  const role = roleOf(sector);
  if (role === "vista") return 1.65;
  if (role === "arrival") return 1.25;
  if (role === "trial") return 1.15;
  return 1;
}

/** Static drift motes — shared by mobile Climb + desktop Circuit. */
export const ClimbDriftMotes = memo(function ClimbDriftMotes({
  track,
  accent,
  countScale = 1,
}: {
  track: CircuitTrackDef;
  accent: string;
  countScale?: number;
}) {
  const geom = useMemo(() => {
    const { maxY, maxZ } = sectorBounds(track);
    const n = Math.min(420, Math.round(260 * countScale));
    const arr = new Float32Array(n * 3);
    let s = 48271;
    const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rnd() - 0.5) * 40;
      arr[i * 3 + 1] = -7 + rnd() * (maxY + 16);
      arr[i * 3 + 2] = -8 + rnd() * (maxZ + 20);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [track, countScale]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <points geometry={geom}>
      <pointsMaterial
        color={accent}
        size={0.13}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
});
