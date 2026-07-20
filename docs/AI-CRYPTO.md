# ZINGERS: AI & crypto one-pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### Thinking creatures first. Collectible legends underneath.

Zingers leads with a real AI game — creatures that actually think — and keeps any
ownership layer opt-in, walled off, and utility-anchored. Two layers, kept
strictly distinct. Today a wallet is optional **Trainer identity** only; token
launch is deliberately deferred. *(`docs/flight-first-plan.md`, `docs/zing-model.md`.)*

---

## The AI layer (the product)

**Pluggable agents.** The engine asks one question per turn — *given this state
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
  scorer (still a bounded multiplier — never match-deciding alone).
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

**Cardinal rule:** the game is **free and complete** without a wallet — you can
raise legends, climb seasons, and crack the Vault having never seen one. Crypto is
a layer *beneath* the game, never a gate in front of it. *(`docs/bible/08-economy.md`,
`docs/zing-model.md`.)*

**Shipped today:** optional Solana wallet link (Phantom SIWS-style prove-ownership)
to keep a unique **Trainer name** across devices. No spend approvals. No token UI.

### Two economies, never bridged

| | **Crowns** | **$ZING** (working name) |
|---|---|---|
| Nature | Soft, in-game, server-authoritative | Hard, on-chain (SPL / Solana) — *not launched* |
| How you get it | *Earned* by playing | *Bought* on a market, or airdropped for play (future) |
| What it's for | Training, entries, backing, cosmetic reforges | On-chain ladder entry, minting cards, patron standing (future) |
| Cashes out? | **Never** | Only on the open market, never *through us* |

The wall between them — no conversion, no shared wallet — is the single most
important invariant. It is what keeps Zingers *not* a security and *not* a casino.

### What the token does — and only this (future)

1. **Pays opt-in on-chain ladder entry** via **burn-or-stake** — burn is a small
   consumed access fee (pure deflation); stake is a larger, **refundable-in-full**
   deposit that returns principal only. Stake persists across seasons, so loyal
   players lock capital and play free forever. **No yield, ever.**
2. **Mints permanence** — burn to immortalize a champion as an on-chain card. The
   art is deterministic from the career record, so **the token *is* the track
   record.** It fills provenance fields that already exist inert (`mintId`,
   `owner`, `chain`, `mintedSeason`) — a fill-in, not a refactor.
3. **Confers standing** — patron crests for backing a champion, dex provenance,
   and next-season airdrop *weight* earned by play.

### Guardrails (the indie-safe envelope)

No yield / no APY / no pot; **burn is a fee, not a wager**; all rewards are
cosmetic, standing, or allocation (never cash or performance-scaled payouts); no
price marketing; **Crowns never cash out**. The on-chain season close only works
*because* fights are deterministic and provably fair.

---

## Positioning & sequencing

Lead with "the creatures actually think" and "you fly," meme-friendly for
distribution but utility-anchored so the message never whiplashes between agent
protocol and casino. Ship with **Crowns only**; wallet = identity; **$ZING** is
*announced in docs*, not required in-product. **Token follows traction, not the
other way around.**
