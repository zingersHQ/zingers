# First Journey Roadmap

Production pass for Act 1 — from first visit through the Concord landing.

## Act 1 flow (shipped)

```
FirstRun (cinematic) → First Duel pitch → Pick (5 Forces, weekly rotation) → Tune (doctrine dials)
  → Void Garden arena (cinematic camera) → Evolve card → Concord landing (3 beats) → Free roam + coach
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
| Pitch audio sting | ✅ | `lib/sound-gallery.ts` — gesture + CTA |
| Concord landing (3 beats) | ✅ | Seal → Vaultgates → Your session |
| Copy honesty on body evolution | ✅ | Pitch defers visible growth to evolve step |

## P2 — Polish ✅

| Item | Status | Notes |
|------|--------|-------|
| Player-facing bout purge (in-app UI) | ✅ | First journey, FirstRun, gauntlet objective, scenarios |
| Concord goal coach in hub | ✅ | One-time coachmark after Act 1 |
| Dedicated first-fight vignette camera | ✅ | `MatchView.cinematic` — tighter orbit |
| Sound gallery | ✅ | `lib/sound-gallery.ts` + stingers per onboarding beat |
| Iconography alignment | ✅ | `lib/iconography.ts` — art-direction palette + Force sigils |
| Seasonal starter rotation | ✅ | `firstDuelStarterKeys()` — weekly pick per Force |
| Onboarding sound toggle visible | ✅ | `OnboardingAudio` on FirstRun + FirstDuel overlays |

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
- `lib/lore/character-beats.ts` — champion + Keeper voice beats
- `lib/ambience-scores.ts` — procedural soundtrack per place
- `lib/player-copy.ts` — player-facing fight vocabulary
- `lib/sound-gallery.ts` — onboarding stinger map
- `lib/iconography.ts` — visual canon for UI
- `components/intro/first-duel.tsx` — onboarding overlay
- `components/intro/onboarding-audio.tsx` — floating mute control
- `components/shared/doctrine-dial.tsx` — doctrine sliders
- `components/grounds/grounds-screen.tsx` — sequencing + world travel
- `components/grounds/world.tsx` — match staging + cinematic camera
