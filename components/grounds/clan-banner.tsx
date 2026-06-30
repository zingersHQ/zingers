"use client";
import { useMemo } from "react";
import * as THREE from "three";
import type { CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { FORCES } from "@/lib/lore/canon";

const sigilTexCache = new Map<string, THREE.CanvasTexture>();

export function sigilTexture(sigil: string): THREE.CanvasTexture {
  const cached = sigilTexCache.get(sigil);
  if (cached) return cached;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, S, S);
  x.fillStyle = "#ffffff";
  x.font = "bold 92px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(sigil, S / 2, S / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  sigilTexCache.set(sigil, tex);
  return tex;
}

/** Heraldic clan standard — reused on champions and pledged Readers. */
export function ClanBanner({ clan, h, scale = 1 }: { clan: CreatureType; h: number; scale?: number }) {
  const col = TYPE_COLOR[clan] || "#8888ff";
  const sigil = FORCES[clan].sigil;
  const tex = useMemo(() => sigilTexture(sigil), [sigil]);
  const poleH = Math.max(2.9, h * 1.35) * scale;
  const flagY = poleH - 0.62 * scale;
  const offset = Math.max(1.2, h * 0.62) * scale;
  return (
    <group position={[offset, 0, 0.15 * scale]} scale={scale}>
      <mesh position={[0, poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05 * scale, 0.06 * scale, poleH, 8]} />
        <meshStandardMaterial color="#2a2438" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, poleH + 0.05 * scale, 0]}>
        <sphereGeometry args={[0.12 * scale, 12, 12]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0.52 * scale, flagY, 0]}>
        <planeGeometry args={[0.92 * scale, 0.64 * scale]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9} roughness={0.55} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.52 * scale, flagY, 0.014]}>
        <planeGeometry args={[0.74 * scale, 0.52 * scale]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.52 * scale, flagY, -0.014]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.74 * scale, 0.52 * scale]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
