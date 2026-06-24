"use client";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import type { VenueId } from "./venues";
import { VENUES } from "./venues";

const GOLD = "#f5d020";

/** Concord game door — smaller and cooler than a Vaultgate (regions only). */
export function ConcordVenuePortal({
  venue,
  pos,
}: {
  venue: VenueId;
  pos: [number, number, number];
}) {
  const def = VENUES[venue];
  const col = def.color;
  const rot = useMemo(() => Math.atan2(-pos[0], -pos[2]), [pos]);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[0.35, 4.2, 0.35]} />
        <meshStandardMaterial color="#1a1830" emissive={col} emissiveIntensity={0.35} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-1.1, 2.8, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.28, 3.2, 0.28]} />
        <meshStandardMaterial color="#1a1830" emissive={col} emissiveIntensity={0.25} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[1.1, 2.8, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.28, 3.2, 0.28]} />
        <meshStandardMaterial color="#1a1830" emissive={col} emissiveIntensity={0.25} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.35, 0]}>
        <boxGeometry args={[2.6, 0.35, 0.5]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.7} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.5, 1.85, 48]} />
        <meshBasicMaterial color={col} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html position={[0, 5.2, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div className="mono" style={{ fontSize: 8, letterSpacing: 1.5, color: col, fontWeight: 700 }}>GAME</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px #000" }}>{def.shortLabel}</div>
        </div>
      </Html>
    </group>
  );
}

/** Return arch — back to the Concord (regions only). */
export function ReturnPortal({ pos }: { pos: [number, number, number] }) {
  const rot = useMemo(() => Math.atan2(-pos[0], -pos[2]), [pos]);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 2.4, 0]}>
        <torusGeometry args={[1.8, 0.12, 10, 40, Math.PI]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.55} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.4, 1.75, 40]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 3.6, 0]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: GOLD, fontWeight: 700 }}>RETURN · THE CONCORD</div>
      </Html>
    </group>
  );
}

/** Region circuit tunnel mouth — thematic shell; the race is inside. */
export function CircuitTunnelPortal({
  pos,
  label,
  accent,
  variant,
}: {
  pos: [number, number, number];
  label: string;
  accent: string;
  variant: "grounds" | "gauntlet" | "void" | "concord";
}) {
  const rot = useMemo(() => Math.atan2(-pos[0], -pos[2]), [pos]);
  const tall = variant === "grounds";
  const jagged = variant === "gauntlet";
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {jagged ? (
        <>
          <mesh position={[-1.4, 1.8, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.2, 3.6, 1.4]} />
            <meshStandardMaterial color="#2a1208" emissive="#ff5a1a" emissiveIntensity={0.4} roughness={0.9} />
          </mesh>
          <mesh position={[1.3, 2.1, 0]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[1.1, 4, 1.2]} />
            <meshStandardMaterial color="#2a1208" emissive="#ff5a1a" emissiveIntensity={0.35} roughness={0.9} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-1.5, tall ? 2.5 : 2, 0]}>
            <cylinderGeometry args={[0.9, 1.2, tall ? 5 : 4, 6]} />
            <meshStandardMaterial color="#1a1838" emissive={accent} emissiveIntensity={0.3} roughness={0.85} />
          </mesh>
          <mesh position={[1.5, tall ? 2.5 : 2, 0]}>
            <cylinderGeometry args={[0.9, 1.2, tall ? 5 : 4, 6]} />
            <meshStandardMaterial color="#1a1838" emissive={accent} emissiveIntensity={0.3} roughness={0.85} />
          </mesh>
        </>
      )}
      <mesh position={[0, tall ? 1.2 : 1, -0.3]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2.4, tall ? 2.8 : 2.4]} />
        <meshStandardMaterial color="#050508" emissive={accent} emissiveIntensity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.6, 2, 44]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <Html position={[0, tall ? 4.2 : 3.5, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div className="mono" style={{ fontSize: 8, letterSpacing: 1.5, color: accent }}>CIRCUIT</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px #000" }}>{label}</div>
        </div>
      </Html>
    </group>
  );
}

/** Walk back to exit an active game scene. */
export function VenueExitPortal({
  pos,
  label,
  accent,
}: {
  pos: [number, number, number];
  label: string;
  accent: string;
}) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.2, 2.55, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Html position={[0, 2.2, 0]} center distanceFactor={16} style={{ pointerEvents: "none" }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: accent, fontWeight: 700, textAlign: "center" }}>{label}</div>
      </Html>
    </RigidBody>
  );
}
