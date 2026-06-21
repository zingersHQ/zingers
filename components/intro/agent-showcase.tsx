"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { ChampionMesh } from "@/components/grounds/champion-mesh";

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
}) {
  const rim = TYPE_COLOR[type];
  const rim2 = rival ? TYPE_COLOR[rival.type] : null;
  const duel = !!rival;
  // These champions carry oversized heads/auras, so frame loose enough to keep
  // the whole silhouette (feet to crown) in view.
  const camY = duel ? 1.9 : 1.7;
  const camZ = duel ? 13 : 9.6;
  const lookY = duel ? 1.3 : 1.4;

  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ position: [0, camY, camZ], fov: 32 }} gl={{ antialias: true }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={["#0a0813"]} />
      <fog attach="fog" args={["#0a0813", 11, 24]} />
      <CamRig lookY={lookY} camY={camY} camZ={camZ} dolly={dolly} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#b9a7ff", "#160f2c", 0.7]} />
      <directionalLight position={[5, 8, 4]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight position={[-5, 3, -3]} intensity={55} color={rim} distance={22} />
      <pointLight position={[4, 1.5, 5]} intensity={22} color="#ffffff" distance={20} />
      {rim2 && <pointLight position={[5, 3, -3]} intensity={48} color={rim2} distance={22} />}
      <Suspense fallback={null}>
        {duel ? (
          <Duel hero={{ champion, type }} rival={rival!} scale={scale} />
        ) : (
          <Spin enabled={spin}>
            <Solo champion={champion} type={type} scale={scale} gesture={gesture} everyMs={everyMs} />
          </Spin>
        )}
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={(duel ? 12 : 9) * Math.max(scale, 0.6)} blur={2.6} far={5} resolution={512} color="#000000" />
      </Suspense>
    </Canvas>
  );
}

function CamRig({ lookY, camY, camZ, dolly }: { lookY: number; camY: number; camZ: number; dolly: boolean }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const fromZ = camZ + 4.5;
  useFrame((state) => {
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

function Spin({ children, enabled, speed = 0.32 }: { children: React.ReactNode; enabled?: boolean; speed?: number }) {
  const r = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (enabled && r.current) r.current.rotation.y += dt * speed;
  });
  return <group ref={r}>{children}</group>;
}

function Solo({ champion, type, scale, gesture, everyMs }: { champion: Champion; type: CreatureType; scale: number; gesture: Gesture; everyMs?: number }) {
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
      <ChampionMesh type={type} champion={champion} position={[0, 0, 0]} showLabel={false} actSignal={sig} actName={gesture === "idle" ? "wave" : gesture} />
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
