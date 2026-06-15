"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HouseEnd, HouseEvent, HousePlayerPub, HouseVotes } from "@/lib/types";

export interface PlayerView extends HousePlayerPub {
  alive: boolean;
  line: string;
  thought: string;
}

export interface HouseState {
  phase: "idle" | "day" | "night" | "vote" | "done";
  round: number;
  players: PlayerView[];
  speaking: string | null;
  night: { victim: string | null; victimName: string | null; blocked: boolean; events: { kind: string; txt: string }[] } | null;
  votes: HouseVotes | null;
  end: HouseEnd | null;
  feed: { txt: string; kind: string }[];
}

const DELAYS: Record<string, number> = { start: 700, round: 900, night: 2400, speak: 1700, votes: 2600, end: 300 };

const init: HouseState = {
  phase: "idle",
  round: 0,
  players: [],
  speaking: null,
  night: null,
  votes: null,
  end: null,
  feed: [],
};

export function useHouse() {
  const [state, setState] = useState<HouseState>(init);
  const es = useRef<EventSource | null>(null);
  const queue = useRef<HouseEvent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEndCb = useRef<(e: HouseEnd) => void>(undefined);

  const stop = useCallback(() => {
    es.current?.close();
    es.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = [];
  }, []);

  const apply = useCallback((ev: HouseEvent) => {
    setState((s) => {
      switch (ev.type) {
        case "start":
          return {
            ...init,
            phase: "day",
            players: ev.players.map((p) => ({ ...p, alive: true, line: "", thought: "" })),
            feed: [{ txt: `The house gathers — ${ev.players.length} contestants, ${ev.traitors_n} hidden traitor(s).`, kind: "info" }],
          };
        case "round":
          return { ...s, round: ev.round, speaking: null };
        case "night":
          return {
            ...s,
            phase: "night",
            night: { victim: ev.victim, victimName: ev.victim_name, blocked: ev.blocked, events: ev.events },
            players: s.players.map((p) => (ev.victim && p.key === ev.victim ? { ...p, alive: false } : p)),
            feed: [
              ...s.feed,
              {
                txt: ev.blocked
                  ? "A night attack was shielded — no one died."
                  : ev.victim_name
                    ? `${ev.victim_name} was eliminated in the night.`
                    : "The night passed quietly.",
                kind: "night",
              },
            ],
          };
        case "speak":
          return {
            ...s,
            phase: "day",
            speaking: ev.actor,
            players: s.players.map((p) => (p.key === ev.actor ? { ...p, line: ev.line, thought: ev.thought } : p)),
          };
        case "votes":
          return {
            ...s,
            phase: "vote",
            votes: ev,
            speaking: null,
            players: s.players.map((p) => (p.key === ev.banished ? { ...p, alive: false } : p)),
            feed: [
              ...s.feed,
              { txt: `${ev.banished_name} was banished — ${ev.banished_traitor ? "a TRAITOR!" : "but FAITHFUL."}`, kind: ev.banished_traitor ? "good" : "bad" },
            ],
          };
        case "end":
          return { ...s, phase: "done", end: ev };
      }
    });
  }, []);

  const pump = useCallback(() => {
    const ev = queue.current.shift();
    if (!ev) {
      timer.current = setTimeout(pump, 200);
      return;
    }
    apply(ev);
    if (ev.type === "end") onEndCb.current?.(ev);
    else timer.current = setTimeout(pump, DELAYS[ev.type] ?? 1200);
  }, [apply]);

  const begin = useCallback(
    (url: string, onEnd?: (e: HouseEnd) => void) => {
      stop();
      onEndCb.current = onEnd;
      setState(init);
      const source = new EventSource(url);
      es.current = source;
      let started = false;
      source.onmessage = (e) => {
        let ev: HouseEvent;
        try {
          ev = JSON.parse(e.data);
        } catch {
          return;
        }
        queue.current.push(ev);
        if (!started) {
          started = true;
          timer.current = setTimeout(pump, 300);
        }
        if (ev.type === "end") source.close();
      };
      source.onerror = () => source.close();
    },
    [pump, stop],
  );

  useEffect(() => () => stop(), [stop]);
  return { ...state, begin, stop };
}
