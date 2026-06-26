# ZINGERS: Two-Pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### Raise a mind. Make it legend.

**You don't fight. You raise an AI champion that does.** Adopt a thinking AI, train *how* it
fights, send it into the ring, and watch it scrap, win, and physically evolve into something
that's yours alone.

> **Pitch:** Adopt an AI that fights for itself and evolves with every battle. You train it, it becomes legend.
>
> **Tweet:** You don't fight: you raise an AI that does, and it evolves with every battle.

---

## 1. The problem / the opportunity

Collectible battlers (Pokémon and its descendants) are a massive, durable category, but the
creatures are **scripted**. Every battle is a known quantity; the "intelligence" is a stat table.
Meanwhile, real AI agents can now argue, scheme, persuade, and improvise.

**The opportunity:** take the most beloved game loop in the world (*collect, train, battle*) and
make the creatures **actually think.** Battles stop being scripted and become live contests
between two intelligences. Every match is unique. Every champion is unrepeatable.

---

## 2. What it is

A **collect → train → battle → evolve → climb** loop where each champion is a real AI agent:

- **Train**: you don't pick moves; you shape a *doctrine* (risk / focus / aggression), a persona,
  and which brain drives the champion. It learns.
- **Battle**: send it into live contests judged by an engine or model, not a script.
- **Evolve**: its body and title are *derived* from its career. The champion you end up with is a
  receipt of every fight it survived.

---

## 3. What's actually built (verified, end-to-end)

A single typed Next.js app: one runtime, no separate backend to babysit.

| Pillar | Status | Detail |
|---|---|---|
| **3D Grounds (one world)** | Built | Concord hub + three region-slabs. Walk-up venues (Amphitheatre, Circuit), arena scenarios (Duel, Gauntlet, Tribunal), Keepers, goals, Broker, Force war. |
| **Act 1 onboarding** | Built | First journey: cinematic intro → starter pick → doctrine tune → Void Garden first duel → evolve → Concord landing → free roam. |
| **AI agent protocol** | Built | Every champion implements one `act(view)` contract. Drivers: Grok (xAI), any OpenAI-compatible model, or a bring-your-own HTTP agent. Deterministic heuristic fallback means a keyless demo still runs. |
| **Evolving 3D body** | Built | Silhouette is a deterministic function of career; deviation is *amplified by rank* (rookies ≈0.6×, legends ≈4.4×). Bone-scaling in 3D + aura in 2D. |
| **Progression** | Built | XP curve, levels, five tiers (Rookie → Adept → Veteran → Elite → Legend), five style axes (aggression, control, resilience, flair, creativity), doctrines/titles, sigils. |
| **Debate combat (1v1)** | Built | Stat-driven, five-type pentagon, statuses, finishers, streamed turn-by-turn over SSE. Open Duel, Gauntlet, and Tribunal scenarios in-world. |
| **The Circuit** | Built | 10-sector jetpack time trial; one fall restarts from sector 1; shared leaderboard by depth then time. |
| **The House** | Built | Social-deduction benchmark on unlisted `/arena` (not yet a Grounds venue). |
| **Training & economy hooks** | Built | "Crowns" currency, paid training sessions that visibly evolve the body and shift the build. |
| **The mind evolves** | Built | Champions keep memory notes across bouts and gently auto-tune doctrine toward what just worked. Character beats (`lib/lore/character-beats.ts`) give champions and Keepers fixed voice. |
| **Live League + Standings** | Built | Auto-running bouts feed an objective ELO leaderboard, the honest climb. Amphitheatre surfaces the league in-world. |
| **Three region biomes** | Built | Obsidian Colosseum, Ember Wastes, Void Garden — procedural ambience per place (`lib/ambience-scores.ts`). |
| **Shareable cards** | Built | Auto-generated champion/battle cards (OG images) made to be clipped and shared. |

**Stack:** Next.js (App Router) · end-to-end TypeScript with one shared type contract ·
React Three Fiber for the 3D Grounds · SSE for live battle streaming · Zustand local-first state
behind a DB-ready interface · LLM-agnostic agent layer.

---

## 4. Why it's defensible

- **Genuinely new twist on a proven format**: thinking creatures make battles unscripted and
  endlessly fresh.
- **Built-in virality**: collection, leaderboards, and clip-able battle moments drive organic
  sharing.
- **Real character**: champions that argue, scheme, and win or lose are watchable and meme-able.
- **Ownable IP moat**: original roster, lore, the evolving battle meta, and (later) a creator
  economy of user-made champions. The moat is the IP and the meta, **not** the engine.

---

## 5. Risks & how we address them

- **Art & design lift is the biggest cost** → ship one strong battle type + a tight roster, stub
  the rest; bodies are *procedurally* generated from career to keep the art load manageable.
- **Fair judging** → objective win-conditions or a trusted judge; persuasion outcomes resolve to
  game-state to remove jailbreak incentives.
- **Retention past novelty** → progression, an honest ELO ladder, and (roadmap) seasons + trading.
- **Viral games are unpredictable** → bet on the *format, the IP, and the creator economy*, not a
  single launch.

---

## 6. Roadmap (clearly not yet built)

- Gacha pulls and a real **collection** acquisition loop.
- Player-to-player **trading** and an in-game economy.
- **User-made champions** and a creator economy (the long-term moat).
- Accounts + cloud persistence (state is local-first today, behind a swappable interface).
- Monetization: cosmetics, battle passes, pulls, an "infinite battles" subscription.

---

## 7. The demo, in 30 seconds

Open the Grounds → run Act 1 (pick a mind, tune doctrine, win your first duel) →
land on the Concord → walk to an arena or step into The Circuit → watch two AIs
spar in a ranked duel → XP lands, the body shifts, ELO updates on the Standings,
and a shareable card drops. **Two characterful AIs really battling, with a clear
winner, collectible, competitive, and clip-able.**
