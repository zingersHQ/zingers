"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { CreatureType } from "@/lib/types";
import { kitFor } from "@/lib/render/archetypes";

const GOLD = "#f5d020";

// deterministic per-individual RNG so a mind's shard/mote/orb layout is stable
// across remounts instead of reshuffling every time it scrolls into view.
function rngFrom(seed: number) {
  let a = (seed || 1) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
  seed = 0,
}: {
  type: CreatureType;
  h: number;
  color: string;
  accent?: string;
  /** quieter, gallery-friendly intensity */
  dim?: boolean;
  /** identity seed → stable construct layout */
  seed?: number;
}) {
  const set = kitFor(type).featureSet;
  const col = useMemo(() => new THREE.Color(color), [color]);
  const acc = useMemo(() => new THREE.Color(accent), [accent]);
  const k = dim ? 0.62 : 1;
  switch (set) {
    case "lattice":
      return <Lattice h={h} col={col} acc={acc} k={k} />;
    case "static":
      return <Static h={h} col={col} k={k} seed={seed} />;
    case "monolith":
      return <Monolith h={h} col={col} acc={acc} k={k} />;
    case "chorus":
      return <Chorus h={h} col={col} acc={acc} k={k} seed={seed} />;
    case "spark":
      return <Spark h={h} col={col} acc={acc} k={k} seed={seed} />;
    default:
      return null;
  }
}

