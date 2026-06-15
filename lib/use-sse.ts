"use client";
import { useEffect, useRef } from "react";

// Subscribe to an SSE endpoint. `url` of null pauses. Each `data:` line is parsed
// as JSON and passed to onEvent. Auto-closes on the engine's terminal "end".
export function useSSE<T extends { type: string }>(
  url: string | null,
  onEvent: (ev: T) => void,
  opts: { closeOn?: string } = {},
) {
  const cb = useRef(onEvent);
  cb.current = onEvent;
  const closeOn = opts.closeOn ?? "end";

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      let ev: T;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return;
      }
      cb.current(ev);
      if (ev.type === closeOn) es.close();
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [url, closeOn]);
}
