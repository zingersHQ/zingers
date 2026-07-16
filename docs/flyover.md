# ZINGERS — The Flyover: how the flight teaches the whole game

> **In short:** If the Ascent (the Climb) is the game's spine and face
> (`design-vision.md` v3.0, `two-doors.md` v2.0), then the flight has one more job
> beyond being fun: it must be a **playable trailer for everything else.** This doc
> states the **Flyover Law** (every desktop system gets previewed, diegetically,
> from the air), and specs the two bridges that turn the flight from a mode into
> connective tissue — **Camps as doors** (flying ⇄ roaming) and **battles as
> altitude keys** (raising ⇄ climbing). It is the concrete plan for the "organic,
> frictionless expansion from the mobile flight to the full desktop game."

Version 1.0 — July 2026. Design draft — new mechanics flagged for a build pass.
Companions: [`design-vision.md`](./design-vision.md) (north star, v3.0),
[`essence.md`](./essence.md) (one soul, native bodies), [`two-doors.md`](./two-doors.md)
(the Ascent is the game), [`climb.md`](./climb.md) (the 100-sector systems),
[`docs/bible/10-ascent.md`](./bible/10-ascent.md) (the canon). Copy follows
[`vocabulary.md`](./vocabulary.md); identifiers/keys never change for copy reasons.

---

## 0. Why this doc exists

The Climb already works as a bus-time flight. The risk of promoting it to "the
game" is that a player masters the flight and never discovers there's a world,
a champion to raise, battles to watch, a ladder to climb, a campaign to crack.
The old framing solved this by calling the Climb a "lobby you pass through." v3.0
rejects that: the Climb is not a corridor to the game, it **is** the game — so the
rest of the game has to be **reachable from inside the flight**, and ideally
**visible from inside the flight before you ever leave it.**

Two mechanisms do this:

1. **The Flyover Law** (§1) — you *see* every other system while flying, in-fiction.
2. **The two bridges** (§2–3) — you can *act* on what you saw: land where you flew
   (Camps as doors), and the battles you flew over gate how high you can go
   (battles as altitude keys).

The result is the expansion path the product wants: a phone player flying the
Reaches is continuously shown the whole game, and every preview has a real landing
spot the moment they want it.

---

## 1. The Flyover Law

> **Law:** every desktop system that isn't the flight must have a **diegetic
> preview visible from the air**, placed on the climb, using assets that already
> exist. The flight is a guided tour of the game that happens to be a skill game.

This is not new content — it's *placement*. The Climb already renders the real
world (the "mirror law", `climb.md` §1.5: Reaches use the same biome configs,
region names, palettes, Keepers as the 3D Grounds). The Flyover Law says: use that
mirror deliberately, so each Reach advertises one thing the player can't yet do.

| Desktop system | Its flyover preview (what you see while flying) | Existing hook |
|---|---|---|
| **The regions / the Grounds** | Each Reach wears its region's skin; you are literally flying over the Ember Wastes, the Void Garden, etc. — you learn the map by climbing over it. | mirror law (`climb.md` §1.5), `biomes.ts` |
| **Watching battles** | Signature sector s50 crosses the Amphitheatre's open roof **over a live crowd**; you fly over a fight in progress. | `climb.md` §2 (s50 signature) |
| **The Keepers / campaign** | "Keeper watch" surprise: the current Reach's canon Keeper stands on a platform watching; a clean pass earns a bark → ledger event. | `climb.md` §7b (surprise table) |
| **The ranked ladder** | "Rival line" surprise: a faint altitude line marks the next player above you on the board; passing it flashes their handle. Rank *is* altitude, made literal. | `climb.md` §7b |
| **Raising / the champion** | Your champion flies beside you the whole time; the ascent sigil on its body grows as you climb — you watch raising happen on its skin. | `essence.md` §3, `climb.md` §6 |
| **The Towers** | A region's Tower silhouette rises past you as you climb over that region; higher Reaches clear its peak. | `docs/bible/05-regions.md` (Peak goal, flight-gated) |
| **The Vault / seasons** | The topmost Reach (The Hum) is the closest anyone gets to the Vault's silence; the season's featured Reach glows (Today's Ascent). | `climb.md` §6 (Today's Ascent) |

### The law as a build rule (like the essence atoms)

- **Before adding a new desktop system, ask: what's its flyover?** If a player
  flying the Reaches would never even *see* that the system exists, it's an
  undiscoverable island — give it a preview on the climb or accept it's a
  desktop-only depth the flight can't sell.
- **Previews are ambient, never modal.** A flyover preview may *never* interrupt a
  run (no popups, no "did you know?" — that breaks the one-more-try soul). It is
  set dressing, a bark, a silhouette, a glowing line. Curiosity, not instruction.
- **Every preview has a landing spot.** Anything you preview must be reachable —
  via a Camp (§2), a tab, or a venue — or it's a tease with no payoff.

---

## 2. Bridge one — Camps as doors (flying ⇄ roaming)

Camps are the waystations between Reaches (canon: `bible/10-ascent.md`; systems:
`climb.md` §6 "camps"). Today they're checkpoints + first-light rewards. This
promotes them to the **hinge between the two ways of being in the world.**

- **A Camp is a two-way door.** From a lit Camp you can **drop into the region it
  floats over** (stop climbing, land, and the region — its plaza, arena, Keeper's
  spire, the Broker — is *there*, walkable), and from a region you can **launch
  from its Camp back into the climb** at that Reach.
