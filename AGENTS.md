<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vocabulary & voice (added 2026-07)

- **Naming is governed by `docs/vocabulary.md`** — read it before writing player-facing copy or lore. Canon: player = **Trainer** (not Reader), champion strategy = **strategy** (not doctrine, in visible text only), the Force you swear to = **Clan** (not Allegiance/House). Never write **bout** in player-facing copy; use **fight** / **battle** / **duel**. Keep signature terms (the Grounds, Concord, Long Vault, Keepers, Sigil, Resolve…) but **gloss each on first use**.
- **Guiding copy:** write "what's next" as the champion (we/us, warm, direct). Never quest-sign chrome (`NEXT`, Compass-as-objective). **Never market** "it talks to you" / "voiced lines" as a feature. Gold: *"Stay with me. Nine more stretches of sky and we light the next camp."*
- **No em dash ` — ` in player-readable text** (UI, beats, glossary, public docs). Periods and short sentences. Code comments are exempt.
- **No ELO / no ladder in player copy:** use **standings**, **rank**, **board**, **rating**. Code ids may stay.
- **Glossary is the source of truth for definitions**: `lib/lore/glossary.ts` → rendered at `/glossary` and `docs/bible/09-glossary.md`. Reuse its one-line wording for inline glosses so they stay consistent.
- **Copy, not code**: change visible strings/JSX/aria text only; never rename identifiers, props, keys, or URL params to match a copy change.
- **Org docs sync**: zingers.org is this repo (`docs/` + `lib/org/registry.ts`). Any change to narrative, concept, core loop, mechanics, or mechanisms must update the matching public docs. Follow the **`org-docs-sync`** skill (`.cursor/skills/org-docs-sync/SKILL.md`).

# Internationalization (added 2026-07)

- **Locales:** `en` (source), `es`, `zh` (Simplified), `ru`, `ja`. Preference: `settings.locale` + `NEXT_LOCALE` cookie. No locale URL prefixes on the game host.
- **UI chrome:** `messages/{locale}.json` via `next-intl`. New player-facing strings land in `messages/en.json` first, then sibling locale files.
- **Terminology:** [`docs/i18n/terminology.md`](docs/i18n/terminology.md) governs borrow vs translate. Native rewrite for banter/wit; no MT dumps.
- **Minds / banter:** English in `content/minds/reviewed/*.json`; locales in `content/minds/reviewed/{locale}/` → `npm run bake:minds -- --locale <code>` → `lib/minds/baked/{locale}.ts`. Draft via `npm run i18n:draft-minds`.
- **Battles:** clients pass `lang` (automatic in `useBout`). Agent prompts + banter banks honor locale. Guardian **secret words stay English**.
- **Org docs:** `docs/i18n/{locale}/…` with English fallback; optional `/es|/zh|/ru|/ja` prefix on zingers.org.
- **Check:** `npm run i18n:check` for message key parity.

# Game-feel conventions (added 2026-07)

- **Flight parity (mobile + desktop)**: Flight is one soul, two bodies (`docs/essence.md`). Any change to rings/gates, hazards, camps, scout, gold rings, Flight sigil, rewards, or Prove must land on **both** `circuit-lite.tsx` (mobile) and desktop Circuit (`grounds-screen` / `world` / `circuit-hud`), preferably via shared `components/grounds/climb/*` helpers. Input/camera/perf may differ; missing features may not. Follow the **`flight-parity`** skill (`.cursor/skills/flight-parity/SKILL.md`).
- **Frame-rate independence**: all per-frame smoothing in R3F code uses exponential damping (`1 - Math.exp(-lambda * dt)` or rad/s × dt), never raw per-frame lerp constants. Follow this for any new `useFrame` easing.
- **Reduced motion**: visual juice (screen shake, FOV kicks, camera lead, bursts) must be gated — CSS via `@media (prefers-reduced-motion: reduce)`, JS via `usePrefersReducedMotion` (`components/arena/juice.tsx`) or the existing `reduceMotion` setting in world code.
- **Arena juice**: presentation-only effects live in `components/arena/juice.tsx` + the "arena battle juice" section of `app/globals.css`. They layer on top of SSE events; never alter SSE semantics for presentation.
- **Music intensity/ducking**: the procedural score reacts through `lib/ambience-bus.ts` — `setAmbienceIntensity(0..1)` (battle heat; wired from `use-bout.ts` off min HP), `duckAmbience(amount, holdMs)` (sidechain dip under loud SFX/voice), `ambienceFlourish("victory"|"defeat")`. New loud one-shots in `lib/sfx.ts` should call `duckAmbience`. Soundtrack stays 100% procedural Web Audio — no audio files.
- **Scene dressing perf**: repeated GLTF props render through the instanced path in `components/grounds/nature.tsx` (`NaturePlacements`), not per-item `<primitive>` clones. Static dressing components are `React.memo`'d; keep seeded RNG call order stable so layouts don't shift. Expensive canvas textures are cached per palette.
