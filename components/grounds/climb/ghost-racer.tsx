"use client";
// Async Ascent ghost — SNAP-copies YOUR Trainer + champion poses at the line,
// then races the recorded path from that exact origin (same time & space).
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ChampionMesh, READER_SCALE, WORLD_AGENT_SCALE } from "../champion-mesh";
import { RobotPilot, FlyingFollower } from "../flying-cast";
import { COMPANION_FOLLOW, companionDockSlot } from "../companion-follow";
import { blank } from "@/lib/evolve/progression";
import { previewRookieChampion } from "@/lib/first-duel";
import { ROSTER } from "@/lib/engine/roster";
import { sampleGhostAt, type ClimbGhostSample } from "@/lib/climb-ghost";
import type { Champion, CreatureType } from "@/lib/types";

/** Desktop capsule centre → soles (matches world.tsx FOOT_OFF). Mobile pass 0. */
export const GHOST_CAPSULE_FOOT = (0.55 + 0.45) * READER_SCALE;

/** See-through twin — readable, clearly not solid. */
const GHOST_OPACITY = 0.2;
const GHOST_BODY = "#c8d4ff";
const GHOST_GLOW = "#7a92ff";

function isJetpackVfx(mesh: THREE.Mesh): boolean {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    if (!mat) continue;
    const m = mat as THREE.MeshBasicMaterial;
    if (m.blending === THREE.AdditiveBlending) return true;
    if (m.isMeshBasicMaterial && m.transparent) return true;
  }
  let p: THREE.Object3D | null = mesh;
  while (p) {
    if (p.userData?.ghostKeep) return true;
    p = p.parent;
  }
  return false;
}

function ghostifySolid(root: THREE.Object3D, opacity = GHOST_OPACITY) {
  const color = new THREE.Color(GHOST_BODY);
  const emissive = new THREE.Color(GHOST_GLOW);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (isJetpackVfx(mesh)) return;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 3;
    mesh.material = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity,
      depthWrite: false,
      roughness: 0.45,
      metalness: 0.08,
    });
  });
}

function useGhostify(rootRef: React.RefObject<THREE.Object3D | null>, opacity = GHOST_OPACITY) {
  const seen = useRef(0);
  // After the live cast publishes poses (priority 0).
  useFrame(() => {
    const root = rootRef.current;
    if (!root) return;
    let n = 0;
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) n++;
    });
    if (n < 1 || n === seen.current) return;
    ghostifySolid(root, opacity);
    seen.current = n;
  }, -1);
}

