"use client";
import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import type { VenueId } from "./venues";
import { VENUES } from "./venues";

const GOLD = "#f5d020";

// ── the shared portal plane ────────────────────────────────────────────────
// The identity of every Ascent/Return portal: a slowly-swirling additive disc
// in the destination's accent, with the drift-mote speckle rising through it
// (the Climb's signature texture). Cached per color so re-mounts are cheap
// (game-feel rule: expensive canvas textures are cached per palette).
const swirlCache = new Map<string, THREE.CanvasTexture>();
function swirlTexture(color: string): THREE.CanvasTexture {
  const hit = swirlCache.get(color);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d")!;
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  // radial core glow
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgba(${rgb},0.95)`);
  g.addColorStop(0.35, `rgba(${rgb},0.5)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // swirled spokes
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(S / 2, S / 2);
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    for (let r = 6; r < S / 2; r += 2) {
      const a = r * 0.05;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.strokeStyle = `rgba(${rgb},0.22)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  swirlCache.set(color, tex);
  return tex;
}

function PortalPlane({ radius, color, spin = 0.35 }: { radius: number; color: string; spin?: number }) {
  const disc = useRef<THREE.Mesh>(null);
  const born = useRef(0);
  const tex = useMemo(() => swirlTexture(color), [color]);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    if (disc.current) {
      disc.current.rotation.z += spin * step; // rad/s × dt — fps-independent
      // one-shot emerge ripple: a brief scale/brightness pulse on mount
      if (born.current < 1) {
        born.current = Math.min(1, born.current + step * 1.6);
        const pulse = 1 + Math.sin(born.current * Math.PI) * 0.14;
        disc.current.scale.setScalar(pulse);
      }
    }
  });
  return (
    <group>
      <mesh ref={disc}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial map={tex} color={color} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <ringGeometry args={[radius * 0.98, radius * 1.06, 60]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export type PortalTheme = "concord" | "gauntlet" | "void" | "grounds";

// The portal arch is a HALF VERTICAL OVAL standing on the ground with the
// swirling plane inside it (replacing the old twin-pylon+lintel columns, which
// read as ugly boxes). It's a rounded ellipse arch — feet on the ground, a tall
// oval crown — monumental enough to read as a destination across the plaza. The
// stone tint varies by host world; the swirling plane is the shared identity.
const ARCH_RX = 3.6; // half-width — the legs meet the ground at ±RX
const ARCH_SY = 1.7; // vertical stretch → a tall oval; apex sits at RX·SY
const ARCH_APEX = ARCH_RX * ARCH_SY; // ≈ 6.1u tall
/** Where the swirling plane sits inside the oval, and how wide it can be without
 *  clipping the frame. Shared so every portal frames its plane identically. */
export const PORTAL_OPEN_Y = 2.8;
export const PORTAL_RADIUS = 2.4;
export const PORTAL_LABEL_Y = ARCH_APEX + 0.9;

function ArchShell({ accent, theme }: { accent: string; theme: PortalTheme }) {
  const stone = theme === "gauntlet" ? "#2a1208" : theme === "void" ? "#0c1832" : theme === "grounds" ? "#152012" : "#141230";
  return (
    <>
      {/* the half-oval frame — a torus arc (rainbow) stretched tall into an oval */}
      <group scale={[1, ARCH_SY, 1]}>
        <mesh castShadow>
          <torusGeometry args={[ARCH_RX, 0.42, 16, 64, Math.PI]} />
          <meshStandardMaterial color={stone} emissive={accent} emissiveIntensity={0.42} metalness={0.5} roughness={0.55} />
        </mesh>
      </group>
      {/* keystone at the crown of the oval */}
      <mesh position={[0, ARCH_APEX, 0]} castShadow>
        <boxGeometry args={[1.3, 0.7, 1.2]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* stone feet where the legs plant on the ground */}
      {[-ARCH_RX, ARCH_RX].map((x, i) => (
        <mesh key={i} position={[x, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.95, 1.1, 10]} />
          <meshStandardMaterial color={stone} emissive={accent} emissiveIntensity={0.3} metalness={0.45} roughness={0.6} />
        </mesh>
      ))}
      {/* inner glow rim hugging the opening (an ellipse to match the oval) */}
      <mesh position={[0, PORTAL_OPEN_Y, -0.12]} scale={[1, 1.55, 1]}>
        <ringGeometry args={[PORTAL_RADIUS * 1.02, PORTAL_RADIUS * 1.1, 56]} />
        <meshBasicMaterial color={accent} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* ground ring at the threshold */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[ARCH_RX * 0.66, ARCH_RX * 0.92, 56]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

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

/** The monumental Ascent Portal — the Circuit entrance crowning the region peak.
 *  ~2× Vaultgate scale with the swirling Reach-accent plane and the Reach it
 *  opens blazoned above. Crossing the plane travels (no E). */
export function AscentPortal({
  pos,
  accent,
  theme = "concord",
  reachRoman,
  reachName,
}: {
  pos: [number, number, number];
  accent: string;
  theme?: PortalTheme;
  reachRoman: string;
  reachName: string;
}) {
  const rot = useMemo(() => Math.atan2(-pos[0], -pos[2]), [pos]);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <ArchShell accent={accent} theme={theme} />
      <group position={[0, PORTAL_OPEN_Y, 0]}>
        <PortalPlane radius={PORTAL_RADIUS} color={accent} />
      </group>
      <Html position={[0, PORTAL_LABEL_Y, 0]} center distanceFactor={22} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div className="mono" style={{ fontSize: 8.5, letterSpacing: 2, color: accent, fontWeight: 800 }}>THE ASCENT</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", textShadow: "0 2px 10px #000" }}>REACH {reachRoman} · {reachName.toUpperCase()}</div>
        </div>
      </Html>
    </group>
  );
}

/** The Return Portal — stands behind the Circuit spawn; you emerge from it and
 *  walk back through it to exit. Its plane wears the destination world's accent
 *  (the portal shows where it goes). Crossing the plane exits (no E). */
export function AscentReturnPortal({
  pos,
  accent,
  theme = "concord",
  label,
  rotationY = 0,
}: {
  pos: [number, number, number];
  accent: string;
  theme?: PortalTheme;
  label: string;
  /** face the portal a given way (regions face it inward toward the plaza; the
   *  Circuit return keeps the default +z so it faces the down-track spawn). */
  rotationY?: number;
}) {
  return (
    <group position={pos} rotation={[0, rotationY, 0]}>
      <ArchShell accent={accent} theme={theme} />
      <group position={[0, PORTAL_OPEN_Y, 0]}>
        <PortalPlane radius={PORTAL_RADIUS} color={accent} spin={-0.3} />
      </group>
      <Html position={[0, PORTAL_LABEL_Y, 0]} center distanceFactor={22} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div className="mono" style={{ fontSize: 8.5, letterSpacing: 2, color: accent, fontWeight: 800 }}>RETURN</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", textShadow: "0 2px 10px #000" }}>{label.toUpperCase()}</div>
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
