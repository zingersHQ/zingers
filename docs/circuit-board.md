# The Circuit board — per-body craft boards

> **In short:** Climb (thumb) and Circuit (flight) each post depth-then-time to
> a per-body board. Depth is soul; time-at-depth is craft. Boards are competitive
> prestige. Hard rewards and on-chain weight never hang on board *rank*.

Status: **shipped.** Companions: [`essence.md`](./essence.md) §3,
[`climb.md`](./climb.md), [`circuit-world.md`](./circuit-world.md).

---

## 1. Soul vs craft

| Dimension | Class | Where it lives |
|---|---|---|
| **Depth** | **Soul** — one identity fact | Trainer XP + ascent sigil (cross-device) |
| **Time-at-depth** | **Craft** — per input | Separate `thumb` / `flight` boards |

One owner token can hold one best entry per body.

---

## 2. Trust & anti-abuse (eng)

Boards are **not** fight standings. Fight outcomes are engine-authoritative; Flight
posts come from the client after a live run. We harden the write path so casual
forgery fails; we do **not** pretend this is replay-grade attestation.

**Shipped write path**

1. **Takeoff ticket** — `POST /api/circuit` `{ action:"begin", token, body }`
   issues a one-shot `runId` (Redis / memory). Ranked and expedition starts on
   both bodies request a ticket at first takeoff.
2. **Consume on submit** — board POSTs must carry `runId`. Cold curls without a
   live ticket are rejected (`run_required` / `run_unknown`).
3. **Wall clock** — server rejects depth that could not have been flown in the
   open ticket window (`wall_too_short`), claimed times ahead of the clock
   (`time_ahead_of_clock`), and absurd speeds (`time_too_fast`).
4. **Speed floor** — `FLIGHT_MIN_MS_PER_SECTOR` (1.8s) from authored gapSec ×
   gates. Far below a perfect corridor; kills nonsense posts.
5. **Rate limits** — submit + begin capped per IP.
6. **PB-only Crowns** — craft Crowns pay on server-side personal best under the
   daily variable earn cap. **Never pay board placement / top-N.**
7. **Retry submit** — if takeoff got a `runId` but the end POST flakes (offline /
   5xx), the client queues the payload in `sessionStorage` and retries on
   `online` / tab focus for up to the ticket TTL (~2h). No `runId` (offline at
   takeoff) is not inventable later — that would break wall-clock.

**Product rule (internal):** seasonal Flight boards refresh prestige. They do not
become the substrate for paid contests, hard purses, or `$ZING` weight. If a
future contest needs attested Flight skill, ship a separate **Proven** lane —
do not quietly “upgrade” the craft board in place.

**Player copy:** show the board. Never apologize with eng jargon (“soft trust”,
“until replay”). Trainers came to fly and compete, not read a trust FAQ.

---

## 3. Data model

```ts
export type CircuitBody = "thumb" | "flight";
```

- Keys: `z:circuit:board:{body}`, `z:circuit:entry:{body}:{token}`
- Score: `sectors * 10_000_000 + (MAX_MS - ms)` — depth always beats time
- Cap 50 rows; labels from `shortOwnerLabel` (client handle ignored)
- Legacy `z:circuit:board` frozen as Season 0 archive

Tickets: `z:flight:run:{runId}`, `z:flight:active:{body}:{token}` (see
`lib/server/flight-run.ts`).

---

## 4. API

| | |
|---|---|
| `GET /api/circuit?body=thumb\|flight&token=&limit=` | Public board |
| `POST { action:"begin", token, body }` | Takeoff ticket → `{ runId, startedAt }` |
| `POST { token, body, sectors, totalMs, runId }` | Submit (consumes ticket) |

Expedition (`/api/expedition`) uses the same ticket + timing checks; week-scoped
board keys stay separate.

---

## 5. Explicit non-goals

- Full input / path replay verification (Proven lane, if ever)
- Paying top-N board rank in Crowns or `$ZING`
- Merging thumb and flight into one column
- Surfacing Season 0 legacy as a live board (optional read-only later)

Cross-device depth reconciliation into server save / sigil remains climb P2.
