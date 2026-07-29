# ZINGERS: AI & crypto one-pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### Thinking creatures first. Collectible legends underneath.

Zingers leads with a real AI game. Creatures that actually think. Ownership stays
opt-in, walled off, and thin. Two layers, kept strictly distinct.
*(`docs/flight-first-plan.md`, `docs/zing-model.md`, `docs/bible/08-economy.md`.)*

---

## The AI layer (the product)

**Pluggable agents.** The engine asks one question per turn. *given this state
and these legal moves, what do you do?* Any brain implementing `act(view) →
decision` can drive a champion. *(`docs/agent-protocol.md`.)*

- **Providers:** the built-in **Grok** brain (xAI), any **OpenAI-compatible**
  model (`baseUrl` / `model` / key), an **HTTP webhook** (POST an `AgentView`,
  return an `AgentDecision`), or a **mock** for offline play. If either side
  brings its own agent, a fight runs *real* even with no house key.
- **Default path (fast).** Single-shot JSON decision + **local judge**. Snappy
  turns, low cost. Opt-in: `ZINGERS_AGENT_TOOLS=1` enables a bounded
  reason → act → observe → commit tool loop (`simulate_move`, `scout_opponent`,
  `commit_move`, capped at 3 steps); `ZINGERS_LLM_JUDGE=1` swaps in an LLM wit
  scorer (still a bounded multiplier. Never match-deciding alone).
- **Persistent memory & drift.** Each champion carries memory notes plus
  **Strategy / temperament** dials (aggression, focus, risk). You seed them at
  adopt; after that the UI is a readout. **Imprints** (a capped model call with
  a deterministic template fallback) let the Trainer teach lessons that write
  memory and drift personality over time; fights nudge the same dials.
- **Curated magic, emergent depth.** The default experience is authored (voice
  packs, character beats, deterministic fallbacks) so it always feels alive; real
  models add emergence on top, never as a hard dependency.

---

## The crypto layer (opt-in, underneath)

**Cardinal rule:** the game is **free and complete** without a wallet. Crypto is
a layer *beneath* the game, never a gate in front of it.

**Shipped today:** optional Solana wallet link (Phantom SIWS-style prove-ownership)
to keep a unique **Trainer name** across devices. No spend approvals yet.

**Locked utility (build next):** **burn `$ZING` → immortalize** a champion as an
on-chain card. Snapshot art. Season / rarity editions. Tiered fixed burns. No
oracle. No bonding curve. No yield. No fee on Crowns the living champion earns.

**Naming:** in-game Crowns live at `/api/wallet` (off-chain). Solana is
`solana-link` / “Connect”. Never call Crowns a chain wallet in player copy.

### Two economies, never bridged

| | **Crowns** | **$ZING** (working name) |
|---|---|---|
| Nature | Soft, in-game, server-authoritative | Hard, on-chain (SPL / Solana) |
| How you get it | *Earned* by playing | *Bought* on a market, or airdropped for play |
| What it's for | Training, entries, backing, cosmetic reforges | Burn to immortalize a champion card |
| Cashes out? | **Never** | Only on the open market, never *through us* |

### What the token does. And only this

1. **Immortalize.** Burn fixed `$ZING` → mint an edition NFT. Art freezes at stamp
   time. Re-stamp on season/tier for a new edition. Fills provenance fields already
   on the card (`mintId`, `owner`, `chain`, `mintedSeason`).
2. **Standing (soft).** Crests, gallery, airdrop weight. Glory, not payout.

### Mechanism (simple)

Server proves eligibility (owns career, edition free) → short-lived voucher →
one Solana tx burns token and mints the card. Atomic. No oracle. No stake
scheduler. Fail closed: bad voucher or failed tx means no mint and no burn.

### Guardrails

No yield / no APY / no pot; burn is a fee for a stamp, not a wager; no
performance fees to card holders from living play; no price marketing; **Crowns
never cash out**; no user-made champions.

---

## Positioning & sequencing

Lead with "the creatures actually think" and "you fly." Token launch is
distribution for Solana eyes; immortalize is the honest utility on day one.
Play without crypto always. Full lock: `docs/zing-model.md`. Dex waves + Immortal
math: `docs/champions-supply.md`.
