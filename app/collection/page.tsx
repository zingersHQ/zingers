"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useChampions } from "@/store/champions";
import { cardOf, type Card } from "@/lib/cards/card";
import { ROSTER } from "@/lib/engine/roster";
import { blank } from "@/lib/evolve/progression";
import { trainerLevel } from "@/lib/evolve/trainer";
import { recruitSlotsOpen } from "@/lib/unlock-ladder";
import { RECRUIT_COST } from "@/lib/economy";
import { ChampionCardFrame, DEX_MIND_KEYS } from "@/components/collection/card-frame";
import { SeasonBanner } from "@/components/lore/season-banner";
import { GalleryPager } from "@/components/bible/gallery-pager";

export default function CollectionPage() {
  const progress = useChampions((s) => s.progress);
  const owned = useChampions((s) => s.owned);
  const roster = useChampions((s) => s.roster);
  const crowns = useChampions((s) => s.crowns);
  const trainerXp = useChampions((s) => s.trainerXp);
  const recruit = useChampions((s) => s.recruit);
  // zustand-persist rehydrates from localStorage after mount; gate on it so the
  // server-rendered (seeded) cards don't flash-mismatch the player's real career.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cards = useMemo<Card[]>(
    () => DEX_MIND_KEYS.filter((k) => ROSTER[k]).map((k) => cardOf(k, progress[k] || blank())),
    [progress],
  );

  const isRecruited = (key: string) => owned === key || roster.includes(key);
  const recruitedCount = mounted ? cards.filter((c) => isRecruited(c.key)).length : 0;
  const slots = recruitSlotsOpen(trainerLevel(trainerXp).level);
  const rosterFull = recruitedCount >= slots;
  const nextSlotRank = slots < 3 ? (slots < 2 ? 6 : 8) : null;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 100px" }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>The Collection</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          THE ART IS THE CAREER. IT EVOLVES AS YOU FIGHT
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 720, margin: "0 0 22px" }}>
        Every champion is a card. Eight First Minds are the archetypes; the growing dex are lineage echoes.
        Portraits are bodies, and bodies change with career. Rarity is earned, never rolled. Recruit with Crowns,
        then make it legend.
      </p>

      <div style={{ marginBottom: 22 }}>
        <SeasonBanner />
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16, letterSpacing: 1, display: "flex", gap: 18, flexWrap: "wrap" }}>
        <span>IN YOUR ROSTER · {mounted ? recruitedCount : "-"} / {mounted ? slots : "-"}</span>
        <span style={{ color: "var(--gold)" }}>◈ {mounted ? crowns.toLocaleString() : "-"} CROWNS</span>
        {mounted && nextSlotRank && (
          <span>NEXT SLOT · TRAINER RANK {nextSlotRank}</span>
        )}
      </div>

      {/* Page so only a few WebGL portraits mount (same floor as bible gallery). */}
      <GalleryPager
        label="collection"
        minCol={280}
        items={cards.map((c) => {
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
                    <RecruitButton
                      onRecruit={() => recruit(c.key)}
                      canAfford={crowns >= RECRUIT_COST}
                      locked={rosterFull}
                      lockHint={nextSlotRank ? `Trainer rank ${nextSlotRank}` : "Roster full"}
                    />
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
      />
    </main>
  );
}

// A deterministic "recruit" purchase (not a roll). Lives inside the card's Link,
// so it must swallow the click to avoid navigating to the champion page.
function RecruitButton({
  onRecruit,
  canAfford,
  locked,
  lockHint,
}: {
  onRecruit: () => Promise<boolean>;
  canAfford: boolean;
  locked?: boolean;
  lockHint?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const open = !locked && canAfford;
  return (
    <button
      type="button"
      className="btn"
      disabled={!open || state === "loading"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!open || state === "loading") return;
        setState("loading");
        const ok = await onRecruit();
        setState(ok ? "idle" : "failed");
      }}
      style={{
        width: "100%",
        fontSize: 12,
        padding: "9px 12px",
        marginTop: 4,
        opacity: open ? 1 : 0.5,
        cursor: open ? "pointer" : "not-allowed",
      }}
    >
      {state === "loading"
        ? "Recruiting…"
        : state === "failed"
          ? "Couldn't recruit"
          : locked
            ? lockHint ?? "Roster locked"
            : canAfford
              ? `Recruit · ◈ ${RECRUIT_COST}`
              : `Need ◈ ${RECRUIT_COST}`}
    </button>
  );
}
