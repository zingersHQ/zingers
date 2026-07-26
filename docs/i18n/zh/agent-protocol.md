# 代理协议

Zingers 冠军由可插拔的**代理**驱动。引擎每回合只问一个问题：

> 给定当前游戏状态和合法招式，你要做什么？

## 契约

```typescript
interface AgentView {
  topic: string;
  round: number;
  arena: string;
  you: { name, type, persona, stance, hp, max, statuses };
  opponent: { name, type, hp, max, statuses, lastLine };
  legalMoves: { id, name, desc }[];
  strat: { risk, focus, aggression };
  memory: string[];  // 最多保留 6 条往期战斗备注
}

interface AgentDecision {
  move: string;   // 必须匹配合法招式 id
  intent?: string;
  line: string;   // 角色扮演式吐槽（≤14 词）
  why: string;    // 给观众看的简明解释
}

interface Agent {
  act(view: AgentView, ctx?: AgentTurnCtx): Promise<AgentDecision | null>;
}
```

返回 `null`（或无效招式 id）→ 引擎启用确定性启发式回退。

## 默认：单次调用（快速）

在线环境 / OpenAI 兼容模型每回合仅执行**一次** JSON 决策调用。  
默认由本地 `mockJudge` 担任质量评判，因此一回合只需一次 LLM 往返，无需加载界面。仅在需要时才开启较慢的路径：

| 环境变量 | 效果 |
|----------|------|
| `ZINGERS_AGENT_TOOLS=1` | 启用有界工具循环（模拟/侦察 → 提交） |
| `ZINGERS_LLM_JUDGE=1` | 每回合启用 LLM 机智评分质量乘数 |

## 工具循环（可选）

启用 `ZINGERS_AGENT_TOOLS=1` 后，当引擎提供 `AgentTurnCtx` 时，代理会运行有界的「推理 → 行动 → 观察 → 提交」循环，使用引擎自带的只读工具：

| 工具 | 返回内容（真实引擎数值，无伪造） |
|------|----------------------------------|
| `simulate_move(move)` | 对当前对手状态使用该合法招式的预期伤害、属性相克、异常状态概率；与 `resolve()` 使用的同一套数学模型，采用平均质量/抖动。 |
| `scout_opponent()` | 对手当前信念值、异常状态、最后一句台词及近期招式。 |
| `commit_move(move, line, why)` | 终结动作：锁定决策并结束循环。 |

循环上限为 `MAX_STEPS`（默认 2）；最后一步强制执行 `commit_move`，确保回合必定结束。任何失败 → 回退至单次 JSON 调用，再由启发式接管。  
每一步以 `ToolStep` 形式写入回合的 `trace[]`（详见 `lib/types.ts`）。

`http` 与 mock 代理跳过循环，直接响应 `act(view)` 契约。

## 提供商

在训练叠加层（`Recipe.agent`）中为每位冠军配置：

| 提供商 | 配置 | 实现 |
|--------|------|------|
| `grok` | 默认 | 通过 `XAI_API_KEY` 调用 xAI 内部服务 |
| `openai` | `baseUrl`、`model`，可选 `apiKey` | 任意 `/chat/completions` API |
| `http` | `endpoint` URL | POST 完整 `AgentView` JSON → 返回 `AgentDecision` JSON |

## 战斗接线

对战与模拟路由通过 URL 参数读取代理配置（见 `lib/recipe-params.ts` 与 `lib/engine/side-config.ts`）：

```
/aprov=http&aurl=https://your-server/act
/bprov=openai&bbase=https://api.openai.com/v1&bmodel=gpt-4o
```

任一方使用外部代理时，即使没有内部 API Key，战斗仍以**真实**模式运行。

## 本地测试

```bash
npm run dev
node scripts/test-agents.mjs   # 启动 mock HTTP 与 OpenAI 兼容服务器，执行跨模型对战
```

## 源码

实现：`lib/engine/agent.ts`（工具规范 + `runToolLoop`）· 引擎工具与 `previewMove` 位于 `lib/engine/battle.ts` · 函数调用客户端位于 `lib/engine/xai.ts`。
