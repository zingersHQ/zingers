# 初次旅程路线图

> **历史版本（战斗驱动的 Act 1）。** 现行产品入口为 **飞行优先**——
> 详见 [`flight-first-plan.md`](./flight-first-plan.md)、[`two-doors.md`](./two-doors.md)、
> [`design-vision.md`](./design-vision.md) v3.0 及 [`flyover.md`](./flyover.md)。
> 典藏：[`docs/bible/10-ascent.md`](./bible/10-ascent.md)。
>
> **首次体验：** 移动端 = 起飞 → 攀升 → 认领翼伴；桌面端 = 短程飞行 → 选择冠军 → 枢纽 / 回路。  
> 请勿将下文已废弃的战斗驱动流程视为当前新手引导。

以下为先前 Act 1 版本的制作备注（仅供参考 / 存档）。

## Act 1 流程（已废弃）

```
初次运行（过场）→ 首场对决：收养（5 力，轮换，新手预览）
  → 收养环节（训练师 + 冠军）→ 植入策略 → 以新手身份收养 → 虚空对战
  → 进化卡 → 降落枢纽（训练师环节优先）→ 训练师在出生点分流教练
  → 引导首场竞技场（枢纽入口高亮）→ 自由探索 + 教练
```

## 60 秒教学契约（已更新为飞行优先）

在结束首次飞行 / 选择前，玩家需知晓：

- [ ] *你飞行。它战斗。你们一同飞升。*
- [ ] *你养育这位冠军——你并非战斗者。*（柔和身份设定；不强调认领锁定）
- [ ] 新手形态即收养当天的初始状态，并非预览的降级

规范文案：`lib/player-copy.ts` · 愿景：`docs/design-vision.md` · 术语：`docs/vocabulary.md`

## P0 —— 已修复的承诺 ✅

| 项目 | 状态 | 备注 |
|------|------|------|
| 策略 / 性情读数（非自由拖拽滑块） | ✅ | `DoctrineDial` = 仪表；印记与战斗驱动仪表 |
| 玩家文案：duel/fight，非 bout | ✅ | `lib/player-copy.ts` + 初次旅程 UI |
| 首场战斗位于区域竞技场 | ✅ | `FIRST_FIGHT_WORLD = void` |
| 更宽的战斗间距 + 相机 | ✅ | `MATCH_SPREAD = 4.5`，轨道 14 / 高度 6.2 |
| 枢纽对战不遮挡封印/旗帜 | ✅ | 对战期间隐藏 Concord；临时竞技场环 |

## P1 —— 叙事粘合 ✅

| 项目 | 状态 | 备注 |
|------|------|------|
| 新玩家不会跳过 FirstRun | ✅ | 移除自动标记已观看 |
| 入场音效 | ✅ | `lib/sound-gallery.ts` —— 手势 + CTA |
| 枢纽降落（3 拍） | ✅ | 封印 → 拱库门 → 你的会话 |
| 进化文案诚实 | ✅ | 新手引导将可见成长延后至进化步骤 |

## P2 —— 润色 ✅

| 项目 | 状态 | 备注 |
|------|------|------|
| 清除玩家可见的 bout（应用内 UI） | ✅ | 初次旅程、FirstRun、连战目标、场景 |
| 枢纽目标教练 | ✅ | Act 1 后一次性教练标记 |
| 引导首次枢纽降落 | ✅ | 首次运行高亮「枢纽入口」（“▶ 从这里开始”），淡化其他入口与封印，运行邻近感知提示与「带我过去」步行 CTA；闲置时升级为金色（`guideWorld`/`guideUrgent`，`FIRST_GUIDE_WORLD`） |
| 专用首战过场相机 | ✅ | `MatchView.cinematic` —— 更紧凑轨道 |
| 音效库 | ✅ | `lib/sound-gallery.ts` + 各引导节点提示音 |
| 图标对齐 | ✅ | `lib/iconography.ts` —— 美术方向调色板 + 力徽记 |
| 赛季初始轮换 | ✅ | `firstDuelStarterKeys()` —— 每周按力轮换 |
| 新手音效开关可见 | ✅ | FirstRun + FirstDuel 叠层显示 `OnboardingAudio` |

