"use client";
// Async Ascent ghost — replays a challenger's recorded Y/Z path beside you.
// Canon pair: semi-transparent Trainer robot + their semi-transparent champion
// on the wing slot (same relationship as the live flyer).
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ChampionMesh, buildCharacter, applyBoneMorph, READER_SCALE, WORLD_AGENT_SCALE } from "../champion-mesh";
import { blank } from "@/lib/evolve/progression";
import { readerPalette } from "@/lib/render/palette";
import { sampleGhostAt, type ClimbGhostSample } from "@/lib/climb-ghost";
import { COMPANION_FOLLOW, companionPathSlot } from "../companion-follow";
import type { CreatureType } from "@/lib/types";

const SIDE_X = 1.35; // fly beside the player's plane (x=0)
const GHOST_OPACITY = 0.4;

const SHARED_RIG = "/models/RobotExpressive.glb";
useGLTF.preload(SHARED_RIG);

function ghostifyObject(root: THREE.Object3D, accent: string, opacity: number) {
  const tint = new THREE.Color(accent);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    if ((mesh.userData as { ghostMat?: boolean }).ghostMat) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = mats.map((raw) => {
      const m = (raw as THREE.Material).clone();
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
      if ("emissive" in m && m.emissive instanceof THREE.Color) {
        (m as THREE.MeshStandardMaterial).emissive.copy(tint);
        (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
      }
      m.needsUpdate = true;
      return m;
    });
    (mesh.userData as { ghostMat?: boolean }).ghostMat = true;
  });
}

function GhostTrainerBody({
  force = null,
  accent = "#c8d0ff",
  scale = READER_SCALE,
  faceHeading = 0,
}: {
  force?: CreatureType | null;
  accent?: string;
  scale?: number;
  faceHeading?: number;
}) {
  const { scene, animations } = useGLTF(SHARED_RIG);
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(
    () => buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal),
    [scene, animations, pal],
  );
  const leanGrp = useRef<THREE.Group>(null);

  useEffect(() => {
    const idle = built.actions.idle;
    if (idle) {
      idle.reset();
      idle.fadeIn(0.2);
      idle.play();
    }
    ghostifyObject(built.root, accent, GHOST_OPACITY);
    return () => {
      idle?.stop();
    };
  }, [built, accent]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    if (leanGrp.current) {
      leanGrp.current.rotation.x += (0.14 - leanGrp.current.rotation.x) * (1 - Math.exp(-8 * dt));
    }
  });

  return (
    <group rotation={[0, faceHeading, 0]}>
      <group ref={leanGrp}>
        <group scale={scale}>
          <primitive object={built.root} />
        </group>
      </group>
    </group>
  );
}

/** Wing-slot champion trailing the ghost Trainer (local space, heading 0 = +Z). */
function GhostChampionWing({
  type,
  accent,
  scale = WORLD_AGENT_SCALE,
}: {
  type: CreatureType;
  accent: string;
  scale?: number;
}) {
  const wrap = useRef<THREE.Group>(null);
  const champ = useMemo(() => blank(), []);
  const slot = useMemo(() => companionPathSlot(0, 0, 0), []);
  const ghosted = useRef(false);

  useFrame(() => {
    const g = wrap.current;
    if (!g || ghosted.current) return;
    // ChampionMesh builds on mount — ghostify once meshes exist.
    let meshes = 0;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes++;
    });
    if (meshes < 2) return;
    ghostifyObject(g, accent, GHOST_OPACITY * 0.95);
    ghosted.current = true;
  });

  return (
    <group
      ref={wrap}
      position={[slot.tx, -COMPANION_FOLLOW.wingDrop, slot.tz]}
    >
      <ChampionMesh
        type={type}
        champion={champ}
        identityKey="ascent-ghost-champ"
        position={[0, 0, 0]}
        rotation={0}
        baseColorOverride={accent}
        showLabel={false}
        hideFloaters
        sceneScale={scale}
      />
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color={accent} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function ClimbGhostRacer({
  path,
  running,
  runStartMs,
  type = "LOGIC",
  accent = "#c8d0ff",
  /** Scale canonical Climb samples into this body's world (desktop ≠ 1). */
  scaleY = 1,
  scaleZ = 1,
  sideX = SIDE_X,
  /** Match the live Trainer body (desktop Handler / mobile RobotPilot). */
  bodyScale = READER_SCALE,
  champScale = WORLD_AGENT_SCALE,
}: {
  path: ClimbGhostSample[];
  running: boolean;
  /** performance.now() when the player's run went live */
  runStartMs: number;
  type?: CreatureType;
  accent?: string;
  scaleY?: number;
  scaleZ?: number;
  sideX?: number;
  bodyScale?: number;
  champScale?: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const started = useRef(false);
  const startAt = useRef(0);

  useFrame((_, dtRaw) => {
    const g = grp.current;
    if (!g || !path.length) return;
    if (running && !started.current) {
      started.current = true;
      startAt.current = runStartMs || performance.now();
    }
    if (!started.current) return;
    const tMs = Math.max(0, performance.now() - startAt.current);
    const s = sampleGhostAt(path, tMs);
    if (!s) return;
    const dt = Math.min(0.05, dtRaw);
    const target = new THREE.Vector3(sideX, s.y * scaleY, s.z * scaleZ);
    g.position.lerp(target, 1 - Math.exp(-10 * dt));
  });

  if (!path.length) return null;

  const spawn = path[0]!;
  return (
    <group ref={grp} position={[sideX, spawn.y * scaleY, spawn.z * scaleZ]}>
      <GhostTrainerBody force={type} accent={accent} scale={bodyScale} faceHeading={0} />
      <GhostChampionWing type={type} accent={accent} scale={champScale} />
      {/* soft pair halo */}
      <mesh position={[0, 0.5 * bodyScale, 0]}>
        <sphereGeometry args={[0.85 * bodyScale, 14, 14]} />
        <meshBasicMaterial color={accent} transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}
