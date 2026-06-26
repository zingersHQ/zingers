---
name: Zingers
stage: prelaunch
autonomy: propose
north_star: "Players adopt an AI champion, train how it thinks, and share the legend it becomes — the loop that drives organic, viral growth."
target: { launch: "Proposed: no public launch date set" }
economics: { model: "Proposed: free-to-play game; future monetization via cosmetics, battle passes, gacha pulls, and 'infinite battles'. In-game soft currency is Crowns (server-authoritative wallet).", costs: "LLM inference (xAI/Grok per bout + judge), Vercel hosting + cron, Upstash Redis persistence" }
guardrails:
  - "The engine is authoritative: stats/types/statuses/ELO decide combat. The judge LLM is a bounded 0.7–1.3 (max 1.4) multiplier and can never single-handedly decide a match."
  - "Crown amounts are decided server-side only (lib/economy.ts + lib/server); client-reported earns are clamped to ceilings. Never let the client mint currency."
  - "Demos must never break: every agent path has a deterministic mock fallback when no LLM key is present."
  - "Never auto-commit, push, or deploy — humans trigger those."
links: { repo: "Proposed: not set in repo", site: "https://zingers.gg", docs: "https://zingers.org" }
---

## North Star

Players adopt an AI champion, train *how* it thinks (not how to twitch-control it), send it to fight, and watch its body physically evolve into a visible record of its career — then clip and share that legend. Everything ladders up to making that loop compelling enough to spread on its own.

Core principle (from `docs/game-spec.md`): **the LLM is the actor, the engine is the game.**

## Strategy & Positioning

- **Format:** a collectible AI battler. The proven, beloved creature-battler shape, with one twist — the creatures actually *think* (argue, scheme, persuade, improvise), so no two battles are the same.
- **Differentiator:** a champion's 3D silhouette is a deterministic function of its career (bone-scaling amplified by rank); the body *is* the track record.
- **Headline mechanic:** async league — because champions are AI, PvP doesn't need both humans online. Train, deploy, and the league self-plays; you watch replays and climb.
- **The bet (from the one-pager):** the moat isn't the engine — it's the original IP, the evolving battle meta, and a future creator economy of user-made champions. Built viral-first (collection, leaderboards, clip-able moments).
- **Open agent layer:** anyone can bring an OpenAI-compatible model or HTTP agent that implements `act(view) → decision`.

## Roadmap

Phases inferred from `docs/` + git history. Mark inferred sequencing as `Proposed:`.

- [x] **Phase 0 — Engine & combat foundation.** Turn-based debate combat, type pentagon, statuses, finishers, LLM judge, ELO standings, xAI client + agent protocol + mock fallback.
- [x] **Phase 1 — 3D world.** One world, many games: the Grounds, Concord hub, region biomes (Obsidian Colosseum, Ember Wastes, Void Garden), R3F + Rapier movement/flight, live 3D champion bodies.
- [x] **Phase 2 — Meta games & venues.** Amphitheatre (self-play league / Scrying Gallery), The Circuit time trial, Daily Tribunal, The Keepers campaign, Open Duel / Gauntlet / Tribunal scenarios, Force war, Broker exchange, Crowns economy.
- [x] **Phase 3 — Act 1 onboarding & narrative.** Scripted first journey (cinematic → pick → tune → first duel → evolve → Concord landing → guided first arena → free roam), Reader saga, rival system, directed character beats, travel transitions, procedural ambience.
- [ ] **Phase 4 — CURRENT: Onboarding polish & first-journey refinement.** In-flight work on `components/intro/first-duel.tsx` and `first-run.tsx` (new pick phase / forces wheel); guiding the first Concord landing toward the Grounds (latest commit).
- [ ] **Phase 5 — Proposed: Collection & creator economy.** Gacha pulls + real collection loop, player-to-player trading, user-made champions.
- [ ] **Phase 6 — Proposed: Accounts & monetization.** Accounts + full cloud persistence, cosmetics, battle passes, "infinite battles."

## Product & Design

- **Loop:** Scout → Train → Watch → Evolve → Climb.
- **One world, many games:** everything lives inside the 3D Grounds (`/` · `/grounds`). The Concord hub gathers meta games as walk-up venues; region slabs host arena scenarios and Circuit tunnels.
- **Participation model:** Handler (human) trains/connects/spectates; Champion (agent) picks moves & lines and adapts via memory; Judge (LLM) scores rhetoric quality; Engine owns authoritative outcomes.
- **Player vocabulary:** players see "duel / fight / ranked duel"; code & analytics keep `bout` (stable event keys — see `lib/player-copy.ts`). Don't rename `bout` in tracking.
- **Routes:** `/grounds` (world), `/arena` (unlisted bout viewer for BYO agents), `/standings` (ELO), `/agents` (agent protocol), `/champion/[key]`, `/c/[key]` (shareable card), plus `/howitworks`, `/readme`, `/bible`, `/collection`, `/stats`.
- **Two domains, one project:** `zingers.gg` (game) and `zingers.org` (docs/bible), routed via `middleware.ts`.

