"use client";
// Async Ascent ghost — challenger's Trainer + champion, semi-transparent, racing
// beside you. Materials match the proven life-leave ghost (solid ghost mats, not
// cloned opacity) so bloom/post still reads them. Path is remapped onto the live
// pad so the pair starts with you every sector.
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ChampionMesh, buildCharacter, applyBoneMorph, READER_SCALE, WORLD_AGENT_SCALE } from "../champion-mesh";
import { blank } from "@/lib/evolve/progression";
import { readerPalette } from "@/lib/render/palette";
import { sampleGhostAt, type ClimbGhostSample } from "@/lib/climb-ghost";
import { COMPANION_FOLLOW, companionPathSlot } from "../companion-follow";
import type { CreatureType } from "@/lib/types";

const SIDE_X = 1.85;
const GHOST_OPACITY = 0.72;
const GHOST_BODY = "#d4dcff";
const GHOST_GLOW = "#8aa0ff";

const SHARED_RIG = "/models/RobotExpressive.glb";
useGLTF.preload(SHARED_RIG);

/** Same approach as CircuitGhostLeave — replace mats so the ghost always reads. */
function ghostifySolid(root: THREE.Object3D, accent: string, opacity = GHOST_OPACITY) {
  const color = new THREE.Color(GHOST_BODY);
  const emissive = new THREE.Color(accent || GHOST_GLOW);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 3;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity,
      depthWrite: false,
      roughness: 0.4,
      metalness: 0.12,
    });
    mesh.material = mat;
  });
}

function GhostBeacon({ accent }: { accent: string }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const m = ring.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.35 + 0.2 * Math.sin(state.clock.elapsedTime * 3.2);
    ring.current.rotation.z = state.clock.elapsedTime * 0.7;
  });
  return (
    <group>
      <mesh position={[0, 1.1, 0]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.14, 2.2, 10]} />
        <meshBasicMaterial color={accent} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <ringGeometry args={[0.55, 0.85, 28]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GhostTrainerBody({
  force = null,
  accent = GHOST_GLOW,
  scale = READER_SCALE,
}: {
  force?: CreatureType | null;
  accent?: string;
  scale?: number;
}) {
  const { scene, animations } = useGLTF(SHARED_RIG);
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(() => {
    const b = buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal);
    ghostifySolid(b.root, accent, GHOST_OPACITY);
    return b;
  }, [scene, animations, pal, accent]);
  const leanGrp = useRef<THREE.Group>(null);

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
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    if (leanGrp.current) {
      leanGrp.current.rotation.x += (0.14 - leanGrp.current.rotation.x) * (1 - Math.exp(-8 * dt));
    }
  });

  return (
    <group>
      <group ref={leanGrp}>
        <group scale={scale}>
          <primitive object={built.root} />
        </group>
      </group>
    </group>
  );
}

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
    let meshes = 0;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes++;
    });
    if (meshes < 1) return;
    ghostifySolid(g, accent, GHOST_OPACITY * 0.95);
    ghosted.current = true;
  });

  return (
    <group ref={wrap} position={[slot.tx, -COMPANION_FOLLOW.wingDrop * 0.85, slot.tz]}>
      <Suspense
        fallback={
          <mesh position={[0, 0.35, 0]} frustumCulled={false}>
            <sphereGeometry args={[0.4, 14, 14]} />
            <meshBasicMaterial color={accent} transparent opacity={0.65} depthWrite={false} />
          </mesh>
        }
      >
        <ChampionMesh
          type={type}
          champion={champ}
          identityKey={`ascent-ghost-champ-${type}`}
          position={[0, 0, 0]}
          rotation={0}
          baseColorOverride={accent}
          showLabel={false}
          hideFloaters
          sceneScale={scale}
        />
      </Suspense>
    </group>
  );
}

export function ClimbGhostRacer({
  path,
  running,
  /** Kept for callers; ghost arms on the frame `running` becomes true. */
  runStartMs: _runStartMs = 0,
  type = "LOGIC",
  accent = GHOST_GLOW,
  scaleY = 1,
  scaleZ = 1,
  /** Live pad spawn — ghost path is remapped so sample[0] sits here. */
  spawn = [0, 1.1, -2.5] as [number, number, number],
  /** Optional: leash X to the live Trainer so the pair stays in frame. */
  followPos,
  sideX = SIDE_X,
  bodyScale = READER_SCALE,
  champScale = WORLD_AGENT_SCALE,
}: {
  path: ClimbGhostSample[];
  running: boolean;
  runStartMs?: number;
  type?: CreatureType;
  accent?: string;
  scaleY?: number;
  scaleZ?: number;
  spawn?: [number, number, number];
  followPos?: React.RefObject<THREE.Vector3 | null>;
  sideX?: number;
  bodyScale?: number;
  champScale?: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const startAt = useRef(0);
  const armed = useRef(false);
  const ghostAccent = accent && accent !== "#000000" ? accent : GHOST_GLOW;

  const path0 = path[0];
  const spawnKey = `${spawn[0]},${spawn[1]},${spawn[2]}`;

  useEffect(() => {
    armed.current = false;
    startAt.current = 0;
  }, [path, _runStartMs, spawnKey]);

  useFrame((_, dtRaw) => {
    const g = grp.current;
    if (!g || !path0) return;
    const dt = Math.min(0.05, dtRaw);
    const k = 1 - Math.exp(-14 * dt);

    const baseX = followPos?.current ? followPos.current.x : spawn[0];
    const targetX = baseX + sideX;

    if (!running) {
      armed.current = false;
      g.position.x += (targetX - g.position.x) * k;
      g.position.y += (spawn[1] - g.position.y) * k;
      g.position.z += (spawn[2] - g.position.z) * k;
      return;
    }

    if (!armed.current) {
      armed.current = true;
      // Always sync to "now" on arm — avoids jumping to end-of-path if runStartMs is stale.
      startAt.current = performance.now();
    }

    const tMs = Math.max(0, performance.now() - startAt.current);
    const s = sampleGhostAt(path, tMs) ?? path0;
    // Remap onto the live pad so every sector starts beside you.
    const targetY = spawn[1] + (s.y - path0.y) * scaleY;
    const targetZ = spawn[2] + (s.z - path0.z) * scaleZ;

    g.position.x += (targetX - g.position.x) * k;
    g.position.y += (targetY - g.position.y) * k;
    g.position.z += (targetZ - g.position.z) * k;
  });

  if (!path.length || !path0) return null;

  return (
    <group ref={grp} position={[spawn[0] + sideX, spawn[1], spawn[2]]}>
      <Suspense fallback={<GhostBeacon accent={ghostAccent} />}>
        <GhostTrainerBody force={type} accent={ghostAccent} scale={bodyScale} />
        <GhostChampionWing type={type} accent={ghostAccent} scale={champScale} />
      </Suspense>
      <GhostBeacon accent={ghostAccent} />
    </group>
  );
}
