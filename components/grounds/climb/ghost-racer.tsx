"use client";
// Async Ascent ghost — challenger's Trainer + champion, semi-transparent, racing
// beside you. Clean ghost mats (no beacon beams / aura spheres). Path remapped
// onto the live pad so the pair starts with you every sector.
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
const GHOST_OPACITY = 0.62;
/** Cool ghost tint — never biome gold (bloom was reading as a yellow beam). */
const GHOST_BODY = "#c8d4ff";
const GHOST_GLOW = "#7a92ff";

const SHARED_RIG = "/models/RobotExpressive.glb";
useGLTF.preload(SHARED_RIG);

/** Same approach as CircuitGhostLeave — replace mats so the ghost always reads. */
function ghostifySolid(root: THREE.Object3D, opacity = GHOST_OPACITY) {
  const color = new THREE.Color(GHOST_BODY);
  const emissive = new THREE.Color(GHOST_GLOW);
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
      emissiveIntensity: 0.35,
      transparent: true,
      opacity,
      depthWrite: false,
      roughness: 0.45,
      metalness: 0.08,
    });
    mesh.material = mat;
  });
}

function GhostTrainerBody({
  force = null,
  scale = READER_SCALE,
  flying = false,
}: {
  force?: CreatureType | null;
  scale?: number;
  flying?: boolean;
}) {
  const { scene, animations } = useGLTF(SHARED_RIG);
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(() => {
    const b = buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal);
    ghostifySolid(b.root, GHOST_OPACITY);
    return b;
  }, [scene, animations, pal]);
  const leanGrp = useRef<THREE.Group>(null);
  const flyingRef = useRef(flying);
  flyingRef.current = flying;

  useEffect(() => {
    const idle = built.actions.idle;
    const run = built.actions.run;
    const walk = built.actions.walk;
    const loco = run ?? walk ?? idle;
    if (idle) {
      idle.reset();
      idle.setEffectiveWeight(flying ? 0 : 1);
      idle.fadeIn(0.15);
      idle.play();
    }
    if (loco && loco !== idle) {
      loco.reset();
      loco.setEffectiveWeight(flying ? 1 : 0);
      loco.setEffectiveTimeScale(0.85);
      loco.fadeIn(0.15);
      loco.play();
    }
    return () => {
      idle?.stop();
      loco?.stop();
    };
  }, [built]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    const idle = built.actions.idle;
    const run = built.actions.run ?? built.actions.walk;
    const fly = flyingRef.current;
    if (idle && run && run !== idle) {
      const wantRun = fly ? 1 : 0;
      const cur = run.getEffectiveWeight();
      const next = cur + (wantRun - cur) * (1 - Math.exp(-6 * dt));
      run.setEffectiveWeight(next);
      idle.setEffectiveWeight(1 - next);
    }
    if (leanGrp.current) {
      const want = fly ? 0.18 : 0.06;
      leanGrp.current.rotation.x += (want - leanGrp.current.rotation.x) * (1 - Math.exp(-8 * dt));
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
  scale = WORLD_AGENT_SCALE,
}: {
  type: CreatureType;
  scale?: number;
}) {
  const wrap = useRef<THREE.Group>(null);
  const champ = useMemo(() => blank(), []);
  const slot = useMemo(() => companionPathSlot(0, 0, 0), []);
  const ghosted = useRef(false);
  const lean = useRef<THREE.Group>(null);

  useFrame((_, dtRaw) => {
    const g = wrap.current;
    if (g && !ghosted.current) {
      let meshes = 0;
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes++;
      });
      if (meshes >= 1) {
        ghostifySolid(g, GHOST_OPACITY * 0.92);
        ghosted.current = true;
      }
    }
    // Soft flight lean — no jetpack (champions fly on their own).
    if (lean.current) {
      const dt = Math.min(0.05, dtRaw);
      lean.current.rotation.x += (0.12 - lean.current.rotation.x) * (1 - Math.exp(-6 * dt));
    }
  });

  return (
    <group ref={wrap} position={[slot.tx, -COMPANION_FOLLOW.wingDrop * 0.85, slot.tz]}>
      <group ref={lean}>
        <Suspense fallback={null}>
          <ChampionMesh
            type={type}
            champion={champ}
            identityKey={`ascent-ghost-champ-${type}`}
            position={[0, 0, 0]}
            rotation={0}
            baseColorOverride={GHOST_GLOW}
            showLabel={false}
            hideFloaters
            sceneScale={scale}
            restPose="idle"
            breatheIntensity={0.4}
          />
        </Suspense>
      </group>
    </group>
  );
}

export function ClimbGhostRacer({
  path,
  running,
  runStartMs: _runStartMs = 0,
  type = "LOGIC",
  accent: _accent = GHOST_GLOW,
  scaleY = 1,
  scaleZ = 1,
  spawn = [0, 1.1, -2.5] as [number, number, number],
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
      startAt.current = performance.now();
    }

    const tMs = Math.max(0, performance.now() - startAt.current);
    const s = sampleGhostAt(path, tMs) ?? path0;
    const targetY = spawn[1] + (s.y - path0.y) * scaleY;
    const targetZ = spawn[2] + (s.z - path0.z) * scaleZ;

    g.position.x += (targetX - g.position.x) * k;
    g.position.y += (targetY - g.position.y) * k;
    g.position.z += (targetZ - g.position.z) * k;
  });

  if (!path.length || !path0) return null;

  return (
    <group ref={grp} position={[spawn[0] + sideX, spawn[1], spawn[2]]}>
      <Suspense fallback={null}>
        <GhostTrainerBody force={type} scale={bodyScale} flying={running} />
        <GhostChampionWing type={type} scale={champScale} />
      </Suspense>
    </group>
  );
}
