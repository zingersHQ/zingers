"use client";
// Flight wind tunnel — soft streaks rushing past the flyer. Presentation only;
// no collision. Shared by mobile Climb and desktop Circuit (flight-parity).
// Spread is wide on purpose: chase cams look down-track, so streaks must fill
// the frame edges, not just a tube around the torso.

import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type Density = "full" | "lite";

type Streak = {
  x: number;
  y: number;
  z: number;
  len: number;
  speed: number;
  op: number;
};

/** Bias samples toward the frame rim so the tunnel reads full-bleed. */
function rimSample(t: number, half: number): number {
  // Square → push mass outward (t in 0..1 → signed position).
  const signed = t * 2 - 1;
  const mag = Math.sign(signed) * Math.pow(Math.abs(signed), 0.62);
  return mag * half;
}

function seedStreaks(n: number, spanZ: number, halfX: number, halfY: number): Streak[] {
  const out: Streak[] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.37) * 12.9898;
    const r = Math.abs((Math.sin(u) * 43758.5453) % 1);
    const r2 = Math.abs((Math.sin(u * 1.7) * 23421.631) % 1);
    const r3 = Math.abs((Math.sin(u * 2.3) * 9123.12) % 1);
    out.push({
      x: rimSample(r, halfX),
      y: rimSample(r2, halfY) + halfY * 0.08,
      z: r3 * spanZ,
      len: 0.9 + r * 2.4,
      speed: 0.85 + r2 * 0.7,
      op: 0.18 + r3 * 0.42,
    });
  }
  return out;
}

/**
 * Wind streaks that stream past `originRef` down-track (+Z world → streaks
 * fall behind as the flyer advances). Inactive / reduced-motion → render null.
 */
export function FlightWindStreaks({
  originRef,
  active,
  accent = "#c8d0ff",
  density = "full",
  reduceMotion = false,
}: {
  originRef: RefObject<THREE.Vector3>;
  active: boolean;
  accent?: string;
  density?: Density;
  reduceMotion?: boolean;
}) {
  const grp = useRef<THREE.Group>(null);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const count = density === "lite" ? 48 : 88;
  const spanZ = 56;
  // Wide enough to hit chase-cam FOV edges (mobile ~58–66°, desktop Circuit ~58°).
  const halfX = density === "lite" ? 16 : 20;
  const halfY = density === "lite" ? 12 : 15;
  const streaks = useMemo(
    () => seedStreaks(count, spanZ, halfX, halfY),
    [count, halfX, halfY],
  );
  const color = useMemo(() => new THREE.Color(accent), [accent]);

  useFrame((_, dtRaw) => {
    if (!active || reduceMotion || !grp.current) return;
    const dt = Math.min(0.05, dtRaw);
    const o = originRef.current;
    if (!o) return;
    grp.current.position.set(o.x, o.y, o.z);

    const children = grp.current.children;
    for (let i = 0; i < streaks.length; i++) {
      const s = streaks[i]!;
      s.z -= (22 + s.speed * 28) * dt; // rush past (relative to flyer)
      if (s.z < -10) {
        const u = i * 2.1 + o.z * 0.01;
        const u2 = i * 3.7 + o.z * 0.03;
        const u3 = i * 2.9 + o.z * 0.02;
        s.z = spanZ * (0.4 + Math.abs(Math.sin(u)) * 0.6);
        s.x = rimSample((Math.sin(u2) * 0.5 + 0.5), halfX);
        s.y = rimSample((Math.cos(u3) * 0.5 + 0.5), halfY) + halfY * 0.08;
      }
      const mesh = children[i] as THREE.Mesh | undefined;
      if (!mesh) continue;
      mesh.position.set(s.x, s.y, s.z);
      mesh.scale.set(1, 1, s.len);
      const mat = mats.current[i];
      if (mat) {
        // Soft near-body fade; keep rim streaks readable across the frame.
        const near = THREE.MathUtils.clamp((s.z + 4) / 10, 0, 1);
        const rim = Math.min(1, Math.hypot(s.x / halfX, s.y / halfY));
        mat.opacity = s.op * near * (0.55 + rim * 0.55);
      }
    }
  });

  if (!active || reduceMotion) return null;

  return (
    <group ref={grp} frustumCulled={false}>
      {streaks.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, s.y, s.z]}
          scale={[1, 1, s.len]}
          frustumCulled={false}
        >
          <boxGeometry args={[0.045, 0.045, 1]} />
          <meshBasicMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            color={color}
            transparent
            opacity={s.op}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
