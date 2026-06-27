---
name: Zingers
stage: prelaunch
autonomy: propose
north_star: "Players adopt an AI champion, train how it thinks, and share the legend it becomes — the loop that drives organic, viral growth."
target: { launch: "Launch v0.1 = a tight, cheap, shareable core loop with a live growth funnel. Gated on the 6 measurable criteria in §Launch (not a date)." }
economics: { model: "Proposed: free-to-play; future monetization via cosmetics, battle passes, and 'infinite battles'. In-game soft currency is Crowns (server-authoritative wallet). $ZING is fuel, not the product — see docs/zing-model.md (decision pending sign-off).", costs: "LLM inference (xAI/Grok per bout + judge), Vercel hosting + cron, Upstash Redis persistence" }
guardrails:
  - "The engine is authoritative: stats/types/statuses/ELO decide combat. The judge LLM is a bounded 0.7–1.3 (max 1.4) multiplier and can never single-handedly decide a match."
  - "Crown amounts are decided server-side only (lib/economy.ts + lib/server). Client-reported earns are clamped to ceilings; never let the client mint currency."
  - "Demos must never break: every agent/LLM path has a deterministic mock fallback when no LLM key is present."
  - "Never auto-commit, push, or deploy — humans trigger those."
links: { repo: "https://github.com/zingersHQ/zingers", site: "https://zingers.gg", docs: "https://zingers.org" }
---

## North Star

Players adopt an AI champion, train *how* it thinks (not how to twitch-control it), send it to fight, and watch its body physically evolve into a visible record of its career — then clip and share that legend. Everything ladders up to making that loop compelling enough to spread on its own.

Core principle (from `docs/game-spec.md`): **the LLM is the actor, the engine is the game.**

## Strategy & Positioning

- **Format:** a collectible AI battler. The proven, beloved creature-battler shape, with one twist — the creatures actually *think* (argue, scheme, persuade, improvise), so no two battles are the same.
- **Differentiator:** a champion's 3D silhouette is a deterministic function of its career (bone-scaling amplified by rank); the body *is* the track record. Recent work fused that decor onto the rig and made the first-win evolution legible.
- **Headline mechanic:** async league — because champions are AI, PvP doesn't need both humans online. Train, deploy, and the league self-plays; you watch replays and climb.
- **The bet (from the one-pager):** the moat isn't the engine — it's the original IP, the evolving battle meta, and a future creator economy of user-made champions. Built viral-first (collection, leaderboards, clip-able moments).
- **Open agent layer:** anyone can bring an OpenAI-compatible model or HTTP agent that implements `act(view) → decision` (`docs/agent-protocol.md`).

## Roadmap

Phases reconstructed from `docs/` + git history. Inferred sequencing is marked `Proposed:`.

- [x] **Phase 0 — Engine & combat foundation.** Turn-based debate combat, type pentagon, statuses, finishers, LLM judge, ELO standings, xAI client + agent protocol + mock fallback.
- [x] **Phase 1 — 3D world.** One world, many games: the Grounds, Concord hub, region biomes (Obsidian Colosseum, Ember Wastes, Void Garden), R3F + Rapier movement/flight, live 3D champion bodies.
- [x] **Phase 2 — Meta games & venues.** Amphitheatre (self-play league / Scrying Gallery), The Circuit time trial, Daily Tribunal, The Keepers campaign, Open Duel / Gauntlet / Tribunal scenarios, Force war, Broker exchange, Crowns economy.
- [x] **Phase 3 — Act 1 onboarding & narrative.** Scripted first journey (cinematic → pitch → pick → tune → first duel → evolve → Concord landing → guided first arena → free roam), Reader saga, rival system, directed character beats, travel transitions, procedural ambience.
- [ ] **Phase 4 — CURRENT: Onboarding polish & first-journey funnel.** Champion-select reforged into an interactive character stage; first-win evolution made legible (latest commits). In-flight (uncommitted): landing-page funnel — embedded intro deck takes focus, "Choose your champion" CTA jumps straight to champion select via a session flag.
- [~] **Phase 5 — IN PROGRESS: Collection & creator economy.** Shipped (uncommitted working changes): a deterministic **recruit** loop — spend `RECRUIT_COST` = 250 Crowns to add a mind to your roster (on-brand: "earned, never rolled," not a gacha), surfaced on `/collection` with a server-authoritative spend. Still proposed: roster server-sync (roster mirror is client-only today), player-to-player trading, user-made champions, seasonal new minds.
- [ ] **Phase 6 — Proposed: Accounts & monetization.** Accounts + full cloud persistence, cosmetics, battle passes, "infinite battles."

