"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor, tierIndex, dominant } from "@/lib/evolve/progression";
import { appearanceOf, type Appearance, type BoneMorph } from "@/lib/evolve/appearance";
import { archetypeAppearance, kitFor } from "@/lib/render/archetypes";
import { ALL_MODELS, modelFor } from "@/lib/render/model-registry";
import { ArchetypeFeatures } from "@/components/grounds/archetype-features";
import { KeeperRegalia, type KeeperKind } from "@/components/grounds/keeper-regalia";
import { PhenotypeParts, BoneFollower } from "@/components/grounds/phenotype-parts";
import { phenotypeOf } from "@/lib/render/phenotype";
import { bodyPalette, forceColors, regionOf, sideOf, roleOf, seedFrom, type BodyPalette } from "@/lib/render/palette";
import { FORCES } from "@/lib/lore/canon";

for (const m of ALL_MODELS) useGLTF.preload(m);

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ── animation level-of-detail ────────────────────────────────────────────────
// Every non-owned champion runs its own AnimationMixer + bone-morph + decorative
// motion each frame. Skinning is one of the heaviest per-object costs, and a full
// Tower can hold dozens of these. We gate that work by camera distance:
//   • near  → full-rate skeletal update + decorative motion
//   • mid   → skeletal update throttled to ~15Hz, decorations frozen
//   • far   → fully frozen (you can't read the animation at that range anyway)
// The owned champion + any in a live match are exempt (always full).
const LOD_NEAR_SQ = 32 * 32;
const LOD_MID_SQ = 64 * 64;
const LOD_MID_STEP = 1 / 15; // seconds between mid-range skeletal updates

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
  morph: BoneMorph;
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
  paletteOverride?: BodyPalette,
): BuiltCharacter {
  const root = skeletonClone(scene) as THREE.Group;
  // archetype silhouette (when provided) drives proportions; else genome only
  const app = appOverride ?? appearanceOf(champion);
  // a per-individual multi-colour scheme anchored on the Force colour — distinct
  // body regions, trim, and a "clothing pattern" so individuals are identifiable.
  // The caller passes the SAME palette it uses for features/parts so the painted
  // body and the bolt-ons always agree.
  const pal: BodyPalette = paletteOverride ?? bodyPalette(colorHex, seed);

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.frustumCulled = false;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      const region = regionOf(m.name || "");
      const side = sideOf(m.name || "");
      const role = roleOf(mat.name);
      // the head's dark face IS the eyes — make them SHINE in the Force glow
      // instead of staying matte black, so each species has lit, coloured eyes
      const isEye = region === "head" && role === "dark";
      const partHex = isEye ? pal.glow : pal.colorFor(region, side, role);
      const part = new THREE.Color(partHex);
      if (mat.color) mat.color.copy(isEye ? part.clone().multiplyScalar(0.55) : part);
      if ("emissive" in mat) {
        // low body emissive so the ALBEDO colours read; the archetype features +
        // aura carry the bloom. Dark joints stay matte; lit parts get a faint seam.
        // The eyes are the exception — they blaze.
        mat.emissive = part.clone();
        mat.emissiveIntensity = isEye ? 2.4 * (0.7 + app.emissive * 0.4) : (role === "dark" ? 0.04 : 0.16) * (0.6 + app.emissive * 0.5);
      }
      // surface finish per material role: plates read metallic, joints matte
      if ("metalness" in mat) mat.metalness = clamp01(app.metalness + (role === "plate" ? 0.28 : role === "dark" ? -0.1 : 0.04));
      if ("roughness" in mat) mat.roughness = clamp01(app.roughness + (role === "plate" ? -0.22 : isEye ? -0.1 : role === "dark" ? 0.2 : 0.02));
      mat.needsUpdate = true;
      m.material = mat;
    }
  });

  root.updateMatrixWorld(true);
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(root).getSize(size);
  // UNIFORM model scale only — girth/length now live in the per-bone genome, so
  // the whole figure no longer gets squashed into a pancake (the old flatten bug).
  const base = (1 / (size.y || 1)) * app.h;
  root.scale.setScalar(base);

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
  const morph = app.morph;
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

