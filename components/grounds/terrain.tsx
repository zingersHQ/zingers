"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";

// flat central plaza (arena + champions live here); procedural wilds beyond
export const PLAZA_R = 22;
export const TERRAIN_HALF = 100; // terrain spans 200 x 200
export const RAMP = 16; // transition band width from plaza into the hills

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
}

export function shapeOf(biome: BiomeConfig): TerrainShape {
  const t = biome.terrain;
  return { seed: t.seed, scale: t.heightScale, rollAmp: t.rollAmp, ridgeAmp: t.ridgeAmp, rollFreq: t.rollFreq, ridgeFreq: t.ridgeFreq, ridged: t.ridged };
}

/** World-space terrain height at (x,z). Flat (0) inside the plaza, rising hills beyond. */
export function terrainHeight(x: number, z: number, t: TerrainShape): number {
  const d = Math.hypot(x, z);
  if (d <= PLAZA_R) return 0;
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
  return (rolling * t.rollAmp + ridges * t.ridgeAmp) * ease * t.scale;
}

export function Terrain({ biome }: { biome: BiomeConfig }) {
  const geo = useMemo(() => {
    const SEG = 128;
    const shape = shapeOf(biome);
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
      const h = terrainHeight(x, z, shape);
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
      <mesh geometry={geo} receiveShadow castShadow>
        <meshStandardMaterial vertexColors metalness={biome.terrain.metalness} roughness={biome.terrain.roughness} envMapIntensity={0.5} flatShading />
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
    let placed = 0;
    let guard = 0;
    while (placed < biome.scatter.count && guard < 5000) {
      guard++;
      const a = Math.random() * Math.PI * 2;
      const r = PLAZA_R + 4 + Math.random() * (TERRAIN_HALF - PLAZA_R - 10);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = terrainHeight(x, z, shape);
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
      <instancedMesh key={`r${biome.id}`} args={[undefined, undefined, Math.max(1, rocks.length)]} castShadow receiveShadow ref={(im) => applyMatrices(im, rocks)}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={biome.scatter.rock} roughness={0.9} metalness={0.1} flatShading />
      </instancedMesh>
      <instancedMesh key={`c${biome.id}`} args={[undefined, undefined, Math.max(1, crystals.length)]} castShadow ref={(im) => applyMatrices(im, crystals)}>
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
