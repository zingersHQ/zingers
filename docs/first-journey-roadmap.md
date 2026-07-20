# First Journey Roadmap

> **HISTORICAL (fight-led Act 1).** The live product door is **Flight-First** —
> see [`flight-first-plan.md`](./flight-first-plan.md), [`two-doors.md`](./two-doors.md),
> [`design-vision.md`](./design-vision.md) v3.0, and [`flyover.md`](./flyover.md).
> Canon: [`docs/bible/10-ascent.md`](./bible/10-ascent.md).
>
> **Live first minutes:** mobile = Take flight → Climb → claim wingmate; desktop =
> short flight → champion pick → Grounds / Circuit. Do not treat the fight-led flow
> below as the current onboarding.

Production notes from the prior Act 1 pass (kept for reference / archaeology).

## Act 1 flow (prior pass — superseded)

```
FirstRun (cinematic) → First Duel: Adopt (5 Forces, weekly rotation, rookie preview)
  → Adoption beat (Trainer + champion) → seed Strategy → adopt as rookie → Void fight
  → Evolve card → Concord landing (Trainer beat first) → Trainer split coach at spawn
  → Guided first arena (Grounds gate spotlit) → Free roam + coach
```

## 60-second teaching contract (updated for Flight-First)

Before leaving the first flight / pick, the player must know:

- [ ] *You fly. It fights. You both rise.*
- [ ] *You raise this champion — you are not the fighter.* (soft identity; no claim-lock hype)
- [ ] Rookie body at adoption is day one of the arc, not a downgrade from pick preview

Canonical copy: `lib/player-copy.ts` · Vision: `docs/design-vision.md` · Vocabulary: `docs/vocabulary.md`

## P0 — Broken promises ✅

| Item | Status | Notes |
|------|--------|-------|
| Strategy / temperament readout (not free-drag sliders) | ✅ | `DoctrineDial` = meters; Imprints + fights move dials |
| Player copy: duel/fight not bout | ✅ | `lib/player-copy.ts` + first-journey UI |
| First fight in region arena | ✅ | `FIRST_FIGHT_WORLD = void` |
| Wider fighter spacing + camera | ✅ | `MATCH_SPREAD = 4.5`, orbit 14 / height 6.2 |
| Hub fights don't clip seal/flags | ✅ | Concord hidden during match; temp arena ring |

## P1 — Narrative glue ✅

| Item | Status | Notes |
|------|--------|-------|
| FirstRun not skipped for new players | ✅ | Removed auto-mark intro seen |
| Intro audio sting | ✅ | `lib/sound-gallery.ts` — gesture + CTA |
| Concord landing (3 beats) | ✅ | Seal → Vaultgates → Your session |
| Copy honesty on body evolution | ✅ | Onboarding defers visible growth to evolve step |

## P2 — Polish ✅

| Item | Status | Notes |
|------|--------|-------|
| Player-facing bout purge (in-app UI) | ✅ | First journey, FirstRun, gauntlet objective, scenarios |
| Concord goal coach in hub | ✅ | One-time coachmark after Act 1 |
| Guided first Concord landing | ✅ | First run spotlights the Grounds gate ("▶ START HERE"), dims the other gates + seal, and runs a proximity-aware nudge with a "Take me there" walk-to CTA; escalates to gold once the player idles (`guideWorld`/`guideUrgent`, `FIRST_GUIDE_WORLD`) |
| Dedicated first-fight vignette camera | ✅ | `MatchView.cinematic` — tighter orbit |
| Sound gallery | ✅ | `lib/sound-gallery.ts` + stingers per onboarding beat |
| Iconography alignment | ✅ | `lib/iconography.ts` — art-direction palette + Force sigils |
| Seasonal starter rotation | ✅ | `firstDuelStarterKeys()` — weekly pick per Force |
| Onboarding sound toggle visible | ✅ | `OnboardingAudio` on FirstRun + FirstDuel overlays |

## Narrative & cinematics ✅

| Item | Status | Notes |
|------|--------|-------|
| Gate/travel transitions | ✅ | `TravelVeil` — force-tinted wipe + name card for gate travel and venue enter/exit (`travelWhoosh` SFX) |
| Trainer's saga spine | ✅ | `lib/lore/saga.ts` — 8-chapter / 4-act arc keyed off Trainer rank; `ReaderThread` hub marker (code id unchanged) |
| Season-turn cinematic | ✅ | `seasonTurnBeat()` — a Keeper performs the Chronicle when a new door opens (once per season) |
| Rival system | ✅ | `lib/lore/rival.ts` — recurring named rival Trainer, persistent head-to-head, taunts that escalate; `RivalCard` + pre/post-duel beats |
| Directed character beats | ✅ | `CharacterBeat` upgraded: letterbox, rising/floating live 3D portrait, per-line glow pulse, typewriter, parallax field (reduced-motion aware) |

The saga (your story) and the Chronicle (the world's story) are deliberately
distinct: the saga advances off the one Trainer-rank number so it moves no matter
how a player plays, while the Chronicle turns on the season clock.

## Intentionally unchanged

- **Code/analytics event keys** — still `bout` (stable server tracking)
- **`useBout` hook name** — internal; no player-facing label
- **Docs/README/MCP** — dev-facing; not part of in-game copy pass (see `docs/` sync for canon)

## Soundtrack (procedural, per place)

| Mood | When |
|------|------|
| `concord` | The Concord hub |
| `colosseum` | Obsidian Colosseum / Grounds region |
| `ember` | Ember Gauntlet |
| `void` | Void Garden |
| `amphitheatre` | Amphitheatre venue |
| `circuit` | Circuit venue |
| `battle` | Any live fight or Keeper duel |

Scores live in `lib/ambience-scores.ts`; `grounds-screen` calls `resolveAmbienceMood()`.

## Terminology

- **Players see:** duel, fight, ranked duel
- **Code/analytics:** bout (unchanged — stable event keys)

## Key files

- `lib/first-duel.ts` — starters, rotation, arena world, Concord landing copy
- `lib/lore/saga.ts` — the Trainer's saga arc + season-turn beat
- `lib/lore/rival.ts` — recurring rival identity, memory, taunts
- `lib/lore/character-beats.ts` — champion + Keeper voice beats
- `components/grounds/travel-veil.tsx` — scene-change transition
- `components/grounds/reader-thread.tsx` — saga hub marker (code id unchanged)
- `components/grounds/rival-card.tsx` — rival hub presence
- `components/grounds/character-beat.tsx` — directed narrative beat
- `lib/ambience-scores.ts` — procedural soundtrack per place
- `lib/player-copy.ts` — player-facing fight vocabulary
- `lib/sound-gallery.ts` — onboarding stinger map
- `lib/iconography.ts` — visual canon for UI
- `components/intro/first-duel.tsx` — onboarding overlay
- `components/intro/onboarding-audio.tsx` — floating mute control
- `components/shared/doctrine-dial.tsx` — temperament meters / Strategy readout
- `components/grounds/grounds-screen.tsx` — sequencing + world travel + first-run guide (focus gate, idle escalation, walk-to nudge)
- `components/grounds/world.tsx` — match staging + cinematic camera; threads `guideWorld`/`guideUrgent` to the Concord
- `components/grounds/concord.tsx` — Concord scene; Vaultgate spotlight/dim treatment (`firstStop`/`dimmed`/`urgent`)
- `components/grounds/worlds.ts` — `FIRST_GUIDE_WORLD` (the steered-to first region)
