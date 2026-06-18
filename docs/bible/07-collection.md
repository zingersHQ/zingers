# 07 · The Collection: cards, rarity, and attributes

Every champion is also a **card**. The card is the portable, collectible face of a
mind, and its single best trick is already true in code: **the art evolves**,
because the art is the champion's body, and the body is a function of the career
(`lib/evolve/appearance.ts`). A card you own gets visibly stronger and stranger as
you fight it. No TCG can fake that; here it is the default.

## Anatomy of a card

| Part | Source | Notes |
|------|--------|-------|
| **Mind** (name, force, lineage) | roster + season generator | the identity |
| **Art** | live genome → body render | changes with the career, deterministically |
| **Stats** | the five combat stats + ELO | the numbers |
| **Sigils** | earned force-heraldry (I/II/III) | the badges |
| **Attributes** | the moveset (4 moves) | the "abilities" line: this is the TCG depth |
| **Saga** | generated from match history | the flavour text, evolving |
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
| **Legendary** | Legend | crowned; a fixture of the ladder |
| **Mythic** | Legend + a season title (e.g. cracked a Keeper, won a season) | one-of-a-kind events; the trophy tier |

## How collection plays (the Pokémon / Magic layer)

- **Collect**: every First Mind, every season's featured minds, your own raised
  champions. The dex is the long game.
- **Build**: a small **stable** of champions you field across the regions; their
  forces interact on the Wheel, so a stable is a *deck* with type coverage.
- **Trade / gift**: player-to-player movement of cards (the social loop). Designed
  here; gated behind the ownership layer ([economy.md](./08-economy.md)).

## Canon discipline

- A card's **rarity can rise** (a Rookie you raise to Legend re-mints upward) but a
  card's **identity is permanent**: same mind, same lineage, evolving body.
- Generated minds get a lineage tag (which First Mind they echo) so the dex stays
  legible and every card has a place on the Wheel.
