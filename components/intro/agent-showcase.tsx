"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";

// minimal shape we touch on the OrbitControls instance (avoids a three-stdlib import)
type Controls = { enabled: boolean; target: THREE.Vector3; update: () => void };
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { ChampionMesh } from "@/components/grounds/champion-mesh";
import { BiomeBackdrop } from "@/components/grounds/biome-backdrop";
import { biomeById } from "@/components/grounds/biomes";

type Gesture = "idle" | "wave" | "punch" | "jump";

// Cinematic intro stage. Renders the real game character(s) and choreographs an
// action so every narrative beat shows an agent *doing* something — not posing.
export default function AgentShowcase({
  champion,
  type,
  scale = 1,
  gesture = "idle",
  everyMs,
  spin = false,
  dolly = false,
  rival,
  colorHex,
  autoFrame = false,
  interactive = false,
  bare = false,
  framingKey,
  biomeId,
}: {
  champion: Champion;
  type: CreatureType;
  scale?: number;
  /** one-shot gesture replayed on an interval (solo scenes) */
  gesture?: Gesture;
  everyMs?: number;
  /** slow turntable rotation (showcase feel) */
  spin?: boolean;
  /** camera push-in on mount (the "awakening") */
  dolly?: boolean;
  /** when set, stages a self-running duel: hero (champion) vs rival */
  rival?: { champion: Champion; type: CreatureType };
  /** override force tint — e.g. pitch hero in canon gold instead of type hex */
  colorHex?: string;
  /** measure the built figure and frame it: vertically centred, pulled back so it
   *  NEVER overflows the container, while preserving relative size between minds.
   *  Used by the character-select stage where bodies vary wildly in height. */
  autoFrame?: boolean;
  /** let the player orbit + zoom the figure (drag to rotate, wheel/pinch to zoom).
   *  The camera auto-frames each new champion, then hands control to the player. */
  interactive?: boolean;
  /** drop the detached floating constructs (aura shards, archetype motes, tier
   *  rings) that don't follow the skeleton — keep only the body + crown. */
  bare?: boolean;
  /** changes → re-frame the camera on the new champion (then the player is free). */
  framingKey?: string | number;
  /** when set, renders a static slice of that game world behind the figure
   *  (sky + terrain + nature kit) so the beat reads as a real place. */
  biomeId?: string;
}) {
  const rim = colorHex ?? TYPE_COLOR[type];
  const biome = biomeId ? biomeById(biomeId) : null;
  const rim2 = rival ? TYPE_COLOR[rival.type] : null;
  const duel = !!rival;
  // These champions carry oversized heads/auras, so frame loose enough to keep
  // the whole silhouette (feet to crown) in view.
  const camY = duel ? 1.9 : 1.7;
  const camZ = duel ? 13 : 9.6;
  const lookY = duel ? 1.3 : 1.4;
  const doFit = autoFrame && !duel;
  const orbit = interactive && doFit;
  // shared target the measurer writes and the camera rig eases toward
  const fitRef = useRef<{ y: number; dist: number }>({ y: lookY, dist: camZ });
  const controlsRef = useRef<Controls | null>(null);
  // re-frame the camera whenever the shown champion changes
  const reframe = useRef(true);
  useEffect(() => {
    reframe.current = true;
  }, [framingKey]);

  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ position: [0, camY, camZ], fov: 32 }} gl={{ antialias: true }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={[biome ? biome.bg : "#0a0813"]} />
      {/* the world's own fog is tuned for a far overhead camera; for this close,
          eye-level framing we pull it in so distant hills + scattered props melt
          into atmospheric haze (depth, and no detached-looking specks on the rim),
          while always clearing the figure(s) in front. */}
      <fog attach="fog" args={biome ? [biome.fog.color, camZ + 2, camZ + 50] : ["#0a0813", 11, 24]} />
      {!orbit && <CamRig lookY={lookY} camY={camY} camZ={camZ} dolly={dolly} autoFrame={doFit} fitRef={fitRef} />}
      {biome ? (
        <>
          <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt * 1.5]} />
          <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt * 1.9} />
          <directionalLight position={[18, 30, 12]} intensity={biome.lights.sunInt} color={biome.lights.sun} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#b9a7ff", "#160f2c", 0.7]} />
          <directionalLight position={[5, 8, 4]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        </>
      )}
      <pointLight position={[-5, 3, -3]} intensity={55} color={rim} distance={22} />
      <pointLight position={[4, 1.5, 5]} intensity={22} color="#ffffff" distance={20} />
      {rim2 && <pointLight position={[5, 3, -3]} intensity={48} color={rim2} distance={22} />}
      <Suspense fallback={null}>
        {biome && <BiomeBackdrop biomeId={biomeId!} />}
        {duel ? (
          <Duel hero={{ champion, type }} rival={rival!} scale={scale} />
        ) : (
          <Spin enabled={spin}>
            <FitMeasure enabled={doFit} fitRef={fitRef} baseZ={camZ} maxFrac={0.8} orbit={orbit} reframe={reframe} controlsRef={controlsRef}>
              <Solo champion={champion} type={type} scale={scale} gesture={gesture} everyMs={everyMs} colorHex={colorHex} bare={bare} />
            </FitMeasure>
          </Spin>
        )}
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={(duel ? 12 : 9) * Math.max(scale, 0.6)} blur={2.6} far={5} resolution={512} color="#000000" />
      </Suspense>
      {orbit && (
        <OrbitControls
          ref={controlsRef as never}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.09}
          rotateSpeed={0.9}
          zoomSpeed={0.9}
          minDistance={camZ * 0.4}
          maxDistance={camZ * 2.6}
          minPolarAngle={0.18}
          maxPolarAngle={Math.PI * 0.92}
        />
      )}
    </Canvas>
  );
}

