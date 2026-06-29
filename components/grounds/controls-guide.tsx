"use client";
import { useEffect, type ReactNode } from "react";
import { X, Move, Zap, ChevronsUp, Plane, Camera, Sparkles, MousePointer2, Gamepad2, Hand, Menu } from "lucide-react";

// A complete, platform-aware controls reference. Reachable any time from the HUD
// "?" button and auto-opened once when a player first reaches free roam. Built to
// be *read at a glance*: each control is a tile with an icon, the actual keycaps
// (or on-screen / pad buttons) rendered as physical keys, and a single short cue
// — no paragraphs to wade through while you're trying to start moving.

// ── keycap tokens ──────────────────────────────────────────────────────
// A token is either a physical key/button to draw as a cap, a small connector
// glyph between caps ("+", "×2", "then"…), or the special WASD cross diagram.
type Token =
  | { cap: string; wide?: boolean; accent?: boolean }
  | { sep: string }
  | { wasd: true };

type Item = { icon: ReactNode; action: string; tip: string; keys: Token[] };

const ic = 17;
const DESKTOP: Item[] = [
  { icon: <Move size={ic} />, action: "Move", tip: "or arrow keys", keys: [{ wasd: true }] },
  { icon: <Zap size={ic} />, action: "Sprint", tip: "hold to super-run", keys: [{ cap: "Shift", wide: true }] },
  { icon: <ChevronsUp size={ic} />, action: "Jump", tip: "tap twice for jetpack", keys: [{ cap: "Space", wide: true }, { sep: "×2" }] },
  { icon: <Plane size={ic} />, action: "Fly", tip: "hold to climb · X to land", keys: [{ cap: "Space", wide: true }, { sep: "·" }, { cap: "X" }] },
  { icon: <Camera size={ic} />, action: "Camera", tip: "drag orbit · scroll zoom · Q recenters", keys: [{ cap: "Q" }] },
  { icon: <Sparkles size={ic} />, action: "Interact", tip: "at gates & champions", keys: [{ cap: "E", accent: true }] },
];

const TOUCH: Item[] = [
  { icon: <Move size={ic} />, action: "Move", tip: "drag the left side", keys: [{ cap: "◐", wide: true }] },
  { icon: <Camera size={ic} />, action: "Look", tip: "drag right · pinch to zoom", keys: [{ cap: "◑", wide: true }] },
  { icon: <Zap size={ic} />, action: "Sprint", tip: "hold while moving", keys: [{ cap: "⚡" }] },
  { icon: <ChevronsUp size={ic} />, action: "Jump", tip: "tap twice for jetpack", keys: [{ cap: "▲" }, { sep: "×2" }] },
  { icon: <Plane size={ic} />, action: "Fly", tip: "hold to climb · tap LAND to drop", keys: [{ cap: "▲" }, { sep: "·" }, { cap: "LAND", wide: true }] },
  { icon: <Sparkles size={ic} />, action: "Interact", tip: "near gates & objectives", keys: [{ cap: "●", accent: true }] },
];

const GAMEPAD: Item[] = [
  { icon: <Move size={ic} />, action: "Move", tip: "left stick", keys: [{ cap: "L" }] },
  { icon: <Camera size={ic} />, action: "Camera", tip: "right stick", keys: [{ cap: "R" }] },
  { icon: <Zap size={ic} />, action: "Sprint", tip: "hold while moving", keys: [{ cap: "RB" }] },
  { icon: <ChevronsUp size={ic} />, action: "Jump", tip: "tap twice for jetpack", keys: [{ cap: "A" }, { sep: "×2" }] },
  { icon: <Plane size={ic} />, action: "Fly", tip: "hold A to climb · B to land", keys: [{ cap: "A" }, { sep: "·" }, { cap: "B" }] },
  { icon: <Sparkles size={ic} />, action: "Interact", tip: "at gates & champions", keys: [{ cap: "X", accent: true }] },
  { icon: <Menu size={ic} />, action: "Pause", tip: "opens settings", keys: [{ cap: "Start", wide: true }] },
];

function Cap({ children, wide, accent }: { children: ReactNode; wide?: boolean; accent?: boolean }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: wide ? 52 : 30,
        height: 30,
        padding: wide ? "0 10px" : "0 6px",
        fontSize: 12,
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {tokens.map((t, i) => {
        if ("wasd" in t) return <WasdCross key={i} />;
        if ("sep" in t)
          return (
            <span key={i} className="mono" style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: 0.5 }}>
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
          width: "min(560px, 100%)",
          padding: "20px 22px 22px",
          position: "relative",
          animation: "controlsRise .35s ease both",
        }}
      >
        <style>{`@keyframes controlsRise { from { opacity:0; transform: translateY(10px) scale(.99);} to { opacity:1; transform:none;} }`}</style>
        <button
          onClick={onClose}
          aria-label="Close controls"
          style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {items.map((it) => (
            <div
              key={it.action}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "13px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--hover)",
                minHeight: 110,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, color: "var(--gold)", background: "color-mix(in srgb, var(--gold) 10%, transparent)", flexShrink: 0 }}>
                  {it.icon}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.2 }}>{it.action}</span>
              </div>
              <div style={{ marginTop: "auto" }}>
                <Keys tokens={it.keys} />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.3 }}>{it.tip}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
