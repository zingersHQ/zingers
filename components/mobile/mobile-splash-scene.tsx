"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Mobile splash hero scene — the live render behind the splash copy (two-doors
// §3.2 option b): the Trainer taking wing, jetpack lit, the champion flying at
// its side. Canon-perfect (design-vision §3): the Trainer flies WITH a jetpack
// (the "character", big, in front); the champion is a mind and flies BESIDE it
// on its own (smaller — the 3D world's 1/3 proportion).
//
// Lazy-loaded by mobile-splash (ssr:false, null fallback) so the typographic
// poster paints instantly and this hydrates after — first paint stays cheap on a
// cold phone. Lean by construction: dpr 1, no shadows, two rigs, fixed camera.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { RobotPilot } from "@/components/grounds/flying-cast";
import { ChampionMesh } from "@/components/grounds/champion-mesh";
import { RenderBoundary } from "@/components/grounds/render-guard";
import { showcaseChampion } from "@/lib/render/showcase";

// a wild mind to fly beside the Trainer on the poster (a Spark champion — its
// violet reads against the splash's cyan sky). Any Force works; this is flavour.
const HERO = showcaseChampion("MUSE");

const CHAR_SCALE = 1.15;     // the Trainer/character — the hero silhouette
const FOLLOWER_REL = 1 / 3;  // the champion, at the 3D world's proportion
// Whole pair is 3× smaller on the Take flight poster (reads as sky figures, not giants).
const SPLASH_PAIR_SCALE = 1 / 3;

// steady jetpack puff cadence while the pilot hovers (a bump = one exhaust puff)
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

function Pair() {
  const grp = useRef<THREE.Group>(null);
  const flyingRef = useRef(true);
  const burstRef = useRef(0);

  // the champion's flight-pose drive (a static hover — no movement, just aloft)
  const cFly = useRef(true);
  const cMove = useRef(false);
  const cSpd = useRef(0);
  const cRun = useRef(false);
  const cVel = useRef(new THREE.Vector3());
  const cHead = useRef(0);
  const drive = useMemo(
    () => ({ flyingRef: cFly, movingRef: cMove, speedRef: cSpd, runRef: cRun, velRef: cVel, headingRef: cHead }),
    [],
  );

  // gentle life: the pair bobs on the sky and sways a touch (reduced-motion is
  // handled by the browser throttling rAF; the drift is tiny regardless).
  useFrame((s) => {
    const g = grp.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    g.position.y = Math.sin(t * 1.05) * 0.12;
    g.rotation.y = Math.sin(t * 0.32) * 0.11;
  });

  return (
    <group ref={grp} position={[0, 0.05, 0]} scale={SPLASH_PAIR_SCALE}>
      <JetPuff burstRef={burstRef} />
      {/* the Trainer (the character) — jetpack lit, flying, three-quarter view */}
      <group position={[-0.55, 0.12, 0]}>
        <RobotPilot force={HERO.type} flyingRef={flyingRef} burstRef={burstRef} faceHeading={-0.55} scale={CHAR_SCALE} lean={0.24} />
      </group>
      {/* the champion — smaller, hovering at its Trainer's wing (world 1/3 proportion) */}
      <group position={[0.95, -0.18, -0.35]} scale={CHAR_SCALE * FOLLOWER_REL}>
        <ChampionMesh
          type={HERO.type}
          champion={HERO.champion}
          identityKey={HERO.key}
          position={[0, 0, 0]}
          rotation={-0.5}
          showLabel={false}
          hideFloaters
          restPose="standing"
          breatheIntensity={0.5}
          companionDrive={drive}
          companionRenderPriority={0}
          sceneScale={1}
        />
      </group>
    </group>
  );
}

export default function MobileSplashScene() {
  return (
    <RenderBoundary fallback={null}>
      <Canvas
        dpr={1}
        shadows={false}
        frameloop="always"
        gl={{ antialias: false, powerPreference: "default" }}
        camera={{ position: [0.15, 0.3, 4.9], fov: 42, near: 0.1, far: 60 }}
        style={{ pointerEvents: "none" }}
      >
        <hemisphereLight args={["#bcd6ff", "#0a0a14", 0.95]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 4]} intensity={1.15} color="#eaf2ff" />
        {/* jetpack under-glow, cyan to match the sky beams */}
        <pointLight position={[-0.6, -0.7, 0.7]} intensity={2.4} color="#39e0ff" distance={6} />
        <Suspense fallback={null}>
          <Pair />
        </Suspense>
      </Canvas>
    </RenderBoundary>
  );
}
