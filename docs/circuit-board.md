# The Circuit board — per-device split + 100-sector ceiling (Tier 1 spec)

> **In short:** The ascent leaderboard currently lies. The mobile Climb is live
> at 100 sectors but `/api/circuit` hard-rejects any run past **sector 10**, and
> the one shared board mixes one-thumb and 6-DOF times in a single column —
> exactly the cross-device dishonesty [`essence.md`](./essence.md) §3 forbids.
> This is a small, **server-first, headless-testable** fix that unblocks *both*
> bodies and is an **additive, non-breaking superset** — no gameplay/3D risk.

Status: **spec — ready to implement (Tier 1).**
Companions: [`essence.md`](./essence.md) §3 (soul/craft split — the law this
obeys), [`climb.md`](./climb.md) §7/§10-P2 (the reward table + the additive
`/api/circuit` fields this lands first), [`circuit-world.md`](./circuit-world.md)
§1 (the desktop body that consumes the widened board later).

Verified against `app/api/circuit/route.ts`, `lib/server/circuit.ts`,
`components/grounds/circuit-lite.tsx`, `components/grounds/grounds-screen.tsx`
(July 2026).

---

## 1. The bug, precisely

Two live problems, both from the same root — the server board predates the
100-sector Climb and the two-body split:

1. **Ceiling rejection.** `app/api/circuit/route.ts` rejects the POST outright:

   ```ts
   if (!Number.isFinite(sectors) || sectors < 0 || sectors > 10)
     return new Response("bad sectors", { status: 400 });
   ```

   The mobile Climb posts `sectors: run.sectors` up to `CLIMB_SECTOR_COUNT` (100)
   from `circuit-lite.tsx` `recordRun`. **Every mobile run past sector 10 is
   silently 400-rejected** — the board can never show a real Climb depth, and
   `lib/server/circuit.ts` additionally clamps `sectors` to `min(10, …)`.

2. **No device split.** One sorted set `z:circuit:board` holds all runs keyed by
   token only. A one-thumb depth-then-time and a 6-DOF depth-then-time share the
   same column. `essence.md` §3 is explicit: *depth is soul (cross-device
   identity), **time/mastery is craft → per-device leaderboards.*** The board as
   built forces one body onto the other's terms — the "restriction" failure mode
   the whole principle rejects.

`isCircuitShared()` / the Redis-vs-memory fallback and the depth-then-time score
packing are otherwise sound and stay.

---

## 2. The law this must obey (essence.md §3)

| Dimension | Class | Where it lives |
|---|---|---|
| **Depth** ("how high you climbed above the Long Vault") | **Soul** — one identity fact | Trainer XP + the ascent sigil on the champion — the *same* number on every device |
| **Time-at-depth** ("how fast, with this input") | **Craft** — per-device | **Separate `thumb` / `flight` boards** |

So the split is clean: **the board is a craft surface → split by body.** Depth
still feeds the cross-device identity, but that reconciliation (best-depth-ever
in the server save → sigil) is **P2, not Tier 1** (see §7). Tier 1 makes the
*craft boards* honest and unbreaks submission; it deliberately does **not** touch
the sigil/XP path.

---

## 3. Data model

### 3a. Body

```ts
export type CircuitBody = "thumb" | "flight";
```

- `thumb` — the mobile one-thumb Climb (`circuit-lite.tsx`).
- `flight` — the desktop 6-DOF Circuit (`grounds-screen.tsx` / `world.tsx`).

One owner token can hold **one entry per body** (a player who climbs on both
their phone and laptop earns a row on each craft board — same soul, two crafts).

### 3b. Keys (Redis) — per-body, legacy archived

```
z:circuit:board:thumb            (new) sorted set, score = circuitScore(sectors, ms, body)
z:circuit:board:flight           (new) sorted set
z:circuit:entry:thumb:<token>    (new) the token's best thumb run
z:circuit:entry:flight:<token>   (new) the token's best flight run

z:circuit:board                  (LEGACY) frozen — no new writes (see §6)
z:circuit:entry:<token>          (LEGACY) frozen
```

