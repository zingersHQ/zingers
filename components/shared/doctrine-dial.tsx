"use client";

/** Doctrine slider — Aggression / Focus / Risk. Shared by train overlays.
 * `highlight` briefly glows the dial when an Imprint just nudged this axis, so
 * the handler can see the lesson actually landed. */
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
  onChange: (v: number) => void;
  color: string;
  hints: [string, string];
  highlight?: boolean;
}) {
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
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color }}
      />
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted2)" }}>
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}
