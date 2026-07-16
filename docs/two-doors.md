# ZINGERS — One soul, two doors (product-framing decision)

> **In short:** This doc answers "so what's this gonna be?" — the identity
> decision for the whole product. **Desktop is the product** (raise a legend in
> the living Grounds). **Mobile is the funnel** (a bus-time Climb game that turns
> out to be the lobby of the same world). The AI-agent layer is the invisible
> engine of both — sold as fantasy, never as tech. Crypto stays off to the side
> as fuel. Everything else in this doc is the concrete plan to make each of
> those sentences true, with file pointers, so it can be implemented directly.

Version 1.0 — July 2026. Decision record + implementation plan.
Companions: [`design-vision.md`](./design-vision.md) (north star),
[`essence.md`](./essence.md) (one soul, native bodies),
[`mobile.md`](./mobile.md) (the phone shell — **§3's default door is superseded
here**, see §3 below), [`growth-strategy.md`](./growth-strategy.md)
(distribution), [`zing-model.md`](./zing-model.md) (token),
[`vocabulary.md`](./vocabulary.md) (copy). Copy follows the vocabulary doc;
identifiers/analytics keys never change for copy reasons.

---

## 0. The decision, in five lines

1. **Desktop = the raise-lane, and the product.** The living 3D Grounds where a
   Trainer raises a legend. Nothing about its scope changes; what changes is
   *proof* — we instrument whether a stranger understands it (§5).
2. **Mobile = the funnel.** The **Climb is the door**: a cold visitor is flying
   within seconds ("bus-time game"), and the rest of the game (champion, watch,
   rank) reveals itself as the *lobby behind the game they're already enjoying*.
3. **Agents are the engine, not the pitch.** Player-facing surfaces sell the
   fantasy ("the creatures actually think"); the word "agent" lives only on
   developer surfaces (`/agents`, docs, protocol). The narrative is not hostage
   to AI — it is *enabled* by it.
4. **Crypto stays fuel.** Per [`zing-model.md`](./zing-model.md): $ZING is an
   optional premium layer, Crowns stay off-chain and server-authoritative, and
   no player-facing surface promises earnings before the creator economy exists.
5. **Web-first now; platforms later.** Steam/console are marketing beats after
   the Launch v0.1 gates are green, not engineering projects now (§6).

**The one-liner:** *One soul, two doors. Desktop: raise a legend. Mobile: a
30-second flight that happens to be the lobby of the same world.*

---

## 1. Why this framing (the reasoning we're committing to)

- The game's moat (per `AGENCY.md`) is original IP + an evolving battle meta +
  a future creator economy. All three depend on the minds being real — so we do
  **not** strip the agent layer to make a simpler game. But none of them require
  the *word* "agent" anywhere a player first lands.
- The Climb is the only verb a stranger understands in **zero seconds** (the
  Flappy Bird atom, `essence.md` §3). "Today's bout to call" — the door
  `mobile.md` §3 chose — presumes the visitor already cares about a champion.
  A cold visitor doesn't. So the *door* changes; the *body of the game behind
  it* (the tab shell, the spectate-lane thesis) does not.
