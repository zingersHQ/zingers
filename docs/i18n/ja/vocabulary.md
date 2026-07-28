# 語彙とトーン方針

> **要点:** Zingers は少数の独自で味わい深い用語を保持しますが、どれも新しいプレイヤーが出会った瞬間に定義され、初めて読む文章に不必要に奇抜な表現は残しません。このドキュメントは、物の呼び方と平易な書き方の唯一の正解です。

**ロケール:** ここでの英語がライター向けのソースです。翻訳時の借用／訳語ルールは [`docs/i18n/terminology.md`](i18n/terminology.md) に記載。UI 文字列は `messages/{locale}.json` にあります。

私たちのプレイヤーは世界中にいます。多くの人が第二言語として英語を読み、物語の背景を何も知らずに訪れます。世界は個性的で魅力的に感じられるべきですが、「おもしろい」と「わかりやすい」は両立します。用語は教える価値がある場合にのみ残し、一度残したら必ず教えます。

## 三つのルール

1. **初回接触の文章に未定義の固有名詞を置かない。** プレイヤーが最初に読むもの（イントロ、ランディングのヒーロー、初デュエルの流れ）は、事前知識ゼロで理解できる必要があります。固有名は登場しても、初出時に短く平易な説明を添えます（`the Long Vault, 世界全体がその周りに築かれた封印の扉`）。一文で説明できない深層ロア名（the Hum, the Chronicle）は初回接触の文章から外し、Bible に残します。
2. **一つの概念に一つの語。** 同義語の乱立を避け、単一の用語を選んで一貫して使います。
3. **装飾語が意味を増さないなら平易語を優先。** 造語は、平易語では失われる本当の味わいを持つ場合にのみ残します。

## ガイドラインの響き（ライター専用: 製品主張ではありません）

コピーがトレーナーへ次の行動を指示するとき（Director、Flight の結果、ロックゲート、Hub のコーチ）は、**チャンピオンの一人称**で書きます。we / us / stay with me。クエスト表示（`NEXT`、Compass の装飾）ではありません。黄金律:

> Stay with me. Nine more stretches of sky and we light the next camp. There's a Crown chest waiting the first time.

**これを売らない。** プレイヤー向けの文章、マーケティング、ドキュメントで「話しかけてくる」「ボイスライン」「コンパニオン AI ボイス」など、普通のキャラクターセリフを機能のように扱う表現は禁止です。キャラクターはただセリフを持っているだけ。他のゲームと同じです。

### 禁止: em dash の区切り

**プレイヤーが読む文章や公開ドキュメントでは ` — `（スペース付き em dash）を使いません。** ピリオド、コンマ、短い文、コロンを優先。コードコメントは em dash を残しても構いません。

## 正準用語対応表

