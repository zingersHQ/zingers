# 08 · Economy: Crowns, and the ownership layer beneath

The cardinal rule: **the game is free and complete without spending or owning
anything on-chain.** Crypto is a layer *underneath* the game for those who want it,
never a gate in front of it. A player can raise legends, climb seasons, collect the
dex, and crack the Vault having never seen a wallet.

Everything below obeys one design law: **the token buys standing, access, and
permanence — never yield.** No staking APY, no "stake to earn," no pot where
winners take losers' money. Break that law and we become a security and a casino;
keep it and we stay an indie game with a collectible legend layer.

A second discipline, from the bible's canon rules: **we don't invent new top-level
names.** The on-chain layer reuses the words the world already has — **seasons**
(the Chronicle, [`06-seasons.md`](./06-seasons.md)) and **regions** (the themed
arenas, [`05-regions.md`](./05-regions.md)) — rather than minting "Eras/Worlds"
that would collide with canon.

---

## Two economies, never bridged

| | **Crowns** | **The Token** (working name `$ZING`) |
|---|---|---|
| Nature | Soft, in-game | Hard, on-chain (Solana / SPL) |
| How you get it | *Earned* by playing | *Bought* on a market, or airdropped for play |
| What it's for | Training, entries, backing, cosmetic reforges | On-chain ladder entry, minting cards, patron standing |
| Cash value | None, ever | Market value (not our promise) |
| Cashes out? | **Never** | Only on the open market, never *through us* |

The two balances **never convert into each other and never share a wallet.** The
moment Crowns can be bought with the token or the token can be earned from Crowns,
we've built money-transmission and a cash-out for a wagering currency. The wall
between them is the single most important invariant in this document.

Practically: a new player touches only Crowns. Most players never touch the token.
The token is an opt-in collector / loyalty layer for the committed.

---

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
(Canonical values live in `lib/economy.ts`; the server owns the balance, the client
mirrors it.)

### "Back," not "bet"

Inside the Crowns economy, the player verb is **back** — you *back* a champion to
win (Arena/Daily streaks, ranked Grounds wagers). We retire the word "bet"
everywhere in the UI and copy. "Back your champion" reads as conviction, not
gambling, and it's the same verb the token layer uses (you *back* a champion for a
season). The mechanic underneath is unchanged; only the language is.

---

## The Token (`$ZING`, working name)

One hard asset sits beneath the game. It does exactly three things, and nothing
that looks like an investment return:

1. **Pays on-chain ladder entry** — by burning a little or staking more (below).
2. **Mints permanence** — burned to immortalize a champion as an on-chain card.
3. **Confers standing** — patron crests, dex provenance, next-season allocation
   weight.

Supply is deflationary by construction: every entry-burn and every mint-burn
removes tokens, while staked entries lock float for a whole season. We may seed a
treasury chunk for airdrops; we never pay it out as yield.

---

## The on-chain ladder (what the token gates)

The free game already runs on a **season** clock: a season is the Vault opening one
more door — generative, seeded, with a *soft* rank reset so you always carry your
name forward ([`06-seasons.md`](./06-seasons.md)). **That free season is untouched
and stays free for everyone.**

The token gates an **opt-in on-chain ladder that runs on the same season clock.**
Entering it is the only thing the token unlocks for play; the campaign, Crowns
ladder, dex, and Daily remain wallet-free. The on-chain ladder:

