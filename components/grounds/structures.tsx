"use client";
// Bespoke built environments. Each world composes a DIFFERENT building around
// the arena floor — a stone amphitheatre vs a volcanic caldera — so switching
// world changes the architecture you stand in, not just its colour. Code-only:
// stylized primitives + procedural materials, tuned for a cohesive look.
import { memo, useMemo } from "react";
import * as THREE from "three";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";
import { PLAZA_R } from "./terrain";

// write per-instance matrices once on mount (same idiom as terrain.tsx Scatter)
function applyInstanceMatrices(im: THREE.InstancedMesh | null, mats: THREE.Matrix4[]) {
  if (!im) return;
  for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
  im.count = mats.length;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
}

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

// molten crack texture for the pit floor / lava seams — cached per palette so
// venue exits / biome remounts never repaint the canvas
const CRACK_CACHE = new Map<string, THREE.CanvasTexture>();
function crackTexture(hot: string, core: string): THREE.CanvasTexture {
  const key = `${hot}|${core}`;
  const hit = CRACK_CACHE.get(key);
  if (hit) return hit;
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
  CRACK_CACHE.set(key, t);
  return t;
}

// ── Grounds: a stone amphitheatre ring ───────────────────────────────────────
function ColosseumWall({ biome }: { biome: BiomeConfig }) {
  const R = PLAZA_R + 2;
  const stone = biome.plaza.color;
  const stoneDark = biome.terrain.mid;
  const trim = biome.lights.arenaPoint;
  const entrance = biome.terrain.canyonAngle ?? Math.PI / 2;
  const archN = 30;
  const archPos = useMemo(
    () =>
      Array.from({ length: archN }, (_, i) => (i / archN) * TWO_PI)
        .filter((a) => Math.abs(Math.atan2(Math.sin(a - entrance), Math.cos(a - entrance))) >= 0.48)
        .map((a) => [Math.cos(a) * R, Math.sin(a) * R] as [number, number]),
    [entrance, R],
  );
  const arches = useMemo(() => archPos.map(([x, z]) => new THREE.Matrix4().makeTranslation(x, 3, z)), [archPos]);
  return (
    <group>
      {/* lower colonnade — a ring of columns with a cornice (one instanced draw) */}
      <instancedMesh
        args={[undefined, undefined, Math.max(1, arches.length)]}
        castShadow
        ref={(im) => applyInstanceMatrices(im, arches)}
      >
        <boxGeometry args={[0.7, 6, 0.7]} />
        <meshStandardMaterial color={stone} roughness={0.82} metalness={0.08} envMapIntensity={0.7} />
      </instancedMesh>
      {/* the colonnade blocks like real masonry — one fixed body, a box per
          column. The arena entrance gap stays open, and the set-back upper tier
          floats above head height, so no wall collider is needed. */}
      <RigidBody type="fixed" colliders={false}>
        {archPos.map(([x, z], i) => (
          <CuboidCollider key={i} args={[0.35, 3, 0.35]} position={[x, 3, z]} />
        ))}
      </RigidBody>
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
// The player approaches along the rift bearing; leave a gap in the teeth there.
function CalderaRim({ biome }: { biome: BiomeConfig }) {
  const R = PLAZA_R + 2;
  const rock = biome.obelisk.color;
  const lava = biome.lights.arenaPoint;
  const entrance = biome.terrain.canyonAngle ?? Math.PI / 2;
  const { spikes, teethCols } = useMemo(() => {
    const r = mulberry(53);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const mats: THREE.Matrix4[] = [];
    // collider spec per tooth — derived from the same seeded loop (identical
    // r() call order, so the silhouette is unchanged)
    const cols: { x: number; z: number; radius: number; h: number }[] = [];
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * TWO_PI + (r() - 0.5) * 0.08;
      if (Math.abs(Math.atan2(Math.sin(a - entrance), Math.cos(a - entrance))) < 0.48) continue;
      const rad = R + (r() - 0.4) * 2.4;
      const h = 4 + r() * 11;
      const w = 1.1 + r() * 1.8;
      const rot = r() * TWO_PI;
      const lean = (r() - 0.5) * 0.3;
      e.set(lean, rot, lean);
      q.setFromEuler(e);
      // unit cone scaled to (w, h, w) — same silhouette, one instanced draw
      mats.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(a) * rad, h / 2, Math.sin(a) * rad),
          q,
          new THREE.Vector3(w, h, w),
        ),
      );
      cols.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, radius: w * 0.45, h });
    }
    return { spikes: mats, teethCols: cols };
  }, [R, entrance]);
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
      {/* flanking entrance markers on the rift gap */}
      {([-3.2, 3.2] as const).map((off) => {
        const ex = Math.cos(entrance) * (R + 0.6) + -Math.sin(entrance) * off;
        const ez = Math.sin(entrance) * (R + 0.6) + Math.cos(entrance) * off;
        return (
          <mesh key={off} position={[ex, 2.4, ez]} castShadow>
            <coneGeometry args={[0.55, 4.8, 5]} />
            <meshStandardMaterial color={rock} emissive={lava} emissiveIntensity={0.55} roughness={0.92} flatShading />
          </mesh>
        );
      })}
      {/* jagged basalt teeth around the rim — one instanced draw */}
      <instancedMesh
        args={[undefined, undefined, Math.max(1, spikes.length)]}
        castShadow
        ref={(im) => applyInstanceMatrices(im, spikes)}
      >
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial color={rock} emissive={lava} emissiveIntensity={0.18} roughness={0.95} metalness={0.06} flatShading />
      </instancedMesh>
      {/* the teeth block like the colonnade — one fixed body, an upright
          cylinder per tooth (the entrance gap stays open via the same filter) */}
      <RigidBody type="fixed" colliders={false}>
        {teethCols.map((t, i) => (
          <CylinderCollider key={i} args={[t.h / 2, t.radius]} position={[t.x, t.h / 2, t.z]} />
        ))}
      </RigidBody>
    </group>
  );
}

