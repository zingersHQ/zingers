"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Infinite flight hero — shared homepage face for desktop `/` and mobile `/m`.
// The Trainer (jetpack) and champion (mind-flight) hold frame while a looping
// belt of Void Garden islands + Quaternius nature dressing streams past — the
// same models/skins used in the live Grounds, not a separate poster kit.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { RobotPilot } from "@/components/grounds/flying-cast";
import { ChampionMesh } from "@/components/grounds/champion-mesh";
import { NatureIslandDressing } from "@/components/grounds/nature";
import { RenderBoundary } from "@/components/grounds/render-guard";
import { biomeById, daylightBiome, type BiomeConfig } from "@/components/grounds/biomes";
import { usePrefersReducedMotion } from "@/components/arena/juice";
import { showcaseChampion } from "@/lib/render/showcase";
import { naturePreset, natureUrl, natureTerrainPalette } from "@/lib/render/nature-kit";

const HERO = showcaseChampion("MUSE");
const BIOME_ID = "void";

const CHAR_SCALE = 1.15;
const FOLLOWER_REL = 1 / 3;
const PAIR_SCALE = 0.38;

// Loop length along Z — islands wrap by this period so the belt never ends.
const LOOP = 72;
const ISLAND_SPEED = 5.2;
const CLOUD_SPEED = 1.35;
const MOTE_SPEED = 7.5;

type Variant = "desktop" | "mobile";

function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bottom) } },
        vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader:
          "varying vec3 v;uniform vec3 top;uniform vec3 bot;void main(){float h=normalize(v).y*0.5+0.5;gl_FragColor=vec4(mix(bot,top,pow(h,0.65)),1.0);}",
      }),
    [top, bottom],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} renderOrder={-2}>
      <sphereGeometry args={[280, 28, 14]} />
    </mesh>
  );
}

function JetPuff({ burstRef }: { burstRef: React.RefObject<number> }) {
  const acc = useRef(0);
  useFrame((_, dtRaw) => {
    acc.current += Math.min(0.05, dtRaw);
    if (acc.current > 0.07) {
      acc.current = 0;
      burstRef.current += 1;
    }
  });
  return null;
}

function FlightPair({ reduceMotion }: { reduceMotion: boolean }) {
  const grp = useRef<THREE.Group>(null);
  const flyingRef = useRef(true);
  const burstRef = useRef(0);

  const cFly = useRef(true);
  const cMove = useRef(true);
  const cSpd = useRef(2.4);
  const cRun = useRef(false);
  const cVel = useRef(new THREE.Vector3(0, 0, -2.4));
  const cHead = useRef(0);
  const drive = useMemo(
    () => ({ flyingRef: cFly, movingRef: cMove, speedRef: cSpd, runRef: cRun, velRef: cVel, headingRef: cHead }),
    [],
  );

  useFrame((s) => {
    const g = grp.current;
    if (!g) return;
    if (reduceMotion) {
      g.position.y = 0.08;
      g.rotation.y = -0.35;
      g.rotation.z = 0.04;
      return;
    }
    const t = s.clock.elapsedTime;
    g.position.y = 0.08 + Math.sin(t * 1.05) * 0.11;
    g.rotation.y = -0.35 + Math.sin(t * 0.28) * 0.08;
    g.rotation.z = 0.04 + Math.sin(t * 0.55) * 0.03;
  });

  return (
    <group ref={grp} position={[-0.35, 0.15, 1.1]} scale={PAIR_SCALE} rotation={[0.08, -0.35, 0.05]}>
      <JetPuff burstRef={burstRef} />
      <group position={[-0.55, 0.12, 0]}>
        <RobotPilot force={HERO.type} flyingRef={flyingRef} burstRef={burstRef} faceHeading={0} scale={CHAR_SCALE} lean={0.28} />
      </group>
      <group position={[1.05, -0.22, -0.45]} scale={CHAR_SCALE * FOLLOWER_REL}>
        <ChampionMesh
          type={HERO.type}
          champion={HERO.champion}
          identityKey={HERO.key}
          position={[0, 0, 0]}
          rotation={-0.15}
          showLabel={false}
          hideFloaters
          restPose="standing"
          breatheIntensity={0.45}
          companionDrive={drive}
          companionRenderPriority={0}
          sceneScale={1}
        />
      </group>
    </group>
  );
}

