"use client";
// ─────────────────────────────────────────────────────────────────────────────
// M2 — the Champion tab (docs/mobile.md). The phone's raise lane, shown directly
// (no "open X" bridge): your one owned champion — its body, career record,
// temperament readout (shaped by Imprints + fights), and paid training. Reuses the
// real store actions (imprint / trainChampion / trainWithFragment) and the same
// career-derived portrait the rest of the app uses, so training here visibly
// reshapes the body and marks the champion everywhere.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Sparkles, Dumbbell, Gem, Brain } from "lucide-react";
import type { Strat } from "@/lib/types";
import { DEFAULT_STRAT } from "@/lib/types";
import { TYPE_COLOR, blank } from "@/lib/evolve/progression";
import { forceName } from "@/lib/lore/canon";
import { TRAIN_COST } from "@/lib/economy";
import { ROSTER } from "@/lib/engine/roster";
import { IMPRINT_LESSONS, describeDial, imprintDayIndex } from "@/lib/imprints";
import { useChampions } from "@/store/champions";
import { ChampionAvatar, XpBar, Sigils, doctrineLabel } from "@/components/champion-avatar";
import { DoctrineDial } from "@/components/shared/doctrine-dial";
import { MobileAdopt } from "@/components/mobile/mobile-adopt";

const DIALS: { key: keyof Strat; label: string; hints: [string, string] }[] = [
  { key: "aggression", label: "Aggression", hints: ["Patient", "Relentless"] },
  { key: "focus", label: "Focus", hints: ["Broad", "Single-minded"] },
  { key: "risk", label: "Risk", hints: ["Safe", "Reckless"] },
];

