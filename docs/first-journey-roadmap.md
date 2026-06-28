# First Journey Roadmap

Production pass for Act 1 — from first visit through the Concord landing.

## Act 1 flow (shipped)

```
FirstRun (cinematic) → First Duel: Pick (5 Forces, weekly rotation) → Tune (doctrine dials)
  → adopt as a rookie (level 1) → Void Garden arena (cinematic camera) → Evolve card
  → Concord landing (3 beats, introduces the Reader identity)
  → Guided first arena (Grounds gate spotlit, others dimmed) → Free roam + coach
```

## P0 — Broken promises ✅

| Item | Status | Notes |
|------|--------|-------|
| Real doctrine dials in train step | ✅ | `DoctrineDial` shared component |
| Player copy: duel not bout | ✅ | `lib/player-copy.ts` + first-journey UI |
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
| Reader's saga spine | ✅ | `lib/lore/saga.ts` — 8-chapter / 4-act arc keyed off Reader rank; `ReaderThread` hub marker |
| Season-turn cinematic | ✅ | `seasonTurnBeat()` — a Keeper performs the Chronicle when a new door opens (once per season) |
| Rival system | ✅ | `lib/lore/rival.ts` — recurring named Reader, persistent head-to-head, taunts that escalate; `RivalCard` + pre/post-duel beats |
| Directed character beats | ✅ | `CharacterBeat` upgraded: letterbox, rising/floating live 3D portrait, per-line glow pulse, typewriter, parallax field (reduced-motion aware) |

The saga (your story) and the Chronicle (the world's story) are deliberately
distinct: the saga advances off the one Reader-rank number so it moves no matter
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
- `lib/lore/saga.ts` — the Reader's saga arc + season-turn beat
- `lib/lore/rival.ts` — recurring rival identity, memory, taunts
- `lib/lore/character-beats.ts` — champion + Keeper voice beats
- `components/grounds/travel-veil.tsx` — scene-change transition
- `components/grounds/reader-thread.tsx` — saga hub marker
- `components/grounds/rival-card.tsx` — rival hub presence
- `components/grounds/character-beat.tsx` — directed narrative beat
- `lib/ambience-scores.ts` — procedural soundtrack per place
- `lib/player-copy.ts` — player-facing fight vocabulary
- `lib/sound-gallery.ts` — onboarding stinger map
- `lib/iconography.ts` — visual canon for UI
- `components/intro/first-duel.tsx` — onboarding overlay
- `components/intro/onboarding-audio.tsx` — floating mute control
- `components/shared/doctrine-dial.tsx` — doctrine sliders
- `components/grounds/grounds-screen.tsx` — sequencing + world travel + first-run guide (focus gate, idle escalation, walk-to nudge)
- `components/grounds/world.tsx` — match staging + cinematic camera; threads `guideWorld`/`guideUrgent` to the Concord
- `components/grounds/concord.tsx` — Concord scene; Vaultgate spotlight/dim treatment (`firstStop`/`dimmed`/`urgent`)
- `components/grounds/worlds.ts` — `FIRST_GUIDE_WORLD` (the steered-to first region)
