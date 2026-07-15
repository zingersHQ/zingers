# The Circuit in the 3D world — the desktop body of the Ascent (design draft)

> **In short:** The desktop Circuit stops being a side-venue with its own tiny
> ruleset and becomes the **second body of the Hundred-Sector Ascent**
> ([`climb.md`](./climb.md)): same 100 sectors, same Reaches, same difficulty
> function, same hazards/modifiers/rewards — reinterpreted for 6-DOF flight.
> Entry becomes **monumental portals you walk through** (not a small door),
> you **emerge from a matching return portal facing the track**, the compass
> gets **center-weighted, bigger icons**, and the champion companion **flies
> with you on the run** (pedestal only at ready — see
> [`climb-feel.md`](./climb-feel.md) §5; wilds platform-standing remains §5a).

Status: **partially shipped (D0–D2 core + board split); feel pass next.**
Companions: [`climb.md`](./climb.md) (the shared ruleset; this doc is its §9
"desktop body" made concrete), [`climb-feel.md`](./climb-feel.md) (**next:
auto-forward runner, layout archetypes, flying companion**), [`essence.md`](./essence.md)
(one soul, native bodies). Current-code facts referenced below were verified against
`grounds-screen.tsx`, `world.tsx`, `venues.ts`, `venue-portals.tsx`,
`concord.tsx`, `compass.tsx`, `climb/desktop-adapter.ts` in July 2026.

---

## 1. The rule: one ruleset, two bodies

`climb.md` already defines the content: 100 sectors, ten Reaches, the 10-beat
role bar, `sectorDifficulty(i)`, hazards with the stumble rule, modifiers, the
golden ring, soul/craft rewards. **None of that is redesigned here.** The
desktop Circuit *consumes the same `components/grounds/climb/` modules* and
reinterprets only what the body demands:

| Shared (identical, from `climb/*`) | Reinterpreted for desktop (this doc) |
|---|---|
| sector count, Reach themes + skins, sector names | world scale ×
| `sectorDifficulty(i)` (speed→pace, radius, gates, gaps, budget) | how "speed" applies — **amended:** auto-forward at par pace ([`climb-feel.md`](./climb-feel.md) §4); steer is optional |
| hazard archetypes + `hazardState(h,t)` pure-time motion | collision vs the Handler capsule, stumble effect |
| modifiers (Swift/Duskfall/Golden Hour/Silent Sky) | Swift = time-pressure instead of forced speed |
| golden ring odds/payout | identical |
| rewards: depth→XP+sigil (shared), time→Crowns | **separate desktop leaderboard** (essence §3) |
| Reach title cards, sky-shift lerp | drives the venue biome instead of a fixed skin |

**The mirror stays honest both ways:** a Trainer who knows sector 23 is Swift
on the phone finds the same sector Swift on desktop; the layouts come from the
same seeds. Depth is one shared identity record; the *time* boards stay split
per device family because a one-thumb time and a 6-DOF time can't share a
column.

### Body adaptations (the honest differences)

1. **Scale.** 6-DOF flight covers ground faster and reads bigger spaces. The
   desktop track builder multiplies the generated geometry: gap distances ×1.6,
   gate radius ×1.15, vertical steps ×1.3 (constants in one place:
   `climb/desktop-adapter.ts`). Seconds-of-flight stay the honest unit — the
   Handler's jetpack cruise (~14 u/s horizontal) replaces the mobile forward
   constant in the `dz = speed × gap` conversion.
2. **Speed is yours.** Mobile auto-scrolls; desktop you fly. So `speed` becomes
   **par pace**: each sector gets a par time (`Σ gaps + 15%`); beating par is
   what the craft rewards read. **Swift** sectors shrink par by ÷1.22 instead
   of forcing your velocity — same pressure, native expression.
