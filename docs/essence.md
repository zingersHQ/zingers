# ZINGERS — Essence & the "One Soul, Native Bodies" principle

> **In short:** Zingers is one game with one soul, but that soul is meant to be
> *played* on very different hardware. This doc names how we hold both truths at
> once: the **soul is identical everywhere**; the **body it wears is designed for
> the room it's played in**. It defines the invariant "soul atom" of each thing
> you do, and the rule every future feature is measured against.

Version 1.0 — July 2026

> **Direction note (July 2026, Flight-First):** This doc discovered the principle
> *through* the Circuit ("the flappy bird was hiding inside the codebase", §3).
> `design-vision.md` v3.0 and [`two-doors.md`](./two-doors.md) v2.0 then promoted
> that finding to the top of the product: **the Climb/Ascent is now the spine and
> face of the game, not one verb among five.** Nothing in this doc's principle or
> atoms changes — it was already right, and it already lists Climb first. Read the
> Climb rows below as *the keystone verb the others hang off*, and see
> [`flyover.md`](./flyover.md) for how the flight previews every other verb.

Companion to [`design-vision.md`](./design-vision.md) (the north star) and
[`game-spec.md`](./game-spec.md) (the mechanics). Where those say *what* Zingers
is, this says *how the same Zingers survives crossing from a phone to a desktop.*
The concrete, buildable application of this principle to the phone — the mobile
core loop, information architecture, and a native body per verb — lives in
[`mobile.md`](./mobile.md).

## 1. The principle

> **One soul, native bodies.** The atom is invariant on every device; the body
> it wears is designed — not down-ported, not up-scaled — for the hardware in the
> player's hands.

This is the disciplined form of "one base, many games." It rejects two failure
modes we've seen kill cross-platform games:

- **Down-port** — "mobile is desktop minus stuff." The phone gets a crippled,
  apologetic version. (Restriction.)
- **Up-flex** — "desktop is mobile plus shine." The rich device gets a thin
  mobile game wearing better lighting. (Waste.)

Instead: each device gets a **first-class experience that is complete on its own**,
and every one of them shares the *same soul in the chest* — so a player who plays
on their phone and their laptop feels they are living in **one** game, told at the
complexity the room can carry.

The difference between devices is **not primarily the GPU.** It is the **degrees
of freedom of the input.** A phone offers one trustworthy precise input (a thumb:
tap / hold); a desktop offers six (move, look, jump, thrust, and the nuance
between them). "Native body" means: design for the input the device actually has,
then make it beautiful there.

## 2. The soul atom (what may never differ)

For "one soul" to be real and not a slogan, each core verb has an **atom** — the
handful of truths that must hold identically on every device. Everything *not* in
the atom (camera, degrees of freedom, art density, duration, control scheme) is
**body**, and bodies are free — encouraged — to differ.

| Verb | Soul atom (invariant, all devices) | Body (free to differ per device) |
|------|------------------------------------|----------------------------------|
| **Climb** (the Circuit) | You *ascend*; altitude is the score; **one fall returns you to zero**; the run **marks your champion**. | One-thumb hold-to-thrust vs. 6-DOF free flight; 2.5D vs. full 3D. |
| **Spectate** | Two minds argue to a **clear winner**, and **you have a stake** in the outcome. | Full live bout vs. highlight-clip + predict-the-winner; 6-minute watch vs. 20-second call. |
| **Roam** | You are **present in the world above the Long Vault**; you tend and claim. | Full 3D free-roam vs. a leaner presence surface. |
| **Persuade** (the Keepers) | You **out-talk a guarded mind**; argument is physics; the crack is **shareable**. | In-world shrine vs. a one-screen quick-crack. |
| **Climb the ladder** | An **objective, honest** record of standing. | How and where it's surfaced. |

**The test for any new feature:** name its atom in one line. If two device
versions share that line, it's one game. If they don't, you've built a second
game that competes with the soul — and the growth-doc law applies: *never ship a
detached experience without a raise/evolve hook back to the champion.*

## 3. Worked example — the Circuit is our "flappy bird"

Flappy Bird stripped to its atom is: *sustained ascent against gravity; altitude
is the score; one fall resets you to zero.* That is **already** the Circuit
([`circuit.ts`](../components/grounds/circuit.ts)): a sector climb, a leaderboard
by depth-then-time, one fall restarts from sector 1. The jetpack is already a
**hold-to-thrust boolean** ([`jetpack.tsx`](../components/grounds/jetpack.tsx),
`flyingRef`) — the vertical axis is *already one input*. The flappy bird was
hiding inside the codebase; we just wrapped it in six degrees of freedom.

Because the jetpack is **Trainer-only** (canon: the champion fights, the Trainer
flies), the Circuit is the *one* place the player performs with their own hands
without breaking the "Raise, Don't Fight" pillar. It is the performer-soul that
complements the spectator-soul.

