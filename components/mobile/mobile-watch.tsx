"use client";
// ─────────────────────────────────────────────────────────────────────────────
// M1 — the Watch tab (docs/mobile.md). The phone body of app/arena: the soul
// verb "two minds argue to a clear winner — and you have a stake."
//
// Flow collapses to one thumb: a matchup is dealt, you CALL the winner, you
// WATCH it argue (shared useBout/SSE, same engine the desktop arena uses), then
// the verdict lands and your prediction streak moves. "Deal another" reshuffles.
// Reuses predict/predictResult + recordBattle from the store so a watched bout
// still evolves the champions and marks the streak — nothing is a detached view.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Shuffle, Lock, Flame, Trophy, Mic } from "lucide-react";
import type { BattleEnd, Champion, RosterEntry, Style } from "@/lib/types";
import { TYPE_COLOR, blankStyle, accrue, dominant } from "@/lib/evolve/progression";
import { useChampions } from "@/store/champions";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar } from "@/components/champion-avatar";
import { MobileBoutStage } from "@/components/mobile/mobile-bout";
import { rewardSfx } from "@/lib/sfx";

type View = "call" | "bout" | "done";

function pickTwo(keys: string[]): [string, string] {
  const a = keys[Math.floor(Math.random() * keys.length)]!;
  let b = a;
  for (let g = 0; b === a && g < 30; g++) b = keys[Math.floor(Math.random() * keys.length)]!;
  return [a, b];
}

export function MobileWatch() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [aKey, setAKey] = useState<string>("");
  const [bKey, setBKey] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [pick, setPick] = useState<"a" | "b" | null>(null);
  const [view, setView] = useState<View>("call");
  const [resultMsg, setResultMsg] = useState<{ won: boolean } | null>(null);

  const bout = useBout();
  const get = useChampions((s) => s.get);
  const owned = useChampions((s) => s.owned);
  const predict = useChampions((s) => s.predict);
  const predictResult = useChampions((s) => s.predictResult);
  const recordBattle = useChampions((s) => s.recordBattle);
  const learnFromBout = useChampions((s) => s.learnFromBout);

  const historyRef = useRef(bout.history);
  historyRef.current = bout.history;

  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);
  const a = byKey[aKey];
  const b = byKey[bKey];

  const deal = useCallback(
    (rosterKeys: string[], tops: string[]) => {
      bout.stop();
      const [na, nb] = pickTwo(rosterKeys);
      setAKey(na);
      setBKey(nb);
      setTopic(tops[Math.floor(Math.random() * tops.length)] ?? "cereal is soup");
      setPick(null);
      setResultMsg(null);
      setView("call");
    },
    [bout],
  );

  useEffect(() => {
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d: { creatures: RosterEntry[]; topics: string[] }) => {
        setRoster(d.creatures);
        setTopics(d.topics);
        deal(d.creatures.map((c) => c.key), d.topics);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEnd = useCallback(
    (end: BattleEnd) => {
      const styles: Record<string, Style> = { [aKey]: blankStyle(), [bKey]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === aKey ? styles[aKey] : styles[bKey], turn);
      const loserKey = end.winner === aKey ? bKey : aKey;
      recordBattle(end.winner, loserKey, styles);
      // If the player's OWN champion was in this bout, its mind learns too — so
      // phone play grows memory + saga exactly like the desktop grounds do.
      if (owned && (owned === aKey || owned === bKey)) {
        const wonOwned = end.winner === owned;
        const oppKey = owned === aKey ? bKey : aKey;
        const dom = dominant(get(owned));
        learnFromBout({ key: owned, opponentName: byKey[oppKey]?.name || oppKey, won: wonOwned, axisLabel: dom.axis.label });
      }
      if (pick !== null) {
        const correct = (pick === "a" && end.winner === aKey) || (pick === "b" && end.winner === bKey);
        predictResult(correct);
        setResultMsg({ won: correct });
        rewardSfx(correct ? "big" : "small");
      }
      setView("done");
    },
    [aKey, bKey, pick, predictResult, recordBattle, owned, learnFromBout, get, byKey],
  );

  const start = useCallback(() => {
    if (!a || !b || !pick) return;
    setView("bout");
    bout.begin(`/api/battle?a=${aKey}&b=${bKey}&topic=${encodeURIComponent(topic)}`, onEnd);
  }, [a, b, pick, aKey, bKey, topic, bout, onEnd]);

  const acol = a ? TYPE_COLOR[a.type] : "#888";
  const bcol = b ? TYPE_COLOR[b.type] : "#888";

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 14px 24px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Eye size={20} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 20, fontWeight: 800 }}>Watch</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Pill icon={<Flame size={12} strokeWidth={2.4} />} label="STREAK" value={predict.streak} ac="var(--gold)" />
            <Pill icon={<Trophy size={12} strokeWidth={2.4} />} label="BEST" value={predict.best} ac="var(--good)" />
          </div>
        </div>

        {!a || !b ? (
          <div className="mono" style={{ textAlign: "center", color: "var(--muted2)", padding: 50 }}>dealing a matchup…</div>
        ) : view === "call" ? (
          <>
            <div className="panel" style={{ padding: 14, marginBottom: 12, textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 6 }}>THE PROPOSITION</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontStyle: "italic", lineHeight: 1.35 }}>&ldquo;{topic}&rdquo;</div>
            </div>

            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 8, textAlign: "center" }}>
              CALL THE WINNER
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <CallCard entry={a} champ={get(aKey)} col={acol} side="FOR" on={pick === "a"} onClick={() => setPick("a")} />
              <CallCard entry={b} champ={get(bKey)} col={bcol} side="AGAINST" on={pick === "b"} onClick={() => setPick("b")} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => deal(roster.map((r) => r.key), topics)}
                className="mono"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 16px", borderRadius: 12, border: "1px solid var(--line2)", background: "transparent", color: "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <Shuffle size={15} strokeWidth={2.2} /> Deal
              </button>
              <button
                type="button"
                disabled={!pick}
                onClick={start}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 18px", borderRadius: 12, border: "none", background: "var(--gold, #f5d020)", color: "#0a0a12", fontSize: 15, fontWeight: 800, cursor: pick ? "pointer" : "not-allowed", opacity: pick ? 1 : 0.45 }}
              >
                <Lock size={16} strokeWidth={2.4} /> Lock it in &amp; watch
              </button>
            </div>
            <p className="mono" style={{ textAlign: "center", fontSize: 10, color: "var(--muted2)", marginTop: 12, letterSpacing: 0.5 }}>
              CALL BEFORE YOU WATCH · A RIGHT CALL EXTENDS YOUR STREAK
            </p>
          </>
        ) : (
          <>
            <MobileBoutStage bout={bout} a={a} b={b} topic={topic} />
            {view === "done" && bout.end && (
              <Verdict end={bout.end} a={a} b={b} acol={acol} bcol={bcol} pick={pick} resultMsg={resultMsg} onAgain={() => deal(roster.map((r) => r.key), topics)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ icon, label, value, ac }: { icon: React.ReactNode; label: string; value: number; ac: string }) {
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 9, border: "1px solid var(--line2)", fontSize: 11 }}>
      <span style={{ color: ac, display: "inline-flex" }}>{icon}</span>
      <span style={{ fontWeight: 800, color: ac }}>{value}</span>
      <span style={{ color: "var(--muted2)", fontSize: 9, letterSpacing: 1 }}>{label}</span>
    </span>
  );
}

