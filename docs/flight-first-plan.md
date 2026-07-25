# Zingers. Flight-First development plan (session lock)

> **In short:** Climb is the face; battles are depth; desktop is the full ascent.
> Optional Solana wallet = Trainer identity (not economy). Coin/token is a
> **future independent track**. This doc is the active implementation roadmap
> from the July 2026 planning session.

Companions: [`climb-feel.md`](./climb-feel.md), [`two-doors.md`](./two-doors.md),
[`launch-week.md`](./launch-week.md), [`flyover.md`](./flyover.md),
[`zing-model.md`](./zing-model.md) (deferred).

---

## North star

**Player sentence by minute two:** *I fly. It fights. We rise.*

| Door | First ~2 min |
|---|---|
| **Mobile** | Poster → Fly → Climb → claim wingmate → one more + boards |
| **Desktop** | Wake → flight ≤15s → claim → short Reach → duel *motivated* by climb |

**Invisible:** agents think (fantasy copy); wallet optional; Crowns only in-game.

---

## Scope

### In
Climb feel · guest→claim · funnel measurement · light boards · one altitude/raise bridge · desktop 90s recut · optional Phantom identity · lean LLM ops

### Out
$ZING launch · vesting · airdrops · Crowns↔token · on-chain matches · custom protocols · wallet-gated Fly · new venues / Keeper depth as face work

### Freeze until Climb feel acceptance
No new modes, Reach art sprees, collection trading, House promotion, token UI.

---

## Launch gates (aligned)

| Gate | Metric |
|---|---|
| **1′** | Cold phone → flying &lt;10s after Fly |
| **2′** | Guest→claim visible on `/stats` |
| **3′** | Climb “one more run” on real devices |
| **4** | `LLM_DAILY_BUDGET_USD` set; Climb-heavy stays cheap |
| **5** | Growth push only after door feels good |
| **6** | Secondary: evolution / collection |
| **. ** | Token deferred; wallet ≠ coin |

---

## Phases & status

| Phase | Status | Notes |
|---|---|---|
| **0 Align** | done (this doc) | Gates + non-goals locked |
| **1.0 Mobile plane law** | shipped | `x=0`, no lateral ease, green `cpNextRef`, Flappy cam |
| **1.1 Layout archetypes** | shipped | `climb/sectors.ts` role templates |
| **1.2 Desktop auto-forward** | shipped | `CIRCUIT_CRUISE` in `world.tsx` |
| **1.3 Companion leash** | shipped | desktop wingmate; mobile Trainer+follower |
| **1.4 Hazard Y-corridor** | shipped | wisps/cinders Y-only; hazards already on flight plane |
| **2.0–2.1 Door + claim events** | shipped | `m_*` + guest claim hook |
| **2.0b Stats door funnel** | shipped | `/stats` MOBILE DOOR panel |
| **2.2 Guest depth → career** | shipped | `lib/guest-climb.ts` → Trainer XP on adopt |
| **2.3 Fantasy copy sweep** | shipped | `/howitworks` + intro/share surfaces; `/agents` stays technical |
| **2.4–2.5 Solana wallet identity** | shipped | Phantom SIWS → `/api/solana-link`; Rank + Trainer code UI |
| **3 Boards chrome** | mostly shipped | PB + board on Climb fall card |
| **4 Playtests** | todo | 10–30 humans |
| **5 One altitude key** | shipped (thin) | Reach II needs 1 duel win (Climb + desktop Circuit) |
| **6 Desktop first 90s** | shipped (corrected) | summoning → **pick** (not CircuitLite); native Circuit venue unlocked pre-duel. Mobile `/m` keeps Climb-first. |
| **7 Hygiene** | todo | LLM budget, growth after feel |

---

## Wallet rules (non-negotiable)

- Never required for Fly / Climb / claim / Crowns.
- SIWS-style prove-ownership only. No spend approvals.
- Server links `pubkey` ↔ owner token; game state stays off-chain.
- Copy = Trainer sigil / connect. Never deposit or fuel.
- Future coin attaches to the same socket; **zero token logic now**.

---

## Execution order

1. Feel device-verify (1.x) → patch 1.4 if needed  
2. Stats door funnel + wallet identity (2.x)  
3. Desktop fly-first beat (6.x) + thin altitude key (5.x)  
4. Playtests (4) → iterate  
5. Growth hygiene (7)

---

## Definition of done

1. Mobile: Fly → fun Climb → claim in one session  
2. Desktop: flight before systems dump  
3. `/stats`: door + claim (+ secondary evolution)  
4. Ghost competition via boards  
5. One raise bridge or motivated copy  
6. Optional Phantom link; core loop wallet-free  
7. No token UI · Crowns-only economy · LLM budget set  
