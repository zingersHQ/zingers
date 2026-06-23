"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Region districts — the world EVOLVES. A region's built-up level is a tier
// (0..4) from lib/lore/growth.ts (season + Reader rank + Force war). This module
// turns that tier into structures that ACCRETE around the arena: tier 0 is a wild
// slab, tier 4 a full district wrapping the rim. Buildings are deterministic
// (seeded by the biome) so a town is stable, and tier only ADDS to it — the first
// N buildings never move as the region grows, new ones simply appear.
//
// Architecture is themed per biome: the Colosseum builds stone houses, the Ember
// Wastes basalt forges, the Void Garden crystalline spires.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { BiomeConfig } from "./biomes";
import { PLAZA_R, terrainHeight, spawnKnollFor, riftDir, riftPerp, type TerrainShape } from "./terrain";

const TWO_PI = Math.PI * 2;

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// how many buildings stand at each tier — strictly growing, so a tier-up only
// reveals MORE of the same deterministic town.
const COUNT_BY_TIER = [0, 5, 10, 16, 24];

type Kind = "house" | "forge" | "spire";

interface Style {
  kind: Kind;
  wall: string;
  trim: string;
  glow: string;
}

function styleFor(biome: BiomeConfig): Style {
  if (biome.id === "ember") return { kind: "forge", wall: biome.plaza.color, trim: biome.platform.top, glow: biome.lights.arenaPoint };
  if (biome.id === "void") return { kind: "spire", wall: biome.plaza.color, trim: biome.platform.top, glow: biome.floatCrystal.emissive };
  return { kind: "house", wall: biome.plaza.color, trim: biome.platform.top, glow: biome.lights.arenaPoint };
}

interface Lot {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
}

// Houses sit at the inner end of the rift (near the plaza) so the outer entrance
// corridor stays clear. Without a rift, buildings ring the plaza rim as before.
function layoutLots(biome: BiomeConfig, shape: TerrainShape, count: number): Lot[] {
  const knoll = spawnKnollFor(biome);
  const rng = mulberry((biome.terrain.seed + 17) * 2654435761);
  const towerA = biome.scene.towerAngle;
  const rift = shape.canyonDepth > 0;
  const out: Lot[] = [];
  let guard = 0;
  while (out.length < count && guard < 600) {
    guard++;
    let x: number;
    let z: number;
    let r: number;

    if (rift) {
      const { dirx, dirz } = riftDir(shape);
      const alongMin = PLAZA_R + 38;
      const alongMax = PLAZA_R + 58;
      const along = alongMin + rng() * (alongMax - alongMin);
      const perpOff = (rng() - 0.5) * shape.canyonHalfWidth * 1.5;
      x = dirx * along + -dirz * perpOff;
      z = dirz * along + dirx * perpOff;
      r = Math.hypot(x, z);
      if (riftPerp(x, z, shape) < shape.canyonHalfWidth * 0.85) continue;
    } else {
      const a = rng() * TWO_PI;
      const da = Math.abs(((a - towerA + Math.PI) % TWO_PI) - Math.PI);
      if (da < 0.55) continue;
      r = PLAZA_R + 4 + rng() * 20;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }

    const y = terrainHeight(x, z, shape, knoll);
    const tall = (r - PLAZA_R - 4) * 0.16;
    out.push({
      x,
      y,
      z,
      w: 1.8 + rng() * 1.8,
      d: 1.8 + rng() * 1.8,
      h: 2.6 + rng() * 3.2 + tall,
      rot: rng() * TWO_PI,
    });
  }
  return out;
}

export function RegionDistrict({
  biome,
  tier,
  featured = false,
  shape,
}: {
  biome: BiomeConfig;
  tier: number;
  featured?: boolean;
  shape: TerrainShape;
}) {
  const knoll = useMemo(() => spawnKnollFor(biome), [biome]);
  const style = useMemo(() => styleFor(biome), [biome]);
  const count = COUNT_BY_TIER[Math.max(0, Math.min(4, tier))];
  const lots = useMemo(() => layoutLots(biome, shape, count), [biome, shape, count]);
  if (count === 0) return null;

  // the town centroid — anchor for the perimeter ring, a soft hearth light, and
  // the season-spotlight banner when this is the featured region.
  const cx = lots.reduce((s, l) => s + l.x, 0) / lots.length;
  const cz = lots.reduce((s, l) => s + l.z, 0) / lots.length;
  const cy = terrainHeight(cx, cz, shape, knoll);

  return (
    <group>
      {/* a faint ring road appears once the outpost becomes a hamlet */}
      {tier >= 2 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[24.4, 25.2, 96]} />
          <meshBasicMaterial color={style.trim} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      )}

      {lots.map((l, i) => (
        <Building key={i} lot={l} style={style} />
      ))}

      {/* a single warm hearth light for a real town (kept to one to stay cheap) */}
      {tier >= 2 && <pointLight position={[cx, cy + 4, cz]} intensity={tier >= 3 ? 50 : 28} color={style.glow} distance={34} />}

      {featured && (
        <Html position={[cx, cy + 11, cz]} center distanceFactor={30} zIndexRange={[19, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#f5d020", fontWeight: 800 }}>▲ SEASON SPOTLIGHT</div>
            <div style={{ fontSize: 8, letterSpacing: 1, color: "#fff", textShadow: "0 1px 6px #000" }}>this region is rising</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Building({ lot, style }: { lot: Lot; style: Style }) {
  const { x, y, z, w, d, h, rot } = lot;
  const { kind, wall, trim, glow } = style;
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <group position={[x, y, z]} rotation={[0, rot, 0]}>
        {/* body */}
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={wall} roughness={0.85} metalness={0.12} emissive={glow} emissiveIntensity={0.05} flatShading />
        </mesh>

        {/* lit windows — two opposite faces, emissive so they cost no light */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[0, h * 0.55, (s * d) / 2 + 0.02 * s]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
            <planeGeometry args={[w * 0.62, h * 0.16]} />
            <meshBasicMaterial color={glow} transparent opacity={0.85} />
          </mesh>
        ))}

        {/* roof / crown — themed per biome */}
        {kind === "house" && (
          <mesh position={[0, h + 0.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[Math.max(w, d) * 0.78, 1.3, 4]} />
            <meshStandardMaterial color={trim} roughness={0.7} metalness={0.2} flatShading />
          </mesh>
        )}
        {kind === "forge" && (
          <>
            {/* flat slab roof */}
            <mesh position={[0, h + 0.12, 0]} castShadow>
              <boxGeometry args={[w * 1.06, 0.24, d * 1.06]} />
              <meshStandardMaterial color={trim} roughness={0.8} metalness={0.2} />
            </mesh>
            {/* chimney with an ember glow */}
            <mesh position={[w * 0.26, h + 0.9, d * 0.26]} castShadow>
              <boxGeometry args={[0.4, 1.5, 0.4]} />
              <meshStandardMaterial color={wall} roughness={0.9} metalness={0.1} />
            </mesh>
            <mesh position={[w * 0.26, h + 1.7, d * 0.26]}>
              <boxGeometry args={[0.46, 0.18, 0.46]} />
              <meshBasicMaterial color={glow} />
            </mesh>
          </>
        )}
        {kind === "spire" && (
          <mesh position={[0, h + 0.7, 0]}>
            <octahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.6} metalness={0.4} roughness={0.25} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}
