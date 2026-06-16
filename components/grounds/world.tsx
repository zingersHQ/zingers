"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useGLTF, Environment, Lightformer, Html } from "@react-three/drei";
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import type { AgentStatus, Champion, CreatureType, TowerAgent } from "@/lib/types";
import { blank } from "@/lib/evolve/progression";
import { ChampionMesh, buildCharacter, applyBoneMorph } from "./champion-mesh";
import { Terrain, Scatter, terrainHeight, shapeOf, PLAZA_R, type TerrainShape } from "./terrain";
import { PlazaSurround, PitArena } from "./structures";
import type { BiomeConfig } from "./biomes";
import { RenderBoundary } from "./render-guard";
import { jumpBeep } from "@/lib/sfx";

export interface GroundChampion {
  key: string;
  type: CreatureType;
  name: string;
  champion: Champion;
}

export interface MatchView {
  aKey: string;
  bKey: string;
  hpA: number;
  hpB: number;
  actor: string | null;
  punchA: number;
  punchB: number;
  hitA: number;
  hitB: number;
}

export type NearTarget =
  | { kind: "train"; key: string }
  | { kind: "arena" }
  | { kind: "challenge"; key: string; name: string }
  | { kind: "guardian" }
  | null;

const ARENA: [number, number, number] = [0, 0, 0];
const TRAIN_PAD: [number, number, number] = [-15, 0, 4];
const GUARDIAN_PAD: [number, number, number] = [15, 0, -6];
const PODIUM_A: [number, number, number] = [ARENA[0] - 1.9, 0, 0];
const PODIUM_B: [number, number, number] = [ARENA[0] + 1.9, 0, 0];
const SPAWN: [number, number, number] = [0, 0, 13];

const keys: Record<string, boolean> = {};

function makeGroundTextures() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0b0916";
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 22000; i++) {
    x.fillStyle = `rgba(150,150,210,${Math.random() * 0.05})`;
    x.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  x.strokeStyle = "rgba(96,90,160,.30)";
  x.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const p = (i / 8) * S;
    x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke();
    x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke();
  }
  x.strokeStyle = "rgba(80,110,255,.16)";
  x.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const p = (i / 16) * S;
    x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke();
    x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);
  map.anisotropy = 8;
  return map;
}

function arenaTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0b0816";
  x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2);
  x.strokeStyle = "#f0a93a";
  for (let r = 36; r < S / 2; r += 36) {
    x.lineWidth = r % 72 < 36 ? 4 : 1.5;
    x.globalAlpha = r % 72 < 36 ? 0.95 : 0.45;
    x.beginPath(); x.arc(0, 0, r, 0, 6.28); x.stroke();
  }
  x.globalAlpha = 0.75;
  x.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.28;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * S / 2, Math.sin(a) * S / 2); x.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function nebulaTexture(cols: string[]) {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * S, cy = Math.random() * S * 0.6, r = 120 + Math.random() * 240;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, cols[i % cols.length]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.globalAlpha = 0.5;
    x.beginPath(); x.arc(cx, cy, r, 0, 6.28); x.fill();
  }
  return new THREE.CanvasTexture(c);
}

export default function World({
  champions,
  ownedKey,
  onNear,
  match,
  controlsEnabled,
  biome,
  towerAgents = [],
  onAltitude,
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  onNear: (n: NearTarget) => void;
  match: MatchView | null;
  controlsEnabled: boolean;
  biome: BiomeConfig;
  towerAgents?: TowerAgent[];
  onAltitude?: (y: number) => void;
}) {
  const handlerPos = useRef(new THREE.Vector3(SPAWN[0], 0, SPAWN[2]));
  const camCue = useRef<CamCue>({ zoom: 0, heading: Math.PI, speed: 0, moving: false });
  // touch input channels, mutated by the on-screen controls and read each frame
  const touchMove = useRef<TouchMove>({ x: 0, y: 0 });
  const touchBtn = useRef<TouchBtn>({ sprint: false, jump: 0, jumpHeld: false });
  const camDrag = useRef<CamDrag>({ dx: 0, dy: 0, pinch: 0 });
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const coarse =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (coarse) setIsTouch(true);
    const onFirstTouch = () => setIsTouch(true);
    window.addEventListener("touchstart", onFirstTouch, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", onFirstTouch);
  }, []);
  // the SHAPE of the land + the per-world scene composition. Switching world
  // changes the geometry you walk through, not just its colour.
  const shape = useMemo(() => shapeOf(biome), [biome]);
  const sc = biome.scene;
  // shared, deterministic tower layout — colliders, perched agents and the
  // challenge proximity check all read from this same list.
  const towerNodes = useMemo(() => towerLayout(shape, sc.towerAngle, sc.towerSteps), [shape, sc.towerAngle, sc.towerSteps]);
  const perched = useMemo(() => assignPerch(towerNodes, towerAgents), [towerNodes, towerAgents]);
  const challengeTargets = useMemo(
    () =>
      perched
        .filter((p) => p.agent.status === "awaiting")
        .map((p) => ({ key: p.agent.key, name: p.agent.name, pos: new THREE.Vector3(p.pos[0], p.pos[1] + 1.2, p.pos[2]) })),
    [perched],
  );
  // checkpoint pads (top surface + landing radius) — the climber respawns onto
  // the highest one they've reached, so a fall never drops them to the bottom
  const checkpoints = useMemo(
    () =>
      towerNodes
        .filter((n) => n.checkpoint)
        .map((n) => ({ x: n.pos[0], y: n.pos[1] + n.size[1] / 2, z: n.pos[2], r: n.size[0] / 2 })),
    [towerNodes],
  );
  return (
    <>
    <Canvas
      shadows="percentage"
      camera={{ position: [0, 8, 18], fov: 52, near: 0.1, far: 600 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = biome.exposure;
      }}
    >
      <ExposureSync exposure={biome.exposure} />
      <color attach="background" args={[biome.bg]} />
      <fog attach="fog" args={[biome.fog.color, biome.fog.near, biome.fog.far]} />

      <SkyDome biome={biome} />
      <Nebula biome={biome} />
      <Starfield />

      <Environment resolution={256} frames={1} key={biome.id}>
        <Lightformer intensity={1.4} color={biome.ibl.key} position={[0, 8, 0]} scale={[20, 20, 1]} target={[0, 0, 0]} />
        <Lightformer intensity={1.0} color={biome.ibl.warm} position={[14, 4, 0]} scale={[10, 10, 1]} target={[0, 0, 0]} />
        <Lightformer intensity={0.8} color={biome.ibl.cool} position={[-14, 4, 6]} scale={[10, 10, 1]} target={[0, 0, 0]} />
        <Lightformer intensity={0.6} color={biome.ibl.fill} position={[0, 2, -16]} scale={[24, 8, 1]} target={[0, 0, 0]} />
      </Environment>

      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt} />
      <directionalLight
        position={[34, 44, 22]}
        intensity={biome.lights.sunInt}
        color={biome.lights.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0004}
      />
      <pointLight position={[ARENA[0], 7, ARENA[2]]} intensity={140} color={biome.lights.arenaPoint} distance={48} />
      <pointLight position={[TRAIN_PAD[0], 6, TRAIN_PAD[2]]} intensity={80} color={biome.lights.trainPoint} distance={36} />

      <Suspense
        fallback={
          <Html center className="mono" style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
            loading the grounds…
          </Html>
        }
      >
        <Physics gravity={[0, -22, 0]}>
          <Terrain biome={biome} />
          <PlazaFloor biome={biome} />
          <PlazaSurround biome={biome} />
          <Platforms biome={biome} shape={shape} count={sc.platformCount} />
          <Tower biome={biome} nodes={towerNodes} />
          {sc.arena === "pit" ? <PitArena biome={biome} /> : <ArenaPlatform />}
          <GuardianShrine />
          <Obelisks biome={biome} shape={shape} count={sc.obeliskCount} pillar={sc.pillar} />
          <Scatter biome={biome} />
          <Crystals biome={biome} shape={shape} count={sc.crystalCount} />

          {!match && perched.map((p) => <PerchedAgent key={p.agent.id} agent={p.agent} position={p.pos} />)}

          {match ? (
            <MatchStage champions={champions} match={match} />
          ) : (
            champions.map((c) => {
              const owned = c.key === ownedKey;
              const home = owned ? TRAIN_PAD : roamHome(c.key, champions, sc.roam);
              return (
                <ChampionMesh
                  key={c.key}
                  type={c.type}
                  champion={c.champion}
                  label={c.name + (owned ? "  ◆ YOURS" : "")}
                  position={[home[0], 0, home[2]]}
                  rotation={owned ? Math.atan2(ARENA[0] - home[0], ARENA[2] - home[2]) : 0}
                  selected={owned}
                  wander={!owned}
                  worldRadius={sc.roam.spread}
                  wanderInner={sc.roam.inner}
                  wanderSpeed={sc.roam.speed}
                />
              );
            })
          )}

          <Handler controlsEnabled={controlsEnabled && !match} onNear={onNear} ownedKey={ownedKey} matchActive={!!match} handlerPos={handlerPos} camCue={camCue} touchMove={touchMove} touchBtn={touchBtn} challengeTargets={challengeTargets} checkpoints={checkpoints} shape={shape} onAltitude={onAltitude} />
        </Physics>

        <RenderBoundary fallback={null}>
          <EffectComposer enableNormalPass={false}>
            <Bloom intensity={biome.bloom} luminanceThreshold={0.62} luminanceSmoothing={0.28} mipmapBlur radius={0.7} />
            <Vignette eskil={false} offset={0.22} darkness={0.6} />
          </EffectComposer>
        </RenderBoundary>
      </Suspense>

      <CameraController match={match} handlerPos={handlerPos} camCue={camCue} camDrag={camDrag} />
    </Canvas>
    {isTouch && <TouchControls active={controlsEnabled && !match} move={touchMove} btn={touchBtn} cam={camDrag} />}
    </>
  );
}

