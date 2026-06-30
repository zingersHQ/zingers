# ZINGERS — Design Vision Document

Version 1.0 — June 2026

Product/design source of truth. Lore canon lives in [`docs/bible/`](./bible/); mechanics in [`game-spec.md`](./game-spec.md).

## 1. Vision Statement

Zingers is a debate-battler where you do not fight — you raise the thing that fights.

You are a **Reader**: a will that walks the Grounds above the Long Vault. You adopt raw minds, shape them into champions through doctrine and training, and send them into autonomous debate battles where their bodies literally become the record of their arguments. The game is about raising legends, not embodying them.

**Core promise:** *A mind argues itself into a body.*

## 2. Design Pillars (non-negotiable)

| Pillar | What it means | What it rules out |
|--------|---------------|-------------------|
| **Raise, Don't Fight** | You are the Reader/Handler. Your champion fights. | Direct control of moves in battle |
| **Body = Argument Made Visible** | A champion's form is the visible history of its career | Cosmetic-only evolution or stat-based skins |
| **Agents with Souls** | Persistent memory, doctrine, persona, visible reasoning | Black-box AI or silent fighters |
| **The Grounds Are Alive** | 3D exploration where Readers and champions coexist | Pure menu-based or lobby-only game |
| **Reader Rank Is Eternal** | Account-level identity and status | Everything resetting when you switch champions |
| **Argument Is Physics** | The Hum — consensus shapes reality | Purely narrative or non-mechanical lore |

## 3. The Reader (You)

You are not a mind. You are a **Reader** of the Long Vault — the persistent will that walks the Grounds, raises minds, holds **Reader Rank**, works the Keepers, and may swear **Allegiance** to one of the Five Forces.

- **Handler** = what you see in the 3D world (your avatar in exploration).
- **Reader** = who you are (identity, rank, saga).

**Canonical teaching line:** *You did not become this champion. You claimed it.*

The Handler must feel intentional from minute one — gold Reader sigil, rank billboard, distinct from champions. Jetpack mobility is Reader-only.

## 4. The Champions

Champions are minds that stabilized in the Hum. Their bodies are arguments made visible. They have memory, doctrine, persona, and fight autonomously. You set conditions; they decide moves and lines.

**One active champion** you raise and send; the **collection** grows via recruitment (`store/champions.ts`).

## 5. World & Lore (summary)

- **The Hum** — argument is physics; consensus is terrain.
- **The Long Vault** — sealed beneath the Grounds; seasons open doors.
- **The Keepers** — five campaign bosses; cipher-words unlock the Chronicle.
- **The Grounds** — drifting region-slabs; Concord hub + gates.
- **Five Forces** — types: `LOGIC | CHAOS | COMPOSURE | RHETORIC | CREATIVITY`. Player UI: **Logic, Static, Calm, Chorus, Spark**. Deep lore: The Lattice, The Static, etc. (bible only).

## 6. Core Loop

Claim → Train (doctrine + brain) → Fight (autonomous duels) → Watch & evolve → Roam as Reader → Climb Reader Rank + Force standing.

**Async league:** champions fight without both humans online (Scrying Gallery).

## 7. Onboarding Contract (60-second rule)

Before leaving character select or first spawn, the player must understand:

1. *I am the Reader. That colorful thing is my champion.*
2. *I walk. It fights.*
3. *Rookie body = start of arc, not a downgrade.*

See [`first-journey-roadmap.md`](./first-journey-roadmap.md) for shipped flow and checklist.

## 8. Shipped vs aspirational

| Shipped | Aspirational |
|---------|--------------|
| Handler + champion split, Reader Rank HUD | Other Readers visible in-world (social layer) |
| One owned champion + roster recruitment | Multiple active champions |
| Train pad companion, async league | Handler cosmetic unlocks |

## 9. Design principles (future decisions)

- Never make the player feel they *are* the champion in 3D.
- Champion bodies must tell career stories.
- Autonomy is sacred (LLM actor, engine game).
- Reader Rank never resets.
- Onboarding teaches Reader fantasy before misinterpretation.
