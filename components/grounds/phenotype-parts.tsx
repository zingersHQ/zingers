"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Phenotype } from "@/lib/render/phenotype";

// Solid anatomy bolted onto the rig in FIGURE-LOCAL space (Y-up, facing +Z). It
// rides inside the ChampionMesh group, so it turns with the body's idle gaze and
// sits at fixed anchors derived from the figure height `h`. Tints come from the
// individual's palette so the parts read as the same being as the painted body.
export interface PartPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  dark: string;
}

export function PhenotypeParts({
  pheno,
  h,
  headScale,
  shoulder,
  pal,
  dim = false,
}: {
  pheno: Phenotype;
  h: number;
  headScale: number;
  shoulder: number;
  pal: PartPalette;
  dim?: boolean;
}) {
  // anchor heights as fractions of figure height (tuned to the RobotExpressive
  // proportions — big head sitting high on a compact body)
  const headY = h * 0.86;
  const headTop = h * 0.97;
  const faceZ = h * 0.17;
  const headR = h * 0.13 * headScale;
  const shY = h * 0.66;
  const shX = h * (0.22 + (shoulder - 1) * 0.12);
  const chestY = h * 0.6;
  const chestZ = h * 0.16;
  const backY = h * 0.62;
  const backZ = -h * 0.22;
  const k = dim ? 0.7 : 1;

  return (
    <group>
      <Headgear kind={pheno.headgear} h={h} top={headTop} center={headY} r={headR} count={pheno.count} pal={pal} k={k} />
      <Visor kind={pheno.visor} y={headY} z={faceZ} r={headR} pal={pal} k={k} />
      {pheno.shoulders !== "none" && [-1, 1].map((s) => <Shoulder key={s} kind={pheno.shoulders} sgn={s} h={h} x={shX} y={shY} pal={pal} k={k} />)}
      <Chest kind={pheno.chest} y={chestY} z={chestZ} h={h} pal={pal} k={k} />
      <Back kind={pheno.back} y={backY} z={backZ} h={h} count={pheno.count} pal={pal} k={k} />
    </group>
  );
}

function struct(color: string, metalness = 0.62, roughness = 0.34) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} flatShading />;
}
function glowMat(color: string, intensity: number) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} metalness={0.4} roughness={0.25} />;
}

