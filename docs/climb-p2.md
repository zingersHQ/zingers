# Climb P2 — Progress & economy (buildable task list)

> **In short:** P2 turns the Climb from a pure one-more-try score attack into a
> **campaign that marks the champion**. It adds **camps** (persistent Reach
> waystations you light), **scout runs** (practice from a lit camp, unranked,
> fractional rewards), **first-light chests**, the **sigil growth** that makes
> depth a cross-device identity fact, and the **§7 reward table** wired into
> `recordRun` + a `career-ledger` event so a climb writes to the Saga. This is
> the phase that satisfies the growth-doc law (*everything marks the champion*)
> and the `essence.md` §3 soul/craft split.

Status: **build plan — ready after Tier 1.**
Depends on: [`circuit-board.md`](./circuit-board.md) (Tier 1 — the per-device
board split + widened ceiling; P2's server reconciliation and `campsLit`/`reach`
fields sit on top of it). Source design: [`climb.md`](./climb.md) §6, §7, §9.
Law: [`essence.md`](./essence.md) §3.

Verified against `store/champions.ts`, `lib/types.ts`, `lib/server/store.ts`,
`components/grounds/circuit-lite.tsx` (July 2026).

---

## Ground truth (what already exists, so P2 extends — not reinvents)

- **Career ledger** — `store.events: Record<key, CareerEvent[]>`,
  `store.pushEvent(key, ev)`; `CareerEventKind` union in `lib/types.ts` (431);
  append-capped via `appendCapped` (~60, `PINNED_EVENTS` kept). Persisted in
  `PlayerSave.events` (v5+), synced through `snapshotSave`/`applyServerSave` and
  server-sanitized in `lib/server/store.ts`.
- **Trainer XP (soul)** — `store.awardTrainerXp(n)`, persisted as
  `PlayerSave.trainerXp`.
- **Crowns (craft)** — `store.awardGauntlet(amount)` → server-authoritative
  `/api/wallet` (clamped; client never mints). Already used by `recordRun`.
- **Depth reward + sigil** — `circuit-lite.tsx` `recordRun` already pays
  depth→XP / time→Crowns gated on `isCircuitRunBetter`, and derives the ascent
  sigil client-side: `ascentReaches = ceil(best.sectors / 10)`. **Best depth is
  client-local only today** — that's the gap P2 closes.
