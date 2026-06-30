"use client";

/** Reader vs champion split — 2D glyph for onboarding (no 3D Handler mount during pick). */
export function ReaderSplitBadge({ championName, forceColor, compact = false }: { championName: string; forceColor: string; compact?: boolean }) {
  const gold = "#f5d020";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: compact ? 8 : 10,
        padding: compact ? "8px 10px" : "10px 12px",
        borderRadius: 12,
        background: "var(--panel2)",
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: compact ? 52 : 64 }}>
        <div
          aria-hidden
          style={{
            width: compact ? 40 : 48,
            height: compact ? 40 : 48,
            borderRadius: "22%",
            background: "linear-gradient(160deg, #e8eaf4 0%, #b8bcc8 55%, #9ca0ae 100%)",
            border: `2px solid ${gold}`,
            boxShadow: `0 0 12px -4px ${gold}`,
            position: "relative",
            display: "grid",
            placeItems: "center",
          }}
        >
          <span style={{ fontSize: compact ? 14 : 16, opacity: 0.85 }}>◈</span>
          <span
            style={{
              position: "absolute",
              bottom: -4,
              left: "50%",
              transform: "translateX(-50%)",
              width: compact ? 28 : 32,
              height: 4,
              borderRadius: 99,
              background: gold,
              opacity: 0.75,
            }}
          />
        </div>
        <span className="mono" style={{ fontSize: 8, letterSpacing: 1, color: gold, textAlign: "center" }}>
          READER
          <br />
          (you)
        </span>
      </div>
      <div style={{ width: 1, background: "var(--line2)", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, minWidth: 0 }}>
        <span className="mono" style={{ fontSize: 8, letterSpacing: 1, color: forceColor }}>
          CHAMPION
        </span>
        <span style={{ fontWeight: 700, fontSize: compact ? 13 : 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {championName}
        </span>
        <span className="mono" style={{ fontSize: 8, letterSpacing: 0.5, color: "var(--muted2)" }}>
          raises &amp; fights
        </span>
      </div>
    </div>
  );
}
