# $ZING — token model (LOCKED)

**Status:** Locked (founder, 2026-07). Thin utility. Easy to explain. Simple to build.

One sentence players should understand:

> **Burn `$ZING` to immortalize your champion as an on-chain card.**
> The game stays free. Crowns never touch the token.

---

## The decision

**`$ZING` is optional Solana fuel for permanence.** Crowns remain the only
gameplay currency and are never tokenized, never bridged, never cashed out.

| | Crowns | `$ZING` |
|---|---|---|
| Where | Off-chain, server | Solana SPL |
| Job | Play (train, recruit, back, entries) | Immortalize (burn → mint card) |
| Required to play? | Soft yes (earned freely) | No |
| Convert? | Never ↔ token | Never ↔ Crowns |

---

## What the token does (only this)

### 1. Immortalize (the hard utility)

Burn a fixed amount of `$ZING` → mint one Immortal card (NFT) of that champion.

- **Who:** the Trainer who owns that living career (wallet linked). **Owner-only.**
- **Art:** a **frozen snapshot** at mint time. In-game the body may keep
  evolving; the NFT does not morph live. Early art can be framed as **OG /
  Genesis** when the remodel improves later.
- **Price:** **tiered fixed `$ZING` amounts** (by rarity / class). Retune by
  config between mint windows. **No USD oracle. No bonding curve.**
- **Tradeable:** yes, day one.
- **Standard:** full NFT (Metaplex / Core) for v1 — prestige over cNFT volume.
- **Not sold:** power, wins, stats, standings entry.

### Supply (scarcity is the point)

Chronicle **story seasons** (~7-day Season 0, then ~28-day seasons) are the
content clock. They are **not** automatic print runs.

Supply is **tied to the dex**, not a magic fixed headcount like “exactly 600.”

**Year 1 law — per mind:**

> At most **M** Immortal stamps per mind in Year 1.
> One stamp per living career. Owner-only.

**Year 1: M = 8** (locked). Supply tracks the roster and its waves — full numbers
and Year 2–3 projections live in [`champions-supply.md`](./champions-supply.md).

| Dex moment (Year 1 plan) | Minds | Max Immortals (M = 8) |
|--------------------------|-------|------------------------|
| Launch (wave 1, live) | ~132 | ~1056 |
| After planned waves (+72) | ~204 | ~1632 Year-1 ceiling if all fill |

**Dex evolution during the year:**

- When the house ships a **new mind**, that mind gets its own fresh **M** slots
  for Year 1. Supply grows with the roster, not with the calendar alone.
- Story season turns do **not** reset or refill M.
- Year 2+ sets a new M (or pause) — separate decision.

**Early minting is rewarded (Genesis):**

- Launch / Season 0 opens a **Genesis window**. Stamps minted then carry an
  **OG / Genesis** mark forever.
- Those stamps still count against that mind’s M. Early Trainers compete for the
  scarce OG slice of each mind; later Trainers can still mint if that mind’s M
  is not full, but without the Genesis mark.
- Optional later: close minting outside windows; slots still come from the same
  per-mind M.

**Rejected supply shapes:** unbounded careers × seasons; fixed global 10k drops;
“one NFT per dex row forever” (too tiny once the roster is the product).

### 2. Standing (soft only)

Glory around immortalized cards — gallery placement, season crest on the stamp,
optional airdrop *weight* for holders/players next season. **Never a payout.**
**Never a fee on what the living champion earns in Crowns.**

Secondary marketplace royalties: **yes** — small % on trades, split **house +
original minter**. Trade infrastructure, not “champion salary.” (Solana royalties
are marketplace-enforced.)

---

## Explicitly rejected

- Pay-to-win / token-gated boards / token-gated Flight
- Yield, APY, stake-to-earn, pots, performance fees to NFT holders
- Crowns ↔ `$ZING` bridge or Crown cash-out
- USD-priced burns (oracles)
- Continuous bonding curves
- Live-updating NFT art as the default
- User-made champions / creator royalties
- On-chain standings entry as a token utility (dropped — too much surface)

---

## Mechanism (simple, hard to fail)

Hybrid by design. Game truth stays on the server. Chain only burns and mints.

```
1. Wallet linked to Trainer (already shipped: SIWS).
2. Player asks to immortalize champion X in the open mint window.
3. Server checks: owns career, career not yet Immortal, that mind’s Year-1 count
   under M, mint window rules (Genesis vs later), burn amount + art URI/hash.
4. Server issues a short-lived signed voucher (mind key, mint index, Genesis flag).
5. One Solana transaction: burn N $ZING + mint NFT + consume voucher.
6. Server writes mintId / owner / chain / mintedSeason on the card (fields exist).
```

**Failure posture:**

- If the chain tx fails → nothing minted, nothing burned (atomic).
- If the voucher is stale/used → program rejects; no burn.
- If Redis/server is down → no new vouchers; existing NFTs untouched.
- Never mint without burn. Never burn without a valid voucher.
- Never trust the client for eligibility or burn amount.

No oracle. No multi-step escrow. No stake unlock scheduler. One program path.

---

## Sequencing

- **Now:** model locked in this file + economy bible.
- **Build:** SPL mint + Immortalize program + voucher API + UI (“Immortalize”).
- **Launch:** token + LP + claim/airdrop ops as distribution; immortalize live on day one.
- **Play without token:** always possible. Wallet stays identity + mint key.

---

## Still open (knobs, not shape)

- Final ticker name (working: `$ZING`)
- Exact burn table (tier → `$ZING` amount)
- Exact royalty split (e.g. 5% total → house / minter)
- Whether minting is always-on until M fills, or windowed after Genesis
- Year 2+ **M** (or pause)

**Settled:** Year 1 = **8 Immortals per mind** (~1056 at ~132 minds; grows with
dex). Genesis OG mark rewards early stamps. Owner-only. Tradeable. Full NFT.
Tiered fixed burns. Snapshot art. Story seasons ≠ print runs.
