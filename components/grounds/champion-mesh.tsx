"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor, tierIndex } from "@/lib/evolve/progression";
import { appearanceOf, type Appearance } from "@/lib/evolve/appearance";
import { archetypeAppearance, kitFor } from "@/lib/render/archetypes";
import { modelFor, ALL_MODELS } from "@/lib/render/model-registry";
import { ArchetypeFeatures } from "@/components/grounds/archetype-features";
import { bodyPalette, regionOf, sideOf, roleOf, seedFrom, type BodyPalette } from "@/lib/render/palette";

for (const m of ALL_MODELS) useGLTF.preload(m);

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function pickClip(clips: THREE.AnimationClip[], ...names: string[]): THREE.AnimationClip | undefined {
  for (const n of names) {
    const c = clips.find((c) => c.name.toLowerCase() === n) || clips.find((c) => c.name.toLowerCase().includes(n));
    if (c) return c;
  }
  return clips[0];
}

export interface BuiltCharacter {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction | undefined>;
  bones: Record<string, THREE.Bone>;
  boneBase: Record<string, THREE.Vector3>;
  morph: { headScale: number; handScale: number };
  h: number;
  emissive: number;
  palette: BodyPalette;
}

export function buildCharacter(
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[],
  champion: Champion,
  colorHex: string,
  appOverride?: Appearance,
  seed = 0,
): BuiltCharacter {
  const root = skeletonClone(scene) as THREE.Group;
  // archetype silhouette (when provided) drives proportions; else genome only
  const app = appOverride ?? appearanceOf(champion);
  // a per-individual multi-colour scheme anchored on the Force colour — distinct
  // body regions, trim, and a "clothing pattern" so individuals are identifiable
  const pal: BodyPalette = bodyPalette(colorHex, seed);

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.frustumCulled = false;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      const region = regionOf(m.name || "");
      const side = sideOf(m.name || "");
      const role = roleOf(mat.name);
      const partHex = pal.colorFor(region, side, role);
      const part = new THREE.Color(partHex);
      if (mat.color) mat.color.copy(part);
      if ("emissive" in mat) {
        // low body emissive so the ALBEDO colours read; the archetype features +
        // aura carry the bloom. Dark joints stay matte; lit parts get a faint seam.
        mat.emissive = part.clone();
        mat.emissiveIntensity = (role === "dark" ? 0.04 : 0.16) * (0.6 + app.emissive * 0.5);
      }
      // surface finish per material role: plates read metallic, joints matte
      if ("metalness" in mat) mat.metalness = clamp01(app.metalness + (role === "plate" ? 0.28 : role === "dark" ? -0.1 : 0.04));
      if ("roughness" in mat) mat.roughness = clamp01(app.roughness + (role === "plate" ? -0.22 : role === "dark" ? 0.2 : 0.02));
      mat.needsUpdate = true;
      m.material = mat;
    }
  });

  root.updateMatrixWorld(true);
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(root).getSize(size);
  const unitScale = 1 / (size.y || 1);
  const base = unitScale * app.h;
  root.scale.set(base * app.width, base, base * app.width);

  const bones: Record<string, THREE.Bone> = {};
  const boneBase: Record<string, THREE.Vector3> = {};
  root.traverse((o) => {
    const b = o as THREE.Bone;
    if (b.isBone) {
      const nm = b.name.toLowerCase();
      bones[nm] = b;
      boneBase[nm] = b.scale.clone();
    }
  });
  const morph = { headScale: app.headScale, handScale: app.handScale };
  applyBoneMorph(bones, boneBase, morph);

  root.position.y = 0;
  root.updateMatrixWorld(true);
  root.position.y -= new THREE.Box3().setFromObject(root).min.y;

  const mixer = new THREE.AnimationMixer(root);
  const actions: Record<string, THREE.AnimationAction | undefined> = {
    idle: clipAction(mixer, animations, "idle"),
    walk: clipAction(mixer, animations, "walking", "walk"),
    run: clipAction(mixer, animations, "running", "run"),
    jump: clipAction(mixer, animations, "jump"),
    punch: clipAction(mixer, animations, "punch", "attack"),
    wave: clipAction(mixer, animations, "wave"),
  };
  actions.punch?.setLoop(THREE.LoopOnce, 1);
  if (actions.punch) actions.punch.clampWhenFinished = true;
  // play the leap once and hold the airborne pose instead of looping the whole
  // hop (crouch→land) over and over while still in the air — that looked robotic
  actions.jump?.setLoop(THREE.LoopOnce, 1);
  if (actions.jump) actions.jump.clampWhenFinished = true;
  actions.idle?.reset().play();

  return { root, mixer, actions, bones, boneBase, morph, h: app.h, emissive: app.emissive, palette: pal };
}

