# Champions supply, evolution, and Immortal minting

**Status:** Locked design (founder, 2026-07). Ties the **game roster**, the
**Chronicle calendar**, and **burn-to-immortalize** to one growth story.

Companions: [`bible/03-champions.md`](./bible/03-champions.md),
[`bible/07-collection.md`](./bible/07-collection.md),
[`bible/08-economy.md`](./bible/08-economy.md), [`zing-model.md`](./zing-model.md),
[`bible/06-seasons.md`](./bible/06-seasons.md).

---

## 1. Three layers (do not confuse them)

| Layer | What it is | Count today | Who authors it |
|-------|------------|-------------|----------------|
| **Mind (dex entry)** | Studio template: Force, voice, moves, species mark | **132** (8 First Minds + 124 wave-1 echoes) | House only |
| **Living career** | A Trainer’s raised instance of a mind | Unbounded (one per recruit) | Play |
| **Immortal card** | On-chain stamp of one living career | Scarce (see §5) | Burn `$ZING` |

Players collect **careers** and chase **Immortals**. The house ships **minds**.

---

## 2. What already exists (honest)

- **8 First Minds** — always the archetypes; always in the starter pool.
- **Wave 1 dex** — baked collectible set (~Gen-1 scale) on top; live in roster.
- **Weekly adopt** — one starter mind per Force from First Minds + dex.
- **Recruit** — Crowns sink; deterministic; roster follows Trainer identity.
- **Career evolution** — tiers Rookie → Legend; body = fight record + species mark.
  Remodel / art polish improves *future* base looks; it does not rewrite history.
- **Chronicle seasons** — Season 0 = 7 days, then ~28-day seasons. Story clock.
  **Not** a mind-print faucet and **not** an Immortal-print faucet by itself.

---

## 3. Career evolution (game — forever)

This is independent of minting.

| Tier | Level | Player feel |
|------|-------|-------------|
| Rookie | 1 | Bare; species mark already readable |
| Adept | 3 | First heraldry |
| Veteran | 6 | Real record |
| Elite | 10 | Feared |
| Legend | 15 | Crown |

- **Strategy / Imprints / fights** move the mind; body follows career.
- **Saga** narrates the record.
- Immortalize (when open) freezes a **snapshot** of that career’s card art.
  The living champion can keep climbing afterward.

No pay-to-win looks. No user-made minds.

---

## 4. Dex growth (game — Year 1 → Year 3)

**Principle:** ship minds in **studio waves**, Force-balanced, slow enough that
each wave is an event. Never dump 10k templates. Never open UGC.

### Cadence

| Wave | When (target) | Add | Dex after | Notes |
|------|---------------|-----|-----------|--------|
| **1** | Live now | — | **132** | First Minds + wave-1 echoes |
| **2** | ~Month 3–4 of public Year 1 | **+24** (~5/Force) | **156** | First post-launch drop |
| **3** | ~Month 7–8 | **+24** | **180** | Mid-year |
| **4** | ~Month 11–12 | **+24** | **204** | Close Year 1 |
| **5–6** | Year 2 | **+40–60** total | **~250–260** | Fewer, denser personalities |
| **7–8** | Year 3 | **+40–60** total | **~300–320** | Approach “deep dex,” not infinite |

Rough Year-1 end: **~200 minds**. Year-3 end: **~300–320 minds**.

### Wave rules

1. **Force balance** — each wave adds roughly even counts across the five Forces.
2. **Lineage** — every later mind echoes a First Mind (already canon).
3. **Species kit first** — new mind ships with readable bodytype + parts; remodel
   agency can upgrade the shared brand without renaming the mind.
4. **Reveal as product** — wave drop = ship note + adopt rotation weight +
   Immortal slots for those minds (§5).
5. **Quality gate** — reviewed voice/banter before bake; no unfinished minds in
   the live dex.

### How Trainers meet new minds

