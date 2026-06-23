"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { CreatureType } from "@/lib/types";
import type { Appearance } from "@/lib/evolve/appearance";
import type { BodyPalette, Region, Side } from "@/lib/render/palette";

// ─────────────────────────────────────────────────────────────────────────────
// ProceduralRobot — a champion's body, BUILT FROM SCRATCH out of primitives so
// each Force is a genuinely different machine, not the same cartoon rig rescaled.
// The career genome (appearance.morph) drives proportions; the Force DESIGN drives
// the construction language (crystalline vs monolithic vs bobblehead …); the
// individual palette paints it. A light procedural rig animates idle/walk/punch.
// ─────────────────────────────────────────────────────────────────────────────

type HeadShape = "octa" | "box" | "sphere" | "capsule" | "cone";
type TorsoShape = "box" | "prism" | "taperUp" | "taperDown" | "capsule" | "sphere";
type LimbShape = "box" | "capsule";

interface RobotDesign {
  head: HeadShape;
  torso: TorsoShape;
  limb: LimbShape;
  /** hard, faceted look (flatShading + sharper joints) */
  faceted: boolean;
  /** head forward tilt (rad) — posture identity */
  headTilt: number;
  /** segmented antenna/“tail” bits etc handled by phenotype; this is body only */
}

// The five construction languages. Proportions come from the genome+archetype
// (appearance.morph); these pick the SHAPES so the species read as different
// machines even at the same size.
const DESIGN: Record<CreatureType, RobotDesign> = {
  // crystalline, angular, precise — a faceted geometric construct
  LOGIC: { head: "octa", torso: "prism", limb: "box", faceted: true, headTilt: -0.04 },
  // jagged, mismatched, restless — boxy and lopsided
  CHAOS: { head: "box", torso: "box", limb: "capsule", faceted: true, headTilt: 0.14 },
  // monolithic block — a walking slab
  COMPOSURE: { head: "box", torso: "box", limb: "box", faceted: false, headTilt: 0 },
  // tall, smooth, regal — an upright orator: tall capsule head, broad chest to a
  // narrow waist. Capsule head keeps it distinct from the Spark's round bobblehead.
  RHETORIC: { head: "capsule", torso: "taperDown", limb: "capsule", faceted: false, headTilt: -0.02 },
  // bobblehead sprite — huge round head, wispy capsule body
  CREATIVITY: { head: "sphere", torso: "capsule", limb: "capsule", faceted: false, headTilt: 0.03 },
};

export function designFor(type: CreatureType): RobotDesign {
  return DESIGN[type] ?? DESIGN.LOGIC;
}

// ── geometry helpers ──────────────────────────────────────────────────────────
function HeadGeo({ shape, r }: { shape: HeadShape; r: number }) {
  switch (shape) {
    case "octa":
      return <octahedronGeometry args={[r * 1.15, 0]} />;
    case "box":
      return <boxGeometry args={[r * 1.7, r * 1.7, r * 1.6]} />;
    case "cone":
      return <coneGeometry args={[r * 1.2, r * 2.2, 6]} />;
    case "capsule":
      return <capsuleGeometry args={[r * 0.8, r * 1.2, 6, 12]} />;
    default:
      return <sphereGeometry args={[r, 20, 16]} />;
  }
}

function TorsoGeo({ shape, r, h }: { shape: TorsoShape; r: number; h: number }) {
  switch (shape) {
    case "box":
      return <boxGeometry args={[r * 2, h, r * 1.5]} />;
    case "prism":
      return <cylinderGeometry args={[r * 1.05, r * 0.95, h, 4]} />; // 4-sided crystal column
    case "taperUp":
      return <cylinderGeometry args={[r * 1.25, r * 0.7, h, 14]} />; // wide shoulders ↑
    case "taperDown":
      return <cylinderGeometry args={[r * 1.3, r * 0.72, h, 16]} />; // broad chest → waist
    case "capsule":
      return <capsuleGeometry args={[r * 0.9, h * 0.7, 6, 12]} />;
    default:
      return <cylinderGeometry args={[r, r, h, 16]} />;
  }
}

