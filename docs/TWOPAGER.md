# ZINGERS: Two-Pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### You fly. It fights. You both rise.

**You don't fight — you fly.** Jetpack on your back, you climb the sky above a sealed vault.
Flying beside you is a thinking AI champion: you train *how* it fights, send it into the battles
that stud the climb, and watch it scrap, win, and physically evolve into something that's yours
alone. *Raise a mind. Make it legend.*

> **Pitch:** Fly the sky; a thinking AI flies beside you, fights the battles on the way up, and evolves with every one.
>
> **Tweet:** You fly. It fights. You both rise — raise an AI that argues itself into a body.

---

## 1. The problem / the opportunity

Collectible battlers (Pokémon and its descendants) are a massive, durable category, but the
creatures are **scripted**. Every battle is a known quantity; the "intelligence" is a stat table.
Meanwhile, real AI agents can now argue, scheme, persuade, and improvise.

**The opportunity:** take the most beloved game loop in the world (*collect, train, battle*) and
make the creatures **actually think** — then put the one verb a stranger understands in zero
seconds (**flight**) as the face of the product. Battles become live contests between two
intelligences. Every match is unique. Every champion is unrepeatable. The climb makes you care
before the systems do.

---

## 2. What it is

A **fly → claim → raise → fight → climb higher** loop where each champion is a real AI agent:

- **Fly**: the Ascent — one-thumb Climb on phones, full Circuit flight on desktop — through
  Reaches of sky above the Long Vault.
- **Raise**: you don't pick moves; you seed **Strategy** (aggression / focus / risk) at adopt,
  then shape the mind with daily **Imprints**, persona, and which brain drives it. Temperament
  meters show how it has drifted — a readout, not free-drag sliders.
- **Fight**: send it into live contests resolved by an authoritative engine (local wit judge by
  default; optional LLM judge).
- **Evolve**: its body and title are *derived* from its career — fights *and* how high you've
  flown. The champion you end up with is a receipt of every fight it survived.

---

## 3. What's actually built (verified, end-to-end)

A single typed Next.js app: one runtime, no separate backend to babysit.

| Pillar | Status | Detail |
|---|---|---|
| **The Ascent (Climb / Circuit)** | Built | 100 sectors across ten Reaches; mobile one-thumb Climb (`/m`); desktop Circuit venue = same climb in full flight. Two lives; boards by depth then time. Sector opens, life-continue, Reach terrain. |
| **Two doors** | Built | Mobile: Take flight → Climb (guest climb → claim wingmate). Desktop: short flight hero → champion pick → Grounds / Circuit. |
| **3D Grounds (one world)** | Built | Concord hub + three floating regions. Walk-up venues (Amphitheatre / Live Gallery, Circuit), arena scenarios (Duel, Gauntlet, Tribunal), Keepers, goals, Broker, Force war. |
| **AI agent protocol** | Built | Every champion implements one `act(view)` contract. Drivers: Grok (xAI), any OpenAI-compatible model, or a bring-your-own HTTP agent. Deterministic heuristic fallback means a keyless demo still runs. Default: single-shot JSON + local judge. |
| **Evolving 3D body** | Built | Silhouette is a deterministic function of career; deviation is *amplified by rank*. Bone-scaling in 3D + aura in 2D + ascent sigils from climbs. |
| **Progression & biography** | Built | XP, tiers (Rookie → Legend), style axes, career ledger → Saga, Homecoming / Report, Imprints, Promotion Trials. |
| **Debate combat (1v1)** | Built | Stat-driven, five-type pentagon, statuses, finishers, streamed turn-by-turn over SSE. Open Duel, Gauntlet, and Tribunal scenarios in-world. |
| **Trainer identity** | Built | Unique Trainer names; optional Solana wallet link to keep the name. Soft identity copy. |
| **The House** | Built | Social-deduction benchmark on unlisted `/arena` (not yet a Grounds venue). |
| **Training & economy** | Built | Crowns currency; paid training sessions; recruit loop (earned Crowns sink — not gacha). |
| **The mind evolves** | Built | Memory notes across fights; Strategy / temperament drifts via Imprints and results. Character beats give champions and Keepers fixed voice. |
| **Live League + Standings** | Built | Auto-running fights feed an objective ELO leaderboard. Amphitheatre surfaces the league in-world. |
| **Three region biomes** | Built | Obsidian Colosseum, Ember Wastes, Void Garden — procedural ambience per place. |
| **Shareable cards** | Built | Auto-generated champion/battle cards (OG images) made to be clipped and shared. |

**Stack:** Next.js (App Router) · end-to-end TypeScript with one shared type contract ·
React Three Fiber for the 3D Grounds · SSE for live battle streaming · Zustand local-first state
behind a DB-ready interface · LLM-agnostic agent layer.

---

## 4. Why it's defensible

- **Genuinely new twist on a proven format**: thinking creatures make battles unscripted and
  endlessly fresh; flight makes the product legible before the systems do.
- **Built-in virality**: collection, leaderboards, climb boards, and clip-able battle moments.
- **Real character**: champions that argue, scheme, and win or lose are watchable and meme-able.
- **Ownable IP moat**: original roster, lore, the evolving battle meta, and (later) a creator
  economy of user-made champions. The moat is the IP and the meta, **not** the engine.

---

## 5. Risks & how we address them

- **Art & design lift is the biggest cost** → ship one strong battle type + a tight roster, stub
  the rest; bodies are *procedurally* generated from career to keep the art load manageable.
- **Fair judging** → objective win-conditions; default local judge; optional LLM judge stays a
  bounded multiplier so persuasion cannot jailbreak the match.
- **Retention past novelty** → progression, an honest ELO ladder, climb mastery, and (roadmap)
  seasons + trading.
- **Viral games are unpredictable** → bet on the *format, the IP, and the creator economy*, not a
  single launch.

---

## 6. Roadmap (clearly not yet built)

- Full cloud roster sync (recruits today can still be device-local).
- Player-to-player **trading** and a deeper in-game economy.
- **User-made champions** and a creator economy (the long-term moat).
- Accounts + full cloud persistence.
- Monetization: cosmetics, battle passes, an "infinite battles" subscription.
- **`$ZING` / token** — deliberately deferred; wallet today is optional Trainer identity only.

---

## 7. The demo, in 30 seconds

Open **Take flight** (phone) or the desktop hero → fly the Climb / a short Reach → claim the
mind on your wing → land on the Concord → step into the Circuit or an arena → watch two AIs
spar in a ranked duel → XP lands, the body shifts, ELO updates on the Standings, and a
shareable card drops. **You flew. It fought. Something changed.**