// ── LOGIC · The Lattice — an armillary halo above the head + a slow wide orbit ──
// Clean and orderly: a small gyroscope of rings hovers ABOVE the crown (never
// tangling with the body), capped by a gold proof-sigil, while a sparse ring of
// cubes orbits WIDE around the figure — "order made visible", with room to breathe.
function Lattice({ h, col, acc, k }: { h: number; col: THREE.Color; acc: THREE.Color; k: number }) {
  const arm = useRef<THREE.Group>(null);
  const sigil = useRef<THREE.Mesh>(null);
  const cubes = useRef<THREE.Group>(null);
  const haloY = h * 1.16; // sits clear above the head
  const haloR = h * 0.16;
  useFrame((s, dt) => {
    if (arm.current) {
      arm.current.rotation.y += dt * 0.4;
      arm.current.rotation.x += dt * 0.1;
    }
    if (sigil.current) {
      sigil.current.rotation.y += dt * 0.8;
      sigil.current.position.y = haloY + Math.sin(s.clock.elapsedTime * 1.2) * 0.03;
    }
    if (cubes.current) cubes.current.rotation.y -= dt * 0.22;
  });
  return (
    <group>
      {/* armillary halo — two thin rings above the crown */}
      <group ref={arm} position={[0, haloY, 0]}>
        {[0, 1].map((i) => (
          <mesh key={i} rotation={[i === 0 ? Math.PI / 2 : Math.PI / 3.2, 0, i === 1 ? 0.5 : 0]}>
            <torusGeometry args={[haloR * (1 - i * 0.22), 0.012 * h, 8, 64]} />
            <meshBasicMaterial color={col} transparent opacity={0.6 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* proof sigil — a precise octahedron nested in the halo */}
      <mesh ref={sigil} position={[0, haloY, 0]}>
        <octahedronGeometry args={[h * 0.07, 0]} />
        <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={1.9 * k} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* three cubes in a slow, WIDE equatorial orbit — clears the silhouette */}
      <group ref={cubes} position={[0, h * 0.62, 0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * h * 0.62, Math.sin(a * 1.5) * h * 0.06, Math.sin(a) * h * 0.62]} rotation={[a, a, 0]}>
              <boxGeometry args={[0.07 * h, 0.07 * h, 0.07 * h]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.2 * k} metalness={0.7} roughness={0.18} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ── CHAOS · The Static — erratic, flickering, asymmetric shard storm ───────────
function Static({ h, col, k, seed }: { h: number; col: THREE.Color; k: number; seed: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const shards = useMemo(() => {
    const rnd = rngFrom(seed ^ 0x51);
    return Array.from({ length: 9 }, () => ({
      a: rnd() * 6.28,
      r: h * (0.42 + rnd() * 0.55),
      y: h * (0.25 + rnd() * 0.9),
      s: h * (0.05 + rnd() * 0.09),
      spd: (rnd() - 0.5) * 2.4,
      jit: rnd() * 6.28,
      oct: rnd() > 0.5,
    }));
  }, [h, seed]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      const sh = shards[i];
      if (!m || !sh) continue;
      const ang = sh.a + t * sh.spd; // derive from time — never mutate the seed
      const jitter = Math.sin(t * 9 + sh.jit) * 0.06 * h;
      m.position.set(Math.cos(ang) * sh.r + jitter, sh.y + Math.sin(t * 5 + sh.jit) * 0.08 * h, Math.sin(ang) * sh.r);
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

// ── COMPOSURE · The Stillness — grounded standing-stones + heavy rings ────────
// No towering billboard behind the figure; instead a low cairn of grounded
// monoliths and weighty ground rings — mass that reads as "immovable" from the
// base up rather than a slab bolted to its back.
function Monolith({ h, col, acc, k }: { h: number; col: THREE.Color; acc: THREE.Color; k: number }) {
  // Standing-stones removed — the Stillness signature is now just the weighty
  // ground rings + squared shoulder heft, no slabs planted behind the figure.
  return (
    <group>
      {/* heavy double ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[h * 0.5, h * 0.62, 56]} />
        <meshBasicMaterial color={col} transparent opacity={0.35 * k} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[h * 0.66, h * 0.7, 56]} />
        <meshBasicMaterial color={acc} transparent opacity={0.28 * k} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* shoulder slab caps — squared-off heft, kept low-profile */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * h * 0.26, h * 0.74, 0]} rotation={[0, 0, sgn * 0.12]} castShadow>
          <boxGeometry args={[h * 0.14, h * 0.1, h * 0.2]} />
          <meshStandardMaterial color="#22302b" emissive={col} emissiveIntensity={0.22 * k} metalness={0.25} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ── RHETORIC · The Chorus — outward voice-rings + a halo + rising glyph motes ──
// No back fan (it read as a shield). The signature is now concentric rings that
// ripple OUTWARD from the chest like a carrying voice — motion no other Force has.
function Chorus({ h, col, acc, k, seed }: { h: number; col: THREE.Color; acc: THREE.Color; k: number; seed: number }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const motes = useRef<(THREE.Mesh | null)[]>([]);
  const RING_N = 3;
  const moteSeeds = useMemo(() => {
    const rnd = rngFrom(seed ^ 0xc0);
    return Array.from({ length: 6 }, () => ({ a: rnd() * 6.28, r: h * (0.3 + rnd() * 0.3), spd: 0.3 + rnd() * 0.5, ph: rnd() * 6.28 }));
  }, [h, seed]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    // each ring expands from the chest then fades — a steady pulse of speech
    for (let i = 0; i < rings.current.length; i++) {
      const m = rings.current[i];
      if (!m) continue;
      const p = (t * 0.5 + i / RING_N) % 1; // 0 → 1 lifecycle, staggered
      const sc = 0.3 + p * 1.4;
      m.scale.set(sc, sc, sc);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p) * 0.4 * k;
    }
    for (let i = 0; i < motes.current.length; i++) {
      const m = motes.current[i];
      const sd = moteSeeds[i];
      if (!m || !sd) continue;
      const ang = sd.a + t * sd.spd;
      m.position.set(Math.cos(ang) * sd.r, h * 0.9 + ((t * 0.3 + sd.ph) % 1) * h * 0.5, Math.sin(ang) * sd.r);
      m.rotation.y += 0.05;
    }
  });
  return (
    <group>
      {/* outward-rippling voice rings, centred on the chest */}
      {Array.from({ length: RING_N }).map((_, i) => (
        <mesh key={i} ref={(el) => { rings.current[i] = el; }} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.62, 0]}>
          <torusGeometry args={[h * 0.34, 0.015 * h, 6, 56]} />
          <meshBasicMaterial color={i % 2 ? acc : col} transparent opacity={0.3 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
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
function Spark({ h, col, acc, k, seed }: { h: number; col: THREE.Color; acc: THREE.Color; k: number; seed: number }) {
  const orbs = useRef<(THREE.Mesh | null)[]>([]);
  const burst = useRef<THREE.Group>(null);
  // the Spark's cube colour leads (cyan in the hero skin), with the gold accent
  // and a warm sparkle for a hint of invention — not a rainbow (art-direction.md).
  const palette = useMemo(() => {
    const c = col.getStyle();
    const a = acc.getStyle();
    return [c, c, a, c, "#ffe9a8"];
  }, [col, acc]);
  const seeds = useMemo(() => {
    const rnd = rngFrom(seed ^ 0x59);
    return Array.from({ length: 5 }, (_, i) => ({ a: rnd() * 6.28, r: h * (0.4 + rnd() * 0.45), y: h * (0.5 + rnd() * 0.6), spd: 0.5 + rnd() * 0.8, ph: rnd() * 6.28, c: palette[i % palette.length], s: h * (0.05 + rnd() * 0.05) }));
  }, [h, palette, seed]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < orbs.current.length; i++) {
      const m = orbs.current[i];
      const sd = seeds[i];
      if (!m || !sd) continue;
      const ang = sd.a + t * sd.spd;
      m.position.set(Math.cos(ang) * sd.r, sd.y + Math.sin(t * 1.4 + sd.ph) * 0.12 * h, Math.sin(ang * 1.3) * sd.r);
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
