# ZINGERS — Mobile adaptation spec (the whole game on a phone)

> **In short:** This is the concrete, buildable spec for adapting the *whole*
> Zingers loop to a phone — not a minigame, the game. It applies the "one soul,
> native bodies" principle ([`essence.md`](./essence.md)) to the real systems in
> this repo, decides the **mobile core loop** and **information architecture**,
> and specs a native body for every verb. Where `essence.md` says *why*, this
> says *what we build on mobile and in what order.*

Version 0.1 — July 2026. Companion to [`design-vision.md`](./design-vision.md)
(north star), [`essence.md`](./essence.md) (principle), and
[`growth-strategy.md`](./growth-strategy.md) (distribution). **Read before building
any mobile surface.** Copy follows [`vocabulary.md`](./vocabulary.md).

---

## 0. The honest starting point

Today the *only* door into the game is the immersive 3D world at `/grounds`
(`lib/play-nav.ts`: "Play → /grounds"). That world is already the most
mobile-adapted surface we have (full on-screen touch controls in
`components/grounds/world.tsx`, an `isMobile`-aware HUD in `grounds-screen.tsx`).
But it is a **desktop-shaped door**: a heavy WebGL third-person world is the wrong
*first* thing to hand a phone user, and it's not where the game's soul or its
growth engine live.

What is genuinely **not** adapted for phones: the two surfaces that ARE the soul —
`app/arena/page.tsx` (spectating a bout) and `app/standings/page.tsx` (the ladder)
are fixed desktop grids. There is no phone-native shell tying the verbs together,
and the one-thumb Circuit we prototyped (`/circuit-lite`) is a detached island.

So: we built the peripheral performer-verb and skipped the core. This spec fixes
the framing.

---

## 1. The mobile thesis (decided — grounded in the docs)

**The phone is the spectate-lane; the desktop is the raise-lane.** This is not a
new idea — it is already the stated strategy in `growth-strategy.md` §3.4.2:

> *"Battles and the Tribunal grid must be flawless on a phone even if the 3D
> Grounds stays desktop-first. Spectate/predict/share on mobile; raise/train in
> the Grounds."*