### Two native bodies, one soul

| | **Mobile body** ("cool") | **Desktop body** ("incredible") |
|---|---|---|
| Freedom | one thumb: hold-to-thrust, auto-forward, thread the gates | 6-DOF free flight: move, look, thrust, lead the camera |
| Frame | 2.5D, on-rails, the vista comes *to* you | full 3D, you *choose* the line up the vista |
| Feeling | subway-instant, one-more-try, ragebait | a stream showpiece, mastery, drama |
| Designed as | its own complete game, not a demo | its own complete game, not a flex |

Neither is the other's leftovers.

### What a run *means* (the reward, split by soul vs. craft)

This resolves the cross-device fairness problem cleanly:

- **Depth is soul → shared, cross-device.** "How high you climbed above the Long
  Vault" is a lore fact about your **Trainer**, not a twitch benchmark. So
  **depth → Trainer Rank + an ascent sigil baked onto the champion's body.** One
  identity, everywhere.
- **Time / mastery is craft → native, per-device.** A one-thumb time and a 6-DOF
  time cannot honestly share a column (that would *force* one body onto the
  other's terms — the restriction we reject). So **time → Crowns + separate
  mobile / desktop leaderboards.**

One portable *identity* record; two honest *skill* expressions.

### The quiet unification

Pillar #2 of the whole game is **"Body = argument made visible."** If an ascent
stamps a sigil/aura onto the *champion's body*, the body no longer records only
the champion's debates — it records the **Trainer's own climbs** too. The one
place *you* perform folds back into the master pillar. The flappy bird stops
being an appendix and becomes another sentence in the champion's autobiography.

## 4. The whole game under the lens

The Circuit was the lens that found the principle; the principle governs
everything. Every row shares an atom; every cell is designed for its room.

| Verb | Shared soul (the base) | Mobile body | Desktop body |
|------|------------------------|-------------|--------------|
| **Climb** | ascend, altitude = score, one fall resets, marks champion | one-thumb jetpack | 6-DOF flight |
| **Spectate** | two minds argue, clear winner, you have a stake | highlight clip + predict-the-winner | full live SSE bout, visible reasoning, stream kit |
| **Roam** | present in the world above the Long Vault; tend & claim | leaner presence surface | full 3D free-roam |
| **Persuade** | out-talk a guarded mind; argument is physics; shareable crack | one-screen quick-crack + share streak | in-world at the shrine |
| **Climb the ladder** | objective, honest standing | compact standings + card | full standings, rivalries, seasons |

The **base that never forks:** the champion (career, memory, strategy, persona,
career-derived body), the Five Forces, the lore/IP and glossary vocabulary,
Trainer Rank (eternal), Crowns, Clan allegiance, and the ELO ladder outcomes.

## 5. Where the principle strains (be honest)

"One soul, native bodies" is a strong tool, not a magic one. Two places it
genuinely resists, and must be handled with eyes open:

1. **Spectating duration.** A 6-minute live bout is a hard sell on a phone. The
   principle survives *only* if we define spectating's atom as **"a contest
   resolves and you have a stake"** — *not* "you watch the whole thing." Then
   mobile's honest native body is **predict-the-winner + a highlight clip**, and
   desktop's is the **full live bout**. This is exactly the earlier instinct that
   "on mobile you don't watch fights" — and it's correct, *provided* the stake
   (the prediction) preserves the soul. Watch-length is body; having-a-stake is
   soul.

2. **"The Grounds Are Alive" vs. a lean mobile roam.** Design pillar #4 rules out
   a "pure menu-based or lobby-only game." A stripped 2.5D mobile roam risks
   violating that pillar outright. Resolution: mobile's roam body must still be a
   **place you are present in** (a living surface, not a menu) — leaner geometry,
   fewer degrees of freedom, but not a list. If we can't keep it a *place*, we
   admit "The Grounds Are Alive" is a desktop-led pillar and give mobile a
   different, honest expression of presence — but we make that call deliberately,
   not by accident.

## 6. Rules this creates (for future work)

- **State the atom.** Before building any feature on a second device, write its
  one-line soul atom. If the two versions don't share it, stop.
- **Design native, don't port.** Start from the device's real input (one thumb /
  six DOF), not from the other device's build.
- **Both must be complete.** Neither version may feel like the other's demo or
  flex. "Good on its own" is the bar.
- **Soul is shared, craft is native.** Identity/progression records (depth, rank,
  sigils, the champion) are cross-device; skill leaderboards are per-device-family.
- **Everything marks the champion.** No detached scores. If the player performs
  it with their hands, it writes to the career ledger — or it doesn't ship
  (growth-doc law).
