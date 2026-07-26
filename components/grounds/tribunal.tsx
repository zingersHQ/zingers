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
import { ChampionPortrait } from "@/components/render/champion-portrait";
import { practiceOpponentKeys } from "@/lib/scene-population";

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
export function TribunalCase({ proposition, myStance }: { proposition: string; myStance: Stance | null }) {
  return (
    <div className="panel" style={{ ["--ac" as string]: GOLD, borderColor: GOLD, padding: "12px 14px", background: "rgba(240,169,58,.06)" }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: GOLD, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <Scale size={12} strokeWidth={2.2} /> TODAY&apos;S CASE
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, fontStyle: "italic" }}>&ldquo;{proposition}&rdquo;</div>
      {myStance && (
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          Your champion must argue <StanceTag stance={myStance} /> — stay on that side; going off-topic loses the jury.
        </div>
      )}
    </div>
  );
}

function MatchupCard({
  entry,
  champion,
  stance,
  color,
}: {
  entry: RosterEntry;
  champion: Champion;
  stance: Stance;
  color: string;
}) {
  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid color-mix(in srgb, ${color} 45%, var(--line2))`,
        }}
      >
        <ChampionPortrait rosterKey={entry.key} type={entry.type} champion={champion} preset="portrait" colorHex={color} eager />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
          <StanceTag stance={stance} />
        </div>
      </div>
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
  const oppKeys = new Set(practiceOpponentKeys(ownedEntry.key));
  const opps = roster.filter((r) => oppKeys.has(r.key));
  const oppEntry = opponent ? roster.find((r) => r.key === opponent) : null;

  const draw: TribunalDraw = useMemo(
    () => tribunalDraw(seed, `${seed}:${opponent ?? "_"}`),
    [seed, opponent],
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(7px)", zIndex: 52, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: GOLD, position: "relative", width: "min(640px, 96vw)", maxHeight: "90vh", overflow: "auto", padding: 22, borderColor: GOLD }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: GOLD }}>THE TRIBUNAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, marginTop: 4 }}>Your champion argues the side they&apos;re given</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4, margin: "6px 0 0" }}>
              Pick who they face. The case and sides are assigned — you watch and earn Crowns.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 0, flexShrink: 0 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div style={{ margin: "14px 0" }}>
          <TribunalCase proposition={draw.proposition} myStance={opponent ? draw.myStance : null} />
        </div>

        {oppEntry && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: 12,
              alignItems: "start",
              margin: "4px 0 16px",
            }}
          >
            <MatchupCard entry={ownedEntry} champion={get(ownedEntry.key)} stance={draw.myStance} color={TYPE_COLOR[ownedEntry.type]} />
            <div className="mono" style={{ fontSize: 13, color: "var(--muted2)", fontWeight: 800, paddingTop: 48 }}>VS</div>
            <MatchupCard entry={oppEntry} champion={get(oppEntry.key)} stance={draw.oppStance} color={TYPE_COLOR[oppEntry.type]} />
          </div>
        )}

        <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ letterSpacing: 1.5 }}>THIS ROOM</span>
          <span style={{ color: TYPE_COLOR[cfg.favored] }}>favors {cfg.favored.toLowerCase()}</span>
          <span style={{ color: "var(--muted2)" }}>·</span>
          <span style={{ color: TYPE_COLOR[cfg.punished] }}>harsh on {cfg.punished.toLowerCase()}</span>
        </div>

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          CHOOSE WHO THEY FACE
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
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${on ? col : "var(--line2)"}` }}>
                  <ChampionPortrait rosterKey={r.key} type={r.type} champion={c} preset="portrait" colorHex={col} eager={on} />
                </div>
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

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          BACK A SIDE (optional) · win 2×
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, width: "100%" }}>
          <button
            className={betSide === "me" ? "btn btn-primary" : "btn"}
            style={{ ["--ac" as string]: "var(--good)", flex: 1, minWidth: 0 }}
            onClick={() => setBetSide(betSide === "me" ? null : "me")}
          >
            Back {ownedEntry.name}
          </button>
          <button
            className={betSide === "opp" ? "btn btn-primary" : "btn"}
            style={{ ["--ac" as string]: "var(--bad)", flex: 1, minWidth: 0, opacity: oppEntry ? 1 : 0.45 }}
            disabled={!oppEntry}
            onClick={() => setBetSide(betSide === "opp" ? null : "opp")}
          >
            Back {oppEntry?.name ?? "opponent"}
          </button>
        </div>
        {betSide && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, width: "100%" }}>
            {[25, 50, 100].map((n) => (
              <button
                key={n}
                className={betAmt === n ? "btn btn-primary" : "btn"}
                style={{ ["--ac" as string]: "var(--gold)", flex: 1, minWidth: 0, opacity: crowns < n ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}
                disabled={crowns < n}
                onClick={() => setBetAmt(n)}
              >
                {n} <Cr />
              </button>
            ))}
          </div>
        )}

        <button className="btn btn-primary" style={{ ["--ac" as string]: GOLD, width: "100%", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={!opponent} onClick={onFight}>
          <FightIcon size={18} strokeWidth={2.2} />
          {opponent ? "Open the case" : "Pick who they face"}
          {betSide && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              (staking {betAmt} <Cr s={13} />)
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// In-bout strip: keeps the case + your stance on screen while the argument runs.
// Rendered inside MatchHud's column (not absolutely positioned) so the momentum
// meter stacks below it instead of painting over the quote.
export function TribunalMatchBanner({ proposition, myStance, isMobile }: { proposition: string; myStance: Stance; isMobile: boolean }) {
  return (
    <div
      className="panel"
      style={{
        ["--ac" as string]: GOLD,
        borderColor: GOLD,
        marginTop: 6,
        padding: isMobile ? "7px 11px" : "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        width: isMobile ? "92vw" : "min(560px, 90vw)",
        maxWidth: "94vw",
        marginInline: "auto",
      }}
    >
      <Scale size={isMobile ? 14 : 16} color={GOLD} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: isMobile ? 11 : 12,
            fontWeight: 700,
            fontStyle: "italic",
            lineHeight: 1.45,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          &ldquo;{proposition}&rdquo;
        </div>
      </div>
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <StanceTag stance={myStance} />
      </div>
    </div>
  );
}
