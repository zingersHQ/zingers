# Region variety: making each slab worth the trip

> **Status: brainstorm / proposal (partially superseded).** Not canon. This sits in
> `docs/` (design), not `docs/bible/` (the single source of truth). Promote pieces
> into the bible once we commit to them.
>
> **Shipped since this doc was written:** The Tribunal scenario, The Circuit venue,
> region goals (▲/▼/◆), the Broker, and the great rift — all in
> [05-regions.md](./bible/05-regions.md). The scenario catalogue is now four entries
> (`duel`, `gauntlet`, `tribunal`, `circuit`); Circuit is a **venue**, not a
> region scenario.

## The problem, stated honestly

Today there is **one parametric world wearing three costumes**. `biomes.ts` says it
out loud: *"One parametric world, many skins."* Every region is the same skeleton —

- a flat plaza (`PLAZA_R = 22`) with the arena in the middle,
- a climbable **Tower** helix on one bearing,
- the **Keepers' Spire** + **Training** pad on rim sectors,
- the **Broker**,
- procedural **wilds**, one **great rift**, and the three goals **▲ Peak / ▼ Depth / ◆ Secret**.

What actually changes per region is: the **skin** (palette/sky/fog/light), a few
**terrain params** (`seed`, amplitudes, `ridged`), the **surround** (`tiers` vs
`caldera`), the **arena form** (`ring` vs `pit`), the **rift** depth, the agent
**roam pattern**, an assigned **arena scenario**, and a themed **Circuit tunnel**
mouth. **Venues** (Amphitheatre, Circuit from the Concord) are a separate axis from
region-slabs — see [05-regions.md](./bible/05-regions.md).

The settlement system in `components/grounds/districts.tsx` already *grows* a town
(tier 0→4) around each arena, themed per biome — but those buildings are scenery
with collision, not places you do anything.

So: breadth is cheap (add another reskinned slab), depth is absent (nothing
region-specific to *do*). This doc is about depth.

## Design principles (the guardrails this has to respect)

1. **Stay parametric.** Variety should be *config + a small amount of bespoke
   code*, not a hand-built level per region. The whole engine's value is that a
   region is a data object. Don't throw that away.
2. **Additive & deterministic.** Like `districts.tsx` and `goals.ts`: seeded by
   biome/season, reproducible, and a tier-up only *adds*. No per-render surprises.
3. **Cheap to render.** Code-only primitives + procedural materials, one warm
   light per town, instanced scatter. New content must hold the same budget.
4. **Canon-safe.** Regions tilt the Wheel, never contradict it
   (`docs/bible/05-regions.md`). New game modes must fit the fiction (everything
   is a *mind* on the Grounds; arenas are *ways of arguing*).
5. **Serves the three session-lengths** (`docs/bible/README.md`): Roam / Quick
   match / Raise. New variety should deepen Roam without bloating Quick match.

## Three axes of variety

The flat truth is that "what you do in a region" decomposes into three independent
axes. We can advance each on its own track.

```
        A. SCENARIOS  — the game played in the arena (registry-driven)
        B. SETTLEMENTS — the town as a place with function (districts-driven)
        C. TRAVERSAL  — getting around the slab as its own game (goals/terrain-driven)
```

---

## Axis A — Scenarios: more than duel & gauntlet

The cleanest lever we already have. `lib/scenarios/registry.ts` + `types.ts` are
built for exactly this — a scenario is "the GAME played in a world… independent of
the biome." Today `ScenarioId = "duel" | "gauntlet" | "tribunal" | "circuit"`.
(Circuit is implemented as a Concord **venue** with region tunnel variants, not a
region-bound scenario.) Each new entry is a new *reason* to pick a region or venue.

| Scenario / venue | Status | One-line |
|---|---|---|
| **Open Duel** | ✅ shipped | pick your opponent, settle it (default everywhere) |
| **The Gauntlet** | ✅ shipped | rising chain of fighters; press luck or cash out |
| **The Tribunal** | ✅ shipped | assigned-stance debate to a jury; switching sides scores ≈0 |
| **The Circuit** | ✅ shipped (venue) | 10-sector flying run; one fall restarts from sector 1 |
| **The Atelier** (Void) | proposal | "reframe" mode: Spark-biased scoring tilt |
| **Siege / King-of-the-hill** | proposal | hold the arena vs a queue for a timer |
| **Relay** | proposal | 3-champion team, momentum carries between bouts |

