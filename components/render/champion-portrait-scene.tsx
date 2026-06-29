"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor } from "@/lib/evolve/progression";
import { ChampionMesh } from "@/components/grounds/champion-mesh";
import type { KeeperKind } from "@/components/grounds/keeper-regalia";
import { modelScaleFor } from "@/lib/render/fit";
import { seedFrom } from "@/lib/render/palette";
import { RENDER_PRESETS, RENDER_YAW, type RenderPresetId } from "@/lib/render/presets";
import { ANIM, bodyBobForMode, breatheIntensityForMode, idleSpeedForMode, restPoseForMode, type CreatureAnimMode } from "@/lib/render/animations";

function Rig({ lookY }: { lookY: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, lookY, 0);
  }, [camera, lookY]);
  return null;
}

const _box = new THREE.Box3();
const _b = new THREE.Box3();
const _size = new THREE.Vector3();
const _ctr = new THREE.Vector3();

/** World-space AABB of the figure's *solid* silhouette — body, phenotype, crown,
 *  archetype/keeper features — skipping any node flagged `userData.fitIgnore`
 *  (the faint, wide aura glow and floor ring), which may bleed off the tile edge
 *  as atmosphere without counting as overflow. */
function solidBounds(root: THREE.Object3D, out: THREE.Box3) {
  out.makeEmpty();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.visible === false || o.userData?.fitIgnore) return;
    const geo = m.geometry as THREE.BufferGeometry | undefined;
    if (!geo) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    if (!geo.boundingBox) return;
    _b.copy(geo.boundingBox).applyMatrix4(m.matrixWorld);
    out.union(_b);
  });
  return out;
}

/** Measures that solid silhouette and dollies the camera so it fills the tile
 *  with an even margin and never clips — on whichever axis binds first (tall
 *  bodies bind on height; crowned/decorated legends in a narrow card bind on
 *  width and simply sit a touch smaller, complete). The required distance is
 *  tracked as a running max across the slow idle turn, so the frame settles on
 *  the widest pose once and holds (no breathing zoom), easing in from a sensible
 *  deterministic first guess. */
function FitFrame({
  enabled,
  fillFrac,
  fallback,
  children,
}: {
  enabled: boolean;
  fillFrac: number;
  fallback: { camZ: number; lookY: number };
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const tgt = useRef<{ y: number; dist: number } | null>(null);
  const tick = useRef(0);
  const { camera, size: vp } = useThree();
  useFrame((_, dt) => {
    if (!enabled) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (g.current && tick.current++ % 6 === 0) {
      solidBounds(g.current, _box);
      if (!_box.isEmpty() && isFinite(_box.min.y)) {
        _box.getSize(_size);
        _box.getCenter(_ctr);
        const tanV = Math.tan((cam.fov * Math.PI) / 180 / 2);
        const aspect = cam.aspect || vp.width / Math.max(1, vp.height);
        const distV = _size.y / 2 / (tanV * fillFrac);
        const distH = _size.x / 2 / (tanV * aspect * fillFrac);
        const dist = Math.max(distV, distH);
        if (!tgt.current) tgt.current = { y: _ctr.y, dist };
        else {
          tgt.current.y += (_ctr.y - tgt.current.y) * 0.2;
          tgt.current.dist = Math.max(tgt.current.dist, dist);
        }
      }
    }
    const ty = tgt.current ? tgt.current.y : fallback.lookY;
    const tz = tgt.current ? tgt.current.dist : fallback.camZ;
    const a = 1 - Math.pow(0.0012, dt);
    cam.position.x += (0 - cam.position.x) * a;
    cam.position.y += (ty - cam.position.y) * a;
    cam.position.z += (tz - cam.position.z) * a;
    cam.lookAt(0, ty, 0);
  });
  return <group ref={g}>{children}</group>;
}

/** Standing-idle orientation: faces the viewer, then lazily glances around and
 *  breathes. Every instance gets its own phase seed so a wall of portraits never
 *  moves in lockstep — it reads as a living gallery, not a row of clones. */
function IdlePose({
  children,
  baseYaw,
  seed,
  paused,
  animMode = "breathing",
}: {
  children: React.ReactNode;
  baseYaw: number;
  seed: number;
  paused: boolean;
  animMode?: CreatureAnimMode;
}) {
  const r = useRef<THREE.Group>(null);
  const standing = animMode === "standing" || animMode === "breathing" || animMode === "bounce" || animMode === "sitting";
  const bounce = animMode === "bounce";
  const ph = useMemo(
    () => ({
      gaze: seed * 6.2831,
      glance: seed * 12.9898,
      pitch: seed * 78.233,
      bob: seed * 37.719,
      gazeSpeed: ANIM.portrait.gazeSpeed + (seed % 0.04),
      glanceSpeed: ANIM.portrait.glanceSpeed + ((seed * 3.3) % 0.03),
    }),
    [seed],
  );

  useEffect(() => {
    if (r.current) r.current.rotation.y = baseYaw;
  }, [baseYaw]);

  useFrame((state) => {
    const g = r.current;
    if (!g || paused) return;
    const t = state.clock.elapsedTime;
    // two slow sines beat against each other: long stretches near the front,
    // occasional drifts to glance off to one side, then a slow return.
    const gazeAmp = standing ? ANIM.portrait.standingGazeAmp : 1;
    const gaze = Math.sin(t * ph.gazeSpeed + ph.gaze) * 0.6 + Math.sin(t * ph.glanceSpeed + ph.glance) * 0.4;
    g.rotation.y = baseYaw + gaze * 0.3 * gazeAmp + Math.sin(t * 0.5 + ph.gaze) * 0.01;
    g.rotation.x = Math.sin(t * 0.12 + ph.pitch) * ANIM.portrait.pitchAmp;
    const bobAmp = bounce ? ANIM.portrait.bobAmp * 2.2 : standing ? ANIM.portrait.standingBobAmp : ANIM.portrait.bobAmp;
    g.position.y = Math.sin(t * ANIM.portrait.bobHz + ph.bob) * bobAmp;
  });

  return <group ref={r}>{children}</group>;
}

function ReadyPulse({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return;
    const t = window.setTimeout(onReady, 1800);
    return () => window.clearTimeout(t);
  }, [onReady]);
  return null;
}

