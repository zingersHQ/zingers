// Shareable agent card — a real OG image so champion links unfurl with a
// gorgeous card in chats/socials. Evolved stats are passed via query params
// (career lives client-side), so a share link is a snapshot of the agent.
import { ImageResponse } from "next/og";
import { ROSTER, TYPE_COLOR } from "@/lib/engine/roster";
import { EMBLEM } from "@/lib/evolve/progression";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const k = key.toUpperCase();
  const c = ROSTER[k];
  if (!c) return new Response("unknown", { status: 404 });
  const q = new URL(req.url).searchParams;
  const rating = q.get("r") || "1000";
  const level = q.get("lv") || "1";
  const tier = q.get("t") || "ROOKIE";
  const doctrine = q.get("d") || "Unproven";
  const wins = q.get("w") || "0";
  const losses = q.get("l") || "0";
  const brain = q.get("b") || "House · Grok";
  const col = TYPE_COLOR[c.type];

  const stats: [string, string, string][] = [
    ["ELO", rating, "#f5d020"],
    ["LEVEL", level, col],
    ["RECORD", `${wins}W · ${losses}L`, "#36d39a"],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0812 0%, #15102a 55%, #0a0812 100%)",
          color: "#efeaff",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 26, height: 26, border: "3px solid #f5d020", borderRadius: 7, marginRight: 14 }} />
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#8a82b8" }}>{BRAND.nameUpper}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 56 }}>
          <div
            style={{
              display: "flex",
              width: 220,
              height: 220,
              borderRadius: 32,
              border: `4px solid ${col}`,
              background: "rgba(255,255,255,0.04)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 130,
              color: col,
              marginRight: 36,
            }}
          >
            {EMBLEM[c.type]}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 800 }}>{c.name}</div>
            <div style={{ display: "flex", fontSize: 34, color: col, marginTop: 10 }}>{`${doctrine} · ${c.type}`}</div>
            <div style={{ display: "flex", fontSize: 26, color: "#8a82b8", marginTop: 8 }}>{`L${level} ${tier} · brain: ${brain}`}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "auto" }}>
          {stats.map(([label, val, c2]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "22px 28px",
                marginRight: 18,
                borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: "#8a82b8" }}>{label}</div>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: c2, marginTop: 6 }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#8a82b8", marginTop: 30 }}>
          Raise a mind. Make it legend. — train your own
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
