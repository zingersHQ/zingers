"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

// A complete, platform-aware controls reference. Reachable any time from the HUD
// "?" button and auto-opened once when a player first reaches free roam, so the
// full move/sprint/jump/fly/camera/interact set is always discoverable — the old
// HUD hint only ever showed a partial "WASD · double-jump to fly · E" line and
// never mentioned sprint, land/cancel-fly, or camera recenter, and the touch
// build taught nothing at all.

type Row = { action: string; how: string };

const DESKTOP: Row[] = [
  { action: "Move", how: "WASD / Arrow keys" },
  { action: "Sprint", how: "Hold Shift — keep it up to break into a super-run" },
  { action: "Jump", how: "Space — tap again in the air to deploy your jetpack" },
  { action: "Fly", how: "Hold Space to climb · release to glide down · X to land" },
  { action: "Camera", how: "Drag to orbit · scroll to zoom · Q to recenter behind you" },
  { action: "Interact", how: "E near glowing gates, champions and objectives" },
];

const TOUCH: Row[] = [
  { action: "Move", how: "Left thumb — drag anywhere on the left to steer" },
  { action: "Look", how: "Drag on the right side · pinch to zoom" },
  { action: "Sprint", how: "⚡ button — hold while moving to super-run" },
  { action: "Jump", how: "▲ button — tap twice to deploy your jetpack" },
  { action: "Fly", how: "Hold ▲ to climb · release to glide · tap LAND to drop" },
  { action: "Interact", how: "Tap the gold action button near gates & objectives" },
];

const GAMEPAD: Row[] = [
  { action: "Move", how: "Left stick" },
  { action: "Camera", how: "Right stick · assist eases you back behind" },
  { action: "Sprint", how: "Hold RB (or LT) while moving to super-run" },
  { action: "Jump", how: "A — tap again in the air to deploy your jetpack" },
  { action: "Fly", how: "Hold A to climb · release to glide · B to land" },
  { action: "Interact", how: "X near glowing gates, champions and objectives" },
  { action: "Pause", how: "Start — opens settings" },
];

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
  const rows = hasPad ? GAMEPAD : isTouch ? TOUCH : DESKTOP;

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
          width: "min(440px, 100%)",
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
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, marginBottom: 14 }}>Controls</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.action} style={{ display: "grid", gridTemplateColumns: "84px 1fr", gap: 12, alignItems: "baseline" }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--fg)" }}>{r.action.toUpperCase()}</span>
              <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{r.how}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
