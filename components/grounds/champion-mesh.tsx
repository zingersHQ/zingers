"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
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
import { ANIM, flightAttitudePlanar, type GestureClip, type RestPose } from "@/lib/render/animations";
import { useSettings } from "@/store/settings";
import { Jetpack } from "@/components/grounds/jetpack";

for (const m of ALL_MODELS) useGLTF.preload(m);

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Third-scale in the open world — mascots, not arena titans (2/3 of the old
 *  half-scale after the playtest "characters are too big" pass). Battle /
 *  portrait tiles stay at 1. The Reader mirrors this via READER_SCALE in world.tsx. */
export const WORLD_AGENT_SCALE = 1 / 3;

/** @deprecated Companion no longer mirrors Handler loco — kept for type compat during cleanup. */
export interface HandlerMimicState {
  grounded: boolean;
  flying: boolean;
  loco: "idle" | "walk" | "run";
  jumpTick: number;
  vy: number;
}

// ── owned-companion flight (padLeash) ────────────────────────────────────────
// Autonomous wingman: always pursues a fixed slot at the Handler's ~4 o'clock
// (back-right). Matches Handler velocity when docked; extra acceleration when
// lagging so it never falls behind on a climb. Jetpack arcs in from spawn to slot.
const COMPANION_LIFT_THRESHOLD = 3.0;
const COMPANION_SLOT_R = 3.0;         // distance to the back-right wing slot
const COMPANION_SLOT_BACK = 0.866;    // cos 30° — mostly behind (4 o'clock)
const COMPANION_SLOT_SIDE = 0.5;      // sin 30° — slight right
const COMPANION_WING_DROP = 1.1;      // fly slightly below the Handler
const COMPANION_SLOT_ARRIVED = 1.4;   // planar gap considered "in slot"
const COMPANION_CATCH_K = 4.0;         // extra speed per unit of lag (planar)
const COMPANION_VERT_CATCH_K = 5.5;     // vertical catch-up when Handler climbs
const COMPANION_CATCH_MAX = 36;        // max planar speed (can outrun Handler to catch up)
const COMPANION_VERT_MAX = 14;         // max vertical catch-up speed
const COMPANION_ACCEL = 34;            // ramp rate toward target velocity
const COMPANION_JETPACK_DIST = 4.5;    // planar gap → jetpack arc to the slot
const COMPANION_APPROACH_ARC = 3.0;    // hover height while jetting to slot
const COMPANION_INTRO_SEC = 2.0;       // spawn fly-in: reach the wing slot in ~2s
const COMPANION_INTRO_REPOSITION = 22; // if train pad is farther than this, start fly-in nearby
const COMPANION_INTRO_START = 18;      // …from this many units behind the Handler toward the pad
const COMPANION_MOVE_EPS = 0.8;
const COMPANION_EXTRA_GRAV = 14;        // faster visual fall for the smaller body

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

// scratch for the wander steering — useFrame callbacks run serially, so one
// shared vector serves every roaming agent without a per-frame allocation each
const _wanderDir = new THREE.Vector3();

// ── gait matching ────────────────────────────────────────────────────────────
// Locomotion clips are driven from REAL horizontal speed. The reference is the
// planar speed (world u/s) at which each clip's stride visually tracks the
// ground on a FULL-scale body; a smaller sceneScale shrinks the stride with the
// body, so the reference shrinks with it — that keeps feet planted instead of
// skating. Above RUN_SPEED_AT (× sceneScale) the loop switches from Walk to Run.
const GAIT_WALK_REF = 2.2;
const GAIT_RUN_REF = 5.2;
const RUN_SPEED_AT = 3.6;
/** Keep walk/run intent briefly after speed dips — stops rest/walk flicker at thresholds. */
const LOCO_HOLD_SEC = 0.32;
const LOCO_MIN_PLANAR = 0.14;

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
  /** bind-pose rotation/position of the neck + head bones, so we can blend the
   *  clip's exaggerated head swing part-way back toward rest each frame */
  restQuat: Record<string, THREE.Quaternion>;
  restPos: Record<string, THREE.Vector3>;
  /** MEASURED rest placement of each body part's actual mesh (in figure space,
   *  feet=0), so decor bolts onto where the part really IS for this individual's
   *  proportions instead of a guessed height-fraction that floats off a small head
   *  or piles up at the neck. */
  partAnchors: PartAnchors;
  morph: BoneMorph;
  h: number;
  emissive: number;
  palette: BodyPalette;
}

export interface PartAnchor {
  x: number;
  y: number;
  z: number;
  top: number;
  bottom: number;
  /** horizontal radius (max of half-width / half-depth) */
  r: number;
  /** half-width (x) and half-depth (z) of the part */
  hx: number;
  hz: number;
}
export type PartAnchors = Record<string, PartAnchor>;

// The shared RobotExpressive rig is NOT skinned: each body part is a rigid mesh
// bolted onto a bone. The gold torso hangs off the high-level `Body` bone (which
// barely moves at idle) while the clips swing the `Head` bone hard — and our minds
// carry oversized heads, so the head visibly nods off the near-static neck/collar,
// reading as a detached "tie". We keep a fraction of that head/neck motion so the
// figure still feels alive, but damp the rest so the head stays married to its
// neckline. 1 = full clip motion, 0 = locked to bind pose.
const NECK_MOTION = 0.58;
const NECK_MOTION_PEACEFUL = ANIM.peacefulNeckDamp;

function restAction(built: BuiltCharacter, pose: RestPose) {
  return built.actions[pose] ?? built.actions.standing ?? built.actions.idle;
}

/** Crossfade back to a rest loop without `reset()` — resetting jumps to frame 0 and
 *  reads as a snap, especially on the Standing clip's expand/contract cycle. */
function crossFadeToRest(from: THREE.AnimationAction | null | undefined, rest: THREE.AnimationAction, fade: number) {
  rest.enabled = true;
  if (from && from !== rest && from.getEffectiveWeight() > 0.01) {
    from.crossFadeTo(rest, fade, false);
  } else if (!rest.isRunning() || rest.getEffectiveWeight() < 0.01) {
    rest.reset().setEffectiveWeight(1).fadeIn(fade).play();
  } else {
    rest.setEffectiveWeight(1);
    rest.play();
  }
}

