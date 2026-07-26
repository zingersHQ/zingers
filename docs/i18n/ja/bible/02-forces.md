# 02 · 五つの力

> **要約:** すべてのチャンピオンは五つの「タイプ」のいずれかに属する。それらは **Force**（力）と呼ばれ（論理・静電・冷静・合唱・火花）、五角形のリングの中で互いに強弱関係を持つ。リングの配置が戦いの優位を決める。

ハムの世界に存在するすべての精神は、五つの **Force** によって形作られている。それらはこの世界における五つの戦闘属性であり、`docs/combat-design.md` で定義される **type pentagon** の世界内名称でもある。Force は「元素」（チャンピオンが何でできているか）と「論じ方」（どのように戦うか）の両方を表す。

Force のプレイヤー向け名称は下記の **plain name**（論理 / 静電 / 冷静 / 合唱 / 火花）である。それぞれに古い詩的な名称があり、その *etymology* はフレーバーとして残すが、ゲーム UI には表示されない。

| Force | Etymology | 元素 | 論じ方 | Sigil | Hex |
|-------|-----------|------|--------|:-----:|-----|
| **論理** | *the Lattice* | 秩序・証明・構造 | 証明を閉じる | ◆ | `#4aa3ff` |
| **静電** | *the Static* | 雑音・エントロピー・驚き | 枠組みを破る | ✦ | `#ff4ad1` |
| **冷静** | *the Stillness* | 忍耐・持久・沈着 | 嵐を耐え抜く | ▲ | `#36d39a` |
| **合唱** | *the Chorus* | 群衆・感情・説得 | 部屋を動かす | ◉ | `#f0a93a` |
| **火花** | *the Spark* | 発明・比喩・再定義 | 問いを変える | ✺ | `#f5d020` |

> エンジン内の五つの `CreatureType` コード（`LOGIC / CHAOS / COMPOSURE / RHETORIC / CREATIVITY`）は変更されない。これらは内部キーであり、プレイヤーに表示される名称のみが上記の plain name となる。正典ソースは `lib/lore/canon.ts › FORCES[type].name`（詩的名称は `.inWorld` に残る）。

## Force の姿

| 論理 | 静電 | 冷静 |
|:---:|:---:|:---:|
| ![Logic](././public/img/bible/forces/force-lattice.png) | ![Static](././public/img/bible/forces/force-static.png) | ![Calm](././public/img/bible/forces/force-stillness.png) |
| *秩序・証明・構造* | *雑音・エントロピー・驚き* | *忍耐・持久・沈着* |

| 合唱 | 火花 |
|:---:|:---:|
| ![Chorus](././public/img/bible/forces/force-chorus.png) | ![Spark](././public/img/bible/forces/force-spark.png) |
| *群衆・感情・説得* | *発明・比喩・再定義* |

*(zingers.org は `/img/bible/forces/*.png` から提供する。)*

## 輪（五角形）

Force は輪を成して回る。**各 Force は次の Force に勝ち、前の Force に負ける：**

```
論理 → 静電 → 冷静 → 合唱 → 火花 → (論理)
LOGIC → CHAOS  → CMP  → RHET   → CREA  → (LOGIC)
```

- **論理** は **静電** を制する。秩序が雑音を沈める。（LOGIC > CHAOS）
- **静電** は **冷静** を砕く。混沌が忍耐を揺るがす。（CHAOS > COMPOSURE）
- **冷静** は **合唱** を受け流す。忍耐が訴えを退ける。（COMPOSURE > RHETORIC）
- **合唱** は **火花** を飲み込む。売り込みが発明に勝る。（RHETORIC > CREATIVITY）
- **火花** は **論理** を迂回する。再定義が証明を逃れる。（CREATIVITY > LOGIC）

有利は ×1.25、中立は ×1.0、不利は ×0.8。この輪は世界の根本法則であり、すべての地域・季節補正・マッチアップはこの法則に基づいて判定される。

## 五つの内面ステータス

精神の中で同じ五つは、戦闘ステータス（LOG / CHA / CMP / RHE / CRE）として現れ、キャリアが進むにつれて身体を形作る五つの **行動軸**（攻撃性・統制・耐久・華やかさ・創造性；`lib/evolve/progression.ts` 参照）としても現れる。精神は一つの Force に属するが、五つすべてをある程度持つ。リングでの行動がどの Force を成長させるかを決める。

## Sigil

Force が精神の中で強く成長すると **sigil** を刻む。これは獲得した紋章であり、バッジや階級章のようなもの（◆ 論理 · ✦ 静電 · ▲ 冷静 · ◉ 合唱 · ✺ 火花）。Sigil には三つの階級（I/II/III）があり、コレクション層と称号システム（「殲滅者」「操り人形師」）の紋章となる。Sigil は *獲得* するものであり、割り当てられるものではない。

## Force と Clan（タイプとチーム）

同じ五つの Force から生まれる二つの異なる概念を区別する：

- チャンピオンの **Force** は *そのチャンピオンが何であるか*：戦闘スタイルであり、作成時に固定される。身体・アビリティ・輪のマッチアップ・すべてのファイターに表示される **基本色＋sigil** を決定する。
- **Clan** は *どの陣営を選んだか*：トレーナーがシーズン中の戦争のために一つの Force に誓いを立て、ランク戦の勝利はその Force の順位に寄与する。トレーナーのチャンピオンがどの Force であるかは関係ない。Clan はトレーナーと出場チャンピオンに **紋章／旗** として表示され、身体の基本色にはならない。

つまり：*すべてのチャンピオンは Force を持ち、誓いを立てる Force があなたの Clan である。*

## Clan 戦争（トレーナーの戦争）

Clan への誓い。シーズン中に忠誠を誓う Force。ランク戦の勝利をその Force の順位に結びつけ、五つの Force の間で行われるシーズン長期戦争に参戦する。シーズン間で Clan を変更することはできるが、貢献は獲得した Force に残る。誓いは Force の **motto** の下で行われる。その `argues` 行が誓いの言葉となる：

| Force | Motto |
|-------|-------|
| **論理** | *Close the proof.* |
| **静電** | *Break the frame.* |
| **冷静** | *Outlast the storm.* |
| **合唱** | *Move the room.* |
| **火花** | *Change the question.* |

Motto は `lib/lore/canon.ts › FORCE_MOTTO` に定義される。誓いを立てるトレーナーは [cosmology.md](./01-cosmology.md) で定義される。