### 3c. Entry shape (additive superset — old readers ignore new fields)

```ts
export interface CircuitEntry {
  token: string;
  handle: string;
  sectors: number;      // now 0..100 (was 0..10)
  totalMs: number;
  clearedAll: boolean;
  at: number;
  body: CircuitBody;    // NEW — which craft board this belongs to
  reach: number;        // NEW — derived: ceil(sectors / 10), 0..10 (display convenience)
}
```

`reach` is **server-derived**, never client-trusted (`reach = sectors === 0 ? 0
: Math.ceil(sectors / 10)`).

---

## 4. Score encoding (widen depth + time ceilings)

Current:

```ts
const MAX_MS = 20 * 60 * 1000;                     // 20 min
circuitScore = sectors * 10_000_000 + (MAX_MS - ms);
```

Two changes, both safe against the packing invariant *"one more sector always
outranks any time"* (which requires `MAX_MS < 10_000_000`):

- **Time ceiling → 90 min** (`MAX_MS = 90 * 60 * 1000 = 5_400_000`). The desktop
  6-DOF full clear is aspirationally 60–90 min (`circuit-world.md` open Q1); a
  20-min ceiling would clip long flight runs and corrupt their time component.
  `5.4M < 10M` ✓ so depth still strictly dominates. Sub-90-min runs on either
  body encode losslessly.
- **Depth ceiling → 100.** Max packed score `100 * 10_000_000 = 1e9`, well inside
  the IEEE-double range Redis sorted-set scores use (safe to `2^53`). ✓

`scoreToRank` inverts unchanged against the new `MAX_MS`. Keep `MAX_MS` a single
shared constant (do **not** make it per-body — a shared ceiling keeps the packing
uniform, and the boards are already separated by key so no cross-body comparison
happens).

---

## 5. API surface (`/api/circuit`) — additive, back-compatible

### POST (submit a run)

Body gains `body`; ceiling widens; `reach` is derived server-side.

```ts
const body: CircuitBody = b.body === "flight" ? "flight" : "thumb";  // default thumb (see note)
const sectors = Number(b.sectors);
if (!Number.isFinite(sectors) || sectors < 0 || sectors > 100)       // 10 → 100
  return new Response("bad sectors", { status: 400 });
if (!Number.isFinite(totalMs) || totalMs < 0 || totalMs > 90 * 60 * 1000)  // 20 → 90 min
  return new Response("bad time", { status: 400 });
// … reach derived, entry written to the body's board/entry keys …
```

**Default-to-`thumb` on missing `body`** is the back-compat hinge: the only live
poster today is the mobile Climb, so an un-upgraded client keeps landing on the
thumb board. Desktop must be updated in the same slice to send `body:"flight"`
(§8) so it stops misfiling into thumb.

Response echoes `body` and `reach` alongside the existing `{ saved, entry }`.

### GET (read a board)

`?body=thumb|flight` selects the craft board (default `thumb`). `?token=` still
returns `mine` for that body. `?limit=` unchanged (≤50).

```
GET /api/circuit?body=flight&limit=8&token=…
→ { shared, body: "flight", entries: CircuitEntry[], mine: CircuitEntry | null }
```

`isBetter` / trim-to-cap logic is unchanged, just applied within the selected
body's key space.

---

## 6. Legacy migration — archive as "Season 0" (recommended)

The existing `z:circuit:board` rows are 10-scale, body-less, and mix devices.
**Do not normalize or delete them** — normalizing (e.g. treating old rows as
`sectors × 10`) invents depth the players never climbed, and deleting throws away
real history. Instead:

- **Freeze** the old keys: stop all writes to `z:circuit:board` /
  `z:circuit:entry:<token>`. New writes go only to the per-body keys.
- Treat the frozen set as **"Season 0 · legacy (10-sector Circuit)"** — an
  honest, read-only archive.
