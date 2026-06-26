"use client";
// The Reader's saga marker — a compact hub pill that keeps the player's personal
// story present without nagging. Collapsed it shows the current chapter + a thin
// progress bar; tapped it opens the standing stake, the next objective, and the
// act map so a player always knows where they are in the arc (lib/lore/saga.ts).
import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { useChampions } from "@/store/champions";
import { readerSaga, SAGA } from "@/lib/lore/saga";
import { ICON } from "@/lib/iconography";

export function ReaderThread({ isMobile }: { isMobile: boolean }) {
  const trainerXp = useChampions((s) => s.trainerXp);
  const [open, setOpen] = useState(false);
  const saga = readerSaga(trainerXp);
  const accent = ICON.accent;

  return (
    <div style={{ position: "relative", pointerEvents: "auto", width: "fit-content" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="panel"
        aria-label="Your saga"
        aria-expanded={open}
        style={{
          ["--ac" as string]: accent,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: isMobile ? "7px 10px" : "7px 11px",
          cursor: "pointer",
          borderColor: open ? accent : "var(--line)",
          touchAction: "manipulation",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: `${accent}22`, color: accent }}>
          <BookOpen size={13} strokeWidth={2.2} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, textAlign: "left", minWidth: isMobile ? 0 : 120 }}>
          <span className="mono" style={{ fontSize: 8, letterSpacing: 1, color: "var(--muted2)" }}>
            CH {saga.index + 1}/{saga.total} · ACT {saga.chapter.act}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 130 : 180 }}>
            {saga.chapter.title}
          </span>
          <span style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,.1)", marginTop: 4, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.round(saga.pct * 100)}%`, background: accent, transition: "width .5s" }} />
          </span>
        </span>
        <ChevronDown size={13} strokeWidth={2} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", opacity: 0.6, flexShrink: 0 }} />
      </button>

      {open && (
        <div className="panel pop" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, padding: 14, width: 288, maxWidth: "calc(100vw - 32px)", zIndex: 3 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: accent }}>
            ACT {saga.chapter.act} · {saga.chapter.actTitle.toUpperCase()}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3, lineHeight: 1.15 }}>{saga.chapter.title}</div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: "9px 0 0", fontStyle: "italic" }}>
            {saga.chapter.stake}
          </p>

          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)", margin: "14px 0 6px" }}>
            DO THIS NEXT
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, marginTop: 6, flexShrink: 0, boxShadow: `0 0 10px ${accent}` }} />
            <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45 }}>{saga.chapter.objective}</span>
          </div>

          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)", margin: "16px 0 7px" }}>
            THE ARC
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {SAGA.map((ch, i) => {
              const done = i < saga.index;
              const here = i === saga.index;
              return (
                <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 8, opacity: done ? 0.5 : here ? 1 : 0.4 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: here ? accent : done ? "var(--muted2)" : "transparent",
                      border: here || done ? "none" : "1px solid var(--line)",
                      boxShadow: here ? `0 0 10px ${accent}` : "none",
                    }}
                  />
                  <span style={{ fontSize: 11.5, fontWeight: here ? 700 : 500, color: here ? "var(--ink)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ch.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