// ── Void Garden: a ring of luminous crystal spires (a grove, not a colonnade) ──
// Same build idiom as ColosseumWall/CalderaRim — a deterministic, instanced ring
// with the rift-bearing entrance left open — but the silhouette reads as an
// overgrown crystal grove so the Garden never looks like the Colosseum.
function GroveRing({ biome }: { biome: BiomeConfig }) {
  const R = PLAZA_R + 2;
  const crystal = biome.scatter.crystal;
  const glow = biome.floatCrystal.emissive;
  const trim = biome.lights.arenaPoint;
  const rock = biome.terrain.mid;
  const entrance = biome.terrain.canyonAngle ?? Math.PI / 2;
  const { spires, cols } = useMemo(() => {
    const r = mulberry(113);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const mats: THREE.Matrix4[] = [];
    const c: { x: number; z: number; radius: number; h: number }[] = [];
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TWO_PI + (r() - 0.5) * 0.05;
      // keep the rift-bearing approach clear (same filter the other surrounds use)
      if (Math.abs(Math.atan2(Math.sin(a - entrance), Math.cos(a - entrance))) < 0.5) continue;
      const rad = R + (r() - 0.4) * 2.0;
      const h = 6 + r() * 9;
      const w = 0.5 + r() * 0.7;
      const lean = (r() - 0.5) * 0.16;
      e.set(lean, r() * TWO_PI, lean);
      q.setFromEuler(e);
      mats.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(a) * rad, h / 2, Math.sin(a) * rad),
          q,
          new THREE.Vector3(w, h, w),
        ),
      );
      c.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, radius: w * 0.5, h });
    }
    return { spires: mats, cols: c };
  }, [R, entrance]);
  return (
    <group>
      {/* mossy base ring with a luminous inner seam */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
        <ringGeometry args={[R - 1.0, R + 1.4, 96]} />
        <meshStandardMaterial color={rock} roughness={0.85} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <ringGeometry args={[R - 0.6, R - 0.25, 96]} />
        <meshBasicMaterial color={trim} />
      </mesh>
      {/* crystal spires — one instanced draw */}
      <instancedMesh
        args={[undefined, undefined, Math.max(1, spires.length)]}
        castShadow
        ref={(im) => applyInstanceMatrices(im, spires)}
      >
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial color={crystal} emissive={glow} emissiveIntensity={1.3} roughness={0.35} metalness={0.35} flatShading />
      </instancedMesh>
      {/* the spires block like the colonnade — one fixed body, a cylinder each */}
      <RigidBody type="fixed" colliders={false}>
        {cols.map((t, i) => (
          <CylinderCollider key={i} args={[t.h / 2, t.radius]} position={[t.x, t.h / 2, t.z]} />
        ))}
      </RigidBody>
    </group>
  );
}

