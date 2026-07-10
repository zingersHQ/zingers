"use client";
import { useEffect, type ReactNode } from "react";
import { X, Move, Zap, ChevronsUp, Plane, Camera, Sparkles, MousePointer2, Gamepad2, Hand, Menu } from "lucide-react";

// A complete, platform-aware controls reference, drawn as a COMIC STRIP: each
// control is a panel showing the champion posed for that action (walk, run,
// jump, jetpack-fly, camera orbit, interact) above its keycaps and a one-line
// cue. Reachable any time from the HUD "?" and auto-opened once on first roam.
// The poses are static hand-built SVG (no extra WebGL contexts over the live
// world canvas, and nothing to animate) — read-at-a-glance and cheap.

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

// ── comic-strip pose art ────────────────────────────────────────────────
const GOLD = "#f5d020";

// Shared robot torso + head; each pose supplies its own limbs/extras as children
// (drawn first, so they sit behind the body).
function Fig({ tilt = 0, ox = 0, oy = 0, s = 1, children }: { tilt?: number; ox?: number; oy?: number; s?: number; children?: ReactNode }) {
  return (
    <g transform={`translate(${ox} ${oy}) rotate(${tilt} 60 62) scale(${s})`}>
      <g stroke="var(--ink)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
      <rect x={51} y={40} width={18} height={34} rx={7} fill="var(--code-bg)" stroke="var(--ink)" strokeWidth={5} />
      <rect x={48} y={15} width={24} height={21} rx={9} fill="var(--code-bg)" stroke="var(--ink)" strokeWidth={5} />
      <circle cx={60} cy={26} r={2.8} fill={GOLD} />
    </g>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden preserveAspectRatio="xMidYMid meet">
      {children}
    </svg>
  );
}

