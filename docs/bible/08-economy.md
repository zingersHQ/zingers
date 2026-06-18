# 08 · Economy — Crowns, and the ownership layer beneath

The cardinal rule: **the game is free and complete without spending or owning
anything on-chain.** Crypto is a layer *underneath* the game for those who want it —
never a gate in front of it. A player can raise legends, climb seasons, collect the
dex, and crack the Vault having never seen a wallet.

## Crowns (the in-world currency, free)

**Crowns** are the soft currency, earned by playing:

| Source | Reward |
|--------|--------|
| Win a bout | Crowns + XP + ELO |
| Press the Gauntlet | escalating pot, press-your-luck |
| Train | spend Crowns → XP + body evolution toward your doctrine |
| Daily / season objectives | a steady trickle |

Crowns buy **training, entries, and cosmetic reforges** — things that affect *your*
account's progress. They are play money: abundant, never sold, never cashed out.
(Note: today Crowns live client-side; production hardening moves them server-side —
see the production review.)

## The ownership layer (optional, opt-in, underneath)

Three places where real ownership can attach, each strictly opt-in and invisible to
players who don't want it:

1. **Cards as dynamic NFTs.** A champion you raised can be **minted** — its provable
   career (the genome that generates its body) becomes an on-chain, tradeable asset.
   Because the art is deterministic from the record, the token *is* the track record.
   This is the cleanest fit: the thing of value already exists and is already
   provable.
2. **Real-stakes league.** An opt-in ladder where bouts are **wagered with crypto**.
   Zingers' bouts are already **provably fair** (seeded, deterministic RNG —
   `lib/engine/xai.ts:makeRng`), which is the hard prerequisite most on-chain games
   lack. Requires commit-reveal on the live judge, plus KYC/geo and legal review.
3. **Seasonal drops.** Cosmetic reforges, mythic trophies, and season passes as
   collectible items.

## Design constraints (so it bolts on cleanly later)

- The card schema (`lib/cards/`) carries **inert provenance fields** (`mintId`,
  `owner`, `chain`, `mintedSeason`) from day one, so adding the chain later is a
  *fill-in*, not a refactor.
- **No game-affecting power** is ever sold. Ownership buys provenance, trade
  rights, and cosmetics — not stats, not wins. Pay-to-own, never pay-to-win.
- Betting is a **separate, walled mode** — the free game's Crowns and the staked
  league never share a balance.
