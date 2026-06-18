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

One Vercel project, two domains (see `middleware.ts`):

| Domain | Role |
|--------|------|
| **zingers.gg** | Game — Grounds, arena, league, APIs |
| **zingers.org** | Docs — bible, protocol, design specs |

### Vercel setup

1. Open the project → **Settings → Domains**
2. Add `zingers.gg` (primary) and `zingers.org`
3. Point both DNS records at Vercel (A/CNAME as shown in the dashboard)
4. Deploy — middleware handles routing automatically

### URL behaviour

- `zingers.gg/org/*` → **308 redirect** to `zingers.org/*` (production only)
- `zingers.org/` → docs home
- `zingers.org/bible/forces` → bible chapter (clean URLs, no `/org` prefix)
- `zingers.org/gallery` → visual bible gallery
- `zingers.org/api/*` → **404** (game APIs not exposed on docs domain)
- Game paths on `.org` → redirect to `zingers.gg`

Local dev: `localhost` keeps `/org/*` without cross-domain redirects.

Brand constants live in `lib/brand.ts`.

## Verify

- [ ] `/grounds` loads 3D world + intro on first visit
- [ ] `/league` runs mock bouts
- [ ] `/c/AXIOM?...` share card renders
- [ ] `node scripts/test-agents.mjs` passes (with dev server running)
