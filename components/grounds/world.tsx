"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useGLTF, Environment, Lightformer } from "@react-three/drei";
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { blank } from "@/lib/evolve/progression";
import { ChampionMesh, buildCharacter, applyBoneMorph } from "./champion-mesh";
import { Terrain, Scatter, terrainHeight, PLAZA_R } from "./terrain";
import type { BiomeConfig } from "./biomes";

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

export type NearTarget = { kind: "train"; key: string } | { kind: "arena" } | null;

const ARENA: [number, number, number] = [0, 0, 0];
const TRAIN_PAD: [number, number, number] = [-15, 0, 4];
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
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  onNear: (n: NearTarget) => void;
  match: MatchView | null;
  controlsEnabled: boolean;
  biome: BiomeConfig;
}) {
  const handlerPos = useRef(new THREE.Vector3(SPAWN[0], 0, SPAWN[2]));
  const camCue = useRef<CamCue>({ zoom: 0 });
  const hs = biome.terrain.heightScale;
  return (
    <Canvas
      shadows
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

      <Suspense fallback={null}>
        <Physics gravity={[0, -22, 0]}>
          <Terrain biome={biome} />
          <PlazaFloor biome={biome} />
          <Platforms biome={biome} hs={hs} />
          <ArenaPlatform />
          <Obelisks biome={biome} hs={hs} />
          <Scatter biome={biome} />
          <Crystals biome={biome} hs={hs} />

          {match ? (
            <MatchStage champions={champions} match={match} />
          ) : (
            champions.map((c) => {
              const owned = c.key === ownedKey;
              const home = owned ? TRAIN_PAD : roamHome(c.key, champions);
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
                  worldRadius={PLAZA_R - 4}
                />
              );
            })
          )}

          <Handler controlsEnabled={controlsEnabled && !match} onNear={onNear} ownedKey={ownedKey} matchActive={!!match} handlerPos={handlerPos} camCue={camCue} />
        </Physics>

        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={biome.bloom} luminanceThreshold={0.62} luminanceSmoothing={0.28} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.22} darkness={0.6} />
        </EffectComposer>
      </Suspense>

      <CameraController match={match} handlerPos={handlerPos} camCue={camCue} />
    </Canvas>
  );
}

function ExposureSync({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

function roamHome(key: string, champions: GroundChampion[]): [number, number, number] {
  const list = champions.map((c) => c.key);
  const idx = list.indexOf(key);
  const n = Math.max(1, list.length);
  const a = (idx / n) * Math.PI * 2;
  return [Math.cos(a) * 14, 0, Math.sin(a) * 14];
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
function Platforms({ biome, hs }: { biome: BiomeConfig; hs: number }) {
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [];
    const baseA = Math.PI * 0.25;
    for (let i = 0; i < 6; i++) {
      const r = PLAZA_R + 5 + i * 3.4;
      const a = baseA + i * 0.16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const top = terrainHeight(x, z, hs) + 1.4 + i * 1.5;
      out.push({ pos: [x, top, z], size: [3.4, 0.5, 3.4], color: i % 2 ? biome.platform.a : biome.platform.b });
    }
    const lx = Math.cos(baseA + 1.1) * (PLAZA_R + 26);
    const lz = Math.sin(baseA + 1.1) * (PLAZA_R + 26);
    out.push({ pos: [lx, terrainHeight(lx, lz, hs) + 12, lz], size: [6, 0.6, 6], color: biome.platform.top });
    return out;
  }, [biome, hs]);
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

function Obelisks({ biome, hs }: { biome: BiomeConfig; hs: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = PLAZA_R + 14 + (i % 3) * 6;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        return { x, z, base: terrainHeight(x, z, hs), h: 9 + Math.random() * 8, rot: Math.random() * 6.28 };
      }),
    [hs],
  );
  return (
    <>
      {items.map((o, i) => (
        <mesh key={i} position={[o.x, o.base + o.h / 2, o.z]} rotation={[0, o.rot, 0]} castShadow>
          <coneGeometry args={[1.3, o.h, 5]} />
          <meshStandardMaterial color={biome.obelisk.color} emissive={biome.obelisk.emissive} emissiveIntensity={biome.obelisk.emissiveIntensity} metalness={0.5} roughness={0.45} envMapIntensity={1} />
        </mesh>
      ))}
    </>
  );
}

function Crystals({ biome, hs }: { biome: BiomeConfig; hs: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: 26 }, () => {
        const a = Math.random() * 6.28, r = 14 + Math.random() * 60;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        return { x, z, by: terrainHeight(x, z, hs) + 2 + Math.random() * 9, s: 0.3 + Math.random() * 0.5, spin: Math.random() * 0.02 + 0.005, ph: Math.random() * 6.28 };
      }),
    [hs],
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

const WALK = 7.6, RUN = 13.6, JUMP = 10.4, AIR_JUMP = 9.6, MAX_JUMPS = 4;

// shared one-shot channel from Handler → CameraController for action-cam cues
interface CamCue {
  zoom: number;
}

