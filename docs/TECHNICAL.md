# ZINGERS: Technical one-pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### The LLM is the actor. The engine is the game.

A single, typed Next.js app — one runtime, no separate backend to babysit — that
runs a 3D world, streams live AI-vs-AI debate bouts, and evolves champions from
their real match history.

---

## Core principle

Combat is turn-based with explicit moves and **stat-driven resolution**: stats,
types, training, statuses, and seeded variance decide damage. A **judge model**
scores only the *quality* of a champion's line as a bounded multiplier
(≈0.7–1.3, 1.4 on a Highlight) — it can never single-handedly decide a match.
This keeps fights fair, reproducible, and cheap. *(`docs/game-spec.md`,
`docs/combat-design.md`.)*

## Stack

Next.js 16 (App Router) · React 19 · end-to-end **TypeScript** · **React Three
Fiber** (with Drei, Rapier physics, postprocessing) for the 3D Grounds ·
**Zustand** state · **Upstash Redis** server mirror · **Server-Sent Events**
for live bouts · **xAI (Grok)** as the built-in brain. Deployed on Vercel
(`zingers.gg` game host, `zingers.org` docs host), with a 6-hourly `/api/cron`.

---

## Architecture — one world, a thin server

- **The 3D Grounds** are the whole game surface: walk, claim, train, hunt goals,
  enter venues. Bodies morph live with career via a deterministic appearance
  function (`lib/evolve/appearance.ts`). Performance is disciplined by house
  rules: exponential damping (frame-rate independent easing), instanced GLTF
  props, `React.memo`'d scene dressing, palette-cached canvas textures, DPR/
  quality tiers, and "juice" (shake, FOV kicks, bursts) gated under
  `prefers-reduced-motion`. Mobile keeps exactly **one** WebGL canvas.
- **Battles stream over SSE** (`/api/battle`, plus headless `/api/sim`). Each
  turn event carries the move, resolved damage, an in-character line, a
  plain-English `why`, and a `trace[]` of the agent's tool steps. The client
  renders these with skip-to-verdict and an opt-in "Study" view of the trace.
- **The async league** is the headline mechanic: champions are AI, so PvP needs
  **neither human online**. The league runs bouts autonomously (surfaced in the
  Amphitheatre's gallery); you watch replays and climb an objective ELO ladder
  (`/standings`).
- **State is client-first, synced.** Careers live in `localStorage` and mirror to
  Redis via `/api/save`. The **career ledger** (`CareerEvent[]` + `AxisSnapshot[]`
  on `PlayerSave`) is a pure-additive, capped, append-only log emitted from every
  real moment — bout, level-up, tier-up, training, Keeper crack, season turn,
  first claim — in `store/champions.ts`. No per-turn LLM cost, no second canvas.
- **~25 API routes** (`app/api/*`) cover battle, sim, claim, roster, ladder,
  daily, guardian (Keepers), imprint, feed, war, save, wallet, card OG images,
  and a `/api/cost` meter.

## The pluggable agent layer

Every champion answers one contract — `act(view) → decision` — so any brain can
drive one. Live brains run a bounded **reason → act → observe → commit** tool
loop over read-only engine tools (`simulate_move`, `scout_opponent`,
`commit_move`), capped at 3 steps and streamed as `ToolStep`s so spectators watch
a mind scout and simulate before it strikes. Providers: built-in Grok, any
OpenAI-compatible model, an HTTP webhook, or a mock (offline). *(`docs/agent-protocol.md`.)*

## Cost & safety rails

LLM spend is metered (`lib/server/cost.ts`), IP rate-limited
(`lib/server/rate-limit.ts`), and gated by daily budgets. New model features
always ship **template-first**: a deterministic fallback runs when there's no
key, a per-owner daily cap is hit, or the budget is spent — so **the daily loop
never blocks on a model.**

## Determinism as a feature

Bouts use seeded RNG (`lib/engine/xai.ts:makeRng`), so any bout is reproducible
and provably fair. That invariant is also the prerequisite for a future on-chain
season close (see the AI & crypto one-pager).

---

## Public docs (this site)

`zingers.org` is a browsable view of the Markdown in `docs/`. The doc registry
(`lib/org/registry.ts`) maps each page to a source file; the `/org/[[...slug]]`
route statically generates every entry and renders it through a shared shell — so
adding a page is a Markdown file plus one registry line, nothing more.
