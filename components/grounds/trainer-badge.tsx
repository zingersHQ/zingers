"use client";
import { useState } from "react";
import { Shield, ChevronDown, Crown } from "lucide-react";
import { useChampions } from "@/store/champions";
import { trainerLevel, FORCES, forceMeta } from "@/lib/evolve/trainer";
import { TYPE_COLOR, EMBLEM } from "@/lib/evolve/progression";
import type { WarState } from "@/lib/types";

// The account-identity chip: your Reader rank + Banner. Tap to open the profile
// panel (rank progress + the live season war); choosing/changing your Banner
// happens in the dedicated BannerSheet, opened via onOpenBanner.
export function TrainerBadge({ isMobile, war, onOpenBanner }: { isMobile: boolean; war?: WarState | null; onOpenBanner: () => void }) {
  const trainerXp = useChampions((s) => s.trainerXp);
  const force = useChampions((s) => s.force);
  const forcePoints = useChampions((s) => s.forcePoints);
  const [open, setOpen] = useState(false);

  // points-by-force for the season war bars (server-aggregated, live)
  const warPts: Record<string, number> = {};
  for (const s of war?.standings ?? []) warPts[s.force] = s.points;
  const warMax = Math.max(1, ...Object.values(warPts));

  const tl = trainerLevel(trainerXp);
  const frac = Math.max(0.03, Math.min(1, tl.into / tl.span));
  const fc = force ? TYPE_COLOR[force] : "#9a96b8";
  const fm = force ? forceMeta(force) : null;

  return (
    <div style={{ position: "relative", pointerEvents: "auto", width: "fit-content" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="panel"
        aria-label="Trainer profile & allegiance"
        aria-expanded={open}
        style={{ ["--ac" as string]: fc, display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "7px 10px" : "7px 11px", cursor: "pointer", borderColor: open ? fc : "var(--line)", touchAction: "manipulation" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: `${fc}22`, color: fc, fontSize: 13, fontWeight: 800 }}>
          {force ? EMBLEM[force] : <Shield size={13} strokeWidth={2.2} />}
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05, textAlign: "left" }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Lv {tl.level} · {tl.title}</span>
          {!isMobile && <span className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5 }}>{fm ? fm.house.toUpperCase() : "NO BANNER"}</span>}
        </span>
        <ChevronDown size={13} strokeWidth={2} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", opacity: 0.6 }} />
      </button>

      {open && (
        <div className="panel pop" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, padding: 12, width: 256, maxWidth: "calc(100vw - 32px)", zIndex: 3 }}>
          {/* rank progress */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Reader rank {tl.level}</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>{tl.into}/{tl.span} xp</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: fc, marginTop: 1 }}>{tl.title}</div>
          <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,.08)", marginTop: 7, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round(frac * 100)}%`, background: fc, transition: "width .4s" }} />
          </div>

          {/* season war — the live, server-aggregated standing between the five */}
          {war && (
            <>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", margin: "14px 0 7px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>SEASON WAR</span>
                {war.leader ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: TYPE_COLOR[war.leader] }}>
                    <Crown size={10} strokeWidth={2.4} /> {forceMeta(war.leader).house}
                  </span>
                ) : (
                  <span style={{ fontStyle: "italic" }}>all even</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {FORCES.map((f) => {
                  const col = TYPE_COLOR[f.id];
                  const pts = warPts[f.id] ?? 0;
                  const lead = war.leader === f.id;
                  return (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: col, fontSize: 11, fontWeight: 800, width: 13, textAlign: "center" }}>{EMBLEM[f.id]}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((pts / warMax) * 100)}%`, background: col, opacity: lead ? 1 : 0.55, transition: "width .4s" }} />
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: lead ? col : "var(--muted2)", width: 22, textAlign: "right" }}>{pts}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5, marginTop: 7, lineHeight: 1.4 }}>
                The leading Force builds up the regions it&apos;s aligned to.
              </div>
            </>
          )}

          {/* banner — choosing/changing happens in the dedicated BannerSheet so
              there's one explained decision surface (and the season lock lives
              in one place). */}
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", margin: "14px 0 7px" }}>
            BANNER {force ? `· you've added ${war?.mine ?? forcePoints.points} this season` : "· none yet"}
          </div>
          <button
            onClick={() => { setOpen(false); onOpenBanner(); }}
            className="btn btn-primary"
            style={{ ["--ac" as string]: fc, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {force ? (
              <><span style={{ fontWeight: 800 }}>{EMBLEM[force]}</span> {fm?.house}</>
            ) : (
              "Choose your Banner"
            )}
          </button>
          <div className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5, marginTop: 9, lineHeight: 1.4 }}>
            {force ? "Review your Banner and the season war it feeds." : "Pick a side to fight for — your ranked wins feed its war."}
          </div>
        </div>
      )}
    </div>
  );
}