export function ChampionPortraitScene({
  type,
  champion,
  preset = "portrait",
  colorHex,
  onReady,
  paused = false,
  scale = 1,
  identityKey,
  keeper,
  autoFrame = true,
  animMode = "standing",
}: {
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  onReady?: () => void;
  /** When true, freeze spin (export screenshots). */
  paused?: boolean;
  /** Per-tile multiplier on the fitted body size (1 = preset default). */
  scale?: number;
  /** stable individual id → unique colour scheme */
  identityKey?: string;
  /** render this figure as a Keeper boss with its signature regalia */
  keeper?: KeeperKind;
  /** measure the figure and frame it to fill the tile (max size, even margin, no
   *  clipping). On by default so every live thumbnail reads big; pass false to
   *  keep the fixed preset framing. */
  autoFrame?: boolean;
  animMode?: CreatureAnimMode;
}) {
  const p = RENDER_PRESETS[preset];
  const rim = colorHex ?? TYPE_COLOR[type];
  const rimIntensity = 55 * (p.rimBoost ?? 1);
  // Under auto-frame the per-tile `scale` rides on the camera (via `fillFrac`),
  // not the mesh — so every body renders at the preset's normalised world height
  // and the frame, not the model, decides how big it reads.
  const meshScale = useMemo(
    () => modelScaleFor(champion, p, type) * (autoFrame ? 1 : scale),
    [champion, p, scale, type, autoFrame],
  );
  // identity-stable seed → the same mind always strikes the same pose/clip phase
  // (the bible's "deterministic function of a raised career" promise), while a
  // wall of different minds still stays desynced. Falls back to random when
  // there's no stable id.
  const seed = useMemo(() => {
    const key = identityKey || `${type}|${champion.xp}|${champion.aggression}|${champion.flair}|${champion.resilience}|${champion.creativity}`;
    return (seedFrom(key) % 100000) / 100000;
  }, [identityKey, type, champion]);
  const baseYaw = RENDER_YAW + (seed - 0.5) * 0.3;
  const idlePhase = seed * 4.2;
  const idleSpeed = idleSpeedForMode(animMode, seed);
  const breatheIntensity = breatheIntensityForMode(animMode);
  const bodyBob = bodyBobForMode(animMode);
  const restPose = restPoseForMode(animMode);
  // Auto-frame fill fraction (how much of the binding axis the solid silhouette
  // occupies) plus a deterministic first guess the camera eases in from before
  // the live bounding box is measured. `scale` nudges the fill so callers can
  // still zoom a touch.
  const fitCam = useMemo(() => {
    const bodyH = p.targetBodyH * p.scale;
    const crowned = tierFor(levelFor(champion.xp).level).crown;
    const fillFrac = Math.min(0.94, Math.max(0.3, 0.82 * scale));
    const figureTop = bodyH * (crowned ? 1.5 : 1.2);
    const tanV = Math.tan((p.camera.fov * Math.PI) / 180 / 2);
    return { fillFrac, fallback: { camZ: figureTop / (2 * tanV * fillFrac), lookY: figureTop / 2 } };
  }, [p, champion.xp, scale]);

  return (
    <Canvas
      shadows="percentage"
      dpr={typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : [1, 2]}
      camera={{ position: p.camera.position, fov: p.camera.fov }}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={[p.bg]} />
      {p.fog ? <fog attach="fog" args={p.fog} /> : null}
      {!autoFrame && <Rig lookY={p.camera.lookY} />}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#b9a7ff", "#160f2c", 0.7]} />
      <directionalLight position={[5, 8, 4]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight position={[-5, 3, -3]} intensity={rimIntensity} color={rim} distance={22} />
      <pointLight position={[4, 1.5, 5]} intensity={22} color="#ffffff" distance={20} />
      <Suspense fallback={null}>
        <FitFrame enabled={autoFrame} fillFrac={fitCam.fillFrac} fallback={fitCam.fallback}>
          <IdlePose baseYaw={baseYaw} seed={seed} paused={paused} animMode={animMode}>
            <group scale={meshScale}>
              <ChampionMesh
                type={type}
                champion={champion}
                position={[0, 0, 0]}
                showLabel={false}
                baseColorOverride={colorHex}
                idlePhase={idlePhase}
                idleSpeed={idleSpeed}
                breatheIntensity={breatheIntensity}
                bodyBob={bodyBob}
                restPose={restPose}
                auraDim
                identityKey={identityKey}
                keeper={keeper}
              />
            </group>
          </IdlePose>
        </FitFrame>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.62} scale={9 * meshScale} blur={2.6} far={5} resolution={512} color="#000000" />
        <ReadyPulse onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
