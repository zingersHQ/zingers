"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Today tab — the phone home / hub (docs/mobile.md, redesigned Jul 2026).
//
// The home is now a HUB, not the daily quiz: your living champion is the center
// of gravity, and the day's Tribunal is one legible card that pushes into the
// call → watch → share sub-flow. Climb + Watch are one-tap tiles so the game's
// most-legible surfaces aren't buried. Reuses /api/daily, useBout/SSE, and
// recordDaily from the store; the predict/bout/done views are unchanged, just
// moved behind the hub instead of being the landing screen.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Flame, Mic, Share2, RotateCcw, ChevronRight, ChevronLeft, Shield, Swords, Eye, Rocket, Sparkles, ArrowUpCircle, ChevronsUp, Dumbbell, KeyRound, DoorOpen, Award, BookOpen, Settings as SettingsIcon } from "lucide-react";
import type { BattleEnd, BattleTurn, CareerEvent, Champion, DailyResponse, DailyResult } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { BRAND } from "@/lib/brand";
import { ROSTER } from "@/lib/engine/roster";
import { championHomecoming, type HomecomingMood } from "@/lib/lore/character-beats";
import { readerSaga, SAGA } from "@/lib/lore/saga";
import { useChampions } from "@/store/champions";
import { useSettings } from "@/store/settings";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar, doctrineLabel } from "@/components/champion-avatar";
import { NextCard } from "@/components/director/next-card";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { MobileBoutStage } from "@/components/mobile/mobile-bout";
import { LocaleDropdown } from "@/components/locale-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientToggle } from "@/components/grounds/ambience";
import { SettingsOverlay } from "@/components/grounds/settings-overlay";

type View = "hub" | "predict" | "bout" | "done";

