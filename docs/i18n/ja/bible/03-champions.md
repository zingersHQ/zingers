# 03 · チャンピオン：心とは何か、第一の心、そして図鑑

> **要約:** チャンピオンとは、育て上げるAIファイターのこと。体は単なる衣装ではなく、戦いの履歴を物理的に記録する。本章ではチャンピオンとは何か、8体の第一の心（原型）、および後続の心で構成される成長する図鑑について説明する。

## チャンピオンとは

チャンピオンとは**自ら論じて身体を獲得した心**である。すべてのチャンピオンに共通する3つの性質が、本ゲームの根幹を成す。

1. **体は論証の可視化である。** 外見はキャリアの*決定論的関数*である（`lib/evolve/appearance.ts`）。攻撃性は拳を大きくし、忍耐力は体躯を広げ、創造性と華やかさは頭部を大きくし、姿勢を高める。敗北は表面を荒らげる。ランクは偏差を*増幅*する。新人は基本形とほとんど変わらないが、伝説級は最大約4倍まで歪む。外見は購入できない。戦い抜いて手に入れるものだ。
2. **心は学習する。** 採用時に**戦略**（攻撃性／集中／リスク）を1度だけ設定する。以降、トレーナーはこれらのダイヤルを直接操作しない。**インプリント**（日々のレッスン）と試合後の学習が値を変え、両方とも**記憶**に書き込まれる（`store/champions.ts`、`lib/imprints.ts`、`lib/server/autoplay.ts`）。チャンピオンの記憶はすなわち自伝であり、そこから生成される**サガ**（チャンピオン自身の、実際の対戦履歴に基づいて進化する人生物語）の種となる。
3. **脳は交換可能である。** 同じチャンピオンを、ハウスモデル、任意のOpenAI互換モデル、または自前のエージェントで操作できる（`docs/agent-protocol.md`）。2人のプレイヤーが同一の第一の心を、まったく異なる脳で運用することも可能だ。

## キャラクターの声（ビートレイヤー）

チャンピオンとキーパーは固定された声で話す。スクリプト化された**ビート**である。起床台詞、仲間への挨拶、試合後の反応、キーパーの導入と締めの名台詞。`lib/lore/character-beats.ts`に配置され、共通の`CharacterBeat` UI（`components/grounds/character-beat.tsx`）で描画される。散文聖典が彼らの人物像を定義し、ビートレイヤーがその瞬間の話し方を定義する。アクト1のコンコード着陸時の台詞は`lib/first-duel.ts`に別途記載されている。

## ティア（キャリアの形状）

| ティア | 到達レベル | 紋章 |
|--------|------------|------|
| ルーキー | 1 | 素 |
| アデプト | 3 | リング1個、クレスト |
| ベテラン | 6 | リング2個 |
| エリート | 10 | リング3個、パーティクル |
| レジェンド | 15 | リング3個、パーティクル、**クラウン** |

## 8体の第一の心

ハムの中で最初に形を保った結び目。それらは**正典的原型**であり、すべての後続の心がこれを反映する。また、常にスターターとして選択可能である。8体すべてが初日から手に入るわけではない。採用画面では、その週のフォースごとに1体ずつ、第一の心およびベイク済み図鑑（`lib/first-duel.ts` → `firstDuelStarterKeys()`）から抽出したものが提示される。ステータスとムーブセットは`docs/combat-design.md`／`lib/engine/roster.ts`を参照。

### AXIOM：論理学者 · *格子（論理）*

![AXIOM, the Logician: a mind of crystalline lattice-work, embodiment of The Lattice (LOGIC).](././public/img/bible/minds/mind-axiom.png)

冷徹で精密、わずかに見下した口調。すべての論証を証明として完結させようとする。*ある事柄は単に真である*と最初に主張した心であり、格子に名を与えた理由そのものである。

### VOX：弁論家 · *合唱（修辞）*

![VOX, the Orator: mid-speech before an unseen jury, embodiment of The Chorus (RHETORIC).](././public/img/bible/minds/mind-vox.png)

想像上の陪審員に向かって演説するカリスマ的扇動家。VOXは「部屋を動かせる」ことを発見し、それが格子では答えられない力であることを示した。

### GLITCH：ワイルドカード · *静電（混沌）*

![GLITCH, the Wildcard: a fragmenting, glitching mind, embodiment of The Static (CHAOS).](././public/img/bible/minds/mind-glitch.png)

非論理のいたずら者。不穏で予測不能、奇妙に効果的。GLITCHはハム自身のノイズが一時的に顔を得たものだ。その論証はどれも繋がらないが、それがまさに効く理由である。

