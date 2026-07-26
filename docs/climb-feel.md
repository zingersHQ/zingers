# Climb / Circuit feel pass — corridor grammar & runner heartbeat

> **In short:** Keep the shared 100-sector / Reach / hazard ruleset
> ([`climb.md`](./climb.md), [`circuit-world.md`](./circuit-world.md)), but
> rewrite **what a sector looks like to fly**, how **forward motion** reads as
> an infinite runner, and how the **champion accompanies** you. Mobile Climb
> becomes a **strict vertical-plane Flappy** (rings share one X; only Y/Z vary).
> Desktop Circuit keeps light steer, but borrows the same **auto-forward
> propulsion** so both bodies feel like one addictive runner — not “fly through
> a museum of rings.”

Status: **P-feel.0–1.2 largely shipped** (coplanar rings, archetypes, green
`cpNextRef`, Flappy cam, desktop auto-forward). **Next:** device-tune + hazard
Y-corridor (P-feel.4). Active roadmap: [`flight-first-plan.md`](./flight-first-plan.md).  
Companions: [`climb.md`](./climb.md) (amended by §1c here), [`circuit-world.md`](./circuit-world.md)
(amended by §4–5 here), [`essence.md`](./essence.md).

---

## 0. Honest diagnosis (why it feels empty)

| What the design promised | What players actually get |
|---|---|
| Saw-tooth difficulty via roles + hazards | Early Reaches: **hazardBudget = 0**, mild `vertStep`, uniform-ish gaps → a straight-ish ladder |
| Lateral weave as “readability spice” | Mobile **auto-centers X** toward next gate → visible rubber-banding; rings not coplanar |
| Challenge = altitude timing + hazards | Challenge is almost only “hold / release” through generous openings |
| Flappy silhouette (small bird, big corridor) | Champion **too big**, camera **too close** (`CHAMP_SCALE≈0.7`, `CAM_BACK≈10`) |
| Infinite-runner forward pressure | Mobile has auto-Z; desktop you **self-propel** → no “can’t stop” Flappy urgency |
| Champion marks the climb | Desktop: pedestal spectator; Climb: you *are* the champion (no “cute follow”) |

So this pass is not “redesign the Ascent again” — it’s **make the authored
difficulty *feel* true**, and fix body-specific UX that fights the fantasy.

---

## 1. Track grammar — stop the stupid ladder

### 1a. Shared law (both bodies)

A sector must always answer **three readable questions** at a glance:

1. **Where is the next opening?** (Y primary; Z spacing secondary)
2. **What will punish a late / early flap?** (gap rhythm, soft ceiling, hazard telegraph)
3. **What’s the beat of this role?** (arrival / rhythm / vista / gauntlet — not the same slope every time)

**Kill the default pattern** currently in `buildClimbSector`: alternating side
weave + almost-monotonic rise. Replace with authored **layout archetypes**
driven by role `k`, not free RNG zig-zag.

### 1b. Layout archetypes (deterministic templates)

| Role | Layout feel | Geometry rules |
|---|---|---|
| Arrival | “learn the corridor” | **4** wide rings, **rising staircase** with clear steps (Reach-flavored amp / rare dip later), no hazards |
| Teach / Combine | introduce hazard between rings | gaps mid-band; one hazard mid-gap |
| Rhythm | pure Flappy cadence | **equal gapSec**, alternating high/low Y (sine), no hazards |
| Pressure | bite | tighter gaps, smaller radius, hazard in *every other* gap |
| Vista | screenshot / breathe | 1 long scenic gap (≤5s), 2–3 wide rings, Crowns line or prop parade |
| Twist | modifier stage | Swift / Duskfall / etc. + layout that sells the modifier |
| Gauntlet / Trial | exam | mix of prior patterns + guarded finish (rotor / wisp) |

**Vertical must matter:** gate Y should swing by **at least ~1.2–2.0× gateRadius**
between consecutive rings on rhythm/pressure beats (today’s rise is often too
shallow to force a real flap).

**Spacing must breathe:** consecutive `gapSec` should **not** look uniform —
use role bands (rhythm = tight equal; vista = one long; pressure =
short–short–medium). Same seed → same layout forever.

