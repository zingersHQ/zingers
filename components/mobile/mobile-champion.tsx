"use client";
// ─────────────────────────────────────────────────────────────────────────────
// M2 — the Champion tab (docs/mobile.md). The phone's raise lane, shown directly
// (no "open X" bridge): your one owned champion — its body, career record,
// evolving strategy dials, and paid training. Reuses the real store actions
// (setStrat / trainChampion / trainWithFragment) and the same career-derived
// portrait the rest of the app uses, so training here visibly reshapes the body
// and marks the champion everywhere.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useMemo, useState } from "react";
import { Crown, Sparkles, Dumbbell, Gem } from "lucide-react";
import type { Strat } from "@/lib/types";
import { DEFAULT_STRAT } from "@/lib/types";
import { TYPE_COLOR, blank } from "@/lib/evolve/progression";
import { forceName } from "@/lib/lore/canon";
import { TRAIN_COST } from "@/lib/economy";
import { ROSTER } from "@/lib/engine/roster";
import { useChampions } from "@/store/champions";
import { ChampionAvatar, XpBar, Sigils, doctrineLabel } from "@/components/champion-avatar";
import { DoctrineDial } from "@/components/shared/doctrine-dial";
import { MobileAdopt } from "@/components/mobile/mobile-adopt";

const DIALS: { key: keyof Strat; label: string; hints: [string, string] }[] = [
  { key: "aggression", label: "Aggression", hints: ["Patient", "Relentless"] },
  { key: "focus", label: "Focus", hints: ["Broad", "Single-minded"] },
  { key: "risk", label: "Risk", hints: ["Safe", "Reckless"] },
];

