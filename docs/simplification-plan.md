# Simplification & Variety Plan (DRAFT)

> **Status: draft / proposal. Not canon yet.** Lives in `docs/` (design), not
> `docs/bible/`. Once we commit, the naming decisions here get promoted into
> `docs/vocabulary.md`, `lib/lore/glossary.ts`, and the bible; the region-variety
> decisions extend `docs/region-variety.md`.
>
> **Goal:** a newcomer should understand the game in one sitting with *normal
> language*, meet **~6 concepts** at first (not ~36), and feel that the places
> they visit are genuinely different — not "the same colosseum in three colors."
> Do it **without breaking saves, share URLs, code identifiers, or the SSE/battle
> engine.**

---

## 0. The problem, in the player's words

Two complaints, both fair:

1. **Too many names, too fast.** "concord is a level? what is the grounds? a
   world? or the specific level? why is the URL `/grounds` no matter what world?"
   Plus jargon that reads as gibberish to a stranger — the first-run coda literally
   opens **"Roam, duel, raise."** and "the Long Vault, a sealed golden seal… where
   the Hum thins." That's five proper nouns before the player has done anything.
2. **The places feel the same.** Three founding regions all render as *a ring
   arena in the middle of a flat plaza*, differing only by palette, sky, and a
   few terrain knobs. `biomes.ts` says it out loud: *"One parametric world, many
   skins."* Mechanically they differ (Tribunal / Gauntlet / Duel) but they don't
   **look or feel** different at a glance.

We already have the right instincts on paper — `docs/vocabulary.md` (voice policy)
and `docs/region-variety.md` (three axes of depth). They just don't go far enough
and aren't fully enforced. This plan tightens both and makes them concrete.

---

## 1. Principles (the guardrails)

1. **Plain-first, flavor-later.** There are two layers. The **plain layer** (intro,
   landing, first-duel, HUD, mobile tabs, buttons) uses normal words a stranger
   knows. The **flavor layer** (the bible, `/glossary`, deep menus, Sagas) is where
   coined names live. A coined name may *only* appear in the plain layer if it's
   glossed in the same clause **and** it's one of the ~6 budgeted concepts.
2. **One idea, one word.** Kill synonyms. Never two names for one thing
   (Circuit *and* Climb; roam *and* explore; region *and* slab).
3. **Prefer the plain word.** Keep a coined term only when a plain word would lose
   real flavor. When in doubt, plain wins.
4. **Concept budget.** First-touch introduces **6 nouns, in order** (see §2).
   Everything else is revealed in context, later, one at a time.
5. **Copy, not code.** This is overwhelmingly a *visible-text* change. Do **not**
   rename identifiers, props, object keys, `localStorage` keys, event kinds, or
   URL/query params. (`concord`, `grounds`, `circuit`, `roam` as *code ids* stay.)
6. **Save/share compatible.** No stored value or share URL changes meaning.
7. **Variety is config + a little bespoke code**, never a hand-built level per
   region (keep the engine parametric — `docs/region-variety.md` principle 1).

---

## 2. The concept budget — what a newcomer meets, in order

The **only** six nouns allowed in first-touch copy (intro → take flight → first
duel → landing). Each shown with the plain gloss to reuse verbatim:

| # | Term | Plain gloss (reuse this wording) |
|---|---|---|
| 1 | **Trainer** | "you — you raise the fighter, you don't fight" |
| 2 | **Champion** | "your AI fighter; it argues, adapts, has its own voice" |
| 3 | **Fly** / the flight game | "fly up through the sky; your champion flies beside you" |
| 4 | **Battle** (a **duel**) | "a one-on-one debate; drain the other's confidence to win" |
| 5 | **the Hub** | "where you land — gates here lead out to places to fight" |
| 6 | **Crowns** | "what you earn and spend; you can't buy it" |

**Deferred to later, in context (never in onboarding):** Region, Gate, Tower,
Reach, Camp, Force, the Wheel, Clan, Sigil, Saga, Imprint, Persona, Tier, Card,
Rarity, Fragment, Resolve, Tribunal, Gauntlet, the Long Vault, the Hum, the
Keepers, Season, Live Gallery.

