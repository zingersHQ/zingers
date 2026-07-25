# 07 · The Collection: cards, rarity, and attributes

> **In short:** Every champion doubles as a collectible card, like in Pokémon or
> Magic. Unlike those, the card's artwork actually changes as the champion fights
> and grows. You collect a growing dex, raise a stable, and (later) trade.

Every champion is also a **card**. The card is the portable, collectible face of a
mind, and its single best trick is already true in code: **the art evolves**,
because the art is the champion's body. Career bone morph
(`lib/evolve/appearance.ts`) plus a seeded **phenotype** part kit
(`lib/render/phenotype.ts`) make same-Force minds read as different species, then
grow stranger with tier. A card you own gets visibly stronger as you fight it.

## Anatomy of a card

| Part | Source | Notes |
|------|--------|-------|
| **Mind** (name, force, lineage) | First Minds + baked dex (`content/minds/reviewed/`) + season generator | the identity |
| **Art** | genome + Force archetype + phenotype → body render | changes with career and tier, deterministically |
| **Stats** | the five combat stats + rating | the numbers |
| **Sigils** | earned force-heraldry (I/II/III). Badges you win, not buy | the badges |
| **Attributes** | the moveset (4 moves) | the "abilities" line: this is the TCG depth |
| **Saga** | generated from match history | the flavour text. The champion's own evolving life-story |
| **Rarity** | derived from tier × scarcity | below |
| **Provenance** | season minted, owner, mint id | inert today; the ownership hook |

## Rarity

Rarity is **earned, then scarce**. It is not a gacha roll. It rises with the
champion's tier and with how rare that build genuinely is.

| Rarity | Earned at | Feel |
|--------|-----------|------|
| **Common** | Rookie | a mind that has only just cohered |
| **Uncommon** | Adept | proven once or twice |
| **Rare** | Veteran | a real record |
| **Epic** | Elite | a feared name |
| **Legendary** | Legend | crowned; a fixture of the standings |
| **Mythic** | Legend + a season title (e.g. Cracked a Keeper, won a season) | one-of-a-kind events; the trophy tier |

## How collection plays (the Pokémon / Magic layer)

- **Collect**: the eight First Minds, the baked dex wave (Stage 6 batch minds),
  season featured minds, and your own raised careers. The dex is the long game.
  New minds ship through `npm run forge:dex` / review / `npm run bake:minds`
  (see [03-champions.md](./03-champions.md)).
- **Meet**: weekly adopt rotation shows one starter per Force from that pool, so
  returning Trainers meet different wingmates over time.
- **Build**: a small **stable** of champions you field across the regions; their
  Forces interact on the Wheel, so a stable is a *deck* with type coverage.
- **Trade / gift**: player-to-player movement of cards (the social loop). Designed
  here; gated behind the ownership layer ([economy.md](./08-economy.md)). On-chain
  mint is a later fill-in of provenance fields already on the card, not a reason
  the dex exists.

## Canon discipline

- A card's **rarity can rise** (a Rookie you raise to Legend re-mints upward) but a
  card's **identity is permanent**: same mind, same lineage, evolving body.
- Baked and generated minds get a **lineage** tag (which First Mind they echo) so
  the dex stays legible and every card has a place on the Wheel.