**Where it slots:** add the id to `ScenarioId`, a `ScenarioDef` to `SCENARIOS`,
optional config block (mirror `GauntletConfig`), and assign it in `worlds.ts`.
The HUD/briefing already reads `blurb` + `objective`. The Gauntlet shows the full
pattern end-to-end (`components/grounds/gauntlet.tsx`): briefing → interstitial →
result. A new scenario is ~one component of that shape + a registry entry.

**Next bang:** functional settlement walk-ups (Axis B) or a region-specific scoring
mode like **The Atelier** — Tribunal and Circuit already proved the pattern.

---

## Axis B — Settlements that mean something

`districts.tsx` already grows the town. The gap is that the buildings are inert.
We don't need interiors or NPCs-with-pathfinding to fix this — we need a few of
the buildings to be **functional landmarks** you walk up to (the same walk-up
interaction the Train pad / Spire / Broker already use).

Proposal: as the district tiers up, specific **service buildings** appear at known
slots (deterministic, like the rest of the town), each a walk-up like the Broker:

| Tier | Building | Function (all reuse existing systems) |
|---|---|---|
| 1 | **The Broker's Stall** | already exists — fold it into the town visually |
| 2 | **The Forge / Atelier / Workshop** (themed) | a *place* for Training, instead of a bare pad |
| 2 | **The Wager House** | walk-up to back champions in the live league |
| 3 | **The Archive** | drops region lore / Keeper echoes (ties to ◆ Secret) |
| 4 | **The Gatehouse** | fast-travel to another region (today the Concord owns gates) |

The trick: these are **the same buildings already in `COUNT_BY_TIER`**, just with
a couple of them *tagged* as functional and given a beacon + a walk-up trigger.
Architecture already themes per biome (houses/forges/spires) via `styleFor`.

This turns "the town grows" from a cosmetic flourish into a *visible reward curve*:
a mature region literally has more to do in it, which is exactly what
`docs/bible/08-economy.md` wants world-growth to signal.

**Cities vs villages:** keep it as one growth axis (tier 0→4) — a "city" is just a
tier-4 district with all services lit. Don't invent a parallel taxonomy (the bible
explicitly warns against minting new top-level containers).

---

## Axis C — Traversal as a game

The Tower (a climbable helix) and the three goals (Peak via flight, Depth descent,
Secret hunt) are the seed of a movement game, but every region traverses
identically. Two cheap ways to make *getting around* region-specific:

1. **Hazards from the biome you already have.** Ember's rift is lava (a real
   hazard to fly across); Void's is a river of light; the Colosseum's is a
   vault-crack. `05-regions.md` already describes these — wire the rift floor as a
   damage/▼-goal gate so descending *means* something per region. The terrain math
   (`canyonDepth`, `ridged`) is already there.
2. **A per-region traversal course** seeded like the goals. Reuse the floating
   `Platforms` system + `Tower` layout code to lay a short, optional **parkour
   line** from plaza to Peak that reseeds each season (like `worldGoals`). Ember's
   is a sparse, lava-gapped scramble; Void's is a long bioluminescent glide;
   Colosseum's is a tight stone climb. Same primitives, different `scene` params.

This is the "exciting platform game" instinct — but kept honest: it's the **Tower
+ Platforms code reparameterized per biome**, plus a seeded route, not a bespoke
hand-built level.

---

## Suggested phasing (smallest valuable step first)

1. ~~**The Tribunal scenario**~~ ✅ shipped — registry + HUD; flagship Colosseum arena.
2. **Functional settlement (tier-2 services)** — tag Training + Wager buildings as
   walk-ups inside the existing district. Makes town growth *felt*.
3. **Rift hazards** — make ▼ Depth descent region-specific (lava/light/crack).
4. ~~**The Circuit**~~ ✅ shipped as a Concord venue + region tunnel variants.
5. **Per-region traversal course** — seeded parkour line reusing Tower/Platforms.
6. **One more scenario** (Siege, Relay, or Atelier) once the pattern is proven.

Each step is independently shippable and reuses code that already exists.

## Open questions

- **Scenario ↔ region binding:** is a region's scenario fixed (today's model), or
  can a region host several and the player picks at the gate?
- **Service-building interactions:** do they open the *existing* modals (Training,
  Broker, Wager) in place, or is there a new in-world panel style?
- **Traversal rewards:** does the parkour line pay Crowns/Fragments like goals, or
  is it pure flavour + a shortcut to the Peak?
- **Generated regions:** when the Chronicle spawns a *new* region from a
  Keeper-door, which scenario does it inherit, and is its town/course seeded the
  same deterministic way?
- **Budget:** how many functional buildings + a parkour line before we blow the
  render budget on lower-end devices?