export function MobileChampion(_props: { onNavigate?: (tab: string) => void }) {
  const owned = useChampions((s) => s.owned);
  const progress = useChampions((s) => s.progress);
  const recipes = useChampions((s) => s.recipes);
  const setStrat = useChampions((s) => s.setStrat);
  const trainChampion = useChampions((s) => s.trainChampion);
  const trainWithFragment = useChampions((s) => s.trainWithFragment);
  const crowns = useChampions((s) => s.crowns);
  const fragments = useChampions((s) => s.fragments);
  const trainerXp = useChampions((s) => s.trainerXp);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const champ = useMemo(() => (owned ? progress[owned] ?? blank() : null), [owned, progress]);
  const strat: Strat = (owned && recipes[owned]?.strat) || DEFAULT_STRAT;

  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const setDial = useCallback(
    (k: keyof Strat, v: number) => {
      if (owned) setStrat(owned, { ...strat, [k]: v });
    },
    [owned, strat, setStrat],
  );

  const train = useCallback(async () => {
    if (!owned || busy) return;
    setBusy(true);
    const ok = await trainChampion(owned);
    setBusy(false);
    flash(ok ? "Training complete — your champion evolved." : "Not enough Crowns to train.");
  }, [owned, busy, trainChampion, flash]);

  const trainFree = useCallback(() => {
    if (!owned) return;
    const ok = trainWithFragment(owned);
    flash(ok ? "Fragment spent — a free session banked." : "No fragments to spend.");
  }, [owned, trainWithFragment, flash]);

  // No champion yet → the adoption door (desktop does this in the 3D first-duel;
  // on a phone this IS the raise lane's entry). Once adopted, `owned` flips and
  // the full Champion body below renders.
  if (!owned || !ROSTER[owned] || !champ) {
    return <MobileAdopt />;
  }

  const type = ROSTER[owned].type;
  const name = ROSTER[owned].name;
  const col = TYPE_COLOR[type];
  const dl = doctrineLabel(champ);
  const battles = champ.wins + champ.losses;
  const wr = battles ? Math.round((champ.wins / battles) * 100) : 0;
  const canTrain = crowns >= TRAIN_COST;

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 14px 24px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* header + wallet */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Champion</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 9, border: "1px solid var(--line2)", fontSize: 11 }}>
              <Crown size={12} strokeWidth={2.4} fill="#f5d020" style={{ color: "#f5d020" }} />
              <span style={{ fontWeight: 800, color: "#f5d020" }}>{crowns}</span>
            </span>
            <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 9, border: "1px solid var(--line2)", fontSize: 11 }}>
              <Sparkles size={12} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
              <span style={{ fontWeight: 800, color: "var(--accent)" }}>{trainerXp}</span>
              <span style={{ color: "var(--muted2)", fontSize: 9 }}>XP</span>
            </span>
          </div>
        </div>

        {/* the champion body */}
        <div className="panel" style={{ ["--ac" as string]: col, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <ChampionAvatar ckey={owned} type={type} champion={champ} size={128} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>{name}</div>
            <div className="mono" style={{ fontSize: 11, color: col, marginTop: 2 }}>
              {forceName(type)} · L{dl.level} {dl.tier}
            </div>
          </div>
          <div style={{ width: "100%", maxWidth: 260 }}>
            <XpBar champion={champ} color={col} />
            <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 4 }}>{dl.into} / {dl.span} XP TO NEXT</div>
          </div>
          <Sigils champion={champ} />
          <div style={{ fontSize: 13, color: "var(--ink)", fontStyle: "italic", lineHeight: 1.4 }}>{dl.doctrine}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 2 }}>
            <Stat label="RECORD" value={`${champ.wins}W · ${champ.losses}L`} />
            <Stat label="WIN RATE" value={battles ? `${wr}%` : "—"} />
          </div>
        </div>

        {/* strategy — how the mind thinks (edits persist to the recipe) */}
        <div className="panel" style={{ padding: 16, marginTop: 12 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 12 }}>
            STRATEGY · HOW {name.toUpperCase()} THINKS
          </div>
          {DIALS.map((d) => (
            <DoctrineDial key={d.key} label={d.label} value={strat[d.key]} onChange={(v) => setDial(d.key, v)} color={col} hints={d.hints} />
          ))}
          <p className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", lineHeight: 1.5, margin: "2px 0 0" }}>
            You set conditions; the champion decides its own moves in battle. Changes take hold next fight.
          </p>
        </div>

        {/* train — spend to evolve the body along the strategy */}
        <div className="panel" style={{ padding: 16, marginTop: 12 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>TRAIN · EVOLVE THE BODY</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={train}
              disabled={busy || !canTrain}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 14px", borderRadius: 12, border: "none", background: canTrain ? "var(--gold, #f5d020)" : "var(--panel2, #1a1826)", color: canTrain ? "#0a0a12" : "var(--muted2)", fontSize: 14, fontWeight: 800, cursor: busy || !canTrain ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}
            >
              <Dumbbell size={16} strokeWidth={2.4} /> {busy ? "Training…" : `Train · ${TRAIN_COST}`}
              {!busy && <Crown size={13} strokeWidth={2.4} fill={canTrain ? "#0a0a12" : "#f5d020"} style={{ color: canTrain ? "#0a0a12" : "#f5d020" }} />}
            </button>
            <button
              type="button"
              onClick={trainFree}
              disabled={fragments < 1}
              className="mono"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "13px 14px", borderRadius: 12, border: "1px solid var(--line2)", background: "transparent", color: fragments < 1 ? "var(--muted2)" : "var(--accent)", fontSize: 12, fontWeight: 700, cursor: fragments < 1 ? "not-allowed" : "pointer" }}
            >
              <Gem size={14} strokeWidth={2.2} /> {fragments}
            </button>
          </div>
          {!canTrain && (
            <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", margin: "10px 0 0" }}>
              Earn Crowns by calling fights and running the Circuit.
            </p>
          )}
        </div>
      </div>

      {toast && (
        <div className="mono" style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "#12101f", border: `1px solid ${col}`, borderRadius: 10, padding: "11px 16px", fontSize: 12, color: "var(--ink)", boxShadow: "0 20px 50px -20px #000", maxWidth: "90%", textAlign: "center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>{value}</div>
      <div className="mono" style={{ fontSize: 8.5, letterSpacing: 1, color: "var(--muted2)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default MobileChampion;
