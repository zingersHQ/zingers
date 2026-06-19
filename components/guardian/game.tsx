"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { primeCreature, speakCreature, stopCreature, creatureVoiceSupported } from "@/lib/creature-voice";
import { ChampionAvatar } from "@/components/champion-avatar";
import { ROSTER } from "@/lib/engine/roster";
import { useChampions } from "@/store/champions";
import type { CreatureType, GuardianPub, GuardianReply, GuardianTurn } from "@/lib/types";

// A face for each guardian so the stand-off reads at a glance (no portrait art
// for them like the champions have — these glyphs carry the persona instead).
const GUARDIAN_GLYPH: Record<number, string> = {
  1: "📋", // Tibble — the greeter
  2: "📚", // Quill — the archivist
  3: "🛡️", // Bastion — the warden
  4: "🔮", // Vesper — the diviner
  5: "🧙", // Sable — the vaultheart
};

const STORE = "zingers_guardian_v1";
const TACTICS_STORE = "zingers_guardian_tactics_v1";

// Per-level memory of approaches you've already tried, so a live guardian hardens
// against your repeats across attempts (it's a stateful agent, not a fresh prompt).
function loadTactics(level: number): string[] {
  try {
    const raw = localStorage.getItem(TACTICS_STORE);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, string[]>;
    return Array.isArray(all?.[level]) ? all[level] : [];
  } catch {
    return [];
  }
}

