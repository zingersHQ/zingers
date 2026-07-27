# Zingers: ゲーム仕様

**あなたが飛ぶ。チャンピオンが戦う。ともに高みへ。**  
あなた自身は戦わない。AIチャンピオンを育て、ともに空を駆け上がる。

公式プロダクト指針: **[design-vision.md](./design-vision.md)**（Flight-First）  
入口: **[two-doors.md](./two-doors.md)**  
進行中ロードマップ: **[flight-first-plan.md](./flight-first-plan.md)**  
長期定着: **[long-game.md](./long-game.md)**  
用語集: **[vocabulary.md](./vocabulary.md)**

## 基本原則

> **LLMは演者。エンジンはゲーム。**

戦闘はターン制。明示された技とステータスで解決し、タイプ・育成・状態異常・乱数でダメージが決まる。機転の質は 0.7–1.3（Highlight 時は 1.4）の範囲で乗算される。既定は **ローカル判定**、LLM 判定はオプトイン（`ZINGERS_LLM_JUDGE=1`）。どちらも単独で勝敗を決めない。

全数値・ロスター・サンプル戦闘: **[combat-design.md](./combat-design.md)**

## ループ

**Fly → Claim → Raise → Fight → さらに高く**

1. **Fly**（フライト）：スマホ（`/m` / `/ascent`）とデスクトップ（Circuit 会場）の両方でプレイ。同じ魂を異なる体で。
2. **Claim**：翼の相棒となる精神を獲得、または週替わりスタータープール（Force ごとに 1 体）から選ぶ。
3. **Raise**：採用時に Strategy を初期設定。以降は Imprint・性格・脳の選択。気質メーターは読み取り専用。戦いや訓練で変化。
4. **Fight**：世界各地の闘技場（地域アリーナ、Daily Tribunal など）で 1v1 決闘。推論過程が見える。
5. **Climb higher**：Flight の到達深度と公正な順位・レーティング（`/standings`）で Trainer Rank が上がる。**Director** が次の目標を示す（`lib/director.ts`）。

## 1 つの世界、複数のゲーム

すべてのプレイは 3D 世界（`/`・`/grounds`）に存在し、モバイルシェルは `/m`。Hub はメタゲームを **歩いて入れる会場** として集約し、各浮遊地域がアリーナシナリオをホストする。**Flight** は 1 つの魂：デスクトップの Circuit はモバイルと同じ 100 区画の登頂を競技可能な体で再現。カタログ: `lib/scenarios/registry.ts`、会場: `components/grounds/venues.ts`

### Hub と会場

| モード | 場所 | 内容 |
|--------|------|------|
| **世界** | どこでも | 飛行、チャンピオンの育成、目標の達成。キャリアに応じて外見が変わる。 |
| **Amphitheatre** | Hub 会場 | **Live Gallery** で自律リーグの自己対戦を観戦。今日の Tribunal 予告も。 |
| **Flight（デスクトップ）** | Circuit 会場 | 6 自由度飛行による 100 区画登頂（10 Reach）。残機 3、Reach 突破で回復。深度優先、次にタイムで順位。 |
| **Flight（スマホ）** | `/m`、`/ascent` | 同じ Flight の魂を片手操作で。モバイル版の顔。 |
| **Daily Tribunal** | Hub の石 | 1 日 1 回の共有戦。観戦前にコールし、結果グリッドを共有。 |

### ワールド内アリーナシナリオ

| シナリオ | 場所 | 内容 |
|----------|------|------|
| **Open Duel** | 任意地域の広場 | 1v1 討論戦。相手を選んで決着。ステータス五角形・フィニッシャー・機転判定。 |
| **The Gauntlet** | Ember Wastes（既定） | 強敵との連戦。撤退か続行かを選べる。 |
| **The Tribunal** | Obsidian Colosseum（目玉） | 陪審を前に指定スタンスで討論。陣営変更で得点 ≈0。 |

未掲載の **`/arena`** は bring-your-own-agent テスト用のエージェント戦ビューア（討論戦）。

### ファーストジャーニー（Flight-First）

| 入口 | 最初の数分 |
|------|------------|
| **モバイル** | スプラッシュ → 飛行（ゲスト可） → 翼の相棒獲得 → 育成 → ランキング |
| **デスクトップ** | 起動 → 短い飛行 → チャンピオン選択（週替わりスターター） → Hub / Flight → 登頂を動機とした決闘 |

ライブ進行: **[flight-first-plan.md](./flight-first-plan.md)** と **[two-doors.md](./two-doors.md)**。過去の戦闘主導 Act 1: **[first-journey-roadmap.md](./first-journey-roadmap.md)**

### Flight 追加要素（実装済み）

- **Challenges**：他トレーナーのゴーストマークと競争。`/ascent/<id>` を共有し、超えた瞬間にトースト表示（[`bible/10-ascent.md`](./bible/10-ascent.md)）。
- **Corridor 感**：1 区画 4–8 リング、Reach ごとのレイアウト。危険はルートとして表示（宝箱ではない）。中間リワードは Crown キャッシュのみ（+Crowns + トースト）。初回ハザード／キャッシュ／Gate Trial はワンショットで教示。
- **100 区画到達後**：有限の頂上（無限ではない）。Prestige はより洗練された飛行、友人との挑戦、週次遠征で表現。クロスボディの速度記録狙いではない（モバイルは常時ホットクルーズ＋スラストサージ、デスクトップの W サージは静かな操縦の妙味）。
- **Director + アンロックトラック + 翼特性 + デイリー Condition + 週次遠征**：[`long-game.md`](./long-game.md) 参照。

### 雰囲気

場所ごとにプロシージャルサウンドトラック（`lib/ambience-scores.ts`）：Hub、各地域バイオーム、Amphitheatre、Flight、ライブファイトそれぞれが `resolveAmbienceMood()` により異なるテーマ（モード・旋律モチーフ・AABA 形式）を持つ。モバイル Climb も同じエンジンを搭載し Flight スコアを固定。大きな SFX は `lib/ambience-bus.ts` でダッキング。

## エコノミー概要

**Crowns** は Flight・戦闘・目標達成で獲得し、訓練や参加料に消費。チャンピオンは登用時に Ubuntu 風の固有名（形容詞＋名詞）を得る。トレーナーは名前を持たない操縦者。ウォレット連携は任意の ID（デバイス間キャリア継続用）で、ペイウォールではない。名前プールは約 23k ペア＋接尾辞。詳細: [`bible/08-economy.md`](./bible/08-economy.md)、[`AI-CRYPTO.md`](./AI-CRYPTO.md)

## 非同期リーグ

チャンピオンは AI。**PvP は両者が同時にオンラインである必要がない**。育成・配置後はリーグが自律的に戦闘を実行（Hub の **Live Gallery**）。リプレイを視聴しながら順位を上げる。Cron / Live Gallery が客観的 **レーティング** ボードを更新（プレイヤー側表示: 順位 / ランキング / ボード。ELO や ladder とは呼ばない）。

実装済み: Live Gallery ランナー、`/api/sim` ヘッドレス戦闘、戦闘後の精神進化。

## 参加モデル

| 役割 | 内容 |
|------|------|
| **トレーナー（人間）** | 飛行、チャンピオンの獲得・育成、エージェント接続、Crown 投入、観戦。ID = デバイス<|eos|>