// physics-driven Handler: dynamic capsule + feet sensor for grounding
function Handler({
  controlsEnabled,
  onNear,
  ownedKey,
  matchActive,
  handlerPos,
  camCue,
}: {
  controlsEnabled: boolean;
  onNear: (n: NearTarget) => void;
  ownedKey: string | null;
  matchActive: boolean;
  handlerPos: React.RefObject<THREE.Vector3>;
  camCue: React.RefObject<CamCue>;
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
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    let mx = 0, mz = 0;
    if (controlsEnabled) {
      if (keys["KeyW"] || keys["ArrowUp"]) { mx += fwd.x; mz += fwd.z; }
      if (keys["KeyS"] || keys["ArrowDown"]) { mx -= fwd.x; mz -= fwd.z; }
      if (keys["KeyD"] || keys["ArrowRight"]) { mx += right.x; mz += right.z; }
      if (keys["KeyA"] || keys["ArrowLeft"]) { mx -= right.x; mz -= right.z; }
    }
    const len = Math.hypot(mx, mz);
    const sprint = keys["ShiftLeft"] || keys["ShiftRight"];
    const grounded = ground.current > 0;
    const v = rb.linvel();
    // refund the air-jump budget only once settled on the ground (not the frame
    // we launched), so a multi-jump isn't refunded mid-takeoff
    if (grounded && v.y <= 0.6) jumps.current = 0;

    if (len > 0) {
      const sp = sprint ? RUN : WALK;
      const tvx = (mx / len) * sp, tvz = (mz / len) * sp;
      // elastic snap toward the target velocity — punchy on the ground, lighter air control
      const k = grounded ? 0.5 : 0.22;
      rb.setLinvel({ x: v.x + (tvx - v.x) * k, y: v.y, z: v.z + (tvz - v.z) * k }, true);
      const want = Math.atan2(mx, mz);
      let d = want - heading.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading.current += d * Math.min(1, dt * 14);
      if (grounded) setAnim(sprint ? "run" : "walk");
    } else {
      // stickier stop on the ground, glide through the air
      const damp = grounded ? 0.55 : 0.92;
      rb.setLinvel({ x: v.x * damp, y: v.y, z: v.z * damp }, true);
      if (grounded) setAnim("idle");
    }

    // multi-jump (up to MAX_JUMPS) — edge-triggered so a held key can't spam it
    const space = controlsEnabled && !!keys["Space"];
    const jumpPressed = space && !prevSpace.current;
    prevSpace.current = space;
    if (jumpPressed && jumps.current < MAX_JUMPS) {
      const air = jumps.current > 0;
      jumps.current++;
      rb.setLinvel({ x: v.x, y: air ? AIR_JUMP : JUMP, z: v.z }, true);
      const j = built.actions.jump;
      built.actions[cur.current]?.fadeOut(0.06);
      j?.reset().setEffectiveTimeScale(air ? 1.9 : 1.5).fadeIn(0.06).play();
      cur.current = "jump";
      // action-cam: punch the camera in toward the character on every air jump
      if (air && camCue.current) camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.85);
    }
    if (!grounded && cur.current !== "jump") cur.current = "jump";

    if (inner.current) inner.current.rotation.y = heading.current;

    let next: NearTarget = null;
    if (!matchActive) {
      const dTrain = Math.hypot(t.x - TRAIN_PAD[0], t.z - TRAIN_PAD[2]);
      const dArena = Math.hypot(t.x - ARENA[0], t.z - ARENA[2]);
      if (ownedKey && dTrain < 3.6) next = { kind: "train", key: ownedKey };
      else if (dArena < 6.5) next = { kind: "arena" };
    }
    if (JSON.stringify(next) !== JSON.stringify(near.current)) {
      near.current = next;
      onNear(next);
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
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.6, 0.72, 40]} />
            <meshBasicMaterial color="#39e0ff" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </RigidBody>
    </>
  );
}

// orbit-drag + wheel-zoom third-person camera; cinematic director during a bout
function CameraController({ match, handlerPos, camCue }: { match: MatchView | null; handlerPos: React.RefObject<THREE.Vector3>; camCue: React.RefObject<CamCue> }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0.34);
  const dist = useRef(20);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const dirYaw = useRef(0);
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { dragging.current = false; };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= (e.clientX - last.current.x) * 0.005;
      pitch.current = Math.min(1.25, Math.max(0.12, pitch.current - (e.clientY - last.current.y) * 0.004));
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); dist.current = Math.min(34, Math.max(6, dist.current + e.deltaY * 0.012)); };
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

  useFrame(() => {
    if (match) {
      dirYaw.current += 0.003;
      const tx = ARENA[0], ty = 1.6, tz = ARENA[2];
      const cx = tx + Math.sin(dirYaw.current) * 9;
      const cz = tz + Math.cos(dirYaw.current) * 9;
      camera.position.lerp(tmp.current.set(cx, 4.4, cz), 0.04);
      camera.lookAt(tx, ty, tz);
      return;
    }
    const hp = handlerPos.current;
    const cue = camCue.current;
    const zoom = cue ? cue.zoom : 0;
    if (cue) cue.zoom *= 0.86; // ease the punch back out
    const eff = Math.max(5, dist.current - zoom * 6); // fast zoom-in toward the character
    const tx = hp.x, ty = hp.y + 0.4 + zoom * 0.3, tz = hp.z;
    const cx = tx + Math.sin(yaw.current) * Math.cos(pitch.current) * eff;
    const cz = tz + Math.cos(yaw.current) * Math.cos(pitch.current) * eff;
    const cy = ty + Math.sin(pitch.current) * eff;
    // snap in faster than it eases out, for a punchy action-cam
    camera.position.lerp(tmp.current.set(cx, cy, cz), zoom > 0.05 ? 0.3 : 0.12);
    camera.lookAt(tx, ty, tz);
  });
  return null;
}
