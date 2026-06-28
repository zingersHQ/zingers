"use client";
import { useEffect } from "react";
import { X, Gamepad2 } from "lucide-react";
import { useSettings } from "@/store/settings";

// Pause / Settings overlay. Opens from the HUD gear, the Esc key, or Start on a
// gamepad. Groups the knobs a player actually reaches for: one master volume,
// camera feel (sensitivity / invert / assist), and comfort (reduced motion,
// always-show HUD). Persisted via the settings store; changes apply live.

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
        width: "100%",
        background: "transparent",
        border: "none",
        padding: "8px 0",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span>
        <span style={{ fontSize: 14, color: "var(--fg)", fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{hint}</span>}
      </span>
      <span
        aria-hidden
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          background: on ? "linear-gradient(90deg,#39e0ff,#7a5cff)" : "rgba(255,255,255,.14)",
          position: "relative",
          transition: "background .18s ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .18s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,.4)",
          }}
        />
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "block", padding: "8px 0" }}>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: 14, color: "var(--fg)", fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#7a5cff", cursor: "pointer" }}
      />
    </label>
  );
}

const Divider = () => <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "6px 0" }} />;
const Section = ({ children }: { children: string }) => (
  <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)", marginTop: 10, marginBottom: 2 }}>{children}</div>
);

export function SettingsOverlay({
  open,
  onClose,
  onOpenControls,
  hasPad,
}: {
  open: boolean;
  onClose: () => void;
  onOpenControls: () => void;
  hasPad: boolean;
}) {
  const s = useSettings();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onPointerDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 140,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(5,3,9,.66)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="panel"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, 100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "20px 22px 22px",
          position: "relative",
          animation: "controlsRise .35s ease both",
        }}
      >
        <style>{`@keyframes controlsRise { from { opacity:0; transform: translateY(10px) scale(.99);} to { opacity:1; transform:none;} }`}</style>
        <button
          onClick={onClose}
          aria-label="Close settings"
          style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
        >
          <X size={18} />
        </button>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 3, color: "var(--gold)" }}>PAUSED</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, marginBottom: 6 }}>Settings</div>

        <Section>AUDIO</Section>
        <Slider label="Volume" value={s.volume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => s.set({ volume: v })} />
        <Toggle label="Champion voices" hint="Synth chirps when minds speak" on={s.voice} onChange={(v) => s.set({ voice: v })} />

        <Divider />
        <Section>CAMERA</Section>
        <Slider label="Look sensitivity" value={s.camSensitivity} min={0.4} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => s.set({ camSensitivity: v })} />
        <Toggle label="Invert vertical look" on={s.invertY} onChange={(v) => s.set({ invertY: v })} />
        <Toggle label="Camera assist" hint="Eases the camera back behind you as you move" on={s.camAssist} onChange={(v) => s.set({ camAssist: v })} />

        <Divider />
        <Section>COMFORT</Section>
        <Toggle label="Reduced motion" hint="Calms camera punch, sway and flourishes" on={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
        <Toggle label="Always show HUD" hint="Never dim the HUD when idle" on={s.alwaysShowHud} onChange={(v) => s.set({ alwaysShowHud: v })} />

        <Divider />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              onClose();
              onOpenControls();
            }}
            className="panel"
            style={{ flex: 1, minWidth: 140, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: 13 }}
          >
            <Gamepad2 size={16} /> Controls
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              color: "#0a0712",
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(90deg,#39e0ff,#7a5cff)",
            }}
          >
            Resume
          </button>
        </div>
        {hasPad && (
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted2)", marginTop: 12, textAlign: "center" }}>
            CONTROLLER CONNECTED · START TO TOGGLE
          </div>
        )}
      </div>
    </div>
  );
}
