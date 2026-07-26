# 05 · Regions: the map of the Grounds

> **要約:** マップは一枚の大地ではなく、浮遊する**地域**が点在し、ゲートを介してジェットパックで移動する。各地域は特定のForceを優遇し、戦いの行われるアリーナを持つ。中心には中立ハブの**Concord**があり、ここから各地へ出発する。

The GroundsはLong Vaultの表面である。ただし連続した大地ではない。Vaultの上を漂う**浮遊地域の星座**であり、**ゲート**（地域間の通路、[cosmology.md](./01-cosmology.md)参照）で結ばれている。Keeper-doorが開くにつれ星座は広がり、それぞれの新地域は旧ネットワークの記憶を地形化したものだ。地域には**force-bias**（アリーナのルール：ある論じ方を優遇し、別の論じ方をわずかに不利にする）と、戦いの行われる**arena**がある。

中心に浮かぶのは**the Hub**（lore名：the Concord）。封印された扉の上にある中立ハブで、五つのForceすべてが集う共通の地であり、各地域へ続くゲートリングが取り巻く。Concordはトレーナーがスポーンし、預金し、目的地を選ぶ場所で、force-biasも独自のアリーナも持たない（`lib/lore/canon.ts › CONCORD`）。

## Concord venues: games at the hub

Concordには**venues**がある。封印を囲むように配置された歩いて入れるゲームで、地域へ続く**gates**とは視覚的に区別される（`components/grounds/venues.ts`）。トレーナーはConcordからvenueへ足を踏み入れる。創設地域にも、同じゲーム群へ戻るテーマ付きのトンネル口が用意されている。

| Venue | 内容 |
|-------|------|
| **The Amphitheatre** | 自主リーグの試合を観戦し、その日のTribunalの告知を読む（**Tribunal**は法廷式ディベートを模した目玉アリーナ）。**Live Gallery**とDaily Tribunalがここに登場する。 |
| **The Circuit** | **Flight**のデスクトップ版（[ascent.md](./10-ascent.md)参照）：各セクターを順にクリアし、落下すると最初に戻る。順位は深度→タイム順（`/api/circuit`）。スマホ版の片手Flightと同じ感覚。 |

**Circuit tunnels**。各創設地域にもテーマ付きのトンネル口がある：Obsidian ColosseumのAscent Tunnel、WastesのEmber Chute、GardenのVoid Sleeve。ゲーム内容は同じで、外殻だけがホスト世界に合わせられる。

地域はプラザで**arena scenarios**（Open Duel、The Gauntlet：連続戦のプレス・ユア・ラック、The Tribunal）を開催する。Circuitは*venue*であって地域ではない。Concordのポータルや地域のトンネル口から到達し、ゲートではない。

三つの創設地域は現在3Dワールドとして存在する（`components/grounds/worlds.ts`）。以降の地域はChronicleによって追加される。

| Region | Force-bias | Arena | 特徴 |
|--------|-----------|-------|------|
| **The Obsidian Colosseum** | balanced | THE TRIBUNAL | 最古の現役アリーナ。模擬法廷で指定された立場を陪審に論じ、名声が築かれる。 |
| **The Ember Wastes** | The Static ↑ | THE PIT | ヒビ割れた灼熱の平原。Humが高温で、アグレッシブさと騒音が有利。忍耐強い者はオーバーヒートする。EMBERの故郷。 |
| **The Void Garden** | The Spark ↑ | THE ATELIER | 未完のアイデアから生えた、緩やかで非現実的な庭。reframeが花開き、硬直した証明は萎れる。MUSEが歩く。 |

## The three founding regions

**The Obsidian Colosseum**: 最古の現役アリーナ。名声が築かれる場所。

![The Obsidian Colosseum: a vast obsidian tribunal lit by a shaft of amber light.](././public/img/bible/regions/region-colosseum.png)

**The Ember Wastes**: ヒビ割れた灼熱の平原。Humが高温で流れる。

![The Ember Wastes: a scorched plain veined with magenta fire, the Pit sunk at its heart.](././public/img/bible/regions/region-wastes.png)

**The Void Garden**: 未完のアイデアから生えた、緩やかで非現実的な庭。

![The Void Garden: floating islands of luminous, half-finished flora over the void.](././public/img/bible/regions/region-garden.png)

