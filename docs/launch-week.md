# ZINGERS — Launch-week plan (and the Flight-First reframe)

> **Status (July 2026):** Launch v0.1 **engineering closed**. Treat this doc as the
> historical plan + remaining **ops** checklist. **Live roadmap & phase checkboxes:**
> [`flight-first-plan.md`](./flight-first-plan.md). Ops remaining: human playtests, key art,
> growth push, weekly ship notes.
>
> **In short:** Ordered ship plan for Launch v0.1. P4 was the surgical recut of the
> first 90 seconds to **wake → fly → claim → it flies beside you → climb → battles**.

Version 1.1 — July 2026. Companions: [`design-vision.md`](./design-vision.md) v3.0
(north star), [`two-doors.md`](./two-doors.md) v2.0, [`flight-first-plan.md`](./flight-first-plan.md)
(active status), [`first-journey-roadmap.md`](./first-journey-roadmap.md) (historical fight-led Act 1),
[`flyover.md`](./flyover.md), [`essence.md`](./essence.md). Copy follows
[`vocabulary.md`](./vocabulary.md); identifiers/keys never change for copy reasons.

---

## The gates (Launch v0.1)

The six Launch v0.1 gates (per `AGENCY.md`) are the bar. This doc's phases serve
gates 1–2 and 5 especially (understandability, fun, growth-readiness):

1. A stranger understands the game fast (time-to-first-"oh, I get it").
2. It's fun on first contact (first session doesn't bounce).
3. Reward loop is felt, not just present.
4. Reliable (bout latency, Climb feel on real devices).
5. Shareable / growth-ready (the Flight door + bond/challenge share).
6. Playable as a plain web game anywhere (no dead ends).

The measurement plan that turns 1–2 into numbers lives in `two-doors.md` §5 (the
`fj_*` funnel + TTFE buckets + the mobile-door events). **Instrument before
recutting** so P4's effect is visible from day one.

---

## Phases (ordered)

### P0–P3 — see the per-area docs
Measurement (`two-doors.md` §5), the mobile Climb-first door + guest Climb
(`two-doors.md` §3), the vocabulary sweep (`two-doors.md` §7 T3), and the Climb
100-sector build (`climb.md` §10) are tracked in their own docs. This doc owns P4.

### P4 — The Flight-First reframe (the onboarding recut)

**Goal:** the first 90 seconds teach *fly → it fights*, not *fight → then a world*.
The shipped Act 1 (`first-journey-roadmap.md`) is fight-led: FirstRun cinematic →
adopt → tune → Void duel → evolve card → Concord landing. v3.0 reorders the opening.

**Target first-90s:**

```
wake → FLY (you, jetpack, the sky above the Vault)
     → a wild mind FLIES BESIDE YOU
     → CLAIM it (the fall-card / adopt hook)
     → raise it a touch (one strategy nudge)
     → CLIMB a short Reach / Gate (the first real skill beat)
     → the battle reveals itself (optional first duel, now motivated: it gates the climb)
     → Concord / free roam
```

**The reframe, concretely (surgical — re-sequencing, not new systems):**

- **Open on flight, not cinematic exposition.** The first interactive beat is the
  one-thumb / hold-to-thrust flight (mobile: `circuit-lite.tsx`; desktop: the
  guided first flight). The FirstRun cinematic (`components/intro/first-run.tsx`)
  becomes the *skippable* frame around the flight, not the gate before it.
- **The wingmate first, the roster second.** A wild mind flies beside you during
  the first flight (mobile already does this via the guest/loaner Climb,
  `two-doors.md` §3.3). Claiming happens *after* attachment, on the natural pause
  (the fall card), not as a cold character-select.
- **Teach the canon line by doing it:** *You fly. It fights. You both rise.* — the
  90-second contract in `design-vision.md` §8. The FIRST FLIGHT beat
  (`lib/lore/character-beats.ts`, reconciled to wingmate flight) carries the voice.
- **Battle is motivated, not front-loaded.** The first duel arrives *because* a
  Gate wants a stronger champion (battles-as-altitude-keys, `flyover.md` §3) — so
  the fight feels like something the climb asked for, not a tutorial checkbox.
- **Reuse the machinery.** The guided-landing system (`guideWorld`/`guideUrgent`,
  spotlit gates, `TravelVeil`, the sound gallery) is repointed at the flight beat;
  no new onboarding engine.

**Acceptance:**
- New desktop player's first interactive verb is flight within ~15s of engaging.
- The 90-second contract's three lines are all teachable from the opening beat.
- `fj_*` funnel (`two-doors.md` §5) still fires; TTFE unaffected or improved.
- Ranked Climb loop untouched (one fall → sector 1); `next build` + lints clean.

**Dependencies / flags:**
- Key art poster (the Trainer flying, champion on the wing) — the one external
  asset, now game-wide (landing, splash, share, `bible/art-direction.md`), owner:
  human. Ships with a typographic fallback if art isn't ready (`two-doors.md` §7 T2).
- Battles-as-altitude-keys (`flyover.md` §3) needs its own small design pass before
  the "motivated first duel" step; until then the first duel stays lightly guided
  (as today) but reframed in copy as *the climb needs a stronger champion*.

### P5 — Read the numbers, iterate
Per `two-doors.md` §T4: after a week of traffic, the funnel bounce-point, TTFE
buckets, and guest→claim conversion decide the next move (deepen watch-drama vs.
tune the flight vs. iterate the door). Feeds the weekly ledger.

---

## What launch-week deliberately does NOT change

- The desktop game's scope, the engine, ELO, judge bounds, Crowns authority
  (`AGENCY.md` guardrails).
- The mobile shell architecture and verb bodies (`mobile.md`) — only the opening
  sequence and its framing.
- Analytics/event keys, `bout` vocabulary in code (`AGENTS.md`).
