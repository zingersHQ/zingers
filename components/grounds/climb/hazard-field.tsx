"use client";
// Shared hazard rendering for BOTH bodies of the Ascent — the mobile one-thumb
// Climb (circuit-lite) and the desktop 6-DOF Circuit (world.tsx). Every hazard
// is drawn purely from `hazardState(h, t)` off the R3F clock, so the visuals
// stay in exact lockstep with whatever collision test runs against the same
// clock (the kinematic flyer on mobile, the Handler capsule on desktop). ≤5
// hazards per sector, so per-hazard meshes are cheap.
//
// Visual law: DANGER never wears treasure gold. Warm reds / magenta / cold
// hostile cyan with spikes. Crown caches (octahedron) are the only reward read.
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { hazardState, type Hazard } from "./hazards";

/** Hostile palette — never `#f5d020` (Crowns / Crown caches). */
export const HAZARD_COLOR: Record<Hazard["kind"], string> = {
  driftCrystal: "#4ec8ff",
  cinderArc: "#ff7a2a",
  plume: "#ff5a1a",
  wardenWisp: "#ff4a6a",
  ringRotor: "#ff2d55",
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

  const r = h.radius;
  let geom: ReactNode;
  if (h.kind === "driftCrystal") {
    // Spiky hostile shard — not a pretty loot gem
    geom = (
      <>
        <mesh>
          <tetrahedronGeometry args={[r * 1.15, 0]} />
          <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.95} metalness={0.35} roughness={0.35} toneMapped={false} depthWrite />
        </mesh>
        <mesh rotation={[0.6, 0.4, 0.2]}>
          <tetrahedronGeometry args={[r * 0.7, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} transparent opacity={0.85} metalness={0.3} roughness={0.4} toneMapped={false} depthWrite={false} />
        </mesh>
      </>
    );
  } else if (h.kind === "cinderArc") {
    geom = (
      <mesh>
        <sphereGeometry args={[r, 12, 12]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.95} metalness={0.2} roughness={0.5} toneMapped={false} />
      </mesh>
    );
  } else if (h.kind === "wardenWisp") {
    geom = (
      <mesh>
        <sphereGeometry args={[r, 12, 12]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.95} metalness={0.2} roughness={0.5} toneMapped={false} />
      </mesh>
    );
  } else if (h.kind === "ringRotor") {
    // Thick danger bar with warn ticks — never treasure gold
    const half = (h.gate?.r ?? 2) * 1.8;
    geom = (
      <>
        <mesh>
          <boxGeometry args={[half * 2, 0.32, 0.32]} />
          <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.95} metalness={0.25} roughness={0.45} toneMapped={false} />
        </mesh>
        {[-0.55, 0, 0.55].map((u) => (
          <mesh key={u} position={[half * u, 0, 0.2]}>
            <boxGeometry args={[0.18, 0.5, 0.12]} />
            <meshBasicMaterial color="#ff8aa0" toneMapped={false} />
          </mesh>
        ))}
      </>
    );
  } else {
    geom = (
      <mesh position={[0, h.height / 2, 0]}>
        <cylinderGeometry args={[r, r * 0.7, h.height, 10]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.95} metalness={0.2} roughness={0.5} toneMapped={false} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <group ref={grp}>
      {geom}
      {/* Danger halo — telegraph from a distance (never crown-gold) */}
      {(h.kind === "wardenWisp" || h.kind === "driftCrystal" || h.kind === "ringRotor") && (
        <mesh>
          <sphereGeometry args={[r * (h.kind === "ringRotor" ? 2.2 : 1.7), 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
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
