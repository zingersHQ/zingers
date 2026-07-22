"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Infinite flight hero — shared homepage face for desktop `/` and `/ascent` splash.
// Front camera on the Trainer + champion in a continuous glide (layered soft
// lift, no hard thrust beats) over scrolling Grounds-style rolling terrain.
// No floating islands — hills and montículos they actually fly over.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { RobotPilot } from "@/components/grounds/flying-cast";
import { ChampionMesh, CHAMPION_REL_TO_TRAINER, READER_SCALE } from "@/components/grounds/champion-mesh";
import { NatureSurfaceDressing } from "@/components/grounds/nature";
import { RenderBoundary } from "@/components/grounds/render-guard";
import { biomeById, daylightBiome, type BiomeConfig } from "@/components/grounds/biomes";
import { usePrefersReducedMotion } from "@/components/arena/juice";
import { showcaseChampion } from "@/lib/render/showcase";
import { naturePreset, natureUrl, natureTerrainPalette } from "@/lib/render/nature-kit";
import { FlightHeroPoster } from "@/components/home/flight-hero-poster";

const HERO = showcaseChampion("MUSE");
/** Soft daylight Grounds — same nature kit as the live region. */
const BIOME_ID = "colosseum";

const CHAR_SCALE = READER_SCALE * 1.35;
const PAIR_SCALE = 0.42;

// Seamless scroll length for the terrain belt under the flyers.
const LOOP = 96;
const GROUND_SPEED = 6.4;
const CLOUD_SPEED = 1.1;
const MOTE_SPEED = 5.5;

/** Cruise height above world origin — clears tree canopy on the terrain belt. */
const CRUISE_Y = 4.15;

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

/** Soft jet cadence — denser on lift, never a hard metronome. */
function JetPuff({
  burstRef,
  intensityRef,
}: {
  burstRef: React.RefObject<number>;
  intensityRef: React.RefObject<number>;
}) {
  const acc = useRef(0);
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const inten = Math.max(0.15, intensityRef.current);
    // Interval wanders ~55–110ms so puffs don't lock to a beat.
    const interval = 0.11 - inten * 0.055;
    acc.current += dt;
    if (acc.current > interval) {
      acc.current = 0;
      burstRef.current += 1;
    }
  });
  return null;
}

/** Soft rolling hills + montículos for the hero strip (mostly flat new world). */
function heroHeight(x: number, z: number, seed: number): number {
  const n = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7 + seed * 17.3) * 43758.5453;
    return s - Math.floor(s);
  };
  const vn = (a: number, b: number) => {
    const xi = Math.floor(a);
    const zi = Math.floor(b);
    const xf = a - xi;
    const zf = b - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    const x1 = n(xi, zi) * (1 - u) + n(xi + 1, zi) * u;
    const x2 = n(xi, zi + 1) * (1 - u) + n(xi + 1, zi + 1) * u;
    return x1 * (1 - v) + x2 * v;
  };
  const fbm = (a: number, b: number) => {
    let amp = 0.5;
    let f = 1;
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      sum += vn(a * f, b * f) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  };
  const rolling = fbm(x * 0.035 + 3, z * 0.035 + 3) * 2.4;
  const hills = fbm(x * 0.07 - 5, z * 0.07 - 5) * 1.35;
  // small montículos — sparse bumps
  const bump = Math.max(0, fbm(x * 0.16 + 11, z * 0.16 + 11) - 0.58) * 2.6;
  return Math.max(0, rolling + hills * 0.85 + bump);
}