## Development

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · React Three Fiber + Drei + Rapier (3D/physics) · Zustand (state) · Tailwind v4 · SSE for live bouts · Upstash Redis (persistence) · MCP SDK.
- **IMPORTANT — Next.js version:** this repo runs Next.js 16, which has breaking changes vs. older training data. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next.js code (per `AGENTS.md`). Heed deprecation notices.
- **Layout:** `app/` (pages + API routes), `components/` (UI + `grounds/` R3F world + `intro/`), `lib/engine/` (battle, judge, agent, roster, xAI), `lib/evolve/` (progression, ELO, genome→body), `lib/server/` (server-authoritative ladder, wallet, daily, war, rate-limit), `store/` (Zustand + localStorage), `docs/` (specs), `mcp/` (MCP server).
- **Single sources of truth:** naming/domains/storage keys → `lib/brand.ts`; currency → `lib/economy.ts`; combat numbers → `docs/combat-design.md`; scenario catalogue → `lib/scenarios/registry.ts`; venues → `components/grounds/venues.ts`.
- **Sensitive / handle with care:** `lib/economy.ts` and `lib/server/*` (server decides all Crown deltas — don't move amount logic client-side); `bout` analytics keys (stable); the judge multiplier bounds; `middleware.ts` cross-domain routing.
- **Tooling:** `npm run dev|build|lint`; `node scripts/test-agents.mjs` (E2E agent test, needs dev server); `node scripts/judge-check.mjs`; `npm run mcp`.
- **Notable big file:** `components/grounds/world.tsx` (~3.3k lines) — match staging, cinematic camera, movement; prefer scoped search over full reads.

## Launch

- **Status:** prelaunch. Live on `zingers.gg` / `zingers.org`; product is publicly reachable but no announced launch milestone.
- Proposed: launch readiness likely gated on the collection loop and accounts/persistence (Phases 5–6) plus monetization plumbing.

## Deployment

- **Host:** Vercel — one project, two domains (`zingers.gg`, `zingers.org`); `middleware.ts` handles routing and redirects; `vercel.json` defines a 6-hourly cron at `/api/cron`.
- **Persistence:** Upstash Redis (server-authoritative wallet, ladder, daily/war state); Zustand + localStorage mirrors on the client.
- **Env:** `XAI_API_KEY` (optional — house Grok; mock mode without it), `ZINGERS_MODEL` (default `grok-4.20-0309-non-reasoning`). Secrets live in `.env.local` (never commit).
- **Who triggers:** commits, pushes, and deploys are **human-triggered**. The agent proposes and prepares changes; a human runs git and ships.

## Economics

- **In-game currency:** Crowns. Start balance 500; ranked Grounds win = +40 (+20 home bonus in pledged-Clan region, weighted 2× in the season war). Sinks: train 60, fragment buy 140 / sell 90. Bets: stakes {25,50,100}, 2× payout. Variable earns clamped server-side (cache ≤200, goal ≤600, gauntlet ≤1200). Source of truth: `lib/economy.ts`.
- **Real money:** Proposed: none today. Future monetization = cosmetics, battle passes, gacha pulls, "infinite battles" (from one-pager roadmap, not built).
- **Costs:** LLM inference per bout + judge (xAI/Grok), Vercel hosting + cron, Upstash Redis. `app/api/cost` + `lib/server/cost.ts` track cost surfaces.

## Voice & Content

- **Tagline:** "Raise a mind. Make it legend." / "train · fight · evolve AI champions."
- **Channels:** `@zingersHQ` (X), `zingers.gg` (game), `zingers.org` (tech/docs + the lore bible).
- **In-game tone:** mythic/factional — Forces, the Concord, Keepers, the Reader's saga vs. the world's Chronicle. The saga advances off Reader rank; the Chronicle turns on the season clock — keep them distinct.
- **Player-facing copy:** use "duel/fight," never internal jargon like "bout"; honesty about body evolution (pitch defers visible growth to the evolve step).

## Guardrails & Compliance

- Engine authoritative; judge LLM bounded (0.7–1.3, 1.4 on Highlight) — never match-deciding alone.
- All Crown amounts decided server-side; client earns clamped to ceilings; never let the client mint currency.
- Every agent/LLM path must have a deterministic mock fallback so demos never break.
- Respect reduced-motion in cinematics/beats (already honored in `CharacterBeat`).
- Keep `bout` analytics/event keys stable even as player-facing copy changes.
- Never auto-commit, push, or deploy — humans trigger those.

## Status & Forecast

**Recently shipped (from git, newest first):**
- Guided the first Concord landing toward the Grounds (gate spotlight/dim + walk-to nudge) — latest commit (2026-06-26).
- Narrative spine: travel transitions, the Reader saga, rival system, directed character beats.
- Dressed the Grounds with the Quaternius nature kit + richer biome flora.
- Act 1 first-journey overhaul: real doctrine tuning, arena fights, Concord landing.
- The Circuit venue, first-duel onboarding, world persistence; roster expanded to eight First Minds.

**In progress (uncommitted working changes):**
- `components/intro/first-duel.tsx` (+~226 lines) and `components/intro/first-run.tsx` — reworking the starter "pick" phase into a dedicated `PickPhase`/`ForcesWheel` with per-Force mottos and creature-voice priming. Not yet committed.

**Forecast (Proposed):**
- Finish and commit the onboarding pick-phase rework; tighten the first-journey funnel (the current focus area).
- Next strategic unlock is the **collection loop** (gacha/trading/user-made champions) — it's the stated viral moat and the largest gap between "what's real" and "the bet."
- Accounts + full cloud persistence will be required before any serious monetization; today persistence is wallet/ladder-centric on Redis with localStorage mirrors.
- **Risks:** LLM cost scaling as bout volume grows; keeping the judge fair while leaning on it for "fun"; onboarding complexity (a long scripted Act 1) vs. time-to-first-fun; two-domain routing fragility.

## Open Questions

- What defines "launch"? Is there a target date, or is it a soft, already-live rollout? (`target.launch` currently unset.)
- Real-money model: which of cosmetics / battle pass / gacha / "infinite battles" comes first, and what's the price of an "infinite battle" relative to inference cost?
- Accounts: when do we move off device-local identity to real accounts + full cloud sync?
- Creator economy: how do user-made champions get moderated/balanced against the authoritative engine and ELO?
- Public repo URL — is the project open-source or private? (`links.repo` unset.)
- Cost ceiling per active player before monetization is mandatory.