- **Daily index plumbing** — imprints/nodes use a UTC-day index; Today's Ascent
  reuses it (but Today's Ascent is **P3**, not here).
- **SAVE_VERSION = 5** (`lib/types.ts` 528) with a `merge` migration in
  `store/champions.ts` and server `sanitizeSave` bounds.

---

## Task list (ordered; each lands independently, ranked loop never regresses)

### P2.1 — Camp state in the store (+ persistence)

Camps are the campaign spine. Add a compact, per-Trainer record of the deepest
Reach boundary lit.

- **Types** (`lib/types.ts`):
  - `SAVE_VERSION` 5 → **6**.
  - `PlayerSave` gains:
    - `climb?: { bestSectors: number; campsLit: number; hundred?: boolean; firstLit?: Record<number, number> }`
      — `bestSectors` is **best-depth-ever, cross-device** (the soul fact);
      `campsLit` = highest camp index lit (0..10); `firstLit[n]` = ms epoch a camp
      was first lit (drives one-time chests + de-dupe); `hundred` = the Hundred
      cleared ranked.
  - Add `"ascent"` to `CareerEventKind` (a climb milestone: camp lit / the
    Hundred / a Keeper watch → see P2.5).
- **Store** (`store/champions.ts`):
  - State slice `climb` with a sane default `{ bestSectors: 0, campsLit: 0, firstLit: {} }`.
  - `lightCamp(sectors)` — pure reducer: given a ranked run's depth, compute
    `reachesReached = ceil(sectors/10)`, set `campsLit = max(campsLit, reachesReached)`,
    stamp `firstLit[n]` for any newly lit camp, bump `bestSectors`. Returns the
    list of **newly** lit camps (for chest + event firing).
  - Include `climb` in `snapshotSave()` and `applyServerSave()`; add a `merge`
    branch (default `{}` on pre-v6 saves — same pattern as `imprintDays`/`events`).
- **Server** (`lib/server/store.ts`): extend `sanitizeSave` to bound `climb`
  (`bestSectors` 0..100, `campsLit` 0..10, `firstLit` numeric map, `hundred`
  bool). Last-write-wins by `updatedAt` already handles cross-device merge.
- **Acceptance:** light Camp III on device A, sync, open device B → `campsLit≥3`,
  sigil reflects it; a v5 save loads without wiping `climb`.

### P2.2 — Sigil growth = cross-device identity (essence.md §3 "quiet unification")

Make the ascent sigil read from the **soul** record, not the local best.

- Sigil mapping (`climb.md` §6): glyph count = `campsLit` (Reaches reached,
  1–10); glyph color = deepest Reach's accent (`reachThemeByIndex(campsLit-1).accent`);
  the Hundred (`hundred === true`) adds the Reach-X star band.
- Source the count from `store.climb.campsLit` (server-reconciled) instead of the
  local `circuitBest`. Update `circuit-lite.tsx` `ascentReaches` to read the store
  climb slice; keep the local best only as the *board* PB, not the sigil source.
- The sigil already renders on the champion body / portraits / share cards — no
  new render surface, just a truthful, cross-device input. (`AscentSigil` glyph
  cap currently 6 → raise to 10 wherever it's clamped.)
- **Acceptance:** sigil glyphs on `/champion/[key]` and the share card match
  `campsLit` and survive a cache wipe (they come from the synced save).

### P2.3 — Scout runs (unranked practice from a lit camp)

The campaign-persistence half of the two-loop split (`climb.md` §6). Ranked stays
the only board writer.

- Entry UI (mobile Climb start): a camp picker showing lit camps (`campsLit`);
  "Ranked (Sector 1)" default + "Scout from Camp n" options. Scout is clearly
  labeled so ranked stays honest.
- Run state carries `mode: "ranked" | "scout"` + `startSector`. Scout starts the
  sector loop at `10·(n-1)+1`.
- **Rewards (fractional, still soul):** scout pays XP ×0.5, Crowns ×0.25, and
  **never** POSTs to `/api/circuit` (no board row). Ranked unchanged.
- **Anti-abuse (open Q3):** cap scout Crowns/day via the existing daily-index
  ledger (same mechanism as imprints) so scouting high Reaches can't out-farm
  ranked. Decide the cap on device.
- **Acceptance:** a scout run from Camp IV starts at sector 31, pays fractional,
  writes no board row; ranked from the same screen still starts at sector 1.

### P2.4 — First-light chests + the §7 reward table into `recordRun`

Wire the full economy table, gated on genuine improvement (anti-farm carries
over from today's `isCircuitRunBetter`).

- On a **ranked** run, after computing depth/time rewards, call `lightCamp` and
  for each **newly** lit camp:
  - **First-light chest:** one-time Crowns escalating 100→1000 by camp index
    (server-authoritative via `awardGauntlet`, clamped) + a Reach-themed cosmetic
    unlock (mote-trail color / ring-flash palette — cosmetic registry keyed by
    Reach). One-time enforced by `firstLit[n]` presence.
  - **Career-ledger event** (P2.5).
- **The Hundred** (`clearedAll` ranked): set `climb.hundred`, pay the one-time
  large purse, unique sigil crown (P2.2), permanent Saga chapter (P2.5).
- Keep golden-ring `bonusCrowns` (already in `recordRun`) and the depth→XP /
  time→Crowns split exactly as today; P2 only *adds* the camp/chest/Hundred rows
  of §7's table.
- **`/api/circuit` superset:** POST now also sends `reach` (already server-derived
  in Tier 1) and `campsLit` (additive, display-only server field). No breaking
  change.
- **Acceptance:** first time crossing into Reach IV pays the Camp IV chest once
  (never again); a second Reach-IV run pays no chest; Crowns deltas are
  server-clamped.

### P2.5 — Career-ledger events (the climb writes to the Saga)

Everything the Trainer does with their hands must mark the champion.

- Use the new `"ascent"` `CareerEventKind`. Fire `pushEvent(ownedKey, …)` for:
  - **Camp lit** — `title: "First light at Camp IV"`, `detail:` the Reach name
    (`reachThemeByIndex`). Pinned? No — keep camps unpinned; **the Hundred is
    pinned** (add `"ascent"`-Hundred to `PINNED_EVENTS` only for the `clearedAll`
    case, or gate by a `detail` marker).
  - **The Hundred** — `title: "Cleared the Hundred"`, pinned (permanent chapter).
  - **Keeper watch bark** (`climb.md` §7b surprise) — when the surprise fires and
    the player threads it clean: `title: "A Keeper watched you climb"`. (The
    surprise *roll* is P3; the event hook can land here or with P3 — note the
    seam.)
- These surface automatically on `/champion/[key]` Saga timeline + the mobile
  Report (they already render `CareerEvent[]`), and can add a truncated line to
  the share card — no new UI.
- **Acceptance:** lighting a camp adds a timeline row that survives sync; the
  Hundred pins and never falls off the capped ledger.

---

## Boundary notes (what P2 explicitly does NOT do)

- **Today's Ascent** (daily featured Reach + Crowns×2) → **P3** (needs the
  surprise/modifier + daily-index work landing together).
- **Surprise *rolls*** (Keeper watch, meteor,
  rival line) → **P3**; P2 only lands the *ledger hook* for the Keeper watch so
  P3 can fire it.
- **Camp visuals in the 3D world** → plaques only later; the desktop D3
  "camps-as-portals" (`circuit-world.md` §2c) consumes `climb.climb.campsLit`
  once this ships — **P2 is D3's unblock**.
- **Desktop 6-DOF consuming the same sectors** → D2 (`circuit-world.md`), gated
  behind a device pass; unrelated to P2.

---

## Open questions to settle during P2

1. **Board seasonality** (`climb.md` open-Q1): once regulars camp at Reach VI+,
   do weekly boards reset (freshness) or accumulate (prestige)? Leaning: weekly
   *seasonal* board + all-time high-water, reusing season plumbing. (Board-shape
   only — orthogonal to the P2 store work; can defer to a board pass.)
2. **Scout-run cap** (open-Q3): the per-day Crowns cap number for scouting —
   tune on device so scouting never beats ranked Crowns/min.
3. **Cosmetic registry shape:** where Reach-themed cosmetics live (a new
   `lib/climb/cosmetics.ts` keyed by Reach, applied to mote-trail/ring-flash) and
   whether they're purely local or server-tracked like roster.

## Suggested build order (each shippable, tsc/lints clean, ranked loop intact)

1. **P2.1** store + persistence (no visible change yet — the spine).
2. **P2.2** sigil reads the soul record (immediate, visible cross-device payoff).
3. **P2.4** chests + reward table (the economy lands; camps become rewarding).
4. **P2.5** ledger events (the Saga hook — cheap once P2.1 exists).
5. **P2.3** scout runs (the biggest UI surface — last, after the spine is proven).

Per-phase acceptance mirrors `climb.md` §10: 60fps on the POCO in a `next build`,
`one fall → sector 1` untouched for ranked, cross-device sync verified, ledger
updated.
