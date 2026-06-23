"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Concord — the hub slab of the Grounds (docs/bible/01-cosmology.md). Neutral
// ground above the sealed Vault door where all five Forces keep an uneasy peace,
// ringed by the Vaultgates that reach each region. This is a BUILT place — a
// settlement you spawn into and travel out from — not a prop field. Code-only
// stylized primitives, in the same idiom as structures.tsx.
//
// Composition:
//   • the Seal      — the sealed golden Vault door, set into the central plaza
//   • Clan flags    — the five houses ring the seal; your pledged Clan stands lit
//   • Vaultgates    — portal arches out to each region (walk in + E to travel)
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CreatureType } from "@/lib/types";
import { FORCES, WHEEL, FORCE_MOTTO } from "@/lib/lore/canon";

const GOLD = "#f5d020";

export interface ConcordGate {
  world: string; // destination world id
  label: string; // region name shown on the gate
  color: string; // destination accent
  pos: [number, number, number]; // ground position in the hub
}

export function ConcordScene({
  gates,
  pledged,
  featuredWorld = null,
  daylight = false,
  choosing = false,
  clanPreview = null,
}: {
  gates: ConcordGate[];
  pledged: CreatureType | null;
  featuredWorld?: string | null;
  daylight?: boolean;
  // While the Clan sheet is open every flag drops to the ground except the one
  // you're hovering on in the picker; after pledging, only your Clan stays up.
  choosing?: boolean;
  clanPreview?: CreatureType | null;
}) {
  return (
    <group>
      <Seal daylight={daylight} />
      <ClanFlags pledged={pledged} choosing={choosing} preview={clanPreview} />
      {gates.map((g) => (
        <Vaultgate key={g.world} gate={g} rising={g.world === featuredWorld} />
      ))}
      {/* a soft neutral key light over the plaza so the hub reads as calm, lit ground */}
      <pointLight position={[0, 12, 0]} intensity={120} color="#cdb8ff" distance={60} />
    </group>
  );
}

// The Concord's meta-games used to ring the seal as walk-up shrines. They've
// moved out to their own destination (the Amphitheatre, reached via a Vaultgate),
// so the hub is now just the seal, the Clan flags and the gates. The venue id
// type lives on because the relocated Daily herald still rides the "venue" near-
// target kind (see components/grounds/amphitheatre.tsx).
export type ConcordVenueId = "daily" | "league";

// ── The Seal — the sealed Vault door, flush in the plaza ─────────────────────
function Seal({ daylight }: { daylight: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) ringRef.current.rotation.z = state.clock.elapsedTime * 0.06;
  });
  const e = daylight ? 0.6 : 1.6;
  return (
    <group>
      {/* outer engraved disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[5.2, 96]} />
        <meshStandardMaterial color="#15121f" emissive={GOLD} emissiveIntensity={e * 0.18} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* concentric gold seams */}
      {[5.0, 3.7, 2.4].map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
          <ringGeometry args={[r - 0.06, r, 96]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.55 - i * 0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* the lock-rune: a slow-turning eight-spoke wheel */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[1.0, 1.18, 8]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={e} metalness={0.8} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 0.2, 3.2]} center distanceFactor={20} zIndexRange={[16, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, fontWeight: 700, opacity: 0.85 }}>THE LONG VAULT · SEALED</div>
        </div>
      </Html>
    </group>
  );
}

// ── The five Clan flags ring the seal; the pledged one stands tall & lit ──
// Pulled in close around the centre so the allegiance flags frame the seal
// tightly (and read from the spawn mound), while still clear of the 5.2-radius
// door with room to walk up and swear.
export const CLAN_R = 8;

export interface ClanSpot {
  type: CreatureType;
  x: number;
  z: number;
  rot: number;
}

// Shared clan-flag layout — the scene draws from this and the Handler reads the
// same spots for the walk-up "swear allegiance" prompt, so the flag you see is
// the clan you pledge under.
export function concordClanSpots(): ClanSpot[] {
  return WHEEL.map((type, i) => {
    const a = (i / WHEEL.length) * Math.PI * 2 - Math.PI / 2;
    return { type, x: Math.cos(a) * CLAN_R, z: Math.sin(a) * CLAN_R, rot: -a + Math.PI / 2 };
  });
}

