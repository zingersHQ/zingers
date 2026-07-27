# The Zingers Bible

> **In short:** This is the rulebook for the whole made-up world of Zingers. You're
> a **Trainer**. You raise AI "champions" that argue in live debate battles. This
> folder is where every name, place, and rule of that world is written down, so the
> game never contradicts itself.

> The canon of the Zingers universe. This is the **single source of truth** for
> lore, names, and rules-as-fiction. It serves two masters at once:
>
> 1. **zingers.org**: the public encyclopedia players explore.
> 2. **The generative engine**: the canon that seasons, champions, and narrative
>    are spun from, so nothing the game generates ever contradicts itself.

Anything the game *invents* (a season's story, a new champion's saga, a topic, a
region event) must be **consistent with this bible**. The prose lives here.

## What belongs here (and what does not)

The bible is **world fiction and rules-as-fiction**. Write what is true *in the
world*: who Trainers are, what champions are, how Forces work, why the Vault
matters. Keep it readable for a curious player who never opens a repository.

**Do not put here:** source file paths, module names, npm scripts, API routes,
schema field names, or "how to run the repo" notes. Those belong in design and
tech docs (`docs/combat-design.md`, `docs/TECHNICAL.md`, `docs/climb.md`, and
friends). If a paragraph only makes sense to someone cloning the project, it is
in the wrong book. Also skip comparisons to other games ("like Pokémon", "the
Magic layer"). Describe Zingers on its own terms.

## Index

| # | File | What it establishes |
|---|------|---------------------|
| 01 | [cosmology.md](./01-cosmology.md) | The world, the Hum, the Long Vault: why anything exists |
| 02 | [forces.md](./02-forces.md) | The Five Forces (the type pentagon), as in-world physics |
| 03 | [champions.md](./03-champions.md) | What a champion *is*; First Minds; the growing dex |
| 05 | [regions.md](./05-regions.md) | The map: regions, Concord venues, force-bias, arenas |
| 06 | [seasons.md](./06-seasons.md) | The Chronicle: how living seasons are generated |
| 07 | [collection.md](./07-collection.md) | Cards, rarity, attributes: the collection layer |
| 08 | [economy.md](./08-economy.md) | Crowns, and the optional ownership layer beneath |
| 09 | [glossary.md](./09-glossary.md) | Plain one-line definition of every signature term |
| 10 | [ascent.md](./10-ascent.md) | Flight (vertical world): Reaches, Camps, Flight sigil, challenges |

## How the three play-layers sit in the canon

The game is one world entered at three session-lengths (the design north star).
**Flight** (see [ascent.md](./10-ascent.md)) is the spine that threads all three:
it's the first thing a newcomer does, and the sky over every region shows you what's
below:

- **Roam (open-ended)**: *the world* (lore: the Grounds). The drifting, explorable
  surface, flown between on a jetpack. You live in it, watch the league happen
  around you, fly up to champions and rivals. The connective tissue.
- **Quick match (2–5 min)**: *the Arena / League*. Drop in, fight one ranked battle,
  hold your rank. Always available from anywhere in the world.
- **Raise (15–60 min)**: *raise and collect*. The growing RPG: raise minds, evolve
  their bodies, advance the Chronicle, build a collection.

None of these "finish." The **Long Vault** (a sealed store of everything the old
network could never finish) opens one more door each season; the climb is the point.

## Canon discipline (for writers and the generator alike)

- **Names are fixed.** Forces, regions, and the eight First Minds do not
  get renamed by a season. Seasons and dex waves **add** minds; they do not overwrite
  archetypes.
- **Forces use their plain name in-game.** The player-facing name of each Force is
  the plain one (Logic / Static / Calm / Chorus / Spark; see
  [02-forces.md](./02-forces.md)). The older poetic names (the Lattice / Stillness
  / …) are retained only as *etymology* in the bible and never shown in gameplay
  UI. The player is the **Trainer**. The person who raises the champions; the Force
  a Trainer swears to is their **Clan** (the group you pick a side with). The 3D
  avatar is the **Handler**. See [cosmology.md](./01-cosmology.md).
- **The engine is the physics.** Damage, types, and statuses in the combat design
  are *literally true* in-world. Argument shapes reality.
- **Generated lore is additive and seeded.** A season's story is produced from a
  seed + this canon, so it is reproducible and never off-canon.