function PoseArt({ pose }: { pose: Pose }) {
  const ground = <line x1={26} y1={108} x2={94} y2={108} stroke="var(--line2)" strokeWidth={3} strokeLinecap="round" />;
  const speed = (x: number) => (
    <g stroke={GOLD} strokeWidth={3} strokeLinecap="round" opacity={0.7}>
      <line x1={x} y1={44} x2={x - 14} y2={44} />
      <line x1={x - 2} y1={58} x2={x - 18} y2={58} />
      <line x1={x} y1={72} x2={x - 13} y2={72} />
    </g>
  );
  switch (pose) {
    case "walk":
      return (
        <Panel>
          {ground}
          <Fig>
            <path d="M53 45 L45 61" />
            <path d="M67 45 L75 59" />
            <path d="M56 73 L49 104" />
            <path d="M64 73 L73 100" />
          </Fig>
        </Panel>
      );
    case "run":
      return (
        <Panel>
          {ground}
          {speed(44)}
          <Fig tilt={-15} ox={4}>
            <path d="M53 45 L64 53" />
            <path d="M67 45 L58 61" />
            <path d="M56 73 L45 98" />
            <path d="M64 73 L80 92" />
          </Fig>
        </Panel>
      );
    case "jump":
      return (
        <Panel>
          <path d="M30 96 Q60 40 90 96" stroke={GOLD} strokeWidth={2.5} strokeDasharray="3 6" fill="none" opacity={0.75} />
          <ellipse cx={60} cy={110} rx={18} ry={4} fill="var(--line2)" opacity={0.6} />
          <Fig oy={-16}>
            <path d="M53 45 L46 27" />
            <path d="M67 45 L74 27" />
            <path d="M56 74 L51 90 L60 95" />
            <path d="M64 74 L69 90 L60 95" />
          </Fig>
        </Panel>
      );
    case "fly":
      return (
        <Panel>
          <g stroke="var(--line2)" strokeWidth={3} strokeLinecap="round" opacity={0.55}>
            <line x1={40} y1={102} x2={48} y2={102} />
            <line x1={72} y1={102} x2={80} y2={102} />
          </g>
          <Fig tilt={10} oy={-6}>
            <path d="M53 47 L39 43" />
            <path d="M67 47 L81 43" />
            <path d="M57 74 L57 96" />
            <path d="M63 74 L63 96" />
          </Fig>
          {/* jet flames */}
          <g>
            <path d="M52 94 L57 96 L57 112 Z" fill="#ff7a1a" opacity={0.9} />
            <path d="M63 96 L68 94 L63 112 Z" fill="#ff7a1a" opacity={0.9} />
            <path d="M55 96 L60 96 L57.5 106 Z" fill={GOLD} />
          </g>
        </Panel>
      );
    case "camera":
      return (
        <Panel>
          {/* orbit arrows around a camera body */}
          <g stroke={GOLD} strokeWidth={3} fill="none" opacity={0.8} strokeLinecap="round">
            <path d="M28 60 A32 20 0 0 1 92 60" strokeDasharray="4 6" />
            <path d="M92 60 A32 20 0 0 1 28 60" strokeDasharray="4 6" />
            <path d="M88 52 L92 60 L84 61" />
            <path d="M32 68 L28 60 L36 59" />
          </g>
          <g stroke="var(--ink)" strokeWidth={5} strokeLinejoin="round" fill="var(--code-bg)">
            <rect x={40} y={50} width={30} height={22} rx={4} />
            <path d="M70 56 L82 50 L82 72 L70 66 Z" />
          </g>
          <circle cx={53} cy={61} r={5.5} fill="none" stroke={GOLD} strokeWidth={4} />
        </Panel>
      );
    case "interact": {
      const mini = (ox: number, flip: boolean) => (
        <g transform={`translate(${ox} 0) ${flip ? "scale(-1 1) translate(-120 0)" : ""}`} stroke="var(--ink)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="var(--code-bg)">
          <rect x={44} y={52} width={16} height={26} rx={6} />
          <rect x={43} y={34} width={18} height={16} rx={7} />
          <path d="M60 60 L70 58" fill="none" />
        </g>
      );
      return (
        <Panel>
          {ground}
          {mini(-14, false)}
          {mini(14, true)}
          {/* interaction spark */}
          <g transform="translate(60 56)">
            <path d="M0 -11 L3 -3 L11 0 L3 3 L0 11 L-3 3 L-11 0 L-3 -3 Z" fill={GOLD} />
            <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight={800} fill="#141018" fontFamily="var(--font-mono, monospace)">E</text>
          </g>
        </Panel>
      );
    }
    case "menu":
      return (
        <Panel>
          <Fig ox={-16} s={0.9}>
            <path d="M53 46 L45 62" />
            <path d="M67 46 L75 62" />
            <path d="M56 73 L52 100" />
            <path d="M64 73 L68 100" />
          </Fig>
          {/* floating menu panel */}
          <g transform="translate(70 40)">
            <rect x={0} y={0} width={34} height={44} rx={6} fill="var(--code-bg)" stroke="var(--ink)" strokeWidth={4} />
            <line x1={7} y1={12} x2={27} y2={12} stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" />
            <line x1={7} y1={22} x2={27} y2={22} stroke="var(--muted)" strokeWidth={3.5} strokeLinecap="round" />
            <line x1={7} y1={32} x2={20} y2={32} stroke="var(--muted)" strokeWidth={3.5} strokeLinecap="round" />
          </g>
        </Panel>
      );
    default:
      return <Panel>{null}</Panel>;
  }
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

export function ControlsGuide({ open, onClose, isTouch, hasPad }: { open: boolean; onClose: () => void; isTouch: boolean; hasPad?: boolean }) {
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
          width: "min(700px, 100%)",
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
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
              {/* comic cell */}
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderBottom: "1px solid var(--line)",
                  background: "radial-gradient(120% 90% at 50% 8%, color-mix(in srgb, var(--gold) 7%, var(--code-bg)), var(--code-bg))",
                }}
              >
                <span className="mono" style={{ position: "absolute", top: 6, left: 8, fontSize: 9, color: "var(--muted2)", opacity: 0.8 }}>{i + 1}</span>
                <PoseArt pose={it.pose} />
              </div>
              {/* caption strip */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "11px 12px 13px", alignItems: "center", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
    </div>
  );
}
