"use client";
// The Tribunal (scenario: "tribunal") — the flagship arena from
// docs/bible/05-regions.md. Two minds are ASSIGNED opposing stances on a spicy
// proposition and argue it to the jury. The proposition becomes the bout's real
// `topic`, so this plays a genuinely different bout than a random-topic duel.
//
// This file owns the Tribunal's surfaces: the pre-fight BRIEFING (pick a
// respondent, see the case + your assigned side, place a bet) and the in-bout
// HUD BANNER (the case + your stance, on screen while you argue). All bout
// mechanics (ELO, XP, evolution, wagers) reuse the shared Arena battle.
import { useMemo } from "react";
import { Scale, X, Swords as FightIcon, Crown } from "lucide-react";
import type { Champion, RosterEntry } from "@/lib/types";
import { TYPE_COLOR, skillLevel, skillCount } from "@/lib/evolve/progression";
import { tribunalDraw, type Stance, type TribunalDraw } from "@/lib/scenarios/registry";
import type { TribunalConfig } from "@/lib/scenarios/types";
import { ChampionAvatar } from "@/components/champion-avatar";

const GOLD = "#f0a93a";

const Cr = ({ s = 12 }: { s?: number }) => (
  <Crown size={s} strokeWidth={2.2} style={{ verticalAlign: "-2px", color: "var(--gold)" }} />
);

function StanceTag({ stance }: { stance: Stance }) {
  const isFor = stance === "for";
  const c = isFor ? "var(--good)" : "var(--bad)";
  return (
    <span
      className="mono"
      style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 800, color: c, border: `1px solid ${c}`, borderRadius: 5, padding: "1px 6px" }}
    >
      {isFor ? "FOR" : "AGAINST"}
    </span>
  );
}

// The case card — the proposition + (once a respondent is chosen) the two sides.
// Reused by the briefing; kept presentational so the in-bout banner can share it.
export function TribunalCase({ proposition, myStance }: { proposition: string; myStance: Stance | null }) {
  return (
    <div className="panel" style={{ ["--ac" as string]: GOLD, borderColor: GOLD, padding: "12px 14px", background: "rgba(240,169,58,.06)" }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: GOLD, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <Scale size={12} strokeWidth={2.2} /> THE CASE
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, fontStyle: "italic" }}>&ldquo;{proposition}&rdquo;</div>
      {myStance && (
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          you argue <StanceTag stance={myStance} /> — hold your side; switching or going off-topic loses the jury.
        </div>
      )}
    </div>
  );
}

