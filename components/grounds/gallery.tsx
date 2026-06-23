"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The autonomous league loop — the engine behind the Amphitheatre.
//
// Two real champions are paired at random and fight a live (real-LLM, unranked)
// bout streamed from `/api/battle`; turns are paced client-side so spectators can
// follow the trade of blows. Each verdict evolves the local champions store
// (rating + skills + opponent memory) exactly like a real duel, then the next
// pairing steps in. The loop only runs while the hook is mounted — i.e. while
// you're standing in the Amphitheatre — so it never burns calls in the wilds.
//
// This hook is presentation-agnostic: it returns the live fighters, whether a
// bout is in progress, and the latest verdict. <Amphitheatre> turns that into
// bodies on the dais, ranked banners, and a victor on the throne.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { BattleEnd, BattleEvent, BattleTurn, Style } from "@/lib/types";
import type { GroundChampion } from "@/components/grounds/world";
import { TYPE_COLOR, dominant, blankStyle, accrue } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { sideParams } from "@/lib/recipe-params";
import { useChampions } from "@/store/champions";

// module-level singleton: only the most-recently-started loop is ever ACTIVE, so
// StrictMode double-invokes / remounts / hot-reloads can never stack EventSources
let ACTIVE_LOOP = 0;

// shared channel: the venue flags when a bout is live + where the ring sits, so
// the CameraController can ease onto the fight while the player stands close.
export interface GalleryFocus {
  active: boolean;
  center: THREE.Vector3;
}

const TURN_MS = 1900; // pacing between revealed turns (real LLM, so unhurried)
const REST_MS = 2600; // beat between bouts while the verdict callout sits up

export interface LeagueFighters {
  a: GroundChampion;
  b: GroundChampion;
  hpA: number;
  hpB: number;
  actor: string | null;
  punchA: number;
  punchB: number;
  hitA: number;
  hitB: number;
}

export interface LeagueVerdict {
  winner: string;
  loser: string;
  wColor: string;
  delta: number;
  topic: string;
  line: string;
}

export interface LeagueState {
  fighters: LeagueFighters | null;
  live: boolean;
  verdict: LeagueVerdict | null;
}

export function useLeague(champions: GroundChampion[]): LeagueState {
  const [fighters, setFighters] = useState<LeagueFighters | null>(null);
  const [live, setLive] = useState(false);
  const [verdict, setVerdict] = useState<LeagueVerdict | null>(null);

  const championsRef = useRef(champions);
  championsRef.current = champions;
  const verdictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runOne = useCallback((): Promise<void> => {
    const list = championsRef.current;
    if (list.length < 2) return Promise.resolve();
    const store = useChampions.getState();
    const pool = [...list];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const ra = store.getRecipe(a.key);
    const rb = store.getRecipe(b.key);
    const url = `/api/battle?a=${a.key}&b=${b.key}&${sideParams("a", ra)}&${sideParams("b", rb)}`;

    setFighters({ a, b, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0 });
    setLive(true);
    setVerdict(null);

    const myId = ACTIVE_LOOP;
    const history: BattleTurn[] = [];
    const counters = { pa: 0, pb: 0, ha: 0, hb: 0 };

    return new Promise<void>((resolve) => {
      const queue: BattleEvent[] = [];
      let timer: ReturnType<typeof setTimeout> | null = null;
      let topic = "";
      let ended = false;
      const es = new EventSource(url);

      const finish = (end: BattleEnd | null) => {
        if (ended) return;
        ended = true;
        es.close();
        if (timer) clearTimeout(timer);
        if (myId !== ACTIVE_LOOP) return resolve();
        if (end) {
          const winner = end.winner;
          const loser = winner === a.key ? b.key : a.key;
          const styles: Record<string, Style> = { [a.key]: blankStyle(), [b.key]: blankStyle() };
          for (const t of history) accrue(t.actor === a.key ? styles[a.key] : styles[b.key], t);

          const before = ratingOf(store.get(winner));
          store.recordBattle(winner, loser, styles);
          const delta = Math.round(ratingOf(store.get(winner)) - before);

          const wName = winner === a.key ? a.name : b.name;
          const lName = loser === a.key ? a.name : b.name;
          store.learnFromBout({ key: winner, opponentName: lName, won: true, axisLabel: dominant(store.get(winner)).axis.label });
          store.learnFromBout({ key: loser, opponentName: wName, won: false, axisLabel: dominant(store.get(loser)).axis.label });

          setVerdict({
            winner: wName,
            loser: lName,
            wColor: TYPE_COLOR[(winner === a.key ? a : b).type] ?? "#fff",
            delta,
            topic,
            line: end.mvp?.line || "",
          });
        }
        setLive(false);
        resolve();
      };

      const pump = () => {
        if (myId !== ACTIVE_LOOP) return finish(null);
        const ev = queue.shift();
        if (!ev) {
          timer = setTimeout(pump, 240);
          return;
        }
        if (ev.type === "turn") {
          history.push(ev);
          if (ev.actor === a.key) {
            counters.pa++;
            if (ev.dmg > 0) counters.hb++;
          } else {
            counters.pb++;
            if (ev.dmg > 0) counters.ha++;
          }
          setFighters((f) => (f ? { ...f, hpA: ev.a_hp, hpB: ev.b_hp, actor: ev.actor, punchA: counters.pa, punchB: counters.pb, hitA: counters.ha, hitB: counters.hb } : f));
          timer = setTimeout(pump, TURN_MS);
        } else if (ev.type === "end") {
          setFighters((f) => (f ? { ...f, hpA: ev.a_hp, hpB: ev.b_hp, actor: null } : f));
          finish(ev);
        }
      };

      es.onmessage = (e) => {
        let ev: BattleEvent;
        try {
          ev = JSON.parse(e.data);
        } catch {
          return;
        }
        if (ev.type === "start") {
          topic = ev.topic;
          timer = setTimeout(pump, 900);
        } else if (ev.type === "ranked") {
          // never requested (unranked league) — ignore defensively
        } else {
          queue.push(ev);
        }
      };
      es.onerror = () => finish(null);
    });
  }, []);

  useEffect(() => {
    ACTIVE_LOOP += 1;
    const myId = ACTIVE_LOOP;
    let rest: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled && myId === ACTIVE_LOOP) {
        await runOne();
        if (cancelled || myId !== ACTIVE_LOOP) break;
        await new Promise<void>((r) => {
          rest = setTimeout(r, REST_MS);
        });
      }
    };
    loop();
    return () => {
      cancelled = true;
      ACTIVE_LOOP += 1; // invalidate this loop; any in-flight stream no-ops
      if (rest) clearTimeout(rest);
      if (verdictTimer.current) clearTimeout(verdictTimer.current);
    };
  }, [runOne]);

  // hold the verdict up for a beat, then clear so the banners are the calm default
  useEffect(() => {
    if (!verdict) return;
    if (verdictTimer.current) clearTimeout(verdictTimer.current);
    verdictTimer.current = setTimeout(() => setVerdict(null), REST_MS - 200);
  }, [verdict]);

  return { fighters, live, verdict };
}
