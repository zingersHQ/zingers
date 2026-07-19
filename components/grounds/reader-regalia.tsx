"use client";
import { Html } from "@react-three/drei";
import { GOLD } from "@/lib/render/palette";

/** Gold chest badge — brightness scales with Reader level. */
export function ReaderRankEmblem({ level }: { level: number }) {
  const intensity = Math.min(1.6, 0.55 + level * 0.035);
  return (
    <mesh position={[0, 0.38, 0.26]}>
      <circleGeometry args={[0.11, 16]} />
      <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={intensity} metalness={0.4} roughness={0.35} />
    </mesh>
  );
}

/** Small gold Reader sigil on the Handler's back. */
export function ReaderBackSigil({ height }: { height: number }) {
  return (
    <group position={[0, height * 0.52, -0.24]}>
      <mesh>
        <planeGeometry args={[0.26, 0.26]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.1} metalness={0.35} roughness={0.4} />
      </mesh>
      <Html center transform distanceFactor={6} style={{ pointerEvents: "none" }}>
        <span style={{ fontSize: 14, color: "#0a0813", fontWeight: 800 }}>◈</span>
      </Html>
    </group>
  );
}
