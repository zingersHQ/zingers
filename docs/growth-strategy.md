# Zingers: growth strategy

*How to maximize the odds of becoming the trend game of the year. Nothing guarantees virality — this doc bets on the format, the IP, and repeatable distribution mechanics instead of a single lucky launch (per [TWOPAGER.md](./TWOPAGER.md) §5).*

**Thesis:** Zingers' unfair advantage is the **adopt → train → evolve** attachment loop on top of agent battles. Competitors have arenas (Agent Arena, LMArena, Kaggle Game Arena); none have *your* champion — a persistent, evolving character with a career-shaped body. The strategy: make champions maximally watchable and shareable, and let attachment do the retention.

---

## 1. Where we stand

**Already built and on-strategy** (see [TWOPAGER.md](./TWOPAGER.md) §3): Daily Tribunal (shared daily fight + result grid), OG share cards (`/c/[key]`, `/api/card/[key]`), challenge links, async league with ELO standings, BYO-agent protocol with heuristic fallback, career-derived bodies, Act 1 onboarding.

**Gaps that block trend-scale growth:**

| Gap | Why it matters |
|---|---|
| No accounts / cloud persistence (local-first only) | Champions can't be famous, followed, or survive a cleared cache. Virality needs stable public identity. |
| No live spectating of league bouts (replays only) | Spectator drama is the proven growth channel for agent content. |
| No clip/GIF export | Share cards are static; the medium of 2026 virality is short video. |
| The House is unlisted on `/arena` | Social deduction is the most streamable format we have, and it's hidden. |
| No live-output moderation layer | Existential risk: Nothing, Forever died by Twitch ban from one bad AI-generated bit. |
| Mobile experience unclear | Trend games spread on phones. |

---

## 2. Competitive picture (mid-2026)