- Weekly starter rotation naturally surfaces new keys once baked.
- Recruit list / Collection dex shows the full set.
- Season “featured echo” may spotlight a new or under-loved mind (flavor), not a
  sixth Force and not a free Immortal.

---

## 5. Immortal supply (collectibles — tied to §4)

From [`zing-model.md`](./zing-model.md):

- **Owner-only**, tradeable, full NFT, snapshot art, tiered fixed `$ZING` burns.
- **Year N:** at most **M Immortals per mind** that year. **Year 1: M = 8.**
- One Immortal per living career (that career cannot double-stamp the same year).
- **Genesis window** (launch / Season 0 era): stamps get **OG** mark; still count
  against that mind’s M.
- Story seasons do **not** refill M.
- New wave minds receive **full M** for the current year when they ship.

### Year 1 Immortal projection (M = 8)

| Dex moment | Minds | Max new Immortals from those minds* |
|------------|-------|-------------------------------------|
| Launch (wave 1) | 132 | 132 × 8 = **1056** |
| After wave 2 (+24) | 156 | +24 × 8 = **+192** |
| After wave 3 (+24) | 180 | +192 |
| After wave 4 (+24) | 204 | +192 |
| **Year 1 ceiling (if all slots fill)** | **204** | **~1632** |

\*Launch cohort can mint up to 1056 across the whole year; each new wave adds
8 × new minds when those minds go live.

Order of magnitude still **~1k–1.6k** Year 1 if waves ship and demand is hot —
scarce, not 10k. If waves slip, ceiling stays closer to **~1056**.

### Years 2–3 (same law unless retuned)

| Year | Dex (approx EOY) | M | Approx new Immortals that year | Cumulative ~ |
|------|------------------|---|--------------------------------|--------------|
| 1 | ~200 | 8 | ~1.0k–1.6k | ~1.0k–1.6k |
| 2 | ~250–260 | 8 (default) | ~2.0k–2.1k | ~3.0k–3.7k |
| 3 | ~300–320 | 8 (default) | ~2.4k–2.6k | ~5.5k–6.3k |

If cumulative feels high later: lower **M** for Year 2+ (e.g. 4), or skip a mint
year. Shape stays “per mind × year,” not seasonal print runs.

---

## 6. Timing map (one page)

```
Public Year 1
├── Genesis / Season 0 (week)     OG Immortal window opens; dex = 132
├── Story seasons (~28d each)     Chronicle only; Flight / standings soft reset
├── Wave 2 (~M3–4)                +24 minds → +192 Immortal slots
├── Wave 3 (~M7–8)                +24 minds → +192 slots
├── Wave 4 (~M11–12)              +24 minds → +192 slots
└── Year 1 ends                   dex ~204; Immortal ceiling ~1.6k if full

Year 2–3
├── Waves 5–8                     dex → ~300–320
├── M = 8 unless retuned
└── Genesis never repeats; OG set stays the prestige slice
```

---

## 7. Explicit non-goals

- User-made champions / forge tools for players
- Immortal supply unbounded by careers × seasons
- Token-gated play or pay-to-win tiers
- Live-updating NFT art as default
- Shipping minds without Force balance or voice review

---

## 8. Open knobs (not shape)

- Exact calendar dates for waves 2–4 (tie to real launch epoch)
- Year 2+ **M** (keep 8 or tighten)
- Always-on mint until M fills vs post-Genesis windows only
- Burn table and royalty split ([`zing-model.md`](./zing-model.md))
- Whether wave drops include a short “premiere” Immortal spotlight (marketing),
  still under the same M

---

## 9. Doc ownership

| Concern | Canonical file |
|---------|----------------|
| Player fiction (what a mind is, First Minds, dex grows in waves) | `bible/03-champions.md` |
| Cards / rarity / immortalize in world voice | `bible/07` + `08` |
| Token + M = 8 + mechanism | `zing-model.md` |
| Numbers, waves, Immortal math, 3-year projection | **this file** |
| Season length | `lib/lore/season.ts` + `bible/06` |