function LimbGeo({ shape, r, len, faceted }: { shape: LimbShape; r: number; len: number; faceted: boolean }) {
  if (shape === "box") return <boxGeometry args={[r * 2, len, r * 2]} />;
  return <capsuleGeometry args={[r, len - r * 2, 4, faceted ? 5 : 10]} />;
}

// ── one limb (upper + joint + lower + end cap), pivoting at the top ────────────
function Limb({
  pivotRef,
  x,
  y,
  upperLen,
  lowerLen,
  r,
  endR,
  design,
  colMain,
  colJoint,
  colEnd,
  mat,
  splay,
}: {
  pivotRef: React.RefObject<THREE.Group | null>;
  x: number;
  y: number;
  upperLen: number;
  lowerLen: number;
  r: number;
  endR: number;
  design: RobotDesign;
  colMain: string;
  colJoint: string;
  colEnd: string;
  mat: { metalness: number; roughness: number };
  /** outward rotation at rest (rad) */
  splay: number;
}) {
  const elbowY = -upperLen;
  return (
    <group ref={pivotRef} position={[x, y, 0]} rotation={[0, 0, splay]}>
      {/* shoulder/hip joint */}
      <mesh>
        <sphereGeometry args={[r * 1.25, 10, 8]} />
        <meshStandardMaterial color={colJoint} metalness={0.5} roughness={0.5} flatShading={design.faceted} />
      </mesh>
      {/* upper segment */}
      <mesh position={[0, -upperLen / 2, 0]}>
        <LimbGeo shape={design.limb} r={r} len={upperLen} faceted={design.faceted} />
        <meshStandardMaterial color={colMain} metalness={mat.metalness} roughness={mat.roughness} flatShading={design.faceted} />
      </mesh>
      {/* elbow/knee + lower segment + end cap */}
      <group position={[0, elbowY, 0]}>
        <mesh>
          <sphereGeometry args={[r * 1.05, 10, 8]} />
          <meshStandardMaterial color={colJoint} metalness={0.5} roughness={0.5} flatShading={design.faceted} />
        </mesh>
        <mesh position={[0, -lowerLen / 2, 0]}>
          <LimbGeo shape={design.limb} r={r * 0.86} len={lowerLen} faceted={design.faceted} />
          <meshStandardMaterial color={colMain} metalness={mat.metalness} roughness={mat.roughness} flatShading={design.faceted} />
        </mesh>
        <mesh position={[0, -lowerLen, 0]}>
          <sphereGeometry args={[endR, 10, 8]} />
          <meshStandardMaterial color={colEnd} metalness={0.45} roughness={0.5} flatShading={design.faceted} />
        </mesh>
      </group>
    </group>
  );
}

export interface RobotMotion {
  moving: boolean;
  speed: number;
  /** distance LOD (0 near … 2 far) — the parent updates it; 2 freezes the rig */
  lod: number;
}