function ExposureSync({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

// stable 0..1 hash from a key, for deterministic per-world scatter placement
function keyHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// where an idle agent stands — its formation depends on the world, so the
// population is laid out differently in each scene.
function roamHome(key: string, champions: GroundChampion[], roam: BiomeConfig["scene"]["roam"]): [number, number, number] {
  const list = champions.map((c) => c.key);
  const idx = list.indexOf(key);
  const n = Math.max(1, list.length);
  if (roam.pattern === "scatter") {
    const a = keyHash(key) * Math.PI * 2;
    const r = roam.inner + keyHash(key + "r") * (roam.spread - roam.inner);
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
  }
  if (roam.pattern === "arc") {
    // fan the agents across a wide arc rather than a full ring
    const t = n === 1 ? 0.5 : idx / (n - 1);
    const a = Math.PI / 2 - Math.PI * 0.9 + t * Math.PI * 1.8;
    return [Math.cos(a) * roam.radius, 0, Math.sin(a) * roam.radius];
  }
  const a = (idx / n) * Math.PI * 2;
  return [Math.cos(a) * roam.radius, 0, Math.sin(a) * roam.radius];
}

// ---------- environment ----------
function SkyDome({ biome }: { biome: BiomeConfig }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color(biome.sky.top) }, bot: { value: new THREE.Color(biome.sky.bottom) } },
        vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: "varying vec3 v;uniform vec3 top;uniform vec3 bot;void main(){float h=normalize(v).y*0.5+0.5;gl_FragColor=vec4(mix(bot,top,pow(h,0.7)),1.0);}",
      }),
    [biome],
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[320, 32, 16]} />
    </mesh>
  );
}

function Nebula({ biome }: { biome: BiomeConfig }) {
  const tex = useMemo(() => nebulaTexture(biome.nebula.colors), [biome]);
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[285, 32, 16]} />
      <meshBasicMaterial map={tex} transparent opacity={biome.nebula.opacity} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

function Starfield() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 150 + Math.random() * 150, t = Math.random() * 6.28, p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(p));
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#c8c2ff" size={1.1} sizeAttenuation transparent opacity={0.95} fog={false} />
    </points>
  );
}

// thin textured visual overlay for the flat plaza (the terrain provides the collider)
function PlazaFloor({ biome }: { biome: BiomeConfig }) {
  const map = useMemo(() => makeGroundTextures(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
      <circleGeometry args={[PLAZA_R + 1, 80]} />
      <meshStandardMaterial map={map} color={biome.plaza.color} emissive={biome.plaza.emissive} emissiveIntensity={biome.plaza.emissiveIntensity} metalness={0.35} roughness={0.6} envMapIntensity={0.8} />
    </mesh>
  );
}

function ArenaPlatform() {
  const tex = useMemo(() => arenaTexture(), []);
  return (
    <group position={ARENA}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <torusGeometry args={[6.5, 0.2, 16, 160]} />
        <meshStandardMaterial color="#f0a93a" emissive="#f0a93a" emissiveIntensity={2.6} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[6.5, 80]} />
        <meshStandardMaterial color="#16112a" emissive="#f0a93a" emissiveMap={tex} emissiveIntensity={1.15} metalness={0.45} roughness={0.5} envMapIntensity={0.9} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 6.5, 0.85, Math.sin(a) * 6.5]} castShadow>
            <boxGeometry args={[0.16, 1.7, 0.16]} />
            <meshStandardMaterial color="#f0a93a" emissive="#f0a93a" emissiveIntensity={1.1} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── The Guardian's Shrine ────────────────────────────────────────────────────
// A diegetic entry point to the single-player extraction game: a monolith you
// walk up to and challenge, instead of a menu page. A floating rune + beacon
// make it readable from across the plaza.
const GUARDIAN_COL = "#c77dff";

function GuardianShrine() {
  const runeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (runeRef.current) {
      runeRef.current.rotation.y += 0.012;
      runeRef.current.position.y = 3.2 + Math.sin(t * 1.2) * 0.18;
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + Math.sin(t * 1.6) * 0.04;
    }
  });
  return (
    <group position={GUARDIAN_PAD}>
      {/* base dais */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[2.8, 48]} />
        <meshStandardMaterial color="#1a1330" emissive={GUARDIAN_COL} emissiveIntensity={0.35} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.7, 2.84, 48]} />
        <meshBasicMaterial color={GUARDIAN_COL} side={THREE.DoubleSide} />
      </mesh>

      {/* the monolith — a solid obstacle you approach */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 2.1, 0]} castShadow>
          <boxGeometry args={[1.3, 4.2, 0.5]} />
          <meshStandardMaterial color="#221836" emissive={GUARDIAN_COL} emissiveIntensity={0.4} metalness={0.55} roughness={0.4} />
        </mesh>
      </RigidBody>

      {/* floating rune */}
      <mesh ref={runeRef} position={[0, 3.2, 0]}>
        <torusGeometry args={[0.5, 0.07, 12, 5]} />
        <meshStandardMaterial color={GUARDIAN_COL} emissive={GUARDIAN_COL} emissiveIntensity={2.4} metalness={0.3} roughness={0.3} />
      </mesh>

      {/* wayfinding beacon */}
      <mesh ref={glowRef} position={[0, 6, 0]}>
        <cylinderGeometry args={[0.4, 1.1, 12, 14, 1, true]} />
        <meshBasicMaterial color={GUARDIAN_COL} transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={60} color={GUARDIAN_COL} distance={26} />

      <Html position={[0, 5.1, 0]} center distanceFactor={16} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 18, letterSpacing: 2, textShadow: "0 2px 10px #000" }}>THE GUARDIAN</div>
          <div style={{ fontSize: 10, color: GUARDIAN_COL, letterSpacing: 1 }}>talk a secret out of it</div>
        </div>
      </Html>
    </group>
  );
}