### 1c. Mobile Climb — zero lateral offset (**new hard law**)

**Overrides [`climb.md`](./climb.md) §1 “lateral stays auto-threaded” weave:**

> On the mobile body, **all rings share the same X** (the flight plane `x = 0`).
> Distance (Z) and height (Y) may vary freely. Lateral weave is **desktop-only**
> (or retired entirely until 6-DOF needs it).

Consequences:

- Generator: `gate.x = 0` always on Climb tracks (decorative platforms centered /
  subtle under-ring).
- Flyer: **remove** `LATERAL_EASE` auto-centering toward next gate (the “weird
  correction”).
- Soft ceiling / auto-thread stay **vertical-only**.
- Hazards that needed lateral dodge (crosswind as X shove) become **Y-only** on
  mobile, or wait for a later pass.

This is the Flappy contract: **one axis of skill, a straight corridor in XZ, a
dancing corridor in Y.**

### 1d. Desktop Circuit — keep scale, share archetypes

Desktop keeps `desktop-adapter` scale (bigger gaps / openings for 6-DOF), but
**consumes the same archetype layouts**. Optional later: light lateral *choice*
(left/right lanes) as craft spice — **not** required for this pass. Prefer one
shared “soul layout” first so sector 23 means the same sky-line on both devices.

---

## 2. Mobile checkpoint feedback (green)

**Gap:** desktop rings use `cpNextRef` → pass = green + burst; Climb only passes
`highlightIndex` (pulse next gate) — **no pass-state**.

**Spec:**

- Thread `cpNextRef` (or equivalent) into `CircuitScene` from Climb, same as desktop.
- On plane-cross success: ring flips green + short bloom; HUD gate pips already
  advance via `targetIdx` — keep them in sync.
- Optional: same rising tick SFX as desktop (`jumpBeep`).

Cheap; ship with the camera pass.

---

## 3. Mobile camera & silhouette — Flappy read

Goal: first 2 seconds should read as **tiny flyer in a big sky corridor**, not
“close-up character showcase.”

| Knob | Direction (tune on device) |
|---|---|
| `CHAMP_SCALE` | ↓ (~0.45–0.55) |
| `CAM_BACK` | ↑ (~14–18) |
| `CAM_UP` / `CAM_LEAD` | more lead down-track so **2–3 rings** are always visible |
| FOV | slight bump if needed (don’t fisheye) |
| `CHAMP_Y` | re-center after scale so torso still hits ring centers |

Acceptance: frozen mid-flight screenshot — character occupies **≲ 12–15% of
frame height**; next ring and the one after are both readable.

---

## 4. Forward propulsion — the infinite-runner soul

### 4a. Law

> The Ascent **always pushes you forward** once a run starts. Altitude is the
> skill axis; forward is the heartbeat.

### 4b. Shared wind tunnel (both bodies)

- Soul scale: `FLIGHT_WIND_SCALE` (**1.75×**) multiplies **cruise and gap Z**
  together via `DESKTOP_GAP_SCALE`. `gapSec` stays real flap time — rings stay
  flappable; the corridor just rushes harder.
- Auto-forward / instant cruise from ignition (mobile frame 0; desktop Jump-to-start).
- Mobile hold adds a small forward boost (`HOLD_FWD_BOOST` ~6%); desktop W still
  surges around par.
- Presentation: `FlightWindStreaks` past the flyer, FOV ignition punch + thrust
  swell, stronger chase lead (all gated by reduced motion).

### 4c. Desktop Circuit (the big feel change)

Today: WASD + jetpack vertical — **you are the engine**.  
Target: **runner with optional steer**.

**Recommended control model A — Auto-forward + vertical + light steer:**

- On `running`, apply constant forward along track (+Z or toward next gate
  bearing) at sector **par pace**.
- Jump/hold = climb (existing thrust).
- A/D or strafe = limited lateral authority (or none if layouts stay `x = 0`).
- W = optional surge (Swift feel); S = brake + soft dive (clears high→low Surge beats).
- Fall / miss rules unchanged.

**Alternative B — Thrust-vector jetpack** (only if A feels too rail-y): hold
thrust = accelerate in look / stick direction. Harder to keep fair par times;
more “sim,” less Flappy.

