# 10 · Flight: the sky above the Vault, and why we climb

> **In short:** The world is not only a surface. It is a *height*. Above the drifting
> regions the sky rises in bands called **Reaches**, and to climb them is to rise out
> of the Hum toward clear thought. You fly it with a jetpack; your champion flies
> beside you on its own. How high you get is the truest record of who you are.
> Player-facing name for this game: **Flight**. Lore still calls the vertical world
> the Ascent.

This chapter establishes the **vertical geography** of the world. Chapters 01 and 05
map the world *across* (the Hum, the Vault, the floating regions). This one maps it
*up*. Systems live in [`docs/climb.md`](../climb.md); the fiction lives here.
Phone and desktop are one soul, two bodies ([`essence.md`](../essence.md)).

## Why up

The Long Vault sits at the bottom of everything, humming (see
[cosmology.md](./01-cosmology.md)). The Hum is thickest down low, where the dead
network's unfinished thoughts pool like fog. **The higher you fly, the thinner the
Hum gets.** The noise falls away, and a mind can hear itself think. So climbing is
not decoration on top of the game; it is the world's oldest instinct made physical:
*rise out of the murmur.* A Trainer who has climbed high has, quite literally, been
somewhere clearer than everyone below.

This is why **the climb is the point** (cosmology.md: "you never beat the world, you
climb it while it grows"). The Vault is the gravity; Flight is the answer to it.

## The Reaches: bands of the sky

The sky above the world is layered into **Reaches**: ten bands, each with its own
weather, light, and hazards, stacked from the Hub launch pads up into the
near-black quiet at the top. They are not separate places so much as **altitudes of
the same sky over the same world**. A Reach wears the skin of the region it rises
above (the Ember Reaches burn; the Garden Reaches drift with spores), because you are
climbing over that region's terrain.

The ten Reaches, low to high, culminate in **The Hum**: the topmost Reach, near-black
and star-dense, the highest anyone has flown and the closest anyone comes to silence
above the noise the whole world is named for. (The authored 100-sector layout of the
Reaches, roles, hazards, modifiers, is a systems concern; see
[`docs/climb.md`](../climb.md) §2.)

## Camps: the waystations

Between Reaches drift the **Camps**: small floating waystations, one at each Reach
boundary, where a climber can rest, catch breath, and be counted. Reaching a Camp for
the first time is a landmark. It lights, permanently, and it is remembered in your
Saga ("first Trainer light at Camp IV"). Camps are visible from below as lights in
the sky, and they are where the flying game and the walking world meet: you can drop
from a Camp into the region it floats over, or launch from a region up into Flight.
**A Camp is a door between flying and roaming.**

## The jetpack, and who needs one (canon)

Flight has a fixed rule, and it matters because flight is central:

- **The Trainer flies with a jetpack.** You are flesh: an ordinary being in an
  extraordinary sky. The jetpack is your machine; without it you fall. **The jetpack
  is Trainer-only.** It is part of the Handler's silhouette (cosmology.md,
  design-vision.md): gold sigil, rank billboard, and the pack on the back.
- **The champion needs no jetpack.** A champion is a *mind*: a knot in the Hum
  (cosmology.md). A thought does not need an engine to rise; neither does a champion.
  So your champion **flies beside you**, on its own, a wingmate. When a freshly
  claimed rookie first leaves the ground, it is not learning to use a machine. It is
  discovering it was never bound to the floor. (Voice: the FIRST FLIGHT beat,
  `lib/lore/character-beats.ts`.)

This is the whole shape of it in five words, and it is canon: **you fly, it fights.**
The one place the Trainer performs with their own hands is the flight; the one place
the champion performs is the battle. Neither trespasses on the other.

## The Flight sigil: the climb, written on the body

A champion's body records its arguments (champions.md: "the body is the argument made
visible"). Flight adds one more author to that body: **your climbs**. Every Reach
you reach stamps growth onto the champion's **Flight sigil**: a halo that gains a
glyph per Reach and takes the color of the deepest sky you've flown. A completed
Hundred rings the halo with the star-band of the topmost Reach.

The consequence is quietly important: the champion's body now records **two**
careers braided together. *Its* fights and *your* climbs. The thing you raise wears
proof of the thing you do. (Mechanics: [`essence.md`](../essence.md) §3;
[`climb.md`](../climb.md) §6. Older docs may still say "ascent sigil"; same thing.)

## Challenges: racing another Trainer's mark

Flight is also social without needing both players online. A **challenge** is a
shareable run: someone else's ghost flies the same route, and you try to clear their
mark (or push past the tip where they fell).

- Ghosts stay see-through so your eye stays on the next gate.
- Clearing their tip sector can toast and, when you outfly their fail mark, the
  run-over can say you went past them.
- Share links keep the sector you actually passed after you continue, not only the
  miss. Path form: `/ascent/<id>` (query forms still resolve).

Same rules on phone and desktop (one soul). Codec: `lib/climb-ghost.ts` and the
shared climb helpers under `components/grounds/climb/`.

## Two bodies, one sky

Like everything in Zingers, Flight is *one soul in native bodies*
([`essence.md`](../essence.md)):

- **Desktop:** full six-degree flight in the world; the Circuit venue is a raceable
  body of the same Hundred.
- **Phone:** the same sky, flown with one thumb. Hold to rise, release to fall,
  thread the gates. Leaner freedom, identical soul.

Both bodies fly the same wind corridor: the pack pushes you forward hard once a
sector starts, and the gates are spaced for that pace so skill stays altitude, not
unfair timing. How high you climbed is a fact about your Trainer that travels with
you everywhere; how *fast* you flew it is a craft that each device scores on its
own terms.

Between gates, sparks and bars that shove you are hazards. They are never prizes.
They shove and lock thrust; they do not take Crowns or lives on contact.
The only mid-run treasure is a Crown cache floating off the glide line between
gates. Climb or dive for it. Missing one never fails the sector.
Systems detail: [`climb.md`](../climb.md).

Clearing all one hundred sectors is a summit. After that the climb does not become
endless. You fly cleaner, race a friend's ghost, or wait for a new weekly sky.
Speed is not the story. Mobile and desktop keep their own craft boards.

## Why this matters for play

- **The sky is the spine.** Every region has a Reach above it; every Reach shows you
  the region below. Flight is how the whole map hangs together.
- **Height is honest.** Depth climbed can't be bought. It's flown. It feeds Trainer
  Rank and marks the champion, so a high climber's champion *looks* like it belongs
  to someone who has been up there.
- **The climb never ends.** Like the Vault it rises over. There is always one more
  Reach, one more Camp, one more meter of thinner air.