function ClanFlags({
  pledged,
  choosing = false,
  preview = null,
}: {
  pledged: CreatureType | null;
  choosing?: boolean;
  preview?: CreatureType | null;
}) {
  const clans = useMemo(() => concordClanSpots(), []);
  const pickMode = choosing || pledged != null;
  return (
    <>
      {clans.map((b) => {
        const lit = pledged === b.type;
        const raised = choosing ? preview === b.type : pledged != null ? pledged === b.type : true;
        return (
          <ClanFlag key={b.type} type={b.type} x={b.x} z={b.z} rot={b.rot} lit={lit} raised={raised} pickMode={pickMode} />
        );
      })}
    </>
  );
}

function ClanFlag({
  type,
  x,
  z,
  rot,
  lit,
  raised,
  pickMode,
}: {
  type: CreatureType;
  x: number;
  z: number;
  rot: number;
  lit: boolean;
  raised: boolean;
  pickMode: boolean;
}) {
  const lore = FORCES[type];
  const col = lore.hex;
  const h = lit ? 7.2 : 5.6;
  const clothRef = useRef<THREE.Group>(null);
  const mastRef = useRef<THREE.Group>(null);
  const groundRef = useRef<THREE.Group>(null);
  const raisedT = useRef(raised ? 1 : 0);
  useFrame((state) => {
    const target = raised ? 1 : 0;
    raisedT.current += (target - raisedT.current) * 0.12;
    const t = raisedT.current;
    const ground = 1 - t;
    if (clothRef.current) clothRef.current.rotation.y = rot + Math.sin(state.clock.elapsedTime * 0.9 + x) * 0.07;
    if (mastRef.current) {
      mastRef.current.visible = t > 0.04;
      mastRef.current.scale.y = t;
    }
    if (groundRef.current) {
      groundRef.current.visible = pickMode && ground > 0.04;
      groundRef.current.scale.setScalar(0.82 + ground * 0.18);
      const mat = (groundRef.current.children[0] as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) mat.opacity = lit ? 0.92 : 0.72 + ground * 0.1;
    }
  });
  return (
    <group position={[x, 0, z]}>
      {/* floor footprint you stand on to swear — pulses on your own house */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.4, 1.7, 40]} />
        <meshBasicMaterial color={col} transparent opacity={lit ? 0.7 : 0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* base plinth */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.7, 0.5, 8]} />
        <meshStandardMaterial color="#1b1726" emissive={col} emissiveIntensity={lit ? 0.5 : 0.2} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* ground-level banner — no mast, just the cloth draped on the plinth */}
      <group ref={groundRef} visible={pickMode && !raised} rotation={[0, rot, 0]}>
        <mesh position={[0.85, 0.34, 0]} rotation={[-Math.PI / 2 + 0.22, 0, 0]} castShadow>
          <planeGeometry args={[2.1, 1.5]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={lit ? 0.55 : 0.28} metalness={0.15} roughness={0.65} side={THREE.DoubleSide} transparent opacity={0.78} />
        </mesh>
        <Html position={[0.85, 0.55, 0]} center distanceFactor={13} zIndexRange={[17, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", color: "#fff", textShadow: "0 1px 6px #000", lineHeight: 1.05 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{lore.sigil}</div>
            <div style={{ fontSize: 7.5, letterSpacing: 1, opacity: 0.9 }}>{lore.inWorld.toUpperCase()}</div>
          </div>
        </Html>
      </group>
      {/* full mast — only the pledged / previewed Clan keeps this up */}
      <group ref={mastRef}>
        {/* pole */}
        <mesh position={[0, h / 2 + 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, h, 8]} />
          <meshStandardMaterial color="#2a2438" metalness={0.6} roughness={0.4} emissive={col} emissiveIntensity={lit ? 0.4 : 0.12} />
        </mesh>
        {/* the flag cloth, facing outward */}
        <group ref={clothRef} position={[0, h - 0.4, 0]} rotation={[0, rot, 0]}>
          <mesh position={[0.95, 0, 0]} castShadow>
            <planeGeometry args={[1.9, 2.8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={lit ? 0.9 : 0.35} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} transparent opacity={lit ? 0.96 : 0.78} />
          </mesh>
          <Html position={[0.95, 0, 0.02]} center distanceFactor={11} zIndexRange={[17, 0]} style={{ pointerEvents: "none" }}>
            <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", color: "#fff", textShadow: "0 1px 6px #000", lineHeight: 1.05 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{lore.sigil}</div>
              <div style={{ fontSize: 8, letterSpacing: 1, opacity: 0.9 }}>{lore.inWorld.toUpperCase()}</div>
            </div>
          </Html>
        </group>
        {/* a finial crown + a light when this is YOUR house */}
        <mesh position={[0, h + 0.7, 0]}>
          <octahedronGeometry args={[lit ? 0.34 : 0.24, 0]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={lit ? 2.6 : 1.2} metalness={0.4} roughness={0.25} />
        </mesh>
        {lit ? (
          <>
            <pointLight position={[0, h * 0.7, 0]} intensity={26} color={col} distance={14} />
            <Html position={[0, h + 1.4, 0]} center distanceFactor={13} zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
              <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 8, letterSpacing: 1.5, color: col, fontWeight: 700 }}>YOUR CLAN</div>
                <div style={{ fontSize: 9, fontStyle: "italic", color: "#fff", textShadow: "0 1px 6px #000" }}>{FORCE_MOTTO[type]}</div>
              </div>
            </Html>
          </>
        ) : (
          !pickMode && (
            <Html position={[0, 1.0, 0]} center distanceFactor={15} zIndexRange={[17, 0]} style={{ pointerEvents: "none" }}>
              <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 8, letterSpacing: 1.5, color: col, fontWeight: 700, opacity: 0.85 }}>{lore.inWorld.toUpperCase()}</div>
                <div style={{ fontSize: 7.5, letterSpacing: 1, color: "#cfcdee", opacity: 0.7 }}>walk up · join this clan</div>
              </div>
            </Html>
          )
        )}
      </group>
    </group>
  );
}

