"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ─────────────────────────────────────────────────────────────────────────────
// Keeper regalia — the per-Keeper SIGNATURE PROP that turns a recoloured champion
// into an unmistakable campaign boss. Each Keeper carries a held weapon / item
// sized to the figure height `h`, in FIGURE-LOCAL space (Y-up, facing +Z), so it
// rides inside the ChampionMesh group and turns with the body. The silhouette is
// the point: you should know a Keeper from across the wilds by its hardware alone.
// ─────────────────────────────────────────────────────────────────────────────

export type KeeperKind = "greeter" | "archivist" | "warden" | "diviner" | "vaultheart";

const NAME_KIND: Record<string, KeeperKind> = {
  tibble: "greeter",
  quill: "archivist",
  bastion: "warden",
  vesper: "diviner",
  sable: "vaultheart",
};

/** Resolve a Keeper's regalia kit from its canon name (lib/lore/canon.ts). */
export function keeperKindForName(name: string): KeeperKind | undefined {
  return NAME_KIND[name.toLowerCase()];
}

export interface RegaliaPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  dark: string;
}

function struct(color: string, metalness = 0.6, roughness = 0.4) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} flatShading />;
}
function glowMat(color: string, intensity: number) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} metalness={0.3} roughness={0.25} />;
}

export function KeeperRegalia({ kind, h, pal, dim = false }: { kind: KeeperKind; h: number; pal: RegaliaPalette; dim?: boolean }) {
  const k = dim ? 0.7 : 1;
  switch (kind) {
    case "greeter":
      return <Greeter h={h} pal={pal} k={k} />;
    case "archivist":
      return <Archivist h={h} pal={pal} k={k} />;
    case "warden":
      return <Warden h={h} pal={pal} k={k} />;
    case "diviner":
      return <Diviner h={h} pal={pal} k={k} />;
    case "vaultheart":
      return <Vaultheart h={h} pal={pal} k={k} />;
    default:
      return null;
  }
}

// ── Tibble · The Greeter — a tall lantern staff, a welcoming light ─────────────
function Greeter({ h, pal, k }: { h: number; pal: RegaliaPalette; k: number }) {
  const sway = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (sway.current) sway.current.rotation.z = Math.sin(t * 0.8) * 0.03;
    if (flame.current) {
      const mat = flame.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (1.6 + Math.sin(t * 3.1) * 0.4) * k;
    }
  });
  return (
    <group ref={sway} position={[h * 0.36, 0, h * 0.08]}>
      {/* haft */}
      <mesh position={[0, h * 0.62, 0]}>
        <cylinderGeometry args={[h * 0.018, h * 0.024, h * 1.24, 8]} />
        {struct(pal.dark, 0.5, 0.6)}
      </mesh>
      {/* lantern at the head of the staff */}
      <group position={[0, h * 1.18, 0]}>
        <mesh ref={flame}>
          <sphereGeometry args={[h * 0.085, 16, 14]} />
          {glowMat(pal.glow, 1.6 * k)}
        </mesh>
        <mesh>
          <boxGeometry args={[h * 0.17, h * 0.22, h * 0.17]} />
          <meshStandardMaterial color={pal.secondary} metalness={0.6} roughness={0.4} wireframe />
        </mesh>
        <mesh position={[0, h * 0.15, 0]}>
          <coneGeometry args={[h * 0.12, h * 0.1, 4]} />
          {struct(pal.secondary)}
        </mesh>
        <mesh position={[0, -h * 0.13, 0]}>
          <coneGeometry args={[h * 0.05, h * 0.06, 4]} />
          {struct(pal.dark)}
        </mesh>
      </group>
    </group>
  );
}

// ── Quill · The Archivist — orbiting tomes + a great floating quill ───────────
function Archivist({ h, pal, k }: { h: number; pal: RegaliaPalette; k: number }) {
  const orbit = useRef<THREE.Group>(null);
  const quill = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (orbit.current) orbit.current.rotation.y += dt * 0.32;
    if (quill.current) {
      quill.current.position.y = h * 0.98 + Math.sin(t * 1.1) * 0.03;
      quill.current.rotation.z = -0.5 + Math.sin(t * 0.9) * 0.05;
    }
  });
  const COLORS = [pal.primary, pal.secondary, pal.primary, pal.secondary];
  return (
    <group>
      {/* tomes orbiting the torso */}
      <group ref={orbit} position={[0, h * 0.66, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * h * 0.54, Math.sin(a * 1.3) * h * 0.08, Math.sin(a) * h * 0.54]} rotation={[0, -a, 0.12]}>
              <mesh>
                <boxGeometry args={[h * 0.17, h * 0.23, h * 0.05]} />
                {struct(COLORS[i], 0.4, 0.6)}
              </mesh>
              {/* glowing page-edge so the books read as lore, not bricks */}
              <mesh position={[h * 0.075, 0, 0]}>
                <boxGeometry args={[h * 0.025, h * 0.2, h * 0.052]} />
                {glowMat(pal.glow, 1.0 * k)}
              </mesh>
            </group>
          );
        })}
      </group>
      {/* the quill, hovering at the writing hand */}
      <group ref={quill} position={[h * 0.32, h * 0.98, h * 0.12]} rotation={[0, 0, -0.5]}>
        <mesh position={[0, h * 0.22, 0]}>
          <coneGeometry args={[h * 0.055, h * 0.5, 4]} />
          {glowMat(pal.accent, 1.2 * k)}
        </mesh>
        <mesh position={[0, -h * 0.06, 0]}>
          <coneGeometry args={[h * 0.018, h * 0.14, 6]} />
          {struct(pal.dark)}
        </mesh>
      </group>
    </group>
  );
}