function FlightPair({ reduceMotion, animate }: { reduceMotion: boolean; animate: boolean }) {
  const grp = useRef<THREE.Group>(null);
  const flyingRef = useRef(true);
  const burstRef = useRef(0);
  const intensityRef = useRef(0.55);
  const alt = useRef(CRUISE_Y);
  const pitch = useRef(0.1);
  const bank = useRef(0);
  const sway = useRef(0);
  const zOff = useRef(0.35);

  const cFly = useRef(true);
  const cMove = useRef(true);
  const cSpd = useRef(2.8);
  const cRun = useRef(false);
  const cVel = useRef(new THREE.Vector3(0, 0.25, 2.8));
  const cHead = useRef(0);
  const drive = useMemo(
    () => ({ flyingRef: cFly, movingRef: cMove, speedRef: cSpd, runRef: cRun, velRef: cVel, headingRef: cHead }),
    [],
  );

  useFrame((s, dtRaw) => {
    const g = grp.current;
    if (!g) return;
    const dt = Math.min(0.05, dtRaw);

    // Continuous flight pose — never hard on/off (that read as jump beats).
    flyingRef.current = true;
    cFly.current = true;

    // Frozen first-frame / reduced-motion: hold the opening cruise pose.
    if (reduceMotion || !animate) {
      intensityRef.current = 0.4;
      alt.current = CRUISE_Y;
      pitch.current = 0.1;
      bank.current = 0;
      sway.current = 0;
      zOff.current = 0.35;
      g.position.set(0, CRUISE_Y, 0.35);
      g.rotation.set(0.1, 0, 0);
      return;
    }

    const t = s.clock.elapsedTime;

    // Layered, incommensurate periods so the path never loops as a metronome.
    // Soft lift lobes (not binary thrust) + slow wander + micro bob.
    const liftA = 0.5 + 0.5 * Math.sin(t * 0.48 + Math.sin(t * 0.11) * 0.7);
    const liftB = 0.5 + 0.5 * Math.sin(t * 0.31 + 1.7 + Math.sin(t * 0.07) * 0.9);
    const lift = Math.pow(liftA, 1.65) * 0.55 + Math.pow(liftB, 2.1) * 0.35;
    const wander = Math.sin(t * 0.19 + 0.4) * 0.28 + Math.sin(t * 0.09) * 0.18;
    const micro = Math.sin(t * 1.7 + Math.sin(t * 0.37) * 1.2) * 0.06;
    const wantAlt = CRUISE_Y + wander + lift * 0.62 + micro;

    // Pitch follows vertical intent softly — slight nose-up on lift, never a snap.
    const vertIntent = (wantAlt - alt.current) * 1.8 + Math.sin(t * 0.55) * 0.02;
    const wantPitch = THREE.MathUtils.clamp(0.08 + vertIntent * 0.12 + lift * 0.06, -0.06, 0.2);
    const wantBank =
      Math.sin(t * 0.33 + 0.6) * 0.05 + Math.sin(t * 0.17) * 0.03 + Math.sin(t * 0.71) * 0.015;
    const wantSway = Math.sin(t * 0.27) * 0.16 + Math.sin(t * 0.43 + 1.1) * 0.07;
    const wantZ = 0.3 + Math.sin(t * 0.38 + 0.2) * 0.1 + Math.sin(t * 0.14) * 0.05;

    // Heavy damping — glide, not chase.
    const kPos = 1 - Math.exp(-1.55 * dt);
    const kRot = 1 - Math.exp(-1.9 * dt);
    alt.current += (wantAlt - alt.current) * kPos;
    sway.current += (wantSway - sway.current) * kPos;
    zOff.current += (wantZ - zOff.current) * kPos;
    pitch.current += (wantPitch - pitch.current) * kRot;
    bank.current += (wantBank - bank.current) * kRot;

    intensityRef.current = 0.35 + lift * 0.55;
    cVel.current.set(sway.current * 0.4, vertIntent * 0.35, 2.6 + lift * 0.35);
    cSpd.current = 2.5 + lift * 0.4;

    g.position.set(sway.current, alt.current, zOff.current);
    g.rotation.set(pitch.current, 0, bank.current);
  });

  return (
    <group ref={grp} scale={PAIR_SCALE}>
      <JetPuff burstRef={burstRef} intensityRef={intensityRef} />
      {/* Face the camera (+Z): front-on flight over the world. */}
      <group position={[-0.55, 0, 0]}>
        <RobotPilot force={HERO.type} flyingRef={flyingRef} burstRef={burstRef} faceHeading={0} scale={CHAR_SCALE} lean={0.32} />
      </group>
      <group position={[0.95, -0.18, -0.35]} scale={CHAR_SCALE * CHAMPION_REL_TO_TRAINER}>
        <ChampionMesh
          type={HERO.type}
          champion={HERO.champion}
          identityKey={HERO.key}
          position={[0, 0, 0]}
          rotation={-0.08}
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

function TerrainSegment({
  biome,
  earth,
  seed,
  width,
  length,
  segs,
  density,
}: {
  biome: BiomeConfig;
  earth: { low: string; mid: string; high: string };
  seed: number;
  width: number;
  length: number;
  segs: number;
  density: number;
}) {
  const { geo, dressPoints } = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, length, segs, Math.floor(segs * (length / width)));
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(earth.low);
    const mid = new THREE.Color(earth.mid);
    const high = new THREE.Color(earth.high);
    const c = new THREE.Color();
    const band = 4.2;
    const samples: [number, number, number][] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = heroHeight(x, z, seed);
      pos.setY(i, h);
      const t = Math.max(0, Math.min(1, h / band));
      if (t < 0.5) c.lerpColors(low, mid, t / 0.5);
      else c.lerpColors(mid, high, (t - 0.5) / 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();

    // Dress samples on a coarse grid so trees sit on the mesh, not floats.
    const step = 4.2;
    for (let z = -length * 0.45; z <= length * 0.45; z += step) {
      for (let x = -width * 0.42; x <= width * 0.42; x += step) {
        const jx = x + ((Math.abs(z * 12.3) % 2.1) - 1.05);
        const jz = z + ((Math.abs(x * 9.7) % 2.1) - 1.05);
        // Keep a clear flight corridor under the pair (centre strip).
        if (Math.abs(jx) < 3.2) continue;
        const h = heroHeight(jx, jz, seed);
        samples.push([jx, h, jz]);
      }
    }
    return { geo: g, dressPoints: samples };
  }, [earth, seed, width, length, segs]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <group>
      <mesh geometry={geo} receiveShadow={false}>
        <meshStandardMaterial
          vertexColors
          metalness={0.04}
          roughness={0.96}
          envMapIntensity={0.08}
        />
      </mesh>
      {/* Nature kit is the slow path — hills + cast paint first, trees fill in. */}
      <Suspense fallback={null}>
        <NatureSurfaceDressing biome={biome} points={dressPoints} density={density} />
      </Suspense>
    </group>
  );
}