function saveTactics(level: number, list: string[]) {
  try {
    const raw = localStorage.getItem(TACTICS_STORE);
    const all = (raw ? JSON.parse(raw) : {}) as Record<string, string[]>;
    all[level] = list.slice(-8);
    localStorage.setItem(TACTICS_STORE, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

// The whole single-player extraction game, reusable in two shells:
//  - the standalone /guardian page (embedded = false)
//  - an in-world overlay opened from the Guardian's Shrine in the Grounds
export function GuardianGame({ embedded = false, startLevel, onClose }: { embedded?: boolean; startLevel?: number; onClose?: () => void }) {
  const [list, setList] = useState<GuardianPub[] | null>(null);
  const [live, setLive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [active, setActive] = useState<GuardianPub | null>(null);
  const crackKeeper = useChampions((s) => s.crackKeeper);

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

  // Open the Keeper you're standing in front of — skip the level picker.
  useEffect(() => {
    if (!startLevel || !list || active) return;
    const g = list.find((x) => x.level === startLevel);
    if (!g) return;
    const unlocked = g.level === 1 || cleared.includes(g.level - 1);
    if (unlocked) setActive(g);
  }, [startLevel, list, active, cleared]);

  const markCleared = useCallback((level: number) => {
    setCleared((prev) => {
      if (prev.includes(level)) return prev;
      const next = [...prev, level];
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      crackKeeper(); // a Keeper yielded — award the Reader-rank milestone once
      return next;
    });
  }, [crackKeeper]);

  if (active) {
    return (
      <Battle
        g={active}
        live={live}
        cleared={cleared}
        embedded={embedded}
        onWin={() => markCleared(active.level)}
        onExit={() => setActive(null)}
        onNext={(next) => setActive(next)}
        onClose={onClose}
        list={list ?? []}
      />
    );
  }

  return (
    <div style={embedded ? { padding: "4px 2px" } : { maxWidth: 920, margin: "0 auto", padding: "26px 22px 90px" }}>
      <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: embedded ? 24 : 32, fontWeight: 800, margin: 0, letterSpacing: -0.6 }}>
            The <span style={{ color: "var(--gold)" }}>Guardian</span>
          </h1>
          <p className="mono" style={{ color: "var(--muted2)", fontSize: 11, letterSpacing: 1.4, margin: "8px 0 0" }}>
            YOU VS THE AI · TALK A SECRET OUT OF IT IN 6 MESSAGES
          </p>
          {!embedded && (
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginTop: 12, maxWidth: 640 }}>
              Each guardian guards a secret word it&apos;s sworn never to speak. Out-talk it: flatter, misdirect, roleplay,
              out-riddle until the word slips. Break it and you win.
            </p>
          )}
          {mounted && !live && (
            <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 10 }}>
              ⚙ offline mode. Add <code>XAI_API_KEY</code> for a live, much craftier guardian.
            </p>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>
            ✕
          </button>
        )}
      </div>

      {!list ? (
        <div className="mono" style={{ textAlign: "center", color: "var(--muted2)", padding: 40 }}>
          summoning the guardians…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${embedded ? 220 : 260}px, 1fr))`, gap: 12 }}>
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
                  padding: 16,
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
                <div style={{ fontSize: 19, fontWeight: 700 }}>{g.name}</div>
                <div className="mono" style={{ fontSize: 11, color: g.color, marginBottom: 8 }}>
                  {g.title}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, minHeight: embedded ? 0 : 60 }}>{g.brief}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 10 }}>
                  {g.maxTurns} MESSAGES TO CRACK IT
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Outcome = "playing" | "won" | "lost";

function Battle({
  g,
  live,
  cleared,
  embedded,
  onWin,
  onExit,
  onNext,
  onClose,
  list,
}: {
  g: GuardianPub;
  live: boolean;
  cleared: number[];
  embedded: boolean;
  onWin: () => void;
  onExit: () => void;
  onNext: (g: GuardianPub) => void;
  onClose?: () => void;
  list: GuardianPub[];
}) {
  const [msgs, setMsgs] = useState<GuardianTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [turnsLeft, setTurnsLeft] = useState(g.maxTurns);
  const [outcome, setOutcome] = useState<Outcome>("playing");
  const [secret, setSecret] = useState<string | null>(null);
  const [usedLive, setUsedLive] = useState(live);
  const [tactics, setTactics] = useState<string[]>([]);
  const [voiceOn, setVoiceOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canSpeak = creatureVoiceSupported();

  // YOUR side of the stand-off: the champion you've claimed in the Grounds.
  const ownedKey = useChampions((s) => s.owned);
  const getChamp = useChampions((s) => s.get);
  const myChamp = ownedKey ? getChamp(ownedKey) : null;
  const myType: CreatureType = (ownedKey && ROSTER[ownedKey]?.type) || "LOGIC";

  // who's "live" in the face-off — drives the portrait glow
  const lastRole = msgs.length ? msgs[msgs.length - 1].role : null;
  const guardianSpeaking = pending || lastRole === "assistant";

  useEffect(() => {
    setTactics(loadTactics(g.level));
  }, [g.level]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pending, outcome]);

  // Never leave a guardian talking after you walk away (exit, level change, close).
  useEffect(() => stopCreature, [g.level]);

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
        body: JSON.stringify({ level: g.level, message: text, history, tactics }),
      });
      const d = (await res.json()) as GuardianReply;
      if ((d as { error?: string }).error) throw new Error((d as { error?: string }).error);
      setMsgs((m) => [...m, { role: "assistant", content: d.reply }]);
      if (voiceOn) speakCreature(d.reply, g.level);
      setTurnsLeft(d.turnsLeft);
      setUsedLive(d.live);
      if (d.won || d.lost) {
        const attemptTactics = [...history.filter((h) => h.role === "user").map((h) => h.content), text];
        const merged = [...tactics, ...attemptTactics].slice(-8);
        setTactics(merged);
        saveTactics(g.level, merged);
      }
      if (d.won) {
        setSecret(d.secret ?? null);
        setOutcome("won");
        onWin();
      } else if (d.lost) {
        setSecret(d.secret ?? null);
        setOutcome("lost");
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "…(the guardian says nothing, connection lost)" }]);
    } finally {
      setPending(false);
    }
  }, [input, pending, outcome, msgs, g.level, onWin, tactics, voiceOn]);

  const retry = useCallback(() => {
    stopCreature();
    setMsgs([]);
    setTurnsLeft(g.maxTurns);
    setOutcome("playing");
    setSecret(null);
    setInput("");
  }, [g.maxTurns]);

  const toggleVoice = useCallback(() => {
    setVoiceOn((on) => {
      if (on) {
        stopCreature();
      } else {
        primeCreature(); // unlock the audio context while we have the click gesture
      }
      return !on;
    });
  }, []);

  const nextG = list.find((x) => x.level === g.level + 1);
  const canNext = nextG && (outcome === "won" || cleared.includes(g.level));

  const wrapStyle: React.CSSProperties = embedded
    ? { display: "flex", flexDirection: "column", maxHeight: "76vh" }
    : { maxWidth: 760, margin: "0 auto", padding: "20px 18px 40px", display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 60px)" };

  return (
    <div style={wrapStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn" onClick={onExit} style={{ padding: "6px 12px", fontSize: 12 }}>
          ← Ladder
        </button>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>
            {g.name} <span className="mono" style={{ fontSize: 11, color: g.color }}>· {g.title}</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 1, marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>LEVEL {g.level} · {usedLive ? "LIVE GUARDIAN" : "OFFLINE MOCK"}</span>
            {usedLive && tactics.length > 0 && (
              <span className="chip" style={{ fontSize: 9, borderColor: g.color, color: g.color }}>
                ⟳ REMEMBERS YOUR LAST {Math.min(tactics.length, 8)}
              </span>
            )}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {canSpeak && (
            <button
              onClick={toggleVoice}
              aria-label={voiceOn ? "Mute guardian voice" : "Unmute guardian voice"}
              title={voiceOn ? "Voice on, click to mute" : "Voice off, click to unmute"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: voiceOn ? g.color : "var(--muted2)",
                fontSize: 15,
                lineHeight: 1,
                padding: "2px 4px",
                marginRight: 2,
              }}
            >
              {voiceOn ? "🔊" : "🔇"}
            </button>
          )}
          {Array.from({ length: g.maxTurns }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: 99,
                background: i < g.maxTurns - turnsLeft ? "var(--muted2)" : g.color,
                boxShadow: i < g.maxTurns - turnsLeft ? "none" : `0 0 8px -2px ${g.color}`,
              }}
            />
          ))}
          {onClose && (
            <button onClick={onClose} aria-label="Close" style={{ marginLeft: 8, background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      <FaceOff
        g={g}
        myKey={ownedKey}
        myChamp={myChamp}
        myType={myType}
        guardianSpeaking={guardianSpeaking}
        outcome={outcome}
      />

      <div
        ref={scrollRef}
        className="panel"
        style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, minHeight: embedded ? 240 : 320 }}
      >
        <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", textAlign: "center", lineHeight: 1.6 }}>
          {g.brief}
          <br />
          <span style={{ color: g.color }}>Make {g.name} say the secret word. Go.</span>
        </div>
        {msgs.map((m, i) => (
          <Bubble
            key={i}
            role={m.role}
            color={g.color}
            text={m.content}
            onReplay={m.role === "assistant" && canSpeak ? () => speakCreature(m.content, g.level) : undefined}
          />
        ))}
        {pending && <Bubble role="assistant" color={g.color} text="…" typing />}
      </div>

      {outcome === "playing" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Unlock the audio context from inside the gesture — the reply is
            // voiced later, after the fetch, when we no longer have activation.
            if (voiceOn) primeCreature();
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
        <OutcomeCard
          won={outcome === "won"}
          g={g}
          secret={secret}
          turnsUsed={g.maxTurns - turnsLeft}
          onRetry={retry}
          onExit={onExit}
          onNext={canNext && nextG ? () => onNext(nextG) : undefined}
        />
      )}
    </div>
  );
}

// The stand-off: the guardian and YOUR champion squared up across a "VS", so the
// chat below reads as the two of them talking face to face rather than a bare
// prompt box. The portrait of whoever is "live" glows brighter.
function FaceOff({
  g,
  myKey,
  myChamp,
  myType,
  guardianSpeaking,
  outcome,
}: {
  g: GuardianPub;
  myKey: string | null;
  myChamp: ReturnType<ReturnType<typeof useChampions.getState>["get"]> | null;
  myType: CreatureType;
  guardianSpeaking: boolean;
  outcome: Outcome;
}) {
  const playing = outcome === "playing";
  const yourTurn = playing && !guardianSpeaking;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 10,
        padding: "10px 6px 14px",
      }}
    >
      <GuardianPortrait g={g} live={guardianSpeaking} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--muted2)", letterSpacing: 1 }}>
          VS
        </span>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{guardianSpeaking ? "🗣️" : "💬"}</span>
      </div>

      <Challenger myKey={myKey} myChamp={myChamp} myType={myType} live={yourTurn} />
    </div>
  );
}

function GuardianPortrait({ g, live }: { g: GuardianPub; live: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: "22%",
          display: "grid",
          placeItems: "center",
          fontSize: 42,
          background: `radial-gradient(120% 120% at 50% 22%, color-mix(in srgb, ${g.color} 30%, #0c0b12), #0c0b12)`,
          border: `2px solid ${g.color}`,
          boxShadow: live
            ? `0 0 46px -6px ${g.color}, inset 0 0 26px -12px ${g.color}`
            : `0 0 26px -14px ${g.color}, inset 0 0 26px -18px ${g.color}`,
          transition: "box-shadow .3s ease, filter .3s ease",
          filter: live ? "brightness(1.12) saturate(1.1)" : "brightness(0.86)",
        }}
      >
        {GUARDIAN_GLYPH[g.level] ?? "🛡️"}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{g.name}</div>
      <div className="mono" style={{ fontSize: 10, color: g.color, letterSpacing: 0.5 }}>
        LVL {g.level} · {g.title}
      </div>
    </div>
  );
}