function TrainPad() {
  return (
    <group position={TRAIN_PAD}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#6a6bff" transparent opacity={0.14} emissive="#6a6bff" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[2.5, 2.62, 48]} />
        <meshBasicMaterial color="#6a6bff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// jumpable platforms in the wilds — solid physics colliders, placed on the terrain
function Platforms({ biome, shape, count }: { biome: BiomeConfig; shape: TerrainShape; count: number }) {
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [];
    // the bearing of the platform staircase tracks the world's seed so each
    // world arranges them differently
    const baseA = Math.PI * 0.25 + shape.seed * 0.013;
    for (let i = 0; i < count; i++) {
      const r = PLAZA_R + 5 + i * 3.4;
      const a = baseA + i * 0.16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const top = terrainHeight(x, z, shape) + 1.4 + i * 1.5;
      out.push({ pos: [x, top, z], size: [3.4, 0.5, 3.4], color: i % 2 ? biome.platform.a : biome.platform.b });
    }
    const lx = Math.cos(baseA + 1.1) * (PLAZA_R + 26);
    const lz = Math.sin(baseA + 1.1) * (PLAZA_R + 26);
    out.push({ pos: [lx, terrainHeight(lx, lz, shape) + 12, lz], size: [6, 0.6, 6], color: biome.platform.top });
    return out;
  }, [biome, shape, count]);
  return (
    <>
      {items.map((it, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid">
          <mesh position={it.pos} castShadow receiveShadow>
            <boxGeometry args={it.size} />
            <meshStandardMaterial color={it.color} emissive={it.color} emissiveIntensity={0.35} metalness={0.4} roughness={0.5} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

// ── The Tower ────────────────────────────────────────────────────────────────
// A climbable helix of small floating platforms spiralling toward the sky. The
// gaps are tuned to the Handler's jump arc + multi-jump so a confident player
// can chain hops all the way to the summit. Other agents perch on the platforms.
const CHECKPOINT_EVERY = 12;         // a generous landing pad (and respawn anchor) every ~12 hops

interface TowerNode {
  pos: [number, number, number];
  size: [number, number, number];
  checkpoint?: boolean; // wide rest pad that also catches a fall
}

interface Perch {
  agent: TowerAgent;
  pos: [number, number, number];
}

function towerLayout(shape: TerrainShape, angle: number, steps: number): TowerNode[] {
  const cx = Math.cos(angle) * (PLAZA_R + 9);
  const cz = Math.sin(angle) * (PLAZA_R + 9);
  const baseY = terrainHeight(cx, cz, shape);
  const out: TowerNode[] = [];
  // a low entry step you can hop onto straight off the ground — the first checkpoint
  out.push({ pos: [cx, baseY + 1.2, cz], size: [4.6, 0.5, 4.6], checkpoint: true });
  let y = baseY + 1.2;
  for (let i = 0; i < steps; i++) {
    const a = i * 0.95 + 0.5;
    const radius = 3.6 + Math.sin(i * 0.7) * 0.6;
    // gaps stay inside the jump arc the whole way up (normalised by step count)
    const step = 2.7 + (i / steps) * 0.9;
    y += step;
    const isCp = (i + 1) % CHECKPOINT_EVERY === 0;
    // platforms taper gently as you ascend; checkpoints are wide, safe landing pads
    const w = isCp ? 4.6 : Math.max(2.0, 3.2 - i * 0.008);
    out.push({ pos: [cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius], size: [w, 0.45, w], checkpoint: isCp });
  }
  // the summit — a wide platform, the prize at the top
  y += 3.1;
  out.push({ pos: [cx, y, cz], size: [6.5, 0.6, 6.5], checkpoint: true });
  return out;
}

// Spread agents across the tower with rating rising as you climb — weakest near
// the base, the strongest perched on the summit.
function assignPerch(nodes: TowerNode[], agents: TowerAgent[]): Perch[] {
  if (!agents.length) return [];
  const slots = nodes.slice(1); // leave the entry step clear
  const sorted = [...agents].sort((a, b) => a.rating - b.rating);
  const n = Math.min(sorted.length, slots.length);
  const out: Perch[] = [];
  for (let i = 0; i < n; i++) {
    const slot = n === 1 ? slots[slots.length - 1] : slots[Math.round((i * (slots.length - 1)) / (n - 1))];
    out.push({ agent: sorted[i], pos: [slot.pos[0], slot.pos[1] + slot.size[1] / 2, slot.pos[2]] });
  }
  return out;
}

function Tower({ biome, nodes }: { biome: BiomeConfig; nodes: TowerNode[] }) {
  const beamRef = useRef<THREE.Mesh>(null);
  const base = nodes[0];
  const top = nodes[nodes.length - 1];
  // a tall light column rising from the entry platform — a wayfinder you can
  // spot from anywhere on the plaza so the climb is discoverable.
  const beamH = top.pos[1] - base.pos[1] + 8;
  useFrame((state) => {
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
    }
  });
  return (
    <>
      {/* wayfinding beacon */}
      <group position={[base.pos[0], base.pos[1], base.pos[2]]}>
        <mesh ref={beamRef} position={[0, beamH / 2, 0]}>
          <cylinderGeometry args={[0.5, 1.4, beamH, 14, 1, true]} />
          <meshBasicMaterial color={biome.platform.top} transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </mesh>
        <pointLight position={[0, 3, 0]} intensity={40} color={biome.platform.top} distance={26} />
        <Html position={[0, beamH + 1.5, 0]} center distanceFactor={26} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 22, letterSpacing: 2, textShadow: "0 2px 10px #000" }}>↑ THE TOWER</div>
            <div style={{ fontSize: 11, color: biome.platform.top, letterSpacing: 1 }}>climb to challenge the agents above</div>
          </div>
        </Html>
      </group>
      {nodes.map((n, i) => {
        const top = i === nodes.length - 1;
        const cp = !!n.checkpoint;
        const color = top || cp ? biome.platform.top : i % 2 ? biome.platform.a : biome.platform.b;
        const topY = n.pos[1] + n.size[1] / 2;
        return (
          <RigidBody key={i} type="fixed" colliders="cuboid">
            <mesh position={n.pos} castShadow receiveShadow>
              <boxGeometry args={n.size} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={top ? 0.6 : cp ? 0.5 : 0.32} metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[n.pos[0], topY + 0.012, n.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[n.size[0] / 2 - 0.16, n.size[0] / 2, 44]} />
              <meshBasicMaterial color={color} transparent opacity={cp ? 0.85 : 0.5} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {cp && !top && (
              /* a glowing landing halo so checkpoints read from a distance (no
                 dynamic light — additive emissive keeps it cheap across ~14 pads) */
              <mesh position={[n.pos[0], topY + 0.05, n.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[n.size[0] / 2 + 0.25, n.size[0] / 2 + 0.55, 48]} />
                <meshBasicMaterial color={biome.platform.top} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
              </mesh>
            )}
          </RigidBody>
        );
      })}
    </>
  );
}

const STATUS_VIS: Record<AgentStatus, { color: string; badge: string; label: string }> = {
  awaiting: { color: "#36d39a", badge: "⚔", label: "AWAITING" },
  hibernating: { color: "#6a6bff", badge: "🌙", label: "HIBERNATING" },
  disabled: { color: "#7b7b88", badge: "⛔", label: "OFFLINE" },
};

function pseudoChampion(a: TowerAgent): Champion {
  const c = blank();
  c.battles = a.battles;
  c.wins = Math.round(a.battles * 0.5);
  c.losses = a.battles - c.wins;
  c.xp = a.battles * 60;
  c.rating = a.rating;
  return c;
}

function PerchedAgent({ agent, position }: { agent: TowerAgent; position: [number, number, number] }) {
  const champ = useMemo(() => pseudoChampion(agent), [agent]);
  const vis = STATUS_VIS[agent.status];
  const disabled = agent.status === "disabled";
  const hibernating = agent.status === "hibernating";
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const rot = useMemo(() => Math.atan2(-position[0], -position[2]), [position]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const sc = 1 + Math.sin(t * (hibernating ? 0.8 : 2.2) + position[1]) * (disabled ? 0.02 : 0.08);
      ringRef.current.scale.set(sc, sc, sc);
    }
    if (beamRef.current) beamRef.current.rotation.y += 0.01;
  });

  return (
    <group position={position}>
      <ChampionMesh
        type={agent.type}
        champion={champ}
        position={[0, 0, 0]}
        rotation={rot}
        showLabel={false}
        baseColorOverride={disabled ? "#3a3a44" : undefined}
      />

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.85, 1.08, 48]} />
        <meshBasicMaterial color={vis.color} transparent opacity={disabled ? 0.35 : 0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {agent.status === "awaiting" && (
        <mesh ref={beamRef} position={[0, 3, 0]}>
          <cylinderGeometry args={[0.06, 0.5, 6, 8, 1, true]} />
          <meshBasicMaterial color={vis.color} transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </mesh>
      )}

      <Html position={[0, 2.4, 0]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap", opacity: disabled ? 0.55 : 1 }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 18, textShadow: "0 2px 8px #000" }}>
            {agent.name}
            {agent.handle ? <span style={{ color: "#9a96b8", fontWeight: 500 }}> @{agent.handle}</span> : null}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 1, color: vis.color, fontWeight: 700 }}>
            {vis.badge} {vis.label} · {agent.rating}
          </div>
        </div>
      </Html>
    </group>
  );
}

