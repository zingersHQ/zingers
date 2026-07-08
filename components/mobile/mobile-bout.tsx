"use client";
// Shared vertical bout stage for the phone (docs/mobile.md M1). Renders a live
// bout as a top-to-bottom column — Fighter A, the "read" strip, Fighter B —
// instead of the desktop arena's side-by-side grid. Presentation only: it reads
// the same useBout() state the desktop arena watches (SSE-paced turns), so bout
// semantics are untouched.
import { Scale, Zap } from "lucide-react";
import type { CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { useChampions } from "@/store/champions";
import { ChampionAvatar } from "@/components/champion-avatar";
import type { useBout } from "@/components/arena/use-bout";

export interface FighterLite {
  key: string;
  name: string;
  type: CreatureType;
}

type GetFn = ReturnType<typeof useChampions.getState>["get"];

function Fighter({
  entry,
  col,
  hp,
  speaking,
  line,
  dmg,
  crit,
  get,
}: {
  entry: FighterLite;
  col: string;
  hp: number;
  speaking: boolean;
  line?: string;
  dmg?: number;
  crit?: boolean;
  get: GetFn;
}) {
  const low = hp > 0 && hp <= 25;
  return (
    <div
      className={speaking ? "panel speaker-pulse" : "panel"}
      style={{ ["--ac" as string]: col, padding: 12, position: "relative", overflow: "hidden", borderColor: speaking ? col : "var(--line)" }}
    >
      <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
        <ChampionAvatar ckey={entry.key} type={entry.type} champion={get(entry.key)} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
            <span className="mono" style={{ fontSize: 9, color: col, letterSpacing: 1 }}>{entry.type}</span>
          </div>
          <div style={{ marginTop: 7, height: 10, borderRadius: 7, background: "#241f33", overflow: "hidden", border: "1px solid #2a2738" }}>
            <div
              className={low ? "hp-low" : undefined}
              style={{ width: `${hp}%`, height: "100%", background: hp > 55 ? "var(--good)" : hp > 25 ? "var(--gold)" : "var(--bad)", transition: "width .6s cubic-bezier(.2,.8,.2,1)" }}
            />
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 3 }}>{hp} / 100 RESOLVE</div>
        </div>
        {dmg ? (
          <div className="dmg-float" key={`${hp}-${dmg}`} style={{ position: "absolute", top: 10, right: 12, color: crit ? "var(--gold)" : "var(--bad)", fontWeight: 700, fontSize: dmg >= 20 ? 26 : 20, textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>
            −{dmg}
          </div>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 10,
          minHeight: 40,
          padding: "9px 12px",
          borderRadius: 10,
          background: speaking ? `color-mix(in srgb, ${col} 14%, var(--panel2))` : "var(--panel2)",
          border: `1px solid ${speaking ? col : "var(--line)"}`,
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.4,
          color: speaking ? "var(--ink)" : "var(--muted2)",
          transition: "all .2s ease",
        }}
      >
        {speaking && line ? `“${line}”` : "…"}
      </div>
    </div>
  );
}

function ReadStrip({ bout, aKey, acol, bcol }: { bout: ReturnType<typeof useBout>; aKey: string; acol: string; bcol: string }) {
  const t = bout.turn;
  if (!t) {
    return (
      <div className="mono" style={{ textAlign: "center", fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", padding: "4px 0" }}>
        VS
      </div>
    );
  }
  const col = t.actor === aKey ? acol : bcol;
  return (
    <div className="panel pop" key={t.round} style={{ ["--ac" as string]: col, padding: "9px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <span className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--gold)" }}>R{t.round}</span>
      <span className="chip" style={{ borderColor: col, color: col, fontSize: 11 }}>{t.actor_name} → {t.move}</span>
      {t.info.crit && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}><Zap size={10} strokeWidth={2.4} /> HIGHLIGHT</span>}
      {t.info.se && <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)", fontSize: 10 }}>SUPER</span>}
      <span className="mono" style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--muted2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Scale size={10} strokeWidth={2} /> q{t.q.toFixed(2)}
      </span>
    </div>
  );
}

export function MobileBoutStage({ bout, a, b, topic }: { bout: ReturnType<typeof useBout>; a: FighterLite; b: FighterLite; topic: string }) {
  const get = useChampions((s) => s.get);
  const t = bout.turn;
  const acol = TYPE_COLOR[a.type];
  const bcol = TYPE_COLOR[b.type];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div className="panel" style={{ padding: "8px 14px", textAlign: "center" }}>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted2)", letterSpacing: 1 }}>PROPOSITION · </span>
        <span style={{ fontStyle: "italic", fontSize: 13 }}>&ldquo;{bout.start?.topic || topic}&rdquo;</span>
      </div>
      <Fighter entry={a} col={acol} hp={bout.hpA} speaking={t?.actor === a.key} line={t?.actor === a.key ? t?.line : undefined} dmg={t && t.opp === a.key ? t.dmg : undefined} crit={!!(t && t.opp === a.key && t.info.crit)} get={get} />
      <ReadStrip bout={bout} aKey={a.key} acol={acol} bcol={bcol} />
      <Fighter entry={b} col={bcol} hp={bout.hpB} speaking={t?.actor === b.key} line={t?.actor === b.key ? t?.line : undefined} dmg={t && t.opp === b.key ? t.dmg : undefined} crit={!!(t && t.opp === b.key && t.info.crit)} get={get} />
    </div>
  );
}