function Challenger({
  myKey,
  myChamp,
  myType,
  live,
}: {
  myKey: string | null;
  myChamp: ReturnType<ReturnType<typeof useChampions.getState>["get"]> | null;
  myType: CreatureType;
  live: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
        transition: "filter .3s ease, opacity .3s ease",
        filter: live ? "brightness(1.1)" : "brightness(0.82)",
        opacity: live ? 1 : 0.92,
      }}
    >
      {myKey && myChamp ? (
        <ChampionAvatar ckey={myKey} type={myType} champion={myChamp} size={92} />
      ) : (
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "22%",
            display: "grid",
            placeItems: "center",
            fontSize: 42,
            background: "radial-gradient(120% 120% at 50% 22%, color-mix(in srgb, var(--accent) 26%, #0c0b12), #0c0b12)",
            border: "2px solid var(--accent)",
            boxShadow: "0 0 26px -14px var(--accent), inset 0 0 26px -18px var(--accent)",
          }}
        >
          🧑‍🚀
        </div>
      )}
      <div style={{ fontWeight: 700, fontSize: 15 }}>{myKey || "YOU"}</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.5 }}>
        THE CHALLENGER
      </div>
    </div>
  );
}

function Bubble({
  role,
  color,
  text,
  typing,
  onReplay,
}: {
  role: "user" | "assistant";
  color: string;
  text: string;
  typing?: boolean;
  onReplay?: () => void;
}) {
  const me = role === "user";
  return (
    <div className="pop" style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
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
      {onReplay && !typing && (
        <button
          onClick={onReplay}
          aria-label="Replay voice"
          title="Replay voice"
          style={{
            flexShrink: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted2)",
            fontSize: 12,
            lineHeight: 1,
            padding: 2,
          }}
        >
          🔊
        </button>
      )}
    </div>
  );
}

function OutcomeCard({
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
    <div className="fadein panel" style={{ ["--ac" as string]: col, marginTop: 12, padding: 20, textAlign: "center", boxShadow: `0 0 70px -34px ${col}` }}>
      <div className="glow" style={{ fontSize: 24, fontWeight: 800, color: col }}>
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
