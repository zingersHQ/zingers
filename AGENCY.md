---
name: Zingers
stage: launched
autonomy: propose
north_star: "Players fly the Ascent, raise an AI champion that fights beside them, and share the legend both become — the loop that drives organic, viral growth."
target: { launch: "Launch v0.1 CLOSED (engineering). Flight-First gates shipped on zingers.gg. Remaining: human playtests, growth push, weekly ship notes — ops, not blockers." }
economics: { model: "Proposed: free-to-play; future monetization via cosmetics, battle passes, and 'infinite battles'. In-game soft currency is Crowns (server-authoritative wallet). $ZING is fuel, not the product — deferred; see docs/zing-model.md.", costs: "LLM inference (xAI/Grok ~1 call/turn + local judge by default), Vercel hosting + cron, Upstash Redis persistence" }
guardrails:
  - "The engine is authoritative: stats/types/statuses/ELO decide combat. Wit quality is a bounded 0.7–1.3 (max 1.4) multiplier (local judge default; LLM judge opt-in) and can never single-handedly decide a match."
  - "Crown amounts are decided server-side only (lib/economy.ts + lib/server). Client-reported earns are clamped to ceilings; never let the client mint currency."
  - "Demos must never break: every agent/LLM path has a deterministic mock fallback when no LLM key is present."
  - "Never auto-commit, push, or deploy — humans trigger those."
  - "Player-facing copy: Trainer / Strategy / Clan / fight|battle|duel. Never 'bout' in UI. Code/analytics may keep bout keys."
links: { repo: "https://github.com/zingersHQ/zingers", site: "https://zingers.gg", docs: "https://zingers.org" }
---

## North Star

**You fly. It fights. You both rise.** Players are **Trainers**: they fly the sky above
the Long Vault (the Ascent), adopt an AI champion that flies beside them, raise *how*
it thinks (not how to twitch-control it), send it into the battles that stud the climb,
and watch its body physically evolve into a visible record of its career *and* their
climbs — then clip and share that legend.

Core principle (from `docs/game-spec.md`): **the LLM is the actor, the engine is the game.**
Product framing: `docs/design-vision.md` (Flight-First v3.0). Active plan:
`docs/flight-first-plan.md`.

## Strategy & Positioning

- **Face of the game:** the Ascent — Climb (mobile `/m`, one-thumb) and Circuit (desktop,
  full flight). Same 100-sector sky across ten Reaches. Understood in zero seconds.
- **Depth:** collectible AI battler. Creatures actually *think* (argue, scheme, persuade),
  so no two battles are the same. Battles are what you meet on the way up — not the first verb.
- **Differentiator:** a champion's 3D silhouette is a deterministic function of its career
  (bone-scaling amplified by rank) plus ascent sigils from climbs; the body *is* the track record.
- **Headline mechanic (async):** because champions are AI, PvP doesn't need both humans online.
  Raise, deploy, and the league self-plays in the Amphitheatre **Live Gallery**; you watch and climb ELO.
- **Raise model:** seed **Strategy** at adopt; UI shows **temperament meters** (readout). Daily
  **Imprints** and fights move the dials — no free-drag training sliders.
- **Identity:** Trainers are nameless drivers; champions get unique names on claim/standings.
  Optional Solana wallet is recovery only. Token/`$ZING` deliberately deferred.
- **The bet:** the moat isn't the engine — it's original IP, the evolving battle meta, and a
  future creator economy. Built viral-first (climb boards, collection, clip-able moments).
- **Open agent layer:** `act(view) → decision` (`docs/agent-protocol.md`). Default: single-shot
  JSON + local judge; tool loop / LLM judge are env-gated.

## Roadmap

- [x] **Phase 0 — Engine & combat foundation.** Turn-based debate combat, type pentagon,
  statuses, finishers, wit judge, ELO, xAI client + agent protocol + mock fallback.
- [x] **Phase 1 — 3D world.** Grounds, Concord hub, region biomes, R3F + Rapier, live 3D bodies.
- [x] **Phase 2 — Meta games & venues.** Amphitheatre (Live Gallery), Circuit, Daily Tribunal,
  Keepers, Open Duel / Gauntlet / Tribunal, Force war, Broker, Crowns.
- [x] **Phase 3 — Narrative & biography.** Character beats, Saga / career ledger, Homecoming,
  Imprints, Promotion Trials, rival system, procedural ambience.
