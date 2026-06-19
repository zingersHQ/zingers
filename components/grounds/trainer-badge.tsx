"use client";
import { useState } from "react";
import { Shield, ChevronDown, Check } from "lucide-react";
import { useChampions } from "@/store/champions";
import { trainerLevel, FORCES, forceMeta } from "@/lib/evolve/trainer";
import { TYPE_COLOR, EMBLEM } from "@/lib/evolve/progression";

// The account-identity chip: your Reader rank + pledged Force. Tap to open the
// allegiance panel (rank progress + pledge a Force + this season's contribution).
export function TrainerBadge({ isMobile }: { isMobile: boolean }) {
  const trainerXp = useChampions((s) => s.trainerXp);
  const force = useChampions((s) => s.force);
  const forcePoints = useChampions((s) => s.forcePoints);
  const pledgeForce = useChampions((s) => s.pledgeForce);
  const [open, setOpen] = useState(false);

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
          {!isMobile && <span className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5 }}>{fm ? fm.house.toUpperCase() : "UNPLEDGED"}</span>}
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

          {/* allegiance */}
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", margin: "14px 0 7px" }}>
            ALLEGIANCE {force ? `· ${forcePoints.points} pts this season` : "· pledge a Force"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {FORCES.map((f) => {
              const col = TYPE_COLOR[f.id];
              const on = force === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => pledgeForce(f.id)}
                  className="panel"
                  style={{ ["--ac" as string]: col, display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", cursor: "pointer", borderColor: on ? col : "var(--line)", background: on ? `${col}14` : "transparent", textAlign: "left" }}
                >
                  <span style={{ color: col, fontSize: 14, fontWeight: 800, width: 16, textAlign: "center" }}>{EMBLEM[f.id]}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#fff" }}>{f.house}</span>
                    <span className="mono" style={{ fontSize: 8.5, color: "var(--muted2)", fontStyle: "italic" }}>{f.motto}</span>
                  </span>
                  {on && <Check size={14} strokeWidth={2.4} color={col} />}
                </button>
              );
            })}
          </div>
          <div className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5, marginTop: 9, lineHeight: 1.4 }}>
            Every ranked win feeds your Force&apos;s seasonal war. You can switch, but your contribution stays with the Force that earned it.
          </div>
        </div>
      )}
    </div>
  );
}
