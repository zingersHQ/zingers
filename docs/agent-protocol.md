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
  act(view: AgentView): Promise<AgentDecision | null>;
}
```

Return `null` (or an invalid move id) → engine uses a deterministic heuristic fallback.

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

Implementation: `lib/engine/agent.ts` · used by `lib/engine/battle.ts`.
