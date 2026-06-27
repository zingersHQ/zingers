"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useChampions } from "@/store/champions";
import { cardOf, type Card } from "@/lib/cards/card";
import { ROSTER } from "@/lib/engine/roster";
import { blank } from "@/lib/evolve/progression";
import { RECRUIT_COST } from "@/lib/economy";
import { ChampionCardFrame, FIRST_MIND_KEYS } from "@/components/collection/card-frame";
import { SeasonBanner } from "@/components/lore/season-banner";

export default function CollectionPage() {
  const progress = useChampions((s) => s.progress);
  const owned = useChampions((s) => s.owned);
  const roster = useChampions((s) => s.roster);
  const crowns = useChampions((s) => s.crowns);
  const recruit = useChampions((s) => s.recruit);
  // zustand-persist rehydrates from localStorage after mount; gate on it so the
  // server-rendered (seeded) cards don't flash-mismatch the player's real career.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cards = useMemo<Card[]>(
    () => FIRST_MIND_KEYS.filter((k) => ROSTER[k]).map((k) => cardOf(k, progress[k] || blank())),
    [progress],
  );

  const isRecruited = (key: string) => owned === key || roster.includes(key);
  const recruitedCount = mounted ? cards.filter((c) => isRecruited(c.key)).length : 0;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 100px" }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>The Collection</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          THE ART IS THE CAREER. IT EVOLVES AS YOU FIGHT
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 720, margin: "0 0 22px" }}>
        Every champion is a card. Its portrait is its body, and its body is a deterministic function of how it has
        fought, so a card you raise gets visibly stronger and stranger over time. Rarity is <em>earned</em>, never
        rolled — and so is ownership: recruit a mind with Crowns, then make it legend. More minds arrive each season as
        the Vault remembers them.
      </p>

      <div style={{ marginBottom: 22 }}>
        <SeasonBanner />
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16, letterSpacing: 1, display: "flex", gap: 18, flexWrap: "wrap" }}>
        <span>IN YOUR ROSTER · {mounted ? recruitedCount : "-"} / {FIRST_MIND_KEYS.length}</span>
        <span style={{ color: "var(--gold)" }}>◈ {mounted ? crowns.toLocaleString() : "-"} CROWNS</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
        {cards.map((c) => {
          const isOwned = mounted && owned === c.key;
          const mine = mounted && isRecruited(c.key);
          return (
            <Link
              key={c.key}
              href={`/champion/${c.key}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <ChampionCardFrame
                card={c}
                champion={progress[c.key] || blank()}
                owned={isOwned}
                compact
                footer={
                  mounted && !mine ? (
                    <RecruitButton onRecruit={() => recruit(c.key)} canAfford={crowns >= RECRUIT_COST} />
                  ) : mounted && !isOwned ? (
                    <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted2)", textAlign: "center", paddingTop: 4 }}>
                      IN ROSTER
                    </div>
                  ) : undefined
                }
              />
            </Link>
          );
        })}
      </div>
    </main>
  );
}

// A deterministic "recruit" purchase (not a roll). Lives inside the card's Link,
// so it must swallow the click to avoid navigating to the champion page.
function RecruitButton({ onRecruit, canAfford }: { onRecruit: () => Promise<boolean>; canAfford: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  return (
    <button
      type="button"
      className="btn"
      disabled={!canAfford || state === "loading"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canAfford || state === "loading") return;
        setState("loading");
        const ok = await onRecruit();
        setState(ok ? "idle" : "failed");
      }}
      style={{
        width: "100%",
        fontSize: 12,
        padding: "9px 12px",
        marginTop: 4,
        opacity: canAfford ? 1 : 0.5,
        cursor: canAfford ? "pointer" : "not-allowed",
      }}
    >
      {state === "loading"
        ? "Recruiting…"
        : state === "failed"
          ? "Couldn't recruit"
          : canAfford
            ? `Recruit · ◈ ${RECRUIT_COST}`
            : `Need ◈ ${RECRUIT_COST}`}
    </button>
  );
}
