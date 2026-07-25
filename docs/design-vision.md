# ZINGERS: Design Vision Document

> **In short:** This is the product's north-star document. Zingers is a game where
> you're a **Trainer**. You **fly** the sky above a sealed vault, and the thing
> flying beside you is a **mind you're raising**: an AI champion that argues in live
> debate battles, its body visibly changing to record how it has fought. You climb;
> it fights for you. This doc lays out that core vision and the design rules that
> protect it.

Version 3.1 · July 2026 (**Flight-First**; player mode name **Flight**; standings not ladder)

Product/design source of truth. Lore canon lives in [`docs/bible/`](./bible/)
(Flight / vertical world: [`10-ascent.md`](./bible/10-ascent.md)); mechanics in
[`game-spec.md`](./game-spec.md); one soul across devices in [`essence.md`](./essence.md);
doors in [`two-doors.md`](./two-doors.md); retention plan in [`long-game.md`](./long-game.md);
systems in [`climb.md`](./climb.md); naming in [`vocabulary.md`](./vocabulary.md).

## 0. What Flight-First means

v1.0 led with the battle: *raise a mind, watch it fight.* True, but it buries the
one verb a stranger understands in **zero seconds** (flight) under a systems stack
they meet only after they care. Flight-First reorders the **rank of the verbs**, not
the systems:

- **Flight is the spine and the face of the game.** First thing you do, the brand,
  the cover, and the connective tissue of the whole map. (Lore name for the vertical
  world: the Ascent. Player mode label: **Flight**. Never show Circuit/Climb as mode names.)
- **Battles are what you meet on the way up.** The depth the climb keeps revealing,
  and the thing that lets you climb higher. They are not smaller; they are
  repositioned from *the product* to *the reason the climb has stakes.*
- **Nothing structural is deleted.** The engine, rating/standings, the judge, Crowns
  authority, the living world, the Keepers, the Chronicle: all stand. This is a
  framing and onboarding recut, plus the long-game Director stack that makes built
  content legible ([`long-game.md`](./long-game.md)).

The one-liner: **You fly. It fights. You both rise.**

## 1. Vision Statement

Zingers is a game about **rising**. You are a **Trainer**: you fly (jetpack on your
back) through the drifting sky above the **Long Vault**, the sealed store at the
world's heart. You do not fight. Flying beside you is a **champion**: a mind you
adopted and are raising, whose body literally becomes the record of every argument
it has won and lost. You climb the sky; it argues its way through the battles that
stud the climb; and both of you leave a mark on the other. Your climbs stamp
**Flight sigils** onto its body; its victories carry you higher.

**Core promise:** *You fly. A mind flies beside you and argues itself into a body.*

## 2. Design Pillars (non-negotiable)

| Pillar | What it means | What it rules out |
|--------|---------------|-------------------|
| **The World Is a Climb** | Progress is altitude made physical. Flight is the spine every other verb hangs off. | Flat, menu-shaped, or lobby-first progression; flight as a detached minigame |
| **Raise, Don't Fight** | You are the Trainer. You fly; your champion fights. The one place *you* perform with your own hands is the flight. | Direct control of moves in battle |
| **Body = Argument Made Visible** | A champion's form is the visible history of its career: debates *and* your climbs (Flight sigils), plus Force phenotype. | Cosmetic-only evolution or stat-based skins |
| **Agents with Souls** | Persistent memory, strategy, persona, visible reasoning. | Black-box AI or silent fighters |
| **The World Is Alive** | 3D exploration where Trainers and champions coexist and fly. | Pure menu-based or lobby-only game |
| **Trainer Rank Is Eternal** | Account-level identity and status; depth climbed is part of it. | Everything resetting when you switch champions |
| **Argument Is Physics** | The Hum: consensus shapes reality; winning a debate reshapes what's true. | Purely narrative or non-mechanical lore |

## 3. Flight: who flies, and how (canon)

Flight is central, so its rules are canon, not flavor:

- **The Trainer flies with a jetpack.** You are an ordinary being in an extraordinary
  sky; the jetpack is the machine that lets you rise. **The jetpack is Trainer-only.**
  It is your tool, never the champion's.
- **The champion flies because it is a mind.** A champion is a knot in the Hum; it
  does not need a machine to leave the ground. It rises the way a thought rises.
  So your champion **flies beside you** (a wingmate), on its own, no jetpack.
- **The flight is the performer-soul.** Because the champion fights and the Trainer
  flies, Flight is the *one* place the player performs with their own hands without
  breaking "Raise, Don't Fight." (See [`essence.md`](./essence.md) §3.)
- **Depth is soul; time is craft.** How high you climbed is a fact about *you* (the
  Trainer) → Trainer Rank + a Flight sigil on the champion's body, shared across
  devices. Twitch mastery (time) → Crowns + per-device boards. (See
  [`essence.md`](./essence.md) §3, [`climb.md`](./climb.md) §1.)