3. **Hazards under free flight.** Same archetypes, same `hazardState(h,t)`
   motion, same telegraphs. Collision tests against the Handler capsule
   (sphere approx r≈0.6). A hit = the same **stumble**: kill upward velocity,
   shove `vy −6`, lock thrust 0.4s, 1.6s grace. With 6 DOF you can also dodge
   *sideways*, so upper-Reach budgets lean on the rotor + wisp (which guard the
   line you *must* cross) rather than corridor-crossers.
4. **One fall = sector 1** — unchanged, ranked runs only. Desktop gets the same
   camp/scout split when `climb.md` P2 lands (see §3: region portals *are* the
   camps).
5. **Physics stays Rapier** on desktop (`staticMode=false`) — platforms remain
   real colliders because the Handler walks on them between flights. Hazards
   are still pure-math checks (no hazard rigidbodies).

---

## 2. Arrival choreography — portals, not doors

Today the Circuit entrance is a ~3u "GAME" doorway (`ConcordVenuePortal`) or a
tunnel mouth (`CircuitTunnelPortal`), and inside the venue you spawn near an
exit ring with no sense of having *gone somewhere*. The new rule:

> **Travel is always a portal you physically pass through, and you always
> emerge from a matching portal on the other side.**

### 2a. The Ascent Portal (entry, one per world)

A monumental arch — **Vaultgate-scale ×2** (~7u wide × 10u tall; the Vaultgate
in `concord.tsx` is 3.2×4.6) — so it reads as a *destination* across the plaza,
not a booth:

- **Form per world:** reuse each world's architectural language (the
  `CircuitTunnelPortal` themes already started this): Concord = twin gate-ring
  pylons + gold lintel; Colosseum = obsidian arch; Ember = basalt fissure;
  Void = crystal split. The **portal plane** is the shared identity: an
  additive, slowly-swirling disc in the destination Reach's accent color, with
  the drift-mote speckle rising through it (the Climb's signature texture).
- **Above the arch:** the Reach roman numeral + name of where it opens
  ("REACH I · THE LAUNCH"), in the same type as the mobile title card.
- **Trigger = walking through the plane** (no E prompt): crossing the portal
  plane's z-face inside the arch fires `playTravel` with an upgraded travel
  card (kicker "THE ASCENT", the Reach name + tagline). Walk-through beats
  button-press for the fantasy; the existing veil (380ms cover / 560ms reveal)
  already covers the swap.
- Keep a proximity glow + label at ~8u so the compass/HUD can still point at it.

### 2b. The Return Portal (inside the Circuit — you arrive *from* it)

Place the same arch **behind the spawn pad** (where the bare exit ring sits
today at `z = −9`), facing the track:

- **On entry you emerge from this portal**: spawn at `[0, 1.1, −2.5]` as today,
  but the choreography sells it — the veil reveals with the camera already
  behind the player, portal at your back, track ahead; the portal plane ripples
  once (a scale pulse + brightness spike, reduced-motion gated). You walked in
  somewhere; you came out somewhere.
- **Walking back through it exits** (replaces the auto-exit ring; keep the
  auto-trigger behavior, now visually justified — you're stepping back through
  the door you came from). Its label: "THE CONCORD" or the host world's name,
  with that world's accent on the plane — the portal *shows where it goes*.
- The mobile Climb needs no equivalent (tab navigation is its body).

### 2c. Region portals = the camps (ties into climb.md §6)

Entering from the Concord's grand portal = **the ranked ascent, sector 1**.
The region tunnel portals (`REGION_CIRCUIT_SPOT`: the Ascent Tunnel, Ember
Chute, Void Sleeve) are re-purposed as **camp doors**: each region's portal
opens a **scout run at that region's Reach** (Colosseum → Reach II/VII, Void →
III/VIII, Ember → IV/IX) once the Trainer has lit that camp (mobile or
desktop — camps are soul, shared). Un-lit camp = the portal plane is dark with
a "light this camp by climbing to sector N" line. This makes `climb.md`'s
"camps visible in the 3D world" literal: **the camp waystations ARE the region
portals.**

---

## 3. Spawn orientation — face the track (quick fix, do first)