export function ClimbGhostRacer({
  path,
  running,
  runStartMs: _runStartMs = 0,
  type = "LOGIC",
  mindKey,
  champion,
  accent: _accent = GHOST_GLOW,
  scaleY = 1,
  scaleZ = 1,
  spawn = [0, 1.1, -2.5] as [number, number, number],
  followPos,
  /** Live champion world pose (pedestal / ready dock). Required for overlap at the line. */
  champFollowPos,
  feetBelow = 0,
  faceHeading = 0,
}: {
  path: ClimbGhostSample[];
  running: boolean;
  runStartMs?: number;
  type?: CreatureType;
  mindKey?: string;
  champion?: Champion;
  accent?: string;
  scaleY?: number;
  scaleZ?: number;
  spawn?: [number, number, number];
  followPos?: React.RefObject<THREE.Vector3 | null>;
  champFollowPos?: React.RefObject<THREE.Vector3 | null>;
  feetBelow?: number;
  faceHeading?: number;
}) {
  const trainerGrp = useRef<THREE.Group>(null);
  const champReadyGrp = useRef<THREE.Group>(null);
  const ghostRoot = useRef<THREE.Group>(null);
  const startAt = useRef(0);
  const armed = useRef(false);
  const origin = useRef({ x: spawn[0], y: spawn[1], z: spawn[2] });
  const pilotPos = useRef(new THREE.Vector3(spawn[0], spawn[1], spawn[2]));
  const headingRef = useRef(faceHeading);
  const flyingRef = useRef(false);
  const burstRef = useRef(0);
  const jetEmit = useRef(0);
  const prevPilot = useRef(new THREE.Vector3(spawn[0], spawn[1], spawn[2]));
  /** Champion pose at the moment flight starts — FlyingFollower takes off from here. */
  const launchChamp = useRef<[number, number, number]>([spawn[0], spawn[1], spawn[2]]);

  const path0 = path[0];
  const spawnKey = `${spawn[0]},${spawn[1]},${spawn[2]}`;
  const key = (mindKey && ROSTER[mindKey] ? mindKey : null) || null;
  const force = (key ? ROSTER[key]!.type : type) as CreatureType;
  const champBody = useMemo(() => {
    if (champion) return champion;
    if (key) return previewRookieChampion(key);
    return blank();
  }, [champion, key]);

  useGhostify(ghostRoot, GHOST_OPACITY);

  useEffect(() => {
    armed.current = false;
    startAt.current = 0;
    origin.current = { x: spawn[0], y: spawn[1], z: spawn[2] };
    pilotPos.current.set(origin.current.x, origin.current.y, origin.current.z);
    prevPilot.current.copy(pilotPos.current);
    flyingRef.current = false;
    headingRef.current = faceHeading;
  }, [path, _runStartMs, spawnKey, faceHeading]);

  useFrame((_, dtRaw) => {
    const g = trainerGrp.current;
    if (!g || !path0) return;
    const dt = Math.min(0.05, dtRaw);
    const fp = followPos?.current;
    const cp = champFollowPos?.current;
    flyingRef.current = running;

    if (!running) {
      armed.current = false;
      // Hard snap onto the live Trainer — no lag, no side offset.
      const tx = fp?.x ?? spawn[0];
      const ty = fp?.y ?? spawn[1];
      const tz = fp?.z ?? spawn[2];
      g.position.set(tx, ty, tz);
      pilotPos.current.set(tx, ty, tz);
      prevPilot.current.set(tx, ty, tz);
      headingRef.current = faceHeading;
      jetEmit.current = 0;

      // Hard snap champion onto the live champion (pedestal / ready dock).
      const cg = champReadyGrp.current;
      if (cg) {
        let cx: number;
        let cy: number;
        let cz: number;
        if (cp) {
          cx = cp.x;
          cy = cp.y;
          cz = cp.z;
        } else {
          const dock = companionDockSlot(tx, tz, faceHeading);
          cx = dock.tx;
          cy = ty - COMPANION_FOLLOW.wingDrop * 0.35;
          cz = dock.tz;
        }
        cg.position.set(cx, cy, cz);
        launchChamp.current = [cx, cy, cz];
      }
      return;
    }

    if (!armed.current) {
      armed.current = true;
      startAt.current = performance.now();
      const ox = fp?.x ?? spawn[0];
      const oy = fp?.y ?? spawn[1];
      const oz = fp?.z ?? spawn[2];
      origin.current = { x: ox, y: oy, z: oz };
      g.position.set(ox, oy, oz);
      pilotPos.current.set(ox, oy, oz);
      prevPilot.current.set(ox, oy, oz);
      if (cp) launchChamp.current = [cp.x, cp.y, cp.z];
      burstRef.current += 1;
    }

    const tMs = Math.max(0, performance.now() - startAt.current);
    const s = sampleGhostAt(path, tMs) ?? path0;
    const o = origin.current;
    const tx = o.x;
    const ty = o.y + (s.y - path0.y) * scaleY;
    const tz = o.z + (s.z - path0.z) * scaleZ;
    // Tight catch-up on the recorded path (still frame-rate independent).
    const k = 1 - Math.exp(-22 * dt);
    g.position.x += (tx - g.position.x) * k;
    g.position.y += (ty - g.position.y) * k;
    g.position.z += (tz - g.position.z) * k;
    pilotPos.current.copy(g.position);

    const dx = g.position.x - prevPilot.current.x;
    const dz = g.position.z - prevPilot.current.z;
    if (dx * dx + dz * dz > 1e-6) headingRef.current = Math.atan2(dx, dz);
    else headingRef.current = faceHeading;
    prevPilot.current.copy(g.position);

    jetEmit.current += dt;
    if (jetEmit.current > 0.07) {
      jetEmit.current = 0;
      burstRef.current += 1;
    }
  }, -1);

  if (!path.length || !path0) return null;

  return (
    <group ref={ghostRoot}>
      <group ref={trainerGrp} position={[spawn[0], spawn[1], spawn[2]]}>
        <group position={[0, -feetBelow, 0]}>
          <Suspense fallback={null}>
            <RobotPilot
              force={force}
              flyingRef={flyingRef}
              burstRef={burstRef}
              faceHeading={faceHeading}
              scale={READER_SCALE}
              lean={0.42}
            />
          </Suspense>
        </group>
      </group>
      {/* Ready line: sit on their champion. Flight: take off from that exact spot. */}
      {!running && (
        <group ref={champReadyGrp}>
          <Suspense fallback={null}>
            <ChampionMesh
              type={force}
              champion={champBody}
              position={[0, 0, 0]}
              rotation={faceHeading - 0.25}
              showLabel={false}
              hideFloaters
              breatheIntensity={0.9}
              restPose="standing"
              sceneScale={WORLD_AGENT_SCALE}
            />
          </Suspense>
        </group>
      )}
      {running && (
        <Suspense fallback={null}>
          <FlyingFollower
            type={force}
            champion={champBody}
            identityKey={key ? `ascent-ghost-${key}` : `ascent-ghost-${force}`}
            targetRef={pilotPos}
            headingRef={headingRef}
            scale={WORLD_AGENT_SCALE}
            renderPriority={0}
            spawnFrom={launchChamp.current}
            chasing
            suppressJetpack={false}
          />
        </Suspense>
      )}
    </group>
  );
}