function shareText(r: DailyResult, streak: number, best: number): string {
  const w = r.winnerCorrect ? "✓" : "✗";
  const d = r.dunkCorrect == null ? "—" : r.dunkCorrect ? "✓" : "✗";
  return [
    `Zingers Daily #${r.day}`,
    `Winner ${w} · Dunk ${d}`,
    `streak ${streak} · best ${best}`,
    BRAND.site.replace(/^https?:\/\//, ""),
  ].join("\n");
}

export function MobileToday({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [plan, setPlan] = useState<DailyResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [winnerPick, setWinnerPick] = useState<"a" | "b" | null>(null);
  const [dunkPick, setDunkPick] = useState<"a" | "b" | null>(null);
  const [view, setView] = useState<View>("hub");

  const bout = useBout();
  const get = useChampions((s) => s.get);
  const daily = useChampions((s) => s.daily);
  const recordDaily = useChampions((s) => s.recordDaily);
  const owned = useChampions((s) => s.owned);
  const events = useChampions((s) => s.events);
  const touchVisit = useChampions((s) => s.touchVisit);

  // Snapshot when the player LAST looked, once, before we stamp "now" — this is
  // the window the Homecoming greeting + Report read to say "while you were away".
  const [sinceVisit] = useState(() => (typeof window === "undefined" ? 0 : useChampions.getState().lastVisit));
  useEffect(() => {
    touchVisit();
  }, [touchVisit]);

  // The champion's own events since the last visit → drives the greeting mood
  // and the Report digest. Purely local + instant; no network on the hot path.
  const homecoming = useMemo(() => {
    if (!owned) return null;
    const list = events[owned] || [];
    const since = list.filter((e) => e.ts > sinceVisit).sort((a, b) => b.ts - a.ts);
    const bouts = since.filter((e) => e.kind === "bout");
    const wins = bouts.filter((e) => e.won).length;
    const losses = bouts.filter((e) => e.won === false).length;
    const daysAway = sinceVisit ? Math.floor((Date.now() - sinceVisit) / 86_400_000) : 0;
    const mood: HomecomingMood = daysAway >= 3 ? "away" : wins >= 2 && wins > losses ? "hot" : losses >= 2 && losses > wins ? "cold" : "return";
    const latest = list.length ? list[list.length - 1] : null;
    return { line: championHomecoming(owned, mood), since, wins, losses, latest };
  }, [owned, events, sinceVisit]);

  const historyRef = useRef<BattleTurn[]>([]);
  historyRef.current = bout.history;
  const pickRef = useRef<{ winner: "a" | "b" | null; dunk: "a" | "b" | null }>({ winner: null, dunk: null });
  pickRef.current = { winner: winnerPick, dunk: dunkPick };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    fetch("/api/daily").then((r) => r.json()).then(setPlan).catch(() => {});
  }, []);

  const solvedToday = mounted && plan != null && daily.result != null && daily.result.day === plan.day;

  const boutUrl = plan ? `/api/battle?a=${plan.a.key}&b=${plan.b.key}&topic=${encodeURIComponent(plan.topic)}&seed=${plan.seed}&mock=1` : "";

  const onEnd = useCallback(
    (end: BattleEnd) => {
      if (!plan) return;
      const hist = historyRef.current;
      let best = { dmg: -1, key: end.winner, line: end.mvp.line, name: end.winner_name };
      for (const t of hist) if (t.dmg > best.dmg) best = { dmg: t.dmg, key: t.actor, line: t.line, name: t.actor_name };
      const { winner, dunk } = pickRef.current;
      const pickedWinnerKey = winner === "a" ? plan.a.key : winner === "b" ? plan.b.key : null;
      const result: DailyResult = {
        day: plan.day,
        winnerCorrect: pickedWinnerKey === end.winner,
        dunkCorrect: dunk == null ? null : (dunk === "a" ? plan.a.key : plan.b.key) === best.key,
        winnerKey: end.winner,
        winnerName: end.winner_name,
        dunkName: best.name,
        dunkLine: best.line,
      };
      recordDaily(result);
      setView("done");
    },
    [plan, recordDaily],
  );

  const startBout = useCallback(() => {
    if (!plan || !winnerPick) return;
    setView("bout");
    bout.begin(boutUrl, onEnd);
  }, [plan, winnerPick, bout, boutUrl, onEnd]);

  const replay = useCallback(() => {
    if (!plan) return;
    setView("bout");
    bout.begin(boutUrl, () => setView("done"));
  }, [plan, bout, boutUrl]);

  const acol = plan ? TYPE_COLOR[plan.a.type] : "#888";
  const bcol = plan ? TYPE_COLOR[plan.b.type] : "#888";

  // The daily call → watch → share sub-flow, pushed on top of the hub.
  if (view !== "hub") {
    return (
      <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 14px 24px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => setView("hub")}
            className="mono"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--muted2)", fontSize: 12, cursor: "pointer", marginBottom: 8, padding: "4px 0" }}
          >
            <ChevronLeft size={15} strokeWidth={2.4} /> Home
          </button>

          {!plan || !mounted ? (
            <div className="mono" style={{ textAlign: "center", color: "var(--muted2)", padding: 50 }}>loading today&apos;s fight…</div>
          ) : view === "predict" ? (
            <Predict plan={plan} get={get} acol={acol} bcol={bcol} winnerPick={winnerPick} setWinnerPick={setWinnerPick} dunkPick={dunkPick} setDunkPick={setDunkPick} onStart={startBout} onNavigate={onNavigate} />
          ) : view === "bout" ? (
            <MobileBoutStage bout={bout} a={plan.a} b={plan.b} topic={plan.topic} />
          ) : (
            <Done plan={plan} get={get} result={daily.result} streak={daily.streak} best={daily.best} onReplay={replay} onNavigate={onNavigate} />
          )}
        </div>
      </div>
    );
  }

  return (
    <Hub
      mounted={mounted}
      owned={owned}
      get={get}
      streak={daily.streak}
      plan={plan}
      solvedToday={!!solvedToday}
      result={daily.result}
      homecoming={homecoming}
      onOpenDaily={() => setView(solvedToday ? "done" : "predict")}
      onNavigate={onNavigate}
    />
  );
}

interface Homecoming {
  line: string;
  since: CareerEvent[];
  wins: number;
  losses: number;
  latest: CareerEvent | null;
}

// ─── the hub (home) ──────────────────────────────────────────────────────────

