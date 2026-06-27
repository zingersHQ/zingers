"use client";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Phenotype } from "@/lib/render/phenotype";

// Solid anatomy bolted onto the rig. The decor used to live as plain siblings of
// the body at fixed Y-fractions, so it floated in place while the skeleton bobbed
// and turned under it. Now every piece rides a `BoneFollower`: it keeps the same
// hand-tuned resting anchor (so the layout is unchanged at rest) but rigidly
// tracks the RIGID MOTION its bone has undergone from the bind pose — the head's
// gaze bob, the body lean, the punch lunge — so a crown/horn/pauldron reads as
// FUSED to the body and moves with it. Tints come from the individual's palette so
// the parts read as the same being as the painted body.
export interface PartPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  dark: string;
}

// ── BoneFollower ───────────────────────────────────────────────────────────────
// Reusable: glue arbitrary decor to a skeleton bone. On the first frame it records
// the bone's rest transform (in this group's parent space); every frame after it
// applies `current · rest⁻¹` — the rigid delta the bone has travelled from rest —
// as its own local matrix. Because the delta is identity at rest, children keep
// their authored figure-local anchors exactly, then swing about the bone's pivot
// (neck, shoulder socket, spine) precisely as the live skeleton does.
const _bone = new THREE.Matrix4();
const _parentInv = new THREE.Matrix4();
const _cur = new THREE.Matrix4();
const _restInv = new THREE.Matrix4();
const _delta = new THREE.Matrix4();

export function BoneFollower({ bone, children }: { bone?: THREE.Object3D; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const rest = useRef<THREE.Matrix4 | null>(null);
  useFrame(() => {
    const g = ref.current;
    const parent = g?.parent;
    if (!g || !bone || !parent) return;
    // refresh both branches off the shared champion root so they agree this frame
    bone.updateWorldMatrix(true, false);
    parent.updateWorldMatrix(true, false);
    _parentInv.copy(parent.matrixWorld).invert();
    _bone.copy(bone.matrixWorld);
    _cur.multiplyMatrices(_parentInv, _bone); // bone expressed in parent space
    if (!rest.current) rest.current = _cur.clone();
    _restInv.copy(rest.current).invert();
    _delta.multiplyMatrices(_cur, _restInv);
    _delta.decompose(g.position, g.quaternion, g.scale);
  });
  return <group ref={ref}>{children}</group>;
}

export function PhenotypeParts({
  pheno,
  h,
  headScale,
  shoulder,
  pal,
  bones,
  dim = false,
}: {
  pheno: Phenotype;
  h: number;
  headScale: number;
  shoulder: number;
  pal: PartPalette;
  /** skeleton bones (lowercased names) so each piece can fuse to its anchor */
  bones?: Record<string, THREE.Object3D>;
  dim?: boolean;
}) {
  // anchor heights as fractions of figure height (tuned to the RobotExpressive
  // proportions — big head sitting high on a compact body)
  const headY = h * 0.86;
  const headTop = h * 0.97;
  const headR = h * 0.13 * headScale;
  const shY = h * 0.66;
  const shX = h * (0.22 + (shoulder - 1) * 0.12);
  const chestY = h * 0.6;
  const chestZ = h * 0.16;
  const backY = h * 0.62;
  const backZ = -h * 0.22;
  const k = dim ? 0.7 : 1;

  const head = bones?.["head"];
  const torso = bones?.["torso"];

  return (
    <group>
      {pheno.headgear !== "none" && (
        <BoneFollower bone={head}>
          <Headgear kind={pheno.headgear} h={h} top={headTop} center={headY} r={headR} count={pheno.count} pal={pal} k={k} />
        </BoneFollower>
      )}
      {/* Visor removed: it sat in front of the (large) head and its ends poked out
          as detached bars that didn't track the head bone. The model's own dark
          face prim is lit as glowing eyes (see buildCharacter `isEye`), so the
          champions keep a face without the clipping hardware. */}
      {pheno.shoulders !== "none" &&
        [-1, 1].map((s) => (
          <BoneFollower key={s} bone={bones?.[s < 0 ? "shoulder.l" : "shoulder.r"]}>
            <Shoulder kind={pheno.shoulders} sgn={s} h={h} x={shX} y={shY} pal={pal} k={k} />
          </BoneFollower>
        ))}
      {pheno.chest !== "none" && (
        <BoneFollower bone={torso}>
          <Chest kind={pheno.chest} y={chestY} z={chestZ} h={h} pal={pal} k={k} />
        </BoneFollower>
      )}
      {pheno.back !== "none" && (
        <BoneFollower bone={torso}>
          <Back kind={pheno.back} y={backY} z={backZ} h={h} count={pheno.count} pal={pal} k={k} />
        </BoneFollower>
      )}
    </group>
  );
}

function struct(color: string, metalness = 0.62, roughness = 0.34) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} flatShading />;
}
function smooth(color: string, metalness = 0.7, roughness = 0.28) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />;
}
function glowMat(color: string, intensity: number) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} metalness={0.4} roughness={0.25} />;
}