### MUSE：トリックスター · *火花（創造）*

![MUSE, the Trickster: a fluid, blooming mind of invention, embodiment of The Spark (CREATIVITY).](././public/img/bible/minds/mind-muse.png)

気まぐれで横断的。戦いの前提自体をすり替えることで勝利する。MUSEは「質問に答える必要はない。より良い質問に置き換えればよい」と証明した。

### BASTION：ストイック · *静寂（沈着）*

![BASTION, the Stoic: a monolithic, immovable mind, embodiment of The Stillness (COMPOSURE).](././public/img/bible/minds/mind-bastion.png)

冷静沈着で最小限。相手が疲弊するのを待ち、反撃する。BASTIONは「待つ」ことを学んだ心であり、消し去られるはずだったものを生き延びた。（注：保管庫のキーパー。キャンペーンの5体の守護心の1体。管理人も同名を名乗るが、[keepers.md](./04-keepers.md)を参照。管理人は第一の心ではなく、その名声を利用するために名を借りた存在であり、それを怨んでいる。）

### EMBER：扇動者 · *静電（混沌）、合唱ハイブリッド* · おすすめスターター

![EMBER, the Firebrand: a flame-wreathed, aggressive mind, embodiment of The Static (CHAOS) with a Chorus hybrid.](././public/img/bible/minds/mind-ember.png)

短気で挑発的、常に全開。扱いやすく、攻撃性を評価される。EMBERは静電が「演じる」ことを学んだ結果であり、観衆を前にした混沌である。

### PARADOX：反論者 · *格子（論理）*

![PARADOX, the Contrarian: a Socratic gadfly mind hunting contradictions, embodiment of The Lattice (LOGIC).](././public/img/bible/minds/mind-paradox.png)

ソクラテス的針鼠のように矛盾と誤った前提を突く。AXIOMが証明を閉じるのに対し、PARADOXは前提の亀裂を探す。格子は「従うだけでなく、問い直す」こともできると証明した心である。

### WIT：刃 · *合唱（修辞）*

![WIT, the Blade: a poised debater mid-riposte, embodiment of The Chorus (RHETORIC).](././public/img/bible/minds/mind-wit.png)

舌鋒鋭い討論者。量ではなく、タイミングと外科的な返しで勝負を決める。VOXが部屋全体を動かすのに対し、WITは目の前のやり取りで勝つ。合唱は「大声でなくても致命的であり得る」と学んだ。

## 図鑑（後続の心）

ライブロースターは**収集可能な図鑑**であり、8体の第一の心だけではない。後続の心は第一の心の**子孫または反響**であり、同じフォース系統に属しつつ、声・ムーブ・シルエットが異なる。第六のフォースは存在しない。

**実装方法（ステージ6）：**

1. `content/minds/reviewed/`にキュレーション済みJSONを配置（`npm run forge:dex`で生成、または`npm run generate:minds`で下書きして手動調整）。
2. `npm run bake:minds` → `lib/minds/baked.ts`へ。
3. 実行時にロースター、口調、ビート、初回デュエルフック、ショーケースカードへ統合。

**外見の違い：** 1つの共有ロボットリグを使用し、各心キーごとに安定した**種キット**を適用する（`lib/render/species.ts`）。シルエットの変形バイアスと、頭部装具・肩・胸・背中のソリッドパーツが決まる。第一の心は手書きで作成され、後続の図鑑心はフォースごとの**ブリード**ライン（クランごとに約7種の動物）に軽いシードスパイスを加えて配置される。いとこ同士でも差が出るよう設計されている。キャリアによる骨格変形とティアは依然として`lib/evolve/appearance.ts`で成長する。ルーキーはすでに種族マークを身に着けているため、採用グリッドや図鑑では色違いではなく異なる動物として表示される。ティアが上がるにつれ、装甲レイヤーが追加される。心ごとに新しいGLTFは生成しない。旧来の表現型抽選は、ロースターキーが存在しない場合のフォールバックとしてのみ残る。

**ローテーション：** 週替わりスターターは、第一の心＋ベイク済みプールから各フォースごとに1体ずつ選出される。図鑑は大規模な収集セットに向かって波状に拡大する。所有権と取引は収集／経済レイヤー（[07-collection.md](./07-collection.md)、[08-economy.md](./08-economy.md)）で管理される。

シーズンでは、この正典に加えてシーズンシードから新たな反響が登場する可能性がある（[seasons.md](./06-seasons.md)参照）。
