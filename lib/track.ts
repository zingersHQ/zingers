"use client";
// Client-side behaviour tracking — fire-and-forget pings to /api/track for the
// handful of events only the browser can see (a session, entering the Grounds,
// opening the Daily, a render error). Uses navigator.sendBeacon when available
// so a ping survives a navigation/unload; falls back to keepalive fetch. Every
// call is best-effort and silent — analytics must never disturb the game.
import { getOwnerToken } from "@/lib/owner";

// Distinguishes a brand-new browser from a returning one (no account needed).
const SEEN_KEY = "zingers_seen_v1";

export type ClientEvent = "session" | "new_user" | "return" | "daily" | "explore" | "error";

function post(type: ClientEvent): void {
  if (typeof window === "undefined") return;
  try {
    const ownerToken = getOwnerToken();
    const payload = JSON.stringify({ type, ownerToken });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // tracking is non-fatal
  }
}

export function track(type: Exclude<ClientEvent, "session" | "new_user" | "return">): void {
  post(type);
}

// One call on app load: always a `session`, plus a `new_user`/`return` split so
// retention is visible without any login.
export function trackSession(): void {
  if (typeof window === "undefined") return;
  post("session");
  try {
    if (localStorage.getItem(SEEN_KEY)) {
      post("return");
    } else {
      post("new_user");
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    }
  } catch {
    // private mode / no storage — the session ping still landed
  }
}