// ── Headgear ──────────────────────────────────────────────────────────────────
function Headgear({ kind, top, center, r, count, pal, k }: { kind: Phenotype["headgear"]; h: number; top: number; center: number; r: number; count: number; pal: PartPalette; k: number }) {
  if (kind === "none") return null;

  if (kind === "crest") {
    // a fanned plume of swept blades sitting on a curved mounting bar — the blades
    // are thin (scaled on Z) so the crest reads as a crown of fins, not pylons
    const blades = Math.max(3, Math.min(7, count + 1));
    return (
      <group position={[0, center + r * 0.62, -r * 0.05]}>
        {/* mounting bar that visually ties the blades to the skull */}
        <mesh position={[0, -r * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 0.62, r * 0.07, 10, 24, Math.PI]} />
          {smooth(pal.dark, 0.55, 0.45)}
        </mesh>
        {Array.from({ length: blades }).map((_, i) => {
          const t = blades === 1 ? 0 : i / (blades - 1) - 0.5;
          const height = r * (1.15 - Math.abs(t) * 0.45);
          return (
            <group key={i} position={[t * r * 1.0, height * 0.4, -Math.abs(t) * r * 0.35]} rotation={[-0.22 - Math.abs(t) * 0.2, 0, 0]}>
              <mesh scale={[1, 1, 0.32]}>
                <coneGeometry args={[r * 0.17, height, 8]} />
                {smooth(i % 2 ? pal.accent : pal.secondary)}
              </mesh>
              {/* glowing leading edge so the plume catches the Force light */}
              <mesh position={[0, 0, r * 0.05]} scale={[0.28, 1, 0.12]}>
                <coneGeometry args={[r * 0.17, height * 0.98, 4]} />
                {glowMat(pal.glow, 1.1 * k)}
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (kind === "fin") {
    // a single dorsal fin with a glowing membrane and a ridge of bumps
    return (
      <group position={[0, center + r * 0.42, -r * 0.16]} rotation={[0.42, 0, 0]}>
        <mesh scale={[0.26, 1, 1]}>
          <coneGeometry args={[r * 0.62, r * 1.85, 12]} />
          {smooth(pal.secondary, 0.65, 0.34)}
        </mesh>
        <mesh position={[0, r * 0.12, r * 0.02]} scale={[0.14, 1, 0.92]}>
          <coneGeometry args={[r * 0.6, r * 1.55, 8]} />
          {glowMat(pal.glow, 1.3 * k)}
        </mesh>
        {/* spine bumps down the leading edge */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, r * (0.55 - i * 0.34), r * (0.16 - i * 0.06)]}>
            <sphereGeometry args={[r * (0.085 - i * 0.012), 10, 8]} />
            {smooth(pal.accent, 0.6, 0.35)}
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "horns") {
    // curved horns: a thick rooted base segment + a tapered swept tip, so each horn
    // reads as a single curved tusk rather than a flat pyramid
    return (
      <group position={[0, center + r * 0.42, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * r * 0.52, 0, 0]} rotation={[0, 0, -s * 0.6]}>
            {/* root collar */}
            <mesh position={[0, -r * 0.05, 0]}>
              <cylinderGeometry args={[r * 0.26, r * 0.3, r * 0.16, 10]} />
              {smooth(pal.dark, 0.5, 0.5)}
            </mesh>
            {/* lower curve */}
            <mesh position={[0, r * 0.45, 0]}>
              <coneGeometry args={[r * 0.24, r * 0.95, 8]} />
              {smooth(pal.secondary, 0.62, 0.36)}
            </mesh>
            {/* swept tip, kinked outward */}
            <mesh position={[s * r * 0.16, r * 1.05, 0]} rotation={[0, 0, -s * 0.6]}>
              <coneGeometry args={[r * 0.13, r * 0.7, 8]} />
              {smooth(pal.secondary, 0.62, 0.36)}
            </mesh>
            {/* etched rings of light */}
            {[0.18, 0.5].map((f) => (
              <mesh key={f} position={[0, r * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[r * (0.25 - f * 0.18), r * 0.025, 8, 16]} />
                {glowMat(pal.glow, 0.9 * k)}
              </mesh>
            ))}
          </group>
        ))}
      </group>
    );
  }

  if (kind === "antenna") {
    const n = Math.max(1, Math.min(3, count - 1));
    return (
      <group position={[0, top, 0]}>
        {Array.from({ length: n }).map((_, i) => {
          const off = (i - (n - 1) / 2) * r * 0.5;
          return (
            <group key={i} position={[off, 0, 0]} rotation={[0, 0, off === 0 ? 0 : off > 0 ? -0.2 : 0.2]}>
              {/* socket */}
              <mesh position={[0, r * 0.02, 0]}>
                <cylinderGeometry args={[r * 0.1, r * 0.12, r * 0.12, 10]} />
                {smooth(pal.dark, 0.6, 0.4)}
              </mesh>
              {/* segmented rod */}
              <mesh position={[0, r * 0.55, 0]}>
                <cylinderGeometry args={[r * 0.035, r * 0.06, r * 1.1, 8]} />
                {smooth(pal.dark, 0.7, 0.36)}
              </mesh>
              <mesh position={[0, r * 1.16, 0]}>
                <cylinderGeometry args={[r * 0.028, r * 0.04, r * 0.26, 8]} />
                {smooth(pal.secondary, 0.7, 0.3)}
              </mesh>
              {/* bulb tip with a faint halo ring */}
              <mesh position={[0, r * 1.42, 0]}>
                <sphereGeometry args={[r * 0.13, 16, 14]} />
                {glowMat(pal.glow, 2.0 * k)}
              </mesh>
              <mesh position={[0, r * 1.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[r * 0.2, r * 0.014, 8, 24]} />
                {glowMat(pal.glow, 1.4 * k)}
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (kind === "dome") {
    // paneled sensor dome: a smooth canopy, a rim band, and a single eye-lens
    return (
      <group position={[0, center + r * 0.4, 0]}>
        <mesh>
          <sphereGeometry args={[r * 1.05, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          {smooth(pal.secondary, 0.5, 0.5)}
        </mesh>
        <mesh position={[0, r * 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.04, r * 0.07, 12, 32]} />
          {smooth(pal.dark, 0.55, 0.45)}
        </mesh>
        <mesh position={[0, r * 0.42, r * 0.92]} rotation={[Math.PI * 0.28, 0, 0]}>
          <sphereGeometry args={[r * 0.18, 16, 14]} />
          {glowMat(pal.glow, 1.8 * k)}
        </mesh>
      </group>
    );
  }
  // crownRing retired — it floated as a halo ring above the head (read as detached
  // and clashed with the legend crown). Falls through to nothing.
  return null;
}

// ── Shoulders ─────────────────────────────────────────────────────────────────
function Shoulder({ kind, sgn, h, x, y, pal, k }: { kind: Phenotype["shoulders"]; sgn: number; h: number; x: number; y: number; pal: PartPalette; k: number }) {
  const u = h * 0.12;
  if (kind === "pauldron") {
    // layered pauldron: a smooth cap, a banded rim, and a small crest spike
    return (
      <group position={[sgn * x, y, 0]} rotation={[0, 0, -sgn * 0.3]}>
        <mesh>
          <sphereGeometry args={[u * 0.9, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          {smooth(pal.secondary, 0.55, 0.42)}
        </mesh>
        <mesh position={[0, -u * 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[u * 0.88, u * 0.1, 10, 28, Math.PI]} />
          {smooth(pal.dark, 0.5, 0.5)}
        </mesh>
        <mesh position={[0, u * 0.5, 0]} rotation={[0, 0, -sgn * 0.2]}>
          <coneGeometry args={[u * 0.16, u * 0.6, 6]} />
          {smooth(pal.accent, 0.6, 0.35)}
        </mesh>
      </group>
    );
  }
  if (kind === "spike") {
    // a cluster of three spikes on a small base plate
    return (
      <group position={[sgn * x, y, 0]} rotation={[0, 0, -sgn * 0.5]}>
        <mesh position={[0, -u * 0.08, 0]}>
          <cylinderGeometry args={[u * 0.5, u * 0.6, u * 0.22, 10]} />
          {smooth(pal.dark, 0.55, 0.45)}
        </mesh>
        {[-1, 0, 1].map((j) => (
          <group key={j} position={[j * u * 0.28, u * 0.45, 0]} rotation={[0, 0, -j * 0.28]}>
            <mesh>
              <coneGeometry args={[u * 0.18, u * (1.4 - Math.abs(j) * 0.35), 7]} />
              {smooth(pal.dark, 0.6, 0.4)}
            </mesh>
            <mesh position={[0, u * 0.05, 0]} scale={[0.4, 1, 0.4]}>
              <coneGeometry args={[u * 0.18, u * (1.35 - Math.abs(j) * 0.35), 7]} />
              {glowMat(pal.glow, 1.2 * k)}
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  // vent — louvered exhaust slats on a recessed housing
  return (
    <group position={[sgn * x, y, 0]} rotation={[0, 0, -sgn * 0.2]}>
      <mesh>
        <boxGeometry args={[u * 1.0, u * 0.78, u * 0.78]} />
        {smooth(pal.dark, 0.5, 0.55)}
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * u * 0.22 - u * 0.22, u * 0.42]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[u * 0.86, u * 0.1, u * 0.2]} />
          {i === 1 ? glowMat(pal.glow, 1.2 * k) : smooth(pal.secondary, 0.5, 0.5)}
        </mesh>
      ))}
    </group>
  );
}

// ── Chest core ────────────────────────────────────────────────────────────────
function Chest({ kind, y, z, h, pal, k }: { kind: Phenotype["chest"]; y: number; z: number; h: number; pal: PartPalette; k: number }) {
  if (kind === "none") return null;
  const u = h * 0.12;
  return (
    <group position={[0, y, z]}>
      {kind === "diamond" && (
        <group>
          {/* recessed bezel housing the reactor */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[u * 0.82, u * 0.14, 12, 24]} />
            {smooth(pal.dark, 0.55, 0.45)}
          </mesh>
          <mesh>
            <octahedronGeometry args={[u * 0.66, 0]} />
            {glowMat(pal.glow, 1.9 * k)}
          </mesh>
        </group>
      )}
      {kind === "ring" && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[u * 0.7, u * 0.16, 14, 28]} />
            {smooth(pal.secondary, 0.6, 0.4)}
          </mesh>
          <mesh>
            <sphereGeometry args={[u * 0.34, 16, 14]} />
            {glowMat(pal.glow, 1.8 * k)}
          </mesh>
        </group>
      )}
      {kind === "bars" &&
        [-1, 0, 1].map((i) => (
          <mesh key={i} position={[0, i * u * 0.32, 0]}>
            <boxGeometry args={[u * (1.2 - Math.abs(i) * 0.2), u * 0.18, u * 0.2]} />
            {i === 0 ? glowMat(pal.glow, 1.5 * k) : smooth(pal.dark, 0.5, 0.5)}
          </mesh>
        ))}
    </group>
  );
}

// ── Back unit ─────────────────────────────────────────────────────────────────
function Back({ kind, y, z, h, count, pal, k }: { kind: Phenotype["back"]; y: number; z: number; h: number; count: number; pal: PartPalette; k: number }) {
  const banner = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (banner.current) banner.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.8) * 0.08;
  });
  if (kind === "none") return null;
  const u = h * 0.12;
  if (kind === "thrusters") {
    const n = Math.max(2, Math.min(3, count - 1));
    return (
      <group position={[0, y, z]}>
        {Array.from({ length: n }).map((_, i) => {
          const off = (i - (n - 1) / 2) * u * 0.8;
          return (
            <group key={i} position={[off, 0, 0]} rotation={[0.4, 0, 0]}>
              {/* housing with a ribbed throat */}
              <mesh>
                <cylinderGeometry args={[u * 0.3, u * 0.36, u * 1.3, 12]} />
                {smooth(pal.dark, 0.6, 0.4)}
              </mesh>
              <mesh position={[0, u * 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[u * 0.34, u * 0.05, 8, 18]} />
                {smooth(pal.secondary, 0.6, 0.4)}
              </mesh>
              {/* glowing nozzle bell */}
              <mesh position={[0, -u * 0.72, 0]}>
                <coneGeometry args={[u * 0.34, u * 0.55, 14]} />
                {glowMat(pal.glow, 1.9 * k)}
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }
  if (kind === "slab") {
    return (
      <group position={[0, y, z]}>
        <mesh>
          <boxGeometry args={[h * 0.5, h * 0.9, h * 0.06]} />
          {struct(pal.dark, 0.3, 0.7)}
        </mesh>
        <mesh position={[0, 0, -h * 0.031]}>
          <planeGeometry args={[h * 0.06, h * 0.7]} />
          {glowMat(pal.glow, 1.2 * k)}
        </mesh>
      </group>
    );
  }
  if (kind === "wings") {
    // swept wings: a tapered membrane panel with a glowing leading spar per side
    return (
      <group position={[0, y, z]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * u * 0.5, u * 0.3, 0]} rotation={[0.2, 0, -s * 0.7]}>
            <mesh position={[s * u * 0.95, 0, 0]} rotation={[0, 0, -s * Math.PI / 2]} scale={[1, 1, 0.16]}>
              <coneGeometry args={[u * 0.55, u * 2.1, 4]} />
              {smooth(pal.secondary, 0.55, 0.4)}
            </mesh>
            <mesh position={[s * u * 0.6, u * 0.42, 0]} rotation={[0, 0, -s * 0.5]}>
              <boxGeometry args={[u * 1.9, u * 0.08, u * 0.08]} />
              {glowMat(pal.glow, 1.3 * k)}
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  // banner — a slim cape trailing from the shoulders (narrow so it never reads as
  // a shield strapped to the back)
  return (
    <mesh ref={banner} position={[0, y - h * 0.26, z + h * 0.01]}>
      <planeGeometry args={[h * 0.22, h * 0.74, 1, 4]} />
      <meshStandardMaterial color={pal.primary} emissive={pal.glow} emissiveIntensity={0.3 * k} metalness={0.2} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}