type IslandSpec = { x: number; y: number; z: number; r: number; lane: number };

function buildIslands(count: number, seed: number): IslandSpec[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: IslandSpec[] = [];
  for (let i = 0; i < count; i++) {
    const lane = i % 3;
    const x = (lane - 1) * (9 + rnd() * 4) + (rnd() - 0.5) * 3.5;
    const y = -2.2 + rnd() * 3.8 + (lane === 1 ? -0.6 : 0.4);
    const z = -LOOP * 0.45 + (i / count) * LOOP + (rnd() - 0.5) * 4;
    out.push({ x, y, z, r: 2.4 + rnd() * 2.2, lane });
  }
  return out;
}

function IslandMesh({
  biome,
  earth,
  spec,
}: {
  biome: BiomeConfig;
  earth: { low: string; mid: string; high: string };
  spec: IslandSpec;
}) {
  return (
    <group position={[spec.x, spec.y, spec.z]}>
      <mesh castShadow={false} receiveShadow={false}>
        <cylinderGeometry args={[spec.r, spec.r * 0.42, 1.35 + spec.r * 0.12, 9]} />
        <meshStandardMaterial
          color={biome.platform.a}
          emissive={biome.floatCrystal.emissive}
          emissiveIntensity={0.18}
          metalness={0.28}
          roughness={0.62}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <circleGeometry args={[spec.r * 0.92, 20]} />
        <meshStandardMaterial color={earth.mid} roughness={0.96} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[spec.r * 0.55, spec.r * 0.9, 18]} />
        <meshStandardMaterial color={earth.high} roughness={0.97} metalness={0} />
      </mesh>
    </group>
  );
}

function IslandBelt({
  biome,
  count,
  reduceMotion,
}: {
  biome: BiomeConfig;
  count: number;
  reduceMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const islands = useMemo(() => buildIslands(count, biome.terrain.seed + 91001), [biome.terrain.seed, count]);
  const earth = useMemo(() => natureTerrainPalette(biome.id), [biome.id]);
  const tops = useMemo(
    () => islands.map((it) => [it.x, it.y + 0.78, it.z] as [number, number, number]),
    [islands],
  );

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g || reduceMotion) return;
    const dt = Math.min(0.05, dtRaw);
    g.position.z += ISLAND_SPEED * dt;
    if (g.position.z >= LOOP) g.position.z -= LOOP;
  });

  // Two copies of the belt, one LOOP apart — seamless wrap when the root snaps.
  return (
    <group ref={root}>
      <IslandSegment islands={islands} tops={tops} biome={biome} earth={earth} />
      <group position={[0, 0, -LOOP]}>
        <IslandSegment islands={islands} tops={tops} biome={biome} earth={earth} />
      </group>
    </group>
  );
}

function IslandSegment({
  islands,
  tops,
  biome,
  earth,
}: {
  islands: IslandSpec[];
  tops: [number, number, number][];
  biome: BiomeConfig;
  earth: { low: string; mid: string; high: string };
}) {
  return (
    <group>
      {islands.map((spec, i) => (
        <IslandMesh key={i} biome={biome} earth={earth} spec={spec} />
      ))}
      <NatureIslandDressing biome={biome} positions={tops} />
    </group>
  );
}

