"use client";
import { Html } from "@react-three/drei";
import type { CreatureType } from "@/lib/types";
import { trainerLevel, forceMeta } from "@/lib/evolve/trainer";
import { GOLD } from "@/lib/render/palette";

/** Floating Reader rank label above the Handler. */
export function ReaderSigilBillboard({
  trainerXp,
  force,
  height,
}: {
  trainerXp: number;
  force: CreatureType | null;
  height: number;
}) {
  const tl = trainerLevel(trainerXp);
  const fm = force ? forceMeta(force) : null;
  return (
    <Html position={[0, height + 0.62, 0]} center distanceFactor={9} style={{ pointerEvents: "none", userSelect: "none" }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          fontWeight: 700,
          color: GOLD,
          background: "rgba(8,6,14,.82)",
          border: `1px solid ${GOLD}`,
          borderRadius: 8,
          padding: "4px 10px",
          whiteSpace: "nowrap",
          boxShadow: `0 0 16px -4px ${GOLD}`,
        }}
      >
        Lv {tl.level} · {tl.title}
        {fm ? ` · ${fm.name}` : ""}
      </div>
    </Html>
  );
}

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
