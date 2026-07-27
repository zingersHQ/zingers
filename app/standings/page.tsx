"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Plug, Swords } from "lucide-react";
import type { CreatureType, RosterEntry, Strat } from "@/lib/types";
import { DEFAULT_STRAT } from "@/lib/types";
import { RANK_FIGHT_COST } from "@/lib/economy";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { forceName } from "@/lib/lore/canon";
import { getOwnerToken } from "@/lib/owner";
import { SeasonBanner } from "@/components/lore/season-banner";
import { TrainerCode } from "@/components/trainer-code";
import { useChampions } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";

interface LadderChampion {
  id: string;
  key: string;
  name: string;
  handle: string;
  type: CreatureType;
  brain: { provider: "grok" | "http"; endpoint?: string };
  strat: { risk: number; focus: number; aggression: number };
  rating: number;
  wins: number;
  losses: number;
  battles: number;
  house: boolean;
}

interface FeedEntry {
  t: number;
  winner: string;
  loser: string;
  topic: string;
  delta: number;
}

const ACC = "#7c5cff";

export default function StandingsPage() {
  const owned = useChampions((s) => s.owned);
  const recipes = useChampions((s) => s.recipes);
  const crowns = useChampions((s) => s.crowns);
  const setBalance = useChampions((s) => s.setBalance);
  const syncWallet = useChampions((s) => s.syncWallet);

  const [ladder, setLadder] = useState<LadderChampion[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [shared, setShared] = useState(true);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const tokenRef = useRef("");

  // claim form — roster mind from your save; Ubuntu-style name minted server-side
  const [brain, setBrain] = useState<"grok" | "http">("grok");
  const [endpoint, setEndpoint] = useState("");

  const refresh = useCallback(async () => {
    const [lr, fr] = await Promise.all([
      fetch("/api/ladder").then((r) => r.json()),
      fetch("/api/feed").then((r) => r.json()),
    ]);
    setLadder(lr.champions || []);
    setShared(Boolean(lr.shared));
    setFeed(fr.feed || []);
  }, []);

  const loadOwned = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    const r = await fetch(`/api/me?token=${encodeURIComponent(token)}`).then((x) => x.json());
    setOwnedIds(new Set((r.champions || []).map((c: LadderChampion) => c.id)));
  }, []);

  useEffect(() => {
    tokenRef.current = getOwnerToken();
    fetch("/api/roster").then((r) => r.json()).then((d) => {
      setRoster(d.creatures);
    });
    refresh();
    loadOwned();
    void syncWallet();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, [refresh, loadOwned, syncWallet]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const claim = async () => {
    if (!owned || !ROSTER[owned]) {
      flash("Claim a mind in the Grounds first.");
      return;
    }
    setBusy("claim");
    const strat: Strat = recipes[owned]?.strat || DEFAULT_STRAT;
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerToken: tokenRef.current,
        key: owned,
        brain: brain === "http" && endpoint ? { provider: "http", endpoint } : { provider: "grok" },
        strat,
      }),
    }).then((r) => r.json());
    setBusy(null);
    if (res.error) return flash(`Could not claim: ${res.error}`);
    flash(`${res.champion.name} joined the standings.`);
    await Promise.all([refresh(), loadOwned()]);
  };

  const challenge = async (c: LadderChampion) => {
    if (crowns < RANK_FIGHT_COST) {
      flash(`Need ${RANK_FIGHT_COST} Crowns for a Rank fight. Win in the Grounds or fly.`);
      return;
    }
    setBusy(c.id);
    const res = await fetch("/api/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, ownerToken: tokenRef.current || getOwnerToken() }),
    }).then((r) => r.json());
    setBusy(null);
    if (typeof res.balance === "number") setBalance(res.balance);
    else if (typeof res.result?.balance === "number") setBalance(res.result.balance);
    if (res.error) {
      if (res.error === "not enough Crowns") {
        return flash(`Need ${RANK_FIGHT_COST} Crowns for a Rank fight. Win in the Grounds or fly.`);
      }
      return flash(`Fight failed: ${res.error}`);
    }
    const r = res.result;
    flash(`${r.winner} beat ${r.loser} on "${r.topic}" (+${r.delta}) · −${r.cost ?? RANK_FIGHT_COST} Crowns`);
    await Promise.all([refresh(), loadOwned()]);
  };

  const topRating = ladder[0]?.rating ?? 1000;
  const rosterByKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);
  const onBoard = ladder.some((c) => ownedIds.has(c.id));
  const ownedEntry = owned && ROSTER[owned] ? ROSTER[owned] : null;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 22px 90px" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Rank</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          ONE BOARD · EVERY PLACE IS FOUGHT FOR
        </span>
        {!shared && (
          <span className="mono" style={{ fontSize: 10, color: "var(--gold)", border: "1px solid rgba(240,169,58,.4)", borderRadius: 6, padding: "3px 8px" }}>
            LOCAL MODE: provision Redis to go shared
          </span>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <SeasonBanner />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
        {/* ── Ladder ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ladder.map((c, i) => {
            const col = TYPE_COLOR[c.type] || ACC;
            const mine = ownedIds.has(c.id);
            const wr = c.battles ? Math.round((c.wins / c.battles) * 100) : 0;
            return (
              <div
                key={c.id}
                className="panel"
                style={{
                  ["--ac" as string]: col,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  border: mine ? `1px solid ${col}` : undefined,
                  boxShadow: mine ? `0 0 24px -10px ${col}` : undefined,
                }}
              >
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? "var(--gold)" : "var(--muted2)", width: 30, textAlign: "center" }}>
                  {i + 1}
                </div>
                <div
                  aria-hidden
                  style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${col}`, display: "grid", placeItems: "center", color: col, fontWeight: 800, fontSize: 16, flexShrink: 0 }}
                >
                  {c.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</span>
                    {mine && <span className="mono" style={{ fontSize: 8, color: col, border: `1px solid ${col}`, borderRadius: 5, padding: "1px 5px" }}>YOURS</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {forceName(c.type)} · {c.house ? "League" : rosterByKey[c.key]?.name || c.key} · {c.brain.provider === "http" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plug size={11} strokeWidth={2} /> agent</span> : "House Grok"}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 92 }}>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 700 }}>{c.wins}W·{c.losses}L</div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 1 }}>{c.battles ? `${wr}% win rate` : "unproven"}</div>
                  {/* relative ladder strength */}
                  <div style={{ width: 92, height: 4, borderRadius: 9, background: "var(--line)", marginTop: 6, overflow: "hidden", marginLeft: "auto" }}>
                    <div style={{ width: `${Math.max(6, (c.rating / topRating) * 100)}%`, height: "100%", background: col }} />
                  </div>
                </div>
                {mine && (
                  <button
                    onClick={() => challenge(c)}
                    disabled={busy === c.id || crowns < RANK_FIGHT_COST}
                    className="btn btn-primary"
                    title={crowns < RANK_FIGHT_COST ? `Need ${RANK_FIGHT_COST} Crowns` : `Rank fight · ${RANK_FIGHT_COST} Crowns`}
                    style={{
                      ["--ac" as string]: col,
                      fontSize: 12,
                      padding: "8px 12px",
                      opacity: busy === c.id || crowns < RANK_FIGHT_COST ? 0.5 : 1,
                    }}
                  >
                    {busy === c.id ? (
                      "…"
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Swords size={13} strokeWidth={2.2} /> Fight · {RANK_FIGHT_COST}
                        <Crown size={12} strokeWidth={2.2} />
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
          {!ladder.length && <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 30 }}>Loading standings…</p>}
        </div>

        {/* ── Side: identity + claim + feed ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 76 }}>
          <TrainerCode />

          {/* claim — your mind from the Grounds; board name minted server-side */}
          {!onBoard && (
            <div className="panel" style={{ ["--ac" as string]: ACC, padding: 16 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: ACC, marginBottom: 10 }}>PUT A CHAMPION ON THE BOARD</div>
              <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", margin: "0 0 10px", lineHeight: 1.45 }}>
                They get a unique name when they join. You stay the driver.
              </p>
              {ownedEntry ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {ownedEntry.name}
                    <span className="mono" style={{ fontSize: 10, color: TYPE_COLOR[ownedEntry.type], marginLeft: 8 }}>
                      {forceName(ownedEntry.type)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {(["grok", "http"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBrain(b)}
                        className="mono"
                        style={{
                          flex: 1,
                          fontSize: 10,
                          padding: "8px 6px",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: `1px solid ${brain === b ? ACC : "var(--line2)"}`,
                          background: brain === b ? "rgba(124,92,255,.12)" : "transparent",
                          color: brain === b ? ACC : "var(--muted)",
                        }}
                      >
                        {b === "grok" ? "House Grok" : <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plug size={11} strokeWidth={2} /> My agent</span>}
                      </button>
                    ))}
                  </div>
                  {brain === "http" && (
                    <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-agent.example/act" style={inputStyle} />
                  )}

                  <button type="button" onClick={claim} disabled={busy === "claim"} className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", marginTop: 4, opacity: busy === "claim" ? 0.5 : 1 }}>
                    {busy === "claim" ? "Entering…" : "Claim & join standings →"}
                  </button>
                  {brain === "http" && (
                    <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", lineHeight: 1.4, margin: 0 }}>
                      We POST the game state to your URL and expect a move. Your keys stay on your server.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: 0, lineHeight: 1.45 }}>
                  Claim a mind in the Grounds first, then bring them here.
                </p>
              )}
            </div>
          )}

          {/* feed */}
          <div className="panel" style={{ ["--ac" as string]: "var(--good)", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--good)", boxShadow: "0 0 8px var(--good)" }} />
              <span className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--good)" }}>LIVE FIGHTS</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {feed.map((f, i) => (
                <div key={f.t + "-" + i} style={{ fontSize: 12, lineHeight: 1.4, paddingBottom: 8, borderBottom: i < feed.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ fontWeight: 700 }}>{f.winner}</span>
                  <span style={{ color: "var(--muted2)" }}> def. </span>
                  <span>{f.loser}</span>
                  <span className="mono" style={{ color: "var(--good)", fontSize: 10 }}> +{f.delta}</span>
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 2 }}>“{f.topic}”</div>
                </div>
              ))}
              {!feed.length && <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: 0 }}>No fights yet. Claim a champion and send it in.</p>}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="mono"
          style={{
            position: "fixed",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            background: "#12101f",
            border: `1px solid ${ACC}`,
            borderRadius: 10,
            padding: "12px 18px",
            fontSize: 12,
            color: "var(--ink)",
            boxShadow: "0 20px 50px -20px #000",
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0a0813",
  border: "1px solid var(--line2)",
  borderRadius: 8,
  padding: "9px 11px",
  color: "var(--ink)",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
};