function CloudPuffs({ reduceMotion, count }: { reduceMotion: boolean; count: number }) {
  const root = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    let s = 424242;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, () => ({
      x: (rnd() - 0.5) * 48,
      y: -1 + rnd() * 8,
      z: -LOOP * 0.5 + rnd() * LOOP,
      s: 1.6 + rnd() * 2.8,
      o: 0.22 + rnd() * 0.2,
    }));
  }, [count]);

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g || reduceMotion) return;
    const dt = Math.min(0.05, dtRaw);
    g.position.z += CLOUD_SPEED * dt;
    if (g.position.z >= LOOP) g.position.z -= LOOP;
  });

  return (
    <group ref={root}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={p.s}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#fff6e8" transparent opacity={p.o} depthWrite={false} />
        </mesh>
      ))}
      {puffs.map((p, i) => (
        <mesh key={`d-${i}`} position={[p.x, p.y, p.z - LOOP]} scale={p.s}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#fff6e8" transparent opacity={p.o} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function DriftMotes({ accent, reduceMotion }: { accent: string; reduceMotion: boolean }) {
  const root = useRef<THREE.Points>(null);
  const geom = useMemo(() => {
    const n = 140;
    const arr = new Float32Array(n * 3);
    let s = 99191;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rnd() - 0.5) * 36;
      arr[i * 3 + 1] = -4 + rnd() * 12;
      arr[i * 3 + 2] = -LOOP * 0.5 + rnd() * LOOP;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useEffect(() => () => geom.dispose(), [geom]);

  useFrame((_, dtRaw) => {
    const pts = root.current;
    if (!pts || reduceMotion) return;
    const dt = Math.min(0.05, dtRaw);
    pts.position.z += MOTE_SPEED * dt;
    if (pts.position.z >= LOOP) pts.position.z -= LOOP;
  });

  return (
    <points ref={root} geometry={geom}>
      <pointsMaterial
        color={accent}
        size={0.11}
        sizeAttenuation
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function FlightWorld({ variant, reduceMotion }: { variant: Variant; reduceMotion: boolean }) {
  const biome = useMemo(() => {
    const day = daylightBiome(biomeById(BIOME_ID));
    // golden-hour push on the daylight void skin (matches the flight art)
    return {
      ...day,
      sky: { top: "#7eb6e8", bottom: "#f3c89a" },
      bg: "#e8b878",
      fog: { color: "#e8c9a0", near: 18, far: 78 },
      lights: {
        ...day.lights,
        hemiSky: "#ffe2b8",
        hemiGround: "#6a5a40",
        sun: "#ffd09a",
        sunInt: day.lights.sunInt * 1.15,
      },
    } satisfies BiomeConfig;
  }, []);

  const islandCount = variant === "mobile" ? 7 : 11;
  const cloudCount = variant === "mobile" ? 10 : 16;

  return (
    <>
      <color attach="background" args={[biome.bg]} />
      <fog attach="fog" args={[biome.fog.color, biome.fog.near, biome.fog.far]} />
      <SkyDome top={biome.sky.top} bottom={biome.sky.bottom} />
      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt * 1.35]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt * 1.4} />
      <directionalLight position={[14, 22, 8]} intensity={biome.lights.sunInt} color={biome.lights.sun} />
      <pointLight position={[-1.2, -0.4, 2.2]} intensity={2.1} color="#39e0ff" distance={8} />
      <Suspense fallback={null}>
        <CloudPuffs reduceMotion={reduceMotion} count={cloudCount} />
        <IslandBelt biome={biome} count={islandCount} reduceMotion={reduceMotion} />
        <DriftMotes accent={biome.floatCrystal.emissive} reduceMotion={reduceMotion} />
        <FlightPair reduceMotion={reduceMotion} />
      </Suspense>
    </>
  );
}

// Preload island dressing (trees/plants) + shared rig — not the full Void kit.
{
  const kit = naturePreset(BIOME_ID);
  for (const id of [...kit.trees, ...kit.plants]) useGLTF.preload(natureUrl(id));
}
useGLTF.preload("/models/RobotExpressive.glb");

export default function InfiniteFlightHero({
  variant = "desktop",
}: {
  variant?: Variant;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const dpr = variant === "mobile" ? 1 : ([1, 1.6] as [number, number]);

  return (
    <RenderBoundary fallback={null}>
      <Canvas
        dpr={dpr}
        shadows={false}
        frameloop="always"
        gl={{ antialias: variant === "desktop", powerPreference: variant === "mobile" ? "default" : "high-performance" }}
        camera={{ position: [2.4, 1.35, 6.2], fov: variant === "mobile" ? 44 : 40, near: 0.1, far: 120 }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
        onCreated={({ camera }) => {
          camera.lookAt(-0.2, 0.45, -2.5);
        }}
      >
        <FlightWorld variant={variant} reduceMotion={reduceMotion} />
      </Canvas>
    </RenderBoundary>
  );
}
