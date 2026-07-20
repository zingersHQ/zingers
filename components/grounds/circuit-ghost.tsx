"use client";
// Life-leave ghost — a semi-transparent Trainer double that flickers beside the
// body, then lifts and drifts away. Presentation only; never touches fail logic.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { buildCharacter, applyBoneMorph, READER_SCALE } from "./champion-mesh";
import { blank } from "@/lib/evolve/progression";
import { readerPalette } from "@/lib/render/palette";
import type { CreatureType } from "@/lib/types";

export type CircuitGhostPose = {
  x: number;
  y: number;
  z: number;
  heading: number;
};

const GHOST_MAT = {
  color: new THREE.Color("#c8d0ff"),
  emissive: new THREE.Color("#6a7cff"),
};

function ghostify(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const next = mats.map(() => {
      const mat = new THREE.MeshStandardMaterial({
        color: GHOST_MAT.color,
        emissive: GHOST_MAT.emissive,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        roughness: 0.45,
        metalness: 0.1,
      });
      return mat;
    });
    m.material = Array.isArray(m.material) ? next : next[0]!;
    m.castShadow = false;
    m.receiveShadow = false;
  });
}

function setGhostOpacity(root: THREE.Object3D, opacity: number) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && "opacity" in std) {
        std.transparent = true;
        std.opacity = opacity;
        std.depthWrite = false;
      }
    }
  });
}

/** Desktop: longer blink + lift. Mobile lite: quicker fade. */
export function CircuitGhostLeave({
  pose,
  force = null,
  reducedMotion = false,
  lite = false,
  onDone,
}: {
  pose: CircuitGhostPose;
  force?: CreatureType | null;
  reducedMotion?: boolean;
  lite?: boolean;
  onDone?: () => void;
}) {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(() => {
    const b = buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal);
    ghostify(b.root);
    return b;
  }, [scene, animations, pal]);

  const grp = useRef<THREE.Group>(null);
  const t = useRef(0);
  const done = useRef(false);
  const duration = lite ? 1.05 : 1.55;
  const side = lite ? 0.55 : 0.85;
  const lift = lite ? 2.4 : 3.6;
  const drift = lite ? 1.1 : 1.8;

  useEffect(() => {
    const idle = built.actions.idle;
    if (idle) {
      idle.reset();
      idle.fadeIn(0.15);
      idle.play();
    }
    return () => {
      idle?.stop();
    };
  }, [built]);

  useFrame((_, dtRaw) => {
    if (done.current) return;
    const dt = Math.min(0.05, dtRaw);
    t.current += dt;
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);

    const u = Math.min(1, t.current / duration);
    const g = grp.current;
    if (!g) return;

    // Blink beside the body, then lift + drift away.
    const blink =
      reducedMotion || lite
        ? 0.45 + 0.2 * Math.sin(t.current * 10)
        : u < 0.38
          ? 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(t.current * 28))
          : Math.max(0, 0.55 * (1 - (u - 0.38) / 0.62));

    const rise = reducedMotion ? u * lift * 0.35 : Math.pow(Math.max(0, u - 0.2) / 0.8, 1.15) * lift;
    const away = reducedMotion ? u * drift * 0.4 : Math.pow(Math.max(0, u - 0.25) / 0.75, 1.1) * drift;
    const lateral = Math.sin(pose.heading) * side + Math.cos(pose.heading) * away;
    const forward = Math.cos(pose.heading) * side - Math.sin(pose.heading) * away;

    g.position.set(pose.x + lateral, pose.y + rise, pose.z + forward);
    g.rotation.y = pose.heading;
    setGhostOpacity(built.root, blink);

    if (u >= 1 && !done.current) {
      done.current = true;
      onDone?.();
    }
  });

  return (
    <group ref={grp} position={[pose.x + side, pose.y, pose.z]} rotation={[0, pose.heading, 0]}>
      <group scale={READER_SCALE * (lite ? 0.92 : 1)}>
        <primitive object={built.root} />
      </group>
    </group>
  );
}
