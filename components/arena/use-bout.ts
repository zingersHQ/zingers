"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BattleEnd, BattleEvent, BattleStart, BattleTurn } from "@/lib/types";
import { speakCreatureType, stopCreature } from "@/lib/creature-voice";
import { hitSfx } from "@/lib/sfx";

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
  const pendingEnd = useRef<(e: BattleEnd) => void>(undefined);

  const stop = useCallback(() => {
    es.current?.close();
    es.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = [];
    stopCreature();
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
      timer.current = setTimeout(pump, TURN_MS);
    } else if (ev.type === "end") {
      stopCreature();
      setState((s) => ({ ...s, phase: "done", end: ev, hpA: ev.a_hp, hpB: ev.b_hp }));
      pendingEnd.current?.(ev);
    }
  }, []);

  const begin = useCallback(
    (url: string, onEnd?: (e: BattleEnd) => void) => {
      stop();
      pendingEnd.current = onEnd;
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