function CallCard({ entry, champ, col, side, on, onClick }: { entry: RosterEntry; champ: Champion; col: string; side: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel"
      style={{
        ["--ac" as string]: col,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        textAlign: "center",
        cursor: "pointer",
        borderColor: on ? col : "var(--line)",
        background: on ? `color-mix(in srgb, ${col} 14%, transparent)` : undefined,
        boxShadow: on ? `0 0 26px -12px ${col}` : "none",
      }}
    >
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: col }}>{side}</div>
      <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={92} />
      <div style={{ fontSize: 16, fontWeight: 700 }}>{entry.name}</div>
      <div className="mono" style={{ fontSize: 10, color: col }}>{entry.type}</div>
      <div className="mono" style={{ fontSize: 11, fontWeight: 800, color: on ? col : "var(--muted2)", marginTop: 2 }}>
        {on ? "✓ CALLED" : "TAP TO CALL"}
      </div>
    </button>
  );
}

function Verdict({
  end,
  a,
  b,
  acol,
  bcol,
  pick,
  resultMsg,
  onAgain,
}: {
  end: BattleEnd;
  a: RosterEntry;
  b: RosterEntry;
  acol: string;
  bcol: string;
  pick: "a" | "b" | null;
  resultMsg: { won: boolean } | null;
  onAgain: () => void;
}) {
  const winnerCol = end.winner === a.key ? acol : bcol;
  const correct = resultMsg?.won;
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.7)", backdropFilter: "blur(6px)", zIndex: 40, padding: 18 }}>
      <div className="panel pop" style={{ ["--ac" as string]: winnerCol, padding: 22, width: "min(360px, 90vw)", textAlign: "center", boxShadow: `0 0 70px -28px ${winnerCol}` }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>THE TRIBUNAL RULES</div>
        <div className="glow" style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 2px", color: winnerCol }}>{end.winner_name} wins</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>defeats {end.loser_name} · {end.rounds} rounds</div>
        {end.mvp.line && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Mic size={11} strokeWidth={2} /> DUNK OF THE MATCH · {end.mvp.dmg} DMG
            </div>
            <div style={{ fontStyle: "italic", fontSize: 13, lineHeight: 1.45 }}>&ldquo;{end.mvp.line}&rdquo;</div>
          </div>
        )}
        {pick !== null && resultMsg && (
          <div style={{ marginTop: 14, padding: "9px 12px", borderRadius: 10, border: `1px solid ${correct ? "var(--good)" : "var(--bad)"}`, color: correct ? "var(--good)" : "var(--bad)", fontWeight: 700, fontSize: 13 }}>
            {correct ? "✓ Right call — streak up!" : "✗ Wrong call — streak reset."}
          </div>
        )}
        <button
          type="button"
          onClick={onAgain}
          style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: winnerCol, color: "#0a0a12", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
        >
          <Shuffle size={16} strokeWidth={2.4} /> Deal another
        </button>
      </div>
    </div>
  );
}

export default MobileWatch;