- [x] **Phase 4 — Flight-First (CURRENT face).** Climb/Circuit 100-sector Ascent; two doors
  (mobile Take flight → Climb; desktop fly → pick); guest Climb; Solana Trainer identity;
  unique champion names; temperament meters; robot brand mark; Peak-on-Tower; species kits
  densified. **Launch v0.1 engineering closed.** Ops after: human playtests, key art,
  growth push, weekly `@zingersHQ` notes (`docs/flight-first-plan.md`).
- [~] **Phase 5 — Collection & creator economy.** Deterministic recruit (Crowns sink, earned
  never rolled); species kits + Collection pager live. Still owed: full roster server-sync,
  trading, user-made champions.
- [ ] **Phase 6 — Proposed: Accounts & monetization.** Full cloud accounts, cosmetics, battle
  passes, "infinite battles." Token after traction.

## Product & Design

- **Loop:** Fly → Claim → Raise → Fight → Climb higher.
- **One world, many games:** Grounds (`/` · `/grounds`) + native mobile shell (`/m`). Concord
  venues; floating regions host arenas. Circuit = desktop body of the Ascent.
- **Participation:** Trainer (human) flies / raises / spectates; Handler = 3D avatar; Champion
  (agent) picks moves & lines; Judge scores wit (local default); Engine owns outcomes.
- **Player vocabulary:** Trainer, Strategy, Clan, fight/battle/duel. Never "bout" in UI.
  Code & analytics keep `bout` keys (`lib/player-copy.ts`, `docs/vocabulary.md`).
- **Routes:** `/grounds`, `/m`, `/arena` (unlisted BYO viewer), `/standings`, `/agents`,
  `/champion/[key]`, `/c/[key]`, `/howitworks`, `/glossary`, `/collection`, `/stats`, plus
  org docs on `zingers.org`.
- **Two domains:** `zingers.gg` (game) and `zingers.org` (docs/bible), via `middleware.ts`.

## Development

- **Stack:** Next.js 16.2.9 (App Router) · React 19.2 · TypeScript · React Three Fiber + Drei +
  Rapier · Zustand · Tailwind v4 · SSE · Upstash Redis · MCP SDK.
- **IMPORTANT — Next.js version:** this repo runs Next.js 16. Read guides under
  `node_modules/next/dist/docs/` before writing Next.js code (per `AGENTS.md`).
- **Layout:** `app/`, `components/` (incl. `grounds/`, Climb, intro, brand), `lib/engine/`,
  `lib/evolve/`, `lib/lore/`, `lib/server/`, `store/`, `docs/`, `mcp/`.
- **Single sources of truth:** naming → `lib/brand.ts` + `docs/vocabulary.md`; glossary →
  `lib/lore/glossary.ts`; currency → `lib/economy.ts`; combat → `docs/combat-design.md`;
  scenarios → `lib/scenarios/registry.ts`; venues → `components/grounds/venues.ts`;
  Flight-First plan → `docs/flight-first-plan.md`.
- **Sensitive:** `lib/economy.ts` + `lib/server/*` (Crowns); `bout` analytics keys; judge
  multiplier bounds; `middleware.ts` cross-domain routing.
- **Tooling:** `npm run dev|build|lint`; `npm run test:agents`; `npm run test:judge`;
  `npm run cost`; `npm run mcp`.
- **Notable big file:** `components/grounds/world.tsx` — prefer scoped search over full reads.

## Launch

- **Status:** **Launch v0.1 closed (engineering).** Live on `zingers.gg` / `zingers.org`.
  Flight-First face shipped; see `docs/flight-first-plan.md`.

### Launch v0.1 — gates (closed)

| Gate | Metric | Status |
|------|--------|--------|
| **1′** | Cold phone → flying &lt;10s after Take flight | shipped (door + Climb) |
| **2′** | Guest→claim visible on `/stats` MOBILE DOOR | shipped |
| **3′** | Climb “one more run” feels good on real devices | shipped; ongoing human playtests |
| **4** | `LLM_DAILY_BUDGET_USD` set; Climb-heavy stays cheap | set in production |
| **5** | Growth push only after the door feels good | ops next (not a code blocker) |
| **6** | Secondary: evolution / collection loop | shipped (species kits + Collection) |
| **—** | Token deferred; wallet ≠ coin | still frozen |

