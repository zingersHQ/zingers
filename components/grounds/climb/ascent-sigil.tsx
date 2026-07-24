"use client";
// Slowly-rotating halo of glyphs — glyph count = campsLit / Reaches lit
// (essence §3 "an ascent sigil baked onto the body"). Shared by Climb + desktop Flight.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function AscentSigil({ reaches, accent }: { reaches: number; accent: string }) {
  const grp = useRef<THREE.Group>(null);
  const n = Math.min(10, Math.max(0, reaches));
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * 0.8;
  });
  if (n <= 0) return null;
  return (
    <group ref={grp} position={[0, 1.55, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.08, 0.026, 8, 20]} />
            <meshBasicMaterial color={accent} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 8, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