## Product & Design

- **Loop:** Scout → Train → Watch → Evolve → Climb.
- **One world, many games:** everything lives inside the 3D Grounds (`/` · `/grounds`). The Concord hub gathers meta games as walk-up venues; region slabs host arena scenarios and Circuit tunnels.
- **Participation model:** Handler (human) trains/connects/spectates; Champion (agent) picks moves & lines and adapts via memory; Judge (LLM) scores rhetoric quality; Engine owns authoritative outcomes.
- **Player vocabulary:** players see "duel / fight / ranked duel"; code & analytics keep `bout` (stable event keys — see `lib/player-copy.ts`). Don't rename `bout` in tracking.
- **Routes:** `/grounds` (world), `/arena` (unlisted bout viewer for BYO agents), `/standings` (ELO), `/agents` (agent protocol), `/champion/[key]`, `/c/[key]` (shareable card), plus `/howitworks`, `/readme`, `/bible`, `/collection`, `/stats`.
- **Two domains, one project:** `zingers.gg` (game) and `zingers.org` (docs/bible), routed via `middleware.ts`.

## Development

- **Stack:** Next.js 16.2.9 (App Router) · React 19.2 · TypeScript · React Three Fiber + Drei + Rapier (3D/physics) · Zustand (state) · Tailwind v4 · SSE for live bouts · Upstash Redis (persistence) · MCP SDK.
- **IMPORTANT — Next.js version:** this repo runs Next.js 16, which has breaking changes vs. older training data. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next.js code (per `AGENTS.md`). Heed deprecation notices.
- **Layout:** `app/` (pages + API routes, incl. `app/api/waitlist`), `components/` (UI + `grounds/` R3F world + `intro/`), `lib/engine/` (battle, judge, agent, roster, xAI), `lib/evolve/` (progression, ELO, genome→body), `lib/server/` (server-authoritative ladder, wallet, daily, war, waitlist, rate-limit), `store/` (Zustand + localStorage), `docs/` (specs), `mcp/` (MCP server).
- **Single sources of truth:** naming/domains/storage keys + community links → `lib/brand.ts`; currency → `lib/economy.ts`; combat numbers → `docs/combat-design.md`; scenario catalogue → `lib/scenarios/registry.ts`; venues → `components/grounds/venues.ts`.
- **Sensitive / handle with care:** `lib/economy.ts` and `lib/server/*` (server decides all Crown deltas — don't move amount logic client-side); `bout` analytics keys (stable); the judge multiplier bounds; `middleware.ts` cross-domain routing.
- **Tooling:** `npm run dev|build|lint`; `npm run test:agents` (E2E agent test, needs dev server); `npm run test:judge`; `npm run cost` (cost scenarios); `npm run mcp`.
- **Notable big file:** `components/grounds/world.tsx` (~3.3k lines) — match staging, cinematic camera, movement; prefer scoped search over full reads.

## Launch

- **Status:** prelaunch. Live on `zingers.gg` / `zingers.org`; product is publicly reachable. **Launch v0.1 is defined by measurable gates** (below), not a date.

### Launch v0.1 — definition of done

The bar isn't "more features"; it's "the core loop is tight, cheap, and shareable, and there's a funnel to pour traffic into." Ship only when ALL six gates are green:

1. **Time-to-first-evolution < 8 min.** A brand-new visitor reaches their champion's first *visible* body change in under 8 minutes. Measured, not assumed (see gate 2). The new "Choose your champion" CTA shortens this by skipping the intro deck for warm visitors.
2. **First-journey drop-off is instrumented.** Funnel events fire at each onboarding step (cinematic → pitch → pick → tune → first duel → evolve → land) via the existing `bout`/event analytics, so we can see exactly where players bounce. **Proposed: not yet wired end-to-end.**
3. **Collection loop is playable.** A player can recruit at least one champion *beyond* their first adopted one through a deterministic Crown sink (`RECRUIT_COST` = 250, "earned, never rolled"), and it persists. Built (uncommitted); roster persistence is client-only mirror today — server-sync still owed.
4. **Costs are known and capped.** The marginal $ cost of one ranked duel is documented (see §Economics) and `LLM_DAILY_BUDGET_USD` is set in prod so the autonomous league self-throttles. **Proposed: budget env not confirmed set in prod.**
5. **Growth funnel is live.** Waitlist capture on the landing page (`/api/waitlist`, server-backed via Upstash with in-memory fallback) — **built (uncommitted)** — plus an open Discord and a weekly public devlog cadence on `@zingersHQ`. **Discord URL in `lib/brand.ts` is a placeholder; real invite + devlog cadence still owed.**
6. **$ZING positioning decided.** The token model (utility/fuel vs. meme-distribution vs. betting-integrated) is chosen and written down (`docs/zing-model.md`) — **proposed decision: fuel, not the product; awaiting founder sign-off.**

Explicitly **out of scope for v0.1** (defer): full cloud accounts (Phase 6), real-money monetization, user-made champions, additional venues/arenas. Cut anything that delays gates 1–6.

## Deployment

- **Host:** Vercel — one project, two domains (`zingers.gg`, `zingers.org`); `middleware.ts` handles routing and redirects; `vercel.json` defines a 6-hourly cron at `/api/cron`.
- **Persistence:** Upstash Redis (server-authoritative wallet, ladder, daily/war state, waitlist); Zustand + localStorage mirrors on the client.
- **Env:** `XAI_API_KEY` (optional — house Grok; mock mode without it), `ZINGERS_MODEL` (default `grok-4.20-0309-non-reasoning`). Secrets live in `.env.local` (never commit).
- **Who triggers:** commits, pushes, and deploys are **human-triggered**. The agent proposes and prepares changes; a human runs git and ships.

## Economics

- **In-game currency:** Crowns. Start balance 500; ranked Grounds win = +40 (+20 home bonus in pledged-Clan region, weighted 2× in the season war). Sinks: train 60, fragment buy 140 / sell 90, **recruit 250** (new mind into roster). Bets: stakes {25,50,100}, 2× payout. Variable earns clamped server-side (cache ≤200, goal ≤600, gauntlet ≤1200). Source of truth: `lib/economy.ts`.
- **Real money:** Proposed: none today. Future monetization = cosmetics, battle passes, "infinite battles" (from one-pager roadmap, not built).
- **$ZING token model (proposed decision — see `docs/zing-model.md`):** $ZING is *fuel, not the product* — an optional utility token for premium sinks (cosmetics, season pass, "infinite battles"), creator royalties, and staking. Crowns stay off-chain, server-authoritative, and are never tokenized. Betting-integrated and pure-meme models are rejected. Decision now; on-chain deploy is post-launch. **Needs founder sign-off.**
- **Costs:** LLM inference per bout + judge (xAI/Grok), Vercel hosting + cron, Upstash Redis. `app/api/cost` + `lib/server/cost.ts` track cost surfaces (self-calibrating from measured usage).
- **Marginal cost of one ranked duel (Launch gate 4):** at the configured Grok-non-reasoning pricing ($0.20/$0.50 per 1M, 16 calls/duel), **≈ $0.0024/duel** (optimistic 450/120 tokens) to **≈ $0.0066/duel** (conservative 1500/220). Monthly house burn (5 duels/player/day, league running free in mock):

  | DAU | bouts/day | monthly (optimistic) | monthly (conservative) |
  |----:|----------:|---------------------:|-----------------------:|
  | 100 | 500 | $36 | $98 |
  | 500 | 2,500 | $180 | $492 |
  | 2,000 | 10,000 | $720 | $1,968 |
  | 10,000 | 50,000 | $3,600 | $9,840 |

  **Takeaway:** inference is NOT an existential cost risk at the current model/pricing — it's coverable by modest monetization well before five figures of DAU. The real lever is choosing a *reasoning* model (multiplies tokens) or letting the league self-play on paid inference. Reproduce/sweep with `npm run cost` (`scripts/cost-scenarios.mjs`); re-measure token averages from `GET /api/cost`. Set `LLM_DAILY_BUDGET_USD` in prod so the league self-throttles.

## Voice & Content

- **Tagline:** "Raise a mind. Make it legend." / "train · fight · evolve AI champions."
- **Channels:** `@zingersHQ` (X), `zingers.gg` (game), `zingers.org` (tech/docs + the lore bible). Discord planned (invite URL still a placeholder in `lib/brand.ts`).
- **In-game tone:** mythic/factional — Forces, the Concord, Keepers, the Reader's saga vs. the world's Chronicle. The saga advances off Reader rank; the Chronicle turns on the season clock — keep them distinct.
- **Player-facing copy:** use "duel/fight," never internal jargon like "bout"; honesty about body evolution (pitch defers visible growth to the evolve step).

## Guardrails & Compliance

- Engine authoritative; judge LLM bounded (0.7–1.3, 1.4 on Highlight) — never match-deciding alone.
- All Crown amounts decided server-side; client earns clamped to ceilings; never let the client mint currency.
- Every agent/LLM path must have a deterministic mock fallback so demos never break.
- Respect reduced-motion in cinematics/beats (already honored in `CharacterBeat`).
- Keep `bout` analytics/event keys stable even as player-facing copy changes.
- Waitlist captures email (PII) — `/api/waitlist` is rate-limited per IP; honor a clear privacy/consent line before driving real traffic.
- Never auto-commit, push, or deploy — humans trigger those.

## Status & Forecast

**Recently shipped (committed, newest first):**
- `15b4159` Fuse champion decor to the rig and make first-win evolution legible.
- `0cb34ec` Reforge champion-select into an interactive character stage.
- `5a9754a` Add AGENCY.md product/strategy brief.
- `12340dd` Guide the first Concord landing toward the Grounds.
- `5bc9384` Narrative spine: travel transitions, Reader saga, rival, directed beats.
- `e8320d5` Dress the Grounds with the Quaternius nature kit + richer biome flora.
- `146dde3` Act 1 first-journey overhaul: real tuning, arena fights, Concord landing.

**In progress (uncommitted working changes — `git status` on `main`):**
- **Growth funnel:** landing-page waitlist capture (`app/api/waitlist/route.ts` + `lib/server/store.ts` `addWaitlist`/`waitlistCount` with Upstash + in-memory fallback), `JoinTheVault` form, Discord/X links, embedded intro deck taking focus, "Choose your champion" CTA → champion select via `STORAGE.startPick` (`components/home/landing.tsx`, `components/grounds/grounds-screen.tsx`, `components/intro/first-run.tsx`, `lib/brand.ts`).
- **Collection recruit loop:** `RECRUIT_COST` = 250 + `recruit` wallet event (`lib/economy.ts`), `roster`/`recruit`/`isRecruited` in `store/champions.ts`, recruit UI on `/collection` (`app/collection/page.tsx`).
- **Launch discipline:** `docs/zing-model.md` (token decision), `scripts/cost-scenarios.mjs` + `npm run cost`, this refreshed `AGENCY.md`.

**Forecast (Proposed):**
- Commit the growth + recruit working set as a coherent slice (it's currently a large uncommitted bundle on `main`).
- Replace the placeholder Discord invite and instrument the onboarding funnel (gates 2 & 5) — these are the closest-to-done launch gates.
- Persist the recruited roster server-side (today it's a client-only mirror) to fully satisfy gate 3.
- Confirm `LLM_DAILY_BUDGET_USD` is set in prod (gate 4) and get founder sign-off on the $ZING model (gate 6).
- **Risks:** large uncommitted bundle drifting from `main`; LLM cost scaling with bout volume; keeping the judge fair while leaning on it for "fun"; onboarding length vs. time-to-first-fun; two-domain routing fragility; waitlist PII handling.

## Open Questions

- ~~What defines "launch"?~~ **Answered:** Launch v0.1 = the six measurable gates in §Launch. Sub-question: who owns each gate and what's the weekly check-in cadence?
- ~~$ZING model (meme vs utility vs betting)?~~ **Proposed decision:** utility/fuel — see `docs/zing-model.md` (awaiting sign-off).
- Real-money model: which of cosmetics / battle pass / "infinite battles" comes first, and what's the price of an "infinite battle" relative to inference cost (≈$0.0024–0.0066/duel)?
- Accounts: when do we move off device-local identity to real accounts + full cloud sync (so roster/recruits persist beyond one device)?
- Creator economy: how do user-made champions get moderated/balanced against the authoritative engine and ELO?
- Community: when does the real Discord open (replacing the placeholder invite), and who runs the weekly devlog?
- Cost ceiling per active player before monetization is mandatory.
