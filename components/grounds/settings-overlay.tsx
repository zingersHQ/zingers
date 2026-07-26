"use client";
import { useEffect } from "react";
import { X, Gamepad2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/store/settings";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import { applyLocale } from "@/lib/i18n/apply-locale";

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
  const t = useTranslations("settings");

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
      aria-label={t("aria")}
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
          aria-label={t("close")}
          style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
        >
          <X size={18} />
        </button>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 3, color: "var(--gold)" }}>{t("paused")}</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, marginBottom: 6 }}>{t("title")}</div>

        <Section>{t("audio")}</Section>
        <Slider label={t("volume")} value={s.volume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => s.set({ volume: v })} />
        <Toggle label={t("voices")} hint={t("voicesHint")} on={s.voice} onChange={(v) => s.set({ voice: v })} />

        <Divider />
        <Section>{t("camera")}</Section>
        <Slider label={t("lookSensitivity")} value={s.camSensitivity} min={0.4} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => s.set({ camSensitivity: v })} />
        <Toggle label={t("invertY")} on={s.invertY} onChange={(v) => s.set({ invertY: v })} />
        <Toggle label={t("camAssist")} hint={t("camAssistHint")} on={s.camAssist} onChange={(v) => s.set({ camAssist: v })} />

        <Divider />
        <Section>{t("comfort")}</Section>
        <Toggle label={t("reducedMotion")} hint={t("reducedMotionHint")} on={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
        <Toggle label={t("alwaysHud")} hint={t("alwaysHudHint")} on={s.alwaysShowHud} onChange={(v) => s.set({ alwaysShowHud: v })} />

        <Divider />
        <Section>{t("language")}</Section>
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 0 10px" }}>{t("languageHint")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {LOCALES.map((code) => {
            const on = s.locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => applyLocale(code)}
                aria-pressed={on}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: on ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,.14)",
                  background: on ? "rgba(255,200,80,.12)" : "transparent",
                  color: "var(--fg)",
                  cursor: "pointer",
                  fontWeight: on ? 700 : 500,
                  fontSize: 13,
                }}
              >
                {LOCALE_LABELS[code]}
              </button>
            );
          })}
        </div>

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
            <Gamepad2 size={16} /> {t("controls")}
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
            {t("resume")}
          </button>
        </div>
        {hasPad && (
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted2)", marginTop: 12, textAlign: "center" }}>
            {t("padConnected")}
          </div>
        )}
      </div>
    </div>
  );
}