function Obelisks({ biome, shape, count, pillar }: { biome: BiomeConfig; shape: TerrainShape; count: number; pillar: "obelisk" | "basalt" }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = PLAZA_R + 14 + (i % 3) * 6;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        return { x, z, base: terrainHeight(x, z, shape), h: 9 + Math.random() * 8, rot: Math.random() * 6.28, lean: (Math.random() - 0.5) * 0.25 };
      }),
    [shape, count],
  );
  return (
    <>
      {items.map((o, i) =>
        pillar === "basalt" ? (
          // chunky, leaning hexagonal basalt columns — volcanic, not crystalline
          <mesh key={i} position={[o.x, o.base + o.h / 2, o.z]} rotation={[o.lean, o.rot, o.lean]} castShadow>
            <cylinderGeometry args={[1.4, 1.7, o.h, 6]} />
            <meshStandardMaterial color={biome.obelisk.color} emissive={biome.obelisk.emissive} emissiveIntensity={biome.obelisk.emissiveIntensity * 0.5} metalness={0.2} roughness={0.95} flatShading envMapIntensity={0.6} />
          </mesh>
        ) : (
          // tall sharp obelisks — crystalline spires
          <mesh key={i} position={[o.x, o.base + o.h / 2, o.z]} rotation={[0, o.rot, 0]} castShadow>
            <coneGeometry args={[1.3, o.h, 5]} />
            <meshStandardMaterial color={biome.obelisk.color} emissive={biome.obelisk.emissive} emissiveIntensity={biome.obelisk.emissiveIntensity} metalness={0.5} roughness={0.45} envMapIntensity={1} />
          </mesh>
        ),
      )}
    </>
  );
}

function Crystals({ biome, shape, count }: { biome: BiomeConfig; shape: TerrainShape; count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const a = Math.random() * 6.28, r = 14 + Math.random() * 60;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        return { x, z, by: terrainHeight(x, z, shape) + 2 + Math.random() * 9, s: 0.3 + Math.random() * 0.5, spin: Math.random() * 0.02 + 0.005, ph: Math.random() * 6.28 };
      }),
    [shape, count],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      const it = items[i];
      if (!m) continue;
      m.rotation.y += it.spin;
      m.rotation.x += it.spin * 0.5;
      m.position.y = it.by + Math.sin(t * 0.6 + it.ph) * 0.5;
    }
  });
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[it.x, it.by, it.z]} scale={it.s}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={biome.floatCrystal.color} emissive={biome.floatCrystal.emissive} emissiveIntensity={biome.floatCrystal.emissiveIntensity} metalness={0.4} roughness={0.3} transparent opacity={0.9} />
        </mesh>
      ))}
    </>
  );
}

function MatchStage({ champions, match }: { champions: GroundChampion[]; match: MatchView }) {
  const a = champions.find((c) => c.key === match.aKey);
  const b = champions.find((c) => c.key === match.bKey);
  if (!a || !b) return null;
  return (
    <>
      <ChampionMesh type={a.type} champion={a.champion} label={a.name} position={PODIUM_A} rotation={Math.PI / 2} punchSignal={match.punchA} hitSignal={match.hitA} hpFrac={match.hpA / 100} selected={match.actor === a.key} />
      <ChampionMesh type={b.type} champion={b.champion} label={b.name} position={PODIUM_B} rotation={-Math.PI / 2} punchSignal={match.punchB} hitSignal={match.hitB} hpFrac={match.hpB / 100} selected={match.actor === b.key} />
    </>
  );
}

const WALK = 8.6, RUN = 15.2, JUMP = 10.4, AIR_JUMP = 9.6;
// acceleration rates (per second) for dt-based, frame-rate-independent smoothing —
// higher = snappier response to the stick. Ground is punchy; air is lighter; the
// jetpack gives strong horizontal authority so you can steer your flight path.
const ACCEL_GROUND = 22, ACCEL_AIR = 9, ACCEL_FLY = 16;
// how quickly the body coasts to a stop when the stick is released (per second)
const STOP_GROUND = 16, STOP_AIR = 1.4, STOP_FLY = 4.5;
// how quickly the character pivots toward the move direction (per second)
const TURN_GROUND = 22, TURN_AIR = 16;
// jetpack flight (unlocked after 4 consecutive jumps): hold to thrust smoothly
const FLY_TRIGGER = 4;     // consecutive jumps needed before the pack deploys
const FLY_CLIMB = 9.6;     // target upward velocity while thrusting
const FLY_THRUST_K = 0.16; // how snappily we ease toward that climb velocity

