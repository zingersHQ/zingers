"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { CreatureType } from "@/lib/types";
import { kitFor } from "@/lib/render/archetypes";
import { BoneFollower } from "@/components/grounds/phenotype-parts";

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

/** The per-Force signature attachment set. These used to be free-floating "energy
 *  constructs" that orbited the figure on a wide radius — they swung out into
 *  empty space and clipped THROUGH the body, reading as detached debris that
 *  didn't move with the character. Now every piece is BOLTED to a real bone
 *  (head / torso) via `BoneFollower` and anchored tight to the anatomy: it may
 *  spin, flicker, or pulse IN PLACE (so the mind still reads as alive), but it
 *  never flies off the body or hangs in empty space. `color` is the Force colour;
 *  `accent` is the identity glint. */
interface Anchor {
  x: number;
  y: number;
  z: number;
  top: number;
  bottom: number;
  r: number;
  hx: number;
  hz: number;
}

// Resolved placement on the real anatomy (figure space), with safe fallbacks.
interface Place {
  torsoY: number;
  backZ: number;
  frontZ: number;
  headTopY: number;
  neckY: number;
}

export function ArchetypeFeatures({
  type,
  h,
  color,
  accent = GOLD,
  dim = false,
  seed = 0,
  bones,
  anchors,
}: {
  type: CreatureType;
  h: number;
  color: string;
  accent?: string;
  /** quieter, gallery-friendly intensity */
  dim?: boolean;
  /** identity seed → stable construct layout */
  seed?: number;
  /** skeleton bones (lowercased names) so each piece fuses to its anchor */
  bones?: Record<string, THREE.Object3D>;
  /** MEASURED rest placement of each part's mesh (figure space) */
  anchors?: Record<string, Anchor>;
}) {
  const set = kitFor(type).featureSet;
  const col = useMemo(() => new THREE.Color(color), [color]);
  const acc = useMemo(() => new THREE.Color(accent), [accent]);
  const k = dim ? 0.62 : 1;
  const head = bones?.["head"];
  const torso = bones?.["torso"];
  const ta = anchors?.["torso"];
  const ha = anchors?.["head"];
  const pl: Place = {
    torsoY: ta ? ta.y : h * 0.5,
    backZ: ta ? ta.z - ta.hz : -h * 0.18,
    frontZ: ta ? ta.z + ta.hz : h * 0.16,
    headTopY: ha ? ha.top : h * 0.97,
    neckY: ha ? ha.bottom : h * 0.66,
  };
  switch (set) {
    case "lattice":
      return <Lattice h={h} col={col} acc={acc} k={k} head={head} torso={torso} pl={pl} />;
    case "static":
      return <Static h={h} col={col} k={k} seed={seed} torso={torso} pl={pl} />;
    case "monolith":
      return <Monolith h={h} col={col} acc={acc} k={k} torso={torso} pl={pl} />;
    case "chorus":
      return <Chorus h={h} col={col} acc={acc} k={k} seed={seed} head={head} torso={torso} pl={pl} />;
    case "spark":
      return <Spark h={h} col={col} acc={acc} k={k} seed={seed} head={head} torso={torso} pl={pl} />;
    default:
      return null;
  }
}

// ── LOGIC · The Lattice — a back-mounted gyroscope + a crown of fixed cubes ─────
// Order made visible, BOLTED ON: a small armillary gyro rides the upper back and
// spins in place (a moving part that's clearly fixed to the frame), capped by a
// gold proof-sigil; a tight ring of cubes sits fused around the collar instead of
// orbiting out through empty space.
function Lattice({ h, col, acc, k, head, torso, pl }: { h: number; col: THREE.Color; acc: THREE.Color; k: number; head?: THREE.Object3D; torso?: THREE.Object3D; pl: Place }) {
  const arm = useRef<THREE.Group>(null);
  const sigil = useRef<THREE.Mesh>(null);
  const cubes = useRef<THREE.Group>(null);
  const gyroR = h * 0.14;
  useFrame((s, dt) => {
    if (arm.current) {
      arm.current.rotation.y += dt * 0.6;
      arm.current.rotation.x += dt * 0.18;
    }
    if (sigil.current) sigil.current.rotation.y += dt * 1.0;
    // the collar cubes counter-rotate slowly AS A FIXED RING — they spin around
    // the neck axis but never translate off it
    if (cubes.current) cubes.current.rotation.y -= dt * 0.4;
  });
  return (
    <>
      {/* back-mounted armillary gyro — bolted to the upper back, spins in place */}
      <BoneFollower bone={torso}>
        <group position={[0, pl.torsoY + h * 0.08, pl.backZ - h * 0.04]}>
          <group ref={arm}>
            {[0, 1].map((i) => (
              <mesh key={i} rotation={[i === 0 ? Math.PI / 2 : Math.PI / 3.2, 0, i === 1 ? 0.5 : 0]}>
                <torusGeometry args={[gyroR * (1 - i * 0.22), 0.014 * h, 8, 48]} />
                <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9 * k} metalness={0.6} roughness={0.25} />
              </mesh>
            ))}
          </group>
          <mesh ref={sigil}>
            <octahedronGeometry args={[h * 0.06, 0]} />
            <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={1.9 * k} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      </BoneFollower>
      {/* a tight crown of cubes fused around the base of the neck */}
      <BoneFollower bone={torso}>
        <group ref={cubes} position={[0, pl.neckY, 0]}>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * h * 0.17, 0, Math.sin(a) * h * 0.17]} rotation={[a, a, 0]}>
                <boxGeometry args={[0.05 * h, 0.05 * h, 0.05 * h]} />
                <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.1 * k} metalness={0.7} roughness={0.18} />
              </mesh>
            );
          })}
        </group>
      </BoneFollower>
    </>
  );
}

