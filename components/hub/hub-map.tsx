"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LAYERS, layerOfRoute } from "@/lib/hub";

const ACCENT: Record<string, string> = {
  roam: "#39e0ff",
  quick: "#f0a93a",
  raise: "#36d39a",
};

export function HubMap({ compact = false }: { compact?: boolean }) {
  const path = usePathname();
  const active = layerOfRoute(path);

  return (
    <section className="panel" style={{ padding: compact ? 12 : 18, display: "grid", gap: compact ? 10 : 14 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>
        HUB · ONE WORLD, THREE WAYS IN
      </div>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
        {LAYERS.map((layer) => {
          const col = ACCENT[layer.id];
          const on = active === layer.id;
          return (
            <div
              key={layer.id}
              style={{
                border: `1px solid ${on ? col : "var(--line)"}`,
                borderRadius: 12,
                padding: compact ? 10 : 12,
                background: on ? `${col}12` : "rgba(255,255,255,.025)",
                boxShadow: on ? `0 0 24px -16px ${col}` : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <Link href={layer.home} style={{ color: on ? col : "var(--ink)", textDecoration: "none", fontWeight: 800 }}>
                  {layer.name}
                </Link>
                <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>{layer.session}</span>
              </div>
              {!compact && <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45, margin: "7px 0 10px" }}>{layer.pitch}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: compact ? 8 : 0 }}>
                {layer.spokes.map((spoke) => (
                  <Link
                    key={spoke.id}
                    href={spoke.href}
                    title={spoke.blurb}
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: spoke.planned ? "var(--muted2)" : col,
                      textDecoration: "none",
                      border: `1px solid ${spoke.planned ? "var(--line)" : `${col}66`}`,
                      borderRadius: 999,
                      padding: "4px 7px",
                      opacity: spoke.planned ? 0.55 : 1,
                    }}
                  >
                    {spoke.label}{spoke.planned ? " soon" : ""}
                  </Link>
                ))}
              </div>
              {!compact && (
                <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 10 }}>
                  feels like: {layer.reference}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