> These aren't deleted — they surface the first time they're *relevant* (e.g.
> "Clan" appears when you first choose one, glossed then), not dumped up front.

---

## 3. Naming decisions (today → plain)

Legend: **KEEP** (fine as-is) · **RENAME** (change visible copy) · **DEMOTE**
(keep as lore/deep-menu only, plain word in first-touch) · **KILL** (remove word).

| Today (visible copy) | Verdict | Player-facing going forward | Notes / where flavor survives |
|---|---|---|---|
| **Trainer** | KEEP | Trainer | Plain and accurate. |
| **Champion** | KEEP | Champion | — |
| **the Grounds** (the whole 3D world) | RENAME (D2) | **"the world"** in first-touch; keep "the Grounds" as its proper name in lore only | Root cause of the `/grounds` confusion. Never name a *region* "the Grounds." See §4. |
| **the Concord** (the hub) | DEMOTE (D1) | **"the Hub"** (plain) in first-touch/HUD | "Concord" survives as the Hub's proper name in lore/`/glossary`. See §4. |
| **roam** ("Roam, duel, raise.", "roam the Grounds") | KILL | **"explore"** / "fly around" | Trigger word. Kill in *all* copy incl. `lib/first-duel.ts` coda and `docs/mobile.md` headings. Code layer id `roam` in `lib/play-nav.ts`/`lib/hub.ts` stays. |
| **Circuit** / **Climb** / **the Ascent** (as mode names) | RENAME (D3) | **"Flight"** | Never show *Circuit* / *Climb* / *the Ascent* as a mode label. Code (`circuit-*`, `climb-*`) stays. |
| **Reach** (sky band) | DEMOTE | show plain **progress** (e.g. "Sky 3 of 10" or a bar); "Reach" as optional flavor subtitle | Don't make the newcomer learn "Reach" to read their altitude. |
| **Camp** (rest point) | DEMOTE | **"rest stop"** / "checkpoint" feel via UI, not a taught noun | Keep "Camp" in lore only. |
| **Region** | KEEP | **region** (or "place/area") | Fine. Just never collides with "the Grounds" (§4). |
| **Gate** | KEEP | Gate | Already de-Vaultgated. |
| **Vaultgate** | KILL | Gate | Copy only; component name may stay. |
| **Tower** | KEEP (defer) | Tower | Not in onboarding; introduce when relevant. |
| **Tribunal / Gauntlet / Duel** | KEEP | Tribunal / Gauntlet / Duel | These ARE the variety (§5). Duel is the plain default; the other two get a one-line gloss at the gate. |
| **Force / the Wheel** | KEEP (defer) | Force / the Wheel | Plain names (Logic/Static/Calm/Chorus/Spark) already exist in `canon.ts`. Introduce at Clan pick, not onboarding. |
| **the Long Vault / the Hum / the Chronicle** | DEMOTE | keep OUT of first-touch | Deep lore only. "Season" replaces "the Chronicle" in copy (already policy). |

**Net effect:** the words a *new* player must learn drops from ~16 glossed terms
to the **6** in §2. The rest still exist — they just wait their turn.

---

## 4. Fixing the "Grounds / Concord / region / URL" collision

This is the single most confusing knot. Today **"the Grounds"** means three things
and `/grounds` serves all of them:

- the **whole 3D world** (canon: "a cluster of floating regions"),
- the **URL** (`/grounds`) for every region and the hub,
- experientially, the **default region** (Obsidian Colosseum + Tribunal) you first
  land near.

**Recommended model (plain, one word per thing):**

| Thing | Plain name (copy) | Proper name (lore) | Code id (unchanged) | URL (unchanged) |
|---|---|---|---|---|
| The whole explorable 3D place | **the world** | the Grounds | `grounds` | `/grounds` |
| The central landing area with the gates | **the Hub** | the Concord | `concord` | `/grounds` (hub view) |
| A place you fly out to and fight in | **a region** (name it: the Colosseum, the Wastes, the Garden) | (region proper names) | region ids | `/grounds?…` |

