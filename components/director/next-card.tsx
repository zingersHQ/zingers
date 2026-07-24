"use client";
// The Director's two faces (docs/long-game.md §6, Stage 0).
//
//   <NextCard/> — the full ask, for a home surface: one line, one button, plus
//                 at most two smaller things to do today.
//   <NextLine/> — one compact line for a surface that already owns its buttons
//                 (the Flight outcome cards on both bodies).
//
// Both read the same directive, so a Trainer is never told two different things.
import { ChevronRight, Compass } from "lucide-react";

import type { Directive, DirectiveTarget } from "@/lib/director";
import { useDirective } from "@/components/director/use-directive";

export function NextCard({
  onGo,
  hideAlso,
}: {
  onGo?: (target: DirectiveTarget) => void;
  /** Drop smaller asks a surface already shows in full (e.g. the daily card). */
  hideAlso?: DirectiveTarget[];
}) {
  const plan = useDirective();
  if (!plan) return null;
  const { primary } = plan;
  const also = hideAlso?.length ? plan.also.filter((d) => !hideAlso.includes(d.target)) : plan.also;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={onGo ? () => onGo(primary.target) : undefined}
        className="panel"
        style={{
          ["--ac" as string]: "var(--accent)",
          width: "100%",
          textAlign: "left",
          padding: "14px 15px",
          cursor: onGo ? "pointer" : "default",
          border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--line))",
          background: "radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), var(--panel2, #12101c) 70%)",
        }}
      >
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: 1.6, color: "var(--accent)", fontWeight: 800 }}>
          <Compass size={12} strokeWidth={2.4} /> {primary.kicker}
        </div>
        <div style={{ fontSize: 17.5, fontWeight: 800, marginTop: 5, lineHeight: 1.25 }}>{primary.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.45 }}>{primary.detail}</div>

        {primary.progress && <ProgressBar at={primary.progress.at} of={primary.progress.of} />}

        {onGo && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              padding: "10px 18px",
              borderRadius: 11,
              background: "var(--accent)",
              color: "#0a0a12",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {primary.cta} <ChevronRight size={15} strokeWidth={2.6} />
          </div>
        )}
      </button>

      {also.length > 0 && (
        <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
          {also.map((d) => (
            <AlsoRow key={d.id} directive={d} onGo={onGo} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ at, of }: { at: number; of: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((at / Math.max(1, of)) * 100)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 10 }}>
      <span style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,.12)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 999 }} />
      </span>
      <span className="mono" style={{ flexShrink: 0, fontSize: 10, color: "var(--muted2)" }}>
        {at}/{of}
      </span>
    </div>
  );
}

function AlsoRow({ directive, onGo }: { directive: Directive; onGo?: (target: DirectiveTarget) => void }) {
  return (
    <button
      type="button"
      onClick={onGo ? () => onGo(directive.target) : undefined}
      className="panel"
      style={{
        ["--ac" as string]: "var(--gold)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 13px",
        textAlign: "left",
        cursor: onGo ? "pointer" : "default",
      }}
    >
      <span className="mono" style={{ flexShrink: 0, fontSize: 9, letterSpacing: 1.4, color: "var(--gold)", fontWeight: 800 }}>
        {directive.kicker}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{directive.title}</span>
        <span className="mono" style={{ display: "block", fontSize: 10.5, color: "var(--muted2)", marginTop: 1 }}>{directive.detail}</span>
      </span>
      {onGo && <ChevronRight size={15} strokeWidth={2.2} style={{ flexShrink: 0, color: "var(--muted2)" }} />}
    </button>
  );
}

/**
 * Compact directive for the Flight outcome cards — states the next milestone
 * without competing with Try again / Challenge a friend.
 */
export function NextLine({ accent = "var(--accent)" }: { accent?: string }) {
  const plan = useDirective();
  if (!plan) return null;
  const { primary } = plan;

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "9px 12px",
        borderRadius: 10,
        textAlign: "left",
        border: `1px solid color-mix(in srgb, ${accent} 40%, rgba(255,255,255,.08))`,
        background: "rgba(255,255,255,.03)",
      }}
    >
      <div className="mono" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, letterSpacing: 1.5, color: accent, fontWeight: 800 }}>
        <Compass size={11} strokeWidth={2.4} /> {primary.kicker}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 3, lineHeight: 1.3 }}>{primary.title}</div>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--muted, #9a96b8)", marginTop: 3, lineHeight: 1.45 }}>{primary.detail}</div>
    </div>
  );
}

export default NextCard;
