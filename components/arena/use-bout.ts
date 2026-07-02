"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BattleEnd, BattleEvent, BattleRanked, BattleStart, BattleTurn } from "@/lib/types";
import { speakCreatureType, stopCreature } from "@/lib/creature-voice";
import { hitSfx } from "@/lib/sfx";
import { ambienceFlourish, setAmbienceIntensity } from "@/lib/ambience-bus";

export interface BoutState {
  phase: "idle" | "live" | "done";
  start: BattleStart | null;
  turn: BattleTurn | null;
  history: BattleTurn[];
  hpA: number;
  hpB: number;
  end: BattleEnd | null;
}

const TURN_MS = 1700;

// Streams a battle and paces turns client-side for drama. Buffers SSE into a
// queue and reveals one turn at a time.
export function useBout() {
  const [state, setState] = useState<BoutState>({
    phase: "idle",
    start: null,
    turn: null,
    history: [],
    hpA: 100,
    hpB: 100,
    end: null,
  });
  const queue = useRef<BattleEvent[]>([]);
  const es = useRef<EventSource | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEnd = useRef<(e: BattleEnd, ranked: BattleRanked | null) => void>(undefined);
  // ranked swing arrives just before `end`; stash it (not paced like turns) so we
  // can hand it to onEnd when the bout reveal finishes
  const ranked = useRef<BattleRanked | null>(null);

  const stop = useCallback(() => {
    es.current?.close();
    es.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = [];
    stopCreature();
    setAmbienceIntensity(0); // an abandoned bout shouldn't leave the music wound up
  }, []);

  const pump = useCallback(() => {
    const ev = queue.current.shift();
    if (!ev) {
      timer.current = setTimeout(pump, 220);
      return;
    }
    if (ev.type === "turn") {
      setState((s) => ({
        ...s,
        turn: ev,
        history: [...s.history, ev],
        hpA: ev.a_hp,
        hpB: ev.b_hp,
      }));
      // voice the line in the actor's creature-type voice; punctuate a hit
      speakCreatureType(ev.line, ev.actor_type);
      if (ev.dmg > 0) hitSfx(ev.dmg, !!ev.info?.crit);
      // music heat tracks the fight — rises as the losing side's resolve drains
      setAmbienceIntensity(1 - Math.min(ev.a_hp, ev.b_hp) / 100);
      timer.current = setTimeout(pump, TURN_MS);
    } else if (ev.type === "end") {
      stopCreature();
      ambienceFlourish("victory"); // the verdict phrase, then the heat releases
      setAmbienceIntensity(0);
      setState((s) => ({ ...s, phase: "done", end: ev, hpA: ev.a_hp, hpB: ev.b_hp }));
      pendingEnd.current?.(ev, ranked.current);
    }
  }, []);

  const begin = useCallback(
    (url: string, onEnd?: (e: BattleEnd, ranked: BattleRanked | null) => void) => {
      stop();
      pendingEnd.current = onEnd;
      ranked.current = null;
      setState({ phase: "live", start: null, turn: null, history: [], hpA: 100, hpB: 100, end: null });
      const source = new EventSource(url);
      es.current = source;
      source.onmessage = (e) => {
        let ev: BattleEvent;
        try {
          ev = JSON.parse(e.data);
        } catch {
          return;
        }
        if (ev.type === "start") {
          setState((s) => ({ ...s, start: ev }));
          timer.current = setTimeout(pump, 900);
        } else if (ev.type === "ranked") {
          // metadata, not a paced turn — stash for onEnd
          ranked.current = ev;
        } else {
          queue.current.push(ev);
          if (ev.type === "end") source.close();
        }
      };
      source.onerror = () => source.close();
    },
    [pump, stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { ...state, begin, stop };
}