function CamRig({ lookY, camY, camZ, dolly, autoFrame, fitRef }: { lookY: number; camY: number; camZ: number; dolly: boolean; autoFrame?: boolean; fitRef?: React.MutableRefObject<{ y: number; dist: number }> }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const fromZ = camZ + 4.5;
  useFrame((state, dt) => {
    if (autoFrame && fitRef) {
      // ease toward the measured frame so a body-swap glides rather than snaps
      const a = 1 - Math.pow(0.0015, dt);
      const ty = fitRef.current.y;
      const tz = fitRef.current.dist;
      camera.position.x += (0 - camera.position.x) * a;
      camera.position.y += (ty - camera.position.y) * a;
      camera.position.z += (tz - camera.position.z) * a;
      camera.lookAt(0, ty, 0);
      return;
    }
    if (!dolly) {
      camera.position.set(0, camY, camZ);
      camera.lookAt(0, lookY, 0);
      return;
    }
    if (start.current == null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / 1.7);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.set(0, camY, fromZ - (fromZ - camZ) * e);
    camera.lookAt(0, lookY, 0);
  });
  return null;
}

// Measures the live figure's bounding box and resolves a camera frame that keeps
// the whole silhouette inside the viewport with margin. baseZ is the floor (we
// never dolly closer than the canonical distance, so a small mind stays visibly
// small); a tall mind only pushes the camera further back — so relative heights
// read true while nothing ever clips the container.
function FitMeasure({
  enabled,
  fitRef,
  baseZ,
  maxFrac,
  orbit = false,
  reframe,
  controlsRef,
  children,
}: {
  enabled: boolean;
  fitRef: React.MutableRefObject<{ y: number; dist: number }>;
  baseZ: number;
  maxFrac: number;
  /** when true, only re-frame on champion swap; the player drives the camera after */
  orbit?: boolean;
  reframe?: React.MutableRefObject<boolean>;
  controlsRef?: React.MutableRefObject<Controls | null>;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const box = useRef(new THREE.Box3());
  const size = useRef(new THREE.Vector3());
  const ctr = useRef(new THREE.Vector3());
  const tick = useRef(0);
  const { camera, size: vp } = useThree();
  useFrame((_, dt) => {
    if (!enabled || !g.current) return;
    // remeasure a few times a second — the idle clip jostles the bbox slightly
    if (tick.current++ % 8 === 0) {
      box.current.setFromObject(g.current);
      if (!box.current.isEmpty() && isFinite(box.current.min.y)) {
        box.current.getSize(size.current);
        box.current.getCenter(ctr.current);
        const cam = camera as THREE.PerspectiveCamera;
        const tanV = Math.tan(((cam.fov || 32) * Math.PI) / 180 / 2);
        const aspect = cam.aspect || vp.width / Math.max(1, vp.height);
        // distance at which the figure fills `maxFrac` of the frame, on whichever
        // axis binds first (tall figures bind on Y, wide ones on X)
        const distV = size.current.y / 2 / (tanV * maxFrac);
        const distH = size.current.x / 2 / (tanV * aspect * maxFrac);
        fitRef.current.y = ctr.current.y;
        fitRef.current.dist = Math.max(baseZ, distV, distH);
      }
    }
    // orbit mode: ease to the measured frame once per champion, then hand the
    // camera to OrbitControls (suspend its input while we re-frame so they don't fight)
    if (orbit && reframe?.current && controlsRef?.current) {
      const c = controlsRef.current;
      c.enabled = false;
      const ty = fitRef.current.y;
      const tz = fitRef.current.dist;
      const a = 1 - Math.pow(0.0008, dt);
      camera.position.x += (0 - camera.position.x) * a;
      camera.position.y += (ty - camera.position.y) * a;
      camera.position.z += (tz - camera.position.z) * a;
      c.target.x += (0 - c.target.x) * a;
      c.target.y += (ty - c.target.y) * a;
      c.target.z += (0 - c.target.z) * a;
      c.update();
      if (Math.abs(camera.position.z - tz) < 0.06 && Math.abs(c.target.y - ty) < 0.04) {
        c.enabled = true;
        reframe.current = false;
      }
    }
  });
  return <group ref={g}>{children}</group>;
}

function Spin({ children, enabled, speed = 0.32 }: { children: React.ReactNode; enabled?: boolean; speed?: number }) {
  const r = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (enabled && r.current) r.current.rotation.y += dt * speed;
  });
  return <group ref={r}>{children}</group>;
}