Supporting: weekly `@zingersHQ` ship notes + Discord still owed for distribution.
`$ZING` model written (`docs/zing-model.md`) — awaiting founder sign-off; not blocking.

Explicitly **out of scope for v0.1:** full cloud accounts, real-money monetization, user-made
champions, token launch, new venues as face work.

## Deployment

- **Host:** Vercel — one project, two domains; `vercel.json` 6-hourly cron at `/api/cron`.
- **Persistence:** Upstash Redis + Zustand/localStorage client mirror.
- **Env:** `XAI_API_KEY` (optional), `ZINGERS_MODEL`, `ZINGERS_AGENT_TOOLS`, `ZINGERS_LLM_JUDGE`,
  `LLM_DAILY_BUDGET_USD`, `CRON_SECRET`. Secrets in `.env.local` (never commit).
- **Who triggers:** commits, pushes, deploys are **human-triggered**.

## Economics

- **In-game currency:** Crowns. Start 500; ranked win = +40 (+20 home Clan bonus). Sinks: train
  60, fragment buy/sell, **recruit 250**. Bets {25,50,100} @ 2×. Source: `lib/economy.ts`.
- **Real money:** none today. Future: cosmetics, battle passes, "infinite battles."
- **$ZING:** fuel, not the product — deferred. Wallet today = optional Trainer identity.
- **Marginal cost of one ranked duel** (`npm run cost`, 8 calls/duel, local judge):
  **≈ $0.0012** (optimistic) to **≈ $0.0033** (conservative). League defaults to mock (free).
  Reproduce with `npm run cost`; re-measure from `GET /api/cost`.

## Voice & Content

- **Tagline:** "You fly. It fights. You both rise." / "Raise a mind. Make it legend."
- **Channels:** `@zingersHQ` (X), `zingers.gg` (game), `zingers.org` (docs + bible).
- **In-game tone:** mythic — Forces, Concord, Keepers, Trainer saga vs season Chronicle.
- **Player-facing copy:** duel/fight/battle; Trainer; Strategy (not doctrine); Clan; secret word;
  Live Gallery. Gloss signature terms on first use (`lib/lore/glossary.ts`).

## Guardrails & Compliance

- Engine authoritative; wit judge bounded — never match-deciding alone.
- All Crown amounts server-side; never let the client mint currency.
- Every agent/LLM path has deterministic mock fallback.
- Respect reduced-motion in cinematics/juice.
- Keep `bout` analytics keys stable even as player-facing copy changes.
- Waitlist email is PII — rate-limited; honor privacy/consent before growth pushes.
- Never auto-commit, push, or deploy — humans trigger those.

## Status & Forecast

**Recently shipped (committed, newest first — see git):**
- Robot brand mark (favicon / nav / PlayerHub); Climb/Circuit sector-open cinematic + life-continue.
- Circuit/Climb 2 lives + dive authority; unique Trainer names locked to wallet; soft identity copy.
- Temperament meters (Strategy readout); ban "bout" in player-facing copy; anti-abuse hardening.
- Flight-First desktop door (fly → pick); mobile Climb feel / cruise; Ascent pad start; Reach terrain.
- Champion biography stack (ledger, Saga, Homecoming, Imprints, Trials); snappy arena (1 LLM/turn + local judge).

**In progress / next (post–v0.1 ops):**
- Post the Peak-on-Tower / Grounds polish ship note on `@zingersHQ`.
- Human playtests (Climb feel, `/stats` MOBILE DOOR); growth push when ready.
- Key art / share-card rasters (live WebGL hero covers homepage doors for now).
- Roster cloud sync for recruit loop; Discord invite if still placeholder.

**Forecast:** Launch v0.1 engineering closed. Next is distribution (ship notes, playtests,
growth), then Phase 5 depth. Token stays frozen.
**Risks:** Climb feel busy-ness; onboarding length vs. fun; two-domain routing; LLM cost if
league goes paid or tool-loop defaults flip on.

## Open Questions

- ~~What defines "launch"?~~ **Answered:** Flight-First gates in `docs/flight-first-plan.md`.
- ~~$ZING model?~~ **Proposed:** utility/fuel — awaiting founder sign-off; not blocking Climb.
- Real-money model: which of cosmetics / battle pass / "infinite battles" comes first?
- Accounts: when full cloud sync for roster/recruits?
- Creator economy moderation vs authoritative engine + ELO?
- Community: Discord invite + who runs the weekly devlog?