- **Surfacing is optional and deferred.** Simplest honest shipping state: the old
  board simply stops receiving writes and isn't shown. If we later want it,
  expose it read-only via `?body=legacy` (a third read path over the old key, no
  writes). No migration job, no data mutation, zero risk.

This matches `circuit-world.md` open-Q2's leaning ("archive — honest") and needs
no Redis migration script.

---

## 7. Explicit non-goals (stay in P2, not here)

Tier 1 is deliberately tiny. It does **not**:

- Reconcile **best-depth-ever** into the server `PlayerSave` for a cross-device
  sigil. Today the sigil/XP derive from the client-local `circuitBest`; making
  depth a true cross-device identity fact is **`climb.md` P2** (see
  [`climb-p2.md`](./climb-p2.md)). Tier 1 only fixes the *craft boards*.
- Add `campsLit` / scout-run semantics (P2).
- Touch any 3D, flight tuning, hazards, or the desktop adapter (that's D2 in
  `circuit-world.md`, gated behind a device pass).

Keeping depth-soul reconciliation out means Tier 1 has **no client-render risk**
and is fully verifiable headless — the whole point of doing it first.

---

## 8. Touch list (small)

| File | Change |
|---|---|
| `lib/server/circuit.ts` | `CircuitBody` type; `body`+`reach` on `CircuitEntry`; per-body keys (`boardKey(body)`, `entryKey(body, token)`); `MAX_MS` 20→90 min; `sectors` clamp 10→100; `submitCircuitRun(token, handle, sectors, totalMs, clearedAll, body)`; `getCircuitBoard(limit, token, body)`. Redis **and** memory backends. |
| `app/api/circuit/route.ts` | Parse+validate `body` (default `thumb`); `sectors` ceiling 10→100; time ceiling 20→90 min; pass `body` through GET/POST; echo `body`/`reach`. |
| `components/grounds/circuit-lite.tsx` | `recordRun` POST adds `body:"thumb"`; `loadBoard` GET adds `body=thumb`. |
| `components/grounds/grounds-screen.tsx` | The desktop circuit `submitCircuitRun`/board fetch adds `body:"flight"`. |

No schema/store bump (this is the *server board*, not `PlayerSave`). No
`SAVE_VERSION` change.

---

## 9. Acceptance (all headless — no device needed)

Runnable against `next build` + a local/memory board (no Redis needed for the
logic tests; `isCircuitShared()` stays honest either way):

1. `POST { body:"thumb", sectors:57, totalMs:… }` → `saved:true`; appears in
   `GET ?body=thumb`, **absent** from `GET ?body=flight`.
2. `POST { body:"flight", sectors:8 }` → lands on the flight board only.
3. Same token can hold **both** a thumb and a flight entry simultaneously.
4. `POST { sectors:100, clearedAll:true }` accepted (was 400).
5. `POST { sectors:101 }` → 400 `bad sectors`. `POST { totalMs: 91*60_000 }` →
   400 `bad time`.
6. `POST` **without** `body` → defaults to `thumb` (back-compat).
7. Depth dominates time: a `sectors:11` run outranks any `sectors:10` run
   regardless of time, on the same body board.
8. Legacy `z:circuit:board` receives **no** new members after the change.
9. `tsc --noEmit` + lints clean; `next build` passes.

---

## 10. Why this is the highest-ROI item in the deferred set

- **Fixes a live prod bug** (mobile depths >10 silently lost) — not speculative.
- **Server-only + minimal client**, fully testable in the environment we have
  (the recurring lesson: 3D can't be verified in the throttled automation
  browser; this needs none).
- **Unblocks both bodies at once** — it's the shared prerequisite the desktop D2
  adapter needs *and* the honest home for the mobile Climb's real depths.
- **Additive/non-breaking** — old clients keep working; no migration job.
- **Obeys `essence.md` by construction** — craft split per body, soul (depth)
  left for the identity reconciliation in P2.
