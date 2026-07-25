# The Long Game: why Zingers ends after 40 minutes, and how it stops

> **Status: shipped Stages 0–6 (July 2026).** Design companion to the bible.
> Player-facing Flight fiction stays in [`bible/10-ascent.md`](./bible/10-ascent.md);
> naming in [`vocabulary.md`](./vocabulary.md). Companions:
> [`design-vision.md`](./design-vision.md), [`essence.md`](./essence.md),
> [`flight-first-plan.md`](./flight-first-plan.md).

This doc answers one question: **how long can a player play before they run out of
reasons, and what do we change?** Stages below are live unless marked deferred.

---

## 1. The honest clock

Cold-player estimate for the build as it stands:

| Window | Time | What ends it |
|--------|------|--------------|
| First session | **35–45 min** | Flight → claim → a fight → "…now what?" |
| Day 2 | **~8 min** | Daily, one Flight, close |
| Day 4 | **~0** | Nothing asked them to come back |
| Flight-bonded minority | **3–5 h / week** | Genuine high-score pull, if the feel lands |

That reads like a thin game. It is not a thin game. See §2. It is a **legible-
surface** problem: the content exists and the player never learns it exists.

## 2. What is actually built (the surprise)

An audit of the live code, not the docs, found:

- **Flight:** 100 sectors across 10 Reaches, hazards, camps, first-light chests,
  gold rings, scout, ghosts, share links, a 2500-Crown Hundred purse.
  (`components/grounds/climb/*`, `lib/climb-campaign.ts`)
- **Champions:** First Minds + baked dex (Stage 6 wave 1), type pentagon, 5 tiers,
  career-derived bodies + phenotype, Saga ledger, Imprints.
  (`lib/engine/roster.ts`, `lib/minds/baked.ts`, `lib/imprints.ts`, `lib/evolve/*`)
- **Return hooks:** Daily fight, daily caches, seasonal goals, 28-day seasons,
  Clan war, prediction streaks, a global rating board that self-plays via cron,
  Director guiding, unlock track, wing traits, Conditions, expeditions.
- **Shelved:** 5 Keepers, fully written and tested, switched off by
  `KEEPERS_PLAYABLE = false` (`lib/features.ts`). A House game with types and store
  hooks and no UI.

That is on the order of **15 hours of content being served in the first 30 minutes,
mostly invisibly.** The problem was never volume.

## 3. Diagnosis. Four structural faults

1. **Nothing points at the next thing.** No function anywhere answers *what should I
   do now?* Every hook is discoverable only by already knowing about it.
2. **Everything is open at minute one.** All regions, all scenarios, all 100 sectors,
   all 8 recruits. A 15-hour reveal spent instantly. Games that feel long mostly
   just withhold better.
3. **Raising has no visible effect on the verb you perform.** Training costs 60
   Crowns and moves three invisible dials. The player never sees a run or a fight go
   differently because of what they taught.
4. **The repeated verb has no variance.** Every run is the same run; every fight is
   the same fight with different prose.

## 4. The yardstick (stop measuring against Pokémon)

Pokémon and Zelda are **content-volume** games. Hand-placed worlds built by
hundreds of people. We lose that race permanently and the comparison only produces
despair.

Our actual peers are **Balatro** (one card game, ~150 modifiers, hundreds of hours),
**Vampire Survivors** (one mechanic plus an unlock tree), and **Football Manager**
(no world at all. Pure career friction). All three extract enormous playtime from a
fraction of the assets Zingers already has, using three tools: **run variance,
drip-fed unlocks, and a career state that carries consequences.**

**Target: 10–15 hours across the first month, with a real 8–12 minute daily reason to
open.** Not Zelda. Five to ten times where we are, reachable without new art.

## 5. The direction decision (founder call, July 2026)

> **Flight is the game. The champion is the save file. Battles are punctuation.**

Reading LLM debate transcripts is a novelty that dies on repetition. Depth belongs
where the player's hands are, which is Flight. This is not a retreat from the
champion. It is an **inversion of the causality**:

| | Today | After |
|---|---|---|
| Flight → champion | depth stamps a sigil | unchanged (keep it) |
| Champion → Flight | **nothing** | the mind you fly with **changes how flying plays** |

Once raising a champion is a build system for the verb the player actually performs
.  handling, scout range, a second life, gold pull, hazard reads. "raise a mind"
stops being a side tab and becomes the reason to keep raising. That is the Pokémon
feeling (team building, meaningful choices, legible consequence) relocated to the
right verb.

Battles stay: "you fly, it fights" is the differentiator, and the async league is
content that runs while players sleep. But they get **compressed into resolved,
glanceable, stake-carrying moments**. Never a wall of text to read. Keepers stay
off; a switched-off text game is not free content.

## 6. The plan

Ordered by return on effort. Each stage is shippable alone.

### Stage 0. The Director *(1–2 days)* ✅ shipped

