"use client";

/** Strategy dial — Aggression / Focus / Risk.
 * Editable when `onChange` is passed (first-duel seed only). Otherwise a
 * readout: Imprints and bouts move these values; the handler does not drag them.
 * `highlight` briefly glows when an Imprint just nudged this axis. */
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
  return (
    <div
      style={{
        marginBottom: 14,
        borderRadius: 10,
        transition: "box-shadow .45s ease, background .45s ease",
        boxShadow: highlight ? `0 0 0 1px ${color}, 0 0 18px -3px ${color}` : "0 0 0 0 transparent",
        background: highlight ? `color-mix(in srgb, ${color} 12%, transparent)` : "transparent",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={!editable}
        onChange={editable ? (e) => onChange(Number(e.target.value)) : undefined}
        aria-readonly={!editable}
        style={{
          width: "100%",
          accentColor: color,
          cursor: editable ? "pointer" : "default",
          opacity: editable ? 1 : 0.85,
        }}
      />
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted2)" }}>
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}