function Hub({
  mounted,
  owned,
  get,
  streak,
  plan,
  solvedToday,
  result,
  homecoming,
  onOpenDaily,
  onNavigate,
}: {
  mounted: boolean;
  owned: string | null;
  get: (k: string) => Champion;
  streak: number;
  plan: DailyResponse | null;
  solvedToday: boolean;
  result: DailyResult | null;
  homecoming: Homecoming | null;
  onOpenDaily: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const t = useTranslations("mobile");
  const router = useRouter();
  const trainerXp = useChampions((s) => s.trainerXp);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saga = readerSaga(trainerXp);

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 22 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* top bar — wordmark + prefs + streak. Grounds stay desktop-gated. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 14px 10px" }}>
          <span className="glow" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5, color: "var(--accent)" }}>
            {BRAND.name ?? "Zingers"}
          </span>
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <LocaleDropdown variant="hub" />
            <ThemeToggle variant="compact" />
            <AmbientToggle compact />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="panel"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 0, cursor: "pointer" }}
            >
              <SettingsIcon size={15} />
            </button>
            <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 10, border: "1px solid var(--line2)", fontSize: 12 }}>
              <Flame size={13} strokeWidth={2.4} style={{ color: "var(--gold)" }} />
              <span style={{ fontWeight: 800, color: "var(--gold)" }}>{mounted ? streak : 0}</span>
              <span style={{ color: "var(--muted2)", fontSize: 9, letterSpacing: 1 }}>{t("streak")}</span>
            </span>
          </div>
        </div>

        {/* homecoming: your champion greets you the moment you open the app */}
        {mounted && owned && ROSTER[owned] && homecoming && (
          <div style={{ padding: "0 14px 4px" }}>
            <HomecomingCard owned={owned} get={get} line={homecoming.line} />
          </div>
        )}

        {/* hero: your living champion, full-bleed scene (or the adopt cold-start) */}
        {mounted && owned && ROSTER[owned] ? (
          <ChampionHero owned={owned} get={get} onNavigate={onNavigate} />
        ) : mounted ? (
          <AdoptHero onNavigate={onNavigate} />
        ) : (
          <div style={{ height: "clamp(280px, 44vh, 360px)" }} />
        )}

        <div style={{ padding: "12px 14px 0" }}>
          {/* the Director — phone-native targets only (no /grounds dump) */}
          <NextCard
            hideAlso={["daily", "hub"]}
            onGo={(target) => {
              if (target === "daily") onOpenDaily();
              else if (target === "flight") onNavigate?.("climb");
              else if (target === "collection") {
                if (owned && ROSTER[owned]) router.push(`/champion/${owned}`);
                else onNavigate?.("champion");
              }
              else if (target === "claim") onNavigate?.("rank");
              else if (target === "hub") onNavigate?.("champion");
              else if (target === "train" || target === "champion") onNavigate?.("champion");
            }}
          />

          {/* Saga — same spine as desktop Player Hub */}
          <div className="panel" style={{ ["--ac" as string]: "#cdb8ff", padding: "12px 13px", marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: "color-mix(in srgb, #cdb8ff 16%, transparent)", color: "#cdb8ff" }}>
                <BookOpen size={15} />
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>Saga</div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 0.8, color: "var(--muted2)" }}>
                  CHAPTER {saga.index + 1}/{saga.total} · ACT {saga.chapter.act}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{saga.chapter.title}</div>
            <p style={{ fontSize: 11.5, color: "var(--muted)", fontStyle: "italic", margin: "5px 0 0", lineHeight: 1.45 }}>{saga.chapter.stake}</p>
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 9 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#cdb8ff", marginTop: 5, flexShrink: 0, boxShadow: "0 0 8px #cdb8ff" }} />
              <span style={{ fontSize: 12, lineHeight: 1.4 }}>{saga.chapter.objective}</span>
            </div>
            <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,.09)", marginTop: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(saga.pct * 100)}%`, background: "#cdb8ff", transition: reduceMotion ? "none" : "width .5s" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
              {SAGA.map((ch, i) => (
                <span key={ch.id} title={ch.title} style={{ width: 9, height: 9, borderRadius: "50%", background: i === saga.index ? "#cdb8ff" : i < saga.index ? "var(--muted2)" : "transparent", border: i <= saga.index ? "none" : "1px solid var(--line)", boxShadow: i === saga.index ? "0 0 8px #cdb8ff" : "none" }} />
              ))}
            </div>
          </div>

          {/* the Report — what happened to your champion while you were away */}
          {mounted && owned && ROSTER[owned] && homecoming && (
            <ReportCard owned={owned} homecoming={homecoming} onNavigate={onNavigate} />
          )}

          {/* today's tribunal — one legible card into the call/watch flow */}
          <TribunalCard plan={plan} get={get} mounted={mounted} solvedToday={solvedToday} result={result} onOpen={onOpenDaily} />

          {/* the two most-legible surfaces, one tap each */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <Tile
              title={t("tileFlight")}
              sub={t("tileFlightSub")}
              icon={<Rocket size={20} strokeWidth={2.2} />}
              col="var(--accent)"
              onClick={() => onNavigate?.("climb")}
            />
            <Tile
              title={t("tileWatch")}
              sub={t("tileWatchSub")}
              icon={<Eye size={20} strokeWidth={2.2} />}
              col="var(--gold)"
              onClick={() => onNavigate?.("watch")}
            />
          </div>
        </div>
      </div>

      <SettingsOverlay
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenControls={() => setSettingsOpen(false)}
        hasPad={false}
      />
    </div>
  );
}