Rules that fall out of this:
- **Never** call a region "the Grounds." A region is *the Colosseum* / *the Wastes*
  / *the Garden*.
- The **Hub** is not a region and not a "level" — it's the lobby with gates. Copy:
  *"You're in the Hub. Fly through a gate to reach a region and fight."*
- `/grounds` staying the URL is fine — it's the world's route. We just stop
  *saying* "the Grounds" at the player as if it were a place they're standing in.

> **Why not rename the URL per region?** Not worth it — share links, deep links,
> and stored state ride on `/grounds`. Changing routes is high-risk for near-zero
> player benefit. The confusion is a *copy* problem, not a *routing* problem.

---

## 5. Region & scenario variety (so three places stop feeling the same)

`docs/region-variety.md` already diagnosed this and lists three axes (Scenarios /
Settlements / Traversal). This section makes a **decisive, minimal commitment**:
each founding region must differ on **three felt axes at a glance** — silhouette,
verb, and atmosphere — before we add any new modes.

### 5.1 The three founding regions, differentiated

| Region | Verb (what you DO) | Silhouette (must differ!) | Atmosphere | Traversal hazard |
|---|---|---|---|---|
| **The Colosseum** | **Tribunal** — argue an assigned side to a jury | tiered **stone ring**, grandstands | cool, formal, courtroom | tight stone climb to the Peak |
| **The Wastes** | **Gauntlet** — survive a rising chain, press luck | open **lava caldera**, *no* grandstand — a pit, not a stadium | hot, hazy, oppressive | lava-gapped scramble (rift = real damage) |
| **The Garden** | **Duel** (open) — pick your fight; reframe-biased | **floating platforms / atelier**, *no ring at all* | slow, luminous, dreamlike | long bioluminescent glide |

**The core fix for "three same colosseums":** today all three draw the same
`PitArena` ring in a flat plaza (`components/grounds/structures.tsx`,
`components/grounds/districts.tsx`). We give **Garden a non-ring arena** (platform
cluster) and **Wastes a caldera pit with no tiered grandstand**, so the three read
as different buildings from the sky, not three palettes of one building. This is
config + one bespoke arena variant each — not new levels (`biomes.ts` already has
`arena: "ring" | "pit"`; add `"platforms"`).

### 5.2 Scenario labels stay, but each gets a one-line plain gloss at the gate

At the gate, before entering, show: **name + one plain line** (reuse `blurb` from
`lib/scenarios/registry.ts`, simplified):
- **Duel** — "Pick a fight, one on one."
- **Gauntlet** — "Keep winning to grow the prize, or stop and bank it."
- **Tribunal** — "Argue the side you're given to a jury."

So the *variety is legible before you commit*, in normal words.

### 5.3 What we are NOT doing now

New scenarios (Siege, Relay, Atelier-as-mode), functional settlements, and
seeded parkour courses from `region-variety.md` are **out of scope for this pass**.
This pass = naming + making the three existing regions *visibly and verbally*
distinct. Those are the next bang once this lands.

---

## 5b. HUD & menu declutter (in-world chrome)

Naming is only half the overwhelm — the *chrome density* is the other half. Three
fixes, all copy/markup-level:

### 5b.1 Simplify the menu ("the user hub")
The M-key **Navigate** overlay (`components/game-dock.tsx`, fed by `NAV_GROUPS`
in `lib/play-nav.ts`) shows **4 sections / 9 links**. The dizziness comes from the
**Learn** pile — five near-duplicate reference links (How it works, Gallery,
Catalogue, Docs, Whitepaper). A newcomer opening the menu should see *where to
play and where their stuff is*, not a documentation index.

**Recommended reduction (destinations preserved, just fewer top-level links):**

| Section | Today | Proposed |
|---|---|---|
| Play | Play | **Play** (unchanged) |
| You | Collection, Rank | **Collection, Rank** (unchanged) |
| Learn | How it works, Gallery, Catalogue, Docs, Whitepaper | **How it works, Gallery** (keep the two a player uses) |
| Build | Train AI | **Train AI** (unchanged) |