// ── CHAOS · The Static — a crystalline shard burst erupting from the back ──────
// The storm is now FUSED: jagged shards grow out of the shoulder blades in a fixed
// fan, flickering and twitching in place like unstable crystal — never orbiting
// the figure or punching through the chest.
function Static({ h, col, k, seed, torso, pl }: { h: number; col: THREE.Color; k: number; seed: number; torso?: THREE.Object3D; pl: Place }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const shards = useMemo(() => {
    const rnd = rngFrom(seed ^ 0x51);
    // a fan rooted on the upper back: spread across X, rising in Y, pushed back in Z
    return Array.from({ length: 7 }, (_, i) => {
      const t = i / 6 - 0.5; // -0.5 → 0.5 across the back
      return {
        x: t * h * 0.5,
        y: pl.torsoY + h * (0.04 + Math.abs(t) * 0.18 + rnd() * 0.12),
        z: pl.backZ - h * (rnd() * 0.06),
        s: h * (0.06 + rnd() * 0.06),
        tilt: t * 0.6,
        jit: rnd() * 6.28,
        oct: rnd() > 0.5,
      };
    });
  }, [h, seed, pl.torsoY, pl.backZ]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      const sh = shards[i];
      if (!m || !sh) continue;
      // twitch in place — small rotational jitter, no positional drift
      m.rotation.x += 0.05;
      m.rotation.z = sh.tilt + Math.sin(t * 7 + sh.jit) * 0.12;
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (Math.sin(t * 14 + sh.jit) > 0.4 ? 2.4 : 0.7) * k;
    }
  });
  return (
    <BoneFollower bone={torso}>
      <group>
        {shards.map((sh, i) => (
          <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[sh.x, sh.y, sh.z]}>
            {sh.oct ? <octahedronGeometry args={[sh.s, 0]} /> : <tetrahedronGeometry args={[sh.s * 1.3, 0]} />}
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6 * k} metalness={0.3} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </BoneFollower>
  );
}

// ── COMPOSURE · The Stillness — grounded rings + squared shoulder heft ─────────
// Mass that reads as "immovable": weighty ground rings stay planted on the FLOOR
// (never bobbing with the body), while squared shoulder caps are bolted to the
// torso so they sit on the frame.
function Monolith({ h, col, acc, k, torso, pl }: { h: number; col: THREE.Color; acc: THREE.Color; k: number; torso?: THREE.Object3D; pl: Place }) {
  return (
    <>
      {/* heavy double ground ring — left at the feet, NOT bone-followed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[h * 0.5, h * 0.62, 56]} />
        <meshBasicMaterial color={col} transparent opacity={0.35 * k} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[h * 0.66, h * 0.7, 56]} />
        <meshBasicMaterial color={acc} transparent opacity={0.28 * k} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* shoulder slab caps — bolted to the torso so they ride the frame */}
      <BoneFollower bone={torso}>
        <group>
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} position={[sgn * h * 0.26, pl.torsoY + h * 0.12, 0]} rotation={[0, 0, sgn * 0.12]} castShadow>
              <boxGeometry args={[h * 0.14, h * 0.1, h * 0.2]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.3 * k} metalness={0.35} roughness={0.6} flatShading />
            </mesh>
          ))}
        </group>
      </BoneFollower>
    </>
  );
}

