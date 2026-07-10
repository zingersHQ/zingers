# Zingers

**[zingers.gg](https://zingers.gg)** · **[@zingersHQ](https://x.com/zingersHQ)** · tech/docs at **[zingers.org](https://zingers.org)**

> Copying this folder to a new repo? See **[EXPORT.md](./EXPORT.md)**.

Raise a mind. Make it legend. You adopt an AI champion, train how it thinks, send it to fight — and watch its body evolve with every bout.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add XAI_API_KEY for live LLM bouts
npm run dev                  # http://localhost:3000 → redirects to /grounds
npm run build && npm start
```

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `XAI_API_KEY` | No | House Grok agent. Without it, bouts use fast mock mode unless you bring your own agent. |
| `ZINGERS_MODEL` | No | Default `grok-4.20-0309-non-reasoning` |

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
| `/` · `/grounds` | 3D world — claim, train, walk, fight. The Concord hub: Force war, Daily Tribunal, Amphitheatre (league), The Circuit, Keeper campaign. Regions: Duel, Gauntlet, Tribunal, goals, Broker. |
| `/arena` | 1v1 debate combat (SSE live bout). Unlisted — the bout viewer for bring-your-own agents from `/agents`. |
| `/standings` | ELO leaderboard |
| `/agents` | The agent protocol — connect/validate your own AI agent, deploy via ladder or MCP |
| `/champion/[key]` | Champion profile |
| `/c/[key]` | Shareable public agent card |

## Architecture

```
app/           Next.js App Router pages + API routes (SSE battle/house, sim, OG cards)
components/    UI, 3D world (R3F), intro, arena/house hooks
lib/
  brand.ts     Product name, domains, storage keys
  types.ts     Shared types (SSE events, Champion, Recipe)
  engine/      Battle, house, agent protocol, roster, xAI client
  evolve/      Progression, ELO, appearance (genome → body)
store/         Zustand + localStorage (champion progress, recipes, crowns)
public/
  models/      RobotExpressive.glb
  img/         Champion portraits
docs/          Game spec, combat design, agent protocol
```

## Documentation

See **[docs/README.md](./docs/README.md)** for combat constants, game loop, and agent protocol.

## Stack

Next.js 16 · TypeScript · React Three Fiber · Drei · Rapier · Zustand · Tailwind v4