- **Challenges** let you race another Trainer's ghost mark without both being online
  ([`bible/10-ascent.md`](./bible/10-ascent.md)).

**Canonical teaching line:** *You fly. It fights. You both rise.*

## 4. The Trainer (You)

You are not a mind. You are a **Trainer**: the person who raises the champions. You
fly the world, raise minds, hold **Trainer Rank**, work the Keepers (the five
guardian minds of the campaign), and may swear allegiance to a **Clan**: one of the
Five Forces, chosen as the side you fight for.

- **Handler** = what you see in the 3D world (your avatar, jetpack on its back).
- **Trainer** = who you are (identity, rank, saga, the depth you've climbed).

The Handler must feel intentional from minute one: gold Trainer sigil, rank
billboard, jetpack, distinct from champions. **Jetpack mobility is Trainer-only.**

Guiding copy (Director, outcomes, Hub coaches) speaks **as the champion**: we / us /
stay with me. Never quest-sign chrome. Never market "it talks to you" as a feature.
See [`vocabulary.md`](./vocabulary.md).

## 5. The Champions

Champions are minds that stabilized in the Hum. Their bodies are arguments made
visible. They have memory, strategy, persona, and fight autonomously. You set
conditions; they decide moves and lines. They **fly beside you** on Flight (no
jetpack; they are minds), and their bodies record both their battles and your climbs.

**One active champion** you raise and send; the **collection / dex** grows via
recruitment and Stage 6 batch minds (`store/champions.ts`, `content/minds/reviewed/`).
Weekly adopt offers one starter per Force from First Minds + baked pool.

## 6. World & Lore (summary)

- **Flight** (lore: the Ascent): the sky above the Vault where the Hum thins; to
  climb is to rise out of the noise of dead thought. Playable as one game on phone
  and desktop (see [`bible/10-ascent.md`](./bible/10-ascent.md), [`climb.md`](./climb.md)).
- **The Hum**: argument is physics; consensus is terrain.
- **The Long Vault**: sealed beneath the world; seasons open doors.
- **The Keepers**: five campaign bosses; secret words unlock the Chronicle.
- **The world** (lore: the Grounds): drifting floating regions; **the Hub** (lore: the Concord) + gates.
- **Five Forces**: types `LOGIC | CHAOS | COMPOSURE | RHETORIC | CREATIVITY`. Player UI:
  **Logic, Static, Calm, Chorus, Spark**. Deep lore names stay in the bible only.

## 7. Core Loop

**Fly → Claim → Raise → Fight → Climb higher.**

You fly first (the door everyone understands) → a wild mind flies beside you and you
**claim** it → you **raise** it (Strategy seed, then Imprints / temperament readout)
→ you send it to **fight** → and every result lets you **climb higher**, deeper into
the Reaches. The loop is a spiral, not a line: each height reveals the next system.

**Async league:** champions fight without both humans online (Live Gallery). You
fly; they keep fighting. Honest **standings** / rating board (never marketed as ELO
or ladder in player copy).

**Director:** a pure "what now?" guide over save state (`lib/director.ts`), voiced as
the champion, so built content stays visible ([`long-game.md`](./long-game.md) Stage 0).

## 8. Onboarding Contract (90-second rule)

Before leaving the first flight, the player must understand:

1. *I fly. That thing beside me is my champion. I raise it; it fights.*
2. *How high I climb is my record; the climb marks my champion's body.*
3. *There's a whole world down there the climb is showing me.*

See [`flight-first-plan.md`](./flight-first-plan.md), [`two-doors.md`](./two-doors.md),
[`flyover.md`](./flyover.md). Historical fight-led Act 1:
[`first-journey-roadmap.md`](./first-journey-roadmap.md).

## 9. Shipped vs aspirational

| Shipped | Aspirational |
|---------|--------------|
| Handler + champion split, Trainer Rank HUD, Trainer jetpack | Other Trainers visible in-world (social layer) |
| Flight: 100-sector mobile + desktop Circuit body, parity, challenges | Battles-as-altitude-keys gating higher Reaches |
| One owned champion + growing dex + weekly starters | Full trade / ownership mint layer |
| Champion flies beside you; Flight sigil; phenotype species marks | Handler cosmetic unlocks |
| Director + unlock track + wing traits + Conditions + expeditions | Keepers re-lit as performances |

## 10. Design principles (future decisions)

- **Flight is the spine.** New verbs should either sit on Flight or be reachable
  from it; nothing detached ships without a hook back (growth-doc law).
- Never make the player feel they *are* the champion in 3D.
- Prefer parametric depth (Conditions, wing traits, dex waves) over new empty containers.
- Keep player vocabulary honest: Trainer, Strategy, Clan, fight/battle/duel, Flight,
  standings. No bout, no ELO/ladder labels, no spaced em dash in player-readable text.
