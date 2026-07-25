# Stage 6 — batch minds (the dex)

Hand-shaped roster content. Never auto-ship unreviewed LLM sludge.

## Flow

1. **Forge a wave** — `npm run forge:dex` writes curated collectible minds into `reviewed/`  
   (name banks + voice kits; keeps STILL / KEEL / PRISM / FABLE)
2. **Or draft one** — `npm run generate:minds -- --force COMPOSURE --count 2`  
   (optional `XAI_API_KEY`; else templates). Polish, then move into `reviewed/`
3. **Bake** — `npm run bake:minds` → regenerates `lib/minds/baked.ts`
4. Runtime merges baked minds into roster / banter / beats / first-duel / showcase

## Rules

- Exactly 4 moves, unique `snake_case` ids (prefix with mind key), 3 banter lines each
- Persona is a lowercase clause (engine + first-duel copy)
- Short evocative names. No meme keys. No `DRAFT_*` in `reviewed/`
- No spaced em dash in player-facing strings. No player-facing "bout"
- No new GLTF — Force archetype + phenotype parts + career morph only
- Weekly starters rotate one per Force from First Minds + baked pool