// Drive the whole skeleton from the genome. Bone scales compound down the chain
// (a child inherits its parent's scale), so we counter the inherited factors on
// the head, neck, shoulders and arms — that way each group lands on its intended
// NET size and a barrel chest never balloons the skull. Legs hang off the hips
// (unscaled) so they need no correction.
export function applyBoneMorph(bones: Record<string, THREE.Bone>, boneBase: Record<string, THREE.Vector3>, m: BoneMorph) {
  const set = (nm: string, x: number, y: number, z: number) => {
    const b = bones[nm];
    const bb = boneBase[nm];
    if (!b || !bb) return;
    b.scale.set(bb.x * x, bb.y * y, bb.z * z);
  };

  const g = m.torsoGirth;
  const gAb = Math.sqrt(g); // abdomen + chest split so their product == torsoGirth
  const gCh = g / gAb;
  set("abdomen", gAb, m.torsoLen, gAb);
  set("torso", gCh, 1, gCh);
  // neck: counter the inherited chest girth so it stays slim; lengthen on Y
  set("neck", 1 / g, m.neckLen, 1 / g);
  // head: counter inherited girth (XZ → 1 after the neck) and the abdomen+neck
  // length so it reads as a clean uniform-size skull
  set("head", m.headScale, m.headScale / (m.torsoLen * m.neckLen), m.headScale);

  for (const s of ["l", "r"] as const) {
    const asym = s === "l" ? m.asymL : m.asymR;
    // shoulder pad sized to m.shoulder (counter inherited torso girth/length)
    set(`shoulder.${s}`, m.shoulder / g, m.shoulder / m.torsoLen, m.shoulder / g);
    // upper arm: counter the shoulder's net scale so girth/length land on intent
    set(`upperarm.${s}`, (m.armGirth / m.shoulder) * asym, m.armLen / m.shoulder, (m.armGirth / m.shoulder) * asym);
    // fore-arm inherits the upper arm's net size; leave it at base
    set(`lowerarm.${s}`, 1, 1, 1);
    // legs hang off the (unscaled) hips → apply girth/length directly
    set(`upperleg.${s}`, m.legGirth * asym, m.legLen, m.legGirth * asym);
    set(`lowerleg.${s}`, 1, 1, 1);
    // foot inherits the leg's net scale; counter the inherited length/girth so
    // footScale lands as a clean, uniform "bigger boots" on top of any build
    set(`foot.${s}`, (m.footScale / (m.legGirth * asym)) || m.footScale, m.footScale / m.legLen || m.footScale, (m.footScale / (m.legGirth * asym)) || m.footScale);
  }

  // hands — every palm/finger bone scaled uniformly
  for (const nm in bones) {
    if (/palm|thumb|index|middle|ring/.test(nm)) {
      const bb = boneBase[nm];
      bones[nm].scale.set(bb.x * m.handScale, bb.y * m.handScale, bb.z * m.handScale);
    }
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
  actSignal = 0,
  actName = "wave",
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
  keeper,
  speechLine,
  showForce = false,
  clan = null,
  hideFloaters = false,
}: {
  type: CreatureType;
  champion: Champion;
  position: [number, number, number];
  rotation?: number;
  selected?: boolean;
  onSelect?: () => void;
  label?: string;
  showLabel?: boolean;
  /** show the fighter's Force as a clean sigil + plain-name chip under the name */
  showForce?: boolean;
  /** when set, plant this Trainer's Clan standard beside the fighter (allegiance
   *  marker layered ON TOP of the Force base colour — never replaces it) */
  clan?: CreatureType | null;
  punchSignal?: number;
  hitSignal?: number;
  /** increment to trigger a one-shot gesture (wave/jump/punch) then fade back to idle */
  actSignal?: number;
  actName?: "wave" | "jump" | "punch";
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
  /** when set, marks this figure as a campaign Keeper and bolts on its signature
   *  regalia (lantern / tomes / shield / orb / scythe) so bosses are unmistakable */
  keeper?: KeeperKind;
  /** in-world speech bubble — companion lines, greetings */
  speechLine?: string | null;
  /** strip the detached floating decor (archetype constructs, orbiting evo shards,
   *  tier rings) that don't track the skeleton — keeps body + crown. Used by the
   *  close-up character-select showcase. */
  hideFloaters?: boolean;
}) {
  const colHex = baseColorOverride || TYPE_COLOR[type] || "#8888ff";
  const col = useMemo(() => new THREE.Color(colHex), [colHex]);

  const { scene, animations } = useGLTF(modelFor(type));

  const lf = levelFor(champion.xp);
  const tier = tierFor(lf.level);
  const ti = tierIndex(lf.level);

  // per-individual seed → distinct multi-colour scheme + skeletal jitter. Prefer
  // an explicit id; else fall back to a hash of the career so different builds
  // still differ.
  const seed = useMemo(
    () => seedFrom(identityKey || `${colHex}|${champion.xp}|${champion.aggression}|${champion.flair}|${champion.resilience}|${champion.creativity}`),
    [identityKey, colHex, champion.xp, champion.aggression, champion.flair, champion.resilience, champion.creativity],
  );

  const app = useMemo(() => archetypeAppearance(champion, type, seed), [champion, type, seed]);
  // Colour identity: regular minds are restrained to their Force's two-tone pair;
  // Keepers ignore the pair and get the richer, patterned, multi-colour treatment.
  const isKeeper = !!keeper;
  const palette = useMemo(
    () => bodyPalette(colHex, seed, { secondary: forceColors(type).secondary, rich: isKeeper, type }),
    [colHex, seed, type, isKeeper],
  );

  // seeded, tier-gated, skill-flavoured solid anatomy (helmet / visor / shoulders
  // / chest / back) — the "this is a different model of robot" layer. Cheap + pure,
  // so it's left for the compiler to memoize.
  const domAxis = dominant(champion);
  const pheno = phenotypeOf(type, seed, ti, domAxis.axis.k, domAxis.value);

  // Build the real rigged body: clone the shared RobotExpressive rig, recolour it
  // per region, scale to height + morph the SKELETON to this Force's proportions,
  // and wire its idle / walk / punch clips. Rebuilds only when the identity changes.
  const appKey = `${type}|${champion.xp}|${champion.aggression}|${champion.control}|${champion.flair}|${champion.resilience}|${champion.creativity}|${champion.losses}|${colHex}|${seed}|${isKeeper}`;
  const built = useMemo(() => buildCharacter(scene, animations, champion, colHex, app, seed, palette), [scene, animations, appKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const gref = useRef<THREE.Group>(null);
  const motion = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  // one-shot melee impulses applied to the body group (decayed each frame)
  const lunge = useRef(0);
  const recoil = useRef(0);

  // wander state
  const wpos = useRef(new THREE.Vector3(position[0], 0, position[2]));
  const wtarget = useRef<THREE.Vector3 | null>(null);
  const wheading = useRef(rotation);
  const still = useRef(Math.random() * 2);
  const movingPrev = useRef(false);
  const phase = useMemo(() => Math.random() * 6.28, []);

  // punch → play the clip + lunge forward; on finish, ease back to idle
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

  // generic one-shot gesture (wave / jump / punch) for showcases & the intro
  useEffect(() => {
    if (!actSignal) return;
    const a = built.actions[actName];
    const idle = built.actions.idle;
    if (a) {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      idle?.fadeOut(0.14);
      a.reset().setEffectiveTimeScale(actName === "wave" ? 1 : 1.35).setEffectiveWeight(1).fadeIn(0.14).play();
      const onFin = () => {
        a.fadeOut(0.3);
        idle?.reset().fadeIn(0.3).play();
        built.mixer.removeEventListener("finished", onFin);
      };
      built.mixer.addEventListener("finished", onFin);
    }
    if (actName === "punch") lunge.current = 1;
  }, [actSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // gallery portraits: offset + tempo the idle clip so a wall never beats in lockstep
  useEffect(() => {
    const idle = built.actions.idle;
    if (!idle) return;
    if (idlePhase != null) idle.time = idlePhase;
    idle.setEffectiveTimeScale(kitFor(type).idleSpeed * (idleSpeed ?? 1));
  }, [built, idlePhase, idleSpeed, type]);

  // scratch vector + accumulator for the distance LOD (no per-frame allocation)
  const lodPos = useRef(new THREE.Vector3());
  const lodAccum = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // resolve animation LOD from camera distance (owned / in-match always full)
    let lod = 0;
    const alwaysFull = selected || hpFrac != null;
    if (!alwaysFull && gref.current) {
      gref.current.getWorldPosition(lodPos.current);
      const d2 = lodPos.current.distanceToSquared(state.camera.position);
      lod = d2 > LOD_MID_SQ ? 2 : d2 > LOD_NEAR_SQ ? 1 : 0;
    }
    // skeletal update: full-rate near, throttled at mid, frozen far. Re-apply the
    // bone morph after each tick so the clip never washes out the proportions.
    if (lod === 0) {
      built.mixer.update(dt);
      applyBoneMorph(built.bones, built.boneBase, built.morph);
    } else if (lod === 1) {
      lodAccum.current += dt;
      if (lodAccum.current >= LOD_MID_STEP) {
        built.mixer.update(lodAccum.current);
        applyBoneMorph(built.bones, built.boneBase, built.morph);
        lodAccum.current = 0;
      }
    }
    const decorate = lod === 0;

    // lunge / recoil melee impulses on the body group
    lunge.current = Math.max(0, lunge.current - dt * 3.2);
    recoil.current = Math.max(0, recoil.current - dt * 3.0);
    if (motion.current) motion.current.position.z = lunge.current * 0.5 - recoil.current * 0.4;

    // wander
    let moving = false;
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
      // crossfade walk / idle clips on locomotion state change
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

    // evo animations — cosmetic only, so freeze them past the near band
    if (decorate) {
      if (auraRef.current) auraRef.current.scale.setScalar(1 + Math.sin(t * 1.6 + phase) * 0.06);
      if (crownRef.current) {
        crownRef.current.rotation.y += 0.01;
        crownRef.current.position.y = app.h + 0.3 + Math.sin(t * 1.4) * 0.05;
      }
    }
  });

  const auraOpacity = (0.05 + ti * 0.045) * 0.32 * (auraDim ? 0.32 : 1);
  const auraR = app.h * (auraDim ? 0.46 : 0.62);
  // the body's core bone — drives the energy decor so it rides the live motion
  // (idle sway, the punch lunge, the hit recoil) instead of hanging at the static
  // figure origin and getting clipped by the fighter as it lunges.
  const coreBone = built.bones["abdomen"] ?? built.bones["torso"] ?? built.bones["spine"];

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

      {/* solid phenotype anatomy — seeded helmet / visor / shoulders / chest /
          back, gated by tier so the body visibly grows as the mind evolves. Each
          piece fuses to its own bone internally (head / shoulders / torso). */}
      <PhenotypeParts
        pheno={pheno}
        h={app.h}
        headScale={app.morph.headScale}
        shoulder={app.morph.shoulder}
        pal={palette}
        bones={built.bones}
        dim={auraDim}
      />

      {/* per-creature energy decor — archetype constructs, keeper regalia, and the
          aura — all ride the core bone so they track the body's live motion (sway,
          lunge, recoil) as one piece instead of hanging at the static origin and
          getting clipped by the fighter mid-duel. */}
      <BoneFollower bone={coreBone}>
        {/* per-Force signature attachments — the species markings that make each
            Force read as a different being; tinted to this individual */}
        {!hideFloaters && <ArchetypeFeatures type={type} h={app.h} color={palette.cube} accent={palette.accent} dim={auraDim} seed={seed} />}

        {/* Keeper regalia — the signature weapon/item that makes a campaign boss
            read as itself, not a recoloured ladder agent */}
        {keeper && <KeeperRegalia kind={keeper} h={app.h} pal={palette} dim={auraDim} />}

        {/* aura sphere — faint, wide atmospheric glow; flagged so portrait
            auto-framing may let it bleed off-edge rather than shrinking the body */}
        <mesh ref={auraRef} position={[0, app.h * 0.55, 0]} userData={{ fitIgnore: true }}>
          <sphereGeometry args={[auraR, 16, 12]} />
          <meshBasicMaterial color={col} transparent opacity={auraOpacity} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      </BoneFollower>

      {/* ground aura ring — floor glow; also excluded from the fit envelope */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} userData={{ fitIgnore: true }}>
        <ringGeometry args={[0.78, 0.92, 48]} />
        <meshBasicMaterial color={col} transparent opacity={selected ? 0.8 : 0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* legend crown — fused to the head bone so it rides the gaze instead of
          hovering at a fixed point; the inner group keeps its slow spin + bob */}
      {tier.crown && (
        <BoneFollower bone={built.bones["head"]}>
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
        </BoneFollower>
      )}

      {hpFrac != null && (
        <Html position={[0, app.h + 0.7, 0]} center distanceFactor={9} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ width: 120, height: 9, background: "#241f33", borderRadius: 6, border: "1px solid #000", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, hpFrac) * 100}%`, height: "100%", background: hpFrac > 0.55 ? "#36d39a" : hpFrac > 0.25 ? "#f0a93a" : "#ff5a6a", transition: "width .4s ease" }} />
          </div>
        </Html>
      )}

      {speechLine && (
        <Html position={[0, app.h + 1.55, 0]} center distanceFactor={10} zIndexRange={[32, 0]} style={{ pointerEvents: "none" }}>
          <div
            style={{
              maxWidth: 220,
              padding: "8px 12px",
              borderRadius: 12,
              background: "rgba(8,6,14,.92)",
              border: `1px solid ${colHex}`,
              boxShadow: `0 4px 20px rgba(0,0,0,.5), 0 0 24px -8px ${colHex}`,
              fontSize: 12,
              lineHeight: 1.4,
              color: "#f2eefb",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            &ldquo;{speechLine}&rdquo;
          </div>
        </Html>
      )}

      {showLabel && label && (
        <Html position={[0, app.h + 1.0, 0]} center distanceFactor={11} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: 700, color: "#fff", fontSize: 20, textShadow: "0 2px 8px #000", whiteSpace: "nowrap", textAlign: "center", opacity: selected ? 1 : 0.82 }}>
            {label}
            {showForce && (
              <div style={{ fontSize: 11, color: colHex, letterSpacing: 0.6, fontWeight: 700 }}>
                {FORCES[type].sigil} {FORCES[type].name}
              </div>
            )}
            <div style={{ fontSize: 10, color: colHex, letterSpacing: 1, opacity: 0.72 }}>{tier.name}</div>
          </div>
        </Html>
      )}

      {clan && <ClanBanner clan={clan} h={app.h} />}
    </group>
  );
}

// ── Clan standard ────────────────────────────────────────────────────────────
// A small heraldic banner planted at the fighter's side, in the Clan's colour and
// sigil. This is the *team* marker (allegiance), kept deliberately separate from
// the body's Force colour so a fighter can be e.g. a Calm-type carrying a Static
// clan standard. Cheap: a pole + an emissive pennant + a cached sigil decal.
const sigilTexCache = new Map<string, THREE.CanvasTexture>();
function sigilTexture(sigil: string): THREE.CanvasTexture {
  const cached = sigilTexCache.get(sigil);
  if (cached) return cached;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, S, S);
  x.fillStyle = "#ffffff";
  x.font = "bold 92px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(sigil, S / 2, S / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  sigilTexCache.set(sigil, tex);
  return tex;
}

function ClanBanner({ clan, h }: { clan: CreatureType; h: number }) {
  const col = TYPE_COLOR[clan] || "#8888ff";
  const sigil = FORCES[clan].sigil;
  const tex = useMemo(() => sigilTexture(sigil), [sigil]);
  const poleH = Math.max(2.9, h * 1.35);
  const flagY = poleH - 0.62;
  return (
    <group position={[Math.max(1.2, h * 0.62), 0, 0.15]}>
      <mesh position={[0, poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, poleH, 8]} />
        <meshStandardMaterial color="#2a2438" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, poleH + 0.05, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0.52, flagY, 0]}>
        <planeGeometry args={[0.92, 0.64]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9} roughness={0.55} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.52, flagY, 0.014]}>
        <planeGeometry args={[0.74, 0.52]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.52, flagY, -0.014]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.74, 0.52]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
