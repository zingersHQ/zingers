"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Amphitheatre — a built spectator venue you travel to through a Concord
// Vaultgate. A torchlit stone bowl: tiers of empty seating ring a sanded combat
// floor, a colonnade and braziers frame it, and at the back a victor's throne
// holds the reigning champion beneath a wall of ranked banners.
//
// The point: the league fights HERE, in the middle of a real place, and the
// standings ARE the environment — the banners are ordered + sized by rank and
// the #1 champion physically stands on the throne. No floating chart. You read
// the ladder by looking at the room.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Champion } from "@/lib/types";
import type { GroundChampion } from "@/components/grounds/world";
import { PODIUM_A, PODIUM_B } from "@/components/grounds/match-stage";
import { ChampionMesh } from "@/components/grounds/champion-mesh";
import { useLeague, type GalleryFocus } from "@/components/grounds/gallery";
import { TYPE_COLOR, EMBLEM, levelFor, tierFor, skillLevel } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { FORCES } from "@/lib/lore/canon";
import { useChampions } from "@/store/champions";

const STONE = "#2a2218";
const STONE_HI = "#4a3b26";
const GOLD = "#ffb14a";

const FLOOR_R = 15; // the sanded combat floor
const DAIS_R = 4.4; // the raised ring at its centre
const THRONE: [number, number, number] = [0, 0, -11.5];
// the player enters from the south (+z); keep that arc clear of structure
const ENTRANCE = Math.PI / 2; // bearing of the gap (+z), in scene angle terms

// The Daily Tribunal, merged into this venue: a herald's stone off to the side
// of the floor. Walking up opens today's marquee case. Shared with world.tsx so
// the walk-up proximity target lands exactly on the stone.
export const DAILY_HERALD_POS: [number, number, number] = [10, 0, 6.5];

