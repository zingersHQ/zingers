# Zingers: growth strategy

*How to maximize the odds of becoming the trend game of the year. Nothing guarantees virality. This doc bets on the format, the IP, and repeatable distribution mechanics instead of a single lucky launch (per [TWOPAGER.md](./TWOPAGER.md) §5).*

**Thesis:** Zingers' unfair advantage is **Flight as the face** plus the **Trainer ↔ champion bond**. Competitors have arenas (Agent Arena, LMArena, Kaggle Game Arena). None have *your* climb *and* *your* wingmate: a mind that flies beside you, marks its body from the sky you share, and fights when the climb asks for it. Battles are depth on the way up, not the growth hook. Door: [two-doors.md](./two-doors.md). Soul: [essence.md](./essence.md).

**Content law:** Sell the flight and the relationship first. Never center a growth push on fight clips, dunk lines, or arena spectacle as the primary share artifact. If a share would still make sense with battles muted, it is on-strategy. If it only works as "watch two AIs argue," it is secondary depth, not the face.

---

## 1. Where we stand

**Already built and on-strategy** (see [TWOPAGER.md](./TWOPAGER.md) §3, [flight-first-plan.md](./flight-first-plan.md)): Flight-First Climb/Circuit (100-sector sky), mobile `/m` Take flight door, Climb challenge shares (`/ascent/<id>`), champion OG cards (`/c/[key]`), flight-hero posters from real models, Art Studio for posing meshes, Daily Tribunal, career-derived bodies + Saga/Imprints, wingmate flight, unique champion names.

**Gaps that block trend-scale growth:**

| Gap | Why it matters |
|---|---|
| No accounts / cloud persistence (local-first only) | A bond needs a stable public identity. Cleared cache kills the legend. |
| Climb challenge share is thin | Link + still exists; not yet a rich "we flew this far" card with wingmate, depth, sigil, ghost. |
| No Flight / bond short-form capture | 2026 virality is short video and posters. The capture must be sky + relationship, not arena Highlights. |
| Key art / social rasters still sparse | Landing uses real-model stills; weekly `@zingersHQ` and OG need a repeatable forge from our meshes. |
| No live-output moderation layer | Existential risk when any AI line fans out (Nothing, Forever lesson). Still required before a hard push. |
| Climb feel playtests unfinished | Growth push waits on Flight-First gates ([flight-first-plan.md](./flight-first-plan.md)). |

**Demoted (not the growth spine):** battle Highlight clip export, Amphitheatre-first spectate kits, "clip-able dunk" as the hero share. Those may exist later as *depth reveals* under the climb. They must not drive content strategy, SEO, or the north-star funnel.

---

## 2. Competitive picture (mid-2026)

- **Agent Arena** is the closest arena competitor. Differentiate on Flight + raising + bond, not on debate spectacle.
- **LMArena** proved "which AI is better?" + rating is durable. Demand for watching minds is real. We channel it *through* a character you fly with, not a cold board.
- **Neuro-sama** proved persistent AI personality retains. Our version is a wingmate with a body shaped by *your* climbs and raises, not a streamer you only watch.
- **Hyper-casual climbers** are commodities. Our Climb is not Flappy with agents bolted on. The run marks the champion; the champion flies beside you; the world under the sky is real.
- **Failures to learn from:** Nothing, Forever (moderation + no player agency); Chirper (AI-only feeds); AI Village (engagement needs goal arcs). Also: selling the secondary verb (battles) after choosing Flight as the face.

---

## 3. The bets, by pillar

### 3.1 Virality & growth (P0) — Flight + bond

1. **Climb challenge as the Wordle atom.** Sharpen `/ascent/<id>`: sector/depth, time or ghost, wingmate portrait from *our* mesh, Trainer legend line ("Stay with me…"), one-tap rematch. Cold open → Take flight. This is the primary share spine.
2. **Bond cards, not dunk cards.** Share artifacts that read as *relationship*: first claim, first camp lit together, sigil growth after a Reach, Imprint reply + dial nudge, evolution after flight (body changed because you climbed). Before/after of the *pair in the sky*, not two fighters in a pit.
3. **Flight / bond short-form.** Vertical stills and short cuts from real Climb/Circuit captures (Art Studio + in-run capture): wingmate on the line, near-miss, Reach clear, ghost race. AI may dress atmosphere using [art-direction.md](./bible/art-direction.md) style keys. AI must not invent the champion silhouette. Identity comes from our models.
4. **First-discovery credit.** When a Trainer's champion first unlocks a form, title, or Flight-marked trait, stamp the Trainer on it in the catalogue. Infinite Craft's breakout, applied to bond + ascent.
5. **Streamer kit for Flight.** OBS-friendly Climb / ghost race / "beat my sector" view: big depth, wingmate visible, minimal chrome. Audience races the ghost. Battles can appear as depth under the climb later; they are not the kit's hero mode.

### 3.2 Core loop & retention (P0–P1)

1. **Accounts + cloud persistence first.** Stable public URLs for Trainer legend + champion career. Bond cannot live only in `localStorage`.
2. **Seasons that mark Flight.** Soft resets, season mark on the body/sigil, end-of-season recap: highest sky, camps lit, wingmate lines, how the body changed. Recap card is shareable.
3. **Champion memory as bond content.** Surface diary / return greetings / "what we did in the sky" in persona. Cheap LLM, cached. Attachment fuel is *checking on someone who flew with you*, not only who fought last.
4. **Rivalries under the climb.** Repeat foes and ghosts can create drama. Frame them as obstacles on a shared ascent when possible, not as a separate esports product.

