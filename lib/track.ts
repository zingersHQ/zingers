"use client";
// Client-side behaviour tracking — fire-and-forget pings to /api/track for the
// handful of events only the browser can see (a session, entering the Grounds,
// opening the Daily, a render error). Uses navigator.sendBeacon when available
// so a ping survives a navigation/unload; falls back to keepalive fetch. Every
// call is best-effort and silent — analytics must never disturb the game.
import { getOwnerToken } from "@/lib/owner";

// Distinguishes a brand-new browser from a returning one (no account needed).
const SEEN_KEY = "zingers_seen_v1";
// wall-clock (ms) of the first-ever session → time-to-first-evolution (gate 1)
const FJ_START_KEY = "zingers_fj_start_v1";
const TTFE_DONE_KEY = "zingers_ttfe_done_v1";

export type ClientEvent =
  | "session" | "new_user" | "return" | "daily" | "explore" | "error"
  // first-journey funnel (docs/two-doors.md §5) — one per browser
  | "fj_cinematic" | "fj_pick" | "fj_tune" | "fj_duel" | "fj_evolve" | "fj_land"
  // time-to-first-evolution buckets (client-computed, one per browser)
  | "ttfe_u5" | "ttfe_u8" | "ttfe_over"
  // the mobile Climb-first door (docs/two-doors.md §3)
  | "m_splash" | "m_fly" | "m_guest_run" | "m_claim_from_climb"
  | "sol_link"
  | "sol_restore"
  | "sol_link_no_wallet"
  // nail-it P0 — Climb share / prove / challenge + ascent-first funnel
  | "fj_train_to_ascent"
  | "climb_share_native" | "climb_share_copy"
  | "climb_prove_open" | "climb_prove_start" | "climb_prove_win" | "climb_prove_lose" | "climb_prove_resume"
  | "climb_challenge_open"
  | "climb_challenge_beat"
  | "climb_challenge_surpass"
  | "climb_challenge_overtake"
  | "climb_challenge_miss";

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

// Fire an event at most once per browser (localStorage latch). Used for the
// first-journey funnel so each step reads as a unique-visitor count, not a replay.
// If storage is unavailable (private mode), it fires every time — acceptable.
export function trackOnce(type: ClientEvent, latchKey: string): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(latchKey)) return;
    localStorage.setItem(latchKey, String(Date.now()));
  } catch {
    // no storage — fall through and still fire the ping
  }
  post(type);
}

// The first evolution is the payoff moment (gate 1). Fire the funnel step once,
// and bucket the elapsed time since the first session so time-to-first-evolution
// is visible on /stats without any per-user trail.
export function trackFirstEvolution(): void {
  trackOnce("fj_evolve", "zingers_fj_evolve_v1");
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(TTFE_DONE_KEY)) return;
    const startRaw = localStorage.getItem(FJ_START_KEY);
    const start = startRaw ? Number(startRaw) : Date.now();
    const mins = (Date.now() - start) / 60000;
    localStorage.setItem(TTFE_DONE_KEY, "1");
    post(mins < 5 ? "ttfe_u5" : mins < 8 ? "ttfe_u8" : "ttfe_over");
  } catch {
    // no storage — skip the bucket, the funnel step already fired
  }
}

// One call on app load: always a `session`, plus a `new_user`/`return` split so
// retention is visible without any login.
export function trackSession(): void {
  if (typeof window === "undefined") return;
  post("session");
  try {
    // stamp the journey start once, for time-to-first-evolution (gate 1)
    if (!localStorage.getItem(FJ_START_KEY)) localStorage.setItem(FJ_START_KEY, String(Date.now()));
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
