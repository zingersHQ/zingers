"use client";
// ─────────────────────────────────────────────────────────────────────────────
// M2 — the Rank tab (docs/mobile.md). The phone body of app/standings, shown
// directly: the one global ELO ladder, your champion's place on it (with a Fight
// button), and the live fights feed. Reuses /api/ladder, /api/feed, /api/me and
// /api/challenge — same server-authoritative ladder the desktop uses.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import { Trophy, Swords, Plug, Radio } from "lucide-react";
import type { CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { forceName } from "@/lib/lore/canon";
import { getOwnerToken } from "@/lib/owner";
import { SolanaConnect } from "@/components/wallet/solana-connect";

interface LadderChampion {
  id: string;
  key: string;
  name: string;
  handle: string;
  type: CreatureType;
  brain: { provider: "grok" | "http"; endpoint?: string };
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

export function MobileRank() {
  const [ladder, setLadder] = useState<LadderChampion[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [shared, setShared] = useState(true);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const tokenRef = useRef("");

  const refresh = useCallback(async () => {
    try {
      const [lr, fr] = await Promise.all([
        fetch("/api/ladder").then((r) => r.json()),
        fetch("/api/feed").then((r) => r.json()),
      ]);
      setLadder(lr.champions || []);
      setShared(Boolean(lr.shared));
      setFeed(fr.feed || []);
    } catch {
      /* keep last-known */
    }
  }, []);

  const loadOwned = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const r = await fetch(`/api/me?token=${encodeURIComponent(token)}`).then((x) => x.json());
      setOwnedIds(new Set((r.champions || []).map((c: LadderChampion) => c.id)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    tokenRef.current = getOwnerToken();
    refresh();
    loadOwned();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, [refresh, loadOwned]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  };

  const challenge = useCallback(
    async (c: LadderChampion) => {
      setBusy(c.id);
      try {
        const res = await fetch("/api/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id, ownerToken: tokenRef.current || getOwnerToken() }),
        }).then((r) => r.json());
        if (res.error) flash(`Fight failed: ${res.error}`);
        else flash(`${res.result.winner} beat ${res.result.loser} (+${res.result.delta})`);
        await Promise.all([refresh(), loadOwned()]);
      } catch {
        flash("Fight failed.");
      }
      setBusy(null);
    },
    [refresh, loadOwned],
  );

  const topRating = ladder[0]?.rating ?? 1000;
  const myIndex = ladder.findIndex((c) => ownedIds.has(c.id));
  const mine = myIndex >= 0 ? ladder[myIndex] : null;

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 14px 24px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Trophy size={20} strokeWidth={2.2} style={{ color: "var(--gold)" }} />
          <span style={{ fontSize: 20, fontWeight: 800 }}>Rank</span>
          {!shared && (
            <span className="mono" style={{ marginLeft: "auto", fontSize: 9, color: "var(--gold)", border: "1px solid rgba(240,169,58,.4)", borderRadius: 6, padding: "3px 7px" }}>LOCAL MODE</span>
          )}
        </div>

        {/* your place */}
        {mine && (
          <div className="panel" style={{ ["--ac" as string]: TYPE_COLOR[mine.type], padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 26px -12px ${TYPE_COLOR[mine.type]}` }}>
            <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)", width: 44, textAlign: "center" }}>#{myIndex + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)" }}>YOUR CHAMPION</div>
              <div style={{ fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mine.name}</div>
              <div className="mono" style={{ fontSize: 10, color: TYPE_COLOR[mine.type] }}>{mine.rating} ELO · {mine.wins}W·{mine.losses}L</div>
            </div>
            <button
              type="button"
              onClick={() => challenge(mine)}
              disabled={busy === mine.id}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 11, border: "none", background: TYPE_COLOR[mine.type], color: "#0a0a12", fontWeight: 800, fontSize: 13, cursor: busy === mine.id ? "wait" : "pointer", opacity: busy === mine.id ? 0.6 : 1 }}
            >
              <Swords size={14} strokeWidth={2.4} /> {busy === mine.id ? "…" : "Fight"}
            </button>
          </div>
        )}

        {/* ladder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {ladder.map((c, i) => {
            const col = TYPE_COLOR[c.type] || "#7c5cff";
            const isMine = ownedIds.has(c.id);
            return (
              <div
                key={c.id}
                className="panel"
                style={{ ["--ac" as string]: col, padding: "10px 12px", display: "flex", alignItems: "center", gap: 11, border: isMine ? `1px solid ${col}` : undefined }}
              >
                <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: i === 0 ? "var(--gold)" : "var(--muted2)", width: 22, textAlign: "center" }}>{i + 1}</div>
                <div aria-hidden style={{ width: 32, height: 32, borderRadius: 9, border: `2px solid ${col}`, display: "grid", placeItems: "center", color: col, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{c.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    {isMine && <span className="mono" style={{ fontSize: 7.5, color: col, border: `1px solid ${col}`, borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>YOURS</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {forceName(c.type)} · {c.handle || (c.house ? "League" : "anon")}
                    {c.brain.provider === "http" && <Plug size={9} strokeWidth={2} style={{ display: "inline", marginLeft: 4, verticalAlign: "-1px" }} />}
                  </div>
                  <div style={{ width: "100%", height: 3, borderRadius: 9, background: "var(--line)", marginTop: 5, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(6, (c.rating / topRating) * 100)}%`, height: "100%", background: col }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 700 }}>{c.rating}</div>
                  <div className="mono" style={{ fontSize: 8.5, color: "var(--muted2)" }}>{c.wins}·{c.losses}</div>
                </div>
                {isMine && !mine && (
                  <button type="button" onClick={() => challenge(c)} disabled={busy === c.id} style={{ display: "inline-flex", alignItems: "center", padding: "8px 10px", borderRadius: 9, border: "none", background: col, color: "#0a0a12", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                    <Swords size={12} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            );
          })}
          {!ladder.length && <p className="mono" style={{ color: "var(--muted2)", textAlign: "center", padding: 40, fontSize: 12 }}>loading the ladder…</p>}
        </div>

        <div style={{ marginTop: 16 }}>
          <SolanaConnect />
        </div>

        {/* live feed */}
        <div className="panel" style={{ ["--ac" as string]: "var(--good)", padding: 14, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Radio size={13} strokeWidth={2.2} style={{ color: "var(--good)" }} />
            <span className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--good)" }}>LIVE FIGHTS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {feed.slice(0, 12).map((f, i) => (
              <div key={f.t + "-" + i} style={{ fontSize: 12, lineHeight: 1.4, paddingBottom: 7, borderBottom: i < Math.min(feed.length, 12) - 1 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontWeight: 700 }}>{f.winner}</span>
                <span style={{ color: "var(--muted2)" }}> def. </span>
                <span>{f.loser}</span>
                <span className="mono" style={{ color: "var(--good)", fontSize: 10 }}> +{f.delta}</span>
                <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&ldquo;{f.topic}&rdquo;</div>
              </div>
            ))}
            {!feed.length && <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: 0 }}>No fights yet.</p>}
          </div>
        </div>
      </div>

      {toast && (
        <div className="mono" style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "#12101f", border: "1px solid #7c5cff", borderRadius: 10, padding: "11px 16px", fontSize: 12, color: "var(--ink)", boxShadow: "0 20px 50px -20px #000", maxWidth: "90%", textAlign: "center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default MobileRank;