function TerrainBelt({
  biome,
  reduceMotion,
  mobile,
  animate,
}: {
  biome: BiomeConfig;
  reduceMotion: boolean;
  mobile: boolean;
  animate: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const earth = useMemo(() => natureTerrainPalette(biome.id), [biome.id]);
  const width = mobile ? 42 : 56;
  const segs = mobile ? 28 : 40;
  const density = mobile ? 0.85 : 1;

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g || reduceMotion || !animate) return;
    const dt = Math.min(0.05, dtRaw);
    // Scroll ground toward -Z: flyers face +Z (camera), world streams past.
    g.position.z -= GROUND_SPEED * dt;
    if (g.position.z <= -LOOP) g.position.z += LOOP;
  });

  return (
    <group ref={root} position={[0, -2.85, 0]}>
      <TerrainSegment biome={biome} earth={earth} seed={biome.terrain.seed + 404} width={width} length={LOOP} segs={segs} density={density} />
      <group position={[0, 0, LOOP]}>
        <TerrainSegment biome={biome} earth={earth} seed={biome.terrain.seed + 404} width={width} length={LOOP} segs={segs} density={density} />
      </group>
    </group>
  );
}

function CloudPuffs({ reduceMotion, count, animate }: { reduceMotion: boolean; count: number; animate: boolean }) {
  const root = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    let s = 424242;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, () => ({
      x: (rnd() - 0.5) * 52,
      y: 4 + rnd() * 7,
      z: -LOOP * 0.4 + rnd() * LOOP,
      s: 1.8 + rnd() * 3.2,
      o: 0.18 + rnd() * 0.18,
    }));
  }, [count]);

  useFrame((_, dtRaw) => {
    const g = root.current;
    if (!g || reduceMotion || !animate) return;
    const dt = Math.min(0.05, dtRaw);
    g.position.z -= CLOUD_SPEED * dt;
    if (g.position.z <= -LOOP) g.position.z += LOOP;
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
        <mesh key={`d-${i}`} position={[p.x, p.y, p.z + LOOP]} scale={p.s}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#fff6e8" transparent opacity={p.o} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function DriftMotes({ accent, reduceMotion, animate }: { accent: string; reduceMotion: boolean; animate: boolean }) {
  const root = useRef<THREE.Points>(null);
  const geom = useMemo(() => {
    const n = 110;
    const arr = new Float32Array(n * 3);
    let s = 99191;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rnd() - 0.5) * 28;
      arr[i * 3 + 1] = 0.5 + rnd() * 6;
      arr[i * 3 + 2] = -LOOP * 0.4 + rnd() * LOOP;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useEffect(() => () => geom.dispose(), [geom]);

  useFrame((_, dtRaw) => {
    const pts = root.current;
    if (!pts || reduceMotion || !animate) return;
    const dt = Math.min(0.05, dtRaw);
    pts.position.z -= MOTE_SPEED * dt;
    if (pts.position.z <= -LOOP) pts.position.z += LOOP;
  });

  return (
    <points ref={root} geometry={geom}>
      <pointsMaterial
        color={accent}
        size={0.1}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function FlightWorld({
  variant,
  reduceMotion,
  animate,
  onCastReady,
}: {
  variant: Variant;
  reduceMotion: boolean;
  animate: boolean;
  onCastReady: () => void;
}) {
  const biome = useMemo(() => {
    const day = daylightBiome(biomeById(BIOME_ID));
    return {
      ...day,
      sky: { top: "#7eb6e8", bottom: "#f3c89a" },
      bg: "#e8b878",
      fog: { color: "#e8c9a0", near: 14, far: 62 },
      lights: {
        ...day.lights,
        hemiSky: "#ffe2b8",
        hemiGround: "#6a5a40",
        sun: "#ffd09a",
        sunInt: day.lights.sunInt * 1.12,
      },
    } satisfies BiomeConfig;
  }, []);

  const cloudCount = variant === "mobile" ? 8 : 14;

  return (
    <>
      <color attach="background" args={[biome.bg]} />
      <fog attach="fog" args={[biome.fog.color, biome.fog.near, biome.fog.far]} />
      <SkyDome top={biome.sky.top} bottom={biome.sky.bottom} />
      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt * 1.35]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt * 1.35} />
      <directionalLight position={[12, 26, 10]} intensity={biome.lights.sunInt} color={biome.lights.sun} />
      <pointLight position={[0.4, 1.6, 4.2]} intensity={1.6} color="#ffe0b0" distance={12} />
      {/* Cast + hills first (our models). Nature kit suspends separately inside TerrainSegment. */}
      <Suspense fallback={null}>
        <CloudPuffs reduceMotion={reduceMotion} count={cloudCount} animate={animate} />
        <TerrainBelt biome={biome} reduceMotion={reduceMotion} mobile={variant === "mobile"} animate={animate} />
        <DriftMotes accent={biome.lights.arenaPoint} reduceMotion={reduceMotion} animate={animate} />
        <FlightPair reduceMotion={reduceMotion} animate={animate} />
        <ReadyCue onReady={onCastReady} />
      </Suspense>
    </>
  );
}

{
  const kit = naturePreset(BIOME_ID);
  for (const id of [...kit.trees, ...kit.plants, ...kit.grass, ...kit.rocks]) useGLTF.preload(natureUrl(id));
}
useGLTF.preload("/models/RobotExpressive.glb");

/** Fires once the Suspense tree has drawn a frame — safe to crossfade off the poster. */
function ReadyCue({ onReady }: { onReady: () => void }) {
  const sent = useRef(false);
  useFrame(() => {
    if (sent.current) return;
    sent.current = true;
    // Wait one paint so the first GL frame is actually on screen under the poster.
    requestAnimationFrame(() => onReady());
  });
  return null;
}

export default function InfiniteFlightHero({
  variant = "desktop",
  onReady,
  showPoster = true,
  freeze = false,
}: {
  variant?: Variant;
  /** Called when the live scene has drawn — parents can drop their own poster. */
  onReady?: () => void;
  /** Still of the real first frame (captured from this scene) until WebGL is ready. */
  showPoster?: boolean;
  /** Hold the opening cruise pose (capture page / reduced-motion). */
  freeze?: boolean;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const dpr = variant === "mobile" ? 1 : ([1, 1.6] as [number, number]);
  const [castReady, setCastReady] = useState(false);
  // Animate only after the cast has painted — poster crossfades off at the same beat.
  const animate = castReady && !freeze && !reduceMotion;

  const markReady = () => {
    setCastReady(true);
    onReady?.();
  };

  return (
    <div style={{ position: "absolute", inset: 0 }} data-flight-hero-ready={castReady ? "1" : "0"}>
      {showPoster && <FlightHeroPoster visible={!castReady} priority />}
      <RenderBoundary fallback={null}>
        <Canvas
          dpr={dpr}
          shadows={false}
          frameloop="always"
          gl={{
            antialias: variant === "desktop",
            powerPreference: variant === "mobile" ? "default" : "high-performance",
            // Needed so still capture can read the real first frame off the canvas.
            preserveDrawingBuffer: true,
          }}
          // Front camera looking at the pair (they face +Z toward the lens).
          camera={{ position: [0.12, 4.55, 8.1], fov: variant === "mobile" ? 42 : 38, near: 0.1, far: 140 }}
          style={{
            pointerEvents: "none",
            width: "100%",
            height: "100%",
            opacity: castReady || !showPoster ? 1 : 0,
            transition: "opacity 0.55s ease",
          }}
          onCreated={({ camera }) => {
            camera.lookAt(0, CRUISE_Y - 0.15, 0.25);
          }}
        >
          <FlightWorld
            variant={variant}
            reduceMotion={reduceMotion || freeze}
            animate={animate}
            onCastReady={markReady}
          />
        </Canvas>
      </RenderBoundary>
    </div>
  );
}
