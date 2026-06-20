"use client";
// Bridges the client champion store to the server-authoritative save. On mount
// it hydrates (last-write-wins by updatedAt) and then debounce-pushes every
// change. Failures are non-fatal: with no network or no Redis provisioned the
// game simply stays local-first, exactly as before. localStorage is now a cache
// in front of this, not the source of truth.
import { useEffect } from "react";
import { getOwnerToken } from "@/lib/owner";
import { useChampions } from "@/store/champions";
import type { PlayerSave } from "@/lib/types";

const PUSH_DEBOUNCE_MS = 1500;

export function usePlayerSync() {
  useEffect(() => {
    // StrictMode may run this twice in dev; each run owns its own listener and
    // cleanup, and the hydrate/push path is idempotent (last-write-wins), so a
    // double-invoke is harmless.
    const token = getOwnerToken();
    if (!token) return;

    let cancelled = false;
    let hydrated = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    async function push() {
      const save = useChampions.getState().snapshotSave();
      try {
        const r = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerToken: token, save }),
          keepalive: true,
        });
        if (r.ok) {
          const { updatedAt } = (await r.json()) as { updatedAt?: number };
          if (!cancelled) useChampions.setState({ lastServerSync: updatedAt ?? save.updatedAt });
        }
      } catch {
        // offline — leave the local cache as-is; next change retries
      }
    }

    function schedulePush() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(push, PUSH_DEBOUNCE_MS);
    }

    function subscribe() {
      unsub = useChampions.subscribe((s, prev) => {
        if (!hydrated) return;
        const changed =
          s.progress !== prev.progress ||
          s.recipes !== prev.recipes ||
          // crowns are NOT synced via the save blob — the wallet is authoritative
          s.owned !== prev.owned ||
          s.predict !== prev.predict ||
          s.daily !== prev.daily ||
          s.force !== prev.force ||
          s.forcePoints !== prev.forcePoints;
        if (changed) schedulePush();
      });
    }

    async function hydrate() {
      try {
        const res = await fetch(`/api/save?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const { save } = (await res.json()) as { save: PlayerSave | null };
          if (!cancelled) {
            const store = useChampions.getState();
            if (save && save.updatedAt > store.lastServerSync) {
              store.applyServerSave(save); // another device is ahead — take it
            } else {
              await push(); // server empty or we're fresher — seed/refresh it
            }
          }
        }
      } catch {
        // not provisioned / offline → stay purely local-first
      } finally {
        if (!cancelled) {
          hydrated = true;
          subscribe();
          // Reconcile the authoritative wallet balance (server wins) — crowns no
          // longer travel in the save blob.
          useChampions.getState().syncWallet();
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (unsub) unsub();
    };
  }, []);
}
