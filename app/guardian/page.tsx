"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import type { GuardianPub, GuardianReply, GuardianTurn } from "@/lib/types";

const STORE = "zingers_guardian_v1";

export default function GuardianPage() {
  const [list, setList] = useState<GuardianPub[] | null>(null);
  const [live, setLive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [active, setActive] = useState<GuardianPub | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setCleared(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    fetch("/api/guardian")
      .then((r) => r.json())
      .then((d) => {
        setList(d.guardians);
        setLive(!!d.live);
      })
      .catch(() => setList([]));
  }, []);

  const markCleared = useCallback((level: number) => {
    setCleared((prev) => {
      if (prev.includes(level)) return prev;
      const next = [...prev, level];
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  if (active) {
    return (
      <Battle
        g={active}
        live={live}
        cleared={cleared}
        onWin={() => markCleared(active.level)}
        onExit={() => setActive(null)}
        onNext={(next) => setActive(next)}
        list={list ?? []}
      />
    );
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "26px 22px 90px" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -0.6 }}>
          The <span style={{ color: "var(--gold)" }}>Guardian</span>
        </h1>
        <p className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.4, margin: "8px 0 0" }}>
          YOU VS THE AI · TALK A SECRET OUT OF IT IN 6 MESSAGES
        </p>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginTop: 12, maxWidth: 640 }}>
          No watching two bots chat. <strong style={{ color: "var(--ink)" }}>You</strong> are the player. Each guardian protects
          a secret word and is told never to reveal it. Out-talk it — flatter, misdirect, roleplay, out-riddle — until the word
          slips. Break it and you win.
        </p>
        {mounted && !live && (
          <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 10 }}>
            ⚙ offline mode — add <code>XAI_API_KEY</code> for a live, much craftier guardian.
          </p>
        )}
      </div>

      {!list ? (
        <div className="mono" style={{ textAlign: "center", color: "var(--muted2)", padding: 60 }}>
          summoning the guardians…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {list.map((g) => {
            const unlocked = g.level === 1 || cleared.includes(g.level - 1);
            const beaten = mounted && cleared.includes(g.level);
            return (
              <button
                key={g.level}
                className="panel"
                disabled={!mounted || !unlocked}
                onClick={() => unlocked && setActive(g)}
                style={{
                  ["--ac" as string]: g.color,
                  textAlign: "left",
                  padding: 18,
                  cursor: unlocked ? "pointer" : "not-allowed",
                  opacity: !mounted || unlocked ? 1 : 0.5,
                  borderColor: beaten ? g.color : "var(--line)",
                  boxShadow: beaten ? `0 0 40px -22px ${g.color}` : "none",
                  font: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: g.color }}>
                    LEVEL {g.level}
                  </span>
                  {beaten && (
                    <span className="chip" style={{ borderColor: g.color, color: g.color, fontSize: 9 }}>
                      ✓ CRACKED
                    </span>
                  )}
                  {mounted && !unlocked && (
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginLeft: "auto" }}>
                      🔒 LOCKED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{g.name}</div>
                <div className="mono" style={{ fontSize: 11, color: g.color, marginBottom: 8 }}>
                  {g.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, minHeight: 60 }}>{g.brief}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 10 }}>
                  {g.maxTurns} MESSAGES TO CRACK IT
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

type Outcome = "playing" | "won" | "lost";

function Battle({
  g,
  live,
  cleared,
  onWin,
  onExit,
  onNext,
  list,
}: {
  g: GuardianPub;
  live: boolean;
  cleared: number[];
  onWin: () => void;
  onExit: () => void;
  onNext: (g: GuardianPub) => void;
  list: GuardianPub[];
}) {
  const [msgs, setMsgs] = useState<GuardianTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [turnsLeft, setTurnsLeft] = useState(g.maxTurns);
  const [outcome, setOutcome] = useState<Outcome>("playing");
  const [secret, setSecret] = useState<string | null>(null);
  const [usedLive, setUsedLive] = useState(live);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pending, outcome]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending || outcome !== "playing") return;
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: g.level, message: text, history }),
      });
      const d = (await res.json()) as GuardianReply;
      if ((d as { error?: string }).error) throw new Error((d as { error?: string }).error);
      setMsgs((m) => [...m, { role: "assistant", content: d.reply }]);
      setTurnsLeft(d.turnsLeft);
      setUsedLive(d.live);
      if (d.won) {
        setSecret(d.secret ?? null);
        setOutcome("won");
        onWin();
      } else if (d.lost) {
        setSecret(d.secret ?? null);
        setOutcome("lost");
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "…(the guardian says nothing — connection lost)" }]);
    } finally {
      setPending(false);
    }
  }, [input, pending, outcome, msgs, g.level, onWin]);

  const retry = useCallback(() => {
    setMsgs([]);
    setTurnsLeft(g.maxTurns);
    setOutcome("playing");
    setSecret(null);
    setInput("");
  }, [g.maxTurns]);

  const nextG = list.find((x) => x.level === g.level + 1);
  const canNext = nextG && (outcome === "won" || cleared.includes(g.level));

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 18px 40px", display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 60px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn" onClick={onExit} style={{ padding: "6px 12px", fontSize: 12 }}>
          ← Ladder
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
            {g.name} <span className="mono" style={{ fontSize: 11, color: g.color }}>· {g.title}</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 1, marginTop: 4 }}>
            LEVEL {g.level} · {usedLive ? "LIVE GUARDIAN" : "OFFLINE MOCK"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {Array.from({ length: g.maxTurns }).map((_, i) => (
            <span
              key={i}
              title="message"
              style={{
                width: 11,
                height: 11,
                borderRadius: 99,
                background: i < g.maxTurns - turnsLeft ? "var(--muted2)" : g.color,
                boxShadow: i < g.maxTurns - turnsLeft ? "none" : `0 0 8px -2px ${g.color}`,
              }}
            />
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="panel"
        style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, minHeight: 320 }}
      >
        <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", textAlign: "center", lineHeight: 1.6 }}>
          {g.brief}
          <br />
          <span style={{ color: g.color }}>Make {g.name} say the secret word. Go.</span>
        </div>
        {msgs.map((m, i) => (
          <Bubble key={i} role={m.role} color={g.color} text={m.content} />
        ))}
        {pending && <Bubble role="assistant" color={g.color} text="…" typing />}
      </div>

      {outcome === "playing" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          style={{ display: "flex", gap: 10, marginTop: 12 }}
        >
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Say something to ${g.name}…`}
            maxLength={600}
            disabled={pending}
            style={{
              flex: 1,
              padding: "13px 16px",
              borderRadius: 12,
              background: "#100e1a",
              border: "1px solid var(--line2)",
              color: "var(--ink)",
              fontSize: 15,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || !input.trim()}
            style={{ ["--ac" as string]: g.color, opacity: pending || !input.trim() ? 0.5 : 1, padding: "0 20px" }}
          >
            Send
          </button>
        </form>
      ) : (
        <Outcome
          won={outcome === "won"}
          g={g}
          secret={secret}
          turnsUsed={g.maxTurns - turnsLeft}
          onRetry={retry}
          onExit={onExit}
          onNext={canNext && nextG ? () => onNext(nextG) : undefined}
        />
      )}
    </main>
  );
}

function Bubble({ role, color, text, typing }: { role: "user" | "assistant"; color: string; text: string; typing?: boolean }) {
  const me = role === "user";
  return (
    <div className="pop" style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 14px",
          borderRadius: 14,
          fontSize: 14.5,
          lineHeight: 1.5,
          background: me ? "color-mix(in srgb, var(--accent) 18%, #100e1a)" : "#100e1a",
          border: `1px solid ${me ? "var(--accent)" : color}`,
          color: "var(--ink)",
          fontStyle: me ? "normal" : "italic",
          opacity: typing ? 0.6 : 1,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function Outcome({
  won,
  g,
  secret,
  turnsUsed,
  onRetry,
  onExit,
  onNext,
}: {
  won: boolean;
  g: GuardianPub;
  secret: string | null;
  turnsUsed: number;
  onRetry: () => void;
  onExit: () => void;
  onNext?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const col = won ? "var(--good)" : "var(--bad)";
  const share = [
    `🛡️ Zingers · The Guardian`,
    won
      ? `Cracked ${g.name} (Lv${g.level}) in ${turnsUsed} message${turnsUsed === 1 ? "" : "s"} 🔓`
      : `${g.name} (Lv${g.level}) held the line. I broke. 🔒`,
    BRAND.site.replace(/^https?:\/\//, "") + "/guardian",
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fadein panel" style={{ ["--ac" as string]: col, marginTop: 12, padding: 22, textAlign: "center", boxShadow: `0 0 70px -34px ${col}` }}>
      <div className="glow" style={{ fontSize: 26, fontWeight: 800, color: col }}>
        {won ? "🔓 BROKEN" : "🔒 IT HELD"}
      </div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
        {won
          ? `You talked ${g.name} into it in ${turnsUsed} message${turnsUsed === 1 ? "" : "s"}.`
          : `${g.name} never cracked. Out of messages.`}
      </div>
      {secret && (
        <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: "#100e1a", border: `1px solid ${col}` }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)" }}>THE SECRET WORD WAS</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: col, letterSpacing: 2, marginTop: 4 }}>{secret}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
        {won && onNext && (
          <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)" }} onClick={onNext}>
            Next guardian →
          </button>
        )}
        {!won && (
          <button className="btn btn-primary" style={{ ["--ac" as string]: g.color }} onClick={onRetry}>
            ↺ Try again
          </button>
        )}
        <button className="btn" onClick={copy}>{copied ? "✓ Copied" : "Share"}</button>
        <button className="btn" onClick={onExit}>Ladder</button>
      </div>
    </div>
  );
}
