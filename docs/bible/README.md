# The Zingers Bible

> The canon of the Zingers universe. This is the **single source of truth** for
> lore, names, and rules-as-fiction. It serves two masters at once:
>
> 1. **zingers.org**: the public encyclopedia readers explore.
> 2. **The generative engine**: the canon that seasons, champions, and narrative
>    are spun from, so nothing the game generates ever contradicts itself.

Anything the game *invents* (a season's story, a new champion's saga, a topic, a
region event) must be **consistent with this bible**. The machine-readable slice
of it lives in [`lib/lore/canon.ts`](../../lib/lore/canon.ts); the prose lives here.

## Index

| # | File | What it establishes |
|---|------|---------------------|
| 01 | [cosmology.md](./01-cosmology.md) | The world, the Hum, the Long Vault: why anything exists |
| 02 | [forces.md](./02-forces.md) | The Five Forces (the type pentagon), as in-world physics |
| 03 | [champions.md](./03-champions.md) | What a champion *is*; the six First Minds |
| 04 | [keepers.md](./04-keepers.md) | The five Keepers of the Long Vault (the campaign spine) |
| 05 | [regions.md](./05-regions.md) | The map: regions, their force-bias, their arenas |
| 06 | [seasons.md](./06-seasons.md) | The Chronicle: how living seasons are generated |
| 07 | [collection.md](./07-collection.md) | Cards, rarity, attributes: the collection layer |
| 08 | [economy.md](./08-economy.md) | Crowns, and the optional ownership layer beneath |

## How the three play-layers sit in the canon

The game is one world entered at three session-lengths (the design north star):

- **Roam (open-ended)**: *the Grounds*. You live in the world, watch the league
  happen around you, walk up to champions and rivals. The connective tissue.
- **Quick match (2–5 min)**: *the Arena / League*. Drop in, fight one ranked bout,
  hold your rank. Always available from anywhere in the world.
- **Raise (15–60 min)**: *the Campaign & Collection*. The growing RPG: raise minds,
  evolve their bodies, advance the Chronicle, build a collection.

None of these "finish." The Long Vault opens one more door each season; the climb
is the point.

## Canon discipline (for writers and the generator alike)

- **Names are fixed.** Forces, Keepers, regions, and the six First Minds do not
  get renamed by a season. Seasons add; they do not overwrite.
- **The engine is the physics.** Damage, types, and statuses in
  `docs/combat-design.md` are *literally true* in-world. Argument shapes reality.
- **Generated lore is additive and seeded.** A season's story is produced from a
  seed + this canon, so it is reproducible and never off-canon.
