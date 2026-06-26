# Zingers: game spec

**Raise a mind. Make it legend.** You don't fight. You raise an AI champion that does.

## Core principle

> **The LLM is the actor. The engine is the game.**

Combat is turn-based with explicit moves and stat-driven resolution. Stats, types, training, status effects, and variance decide damage. A judge model scores line *quality* as a bounded multiplier (0.7–1.3, or 1.4 on Highlight). It cannot single-handedly decide the match.

Full numbers, roster, and a worked sample battle: **[combat-design.md](./combat-design.md)**.

## The loop

**Scout → Train → Watch → Evolve → Climb**

1. **Claim** a champion in the 3D Grounds (`/grounds`)
2. **Train** doctrine dials + plug in a brain (house Grok, your GPT/Llama, or HTTP agent)
3. **Fight** 1v1 bouts with visible reasoning, in the world (the arena pit, Tower challenges, the Daily Tribunal)
4. **Evolve**: wins reshape the body, tune doctrine, write opponent memory
5. **Climb**: objective ELO ladder (`/standings`)

## One world, many games

Everything you play lives inside the 3D world (`/` · `/grounds`). The Concord hub
gathers meta games as **walk-up venues**; each region-slab hosts arena scenarios
and a themed Circuit tunnel. Catalogue: `lib/scenarios/registry.ts` · venues:
`components/grounds/venues.ts`.

### Hub & venues

| Mode | Where | What it is |
|------|-------|------------|
| **The Grounds** | everywhere | Walk, train, claim champions, hunt goals. Bodies morph with career. |
| **The Amphitheatre** | Concord venue | Watch autonomous league self-play; today's Tribunal herald. |
| **The Circuit** | Concord venue + region tunnels | 10-sector jetpack time trial; one fall restarts from sector 1; leaderboard by depth, then time. |
| **Daily Tribunal** | Concord stone | One shared fight a day — call it before you watch, share a result grid. |
| **The Keepers** | region spires | Campaign: talk cipher-words out of the Vault's Keepers. |

### Arena scenarios (in-world)

| Scenario | Where | What it is |
|----------|-------|------------|
| **Open Duel** | any region plaza | 1v1 debate combat — pick opponent, settle it. Stat pentagon, finishers, LLM judge. |
| **The Gauntlet** | Ember Wastes (default) | Chain of ever-stronger fighters; press your luck or cash out. |
| **The Tribunal** | Obsidian Colosseum (flagship) | Assigned-stance debate to a jury; switching sides scores ≈0. |

Unlisted **`/arena`** remains the agent bout viewer for bring-your-own-agent testing
(debate combat and The House social-deduction benchmark).

### Act 1 onboarding

New Readers run a scripted first journey: cinematic intro → pick a starter (weekly
rotation per Force) → tune doctrine → first duel in the Void Garden → evolve card →
Concord landing beats → free roam. See **[first-journey-roadmap.md](./first-journey-roadmap.md)**.

### Ambience

Procedural soundtrack per place (`lib/ambience-scores.ts`): Concord hub, each region
biome, Amphitheatre, Circuit, and live fights each resolve their own mood via
`resolveAmbienceMood()`.

## Async league (headline mechanic)

Champions are AI. **PvP doesn't need both humans online.** Train and deploy; the league runs bouts autonomously (the Concord's Scrying Gallery); you watch replays and climb.

Implemented: the Scrying Gallery runner, `/api/sim` headless bouts, mind evolution after every bout.

## Participation model

| Who | Role |
|-----|------|
| **Handler (human)** | Chooses champion, trains doctrine, connects agent, backs Crowns, spectates |
| **Champion (agent)** | Picks moves, writes lines, adapts via memory, within engine rules |
| **Judge (LLM)** | Scores rhetoric quality; flags Highlights |
| **Engine** | Authoritative damage, types, statuses, ELO |

## Agent platform

Any brain that implements `act(view) → decision` can drive a champion. See **[agent-protocol.md](./agent-protocol.md)**.

Providers: house Grok · OpenAI-compatible · HTTP webhook · mock (offline).

## Share & viral

- **`/c/[key]`**: public agent card page
- **`/api/card/[key]`**: OG PNG for social unfurls
- Challenge links carry recipe + career snapshot via query params

## Stack (this repo)

Next.js 16 · TypeScript · React Three Fiber · Rapier physics · Zustand · SSE for live bouts.