## 叙事与过场 ✅

| 项目 | 状态 | 备注 |
|------|------|------|
| 入口/旅行转场 | ✅ | `TravelVeil` —— 力染色擦除 + 入口进出名片（`travelWhoosh` 音效） |
| 训练师传奇主线 | ✅ | `lib/lore/saga.ts` —— 8 章 / 4 幕弧线，按训练师段位触发；`ReaderThread` 枢纽标记（代码 ID 不变） |
| 赛季转场过场 | ✅ | `seasonTurnBeat()` —— 新门开启时 Keeper 演绎编年史（每赛季一次） |
| 宿敌系统 | ✅ | `lib/lore/rival.ts` ——  recurring 同名宿敌训练师，持久对战记录，逐步升级嘲讽；`RivalCard` + 战前/战后节点 |
| 定向角色节点 | ✅ | `CharacterBeat` 升级：信箱、浮动 3D 肖像、逐行辉光脉冲、打字机、视差场（适配低运动模式） |

传奇（你的故事）与编年史（世界故事）刻意分离：传奇随训练师段位推进，无论玩法如何；编年史则随赛季时钟转动。

## 故意保留不变

- **代码/分析事件键** —— 仍为 `bout`（稳定服务端追踪）
- **`useBout` 钩子名** —— 内部使用；无玩家可见标签
- **文档/README/MCP** —— 面向开发者；不属于游戏内文案范畴（参见 `docs/` 同步规范）

## 配乐（程序化，按场景）

| 氛围 | 触发场景 |
|------|----------|
| `concord` | 枢纽 |
| `colosseum` | 黑曜竞技场 / 枢纽区域 |
| `ember` | 灰烬连战 |
| `void` | 虚空花园 |
| `amphitheatre` | 圆形剧场场地 |
| `circuit` | 飞行（回路 / 攀升） |
| `battle` | 任意实时对战或 Keeper 决斗 |

乐谱位于 `lib/ambience-scores.ts`（模式 + AABA 式结构）。  
`grounds-screen` 调用 `resolveAmbienceMood()`；移动端 Climb 锁定 `circuit`。

## 术语

- **玩家可见：** 对决、战斗、排位对决
- **代码/分析：** bout（不变——稳定事件键）

## 关键文件

- `lib/first-duel.ts` —— 初始阵容、轮换、竞技场世界、枢纽降落文案
- `lib/lore/saga.ts` —— 训练师传奇弧线 + 赛季转场节点
- `lib/lore/rival.ts` —— 宿敌身份、记忆、嘲讽
- `lib/lore/character-beats.ts` —— 冠军与 Keeper 语音节点
- `components/grounds/travel-veil.tsx` —— 场景切换转场
- `components/grounds/reader-thread.tsx` —— 传奇枢纽标记（代码 ID 不变）
- `components/grounds/rival-card.tsx` —— 宿敌枢纽存在
- `components/grounds/character-beat.tsx` —— 定向叙事节点
- `lib/ambience-scores.ts` —— 程序化配乐
- `lib/player-copy.ts` —— 玩家可见战斗词汇
- `lib/sound-gallery.ts` —— 新手引导提示音映射
- `lib/iconography.ts` —— UI 视觉规范
- `components/intro/first-duel.tsx` —— 新手叠层
- `components/intro/onboarding-audio.tsx` —— 浮动静音控件
- `components/shared/doctrine-dial.tsx` —— 性情仪表 / 策略读数
- `components/grounds/grounds-screen.tsx` —— 序列 + 世界旅行 + 首次引导（聚焦入口、闲置升级、步行提示）
- `components/grounds/world.tsx` —— 对战舞台 + 过场相机；将 `guideWorld`/`guideUrgent` 指向枢纽
- `components/grounds/concord.tsx` —— 枢纽场景；拱库入口高亮/淡化处理（`firstStop`/`dimmed`/`urgent`）
- `components/grounds/worlds.ts` —— `FIRST_GUIDE_WORLD`（引导的首个区域）