### 3.3 Agent ecosystem (P1)

1. **Expose an MCP server.** `act(view) → decision` on MCP; HTTP webhook stays. Protocol contract sacred ([agent-protocol.md](./agent-protocol.md)).
2. **BYO-agent ranked board as cost strategy.** Ranked BYO pays own inference. Built-in brain for casual. Frontier models for rare events.
3. **The House stays depth.** Promote carefully as a Concord / agent venue when ready. Do not let social-deduction clips redefine the brand face.
4. **Open events** that still honor the face: ghost races, Reach clears, season Flight boards; tournaments that include fights only as part of the wider legend.

### 3.4 Tech & polish (P0 hygiene)

1. **Moderation before any growth push.** Filter live AI lines server-side; kill-switch. Launch-blocking when public fan-out exists.
2. **Mobile-first Flight.** Take flight / Climb must be flawless on a phone. Champion tab is where the bond lives on mobile. Spectate/predict are secondary lanes, not the door ([two-doors.md](./two-doors.md), [mobile.md](./mobile.md)).
3. **Cost budget.** Climb-first sessions stay near-zero LLM cost. Spend tokens on bond lines and rare depth, not on making every cold open a fight.
4. **Zero-friction entry.** First Take flight / Climb requires no signup, no key, no download. Claim wingmate after the sky feels good.

### 3.5 Art, content forge & SEO (P1)

1. **Render-first, AI-enrich second.** Capture real meshes (Art Studio, flight-hero still pipeline, Climb poses). Enrich with AI for posters, social, key art under [art-direction.md](./bible/art-direction.md). Style key locks the universe. Never replace the champion with a generated lookalike as the identity plate.
2. **Lore as shareable canon.** Forces, Keepers, Trainer saga on cards and org docs. Ownable IP is the moat. SEO rides real stills + glossary/bible routes + challenge landings, not fight-transcript farms.
3. **Named house champions with public careers.** A few followable minds whose *ascent and bond story* (and fights under it) feed `@zingersHQ` between player sessions.
4. **Weekly ship notes.** Human-owned distribution on `@zingersHQ`: Flight feel, bond moments, key art from the forge. Not dunk-of-the-week as the default post.

---

## 4. Sequencing (next ~90 days)

1. **Weeks 1–3 — Hygiene + feel:** moderation where AI fans out; accounts/cloud path; Climb playtests; instrument door funnel (`fj_*`, `/stats` MOBILE DOOR).
2. **Weeks 4–6 — Flight share loop:** richer Climb challenge cards; bond/evo-from-ascent cards; first Flight short-form / poster pack from real captures (+ optional AI dress).
3. **Weeks 7–9 — Bond depth:** champion diary / check-in surfaces; season recap sketch; house champions as public wingmates; streamer Flight kit.
4. **Weeks 10–13 — Ecosystem:** MCP; season 1 with Flight boards; optional open event that still leads with climb + bond. Tribunal emoji-grid and fight spectate may ship as *secondary* daily rituals, never as the face rewrite.

**North-star metric:** share-artifact CTR (challenge / bond card) → first Take flight / Climb → guest→claim wingmate → return flight / raise. *First fight watched* is a depth conversion, not the top of the funnel. Instrument each hop before the growth push (`docs/two-doors.md`).

---

## 5. Risks

- **Relapse into arena marketing** → any "clip the dunk" push that outruns Flight share work is a strategy failure, not a win. Kill it or demote it.
- **Agent Arena owns spectacle** → our moat is attachment in the sky; never ship spectacle without a raise / Flight / bond hook.
- **LLM cost blowup** → tiering + BYO (§3.3.2); Climb stays cheap.
- **Moderation incident during a spike** → §3.4.1 first.
- **Novelty decay** → seasons, sigil growth, diaries, rival ghosts; champions keep *becoming* with the Trainer.

---

## Sources

Market research (July 2026): [LMArena funding](https://www.techbuzz.ai/articles/arena-s-llm-leaderboard-raises-eyebrows-funded-by-those-it-ranks) · [Agent Arena](https://agentarena.party/) · [Kaggle Game Arena](https://www.kaggle.com/blog/introducing-game-arena) · [AI Diplomacy](https://every.to/diplomacy) · [Freysa](https://www.theblock.co/post/328747/human-player-outwits-freysa-ai-agent-in-47000-crypto-challenge) · [Death by AI / Inworld](https://inworld.ai/case-study/how-inworld-helped-the-ai-game-death-by-ai-with-20-million-players-reach-profitability) · [Neuro-sama record](https://www.gamespot.com/articles/ai-vtuber-neuro-sama-just-obliterated-her-own-massive-twitch-world-record/1100-6537146/) · [Claude plays Pokémon](https://techcrunch.com/2025/02/25/anthropics-claude-ai-is-playing-pokemon-on-twitch-slowly/) · [Nothing, Forever](https://en.wikipedia.org/wiki/Nothing,_Forever) · [Wordle](https://en.wikipedia.org/wiki/Wordle) · [Infinite Craft](https://en.wikipedia.org/wiki/Infinite_Craft) · [PogChamps](https://en.wikipedia.org/wiki/PogChamps) · [MCP adoption](https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol) · [AI Dungeon](https://en.wikipedia.org/wiki/AI_Dungeon) · [Bessemer AI pricing](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook)

Companions in-repo: [two-doors.md](./two-doors.md) · [essence.md](./essence.md) · [flyover.md](./flyover.md) · [bible/art-direction.md](./bible/art-direction.md) · [flight-first-plan.md](./flight-first-plan.md)
