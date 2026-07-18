"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Flying cast — the shared "Trainer flies, champion follows" pair used by BOTH
// the mobile Climb (circuit-lite) and the desktop Circuit (world.tsx).
//
// Canon (docs/design-vision.md · essence.md): the Trainer flies; the champion
// fights. So in the Circuit/Climb the PILOT is the Trainer's robot avatar and the
// champion trails as a flying companion — the same relationship you see roaming
// the Grounds. This module packages the two roles so both surfaces share one
// behaviour:
//   • RobotPilot     — the Trainer's robot (RobotExpressive rig + jetpack), the flyer.
//   • FlyingFollower — the owned champion, trailing on a wing slot with the world's
//                      companion flight pose (ChampionMesh `companionDrive`) and a
//                      catch-up/extra-gravity leash mirroring OwnedCompanion.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ChampionMesh, buildCharacter, applyBoneMorph, READER_SCALE, WORLD_AGENT_SCALE } from "./champion-mesh";
import { Jetpack } from "./jetpack";
import { blank } from "@/lib/evolve/progression";
import { readerPalette } from "@/lib/render/palette";
import type { Champion, CreatureType } from "@/lib/types";
import { COMPANION_FOLLOW, companionPathSlot } from "./companion-follow";

// Flight leash uses the same COMPANION_FOLLOW numbers as Grounds OwnedCompanion
// (path trail + wingDrop + catch). Sink a touch faster than rise for weight.
const EXTRA_GRAV = 1.35;

// ── the Trainer's robot, flying with a jetpack (the pilot) ────────────────────
// Builds the RobotExpressive rig with the Reader palette, plays the idle clip as a
// hover pose, and wears the jetpack. `faceHeading` orients it down-track.
export function RobotPilot({
  force = null,
  flyingRef,
  burstRef,
  faceHeading = 0,
  scale = READER_SCALE,
  lean = 0.16,
}: {
  force?: CreatureType | null;
  flyingRef: React.RefObject<boolean>;
  burstRef: React.RefObject<number>;
  faceHeading?: number;
  scale?: number;
  lean?: number;
}) {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
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
    return () => {
      idle?.stop();
    };
  }, [built]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    // forward flight lean, eased in
    if (leanGrp.current) {
      const want = flyingRef.current ? lean : 0;
      leanGrp.current.rotation.x += (want - leanGrp.current.rotation.x) * (1 - Math.exp(-8 * dt));
    }
  });

  return (
    <group rotation={[0, faceHeading, 0]}>
      <group ref={leanGrp}>
        <group scale={scale}>
          <primitive object={built.root} />
        </group>
        <Jetpack h={built.h * scale} flyingRef={flyingRef} burstRef={burstRef} />
      </group>
    </group>
  );
}

// ── the owned champion, trailing the pilot on a wing slot ─────────────────────
// Positions its own outer rig each frame (the OwnedCompanion pattern) and drives
// ChampionMesh via `companionDrive` so it wears the world's flight pose + jetpack.
export function FlyingFollower({
  type,
  champion,
  identityKey,
  clan = null,
  targetRef,
  headingRef,
  scale = WORLD_AGENT_SCALE,
  renderPriority = 0,
}: {
  type: CreatureType;
  champion: Champion;
  identityKey?: string;
  clan?: CreatureType | null;
  /** the pilot's world position (the thing to follow) */
  targetRef: React.RefObject<THREE.Vector3>;
  /** the pilot's heading (radians); the wing slot sits behind it */
  headingRef?: React.RefObject<number>;
  /** Absolute body scale — use WORLD_AGENT_SCALE next to a READER_SCALE Trainer. */
  scale?: number;
  renderPriority?: number;
}) {
  const rig = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3());
  const vel = useRef(new THREE.Vector3());
  const booted = useRef(false);
  const rigHeading = useRef(0);

  // companionDrive: pose flags read by ChampionMesh (flight pose + jetpack)
  const flyingRef = useRef(true);
  const movingRef = useRef(true);
  const speedRef = useRef(0);
  const runRef = useRef(false);
  const velRef = useRef(new THREE.Vector3());
  const headRef = useRef(0);
  const drive = useMemo(
    () => ({ flyingRef, movingRef, speedRef, runRef, velRef, headingRef: headRef }),
    [],
  );

  useFrame((_, dtRaw) => {
    const rg = rig.current;
    const tp = targetRef.current;
    if (!rg || !tp) return;
    const dt = Math.min(0.05, dtRaw);
    const th = headingRef?.current ?? 0;
    const { wingDrop, catchK, catchMax, accel, rigHeadingSmooth } = COMPANION_FOLLOW;

    // Same path-trail slot the Grounds companion uses while the Trainer is moving.
    const slot = companionPathSlot(tp.x, tp.z, th);
    const sx = slot.tx;
    const sy = tp.y - wingDrop;
    const sz = slot.tz;

    if (!booted.current) {
      booted.current = true;
      pos.current.set(sx, sy, sz);
      vel.current.set(0, 0, 0);
    }

    const ex = sx - pos.current.x;
    const ey = sy - pos.current.y;
    const ez = sz - pos.current.z;

    // catch-up planar velocity (target vel is implicit in the moving slot); clamp
    let wantVx = ex * catchK;
    let wantVz = ez * catchK;
    const wantPlanar = Math.hypot(wantVx, wantVz);
    if (wantPlanar > catchMax && wantPlanar > 0) {
      const k = catchMax / wantPlanar;
      wantVx *= k;
      wantVz *= k;
    }
    const kv = 1 - Math.exp(-accel * dt);
    vel.current.x += (wantVx - vel.current.x) * kv;
    vel.current.z += (wantVz - vel.current.z) * kv;
    // vertical: fall a touch faster than it rises (weighty, world-like)
    const wantVy = ey * catchK * (ey < 0 ? EXTRA_GRAV : 1);
    vel.current.y += (wantVy - vel.current.y) * kv;

    pos.current.x += vel.current.x * dt;
    pos.current.y += vel.current.y * dt;
    pos.current.z += vel.current.z * dt;

    // publish pose drive
    const planar = Math.hypot(vel.current.x, vel.current.z);
    speedRef.current = planar;
    velRef.current.copy(vel.current);

    // face travel direction while chasing, else the pilot's heading
    let wantH = th;
    if (planar > 0.4) wantH = Math.atan2(vel.current.x, vel.current.z);
    let dH = wantH - rigHeading.current;
    dH = Math.atan2(Math.sin(dH), Math.cos(dH));
    rigHeading.current += dH * (1 - Math.exp(-rigHeadingSmooth * dt));
    headRef.current = rigHeading.current;

    rg.position.copy(pos.current);
    rg.rotation.y = rigHeading.current;
  }, renderPriority);

  return (
    <group ref={rig}>
      <group scale={scale}>
        <ChampionMesh
          type={type}
          champion={champion}
          identityKey={identityKey}
          clan={clan}
          position={[0, 0, 0]}
          rotation={0}
          selected
          showLabel={false}
          hideFloaters
          restPose="standing"
          breatheIntensity={0.4}
          companionDrive={drive}
          companionRenderPriority={renderPriority}
          sceneScale={1}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/models/RobotExpressive.glb");
