# Zingers. Flight-First 開発計画（セッション固定）

> **要約:** Climb が顔、battles が深み、desktop が完全な上昇。  
> Solana ウォレットは任意（Trainer アイデンティティ専用）。コイン／トークンは**将来の独立トラック**。本ドキュメントは 2026 年 7 月計画セッションの現行実装ロードマップ。

関連: [`climb-feel.md`](./climb-feel.md), [`two-doors.md`](./two-doors.md),  
[`launch-week.md`](./launch-week.md), [`flyover.md`](./flyover.md),  
[`zing-model.md`](./zing-model.md)（保留）。

---

## North star

**プレイヤーが 2 分以内に言うべき一言:** *I fly. It fights. We rise.*

| Door | 最初の約 2 分 |
|---|---|
| **Mobile** | Poster → Fly → Climb → 翼仲間を claim → もう 1 回 + boards |
| **Desktop** | Wake → 15 秒以内の flight → claim → 短い Reach → Climb に動機づけられた duel |

**非表示:** agents は思考（ファンタジー文言）；ウォレット任意；Crowns はゲーム内のみ。

---

## Scope

### In
Climb feel · guest→claim · ファネル測定 · 軽量 boards · 1 つの altitude／raise bridge · desktop 90 秒再編集 · Phantom アイデンティティ任意 · 軽量 LLM 運用

### Out
$ZING ローンチ · vesting · airdrops · Crowns↔token · on-chain matches · カスタムプロトコル · ウォレット必須 Fly · 新会場／Keeper 深度（顔面作業）

### Climb feel 承認まで凍結
新モード、Reach アート大量投入、コレクション取引、House プロモーション、トークン UI を追加しない。

---

## Launch gates（整合済み）

| Gate | 指標 |
|---|---|
| **1′** | 冷えたスマホ → Fly 後 10 秒未満で flying |
| **2′** | `/stats` 上で guest→claim が可視 |
| **3′** | 実機で Climb「もう 1 回」が発生 |
| **4** | `LLM_DAILY_BUDGET_USD` 設定済み；Climb 中心は低コスト |
| **5** | ドアの感触が良くなってから成長 push |
| **6** | 二次目標：evolution／collection |
| **. ** | トークンは保留；ウォレット ≠ コイン |

---

## Phases & status

| Phase | ステータス | 備考 |
|---|---|---|
| **0 Align** | 完了（本ドキュメント） | Gates + 非目標を固定 |
| **1.0 Mobile plane law** | リリース済み | `x=0`、横移動イージングなし、緑 `cpNextRef`、Flappy カメラ |
| **1.1 Layout archetypes** | リリース済み | `climb/sectors.ts` 役割テンプレート |
| **1.2 Desktop auto-forward** | リリース済み | `world.tsx` の `CIRCUIT_CRUISE` |
| **1.3 Companion leash** | リリース済み | desktop wingmate；mobile Trainer+follower |
| **1.4 Hazard Y-corridor** | リリース済み | wisps/cinders は Y のみ；hazards は既に飛行平面 |
| **2.0–2.1 Door + claim events** | リリース済み | `m_*` + guest claim フック |
| **2.0b Stats door funnel** | リリース済み | `/stats` MOBILE DOOR パネル |
| **2.2 Guest depth → career** | リリース済み | `lib/guest-climb.ts` → adopt 時に Trainer XP |
| **2.3 Fantasy copy sweep** | リリース済み | `/howitworks` + intro/share 面；`/agents` は技術的 |
| **2.4–2.5 Solana wallet identity** | リリース済み | Phantom SIWS → `/api/solana-link`；Rank + Trainer code UI |
| **3 Boards chrome** | ほぼリリース済み | Climb fall カードに PB + board |
| **4 Playtests** | 運用中 | エンジニアリング基準は満た済み；ローンチ後 10–30 人セッション継続 |
| **5 One altitude key** | リリース済み（薄め） | Reach II に 1 勝必要（Climb + desktop Circuit） |
| **6 Desktop first 90s** | リリース済み（修正済み） | summoning → **pick**（CircuitLite ではない）；duel 前に native Circuit 会場解放。Mobile `/m` は Climb-first |
| **7 Hygiene** | リリース済み／運用 | 本番に `LLM_DAILY_BUDGET_USD` 設定；感触確認後に成長 push と ship notes |

---

## Wallet rules（譲れない）

- Fly / Climb / claim / Crowns に**必須ではない**。
- SIWS 形式の所有証明のみ。支出承認は不要。
- サーバーが `pubkey` ↔ owner token を紐付け；ゲーム状態はオフチェーン。
- コピー文言＝Trainer sigil / connect。入金や燃料の文言禁止。
- 将来のコインは同じソケットに接続；**現時点でトークンロジックは一切なし**。

---

## Execution order

1. Feel device-verify (1.x) → 必要なら 1.4 をパッチ  
2. Stats door funnel + wallet identity (2.x)  
3. Desktop fly-first 体験 (6.x) + 薄い altitude key (5.x)  
4. Playtests (4) → イテレーション  
5. Growth hygiene (7)

---

## Definition of done

1. Mobile: 1 セッションで Fly → 楽しい Climb → claim  
2. Desktop: システム文言より先に flight  
3. `/stats`: door + claim（＋二次 evolution）  
4. boards による幽霊競争  
5. 1 つの raise bridge または動機づけコピー  
6. Phantom リンク任意；コアループはウォレット不要  
7. トークン UI なし · Crowns-only エコノミー · LLM 予算設定済み  

**Launch v0.1（2026 年 7 月）：エンジニアリングクローズ。**  
上記 Gates は `zingers.gg` で稼働中。  
人間による playtests と成長 push はローンチ後運用であり、エンジニアリングのオープン blocker ではない。