- The Climb alone is a commodity (the hyper-casual ascender space is brutal,
  and we'd enter it as WebGL without an app store). What makes ours not-a-clone
  is precisely the soul thread: *the run marks your champion*, your champion
  flies beside you, and behind the door there's a mind you're raising. **Climb
  is the lobby, not the game.**
- Desktop's open questions ("would people understand it? is it fun? do they
  feel reward?") are exactly Launch v0.1 gates 1–2, and they are currently
  **unmeasured**. The answer is instrumentation, not redesign (§5).

### The test this doc must always pass

Every change below either (a) shortens a stranger's path to the soul, or
(b) measures whether that path works. Anything that does neither is out of
scope here.

---

## 2. Narrative positioning (what we say, everywhere)

**Sell the fantasy, not the tech.** The narrative we have — the Hum, the Long
Vault, the Keepers, *"a mind argues itself into a body"* — is a
creature-raising fantasy that AI makes possible. Pokémon never marketed its
creatures as state machines.

Rules (apply to every player-facing surface — landing, `/m`, store pages,
social copy):

1. **The magic line is:** "the creatures actually think — no two battles are
   the same." Never "AI agents battle each other."
2. **"Agent" is developer vocabulary.** It lives on `/agents`, in
   [`agent-protocol.md`](./agent-protocol.md), `docs/`, and the MCP surface.
   The nav already frames this correctly (`lib/play-nav.ts` "Build" group);
   keep it that way. Audit task: sweep player-facing strings for
   "agent"/"AI agent"/"LLM" (landing `components/home/landing.tsx`, `/m` tabs,
   `/howitworks`, share cards) and replace with fantasy copy — **copy only,
   never identifiers/keys** (per `vocabulary.md` and `AGENTS.md`).
3. **Crypto is invisible until it's real.** No $ZING mention on any game
   surface pre-launch. No "earn money" promises anywhere: the only sanctioned
   earning path is the future creator economy (user-made champions → royalties,
   Phase 5+), and it stays in docs until it exists.
4. **The reward vocabulary players *do* get:** your champion's **body** (the
   visible record of its career), **rank** (Trainer Rank + the ladder),
   **Crowns**, the **Saga**, your **rival**. These are the honest incentives —
   lead with them when copy asks "why play?".

---

## 3. Mobile: the Climb-first door (supersedes `mobile.md` §3 "default door")

### 3.1 What changes and what doesn't

| Kept from `mobile.md` | Changed by this doc |
|---|---|
| The bottom-tab shell (`components/mobile/mobile-shell.tsx`), all five tabs | The **default door** is no longer the Today tab |
| Phone = spectate/predict/share lane as the *depth* behind the door | The *door* is the Climb (perform first, care later) |
| "One soul, native bodies", every verb's atom | Climb gains a **guest mode** (see 3.3 — the atom is preserved) |
| No login; identity = device token (`lib/owner.ts`) | Copy: never "sign in" — **"Claim a mind"** |

### 3.2 The first screen: the poster

A cold visitor to `/m` (or a phone routed from Play, `lib/play-nav.ts`
`MOBILE_PLAY_HREF`) gets a **full-screen splash**, not a tab grid:

- **Art:** the epic image — the Trainer flying with the jetpack, their champion
  flying beside them. (Canon-perfect: *the Trainer flies, the champion fights.*)
  - Asset: a rendered poster. Options, in order of preference: (a) a static
    art asset (fastest, most control — **needs to be produced**, this is the
    one external dependency of the whole phase); (b) a live R3F scene reusing
    `ChampionPortraitScene` + the jetpack rig (zero new art, but WebGL cost at
    the worst possible moment — first paint). Start with (a).
- **Copy:** brand + tagline + one line of fantasy. Suggested: `ZINGERS` /
  *"Raise a mind. Make it legend."* / primary CTA **"FLY"**.
- **CTAs:** primary **Fly** → straight into the Climb (guest or owned, 3.3).
  Secondary, smaller: **"Your champion"** (owned trainers) or **"What is
  this?"** (→ Today tab / howitworks). Returning players with an owned champion
  may skip the splash entirely after the first session (see 3.5 flags).
- **New component:** `components/mobile/mobile-splash.tsx`, mounted by
  `MobileShell` as a pre-tab state. Session-scoped dismissal flag in
  `lib/brand.ts` `STORAGE` (e.g. `mSplash: "zingers_m_splash_v1"` —
  sessionStorage, so every cold open of a new session shows the poster, but
  in-session navigation never re-interrupts).

### 3.3 Guest Climb (the design decision that makes the door possible)

Today the Climb tab is **locked** until a champion is claimed
(`mobile-shell.tsx` `climbLocked`, ~line 50). A bus-time door cannot open on a
lock. Decision: **unlock it with a loaner.**