// ── Bastion · The Warden — a tower shield + a heavy maul ──────────────────────
function Warden({ h, pal, k }: { h: number; pal: RegaliaPalette; k: number }) {
  return (
    <group>
      {/* tower shield on the left flank */}
      <group position={[-h * 0.42, h * 0.6, h * 0.18]} rotation={[0.04, 0.12, 0]}>
        <mesh>
          <boxGeometry args={[h * 0.36, h * 0.74, h * 0.06]} />
          {struct(pal.secondary, 0.55, 0.45)}
        </mesh>
        {/* rim */}
        {[h * 0.35, -h * 0.35].map((y) => (
          <mesh key={y} position={[0, y, h * 0.035]}>
            <boxGeometry args={[h * 0.36, h * 0.05, h * 0.02]} />
            {struct(pal.dark, 0.5, 0.5)}
          </mesh>
        ))}
        {/* central boss emblem */}
        <mesh position={[0, 0, h * 0.05]}>
          <octahedronGeometry args={[h * 0.1, 0]} />
          {glowMat(pal.glow, 1.4 * k)}
        </mesh>
      </group>
      {/* heavy maul on the right */}
      <group position={[h * 0.38, h * 0.5, h * 0.08]} rotation={[0, 0, 0.22]}>
        <mesh position={[0, h * 0.18, 0]}>
          <cylinderGeometry args={[h * 0.022, h * 0.026, h * 0.74, 8]} />
          {struct(pal.dark, 0.5, 0.6)}
        </mesh>
        <mesh position={[0, h * 0.56, 0]}>
          <boxGeometry args={[h * 0.17, h * 0.17, h * 0.17]} />
          {struct(pal.secondary, 0.6, 0.4)}
        </mesh>
        <mesh position={[0, h * 0.56, 0]}>
          <boxGeometry args={[h * 0.19, h * 0.05, h * 0.05]} />
          {glowMat(pal.glow, 1.0 * k)}
        </mesh>
      </group>
    </group>
  );
}

// ── Vesper · The Diviner — a scrying orb wrapped in divination rings ──────────
function Diviner({ h, pal, k }: { h: number; pal: RegaliaPalette; k: number }) {
  const rings = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const eye = useRef<THREE.Mesh>(null);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (rings.current) {
      rings.current.rotation.y += dt * 0.5;
      rings.current.rotation.x += dt * 0.22;
    }
    if (orb.current) orb.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    if (eye.current) {
      const mat = eye.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (1.4 + Math.sin(t * 2.2) * 0.5) * k;
    }
  });
  return (
    <group>
      {/* scrying orb floating before the chest */}
      <group position={[0, h * 0.72, h * 0.42]}>
        <mesh ref={orb}>
          <sphereGeometry args={[h * 0.16, 20, 18]} />
          <meshStandardMaterial color={pal.glow} emissive={pal.glow} emissiveIntensity={1.5 * k} metalness={0.2} roughness={0.08} transparent opacity={0.86} />
        </mesh>
        <group ref={rings}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[i * 0.7, i * 0.5, 0]}>
              <torusGeometry args={[h * 0.24 * (1 - i * 0.13), h * 0.01, 6, 48]} />
              <meshBasicMaterial color={i % 2 ? pal.accent : pal.glow} transparent opacity={0.6 * k} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
      {/* a third eye sigil hovering over the brow */}
      <mesh ref={eye} position={[0, h * 1.04, h * 0.06]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[h * 0.05, 0]} />
        {glowMat(pal.accent, 1.4 * k)}
      </mesh>
    </group>
  );
}

// ── Sable · The Vaultheart — a great scythe + a crown of shards ───────────────
function Vaultheart({ h, pal, k }: { h: number; pal: RegaliaPalette; k: number }) {
  const blade = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (blade.current) {
      const mat = blade.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (1.1 + Math.sin(s.clock.elapsedTime * 2.4) * 0.4) * k;
    }
  });
  return (
    <group>
      {/* scythe — a long haft with an angled, glowing blade */}
      <group position={[h * 0.38, 0, h * 0.06]} rotation={[0, 0, 0.05]}>
        <mesh position={[0, h * 0.82, 0]}>
          <cylinderGeometry args={[h * 0.02, h * 0.026, h * 1.66, 8]} />
          {struct(pal.dark, 0.5, 0.6)}
        </mesh>
        {/* socket */}
        <mesh position={[0, h * 1.62, 0]}>
          <sphereGeometry args={[h * 0.05, 10, 8]} />
          {struct(pal.secondary)}
        </mesh>
        {/* blade — a flattened triangular sweep */}
        <group position={[0, h * 1.6, 0]} rotation={[0, 0, -1.15]}>
          <mesh ref={blade} position={[h * 0.2, 0, 0]} scale={[1, 1, 0.16]}>
            <coneGeometry args={[h * 0.13, h * 0.56, 3]} />
            {glowMat(pal.accent, 1.1 * k)}
          </mesh>
        </group>
      </group>
      {/* crown of shards around the head */}
      <group position={[0, h * 0.99, 0]}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * h * 0.14, h * 0.04, Math.sin(a) * h * 0.14]} rotation={[0, -a, 0.18]}>
              <coneGeometry args={[h * 0.026, h * 0.17, 4]} />
              {glowMat(pal.glow, 1.0 * k)}
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