export function MobileChampion(_props: { onNavigate?: (tab: string) => void; initialPick?: string }) {
  const owned = useChampions((s) => s.owned);
  const progress = useChampions((s) => s.progress);
  const recipes = useChampions((s) => s.recipes);
  const trainChampion = useChampions((s) => s.trainChampion);
  const trainWithFragment = useChampions((s) => s.trainWithFragment);
  const imprint = useChampions((s) => s.imprint);
  const imprintDays = useChampions((s) => s.imprintDays);
  const crowns = useChampions((s) => s.crowns);
  const fragments = useChampions((s) => s.fragments);
  const trainerXp = useChampions((s) => s.trainerXp);
  const setNick = useChampions((s) => s.setNick);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [imprinting, setImprinting] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  // Axes an Imprint just nudged — the STRATEGY dials glow briefly so the lesson
  // visibly lands. Cleared on a timer.
  const [litAxes, setLitAxes] = useState<Set<keyof Strat>>(() => new Set());
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (litTimer.current) clearTimeout(litTimer.current); }, []);

  const day = imprintDayIndex();

  const champ = useMemo(() => (owned ? progress[owned] ?? blank() : null), [owned, progress]);
  const strat: Strat = (owned && recipes[owned]?.strat) || DEFAULT_STRAT;
  const nick = (owned && recipes[owned]?.nick) || "";
  const [nickDraft, setNickDraft] = useState(nick);
  useEffect(() => {
    setNickDraft(nick);
  }, [nick, owned]);

  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const train = useCallback(async () => {
    if (!owned || busy) return;
    setBusy(true);
    const ok = await trainChampion(owned);
    setBusy(false);
    flash(ok ? "Training complete. Your champion evolved." : "Not enough Crowns to train.");
  }, [owned, busy, trainChampion, flash]);

  const trainFree = useCallback(() => {
    if (!owned) return;
    const ok = trainWithFragment(owned);
    flash(ok ? "Fragment spent. A free session banked." : "No fragments to spend.");
  }, [owned, trainWithFragment, flash]);

  const teach = useCallback(
    async (lessonId: string) => {
      if (!owned || imprinting) return;
      setImprinting(lessonId);
      setReply(null);
      const out = await imprint(owned, lessonId);
      setImprinting(null);
      if (!out.applied) {
        flash("Already internalized today — try a different lesson.");
        return;
      }
      setReply(out.reply);
      const who = ROSTER[owned]?.name ?? owned;
      const moved = describeDial(out.dial);
      flash(moved ? `${who} took it to heart. ${moved}.` : `${who} took it to heart.`);
      const axes = new Set(Object.keys(out.dial) as (keyof Strat)[]);
      setLitAxes(axes);
      if (litTimer.current) clearTimeout(litTimer.current);
      litTimer.current = setTimeout(() => setLitAxes(new Set()), 1800);
    },
    [owned, imprinting, imprint, flash],
  );

  // No champion yet → the adoption door (desktop does this in the 3D first-duel;
  // on a phone this IS the raise lane's entry). Once adopted, `owned` flips and
  // the full Champion body below renders.
  if (!owned || !ROSTER[owned] || !champ) {
    return <MobileAdopt initialPick={_props.initialPick} />;
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

        {/* champion profile — compact horizontal card */}
        <div className="panel champ-profile" style={{ ["--ac" as string]: col, padding: "12px 13px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <ChampionAvatar ckey={owned} type={type} champion={champ} size={76} />
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>{nick || name}</div>
              {nick ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 2 }}>{name}</div>
              ) : null}
              <div className="mono" style={{ fontSize: 10, color: col, marginTop: 3 }}>
                {forceName(type)} · L{dl.level} {dl.tier}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.35, marginTop: 6 }}>
                {dl.doctrine}
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 10px", marginTop: 8 }}>
                <Sigils champion={champ} start />
                <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.3 }}>
                  {champ.wins}W · {champ.losses}L{battles ? ` · ${wr}%` : ""}
                </span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <XpBar champion={champ} color={col} />
            <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 4 }}>
              {dl.into} / {dl.span} XP TO NEXT
            </div>
          </div>
        </div>

        {/* nickname — Trainer stamp; shows on share cards */}
        <div className="panel" style={{ padding: 14, marginTop: 12 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
            NICKNAME · YOUR NAME FOR THIS MIND
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value.slice(0, 24))}
              placeholder={name}
              maxLength={24}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--line2)",
                background: "var(--panel2, #15131f)",
                color: "var(--ink)",
                fontSize: 14,
                fontWeight: 600,
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (!owned) return;
                setNick(owned, nickDraft);
                flash(nickDraft.trim() ? "Nickname locked in." : "Nickname cleared.");
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: col,
                color: "#0a0a12",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* temperament — status meters; Imprints + fights grow these (never drag) */}
        <div className="panel" style={{ padding: 16, marginTop: 12 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 6 }}>
            TEMPERAMENT · HOW {(nick || name).toUpperCase()} THINKS
          </div>
          <p className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", lineHeight: 1.45, margin: "0 0 12px" }}>
            Its fighting nature — grown by lessons you teach and fights it survives. Not sliders you set.
          </p>
          {DIALS.map((d) => (
            <DoctrineDial key={d.key} label={d.label} value={strat[d.key]} color={col} hints={d.hints} highlight={litAxes.has(d.key)} />
          ))}
        </div>

        {/* imprint — daily choice is the point: same menu, different career path */}
        <div className="panel" style={{ ["--ac" as string]: col, padding: 16, marginTop: 12 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: col, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Brain size={12} strokeWidth={2.4} /> LESSONS · SHAPE {name.toUpperCase()} TODAY
          </div>
          <p className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", lineHeight: 1.5, margin: "0 0 10px" }}>
            Same lesson menu for every Trainer — the surprise is which one you pick today, and what the fights do in between. One sticks per day; it remembers in its own voice.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {IMPRINT_LESSONS.map((l) => {
              const learned = imprintDays[owned]?.[l.id] === day;
              const locked = learned || (!!imprinting && imprinting !== l.id);
              const nudge = describeDial(l.dial);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => teach(l.id)}
                  disabled={!!imprinting || learned}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 11, border: "1px solid var(--line2)", background: imprinting === l.id ? `color-mix(in srgb, ${col} 16%, transparent)` : "transparent", color: "var(--ink)", textAlign: "left", cursor: learned ? "default" : imprinting ? "wait" : "pointer", opacity: locked ? 0.5 : 1 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{l.label}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 1 }}>
                      {learned ? "Learned today · back tomorrow" : nudge ? `${l.hint} · ${nudge}` : l.hint}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: learned ? "var(--muted2)" : col, fontWeight: 700 }}>{imprinting === l.id ? "…" : learned ? "✓" : "Teach"}</span>
                </button>
              );
            })}
          </div>
          {reply && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 11, background: "var(--panel2, #15131f)", border: `1px solid ${col}` }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: col, marginBottom: 4 }}>{name.toUpperCase()}</div>
              <div style={{ fontSize: 13.5, fontStyle: "italic", lineHeight: 1.45 }}>&ldquo;{reply}&rdquo;</div>
            </div>
          )}
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
              Earn Crowns by calling fights and flying.
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

export default MobileChampion;
