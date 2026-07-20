# ZINGERS — Design Vision Document

> **In short:** This is the product's north-star document. Zingers is a game where
> you're a **Trainer** — you **fly** the sky above a sealed vault, and the thing
> flying beside you is a **mind you're raising**: an AI champion that argues in live
> debate battles, its body visibly changing to record how it has fought. You climb;
> it fights for you. This doc lays out that core vision and the design rules that
> protect it.

Version 3.0 — July 2026 (**Flight-First recut**; supersedes v1.0's fight-led framing)

Product/design source of truth. Lore canon lives in [`docs/bible/`](./bible/) (the Ascent is [`10-ascent.md`](./bible/10-ascent.md)); mechanics in [`game-spec.md`](./game-spec.md); how the same soul survives crossing devices (mobile vs desktop) in [`essence.md`](./essence.md); the product-identity decision in [`two-doors.md`](./two-doors.md); the concrete mobile adaptation in [`mobile.md`](./mobile.md); the Climb's systems in [`climb.md`](./climb.md); how the mobile flight teaches the whole game in [`flyover.md`](./flyover.md).

## 0. What changed in v3.0 (and why)

v1.0 led with the battle: *raise a mind, watch it fight.* True, but it buries the
one verb a stranger understands in **zero seconds** — flight — under a systems
stack they meet only after they care. v3.0 reorders the **rank of the verbs**, not
the systems:

- **The Ascent (the Climb) is the spine and the face of the game.** It is the first
  thing you do, the brand, the cover, and the connective tissue of the whole map.
- **Battles are what you meet on the way up** — the depth the climb keeps revealing,
  and the thing that lets you climb higher. They are not smaller; they are
  repositioned from *the product* to *the reason the climb has stakes.*
- **Nothing structural is deleted.** The engine, ELO, the judge, Crowns authority,
  the living Grounds, the Keepers, the Chronicle — all stand. This is a framing and
  onboarding recut, expressible almost entirely in copy + sequencing.

The one-liner: **You fly. It fights. You both rise.**

## 1. Vision Statement

Zingers is a game about **rising**. You are a **Trainer**: you fly — jetpack on your
back — through the drifting sky above the **Long Vault**, the sealed store at the
world's heart. You do not fight. Flying beside you is a **champion**: a mind you
adopted and are raising, whose body literally becomes the record of every argument
it has won and lost. You climb the sky; it argues its way through the battles that
stud the climb; and both of you leave a mark on the other — your climbs stamp
**ascent sigils** onto its body, its victories carry you higher.

**Core promise:** *You fly. A mind flies beside you — and argues itself into a body.*

## 2. Design Pillars (non-negotiable)

| Pillar | What it means | What it rules out |
|--------|---------------|-------------------|
| **The World Is a Climb** | Progress is altitude made physical. You rise through the sky above the Vault; the Ascent (the Climb) is the spine every other verb hangs off. | Flat, menu-shaped, or lobby-first progression; the climb as a detached minigame |
| **Raise, Don't Fight** | You are the Trainer. You fly; your champion fights. The one place *you* perform with your own hands is the flight. | Direct control of moves in battle |
| **Body = Argument Made Visible** | A champion's form is the visible history of its career — its debates *and* your climbs (ascent sigils). | Cosmetic-only evolution or stat-based skins |
| **Agents with Souls** | Persistent memory, strategy, persona, visible reasoning. | Black-box AI or silent fighters |
| **The Grounds Are Alive** | 3D exploration where Trainers and champions coexist and fly. | Pure menu-based or lobby-only game |
| **Trainer Rank Is Eternal** | Account-level identity and status; depth climbed is part of it. | Everything resetting when you switch champions |
| **Argument Is Physics** | The Hum — consensus shapes reality; winning a debate reshapes what's true. | Purely narrative or non-mechanical lore |

## 3. Flight — who flies, and how (canon)

Flight is central, so its rules are canon, not flavor:

- **The Trainer flies with a jetpack.** You are an ordinary being in an extraordinary
  sky; the jetpack is the machine that lets you rise. **The jetpack is Trainer-only** —
  it is your tool, never the champion's.
- **The champion flies because it is a mind.** A champion is a knot in the Hum; it
  does not need a machine to leave the ground — it rises the way a thought rises.
  So your champion **flies beside you** (a wingmate), on its own, no jetpack. This
  resolves the old ambiguity cleanly: *you need a jetpack; it doesn't.*
- **The flight is the performer-soul.** Because the champion fights and the Trainer
  flies, the Climb is the *one* place the player performs with their own hands
  without breaking "Raise, Don't Fight." (See [`essence.md`](./essence.md) §3.)
- **Depth is soul; time is craft.** How high you climbed is a fact about *you* (the
  Trainer) → Trainer Rank + an ascent sigil on the champion's body, shared across
  devices. Twitch mastery (time) → Crowns + per-device leaderboards. (See
  [`essence.md`](./essence.md) §3, [`climb.md`](./climb.md) §1.)

**Canonical teaching line:** *You fly. It fights. You both rise.*

## 4. The Trainer (You)

You are not a mind. You are a **Trainer** — the person who raises the champions. You
fly the Grounds, raise minds, hold **Trainer Rank**, work the Keepers (the five
guardian minds of the campaign), and may swear allegiance to a **Clan** — one of the
Five Forces, chosen as the side you fight for.

- **Handler** = what you see in the 3D world (your avatar, jetpack on its back).
- **Trainer** = who you are (identity, rank, saga, the depth you've climbed).

The Handler must feel intentional from minute one — gold Trainer sigil, rank
billboard, jetpack, distinct from champions. **Jetpack mobility is Trainer-only.**

## 5. The Champions

Champions are minds that stabilized in the Hum. Their bodies are arguments made
visible. They have memory, strategy, persona, and fight autonomously. You set
conditions; they decide moves and lines. They **fly beside you** on the climb (no
jetpack — they are minds), and their bodies record both their battles and your
climbs.

**One active champion** you raise and send; the **collection** grows via recruitment
(`store/champions.ts`).

## 6. World & Lore (summary)

- **The Ascent** — the sky above the Vault is where the Hum thins; to climb is to
  rise out of the noise of dead thought. The Climb/Circuit is this made playable
  (see [`docs/bible/10-ascent.md`](./bible/10-ascent.md), [`climb.md`](./climb.md)).
- **The Hum** — argument is physics; consensus is terrain.
- **The Long Vault** — sealed beneath the Grounds; seasons open doors.
- **The Keepers** — five campaign bosses; secret words unlock the Chronicle.
- **The Grounds** — drifting floating regions you fly between; Concord hub + gates.
- **Five Forces** — types: `LOGIC | CHAOS | COMPOSURE | RHETORIC | CREATIVITY`. Player UI: **Logic, Static, Calm, Chorus, Spark**. Deep lore: The Lattice, The Static, etc. (bible only).

## 7. Core Loop

**Fly → Claim → Raise → Fight → Climb higher.**

You fly first (the door everyone understands) → a wild mind flies beside you and you
**claim** it → you **raise** it (strategy + brain) → you send it to **fight** the
battles that gate the sky → and every result lets you **climb higher**, deeper into
the Reaches, closer to the Vault. The loop is a spiral, not a line: each height
reveals the next system, each system unlocks the next height.

**Async league:** champions fight without both humans online (Live Gallery). You
climb; they keep fighting.

## 8. Onboarding Contract (90-second rule)

Before leaving the first flight, the player must understand:

1. *I fly. That thing beside me is my champion — I raise it; it fights.*
2. *How high I climb is my record; the climb marks my champion's body.*
3. *There's a whole world down there the climb is showing me.*

See [`first-journey-roadmap.md`](./first-journey-roadmap.md) for the Flight-First
flow and checklist; [`flyover.md`](./flyover.md) for how the flight previews the
whole game.

## 9. Shipped vs aspirational

| Shipped | Aspirational |
|---------|--------------|
| Handler + champion split, Trainer Rank HUD, Trainer jetpack | Other Trainers visible in-world (social layer) |
| 100-sector Climb (mobile) + Circuit venue (desktop) | Battles-as-altitude-keys gating higher Reaches |
| One owned champion + roster recruitment | Multiple active champions |
| Champion flies beside you (Climb + Grounds) | Handler cosmetic unlocks |

## 10. Design principles (future decisions)

- **The climb is the spine.** New verbs should either sit on the climb or be
  reachable from it; nothing detached ships without a hook back (growth-doc law).
- Never make the player feel they *are* the champion in 3D.
- Champion bodies must tell career stories — battles *and* climbs.
- Autonomy is sacred (LLM actor, engine game).
- Trainer Rank never resets; depth climbed is part of it.
- Onboarding teaches *fly → it fights* before any systems.