A pure function over existing save state that answers "what now?" in one line and one
button, rendered on every surface a player lands on. Creates no content; it makes
built content perceivable. `lib/director.ts` + `components/director/*`.

### Stage 1. The unlock track *(3–5 days)* ✅ shipped

One Trainer track that every activity feeds, where each rank opens something **by
name**: Reaches in blocks, then tribunal, gauntlet, broker, the second region,
recruit slots, scout. Not new content. Rationed content. Retro-fits the existing
build into a 15-hour reveal and gives the Director a spine to point at.

Live module: `lib/unlock-ladder.ts`. Enforced on Flight ceilings (mobile +
desktop), Hub gates, Broker, Scout, recruit slots; Director primary/also can
point at the next named door. Reach II prove gate unchanged. Depth already flown
is grandfathered so existing saves aren't soft-locked.

### Stage 2. Champion → Flight causality *(1–2 weeks)* ✅ shipped (v1)

The core of §5. Each champion grants **wing traits** that measurably change a run;
imprints and milestones teach new ones; the player picks a loadout before launch.
Turns 8 minds into 8 × loadout-space and makes every raising action pay out in the
verb that matters.

Live module: `lib/wing-traits.ts`. One **innate** trait per Force type + up to one
**earned** trait (axes / camps / temperament). Effects: lives, gold odds, glide,
stumble, scout camp bonus, cruise speed. Applied via `ascentSessionMods` on both
Flight bodies. Ready strip shows `WINGS · …` and earned toggles.

### Stage 3. Conditions *(3–5 days)* ✅ shipped (v1 Flight)

A data-driven modifier applied to a run or a fight: thin air, fog, crosswind, one
life, doubled gold, no scout, hostile crowd, sudden death. Twenty-plus of these is a
day of writing plus engine hooks, and it multiplies every existing surface. The
purest parametric win available.

Live module: `lib/conditions.ts`. Thirteen ranked daily skies (UTC day rotation),
merged after wing traits via `mergeRunMods`. Scout practice stays Clear Sky.
Ready strip shows `TODAY · …`; Director can surface the sky as an also-ask.
Fight-side Conditions deferred.

### Stage 4. Career friction and legacy ✅

Live modules: `lib/career-friction.ts`, `lib/legacy.ts`. Form / fatigue / scars stack into
Flight after wings + Conditions (`applyCareerToMods` on Climb + Circuit). Rival chapters
escalate via `maybeEscalateRival` / `currentRival`. Retire seals a legend + pending heirloom
wing for the next claim (`retireOwned` → Long Vault). Director rotates spent/broken stables
and surfaces Face / retire as also-asks.

### Stage 5. Expeditions ✅

Live module: `lib/expeditions.ts` + `lib/server/expedition.ts` + `/api/expedition`.
UTC-week route: seed (layouts via `climbSector(i, seed)`), one Condition, 20 sectors,
own board per body. Mode `expedition` on Climb + Circuit. No camps, fractional XP/
Crowns. Ready strip `WEEK · …`; Director also-ask. Ghost-of-#1 deferred (codec ready
in `lib/climb-ghost.ts`).

### Stage 6. Batch content ✅ (dex wave 1 live)

Offline pipeline: `content/minds/reviewed/*.json` → `npm run bake:minds` →
`lib/minds/baked.ts`, merged into roster / banter / beats / first-duel / showcase.
Wave tools: `npm run forge:dex` (curated name banks + voice kits) and
`npm run generate:minds` (optional XAI drafts). First hand bake: **STILL**, **KEEL**,
**PRISM**, **FABLE**. Wave 1 forged a Gen-1-scale collectible set on top (see
`docs/bible/03-champions.md`). Phenotype part catalog + species marks at rookie
tier so same-Force minds read as different animals. No new GLTF per mind.
Further waves = more reviewed JSON + rebake + part-kit expansion.

## 7. Explicit non-goals

- **A fourth region.** It is cheap (a `BiomeConfig` blob and a nature preset) and
  that is exactly the trap. Three regions with no job become four regions with no
  job, and the emptiness gets bigger and better lit. Regions get *jobs* before they
  get siblings.
- **Turning the Keepers back on** as filler. They return only if a redesign makes
  them a performance, not a transcript.
- **Anything that displaces the Flight-First feel gates.** Retention scaffolding on a
  core verb that doesn't feel good just makes a legible empty standings. Feel work in
  [`flight-first-plan.md`](./flight-first-plan.md) stays ahead of everything here.

## 8. How we'll know

| Signal | Where | Today | Target |
|--------|-------|-------|--------|
| D1 return | `/stats` | unmeasured | 35% |
| D7 return | `/stats` | unmeasured | 15% |
| Sessions/player/week | `/stats` | ~1.4 (est.) | 4 |
| Median depth after week 1 | `climb.bestSectors` | ~12 (est.) | 40 |
| Players who see Reach IV | camps lit ≥ 4 | rare | 30% |

Instrument before Stage 1 lands, or we will be guessing about whether any of this
worked.