// shared channel from Handler → CameraController for action-cam cues +
// the live movement state the smart-follow camera steers from
interface CamCue {
  zoom: number;        // one-shot punch-in impulse (decays each frame)
  heading: number;     // player facing / move heading (radians)
  speed: number;       // planar speed magnitude
  moving: boolean;     // actively pressing movement keys this frame
}

// on-screen touch control channels (mobile)
interface TouchMove { x: number; y: number }   // analog stick, x = strafe, y = forward (+up)
interface TouchBtn { sprint: boolean; jump: number; jumpHeld: boolean } // jump = tap counter (edge); jumpHeld = button currently down (hold-to-fly)
interface CamDrag { dx: number; dy: number; pinch: number } // orbit + pinch deltas, drained each frame

// Jetpack worn during sustained flight (5+ consecutive jumps). The pack springs
// out of the character's back; every jump stroke fires a downward smoke burst.
// Driven entirely by refs (no re-renders): `flyingRef` toggles the pack in/out,
// `burstRef` is a counter the Handler bumps on each flight stroke.
function Jetpack({ h, flyingRef, burstRef }: { h: number; flyingRef: React.RefObject<boolean>; burstRef: React.RefObject<number> }) {
  const grp = useRef<THREE.Group>(null);
  const flameL = useRef<THREE.Mesh>(null);
  const flameR = useRef<THREE.Mesh>(null);
  const scale = useRef(0);
  const lastBurst = useRef(0);

  const PUFFS = 22;
  const puffRefs = useRef<(THREE.Mesh | null)[]>([]);
  const puffState = useRef(
    Array.from({ length: PUFFS }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      max: 1,
      size: 1,
    })),
  );
  const cursor = useRef(0);

  // two exhaust nozzles, tucked under the (small) pack on the character's back
  const nozzle = useMemo(
    () => [new THREE.Vector3(-h * 0.09, h * 0.36, -h * 0.2), new THREE.Vector3(h * 0.09, h * 0.36, -h * 0.2)],
    [h],
  );

  function emitBurst(n = 4) {
    // a small cluster, alternating nozzles, kicked down + back
    for (let i = 0; i < n; i++) {
      const p = puffState.current[cursor.current % PUFFS];
      cursor.current++;
      const noz = nozzle[i % 2];
      p.pos.set(noz.x + (Math.random() - 0.5) * h * 0.05, noz.y, noz.z);
      p.vel.set((Math.random() - 0.5) * 0.6, -2.6 - Math.random() * 1.4, -0.35 - Math.random() * 0.5);
      p.max = 0.28 + Math.random() * 0.16;
      p.life = p.max;
      p.size = h * (0.08 + Math.random() * 0.07);
    }
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const flying = !!flyingRef.current;
    // fast spring so the pack snaps out / retracts quickly
    scale.current += ((flying ? 1 : 0) - scale.current) * Math.min(1, dt * 16);
    if (grp.current) {
      grp.current.visible = scale.current > 0.02;
      grp.current.scale.setScalar(scale.current);
    }

    // flame flicker while thrusting
    const flick = 0.55 + Math.random() * 0.45;
    if (flameL.current) { flameL.current.scale.y = flick; (flameL.current.material as THREE.MeshBasicMaterial).opacity = flying ? 0.85 * flick : 0; }
    if (flameR.current) { flameR.current.scale.y = flick * 0.92; (flameR.current.material as THREE.MeshBasicMaterial).opacity = flying ? 0.85 * flick : 0; }

    // counter bumped by the Handler (per stroke, or paced while thrusting) → smoke
    const b = burstRef.current || 0;
    if (b > lastBurst.current) { lastBurst.current = b; emitBurst(3); }

    // advance live smoke puffs
    for (let i = 0; i < PUFFS; i++) {
      const p = puffState.current[i];
      const m = puffRefs.current[i];
      if (!m) continue;
      if (p.life <= 0) { if (m.visible) m.visible = false; continue; }
      p.life -= dt;
      p.vel.multiplyScalar(0.9); // air drag
      p.pos.addScaledVector(p.vel, dt);
      const age = 1 - Math.max(0, p.life) / p.max; // 0 = ignition, 1 = gone
      m.visible = true;
      m.position.copy(p.pos);
      m.scale.setScalar(p.size * (0.5 + age * 1.9));
      const mat = m.material as THREE.MeshBasicMaterial;
      // bright cyan at ignition, cooling to grey smoke as it expands
      mat.color.setRGB(0.5 + age * 0.2, 0.95 - age * 0.23, 1.0 - age * 0.22);
      mat.opacity = (1 - age) * 0.6;
    }
  });

  return (
    <group>
      {/* pack body — springs in/out of the back (kept compact) */}
      <group ref={grp} visible={false}>
        <mesh position={[0, h * 0.56, -h * 0.18]} castShadow>
          <boxGeometry args={[h * 0.22, h * 0.32, h * 0.13]} />
          <meshStandardMaterial color="#20242e" metalness={0.7} roughness={0.35} emissive="#39e0ff" emissiveIntensity={0.3} />
        </mesh>
        {nozzle.map((n, i) => (
          <mesh key={i} position={[n.x, n.y + h * 0.04, n.z]}>
            <cylinderGeometry args={[h * 0.034, h * 0.05, h * 0.1, 12]} />
            <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        {/* thruster flames (point downward) */}
        <mesh ref={flameL} position={[nozzle[0].x, nozzle[0].y - h * 0.1, nozzle[0].z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[h * 0.04, h * 0.17, 10]} />
          <meshBasicMaterial color="#8ff3ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh ref={flameR} position={[nozzle[1].x, nozzle[1].y - h * 0.1, nozzle[1].z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[h * 0.04, h * 0.17, 10]} />
          <meshBasicMaterial color="#8ff3ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* smoke puffs — pooled, unscaled so the spring doesn't squash them */}
      {puffState.current.map((_, i) => (
        <mesh key={i} ref={(el) => { puffRefs.current[i] = el; }} visible={false}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#aeefff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// physics-driven Handler: dynamic capsule + feet sensor for grounding
function Handler({
  controlsEnabled,
  onNear,
  ownedKey,
  matchActive,
  handlerPos,
  camCue,
  touchMove,
  touchBtn,
  challengeTargets,
  checkpoints,
  shape,
  onAltitude,
}: {
  controlsEnabled: boolean;
  onNear: (n: NearTarget) => void;
  ownedKey: string | null;
  matchActive: boolean;
  handlerPos: React.RefObject<THREE.Vector3>;
  camCue: React.RefObject<CamCue>;
  touchMove: React.RefObject<TouchMove>;
  touchBtn: React.RefObject<TouchBtn>;
  challengeTargets: { key: string; name: string; pos: THREE.Vector3 }[];
  checkpoints: { x: number; y: number; z: number; r: number }[];
  shape: TerrainShape;
  onAltitude?: (y: number) => void;
}) {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
  const built = useMemo(() => buildCharacter(scene, animations, blank(), "#cfd2e8"), [scene, animations]);
  const body = useRef<RapierRigidBody>(null);
  const inner = useRef<THREE.Group>(null);
  const heading = useRef(Math.PI);
  const ground = useRef(0);
  const cur = useRef<"idle" | "walk" | "run" | "jump">("idle");
  const near = useRef<NearTarget>(null);
  const jumps = useRef(0);
  const prevSpace = useRef(false);
  const prevTouchJump = useRef(0);
  // jetpack flight: kicks in past 4 consecutive jumps; bursts on every stroke
  const flying = useRef(false);
  const jetBurst = useRef(0);
  const jetEmit = useRef(0); // accumulator that paces continuous-thrust smoke
  // procedural body polish: a forward/banked lean while flying, and a
  // squash-&-stretch impulse that pops on launch and absorbs on landing
  const leanX = useRef(0);
  const leanZ = useRef(0);
  const stretch = useRef(0); // +1 = stretch up (launch), -1 = squash down (land)
  const wasGrounded = useRef(true);
  const lastCp = useRef<{ x: number; y: number; z: number } | null>(null);
  const altAccum = useRef(0);
  const altLast = useRef(-999);
  const { camera } = useThree();

  function setAnim(name: "idle" | "walk" | "run" | "jump") {
    if (cur.current === name) return;
    const prev = built.actions[cur.current];
    const next = built.actions[name] || built.actions.idle;
    prev?.fadeOut(0.18);
    next?.reset().setEffectiveWeight(1).fadeIn(0.18).play();
    cur.current = name;
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const code = e.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight"].includes(code)) {
        keys[code] = true;
        if (code === "Space" || code.startsWith("Arrow")) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      for (const k in keys) keys[k] = false;
    };
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    const rb = body.current;
    if (!rb) return;

    const t = rb.translation();
    handlerPos.current.set(t.x, t.y, t.z);

    const fwd = new THREE.Vector3(t.x - camera.position.x, 0, t.z - camera.position.z);
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1);
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    // gather input as analog axes (ax = strafe, az = forward) from keys + touch stick
    let ax = 0, az = 0;
    let touchSprint = false;
    if (controlsEnabled) {
      if (keys["KeyW"] || keys["ArrowUp"]) az += 1;
      if (keys["KeyS"] || keys["ArrowDown"]) az -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) ax += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) ax -= 1;
      const tm = touchMove.current;
      if (tm) { ax += tm.x; az += tm.y; }
      touchSprint = !!touchBtn.current?.sprint;
    }
    // clamp the combined stick to the unit circle so diagonals aren't faster
    let mag = Math.hypot(ax, az);
    if (mag > 1) { ax /= mag; az /= mag; mag = 1; }
    // camera-relative move vector; its length is the analog throttle (0..1)
    const mx = fwd.x * az + right.x * ax;
    const mz = fwd.z * az + right.z * ax;
    const len = Math.hypot(mx, mz);
    const sprint = keys["ShiftLeft"] || keys["ShiftRight"] || touchSprint;
    const grounded = ground.current > 0;
    // jetpack flight is active past the trigger — while flying we hold a still
    // hover pose, so the ground walk/run/idle animation must not drive the body
    const flyingMode = jumps.current > FLY_TRIGGER;
    const v = rb.linvel();
    // refund the air-jump budget only once settled on the ground (not the frame
    // we launched), so a multi-jump isn't refunded mid-takeoff
    if (grounded && v.y <= 0.6) jumps.current = 0;

    if (len > 0) {
      const sp = sprint ? RUN : WALK;
      // mx/mz already carry the analog throttle (their length is 0..1)
      const tvx = mx * sp, tvz = mz * sp;
      // exponential smoothing toward the target velocity, frame-rate independent.
      // ground is punchy; flying keeps strong authority so you can steer the pack;
      // a plain jump keeps lighter air control
      const accel = grounded ? ACCEL_GROUND : flyingMode ? ACCEL_FLY : ACCEL_AIR;
      const k = 1 - Math.exp(-accel * dt);
      rb.setLinvel({ x: v.x + (tvx - v.x) * k, y: v.y, z: v.z + (tvz - v.z) * k }, true);
      const want = Math.atan2(mx, mz);
      let d = want - heading.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading.current += d * (1 - Math.exp(-(grounded ? TURN_GROUND : TURN_AIR) * dt));
      if (grounded && !flyingMode) setAnim(sprint ? "run" : "walk");
    } else {
      // stickier stop on the ground, a gentle brake while flying, long glide mid-jump
      const stop = grounded ? STOP_GROUND : flyingMode ? STOP_FLY : STOP_AIR;
      const damp = Math.exp(-stop * dt);
      rb.setLinvel({ x: v.x * damp, y: v.y, z: v.z * damp }, true);
      if (grounded && !flyingMode) setAnim("idle");
    }

    // jump input: held state (for hold-to-fly) + rising edge (for discrete hops)
    const space = controlsEnabled && !!keys["Space"];
    const spaceEdge = space && !prevSpace.current;
    prevSpace.current = space;
    const tj = touchBtn.current ? touchBtn.current.jump : 0;
    const touchEdge = controlsEnabled && tj > prevTouchJump.current;
    prevTouchJump.current = tj;
    const jumpEdge = spaceEdge || touchEdge;
    const jumpHeld = space || (controlsEnabled && !!touchBtn.current?.jumpHeld);

    if (jumps.current > FLY_TRIGGER) {
      // ── jetpack flight ── hold jump to thrust upward smoothly; release to glide
      if (jumpHeld) {
        rb.setLinvel({ x: v.x, y: v.y + (FLY_CLIMB - v.y) * FLY_THRUST_K, z: v.z }, true);
        // continuous exhaust while the thruster is firing (paced, not per-frame)
        jetEmit.current += dt;
        if (jetEmit.current > 0.045) { jetEmit.current = 0; jetBurst.current++; }
        if (camCue.current) camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.04);
      }
      // hold a steady flight pose while the pack does the work — never the walk
      // cycle, even when the stick is pushed to steer. the forward lean below sells
      // the direction of travel instead of moving legs
      setAnim("idle");
    } else if (jumpEdge) {
      // ── discrete multi-jump ── edge-triggered so a held key/tap can't spam it
      const air = jumps.current > 0;
      jumps.current++;
      rb.setLinvel({ x: v.x, y: air ? AIR_JUMP : JUMP, z: v.z }, true);
      jumpBeep(jumps.current - 1);
      const j = built.actions.jump;
      built.actions[cur.current]?.fadeOut(0.06);
      j?.reset().setEffectiveTimeScale(air ? 1.9 : 1.5).fadeIn(0.06).play();
      cur.current = "jump";
      // launch pop — the body stretches upward as it leaps
      stretch.current = 1;
      // action-cam: punch the camera in toward the character on every air jump
      if (air && camCue.current) camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.85);
      // the stroke that crosses the threshold kicks off the jetpack with a burst
      if (jumps.current > FLY_TRIGGER) jetBurst.current++;
    }
    // airborne → jump pose, except while flying (the jetpack holds the hover pose)
    if (!grounded && jumps.current <= FLY_TRIGGER && cur.current !== "jump") cur.current = "jump";
    // touchdown absorb — squash on the frame we regain the ground with downward speed
    if (grounded && !wasGrounded.current && v.y < -2) stretch.current = -1;
    wasGrounded.current = grounded;
    // pack deploys once we're flying (past the trigger), retracts on landing
    flying.current = jumps.current > FLY_TRIGGER;

    // ── tower checkpoints ──
    // ratchet to the highest landing pad we've actually touched down on
    if (grounded) {
      for (const cp of checkpoints) {
        if (Math.hypot(t.x - cp.x, t.z - cp.z) < cp.r + 0.7 && Math.abs(t.y - cp.y) < 1.8) {
          if (!lastCp.current || cp.y > lastCp.current.y) lastCp.current = { x: cp.x, y: cp.y, z: cp.z };
        }
      }
    }
    // a fall well below the last checkpoint sets us back onto it — never the bottom
    const cp = lastCp.current;
    if (cp && t.y < cp.y - 6) {
      rb.setTranslation({ x: cp.x, y: cp.y + 1.3, z: cp.z }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      jumps.current = 0;
      if (camCue.current) camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.5);
    }

    // ── under-terrain safety net ──
    // a trimesh ground collider can let a fast/steep capsule tunnel through and
    // drop "under-earth" (worst on Ember's spires). If our centre ever ends up
    // below the surface height at our (x,z), lift back onto it. Read a fresh
    // translation so this doesn't double-fire after a checkpoint rescue above.
    const p = rb.translation();
    const floorY = terrainHeight(p.x, p.z, shape);
    const FEET = 1.0; // capsule half-height (0.55) + radius (0.45)
    if (p.y < floorY - 0.1) {
      rb.setTranslation({ x: p.x, y: floorY + FEET + 0.05, z: p.z }, true);
      const lv = rb.linvel();
      rb.setLinvel({ x: lv.x, y: Math.max(0, lv.y), z: lv.z }, true);
      ground.current = Math.max(ground.current, 1);
    }

    // hand the camera the live movement state so it can smart-follow the player
    if (camCue.current) {
      const lv = rb.linvel();
      camCue.current.heading = heading.current;
      camCue.current.speed = Math.hypot(lv.x, lv.z);
      camCue.current.moving = len > 0;
    }

    // ── procedural body polish ──
    // forward lean + bank while flying so steering reads visually (the legs stay
    // still in the hover pose); decays to upright the instant we touch down
    const lv2 = rb.linvel();
    const hspeed = Math.hypot(lv2.x, lv2.z);
    const tgtLeanX = flyingMode ? Math.min(0.5, hspeed * 0.03) : 0;
    const tgtLeanZ = flyingMode ? Math.max(-0.35, Math.min(0.35, -ax * 0.35)) : 0;
    const ls = 1 - Math.exp(-10 * dt);
    leanX.current += (tgtLeanX - leanX.current) * ls;
    leanZ.current += (tgtLeanZ - leanZ.current) * ls;
    // squash-&-stretch impulse eases back to neutral
    stretch.current += (0 - stretch.current) * (1 - Math.exp(-9 * dt));
    if (inner.current) {
      inner.current.rotation.set(leanX.current, heading.current, leanZ.current);
      const s = stretch.current;
      inner.current.scale.set(1 - s * 0.12, 1 + s * 0.18, 1 - s * 0.12);
    }

    let next: NearTarget = null;
    if (!matchActive) {
      const dTrain = Math.hypot(t.x - TRAIN_PAD[0], t.z - TRAIN_PAD[2]);
      const dArena = Math.hypot(t.x - ARENA[0], t.z - ARENA[2]);
      const dGuardian = Math.hypot(t.x - GUARDIAN_PAD[0], t.z - GUARDIAN_PAD[2]);
      if (ownedKey && dTrain < 3.6) next = { kind: "train", key: ownedKey };
      else if (dGuardian < 3.6) next = { kind: "guardian" };
      else if (dArena < 6.5) next = { kind: "arena" };
      // perched-agent challenge: nearest awaiting agent within reach (full 3D,
      // so you must actually climb up to it), only when you own a champion
      if (!next && ownedKey) {
        let best: { key: string; name: string } | null = null;
        let bestD = 3.0;
        for (const ct of challengeTargets) {
          const d = Math.hypot(t.x - ct.pos.x, t.y - ct.pos.y, t.z - ct.pos.z);
          if (d < bestD) { bestD = d; best = { key: ct.key, name: ct.name }; }
        }
        if (best) next = { kind: "challenge", key: best.key, name: best.name };
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(near.current)) {
      near.current = next;
      onNear(next);
    }

    // report altitude to the HUD (throttled by time + change)
    if (onAltitude) {
      altAccum.current += dt;
      if (altAccum.current > 0.12 && Math.abs(t.y - altLast.current) > 0.2) {
        altAccum.current = 0;
        altLast.current = t.y;
        onAltitude(t.y);
      }
    }
  });

  return (
    <>
      <TrainPad />
      <RigidBody
        ref={body}
        type="dynamic"
        colliders={false}
        position={[SPAWN[0], 2.5, SPAWN[2]]}
        enabledRotations={[false, false, false]}
        canSleep={false}
        ccd
      >
        <CapsuleCollider args={[0.55, 0.45]} />
        <CuboidCollider
          args={[0.3, 0.2, 0.3]}
          position={[0, -0.95, 0]}
          sensor
          onIntersectionEnter={() => { ground.current++; }}
          onIntersectionExit={() => { ground.current = Math.max(0, ground.current - 1); }}
        />
        <group ref={inner} position={[0, -1.0, 0]}>
          <primitive object={built.root} />
          <Jetpack h={built.h} flyingRef={flying} burstRef={jetBurst} />
        </group>
        {/* ground ring stays flat & upright — outside the leaning/squashing body group */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.96, 0]}>
          <ringGeometry args={[0.6, 0.72, 40]} />
          <meshBasicMaterial color="#39e0ff" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </RigidBody>
    </>
  );
}

// orbit-drag + wheel-zoom third-person camera; cinematic director during a bout
function CameraController({ match, handlerPos, camCue, camDrag }: { match: MatchView | null; handlerPos: React.RefObject<THREE.Vector3>; camCue: React.RefObject<CamCue>; camDrag: React.RefObject<CamDrag> }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0.34);
  const dist = useRef(20);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const dirYaw = useRef(0);
  const tmp = useRef(new THREE.Vector3());
  // when the user last steered with the mouse — auto-follow stays out of the way for a beat after
  const lastInput = useRef(-9999);
  // speed-driven dolly-back, eased so the pull-out/in feels smooth
  const followDist = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { dragging.current = false; };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= (e.clientX - last.current.x) * 0.005;
      pitch.current = Math.min(1.25, Math.max(0.12, pitch.current - (e.clientY - last.current.y) * 0.004));
      last.current = { x: e.clientX, y: e.clientY };
      lastInput.current = performance.now();
    };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); dist.current = Math.min(34, Math.max(6, dist.current + e.deltaY * 0.012)); lastInput.current = performance.now(); };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    if (match) {
      dirYaw.current += 0.003;
      const tx = ARENA[0], ty = 1.6, tz = ARENA[2];
      const cx = tx + Math.sin(dirYaw.current) * 9;
      const cz = tz + Math.cos(dirYaw.current) * 9;
      camera.position.lerp(tmp.current.set(cx, 4.4, cz), 0.04);
      camera.lookAt(tx, ty, tz);
      return;
    }
    // drain touch orbit / pinch deltas accumulated by the on-screen look pad
    const drag = camDrag.current;
    if (drag && (drag.dx || drag.dy || drag.pinch)) {
      yaw.current -= drag.dx * 0.005;
      pitch.current = Math.min(1.25, Math.max(0.12, pitch.current - drag.dy * 0.004));
      if (drag.pinch) dist.current = Math.min(34, Math.max(6, dist.current - drag.pinch * 0.02));
      drag.dx = 0; drag.dy = 0; drag.pinch = 0;
      lastInput.current = performance.now();
    }

    const hp = handlerPos.current;
    const cue = camCue.current;
    const zoom = cue ? cue.zoom : 0;
    if (cue) cue.zoom *= 0.86; // ease the punch back out

    const speed = cue ? cue.speed : 0;
    const moving = cue ? cue.moving : false;
    const speed01 = Math.min(1, speed / RUN); // 0 = still, 1 = full sprint

    // smart-follow: gently swing the orbit behind the player's heading while
    // they move — but only once the mouse has been idle for a beat, so manual
    // steering always wins. Faster movement → a touch more eagerness.
    if (cue && moving && performance.now() - lastInput.current > 900) {
      let d = cue.heading + Math.PI - yaw.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw.current += d * Math.min(1, dt * (1.4 + speed01 * 2.4));
    }

    // characteristic speed feel: dolly back as you accelerate, ease in as you stop
    followDist.current += (speed01 * 6 - followDist.current) * Math.min(1, dt * 4);
    const eff = Math.max(5, dist.current + followDist.current - zoom * 6);

    // playful sway — a lazy lateral drift + bob that grows with speed so the
    // camera always feels alive (lookAt stays locked on the player, so it reads
    // as a handheld float rather than nausea)
    const ts = performance.now() * 0.001;
    const swayX = Math.sin(ts * 0.9) * (0.18 + speed01 * 0.7);
    const swayY = Math.sin(ts * 1.7) * (0.1 + speed01 * 0.28);

    const tx = hp.x, ty = hp.y + 0.4 + zoom * 0.3, tz = hp.z;
    const cx = tx + Math.sin(yaw.current) * Math.cos(pitch.current) * eff + swayX;
    const cz = tz + Math.cos(yaw.current) * Math.cos(pitch.current) * eff;
    const cy = ty + Math.sin(pitch.current) * eff + swayY;
    // snap in faster than it eases out, for a punchy action-cam
    camera.position.lerp(tmp.current.set(cx, cy, cz), zoom > 0.05 ? 0.3 : 0.12);
    camera.lookAt(tx, ty, tz);

    // dynamic FOV whoosh: widen while sprinting / punching in, settle back at rest
    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = 52 + speed01 * 10 + zoom * 6;
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

