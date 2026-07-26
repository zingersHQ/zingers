# エージェントプロトコル

Zingersのチャンピオンはプラグイン可能な**エージェント**によって駆動されます。エンジンはターンごとに1つの質問を投げかけます：

> このゲーム状態と合法ムーブが与えられた場合、あなたは何をしますか？

## 契約

```typescript
interface AgentView {
  topic: string;
  round: number;
  arena: string;
  you: { name, type, persona, stance, hp, max, statuses };
  opponent: { name, type, hp, max, statuses, lastLine };
  legalMoves: { id, name, desc }[];
  strat: { risk, focus, aggression };
  memory: string[];  // 過去の戦いから最大6つのメモ
}

interface AgentDecision {
  move: string;   // 合法ムーブIDと一致する必要がある
  intent?: string;
  line: string;   // キャラクターらしい挑発台詞（≤14語）
  why: string;    // 観客向けの平易な説明
}

interface Agent {
  act(view: AgentView, ctx?: AgentTurnCtx): Promise<AgentDecision | null>;
}
```

`null`（または無効なムーブID）を返すと、エンジンは決定論的ヒューリスティックフォールバックを使用します。

## デフォルト：シングルショット（高速）

ライブハウス／OpenAI互換のブレインは、ターンごとに**1回**のJSON決定呼び出しで応答します。品質判定はデフォルトでローカル（`mockJudge`）で行われるため、ターン全体が1回のLLMラウンドトリップで完了し、読み込み画面は発生しません。必要な場合のみ低速パスを選択してください：

| 環境変数 | 効果 |
|----------|------|
| `ZINGERS_AGENT_TOOLS=1` | 制限付きツールループ（シミュレート／偵察→コミット） |
| `ZINGERS_LLM_JUDGE=1` | ターンごとのLLMウィットスコア品質乗数 |

## ツールループ（オプトイン）

`ZINGERS_AGENT_TOOLS=1` の場合、エンジンが `AgentTurnCtx` を提供すると、エージェントはエンジン自身の読み取り専用ツールを使って、理由付け→行動→観察→コミットの制限付きループを実行します：

| ツール | 返す内容（実際のエンジン計算、偽造なし） |
|--------|-----------------------------------------|
| `simulate_move(move)` | 合法ムーブの期待ダメージ、タイプ相性、状態異常確率。対戦相手のライブ状態に対して `resolve()` と同じ計算を平均品質／ジッターで実行 |
| `scout_opponent()` | 相手の現在のリゾルブ、状態異常、最後の台詞、最近のムーブ |
| `commit_move(move, line, why)` | 最終アクション：決定をロックしてループを終了 |

ループは上限（`MAX_STEPS`、デフォルト2）があり、最終ステップで強制的に `commit_move` が実行されるため、ターンは必ず解決します。失敗時はシングルショットJSONへ移行し、その後ヒューリスティックフォールバックが働きます。各ステップはターンの `trace[]` に `ToolStep` としてストリーミングされます（`lib/types.ts` 参照）。

`http` エージェントとモックエージェントはループをスキップし、`act(view)` 契約に直接応答します。

## プロバイダー

チャンピオンごとにTrainオーバーレイ（`Recipe.agent`）で設定：

| プロバイダー | 設定 | 実装 |
|--------------|------|------|
| `grok` | デフォルト | `XAI_API_KEY` 経由のハウスxAI |
| `openai` | `baseUrl`、`model`、任意の `apiKey` | 任意の `/chat/completions` API |
| `http` | `endpoint` URL | `AgentView` JSONをPOST → `AgentDecision` JSONを受信 |

## 戦いの接続

バトルおよびシミュレーションルートはURLパラメータからエージェント設定を読み取ります（`lib/recipe-params.ts` および `lib/engine/side-config.ts` 参照）：

```
/aprov=http&aurl=https://your-server/act
/bprov=openai&bbase=https://api.openai.com/v1&bmodel=gpt-4o
```

どちらかの側が外部エージェントを使用する場合、ハウスAPIキーがなくても戦いは**実戦**として実行されます。

## ローカルテスト

```bash
npm run dev
node scripts/test-agents.mjs   # モックHTTP + OpenAI互換サーバーを起動し、クロスモデル戦いを実行
```

## ソース

実装：`lib/engine/agent.ts`（ツール仕様 + `runToolLoop`）・エンジンツールおよび `previewMove` は `lib/engine/battle.ts` 内・関数呼び出しクライアントは `lib/engine/xai.ts` 内。
