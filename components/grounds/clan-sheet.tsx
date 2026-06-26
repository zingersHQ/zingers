"use client";
// The one place you choose a Clan — the optional season-long team a Reader
// fights for in the Clan War. Opened both by the Trainer chip and by walking
// under a clan flag in the Concord, so there's a single, explained decision
// surface instead of two silent ones. Choosing is locked to once per season, so
// this is a real commitment: it confirms, explains the payoff (home advantage),
// and shows the live war it feeds.
import { useEffect, useState } from "react";
import { Check, Crown, Lock, Star, X } from "lucide-react";
import { useChampions } from "@/store/champions";
import { FORCES, forceMeta } from "@/lib/evolve/trainer";
import { TYPE_COLOR, EMBLEM } from "@/lib/evolve/progression";
import { HOME_WIN_BONUS } from "@/lib/economy";
import type { CreatureType, WarState } from "@/lib/types";

export function ClanSheet({
  preselect = null,
  suggested = null,
  war = null,
  onClose,
  onPledged,
  onSelectionChange,
}: {
  preselect?: CreatureType | null;
  suggested?: CreatureType | null;
  war?: WarState | null;
  onClose: () => void;
  onPledged?: (f: CreatureType) => void;
  onSelectionChange?: (f: CreatureType | null) => void;
}) {
  const force = useChampions((s) => s.force);
  const forcePoints = useChampions((s) => s.forcePoints);
  const pledgeForce = useChampions((s) => s.pledgeForce);
  const canChangeClan = useChampions((s) => s.canChangeClan);

  const locked = !canChangeClan();
  const [sel, setSel] = useState<CreatureType | null>(preselect ?? force ?? suggested ?? null);

  useEffect(() => {
    onSelectionChange?.(sel);
  }, [sel, onSelectionChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const warPts: Record<string, number> = {};
  for (const s of war?.standings ?? []) warPts[s.force] = s.points;
  const warMax = Math.max(1, ...Object.values(warPts));

  const confirm = () => {
    if (!sel || locked) return;
    if (pledgeForce(sel)) {
      onPledged?.(sel);
      onClose();
    }
  };

  const accent = sel ? TYPE_COLOR[sel] : "#9a96b8";

  // When locked you've already pledged this season — `force` is guaranteed set,
  // so the sheet becomes a focused review of your own Clan rather than a picker.
  const mine = force ? forceMeta(force) : null;
  const myPoints = war?.mine ?? forcePoints.points;

  return (
    <div
      style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(8px)", zIndex: 64, padding: 16 }}
      onClick={onClose}
    >
      <div
        className="panel cel-reveal"
        onClick={(e) => e.stopPropagation()}
        style={{ ["--ac" as string]: accent, position: "relative", width: "min(460px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 20, borderColor: accent, boxShadow: `0 0 90px -34px ${accent}, 0 30px 70px -30px #000` }}
      >
        <button onClick={onClose} aria-label="Close" className="mono" style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 4 }}>
          <X size={16} strokeWidth={2.2} />
        </button>

        {/* header */}
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: 2.4, color: accent, fontWeight: 700 }}>
          {locked ? "YOUR CLAN" : force ? "CHANGE YOUR CLAN" : "CHOOSE YOUR CLAN"}
        </div>
        {locked && mine ? (
          /* you're pledged for the season — review your Clan, don't re-pick it */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 6 }}>
              <span style={{ width: 50, height: 50, borderRadius: 13, display: "grid", placeItems: "center", background: `${accent}22`, color: accent, fontSize: 27, fontWeight: 800, flexShrink: 0, boxShadow: `0 0 30px -12px ${accent}` }}>
                {EMBLEM[force!]}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>{mine.name}</h2>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", marginTop: 2 }}>{mine.motto}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 13 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>{myPoints}</span>
              <span className="mono" style={{ fontSize: 10.5, letterSpacing: 0.4, color: "var(--muted)" }}>war points you&apos;ve added this season</span>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 800, margin: "3px 0 4px", letterSpacing: -0.4 }}>
              Pick a side to fight for.
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              Your Clan is an optional team in the season-long <b style={{ color: "var(--ink)" }}>Clan War</b>. Every ranked win you score is counted toward it — and the winning Clan reshapes the world.
            </p>
          </>
        )}

        {/* home-advantage payoff */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "14px 0", padding: "9px 12px", borderRadius: 10, border: `1px solid ${accent}55`, background: `${accent}12` }}>
          <Crown size={16} strokeWidth={2.2} style={{ color: accent, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>
            <b style={{ color: "var(--ink)" }}>Home advantage.</b> Win in a region that favors your Clan for <b style={{ color: accent }}>+{HOME_WIN_BONUS} Crowns</b> and <b style={{ color: accent }}>double</b> war points.
          </span>
        </div>

        {/* the five clans — only a live picker when you can actually choose */}
        {!locked && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {FORCES.map((f) => {
            const col = TYPE_COLOR[f.id];
            const on = sel === f.id;
            const isCurrent = force === f.id;
            const isSuggested = suggested === f.id && !force;
            const disabled = locked && !isCurrent;
            return (
              <button
                key={f.id}
                onClick={() => !disabled && setSel(f.id)}
                disabled={disabled}
                className="panel"
                style={{
                  ["--ac" as string]: col,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 11px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  opacity: disabled ? 0.4 : 1,
                  borderColor: on ? col : "var(--line)",
                  background: on ? `${col}16` : "transparent",
                  transition: "border-color .15s, background .15s",
                }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: `${col}22`, color: col, fontSize: 17, fontWeight: 800, flexShrink: 0 }}>
                  {EMBLEM[f.id]}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{f.name}</span>
                    {isSuggested && (
                      <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 8, letterSpacing: 0.8, color: col, border: `1px solid ${col}`, borderRadius: 5, padding: "1px 5px" }}>
                        <Star size={8} strokeWidth={2.6} /> YOUR FORCE
                      </span>
                    )}
                  </span>
                  <span className="mono" style={{ display: "block", fontSize: 9, color: "var(--muted2)", fontStyle: "italic", marginTop: 1 }}>{f.motto}</span>
                </span>
                {on && <Check size={16} strokeWidth={2.6} color={col} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
        )}

        {/* live war standing — the thing your wins feed */}
        {war && (
          <>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", margin: "16px 0 7px", display: "flex", justifyContent: "space-between" }}>
              <span>SEASON WAR{force ? ` · you've added ${war.mine ?? forcePoints.points}` : ""}</span>
              <span style={{ fontStyle: war.leader ? "normal" : "italic", color: war.leader ? TYPE_COLOR[war.leader] : "var(--muted2)" }}>
                {war.leader ? `${forceMeta(war.leader).name} leads` : "all even"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {FORCES.map((f) => {
                const col = TYPE_COLOR[f.id];
                const pts = warPts[f.id] ?? 0;
                const lead = war.leader === f.id;
                return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: col, fontSize: 10, fontWeight: 800, width: 12, textAlign: "center" }}>{EMBLEM[f.id]}</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 4, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round((pts / warMax) * 100)}%`, background: col, opacity: lead ? 1 : 0.5, transition: "width .4s" }} />
                    </div>
                    <span className="mono" style={{ fontSize: 8.5, color: lead ? col : "var(--muted2)", width: 20, textAlign: "right" }}>{pts}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* footer — lock notice + confirm */}
        {locked ? (
          <div className="mono" style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, fontSize: 10.5, color: "var(--muted)", lineHeight: 1.4 }}>
            <Lock size={13} strokeWidth={2.2} style={{ flexShrink: 0, color: accent }} />
            <span>Your Clan is locked for this season. You can switch when the next season opens.</span>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={onClose} className="btn" style={{ ["--ac" as string]: "var(--line2)", flex: "0 0 auto" }}>
                Decide later
              </button>
              <button
                onClick={confirm}
                disabled={!sel}
                className="btn btn-primary"
                style={{ ["--ac" as string]: accent, flex: 1, opacity: sel ? 1 : 0.5, cursor: sel ? "pointer" : "not-allowed" }}
              >
                {sel ? `Fight for ${forceMeta(sel).name}` : "Select a Clan"}
              </button>
            </div>
            <div className="mono" style={{ fontSize: 8.5, color: "var(--muted2)", letterSpacing: 0.4, marginTop: 9, lineHeight: 1.4 }}>
              One Clan per season — choose with intent. Your contribution always stays with the Clan that earned it.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