function fadeToRest(built: BuiltCharacter, pose: RestPose, fade = 0.28) {
  const rest = restAction(built, pose);
  if (!rest) return;
  let active: THREE.AnimationAction | undefined;
  for (const a of Object.values(built.actions)) {
    if (a && a !== rest && a.getEffectiveWeight() > 0.05) {
      active = a;
      break;
    }
  }
  if (active) crossFadeToRest(active, rest, fade);
  else if (!rest.isRunning() || rest.getEffectiveWeight() < 0.01) {
    rest.reset().setEffectiveWeight(1).fadeIn(fade).play();
  } else {
    // already resting — update weight only, never reset (avoids loop snap on re-run)
    rest.setEffectiveWeight(1);
  }
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
  // The shared RobotExpressive rig names bones WITHOUT dots and with a trailing index
  // (torso_1) or side letter (shoulderl / shoulderr / upperarml …). The rest of this
  // codebase addresses bones by canonical keys (torso, shoulder.l, upperarm.r, foot.l).
  // Alias the canonical keys onto the real bones so EVERY lookup + the genome morph
  // actually resolve. Without this, `bones["torso"]`, `bones["shoulder.l"]` … were all
  // undefined: the chest/shoulder/back decor had no bone to follow (stayed frozen and
  // detached) AND applyBoneMorph's torso/shoulder/arm/leg/foot scaling silently did
  // nothing, so the genome never reshaped the body.
  const alias = (canon: string, real: string) => {
    if (!bones[canon] && bones[real]) {
      bones[canon] = bones[real];
      boneBase[canon] = boneBase[real];
    }
  };
  alias("torso", "torso_1");
  alias("spine", "torso_1");
  for (const s of ["l", "r"] as const) {
    // Upper body only: torso + shoulders (decor anchors) and the arms that hang off
    // the shoulders (so they counter-scale the shoulder size). We deliberately do NOT
    // alias the legs/feet: the leg/foot genome scaling had silently no-op'd for the
    // rig's whole life, and re-activating it makes the legs spindly and lifts the feet
    // off their planted stance. Legs hang off the (unscaled) hips, independent of the
    // torso/shoulder scaling, so leaving them at base keeps the original good footing.
    alias(`shoulder.${s}`, `shoulder${s}`);
    alias(`upperarm.${s}`, `upperarm${s}`);
    alias(`lowerarm.${s}`, `lowerarm${s}`);
  }
  const morph = app.morph;
  applyBoneMorph(bones, boneBase, morph);

  // snapshot the rest (bind) rotation/position of the neck chain so the per-frame
  // damping below can blend the clip's head swing back toward this pose. The abdomen
  // is snapshotted too so the subtle idle breathing (see `breathe`) can lean the
  // whole waist-up off its true bind pose.
  const restQuat: Record<string, THREE.Quaternion> = {};
  const restPos: Record<string, THREE.Vector3> = {};
  for (const nm of ["neck", "head", "abdomen", "torso", "shoulder.l", "shoulder.r"]) {
    const b = bones[nm];
    if (b) {
      restQuat[nm] = b.quaternion.clone();
      restPos[nm] = b.position.clone();
    }
  }

  root.position.y = 0;
  root.updateMatrixWorld(true);
  root.position.y -= new THREE.Box3().setFromObject(root).min.y;
  root.updateMatrixWorld(true);

  // Measure where each body part's mesh actually sits NOW (post-morph, feet=0) so
  // decor anchors to the real anatomy. Done before the mixer exists, i.e. at the
  // bind/morph rest pose — exactly the pose BoneFollower treats as its rest.
  const partAnchors: PartAnchors = {};
  {
    const _box = new THREE.Box3();
    const _ctr = new THREE.Vector3();
    const _sz = new THREE.Vector3();
    const meshes: Record<string, THREE.Object3D> = {};
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.name) meshes[m.name.toLowerCase()] = m;
    });
    // The rig splits each part across several indexed meshes (head_2/head_3/head_4,
    // torso_2/torso_3, shoulderl_1 …) — none are named exactly "head"/"torso". Match
    // by name PREFIX and UNION the boxes so each canonical region gets the real
    // bounds of the whole part. (Previously the exact-name lookups all missed, so
    // partAnchors was empty and every piece fell back to floating height-guesses.)
    const regionPrefix: Record<string, string> = {
      head: "head",
      torso: "torso",
      "shoulder.l": "shoulderl",
      "shoulder.r": "shoulderr",
    };
    const _u = new THREE.Box3();
    for (const [canon, prefix] of Object.entries(regionPrefix)) {
      let any = false;
      for (const key in meshes) {
        if (!key.startsWith(prefix)) continue;
        _box.setFromObject(meshes[key]);
        if (_box.isEmpty() || !isFinite(_box.min.y)) continue;
        if (!any) { _u.copy(_box); any = true; } else { _u.union(_box); }
      }
      if (!any) continue;
      _u.getCenter(_ctr);
      _u.getSize(_sz);
      partAnchors[canon] = { x: _ctr.x, y: _ctr.y, z: _ctr.z, top: _u.max.y, bottom: _u.min.y, r: Math.max(_sz.x, _sz.z) / 2, hx: _sz.x / 2, hz: _sz.z / 2 };
    }
  }

  const mixer = new THREE.AnimationMixer(root);
  const actions: Record<string, THREE.AnimationAction | undefined> = {
    idle: clipAction(mixer, animations, "idle"),
    standing: clipAction(mixer, animations, "standing"),
    sitting: clipAction(mixer, animations, "sitting"),
    walk: clipAction(mixer, animations, "walking", "walk"),
    run: clipAction(mixer, animations, "running", "run"),
    jump: clipAction(mixer, animations, "jump"),
    punch: clipAction(mixer, animations, "punch", "attack"),
    wave: clipAction(mixer, animations, "wave"),
    dance: clipAction(mixer, animations, "dance"),
    thumbsUp: clipAction(mixer, animations, "thumbsup", "thumbs_up"),
    yes: clipAction(mixer, animations, "yes"),
    no: clipAction(mixer, animations, "no"),
    death: clipAction(mixer, animations, "death"),
  };
  for (const nm of ["punch", "jump", "wave", "dance", "thumbsUp", "yes", "no", "death"] as const) {
    const a = actions[nm];
    if (!a) continue;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
  }
  // loop dance for celebration showcases
  actions.dance?.setLoop(THREE.LoopRepeat, Infinity);
  if (actions.dance) actions.dance.clampWhenFinished = false;
  // Standing/Sitting expand then contract — ping-pong so the return is animated,
  // not a hard loop snap back to frame 0.
  for (const nm of ["standing", "sitting"] as const) {
    const a = actions[nm];
    if (!a) continue;
    a.setLoop(THREE.LoopPingPong, Infinity);
    a.clampWhenFinished = false;
  }
  for (const nm of ["idle", "walk", "run"] as const) {
    const a = actions[nm];
    if (!a) continue;
    a.setLoop(THREE.LoopRepeat, Infinity);
  }
  // initial skeletal pose is chosen by the restPose effect — don't start idle here
  // or the first crossfade fights a clip that's already mid-cycle.

  return { root, mixer, actions, bones, boneBase, restQuat, restPos, partAnchors, morph, h: app.h, emissive: app.emissive, palette: pal };
}

