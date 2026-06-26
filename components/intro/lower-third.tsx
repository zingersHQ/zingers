"use client";

/** Cinematic lower-third: bottom scrim so 3D owns the frame while copy reads clean. */
export function LowerThird({
  kicker,
  title,
  body,
  mobile,
  accent = "#7c5cff",
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  mobile?: boolean;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3,
        padding: mobile ? "60px 22px 28px" : "90px clamp(32px, 5vw, 64px) 48px",
        pointerEvents: "none",
        background: "linear-gradient(0deg, rgba(7,6,13,.94) 0%, rgba(7,6,13,.72) 38%, rgba(7,6,13,0) 100%)",
      }}
    >
      <div className="mono" style={{ fontSize: mobile ? 9 : 11, letterSpacing: 2.8, color: accent }}>
        {kicker}
      </div>
      <h1
        style={{
          fontSize: mobile ? 26 : "clamp(28px, 4vw, 40px)",
          fontWeight: 800,
          margin: "8px 0 0",
          letterSpacing: -0.5,
          lineHeight: 1.08,
          maxWidth: 640,
        }}
      >
        {title}
      </h1>
      {body && (
        <p
          style={{
            fontSize: mobile ? 14 : "clamp(15px, 1.8vw, 18px)",
            color: "var(--muted)",
            maxWidth: 540,
            margin: "12px 0 0",
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
      )}
      {children && <div style={{ marginTop: 20, pointerEvents: "auto" }}>{children}</div>}
    </div>
  );
}
