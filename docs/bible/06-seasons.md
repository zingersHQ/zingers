# 06 · The Chronicle: living, generative seasons

A **season** is the Vault opening one more door. It is the game's content cadence
and its story engine at once. Seasons are **generative and seeded**: from a single
season seed plus this bible, the game derives the season's story, topic bank, region
tilt, featured mind, and rank policy, reproducibly, and never off-canon.

## What a season turns over

| Element | What changes each season | Source |
|---------|--------------------------|--------|
| **The Arc** | A short narrative: which door opened, what leaked out, who rose | generated from seed + canon |
| **Topic bank** | The season's propositions (the "forbidden questions" the door remembered) | generated, themed to the door |
| **Region tilt** | A featured region + its force-bias (or a brand-new region) | chosen for force balance |
| **Featured mind** | A descendant/echo of a First Mind, the season's "face" | generated lineage |
| **Rank policy** | A **soft reset**: ranks compress toward the mean, they don't wipe | fixed rule (below) |

## Soft rank reset (the "always stay on rank" rule)

The fear with seasons is losing your standing. Zingers never wipes it. At a season
turn, every rating is pulled a fraction of the way back toward the baseline:

```
newRating = baseline + (oldRating - baseline) * RETENTION   // RETENTION ≈ 0.6
```

So a legend stays a legend (just closer to the pack), a climber keeps most of their
gains, and newcomers have a real shot at the top of the *new* season's ladder. You
always carry your name forward; you just have to defend it.

## Champion sagas (personal generative narrative)

Beyond the world story, **each champion accrues its own saga** from its real match
history: its memory notes, its biggest dunks, its rivalries (who it beat, who beat
it). The generator turns this into a short, evolving in-character biography that
lives on the champion's card and profile. The data is already there
(`Recipe.memory`, the battle MVP lines, the ELO record); the season engine just
narrates it.

## Generator contract (canon discipline)

The generative layer must:
1. Take a **seed** (the season number is the default seed) so output is reproducible.
2. Read this bible as canon and **never rename** forces, Keepers, regions, or First
   Minds.
3. Produce **additive** lore only: a new door, not a retcon.
4. Degrade gracefully: with no model available, fall back to a **deterministic**
   season composed from canon tables (so the game always has a live season).

The deterministic backbone lives in [`lib/lore/season.ts`](../../lib/lore/season.ts);
the optional model pass enriches the Arc and topic flavour on top of it.
