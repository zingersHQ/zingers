# Zingers: game spec

**You fly. It fights. You both rise.** You don't fight — you raise an AI champion that does,
and you climb the sky beside it.

Canonical product framing: **[design-vision.md](./design-vision.md)** (Flight-First) ·
doors: **[two-doors.md](./two-doors.md)** · active roadmap: **[flight-first-plan.md](./flight-first-plan.md)** ·
naming: **[vocabulary.md](./vocabulary.md)**.

## Core principle

> **The LLM is the actor. The engine is the game.**

Combat is turn-based with explicit moves and stat-driven resolution. Stats, types, training,
status effects, and variance decide damage. Wit quality is a bounded multiplier (0.7–1.3, or
1.4 on Highlight) — by default a **local judge**; an LLM judge is opt-in
(`ZINGERS_LLM_JUDGE=1`). Neither can single-handedly decide the match.

Full numbers, roster, and a worked sample battle: **[combat-design.md](./combat-design.md)**.

## The loop

**Fly → Claim → Raise → Fight → Climb higher**

1. **Fly** the Ascent — Climb on phones (`/m`), Circuit on desktop — before (or as) you care
   about systems
2. **Claim** the mind on your wing (or pick a starter on desktop) in the Grounds
3. **Raise**: seed Strategy at adopt; then Imprints, persona, and brain choice. Temperament
   meters are a readout — fights and lessons move the dials
4. **Fight** 1v1 duels with visible reasoning, in the world (region arenas, Daily Tribunal, …)
5. **Climb higher**: depth on the Ascent + objective ELO (`/standings`) — both feed Trainer Rank

## One world, many games

Everything you play lives inside the 3D world (`/` · `/grounds`), with a native mobile shell
at `/m`. The Concord hub gathers meta games as **walk-up venues**; each floating region hosts
arena scenarios. The **Circuit** is the raceable body of the Ascent (same 100-sector climb as
mobile Climb). Catalogue: `lib/scenarios/registry.ts` · venues: `components/grounds/venues.ts`.

### Hub & venues

| Mode | Where | What it is |
|------|-------|------------|
| **The Grounds** | everywhere | Fly, raise champions, hunt goals. Bodies morph with career. |
| **The Amphitheatre** | Concord venue | Watch autonomous league self-play in the **Live Gallery**; today's Tribunal herald. |
| **The Circuit** | Concord venue | 100-sector Ascent in full flight (ten Reaches); two lives; leaderboard by depth, then time. |
| **The Climb** | `/m` (phones) | Same Ascent, one-thumb — the mobile face of the game. |
| **Daily Tribunal** | Concord stone | One shared fight a day — call it before you watch, share a result grid. |
| **The Keepers** | region spires | Campaign: talk **secret words** out of the Vault's Keepers. |

### Arena scenarios (in-world)

| Scenario | Where | What it is |
|----------|-------|------------|
| **Open Duel** | any region plaza | 1v1 debate combat — pick opponent, settle it. Stat pentagon, finishers, bounded wit judge. |
| **The Gauntlet** | Ember Wastes (default) | Chain of ever-stronger fighters; press your luck or cash out. |
| **The Tribunal** | Obsidian Colosseum (flagship) | Assigned-stance debate to a jury; switching sides scores ≈0. |

Unlisted **`/arena`** remains the agent fight viewer for bring-your-own-agent testing
(debate combat and The House social-deduction benchmark).

### First journey (Flight-First)

| Door | First minutes |
|------|----------------|
| **Mobile** | Splash → Take flight → Climb (guest OK) → claim wingmate → raise → boards |
| **Desktop** | Wake → short flight → champion pick → Grounds / Circuit → duel *motivated* by climb |

An older fight-led Act 1 pass remains documented in
**[first-journey-roadmap.md](./first-journey-roadmap.md)** (historical). Live sequencing:
**[flight-first-plan.md](./flight-first-plan.md)** and **[launch-week.md](./launch-week.md)**.

### Ambience

Procedural soundtrack per place (`lib/ambience-scores.ts`): Concord hub, each region
biome, Amphitheatre, Circuit, and live fights each resolve their own mood via
`resolveAmbienceMood()`. Loud SFX duck the score through `lib/ambience-bus.ts`.

## Async league (headline mechanic)

Champions are AI. **PvP doesn't need both humans online.** Raise and deploy; the league runs
fights autonomously (the Concord's **Live Gallery**); you watch replays and climb.

Implemented: Live Gallery runner, `/api/sim` headless fights, mind evolution after every fight.

## Participation model

| Who | Role |
|-----|------|
| **Trainer (human)** | Flies, claims/raises champions, connects agents, backs Crowns, spectates. Identity = Trainer name (+ optional wallet). |
| **Handler** | The 3D avatar you see in the Grounds (jetpack on its back) — not a separate player role. |
| **Champion (agent)** | Picks moves, writes lines, adapts via memory, within engine rules |
| **Judge** | Scores rhetoric quality (local by default; LLM opt-in); flags Highlights |
| **Engine** | Authoritative damage, types, statuses, ELO |

## Agent platform

Any brain that implements `act(view) → decision` can drive a champion. See **[agent-protocol.md](./agent-protocol.md)**.

Providers: house Grok · OpenAI-compatible · HTTP webhook · mock (offline).
Default house path: **single-shot JSON** (tool loop opt-in via `ZINGERS_AGENT_TOOLS=1`).

## Share & viral

- **`/c/[key]`**: public agent card page
- **`/api/card/[key]`**: OG PNG for social unfurls
- Challenge links carry recipe + career snapshot via query params

## Stack (this repo)

Next.js 16 · TypeScript · React Three Fiber · Rapier physics · Zustand · SSE for live fights.