export function Amphitheatre({
  champions,
  focus,
}: {
  champions: GroundChampion[];
  focus?: React.MutableRefObject<GalleryFocus | null>;
}) {
  const { fighters, live, verdict } = useLeague(champions);
  const progress = useChampions((s) => s.progress);

  const ladder = useMemo(() => {
    const get = useChampions.getState();
    return [...champions]
      .map((c) => ({ entry: c, champ: progress[c.key] || get.get(c.key) }))
      .sort((a, b) => skillLevel(b.champ) - skillLevel(a.champ) || ratingOf(b.champ) - ratingOf(a.champ))
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champions, progress]);

  const champ = ladder[0];

  // keep the camera-focus channel pointed at the ring while a bout is live
  useFrame(() => {
    if (focus) {
      if (!focus.current) focus.current = { active: live, center: new THREE.Vector3(0, 0, 0) };
      else focus.current.active = live;
    }
  });

  return (
    <group>
      <SeatingBowl />
      <Colonnade />
      <Braziers />
      <CombatDais />
      <BannerWall ladder={ladder} />
      {champ && <VictorThrone entry={champ.entry} champ={champ.champ} />}
      <DailyHerald />

      {/* the two fighters trading blows on the dais (idle between bouts) */}
      {fighters && (
        <>
          <ChampionMesh
            type={fighters.a.type}
            champion={fighters.a.champion}
            identityKey={fighters.a.key}
            label={fighters.a.name}
            position={PODIUM_A}
            rotation={Math.PI / 2}
            punchSignal={fighters.punchA}
            hitSignal={fighters.hitA}
            hpFrac={live ? fighters.hpA / 100 : undefined}
            selected={live && fighters.actor === fighters.a.key}
          />
          <ChampionMesh
            type={fighters.b.type}
            champion={fighters.b.champion}
            identityKey={fighters.b.key}
            label={fighters.b.name}
            position={PODIUM_B}
            rotation={-Math.PI / 2}
            punchSignal={fighters.punchB}
            hitSignal={fighters.hitB}
            hpFrac={live ? fighters.hpB / 100 : undefined}
            selected={live && fighters.actor === fighters.b.key}
          />
        </>
      )}

      {/* the verdict, called out over the ring between bouts */}
      {verdict && (
        <Html position={[0, 4.0, 0]} center distanceFactor={14} zIndexRange={[24, 0]} style={{ pointerEvents: "none" }}>
          <div
            className="pop"
            style={{
              fontFamily: "var(--font-grotesk), sans-serif",
              textAlign: "center",
              whiteSpace: "nowrap",
              background: "rgba(10,7,4,.8)",
              border: `1px solid ${verdict.wColor}`,
              borderRadius: 10,
              padding: "7px 13px",
              boxShadow: "0 6px 22px rgba(0,0,0,.55)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
              <span style={{ color: verdict.wColor }}>{verdict.winner}</span> takes it
              {verdict.delta ? <span style={{ color: "#ffd479", fontSize: 11, marginLeft: 6 }}>+{verdict.delta}</span> : null}
            </div>
            {verdict.line && <div style={{ fontSize: 10, fontStyle: "italic", color: "#e6dcc4", marginTop: 2, maxWidth: 230, whiteSpace: "normal" }}>&ldquo;{verdict.line}&rdquo;</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── the stone bowl of empty seating ──────────────────────────────────────────
function SeatingBowl() {
  const tiers = [
    { r: 16.5, h: 1.8, y: 0.9 },
    { r: 21.5, h: 2.9, y: 2.2 },
    { r: 26.5, h: 4.2, y: 3.8 },
  ];
  return (
    <group>
      {/* the sanded combat floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[FLOOR_R, 64]} />
        <meshStandardMaterial color="#5a4a32" emissive={GOLD} emissiveIntensity={0.05} roughness={0.95} metalness={0.05} />
      </mesh>
      {/* faint ring markings on the floor */}
      {[FLOOR_R - 0.5, FLOOR_R * 0.6].map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[r - 0.06, r, 64]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {tiers.map((t, i) => (
        <group key={i}>
          {/* the riser wall of the tier */}
          <mesh position={[0, t.y, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[t.r, t.r, t.h, 64, 1, true]} />
            <meshStandardMaterial color={STONE} emissive={GOLD} emissiveIntensity={0.04} roughness={0.95} metalness={0.06} side={THREE.DoubleSide} />
          </mesh>
          {/* the seat step on top, with a warm lit lip */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, t.y + t.h / 2, 0]} receiveShadow>
            <ringGeometry args={[t.r, t.r + 4.4, 64]} />
            <meshStandardMaterial color={STONE_HI} emissive={GOLD} emissiveIntensity={0.06} roughness={0.9} metalness={0.06} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, t.y + t.h / 2 + 0.02, 0]}>
            <ringGeometry args={[t.r, t.r + 0.18, 64]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── a colonnade ringing the floor (gap left at the entrance) ─────────────────
function Colonnade() {
  const cols = useMemo(() => {
    const N = 20;
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2;
      return { a, x: Math.cos(a) * 15.4, z: Math.sin(a) * 15.4 };
    }).filter((c) => Math.abs(Math.atan2(Math.sin(c.a - ENTRANCE), Math.cos(c.a - ENTRANCE))) > 0.5);
  }, []);
  return (
    <group>
      {cols.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh position={[0, 3.2, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.46, 6.4, 10]} />
            <meshStandardMaterial color={STONE_HI} emissive={GOLD} emissiveIntensity={0.05} roughness={0.9} metalness={0.08} />
          </mesh>
          {/* capital */}
          <mesh position={[0, 6.5, 0]} castShadow>
            <boxGeometry args={[1.1, 0.45, 1.1]} />
            <meshStandardMaterial color={STONE} emissive={GOLD} emissiveIntensity={0.06} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── braziers for warm torchlight ─────────────────────────────────────────────
function Braziers() {
  const spots = useMemo(() => {
    const N = 6;
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + Math.PI / N;
      return { x: Math.cos(a) * 12.6, z: Math.sin(a) * 12.6 };
    });
  }, []);
  const flameRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < flameRefs.current.length; i++) {
      const m = flameRefs.current[i];
      if (m) m.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.12);
    }
  });
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.2, 2.2, 8]} />
            <meshStandardMaterial color={STONE_HI} roughness={0.9} metalness={0.1} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <cylinderGeometry args={[0.42, 0.26, 0.4, 10]} />
            <meshStandardMaterial color={STONE} emissive={GOLD} emissiveIntensity={0.3} roughness={0.8} />
          </mesh>
          <mesh ref={(el) => { flameRefs.current[i] = el; }} position={[0, 2.7, 0]}>
            <coneGeometry args={[0.3, 0.7, 8]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.85} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight position={[0, 2.8, 0]} intensity={26} color={GOLD} distance={18} />
        </group>
      ))}
    </group>
  );
}

// ── the central combat dais the bout is fought on ────────────────────────────
function CombatDais() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[DAIS_R, DAIS_R + 0.3, 0.24, 56]} />
        <meshStandardMaterial color="#3a2e1c" emissive={GOLD} emissiveIntensity={0.12} roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.26, 0]}>
        <ringGeometry args={[DAIS_R - 0.16, DAIS_R, 56]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0, 6, 0]} intensity={52} color={GOLD} distance={22} />
    </group>
  );
}

