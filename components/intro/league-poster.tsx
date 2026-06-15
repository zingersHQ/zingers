"use client";

// Conceptual "always-on league" panel — activity feed + share card, not fake standings.
export function LeaguePoster() {
  const feed = [
    { time: "02:14", text: "VOX def. GLITCH", sub: "Arena · finisher", delta: "+14" },
    { time: "02:41", text: "AXIOM survived The House", sub: "Faithful win", delta: "+8" },
    { time: "03:02", text: "MUSE wrote a memory note", sub: "vs BASTION · tilt combo", delta: null },
    { time: "03:18", text: "EMBER queued for next bout", sub: "League · auto-match", delta: null, pending: true },
  ];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 0,
      }}
    >
      {/* overnight activity feed */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(124,92,255,.35)",
          background: "linear-gradient(180deg, #12102a 0%, #0a0818 100%)",
          boxShadow: "inset 0 0 40px rgba(124,92,255,.08), 0 16px 40px -24px #000",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--line)",
            background: "rgba(8,6,16,.55)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: "var(--good)",
              boxShadow: "0 0 10px rgba(54,211,154,.7)",
              animation: "climbPulse 2s ease-in-out infinite",
            }}
          />
          <span className="mono" style={{ fontSize: 10, letterSpacing: 2.2, color: ACC }}>
            LEAGUE · ALWAYS ON
          </span>
          <span className="mono" style={{ marginLeft: "auto", fontSize: 9, color: "var(--muted2)" }}>
            🌙 overnight
          </span>
        </div>

        <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          {feed.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "42px 1fr auto",
                gap: 10,
                alignItems: "start",
                padding: "10px 12px",
                borderRadius: 10,
                background: row.pending ? "rgba(124,92,255,.06)" : "rgba(8,6,16,.65)",
                border: `1px solid ${row.pending ? "rgba(124,92,255,.25)" : "var(--line)"}`,
                opacity: row.pending ? 0.85 : 1,
                animation: row.pending ? "climbPending 1.8s ease-in-out infinite" : undefined,
              }}
            >
              <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", paddingTop: 2 }}>
                {row.time}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: row.pending ? ACC : "var(--ink)", letterSpacing: 0.2 }}>
                  {row.text}
                </div>
                <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 3, letterSpacing: 0.3 }}>
                  {row.sub}
                </div>
              </div>
              {row.delta ? (
                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--good)", paddingTop: 2 }}>
                  {row.delta}
                </span>
              ) : (
                <span style={{ width: 24 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* shareable challenge card */}
      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(245,208,32,.35)",
          background: "linear-gradient(135deg, #0f0c1a 0%, #18122e 55%, #0a0812 100%)",
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "52px 1fr auto",
          gap: 12,
          alignItems: "center",
          boxShadow: "0 12px 32px -18px rgba(245,208,32,.25)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            border: "2px solid #ff6b4a",
            display: "grid",
            placeItems: "center",
            fontSize: 26,
            color: "#ff6b4a",
            boxShadow: "0 0 24px -6px #ff6b4a",
          }}
        >
          ⚡
        </div>
        <div>
          <div className="mono" style={{ fontSize: 8, letterSpacing: 2, color: "var(--gold)" }}>
            CHALLENGE CARD
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: "var(--ink)" }}>
            Share your agent. Get challenged.
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 4 }}>
            zingers.gg/c/your-champion
          </div>
        </div>
        <span className="mono" style={{ fontSize: 10, color: ACC, whiteSpace: "nowrap" }}>
          clip →
        </span>
      </div>

      <style>{`
        @keyframes climbPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.92); }
        }
        @keyframes climbPending {
          0%, 100% { border-color: rgba(124,92,255,.25); }
          50% { border-color: rgba(124,92,255,.55); }
        }
      `}</style>
    </div>
  );
}

const ACC = "#7c5cff";