// ── A Vaultgate — a portal arch out to a region ──────────────────────────────
function Vaultgate({ gate, rising = false }: { gate: ConcordGate; rising?: boolean }) {
  const portalRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const col = gate.color;
  // face the gate inward toward the seal at the plaza centre
  const rot = useMemo(() => Math.atan2(-gate.pos[0], -gate.pos[2]), [gate.pos]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (portalRef.current) {
      const m = portalRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.32 + Math.sin(t * 1.6) * 0.1;
    }
    if (beamRef.current) (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.09 + Math.sin(t * 1.3) * 0.03;
  });
  const W = 3.2; // arch inner width
  const H = 4.6; // arch height
  const pillar = (sx: number) => (
    <mesh position={[sx * (W / 2 + 0.35), H / 2, 0]} castShadow>
      <boxGeometry args={[0.6, H, 0.6]} />
      <meshStandardMaterial color="#1c1830" emissive={col} emissiveIntensity={0.5} metalness={0.6} roughness={0.4} />
    </mesh>
  );
  return (
    <group position={gate.pos} rotation={[0, rot, 0]}>
      {pillar(-1)}
      {pillar(1)}
      {/* lintel */}
      <mesh position={[0, H + 0.3, 0]} castShadow>
        <boxGeometry args={[W + 1.3, 0.6, 0.7]} />
        <meshStandardMaterial color="#1c1830" emissive={col} emissiveIntensity={0.6} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* the portal surface */}
      <mesh ref={portalRef} position={[0, H / 2, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color={col} transparent opacity={0.35} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* floor footprint ring you stand on to travel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.7, 2.0, 40]} />
        <meshBasicMaterial color={col} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* wayfinding beam */}
      <mesh ref={beamRef} position={[0, 13, 0]}>
        <cylinderGeometry args={[0.4, 1.1, 26, 14, 1, true]} />
        <meshBasicMaterial color={col} transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <pointLight position={[0, H * 0.6, 0.4]} intensity={36} color={col} distance={18} />
      <Html position={[0, H + 1.2, 0]} center distanceFactor={15} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: col, fontWeight: 700 }}>VAULTGATE</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px #000" }}>{gate.label}</div>
          {rising && <div style={{ fontSize: 8, letterSpacing: 1.5, color: "#f5d020", fontWeight: 700 }}>▲ SEASON SPOTLIGHT</div>}
        </div>
      </Html>
    </group>
  );
}
