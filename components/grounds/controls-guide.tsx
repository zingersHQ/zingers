"use client";
import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, View, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { X, Move, Zap, ChevronsUp, Plane, Camera, Sparkles, MousePointer2, Gamepad2, Hand, Menu } from "lucide-react";
import type { CreatureType } from "@/lib/types";
import { blank } from "@/lib/evolve/progression";
import { GOLD, forceColors, readerPalette } from "@/lib/render/palette";
import { buildCharacter, applyBoneMorph } from "@/components/grounds/champion-mesh";
import { Jetpack } from "@/components/grounds/jetpack";
import { useSettings } from "@/store/settings";

// A platform-aware controls reference. Each control is a live tile showing the
// REAL player avatar — the silver Handler rig (RobotExpressive), Force-tinted —
// struck in the actual posture for that action (walking, sprinting, the jetpack
// climb, a look-around orbit, a greeting reach…). All tiles are drawn by ONE
// shared WebGL context via drei's <View> (scissor-tiled), so the whole strip
// reads as a single integrated diorama without spending a context per cell over
// the live world canvas. Reachable any time from the HUD "?" and auto-opened
// once on first roam.

const SHARED_RIG = "/models/RobotExpressive.glb";
useGLTF.preload(SHARED_RIG);

// ── keycap tokens ──────────────────────────────────────────────────────
type Token =
  | { cap: string; wide?: boolean; accent?: boolean }
  | { sep: string }
  | { wasd: true };

type Pose = "walk" | "run" | "jump" | "fly" | "camera" | "interact" | "menu";
type Item = { icon: ReactNode; action: string; tip: string; keys: Token[]; pose: Pose };

const ic = 16;
const DESKTOP: Item[] = [
  { icon: <Move size={ic} />, action: "Move", tip: "or arrow keys", keys: [{ wasd: true }], pose: "walk" },
  { icon: <Zap size={ic} />, action: "Sprint", tip: "hold to super-run", keys: [{ cap: "Shift", wide: true }], pose: "run" },
  { icon: <ChevronsUp size={ic} />, action: "Jump", tip: "tap twice for jetpack", keys: [{ cap: "Space", wide: true }, { sep: "×2" }], pose: "jump" },
  { icon: <Plane size={ic} />, action: "Fly", tip: "hold to climb · X to land", keys: [{ cap: "Space", wide: true }, { sep: "·" }, { cap: "X" }], pose: "fly" },
  { icon: <Camera size={ic} />, action: "Camera", tip: "drag orbit · scroll zoom · Q recenters", keys: [{ cap: "Q" }], pose: "camera" },
  { icon: <Sparkles size={ic} />, action: "Interact", tip: "at gates & champions", keys: [{ cap: "E", accent: true }], pose: "interact" },
];

const TOUCH: Item[] = [
  { icon: <Move size={ic} />, action: "Move", tip: "drag the left side", keys: [{ cap: "◐", wide: true }], pose: "walk" },
  { icon: <Camera size={ic} />, action: "Look", tip: "drag right · pinch to zoom", keys: [{ cap: "◑", wide: true }], pose: "camera" },
  { icon: <Zap size={ic} />, action: "Sprint", tip: "hold while moving", keys: [{ cap: "⚡" }], pose: "run" },
  { icon: <ChevronsUp size={ic} />, action: "Jump", tip: "tap twice for jetpack", keys: [{ cap: "▲" }, { sep: "×2" }], pose: "jump" },
  { icon: <Plane size={ic} />, action: "Fly", tip: "hold to climb · tap LAND to drop", keys: [{ cap: "▲" }, { sep: "·" }, { cap: "LAND", wide: true }], pose: "fly" },
  { icon: <Sparkles size={ic} />, action: "Interact", tip: "near gates & objectives", keys: [{ cap: "●", accent: true }], pose: "interact" },
];

const GAMEPAD: Item[] = [
  { icon: <Move size={ic} />, action: "Move", tip: "left stick", keys: [{ cap: "L" }], pose: "walk" },
  { icon: <Camera size={ic} />, action: "Camera", tip: "right stick", keys: [{ cap: "R" }], pose: "camera" },
  { icon: <Zap size={ic} />, action: "Sprint", tip: "hold while moving", keys: [{ cap: "RB" }], pose: "run" },
  { icon: <ChevronsUp size={ic} />, action: "Jump", tip: "tap twice for jetpack", keys: [{ cap: "A" }, { sep: "×2" }], pose: "jump" },
  { icon: <Plane size={ic} />, action: "Fly", tip: "hold A to climb · B to land", keys: [{ cap: "A" }, { sep: "·" }, { cap: "B" }], pose: "fly" },
  { icon: <Sparkles size={ic} />, action: "Interact", tip: "at gates & champions", keys: [{ cap: "X", accent: true }], pose: "interact" },
  { icon: <Menu size={ic} />, action: "Pause", tip: "opens settings", keys: [{ cap: "Start", wide: true }], pose: "menu" },
];