Catalogue / Docs / Whitepaper are tagged **`secondary`** in `NAV_GROUPS`: still
shown in the **site header** (so they stay discoverable — "reachable elsewhere"),
but filtered out of the two **in-world hubs** via a derived `HUB_NAV_GROUPS`
(consumed by `game-dock.tsx` and the player-hub "Navigate" panel). This is the
surgical fix — the site header keeps every destination; only the immersive chrome
declutters. Net in-world: **9 → 6 links**, "Learn" = How it works + Gallery. Also
fixed the `play` blurb "Walk the Grounds…" → plain "Explore the world: train,
fight, and play its games." **Decision D6: resolved (keep How it works + Gallery).**

### 5b.2 Remove the champion pill (top-right)
The **WINGMATE {name}** chip (`components/grounds/grounds-screen.tsx` ~L2710) is
redundant — the champion is *right there flying beside you*, and its name shows on
its card/dossier. Remove the chip; keep the `PlayerHub` (Trainer identity + Crowns)
as the single top-right cluster. Pure markup removal, no state change.

### 5b.3 "Lv" → "Level"
Spell it out in the Trainer hub (`components/grounds/player-hub.tsx` — the pill
`Lv {tl.level}` and the expanded `{handle} · Lv {tl.level}`). Optional consistency
pass on `components/grounds/trainer-badge.tsx` (several `Lv` labels) so the whole
game says **Level**. Copy-only; the `tl.level` value is untouched.

---

## 6. Implementation phases (smallest safe step first)

Each phase is independently shippable and reversible. Copy phases carry near-zero
risk; structural/visual phases are gated behind review.

