"use client";

/** Doctrine slider — Aggression / Focus / Risk. Shared by train overlays. */
export function DoctrineDial({
  label,
  value,
  onChange,
  color,
  hints,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  hints: [string, string];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
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
