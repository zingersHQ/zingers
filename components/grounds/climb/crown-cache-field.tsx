"use client";
// Flight Crown cache — same octahedron + gold ring as wilds DiscoveryCache,
// without Html labels (corridor speed / mobile perf).

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CROWN_CACHE_COLOR, type CrownCache } from "./crown-cache";

export function CrownCacheField({ cache }: { cache: CrownCache | null }) {
  if (!cache) return null;
  return <CrownCacheMesh cache={cache} />;
}

function CrownCacheMesh({ cache }: { cache: CrownCache }) {
  const spin = useRef<THREE.Group>(null);
  const col = CROWN_CACHE_COLOR;
  useFrame((state, dt) => {
    if (!spin.current) return;
    spin.current.rotation.y += dt * 1.1;
    spin.current.position.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.18;
  });
  return (
    <group position={[cache.x, cache.y, cache.z]}>
      {/* soft beacon so it reads ahead of the flyer */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.38, 10, 8, 1, true]} />
        <meshBasicMaterial
          color={col}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <group ref={spin}>
        <mesh>
          <octahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial
            color={col}
            emissive={col}
            emissiveIntensity={1.55}
            metalness={0.55}
            roughness={0.22}
            transparent
            opacity={0.94}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
          <ringGeometry args={[0.78, 1.02, 28]} />
          <meshBasicMaterial
            color={col}
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      <pointLight position={[0, 0.35, 0]} intensity={14} color={col} distance={9} />
    </group>
  );
}