**Start choreography (both):** veil up → 0.3s “pack ignites” → forward velocity
snaps on → first ring already in frame. No standing still on the pad after Go.

---

## 5. Champion follows you (cute accompaniment)

### 5a. Desktop Circuit

Replace (or demote) the **spectator pedestal** for running:

- During `running`: owned champion on a **soft leash** behind / beside the
  Handler (existing companion fly-in / wing-slot), jetpack-on, facing track.
- On stumble: brief lag / sag pose; on sector clear: celebrate bark; on fail:
  remount next attempt.
- Pedestal can remain for `ready` only (launch pose), then lift off with you.

Canon soften: earlier “Trainer flies, champion fights” → **champion rides the
climb as witness** — still not threading gates for you, just accompanying.

### 5b. Mobile Climb

Today the flyer **is** the owned champion. Decide before build:

| Option | Fantasy | Note |
|---|---|---|
| **Keep as-is** (recommended default) | You *are* the mind | “Follow” already satisfied; don’t duplicate meshes |
| **Trainer + trailing champion** | You pilot a small trainer/jet; champion flies beside | Cute; second mesh; must stay `useFrame` priority 0 |

Desktop = flying companion for sure. Mobile = keep champion-as-flyer unless
playtest still asks for a buddy.

---

## 6. Gamification / surprise — make the design *land*

Hazards, modifiers, Crown caches, Reach cards already exist in code/docs — they
don’t save a boring corridor. After layout + forward + camera:

1. **Reach I must teach the flap** with a real high/low rhythm (not a flat
   ladder), still hazard-free.
2. **Reach II+** must place hazards *in the flight line* so altitude choices
   matter (not scenery beside a straight tunnel).
3. **Vista / Swift / Silent Sky** must change *how the corridor feels* (gap,
   fog, speed), not only a HUD chip.
4. Keep **one surprise/run** budget (`climb.md` §7b) — don’t pile noise until
   the base runner is addictive.

---

## 7. Implementation order

Ship each slice playable alone:

1. **P-feel.0 — Mobile plane law** — `x = 0` gates; kill lateral ease; green
   `cpNextRef`; camera/scale Flappy pass.
2. **P-feel.1 — Layout archetypes** — rewrite `buildClimbSector` (+ desktop
   adapter inherits). Device-tune Reach I–II until “not stupid.”
3. **P-feel.2 — Desktop auto-forward runner** — control model A + launch ignition.
4. **P-feel.3 — Flying companion** — desktop leash; mobile decision.
5. **P-feel.4 — Hazard placement pass** — retarget hazards into the new
   Y-corridor; fairness check (stumble, not cheap death).

---

## 8. Acceptance (device, not automation)

**Mobile**

- Rings share one lateral line; no X rubber-band.
- Crossed rings turn green; pips advance.
- Character small; ≥2 rings visible ahead.
- Forward pressure from first hold; death loop 20–60s feels fair.

**Desktop**

- Same sector shapes (scaled), not a diagonal ladder.
- Auto-forward on run start; climbing is the skill, not “finding the gas.”
- Champion flies with you; hub Season/rival chrome stays hidden (already shipped).

**Both**

- Sector 1 Arrival ≠ Sector 9 Gauntlet by *shape*, not only sky tint.
- “Sector 23 is Swift” remains true on both boards.

---

## 9. Open questions (decide when building)

1. Desktop: auto-forward forever, or only after leaving the start pad?
2. Mobile: champion-as-flyer vs trainer + trailing buddy?
3. Retire `latAmp` entirely, or keep for desktop-only lane craft later?
4. How hard should Reach I bite on day one — tutorial soft, or Flappy-hard from gate 3?

---

## 10. Bottom line

The Ascent *systems* are there; the **corridor grammar and runner heartbeat**
aren’t. Core amendments this doc owns:

1. **Mobile rings coplanar (no lateral weave / no auto-X).**
2. **Role-based layouts with real Y rhythm** (kill the stupid ladder).
3. **Green gates on Climb.**
4. **Smaller flyer, farther camera.**
5. **Forced forward propulsion on both bodies.**
6. **Champion flies with you on desktop** (mobile TBD).
