"use client";
// The Rival's standing presence in the Concord — a face on the other side of the
// saga. Shows who they are, the running head-to-head, a one-line jab tuned to the
// record, and the button to call them out (lib/lore/rival.ts).
import { Swords } from "lucide-react";
import { ChampionPortrait } from "@/components/render/champion-portrait";
import { showcaseChampion } from "@/lib/render/showcase";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import type { Rival, RivalMemory } from "@/lib/lore/rival";
import { rivalStance } from "@/lib/lore/rival";

const JAB: Record<ReturnType<typeof rivalStance>, string> = {
  first: "We haven't met. Let's fix that.",
  even: "Dead even. One of us breaks the tie today.",
  ahead: "You're ahead — I'm done letting that stand.",
  behind: "Still chasing me? Adorable.",
  grudge: "Same two Readers, every season. Let's go.",
};

export function RivalCard({ rival, memory, onFace }: { rival: Rival; memory: RivalMemory; onFace: () => void }) {
  const col = TYPE_COLOR[rival.force];
  const show = showcaseChampion(rival.champion);
  const stance = rivalStance(memory);

  return (
    <div
      className="panel"
      style={{ ["--ac" as string]: col, display: "flex", alignItems: "center", gap: 11, padding: 10, width: 300, maxWidth: "calc(100vw - 32px)", pointerEvents: "auto" }}
    >
      <div style={{ width: 52, height: 52, borderRadius: 11, overflow: "hidden", border: `1px solid ${col}88`, boxShadow: `0 0 20px -8px ${col}`, flexShrink: 0 }}>
        <ChampionPortrait rosterKey={show.key} type={rival.force} champion={show.champion} preset="portrait" colorHex={col} eager />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="mono" style={{ fontSize: 8, letterSpacing: 1.4, color: col }}>
          RIVAL READER {memory.met ? `· ${memory.wins}–${memory.losses}` : ""}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {rival.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.35, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          &ldquo;{JAB[stance]}&rdquo;
        </div>
      </div>
      <button
        type="button"
        onClick={onFace}
        className="btn btn-primary"
        style={{ ["--ac" as string]: col, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", fontSize: 12, flexShrink: 0 }}
      >
        <Swords size={13} strokeWidth={2.2} /> Face
      </button>
    </div>
  );
}
