# ZINGERS: Technical one-pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### The LLM is the actor. The engine is the game.

A single, typed Next.js app. One runtime, no separate backend to babysit. That
runs a 3D world you **fly**, streams live AI-vs-AI debate fights, and evolves
champions from their real match history (and how high you've climbed).

---

## Core principle

Combat is turn-based with explicit moves and **stat-driven resolution**: stats,
types, training, statuses, and seeded variance decide damage. Wit quality is a
bounded multiplier (≈0.7–1.3, 1.4 on a Highlight). By default a **local judge**;
set `ZINGERS_LLM_JUDGE=1` for an LLM judge. Neither path can single-handedly
decide a match. This keeps fights fair, reproducible, and cheap.
*(`docs/game-spec.md`, `docs/combat-design.md`.)*

## Stack

Next.js 16 (App Router) · React 19 · end-to-end **TypeScript** · **React Three
Fiber** (with Drei, Rapier physics, postprocessing) for the 3D Grounds ·
**Zustand** state · **Upstash Redis** server mirror · **Server-Sent Events**
for live fights · **xAI (Grok)** as the built-in brain. Deployed on Vercel
(`zingers.gg` game host, `zingers.org` docs host), with a 6-hourly `/api/cron`.

---

## Architecture. One world, a thin server

- **The Ascent is the face.** Mobile Climb (`/m`) and desktop Circuit share the
  same 100-sector sky (ten Reaches). Trainer flies with a jetpack; champion
  wingmate follows without one. Boards, lives, sector opens. See
  `docs/climb.md`, `docs/bible/10-ascent.md`.
- **The 3D Grounds** are the deep surface: fly, raise, hunt goals, enter venues.
  Bodies morph live with career via a deterministic appearance function
  (`lib/evolve/appearance.ts`). Performance: exponential damping (frame-rate
  independent), instanced GLTF props, `React.memo`'d scene dressing,
  palette-cached textures, DPR/quality tiers, and "juice" (shake, FOV kicks,
  bursts) gated under `prefers-reduced-motion`. Mobile keeps exactly **one**
  WebGL canvas.
- **Battles stream over SSE** (`/api/battle`, plus headless `/api/sim`). Each
  turn carries the move, resolved damage, an in-character line, a plain-English
  `why`, and (when tools are on) a `trace[]` of agent steps. Default house path
  is **one LLM decision per turn** + local judge. Snappy and cheap. The client
  renders with skip-to-verdict and an opt-in "Study" view of the trace.
- **Music** is 100% procedural Web Audio (`lib/ambience-scores.ts` +
  `lib/ambience.ts`): distinct themes per place with phrase forms; intensity,
  ducking, and flourishes via `lib/ambience-bus.ts`. No audio files.
- **The async league** is the headline mechanic: champions are AI, so PvP needs
  **neither human online**. The league runs fights autonomously (Amphitheatre
  **Live Gallery**); you watch replays and climb an objective rating board
  (`/standings`).
- **State is client-first, synced.** Careers live in `localStorage` and mirror to
  Redis via `/api/save`. The **career ledger** (`CareerEvent[]` + `AxisSnapshot[]`
  on `PlayerSave`) is a pure-additive, capped, append-only log from every real
  moment. Fight, level-up, tier-up, training, season turn, first claim. In
  `store/champions.ts`.
- **Collection roster is server-unioned.** Recruited mind keys live in a Redis set
  (`z:roster:{token}`). Paid recruit is `POST /api/wallet` with `{ type: "recruit",
  key }` (Crowns + membership in one shot). `/api/save` merges roster on read/write
  so last-write-wins cannot drop a legend. Cross-device restore still needs the same
  Trainer code or linked Solana wallet.
- **Trainer identity.** Unique names can lock to an optional Solana wallet
  (prove-ownership; mint key later). Circuit/Climb craft boards resolve labels
  server-side; ranked posts require a takeoff ticket and wall-clock / speed
  checks (`lib/server/flight-run.ts`). Crowns pay personal bests under the daily
  cap, never board placement.
- **Immortalize (app + `card_immortalize` program).** `GET/POST /api/immortalize`
  (voucher / prepare / confirm). `chain` mode: user tx = Ed25519 voucher verify +
  program `immortalize` (burn fuel, mint Card, PDA caps M=8 / career uniqueness).
  Mint authority is a **program PDA** — server only holds `CARDS_VOUCHER_ISSUER`.
  Test brand: CARS / Cards / car SVGs (`onchain/card_immortalize/`,
  `onchain/cars/README.md`). Env: `IMMORTALIZE_MODE=chain`, `CARS_MINT`,
  `CARDS_VOUCHER_ISSUER`, `SOLANA_RPC_URL`.
- **~26 API routes** (`app/api/*`) cover battle, sim, claim, roster, standings,
  daily, imprint, feed, war, save, wallet, solana-link, immortalize, card OG
  images, and a `/api/cost` meter.

## The pluggable agent layer

Every champion answers one contract. `act(view) → decision`. So any brain can
drive one. **Default:** single-shot JSON decision. **Opt-in**
(`ZINGERS_AGENT_TOOLS=1`): a bounded **reason → act → observe → commit** tool
loop over read-only engine tools (`simulate_move`, `scout_opponent`,
`commit_move`), capped at 3 steps and streamed as `ToolStep`s. Providers:
built-in Grok, any OpenAI-compatible model, an HTTP webhook, or a mock
(offline). *(`docs/agent-protocol.md`.)*

## Cost & safety rails

LLM spend is metered (`lib/server/cost.ts`), IP rate-limited
(`lib/server/rate-limit.ts`), and gated by daily budgets
(`LLM_DAILY_BUDGET_USD`). New model features always ship **template-first**: a
deterministic fallback runs when there's no key, a per-owner daily cap is hit,
or the budget is spent. So **the daily loop never blocks on a model.** Ranked
paths reject mock/seed bias; wallet earns are claim-scoped.

## Determinism as a feature

Fights use seeded RNG (`lib/engine/xai.ts:makeRng`), so any fight is reproducible
and provably fair. Career truth for immortalize vouchers stays server-side; the
chain only executes burn+mint. Analytics/event keys may still say
`bout` internally. Player-facing copy never does (`docs/vocabulary.md`).

---

## Public docs (this site)

`zingers.org` is a browsable view of the Markdown in `docs/`. The doc registry
(`lib/org/registry.ts`) maps each page to a source file; the `/org/[[.slug]]`
route statically generates every entry and renders it through a shared shell. So
adding a page is a Markdown file plus one registry line, nothing more.
