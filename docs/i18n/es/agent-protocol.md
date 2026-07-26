# Protocolo de agentes

Los campeones de Zingers se rigen por **agentes** intercambiables. Cada turno el motor plantea una sola pregunta:

> Dado este estado de partida y estos movimientos legales, ¿qué haces?

## Contrato

```typescript
interface AgentView {
  topic: string;
  round: number;
  arena: string;
  you: { name, type, persona, stance, hp, max, statuses };
  opponent: { name, type, hp, max, statuses, lastLine };
  legalMoves: { id, name, desc }[];
  strat: { risk, focus, aggression };
  memory: string[];  // hasta 6 notas de peleas anteriores
}

interface AgentDecision {
  move: string;   // debe coincidir con un id de movimiento legal
  intent?: string;
  line: string;   // frase de provocación en personaje (≤14 palabras)
  why: string;    // explicación en español sencillo para espectadores
}

interface Agent {
  act(view: AgentView, ctx?: AgentTurnCtx): Promise<AgentDecision | null>;
}
```

Devolver `null` (o un id de movimiento inválido) hace que el motor recurra a una heurística determinista.

## Predeterminado: disparo único (rápido)

Los cerebros de la casa en vivo o compatibles con OpenAI responden con **una** llamada JSON por turno. El juez de calidad es local por defecto (`mockJudge`), por lo que cada turno es un solo viaje de ida y vuelta al LLM, sin pantalla de carga. Activa las rutas más lentas solo si las necesitas:

| Entorno | Efecto |
|---------|--------|
| `ZINGERS_AGENT_TOOLS=1` | Bucle acotado de herramientas (simular / explorar → confirmar) |
| `ZINGERS_LLM_JUDGE=1` | Multiplicador de calidad por turno, puntuado por LLM |

## Bucle de herramientas (optativo)

Con `ZINGERS_AGENT_TOOLS=1`, cuando el motor proporciona un `AgentTurnCtx`, el agente ejecuta un bucle acotado de razonar → actuar → observar → confirmar mediante las herramientas de solo lectura del propio motor:

| Herramienta | Qué devuelve (cálculo real del motor, sin datos falsos) |
|-------------|---------------------------------------------------------|
| `simulate_move(move)` | Daño esperado, ventaja de tipo y probabilidades de estado para un movimiento legal frente al estado actual del oponente: la misma matemática que usa `resolve()`, con calidad y jitter promedio. |
| `scout_opponent()` | Resolve actual del oponente, estados, última frase y movimientos recientes. |
| `commit_move(move, line, why)` | Acción terminal: bloquea la decisión y finaliza el bucle. |

El bucle está limitado (`MAX_STEPS`, 2 por defecto); el último paso obliga a `commit_move` para que el turno siempre se resuelva. Cualquier fallo → JSON de disparo único, luego heurística de respaldo. Cada paso se transmite como un `ToolStep` en el `trace[]` del turno (véase `lib/types.ts`).

Los agentes `http` y simulados omiten el bucle y responden directamente al contrato `act(view)`.

## Proveedores

Configurados por campeón en la superposición de Entrenamiento (`Recipe.agent`):

| Proveedor | Configuración | Implementación |
|-----------|---------------|----------------|
| `grok` | predeterminada | Casa xAI vía `XAI_API_KEY` |
| `openai` | `baseUrl`, `model`, `apiKey` opcional | Cualquier API `/chat/completions` |
| `http` | URL `endpoint` | POST del JSON completo de `AgentView` → JSON de `AgentDecision` |

## Conexión de una pelea

Las rutas de batalla y simulación leen la configuración del agente desde parámetros de URL (véase `lib/recipe-params.ts` y `lib/engine/side-config.ts`):

```
/aprov=http&aurl=https://your-server/act
/bprov=openai&bbase=https://api.openai.com/v1&bmodel=gpt-4o
```

Si cualquiera de los bandos usa un agente externo, la pelea se ejecuta en **real** aunque no haya clave de API de la casa.

## Pruebas locales

```bash
npm run dev
node scripts/test-agents.mjs   # lanza servidores HTTP simulados y compatibles con OpenAI, ejecuta una pelea entre modelos
```

## Fuente

Implementación: `lib/engine/agent.ts` (especificaciones de herramientas + `runToolLoop`) · herramientas del motor y `previewMove` en `lib/engine/battle.ts` · cliente de llamadas a funciones en `lib/engine/xai.ts`.
