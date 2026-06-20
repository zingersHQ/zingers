"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { CreatureType } from "@/lib/types";
import { kitFor } from "@/lib/render/archetypes";

const GOLD = "#f5d020";

/** The per-Force signature attachment set. These are floating "energy
 *  constructs" sized to the body height `h` — they read as the creature's species
 *  markings, not bolt-ons, and stay legible even when the underlying base mesh is
 *  the shared robot. `color` is the Force colour; `accent` is the identity glint. */
export function ArchetypeFeatures({
  type,
  h,
  color,
  accent = GOLD,
  dim = false,
}: {
  type: CreatureType;
  h: number;
  color: string;
  accent?: string;
  /** quieter, gallery-friendly intensity */
  dim?: boolean;
}) {
  const set = kitFor(type).featureSet;
  const col = useMemo(() => new THREE.Color(color), [color]);
  const acc = useMemo(() => new THREE.Color(accent), [accent]);
  const k = dim ? 0.62 : 1;
  switch (set) {
    case "lattice":
      return <Lattice h={h} col={col} acc={acc} k={k} />;
    case "static":
      return <Static h={h} col={col} k={k} />;
    case "monolith":
      return <Monolith h={h} col={col} acc={acc} k={k} />;
    case "chorus":
      return <Chorus h={h} col={col} acc={acc} k={k} />;
    case "spark":
      return <Spark h={h} col={col} acc={acc} k={k} />;
    default:
      return null;
  }
}