function Solo({ champion, type, scale, gesture, everyMs, colorHex, bare = false }: { champion: Champion; type: CreatureType; scale: number; gesture: Gesture; everyMs?: number; colorHex?: string; bare?: boolean }) {
  const [sig, setSig] = useState(0);
  useEffect(() => {
    if (gesture === "idle") return;
    const first = setTimeout(() => setSig((s) => s + 1), 800);
    if (!everyMs) return () => clearTimeout(first);
    const id = setInterval(() => setSig((s) => s + 1), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [gesture, everyMs]);
  return (
    <group scale={scale}>
      <ChampionMesh type={type} champion={champion} position={[0, 0, 0]} showLabel={false} actSignal={sig} actName={gesture === "idle" ? "wave" : gesture} baseColorOverride={colorHex} hideFloaters={bare} />
    </group>
  );
}

// A short, looping choreography where the hero presses the advantage and wins —
// the player's first taste of a fight without any input.
function Duel({ hero, rival, scale }: { hero: { champion: Champion; type: CreatureType }; rival: { champion: Champion; type: CreatureType }; scale: number }) {
  const [s, setS] = useState({ pa: 0, pb: 0, ha: 0, hb: 0, hpA: 1, hpB: 1 });
  useEffect(() => {
    // hero swing → rival reels → rival counters → hero shrugs it → hero finishes.
    const steps: ((p: typeof s) => typeof s)[] = [
      (p) => ({ ...p, hpA: 1, hpB: 1 }),
      (p) => ({ ...p, pa: p.pa + 1 }),
      (p) => ({ ...p, hb: p.hb + 1, hpB: 0.68 }),
      (p) => ({ ...p, pb: p.pb + 1 }),
      (p) => ({ ...p, ha: p.ha + 1, hpA: 0.82 }),
      (p) => ({ ...p, pa: p.pa + 1 }),
      (p) => ({ ...p, hb: p.hb + 1, hpB: 0.34 }),
      (p) => ({ ...p, pa: p.pa + 1 }),
      (p) => ({ ...p, hb: p.hb + 1, hpB: 0.1 }),
    ];
    let i = 0;
    const tick = () => {
      setS((p) => steps[i % steps.length](p));
      i++;
    };
    const first = setTimeout(tick, 600);
    const id = setInterval(tick, 1050);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const off = 1.55;
  return (
    <>
      <group position={[-off, 0, 0]} scale={scale}>
        <ChampionMesh type={hero.type} champion={hero.champion} position={[0, 0, 0]} rotation={Math.PI / 2} showLabel={false} punchSignal={s.pa} hitSignal={s.ha} hpFrac={s.hpA} />
      </group>
      <group position={[off, 0, 0]} scale={scale}>
        <ChampionMesh type={rival.type} champion={rival.champion} position={[0, 0, 0]} rotation={-Math.PI / 2} showLabel={false} punchSignal={s.pb} hitSignal={s.hb} hpFrac={s.hpB} />
      </group>
    </>
  );
}
