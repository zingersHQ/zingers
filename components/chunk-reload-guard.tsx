"use client";
// Self-heal stale-chunk hangs. A tab left open across a deploy holds references
// to old JS/CSS chunk hashes; the next lazy import (route transition, a dynamic
// 3D scene, a mobile tab) then 404s and the SPA silently hangs on whatever
// loading screen was up — the "stuck entering the grounds" report. A fresh
// full-page load pulls the new chunk manifest and recovers. We reload at most
// once per cooldown so a genuinely-missing asset can't spin in a reload loop.
import { useEffect } from "react";

const COOLDOWN_KEY = "zg:chunk-reload-at";
const COOLDOWN_MS = 20_000;

const CHUNK_ERROR = /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|(?:error|failed) (?:loading|to fetch) dynamically imported module/i;

function looksLikeChunkError(name?: string, message?: string): boolean {
  if (name === "ChunkLoadError") return true;
  return !!message && CHUNK_ERROR.test(message);
}

export function ChunkReloadGuard() {
  useEffect(() => {
    const recover = () => {
      try {
        const last = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
        if (Date.now() - last < COOLDOWN_MS) return; // already tried very recently
        sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      } catch {
        // sessionStorage unavailable (private mode edge) — still worth one reload
      }
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      if (looksLikeChunkError((e.error as Error | undefined)?.name, e.message)) recover();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { name?: string; message?: string } | string | undefined;
      const name = typeof r === "object" ? r?.name : undefined;
      const message = typeof r === "string" ? r : r?.message;
      if (looksLikeChunkError(name, message)) recover();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