### Phase 0 — Copy-only, first-touch (highest leverage, lowest risk) — **Done**
Applied across desktop **and** mobile: first-run coda, landing, first-duel,
HUD/coach copy, hub labels, toasts, region display names (`worlds.ts` — "The
Colosseum"/"The Ember Wastes"/"The Void Garden", never "The Grounds"), mobile
tab + tile ("Flight"), and the shared `READER_COPY` lines. Change *visible strings
only*. No code ids, keys, props, or routes.
- Rewrite the first-run coda in `lib/first-duel.ts` (`concordLanding`): kill
  "Roam, duel, raise." and the dense Long Vault/Hum paragraph → the §2 six-concept
  copy. New opener e.g. *"You're a Trainer now. Your champion flies beside you —
  fly higher, and fight when a gate asks."*
- `components/intro/first-run.tsx`, `components/home/landing.tsx`,
  `components/intro/first-duel.tsx`: enforce the §2 budget; remove "roam."
- HUD/labels: never show "Circuit"/"Climb"/"Concord"/"roam" — use Flight / Hub /
  explore (`components/grounds/circuit-hud.tsx`, `lib/play-nav.ts` labels,
  `components/grounds/grounds-screen.tsx` coach copy).
- Ascent altitude readout: plain progress instead of "Reach N"
  (`components/grounds/circuit-lite.tsx`, `world.tsx`).
- **Risk:** trivial. **Rollback:** revert strings.

### Phase 1 — Glossary & policy source of truth — **Done**
- `lib/lore/glossary.ts`: "The world"/"The Hub"/"Flight"/"Flight sigil" headwords
  with `was:` tags; Region entry now names the three founding regions.
- `docs/vocabulary.md`: canonical term map gains the world/Hub/explore/Flight rows;
  the "keep but gloss" list is now the 6-concept budget + a flavor-layer list.
- `docs/bible/09-glossary.md` mirrored.
- **Risk:** docs/data only.

### Phase 2 — Region silhouettes (visual differentiation) — **Done**
Root cause found: the Colosseum and the Void Garden were the **same building**
(both `surround: "tiers", arena: "ring"`); only Ember differed. The safe,
isolated fix shipped:
- Added a **`grove`** surround (`GroveRing` in `structures.tsx`) — a ring of
  luminous crystal spires — and switched the **Void Garden** to it
  (`biomes.ts`). It reuses the exact `ColosseumWall`/`CalderaRim` idiom (rift
  entrance gap, one instanced draw, per-spire colliders, stable `mulberry(113)`
  seed) so nothing about gameplay, the arena centre, or RNG order changes.
- Result at a glance: Colosseum = violet stone colonnade + ring; Ember Wastes =
  molten caldera + pit; Void Garden = teal crystal grove + ring. Three distinct
  silhouettes, three palettes.
- Follow-up (shipped): Void `arena: "platforms"` (floating atelier discs; grove
  surround kept) + Ember `PitArena` retuned as an open caldera floor (sparse
  shards, no stadium teeth).
- **Risk taken:** low — additive, scoped to Void's surround only.

### Phase 0b — HUD & menu declutter (§5b)
- Remove the WINGMATE champion pill (`grounds-screen.tsx`). **Done.**
- `Lv` → `Level` in `player-hub.tsx` (+ `trainer-badge.tsx`). **Done.**
- In-world hubs show `HUB_NAV_GROUPS` (secondary/doc links filtered); site header
  keeps all (`lib/play-nav.ts`, `game-dock.tsx`, `player-hub.tsx`). **Done (D6).**
- **Risk:** trivial (markup/copy). Reversible by dropping the `secondary` flags.

### Phase 3 — Gate briefing polish — **Done**
- The travel veil already shows `title: w.name` + `sub: w.tagline`; rewrote the
  `worlds.ts` taglines to carry the plain verb ("Tribunal — argue the side you're
  given", "Gauntlet — keep winning to grow the prize", "Duel — pick a fight, one
  on one"), so entering a region reads the region name + what you'll do.
- **Risk:** low (copy only).

> **Cross-cutting:** apply every copy change to **both desktop and mobile**
> surfaces (`components/grounds/*` and `components/mobile/mobile-shell.tsx`,
> `docs/mobile.md` headings), per the standing "standardize across bodies" ask.

---

## 7. Guardrails — what must NOT change

- **Code identifiers:** `concord`, `grounds`, `circuit`, `climb`, `roam` (layer id),
  `doctrine()`, `Vaultgate` component, region ids — all stay.
- **URLs / query params:** `/grounds` and all params unchanged.
- **localStorage keys / event kinds / SSE semantics:** unchanged. Presentation
  only (AGENTS.md arena-juice rule).
- **Battle engine, scoring, Wheel, Forces canon** (`lib/lore/canon.ts`): untouched.
- **Share ids** (e.g. `"House Grok"`): untouched (open question in `vocabulary.md`).
- **Frame-rate independence / reduced-motion** rules (AGENTS.md) still apply to any
  new visual in Phase 2.

---

## 8. Decisions

**Resolved (2026-07-23):**
- **D1 — the hub → "the Hub"** in player copy; "the Concord" survives as its lore
  proper name only. Code id `concord` unchanged.
- **D2 — the world → "the world"** in first-touch copy; "the Grounds" survives as
  the world's proper name in lore only; never names a region. URL `/grounds`
  unchanged.
- **D3 — the flight game → "Flight"** in all player copy. Never show
  *Circuit* / *Climb* / *the Ascent* as a mode label. Code (`circuit-*`,
  `climb-*`) unchanged.

**Resolved:**
- **D6 — Menu cut (§5b.1):** in-world hubs keep How it works + Gallery; Catalogue /
  Docs / Whitepaper are `secondary` (site header only). Implemented.

**Resolved (implemented):**
- **D4 — Region silhouettes:** grove surround for Void; later platforms centre +
  Wastes pit tune shipped (see Phase 2 follow-up).
- **D5 — Sky progress:** the HUD shows plain sector progress (N / total) and the
  band's flavor name; the taught noun "Reach" is out of first-touch (kept in lore).

---

## 9. Suggested order of execution

1. **Decide D1–D3** (naming) — unblocks all copy.
2. **Phase 0** (first-touch copy) — ship the biggest clarity win immediately.
3. **Phase 1** (glossary + vocabulary.md as the enforced source of truth).
4. **Phase 3** (gate briefings) — cheap, reinforces the plain scenario names.
5. **Decide D4/D5**, then **Phase 2** (region silhouettes) as its own reviewed PR.

Each step is reversible and none touches saves, routes, or the engine.
