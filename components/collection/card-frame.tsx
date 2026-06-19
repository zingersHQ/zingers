import type { CSSProperties, ReactNode } from "react";
import type { Card } from "@/lib/cards/card";
import type { Champion } from "@/lib/types";
import { ChampionPortrait } from "@/components/render/champion-portrait";
export { FIRST_MIND_KEYS, portraitOf } from "@/lib/cards/assets";

export function shareQuery(card: Card, brain = "House Grok") {
  const p = new URLSearchParams();
  p.set("sl", String(card.skillLevel));
  p.set("sk", String(card.skills.length));
  p.set("lv", String(card.level));
  p.set("t", card.tier);
  p.set("d", card.doctrine);
  p.set("w", String(card.wins));
  p.set("l", String(card.losses));
  p.set("ra", card.rarityLabel);
  p.set("b", brain);
  return p.toString();
}

export function roman(n: number) {
  return "I".repeat(Math.max(1, n));
}

export function ChampionCardFrame({
  card,
  champion,
  owned = false,
  compact = false,
  footer,
  style,
}: {
  card: Card;
  champion: Champion;
  owned?: boolean;
  compact?: boolean;
  footer?: ReactNode;
  style?: CSSProperties;
}) {
  const hasRecord = card.battles > 0;
  const wr = card.battles ? Math.round((card.wins / card.battles) * 100) : 0;

  return (
    <article
      className="panel"
      style={{
        ["--ac" as string]: card.rarityHex,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        color: "inherit",
        border: `1px solid ${card.rarityHex}55`,
        boxShadow: owned ? `0 0 34px -12px ${card.rarityHex}` : undefined,
        ...style,
      }}
    >
      <div style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", background: "#0a0812" }}>
        <ChampionPortrait rosterKey={card.key} type={card.type} champion={champion} preset="portrait" eager />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(8,6,16,.92) 100%)" }} />
        <Badge left color={card.force.hex}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>{card.force.sigil}</span>
          {card.force.inWorld.replace(/^The /, "").toUpperCase()}
        </Badge>
        <Badge color={card.rarityHex} filled>
          {card.rarityLabel.toUpperCase()}
        </Badge>
        {owned && (
          <div className="mono" style={{ position: "absolute", bottom: 10, right: 10, background: "var(--gold)", color: "#0a0812", borderRadius: 6, padding: "2px 7px", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
            YOURS
          </div>
        )}
      </div>

      <div style={{ padding: compact ? "14px 14px 16px" : "18px 18px 20px", display: "flex", flexDirection: "column", gap: compact ? 10 : 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: compact ? 19 : 28, fontWeight: 800, letterSpacing: 0.5 }}>{card.name}</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>{hasRecord ? `LV ${card.level}` : "UNFOUGHT"}</span>
        </div>
        <div className="mono" style={{ fontSize: compact ? 11 : 12, color: card.force.hex, marginTop: -4 }}>
          {card.tier} · {card.doctrine}
        </div>

        {card.sigils.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {card.sigils.map((s) => (
              <span key={s.axis} title={`${s.label} ${roman(s.lvl)}`} className="mono" style={{ fontSize: 10, color: s.color, border: `1px solid ${s.color}55`, borderRadius: 6, padding: "2px 6px", display: "inline-flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>{s.glyph}</span>
                {roman(s.lvl)}
              </span>
            ))}
          </div>
        )}

        <div className="mono" style={{ fontSize: compact ? 10 : 11, color: "var(--muted)", lineHeight: 1.5 }}>
          {card.abilities.map((a) => (a.finisher ? `★ ${a.name}` : a.name)).join(" · ")}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: compact ? 10 : 12 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted2)" }}>
            {hasRecord ? `${card.wins}W·${card.losses}L · ${wr}%` : "no bouts yet"}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="mono" style={{ fontSize: 8, letterSpacing: 1, color: "var(--muted2)" }}>SL</span>
            <span style={{ fontSize: compact ? 16 : 20, fontWeight: 700, color: "var(--gold)" }}>{card.skillLevel}</span>
          </span>
        </div>
        {footer}
      </div>
    </article>
  );
}

function Badge({ children, color, left, filled }: { children: ReactNode; color: string; left?: boolean; filled?: boolean }) {
  return (
    <div
      className="mono"
      style={{
        position: "absolute",
        top: 10,
        [left ? "left" : "right"]: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: filled ? color : "rgba(8,6,16,.6)",
        border: filled ? "none" : `1px solid ${color}`,
        color: filled ? "#0a0812" : color,
        borderRadius: 8,
        padding: "4px 8px",
        fontSize: 10,
        fontWeight: filled ? 700 : undefined,
        letterSpacing: 1,
        backdropFilter: filled ? undefined : "blur(4px)",
      }}
    >
      {children}
    </div>
  );
}