- **The loaner:** a "wild mind" — deterministic, from the current weekly
  rotation (`firstDuelStarterKeys()`, `lib/first-duel.ts`), so the guest sees a
  real champion fly beside them, not a placeholder. Seed the pick from the
  device token so the same visitor keeps meeting "their" wild mind (attachment
  before adoption).
- **The atom, preserved** (`essence.md` §2: the run *marks the champion*): a
  guest run **marks nothing** — and that's the hook, not a violation. Banner
  during/after a guest run: *"A wild mind flies with you. **Claim it** to keep
  your climb."* On claim, the current run's best depth converts into the first
  career mark (one-time, client-held until adoption, then written through the
  normal Climb reward path).
- **Boards:** guest runs never write the leaderboard (`/api/circuit` POST is
  simply not called without an owned champion — mirror the existing gating in
  `circuit-lite.tsx` `recordRun`). No new server surface needed for guests.
- **The claim moment:** after a fall (the natural pause), the retry card gains
  a second button: **"Claim this mind"** → the existing selection surface
  (`components/mobile/mobile-adopt.tsx` via the Champion tab). Never interrupt
  a live run with acquisition UX.
- **Code touchpoints:** `mobile-shell.tsx` (drop the lock → route guests into
  Climb with `loaner` prop; keep the lock *logic* as the "is guest" signal),
  `circuit-lite.tsx` (accept a `guestChampion?: string` prop; suppress
  board/reward writes while guest; show the claim banner), `mobile-adopt.tsx`
  (accept a preselected key so "Claim this mind" lands on the wild mind).

### 3.4 The shell behind the door

Unchanged in structure (Today · Watch · Champion · Climb · Rank), two
adjustments:

- **Exiting the Climb as a guest** lands on **Champion** (the claim surface),
  not Today — a guest has no "today" yet. Owned trainers keep the current
  behavior (back to last browse tab).
- **Copy:** no "sign in" anywhere. The acquisition verb is **claim**
  (`READER_COPY.claimLine` canon: *you did not become this champion, you
  claimed it*). The Trainer-code (`components/trainer-code.tsx`) remains the
  "bring your progress to another device" story — frame it as *"your Trainer
  sigil"*, never as an account.

### 3.5 Flags & measurement for the door

- `STORAGE.mSplash` (sessionStorage) — splash seen this session.
- New client events (see §5 for the mechanism): `m_splash`, `m_fly` (guest
  Fly tap), `m_guest_run` (first guest run started), `m_claim_from_climb`
  (adoption reached from the Climb hook). The door's success metric is
  **guest run → claim conversion**, visible on `/stats`.

### 3.6 Explicit non-goals (mobile)

- No app-store build, no separate mobile save, no accounts (all per
  `mobile.md` §4–5 — unchanged).
- No stripping of Watch/Today/Rank: the shell stays whole. We are re-ordering
  the door, not amputating the lobby.

---

## 4. Desktop: unchanged scope, plus one honesty rule

Desktop **is** the product and stays whole: the Grounds, Act 1, the venues, the
league, the saga. No redesign is part of this decision. Two commitments:

1. **"Online game you could ship anywhere" discipline.** Keep the game
   playable, complete and legible as a plain web game (it already is — Launch
   v0.1's six gates are exactly this bar). Anything that would *only* make
   sense inside a future wrapper (overlay SDKs, platform achievements) waits.
2. **The core-loop questions get measured, not debated.** "Would people
   understand it? is it fun? do they feel reward?" — §5 wires the funnel so
   these become dashboard numbers. Design reacts to the numbers *after* they
   exist.

**On incentives (the honest answer to "what does the player get?"):** identity
(the body as track record), standing (rank/ladder/war), story (saga, rival),
and one pure-skill lane (the Climb/Circuit — the only place the Trainer
performs). There is deliberately **no** money-earning promise (§2.3). If
playtests show the reward loop is thin, the lever is making *watching* more
dramatic (the debate lines, the Highlight, the judge) — not adding extrinsic
rewards.

---

## 5. Measurement: turn gates 1–2 from assumptions into numbers

This is the highest-leverage work in the whole doc. Today the funnel is coarse
(`session → claim → train → bout → return`, `lib/server/track.ts`). The
first-journey steps and time-to-first-evolution are invisible.

### 5.1 New events (aggregate counters — same privacy posture, no per-user trail)

Extend `Z_EVENTS` in `lib/server/track.ts`:

```
fj_cinematic   // FirstRun cinematic completed (not skipped)
fj_pick        // champion picked in first-duel funnel
fj_tune        // doctrine tuned (first journey)
fj_duel        // first duel finished
fj_evolve      // evolve card seen (the payoff moment)
fj_land        // Concord landing reached
ttfe_u5 | ttfe_u8 | ttfe_over   // time-to-first-evolution bucket (see 5.3)
m_splash | m_fly | m_guest_run | m_claim_from_climb   // the mobile door (§3.5)
```

All are **client events** (only the browser sees these moments): add them to
`CLIENT_EVENTS` in `app/api/track/route.ts`, fire via the existing
fire-and-forget helper (`lib/track.ts`). Analytics stays non-fatal,
rate-limited, aggregate-only.

### 5.2 Fire points (desktop first journey)

| Event | Where it fires |
|---|---|
| `fj_cinematic` | `components/intro/first-run.tsx` — cinematic complete |
| `fj_pick` / `fj_tune` / `fj_duel` / `fj_evolve` | `components/intro/first-duel.tsx` — the funnel's step transitions (pick → tune → fight → evolve card) |
| `fj_land` | the Concord-landing beat (`components/grounds/grounds-screen.tsx`, the guided-funnel/first-landing path around the `guideWorld` logic) |

Fire each **once per browser** (localStorage latch alongside the existing
first-run flags in `STORAGE`) so the funnel reads as unique-visitor steps, not
replays.

### 5.3 Time-to-first-evolution (gate 1) without per-user tracking

The tracker is aggregate-only, so we bucket client-side: stamp
`performance`-independent wall-clock at first session start (localStorage,
alongside the `new_user` latch in `lib/track.ts`), and when `fj_evolve` fires,
send exactly one of `ttfe_u5` / `ttfe_u8` / `ttfe_over` (<5 min, 5–8 min,
>8 min). Gate 1 is green when the sub-8-minute share is a healthy majority of
new users — visible as three bars on `/stats`.

### 5.4 Dashboard

Extend the funnel array in `getAnalytics` (`lib/server/track.ts` ~line 83) with
the `fj_*` steps and render the deeper funnel + TTFE buckets in
`components/stats/stats-screen.tsx`. This turns "would people understand the
game?" into a chart with a bounce-point.

---

## 6. Platforms (Steam, console): posture, not project

- **Now:** nothing. Web-first is the strategy, not a compromise — zero-install
  is what makes the mobile door and share cards work as growth.
- **After the six Launch v0.1 gates are green:** a Steam release is a
  *marketing beat* implemented as a wrapper (Electron/CEF-class shell around
  the same Next.js build). Prereqs to note (not build): offline-tolerant boot
  screen, keyboard/gamepad-only path through menus, no reliance on a visible
  browser URL bar for navigation.
- **Console:** genuinely a port + certification + likely a real accounts
  system. Explicitly post-accounts (Phase 6), not on any current roadmap.
- **Rule until then:** don't add web-only *dead ends* (surfaces that assume
  a second browser tab or external links to progress the core loop).

---

## 7. Implementation plan (ordered; each slice ships alone)

> Effort scale: **quick** = within a session · **session** = one focused
> session · **deep** = multiple sessions.