- **This is the mobile→desktop expansion, made physical.** A phone player who has
  lit Camp IV has *earned* a landing in the Ember Wastes. When they open the game
  on a desktop, the natural next move isn't "learn a new game" — it's "land at the
  Camp I already reached and walk the world I've been flying over." The flight is
  the on-ramp; the Camp is the offramp; the world is the destination.
- **Soul discipline.** Landing at a Camp is **roaming's door**, not a ranked
  shortcut — ranked runs still start at sector 1 (`climb.md` §1, §6). Camps persist
  (campaign layer); ranked stays honest (roguelike layer). No conflict.
- **Cross-device honesty.** Which Camps are lit is *soul* (a fact about your
  Trainer) → cross-device. So the offramp is available wherever you play; the phone
  lights it, the desktop walks through it.

### Build notes (deferred, flagged)

- Mobile ships Camps as checkpoints + first-light today (`climb.md` P2). The
  **"drop into the region"** action is a desktop-first affordance (it needs the
  walkable Grounds); on mobile the Camp can surface a "Land here on desktop" nudge
  or route to the leaner mobile presence surface (`essence.md` §5.2 open question).
- Desktop: a Camp becomes a spawn/launch node in `components/grounds/*`; reuses the
  Circuit venue's enter/exit and `TravelVeil`. **New affordance, not new engine.**

---

## 3. Bridge two — Battles as altitude keys (raising ⇄ climbing)

This is the one genuinely **new mechanic** in the recut, and the one that makes the
inversion true instead of cosmetic: it makes battles *serve the climb.*

- **The idea:** some higher Reaches / Camps are **gated behind champion progress.**
  A Gate Trial (`climb.md` §2, k10 boss-sectors) at a Reach boundary can require,
  e.g., your champion to have reached a tier, won a Force matchup, or earned a
  Keeper's nod. You hit a ceiling in the sky that says, in effect: *your wingmate
  isn't strong enough to fly this high yet.*
- **Why it's the keystone:** it closes the loop `Fly → Claim → Raise → Fight →
  Climb higher` (`design-vision.md` §7) into an actual spiral. Raising stops being
  a parallel activity a flight-first player might skip; it becomes **the way you
  break your altitude ceiling.** The climb creates the demand; battles supply it;
  the reward is more climb.
- **Fairness / soul guardrails:**
  - The **ranked depth board** must stay purely a flight skill record where it
    already is — so altitude keys gate *campaign progress / new Reaches unlocked*,
    **not** the ranked run's start (which is always sector 1). Keep the two loops
    separate exactly as `climb.md` §6 does.
  - Gates telegraph the *why* and the *how* ("Cleared by an Adept champion" — a
    clear, honest requirement), never a random wall.
  - Never a paywall: the requirement is always earnable by playing the battles the
    game already has (duels, gauntlet, tribunal, Keepers).
- **Scope honesty:** this is **aspirational** in `design-vision.md` §9 ("battles-
  as-altitude-keys gating higher Reaches"). It needs a small standalone design pass
  (which requirements, which Reaches, how it reads in the HUD) before build — it
  touches progression math and must not regress the ranked loop.

### Open questions (decide in the battles-as-keys design pass)

1. **Gate at Camps or at Gate-Trial sectors?** Camps (coarse, campaign-level) are
   probably right — gating individual sectors risks poisoning the ranked flow.
2. **Which requirement types feel fair?** Tier is legible; a specific Force win is
   thematic but can stall an unlucky player. Lean tier-based with thematic flavor.
3. **What does a flight-only player see at the ceiling?** It must read as an
   invitation ("raise your champion to climb higher"), routing to the raise/fight
   surfaces — never as a punishment for not caring about battles yet.

---

## 4. How the whole expansion reads (the player's path)

1. **Phone, cold open:** poster → **Fly**. One thumb. A mind flies beside you.
   (Shipped: `two-doors.md` §3, `mobile-splash.tsx`, guest Climb.)
2. **Minutes in:** you've flown over the Ember Wastes, seen a fight below the
   Amphitheatre roof, watched your wingmate's sigil grow. You claimed the mind.
   (Flyover Law, §1 — mostly shipped as surprises/signatures.)
3. **You hit a ceiling:** a Gate Trial wants a stronger champion. You tap into the
   battles the flyover already showed you. (Battles as keys, §3 — new.)
4. **You lit a Camp:** now there's a "land here" door. On a bigger screen, you take
   it — and you're roaming the world you've been flying over, arena and Keeper right
   there. (Camps as doors, §2 — desktop affordance.)
5. **Desktop:** the same climb in full flight, the same champion, the same lit
   Camps, plus the whole living Grounds. Not a new game — **more of the one you
   already know.** (`essence.md`: one soul, native bodies.)

Every arrow above is either shipped, a copy/placement change, or one flagged new
mechanic (§3). None of it is a rebuild — which is the whole point of a surgical
recut.

---

## 5. What this doc does NOT change

- The ranked Climb loop (one fall → sector 1), the depth-then-time board, the
  soul/craft split — untouched (`climb.md` §1, §6; `essence.md` §3).
- The battle engine, ELO, judge bounds, Crowns authority, SSE semantics, `bout`
  keys — untouched (`AGENTS.md`, `AGENCY.md` guardrails). Battles-as-keys reads
  *existing* progression; it doesn't alter how a battle resolves.
- Identifiers, routes, analytics keys — stable. This is placement + one new
  progression gate, expressed in copy and config, not renames.