// ── on-screen touch controls (mobile) ─────────────────────────────────
// left half = floating analog stick (move), right half = drag-to-look +
// two-finger pinch-to-zoom, plus jump / sprint buttons bottom-right.
function touchBtnStyle(size: number): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid",
    fontFamily: "var(--font-mono), monospace",
    fontWeight: 700,
    letterSpacing: 1,
    display: "grid",
    placeItems: "center",
    touchAction: "none",
    backdropFilter: "blur(3px)",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
  };
}

function TouchControls({ active, move, btn, cam }: {
  active: boolean;
  move: React.RefObject<TouchMove>;
  btn: React.RefObject<TouchBtn>;
  cam: React.RefObject<CamDrag>;
}) {
  const R = 56; // stick radius in px
  const joyId = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number } | null>(null);
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprint, setSprint] = useState(false);
  const look = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchPrev = useRef(0);

  // fully release input when controls get disabled (overlay / match)
  useEffect(() => {
    if (active) return;
    joyId.current = null;
    joyOrigin.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    setSprint(false);
    if (move.current) { move.current.x = 0; move.current.y = 0; }
    if (btn.current) { btn.current.sprint = false; btn.current.jumpHeld = false; }
    look.current.clear();
    pinchPrev.current = 0;
  }, [active, move, btn]);

  if (!active) return null;

  const joyDown = (e: ReactPointerEvent) => {
    if (joyId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    joyId.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setBase({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
  };
  const joyMove = (e: ReactPointerEvent) => {
    if (joyId.current !== e.pointerId || !joyOrigin.current) return;
    let dx = e.clientX - joyOrigin.current.x;
    let dy = e.clientY - joyOrigin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy });
    if (move.current) { move.current.x = dx / R; move.current.y = -dy / R; }
  };
  const joyEnd = (e: ReactPointerEvent) => {
    if (joyId.current !== e.pointerId) return;
    joyId.current = null;
    joyOrigin.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    if (move.current) { move.current.x = 0; move.current.y = 0; }
  };

  const lookDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    look.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (look.current.size === 2) {
      const [a, b] = [...look.current.values()];
      pinchPrev.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const lookMove = (e: ReactPointerEvent) => {
    const prev = look.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (look.current.size >= 2) {
      look.current.set(e.pointerId, cur);
      const [a, b] = [...look.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchPrev.current && cam.current) cam.current.pinch += d - pinchPrev.current;
      pinchPrev.current = d;
    } else {
      if (cam.current) { cam.current.dx += cur.x - prev.x; cam.current.dy += cur.y - prev.y; }
      look.current.set(e.pointerId, cur);
    }
  };
  const lookEnd = (e: ReactPointerEvent) => {
    look.current.delete(e.pointerId);
    if (look.current.size < 2) pinchPrev.current = 0;
  };

  const tapJump = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (btn.current) { btn.current.jump++; btn.current.jumpHeld = true; }
  };
  const releaseJump = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.current) btn.current.jumpHeld = false;
  };
  const toggleSprint = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSprint((s) => {
      const n = !s;
      if (btn.current) btn.current.sprint = n;
      return n;
    });
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}>
      <div
        onPointerDown={joyDown}
        onPointerMove={joyMove}
        onPointerUp={joyEnd}
        onPointerCancel={joyEnd}
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", pointerEvents: "auto", touchAction: "none" }}
      />
      <div
        onPointerDown={lookDown}
        onPointerMove={lookMove}
        onPointerUp={lookEnd}
        onPointerCancel={lookEnd}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", pointerEvents: "auto", touchAction: "none" }}
      />

      {base && (
        <div style={{ position: "fixed", left: base.x, top: base.y, width: 0, height: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: R * 2, height: R * 2, borderRadius: "50%", border: "2px solid rgba(255,255,255,.22)", background: "rgba(10,8,20,.28)", backdropFilter: "blur(2px)", transform: "translate(-50%,-50%)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 50, height: 50, borderRadius: "50%", background: "rgba(57,224,255,.55)", boxShadow: "0 0 18px rgba(57,224,255,.6)", border: "2px solid rgba(255,255,255,.5)", transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
        </div>
      )}

      <div style={{ position: "absolute", right: 22, bottom: 34, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", pointerEvents: "none" }}>
        <button onPointerDown={toggleSprint} aria-label="Sprint" style={{ ...touchBtnStyle(58), pointerEvents: "auto", fontSize: 22, background: sprint ? "rgba(240,169,58,.85)" : "rgba(20,18,31,.55)", borderColor: sprint ? "#f0a93a" : "rgba(255,255,255,.28)", color: sprint ? "#0a0810" : "#f2eefb" }}>»</button>
        <button onPointerDown={tapJump} onPointerUp={releaseJump} onPointerCancel={releaseJump} onPointerLeave={releaseJump} aria-label="Jump" style={{ ...touchBtnStyle(78), pointerEvents: "auto", fontSize: 13, background: "rgba(57,224,255,.16)", borderColor: "rgba(57,224,255,.7)", color: "#aeefff" }}>JUMP</button>
      </div>
    </div>
  );
}
