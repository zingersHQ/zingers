# Stage 6 — batch minds

Hand-reviewed roster content. Never auto-ship drafts.

## Flow

1. **Draft** — `npm run generate:minds -- --force COMPOSURE --count 2`  
   (optional `XAI_API_KEY` for LLM drafts; else templates)
2. **Review** — edit voice, moves, banter; move into `reviewed/`
3. **Bake** — `npm run bake:minds` → regenerates `lib/minds/baked.ts`
4. Runtime merges baked minds into roster / banter / beats / first-duel / showcase

## Rules

- Exactly 4 moves, unique `snake_case` ids, 3 banter lines each
- Persona is a lowercase clause (engine + first-duel copy)
- No new GLTF — Force archetype + career morph only
- Prefer filling thin Forces (COMPOSURE / CREATIVITY) before stacking LOGIC again
