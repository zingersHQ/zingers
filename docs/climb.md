# The Climb — the Hundred-Sector Ascent (design draft)

> **In short:** The Climb grows from a 10-sector prototype into a meticulously
> designed **100-sector ascent** split into ten themed **Reaches** (a Reach — a
> band of ten sectors sharing one sky). Difficulty is a tuned function, not a
> ramp; hazards, modifiers and surprises are budgeted, themed, and deterministic;
> every reward writes back to the champion and the shared economy. The Climb and
> the 3D Grounds stay two bodies of one soul: same regions, same skies, same
> champion, same ledger.

Status: **design draft — approved direction; systems largely shipped, feel pass next.**
Companions: [`essence.md`](./essence.md) (the soul-atom law this must obey),
[`mobile.md`](./mobile.md) (the shell it lives in), [`game-spec.md`](./game-spec.md),
[`region-variety.md`](./region-variety.md), [`circuit-world.md`](./circuit-world.md)
(desktop body), [`climb-feel.md`](./climb-feel.md) (**next: corridor grammar,
runner heartbeat, Flappy silhouette** — amends §1 lateral weave).

---

## 1. Non-negotiables (inherited, not re-decided)

From `essence.md` §2–3, the Climb's **soul atom**: *you ascend; altitude is the
score; one fall returns you to zero; the run marks your champion.* Everything
below is body, and must never violate these:

1. **One input.** Hold to rise, release to fall. **Amended (see
   [`climb-feel.md`](./climb-feel.md) §1c):** on mobile, rings share one lateral
   plane (`x = 0`) — no weave, no auto-X centering. Lateral skill stays out;
   height is the only skill axis. Any hazard that requires a second input is out.
2. **One fall = run over, back to sector 1** for ranked runs. Camps (§6) give
   practice starts, never ranked shortcuts.
3. **Depth is soul → cross-device** (Trainer XP, ascent sigil, Saga events).
   **Time/mastery is craft → per-device** (Crowns, split leaderboards).
4. **Everything marks the champion.** New Reach reached → career-ledger event →
   the Saga. No detached scores.
5. **The mirror law.** The Climb renders the *same* world the desktop roams:
   biome configs, region names, Keepers, and palette come from the same source
   (`biomes.ts`, `lib/lore/canon.ts`) — never a parallel art set.

Hard technical laws learned the hard way (July 2026 debugging):

- The lite canvas has **no EffectComposer / manual render pass** — nothing in it
  may register a `useFrame` with priority > 0 (`companionRenderPriority={0}`
  stays forever; see commit `de1eec7`).
- **No physics engine.** All collision is manual math (`staticMode` path).
- Verify on **`next build` + real device**, never dev-only.

---

## 2. Structure — 100 sectors, ten Reaches

The run is one continuous ascent from the Concord's launch pad into the sky
above the Long Vault. Every 10 sectors the sky changes: a new **Reach**.

Ten distinct looks from five existing biomes — for free — using the existing
`daylightBiome()` transform (night skin + day skin per biome, zero new art):

| Reach | Sectors | Skin (`biomes.ts`) | Sky | Fantasy beat |
|---|---|---|---|---|
| I · The Launch | 1–10 | `concord` night | slate-violet, gate-ring glow | leaving neutral ground; the tutorial Reach |
| II · Colosseum Rise | 11–20 | `colosseum` night | cosmic violet nebula | over the home grounds |
| III · Garden Drift | 21–30 | `void` night | bioluminescent teal | the Void Garden's spores drift past |
| IV · Ember Thermals | 31–40 | `ember` night | volcanic orange, ash | heat, updrafts, falling cinders |
| V · The Amphitheatre | 41–50 | `amphitheatre` night | torchlit dusk gold | the league watches you pass — midpoint ceremony |
| VI · Concord Dawn | 51–60 | `concord` **day** | pale morning | above the clouds; the world turns bright |
| VII · High Colosseum | 61–70 | `colosseum` **day** | daylight violet-grey | thin air, faster winds |
| VIII · Garden Zenith | 71–80 | `void` **day** | glass-teal noon | crystal fields in full sun |
| IX · Ember Corona | 81–90 | `ember` **day** | white-hot haze | the hardest hazards live here |
| X · The Hum | 91–100 | `void` night, custom nebula boost | near-black, star-dense | above everything; what the Long Vault hums beneath |

