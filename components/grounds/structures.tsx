"use client";
// Bespoke built environments. Each world composes a DIFFERENT building around
// the arena floor — a stone amphitheatre vs a volcanic caldera — so switching
// world changes the architecture you stand in, not just its colour. Code-only:
// stylized primitives + procedural materials, tuned for a cohesive look.
import { useMemo } from "react";
import * as THREE from "three";
import type { BiomeConfig } from "./biomes";
import { PLAZA_R } from "./terrain";

const TWO_PI = Math.PI * 2;

// deterministic PRNG so a world's silhouette is stable across renders
function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// molten crack texture for the pit floor / lava seams
function crackTexture(hot: string, core: string): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000";
  x.fillRect(0, 0, S, S);
  const r = mulberry(99);
  // branching molten veins
  for (let i = 0; i < 26; i++) {
    let px = r() * S, py = r() * S;
    const grd = x.createLinearGradient(px, py, px + 40, py + 40);
    grd.addColorStop(0, core);
    grd.addColorStop(1, hot);
    x.strokeStyle = grd;
    x.lineWidth = 1 + r() * 3;
    x.beginPath();
    x.moveTo(px, py);
    const steps = 8 + Math.floor(r() * 10);
    for (let s = 0; s < steps; s++) {
      px += (r() - 0.5) * 60;
      py += (r() - 0.5) * 60;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ── Grounds: a stone amphitheatre ring ───────────────────────────────────────
function ColosseumWall({ biome }: { biome: BiomeConfig }) {
  const R = PLAZA_R + 2;
  const stone = biome.plaza.color;
  const stoneDark = biome.terrain.mid;
  const trim = biome.lights.arenaPoint;
  const archN = 30;
  const arches = useMemo(() => Array.from({ length: archN }, (_, i) => (i / archN) * TWO_PI), []);
  return (
    <group>
      {/* lower colonnade — a ring of columns with a cornice */}
      {arches.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * R, 3, Math.sin(a) * R]} castShadow>
          <boxGeometry args={[0.7, 6, 0.7]} />
          <meshStandardMaterial color={stone} roughness={0.82} metalness={0.08} envMapIntensity={0.7} />
        </mesh>
      ))}
      {/* base plinth */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
        <ringGeometry args={[R - 0.9, R + 0.9, 80]} />
        <meshStandardMaterial color={stoneDark} roughness={0.9} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* cornice ring with emissive trim */}
      <mesh position={[0, 6.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 0.2, 0.32, 12, 96]} />
        <meshStandardMaterial color={stone} emissive={trim} emissiveIntensity={0.35} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* upper tier — a taller, set-back wall to read as a true amphitheatre */}
      <mesh position={[0, 9.2, 0]}>
        <cylinderGeometry args={[R + 1.6, R + 1.2, 6, 80, 1, true]} />
        <meshStandardMaterial color={stoneDark} side={THREE.DoubleSide} roughness={0.9} metalness={0.08} />
      </mesh>
      {/* crowning emissive band */}
      <mesh position={[0, 12.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 1.6, 0.18, 10, 96]} />
        <meshBasicMaterial color={trim} />
      </mesh>
    </group>
  );
}

// ── Ember: a jagged volcanic caldera rim ─────────────────────────────────────
function CalderaRim({ biome }: { biome: BiomeConfig }) {
  const R = PLAZA_R + 2;
  const rock = biome.obelisk.color;
  const lava = biome.lights.arenaPoint;
  const spikes = useMemo(() => {
    const r = mulberry(53);
    return Array.from({ length: 54 }, (_, i) => {
      const a = (i / 54) * TWO_PI + (r() - 0.5) * 0.08;
      const rad = R + (r() - 0.4) * 2.4;
      const h = 4 + r() * 11;
      const w = 1.1 + r() * 1.8;
      return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, h, w, rot: r() * TWO_PI, lean: (r() - 0.5) * 0.3 };
    });
  }, [R]);
  return (
    <group>
      {/* dark continuous lip with a molten seam at the base */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} receiveShadow>
        <ringGeometry args={[R - 1.2, R + 2.6, 96]} />
        <meshStandardMaterial color={rock} roughness={0.95} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <ringGeometry args={[R - 1.3, R - 0.9, 96]} />
        <meshBasicMaterial color={lava} />
      </mesh>
      {/* jagged basalt teeth around the rim */}
      {spikes.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2, s.z]} rotation={[s.lean, s.rot, s.lean]} castShadow>
          <coneGeometry args={[s.w, s.h, 5]} />
          <meshStandardMaterial color={rock} emissive={lava} emissiveIntensity={0.18} roughness={0.95} metalness={0.06} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function PlazaSurround({ biome }: { biome: BiomeConfig }) {
  return biome.scene.surround === "caldera" ? <CalderaRim biome={biome} /> : <ColosseumWall biome={biome} />;
}

// ── central arena: a lava pit instead of a gilded ring ───────────────────────
export function PitArena({ biome }: { biome: BiomeConfig }) {
  const lava = biome.lights.arenaPoint;
  const rock = biome.obelisk.color;
  const tex = useMemo(() => crackTexture(lava, "#fff2cc"), [lava]);
  const teeth = useMemo(() => Array.from({ length: 22 }, (_, i) => (i / 22) * TWO_PI), []);
  return (
    <group>
      {/* sunken molten basin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
        <circleGeometry args={[6.5, 80]} />
        <meshStandardMaterial color="#1a0a06" emissive={lava} emissiveMap={tex} emissiveIntensity={1.8} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* glowing rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[6.6, 0.24, 16, 160]} />
        <meshStandardMaterial color={lava} emissive={lava} emissiveIntensity={2.8} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* basalt teeth ringing the pit */}
      {teeth.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 6.6, 0.55, Math.sin(a) * 6.6]} rotation={[0, a, 0]} castShadow>
          <coneGeometry args={[0.34, 1.5 + (i % 3) * 0.4, 4]} />
          <meshStandardMaterial color={rock} emissive={lava} emissiveIntensity={0.2} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}
