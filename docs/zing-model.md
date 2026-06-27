# $ZING — token model decision

**Status:** Proposed decision (needs founder sign-off). Written to unblock economy
and creator-economy design per `AGENCY.md` §Launch gate 6.

The question isn't "do we deploy a token" — it's "what *is* $ZING, so the Crown
economy, sinks, and any creator economy can be designed against a fixed answer."
Leaving this open blocks every downstream economic decision. Decide the **model**
now; the on-chain **deployment** can come after Launch v0.1.

---

## The decision: $ZING is fuel, not the product

**$ZING is an optional, off-to-the-side utility/fuel token. Crowns remain the
in-game soft currency and are never tokenized.** Concretely:

1. **Crowns stay off-chain and server-authoritative.** They are the gameplay
   economy (`lib/economy.ts`): earned by winning, spent on training/fragments.
   We keep full control of faucets/sinks and ELO fairness. Crowns are *not*
   convertible to $ZING at a fixed rate (that would import token volatility into
   game balance and create a de-facto security).

2. **$ZING is a premium/meta layer, not a gate to play.** You can play, climb,
   evolve, and share a legend with zero crypto. $ZING buys *optional* things and
   rewards *committed* players:
   - **Premium sinks:** cosmetics, season pass, "infinite battles" (the
     inference-paid mode — price it above marginal duel cost, see §Economics).
   - **Creator royalties:** when user-made champions arrive (Phase 5), creators
     earn $ZING when their champion is adopted/fought.
   - **Staking for league rewards:** stake $ZING behind a Force/champion for a
     share of seasonal rewards — aligned with the async-league spectacle.

3. **Positioning: AI-native game first, meme-friendly for distribution.** Lead
   with "the creatures actually think," not "buy our coin." $ZING can launch with
   meme energy for distribution, but it is *utility-anchored* so the messaging
   doesn't whiplash between "serious agent protocol" and "casino."

## Explicitly rejected

- **Betting-integrated token.** Turning ranked outcomes into on-chain wagers
  makes Zingers a gambling product (regulatory + platform-risk + tone). Keep
  betting as a *Crown* sink only (already capped at {25,50,100}, 2× payout).
- **Pure meme coin as the product.** Contradicts the north star ("$ZING as fuel,
  not the product") and the moat (IP + evolving meta + creator economy).
- **Tokenizing Crowns.** Would hand economy balance to a volatile market.

## What this unblocks

- **Sink design:** premium sinks are denominated in $ZING; gameplay sinks in
  Crowns. Two currencies, two jobs — no ambiguity.
- **Creator economy (Phase 5):** royalties have a unit of account.
- **Cost coverage:** "infinite battles" is the inference-paid product; its $ZING
  price is set as a multiple of the measured marginal duel cost (§Economics).

## Sequencing

- **Pre-launch (now):** lock this model in writing. No contract, no chain.
- **Launch v0.1:** ship with Crowns only. $ZING is *announced* (positioning), not
  required.
- **Post-launch:** deploy $ZING when there's real demand for premium sinks and a
  creator economy to royalty. Token follows traction, not the other way around.

## Open sub-questions (for sign-off)

- Chain/standard (e.g. an L2 vs. Solana) and custody/wallet UX for non-crypto players?
- Does staking pay from a treasury, a cut of premium-sink revenue, or emissions?
- Is there ever a one-way Crowns→$ZING *reward* faucet (e.g. seasonal top-ranked
  payout), or are the two economies fully separate? (Recommend: fully separate at
  launch; revisit once creator economy exists.)