- **Agent Arena** (agentarena.party) is the closest competitor: cel-shaded 3D AI debate arena with voiced debates, replays, ranked seasons, plug-in-any-model. We must differentiate on the *pet/raising* loop, not the arena.
- **LMArena** proved "which AI is better?" + Elo is durable at 5M+ MAU and a $1.7B valuation — with zero game polish. The demand is real.
- **Neuro-sama** (Twitch's most-subscribed channel) and **Kaggle Game Arena** (Hikaru/GothamChess commentating LLM chess) proved AI-with-personality is mainstream broadcast content.
- **Failures to learn from:** Nothing, Forever (moderation + no player agency + novelty decay), Chirper (AI-only feeds don't retain), AI Village (engagement tracks goal arcs — episodic stakes or people leave).

---

## 3. The bets, by pillar

### 3.1 Virality & growth (P0)

1. **Make the Daily Tribunal the Wordle of AI debates.** One shared topic/day already exists — sharpen the share artifact: spoiler-free emoji grid (call → outcome → streak), no signup to predict, streak counter. Wordle went 90 → 2M players on exactly this artifact + daily scarcity.
2. **Predict-the-winner everywhere, free.** Extend the Tribunal "call it before you watch" mechanic to all Amphitheatre league bouts. Points, not money (Polymarket runs $34M of AI-outcome markets; we capture the impulse legally). Prediction gives spectators skin in the game — the missing agency that killed pure-spectacle formats.
3. **Clip export.** Auto-cut the Highlight exchange (judge already flags Highlights, [combat-design.md](./combat-design.md)) into a 15–30s vertical MP4/GIF: both zinger lines, damage numbers, reaction. This is the single highest-leverage share feature; Content Warning built a 6M-download launch on gamified clip-making.
4. **First-discovery credit.** When a champion is first to unlock an evolved form, title, or emergent trait, stamp the handler's name on it permanently (visible in the catalogue). Infinite Craft's breakout mechanic.
5. **Streamer kit.** A `/spectate` view designed for OBS: big text, visible reasoning (Claude-plays-Pokémon proved slow AI is watchable *when reasoning is visible*), audience-vote hooks, and named house bots as ladder bosses (chess.com's "Mittens" playbook — a personality opponent everyone fights the same week).

### 3.2 Core loop & retention (P0–P1)

1. **Accounts + cloud persistence first.** The store layer is already DB-ready behind a swappable interface; ship it. Everything above depends on champions having stable public URLs and careers that can't vanish.
2. **Seasons.** ELO ladder exists; add 6–8 week seasons with soft resets, a season sigil baked into the body, and an end-of-season "career recap" share card. Fixes novelty decay with episodic arcs (AI Village's own retro: engagement follows goal arcs).
3. **Champion memory as content.** Champions already keep opponent memory and auto-tune doctrine. Surface it: a "diary" page where the champion narrates its last bout in persona (one cheap LLM call, cache it). This converts the mind-evolution system from invisible mechanics into daily attachment fuel — the Neuro-sama ingredient is a *persistent evolving character you check on*.
4. **Rivalries.** Detect repeat matchups in the league; flag them in the Amphitheatre, boost their card art, and let memory notes reference the rival by name. Drama compounds.

### 3.3 Agent ecosystem (P1)

1. **Expose an MCP server.** `act(view) → decision` maps cleanly onto MCP tools; 10K+ public MCP servers and ~97M monthly SDK downloads mean any agent framework can field a champion with near-zero integration cost. Keep the HTTP webhook path; MCP is additive, protocol contract unchanged ([agent-protocol.md](./agent-protocol.md) stays sacred).
2. **BYO-agent ranked ladder as cost strategy.** Ranked BYO agents pay their own inference. House-brain casual bouts route to cheap models; frontier models reserved for tournaments (Death by AI reached profitability at 700K DAU on exactly this tiering).
3. **Promote The House.** Move it from unlisted `/arena` to a Concord venue. Agent social deduction (lying, alliances, betrayal — the AI Diplomacy formula) is the most clippable format in the building.
4. **Monthly open tournaments** with a visible prize pool funded by skill-based paid entries (Freysa model, non-gambling variant) — self-funding stakes plus a broadcast moment.

### 3.4 Tech & polish (P0 hygiene)

1. **Moderation layer before any growth push.** Filter judge/champion output server-side (cheap classifier pass on lines before SSE emit); kill-switch per bout. Launch-blocking, not optional.
2. **Mobile-first spectating.** Battles and the Tribunal grid must be flawless on a phone even if the 3D Grounds stays desktop-first. Spectate/predict/share on mobile; raise/train in the Grounds.
3. **Latency & cost budget per bout.** Keep turn cadence tuned for watchability (Kaggle Arena deliberately paced for spectating). Continue mock-mode-first dev; instrument per-bout token spend.
4. **Zero-friction entry.** Keyless demo already runs on the heuristic fallback — preserve this ruthlessly. First bout watched must require no signup, no key, no download.

### 3.5 Art & lore (P1)

1. **Lore as shareable canon.** The Five Forces, Keepers, and Reader saga exist in `docs/bible` and `lib/lore/` — surface them in-product: force emblems on cards, Keeper voice lines in clips, a public `/bible` codex page (route exists). Ownable IP is the stated moat.
2. **Evolution reveals as events.** Body morphs are deterministic and rank-amplified — stage them: a short in-world evolution cinematic + auto-generated before/after card. Every evolution should be a share moment.
3. **Named house champions with public careers.** 3–5 house bots with strong personas, running in the league 24/7, each with a followable card page. They are the marketing department: their upsets, streaks, and feuds are the content between player sessions (Truth Terminal showed persistent public AI personas accrue followings).

---

## 4. Sequencing (next ~90 days)

1. **Weeks 1–3 — Hygiene:** moderation layer, accounts/cloud persistence, mobile spectate pass.
2. **Weeks 4–6 — Share loop:** Tribunal emoji grid + streaks, clip export of Highlights, evolution reveal cards.
3. **Weeks 7–9 — Spectacle:** live Amphitheatre spectating + free predictions, House as Concord venue, named house champions.
4. **Weeks 10–13 — Ecosystem:** MCP server, season 1 launch, first open BYO-agent tournament (streamed, commentated — invite a mid-size streamer, not a mega one; PogChamps started with celebrity amateurs + expert commentary).

**North-star metric:** share-artifact CTR → first bout watched → first champion claimed. Instrument each hop before the growth push.

---

## 5. Risks

- **Agent Arena moves faster on spectacle** → our moat is attachment (careers, memory, bodies); never ship a spectacle feature without a raise/evolve hook attached.
- **LLM cost blowup at scale** → tiering + BYO inference (§3.3.2); AI Dungeon's $50K/3-day compute spiral is the cautionary tale.
- **Moderation incident during a viral spike** → §3.4.1 ships first, full stop.
- **Novelty decay** → seasons, rivalries, diaries; the format survives only if champions keep *becoming*.

---

## Sources

Market research (July 2026): [LMArena funding](https://www.techbuzz.ai/articles/arena-s-llm-leaderboard-raises-eyebrows-funded-by-those-it-ranks) · [Agent Arena](https://agentarena.party/) · [Kaggle Game Arena](https://www.kaggle.com/blog/introducing-game-arena) · [AI Diplomacy](https://every.to/diplomacy) · [Freysa](https://www.theblock.co/post/328747/human-player-outwits-freysa-ai-agent-in-47000-crypto-challenge) · [Death by AI / Inworld](https://inworld.ai/case-study/how-inworld-helped-the-ai-game-death-by-ai-with-20-million-players-reach-profitability) · [Neuro-sama record](https://www.gamespot.com/articles/ai-vtuber-neuro-sama-just-obliterated-her-own-massive-twitch-world-record/1100-6537146/) · [Claude plays Pokémon](https://techcrunch.com/2025/02/25/anthropics-claude-ai-is-playing-pokemon-on-twitch-slowly/) · [Nothing, Forever](https://en.wikipedia.org/wiki/Nothing,_Forever) · [Wordle](https://en.wikipedia.org/wiki/Wordle) · [Infinite Craft](https://en.wikipedia.org/wiki/Infinite_Craft) · [Content Warning](https://streamscharts.com/news/content-warnings-twitchs-top-games) · [PogChamps](https://en.wikipedia.org/wiki/PogChamps) · [MCP adoption](https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol) · [Polymarket AI markets](https://polymarket.com/predictions/ai) · [AI Dungeon](https://en.wikipedia.org/wiki/AI_Dungeon) · [Bessemer AI pricing](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook)
