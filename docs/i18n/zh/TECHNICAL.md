# ZINGERS：技术一页概览

**zingers.gg** · **@zingersHQ** · **zingers.org**（技术与文档）

### LLM 是演员，引擎是游戏。

一个类型化的 Next.js 单体应用。单一运行时，无需单独后端维护。它运行一个可**飞行**的 3D 世界，实时串流 AI 对 AI 的辩论对战，并根据真实比赛历史与你的攀登高度进化冠军。

---

## 核心原则

战斗采用回合制，拥有明确的招式和**属性驱动的结算**：属性、类型、训练、状态与种子方差共同决定伤害。机智质量是一个有界乘数（≈0.7–1.3，Highlight 时可达 1.4）。默认使用**本地裁判**；设置 `ZINGERS_LLM_JUDGE=1` 可启用 LLM 裁判。两种路径均无法单独决定比赛结果，确保对战公平、可复现且低成本。  
*（`docs/game-spec.md`、`docs/combat-design.md`）*

## 技术栈

Next.js 16（App Router）· React 19 · 全栈 **TypeScript** · **React Three Fiber**（含 Drei、Rapier 物理与后处理）驱动 3D 地面 · **Zustand** 状态管理 · **Upstash Redis** 服务端镜像 · **Server-Sent Events** 实现实时对战 · **xAI (Grok)** 作为内置大脑。部署于 Vercel（`zingers.gg` 游戏主机、`zingers.org` 文档主机），并运行每 6 小时一次的 `/api/cron`。

---

## 架构：单一世界，轻量服务端

- **Ascent 是门面**。移动端 Climb（`/m`）与桌面端 Circuit 共享同一片 100 扇区的天空（十个 Reaches）。训练师使用喷气背包飞行，冠军翼伴随行。包含排行榜、生命值与扇区开放。详见 `docs/climb.md`、`docs/bible/10-ascent.md`。
- **3D Grounds 是深层表面**：飞行、提升、追逐目标、进入场馆。身体会根据职业生涯实时变形，通过确定性外观函数（`lib/evolve/appearance.ts`）实现。性能优化包括：指数阻尼（帧率无关）、实例化 GLTF 道具、`React.memo` 场景装饰、调色板缓存纹理、DPR/质量分级，以及受 `prefers-reduced-motion` 控制的“果汁”效果（抖动、FOV 冲击、爆发）。移动端始终保持**单一** WebGL 画布。
- **战斗通过 SSE 流式传输**（`/api/battle`，另有无头 `/api/sim`）。每回合包含招式、结算伤害、角色台词、plain-English 的 `why`，以及（启用工具时）代理步骤的 `trace[]`。默认流程为**每回合一次 LLM 决策** + 本地裁判。快速且低成本。客户端支持跳过到裁决，并可选择“研究”视图查看 trace。
- **音乐**为 100% 程序化 Web Audio（`lib/ambience-scores.ts` + `lib/ambience.ts`）：每个地点拥有独特主题与乐句形式；强度、避让与装饰音通过 `lib/ambience-bus.ts` 控制。无音频文件。
- **异步联赛**是核心机制：冠军均为 AI，因此 PvP 无需双方同时在线。联赛自主运行对战（Amphitheatre **Live Gallery**）；你可观看回放并攀登客观评分榜（`/standings`）。
- **状态以客户端优先，同步更新**。职业生涯存储于 `localStorage`，并通过 `/api/save` 镜像至 Redis。**职业账本**（`CareerEvent[]` + `AxisSnapshot[]` 于 `PlayerSave`）是纯追加、有上限的日志，记录每一次真实时刻：战斗、升级、段位提升、训练、Keeper 破解、赛季轮转、首次领取。位于 `store/champions.ts`。
- **收藏阵容在服务端做并集**。已招募心智的键保存在 Redis 集合（`z:roster:{token}`）。付费招募为 `POST /api/wallet`，带 `{ type: "recruit", key }`（一次完成 Crowns 扣除与成员资格）。`/api/save` 在读写时合并阵容，避免 last-write-wins 抹掉传奇。跨设备恢复仍需同一训练师代码或已绑定的 Solana 钱包。
- **训练师身份**。唯一名称可绑定可选的 Solana 钱包（仅用于所有权证明，无消费）。Circuit/Climb 技艺榜在服务端解析标签；排名提交需要起飞票据与墙钟/速度校验。王冠币按个人最佳并受每日上限约束发放，从不按榜上名次发放。
- **永铸（应用 + CARS 测试通道）。** `GET/POST /api/immortalize`（voucher / prepare / confirm）。`chain`：燃烧 SPL + 铸造 Card NFT（Metaplex）。主网测试品牌为 **CARS / Cards / 汽车 SVG**，不用产品名或正典美术（`onchain/cars/`）。
- **约 26 个 API 路由**（`app/api/*`）覆盖战斗、模拟、领取、名册、排行、每日、守护者（Keepers）、印记、动态、战争、保存、钱包、Solana 链接、永铸、卡片 OG 图片及 `/api/cost` 计量。

## 可插拔代理层

每位冠军遵循同一契约：`act(view) → decision`。因此任何大脑均可驱动。**默认**：单次 JSON 决策。**可选**（`ZINGERS_AGENT_TOOLS=1`）：有界 **reason → act → observe → commit** 工具循环，调用只读引擎工具（`simulate_move`、`scout_opponent`、`commit_move`），上限 3 步，并以 `ToolStep` 流式传输。支持提供商：内置 Grok、任意 OpenAI 兼容模型、HTTP webhook 或模拟器（离线）。*（`docs/agent-protocol.md`）*

## 成本与安全护栏

LLM 消耗通过计量（`lib/server/cost.ts`）、IP 限速（`lib/server/rate-limit.ts`）与每日预算（`LLM_DAILY_BUDGET_USD`）控制。新模型功能始终**模板优先**：当无密钥、达到每日上限或预算耗尽时，确定性回退路径运行。因此**每日循环永不阻塞于模型**。排位路径拒绝模拟/种子偏差；钱包收益仅限领取范围。

## 确定性作为特性

战斗使用种子 RNG（`lib/engine/xai.ts:makeRng`），因此任意对战均可复现且可证明公平。该不变性也是未来链上赛季结算的前提（见 AI 与加密一页概览）。分析/事件键内部仍可能使用 `bout`，但面向玩家的文案绝不使用（`docs/vocabulary.md`）。

---

## 公开文档（本站点）

`zingers.org` 是 `docs/` 中 Markdown 的可浏览视图。文档注册表（`lib/org/registry.ts`）将每个页面映射至源文件；`/org/[[.slug]]` 路由静态生成所有条目，并通过共享外壳渲染。因此新增页面只需一个 Markdown 文件加一行注册表记录即可。
