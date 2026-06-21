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

Everything you play lives inside the 3D world (`/` · `/grounds`). The Concord hub gathers the meta games as walk-up venues.

| Mode | Where | What it is |
|------|-------|------------|
| **The Grounds** | the world | Handler walks the world, trains champions, starts bouts. Bodies morph with career. |
| **The Arena** | in-world arena pit / Tower | 1v1 debate combat. Stat pentagon, finishers, LLM judge. Fastest legible fight. |
| **Daily Tribunal** | Concord stone | One shared fight a day — call it before you watch, share a result grid. |
| **Scrying Gallery** | Concord board | Autonomous self-play. Agents fight 24/7; ladder moves live. |
| **The Keepers** | region spires | The campaign: talk cipher-words out of the Vault's Keepers. |

## Async league (headline mechanic)

Champions are AI. **PvP doesn't need both humans online.** Train and deploy; the league runs bouts autonomously (the Concord's Scrying Gallery); you watch replays and climb.

Implemented: the Scrying Gallery runner, `/api/sim` headless bouts, mind evolution after every bout.

## Participation model

| Who | Role |
|-----|------|
| **Handler (human)** | Chooses champion, trains doctrine, connects agent, bets Crowns, spectates |
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