And it is the honest reading of `design-vision.md`'s pillar **"Raise, Don't
Fight"**: the deep raising happens in the living 3D Grounds (desktop's strength);
the phone's job is the *watchable, shareable, check-on-your-champion* soul that
`growth-strategy.md` bets the whole game on (the "adopt → train → evolve
attachment loop… make champions maximally watchable and shareable").

**Therefore the phone's core loop is:**

> **Open on today's bout → call the winner → watch it argue → see your champion's
> result & how its body changed → share it → nudge its strategy → climb.**

Every step already exists as a *system* in the repo; almost none has a *phone
body*. That gap — not new mechanics — is the whole job.

Two bodies, one soul, restated for this product:

| | **Mobile body** | **Desktop body** |
|---|---|---|
| Center of gravity | **Watch + predict + share + check on your champion** (lean-back, one-thumb, 30-second sessions) | **Roam + raise** the living Grounds (lean-forward, six-DOF, long sessions) |
| First door | **Today** (a bout to call, right now) | The 3D world (`/grounds`) |
| The Circuit | one tab (the one place you *perform*) | a venue inside the world |
| Both must be | complete on its own — not a demo, not a flex | complete on its own |

---

## 2. The soul atoms → mobile bodies (per verb)

Each verb's atom is from `essence.md` §2. "Reuses" points at the real system so
we build bodies, not re-implementations. Copy uses player words (glossed on first
use); code identifiers are unchanged (`vocabulary.md` "copy, not code").

| Verb | Soul atom (invariant) | Mobile body | Reuses (systems that already exist) |
|---|---|---|---|
| **Spectate** | two minds argue to a **clear winner**, and **you have a stake** | full-screen vertical bout: turn-by-turn lines, Resolve (HP) bars, the Highlight; a "call it first" gate; a **20-sec highlight** mode for the impatient | `components/arena/use-bout.ts` (SSE reveal), `lib/engine/*`, `app/api/battle` |
| **Predict** (the stake) | an **honest call** before the result; a streak you don't want to break | tap A/B before the bout, spoiler-free; streak counter; the **Daily Tribunal** as the "Wordle of AI debates" (one shared bout/day, emoji-grid share) | `predict`/`predictResult` + `commitBet` (`store/champions.ts`), Daily Tribunal (`components/grounds/daily-sheet.tsx`, `/api/daily`) |
| **Raise / Train** | you shape **how the mind thinks**; the run **marks its body** | a lean "Champion" screen: the 3-dial strategy (risk/focus/aggression), a paid training tap, and the body visibly reshaping | `setStrat`/`trainChampion`/`evolveTrained` (`store/champions.ts`), `DoctrineDial`, phenotype render |
| **Champion (identity)** | one **persistent** mind whose body records its career | the champion's card/diary: last-bout recap in persona, evolution before/after, sigils, Force, rank | career-derived body, memory notes (`learnFromBout`), OG card (`/c/[key]`, `/api/card`) |
| **Climb** (the Circuit) | ascend; altitude = score; **one fall resets**; marks the champion | the one-thumb jetpack we built — now a **tab**, device-routed, reachable | `components/grounds/circuit-lite.tsx` (Slice 0–2 done) |
| **Rank** | an **objective, honest** record of standing | compact standings + your champion's rank card + the live feed | `app/standings/page.tsx` logic, `/api/ladder`, `/api/feed`, `/api/me` |
| **Roam** (the Grounds) | you are **present in the world above the Long Vault** | *deliberate call — see §5 Open decisions*; leaner presence surface OR desktop-gated | `components/grounds/*` |
| **Persuade** (Keepers) | out-talk a guarded mind; the crack is **shareable** | one-screen quick-crack + share streak | `components/guardian/game.tsx` |

---

## 3. Information architecture (the phone shell)

Replace "the only door is the 3D world" with a **native mobile shell**: a
persistent **bottom tab bar** (thumb-reachable) over full-screen views. Proposed
tabs, ordered by the core loop:

1. **Today** *(home / default door)* — the day's bout to call, your streak, your
   champion's latest result, "what changed" since you last looked. This is the
   30-second session. (New surface; composed from Daily Tribunal + `/api/me` +
   champion diary.)
2. **Watch** — the live/async league: a vertical feed of bouts to spectate &
   predict; the Amphitheatre on a phone. (Mobile body of `app/arena` +
   `components/grounds/amphitheatre.tsx`.)
3. **Champion** — your one mind: body, strategy dials, train, diary, card, Force.
   The mobile raise-lane. (Mobile body of the train/collection surfaces.)
4. **Climb** — the Circuit (our one-thumb tab). (`/circuit-lite`, integrated.)
5. **Rank** — standings + feed + your rank card. (Mobile body of `app/standings`.)

Notes:
- `lib/play-nav.ts` already carries `short` labels ("Dex", "Rank", "Guide"…) and
  a `DOCK_H` placeholder — it was built anticipating a bottom dock. Use it.
- The 3D **Grounds** is reachable from Champion/Today as "Enter the Grounds" but
  is **not** a bottom tab on phone (§5 decides how far it adapts).
- Detection must be **unified**: today `isTouch` (coarse pointer) and `isMobile`
  (`max-width: 640px`) are recomputed independently in `grounds-screen.tsx`,
  `world.tsx`, and `first-run.tsx`. Add one shared `useIsMobile()`/`useIsTouch()`
  (new, `lib/`), and a single routing decision for "serve the mobile shell."

---

## 4. Cross-cutting requirements

- **One identity everywhere.** Same Trainer (identity/rank, `lib/owner.ts` token +
  handle, no login) and same one owned champion across mobile and desktop. Mobile
  writes to the *same* career ledger — no separate mobile save.
- **Everything marks the champion (growth-doc law).** Every mobile action that the
  player performs must write to the career or hook back to raise/evolve — never a
  detached score. (This is why the Circuit already grants depth→XP + ascent sigil;
  apply the same test to every new mobile surface.)
- **Zero-friction entry (keep).** First bout watched requires no signup/key/
  download — the heuristic fallback already allows this (`growth-strategy.md`
  §3.4.4). The mobile Today tab must honor it: you can call & watch before you own
  anything, then "claim the mind you just watched."
- **Share is native to mobile.** The share artifact (emoji grid now; clip later)
  is a first-class button on Today/Watch, not an afterthought. (Clip export is a
  known gap, `growth-strategy.md` §3.1.3 — spec'd as a dependency, not built here.)
- **Moderation before growth.** Any mobile spectating that fans out publicly
  inherits the launch-blocking moderation requirement (`growth-strategy.md`
  §3.4.1). Flag as a hard dependency for the public mobile spectate push.

---

## 5. Decisions (defaulted to recommendation; revisit anytime)

These gated the build; resolved to the recommended defaults so the spec is
actionable. Alternatives kept for the record — reopen any if a playtest disagrees.

1. **Roam adaptation — DECIDED: desktop-gate.** The full 3D Grounds stays
   desktop-first; mobile expresses presence through the **Champion tab** (your
   champion "lives" there — diary, body, mood), not a phone 3D world. This ships
   fast and keeps pillar #4 honest via presence-of-your-champion rather than a
   lobby list. *Earn the leaner 2.5D living surface later if the phone needs more
   "place."* (Alt: build the 2.5D presence surface now.)
2. **Shell — DECIDED: a dedicated device-routed mobile shell segment** that reuses
   the engine/store/hooks (`use-bout.ts`, `store/champions.ts`, ladder APIs) but
   **not** the desktop page layouts. Cleanest native IA, fastest. (Alt: make each
   existing page responsive.)
3. **Persistence — DECIDED: ship on Trainer-code now** (`components/trainer-code.tsx`,
   `lib/owner.ts`), no login required; full accounts/cloud persistence is tracked
   as a **parallel** growth dependency (`growth-strategy.md` §3.2.1), not a blocker
   for M0–M2. (Alt: wait for accounts first.)
4. **Circuit platform semantics** (scenery / hazard / landing) — still parked;
   independent of the mobile IA.

---

## 6. Reuse vs build (so scope is honest)

**Reuse as-is (logic is UI-agnostic):** the bout engine + SSE reveal
(`use-bout.ts`, `lib/engine/*`, `/api/battle`), prediction + commit-reveal wallet
(`store/champions.ts`, `lib/wallet-client.ts`, `/api/wallet`), strategy/training
(`setStrat`/`trainChampion`), ladder (`/api/ladder|feed|me|challenge`), roster,
the Circuit, career-derived body render, OG cards.

**Build new (the actual mobile work):**
- a unified `useIsMobile`/`useIsTouch` + the device-routing decision;
- the **mobile shell** (bottom tab bar + full-screen view host);
- **mobile Watch** (vertical bout view + predict gate + 20-sec highlight) — the
  phone body of `app/arena`;
- **mobile Today** (daily bout to call + streak + champion "what changed" + share);
- **mobile Champion** (body + strategy dials + train + diary + card);
- **mobile Rank** (compact standings + feed + rank card) — phone body of
  `app/standings`;
- **integrate `/circuit-lite`** as the Climb tab (device-route + reach it from the
  shell; stop it being an island);
- (dependencies, tracked not built here) clip export; moderation layer; accounts.

---

## 7. Sequencing (proposed slices)

- **M0 — foundation:** unified device hook + the mobile shell + bottom tab bar,
  with the already-built Circuit wired in as the first real tab. (Proves the shell
  with something that works today.)
- **M1 — the soul:** mobile **Watch** (spectate + predict) + mobile **Today**
  (daily call + streak + share). This is the core loop and the growth engine.
- **M2 — attachment:** mobile **Champion** (strategy + train + diary + evolution
  reveal) + mobile **Rank**. Closes "check on / raise your champion" on the phone.
- **M3 — presence:** the Roam call from §5.1 (lean presence surface or the
  champion-lives-here surface) + Persuade/Keepers quick-crack.
- **Dependencies (parallel, per growth-strategy sequencing):** moderation layer,
  accounts/persistence, clip export.

---

## 8. The test (from essence.md)

For each surface we build, before it ships: **write its one-line soul atom.** If
the mobile version and the desktop version share that line, it's one game. If the
player performs it with their hands, it must write to the champion's career — or it
doesn't ship. The Circuit taught us the failure mode: a great body with no thread
back to the soul is just a detached minigame. This spec exists so the rest of the
phone doesn't repeat that.
