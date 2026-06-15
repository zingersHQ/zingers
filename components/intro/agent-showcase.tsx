"use client";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { ChampionMesh } from "@/components/grounds/champion-mesh";

function Spin({ children, speed = 0.4 }: { children: React.ReactNode; speed?: number }) {
  const r = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (r.current) r.current.rotation.y += dt * speed;
  });
  return <group ref={r}>{children}</group>;
}

function Rig({ lookY }: { lookY: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, lookY, 0);
  }, [camera, lookY]);
  return null;
}

// A single, impressively-evolved champion rendered with the real game model so
// the intro showcases an actual agent — not a mockup.
export default function AgentShowcase({
  champion,
  type,
  scale = 1,
}: {
  champion: Champion;
  type: CreatureType;
  scale?: number;
}) {
  const rim = TYPE_COLOR[type];
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.35, 7.4], fov: 32 }} gl={{ antialias: true }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={["#0a0813"]} />
      <fog attach="fog" args={["#0a0813", 10, 22]} />
      <Rig lookY={1.05 * scale} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#b9a7ff", "#160f2c", 0.7]} />
      <directionalLight position={[5, 8, 4]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight position={[-5, 3, -3]} intensity={55} color={rim} distance={22} />
      <pointLight position={[4, 1.5, 5]} intensity={22} color="#ffffff" distance={20} />
      <Suspense fallback={null}>
        <Spin>
          <group scale={scale}>
            <ChampionMesh type={type} champion={champion} position={[0, 0, 0]} showLabel={false} />
          </group>
        </Spin>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={9 * scale} blur={2.6} far={5} resolution={512} color="#000000" />
      </Suspense>
    </Canvas>
  );
}