// ── LOGIC · The Lattice — a gyroscope of orthogonal rings + a proof-sigil ──────
function Lattice({ h, col, acc, k }: { h: number; col: THREE.Color; acc: THREE.Color; k: number }) {
  const g = useRef<THREE.Group>(null);
  const sigil = useRef<THREE.Mesh>(null);
  const cubes = useRef<THREE.Group>(null);
  const r = h * 0.3;
  useFrame((s, dt) => {
    if (g.current) {
      g.current.rotation.y += dt * 0.35;
      g.current.rotation.x += dt * 0.12;
    }
    if (sigil.current) {
      sigil.current.rotation.y += dt * 0.9;
      sigil.current.rotation.x += dt * 0.4;
      sigil.current.position.y = h * 1.2 + Math.sin(s.clock.elapsedTime * 1.2) * 0.04;
    }
    if (cubes.current) cubes.current.rotation.y -= dt * 0.5;
  });
  return (
    <group>
      <group ref={g} position={[0, h * 0.86, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[i === 0 ? Math.PI / 2 : 0, i === 1 ? Math.PI / 2 : 0, i === 2 ? Math.PI / 2 : 0]}>
            <torusGeometry args={[r * (1 - i * 0.12), 0.018 * h, 8, 64]} />
            <meshBasicMaterial color={col} transparent opacity={0.5 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* proof sigil — a precise tetrahedron hovering above */}
      <mesh ref={sigil} position={[0, h * 1.2, 0]}>
        <tetrahedronGeometry args={[h * 0.1, 0]} />
        <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={1.8 * k} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* four cubes in a fixed square orbit — order made visible */}
      <group ref={cubes} position={[0, h * 0.55, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * r * 1.25, 0, Math.sin(a) * r * 1.25]} rotation={[a, a, 0]}>
              <boxGeometry args={[0.09 * h, 0.09 * h, 0.09 * h]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.2 * k} metalness={0.7} roughness={0.18} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ── CHAOS · The Static — erratic, flickering, asymmetric shard storm ───────────
function Static({ h, col, k }: { h: number; col: THREE.Color; k: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const shards = useMemo(
    () =>
      Array.from({ length: 9 }, () => ({
        a: Math.random() * 6.28,
        r: h * (0.42 + Math.random() * 0.55),
        y: h * (0.25 + Math.random() * 0.9),
        s: h * (0.05 + Math.random() * 0.09),
        spd: (Math.random() - 0.5) * 2.4,
        jit: Math.random() * 6.28,
        oct: Math.random() > 0.5,
      })),
    [h],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      const sh = shards[i];
      if (!m || !sh) continue;
      sh.a += sh.spd * 0.016;
      const jitter = Math.sin(t * 9 + sh.jit) * 0.06 * h;
      m.position.set(Math.cos(sh.a) * sh.r + jitter, sh.y + Math.sin(t * 5 + sh.jit) * 0.08 * h, Math.sin(sh.a) * sh.r);
      m.rotation.x += 0.08;
      m.rotation.z += 0.05;
      // flicker the emissive — noise made visible
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (Math.sin(t * 14 + sh.jit) > 0.4 ? 2.4 : 0.7) * k;
    }
  });
  return (
    <group>
      {shards.map((sh, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          {sh.oct ? <octahedronGeometry args={[sh.s, 0]} /> : <tetrahedronGeometry args={[sh.s * 1.3, 0]} />}
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6 * k} metalness={0.3} roughness={0.5} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── COMPOSURE · The Stillness — a monolith slab + heavy grounding ─────────────
function Monolith({ h, col, acc, k }: { h: number; col: THREE.Color; acc: THREE.Color; k: number }) {
  const seam = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (seam.current) {
      const mat = seam.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.4 + Math.sin(s.clock.elapsedTime * 0.9) * 0.12) * k;
    }
  });
  const slabH = h * 1.15;
  return (
    <group>
      {/* the slab standing at the figure's back */}
      <group position={[0, slabH * 0.5, -h * 0.42]}>
        <mesh castShadow>
          <boxGeometry args={[h * 0.62, slabH, h * 0.12]} />
          <meshStandardMaterial color="#1a2622" emissive={col} emissiveIntensity={0.18 * k} metalness={0.2} roughness={0.85} flatShading />
        </mesh>
        {/* glowing seam down the slab */}
        <mesh ref={seam} position={[0, 0, h * 0.061]}>
          <planeGeometry args={[h * 0.05, slabH * 0.82]} />
          <meshBasicMaterial color={col} transparent opacity={0.45 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      {/* heavy double ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[h * 0.5, h * 0.62, 56]} />
        <meshBasicMaterial color={col} transparent opacity={0.35 * k} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[h * 0.66, h * 0.7, 56]} />
        <meshBasicMaterial color={acc} transparent opacity={0.28 * k} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* shoulder slab caps */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * h * 0.26, h * 0.74, 0]} rotation={[0, 0, sgn * 0.12]} castShadow>
          <boxGeometry args={[h * 0.14, h * 0.1, h * 0.2]} />
          <meshStandardMaterial color="#22302b" emissive={col} emissiveIntensity={0.22 * k} metalness={0.25} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ── RHETORIC · The Chorus — a broadcast fan + rising glyph motes ──────────────
function Chorus({ h, col, acc, k }: { h: number; col: THREE.Color; acc: THREE.Color; k: number }) {
  const fan = useRef<THREE.Group>(null);
  const motes = useRef<(THREE.Mesh | null)[]>([]);
  const blades = 9;
  const moteSeeds = useMemo(() => Array.from({ length: 7 }, () => ({ a: Math.random() * 6.28, r: h * (0.35 + Math.random() * 0.4), spd: 0.3 + Math.random() * 0.5, ph: Math.random() * 6.28 })), [h]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (fan.current) fan.current.rotation.z = Math.sin(t * 0.6) * 0.06;
    for (let i = 0; i < motes.current.length; i++) {
      const m = motes.current[i];
      const sd = moteSeeds[i];
      if (!m || !sd) continue;
      sd.a += sd.spd * 0.01;
      m.position.set(Math.cos(sd.a) * sd.r, h * 0.9 + ((t * 0.3 + sd.ph) % 1) * h * 0.5, Math.sin(sd.a) * sd.r);
      m.rotation.y += 0.05;
    }
  });
  return (
    <group>
      {/* sunburst fan behind the upper body */}
      <group ref={fan} position={[0, h * 0.8, -h * 0.34]}>
        {Array.from({ length: blades }).map((_, i) => {
          const a = (i / (blades - 1) - 0.5) * Math.PI * 0.9;
          return (
            <mesh key={i} rotation={[0, 0, a]} position={[0, 0, 0]}>
              <coneGeometry args={[0.03 * h, h * 0.9, 4]} />
              <meshBasicMaterial color={i % 2 ? acc : col} transparent opacity={0.32 * k} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>
      {/* halo above */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h * 1.12, 0]}>
        <torusGeometry args={[h * 0.22, 0.02 * h, 8, 48]} />
        <meshBasicMaterial color={acc} transparent opacity={0.6 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* rising glyph motes */}
      {moteSeeds.map((_, i) => (
        <mesh key={i} ref={(el) => { motes.current[i] = el; }}>
          <tetrahedronGeometry args={[0.045 * h, 0]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6 * k} metalness={0.3} roughness={0.3} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// ── CREATIVITY · The Spark — orbiting idea-orbs + a starburst spark ───────────
function Spark({ h, col, acc, k }: { h: number; col: THREE.Color; acc: THREE.Color; k: number }) {
  const orbs = useRef<(THREE.Mesh | null)[]>([]);
  const burst = useRef<THREE.Group>(null);
  // mostly the Spark's gold with two restrained accents — a hint of invention,
  // not a rainbow (see docs/bible/art-direction.md).
  const palette = useMemo(() => ["#f5d020", "#f5d020", "#ffd86a", "#7fd0ff", "#ff8ad8"], []);
  const seeds = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({ a: Math.random() * 6.28, r: h * (0.4 + Math.random() * 0.45), y: h * (0.5 + Math.random() * 0.6), spd: 0.5 + Math.random() * 0.8, ph: Math.random() * 6.28, c: palette[i % palette.length], s: h * (0.05 + Math.random() * 0.05) })),
    [h, palette],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < orbs.current.length; i++) {
      const m = orbs.current[i];
      const sd = seeds[i];
      if (!m || !sd) continue;
      sd.a += sd.spd * 0.012;
      m.position.set(Math.cos(sd.a) * sd.r, sd.y + Math.sin(t * 1.4 + sd.ph) * 0.12 * h, Math.sin(sd.a * 1.3) * sd.r);
    }
    if (burst.current) {
      burst.current.rotation.y += 0.03;
      const sc = 1 + Math.sin(t * 3) * 0.12;
      burst.current.scale.setScalar(sc);
    }
  });
  return (
    <group>
      {/* orbiting idea-orbs */}
      {seeds.map((sd, i) => (
        <mesh key={i} ref={(el) => { orbs.current[i] = el; }}>
          <sphereGeometry args={[sd.s, 14, 14]} />
          <meshStandardMaterial color={sd.c} emissive={sd.c} emissiveIntensity={1.7 * k} metalness={0.2} roughness={0.25} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* the spark itself — a starburst of thin cones above the head */}
      <group ref={burst} position={[0, h * 1.16, 0]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} rotation={[Math.PI / 2, 0, a]} position={[Math.cos(a) * h * 0.06, 0, Math.sin(a) * h * 0.06]}>
              <coneGeometry args={[0.02 * h, h * 0.2, 4]} />
              <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={2.0 * k} metalness={0.4} roughness={0.2} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