- **Runs per season** — opens when the season opens, **closes on-chain** when it
  turns (mints settle, crests award, next season's airdrop weights tally). Reuses
  `mintedSeason` provenance, so a minted card is stamped with the season it was
  immortalized in.
- **Is scoped by region (optional, later).** Regions already are the themed arenas
  with force-bias ([`05-regions.md`](./05-regions.md)), wired through `/api/battle`
  as `regionBias`. A mature version can price entry **per region** so a player picks
  which arena(s) to contest. v1 keeps it to **one season-wide ladder**; region
  scoping is the proven-loop expansion, not the launch.

> **v1 scope:** one season-wide on-chain ladder with burn-or-stake entry and an
> on-chain close. Per-region ladders come after the loop earns it. Don't build the
> taxonomy before the loop proves out.

---

## Entry: burn-or-stake

Entering the on-chain ladder for a season has one price payable two ways. The
*choice* self-segments players, and both paths reduce circulating supply.

| Path | Cost | Outcome | Who picks it |
|------|------|---------|--------------|
| **Burn** | small (`N`) | tokens destroyed forever | casual / one-season players |
| **Stake** | larger (`~5–10·N`) | locked till the season ends, **returned in full** | committed / recurring players |

- **Burn** is a consumed access fee — a *purchase*, not a wager. Pure deflation;
  feeds the buy-and-burn narrative organically.
- **Stake** is a **refundable entry deposit** — principal returns intact at season
  close, with **no extra tokens**. The only "cost" is illiquidity (capital locked
  for the season). Stakers temporarily remove float; burners remove it permanently.

A one-season player is better off burning `N`. A recurring player is better off
staking once — which leads to the loyalty loop.

### The loyalty loop: keep it staked, skip the burn

Stake is **persistent across seasons**:

- Stake once → you are auto-entered into every subsequent season, **no burn
  required**, for as long as you stay locked.
- **Unstaking is only allowed at a season boundary** (the lock runs to the end of
  the current season). Pull out and you're back to burning to re-enter.

Net effect: loyal players lock capital indefinitely and play free forever (a
growing, permanently-locked **supply floor**); casual churn pays the **burn**. Both
are deflationary. Neither is yield. This rhymes with the soft rank reset: you keep
your standing season to season, and now you can keep your *seat* too.

---

## Season close: what staking is *for*

When a season turns (deterministically — bouts are provably fair via seeded RNG,
`lib/engine/xai.ts:makeRng`), the on-chain ladder settles. **All rewards are
non-financial.** Stakers get their principal back *plus* status; nobody gets more
tokens than they put in.

- **Mint-to-immortalize.** Top champions (and any owner who opts in) **burn token to
  mint** their champion as a permanent on-chain card. The art is deterministic from
  the career record, so *the token is the track record*. This fills the inert
  provenance fields that already exist — `mintId`, `owner`, `chain`, `mintedSeason`
  in `CardProvenance` (`lib/cards/card.ts`) — with no schema change.
- **Patron crests.** If you **backed** (staked behind) a champion for the season,
  you receive a cosmetic **crest** on its card and your handle/wallet recorded in
  the card's provenance/patron list. Weighted by how the champion placed — but the
  reward is *glory*, not a payout.
- **Airdrop weight.** Participation (ELO climbed, bouts watched, Daily streaks,
  Crowns earned, seasons staked) sets your **allocation weight** for the next
  airdrop from the seeded treasury. The token is thus *earned by play*, not sold
  into.

So a season reads as: *play all season in Crowns → season turns on-chain → patrons
get crests → top champions mint as permanent cards → entry-burns and mint-burns
tighten supply → next season's airdrop rewards the players who showed up.* Crypto is
the trophy case, never the slot machine.

---

## Design constraints (so it bolts on cleanly)

- **The wall holds.** Crowns and the token never convert and never share a balance
  (`lib/economy.ts` stays token-free; the token lives in its own module/contract).
- **Provenance is already wired.** `CardProvenance` carries inert `mintId`, `owner`,
  `chain`, `mintedSeason` from day one — adding the chain is a *fill-in*, not a
  refactor. Add a patron list field when crests land.
- **Regions, not new worlds.** Per-arena scoping reuses `regionBias` and the
  canonical regions rather than inventing a parallel container.
- **No game-affecting power is ever sold.** Token and ownership buy provenance,
  entry, crests, and cosmetics — never stats, never wins. Pay-to-own, never
  pay-to-win.
- **Determinism is the prerequisite.** On-chain season close only works because
  bouts are provably fair (seeded, deterministic RNG). Keep that invariant sacred.

---

## Regulatory guardrails (the indie-safe envelope)

We launch lean, but we stay inside this envelope on purpose:

- **No yield.** Stake returns *exactly* principal. Never "stake to earn more
  tokens," never APY, never a share of others' burns. This is the line between a
  refundable deposit and an unregistered security/lottery.
- **Burn is a fee, not a wager.** You burn to *access* the ladder, with no monetary
  prize for "winning" denominated in the token.
- **Rewards are cosmetic/standing/allocation** — crests, mints, dex provenance,
  airdrop weight. Not cash, not token payouts scaled to performance.
- **No marketing of price.** We talk about legends, seasons, and collecting — never
  "number go up," never returns.
- **Crowns never cash out.** The soft economy stays walled from anything with market
  value.

Stay in this envelope and the token is a utility/collectible with a deflationary
sink — the lowest-pressure posture available for an unincorporated indie launch.
(Geo/KYC and a legal wrapper are only needed if we ever add token-denominated
*prizes* — which this design deliberately avoids.)

---

## Open questions (to settle before build)

- **Token name & ticker.** `$ZING` is a placeholder. Candidates that fit the lore:
  relic/ember/sigil-adjacent. (Note: "Crowns" is taken by the soft currency — avoid
  collision.)
- **Entry numbers.** Concrete `N` (burn) and the stake multiple (`5–10·N`), tuned
  against expected token price so neither path is a no-brainer.
- **Season-wide vs per-region entry.** When regions arrive, does one stake cover all
  regions, or is entry priced per region?
- **Mint eligibility.** Top-N only, or anyone who opts in? Mint cost (burn amount)?
- **Patron cap.** How many patrons can back one champion; how crest tiers scale with
  placement.
- **Airdrop formula.** The exact weighting of play signals → allocation.
- **Chain/standard.** SPL token + which NFT standard (e.g. Metaplex) for minted
  cards; whether mints are tradeable from day one.