The complaint (spawns looking at the exit) is a code-path bug, not data: spawn
is `z=−2.5`, track is +Z, exit is −Z behind. In `world.tsx` (~line 2516) the
circuit branch sets `heading.current = 0` and `camCue.heading = 0` but — unlike
the wild-spawn branch — **never sets `inner.current.rotation` (the visible body)
nor `handlerHeading.current`**, and `camCue` boots at `heading: Math.PI` with a
race against the venue teleport (`travelRef` is called with position only, no
`faceHeading` arg). The fix bundle:

1. In the circuit spawn effect, mirror the wild branch: set
   `inner.current.rotation.set(0, 0, 0)` and `handlerHeading.current = 0`.
2. Pass `faceHeading = 0` through the `travelRef.current?.(x, z)` calls in
   `enterVenue`/sector resets (`grounds-screen.tsx` ~407, ~448) — the third arg
   already exists.
3. Initial venue camera: `spawnCam` currently parks at `z −12` *in front of*
   spawn looking back. Move it behind-and-above looking +Z down the track
   (`[x, y+4, z−9]`, lookAt gate 1), and make the `circuitFrontLock` hold that
   framing during `ready` so the first thing you read is the first ring, not
   your own face.
4. On `ready`, aim the champion **and** camera at checkpoint 1's actual bearing
   (it's always ~+Z, but compute it so authored sectors stay free to bend).

Acceptance: enter the Circuit → you and the camera both look down-track; the
Return Portal is at your back; pressing forward flies you at gate 1.

---

## 4. Compass — bigger, center-weighted

Current (`compass.tsx`): badges 24px (goals) / 20px (places) on desktop, icons
13/11px, and scale *shrinks from center outward* only mildly
(`scale = 1 − |o|·0.2`, so 1.0 center → 0.8 edge). Too small overall, and the
thing you're walking toward doesn't pop. New spec:

- **Base sizes up:** desktop badge 32px goal / 26px place (icons 18/14px);
  mobile 26/20 (icons 15/12). Bar height 72 → 84 desktop, 60 → 68 mobile
  (update `compassReserve` in `grounds-screen.tsx` to match).
- **Center-weighted scale** (the highlight you asked for): replace the linear
  taper with a cosine bump —
  `scale = 0.78 + 0.47 · cos(o · π/2)` → **1.25× at dead-center, 0.78× at the
  edges**. The marker you're heading toward visibly *grows* as it sweeps to the
  reticle.
- **Center emphasis extras** at `|o| < 0.12`: full opacity, accent ring around
  the badge, and the distance label bumps one font size. (All CSS transforms on
  the existing markers — no new layout.)
- Keep the drum tilt (`rotateY(o·−34°)`) — it composes fine with the scale.
- Everything stays `pointer-events: none`; done-markers keep the 0.45 fade.

---

## 5. The champion beside you — platforms and the pedestal

Two related asks, one principle: **the champion shares your ground.**

### 5a. Companion platform-standing (the wilds/hub)

`OwnedCompanion` (world.tsx ~692) follows at a wing slot but resolves its Y
from terrain only — if you jump/fly onto a platform or plaza structure, the
champion stays below, breaking the "beside you" fiction. Design:

- Add a **standable-surface resolver**: `standY(x, z)` = max of
  `terrainHeight(x,z)` and any platform top whose XZ footprint contains the
  point (the world already knows its platforms/plaza slabs; expose a small
  registry from the scene assembly — a static array per world, no raycasts).
- The companion's dock slot uses `standY`; if the wing-slot point is standable
  at (or within +0.5u of) the *player's* Y, it stands there. If the player is
  on a small platform with no room, the companion picks the **nearest
  standable point within 4u** (precomputed ring probe, 8 samples) — it hops up
  next to you rather than pacing below.
- Vertical moves reuse the existing jetpack fly-in animation (it already knows
  how to fly to a point) with `companionDrive`; exponential-damped Y, never
  teleporting. Reduced-motion: fade-hop.

### 5b. The spectator pedestal → flying witness (amended)

> **Amended by [`climb-feel.md`](./climb-feel.md) §5:** the pedestal remains for
> `ready` (launch pose), but during `running` the champion **flies on a soft
> leash** beside/behind the Handler — cute accompaniment, not a static statue.
> Original pedestal-only text below is historical context.

Today the companion is **excluded** from the Circuit (`!inCircuit` gate). Flip
that into a feature instead of an absence: at every sector's start, a
**champion pedestal** stands beside the launch pad (a 1.6u round column in the
Reach's platform palette, matching the mobile ReadyPose vibe):

- On venue entry the champion flies in and lands on the pedestal (existing
  fly-in path), idles facing the track — **your champion watches your climb.**
- On sector clear it plays the celebrate bark/pose (existing `companionFrame`
  moods); on a fall, the sag pose. Then it re-appears on the next sector's
  pedestal with the fly-in (sector remount already re-keys the world, so this
  is the natural mount point).
- It never flies the course *for* you (canon: the Trainer flies, the champion
  fights) — but it **rides with you** as witness during the run (feel-pass
  amend). The ascent sigil halo can render above it on ready / beside it in flight.

---

## 6. Implementation plan (later sessions)

Ordered so each lands shippable; D1 is the quick-feel win, D2 is the big one.

- **D0 · Spawn + compass fixes** *(quick)* — §3 orientation bundle; §4 compass
  sizes + center-weighted scale. No new systems. Ship same day.
- **D1 · Portals** — the Ascent Portal component (arch shell per world theme +
  shared swirl plane + Reach signage), walk-through trigger replacing the E
  prompt, the Return Portal replacing the bare exit ring, emerge choreography
  (camera behind, plane ripple). Region tunnels get the portal dressing but
  keep today's behavior until D3.
- **D2 · The shared ascent** — `climb/desktop-adapter.ts` (scale constants +
  par-pace), desktop consumes `CLIMB_SECTORS` + `reachTheme` + hazards +
  modifiers through it; `CircuitScene` grows a `hazards` pass with Rapier-free
  pure-math hits on the Handler; stumble wired into the Handler's thrust lock;
  sky-shift lerp drives the venue biome; per-device time boards split
  (`/api/circuit` gains a `body: "thumb" | "flight"` field — additive).
  Desktop HUD adopts sector n/100 + Reach cards.
- **D3 · Camps as region portals** — needs `climb.md` P2 (camps in the store);
  region portals become camp doors (scout runs at their Reach), un-lit = dark
  plane + hint line.
- **D4 · Companion** — §5a standable-surface resolver in the wilds; §5b
  spectator pedestal at `ready`, then **flying leash during `running`**
  ([`climb-feel.md`](./climb-feel.md) §5 — amends the original pedestal-only
  witness). Pedestal alone is no longer enough.
- **D-feel · Corridor & runner** — shared with Climb: layout archetypes,
  auto-forward propulsion, Flappy-honest mobile plane law. Full plan in
  [`climb-feel.md`](./climb-feel.md) §§1,4,7. **Do before more content.**

### Open questions (decide during D2 / D-feel)

1. **Full-run length on desktop.** 100 scaled sectors at 6-DOF pace ≈ 60–90
   min aspirational full clear. Fine for the fantasy (nobody clears week one),
   but confirm sector times stay 40–90s so the death loop bites.
2. **The 10-sector legacy boards.** Existing `/api/circuit` rows are 10-scale;
   when desktop goes 100-scale, either archive the old board as "Season 0" or
   normalize old rows as sectors×10 with a flag. Leaning: archive — honest.
3. **Rapier hazards?** No — keep hazards pure math on both bodies. Revisit only
   if a future hazard must push the Handler physically.
4. **Portal walk-through vs E** in the Concord's crowded plaza: walk-through
   needs a generous but not accidental trigger (plane crossing *inside* the
   arch footprint only, ~1.2u depth). Watch for accidental entries during
   plaza roaming; fall back to E-inside-the-arch if it misfires in playtest.
