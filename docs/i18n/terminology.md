# Localization terminology bible

English in `docs/vocabulary.md` remains the naming policy for writers. This doc
tells translators and draft scripts how to treat each signature term in
**Spanish (es)**, **Simplified Chinese (zh)**, **Russian (ru)**, and **Japanese (ja)**.

## Global rules

1. **Champion names** (AXIOM, VOX, GLITCH…): always **borrow** (keep Latin spelling).
2. **Code ids / URLs / move ids**: never translate.
3. **No spaced em dash** `: ` in player-readable text in any locale.
4. **Never** product-noun calques of bout / ELO / ladder. Use fight·battle·duel /
   standings·rank·board·rating (or the locale equivalents below).
5. **Gloss on first use** for flavor-layer lore names, same as English.
6. **Trash-talk length** (agent prompts): en 14 words · es 16 words · zh 28 chars ·
   ru 14 words · ja 36 chars. See `lib/i18n/locales.ts` `LINE_LIMIT`.
7. Dialogue localizes; puzzle keys and agent protocol ids stay English when they are shared across locales.

## Borrow vs translate

| English | Strategy | es | zh | ru | ja |
|---|---|---|---|---|---|
| Trainer | Translate | Entrenador | 训练师 | Тренер | トレーナー |
| Champion | Translate / common loan | Campeón | 冠军 | Чемпион | チャンピオン |
| Clan | Translate | Clan | 氏族 | Клан | クラン |
| Flight | Translate (mode name) | Vuelo | 飞行 | Полёт | フライト |
| the Hub | Translate | el Centro | 枢纽 | Хаб | ハブ |
| the world | Translate | el mundo | 世界 | мир | 世界 |
| Force (UI: Logic/Static/Calm/Chorus/Spark) | Translate UI names | Lógica / Estática / Calma / Coro / Chispa | 逻辑 / 静电 / 沉静 / 合唱 / 火花 | Логика / Статика / Спокойствие / Хор / Искра | 論理 / 静電 / 冷静 / 合唱 / 火花 |
| Imprint | Borrow + gloss or calque | Impronta | 印记 | Импринт | インプリント |
| Resolve | Translate | Resolución | 信念值 | Решимость | リゾルブ |
| Tribunal | Borrow / shared | Tribunal | 法庭 | Трибунал | トリビューナル |
| Gauntlet | Translate sense | Desafío | 连战 | Гаунтлет | ガントレット |
| Sigil | Borrow + gloss | Sigilo | 徽记 | Сигил | シギル |
| Saga | Shared | Saga | 传奇 | Сага | サガ |
| Crowns | Translate | Coronas | 王冠币 | Короны | クラウン |
| the Long Vault | Borrow + gloss | the Long Vault | 长拱库 | Long Vault | ロング・ヴォールト |
| the Hum | Borrow + gloss | the Hum | 嗡鸣 | Hum | ハム |
| the Grounds / Concord | Lore borrow; UI says world / Hub |: |: |: |: |
| Strategy / temperament meters | Translate | estrategia / temperamento | 策略 / 性情 | стратегия / темперамент | 戦略 / 気質 |
| standings / rank / board / rating | Translate; never ELO/ladder | clasificación / rango | 排名 / 积分榜 | рейтинг / таблица | 順位 / ランキング |
| fight / battle / duel | Translate; never bout | pelea / batalla / duelo | 战斗 / 对决 | бой / дуэль | 戦い / デュエル |

## Move display names

Keep move **ids** English. Localize **display names** when the English pun dies;
otherwise a close functional name is fine. Prefer clarity over forced wordplay.

## Banter and champion voice

Rewrite, do not machine-translate idiom dumps. Keep `{opp}` and `{topic}`
placeholders intact. Voice must stay in character per mind.

## Docs (zingers.org)

Mirror path: `docs/i18n/{locale}/…` matching registry `file` paths under `docs/`
(and `mcp/README.md` → `docs/i18n/{locale}/mcp/README.md`). English fallback if
a locale file is missing.

**Mandatory sync:** when English player-facing docs or bible chapters change,
update the locale mirrors in the same session (`npm run i18n:draft-docs -- --locale
<code>`; optional `--only docs/bible`). See `.cursor/skills/i18n-sync/SKILL.md`.
Bible locales must keep the same voice rule as English: world fiction, not repo
paths or npm scripts.