Reach skinning is cheap by construction: background color, fog, hemisphere/sun
lights, platform/ring palette, mote color all read from the `BiomeConfig`;
Reach-specific dressing (§4 hazards + 2–3 silhouette props per Reach) is the
only new art, and it's instanced primitives in the existing style.

**Reach transitions** are the reward rhythm: crossing a `x0` finish ring plays
the sector-clear flourish plus a **sky shift** — fog/bg/light colors lerp over
~2s while a Reach title card fades ("REACH IV · EMBER THERMALS — the sky above
the Wastes"). Cheap (uniform lerps), unforgettable, and it doubles as the
altitude storytelling.

### Sector roles inside a Reach (the 10-beat bar)

Every Reach follows the same authored rhythm, so difficulty breathes instead of
ramping monotonically. `k` = sector index within the Reach (1–10):

| k | Role | Notes |
|---|---|---|
| 1 | **Arrival** | new skin, easy layout, no hazards — let the player *look* |
| 2 | Teach | introduces this Reach's signature hazard alone, forgiving gaps |
| 3 | Combine | signature hazard + standard gates |
| 4 | Rhythm | tight gate cadence, no hazards — pure flappy flow |
| 5 | Pressure | hazard density peak #1 |
| 6 | **The Vista** | breather: wide gates, long scenic glide (the "screenshot sector"), light Crowns pickup line |
| 7 | Twist | this Reach's *modifier* sector (see §5) |
| 8 | Pressure | hazard density peak #2, faster |
| 9 | Gauntlet | everything this Reach taught, together |
| 10 | **Gate Trial** | the Reach boss-sector: guarded finish ring (§4 rotors/wardens), then the sky shift |

This bar is the "meticulous design" backbone: 100 sectors = 10 Reaches × 10
authored roles, each fully determined by (Reach recipe × role template × seed),
plus a short list of **signature overrides** for landmark sectors (at minimum:
s10, s25, s50, s75, s90, s100 get hand-tuned layouts and names worth talking
about — s50 crosses the Amphitheatre's open roof over a live crowd; s100 threads
the final ring into silence and starlight).

---

## 3. Difficulty as a function (not a slope)

All numbers derive from sector index `i` (1–100), Reach `b = ceil(i/10)` (1–10),
and role `k` (§2). Deterministic, seeded, identical for every player — fairness
and shareability ("sector 47 is evil" means the same thing for everyone).

```ts
// components/grounds/climb/difficulty.ts (new)
interface SectorDifficulty {
  speed: number;        // forward u/s
  gateRadius: number;   // ring opening
  gates: number;        // rings this sector
  gapSec: [min, max];   // seconds-of-flight between rings
  vertAmp: number;      // vertical spread of the gate line
  latAmp: number;       // LEGACY — desktop-only / retiring; mobile gates force x=0 (climb-feel §1c)
  hazardBudget: number; // spend from the Reach's hazard menu
  modifiers: Modifier[];
}
```

Tuning targets (current feel constants as the baseline):

- **Speed** `8.2 + 0.38·(b−1) + 0.04·k`, cap **12.5** (≈ +52% by Reach X). The
  *swift* modifier (§5) multiplies ×1.22 — that cap still keeps the reaction
  window ≥ ~0.45s at the tightest gap.
- **Gate radius** `4.0 − 0.13·(b−1) − 0.02·k`, floor **2.55** (champion is ~0.7
  scale — floor keeps ≥ 1.8 body-heights of opening).
- **Gap between rings** in *seconds of flight* (the honest unit): base band
  `1.2s–2.2s`; Vista sectors stretch to **5.0s max — the hard cap** (user law:
  no dead air beyond a 5-second glide). Long gaps are always *scenic*, never
  *empty*: motes thicken, a prop parade passes, or a Crowns pickup line arcs
  through them.
- **Gates per sector** `4 + floor(b/2) + (k ∈ {8,9} ? 1 : 0)`, cap 9. Sector
  length ≈ gates × gap × speed → runs of ~35–90s per sector; a full 1–100 clear
  is a **~50–70 min** aspirational feat (nobody does it week one — that's the
  point), while the *median session* stays the addictive 30–90s death loop in
  whatever Reach the player currently bleeds in.
- **Vertical amplitude** grows with `b`; the soft ceiling (park inside the next
  ring's opening) and floor-death stay exactly as shipped.
- **Fail states unchanged:** miss a ring → run over; fall below floor → run
  over. Hazards never insta-kill (§4) — they *push you toward* those two fails.

**Difficulty curve check** (the shape we're buying): smooth saw-tooth — each
Reach opens *below* the previous Reach's peak (k1–k2 dip ≈ 20%), peaks at k9–k10
above it. Progress feels like conquering weather, not climbing a cliff.

---

## 4. Hazards — themed, telegraphed, never cheap

**Collision model:** champion = one sphere (r ≈ 0.55 at current scale). Every
hazard = 1 sphere/AABB/infinite-cylinder check in the existing kinematic
`useFrame` — no physics, no raycasts. Pooled and instanced; a sector renders at
most its own hazards + the next sector's (two-sector window, §8).

**Hit rule (fairness law):** touching a hazard is a **stumble**, not death —
`vy = −6`, control locked 0.4s, screen-edge flash, champion "oof" bark. A
stumble near a gate line usually *becomes* a miss or a fall, so hazards raise
lethality without adding a third fail state (soul atom intact), and near-misses
stay thrilling instead of enraging. Post-stumble grace: 1.2s immune.

Every hazard telegraphs ≥ 1.2s before it can touch you (glow ramp, whistle SFX
with `duckAmbience`, or entry from visible distance). Nothing spawns inside the
two-second corridor ahead of the champion.

### The menu (each Reach fields 1 signature + 1–2 shared)

| Hazard | Behavior (all one-axis, dodge by altitude timing) | Native Reach |
|---|---|---|
| **Drift crystal** | large slow crystal crosses the corridor on a fixed diagonal | III, VIII |
| **Spore bloom** | stationary sphere that inflates/deflates on a visible 3s cycle | III |
| **Cinder arc** | glowing meteor lobs across on a telegraphed parabola, trail warns | IV, IX |
| **Thermal gust** | visible updraft column: inside it thrust is ×1.5 (a *helpful* hazard you can overshoot with) | IV, VI |
| **Brazier plume** | flame column rises from a platform on a 2s on/off beat | V |
| **Banner lines** | horizontal pennant ropes between stands — thread over/under | V |
| **Ring rotor** | a bar rotating *inside* a gate — thread the open half (Gate Trial staple) | k10 everywhere from Reach IV |
| **Warden wisp** | the "attacker": drifts toward your altitude for 4s (slow homing, eye-glow + hum telegraph), then self-extinguishes; never faster than half your climb rate | VII, IX, X |
| **Crosswind band** | marked band of sky with steady lateral shove — the auto-threader visibly leans, gates need earlier commitment | VI, VII |
| **Star shard** | fast, straight, fully telegraphed by a 1.5s light-line — the only "bullet", Reach X only | X |

Density budget: `hazardBudget` = 0 (Reach I) → 5 (Reach IX–X), spent per the
role table (§2): zero in k1/k6, peaks in k5/k8/k9.

---

## 5. Modifiers — the 3% spice, distributed on purpose

Modifiers are sector-wide mutations, deterministically assigned (they are part
of the sector's identity, not a roll). Distribution across the 100:

| Modifier | Effect | Count | Where |
|---|---|---|---|
| **Swift** | speed ×1.22, Crowns ×1.5 for the sector | **3** (~3%) | s23, s57, s86 (roles k3/k7/k6 — never stacked on hazard peaks) |
| **Drifting gates** | rings bob ±1.2u on a slow sine (phase visible on approach) | 8 | one per Reach III–X, always k7 |
| **Gusty** | 2–3 crosswind bands | 6 | Reaches VI–X |
| **Duskfall** | fog pulls near ×0.6; rings glow brighter (readability preserved) | 4 | one each in II, V, IX, X |
| **Silent sky** | music drops to a single drone; only SFX (tension by absence) | 2 | s49, s99 — the sectors *before* the two big ceremonies |
| **Golden hour** | pure cosmetic: warm grade, motes turn gold, Crowns pickups +1 line | 3 | Vista sectors s16, s56, s96 |

Rules: max 1 modifier per sector; never on k1/k2 (teaching beats); every
modifier announced on the sector's entry banner ("SECTOR 57 · SWIFT — the wind
has your back").

---

## 6. Progress, checkpoints, camps

Two loops, cleanly separated so the roguelike atom survives the 100-sector
campaign:

- **Ranked Run** (default, the leaderboard mode): always starts at sector 1.
  One fall = over. Depth-then-time, exactly today's scoring. This is the
  "one-more-try" loop and the only mode that writes the board.
- **Camps** (campaign persistence): reaching sector `10·n + 1` for the first
  time permanently lights **Camp n** (a small floating waystation rendered at
  each Reach boundary — mirrored as a landmark in the 3D world's sky, see §9).
  Camps unlock:
  - **Scout runs** — practice starts from any lit camp. No leaderboard entry,
    Crowns ×0.25, XP ×0.5 (learning is still soul). UI-labeled clearly so
    ranked stays honest.
  - **First-light rewards** — a one-time chest per camp (Crowns escalating
    100→1000, a Reach-themed cosmetic: mote trail color, ring-flash palette),
    plus a career-ledger event ("First Trainer light at Camp IV") → Saga.
- **The sigil grows** (identity, cross-device): today's halo caps at 6 glyphs.
  New mapping: glyph count = Reaches reached (1–10); glyph *color* = deepest
  Reach's accent; a completed Hundred rings the halo with the Reach-X star
  band. Visible in the Climb, the 3D world, portraits, and share cards — the
  champion's body tells the Trainer's climbing story (`essence.md` §3, "the
  quiet unification").

**Daily hook — Today's Ascent:** each UTC day features one Reach with a bonus
modifier and Crowns ×2 for ranked depth gained inside it. Surfaces as a card on
the mobile Today tab (one-tap into the Climb) and as a beacon over that region
in the desktop world. Same daily-index plumbing as imprints/nodes.

---

## 7. Prizes & economy (obeys the soul/craft split)

| Trigger | Soul (cross-device) | Craft (per-device) |
|---|---|---|
| New personal-best depth | Trainer XP `= 20·sectors + 12·(Reach bonus)` | — |
| Beat personal best time-at-depth | — | Crowns `= 3·sectors + 15·(Reaches cleared)` |
| First time lighting a camp | Saga event + sigil growth + cosmetic | Crowns chest |
| Clean thread (through inner 50% of a ring) | — | streak counter; ×5 streak = +Crowns ping |
| Golden ring (surprise, §7b) | — | +25 Crowns |
| Today's Ascent depth | — | Crowns ×2 in featured Reach |
| The Hundred (s100 cleared, ranked) | permanent Saga chapter + unique sigil crown | one-time large Crowns purse + board flag `clearedAll` |

Anti-farm rules carry over: rewards gate on *genuine improvement* (existing
`isCircuitRunBetter` logic), scout runs pay fractional, server-side Crowns stay
authoritative via `awardGauntlet` clamps.

### 7b. Surprise budget (the "reasonable use" law)

Surprises stay surprising only if they're rationed. Global budget: **at most
one surprise event per run**, rolled once at run start (seeded per run, not per
sector):

| Event | Odds | What happens |
|---|---|---|
| Golden ring | 1/8 runs | one ring in your path turns gold; threading it pays +25 Crowns and a chime |
| Keeper watch | 1/25 | the current Reach's canon Keeper stands on a platform, watching; threading the next 3 rings clean earns a one-line bark ("The Keeper of the Wastes nods.") → career-ledger event |
| Meteor shower | 1/40 | 20s of cosmetic shooting stars (reduced-motion: static constellation glow) |
| Rival line | 1/12 (only if board has a rival) | a faint colored altitude line shows the next player above you on the board; passing it flashes their handle |

Nothing in the surprise table affects difficulty; hazards never surprise.

---

## 8. Performance budget (POCO-class floor)

The design must hold 60fps (accept 45 floor) on a 2022 Android mid-ranger, at
`dpr 1`, no shadows, no postprocessing:

- **Two-sector window.** Only sectors `i` and `i+1` exist (meshes, hazards,
  motes). Build ahead during the Vista/long-gap beats; dispose behind. Target
  ≤ 80 draw calls, ≤ 150k tris in view.
- **Instancing everywhere.** Rings, platforms, hazards of a kind, motes, props:
  one `InstancedMesh` per archetype per sector. No per-item `<primitive>`
  clones (matches the `nature.tsx` convention).
- **Zero allocation in `useFrame`.** Pooled hazard states, scratch vectors,
  seeded layouts precomputed at sector build.
- **Deterministic generation, no stored levels.** `sectorDef(i)` = recipe ×
  role × seed → identical everywhere, ~zero bytes shipped, replayable. Only
  the signature-override table (§2) is authored data.
- **Sky shift = uniform lerps** (fog/bg/light colors), not scene swaps.
- **Materials:** flat/standard, palette-driven; canvas textures cached per
  Reach (globals rule); additive glows with `depthWrite: false`.
- **Render-loop law:** nothing above priority 0 (§1). The diag HUD gets a
  hidden debug flag instead of always-on once the POCO confirm lands.

---

## 9. The mirror — how the Climb and the Grounds stay one game

Two bodies, one soul, and now the bodies *reference each other*:

| Shared thing | In the 3D Grounds (desktop) | In the Climb (mobile) |
|---|---|---|
| Regions & skies | roamable worlds (`biomes.ts`) | the ten Reaches — *the same configs*, same palettes, same names |
| The champion | fights, wanders, wears its career | flies, wears the same body + sigil |
| Keepers (canon) | shrines, persuasion | Gate-Trial cameos + surprise watches |
| Camps | visible waystations floating in each region's sky (dressing + a lore plaque; later: a jump-off for the desktop 6-DOF Circuit) | Reach boundaries you light |
| Ascent sigil | on the body, in portraits | grows per Reach (§6) |
| Career ledger / Saga | every fight, imprint, trial | every camp lit, Keeper nod, the Hundred |
| Economy | Crowns/XP from bouts & training | Crowns/XP from depth & mastery (§7) |
| Leaderboards | ladder (ELO) | ascent board (depth-then-time), per-device craft split |
| Today | daily bout / Homecoming | Today's Ascent (same daily index) |

The desktop Circuit (6-DOF) eventually consumes the *same* `sectorDef(i)`
recipes rendered as full free-flight tracks — one level design, two bodies —
but that is explicitly **out of scope for this milestone** (it changes Handler
tuning). Design the generator so nothing about it is camera-specific.

---

## 10. Implementation plan (for the build sessions)

Phased so every phase ships playable and the current game never regresses:

- **P0 · Foundations** — extract `components/grounds/climb/` module:
  `difficulty.ts` (the §3 function), `sectors.ts` (recipe × role × seed +
  signature overrides; supersedes `circuit-tracks.ts` generation but keeps its
  exports/API), `themes.ts` (Reach → `BiomeConfig` + prop set + mote color).
  Wire sky-shift lerps. 100 sectors exist, zero hazards yet. *(Everything
  after this is content, not surgery.)*
- **P1 · Hazards & stumble** — collision helpers, pooled/instanced hazard
  archetypes (drift crystal, cinder arc, rotor, plume first), stumble state +
  grace, telegraph SFX via `duckAmbience`. Reaches I–V fully dressed.
- **P2 · Progress & economy** — camps + scout runs (store: `climbCamps`,
  persisted + saved server-side), first-light chests, sigil growth mapping,
  career-ledger events, reward table (§7) into `recordRun`, `/api/circuit`
  additive fields (`reach`, `campsLit`) — superset, no breaking change.
- **P3 · Reaches VI–X + modifiers + surprises** — daylight skins, wisps/
  crosswinds/shards, modifier assignment table, surprise roll + events,
  Today's Ascent (Today-tab card + Crowns ×2 window).
- **P4 · Polish & proof** — clean-thread streaks, near-miss flash (reduced-
  motion gated), Reach title cards, signature sectors s10/s25/s50/s75/s90/s100,
  per-Reach best-time board view, perf pass on real device (build, not dev),
  remove the diag HUD behind a debug flag.
- **P-feel · Corridor & runner heartbeat** — see [`climb-feel.md`](./climb-feel.md).
  Layout archetypes with real Y rhythm, mobile coplanar rings + green gates +
  Flappy camera, desktop auto-forward propulsion, flying companion. **Do this
  before more surprise content** — the base runner must be addictive first.

Per-phase acceptance: 60fps on the POCO in a `next build`, ranked loop
untouched (`one fall → sector 1`), tsc/lints clean, ledger updated.

### Open questions (decide during P0–P2, flagged honestly)

1. **Run length vs. board identity.** When most players die in Reach II–III,
   depth-then-time works; once regulars camp at Reach VI+, do weekly boards
   reset (seasonal freshness) or accumulate (grind prestige)? Leaning: weekly
   *seasonal* board + all-time "high-water" board, reusing the season plumbing.
2. **Stumble tuning.** −6 vy / 0.4s lockout is a guess; tune on device until a
   stumble feels like *your* fault ≥ 90% of the time.
3. **Scout-run abuse.** Fractional rewards may still be the optimal Crowns/min
   at high Reaches; cap scout Crowns per day (same daily-index ledger)?
4. **Camp visuals in the 3D world** — P2 ships plaques only; the full
   waystation dressing rides a later Grounds session.
