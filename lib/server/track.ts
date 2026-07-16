// Behaviour analytics — a tiny, privacy-light tracker that answers "how are
// people actually using this?" without any third-party SDK, cookie, or per-user
// trail. It records AGGREGATE per-day counters in the same store as the LLM cost
// accounting (Upstash Redis, or the in-memory fallback in dev) and counts
// distinct active players via HyperLogLog keyed on the anonymous owner token.
//
// Two shapes of metric share one counter hash per day:
//   • counts  — one increment per action (session, claim, bout, …)
//   • amounts — Crown sums for the economy view (`earn`, `spend`)
// The label in the dashboard makes the difference legible.
import "server-only";
import { getStore, isShared } from "./store";
import type { Analytics, DayStat } from "@/lib/stats-types";

export type { Analytics, DayStat } from "@/lib/stats-types";

const utcDay = (now = Date.now()) => Math.floor(now / 86_400_000);

// The full event vocabulary. Server-recorded events come from the authoritative
// game paths (a bout the engine decided, a wallet move the server settled);
// client-recorded events (see CLIENT_EVENTS in /api/track) cover things only the
// browser sees, like a page session or a render error.
export const Z_EVENTS = [
  "session", // an app load (one per page visit)
  "new_user", // first-ever session from this browser
  "return", // a session from a browser that has been here before
  "claim", // claimed a champion onto the ladder
  "train", // trained a champion (doctrine retune or a paid session)
  "bout", // a player ranked bout completed
  "bout_win", // …that the player won
  "daily", // opened/played the Daily Tribunal
  "explore", // entered the 3D Grounds
  "node", // claimed a world cache / fragment
  "goal", // cleared a world objective
  "bet", // placed a wager
  "bet_win", // …that paid out
  "earn", // SUM of Crowns earned
  "spend", // SUM of Crowns spent
  "error", // a client render/runtime error
  // ── first-journey funnel (docs/two-doors.md §5) — one per browser, so these
  //    read as unique-visitor steps through onboarding, not replays ──
  "fj_cinematic", // finished the intro cinematic (didn't skip)
  "fj_pick", // picked a starter champion
  "fj_tune", // tuned its strategy (doctrine)
  "fj_duel", // finished the first duel
  "fj_evolve", // saw the first evolution (the payoff moment)
  "fj_land", // reached the Concord landing
  // time-to-first-evolution buckets (gate 1) — client-bucketed, one per browser
  "ttfe_u5", // first evolution in < 5 min
  "ttfe_u8", // …in 5–8 min
  "ttfe_over", // …in > 8 min
  // the mobile Climb-first door (docs/two-doors.md §3)
  "m_splash", // saw the mobile splash poster
  "m_fly", // tapped "Fly" from the splash
  "m_guest_run", // started a guest Climb run (no champion yet)
  "m_claim_from_climb", // reached adoption via the Climb claim hook
] as const;

export type ZEvent = (typeof Z_EVENTS)[number];

// Record one event. Best-effort: analytics must never throw into a game path,
// exactly like cost accounting. `by` is the increment (1 for a count, an amount
// for `earn`/`spend`). When a token is given, the player counts as active today.
export async function track(type: ZEvent, token?: string, by = 1): Promise<void> {
  try {
    const day = utcDay();
    const store = getStore();
    const inc = Math.round(by);
    if (inc > 0) await store.trackEvent(day, type, inc);
    if (token) await store.trackUnique(day, token);
  } catch {
    // analytics is non-fatal
  }
}

// Build the dashboard payload over the last `windowDays` UTC days.
export async function getAnalytics(windowDays = 14): Promise<Analytics> {
  const store = getStore();
  const today = utcDay();
  const days = Array.from({ length: windowDays }, (_, i) => today - (windowDays - 1 - i));

  const [eventsByDay, dauByDay] = await Promise.all([
    Promise.all(days.map((d) => store.getEvents(d))),
    Promise.all(days.map((d) => store.uniqueCount([d]))),
  ]);

  const series: DayStat[] = days.map((d, i) => ({
    day: d,
    date: new Date(d * 86_400_000).toISOString().slice(0, 10),
    events: eventsByDay[i],
    dau: dauByDay[i],
  }));

  const totals: Record<string, number> = {};
  for (const e of eventsByDay) for (const [k, v] of Object.entries(e)) totals[k] = (totals[k] ?? 0) + v;

  const lastN = (n: number) => store.uniqueCount(Array.from({ length: n }, (_, i) => today - i));
  const [dau, wau, mau] = await Promise.all([lastN(1), lastN(7), lastN(30)]);

  const funnel: Analytics["funnel"] = [
    { label: "Visited", key: "session", value: totals.session ?? 0 },
    { label: "Cinematic", key: "fj_cinematic", value: totals.fj_cinematic ?? 0 },
    { label: "Picked", key: "fj_pick", value: totals.fj_pick ?? 0 },
    { label: "Tuned", key: "fj_tune", value: totals.fj_tune ?? 0 },
    { label: "First duel", key: "fj_duel", value: totals.fj_duel ?? 0 },
    { label: "Evolved", key: "fj_evolve", value: totals.fj_evolve ?? 0 },
    { label: "Landed", key: "fj_land", value: totals.fj_land ?? 0 },
    { label: "Claimed", key: "claim", value: totals.claim ?? 0 },
    { label: "Trained", key: "train", value: totals.train ?? 0 },
    { label: "Fought", key: "bout", value: totals.bout ?? 0 },
    { label: "Returned", key: "return", value: totals.return ?? 0 },
  ];

  return {
    shared: isShared(),
    generatedAt: Date.now(),
    windowDays,
    today: eventsByDay[eventsByDay.length - 1] ?? {},
    totals,
    series,
    active: { dau, wau, mau },
    funnel,
  };
}
