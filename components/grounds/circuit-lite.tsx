"use client";
// ─────────────────────────────────────────────────────────────────────────────
// SLICE 2 — the one-thumb Circuit ("our flappy bird"), Strategy A.
//
// The MOBILE native body of the Circuit (see docs/essence.md › "One soul, native
// bodies"). It REUSES the existing 3D scene (CircuitScene + the void biome + the
// shared CIRCUIT_SECTORS track data) but swaps the six-DOF Handler controller for
// a single-input, auto-forward flyer under a trailing chase camera — so the whole game
// collapses to: HOLD to rise, release to fall, thread the gate, one fall resets.
//
// • Slice 0 — proved the FEEL (heavy gravity, punchy thrust).
// • Slice 1 — reads like a game: the OWNED champion rides the jetpack (ChampionMesh,
//   real flight pose via companionDrive; the mech is only the load fallback),
//   procedural audio, next-gate highlight, and a local personal best.
// • Slice 2 (here) — wires the REWARD SOUL from essence §3: depth is soul →
//   Trainer XP + an ascent sigil stamped on the champion (shared identity);
//   time/mastery is craft → Crowns (server-authoritative awardGauntlet) + the
//   shared /api/circuit leaderboard (depth-then-time). Rewards are gated on real
//   improvement so sector 1 can't be farmed.
//
// Follow-ups: a dedicated 2.5D mobile renderer (perf) and per-device board split.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RotateCcw, Flag, Skull, ChevronLeft, Hand, Trophy, Crown, Zap, Sparkles } from "lucide-react";
import { CircuitScene } from "./circuit-scene";
import { ChampionMesh } from "./champion-mesh";
import { CIRCUIT_SECTORS, CIRCUIT_SECTOR_COUNT, loadCircuitPersonalBest, saveCircuitPersonalBest, isCircuitRunBetter, sectorBounds } from "./circuit-tracks";
import type { CircuitPersonalBest } from "./circuit-tracks";
import { biomeById } from "./biomes";
import { formatCircuitMs } from "./circuit";
import type { CircuitTrackDef } from "./circuit";
import { useChampions } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";
import { getOwnerToken, getHandle } from "@/lib/owner";
import type { Champion, CreatureType } from "@/lib/types";
import { setJet, stopJet, jetFallSfx, rewardSfx, badLuckSfx } from "@/lib/sfx";

// a leaderboard row as returned by /api/circuit
interface BoardRow {
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  you?: boolean;
}
// what a finished run paid out — shown on the outcome card
interface RunReward {
  xp: number;
  crowns: number;
  deeper: boolean;
}

// ── flight feel — a HEAVY robot fighting a POWERFUL jetpack ───────────────────
// Acceleration-based (not velocity-eased), so there's real weight: gravity is
// always pulling hard (sticky, accelerating fall), thrust punches up through it,
// and a tap gives an instant kick. This is what kills the "floaty ghost" feel.
const FORWARD = 8.2;        // cruise forward speed (u/s) — gentle enough to read each gate
const FORWARD_SPOOL = 2.6;  // ease up to cruise from a standstill (a launch feel)
const GRAVITY = 24;         // downward accel (u/s²) — weight without a stone drop
const THRUST_ACCEL = 40;    // jetpack up accel while held → net +16 up (controllable climb)
const PRESS_KICK = 3.0;     // instant upward velocity pop on each new press (a flap)
const MAX_FALL = 15;        // terminal fall speed (sticky, but never uncontrollable)
const MAX_RISE = 10;        // climb clamp — a full hold rises, but you can still aim
const LATERAL_EASE = 7;     // auto-thread: ease x toward the next gate's centre
const FLOOR_Y = -9;         // fall below this → run over
// Soft ceiling: a full hold parks you just above the next ring's rim instead of
// rocketing off-screen into the empty void (which read as "nothing is moving"
// and guaranteed a blind "missed a gate" death ~2s in). From the ceiling, one
// short release dips you through the opening — hold to rise, blip to thread.
const CEIL_ABOVE_GATE = 0.35; // hover a hair above the ring's rim (a blip threads it)

// ── chase camera ── (3/4 trailing cam: the track ahead reads in DEPTH).
// The old pure-side rail cam was unplayable on portrait phones: a 55° vertical
// FOV at ~0.5 aspect leaves a ~29° horizontal FOV → only ~6 world units of
// track visible sideways, while gates sit 9–11 units apart. The next ring was
// literally never on screen ("playing blindly"). Trailing the flyer and looking
// down-track puts the upcoming gates in frame at any aspect ratio.
const CAM_SIDE = 3.2;     // slight +X offset so the body reads in 3/4, not dead-on
const CAM_UP = 2.6;       // lift above the flyer
const CAM_BACK = 7.0;     // trail behind the flyer (travel is +Z)
const CAM_LEAD = 9.0;     // look well down-track so the next ring is centred
const CAM_HEIGHT = 0.8;   // look-at lift — keeps the hero low-centre of frame
const CAM_LERP = 6;       // exp-damping rate for smooth follow (frame-rate indep.)

// ── champion body (the real owned mind, riding the jetpack) ──
const CHAMP_SCALE = 0.7;   // fit the champion to thread a ~3u gate comfortably
const CHAMP_FACE = 0;      // Y-rotation so it faces the travel direction (+Z)
const CHAMP_Y = -0.9;      // drop so the torso centres on the gate-thread point

