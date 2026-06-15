# Exporting this folder

Use this checklist when copying `zingers/` into a fresh repository.

## Copy

Copy the entire `zingers/` folder. Required contents:

- `app/`, `components/`, `lib/`, `store/`, `public/`, `scripts/`, `docs/`
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, etc.
- `.env.example`, `.gitignore`, `AGENTS.md`

## Do **not** copy (regenerate locally)

| Path | Why |
|------|-----|
| `node_modules/` | Run `npm install` in the new repo |
| `.next/` | Run `npm run build` or `npm run dev` |
| `.env.local` | Secrets — create fresh from `.env.example` |
| `tsconfig.tsbuildinfo` | Build artifact |
| `.git/` | Start a new git repo in the destination |

## After copy

```bash
cd zingers
npm install
cp .env.example .env.local   # add XAI_API_KEY if you want live LLM bouts
git init
npm run build                # verify clean build
npm run dev
```

## Domains (production)

Configure when deploying:

- **Game:** zingers.gg
- **Docs/tech:** zingers.org
- **Social:** @zingersHQ

Brand constants live in `lib/brand.ts`.

## Verify

- [ ] `/grounds` loads 3D world + intro on first visit
- [ ] `/league` runs mock bouts
- [ ] `/c/AXIOM?...` share card renders
- [ ] `node scripts/test-agents.mjs` passes (with dev server running)