// ── the wall of ranked banners (the ladder, read as the environment) ─────────
// Five banners arc behind the throne; rank sets both ORDER (centre = #1) and
// HEIGHT (the champion's banner flies highest), so the standings are a silhouette.
function BannerWall({ ladder }: { ladder: { entry: GroundChampion; champ: Champion }[] }) {
  // seat order around the back arc: #1 centre, then 2/3 flanking, 4/5 outermost
  const order = [4, 2, 0, 1, 3]; // index into ladder by visual slot (left→right)
  const R = 14.5;
  const spanHalf = 0.72; // radians on each side of due-north
  return (
    <group>
      {order.map((rankIdx, slot) => {
        const item = ladder[rankIdx];
        if (!item) return null;
        const { entry } = item;
        const col = TYPE_COLOR[entry.type];
        // due-north is -z → base angle -Math.PI/2; spread the slots across the arc
        const frac = (slot / (order.length - 1)) * 2 - 1; // -1..1
        const a = -Math.PI / 2 + frac * spanHalf;
        const x = Math.cos(a) * R;
        const z = Math.sin(a) * R;
        const h = 9.2 - rankIdx * 1.1; // #1 tallest
        const faceIn = Math.atan2(-x, -z);
        return (
          <group key={entry.key} position={[x, 0, z]} rotation={[0, faceIn, 0]}>
            {/* pole */}
            <mesh position={[0, h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, h, 8]} />
              <meshStandardMaterial color={STONE_HI} emissive={col} emissiveIntensity={0.2} metalness={0.4} roughness={0.5} />
            </mesh>
            {/* finial */}
            <mesh position={[0, h + 0.2, 0]}>
              <octahedronGeometry args={[rankIdx === 0 ? 0.26 : 0.16, 0]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={rankIdx === 0 ? 2.2 : 1.2} metalness={0.4} roughness={0.3} />
            </mesh>
            {/* the cloth */}
            <mesh position={[0, h - 1.7, 0.04]}>
              <planeGeometry args={[1.7, 2.8]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={rankIdx === 0 ? 0.7 : 0.4} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} transparent opacity={0.94} />
            </mesh>
            <Html position={[0, h - 1.7, 0.08]} center distanceFactor={13} zIndexRange={[19, 0]} style={{ pointerEvents: "none" }}>
              <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", color: "#fff", textShadow: "0 1px 6px #000", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 22 }}>{EMBLEM[entry.type]}</div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>{entry.name}</div>
                <div className="mono" style={{ fontSize: 7.5, color: rankIdx === 0 ? "#ffd479" : "#e6dcc4", opacity: 0.85 }}>#{rankIdx + 1}</div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ── the Daily Tribunal's herald stone (merged into the venue) ────────────────
function DailyHerald() {
  const glyph = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (glyph.current) glyph.current.rotation.y = s.clock.elapsedTime * 0.4;
  });
  const col = "#7c5cff";
  return (
    <group position={DAILY_HERALD_POS}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.4, 1.7, 36]} />
        <meshBasicMaterial color={col} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[1.1, 2.6, 0.34]} />
        <meshStandardMaterial color="#201b30" emissive={col} emissiveIntensity={0.3} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh ref={glyph} position={[0, 1.7, 0.22]}>
        <torusGeometry args={[0.36, 0.06, 10, 26]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6} metalness={0.5} roughness={0.25} />
      </mesh>
      <pointLight position={[0, 2.2, 0.4]} intensity={14} color={col} distance={10} />
      <Html position={[0, 3.0, 0]} center distanceFactor={13} zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 8, letterSpacing: 1.8, color: col, fontWeight: 700 }}>DAILY TRIBUNAL</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px #000" }}>Today&rsquo;s Marquee</div>
          <div style={{ fontSize: 7.5, letterSpacing: 1, color: "#cfcdee", opacity: 0.75 }}>call it · then watch</div>
        </div>
      </Html>
    </group>
  );
}

// ── the victor's throne — the #1 champion stands here, crowned + spotlit ─────
function VictorThrone({ entry, champ }: { entry: GroundChampion; champ: Champion }) {
  const lf = levelFor(champ.xp);
  const col = TYPE_COLOR[entry.type];
  return (
    <group position={THRONE}>
      {/* the plinth the champion stands on */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 2.4, 1.2, 32]} />
        <meshStandardMaterial color={STONE_HI} emissive={GOLD} emissiveIntensity={0.1} roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.22, 0]}>
        <ringGeometry args={[1.8, 2.0, 40]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* the reigning champion, facing the ring (+z) */}
      <group position={[0, 1.2, 0]}>
        <ChampionMesh type={entry.type} champion={champ} identityKey={entry.key} position={[0, 0, 0]} rotation={0} showLabel={false} />
      </group>
      {/* a warm key spot from above */}
      <pointLight position={[0, 6, 2]} intensity={36} color={GOLD} distance={16} />
      <Html position={[0, 4.4, 0]} center distanceFactor={14} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 8, letterSpacing: 2.2, color: GOLD, fontWeight: 800 }}>REIGNING CHAMPION</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px #000" }}>{entry.name}</div>
          <div className="mono" style={{ fontSize: 8, letterSpacing: 1, color: col }}>{tierFor(lf.level).name} · SL{skillLevel(champ)}</div>
        </div>
      </Html>
    </group>
  );
}
