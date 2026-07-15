"use client";
// Shared hazard rendering for BOTH bodies of the Ascent — the mobile one-thumb
// Climb (circuit-lite) and the desktop 6-DOF Circuit (world.tsx). Every hazard
// is drawn purely from `hazardState(h, t)` off the R3F clock, so the visuals
// stay in exact lockstep with whatever collision test runs against the same
// clock (the kinematic flyer on mobile, the Handler capsule on desktop). ≤5
// hazards per sector, so per-hazard meshes are cheap.
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { hazardState, type Hazard } from "./hazards";

export const HAZARD_COLOR: Record<Hazard["kind"], string> = {
  driftCrystal: "#8affff",
  cinderArc: "#ff7a2a",
  plume: "#ff5a1a",
  wardenWisp: "#ff4a6a",
  ringRotor: "#ffd66a",
};

function HazardMesh({ h }: { h: Hazard }) {
  const grp = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const color = HAZARD_COLOR[h.kind];
  useFrame((state) => {
    const s = hazardState(h, state.clock.elapsedTime);
    const g = grp.current;
    if (!g) return;
    g.position.set(s.x, s.y, s.z);
    if (h.kind === "ringRotor") g.rotation.z = s.angle;
    if (h.kind === "plume") {
      const sc = s.active ? 1 : 0.12 + s.telegraph * 0.88;
      g.scale.y = sc;
      g.visible = s.active || s.telegraph > 0.02;
    }
    if (mat.current) {
      mat.current.emissiveIntensity = h.kind === "plume" ? (s.active ? 1.8 : 0.5 + s.telegraph * 1.0) : 1.4;
      mat.current.opacity = h.kind === "plume" ? (s.active ? 0.92 : 0.25 + s.telegraph * 0.5) : 0.95;
    }
  });

  let geom: React.ReactNode;
  if (h.kind === "driftCrystal") geom = <octahedronGeometry args={[h.radius, 0]} />;
  else if (h.kind === "cinderArc") geom = <sphereGeometry args={[h.radius, 12, 12]} />;
  else if (h.kind === "wardenWisp") geom = <sphereGeometry args={[h.radius, 12, 12]} />;
  else if (h.kind === "ringRotor") geom = <boxGeometry args={[(h.gate?.r ?? 2) * 1.8, 0.24, 0.24]} />;
  else geom = <cylinderGeometry args={[h.radius, h.radius * 0.7, h.height, 10]} />; // plume

  const inner = (
    <mesh position={h.kind === "plume" ? [0, h.height / 2, 0] : [0, 0, 0]}>
      {geom}
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.95} metalness={0.2} roughness={0.5} toneMapped={false} depthWrite={h.kind !== "plume"} />
    </mesh>
  );

  return (
    <group ref={grp}>
      {inner}
      {/* a faint danger halo so hazards read from a distance (the telegraph) */}
      {(h.kind === "wardenWisp" || h.kind === "driftCrystal") && (
        <mesh>
          <sphereGeometry args={[h.radius * 1.7, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}

export function HazardField({ hazards }: { hazards: Hazard[] }) {
  return (
    <>
      {hazards.map((h) => (
        <HazardMesh key={h.id} h={h} />
      ))}
    </>
  );
}
