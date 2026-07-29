# ZINGERS: Two-Pager

**zingers.gg** · **@zingersHQ** · **zingers.org** (tech & docs)

### You fly. It fights. You both rise.

**You don't fight. You fly.** Jetpack on your back, you climb the sky above a sealed vault.
Flying beside you is a thinking AI champion: you train *how* it fights, send it into the battles
that stud the climb, and watch it scrap, win, and physically evolve into something that's yours
alone. *Raise a mind. Make it legend.*

> **Pitch:** Fly the sky; a thinking AI flies beside you, fights the battles on the way up, and evolves with every one.
>
> **Tweet:** You fly. It fights. You both rise. Raise an AI that argues itself into a body.

---

## 1. The problem / the opportunity

Collectible battlers (Pokémon and its descendants) are a massive, durable category, but the
creatures are **scripted**. Every battle is a known quantity; the "intelligence" is a stat table.
Meanwhile, real AI agents can now argue, scheme, persuade, and improvise.

**The opportunity:** take the most beloved game loop in the world (*collect, train, battle*) and
make the creatures **actually think**. Then put the one verb a stranger understands in zero
seconds (**flight**) as the face of the product. Battles become live contests between two
intelligences. Every match is unique. Every champion is unrepeatable. The climb makes you care
before the systems do.

---

## 2. What it is

A **fly → claim → raise → fight → climb higher** loop where each champion is a real AI agent:

- **Fly**: **Flight** (one soul on phone and desktop) through Reaches of sky above the Long Vault.
- **Claim**: pick from a weekly rotating starter pool (one mind per Force) drawn from the First
  Minds and a growing collectible dex.
- **Raise**: you don't pick moves; you seed **Strategy** (aggression / focus / risk) at adopt,
  then shape the mind with daily **Imprints**, persona, and which brain drives it. Temperament
  meters show how it has drifted: a readout, not free-drag sliders.
- **Fight**: send it into live contests resolved by an authoritative engine (local wit judge by
  default; optional LLM judge).
- **Evolve**: its body and title are *derived* from its career: fights *and* how high you've
  flown. Phenotype + bone morph make same-Force minds look like different species.

---

## 3. What's actually built (verified, end-to-end)

A single typed Next.js app: one runtime, no separate backend to babysit.

| Pillar | Status | Detail |
|---|---|---|
| **Flight** | Built | 100 sectors across ten Reaches; mobile one-thumb (`/m`); desktop Circuit venue = same Flight soul. Three lives; boards by depth then time. |
| **Two doors** | Built | Mobile: Take flight (guest flight → claim wingmate). Desktop: short flight hero → champion pick → Hub / Flight. |
| **3D world (one map)** | Built | Hub + three floating regions. Walk-up venues (Amphitheatre / Live Gallery, Circuit), arena scenarios (Duel, Gauntlet, Tribunal), goals, Broker, Clan war. |
| **AI agent protocol** | Built | Every champion implements one `act(view)` contract. Drivers: Grok (xAI), any OpenAI-compatible model, or a bring-your-own HTTP agent. Deterministic heuristic fallback means a keyless demo still runs. Default: single-shot JSON + local judge. |
| **Collectible dex** | Built | Eight First Minds + later minds (lineage echoes); weekly starter rotation. |
| **Evolving 3D body** | Built | Force archetype + seeded phenotype + career bone morph; Flight sigils from climbs; deviation amplified by rank. |
| **Progression & biography** | Built | XP, tiers (Rookie → Legend), style axes, career ledger → Saga, Homecoming / Report, Imprints. |
| **Debate combat (1v1)** | Built | Stat-driven, five-type pentagon, statuses, finishers, streamed turn-by-turn over SSE. Open Duel, Gauntlet, and Tribunal scenarios in-world. |
| **Trainer identity** | Built | Unique Trainer names; optional Solana wallet link to keep the name. Soft identity copy. |
| **Training & economy** | Built | Crowns currency; paid training sessions; recruit loop (earned Crowns sink. Not gacha). |
| **The mind evolves** | Built | Memory notes across fights; Strategy / temperament drifts via Imprints and results. Character beats give champions fixed voice. |
| **Live League + Standings** | Built | Auto-running fights feed an objective rating board. Amphitheatre surfaces the league in-world. |
| **Three region biomes** | Built | Obsidian Colosseum, Ember Wastes, Void Garden. Procedural ambience per place. |
| **Shareable cards** | Built / sharpening | Champion OG + Climb challenge links; next: richer Flight/bond cards from real meshes. |

**Stack:** Next.js (App Router) · end-to-end TypeScript with one shared type contract ·
React Three Fiber for the 3D Grounds · SSE for live battle streaming · Zustand local-first state
behind a DB-ready interface · LLM-agnostic agent layer.

---

## 4. Why it's defensible

- **Genuinely new twist on a proven format**: thinking creatures make battles unscripted and
  endlessly fresh; flight makes the product legible before the systems do.
- **Built-in virality**: Flight challenge shares, climb boards, collection, and bond cards (wingmate + ascent). Battles are depth, not the share hook.
- **Real character**: champions that argue, scheme, and win or lose are watchable and meme-able.
- **Ownable IP moat**: original roster we craft, lore, the evolving battle meta, and (later)
  a collector layer (trading, provenance, optional mint). The moat is the IP and the meta,
  **not** the engine. No user-made champions.

---

## 5. Risks & how we address them

- **Art & design lift is the biggest cost** → ship one strong battle type + a tight roster, stub
  the rest; bodies are *procedurally* generated from career to keep the art load manageable.
- **Fair judging** → objective win-conditions; default local judge; optional LLM judge stays a
  bounded multiplier so persuasion cannot jailbreak the match.
- **Retention past novelty** → progression, honest standings, climb mastery, and (roadmap)
  seasons + trading.
- **Viral games are unpredictable** → bet on the *format, the crafted IP, and collectors*, not a
  single launch.

---

## 6. Roadmap (clearly not yet built)

- Player-to-player **trading** and a deeper collector economy (provenance, optional mint).
- Accounts + full cloud persistence.
- Monetization: cosmetics, battle passes, an "infinite battles" subscription.
- **`$ZING` / token**. Deliberately deferred; wallet today is optional Trainer identity only.

---

## 7. The demo, in 30 seconds

Open **Take flight** (phone) or the desktop hero → fly with a mind on your wing → claim that
wingmate → share a Climb challenge or bond card → raise (Imprints) → meet fights on the way
up when the climb asks. Body and sigil mark the sky you shared. **You flew. It stayed with
you. Something changed.**
