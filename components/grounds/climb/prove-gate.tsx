"use client";
// Altitude-gate interstitial fight — ≤20s prove beat (nail-it plan).
// Replaces "go raise elsewhere" with an in-Climb mock duel. Win unlocks Reach II+.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, SkipForward } from "lucide-react";
import type { BattleEnd, Style } from "@/lib/types";
import { blankStyle, accrue, dominant } from "@/lib/evolve/progression";
import { useChampions } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";
import { firstDuelOpponent } from "@/lib/first-duel";
import type { RosterEntry } from "@/lib/types";
import { useBout } from "@/components/arena/use-bout";
import { MobileBoutStage } from "@/components/mobile/mobile-bout";
import { rewardSfx } from "@/lib/sfx";
import { track as pingEvent } from "@/lib/track";

const AUTO_SKIP_MS = 18_000; // keep the beat short — skip-to-verdict if still live

export function ClimbProveGate({
  activeKey,
  accent,
  onWon,
  onClose,
}: {
  activeKey: string;
  accent: string;
  /** Called after a win is recorded so Climb can resume past the altitude key. */
  onWon: () => void;
  onClose: () => void;
}) {
  const bout = useBout();
  const recordBattle = useChampions((s) => s.recordBattle);
  const learnFromBout = useChampions((s) => s.learnFromBout);
  const get = useChampions((s) => s.get);
  const historyRef = useRef(bout.history);
  historyRef.current = bout.history;
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<"win" | "lose" | null>(null);
  const skipArmed = useRef(false);
  const seedRef = useRef(7);

  const oppKey = useMemo(() => {
    const roster = Object.entries(ROSTER).map(([key, r]) => ({ key, ...r })) as RosterEntry[];
    return firstDuelOpponent(activeKey, roster);
  }, [activeKey]);

  const a = ROSTER[activeKey];
  const b = ROSTER[oppKey];

  const onEnd = useCallback(
    (end: BattleEnd) => {
      const styles: Record<string, Style> = { [activeKey]: blankStyle(), [oppKey]: blankStyle() };
      for (const turn of historyRef.current) {
        accrue(turn.actor === activeKey ? styles[activeKey] : styles[oppKey], turn);
      }
      const won = end.winner === activeKey;
      const loser = won ? oppKey : activeKey;
      recordBattle(end.winner, loser, styles);
      if (won) {
        const dom = dominant(get(activeKey));
        learnFromBout({
          key: activeKey,
          opponentName: b?.name || oppKey,
          won: true,
          axisLabel: dom.axis.label,
        });
      }
      rewardSfx(won ? "big" : "small");
      setDone(won ? "win" : "lose");
      pingEvent(won ? "climb_prove_win" : "climb_prove_lose");
    },
    [activeKey, oppKey, recordBattle, learnFromBout, get, b?.name],
  );

  const begin = useCallback(() => {
    if (!a || !b || started) return;
    setStarted(true);
    pingEvent("climb_prove_start");
    bout.begin(`/api/battle?a=${activeKey}&b=${oppKey}&mock=1&seed=${seedRef.current}`, onEnd);
  }, [a, b, started, bout, activeKey, oppKey, onEnd]);

  useEffect(() => {
    begin();
  }, [begin]);

  // Cap watch time — skip to verdict so this stays an interstitial, not a sitcom.
  useEffect(() => {
    if (!started || done || bout.phase !== "live") return;
    const t = window.setTimeout(() => {
      if (skipArmed.current) return;
      skipArmed.current = true;
      bout.skipToVerdict();
    }, AUTO_SKIP_MS);
    return () => window.clearTimeout(t);
  }, [started, done, bout]);

  if (!a || !b) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "grid", placeItems: "center", background: "rgba(6,5,11,.85)" }}>
        <button type="button" onClick={onClose} className="mono" style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800 }}>
          Back to Climb
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", background: "rgba(6,5,11,.92)", backdropFilter: "blur(8px)" }}>
      <div style={{ padding: "14px 16px 8px", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: accent, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={12} strokeWidth={2.2} /> ALTITUDE PROVE
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 6 }}>Your mind must win to climb higher</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginTop: 4 }}>
          Short fight · then back to the sky
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 12px 12px" }}>
        {(bout.phase === "live" || bout.phase === "done") && (
          <MobileBoutStage
            a={{ key: activeKey, name: a.name, type: a.type }}
            b={{ key: oppKey, name: b.name, type: b.type }}
            bout={bout}
            topic="prove the higher sky"
          />
        )}
      </div>

      <div style={{ padding: "10px 16px calc(14px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 8 }}>
        {bout.phase === "live" && !done && (
          <button
            type="button"
            onClick={() => {
              skipArmed.current = true;
              bout.skipToVerdict();
            }}
            className="mono"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "transparent", color: "#e6e2f5", fontWeight: 800, cursor: "pointer", fontSize: 13 }}
          >
            <SkipForward size={15} strokeWidth={2.4} /> Skip to verdict
          </button>
        )}
        {done === "win" && (
          <button
            type="button"
            onClick={() => {
              rewardSfx("epic");
              onWon();
            }}
            style={{ padding: "14px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
          >
            Climb higher
          </button>
        )}
        {done === "lose" && (
          <>
            <button
              type="button"
              onClick={() => {
                setDone(null);
                skipArmed.current = false;
                bout.stop();
                seedRef.current = (Date.now() % 97) + 1;
                setStarted(false);
              }}
              style={{ padding: "14px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
            >
              Fight again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mono"
              style={{ padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "transparent", color: "#e6e2f5", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
            >
              Practice Reach I
            </button>
          </>
        )}
      </div>
    </div>
  );
}
