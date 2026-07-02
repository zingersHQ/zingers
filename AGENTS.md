<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Game-feel conventions (added 2026-07)

- **Frame-rate independence**: all per-frame smoothing in R3F code uses exponential damping (`1 - Math.exp(-lambda * dt)` or rad/s × dt), never raw per-frame lerp constants. Follow this for any new `useFrame` easing.
- **Reduced motion**: visual juice (screen shake, FOV kicks, camera lead, bursts) must be gated — CSS via `@media (prefers-reduced-motion: reduce)`, JS via `usePrefersReducedMotion` (`components/arena/juice.tsx`) or the existing `reduceMotion` setting in world code.
- **Arena juice**: presentation-only effects live in `components/arena/juice.tsx` + the "arena battle juice" section of `app/globals.css`. They layer on top of SSE events; never alter SSE semantics for presentation.
- **Music intensity/ducking**: the procedural score reacts through `lib/ambience-bus.ts` — `setAmbienceIntensity(0..1)` (battle heat; wired from `use-bout.ts` off min HP), `duckAmbience(amount, holdMs)` (sidechain dip under loud SFX/voice), `ambienceFlourish("victory"|"defeat")`. New loud one-shots in `lib/sfx.ts` should call `duckAmbience`. Soundtrack stays 100% procedural Web Audio — no audio files.
- **Scene dressing perf**: repeated GLTF props render through the instanced path in `components/grounds/nature.tsx` (`NaturePlacements`), not per-item `<primitive>` clones. Static dressing components are `React.memo`'d; keep seeded RNG call order stable so layouts don't shift. Expensive canvas textures are cached per palette.
