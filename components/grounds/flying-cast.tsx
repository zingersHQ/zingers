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
import { blank, TYPE_COLOR } from "@/lib/evolve/progression";
import { GOLD, readerPalette } from "@/lib/render/palette";
import type { Champion, CreatureType } from "@/lib/types";
import { COMPANION_FOLLOW, companionDockSlot, companionPathSlot } from "./companion-follow";
import { useSettings } from "@/store/settings";

// Pilot ground-rings — same language as Handler in world.tsx: detach + sink while
// aloft so altitude reads under the Trainer. Body-local units (rings sit outside
// the lean / scale groups). Gated by reduce-motion.
const PILOT_RING_SINK_BIG = 0.85;
const PILOT_RING_SINK_SMALL = 1.5;
const PILOT_RING_OSC_AMP = 0.16;
const PILOT_RING_OSC_HZ = 1.4;
const PILOT_RING_FALL_UP = 0.55;
const PILOT_RING_FALL_REF = 8;
const PILOT_RING_EASE = 8;
const _pilotFlatQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _pilotParentQ = new THREE.Quaternion();

// Flight leash mirrors Grounds OwnedCompanion's *moving* branch: inherit the
// pilot's path velocity, then close the wing-slot gap (catchK). Without the
// inherited velocity, Climb's ~8–12 u/s cruise leaves the champion lagging
// many units behind the authored pathBack.
const EXTRA_GRAV = 1.35;
const VERT_SPRING = 8; // same Y spring OwnedCompanion uses while flying

// Match Handler airborne polish (world.tsx FLY_* ) so Climb reads as real flight.
const FLY_FOOT = 1.45;
const FLY_LEG_HANG = 0.55;
const FLY_KNEE_BEND = 0.75;

function legBone(bones: Record<string, THREE.Bone>, part: "foot" | "upperleg" | "lowerleg", side: "l" | "r") {
  return bones[`${part}.${side}`] ?? bones[`${part}${side}`];
}

