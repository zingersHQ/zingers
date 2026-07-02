"use client";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/** Jetpack worn during sustained flight. Driven by refs (no re-renders). */
export function Jetpack({
  h,
  flyingRef,
  burstRef,
}: {
  h: number;
  flyingRef: RefObject<boolean>;
  burstRef: RefObject<number>;
}) {
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
  const flameUp = useRef(new THREE.Vector3(0, 1, 0));
  const flameDir = useRef(new THREE.Vector3());
  const flameQuat = useRef(new THREE.Quaternion());

  const depositW = h * 0.22;
  const depositH = h * 0.32;
  const depositD = h * 0.13;
  const depositY = h * 0.56;
  const depositZ = -h * 0.18;
  const depositTop = depositY + depositH * 0.5;
  const rocketH = depositH * 0.25;
  const rocketR = h * 0.038;
  const rocketX = depositW * 0.5 + rocketR * 0.92;
  const rocketY = depositTop - rocketH * 0.5;

  const exhaust = useMemo(
    () => [new THREE.Vector3(-h * 0.09, h * 0.36, -h * 0.2), new THREE.Vector3(h * 0.09, h * 0.36, -h * 0.2)],
    [h],
  );

  function emitBurst(n = 4) {
    for (let i = 0; i < n; i++) {
      const p = puffState.current[cursor.current % PUFFS];
      cursor.current++;
      const noz = exhaust[i % 2];
      p.pos.set(noz.x + (Math.random() - 0.5) * h * 0.03, noz.y, noz.z);
      p.vel.set((Math.random() - 0.5) * 0.22, -4.2 - Math.random() * 1.6, -0.25 - Math.random() * 0.35);
      p.max = 0.22 + Math.random() * 0.12;
      p.life = p.max;
      p.size = h * (0.09 + Math.random() * 0.06);
    }
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const flying = !!flyingRef.current;
    scale.current += ((flying ? 1 : 0) - scale.current) * Math.min(1, dt * 16);
    if (grp.current) {
      grp.current.visible = scale.current > 0.02;
      grp.current.scale.setScalar(scale.current);
    }

    const flick = 0.72 + Math.sin(performance.now() * 0.022) * 0.28;
    if (flameL.current) {
      flameL.current.scale.y = flick;
      (flameL.current.material as THREE.MeshBasicMaterial).opacity = flying ? 0.85 * flick : 0;
    }
    if (flameR.current) {
      flameR.current.scale.y = flick * 0.92;
      (flameR.current.material as THREE.MeshBasicMaterial).opacity = flying ? 0.85 * flick : 0;
    }

    const b = burstRef.current || 0;
    if (b > lastBurst.current) {
      lastBurst.current = b;
      emitBurst(3);
    }

    for (let i = 0; i < PUFFS; i++) {
      const p = puffState.current[i];
      const m = puffRefs.current[i];
      if (!m) continue;
      if (p.life <= 0) {
        if (m.visible) m.visible = false;
        continue;
      }
      p.life -= dt;
      p.vel.multiplyScalar(0.86);
      p.pos.addScaledVector(p.vel, dt);
      const age = 1 - Math.max(0, p.life) / p.max;
      m.visible = true;
      m.position.copy(p.pos);
      const dir = flameDir.current.copy(p.vel);
      if (dir.lengthSq() > 1e-6) {
        dir.normalize();
        m.quaternion.copy(flameQuat.current.setFromUnitVectors(flameUp.current, dir));
      }
      const len = p.size * (3.4 - age * 2.2);
      const wid = p.size * (0.85 - age * 0.5);
      m.scale.set(wid, len, wid);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.setRGB(0.55 + (1 - age) * 0.45, 0.95 - age * 0.45, 1.0);
      mat.opacity = (1 - age) * 0.92;
    }
  });

  return (
    <group>
      <group ref={grp} visible={false}>
        <mesh position={[0, depositY, depositZ]} castShadow>
          <boxGeometry args={[depositW, depositH, depositD]} />
          <meshStandardMaterial color="#20242e" metalness={0.7} roughness={0.35} emissive="#39e0ff" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[-rocketX, rocketY, depositZ]} castShadow>
          <cylinderGeometry args={[rocketR, rocketR * 1.12, rocketH, 12]} />
          <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.3} emissive="#39e0ff" emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[rocketX, rocketY, depositZ]} castShadow>
          <cylinderGeometry args={[rocketR, rocketR * 1.12, rocketH, 12]} />
          <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.3} emissive="#39e0ff" emissiveIntensity={0.15} />
        </mesh>
        <mesh ref={flameL} position={[exhaust[0].x, exhaust[0].y - h * 0.1, exhaust[0].z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[h * 0.04, h * 0.17, 10]} />
          <meshBasicMaterial color="#8ff3ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh ref={flameR} position={[exhaust[1].x, exhaust[1].y - h * 0.1, exhaust[1].z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[h * 0.04, h * 0.17, 10]} />
          <meshBasicMaterial color="#8ff3ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      {puffState.current.map((_, i) => (
        <mesh key={i} ref={(el) => { puffRefs.current[i] = el; }} visible={false}>
          <coneGeometry args={[1, 1, 9]} />
          <meshBasicMaterial color="#aeefff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