export function ProceduralRobot({
  type,
  app,
  palette,
  motionRef,
  punchRef,
  hitRef,
  idlePhase = 0,
  idleSpeed = 1,
  lod = 0,
}: {
  type: CreatureType;
  app: Appearance;
  palette: BodyPalette;
  /** live locomotion state (written by the parent each frame) */
  motionRef?: React.RefObject<RobotMotion>;
  /** one-shot punch impulse 0..1 (parent sets to 1, robot decays) */
  punchRef?: React.RefObject<number>;
  /** one-shot hit/recoil impulse */
  hitRef?: React.RefObject<number>;
  idlePhase?: number;
  idleSpeed?: number;
  lod?: number;
}) {
  const d = designFor(type);
  const m = app.morph;
  const c = palette.colorFor.bind(palette);
  const col = (r: Region, s: Side = "") => c(r, s, "main");
  const dark = (r: Region, s: Side = "") => c(r, s, "dark");
  const mat = { metalness: app.metalness, roughness: app.roughness };

  // ── natural-unit layout (feet at 0); scaled to app.h at the end ──────────────
  const L = useMemo(() => {
    const footH = 0.05;
    const shinLen = 0.17 * m.legLen;
    const thighLen = 0.19 * m.legLen;
    const legR = 0.052 * m.legGirth;
    const pelvisH = 0.1;
    const pelvisR = 0.12 * m.torsoGirth;
    const torsoLen = 0.27 * m.torsoLen * (d.torso === "capsule" ? 0.7 : 1);
    const torsoR = 0.14 * m.torsoGirth;
    const shoulderSpan = 0.12 * m.shoulder + torsoR * 0.6;
    const shoulderR = 0.055 * m.shoulder;
    const upperArm = 0.16 * m.armLen;
    const lowerArm = 0.15 * m.armLen;
    const armR = 0.042 * m.armGirth;
    const handR = 0.055 * m.handScale;
    const neckLen = 0.05 * m.neckLen;
    const neckR = 0.034;
    const headR = 0.12 * m.headScale;

    const kneeY = footH + shinLen;
    const hipY = kneeY + thighLen;
    const pelvisCenter = hipY + pelvisH / 2;
    const torsoBottom = hipY + pelvisH * 0.6;
    const torsoCenter = torsoBottom + torsoLen / 2;
    const torsoTop = torsoBottom + torsoLen;
    const shoulderY = torsoTop - shoulderR;
    const neckBottom = torsoTop;
    const headCenterY = neckBottom + neckLen + headR;
    const totalH = headCenterY + headR;
    return {
      footH, shinLen, thighLen, legR, pelvisH, pelvisR, torsoLen, torsoR, shoulderSpan, shoulderR,
      upperArm, lowerArm, armR, handR, neckLen, neckR, headR,
      kneeY, hipY, pelvisCenter, torsoBottom, torsoCenter, torsoTop, shoulderY, neckBottom, headCenterY, totalH,
    };
  }, [m, d.torso]);

  const scale = app.h / L.totalH;

  // refs for the procedural rig
  const root = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const phase = useMemo(() => idlePhase || 0, [idlePhase]);

  useFrame((state, dt) => {
    const mv = motionRef?.current;
    const lodNow = mv?.lod ?? lod;
    if (lodNow >= 2) return; // frozen far away
    const t = state.clock.elapsedTime * idleSpeed + phase;
    const moving = !!mv?.moving;
    const gait = moving ? 1 : 0;

    // breathing / idle bob
    const breathe = 1 + Math.sin(t * 1.6) * 0.018;
    if (torsoRef.current) torsoRef.current.scale.setScalar(breathe);
    if (headRef.current) {
      headRef.current.rotation.x = d.headTilt + Math.sin(t * 1.2) * 0.05;
      const lean = m.asymL > m.asymR ? -0.05 : m.asymR > m.asymL ? 0.05 : 0; // chaos tilt
      headRef.current.rotation.z = lean + Math.sin(t * 0.5) * 0.03;
    }

    // arm + leg swing: a gentle pendulum at idle, a stronger gait while walking
    const swing = Math.sin(t * (moving ? 9 : 1.1));
    const armBase = 0.06 + gait * 0.5;
    const legBase = gait * 0.55;
    const punch = punchRef?.current ?? 0;
    const hit = hitRef?.current ?? 0;
    if (armL.current) armL.current.rotation.x = swing * armBase - punch * 1.4;
    if (armR.current) armR.current.rotation.x = -swing * armBase - punch * 1.4;
    if (legL.current) legL.current.rotation.x = -swing * legBase;
    if (legR.current) legR.current.rotation.x = swing * legBase;
    if (root.current) {
      root.current.position.y = (moving ? Math.abs(Math.sin(t * 9)) * 0.02 : Math.sin(t * 1.6) * 0.006) * app.h;
      root.current.rotation.z = -hit * 0.12;
      root.current.position.z = punch * 0.12 * app.h - hit * 0.06 * app.h;
    }
    // decay one-shot impulses
    if (punchRef && punchRef.current! > 0) punchRef.current = Math.max(0, punchRef.current! - dt * 3.2);
    if (hitRef && hitRef.current! > 0) hitRef.current = Math.max(0, hitRef.current! - dt * 3.0);
  });

  const facet = d.faceted;
  const asymKneeL = m.asymL;
  const asymKneeR = m.asymR;

  return (
    <group ref={root} scale={scale}>
      {/* legs */}
      <Limb
        pivotRef={legL}
        x={-L.pelvisR * 0.6}
        y={L.hipY}
        upperLen={L.thighLen * asymKneeL}
        lowerLen={L.shinLen * asymKneeL}
        r={L.legR}
        endR={L.legR * 1.5}
        design={d}
        colMain={col("thigh", "L")}
        colJoint={dark("thigh", "L")}
        colEnd={col("foot", "L")}
        mat={mat}
        splay={0.04}
      />
      <Limb
        pivotRef={legR}
        x={L.pelvisR * 0.6}
        y={L.hipY}
        upperLen={L.thighLen * asymKneeR}
        lowerLen={L.shinLen * asymKneeR}
        r={L.legR}
        endR={L.legR * 1.5}
        design={d}
        colMain={col("thigh", "R")}
        colJoint={dark("thigh", "R")}
        colEnd={col("foot", "R")}
        mat={mat}
        splay={-0.04}
      />

      {/* pelvis */}
      <mesh position={[0, L.pelvisCenter, 0]}>
        <boxGeometry args={[L.pelvisR * 2, L.pelvisH, L.pelvisR * 1.4]} />
        <meshStandardMaterial color={dark("torso")} metalness={mat.metalness} roughness={mat.roughness} flatShading={facet} />
      </mesh>

      {/* torso + everything above breathes together */}
      <group ref={torsoRef} position={[0, L.torsoBottom, 0]}>
        <mesh position={[0, L.torsoLen / 2, 0]}>
          <TorsoGeo shape={d.torso} r={L.torsoR} h={L.torsoLen} />
          <meshStandardMaterial color={col("torso")} metalness={mat.metalness} roughness={mat.roughness} flatShading={facet} />
        </mesh>

        {/* arms hang from the shoulders */}
        <Limb
          pivotRef={armL}
          x={-L.shoulderSpan}
          y={L.torsoLen - L.shoulderR}
          upperLen={L.upperArm * m.asymL}
          lowerLen={L.lowerArm * m.asymL}
          r={L.armR}
          endR={L.handR * m.asymL}
          design={d}
          colMain={col("arm", "L")}
          colJoint={dark("arm", "L")}
          colEnd={col("hand", "L")}
          mat={mat}
          splay={0.12}
        />
        <Limb
          pivotRef={armR}
          x={L.shoulderSpan}
          y={L.torsoLen - L.shoulderR}
          upperLen={L.upperArm * m.asymR}
          lowerLen={L.lowerArm * m.asymR}
          r={L.armR}
          endR={L.handR * m.asymR}
          design={d}
          colMain={col("arm", "R")}
          colJoint={dark("arm", "R")}
          colEnd={col("hand", "R")}
          mat={mat}
          splay={-0.12}
        />

        {/* neck + head */}
        <mesh position={[0, L.torsoLen + L.neckLen / 2, 0]}>
          <cylinderGeometry args={[L.neckR, L.neckR, L.neckLen, 8]} />
          <meshStandardMaterial color={dark("head")} metalness={0.5} roughness={0.5} />
        </mesh>
        <group ref={headRef} position={[0, L.torsoLen + L.neckLen + L.headR, 0]}>
          <mesh>
            <HeadGeo shape={d.head} r={L.headR} />
            <meshStandardMaterial color={col("head")} metalness={mat.metalness} roughness={mat.roughness} flatShading={facet} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