function clipAction(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[], ...names: string[]) {
  const c = pickClip(clips, ...names);
  return c ? mixer.clipAction(c) : undefined;
}

// Blend the just-evaluated neck + head pose back toward the bind pose so the
// oversized head stops swinging off the static neck/collar. Runs AFTER the mixer
// (and bone-morph) each frame; the head-attached decor rides these bones via
// BoneFollower, so it stays glued to the calmer head.
function dampNeck(built: BuiltCharacter, peaceful = false) {
  const keep = peaceful ? NECK_MOTION_PEACEFUL : NECK_MOTION;
  for (const nm of ["neck", "head"] as const) {
    const b = built.bones[nm];
    const rq = built.restQuat[nm];
    const rp = built.restPos[nm];
    if (!b) continue;
    if (rq) b.quaternion.slerp(rq, 1 - keep);
    if (rp) b.position.lerp(rp, 1 - keep);
  }
}

// ── Idle breathing ─────────────────────────────────────────────────────────────
// The stock RobotExpressive Idle clip only keyframes the head + legs; it never
// touches the Abdomen/Torso/Shoulder bones, so in idle the whole waist-up — and
// every piece fused to it (chest ring, shoulder pads, back units) — sits dead still
// while just the head nods. That's the "pieces don't move with the body" report.
//
// Fix: a gentle breathing motion on the Abdomen (never keyframed, so it can't fight
// the mixer). The entire upper chain hangs off it, so torso + shoulders + head and —
// now that BoneFollower tracks rotation correctly — all their decor move as one.
// TWO components:
//   • a slow forward/back lean (+ slower roll weight-shift), which swings pieces FAR
//     from the waist pivot (shoulders, collar, head);
//   • a slow, shallow vertical rise/settle, which is the ONLY thing that moves pieces
//     sitting right ON the pivot (the chest reactor donut+core) — a pure lean leaves
//     those dead still. This is deliberately slow + shallow (≈half the amplitude, and
//     1.6× slower than the version that read as "arms bouncing"), so it breathes
//     rather than bounces. Legs branch off the hips, so the feet stay planted.
const _breatheEuler = new THREE.Euler();
const _breatheQ = new THREE.Quaternion();
const _bobDir = new THREE.Vector3();
const _parentInvBob = new THREE.Matrix4();
// Apply an additive local-space euler offset on top of a bone's bind pose, capturing
// the bind pose lazily (these bones are never keyframed by the Idle clip, so the
// snapshot is just the rig's rest rotation).
function leanBone(built: BuiltCharacter, nm: string, x: number, y: number, z: number) {
  const b = built.bones[nm];
  if (!b) return;
  let rq = built.restQuat[nm];
  if (!rq) rq = built.restQuat[nm] = b.quaternion.clone();
  _breatheEuler.set(x, y, z);
  _breatheQ.setFromEuler(_breatheEuler);
  b.quaternion.copy(rq).multiply(_breatheQ);
}
function breathe(built: BuiltCharacter, t: number, intensity = 1) {
  const b = built.bones["abdomen"];
  if (!b || intensity <= 0) return;
  const { hz, hz2, swayHz, leanAmp, rollAmp, bobAmp, torsoTwist, shoulderRoll } = ANIM.breathe;
  // Lazy-capture the true bind pose (abdomen is never keyframed) so breathing works
  // even if `built` predates the snapshot after a hot-reload.
  let rq = built.restQuat["abdomen"];
  if (!rq) rq = built.restQuat["abdomen"] = b.quaternion.clone();
  let rp = built.restPos["abdomen"];
  if (!rp) rp = built.restPos["abdomen"] = b.position.clone();
  // two slow, incommensurate sines → organic asymmetry (never mechanical lockstep)
  const breath = Math.sin(t * hz) * 0.72 + Math.sin(t * hz2 + 1.1) * 0.28;
  const sway = Math.sin(t * swayHz) * 0.8 + Math.sin(t * swayHz * 0.67 + 0.6) * 0.2;
  const k = intensity;
  // Abdomen: gentle forward/back lean + weight-shift roll. Drives the whole upper
  // chain. Keep the vertical bob shallow — it translates the shoulders/arms too, and
  // too much reads as a distracting bounce.
  _breatheEuler.set(breath * leanAmp * k, 0, Math.sin(t * swayHz * 0.85) * rollAmp * k);
  _breatheQ.setFromEuler(_breatheEuler);
  b.quaternion.copy(rq).multiply(_breatheQ);
  const parent = b.parent;
  if (parent) {
    parent.updateWorldMatrix(true, false);
    _parentInvBob.copy(parent.matrixWorld).invert();
    _bobDir.set(0, 1, 0).transformDirection(_parentInvBob);
    b.position.copy(rp).addScaledVector(_bobDir, breath * bobAmp * k);
  }
  // Torso spine-twist: rotates the chest reactor (donut + core sit ON the spine, so a
  // lean alone barely moves them) and sweeps the shoulders/back units in a clear arc —
  // purely rotational, so it never bounces the arms vertically. This is the motion the
  // chest/shoulder decor most visibly rides.
  leanBone(built, "torso", breath * torsoTwist * k, sway * torsoTwist * 2.2 * k, 0);
  // Shoulders: a small counter-phased roll so the shoulder spikes lift/settle with the
  // breath. Kept tiny — arms hang off these, so big values look like flailing.
  leanBone(built, "shoulder.l", 0, 0, sway * shoulderRoll * k);
  leanBone(built, "shoulder.r", 0, 0, sway * shoulderRoll * k);
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
  restPose = "idle",
  hpFrac,
  baseColorOverride,
  wander = false,
  worldRadius = 34,
  wanderInner = 0,
  wanderSpeed = 3.0,
  idlePhase,
  idleSpeed,
  breatheIntensity = 1,
  bodyBob = 0,
  auraDim,
  identityKey,
  keeper,
  speechLine,
  speechEmote,
  showForce = false,
  clan = null,
  hideFloaters = false,
  padLeash,
  companionDrive,
  /** World-scene scale (0.5 in the Grounds; 1 in battles / portraits). */
  sceneScale = 1,
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
  actName?: GestureClip;
  /** base skeletal loop between gestures — Standing is calmer than Idle */
  restPose?: RestPose;
  hpFrac?: number;
  baseColorOverride?: string;
  wander?: boolean;
  worldRadius?: number;
  wanderInner?: number;
  wanderSpeed?: number;
  /** desync the idle clip across a gallery of portraits */
  idlePhase?: number;
  idleSpeed?: number;
  /** 0..1 procedural chest breathing (standing ≈ 0.25, breathing ≈ 1) */
  breatheIntensity?: number;
  /** vertical bob amplitude on the body group (bounce mode) */
  bodyBob?: number;
  /** shrink the energy aura so the body reads clearly in gallery portraits */
  auraDim?: boolean;
  /** stable individual id → unique colour scheme / clothing pattern */
  identityKey?: string;
  /** when set, marks this figure as a campaign Keeper and bolts on its signature
   *  regalia (lantern / tomes / shield / orb / scythe) so bosses are unmistakable */
  keeper?: KeeperKind;
  /** in-world speech bubble — companion lines, greetings */
  speechLine?: string | null;
  /** wordless reaction glyph — the companion's "HEY!"/impression bubble */
  speechEmote?: string | null;
  /** strip the detached floating decor (archetype constructs, orbiting evo shards,
   *  tier rings) that don't track the skeleton — keeps body + crown. Used by the
   *  close-up character-select showcase. */
  hideFloaters?: boolean;
  /** owned companion: autonomous chase of the Handler wing slot (4 o'clock) */
  padLeash?: {
    handlerRef: RefObject<THREE.Vector3>;
    /** live body heading (radians) — slot stays at back-right even when idle */
    handlerHeadingRef?: RefObject<number>;
    pad: [number, number, number];
    arenaRotation: number;
  };
  /** owned companion: outer rig drives transform; mesh reads this for walk/run/fly pose */
  companionDrive?: {
    flyingRef: RefObject<boolean>;
    movingRef: RefObject<boolean>;
    speedRef: RefObject<number>;
    runRef: RefObject<boolean>;
    velRef: RefObject<THREE.Vector3>;
    headingRef: RefObject<number>;
  };
  sceneScale?: number;
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
  const palette = useMemo(() => {
    const p = bodyPalette(colHex, seed, { secondary: forceColors(type).secondary, rich: isKeeper, type });
    if (clan) return { ...p, glow: TYPE_COLOR[clan] };
    return p;
  }, [colHex, seed, type, isKeeper, clan]);

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
  const wanderMoving = useRef(false);
  const locoCur = useRef<"walk" | "run" | "rest" | null>(null);
  const locoHoldT = useRef(0);
  const gestureBusy = useRef(false);
  const phase = useMemo(() => Math.random() * 6.28, []);
  // owned-companion flight state (padLeash): previous Handler pos for velocity, the
  // smoothed Handler heading we place the wing off, and an eased 0..1 airborne amount
  const hPrev = useRef<THREE.Vector3 | null>(null);
  const hHeading = useRef(rotation);
  const flyAmt = useRef(0);
  const flyPitch = useRef(0);
  const flyBank = useRef(0);
  // autonomous chase: velocity-matched pursuit of the 4-o'clock slot
  const approachForced = useRef(true);
  const introBooted = useRef(false);
  const introElapsed = useRef(0);
  const chaseSpeed = useRef(0);
  const companionVel = useRef(new THREE.Vector3());
  const companionFlyingRef = useRef(false);
  const companionJetBurst = useRef(0);
  const companionJetEmit = useRef(0);
  const wasCompanionFlying = useRef(false);

  const homeX = position[0];
  const homeZ = position[2];

  /** Re-home only when spawn coordinates actually change — NOT on every parent
   *  re-render. `position={[x,0,z]}` is a new array each render; depending on
   *  the array reference reset wpos every frame and agents blink back to spawn. */
  useEffect(() => {
    wpos.current.set(homeX, 0, homeZ);
    wheading.current = rotation;
    wtarget.current = null;
    still.current = Math.random() * 2;
    locoCur.current = null;
    locoHoldT.current = 0;
    approachForced.current = true;
    introBooted.current = false;
    introElapsed.current = 0;
    companionVel.current.set(0, 0, 0);
    companionJetBurst.current++;
  }, [homeX, homeZ, rotation, identityKey]);

  /** Stride frequency that matches this body's ACTUAL ground speed, so feet
   *  track the dirt instead of skating (clamped — extreme chases still cap). */
  function gaitTimeScale(mode: "walk" | "run", speed: number) {
    const ref = (mode === "run" ? GAIT_RUN_REF : GAIT_WALK_REF) * Math.max(0.2, sceneScale);
    return THREE.MathUtils.clamp(speed / ref, mode === "run" ? 0.85 : 0.7, mode === "run" ? 2.6 : 2.3);
  }

  /** Cross-fade the locomotion loop (rest / walk / run) from real speed —
   *  shared by the wanderers, the padLeash chase and the companion rig. */
  function setLoco(mode: "rest" | "walk" | "run", speed = 0, fade = 0.2) {
    if (gestureBusy.current) return;
    const walk = built.actions.walk;
    const run = built.actions.run;
    const rest = restAction(built, restPose);
    const next = mode === "run" ? run : mode === "walk" ? walk : rest;
    if (!next) return;
    const key = mode;

    // Same mode already playing — update stride only. Never `reset()` here: that
    // was re-triggering fadeIn every frame while weight was still ramping (<0.8)
    // and read as a walk blink / stutter.
    if (locoCur.current === key && next.isRunning()) {
      if (mode === "walk" || mode === "run") next.setEffectiveTimeScale(gaitTimeScale(mode, speed));
      if (next.getEffectiveWeight() < 0.98) next.setEffectiveWeight(Math.min(1, next.getEffectiveWeight() + 0.08));
      return;
    }

    const prevKey = locoCur.current;
    const prev =
      prevKey === "walk" ? walk : prevKey === "run" ? run : prevKey === "rest" ? rest : undefined;

    if (mode === "rest") {
      if (prev && prev !== rest && prev.getEffectiveWeight() > 0.01 && rest) crossFadeToRest(prev, rest, fade);
      else if (rest && (!rest.isRunning() || rest.getEffectiveWeight() < 0.01)) rest.reset().setEffectiveWeight(1).fadeIn(fade).play();
      walk?.fadeOut(fade);
      run?.fadeOut(fade);
    } else {
      // Standing ping-pong must leave the mixer or it keeps weight and fights walk.
      if (rest && rest !== next) rest.fadeOut(Math.min(fade, 0.14));
      if (prev && prev !== next && prev.getEffectiveWeight() > 0.04) {
        next.setEffectiveTimeScale(gaitTimeScale(mode, speed));
        next.setEffectiveWeight(0);
        next.play();
        prev.crossFadeTo(next, fade, false);
      } else {
        next.reset().setEffectiveTimeScale(gaitTimeScale(mode, speed)).setEffectiveWeight(1).fadeIn(fade).play();
      }
    }
    locoCur.current = key;
  }

  /** Hysteresis gate — short speed dips don't snap back to idle mid-stride. */
  function locoGate(planarSpeed: number, dt: number) {
    const min = LOCO_MIN_PLANAR * Math.max(0.2, sceneScale);
    if (planarSpeed > min) locoHoldT.current = LOCO_HOLD_SEC;
    else locoHoldT.current = Math.max(0, locoHoldT.current - dt);
    return locoHoldT.current > 0;
  }

  /** After a one-shot gesture: resume whatever locomotion this mover is in. */
  function resumeLoco(fade = 0.35) {
    if (companionDrive && !wander && !padLeash) {
      const flying = companionDrive.flyingRef.current ?? false;
      const moving = companionDrive.movingRef.current ?? false;
      const speed = companionDrive.speedRef.current ?? 0;
      const run = companionDrive.runRef.current ?? false;
      if (flying) setLoco("rest", speed, 0.22);
      else if (moving) setLoco(run ? "run" : "walk", speed, fade);
      else setLoco("rest", 0, fade);
      return;
    }
    if (wander || padLeash) {
      const spd = wander ? (wanderMoving.current ? wanderSpeed * sceneScale : 0) : chaseSpeed.current;
      if (wanderMoving.current) setLoco(spd > RUN_SPEED_AT * sceneScale ? "run" : "walk", spd, fade);
      else setLoco("rest", 0, fade);
      return;
    }
    fadeToRest(built, restPose, fade);
  }

  // punch → play the clip + lunge forward; on finish, ease back to rest / walk
  useEffect(() => {
    if (!punchSignal) return;
    const p = built.actions.punch;
    const rest = restAction(built, restPose);
    if (p) {
      gestureBusy.current = true;
      rest?.fadeOut(0.12);
      p.reset().setEffectiveTimeScale(1.12).setEffectiveWeight(1).fadeIn(0.18).play();
      const onFin = () => {
        gestureBusy.current = false;
        resumeLoco(0.45);
        built.mixer.removeEventListener("finished", onFin);
      };
      built.mixer.addEventListener("finished", onFin);
    }
    lunge.current = 1;
  }, [punchSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hitSignal) recoil.current = 1;
  }, [hitSignal]);

  // generic one-shot gesture for showcases & the intro
  useEffect(() => {
    if (!actSignal) return;
    const a = built.actions[actName];
    const rest = restAction(built, restPose);
    if (a) {
      const looped = actName === "dance";
      a.setLoop(looped ? THREE.LoopRepeat : THREE.LoopOnce, looped ? Infinity : 1);
      a.clampWhenFinished = !looped;
      gestureBusy.current = true;
      rest?.fadeOut(0.18);
      const ts = actName === "wave" ? 0.82 : actName === "dance" ? 0.9 : 1.02;
      a.reset().setEffectiveTimeScale(ts).setEffectiveWeight(1).fadeIn(0.22).play();
      if (!looped) {
        const onFin = () => {
          gestureBusy.current = false;
          resumeLoco(0.5);
          built.mixer.removeEventListener("finished", onFin);
        };
        built.mixer.addEventListener("finished", onFin);
      }
    }
    if (actName === "punch" || actName === "jump") lunge.current = 1;
  }, [actSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // rest loop tempo + clip selection (Standing/Sitting for peaceful contexts).
  // Autonomous movers pick up walk/run in useFrame — don't yank them to rest here.
  useEffect(() => {
    const rest = restAction(built, restPose);
    if (!rest) return;
    if (idlePhase != null) rest.time = idlePhase;
    const scale = restPose === "idle" ? ANIM.idleClipScale : ANIM.restClipScale;
    rest.setEffectiveTimeScale(kitFor(type).idleSpeed * (idleSpeed ?? 1) * scale);
    const isMover = wander || padLeash || !!companionDrive;
    if (!isMover) {
      locoCur.current = null;
      fadeToRest(built, restPose, 0.4);
    }
  }, [built, restPose, idlePhase, idleSpeed, type, wander, padLeash, companionDrive]);

  // scratch vector + accumulator for the distance LOD (no per-frame allocation)
  const lodPos = useRef(new THREE.Vector3());
  const lodAccum = useRef(0);
  const companionFrame = !!(padLeash && !wander);
  const companionRigDrive = !!(companionDrive && !padLeash && !wander);

  useLayoutEffect(() => {
    if (!companionFrame || !gref.current) return;
    gref.current.position.set(wpos.current.x, wpos.current.y, wpos.current.z);
    gref.current.rotation.y = wheading.current;
  }, [companionFrame, homeX, homeZ, rotation, identityKey]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // locomotion first — mixer LOD + setLoco need this frame's moving state
    let moving = false;
    if (wander && gref.current) {
      // roam speed is authored in full-scale units; the shrunken world cast
      // covers proportionally less ground so the stroll reads calm, not skittery
      const wSpeed = wanderSpeed * sceneScale;
      if (!wtarget.current || wpos.current.distanceTo(wtarget.current) < 1.2) {
        if (still.current <= 0) {
          const a = Math.random() * 6.28;
          const r = wanderInner + Math.random() * Math.max(1, worldRadius - wanderInner);
          wtarget.current = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
          still.current = 0.6 + Math.random() * 2.2;
        }
      }
      if (still.current > 0 && (!wtarget.current || wpos.current.distanceTo(wtarget.current) < 1.2)) {
        still.current -= dt;
      } else if (wtarget.current) {
        const dir = _wanderDir.copy(wtarget.current).sub(wpos.current);
        dir.y = 0;
        const dl = dir.length();
        if (dl > 0.08) {
          dir.normalize();
          wpos.current.addScaledVector(dir, wSpeed * dt);
          const want = Math.atan2(dir.x, dir.z);
          let d = want - wheading.current;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          wheading.current += d * Math.min(1, dt * 6);
          moving = true;
        }
      }
      gref.current.position.set(wpos.current.x, 0, wpos.current.z);
      gref.current.rotation.y = wheading.current;
      const planar = moving ? wSpeed : 0;
      const shouldLoco = locoGate(planar, dt);
      wanderMoving.current = shouldLoco;
      setLoco(shouldLoco ? (planar > RUN_SPEED_AT * sceneScale ? "run" : "walk") : "rest", planar);
    }

    if (padLeash && !wander && gref.current) {
      const hp = padLeash.handlerRef.current;
      const px = padLeash.pad[0];
      const pz = padLeash.pad[2];
      const hx = hp?.x ?? px;
      const hy = hp?.y ?? 0;
      const hz = hp?.z ?? pz;
      const ws = sceneScale;

      if (!hPrev.current) hPrev.current = new THREE.Vector3(hx, hy, hz);
      const prev = hPrev.current;
      const hvx = dt > 0 ? (hx - prev.x) / dt : 0;
      const hvz = dt > 0 ? (hz - prev.z) / dt : 0;
      const hvy = dt > 0 ? (hy - prev.y) / dt : 0;
      prev.set(hx, hy, hz);
      const hSpeed = Math.hypot(hvx, hvz);

      const hh = padLeash.handlerHeadingRef?.current ?? hHeading.current;
      if (hSpeed > COMPANION_MOVE_EPS) hHeading.current = Math.atan2(hvx, hvz);

      // 4-o'clock wing slot — back + slight right of the Handler's facing
      const backX = -Math.sin(hh), backZ = -Math.cos(hh);
      const sideX = Math.cos(hh), sideZ = -Math.sin(hh);
      const r = COMPANION_SLOT_R * ws;
      const tx = hx + (backX * COMPANION_SLOT_BACK + sideX * COMPANION_SLOT_SIDE) * r;
      const tz = hz + (backZ * COMPANION_SLOT_BACK + sideZ * COMPANION_SLOT_SIDE) * r;

      let ex = tx - wpos.current.x;
      let ez = tz - wpos.current.z;
      let slotDist = Math.hypot(ex, ez);

      // Belt-and-suspenders: if we still spawned far from the slot, snap the intro
      // origin beside the Handler on the first padLeash tick.
      if (approachForced.current && !introBooted.current) {
        introBooted.current = true;
        if (slotDist > COMPANION_INTRO_REPOSITION * ws) {
          const toPadX = px - hx;
          const toPadZ = pz - hz;
          const toPadLen = Math.hypot(toPadX, toPadZ) || 1;
          const startDist = Math.min(COMPANION_INTRO_START * ws * 1.4, slotDist * 0.4);
          wpos.current.set(hx + (toPadX / toPadLen) * startDist, 0, hz + (toPadZ / toPadLen) * startDist);
          ex = tx - wpos.current.x;
          ez = tz - wpos.current.z;
          slotDist = Math.hypot(ex, ez);
        }
      }

      const handlerFlying = hy > COMPANION_LIFT_THRESHOLD * ws;
      const targetY = handlerFlying ? Math.max(0, hy - COMPANION_WING_DROP * ws) : 0;
      const ey = targetY - wpos.current.y;
      const introActive = approachForced.current;
      const inIntro = introActive;

      if (slotDist < COMPANION_SLOT_ARRIVED * ws && Math.abs(ey) < 0.8 * ws && introElapsed.current > 0.15) {
        approachForced.current = false;
      }
      if (inIntro) introElapsed.current += dt;

      const jetApproach = introActive || slotDist > COMPANION_JETPACK_DIST * ws;
      const airborne = jetApproach || handlerFlying || wpos.current.y > 0.35 * ws;
      flyAmt.current += ((airborne ? 1 : 0) - flyAmt.current) * (1 - Math.exp(-(inIntro ? 22 : 8) * dt));

      let wantY = targetY;
      if (jetApproach && slotDist > COMPANION_SLOT_ARRIVED * ws) {
        const arc = Math.min(1, slotDist / (COMPANION_JETPACK_DIST * ws * 2));
        wantY = Math.max(targetY, COMPANION_APPROACH_ARC * ws * arc);
      }
      if (inIntro) wantY = Math.max(wantY, COMPANION_APPROACH_ARC * ws);

      const vel = companionVel.current;

      if (inIntro && slotDist > 0.04) {
        // Guaranteed 2s arrival: each frame close `dt/remaining` of the gap (works
        // for moving targets too). No velocity smoothing — direct homing.
        const remaining = Math.max(0.04, COMPANION_INTRO_SEC - introElapsed.current);
        const f = Math.min(1, dt / remaining);
        const eyIntro = wantY - wpos.current.y;
        wpos.current.x += ex * f;
        wpos.current.z += ez * f;
        wpos.current.y += eyIntro * f;
        wpos.current.y = Math.max(0, wpos.current.y);
        if (dt > 0) {
          vel.set(ex * f / dt, eyIntro * f / dt, ez * f / dt);
        }
      } else {
        let wantVx = hvx + ex * COMPANION_CATCH_K;
        let wantVz = hvz + ez * COMPANION_CATCH_K;
        let wantVy = hvy + ey * COMPANION_VERT_CATCH_K;
        const wantPlanar = Math.hypot(wantVx, wantVz);
        const maxPlanar = COMPANION_CATCH_MAX * ws;
        if (wantPlanar > maxPlanar && wantPlanar > 0) {
          const k = maxPlanar / wantPlanar;
          wantVx *= k;
          wantVz *= k;
        }
        wantVy = Math.max(-COMPANION_VERT_MAX, Math.min(COMPANION_VERT_MAX, wantVy));
        const kv = 1 - Math.exp(-COMPANION_ACCEL * dt);
        vel.x += (wantVx - vel.x) * kv;
        vel.z += (wantVz - vel.z) * kv;
        vel.y += (wantVy - vel.y) * kv;
        wpos.current.x += vel.x * dt;
        wpos.current.z += vel.z * dt;
        if (wpos.current.y > wantY + 0.02 && flyAmt.current < 0.45 && !jetApproach && !handlerFlying) {
          wpos.current.y -= COMPANION_EXTRA_GRAV * dt;
          wpos.current.y = Math.max(wantY, wpos.current.y);
          vel.y = Math.min(vel.y, 0);
        } else {
          wpos.current.y += vel.y * dt;
        }
        wpos.current.y = Math.max(0, wpos.current.y);
      }

      chaseSpeed.current = Math.hypot(vel.x, vel.z);
      const padMoving = chaseSpeed.current > 0.6;

      const wantH = inIntro && slotDist > 0.04
        ? Math.atan2(ex, ez)
        : padMoving
          ? Math.atan2(vel.x, vel.z)
          : hh;
      let dH = wantH - wheading.current;
      dH = Math.atan2(Math.sin(dH), Math.cos(dH));
      wheading.current += dH * Math.min(1, dt * 10);
      if (flyAmt.current > 0.02) {
        const att = flightAttitudePlanar(vel.x, vel.z, wheading.current, flyAmt.current);
        const ls = Math.min(1, dt * 10);
        flyPitch.current += (att.pitch - flyPitch.current) * ls;
        flyBank.current += (att.roll - flyBank.current) * ls;
      } else {
        const ls = Math.min(1, dt * 12);
        flyPitch.current += (0 - flyPitch.current) * ls;
        flyBank.current += (0 - flyBank.current) * ls;
      }

      gref.current.position.set(wpos.current.x, wpos.current.y, wpos.current.z);
      gref.current.rotation.y = wheading.current;
      const padPlanar = flyAmt.current < 0.5 ? chaseSpeed.current : 0;
      const shouldLoco = locoGate(padPlanar, dt);
      wanderMoving.current = shouldLoco;

      if (!gestureBusy.current) {
        setLoco(shouldLoco ? (chaseSpeed.current > RUN_SPEED_AT * sceneScale ? "run" : "walk") : "rest", chaseSpeed.current);
      }

      companionFlyingRef.current = jetApproach || flyAmt.current > 0.55 || handlerFlying;
      if (companionFlyingRef.current) {
        companionJetEmit.current += dt;
        if (companionJetEmit.current > 0.055) {
          companionJetEmit.current = 0;
          companionJetBurst.current++;
        }
      } else {
        companionJetEmit.current = 0;
      }
      if (companionFlyingRef.current && !wasCompanionFlying.current) companionJetBurst.current++;
      wasCompanionFlying.current = companionFlyingRef.current;
    }

    if (companionDrive && !wander && !padLeash) {
      const flying = companionDrive.flyingRef.current ?? false;
      const moving = companionDrive.movingRef.current ?? false;
      const speed = companionDrive.speedRef.current ?? 0;
      const run = companionDrive.runRef.current ?? false;

      flyAmt.current += ((flying ? 1 : 0) - flyAmt.current) * (1 - Math.exp(-(flying ? 10 : 8) * dt));
      wanderMoving.current = moving && !flying;

      if (!gestureBusy.current) {
        if (flying) setLoco("rest", speed, 0.22);
        else if (moving && run) setLoco("run", speed);
        else if (moving) setLoco("walk", speed);
        else setLoco("rest", 0, 0.28);
      }

      companionFlyingRef.current = flying;
      if (flying) {
        companionJetEmit.current += dt;
        if (companionJetEmit.current > 0.055) {
          companionJetEmit.current = 0;
          companionJetBurst.current++;
        }
      } else {
        companionJetEmit.current = 0;
      }
      if (flying && !wasCompanionFlying.current) companionJetBurst.current++;
      wasCompanionFlying.current = flying;

      if (flying && flyAmt.current > 0.02) {
        const vel = companionDrive.velRef.current;
        const h = companionDrive.headingRef.current ?? 0;
        const att = flightAttitudePlanar(vel.x, vel.z, h, flyAmt.current);
        const ls = Math.min(1, dt * 10);
        flyPitch.current += (att.pitch - flyPitch.current) * ls;
        flyBank.current += (att.roll - flyBank.current) * ls;
      } else if (!flying) {
        const ls = Math.min(1, dt * 12);
        flyPitch.current += (0 - flyPitch.current) * ls;
        flyBank.current += (0 - flyBank.current) * ls;
      }
    }

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
    const peaceful = (restPose === "standing" || restPose === "sitting") && hpFrac == null && locoCur.current === "rest";
    const locoActive =
      locoCur.current === "walk" ||
      locoCur.current === "run" ||
      ((wander || padLeash || companionDrive) && wanderMoving.current);
    if (lod === 0) {
      built.mixer.update(dt);
      applyBoneMorph(built.bones, built.boneBase, built.morph);
      dampNeck(built, peaceful);
      breathe(built, t + phase, breatheIntensity);
    } else if (lod === 1 || locoActive) {
      lodAccum.current += dt;
      if (lodAccum.current >= LOD_MID_STEP) {
        built.mixer.update(lodAccum.current);
        applyBoneMorph(built.bones, built.boneBase, built.morph);
        dampNeck(built, peaceful);
        breathe(built, t + phase, breatheIntensity);
        lodAccum.current = 0;
      }
    }
    const decorate = lod === 0;

    // lunge / recoil melee impulses on the body group
    lunge.current = Math.max(0, lunge.current - dt * 2.4);
    recoil.current = Math.max(0, recoil.current - dt * 2.2);
    const inCombat = hpFrac != null;
    const bobHz = inCombat && bodyBob > 0 ? ANIM.portrait.battleBobHz : ANIM.portrait.bobHz;
    const bobY = bodyBob > 0 ? Math.sin(t * bobHz + phase) * bodyBob : 0;
    const bobX = inCombat && bodyBob > 0 ? Math.sin(t * bobHz * 2.1 + phase + 1.4) * ANIM.portrait.battleSwayAmp : 0;
    if (motion.current) {
      // flight attitude for the owned companion: nose-forward pitch + bank into turns
      // + a soft air bob while aloft. flyAmt is 0 for everyone else, so NPCs keep
      // their static lean. Damped under reduce-motion.
      const calm = useSettings.getState().reduceMotion;
      const airBob = flyAmt.current > 0.01 && !calm ? Math.sin(t * 1.5 + phase) * 0.06 * flyAmt.current : 0;
      motion.current.position.z = lunge.current * 0.5 - recoil.current * 0.4;
      motion.current.position.y = bobY + airBob;
      motion.current.position.x = bobX;
      motion.current.rotation.x = kitFor(type).lean + flyPitch.current;
      motion.current.rotation.z = calm ? 0 : flyBank.current;
    }

    // evo animations — cosmetic only, so freeze them past the near band
    if (decorate) {
      if (auraRef.current) auraRef.current.scale.setScalar(1 + Math.sin(t * 1.6 + phase) * 0.06);
      if (crownRef.current) {
        crownRef.current.rotation.y += 0.6 * dt; // dt-based spin (0.01/frame @60fps)
        crownRef.current.position.y = app.h + 0.3 + Math.sin(t * 1.4) * 0.05;
      }
    }
  }, companionFrame ? -1 : companionRigDrive ? 2 : 0);

  const auraOpacity = (0.05 + ti * 0.045) * 0.32 * (auraDim ? 0.32 : 1);
  const auraR = app.h * (auraDim ? 0.46 : 0.62);
  // the body's core bone — drives the energy decor so it rides the live motion
  // (idle sway, the punch lunge, the hit recoil) instead of hanging at the static
  // figure origin and getting clipped by the fighter as it lunges.
  const coreBone = built.bones["abdomen"] ?? built.bones["torso"] ?? built.bones["spine"];

  return (
    <group
      ref={gref}
      position={wander || padLeash ? undefined : position}
      rotation={wander || padLeash ? undefined : [0, rotation, 0]}
      onClick={onSelect ? (e) => (e.stopPropagation(), onSelect()) : undefined}
      onPointerOver={onSelect ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={onSelect ? () => (document.body.style.cursor = "default") : undefined}
    >
    {/* the BODY (and all its bone-riding decor / labels) scales to the scene —
        mascots in the open world, full size in battles. The positional frame
        above stays in TRUE world units, so wander paths and authored placements
        land where the scene laid them out instead of compressing toward origin
        (the old outer-scale wrap halved every roam radius — agents drifted into
        the arena keep-out the biomes explicitly reserve). */}
    <group scale={sceneScale}>
      {/* The body AND all the bolted decor live in the SAME group, so they share
          the exact transform the anchors were measured in. CRITICAL: the static
          posture `lean` (and the punch lunge/recoil z below) is applied HERE — if
          the decor sat OUTSIDE this group it would float off the tilted body
          (BoneFollower only tracks the bone's animation delta, so it cancels — and
          therefore never compensates for — this static lean), which is exactly the
          "pieces hover beside the head / power core sits out of the chest" bug. */}
      <group ref={motion} rotation={[kitFor(type).lean, 0, 0]}>
        <primitive object={built.root} />

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
          anchors={built.partAnchors}
          dim={auraDim}
        />

        {/* per-Force signature attachments — the species markings that make each
            Force read as a different being; tinted to this individual. Each piece
            fuses to its own bone (head / torso) INTERNALLY, so it rides the live
            anatomy instead of orbiting the figure or hanging in empty space. */}
        {!hideFloaters && <ArchetypeFeatures type={type} h={app.h} color={palette.cube} accent={palette.accent} dim={auraDim} seed={seed} bones={built.bones} anchors={built.partAnchors} />}

        {padLeash && <Jetpack h={app.h} flyingRef={companionFlyingRef} burstRef={companionJetBurst} />}
        {companionDrive && !padLeash && <Jetpack h={app.h} flyingRef={companionFlyingRef} burstRef={companionJetBurst} />}

        {/* keeper regalia + aura ride the core bone so they track the body's live
            motion (sway, lunge, recoil) as one piece instead of hanging at the
            static origin and getting clipped by the fighter mid-duel. */}
        <BoneFollower bone={coreBone}>
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
      </group>

      {/* ground aura ring — floor glow; stays OUTSIDE the leaning body group so it
          lies flat on the floor; also excluded from the fit envelope */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} userData={{ fitIgnore: true }}>
        <ringGeometry args={[0.78, 0.92, 48]} />
        <meshBasicMaterial color={col} transparent opacity={selected ? 0.8 : 0.22} side={THREE.DoubleSide} />
      </mesh>

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

      {speechEmote && !speechLine && (
        <Html position={[0, app.h + 1.62, 0]} center distanceFactor={9} zIndexRange={[33, 0]} style={{ pointerEvents: "none" }}>
          <div
            style={{
              minWidth: 30,
              padding: "5px 11px",
              borderRadius: 999,
              background: "rgba(8,6,14,.92)",
              border: `1.5px solid ${colHex}`,
              boxShadow: `0 4px 18px rgba(0,0,0,.5), 0 0 26px -6px ${colHex}`,
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1,
              color: colHex,
              textAlign: "center",
              animation: "championEmotePop .26s cubic-bezier(.2,1.4,.4,1)",
            }}
          >
            {speechEmote}
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

    </group>
    </group>
  );
}