const BIOME = biomeById("void");
const ACCENT = BIOME.lights.arenaPoint;

type Phase = "ready" | "running" | "failed" | "done";
type FailReason = "fall" | "gates";

// prototype fallback body while the champion GLTF resolves (also our old mech)
function MechBody() {
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.9, 0.66]} />
        <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.35} emissive={ACCENT} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0.2, 0.16, 0.34]}>
        <boxGeometry args={[0.42, 0.16, 0.04]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </>
  );
}

// Drift motes: a static field of glowing specks filling the sector's volume.
// The void biome is a featureless backdrop, so without near-field reference
// points the chase cam reads as "nothing is moving" even at full speed. These
// are world-static (no self-animation — safe under reduced motion, zero
// per-frame cost); the flyer streaking past them is what sells the speed.
function DriftMotes({ track }: { track: CircuitTrackDef }) {
  const geom = useMemo(() => {
    const { maxY, maxZ } = sectorBounds(track);
    const n = 260;
    const arr = new Float32Array(n * 3);
    let s = 48271; // tiny deterministic LCG — stable layout per sector
    const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rnd() - 0.5) * 38;
      arr[i * 3 + 1] = -7 + rnd() * (maxY + 16);
      arr[i * 3 + 2] = -8 + rnd() * (maxZ + 20);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [track]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <points geometry={geom}>
      <pointsMaterial color={ACCENT} size={0.13} sizeAttenuation transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ascent sigil: a slowly-rotating halo of glyphs above the flyer. Glyph count =
// your best depth (essence §3 "an ascent sigil baked onto the champion's body").
function AscentSigil({ depth }: { depth: number }) {
  const grp = useRef<THREE.Group>(null);
  const n = Math.min(6, Math.max(0, depth));
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
            <torusGeometry args={[0.09, 0.028, 8, 20]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {/* a faint crown ring binding the glyphs — reads as one sigil, not scattered pips */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 8, 48]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── the flyer: kinematic, one vertical input, drives the camera ───────────────
function Flyer({
  track,
  champType,
  champion,
  ascentDepth,
  holdRef,
  altRef,
  onGate,
  onSectorClear,
  onFail,
}: {
  track: CircuitTrackDef;
  champType: CreatureType;
  champion: Champion;
  ascentDepth: number;
  holdRef: React.RefObject<boolean>;
  altRef: React.RefObject<number>;
  onGate: (nextIdx: number) => void;
  onSectorClear: () => void;
  onFail: (r: FailReason) => void;
}) {
  const grp = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const pos = useRef(new THREE.Vector3(track.spawn[0], track.spawn[1], track.spawn[2]));
  const vy = useRef(0);
  const fwd = useRef(0);         // forward speed, spools up to FORWARD (launch feel)
  const wasHeld = useRef(false); // rising-edge detect for the tap-kick
  const cpNext = useRef(1); // skip the start pad (checkpoint 0); thread gates 1..finish
  const prevZ = useRef(track.spawn[2]);
  const dead = useRef(false);

  // drive ChampionMesh's own flight pose + jetpack (reads these each frame)
  const flyingRef = useRef(true);
  const movingRef = useRef(true);
  const speedRef = useRef(0);
  const runRef = useRef(false);
  const velRef = useRef(new THREE.Vector3());
  const headingRef = useRef(CHAMP_FACE);
  const companionDrive = useMemo(
    () => ({ flyingRef, movingRef, speedRef, runRef, velRef, headingRef }),
    [],
  );

  const camWant = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3(track.spawn[0], track.spawn[1], track.spawn[2] + CAM_LEAD));

  useFrame((_, dtRaw) => {
    if (dead.current) return;
    const dt = Math.min(0.05, dtRaw);
    const held = !!holdRef.current;

    // auto-forward, spooling up to cruise so leaving the pad has a launch feel
    fwd.current += (FORWARD - fwd.current) * (1 - Math.exp(-FORWARD_SPOOL * dt));
    pos.current.z += fwd.current * dt;

    const cp = track.checkpoints[cpNext.current];

    // vertical: ACCELERATION model — heavy gravity always pulling, powerful
    // thrust punching up through it, plus an instant kick on each fresh press.
    if (held && !wasHeld.current) {
      // a tap "flaps": cancel any fall and pop upward for instant response
      vy.current = Math.max(vy.current, 0) + PRESS_KICK;
    }
    wasHeld.current = held;
    const accel = held ? THRUST_ACCEL - GRAVITY : -GRAVITY;
    vy.current = THREE.MathUtils.clamp(vy.current + accel * dt, -MAX_FALL, MAX_RISE);
    pos.current.y += vy.current * dt;

    // soft ceiling above the next gate — keeps the action (and the ring) in frame
    const ceilY = cp ? cp.pos[1] + cp.radius + CEIL_ABOVE_GATE : Infinity;
    if (pos.current.y > ceilY) {
      pos.current.y = ceilY;
      if (vy.current > 0) vy.current = 0;
    }

    // lateral auto-thread toward the next gate centre (keeps it a ONE-input game)
    const targetX = cp ? cp.pos[0] : 0;
    pos.current.x += (targetX - pos.current.x) * (1 - Math.exp(-LATERAL_EASE * dt));

    // feed the champion's flight rig: it poses (fly clip + banking) + emits its own
    // jetpack from these. Velocity is (lateral≈0, vertical, forward) in world units.
    speedRef.current = fwd.current;
    velRef.current.set(0, vy.current, fwd.current);

    // apply to the group — face forward (+Z) + a subtle weighty pitch on the vertical
    if (grp.current) {
      grp.current.position.copy(pos.current);
      grp.current.rotation.y = CHAMP_FACE;
      const pitch = THREE.MathUtils.clamp(-vy.current * 0.035, -0.35, 0.42);
      grp.current.rotation.x = THREE.MathUtils.lerp(grp.current.rotation.x, pitch, 1 - Math.exp(-12 * dt));
    }

    // trailing chase camera, exp-damped
    camWant.current.set(pos.current.x + CAM_SIDE, pos.current.y + CAM_UP, pos.current.z - CAM_BACK);
    const kc = 1 - Math.exp(-CAM_LERP * dt);
    camera.position.lerp(camWant.current, kc);
    lookAt.current.lerp(
      { x: pos.current.x, y: pos.current.y + CAM_HEIGHT, z: pos.current.z + CAM_LEAD } as THREE.Vector3,
      kc,
    );
    camera.lookAt(lookAt.current);

    altRef.current = pos.current.y;

    // fall = run over (the soul atom)
    if (pos.current.y < FLOOR_Y) {
      dead.current = true;
      onFail("fall");
      return;
    }

    // gate threading — cross the next gate's z-plane inside its opening, or miss
    if (cp) {
      const gz = cp.pos[2];
      if (prevZ.current < gz && pos.current.z >= gz) {
        const dx = Math.abs(pos.current.x - cp.pos[0]);
        const dy = Math.abs(pos.current.y - cp.pos[1]);
        const r = cp.radius * 0.95;
        if (dx <= r && dy <= r) {
          cpNext.current += 1;
          if (cp.finish) {
            dead.current = true;
            onSectorClear();
          } else {
            onGate(cpNext.current);
          }
        } else {
          dead.current = true;
          onFail("gates");
          return;
        }
      }
    }
    prevZ.current = pos.current.z;
  });

  return (
    <group ref={grp} position={track.spawn}>
      {/* the OWNED champion, in a real flight pose + its own jetpack (companionDrive).
          The mech is only the fallback while the GLTF resolves. */}
      <group position={[0, CHAMP_Y, 0]} scale={CHAMP_SCALE}>
        <Suspense fallback={<group scale={1 / CHAMP_SCALE} position={[0, -CHAMP_Y, 0]}><MechBody /></group>}>
          <ChampionMesh
            type={champType}
            champion={champion}
            position={[0, 0, 0]}
            rotation={0}
            showLabel={false}
            hideFloaters
            breatheIntensity={0.5}
            restPose="standing"
            companionDrive={companionDrive}
            sceneScale={1}
          />
        </Suspense>
      </group>
      {/* ascent sigil — the run marks the champion (essence §3): a halo whose glyphs
          grow with your best depth, orbiting above the flyer */}
      <AscentSigil depth={ascentDepth} />
    </group>
  );
}

// ── ready pose: the OWNED champion waits on the start pad, idling, so the tab
// reads as "your champion, about to fly" instead of an empty platform. Swaps to
// the live Flyer the instant you press. ──────────────────────────────────────
function ReadyPose({
  track,
  champType,
  champion,
  ascentDepth,
}: {
  track: CircuitTrackDef;
  champType: CreatureType;
  champion: Champion;
  ascentDepth: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (grp.current) grp.current.position.y = track.spawn[1] + CHAMP_Y + Math.sin(t * 1.6) * 0.07;
    // frame the hero centre-stage while it waits (look right at it, not down-track)
    camera.lookAt(track.spawn[0], track.spawn[1] + 0.5, track.spawn[2] + 0.4);
  });
  return (
    <group ref={grp} position={[track.spawn[0], track.spawn[1] + CHAMP_Y, track.spawn[2]]}>
      <group scale={CHAMP_SCALE}>
        <Suspense fallback={<group scale={1 / CHAMP_SCALE}><MechBody /></group>}>
          <ChampionMesh
            type={champType}
            champion={champion}
            position={[0, 0, 0]}
            rotation={CHAMP_FACE}
            showLabel={false}
            hideFloaters
            breatheIntensity={0.9}
            restPose="standing"
            sceneScale={1}
          />
        </Suspense>
      </group>
      <AscentSigil depth={ascentDepth} />
    </group>
  );
}

// TEMP diagnostic: ticks a ref on every rendered frame so the HUD can prove
// whether the R3F render loop is actually running on the device.
function LoopProbe({ counter }: { counter: React.RefObject<number> }) {
  useFrame(() => {
    if (counter.current != null) counter.current += 1;
  });
  return null;
}

function Lights({ lite = false }: { lite?: boolean }) {
  return (
    <>
      <hemisphereLight args={[BIOME.lights.hemiSky, BIOME.lights.hemiGround, BIOME.lights.hemiInt]} />
      <ambientLight color={BIOME.lights.ambient} intensity={BIOME.lights.ambientInt} />
      <directionalLight position={[18, 30, 14]} intensity={BIOME.lights.sunInt} color={BIOME.lights.sun} castShadow={!lite} />
    </>
  );
}

// `embedded` = rendered inside the mobile shell as the Climb tab (docs/mobile.md):
// fill the parent tab area instead of the viewport, and drop the standalone
// island chrome (the "back to Grounds" link + prototype label) since the shell
// already provides navigation and context.
export default function CircuitLite({ embedded = false }: { embedded?: boolean } = {}) {
  const [mounted, setMounted] = useState(false);
  const [runId, setRunId] = useState(0);
  const [sector, setSector] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [failReason, setFailReason] = useState<FailReason>("fall");
  const [gates, setGates] = useState(0);
  const [targetIdx, setTargetIdx] = useState(1); // next gate to thread (for highlight)
  const [alt, setAlt] = useState(0);
  const [holding, setHolding] = useState(false);
  const [best, setBest] = useState<CircuitPersonalBest | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [reward, setReward] = useState<RunReward | null>(null);
  // WebGL context loss handling — a phone GPU evicts our context under memory
  // pressure. The happy path is: preventDefault() on `webglcontextlost` asks the
  // browser to hand the SAME context back; when `webglcontextrestored` fires the
  // running R3F loop picks it straight up (no rebuild, no reset). But on real
  // phones that restore event often NEVER comes — the context stays dead and the
  // game freezes forever behind the "restoring…" veil (the reported bug).
  //
  // So we add a watchdog: if the browser hasn't restored within a grace window,
  // we rebuild the Canvas ONCE (fresh context) and reset to the ready pad. We cap
  // rebuilds inside a rolling window so a chronically-starved device can't churn
  // in a loop — past the cap we stop auto-recovering and hand the player a manual
  // "reload graphics" button instead of a silent freeze.
  const [glLost, setGlLost] = useState(false); // context out, auto-recovery pending
  const [glDead, setGlDead] = useState(false); // auto-recovery exhausted → manual retry
  const glWatchdog = useRef<number | null>(null);
  const glRebuilds = useRef<number[]>([]); // timestamps of recent forced rebuilds
  // Mirror of runId, read inside the per-canvas context-loss listener. React
  // unmounting the old Canvas makes R3F call gl.forceContextLoss(), which fires
  // that canvas's `webglcontextlost` — a SELF-inflicted loss, not a GPU eviction.
  // Without a guard it schedules another rebuild → unmount → loss → … an endless
  // strobe that keeps snapping the run back to the ready pad (the champion
  // "renders but never moves"). Each listener records the runId its canvas was
  // born at; if that no longer matches the mounted runId the loss is a teardown
  // of a stale canvas and is ignored. (Regression history: 07c849a → ca950ce.)
  const runIdRef = useRef(0);

  const holdRef = useRef(false);
  const altRef = useRef(0);
  const runStart = useRef(0); // performance.now() when the run went live
  const phaseRef = useRef<Phase>("ready"); // mirror for the off-loop diagnostic

  // ── TEMP on-device diagnostic (remove once the mobile freeze is understood) ──
  // A useFrame probe increments frameProbe every rendered frame; we read it here
  // off-loop so a stuck counter proves the R3F render loop is dead (vs. moving).
  const frameProbe = useRef(0);
  const [diag, setDiag] = useState("f:0 fps:-- dpr:-- gl:--");
  const [diagErr, setDiagErr] = useState("");
  useEffect(() => {
    let prevF = 0;
    let prevT = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const f = frameProbe.current;
      const fps = Math.round(((f - prevF) * 1000) / Math.max(1, now - prevT));
      prevF = f;
      prevT = now;
      const cv = typeof document !== "undefined" ? document.querySelector("canvas") : null;
      const ctx = cv ? (cv.getContext("webgl2") || cv.getContext("webgl")) : null;
      const dpr = typeof window !== "undefined" ? Math.round((window.devicePixelRatio || 0) * 100) / 100 : 0;
      setDiag(
        `f:${f} fps:${fps} dpr:${dpr} gl:${ctx ? (ctx.isContextLost() ? "LOST" : "ok") : "none"} n:${document.querySelectorAll("canvas").length}` +
          ` | ph:${phaseRef.current} hold:${holdRef.current ? 1 : 0} alt:${Math.round(altRef.current)}`,
      );
    }, 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const onErr = (e: ErrorEvent) => setDiagErr((e.message || String(e.error) || "err").slice(0, 90));
    const onRej = (e: PromiseRejectionEvent) => setDiagErr(("promise: " + String(e.reason)).slice(0, 90));
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  // which champion is flying: the adopted mind, else a sensible roster default
  const owned = useChampions((s) => s.owned);
  const getChampion = useChampions((s) => s.get);
  const awardTrainerXp = useChampions((s) => s.awardTrainerXp);
  const awardGauntlet = useChampions((s) => s.awardGauntlet);
  const activeKey = owned ?? "AXIOM";
  const champType = (ROSTER[activeKey]?.type ?? "LOGIC") as CreatureType;
  const champion = useMemo(() => getChampion(activeKey), [getChampion, activeKey]);
  // depth is soul: your best sectors mark the champion with an ascent sigil
  const ascentDepth = best?.sectors ?? 0;

  // pull the shared leaderboard (depth-then-time). `you` flags your own row.
  const loadBoard = useCallback(() => {
    const tok = getOwnerToken();
    setBoardLoading(true);
    fetch(`/api/circuit?limit=8${tok ? `&token=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => r.json())
      .then((d: { entries?: BoardRow[]; mine?: CircuitPersonalBest | null }) => {
        const handle = getHandle();
        setBoard((d.entries ?? []).map((e) => ({ ...e, you: !!handle && e.handle === handle })));
        if (d.mine) setBest((prev) => (isCircuitRunBetter(d.mine!, prev) ? d.mine! : prev));
      })
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, []);

  useEffect(() => {
    setMounted(true);
    setBest(loadCircuitPersonalBest());
    loadBoard();
  }, [loadBoard]);

  // stop the jetpack roar if we leave the page mid-run
  useEffect(() => () => stopJet(), []);

  // A finished run is scored against your personal best AND pays out per essence §3:
  //   depth (how high you climbed) is SOUL → Trainer XP + the ascent sigil (shared);
  //   time/mastery is CRAFT → Crowns (server-authoritative) + the leaderboard.
  // Reward is gated on genuine improvement so sector 1 can't be farmed.
  const recordRun = useCallback(
    (sectorsCleared: number, clearedAll: boolean) => {
      const run: CircuitPersonalBest = {
        sectors: sectorsCleared,
        totalMs: Math.max(0, performance.now() - runStart.current),
        clearedAll,
      };
      const prev = loadCircuitPersonalBest();
      const better = isCircuitRunBetter(run, prev);
      const deeper = run.sectors > (prev?.sectors ?? -1);

      let xp = 0;
      let crowns = 0;
      if (deeper) {
        xp = run.sectors * 20 + (clearedAll ? 100 : 0); // depth → Trainer XP (soul)
        if (xp > 0) awardTrainerXp(xp);
      }
      if (better) {
        crowns = Math.round(run.sectors * 3 + (clearedAll ? 15 : 0)); // time/mastery → Crowns (craft)
        if (crowns > 0) void awardGauntlet(crowns); // server clamps; offline-optimistic
      }
      setReward(xp > 0 || crowns > 0 ? { xp, crowns, deeper } : null);

      if (better) {
        saveCircuitPersonalBest(run);
        setBest(run);
        setNewBest(true);
      } else {
        setNewBest(false);
      }

      // submit to the shared board (depth-then-time); refresh after
      const tok = getOwnerToken();
      if (tok) {
        fetch("/api/circuit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tok, handle: getHandle(), sectors: run.sectors, totalMs: run.totalMs, clearedAll }),
        })
          .then(() => loadBoard())
          .catch(() => {});
      }
    },
    [awardTrainerXp, awardGauntlet, loadBoard],
  );

  // read the altitude ref at ~12fps so the number ticks without re-rendering
  // the whole overlay every frame
  useEffect(() => {
    const id = setInterval(() => setAlt(altRef.current), 80);
    return () => clearInterval(id);
  }, []);

  const track = CIRCUIT_SECTORS[sector]!;

  const setHold = useCallback((on: boolean) => {
    holdRef.current = on;
    setHolding(on);
    setJet(on ? 0.9 : 0); // jetpack roar tracks the thrust (spooled smooth in sfx)
  }, []);

  // the flyer sits idle until the first press — no dying before you react
  const press = useCallback(() => {
    setPhase((p) => {
      if (p === "ready") {
        runStart.current = performance.now();
        return "running";
      }
      return p;
    });
    setHold(true);
  }, [setHold]);

  // keyboard hold (Space) for desktop testing of the one-thumb feel
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "ready" || phase === "running") press();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setHold(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, press, setHold]);

  // Ordinary restart ("Try again"/"Run again"): reset the run state and REUSE
  // the live WebGL context. We deliberately do NOT bump runId here — remounting
  // the Canvas spins up a brand-new context (and tears the old one down, firing
  // a teardown context-loss), which is exactly what pushed a memory-tight phone
  // into the "GRAPHICS KEEP DROPPING" loop. The Flyer already remounts fresh
  // (it unmounts at `ready` and its key includes the sector), so the run is
  // clean without touching the context.
  const resetRun = useCallback(() => {
    setHold(false);
    setGates(0);
    setSector(0);
    setTargetIdx(1);
    setNewBest(false);
    setReward(null);
    setPhase("ready");
  }, [setHold]);

  // ── WebGL context-loss watchdog ──────────────────────────────────────────
  // How long to wait for the browser to restore the SAME context before we give
  // up and rebuild; how many rebuilds we allow inside a rolling window before we
  // stop auto-churning and ask the player to retry by hand.
  const GL_RESTORE_GRACE_MS = 2500;
  const GL_REBUILD_WINDOW_MS = 20000;
  const GL_MAX_REBUILDS = 3;

  const clearGlWatchdog = useCallback(() => {
    if (glWatchdog.current != null) {
      window.clearTimeout(glWatchdog.current);
      glWatchdog.current = null;
    }
  }, []);

  // the browser gave the context back on its own — the loop already resumed on it
  const onGlRestored = useCallback(() => {
    clearGlWatchdog();
    glRebuilds.current = []; // a clean restore means the device is healthy again
    setGlLost(false);
    setGlDead(false);
  }, [clearGlWatchdog]);

  // Hard rebuild: mount a fresh Canvas on a new WebGL context. This is ONLY for
  // recovering a context the browser never restored — never an ordinary restart.
  // Bumping runId unmounts the old Canvas; the teardown loss R3F fires on it is
  // ignored by the per-canvas listener because its bornAt no longer matches.
  const rebuildCanvas = useCallback(() => {
    resetRun();
    setRunId((n) => n + 1); // new Canvas key → fresh WebGL context + clean pad
  }, [resetRun]);

  const onGlLost = useCallback(() => {
    setGlLost(true);
    clearGlWatchdog();
    glWatchdog.current = window.setTimeout(() => {
      // still lost after the grace window → the browser isn't coming back for us
      const now = performance.now();
      glRebuilds.current = glRebuilds.current.filter((t) => now - t < GL_REBUILD_WINDOW_MS);
      if (glRebuilds.current.length < GL_MAX_REBUILDS) {
        glRebuilds.current.push(now);
        setGlLost(false);
        rebuildCanvas(); // fresh context, back at the ready pad
      } else {
        // chronic loss — stop churning and let the player decide when to retry
        setGlLost(false);
        setGlDead(true);
      }
    }, GL_RESTORE_GRACE_MS);
  }, [clearGlWatchdog, rebuildCanvas]);

  // manual recovery from the "graphics keep dropping" card
  const recoverGraphics = useCallback(() => {
    glRebuilds.current = [];
    setGlDead(false);
    setGlLost(false);
    rebuildCanvas();
  }, [rebuildCanvas]);

  useEffect(() => () => clearGlWatchdog(), [clearGlWatchdog]);

  const onGate = useCallback((nextIdx: number) => {
    setGates((g) => g + 1);
    setTargetIdx(nextIdx);
    rewardSfx("small"); // satisfying ping on every clean gate
  }, []);

  const onSectorClear = useCallback(() => {
    setHold(false);
    setTargetIdx(1); // next sector starts aiming at its first gate again
    setSector((s) => {
      const next = s + 1;
      if (next >= CIRCUIT_SECTOR_COUNT) {
        stopJet();
        rewardSfx("epic"); // full clear — the big flourish
        recordRun(CIRCUIT_SECTOR_COUNT, true);
        setPhase("done");
        return s;
      }
      rewardSfx("big"); // sector cleared — a rung on the climb
      return next;
    });
  }, [setHold, recordRun]);

  const onFail = useCallback(
    (r: FailReason) => {
      setHold(false);
      stopJet();
      if (r === "fall") jetFallSfx();
      else badLuckSfx();
      recordRun(sector, false);
      setFailReason(r);
      setPhase("failed");
    },
    [setHold, sector, recordRun],
  );

  const gateCount = track.checkpoints.length - 1; // gates 1..finish
  const running = phase === "running";
  const live = phase === "ready" || phase === "running";
  phaseRef.current = phase; // keep the off-loop diagnostic in sync
  runIdRef.current = runId; // let per-canvas GL listeners spot a stale canvas
  // cumulative-ish altitude so the score always reads as a climb across sectors
  const shownAlt = Math.max(0, Math.round(sector * 28 + alt));

  return (
    <div
      style={{ position: embedded ? "absolute" : "fixed", inset: 0, zIndex: embedded ? undefined : 1000, background: BIOME.bg, overflow: "hidden", touchAction: "none", userSelect: "none" }}
      onPointerDown={() => live && press()}
      onPointerUp={() => setHold(false)}
      onPointerLeave={() => setHold(false)}
      onPointerCancel={() => setHold(false)}
    >
      {mounted && (
        <Canvas
          key={runId}
          frameloop="always"
          shadows={!embedded}
          dpr={embedded ? 1 : [1, 1.5]}
          camera={{ position: [CAM_SIDE, track.spawn[1] + CAM_UP, track.spawn[2] - CAM_BACK], fov: 55, near: 0.1, far: embedded ? 320 : 600 }}
          gl={{ antialias: !embedded, powerPreference: embedded ? "default" : "high-performance" }}
          style={{ pointerEvents: "none" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = BIOME.exposure;
            // the fresh context is live — lift any "restoring" veil left over
            // from the loss that triggered this rebuild
            const bornAt = runId; // this canvas's identity; stale ones are ignored
            setGlLost(false);
            clearGlWatchdog();
            const canvas = gl.domElement;
            // preventDefault() first (asks the browser to restore the SAME
            // context, the cheapest path); the watchdog handles the case where
            // that restore never arrives so we can't freeze forever.
            canvas.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              // ignore a teardown loss on a canvas we've already replaced —
              // otherwise our own rebuild re-triggers recovery in an endless loop
              if (runIdRef.current !== bornAt) return;
              const msg = (e as WebGLContextEvent).statusMessage || "";
              setDiagErr(`ctxlost ${msg}`.slice(0, 90));
              onGlLost();
            });
            canvas.addEventListener("webglcontextrestored", () => {
              if (runIdRef.current !== bornAt) return;
              onGlRestored();
            });
          }}
        >
          <LoopProbe counter={frameProbe} />
          <color attach="background" args={[BIOME.bg]} />
          <fog attach="fog" args={[BIOME.fog.color, 30, 190]} />
          <Lights lite={embedded} />
          {/* fully kinematic + manual gate checks → no Rapier. Dropping the
              physics world/WASM is real memory back on phones, where it was
              helping tip the WebGL context into eviction. */}
          <CircuitScene track={track} biome={BIOME} highlightIndex={running ? targetIdx : undefined} staticMode />
          <DriftMotes track={track} />
          {phase === "ready" && (
            <ReadyPose track={track} champType={champType} champion={champion} ascentDepth={ascentDepth} />
          )}
          {running && (
            <Flyer
              key={`${runId}-${sector}`}
              track={track}
              champType={champType}
              champion={champion}
              ascentDepth={ascentDepth}
              holdRef={holdRef}
              altRef={altRef}
              onGate={onGate}
              onSectorClear={onSectorClear}
              onFail={onFail}
            />
          )}
        </Canvas>
      )}

      {/* ── TEMP on-device diagnostic (remove after the mobile freeze is solved):
           if `f:` stops climbing, the R3F render loop is dead on this device. ── */}
      <div
        className="mono"
        style={{ position: "absolute", top: 3, left: 3, zIndex: 70, fontSize: 9, lineHeight: 1.3, color: "#00ff6a", background: "rgba(0,0,0,.72)", padding: "3px 6px", borderRadius: 4, pointerEvents: "none", maxWidth: "70vw", wordBreak: "break-word" }}
      >
        {diag}
        {diagErr ? <div style={{ color: "#ff6a6a" }}>ERR {diagErr}</div> : null}
      </div>

      {/* ── renderer recovery: the GPU briefly dropped our WebGL context (common
           on phones under load). preventDefault() means the browser hands it back
           and the loop resumes on the SAME canvas — this overlay just covers the
           blink; the run keeps its state underneath. ── */}
      {glLost && !glDead && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.72)", zIndex: 40, pointerEvents: "none" }}>
          <div className="mono" style={{ textAlign: "center", color: ACCENT }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>RESTORING GRAPHICS…</div>
            <div style={{ fontSize: 10, color: "var(--muted, #9a96b8)", marginTop: 6, letterSpacing: 0.5 }}>
              the renderer hiccuped — one moment
            </div>
          </div>
        </div>
      )}

      {/* ── auto-recovery exhausted: the GPU keeps dropping our context (a
           memory-starved device). Stop churning and let the player retry when
           ready, so it never sits frozen behind the veil. ── */}
      {glDead && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.86)", zIndex: 45, padding: 24 }}>
          <div className="mono" style={{ textAlign: "center", color: "#fff", maxWidth: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: ACCENT }}>GRAPHICS KEEP DROPPING</div>
            <div style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginTop: 8, marginBottom: 18, letterSpacing: 0.5, lineHeight: 1.5 }}>
              your device ran low on graphics memory. close other tabs, then reload the climb.
            </div>
            <button
              type="button"
              onClick={recoverGraphics}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: ACCENT, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
            >
              <RotateCcw size={16} strokeWidth={2.4} /> Reload graphics
            </button>
          </div>
        </div>
      )}

      {/* ── top HUD: altitude score + sector progress ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "18px 16px 0", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: ACCENT }}>
          SECTOR {Math.min(sector + 1, CIRCUIT_SECTOR_COUNT)} / {CIRCUIT_SECTOR_COUNT}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 46, fontWeight: 800, color: "#fff", letterSpacing: -1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${ACCENT}` }}>
            {shownAlt}
          </span>
          <span className="mono" style={{ fontSize: 14, color: "var(--muted, #9a96b8)" }}>m</span>
        </div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2, #6b6785)" }}>ALTITUDE</div>
        {/* gate pips for the current sector */}
        <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
          {Array.from({ length: gateCount }, (_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                background: i < gates % (gateCount + 1) ? ACCENT : "transparent",
                border: `1.5px solid ${ACCENT}`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        {best && (
          <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 10, letterSpacing: 1, color: "var(--muted, #9a96b8)" }}>
            <Trophy size={11} strokeWidth={2.2} style={{ color: ACCENT }} />
            BEST {best.sectors}/{CIRCUIT_SECTOR_COUNT}
            {best.totalMs > 0 && <span style={{ color: "var(--muted2, #6b6785)" }}> · {formatCircuitMs(best.totalMs)}</span>}
          </div>
        )}
      </div>

      {/* ── standalone island chrome (hidden when embedded in the mobile shell) ── */}
      {!embedded && (
        <>
          <Link
            href="/grounds"
            style={{ position: "absolute", top: 16, left: 16, zIndex: 20, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted, #9a96b8)", textDecoration: "none", background: "rgba(10,10,18,.5)", padding: "6px 10px", borderRadius: 10, pointerEvents: "auto" }}
          >
            <ChevronLeft size={14} /> Grounds
          </Link>
          <div className="mono" style={{ position: "absolute", top: 18, right: 16, zIndex: 20, fontSize: 9, letterSpacing: 1, color: "var(--muted2, #6b6785)", textAlign: "right", lineHeight: 1.5, pointerEvents: "none" }}>
            SLICE 2 · ONE-THUMB PROTOTYPE
            <br />
            hold anywhere to rise
          </div>
        </>
      )}

      {/* ── ready gate: wait for the first press so you never die before reacting ── */}
      {phase === "ready" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", zIndex: 15, paddingBottom: embedded ? 72 : 0 }}>
          <div className="mono" style={{ textAlign: "center", color: "#fff", textShadow: `0 0 20px ${ACCENT}` }}>
            <div style={{ fontSize: embedded ? 17 : 20, fontWeight: 800, letterSpacing: 1 }}>TAP &amp; HOLD TO FLY</div>
            <div style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginTop: 6, letterSpacing: 1 }}>
              rise to thread each ring · release to drop · one fall = restart
            </div>
            {embedded && (
              <div style={{ fontSize: 10, color: "var(--muted2, #6b6785)", marginTop: 10, letterSpacing: 0.5 }}>
                Climb tab · switch to Today for daily bouts
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── the HOLD affordance (the whole screen is also a hold surface) ── */}
      {live && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: embedded ? 88 : 34, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 26px",
              borderRadius: 999,
              border: `2px solid ${ACCENT}`,
              background: holding ? ACCENT : "rgba(10,10,18,.45)",
              color: holding ? "#0a0a12" : ACCENT,
              fontWeight: 800,
              letterSpacing: 1,
              boxShadow: holding ? `0 0 40px -6px ${ACCENT}` : "none",
              transition: "background .08s, color .08s, box-shadow .12s",
            }}
          >
            <Hand size={18} strokeWidth={2.4} /> HOLD
          </div>
        </div>
      )}

      {/* ── outcome overlays ── */}
      {(phase === "failed" || phase === "done") && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.62)", backdropFilter: "blur(5px)", zIndex: 30 }}>
          <div style={{ textAlign: "center", padding: 26, borderRadius: 18, border: `1px solid ${phase === "done" ? ACCENT : "#ff5a5a"}`, background: "rgba(12,11,18,.9)", maxWidth: "88vw", width: 360 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: phase === "done" ? ACCENT : "#ff5a5a" }}>
              {phase === "done" ? <Flag size={30} strokeWidth={2.2} /> : <Skull size={30} strokeWidth={2.2} />}
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: phase === "done" ? ACCENT : "#ff5a5a" }}>
              {phase === "done" ? "FULL CLEAR" : "RUN OVER"}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "8px 0 4px" }}>
              {phase === "done" ? `All ${CIRCUIT_SECTOR_COUNT} sectors` : `${sector} sector${sector === 1 ? "" : "s"} cleared`}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginBottom: 14 }}>
              {phase === "done"
                ? "you flew the whole climb"
                : failReason === "gates"
                  ? "missed a gate — every ring must be threaded · back to sector 1"
                  : "one fall ends the run · back to sector 1"}
            </div>
            {newBest ? (
              <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "5px 12px", borderRadius: 999, background: ACCENT, color: "#0a0a12", fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>
                <Trophy size={13} strokeWidth={2.6} /> NEW BEST
              </div>
            ) : (
              best && (
                <div className="mono" style={{ marginBottom: 16, fontSize: 11, color: "var(--muted2, #6b6785)", letterSpacing: 1 }}>
                  best {best.sectors}/{CIRCUIT_SECTOR_COUNT}
                  {best.totalMs > 0 && ` · ${formatCircuitMs(best.totalMs)}`}
                </div>
              )
            )}
            {/* reward payout — depth→XP (soul), time/mastery→Crowns (craft) */}
            {reward && (reward.xp > 0 || reward.crowns > 0) && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
                {reward.xp > 0 && (
                  <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: `1px solid ${ACCENT}55`, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    <Zap size={13} strokeWidth={2.4} style={{ color: ACCENT }} /> +{reward.xp} XP
                  </span>
                )}
                {reward.crowns > 0 && (
                  <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid #f5d02055", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    <Crown size={13} strokeWidth={2.4} fill="#f5d020" style={{ color: "#f5d020" }} /> +{reward.crowns}
                  </span>
                )}
              </div>
            )}

            {/* ascent sigil — the run is stamped onto the champion's identity */}
            {ascentDepth > 0 && (
              <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 10, letterSpacing: 1.5, color: reward?.deeper ? ACCENT : "var(--muted, #9a96b8)" }}>
                <Sparkles size={12} strokeWidth={2.2} style={{ color: ACCENT }} />
                ASCENT SIGIL · DEPTH {ascentDepth}
              </div>
            )}

            {/* compact shared leaderboard (depth-then-time) */}
            <div style={{ marginBottom: 18, textAlign: "left", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "10px 12px", background: "rgba(255,255,255,.02)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2, #6b6785)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>ASCENT LEADERBOARD</span>
                <span>{boardLoading ? "…" : `${board.length}`}</span>
              </div>
              {board.length === 0 ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2, #6b6785)" }}>
                  {getOwnerToken() ? "no runs yet — set the pace" : "claim a Trainer handle in Standings to rank"}
                </div>
              ) : (
                board.slice(0, 5).map((r, i) => (
                  <div
                    key={`${r.handle}-${i}`}
                    className="mono"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "2px 0", color: r.you ? ACCENT : "#d9d5ea", fontWeight: r.you ? 800 : 500 }}
                  >
                    <span style={{ width: 16, color: "var(--muted2, #6b6785)" }}>{i + 1}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.handle || "anon"}{r.you ? " · you" : ""}</span>
                    <span>{r.sectors}/{CIRCUIT_SECTOR_COUNT}</span>
                    <span style={{ width: 52, textAlign: "right", color: "var(--muted, #9a96b8)" }}>{r.totalMs > 0 ? formatCircuitMs(r.totalMs) : "—"}</span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={resetRun}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: ACCENT, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
            >
              <RotateCcw size={16} strokeWidth={2.4} /> {phase === "done" ? "Run again" : "Try again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
