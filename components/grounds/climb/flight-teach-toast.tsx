"use client";
// Shared Flight coach toast — hazard / gold / Gate Trial / +Crowns flash.
export function FlightTeachToast({
  message,
  accent = "#f5d020",
}: {
  message: string | null;
  accent?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mono"
      style={{
        position: "absolute",
        left: "50%",
        bottom: "22%",
        transform: "translateX(-50%)",
        zIndex: 28,
        pointerEvents: "none",
        maxWidth: "min(320px, 86vw)",
        padding: "10px 14px",
        borderRadius: 12,
        border: `1px solid ${accent}`,
        background: "rgba(8,7,14,.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "#f2eefb",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        textAlign: "center",
        lineHeight: 1.35,
        boxShadow: `0 8px 28px -10px ${accent}88`,
      }}
    >
      {message}
    </div>
  );
}