export const PlazaSurround = memo(function PlazaSurround({ biome }: { biome: BiomeConfig }) {
  const surround = biome.scene.surround;
  if (surround === "caldera") return <CalderaRim biome={biome} />;
  if (surround === "grove") return <GroveRing biome={biome} />;
  return <ColosseumWall biome={biome} />;
});

// ── central arena footprints ─────────────────────────────────────────────────
// radius kept in sync with world.tsx ARENA_R so proximity / roam keep-outs match.
const ARENA_R = 8.6;

/** Ember Wastes — open sunken pit (no stadium teeth / continuous grandstand rim). */
export const PitArena = memo(function PitArena({ biome }: { biome: BiomeConfig }) {
  const lava = biome.lights.arenaPoint;
  const rock = biome.obelisk.color;
  const tex = useMemo(() => crackTexture(lava, "#fff2cc"), [lava]);
  // Sparse irregular basalt shards — reads as a caldera floor, not a mini-colosseum.
  const shards = useMemo(() => {
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const r = mulberry(211);
    return Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * TWO_PI + (r() - 0.5) * 0.35;
      const rad = ARENA_R - 0.35 + r() * 0.9;
      const h = 0.55 + r() * 0.85;
      const lean = (r() - 0.5) * 0.4;
      e.set(lean, a, 0);
      q.setFromEuler(e);
      return new THREE.Matrix4().compose(
        new THREE.Vector3(Math.cos(a) * rad, 0.15 + h * 0.15, Math.sin(a) * rad),
        q,
        new THREE.Vector3(0.7 + r() * 0.5, h, 0.7 + r() * 0.4),
      );
    });
  }, []);
  const R = ARENA_R;
  return (
    <group>
      {/* deeper molten basin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
        <circleGeometry args={[R, 96]} />
        <meshStandardMaterial color="#1a0a06" emissive={lava} emissiveMap={tex} emissiveIntensity={2.1} roughness={0.55} metalness={0.25} />
      </mesh>
      {/* cracked shelf just above the lava — broken lip, not a torus stadium */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <ringGeometry args={[R - 1.4, R + 0.15, 64]} />
        <meshStandardMaterial color={rock} emissive={lava} emissiveIntensity={0.55} roughness={0.92} flatShading />
      </mesh>
      {/* sparse outer shards */}
      <instancedMesh
        args={[undefined, undefined, shards.length]}
        castShadow
        ref={(im) => applyInstanceMatrices(im, shards)}
      >
        <coneGeometry args={[0.4, 1, 5]} />
        <meshStandardMaterial color={rock} emissive={lava} emissiveIntensity={0.35} roughness={0.95} flatShading />
      </instancedMesh>
      <pointLight position={[0, 1.2, 0]} intensity={38} color={lava} distance={22} />
    </group>
  );
});

/**
 * Void Garden — floating atelier discs (no gold ring / posts).
 * Own mulberry seed so GroveRing / Nature RNG order stays untouched.
 */
export const PlatformsArena = memo(function PlatformsArena({ biome }: { biome: BiomeConfig }) {
  const accent = biome.lights.arenaPoint;
  const top = biome.platform.top;
  const a = biome.platform.a;
  const pads = useMemo(() => {
    const r = mulberry(227);
    const out: { x: number; z: number; y: number; rad: number; rot: number }[] = [
      { x: 0, z: 0, y: 0.12, rad: 3.4, rot: 0 },
    ];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TWO_PI + 0.22;
      const dist = 4.2 + r() * 1.6;
      out.push({
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        y: 0.35 + r() * 0.85,
        rad: 1.15 + r() * 0.7,
        rot: r() * Math.PI,
      });
    }
    return out;
  }, []);
  return (
    <group>
      {/* soft underglow where the old ring would sit — no solid stadium lip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[ARENA_R - 0.9, ARENA_R + 0.05, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {pads.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation={[0, p.rot, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
            <circleGeometry args={[p.rad, 28]} />
            <meshStandardMaterial
              color={i === 0 ? top : a}
              emissive={accent}
              emissiveIntensity={i === 0 ? 0.55 : 0.85}
              metalness={0.35}
              roughness={0.4}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
            <ringGeometry args={[p.rad * 0.72, p.rad, 28]} />
            <meshBasicMaterial color={accent} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 3.2, 0]} intensity={28} color={accent} distance={20} />
    </group>
  );
});