// ── RHETORIC · The Chorus — a bolted chest emitter + a tight head halo ─────────
// The "carrying voice" now reads as a fixed emitter ring on the chest that pulses
// in place plus a tight halo bolted just over the head — no rings ballooning past
// the body, no motes drifting up into empty space.
function Chorus({ h, col, acc, k, seed, head, torso, pl }: { h: number; col: THREE.Color; acc: THREE.Color; k: number; seed: number; head?: THREE.Object3D; torso?: THREE.Object3D; pl: Place }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const RING_N = 2;
  // seed kept for layout stability parity with siblings (no random placement now)
  void seed;
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    // each ring pulses gently in place around the chest emitter — a steady,
    // CONTAINED beat rather than an expanding shockwave
    for (let i = 0; i < rings.current.length; i++) {
      const m = rings.current[i];
      if (!m) continue;
      const p = (t * 0.6 + i / RING_N) % 1;
      const sc = 0.85 + Math.sin(p * Math.PI * 2) * 0.12;
      m.scale.set(sc, sc, sc);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.28 + Math.cos(p * Math.PI * 2) * 0.12) * k;
    }
  });
  return (
    <>
      {/* chest emitter — concentric rings fused to the torso, pulsing in place */}
      <BoneFollower bone={torso}>
        <group position={[0, pl.torsoY, pl.frontZ]}>
          {Array.from({ length: RING_N }).map((_, i) => (
            <mesh key={i} ref={(el) => { rings.current[i] = el; }} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[h * (0.12 + i * 0.05), 0.014 * h, 6, 40]} />
              <meshBasicMaterial color={i % 2 ? acc : col} transparent opacity={0.3 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </BoneFollower>
      {/* tight halo bolted just above the head */}
      <BoneFollower bone={head}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, pl.headTopY + h * 0.02, 0]}>
          <torusGeometry args={[h * 0.16, 0.018 * h, 8, 40]} />
          <meshBasicMaterial color={acc} transparent opacity={0.6 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </BoneFollower>
    </>
  );
}

// ── CREATIVITY · The Spark — a bolted idea-orb cluster + a head starburst ──────
// The orbs no longer orbit the whole figure; they sit in a fixed constellation
// mounted on the shoulders/back and bob a hair in place, while the spark starburst
// is bolted to the head and spins where it sits.
function Spark({ h, col, acc, k, seed, head, torso, pl }: { h: number; col: THREE.Color; acc: THREE.Color; k: number; seed: number; head?: THREE.Object3D; torso?: THREE.Object3D; pl: Place }) {
  const orbs = useRef<(THREE.Mesh | null)[]>([]);
  const burst = useRef<THREE.Group>(null);
  const palette = useMemo(() => {
    const c = col.getStyle();
    const a = acc.getStyle();
    return [c, c, a, c, "#ffe9a8"];
  }, [col, acc]);
  const seeds = useMemo(() => {
    const rnd = rngFrom(seed ^ 0x59);
    // a fixed constellation hugging the upper back/shoulders
    return Array.from({ length: 5 }, (_, i) => {
      const t = i / 4 - 0.5;
      return {
        x: t * h * 0.46,
        y: pl.torsoY + h * (0.08 + rnd() * 0.16),
        z: pl.backZ + h * (0.02 - rnd() * 0.06),
        ph: rnd() * 6.28,
        c: palette[i % palette.length],
        s: h * (0.045 + rnd() * 0.04),
      };
    });
  }, [h, palette, seed, pl.torsoY, pl.backZ]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < orbs.current.length; i++) {
      const m = orbs.current[i];
      const sd = seeds[i];
      if (!m || !sd) continue;
      // bob a hair in place — no orbit
      m.position.y = sd.y + Math.sin(t * 1.4 + sd.ph) * 0.03 * h;
    }
    if (burst.current) {
      burst.current.rotation.y += 0.03;
      const sc = 1 + Math.sin(t * 3) * 0.1;
      burst.current.scale.setScalar(sc);
    }
  });
  return (
    <>
      {/* idea-orb constellation — bolted to the back, bobbing in place */}
      <BoneFollower bone={torso}>
        <group>
          {seeds.map((sd, i) => (
            <mesh key={i} ref={(el) => { orbs.current[i] = el; }} position={[sd.x, sd.y, sd.z]}>
              <sphereGeometry args={[sd.s, 14, 14]} />
              <meshStandardMaterial color={sd.c} emissive={sd.c} emissiveIntensity={1.7 * k} metalness={0.2} roughness={0.25} />
            </mesh>
          ))}
        </group>
      </BoneFollower>
      {/* the spark itself — a starburst bolted just above the head, spins in place */}
      <BoneFollower bone={head}>
        <group ref={burst} position={[0, pl.headTopY + h * 0.04, 0]}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} rotation={[Math.PI / 2, 0, a]} position={[Math.cos(a) * h * 0.05, 0, Math.sin(a) * h * 0.05]}>
                <coneGeometry args={[0.018 * h, h * 0.16, 4]} />
                <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={2.0 * k} metalness={0.4} roughness={0.2} />
              </mesh>
            );
          })}
        </group>
      </BoneFollower>
    </>
  );
}