### T0 — Measurement first (desktop funnel + TTFE) — *session*
The instrumentation of §5. No visible product change; unblocks every "is it
understandable/fun?" debate with data. **Do this before touching the mobile
door** so the door's effect is measurable from day one.
- Files: `lib/server/track.ts`, `app/api/track/route.ts`, `lib/track.ts`,
  `components/intro/first-run.tsx`, `components/intro/first-duel.tsx`,
  `components/grounds/grounds-screen.tsx`, `lib/stats-types.ts`,
  `components/stats/stats-screen.tsx`, `lib/brand.ts` (latch keys).
- Accept: `/stats` shows the 6-step first-journey funnel + 3 TTFE buckets;
  events fire once per browser; `npm run build` + lints clean.

### T1 — Guest Climb (the unlock) — *session/deep*
§3.3. The Climb runs with a loaner wild mind for visitors with no champion;
claim hook on the fall card; no board/career writes while guest.
- Files: `components/mobile/mobile-shell.tsx`, `components/grounds/circuit-lite.tsx`,
  `components/mobile/mobile-adopt.tsx`, `lib/first-duel.ts` (export the seeded
  pick if needed).
- Accept: fresh browser → `/m` → Climb tab playable immediately; falling shows
  "Claim this mind"; claiming lands on adoption with that mind preselected;
  guest depth never appears on `/api/circuit` boards; owned-champion behavior
  byte-identical to today.

### T2 — The splash door — *session*
§3.2. `mobile-splash.tsx` + default-door rewiring + `STORAGE.mSplash` +
`m_*` events. **Depends on the poster asset** — if art isn't ready, ship with
a typographic poster (brand + tagline over a dark gradient) and swap the image
later; don't block the flow on the asset.
- Accept: cold phone visit → poster → one tap → flying; returning owned
  trainer skips to their last browse tab; splash never re-shows in-session.

### T3 — Vocabulary sweep (fantasy, not tech) — *quick*
§2.2. Audit player-facing strings for "agent/AI/LLM"; replace with fantasy
copy. Copy only — no identifier, key, or route changes.
- Files: `components/home/landing.tsx`, `components/mobile/*`, `/howitworks`,
  share-card copy. `/agents`, `/readme`, docs stay technical.
- Accept: `rg -i "\bagents?\b|\bLLM\b" components app --glob '*.tsx'` returns
  only developer surfaces (`/agents`, docs renderers) and code comments.

### T4 — Read the numbers, then decide — *ops, recurring*
After T0–T2 have a week of traffic: read the funnel bounce-point, the TTFE
buckets, and guest→claim conversion on `/stats`. **The next product decision
(deepening watch-drama vs. shortening onboarding vs. mobile-door iteration)
is made from that chart**, not from intuition. Feeds the weekly ledger.

### Dependencies & open questions

- **Poster art** (T2) — the one external asset. Owner: human.
- **Splash for owned trainers**: current call is skip-after-first-session;
  revisit if returning players report missing the "front door" feel.
- **Guest depth → first career mark on claim** (3.3): the one-time conversion
  needs a small design pass on *which* reward path writes it (suggest: the
  normal Climb reward path with the guest depth replayed as one run). Punt-able:
  T1 ships without the conversion (claim just unlocks marking from then on).
- **Unrelated but sequenced before all of this:** the four device-verify items
  already in the ledger (Climb feel, Amphitheatre, live-bout latency). Decide
  the door only after confirming the door feels good on a phone.

---

## 8. What this doc deliberately does NOT change

- The desktop game's scope, the engine, ELO, the judge bounds, Crowns
  server-authority — untouched (guardrails in `AGENCY.md`).
- `mobile.md`'s shell architecture, verb bodies, and M1–M3 sequencing — still
  the plan for the lobby's depth. Only its §3 *default door* is superseded.
- The Launch v0.1 six gates — this doc *serves* gates 1, 2 and 5; it replaces
  none of them.
- Analytics/event keys, `bout` vocabulary in code — stable, per `AGENTS.md`.
