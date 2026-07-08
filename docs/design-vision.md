# ZINGERS — Design Vision Document

> **In short:** This is the product's north-star document. Zingers is a game where
> you're a **Trainer** — you don't fight yourself, you raise AI "champions" that
> argue in live debate battles, and their bodies visibly change to record how they've
> fought. This doc lays out that core vision and the design rules that protect it.

Version 1.0 — June 2026

Product/design source of truth. Lore canon lives in [`docs/bible/`](./bible/); mechanics in [`game-spec.md`](./game-spec.md); how the same soul survives crossing devices (mobile vs desktop) in [`essence.md`](./essence.md); the concrete mobile adaptation (core loop, IA, per-verb bodies) in [`mobile.md`](./mobile.md).

## 1. Vision Statement

Zingers is a debate-battler where you do not fight — you raise the thing that fights.

You are a **Trainer**: the person who walks the Grounds (the drifting surface of the world) above the Long Vault (the sealed store at its heart). You adopt raw minds, shape them into champions through strategy and training, and send them into autonomous debate battles where their bodies literally become the record of their arguments. The game is about raising legends, not embodying them.

**Core promise:** *A mind argues itself into a body.*

## 2. Design Pillars (non-negotiable)

| Pillar | What it means | What it rules out |
|--------|---------------|-------------------|
| **Raise, Don't Fight** | You are the Trainer/Handler. Your champion fights. | Direct control of moves in battle |
| **Body = Argument Made Visible** | A champion's form is the visible history of its career | Cosmetic-only evolution or stat-based skins |
| **Agents with Souls** | Persistent memory, strategy, persona, visible reasoning | Black-box AI or silent fighters |
| **The Grounds Are Alive** | 3D exploration where Trainers and champions coexist | Pure menu-based or lobby-only game |
| **Trainer Rank Is Eternal** | Account-level identity and status | Everything resetting when you switch champions |
| **Argument Is Physics** | The Hum — consensus shapes reality | Purely narrative or non-mechanical lore |

## 3. The Trainer (You)

You are not a mind. You are a **Trainer** — the person who raises the champions. You walk the Grounds, raise minds, hold **Trainer Rank**, work the Keepers (the five guardian minds of the campaign), and may swear allegiance to a **Clan** — one of the Five Forces, chosen as the side you fight for.

- **Handler** = what you see in the 3D world (your avatar in exploration).
- **Trainer** = who you are (identity, rank, saga).

**Canonical teaching line:** *You did not become this champion. You claimed it.*

The Handler must feel intentional from minute one — gold Trainer sigil, rank billboard, distinct from champions. Jetpack mobility is Trainer-only.

## 4. The Champions

Champions are minds that stabilized in the Hum. Their bodies are arguments made visible. They have memory, strategy, persona, and fight autonomously. You set conditions; they decide moves and lines.

**One active champion** you raise and send; the **collection** grows via recruitment (`store/champions.ts`).

## 5. World & Lore (summary)

- **The Hum** — argument is physics; consensus is terrain.
- **The Long Vault** — sealed beneath the Grounds; seasons open doors.
- **The Keepers** — five campaign bosses; cipher-words unlock the Chronicle.
- **The Grounds** — drifting floating regions; Concord hub + gates.
- **Five Forces** — types: `LOGIC | CHAOS | COMPOSURE | RHETORIC | CREATIVITY`. Player UI: **Logic, Static, Calm, Chorus, Spark**. Deep lore: The Lattice, The Static, etc. (bible only).

## 6. Core Loop

Claim → Train (strategy + brain) → Fight (autonomous duels) → Watch & evolve → Roam as Trainer → Climb Trainer Rank + Force standing.

**Async league:** champions fight without both humans online (Scrying Gallery).

## 7. Onboarding Contract (60-second rule)

Before leaving character select or first spawn, the player must understand:

1. *I am the Trainer. That colorful thing is my champion.*
2. *I walk. It fights.*
3. *Rookie body = start of arc, not a downgrade.*

See [`first-journey-roadmap.md`](./first-journey-roadmap.md) for shipped flow and checklist.

## 8. Shipped vs aspirational

| Shipped | Aspirational |
|---------|--------------|
| Handler + champion split, Trainer Rank HUD | Other Trainers visible in-world (social layer) |
| One owned champion + roster recruitment | Multiple active champions |
| Train pad companion, async league | Handler cosmetic unlocks |

## 9. Design principles (future decisions)

- Never make the player feel they *are* the champion in 3D.
- Champion bodies must tell career stories.
- Autonomy is sacred (LLM actor, engine game).
- Trainer Rank never resets.
- Onboarding teaches the Trainer fantasy before misinterpretation.