function HomecomingCard({ owned, get, line }: { owned: string; get: (k: string) => Champion; line: string }) {
  const type = ROSTER[owned].type;
  const col = TYPE_COLOR[type];
  return (
    <div className="panel" style={{ ["--ac" as string]: col, display: "flex", gap: 11, alignItems: "center", padding: "11px 13px", border: `1px solid color-mix(in srgb, ${col} 35%, var(--line))` }}>
      <ChampionAvatar ckey={owned} type={type} champion={get(owned)} size={40} />
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.4, color: col }}>{ROSTER[owned].name.toUpperCase()}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink)", fontStyle: "italic" }}>&ldquo;{line}&rdquo;</div>
      </div>
    </div>
  );
}

const REPORT_ICON: Partial<Record<CareerEvent["kind"], typeof Swords>> = {
  bout: Swords,
  levelup: ArrowUpCircle,
  tierup: ChevronsUp,
  trial: Award,
  train: Dumbbell,
  keeper: KeyRound,
  season: DoorOpen,
};

function reportRel(ts: number): string {
  const d = Date.now() - ts;
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return "recent";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ReportCard({ owned, homecoming, onNavigate }: { owned: string; homecoming: Homecoming; onNavigate?: (tab: string) => void }) {
  const t = useTranslations("mobile");
  const type = ROSTER[owned].type;
  const col = TYPE_COLOR[type];
  const { since, wins, losses, latest } = homecoming;
  const shown = since.slice(0, 4);
  const quiet = since.length === 0;
  return (
    <button
      type="button"
      onClick={() => onNavigate?.("champion")}
      className="panel"
      style={{ ["--ac" as string]: col, width: "100%", textAlign: "left", padding: "13px 14px", cursor: "pointer", marginBottom: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: "var(--muted2)" }}>{quiet ? t("whileAway") : t("sinceLooked")}</span>
        {!quiet && (wins > 0 || losses > 0) && (
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800 }}>
            <span style={{ color: "var(--good)" }}>{wins}W</span>
            <span style={{ color: "var(--muted2)" }}> · </span>
            <span style={{ color: "var(--bad)" }}>{losses}L</span>
          </span>
        )}
        <ChevronRight size={14} strokeWidth={2.2} style={{ color: "var(--muted2)", marginLeft: (wins || losses) && !quiet ? 4 : "auto" }} />
      </div>

      {quiet ? (
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 7, lineHeight: 1.45 }}>
          {latest
            ? t("restsBetween", { name: ROSTER[owned].name, title: latest.title })
            : t("readyNothing", { name: ROSTER[owned].name })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
          {shown.map((ev) => {
            const Icon = REPORT_ICON[ev.kind] ?? Sparkles;
            const tint = ev.kind === "bout" ? (ev.won ? "var(--good)" : "var(--bad)") : ev.kind === "tierup" || ev.kind === "trial" ? col : "var(--muted2)";
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                <Icon size={13} strokeWidth={2.2} style={{ color: tint, flexShrink: 0 }} />
                <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted2)", flexShrink: 0 }}>{reportRel(ev.ts)}</span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

function ChampionHero({ owned, get, onNavigate }: { owned: string; get: (k: string) => Champion; onNavigate?: (tab: string) => void }) {
  const t = useTranslations("mobile");
  const type = ROSTER[owned].type;
  const champ = get(owned);
  const dl = doctrineLabel(champ);
  const col = TYPE_COLOR[type];
  const pct = Math.round((dl.into / Math.max(1, dl.span)) * 100);
  const nearEvolve = pct >= 85;
  return (
    <button
      type="button"
      onClick={() => onNavigate?.("champion")}
      aria-label={`${ROSTER[owned].name}, open your champion`}
      style={{
        ["--ac" as string]: col,
        position: "relative",
        display: "block",
        width: "100%",
        height: "clamp(300px, 46vh, 380px)",
        padding: 0,
        border: "none",
        borderBottom: `1px solid color-mix(in srgb, ${col} 40%, var(--line))`,
        background: "#06050e",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* full-bleed live scene (the vignette stage set) */}
      <ChampionPortraitScene type={type} champion={champ} preset="region" identityKey={owned} animMode="breathing" stage scale={0.74} />

      {/* legibility scrim + gamified identity strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "56px 16px 14px",
          textAlign: "left",
          background: "linear-gradient(to top, #06050e 16%, rgba(6,5,14,.72) 46%, transparent)",
          pointerEvents: "none",
        }}
      >
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.8, color: "var(--muted2)" }}>{t("yourChampion")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
          <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{ROSTER[owned].name}</span>
          {nearEvolve && (
            <span className="glow" style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, color: "#0a0a12", background: col, padding: "3px 8px", borderRadius: 999 }}>
              {t("readyToEvolve")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <span className="mono" style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: col, padding: "3px 9px", borderRadius: 999, border: `1px solid ${col}` }}>
            {type} · L{dl.level} {dl.tier.toUpperCase()}
          </span>
          <span style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,.12)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${pct}%`, background: col, borderRadius: 999 }} />
          </span>
          <span className="mono" style={{ flexShrink: 0, fontSize: 9.5, color: "var(--muted2)" }}>{pct}%</span>
        </div>
      </div>
    </button>
  );
}

function AdoptHero({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const t = useTranslations("mobile");
  return (
    <button
      type="button"
      onClick={() => onNavigate?.("champion")}
      style={{
        ["--ac" as string]: "var(--accent)",
        position: "relative",
        display: "grid",
        placeItems: "center",
        gap: 8,
        width: "100%",
        height: "clamp(280px, 42vh, 360px)",
        padding: "24px 20px",
        border: "none",
        borderBottom: "1px solid color-mix(in srgb, var(--accent) 40%, var(--line))",
        background: "radial-gradient(120% 80% at 50% 24%, color-mix(in srgb, var(--accent) 18%, transparent), #06050e 76%)",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", background: "var(--panel2, #15131f)", boxShadow: "0 0 50px -18px var(--accent)" }}>
          <Sparkles size={30} strokeWidth={2} style={{ color: "var(--accent)" }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{t("meetTitle")}</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 280, lineHeight: 1.5 }}>
          {t("meetBody")}
        </div>
        <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, color: "var(--accent)", fontSize: 14, fontWeight: 800 }}>
          {t("chooseYours")} <ChevronRight size={16} strokeWidth={2.6} />
        </div>
      </div>
    </button>
  );
}

function TribunalCard({
  plan,
  get,
  mounted,
  solvedToday,
  result,
  onOpen,
}: {
  plan: DailyResponse | null;
  get: (k: string) => Champion;
  mounted: boolean;
  solvedToday: boolean;
  result: DailyResult | null;
  onOpen: () => void;
}) {
  const t = useTranslations("mobile");
  const ready = plan != null && mounted;
  const acol = plan ? TYPE_COLOR[plan.a.type] : "#888";
  const bcol = plan ? TYPE_COLOR[plan.b.type] : "#888";
  return (
    <button
      type="button"
      onClick={ready ? onOpen : undefined}
      className="panel"
      disabled={!ready}
      style={{
        ["--ac" as string]: "var(--gold)",
        width: "100%",
        padding: "14px 14px 15px",
        cursor: ready ? "pointer" : "default",
        textAlign: "center",
        border: "1px solid color-mix(in srgb, var(--gold) 45%, var(--line))",
        background: "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--gold) 10%, transparent), var(--panel2, #12101c) 74%)",
      }}
    >
      <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 1.5, color: "var(--gold)", fontWeight: 800 }}>
        <Swords size={13} strokeWidth={2.4} /> {t("tribunal")}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{t("tribunalSub")}</div>

      {ready && plan ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "12px 0 6px" }}>
            <Contender entry={plan.a} champ={get(plan.a.key)} col={acol} />
            <span className="glow" style={{ fontSize: 20, fontWeight: 900, color: "var(--muted2)" }}>VS</span>
            <Contender entry={plan.b} champ={get(plan.b.key)} col={bcol} />
          </div>
          {solvedToday && result ? (
            <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: result.winnerCorrect ? "var(--good)" : "var(--bad)" }}>{result.winnerCorrect ? t("calledIt") : t("missedIt")}</span>
              <span style={{ color: "var(--muted2)" }}>· {t("seeResult")}</span>
              <ChevronRight size={13} strokeWidth={2.2} style={{ color: "var(--muted2)" }} />
            </div>
          ) : (
            <div
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8, padding: "11px 22px", borderRadius: 11, background: "var(--gold, #f5d020)", color: "#0a0a12", fontSize: 14.5, fontWeight: 800 }}
            >
              <Lock size={15} strokeWidth={2.4} /> {t("callWatch")}
            </div>
          )}
        </>
      ) : (
        <div className="mono" style={{ color: "var(--muted2)", fontSize: 12, padding: "18px 0" }}>{t("loadingFight")}</div>
      )}
    </button>
  );
}

function Contender({ entry, champ, col }: { entry: DailyResponse["a"]; champ: Champion; col: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 0 }}>
      <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={56} />
      <div style={{ fontSize: 12.5, fontWeight: 700, color: col, maxWidth: 92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
    </div>
  );
}

function Tile({ title, sub, icon, col, onClick }: { title: string; sub: string; icon: React.ReactNode; col: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel"
      style={{ ["--ac" as string]: col, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "14px 14px", cursor: "pointer", textAlign: "left", minHeight: 92 }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${col} 16%, transparent)`, color: col, marginBottom: 2 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>
      <span className="mono" style={{ fontSize: 10.5, color: "var(--muted2)" }}>{sub}</span>
    </button>
  );
}

function Predict(props: {
  plan: DailyResponse;
  get: (k: string) => Champion;
  acol: string;
  bcol: string;
  winnerPick: "a" | "b" | null;
  setWinnerPick: (p: "a" | "b") => void;
  dunkPick: "a" | "b" | null;
  setDunkPick: (p: "a" | "b" | null) => void;
  onStart: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const { plan, get, acol, bcol, winnerPick, setWinnerPick, dunkPick, setDunkPick, onStart, onNavigate } = props;
  return (
    <div className="fadein">
      <div className="panel" style={{ padding: 14, marginBottom: 12, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 6 }}>THE PROPOSITION</div>
        <div style={{ fontSize: 17, fontWeight: 700, fontStyle: "italic", lineHeight: 1.35 }}>&ldquo;{plan.topic}&rdquo;</div>
      </div>

      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 8, textAlign: "center" }}>1 · WHO WINS THE TRIBUNAL?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CallCard entry={plan.a} champ={get(plan.a.key)} col={acol} side="FOR" on={winnerPick === "a"} onClick={() => setWinnerPick("a")} />
        <CallCard entry={plan.b} champ={get(plan.b.key)} col={bcol} side="AGAINST" on={winnerPick === "b"} onClick={() => setWinnerPick("b")} />
      </div>

      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "16px 0 8px", textAlign: "center" }}>
        2 · WHO LANDS THE DUNK? <span style={{ opacity: 0.7 }}>· OPTIONAL</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <SmallPick on={dunkPick === "a"} col={acol} label={plan.a.name} onClick={() => setDunkPick(dunkPick === "a" ? null : "a")} />
        <SmallPick on={dunkPick === "b"} col={bcol} label={plan.b.name} onClick={() => setDunkPick(dunkPick === "b" ? null : "b")} />
      </div>

      <button
        type="button"
        disabled={!winnerPick}
        onClick={onStart}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, padding: "14px 18px", borderRadius: 12, border: "none", background: "var(--gold, #f5d020)", color: "#0a0a12", fontSize: 15, fontWeight: 800, cursor: winnerPick ? "pointer" : "not-allowed", opacity: winnerPick ? 1 : 0.45 }}
      >
        <Lock size={16} strokeWidth={2.4} /> Lock it in &amp; watch
      </button>
      <p className="mono" style={{ textAlign: "center", fontSize: 10, color: "var(--muted2)", marginTop: 12, letterSpacing: 0.5 }}>
        SAME FIGHT FOR EVERYONE TODAY · ONE CALL · COMES BACK AT MIDNIGHT UTC
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button type="button" onClick={() => onNavigate?.("watch")} className="mono" style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
          or pick your own fight <ChevronRight size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function CallCard({ entry, champ, col, side, on, onClick }: { entry: DailyResponse["a"]; champ: Champion; col: string; side: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel"
      style={{ ["--ac" as string]: col, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", cursor: "pointer", borderColor: on ? col : "var(--line)", background: on ? `color-mix(in srgb, ${col} 14%, transparent)` : undefined, boxShadow: on ? `0 0 26px -12px ${col}` : "none" }}
    >
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: col }}>{side}</div>
      <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={88} />
      <div style={{ fontSize: 16, fontWeight: 700 }}>{entry.name}</div>
      <div className="mono" style={{ fontSize: 11, fontWeight: 800, color: on ? col : "var(--muted2)", marginTop: 2 }}>{on ? "✓ CALLED" : "TAP TO CALL"}</div>
    </button>
  );
}

function SmallPick({ on, col, label, onClick }: { on: boolean; col: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn"
      style={{ ["--ac" as string]: col, fontSize: 13, fontWeight: 700, padding: "11px", textTransform: "none", borderColor: on ? col : "var(--line2)", color: on ? col : "var(--ink)", background: on ? `color-mix(in srgb, ${col} 16%, transparent)` : "transparent" }}
    >
      {on ? "✓ " : ""}{label}
    </button>
  );
}

function Done({
  plan,
  get,
  result,
  streak,
  best,
  onReplay,
  onNavigate,
}: {
  plan: DailyResponse;
  get: (k: string) => Champion;
  result: DailyResult | null;
  streak: number;
  best: number;
  onReplay: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const winnerEntry = result.winnerKey === plan.a.key ? plan.a : plan.b;
  const wcol = TYPE_COLOR[winnerEntry.type];
  const text = shareText(result, streak, best);

  const share = async () => {
    try {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (nav.share) {
        await nav.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* share/clipboard blocked — the X button still works */
    }
  };

  return (
    <div className="fadein">
      <div className="panel" style={{ ["--ac" as string]: wcol, padding: 20, textAlign: "center", boxShadow: `0 0 70px -34px ${wcol}` }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>THE TRIBUNAL RULED</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 4px" }}>
          <ChampionAvatar ckey={winnerEntry.key} type={winnerEntry.type} champion={get(winnerEntry.key)} size={96} />
        </div>
        <div className="glow" style={{ fontSize: 26, fontWeight: 800, color: wcol }}>{result.winnerName} wins</div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          <VerdictPill ok={result.winnerCorrect} label="Winner call" />
          {result.dunkCorrect != null && <VerdictPill ok={result.dunkCorrect} label="Dunk call" />}
        </div>

        <div style={{ marginTop: 16, padding: 13, borderRadius: 12, background: "var(--panel2)", border: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 5, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Mic size={11} strokeWidth={2} /> ZINGER OF THE DAY · {result.dunkName}
          </div>
          <div style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.5 }}>&ldquo;{result.dunkLine}&rdquo;</div>
        </div>

        <div style={{ display: "flex", gap: 9, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={share} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 11, border: "none", background: "var(--gold, #f5d020)", color: "#0a0a12", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            <Share2 size={15} strokeWidth={2.4} /> {copied ? "Copied" : "Share"}
          </button>
          <a className="btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" style={{ textTransform: "none" }}>
            Post on X
          </a>
          <button type="button" className="btn" onClick={onReplay} style={{ display: "inline-flex", alignItems: "center", gap: 6, textTransform: "none" }}>
            <RotateCcw size={14} strokeWidth={2.2} /> Replay
          </button>
        </div>
      </div>
      <button type="button" onClick={() => onNavigate?.("watch")} className="mono" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14, padding: "12px", borderRadius: 12, border: "1px solid var(--line2)", background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer" }}>
        <Shield size={14} strokeWidth={2.2} /> Keep watching, pick your own fights <ChevronRight size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function VerdictPill({ ok, label }: { ok: boolean; label: string }) {
  const col = ok ? "var(--good)" : "var(--bad)";
  return (
    <div style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${col}`, color: col, fontWeight: 700, fontSize: 12 }}>
      {ok ? "✓" : "✗"} {label}
    </div>
  );
}

export default MobileToday;
