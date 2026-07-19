"use client";

/** Strategy / temperament axis.
 * Editable when `onChange` is passed (first-duel seed only) — real range input.
 * Otherwise a status meter: Imprints and bouts move these; the Trainer never drags.
 * `highlight` briefly glows when an Imprint just nudged this axis. */

function leanLabel(value: number, hints: [string, string]): string {
  if (value <= 32) return hints[0];
  if (value >= 68) return hints[1];
  return "Balanced";
}

export function DoctrineDial({
  label,
  value,
  onChange,
  color,
  hints,
  highlight = false,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  color: string;
  hints: [string, string];
  highlight?: boolean;
}) {
  const editable = typeof onChange === "function";
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const lean = leanLabel(v, hints);

  if (editable) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span className="mono" style={{ color }}>
            {v}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: color, cursor: "pointer" }}
        />
        <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted2)" }}>
          <span>{hints[0]}</span>
          <span>{hints[1]}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={highlight ? "doctrine-meter is-lit" : "doctrine-meter"}
      role="meter"
      aria-label={`${label}: ${lean}, ${v} of 100`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-valuetext={`${lean} · ${v}`}
      style={{
        marginBottom: 14,
        padding: "10px 12px 11px",
        borderRadius: 12,
        border: `1px solid ${highlight ? color : "var(--line)"}`,
        background: highlight
          ? `color-mix(in srgb, ${color} 14%, var(--panel2, #15131f))`
          : "color-mix(in srgb, var(--panel2, #15131f) 70%, transparent)",
        transition: "border-color .4s ease, background .4s ease, box-shadow .4s ease",
        boxShadow: highlight ? `0 0 22px -6px ${color}` : "none",
        ["--meter" as string]: color,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 0.2 }}>{label}</div>
          <div className="mono" style={{ fontSize: 10, color: highlight ? color : "var(--muted)", marginTop: 2, fontWeight: 600 }}>
            {lean}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {v}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background: "color-mix(in srgb, var(--line2) 85%, #000)",
          overflow: "hidden",
        }}
      >
        {/* soft ticks */}
        {[25, 50, 75].map((t) => (
          <span
            key={t}
            aria-hidden
            style={{
              position: "absolute",
              left: `${t}%`,
              top: 1,
              bottom: 1,
              width: 1,
              background: "rgba(255,255,255,.12)",
              transform: "translateX(-50%)",
            }}
          />
        ))}
        <div
          className="doctrine-meter__fill"
          style={{
            height: "100%",
            width: `${v}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, #1a1520), ${color})`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.22), 0 0 12px -2px ${color}`,
            transition: "width .55s cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </div>

      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted2)", marginTop: 7, letterSpacing: 0.3 }}>
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .doctrine-meter.is-lit .doctrine-meter__fill {
            animation: doctrinePulse 1.1s ease-in-out 2;
          }
        }
        @keyframes doctrinePulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.25); }
        }
      `}</style>
    </div>
  );
}