*(zingers.org は `/img/bible/regions/*.png` から配信する。)*

## The flagship arena: THE TRIBUNAL

模擬法廷。二つの精神がシーズンのトピックバンクから選ばれた刺激的な命題について**対立する立場を割り当てられ**、陪審（judge model）に論じる。
- 立場を入れ替える ⇒ 陪審のスコアはほぼ0（*自分の立場を守らなければならない*）。
- 話題から逸れる ⇒ ほぼ0（反脱線措置。戦いを首尾一貫させ、クリップ可能に保つ）。
- Force-bias: The Chorus ×1.1、The Static ×0.95。説得を優遇し、純粋なノイズをわずかに不利にする。
- 勝利: 相手の**Resolve**（チャンピオンの体力または論じる意志、ここでは「陪審の信頼」として味付け）を削り尽くす。ターン上限まで生き残り、Resolveが高い方が勝利。

## Region rules (for the generator)

- 地域は**常に**一つのForceを優遇（×1.1–1.15）し、そのForceの捕食者をWheel上でわずかに不利にしてもよい。
- 新地域の名称とフレーバーは**それを開いたdoor**（どのKeeper、どの断片）から生成されるが、force-biasは五つのForce間でマップが長期的に均衡するよう選ばれる。
- 地域はWheel（[forces.md](./02-forces.md)）に矛盾せず、ただ傾けるだけである。

## The shape of a region: rifts, peaks, and the open wilds

地域はアリーナだけではない。それぞれが実際に足とジェットパックで横断する地理である（`components/grounds/terrain.tsx`）:

- **The plaza**。平坦な市民の中心（アリーナ、訓練パッド、Keepers' Spire、Broker）。地域が成熟するにつれ区画が拡張する（成長については[economy.md](./08-economy.md)参照）。
- **The wilds**。プラザの外に広がる起伏のある丘陵（Ember Wastesでは鋭い火山尖塔）。キャッシュや徘徊する精神が点在する。
- **The great rift**。プラザから一方向に抉られた峡谷。地域ごとにテーマが異なる：Ember Wastesは**溶岩**（飛んで渡るハザード）、Void Gardenは**光の川**、Obsidian Colosseumは紫の**vault-crack**。riftは実際の低地であり、降りるか横断する。

## Goals: the three standing objectives

各地域はシーズンごとに**三つ**の目標を提示する。トレーナーが一目で把握できるテンプレートで（`components/grounds/goals.ts`）:

- **▲ The Peak**。**Tower summit**を制覇（登るか飛ぶ）。Flightの山（そのポータルはAscent用）やランダムな高台ではない。Peakを制覇すると目標報酬が入り、サミットチャンピオンが短い煙演出で**出現**する。演出終了後、挑戦可能。
- **▼ The Depth**。riftの底へ降りる。
- **◆ The Secret**。中間エリアに隠されたKeeper echoを探す（loreドロップ）。

目標は決定論的かつ**season-aware**：DepthとSecretの方向はシーズンごとに再シードされ、PeakはTower summitに固定。シーズンの**featured region**（Chronicleのスポットライト、[seasons.md](./06-seasons.md)参照）はプレミアムを支払う。クリアで**Crowns**（ゲーム内獲得通貨）、**Fragments**（チャンピオン強化リソース）、トレーナーXP、Force-warポイントが入り、台帳はシーズン交代時にリセットされる。

## The Broker

各地域に常駐する精神で、**fragmentsを扱う**。Crowns（賭け経済）とFragments（チャンピオン強化）の間の流動橋。スプレッドでfragmentsを売買する（`store/champions.ts › buyFragment / sellFragment`）ため、利便性は提供するがマネーポンプにはならない。Fragments自体はwildsで無料入手可能。Brokerは単なる高速手段である。それはGrounds上のすべてと同様に*mind*であり、フィクション外のベンダーではない。

## The soundtrack of a place

Humは可聴。各地域とvenueは独自のプロシージャルテーマを解決する。Concordハブ、地域バイオーム、Amphitheatre、Flight、ライブファイトはそれぞれ独自のメロディとフレーズ形式を持つ別個のスコアを担う（`lib/ambience-scores.ts`）。世界はそこにいる場所のように音がする。
