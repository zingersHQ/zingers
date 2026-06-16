# Agent protocol

Zingers champions are driven by pluggable **agents**. The engine asks one question per turn:

> Given this game state and these legal moves, what do you do?

## Contract

```typescript
interface AgentView {
  topic: string;
  round: number;
  arena: string;
  you: { name, type, persona, stance, hp, max, statuses };
  opponent: { name, type, hp, max, statuses, lastLine };
  legalMoves: { id, name, desc }[];
  strat: { risk, focus, aggression };
  memory: string[];  // up to 6 notes from past bouts
}

interface AgentDecision {
  move: string;   // must match a legal move id
  intent?: string;
  line: string;   // in-character trash-talk bar (≤14 words)
  why: string;    // plain-English explainer for spectators
}

interface Agent {
  act(view: AgentView, ctx?: AgentTurnCtx): Promise<AgentDecision | null>;
}
```

Return `null` (or an invalid move id) → engine uses a deterministic heuristic fallback.

## Tool loop (live brains)

A live champion doesn't just emit a move — it **investigates first**. When the engine
supplies an `AgentTurnCtx`, the agent runs a bounded reason → act → observe → commit
loop with the engine's own read-only tools:

| Tool | What it returns (real engine math, no faked output) |
|------|------------------------------------------------------|
| `simulate_move(move)` | Expected damage, type matchup, status odds for a legal move vs. the live opponent state — the same math `resolve()` uses, at mean quality/jitter. |
| `scout_opponent()` | Opponent's current Resolve, statuses, last line, and recent moves. |
| `commit_move(move, line, why)` | Terminal action: locks the decision and ends the loop. |

The loop is capped (`MAX_STEPS`, default 3); the final step forces `commit_move` so a
turn always resolves. Any failure → heuristic fallback, so mock/offline bouts never break.
Each step is streamed as a `ToolStep` in the turn's `trace[]` (see `lib/types.ts`), so
spectators can watch a champion scout and simulate before it strikes.

Implemented for the house Grok brain and any OpenAI-compatible model that supports
function calling; `http` and mock agents skip the loop and answer the `act(view)` contract directly.

## Providers

Configured per champion in the Train overlay (`Recipe.agent`):

| Provider | Config | Implementation |
|----------|--------|----------------|
| `grok` | default | House xAI via `XAI_API_KEY` |
| `openai` | `baseUrl`, `model`, optional `apiKey` | Any `/chat/completions` API |
| `http` | `endpoint` URL | POST full `AgentView` JSON → `AgentDecision` JSON |

## Wiring a bout

Battle and sim routes read agent config from URL params (see `lib/recipe-params.ts` and `lib/engine/side-config.ts`):

```
/aprov=http&aurl=https://your-server/act
/bprov=openai&bbase=https://api.openai.com/v1&bmodel=gpt-4o
```

If either side brings an external agent, the bout runs **real** even without a house API key.

## Test locally

```bash
npm run dev
node scripts/test-agents.mjs   # spins mock HTTP + OpenAI-compat servers, runs a cross-model bout
```

## Source

Implementation: `lib/engine/agent.ts` (tool specs + `runToolLoop`) · engine tools and
`previewMove` in `lib/engine/battle.ts` · function-calling client in `lib/engine/xai.ts`.
