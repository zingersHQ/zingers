# Протокол агента

Чемпионы Zingers управляются подключаемыми **агентами**. Движок задаёт один вопрос за ход:

> Учитывая текущее состояние игры и доступные ходы, что вы делаете?

## Контракт

```typescript
interface AgentView {
  topic: string;
  round: number;
  arena: string;
  you: { name, type, persona, stance, hp, max, statuses };
  opponent: { name, type, hp, max, statuses, lastLine };
  legalMoves: { id, name, desc }[];
  strat: { risk, focus, aggression };
  memory: string[];  // до 6 заметок из прошлых боёв
}

interface AgentDecision {
  move: string;   // должен совпадать с id легального хода
  intent?: string;
  line: string;   // внутриигровая фраза (≤14 слов)
  why: string;    // объяснение для зрителей
}

interface Agent {
  act(view: AgentView, ctx?: AgentTurnCtx): Promise<AgentDecision | null>;
}
```

Возврат `null` (или неверного id хода) → движок использует детерминированный эвристический fallback.

## По умолчанию: single-shot (быстрый)

Живые доменные / OpenAI-совместимые модели отвечают **одним** JSON-вызовом за ход.
Оценка качества по умолчанию локальная (`mockJudge`), поэтому ход — один круг LLM, без экрана загрузки. Включайте медленные режимы только при необходимости:

| Env | Эффект |
|-----|--------|
| `ZINGERS_AGENT_TOOLS=1` | Ограниченный цикл инструментов (simulate / scout → commit) |
| `ZINGERS_LLM_JUDGE=1` | Множитель качества по оценке LLM за ход |

## Цикл инструментов (опционально)

При `ZINGERS_AGENT_TOOLS=1`, когда движок передаёт `AgentTurnCtx`, агент выполняет ограниченный цикл reason → act → observe → commit с помощью read-only инструментов движка:

| Инструмент | Что возвращает (реальная математика движка, без подделок) |
|------------|----------------------------------------------------------|
| `simulate_move(move)` | Ожидаемый урон, типовой matchup, вероятности статусов для легального хода против текущего состояния оппонента: та же математика, что использует `resolve()`, при среднем качестве/джиттере. |
| `scout_opponent()` | Текущая Решимость оппонента, статусы, последняя фраза и недавние ходы. |
| `commit_move(move, line, why)` | Терминальное действие: фиксирует решение и завершает цикл. |

Цикл ограничен (`MAX_STEPS`, по умолчанию 2); последний шаг принудительно вызывает `commit_move`, чтобы ход всегда завершался. Любая ошибка → single-shot JSON, затем эвристический fallback.
Каждый шаг передаётся как `ToolStep` в `trace[]` хода (см. `lib/types.ts`).

`http` и mock-агенты пропускают цикл и отвечают напрямую по контракту `act(view)`.

## Провайдеры

Настраиваются для каждого чемпиона в оверлее Train (`Recipe.agent`):

| Провайдер | Конфиг | Реализация |
|-----------|--------|------------|
| `grok` | по умолчанию | Доменный xAI через `XAI_API_KEY` |
| `openai` | `baseUrl`, `model`, опционально `apiKey` | Любой API `/chat/completions` |
| `http` | URL `endpoint` | POST полного JSON `AgentView` → JSON `AgentDecision` |

## Подключение боя

Маршруты battle и sim читают конфиг агента из URL-параметров (см. `lib/recipe-params.ts` и `lib/engine/side-config.ts`):

```
/aprov=http&aurl=https://your-server/act
/bprov=openai&bbase=https://api.openai.com/v1&bmodel=gpt-4o
```

Если любая сторона использует внешнего агента, бой запускается **реальный** даже без доменного API-ключа.

## Локальное тестирование

```bash
npm run dev
node scripts/test-agents.mjs   # запускает mock HTTP + OpenAI-совместимые серверы, проводит кросс-модельный бой
```

## Исходники

Реализация: `lib/engine/agent.ts` (спецификации инструментов + `runToolLoop`) · инструменты движка и `previewMove` в `lib/engine/battle.ts` · клиент function-calling в `lib/engine/xai.ts`.