export function TribunalBriefing(props: {
  ownedEntry: RosterEntry;
  roster: RosterEntry[];
  get: (k: string) => Champion;
  cfg: TribunalConfig;
  seed: string; // `${season}:${dayKey}` — picks the case + seeds the stance
  opponent: string | null;
  setOpponent: (k: string) => void;
  betSide: "me" | "opp" | null;
  setBetSide: (s: "me" | "opp" | null) => void;
  betAmt: number;
  setBetAmt: (n: number) => void;
  crowns: number;
  onClose: () => void;
  onFight: () => void;
}) {
  const { ownedEntry, roster, get, cfg, seed, opponent, setOpponent, betSide, setBetSide, betAmt, setBetAmt, crowns, onClose, onFight } = props;
  const opps = roster.filter((r) => r.key !== ownedEntry.key);
  const oppEntry = opponent ? roster.find((r) => r.key === opponent) : null;

  const draw: TribunalDraw = useMemo(
    () => tribunalDraw(seed, `${seed}:${opponent ?? "_"}`),
    [seed, opponent],
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.7)", backdropFilter: "blur(7px)", zIndex: 52, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: GOLD, position: "relative", width: "min(600px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, borderColor: GOLD }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: GOLD }}>THE TRIBUNAL</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Argue your assigned side</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div style={{ margin: "14px 0" }}>
          <TribunalCase proposition={draw.proposition} myStance={opponent ? draw.myStance : null} />
        </div>

        {/* matchup, once a respondent is chosen — the sides are assigned, not chosen */}
        {oppEntry && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", margin: "4px 0 16px" }}>
            <div style={{ textAlign: "center" }}>
              <ChampionAvatar ckey={ownedEntry.key} type={ownedEntry.type} champion={get(ownedEntry.key)} size={56} />
              <div style={{ fontWeight: 700, marginTop: 6, fontSize: 13 }}>{ownedEntry.name}</div>
              <div style={{ marginTop: 4 }}><StanceTag stance={draw.myStance} /></div>
            </div>
            <div className="mono" style={{ fontSize: 14, color: "var(--muted2)", fontWeight: 700 }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <ChampionAvatar ckey={oppEntry.key} type={oppEntry.type} champion={get(oppEntry.key)} size={56} />
              <div style={{ fontWeight: 700, marginTop: 6, fontSize: 13 }}>{oppEntry.name}</div>
              <div style={{ marginTop: 4 }}><StanceTag stance={draw.oppStance} /></div>
            </div>
          </div>
        )}

        {/* the room's character — the canon force-bias of the arena */}
        <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ letterSpacing: 1.5 }}>THE ROOM</span>
          <span style={{ color: TYPE_COLOR[cfg.favored] }}>rewards {cfg.favored.toLowerCase()}</span>
          <span style={{ color: "var(--muted2)" }}>·</span>
          <span style={{ color: TYPE_COLOR[cfg.punished] }}>punishes {cfg.punished.toLowerCase()} (pure noise)</span>
        </div>

        {/* choose your respondent */}
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          CHOOSE A RESPONDENT
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {opps.map((r) => {
            const col = TYPE_COLOR[r.type];
            const on = opponent === r.key;
            const c = get(r.key);
            return (
              <button
                key={r.key}
                onClick={() => setOpponent(r.key)}
                className="panel"
                style={{ ["--ac" as string]: col, padding: "8px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderColor: on ? col : "var(--line)", textAlign: "left", width: "100%" }}
              >
                <ChampionAvatar ckey={r.key} type={r.type} champion={c} size={38} />
                <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div className="mono" style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 12, fontSize: 11, flexShrink: 0 }}>
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, color: col, fontWeight: 700 }}>
                    <span style={{ fontSize: 8, letterSpacing: 1, color: "var(--muted2)" }}>SL</span>
                    {skillLevel(c)}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{skillCount(c)} skills</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* betting — identical mechanic to a duel: back a side, win 2× the stake */}
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          BACK A SIDE (optional) · win 2× your stake
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button className={betSide === "me" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--good)" }} onClick={() => setBetSide(betSide === "me" ? null : "me")}>
            back {ownedEntry.name}
          </button>
          <button className={betSide === "opp" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--bad)" }} disabled={!oppEntry} onClick={() => setBetSide(betSide === "opp" ? null : "opp")}>
            back {oppEntry?.name ?? "respondent"}
          </button>
          {betSide && (
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {[25, 50, 100].map((n) => (
                <button key={n} className={betAmt === n ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--gold)", opacity: crowns < n ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 3 }} disabled={crowns < n} onClick={() => setBetAmt(n)}>
                  {n} <Cr />
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary" style={{ ["--ac" as string]: GOLD, width: "100%", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={!opponent} onClick={onFight}>
          <FightIcon size={18} strokeWidth={2.2} />
          {opponent ? "Open the case" : "pick a respondent"}
          {betSide && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>(staking {betAmt} <Cr s={13} />)</span>}
        </button>
      </div>
    </div>
  );
}

// In-bout strip: keeps the case + your stance on screen while the argument runs,
// so a Tribunal bout reads as a hearing, not a generic spar.
export function TribunalMatchBanner({ proposition, myStance, isMobile }: { proposition: string; myStance: Stance; isMobile: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: isMobile ? 104 : 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        pointerEvents: "none",
        width: isMobile ? "92vw" : "min(560px, 90vw)",
      }}
    >
      <div className="panel" style={{ ["--ac" as string]: GOLD, borderColor: GOLD, padding: isMobile ? "7px 11px" : "8px 14px", display: "flex", alignItems: "center", gap: 10, background: "rgba(10,8,16,.82)" }}>
        <Scale size={isMobile ? 14 : 16} color={GOLD} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, fontStyle: "italic", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            &ldquo;{proposition}&rdquo;
          </div>
        </div>
        <div style={{ marginLeft: "auto", flexShrink: 0 }}><StanceTag stance={myStance} /></div>
      </div>
    </div>
  );
}