| 使う語 | 使わない語 | 備考 |
|---|---|---|
| **Trainer** | Reader, Handler | プレイヤー。チャンピオンを育てるのであり、自分で戦うわけではない。 |
| **Champion** | (mind, 戦う存在を指す場合) | 「mind」は未獲得の生の存在を指すロア用語としては可。プレイヤーの戦士は Champion。 |
| **Strategy** | doctrine | 攻撃性／集中／リスクのダイヤル（養子時に初期化、Imprint と戦いで変動）。養子後は UI で **temperament meters** と表示（読み取り専用、自由ドラッグ不可）。*コード識別子*（`doctrine()`, `DoctrineDial`, `card.doctrine`, `d` URL パラメータ）はそのまま。表示英語のみ変更。 |
| **temperament meters** | strategy sliders / doctrine dials (UI 動詞として) | 養子後の Strategy 表示に対するプレイヤー向け名称。 |
| **fight** / **battle** / **duel** | bout | プレイヤー向け文章で「bout」は使わない。**fight** / **battle** を優先。単一の対戦なら **duel** も可。*コード* は `useBout`, `learnFromBout`, イベント種別 `"bout"` を残す。コピー置き換えでこれらを改名しない。 |
| **Imprint** | lesson / teach (単独) | 記憶を書き込み Strategy を動かす日常の育成動詞。 |
| **Clan** | Allegiance, House | 誓う Force。動詞「swear allegiance to your Clan」は平易な英語として可。 |
| **regions** / **floating regions** | region-slabs, slabs | 「slab」は廃止。 |
| **the world** | the Grounds (初回接触の文章) | 新規プレイヤーが飛ぶ 3D 空間全体を **「the world」** と呼ぶ。「the Grounds」は世界の**ロア正式名称**。Bible/`/glossary` では可だが初回接触では使わず、地域名としても使わない（これが主な混乱の原因）。URL `/grounds` と `grounds` ID は変更しない。 |
| **the Hub** | the Concord (初回接触の文章) | 中央の着陸エリアとゲートを **「the Hub」** と呼ぶ。「the Concord」はロア正式名称として残る。コード ID `concord` は変更しない。 |
| **explore** / **fly around** | roam | すべての表示文章から「roam」を**廃止**。`lib/hub.ts` / `lib/play-nav.ts` の `roam` レイヤー ID はコード ID として残す。 |
| **Flight** | the Ascent, Circuit, Climb (モード名として) | フライトゲーム：スマホとデスクトップで同一。**「Flight」** / **「Take flight」** / 平易な「fly」を使う。モードラベルとして *the Ascent*、*Circuit*、*Climb* を表示しない。「climb」は平易な動詞として可（「climb higher」）。コードは Circuit / Climb / Ascent を残しても可。 |
| **floating / drifting** | adrift | より平易な同義語。 |
| **Gate** | Vaultgate | 地域へ出るアーチ（表示文章）。コンポーネント名は残しても可。 |
| **Season** | the Chronicle | 表示文章は「season」。深層ロアの味わいとして「the Chronicle」は Bible に残しても可。 |
| **built-in brain** | House brain | 既定のエージェント。 |
| **Live Gallery** | Scrying Gallery | 自律戦闘を観戦する場所。 |
| **Reach** | level, stage | Flight の空を 10 等分した帯。HUD は **plain sky progress**（sector N / total）と表示し、「Reach N」は使わない。「Reach」は Bible/`/glossary` の味わい名として残る。 |
| **Camp** | checkpoint, waystation (文章) | Reach 間の休憩地点。ロア扱いに降格。初回接触で教える名詞ではない。 |
| **fly beside you** / **wingmate** | the champion's jetpack | 正典: チャンピオンにジェットパックはない。心であり、自力で飛ぶ。ジェットパックを持つのは **Trainer** のみ。「your champion's jetpack」と書いてはならない。 |
| **standings** / **rank** / **board** / **rating** | ladder, ELO, Elo | プレイヤー向けのみ。**standings**、**rank**、**board**、または平易な **rating** を使う。**ELO** は使わない（誰も知らない）。**ladder** を製品名詞として使わない（Unlock Ladder、season ladder、enter the ladder）。コードは `ladder` / `elo` 識別子を残す。 |

## 初回接触の概念予算（新人が出会う六つ）

イントロ → take-flight → first-duel → landing の流れで導入するのは**この六つの名詞**のみ。各々に平易な説明を添える: **Trainer, Champion, Fly (Flight), Battle/duel, the Hub, Crowns.**（`docs/simplification-plan.md` §2 参照）その他はすべて後で、関連する文脈で初めて登場したときに明かす。最初にまとめて提示しない。

## 保持するが初出時に必ず説明する（味わい層）

**the Long Vault, the Hum, Force, Sigil, Saga, Resolve, Tribunal, Gauntlet, Reach, Camp, Fragment。** これらは特徴的で保持する価値があるが、**味わい層**（Bible、`/glossary`、深いメニュー）に属し、初回接触には置きません。初出する場所では平易な説明を添えます。ロア正式名称 **the Grounds**（「the world」と言う）と **the Concord**（「the Hub」と言う）もここに属し、初回接触から完全に除外します。**Keepers やキーパーをプレイヤー向け文章や公開ロアに書いてはならない**。ライブゲームの一部ではありません。一行定義は `lib/lore/glossary.ts` にあり（`/glossary` と `docs/bible/09-glossary.md` でレンダー）、一貫性を保つためにその文言を再利用します。

## コード vs. 文章

変更するのは**プレイヤー表示テキストのみ**：UI に表示される文字列リテラル、JSX テキスト、`aria-label`/`title` テキスト、Bible の散文。識別子、コンポーネント名、関数名、プロパティ、オブジェクトキー、`localStorage` キー、URL/クエリパラメータ値（例: `doctrine()` ヘルパー、`ReaderThread`、`READER_COPY`、`Vaultgate` コンポーネント、`"House Grok"` ブレイン ID）は改名しません。それらの改名は別途の意図的なリファクタリングです。

## 未解決の質問（まだ決定していません）

**「The House」**（「House brain」（現在は「built-in brain」）とは別）の内蔵リーグ／対戦相手の名称は、白書、スライド、`"House Grok"` のような共有 ID でまだ使われています。保存値と共有 URL に影響するため、名称変更はコピー置き換えではなく製品判断です。現時点ではそのままにします。
