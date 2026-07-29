# 08 · Economy: Crowns, and the ownership layer beneath

> **In short:** The game is free to play. **Crowns** are the money you earn by
> playing. You never buy them or cash them out. An optional token underneath lets
> collectors **burn to immortalize** a champion as an on-chain card. The token
> never buys power and never pays a return. The two currencies never mix.

The cardinal rule: **the game is free and complete without spending or owning
anything on-chain.** Crypto is a trophy case under the game, never a gate in
front of it. Raise, climb, collect, and fight having never seen a wallet.

Design law: **the token buys permanence (and soft standing). Never yield.** No
staking APY, no "stake to earn," no pot where winners take losers' money, no cut
of a living champion's Crowns to a card holder.

---

## Two economies, never bridged

| | **Crowns** | **The Token** (working name `$ZING`) |
|---|---|---|
| Nature | Soft, in-game | Hard, on-chain (Solana) |
| How you get it | *Earned* by playing | *Bought* on a market, or airdropped for play |
| What it's for | Training, entries, backing, cosmetic reforges | Burn to immortalize a champion card |
| Cash value | None, ever | Market value (not our promise) |
| Cashes out? | **Never** | Only on the open market, never *through us* |

The two balances **never convert into each other.** The wall between them is the
most important invariant in this document.

Practically: a new player touches only Crowns. The token is an opt-in collector
layer for Trainers who want a legend stamped forever.

---

## Crowns (the in-world currency, free)

**Crowns** are the soft currency, earned by playing:

| Source | Reward |
|--------|--------|
| Win a fight | Crowns + XP + rating |
| Press the Gauntlet | escalating pot, press-your-luck (the **Gauntlet** is a run of back-to-back fights where the reward climbs but one loss ends it) |
| Train | spend Crowns → XP + body evolution toward your strategy (the fighting style you've set) |
| Rank Fight (standings entry) | spend Crowns → one rated board fight against a random opponent (no free rating grind) |
| Flight milestones (Hundred, first-light) | one-shot purses; the Hundred is a large celebration purse outside the daily earn cap |
| Daily / season objectives | a steady trickle |

Crowns buy **training, entries, and cosmetic reforges**. Play money: abundant,
never sold, never cashed out. Variable earns from Flight, Arena, caches, and
goals share a daily cap; milestone purses sit outside that cap. Craft board rank
is pride, never a Crown purse. Improvement can pay; placement does not.

### "Back," not "bet"

Inside the Crowns economy, the player verb is **back**. You *back* a champion to
win. We retire the word "bet" in player copy. Conviction, not gambling. The
mechanic underneath is unchanged; only the language is.

---

## The Token (`$ZING`, working name)

One hard job, easy to say out loud:

**Burn token → immortalize your champion as an on-chain card.**

That is the utility. Standing around those cards is soft glory only.

### Immortalize

- You own a living career. You choose to stamp it (owner only).
- You burn a **fixed** amount of token set by rarity class (retuned between mint
  windows). No price oracles. No bonding curves.
- The chain mints a card. The art is a **frozen snapshot** of that career at the
  moment of the stamp. In the Grounds the body may keep growing; the card does not
  morph on its own. Early stamps can be remembered as Genesis / OG when craft improves.
- **Scarcity follows the roster.** In the first year each mind may be immortalized
  at most **eight** times. One stamp per living career. When the house releases a
  new wave of minds, those minds receive their own eight — supply grows with the
  dex waves ([03-champions.md](./03-champions.md)), not with every story season.
  Launch opens near a thousand possible stamps; further waves in that year can
  lift the ceiling toward the mid-thousands if every slot fills — still scarce,
  never a mass drop. Story seasons keep turning; they do not each print a new set.
  Early stamps in the Genesis window carry an OG mark; later stamps of the same
  mind are still scarce but not Genesis.
- Provenance on the card records who holds it, when it was stamped, and which
  season marked it. Cards trade. A small royalty on trade may split between the
  house and the original minter — never a cut of Crowns the living champion earns.

The living champion still belongs to the Trainer for play. Crowns it earns stay
with that Trainer. The card is the trophy, not a claim on future soft earnings.

### Standing (soft)

Immortalized cards may carry season crests, gallery placement, and a name among
those who showed up. Holding or earning stamps can weight a future airdrop from
the seeded treasury. **Glory and allocation weight. Never a continuous payout.
Never a fee on Crowns the champion generates.**

Trade of cards on the open market may later carry a small house royalty. That is
ordinary collectible trade, not a salary from the fight.

### What the token never does

- Buy wins, stats, or board entry
- Pay yield, APY, or performance fees
- Convert to or from Crowns
- Gate Flight, raise, or the free season

Supply tightens when people immortalize: burns remove token. We may seed treasury
for airdrops. We never pay that treasury out as yield.

---

## Seasons and the free game

The free game already runs on a **season** clock: the Vault opens another door,
with a soft rank reset so you carry your name forward
([`06-seasons.md`](./06-seasons.md)). **That free season stays free for everyone.**

Seasons give immortalize its calendar: edition marks, crest language, mint waves
when a chapter turns. Crypto remains the trophy case for that chapter. Never the
slot machine.

---

## Design constraints

- **The wall holds.** Crowns and the token never convert and never share a balance.
- **Provenance is already named.** Cards already carry mint id, owner, chain, and
  minted season. The chain fills those fields; it does not rewrite the dex.
- **No game-affecting power is ever sold.** Permanence and soft standing only.
  Pay-to-own a trophy, never pay-to-win.
- **Studio minds only.** Collectors stamp legends the house authored. Players do
  not forge new champions.
- **Thin on purpose.** One hard sink. Extra "utilities" are refused.

---

## Regulatory guardrails (the indie-safe envelope)

- **No yield.** Never stake-to-earn. Never a share of burns or of a champion's
  Crowns to a card holder.
- **Burn is a fee for a stamp**, not a wager for a prize.
- **Rewards are cosmetic, standing, or allocation weight.** Not cash. Not
  performance-scaled token payouts.
- **No marketing of price.** We talk about legends, seasons, and collecting.
- **Crowns never cash out.**

Stay in this envelope and the token is a collectible sink with a clear story.
The lowest-pressure posture for launch.

---

## Settled / still open

**Settled:** burn-to-immortalize as the only hard utility; snapshot art; Year 1 =
**eight Immortals per mind** (~1056 at today’s dex; scales as new minds ship);
Genesis OG for early stamps; owner-only; tradeable; tiered fixed burns; no oracle;
no curve; no holder fee on living earnings; Solana; free game untouched. Story
seasons ≠ print runs.

**Still open (knobs, not shape):** final ticker name; burn table; royalty split;
always-on vs windowed minting after Genesis; Year 2+ per-mind cap.