// ── the Trainer's robot, flying with a jetpack (the pilot) ────────────────────
// Builds the RobotExpressive rig with the Reader palette, plays the idle clip as a
// hover pose, and wears the jetpack. `faceHeading` orients it down-track.
// While flyingRef: forward lean + leg hang (same language as desktop Circuit).
export function RobotPilot({
  force = null,
  flyingRef,
  burstRef,
  faceHeading = 0,
  scale = READER_SCALE,
  lean = 0.38,
  /** Optional climb/sink velocity (u/s) — rings ride up while descending. */
  climbVelRef,
}: {
  force?: CreatureType | null;
  flyingRef: React.RefObject<boolean>;
  burstRef: React.RefObject<number>;
  faceHeading?: number;
  scale?: number;
  /** Forward lean (rad) while flying — nose into travel. */
  lean?: number;
  climbVelRef?: React.RefObject<number>;
}) {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(
    () => buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal),
    [scene, animations, pal],
  );
  const leanGrp = useRef<THREE.Group>(null);
  const footTuck = useRef(0);
  const legHang = useRef(0);
  const footBind = useRef({ l: new THREE.Quaternion(), r: new THREE.Quaternion() });
  const bindReady = useRef(false);
  const eHang = useRef(new THREE.Euler());
  const qFoot = useRef(new THREE.Quaternion());
  const qThigh = useRef(new THREE.Quaternion());
  const qKnee = useRef(new THREE.Quaternion());
  const ringBig = useRef<THREE.Mesh>(null);
  const ringSmall = useRef<THREE.Mesh>(null);
  const ringYBig = useRef(0);
  const ringYSmall = useRef(0);
  const ringOscT = useRef(0);

  useEffect(() => {
    const idle = built.actions.idle;
    if (idle) {
      idle.reset();
      idle.fadeIn(0.2);
      idle.play();
    }
    bindReady.current = false;
    return () => {
      idle?.stop();
    };
  }, [built]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);

    const fl = legBone(built.bones, "foot", "l");
    const fr = legBone(built.bones, "foot", "r");
    if (!bindReady.current && fl && fr) {
      footBind.current.l.copy(fl.quaternion);
      footBind.current.r.copy(fr.quaternion);
      bindReady.current = true;
    }

    const aloft = !!flyingRef.current;
    footTuck.current += ((aloft ? FLY_FOOT : 0) - footTuck.current) * (1 - Math.exp(-12 * dt));
    legHang.current += ((aloft ? 1 : 0) - legHang.current) * (1 - Math.exp(-10 * dt));

    if (fl && fr && bindReady.current) {
      if (footTuck.current > 0.001) {
        eHang.current.set(-FLY_FOOT * footTuck.current, 0, 0);
        qFoot.current.setFromEuler(eHang.current);
        fl.quaternion.copy(footBind.current.l).multiply(qFoot.current);
        fr.quaternion.copy(footBind.current.r).multiply(qFoot.current);
      } else {
        fl.quaternion.copy(footBind.current.l);
        fr.quaternion.copy(footBind.current.r);
      }
    }
    if (legHang.current > 0.001) {
      const ul = legBone(built.bones, "upperleg", "l");
      const ur = legBone(built.bones, "upperleg", "r");
      const ll = legBone(built.bones, "lowerleg", "l");
      const lr = legBone(built.bones, "lowerleg", "r");
      const thigh = FLY_LEG_HANG * legHang.current;
      const knee = FLY_KNEE_BEND * legHang.current;
      if (ul) {
        eHang.current.set(-thigh, 0, 0);
        qThigh.current.setFromEuler(eHang.current);
        ul.quaternion.multiply(qThigh.current);
      }
      if (ur) {
        eHang.current.set(-thigh, 0, 0);
        qThigh.current.setFromEuler(eHang.current);
        ur.quaternion.multiply(qThigh.current);
      }
      if (ll) {
        eHang.current.set(knee, 0, 0);
        qKnee.current.setFromEuler(eHang.current);
        ll.quaternion.multiply(qKnee.current);
      }
      if (lr) {
        eHang.current.set(knee, 0, 0);
        qKnee.current.setFromEuler(eHang.current);
        lr.quaternion.multiply(qKnee.current);
      }
    }

    if (leanGrp.current) {
      const want = aloft ? lean : 0;
      leanGrp.current.rotation.x += (want - leanGrp.current.rotation.x) * (1 - Math.exp(-8 * dt));
    }

    // Ground rings: sink while aloft (Handler parity). Keep them world-flat even
    // when Climb pitches the Flyer parent group.
    if (ringBig.current || ringSmall.current) {
      const reduce = useSettings.getState().reduceMotion;
      const climbV = climbVelRef?.current ?? 0;
      const sinkT = reduce ? 0 : aloft ? 1 : 0;
      const fallT = reduce || !aloft || climbV >= 0 ? 0 : Math.min(1, -climbV / PILOT_RING_FALL_REF);
      ringOscT.current += dt;
      const osc =
        PILOT_RING_OSC_AMP *
        (0.5 - 0.5 * Math.cos(ringOscT.current * PILOT_RING_OSC_HZ * Math.PI * 2)) *
        sinkT;
      const tgtBig = -PILOT_RING_SINK_BIG * sinkT + PILOT_RING_FALL_UP * fallT + osc * 0.4;
      const tgtSmall = -PILOT_RING_SINK_SMALL * sinkT + PILOT_RING_FALL_UP * fallT + osc;
      const rk = 1 - Math.exp(-PILOT_RING_EASE * dt);
      ringYBig.current += (tgtBig - ringYBig.current) * rk;
      ringYSmall.current += (tgtSmall - ringYSmall.current) * rk;
      const flatten = (mesh: THREE.Mesh | null, y: number) => {
        if (!mesh) return;
        mesh.position.y = y;
        const parent = mesh.parent;
        if (!parent) {
          mesh.quaternion.copy(_pilotFlatQ);
          return;
        }
        parent.getWorldQuaternion(_pilotParentQ);
        mesh.quaternion.copy(_pilotParentQ).invert().multiply(_pilotFlatQ);
      };
      flatten(ringBig.current, 0.04 + ringYBig.current);
      flatten(ringSmall.current, 0.045 + ringYSmall.current);
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
      {/* Trainer ground rings — gold by default; pledged Force tints the outer band.
          Outside lean so they stay horizontal; sink while flying (see PILOT_RING_*). */}
      <mesh ref={ringBig} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.39, 0.5, 40]} />
        <meshBasicMaterial
          color={force ? TYPE_COLOR[force] : GOLD}
          transparent
          opacity={0.78}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {force && (
        <mesh ref={ringSmall} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[0.32, 0.38, 40]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
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
  /** Pedestal / home — boot here and return when not chasing. */
  spawnFrom,
  /** When true, chase the pilot from the current position (no teleport). */
  chasing = true,
  /** Ghost / showcase: flight pose without jetpack VFX. */
  suppressJetpack = false,
  /** Publish live world pose each frame (challenge ghosts snap to this). */
  poseOut,
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
  spawnFrom?: [number, number, number];
  chasing?: boolean;
  suppressJetpack?: boolean;
  poseOut?: React.RefObject<THREE.Vector3 | null>;
}) {
  const rig = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3());
  const vel = useRef(new THREE.Vector3());
  const booted = useRef(false);
  const rigHeading = useRef(0);
  const prevPilot = useRef(new THREE.Vector3());
  const smoothPilotVel = useRef(new THREE.Vector3());
  const followTarget = useRef(new THREE.Vector3());
  const wasChasing = useRef(chasing);

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
    const { wingDrop, catchK, catchMax, accel, velSmooth, slotSmooth, rigHeadingSmooth, minPathSpeed } =
      COMPANION_FOLLOW;

    // Boot at the pedestal (if given) so chase starts as a real takeoff, not a pop-in.
    if (!booted.current) {
      if (spawnFrom) {
        pos.current.set(spawnFrom[0], spawnFrom[1], spawnFrom[2]);
        followTarget.current.copy(pos.current);
        vel.current.set(0, 0, 0);
        rigHeading.current = th;
      } else {
        const dock = companionDockSlot(tp.x, tp.z, th);
        pos.current.set(dock.tx, tp.y - wingDrop, dock.tz);
        followTarget.current.copy(pos.current);
        vel.current.set(0, 0, 0);
        rigHeading.current = th;
      }
      prevPilot.current.copy(tp);
      smoothPilotVel.current.set(0, 0, 0);
      booted.current = true;
      wasChasing.current = chasing;
    }

    // Rising edge of chase: keep pad position — fly toward the wing slot from here.
    if (chasing && !wasChasing.current) {
      prevPilot.current.copy(tp);
      smoothPilotVel.current.set(0, 0, 0);
      vel.current.set(0, 0.8, 0); // small lift so takeoff reads
    }
    // Falling edge (fail / continue / try again): snap home — no slow return flight.
    if (!chasing && wasChasing.current && spawnFrom) {
      pos.current.set(spawnFrom[0], spawnFrom[1], spawnFrom[2]);
      followTarget.current.copy(pos.current);
      vel.current.set(0, 0, 0);
      smoothPilotVel.current.set(0, 0, 0);
      prevPilot.current.copy(tp);
      rigHeading.current = th;
    }
    wasChasing.current = chasing;

    if (!chasing) {
      let homeX: number;
      let homeY: number;
      let homeZ: number;
      if (spawnFrom) {
        homeX = spawnFrom[0];
        homeY = spawnFrom[1];
        homeZ = spawnFrom[2];
      } else {
        const dock = companionDockSlot(tp.x, tp.z, th);
        homeX = dock.tx;
        homeY = tp.y - wingDrop;
        homeZ = dock.tz;
      }
      // Hold on the pedestal (already snapped on fail); tiny settle only if nudged.
      pos.current.set(homeX, homeY, homeZ);
      followTarget.current.set(homeX, homeY, homeZ);
      vel.current.set(0, 0, 0);
      speedRef.current = 0;
      velRef.current.set(0, 0, 0);
      movingRef.current = false;
      flyingRef.current = false;
      rigHeading.current = th;
      headRef.current = th;
      rg.position.copy(pos.current);
      rg.rotation.y = rigHeading.current;
      if (poseOut?.current) poseOut.current.copy(pos.current);
      return;
    }

    // Measure / smooth pilot path velocity (OwnedCompanion's smv).
    const rawVx = dt > 0 ? (tp.x - prevPilot.current.x) / dt : 0;
    const rawVy = dt > 0 ? (tp.y - prevPilot.current.y) / dt : 0;
    const rawVz = dt > 0 ? (tp.z - prevPilot.current.z) / dt : 0;
    prevPilot.current.copy(tp);
    const vK = 1 - Math.exp(-velSmooth * dt);
    const smv = smoothPilotVel.current;
    smv.x += (rawVx - smv.x) * vK;
    smv.y += (rawVy - smv.y) * vK;
    smv.z += (rawVz - smv.z) * vK;
    const smSpeed = Math.hypot(smv.x, smv.z);

    // Path trail while moving; idle wing dock when nearly still (Grounds parity).
    const raw =
      smSpeed > minPathSpeed ? companionPathSlot(tp.x, tp.z, th) : companionDockSlot(tp.x, tp.z, th);
    const rawSy = tp.y - wingDrop;
    const ft = followTarget.current;
    const tK = 1 - Math.exp(-slotSmooth * dt);
    ft.x += (raw.tx - ft.x) * tK;
    ft.y += (rawSy - ft.y) * tK;
    ft.z += (raw.tz - ft.z) * tK;

    const ex = ft.x - pos.current.x;
    const ey = ft.y - pos.current.y;
    const ez = ft.z - pos.current.z;

    // Match pilot velocity, then close the slot gap — without smv the champion
    // trails lag = cruiseSpeed / catchK (~7u at Climb pace) behind the wing.
    let wantVx = smv.x + ex * catchK;
    let wantVz = smv.z + ez * catchK;
    const wantPlanar = Math.hypot(wantVx, wantVz);
    if (wantPlanar > catchMax && wantPlanar > 0) {
      const k = catchMax / wantPlanar;
      wantVx *= k;
      wantVz *= k;
    }
    const kv = 1 - Math.exp(-accel * dt);
    vel.current.x += (wantVx - vel.current.x) * kv;
    vel.current.z += (wantVz - vel.current.z) * kv;
    // Vertical: ride the pilot's climb/sink, spring to the wing-drop slot.
    const wantVy = smv.y + ey * VERT_SPRING * (ey < 0 ? EXTRA_GRAV : 1);
    vel.current.y += (wantVy - vel.current.y) * kv;

    pos.current.x += vel.current.x * dt;
    pos.current.y += vel.current.y * dt;
    pos.current.z += vel.current.z * dt;

    // publish pose drive
    const planar = Math.hypot(vel.current.x, vel.current.z);
    speedRef.current = planar;
    velRef.current.copy(vel.current);
    movingRef.current = planar > 0.35;
    flyingRef.current = true;

    // face travel direction while chasing, else the pilot's heading
    let wantH = th;
    if (planar > 0.28 || smSpeed > minPathSpeed) {
      wantH = planar > 0.12 ? Math.atan2(vel.current.x, vel.current.z) : th;
    }
    let dH = wantH - rigHeading.current;
    dH = Math.atan2(Math.sin(dH), Math.cos(dH));
    rigHeading.current += dH * (1 - Math.exp(-rigHeadingSmooth * dt));
    headRef.current = rigHeading.current;

    rg.position.copy(pos.current);
    rg.rotation.y = rigHeading.current;
    if (poseOut?.current) poseOut.current.copy(pos.current);
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
          hideFloaters // aura / archetype floaters only — ground ring stays (companionDrive)
          suppressJetpack={suppressJetpack}
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
