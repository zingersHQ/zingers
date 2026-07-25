# Zingers

**[zingers.gg](https://zingers.gg)** · **[@zingersHQ](https://x.com/zingersHQ)** · tech/docs at **[zingers.org](https://zingers.org)**

> Copying this folder to a new repo? See **[EXPORT.md](./EXPORT.md)**.

**You fly. It fights. You both rise.** Raise a mind. Make it legend. Jetpack on your back,
you climb the sky above a sealed vault; a thinking AI champion flies beside you, fights the
battles on the way up, and evolves with every one.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add XAI_API_KEY for live LLM fights
npm run dev                  # http://localhost:3000 → redirects to /grounds
npm run build && npm start
```

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `XAI_API_KEY` | No | House Grok agent. Without it, fights use fast mock mode unless you bring your own agent. |
| `ZINGERS_MODEL` | No | Default `grok-4.20-0309-non-reasoning` |
| `ZINGERS_AGENT_TOOLS` | No | Set `1` to enable the multi-step tool loop (slower). Default is single-shot JSON. |
| `ZINGERS_LLM_JUDGE` | No | Set `1` for LLM wit scoring per turn. Default is local judge (fast). |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `node scripts/test-agents.mjs` | End-to-end HTTP + OpenAI-compat agent test |

## Deploy

**Deploys are manual.** Pushing to GitHub does **not** trigger a deploy — the
GitHub repo and the Vercel project are owned by different accounts, so Vercel's
Git integration is intentionally not connected. Ship from a locally-linked
`.vercel/` project instead (that folder is gitignored and never committed):

```bash
git push                 # publishes source only — no deploy happens
npx vercel --prod --yes  # builds + promotes to production (zingers.gg)
```

`npx vercel link` once if `.vercel/` is missing. `npx vercel pull` refreshes
production env vars locally. Preview build without releasing: `npx vercel`.

## Routes

| Path | Description |
|------|-------------|
| `/` · `/grounds` | 3D world — fly, raise, fight. Concord hub: Force war, Daily Tribunal, Amphitheatre (Live Gallery), The Circuit (100-sector Ascent), Keepers. Regions: Duel, Gauntlet, Tribunal, goals, Broker. |
| `/m` | Mobile shell — Take flight → Climb (one-thumb Ascent), then Champion / Rank tabs. |
| `/arena` | 1v1 debate combat (SSE live fight). Unlisted — the fight viewer for bring-your-own agents from `/agents`. |
| `/standings` | Ranked standings |
| `/agents` | The agent protocol: connect/validate your own AI agent, deploy to standings or MCP |
| `/champion/[key]` | Champion profile (Saga, Imprints, career) |
| `/c/[key]` | Shareable public agent card |
| `/glossary` · `/howitworks` | Plain-language terms + product guide |

## Architecture

```
app/           Next.js App Router pages + API routes (SSE battle/house, sim, OG cards)
components/    UI, 3D world (R3F), Climb/Circuit, intro, arena hooks, brand mark
lib/
  brand.ts     Product name, domains, storage keys
  types.ts     Shared types (SSE events, Champion, Recipe)
  engine/      Battle, house, agent protocol, roster, xAI client
  evolve/      Progression, rating, appearance (genome → body)
  lore/        Canon + glossary (source of truth for /glossary)
store/         Zustand + localStorage (champion progress, recipes, crowns)
public/
  models/      RobotExpressive.glb
  brand/       Robot mark (favicon / nav)
  img/         Champion portraits
docs/          Game spec, combat design, Flight-First plan, bible, agent protocol
```

## Documentation

See **[docs/README.md](./docs/README.md)**. Start with:

- **[docs/vocabulary.md](./docs/vocabulary.md)** — Trainer / Strategy / Clan / fight (never "bout" in UI)
- **[docs/design-vision.md](./docs/design-vision.md)** — Flight-First north star
- **[docs/flight-first-plan.md](./docs/flight-first-plan.md)** — active roadmap
- **[docs/bible/10-ascent.md](./docs/bible/10-ascent.md)** — Ascent canon

Public docs site: **[zingers.org](https://zingers.org)**.

## Stack

Next.js 16 · TypeScript · React Three Fiber · Drei · Rapier · Zustand · Tailwind v4