// ── live pose art (real avatar) ─────────────────────────────────────────
// Which rig clip drives each control, plus per-pose framing extras.
type PoseCfg = {
  clip: "walk" | "run" | "jump" | "idle" | "standing" | "wave";
  timeScale?: number;
  /** jump / wave are one-shots in the rig — loop them so the tile keeps demoing */
  loopOverride?: boolean;
  /** jetpack + climb: raise the body by this fraction of its height and wear the pack */
  fly?: boolean;
  hover?: number;
  lean?: number;
  /** slowly turn the figure to demo camera orbit */
  orbit?: boolean;
  /** frame the clip lands on when reduced-motion freezes it */
  still: number;
};

const POSE_CFG: Record<Pose, PoseCfg> = {
  walk: { clip: "walk", still: 0.35 },
  run: { clip: "run", timeScale: 1.15, still: 0.25 },
  jump: { clip: "jump", loopOverride: true, timeScale: 0.95, still: 0.42 },
  fly: { clip: "idle", fly: true, hover: 0.5, lean: 0.16, still: 0.4 },
  camera: { clip: "standing", orbit: true, still: 0.3 },
  interact: { clip: "wave", loopOverride: true, timeScale: 0.85, still: 0.68 },
  menu: { clip: "standing", still: 0.3 },
};

const BASE_YAW = 0.5; // 3/4 hero angle

function CellCamera() {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  useFrame(() => {
    ref.current?.lookAt(0, 0.95, 0);
  });
  return <PerspectiveCamera ref={ref} makeDefault position={[1.15, 1.2, 6.7]} fov={30} near={0.1} far={60} />;
}

function StageRing({ force }: { force: CreatureType | null }) {
  const inner = force ? forceColors(force).primary : GOLD;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.98, 1.12, 56]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.85} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <ringGeometry args={[0.7, 0.82, 56]} />
        <meshBasicMaterial color={inner} transparent opacity={0.5} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function PoseFigure({ pose, force }: { pose: Pose; force: CreatureType | null }) {
  const { scene, animations } = useGLTF(SHARED_RIG);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const cfg = POSE_CFG[pose];
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(
    () => buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal),
    [scene, animations, pal],
  );

  const groupRef = useRef<THREE.Group>(null);
  const flyingRef = useRef<boolean>(!!cfg.fly);
  const burstRef = useRef(0);
  const yaw = useRef(BASE_YAW);
  const jetT = useRef(0);
  const framed = useRef(false);

  // dispose the cloned rig + materials when the tile unmounts
  useEffect(() => {
    return () => {
      built.mixer.stopAllAction();
      built.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    };
  }, [built]);

  // drive the clip that matches this control
  useEffect(() => {
    const a = built.actions[cfg.clip];
    if (!a) return;
    if (cfg.loopOverride) {
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = false;
    }
    a.reset().setEffectiveTimeScale(cfg.timeScale ?? 1).setEffectiveWeight(1).play();
    framed.current = false;
    return () => {
      a.stop();
    };
  }, [built, cfg]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    if (reduceMotion) {
      // freeze on a representative frame — no looping motion, no orbit, no jet puffs
      if (!framed.current) {
        built.mixer.update(cfg.still);
        applyBoneMorph(built.bones, built.boneBase, built.morph);
        framed.current = true;
      }
    } else {
      built.mixer.update(dt);
      applyBoneMorph(built.bones, built.boneBase, built.morph);
      if (cfg.orbit) yaw.current += dt * 0.7;
      if (cfg.fly) {
        jetT.current += dt;
        if (jetT.current > 0.055) {
          jetT.current = 0;
          burstRef.current++;
        }
      }
    }
    if (groupRef.current) groupRef.current.rotation.y = yaw.current;
  });

  const hover = cfg.fly && cfg.hover ? cfg.hover * built.h : 0;
  return (
    <group ref={groupRef}>
      <group position={[0, hover, 0]} rotation={[cfg.lean ?? 0, 0, 0]}>
        <primitive object={built.root} />
        {cfg.fly && <Jetpack h={built.h} flyingRef={flyingRef} burstRef={burstRef} />}
      </group>
      <StageRing force={force} />
    </group>
  );
}

function PoseTile({ pose, force }: { pose: Pose; force: CreatureType | null }) {
  const rim = force ? forceColors(force).primary : GOLD;
  return (
    <>
      <color attach="background" args={["#0b0916"]} />
      <CellCamera />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#b9a7ff", "#160f2c", 0.7]} />
      <directionalLight position={[4, 7, 5]} intensity={1.6} />
      <pointLight position={[-4, 2.5, -2]} intensity={26} color={rim} distance={20} />
      <pointLight position={[3, 1.2, 5]} intensity={14} color="#ffffff" distance={18} />
      <Suspense fallback={null}>
        <PoseFigure pose={pose} force={force} />
      </Suspense>
    </>
  );
}