function clipAction(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[], ...names: string[]) {
  const c = pickClip(clips, ...names);
  return c ? mixer.clipAction(c) : undefined;
}

export function applyBoneMorph(bones: Record<string, THREE.Bone>, boneBase: Record<string, THREE.Vector3>, morph: { headScale: number; handScale: number }) {
  for (const nm in bones) {
    const b = bones[nm];
    const bb = boneBase[nm];
    if (!bb) continue;
    let s = 1;
    if (nm === "head") s = morph.headScale;
    else if (nm.includes("palm") || nm === "thumbl" || nm === "thumbr") s = morph.handScale;
    else continue;
    b.scale.set(bb.x * s, bb.y * s, bb.z * s);
  }
}

export function ChampionMesh({
  type,
  champion,
  position,
  rotation = 0,
  selected = false,
  onSelect,
  label,
  showLabel = true,
  punchSignal = 0,
  hitSignal = 0,
  hpFrac,
  baseColorOverride,
  wander = false,
  worldRadius = 34,
  wanderInner = 0,
  wanderSpeed = 3.0,
  idlePhase,
  idleSpeed,
  auraDim,
  identityKey,
}: {
  type: CreatureType;
  champion: Champion;
  position: [number, number, number];
  rotation?: number;
  selected?: boolean;
  onSelect?: () => void;
  label?: string;
  showLabel?: boolean;
  punchSignal?: number;
  hitSignal?: number;
  hpFrac?: number;
  baseColorOverride?: string;
  wander?: boolean;
  worldRadius?: number;
  wanderInner?: number;
  wanderSpeed?: number;
  /** desync the idle clip across a gallery of portraits */
  idlePhase?: number;
  idleSpeed?: number;
  /** shrink the energy aura so the body reads clearly in gallery portraits */
  auraDim?: boolean;
  /** stable individual id → unique colour scheme / clothing pattern */
  identityKey?: string;
}) {
  const { scene, animations } = useGLTF(modelFor(type));
  const colHex = baseColorOverride || TYPE_COLOR[type] || "#8888ff";
  const col = useMemo(() => new THREE.Color(colHex), [colHex]);

  const app = useMemo(() => archetypeAppearance(champion, type), [champion, type]);
  const lf = levelFor(champion.xp);
  const tier = tierFor(lf.level);
  const ti = tierIndex(lf.level);

  // per-individual seed → distinct multi-colour scheme. Prefer an explicit id;
  // else fall back to a hash of the career so different builds still differ.
  const seed = useMemo(
    () => seedFrom(identityKey || `${colHex}|${champion.xp}|${champion.aggression}|${champion.flair}|${champion.resilience}|${champion.creativity}`),
    [identityKey, colHex, champion.xp, champion.aggression, champion.flair, champion.resilience, champion.creativity],
  );

  const appKey = `${type}|${champion.xp}|${champion.aggression}|${champion.control}|${champion.flair}|${champion.resilience}|${champion.creativity}|${champion.losses}|${colHex}|${seed}`;
  const built = useMemo(() => buildCharacter(scene, animations, champion, colHex, app, seed), [scene, animations, appKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const gref = useRef<THREE.Group>(null);
  const motion = useRef<THREE.Group>(null);
  const evoRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const lunge = useRef(0);
  const recoil = useRef(0);

  // wander state
  const wpos = useRef(new THREE.Vector3(position[0], 0, position[2]));
  const wtarget = useRef<THREE.Vector3 | null>(null);
  const wheading = useRef(rotation);
  const still = useRef(Math.random() * 2);
  const movingPrev = useRef(false);
  const phase = useMemo(() => Math.random() * 6.28, []);

  useEffect(() => {
    if (!punchSignal) return;
    const p = built.actions.punch;
    const idle = built.actions.idle;
    if (p) {
      idle?.fadeOut(0.12);
      p.reset().setEffectiveTimeScale(1.4).setEffectiveWeight(1).fadeIn(0.12).play();
      const onFin = () => {
        p.fadeOut(0.25);
        idle?.reset().fadeIn(0.25).play();
        built.mixer.removeEventListener("finished", onFin);
      };
      built.mixer.addEventListener("finished", onFin);
    }
    lunge.current = 1;
  }, [punchSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hitSignal) recoil.current = 1;
  }, [hitSignal]);

  // gallery portraits: offset the idle clip + nudge its speed so a wall of
  // models never breathes in lockstep
  useEffect(() => {
    const idle = built.actions.idle;
    if (!idle) return;
    if (idlePhase != null) idle.time = idlePhase;
    // archetype sets the base tempo (heavy/calm vs jittery/lively); the gallery
    // desync multiplier rides on top so a wall of the same Force never beats in
    // lockstep.
    idle.setEffectiveTimeScale(kitFor(type).idleSpeed * (idleSpeed ?? 1));
  }, [built, idlePhase, idleSpeed, type]);

  // evolution shards + rings, precomputed
  const shardN = Math.min(10, Math.max(0, lf.level - 1));
  const shards = useMemo(
    () => Array.from({ length: shardN }, (_, i) => ({ a: (i / Math.max(1, shardN)) * 6.28, r: 1.0 + Math.random() * 0.4, y: app.h * 0.45 + (Math.random() - 0.3) * 0.9, spd: 0.3 + Math.random() * 0.6 })),
    [shardN], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringN = tier.rings;
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);

    // lunge / recoil
    lunge.current = Math.max(0, lunge.current - dt * 3.2);
    recoil.current = Math.max(0, recoil.current - dt * 3.0);
    if (motion.current) motion.current.position.z = lunge.current * 0.5 - recoil.current * 0.4;

    // wander
    if (wander && gref.current) {
      if (!wtarget.current || wpos.current.distanceTo(wtarget.current) < 1.2) {
        if (still.current <= 0) {
          // roam an annulus: stay outside the arena keep-out, inside the world radius
          const a = Math.random() * 6.28;
          const r = wanderInner + Math.random() * Math.max(1, worldRadius - wanderInner);
          wtarget.current = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
          still.current = 0.6 + Math.random() * 2.2;
        }
      }
      let moving = false;
      if (still.current > 0 && (!wtarget.current || wpos.current.distanceTo(wtarget.current) < 1.2)) {
        still.current -= dt;
      } else if (wtarget.current) {
        const dir = wtarget.current.clone().sub(wpos.current);
        dir.y = 0;
        const dl = dir.length();
        if (dl > 0.08) {
          dir.normalize();
          wpos.current.addScaledVector(dir, wanderSpeed * dt);
          const want = Math.atan2(dir.x, dir.z);
          let d = want - wheading.current;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          wheading.current += d * Math.min(1, dt * 6);
          moving = true;
        }
      }
      gref.current.position.set(wpos.current.x, 0, wpos.current.z);
      gref.current.rotation.y = wheading.current;
      if (moving !== movingPrev.current) {
        movingPrev.current = moving;
        const idle = built.actions.idle;
        const walk = built.actions.walk;
        if (moving) {
          idle?.fadeOut(0.2);
          walk?.reset().fadeIn(0.2).play();
        } else {
          walk?.fadeOut(0.2);
          idle?.reset().fadeIn(0.2).play();
        }
      }
    }

    // evo animations
    if (auraRef.current) auraRef.current.scale.setScalar(1 + Math.sin(t * 1.6 + phase) * 0.06);
    for (let i = 0; i < shardRefs.current.length; i++) {
      const m = shardRefs.current[i];
      const s = shards[i];
      if (!m || !s) continue;
      s.a += s.spd * 0.012;
      m.position.set(Math.cos(s.a) * s.r, s.y + Math.sin(t * 0.8 + s.r) * 0.12, Math.sin(s.a) * s.r);
      m.rotation.y += 0.04;
    }
    for (let i = 0; i < ringRefs.current.length; i++) {
      const m = ringRefs.current[i];
      if (m) m.rotation.z += (0.2 + i * 0.15) * 0.012;
    }
    if (crownRef.current) {
      crownRef.current.rotation.y += 0.01;
      crownRef.current.position.y = app.h + 0.3 + Math.sin(t * 1.4) * 0.05;
    }
  });

  const auraOpacity = (0.05 + ti * 0.045) * 0.5 * (auraDim ? 0.32 : 1);
  const auraR = app.h * (auraDim ? 0.46 : 0.62);

  return (
    <group
      ref={gref}
      position={wander ? undefined : position}
      rotation={wander ? undefined : [0, rotation, 0]}
      onClick={onSelect ? (e) => (e.stopPropagation(), onSelect()) : undefined}
      onPointerOver={onSelect ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={onSelect ? () => (document.body.style.cursor = "default") : undefined}
    >
      <group ref={motion} rotation={[kitFor(type).lean, 0, 0]}>
        <primitive object={built.root} />
      </group>

      {/* per-Force signature attachments — the species markings that make the
          shared rig read as five different beings; tinted to this individual */}
      <ArchetypeFeatures type={type} h={app.h} color={built.palette.glow} accent={built.palette.accent} dim={auraDim} />

      {/* aura sphere */}
      <mesh ref={auraRef} position={[0, app.h * 0.55, 0]}>
        <sphereGeometry args={[auraR, 20, 20]} />
        <meshBasicMaterial color={col} transparent opacity={auraOpacity} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* ground aura ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.78, 0.92, 48]} />
        <meshBasicMaterial color={col} transparent opacity={selected ? 0.95 : 0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* orbiting shards */}
      {shards.map((s, i) => (
        <mesh key={i} ref={(el) => { shardRefs.current[i] = el; }} position={[Math.cos(s.a) * s.r, s.y, Math.sin(s.a) * s.r]}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6} metalness={0.4} roughness={0.3} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* tier rings */}
      {Array.from({ length: ringN }).map((_, i) => (
        <mesh key={i} ref={(el) => { ringRefs.current[i] = el; }} rotation={[Math.PI / 2 + i * 0.45, 0, 0]} position={[0, app.h * 0.5, 0]}>
          <torusGeometry args={[1.0 + i * 0.25, 0.02, 10, 80]} />
          <meshBasicMaterial color={col} transparent opacity={0.3} />
        </mesh>
      ))}

      {/* legend crown */}
      {tier.crown && (
        <group ref={crownRef} position={[0, app.h + 0.3, 0]}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42]}>
                <coneGeometry args={[0.06, 0.3, 6]} />
                <meshStandardMaterial color="#f5d020" emissive="#f5d020" emissiveIntensity={2.2} metalness={0.8} roughness={0.2} />
              </mesh>
            );
          })}
        </group>
      )}

      {hpFrac != null && (
        <Html position={[0, app.h + 0.7, 0]} center distanceFactor={9} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ width: 120, height: 9, background: "#241f33", borderRadius: 6, border: "1px solid #000", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, hpFrac) * 100}%`, height: "100%", background: hpFrac > 0.55 ? "#36d39a" : hpFrac > 0.25 ? "#f0a93a" : "#ff5a6a", transition: "width .4s ease" }} />
          </div>
        </Html>
      )}

      {showLabel && label && (
        <Html position={[0, app.h + 1.0, 0]} center distanceFactor={11} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: 700, color: "#fff", fontSize: 20, textShadow: "0 2px 8px #000", whiteSpace: "nowrap", textAlign: "center", opacity: selected ? 1 : 0.82 }}>
            {label}
            <div style={{ fontSize: 10, color: colHex, letterSpacing: 1 }}>{tier.name}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