// ── Headgear ──────────────────────────────────────────────────────────────────
function Headgear({ kind, top, center, r, count, pal, k }: { kind: Phenotype["headgear"]; h: number; top: number; center: number; r: number; count: number; pal: PartPalette; k: number }) {
  if (kind === "none") return null;
  if (kind === "crest") {
    const blades = Math.max(3, Math.min(5, count));
    return (
      <group position={[0, center + r * 0.7, 0]}>
        {Array.from({ length: blades }).map((_, i) => {
          const t = blades === 1 ? 0 : i / (blades - 1) - 0.5;
          return (
            <mesh key={i} position={[t * r * 0.9, 0, -Math.abs(t) * r * 0.3]} rotation={[-0.2, 0, 0]}>
              <coneGeometry args={[r * 0.16, r * (1.1 - Math.abs(t) * 0.5), 4]} />
              {struct(i % 2 ? pal.accent : pal.secondary)}
            </mesh>
          );
        })}
      </group>
    );
  }
  if (kind === "fin") {
    return (
      <group position={[0, center + r * 0.5, -r * 0.2]} rotation={[0.5, 0, 0]}>
        <mesh>
          <coneGeometry args={[r * 0.5, r * 1.7, 4]} />
          {struct(pal.secondary)}
        </mesh>
        <mesh position={[0, r * 0.2, r * 0.18]} scale={[0.2, 1, 1]}>
          <coneGeometry args={[r * 0.5, r * 1.4, 4]} />
          {glowMat(pal.glow, 1.2 * k)}
        </mesh>
      </group>
    );
  }
  if (kind === "horns") {
    return (
      <group position={[0, center + r * 0.5, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * r * 0.55, 0, 0]} rotation={[0, 0, -s * 0.7]}>
            <coneGeometry args={[r * 0.2, r * 1.3, 5]} />
            {struct(pal.secondary)}
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "antenna") {
    const n = Math.max(1, Math.min(3, count - 1));
    return (
      <group position={[0, top, 0]}>
        {Array.from({ length: n }).map((_, i) => {
          const off = (i - (n - 1) / 2) * r * 0.5;
          return (
            <group key={i} position={[off, 0, 0]} rotation={[0, 0, off === 0 ? 0 : off > 0 ? -0.2 : 0.2]}>
              <mesh position={[0, r * 0.7, 0]}>
                <cylinderGeometry args={[r * 0.04, r * 0.05, r * 1.4, 6]} />
                {struct(pal.dark, 0.7, 0.4)}
              </mesh>
              <mesh position={[0, r * 1.5, 0]}>
                <sphereGeometry args={[r * 0.13, 12, 12]} />
                {glowMat(pal.glow, 2.0 * k)}
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }
  if (kind === "dome") {
    return (
      <mesh position={[0, center + r * 0.45, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[r * 1.05, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        {struct(pal.secondary, 0.4, 0.6)}
      </mesh>
    );
  }
  // crownRing
  return (
    <group position={[0, center + r * 0.65, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.85, r * 0.07, 8, 32]} />
        {glowMat(pal.accent, 1.3 * k)}
      </mesh>
      {Array.from({ length: Math.max(5, count + 2) }).map((_, i, arr) => {
        const a = (i / arr.length) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.85, r * 0.22, Math.sin(a) * r * 0.85]}>
            <coneGeometry args={[r * 0.08, r * 0.34, 4]} />
            {glowMat(pal.accent, 1.1 * k)}
          </mesh>
        );
      })}
    </group>
  );
}

// ── Visor / face ────────────────────────────────────────────────────────────
function Visor({ kind, y, z, r, pal, k }: { kind: Phenotype["visor"]; y: number; z: number; r: number; pal: PartPalette; k: number }) {
  const eye = (x: number, s = 1) => (
    <mesh position={[x, 0, 0]}>
      <sphereGeometry args={[r * 0.16 * s, 12, 12]} />
      {glowMat(pal.glow, 2.2 * k)}
    </mesh>
  );
  return (
    <group position={[0, y, z]}>
      {kind === "single" && (
        <mesh>
          <sphereGeometry args={[r * 0.3, 16, 14]} />
          {glowMat(pal.glow, 2.0 * k)}
        </mesh>
      )}
      {kind === "twin" && [-1, 1].map((s) => <group key={s}>{eye(s * r * 0.32)}</group>)}
      {kind === "triple" && [-1, 0, 1].map((s, i) => <group key={s} position={[0, (i - 1) * r * 0.08, 0]}>{eye(s * r * 0.3, 0.8)}</group>)}
      {kind === "band" && (
        <mesh>
          <boxGeometry args={[r * 0.95, r * 0.14, r * 0.1]} />
          {glowMat(pal.glow, 1.9 * k)}
        </mesh>
      )}
      {kind === "slit" && (
        <mesh rotation={[0, 0, 0.32]}>
          <boxGeometry args={[r * 0.9, r * 0.08, r * 0.1]} />
          {glowMat(pal.accent, 2.0 * k)}
        </mesh>
      )}
    </group>
  );
}

// ── Shoulders ─────────────────────────────────────────────────────────────────
function Shoulder({ kind, sgn, h, x, y, pal, k }: { kind: Phenotype["shoulders"]; sgn: number; h: number; x: number; y: number; pal: PartPalette; k: number }) {
  const u = h * 0.12;
  if (kind === "pauldron") {
    return (
      <mesh position={[sgn * x, y, 0]} rotation={[0, 0, -sgn * 0.3]}>
        <sphereGeometry args={[u * 0.88, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        {struct(pal.secondary, 0.5, 0.5)}
      </mesh>
    );
  }
  if (kind === "spike") {
    return (
      <group position={[sgn * x, y, 0]} rotation={[0, 0, -sgn * 0.5]}>
        <mesh position={[0, u * 0.4, 0]}>
          <coneGeometry args={[u * 0.5, u * 1.6, 5]} />
          {struct(pal.dark, 0.6, 0.4)}
        </mesh>
        <mesh position={[0, u * 0.5, 0]} scale={[0.4, 1, 0.4]}>
          <coneGeometry args={[u * 0.5, u * 1.5, 5]} />
          {glowMat(pal.glow, 1.2 * k)}
        </mesh>
      </group>
    );
  }
  // vent — a few slats
  return (
    <group position={[sgn * x, y, 0]} rotation={[0, 0, -sgn * 0.2]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * u * 0.22 - u * 0.2, 0]}>
          <boxGeometry args={[u * 0.9, u * 0.1, u * 0.7]} />
          {i === 1 ? glowMat(pal.glow, 1.0 * k) : struct(pal.dark, 0.5, 0.5)}
        </mesh>
      ))}
    </group>
  );
}

// ── Chest core ────────────────────────────────────────────────────────────────
function Chest({ kind, y, z, h, pal, k }: { kind: Phenotype["chest"]; y: number; z: number; h: number; pal: PartPalette; k: number }) {
  if (kind === "none") return null;
  const u = h * 0.12;
  return (
    <group position={[0, y, z]}>
      {kind === "diamond" && (
        <mesh>
          <octahedronGeometry args={[u * 0.7, 0]} />
          {glowMat(pal.glow, 1.8 * k)}
        </mesh>
      )}
      {kind === "ring" && (
        <mesh>
          <torusGeometry args={[u * 0.6, u * 0.13, 8, 24]} />
          {glowMat(pal.accent, 1.6 * k)}
        </mesh>
      )}
      {kind === "bars" &&
        [-1, 0, 1].map((i) => (
          <mesh key={i} position={[0, i * u * 0.3, 0]}>
            <boxGeometry args={[u * 1.1, u * 0.16, u * 0.18]} />
            {i === 0 ? glowMat(pal.glow, 1.5 * k) : struct(pal.dark, 0.5, 0.5)}
          </mesh>
        ))}
    </group>
  );
}

// ── Back unit ─────────────────────────────────────────────────────────────────
function Back({ kind, y, z, h, count, pal, k }: { kind: Phenotype["back"]; y: number; z: number; h: number; count: number; pal: PartPalette; k: number }) {
  const banner = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (banner.current) banner.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.8) * 0.08;
  });
  if (kind === "none") return null;
  const u = h * 0.12;
  if (kind === "thrusters") {
    const n = Math.max(2, Math.min(3, count - 1));
    return (
      <group position={[0, y, z]}>
        {Array.from({ length: n }).map((_, i) => {
          const off = (i - (n - 1) / 2) * u * 0.8;
          return (
            <group key={i} position={[off, 0, 0]} rotation={[0.4, 0, 0]}>
              <mesh>
                <cylinderGeometry args={[u * 0.28, u * 0.34, u * 1.3, 8]} />
                {struct(pal.dark, 0.6, 0.4)}
              </mesh>
              <mesh position={[0, -u * 0.7, 0]}>
                <coneGeometry args={[u * 0.32, u * 0.5, 8]} />
                {glowMat(pal.glow, 1.8 * k)}
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }
  if (kind === "slab") {
    return (
      <group position={[0, y, z]}>
        <mesh>
          <boxGeometry args={[h * 0.5, h * 0.9, h * 0.06]} />
          {struct(pal.dark, 0.3, 0.7)}
        </mesh>
        <mesh position={[0, 0, -h * 0.031]}>
          <planeGeometry args={[h * 0.06, h * 0.7]} />
          {glowMat(pal.glow, 1.2 * k)}
        </mesh>
      </group>
    );
  }
  if (kind === "wings") {
    return (
      <group position={[0, y, z]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * u * 0.6, u * 0.3, 0]} rotation={[0.2, 0, -s * 0.7]}>
            <boxGeometry args={[u * 2.0, u * 0.9, u * 0.07]} />
            {struct(pal.secondary, 0.5, 0.4)}
          </mesh>
        ))}
      </group>
    );
  }
  // banner — a slim cape trailing from the shoulders (narrow so it never reads as
  // a shield strapped to the back)
  return (
    <mesh ref={banner} position={[0, y - h * 0.26, z + h * 0.01]}>
      <planeGeometry args={[h * 0.22, h * 0.74, 1, 4]} />
      <meshStandardMaterial color={pal.primary} emissive={pal.glow} emissiveIntensity={0.3 * k} metalness={0.2} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}
