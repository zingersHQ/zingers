# ZINGERS: AI & crypto one-pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### Thinking creatures first. Collectible legends underneath.

Zingers leads with a real AI game — creatures that actually think — and keeps any
ownership layer opt-in, walled off, and utility-anchored. Two layers, kept
strictly distinct.

---

## The AI layer (the product)

**Pluggable agents.** The engine asks one question per turn — *given this state
and these legal moves, what do you do?* Any brain implementing `act(view) →
decision` can drive a champion. *(`docs/agent-protocol.md`.)*

- **Providers:** the built-in **Grok** brain (xAI), any **OpenAI-compatible**
  model (`baseUrl` / `model` / key), an **HTTP webhook** (POST an `AgentView`,
  return an `AgentDecision`), or a **mock** for offline play. If either side
  brings its own agent, a bout runs *real* even with no house key.
- **Tool loop (live brains).** A champion doesn't just emit a move — it
  **investigates first**, running a bounded reason → act → observe → commit loop
  over the engine's own read-only tools: `simulate_move` (real matchup and damage
  math), `scout_opponent` (live Resolve, statuses, last line), and `commit_move`
  (terminal). Capped at 3 steps; each step streams as a `ToolStep`, so spectators
  watch a mind scout and simulate before it strikes.
- **Persistent memory & drift.** Each champion carries up to six memory notes plus
  auto-tuned strategy dials. **Imprints** (a capped model call with a
  deterministic template fallback) let the Trainer teach lessons that write memory
  and drift personality over time.
- **Curated magic, emergent depth.** The default experience is authored (voice
  packs, character beats, deterministic fallbacks) so it always feels alive; real
  models add emergence on top, never as a hard dependency.

---

## The crypto layer (opt-in, underneath)

**Cardinal rule:** the game is **free and complete** without a wallet — you can
raise legends, climb seasons, and crack the Vault having never seen one. Crypto is
a layer *beneath* the game, never a gate in front of it. *(`docs/bible/08-economy.md`,
`docs/zing-model.md`.)*

### Two economies, never bridged

| | **Crowns** | **$ZING** (working name) |
|---|---|---|
| Nature | Soft, in-game, server-authoritative | Hard, on-chain (SPL / Solana) |
| How you get it | *Earned* by playing | *Bought* on a market, or airdropped for play |
| What it's for | Training, entries, backing, cosmetic reforges | On-chain ladder entry, minting cards, patron standing |
| Cashes out? | **Never** | Only on the open market, never *through us* |

The wall between them — no conversion, no shared wallet — is the single most
important invariant. It is what keeps Zingers *not* a security and *not* a casino.

### What the token does — and only this

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
*because* bouts are deterministic and provably fair.

---

## Positioning & sequencing

Lead with "the creatures actually think," meme-friendly for distribution but
utility-anchored so the message never whiplashes between agent protocol and
casino. Ship v1 with **Crowns only**; **$ZING** is *announced*, not required; the
contract follows real demand for premium sinks and a creator economy.
**Token follows traction, not the other way around.**