function Cap({ children, wide, accent }: { children: ReactNode; wide?: boolean; accent?: boolean }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: wide ? 48 : 28,
        height: 28,
        padding: wide ? "0 9px" : "0 5px",
        fontSize: 11.5,
        fontWeight: 700,
        lineHeight: 1,
        color: accent ? "var(--gold)" : "var(--fg, var(--ink))",
        background: accent
          ? "color-mix(in srgb, var(--gold) 16%, var(--code-bg))"
          : "linear-gradient(180deg, var(--btn-bg-hover), var(--code-bg))",
        border: `1px solid ${accent ? "color-mix(in srgb, var(--gold) 55%, var(--line2))" : "var(--line2)"}`,
        borderRadius: 7,
        boxShadow: "0 2px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)",
      }}
    >
      {children}
    </span>
  );
}

function WasdCross() {
  const cell = (label: string) => <Cap>{label}</Cap>;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
      {cell("W")}
      <span style={{ display: "inline-flex", gap: 3 }}>
        {cell("A")}
        {cell("S")}
        {cell("D")}
      </span>
    </span>
  );
}

function Keys({ tokens }: { tokens: Token[] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
      {tokens.map((t, i) => {
        if ("wasd" in t) return <WasdCross key={i} />;
        if ("sep" in t)
          return (
            <span key={i} className="mono" style={{ fontSize: 10.5, color: "var(--muted2)", letterSpacing: 0.5 }}>
              {t.sep}
            </span>
          );
        return (
          <Cap key={i} wide={t.wide} accent={t.accent}>
            {t.cap}
          </Cap>
        );
      })}
    </span>
  );
}

export function ControlsGuide({
  open,
  onClose,
  isTouch,
  hasPad,
  force = null,
}: {
  open: boolean;
  onClose: () => void;
  isTouch: boolean;
  hasPad?: boolean;
  /** the Trainer's pledged Clan — tints the avatar's trim/glow to match the world */
  force?: CreatureType | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const items = hasPad ? GAMEPAD : isTouch ? TOUCH : DESKTOP;
  const platform = hasPad
    ? { icon: <Gamepad2 size={12} />, label: "Gamepad" }
    : isTouch
      ? { icon: <Hand size={12} />, label: "Touch" }
      : { icon: <MousePointer2 size={12} />, label: "Keyboard + mouse" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Controls"
      onPointerDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(5,3,9,.62)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="panel"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          padding: "20px 22px 22px",
          position: "relative",
          animation: "controlsRise .35s ease both",
        }}
      >
        <style>{`
          @keyframes controlsRise { from { opacity:0; transform: translateY(10px) scale(.99);} to { opacity:1; transform:none;} }
          @media (prefers-reduced-motion: reduce){ .panel { animation: none !important; } }
        `}</style>
        <button
          onClick={onClose}
          aria-label="Close controls"
          style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, zIndex: 2 }}
        >
          <X size={18} />
        </button>

        <div className="mono" style={{ fontSize: 10, letterSpacing: 3, color: "var(--gold)" }}>HOW TO PLAY</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Controls</span>
          <span
            className="mono"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", border: "1px solid var(--line2)", borderRadius: 999, padding: "3px 9px" }}
          >
            {platform.icon}
            {platform.label}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {items.map((it, i) => (
            <div
              key={it.action}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--hover)",
                overflow: "hidden",
              }}
            >
              {/* live avatar cell (rendered by the shared canvas below) */}
              <View
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderBottom: "1px solid var(--line)",
                  background: "#0b0916",
                }}
              >
                <PoseTile pose={it.pose} force={force} />
              </View>
              {/* caption strip */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "11px 12px 13px", alignItems: "center", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", opacity: 0.8 }}>{i + 1}</span>
                  <span style={{ color: "var(--gold)", display: "inline-flex" }}>{it.icon}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: 0.2 }}>{it.action}</span>
                </div>
                <Keys tokens={it.keys} />
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.3 }}>{it.tip}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* One shared WebGL context paints every tile above (scissor-tiled) — a single
          integrated diorama, not a context per cell over the live world. */}
      <Canvas
        onPointerDown={(e) => e.stopPropagation()}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        dpr={typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : [1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "default", failIfMajorPerformanceCaveat: false }}
        style={{ position: "fixed", inset: 0, zIndex: 131, pointerEvents: "none" }}
      >
        <View.Port />
      </Canvas>
    </div>
  );
}
