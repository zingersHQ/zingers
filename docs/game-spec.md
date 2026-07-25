# Zingers: game spec

**You fly. It fights. You both rise.** You don't fight. You raise an AI champion that does,
and you climb the sky beside it.

Canonical product framing: **[design-vision.md](./design-vision.md)** (Flight-First) ·
doors: **[two-doors.md](./two-doors.md)** · active roadmap: **[flight-first-plan.md](./flight-first-plan.md)** ·
retention: **[long-game.md](./long-game.md)** · naming: **[vocabulary.md](./vocabulary.md)**.

## Core principle

> **The LLM is the actor. The engine is the game.**

Combat is turn-based with explicit moves and stat-driven resolution. Stats, types, training,
status effects, and variance decide damage. Wit quality is a bounded multiplier (0.7–1.3, or
1.4 on Highlight). By default a **local judge**; an LLM judge is opt-in
(`ZINGERS_LLM_JUDGE=1`). Neither can single-handedly decide the match.

Full numbers, roster, and a worked sample battle: **[combat-design.md](./combat-design.md)**.

## The loop

**Fly → Claim → Raise → Fight → Climb higher**

1. **Fly** (Flight): one game on phone (`/m` / `/ascent`) and desktop (Circuit venue).
   Same soul; native bodies.
2. **Claim** the mind on your wing, or pick from the weekly starter pool (one per Force)
   drawn from First Minds + baked dex.
3. **Raise**: seed Strategy at adopt; then Imprints, persona, and brain choice.
   Temperament meters are a readout. Fights and lessons move the dials.
4. **Fight** 1v1 duels with visible reasoning, in the world (region arenas, Daily Tribunal, …)
5. **Climb higher**: Flight depth + honest standings / rating (`/standings`). Both feed
   Trainer Rank. The **Director** points at what's next (`lib/director.ts`).

## One world, many games

Everything you play lives inside the 3D world (`/` · `/grounds`), with a native mobile shell
at `/m`. The Hub gathers meta games as **walk-up venues**; each floating region hosts
arena scenarios. **Flight** is one soul: Circuit on desktop is the raceable body of the
same 100-sector climb as mobile. Catalogue: `lib/scenarios/registry.ts` · venues:
`components/grounds/venues.ts`.

### Hub & venues

| Mode | Where | What it is |
|------|-------|------------|
| **The world** | everywhere | Fly, raise champions, hunt goals. Bodies morph with career. |
| **The Amphitheatre** | Hub venue | Watch autonomous league self-play in the **Live Gallery**; today's Tribunal herald. |
| **Flight (desktop)** | Circuit venue | 100-sector Flight in full six-degree flight (ten Reaches); two lives; board by depth, then time. |
| **Flight (phone)** | `/m`, `/ascent` | Same Flight soul, one-thumb. The mobile face of the game. |
| **Daily Tribunal** | Hub stone | One shared fight a day. Call it before you watch; share a result grid. |
| **The Keepers** | region spires | Campaign: talk **secret words** out of the Vault's Keepers (playable flag may be off). |

### Arena scenarios (in-world)

| Scenario | Where | What it is |
|----------|-------|------------|
| **Open Duel** | any region plaza | 1v1 debate combat. Pick opponent, settle it. Stat pentagon, finishers, bounded wit judge. |
| **The Gauntlet** | Ember Wastes (default) | Chain of ever-stronger fighters; press your luck or cash out. |
| **The Tribunal** | Obsidian Colosseum (flagship) | Assigned-stance debate to a jury; switching sides scores ≈0. |

Unlisted **`/arena`** remains the agent fight viewer for bring-your-own-agent testing
(debate combat and The House social-deduction benchmark).

### First journey (Flight-First)

| Door | First minutes |
|------|----------------|
| **Mobile** | Splash → Take flight (guest OK) → claim wingmate → raise → boards |
| **Desktop** | Wake → short flight → champion pick (weekly starters) → Hub / Flight → duel *motivated* by climb |

Live sequencing: **[flight-first-plan.md](./flight-first-plan.md)** and
**[two-doors.md](./two-doors.md)**. Historical fight-led Act 1:
**[first-journey-roadmap.md](./first-journey-roadmap.md)**.

### Flight extras (shipped)

- **Challenges:** race another Trainer's ghost mark; share `/ascent/<id>`; overtake toasts
  when you clear past their tip ([`bible/10-ascent.md`](./bible/10-ascent.md)).
- **Director + unlock track + wing traits + daily Conditions + weekly expeditions:**
  see [`long-game.md`](./long-game.md).

### Ambience

Procedural soundtrack per place (`lib/ambience-scores.ts`): Hub, each region
biome, Amphitheatre, Flight, and live fights each resolve their own mood via
`resolveAmbienceMood()`. Loud SFX duck the score through `lib/ambience-bus.ts`.

## Economy sketch

**Crowns** are earned in play (Flight, fights, goals) and spent on training / entries.
Wallet link is optional identity (keep your Trainer name across devices), not a paywall.
See [`bible/08-economy.md`](./bible/08-economy.md), [`AI-CRYPTO.md`](./AI-CRYPTO.md).

## Async league

Champions are AI. **PvP doesn't need both humans online.** Raise and deploy; the league runs
fights autonomously (the Hub's **Live Gallery**); you watch replays and climb. Cron /
Live Gallery feeds an objective **rating** board (player copy: standings / rank / board;
never ELO or ladder).

Implemented: Live Gallery runner, `/api/sim` headless fights, mind evolution after every fight.

## Participation model

| Who | Role |
|-----|------|
| **Trainer (human)** | Flies, claims/raises champions, connects agents, backs Crowns, spectates. Identity = Trainer name (+ optional wallet). |
| **Handler** | The 3D avatar you see in the world (jetpack on its back). Not a separate player role. |
| **Champion (agent)** | Picks moves, writes lines, adapts via memory, within engine rules |
| **Judge** | Scores rhetoric quality (local by default; LLM opt-in); flags Highlights |
| **Engine** | Authoritative damage, types, statuses, rating |

## Agent platform

Any brain that implements `act(view) → decision` can drive a champion. See **[agent-protocol.md](./agent-protocol.md)**.

Providers: house Grok · OpenAI-compatible · HTTP webhook · mock (offline).
Default house path: **single-shot JSON** (tool loop opt-in via `ZINGERS_AGENT_TOOLS=1`).

## Share & viral

- **`/c/[key]`**: public champion card page
- **`/api/card/[key]`**: OG PNG for social unfurls
- Challenge links: `/ascent/<id>` (ghost race + career snapshot)

## Stack (this repo)

Next.js 16 · TypeScript · React Three Fiber · Rapier physics · Zustand · SSE for live fights.
