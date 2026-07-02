# 🎉 Breaktime Arcade（中文）

> [English README](README.md) · 本文为中文附属版本，内容与英文版对应。

一个面向课堂、聚会和团建的**网页端小游戏合集**。支持电脑、手机、平板；一台设备也能玩，一个房间也能连。
首发游戏：**Who's Undercover?（谁是卧底）**。

界面风格参考 **Kahoot** 的课堂主持体验：Host 用电脑接投影当"上帝视角 + 控制台"，同学用自己的设备参与。**不管权威状态在你笔记本还是云端，你的电脑始终是 admin/投影端。**

---

## ✨ 这是什么

- **课堂 icebreaker / 聚会 / 小组活动 / 团建 / 英语课堂互动**都能用。
- Host 在电脑上开一局，投影出**大房间码 + 二维码**，同学扫码加入。
- 也支持**传一台设备轮流玩（Pass & Play）**，没网也能跑。
- 第一阶段只完整支持**英式英语**；右上角预留语言切换入口，中文后续再加。

---

## 🎮 游戏

| 游戏 | 状态 | 人数 / 时长 |
|---|---|---|
| **Who's Undercover?（谁是卧底）** | ✅ 开发中（首发） | 4–10 人 / 5–10 分钟 |
| Last Card（原创 UNO 类） | 🔒 Coming soon | 2–8 人 |
| Draw & Guess（你画我猜） | 🔒 Coming soon | — |
| Charades（你演我猜） | 🔒 Coming soon | — |
| Two Truths and a Lie | 🔒 Coming soon | — |
| Quick Categories | 🔒 Coming soon | — |

首页以合集形式展示，未完成的游戏显示 **Coming soon**。

---

## 🕹️ 运行模式

- **Host a Live Room** — Host 电脑控场，同学扫码用自己设备玩（LAN / 公网，见下方 Networking）。
- **Pass & Play** — 一组共用一台设备轮流看词，可离线，是最稳的备用。
- **Presenter Demo** — 纯投影演示规则，不分发真实秘密信息。

---

## 🎨 设计与风格方向

整体走 **Kahoot 那种明快、热闹、课堂友好**的感觉，但把握好度——**不要太素，也不要太花哨**。

**视觉**
- 大圆角、大按钮、高对比色块；投影上远处也看得清。
- 克制的主色 + 强调色，配少量渐变和轻微层次感（阴影/浮起），不堆装饰。
- 四个小组用四种固定颜色贯穿全程（便于投影上一眼分辨）：
  - `Group A` 红 · `Group B` 蓝 · `Group C` 黄 · `Group D` 绿
- 排版清晰、留白充足，信息层级明确。

**动效（点到为止）**
- 短促有目的：约 250–350ms，进出过渡、当前发言者轻微放大脉冲、投票打勾、倒计时最后 10 秒轻脉冲。
- 高光时刻可以"热闹一下"：胜利纸屑、身份揭晓卡片翻转、3-2-1 开局倒数。
- **不做**：持续晃动、满屏特效、吵闹音效、会在秘密词上残留的动画。
- 尊重系统 `prefers-reduced-motion`，提供 `Reduce motion` 开关；音效默认低、可关。

**性能**
- 低端手机也要顺；动画不阻塞关键流程，不拖慢课堂节奏。

---

## 🔒 秘密信息安全（谁是卧底）

- 秘密词 / 角色**只点对点发给对应玩家**，绝不进任何广播、绝不上投影。
- Host 投影视图默认**安全模式**：只显示阶段、进度、人数、公开结果。
- Host 私密面板才有 `Reveal answers`，默认关闭、与投影分离。
- Pass & Play：看完即清屏 + 隐私遮罩；刷新/返回不重现上一位玩家的词。

---

## 🧱 技术栈

- **前端**：Vue 3 + `<script setup>` + TypeScript 5.x + Vite + Pinia + Vue Router（+ PWA 离线）
- **后端**：Node.js + Express + Socket.IO（内存房间，第一版无数据库）
- **共享**：`shared` 包放**纯逻辑规则引擎**（角色/顺序/投票/胜负），Pass & Play 与 Online 复用同一份
- **工程**：pnpm workspaces monorepo

> 详见 [breaktime-arcade-tech-plan.md](breaktime-arcade-tech-plan.md)（技术方案）与 [breaktime-arcade-project-plan-v2.md](breaktime-arcade-project-plan-v2.md)（产品规划）。

### 目录结构（规划）
```
packages/
  shared/    # 纯 TS：类型 + 事件协议 + 游戏规则 + 词库
  client/    # Vue 前端
  server/    # Socket.IO 后端
```

---

## 🌐 Networking（待办 / 规划中，非当前重点）

> 这部分是**后续任务**。当前首要目标是把游戏本体搭出来。

- **LAN**：笔记本原生跑 server，同学连同一 Wi-Fi 扫码。
- **Tunnel 公网**（推荐）：Cloudflare 隧道把本地 server 暴露到公网，**与 LAN 共用同一房间 → 切换不丢局**。
- **Cloud 公网**：Docker 部署到 Render/Railway，作为"笔记本整体挂掉"的独立保险。它是**另一套独立房间**——好处是你笔记本断网/断电它也活着；代价是从 Cloud 回退到 LAN 等于换了台 server、换了个房间，已加入的人要重进。
- **无论哪种模式，你的电脑都作为 admin**：Host Dashboard/投影只是带 `hostToken` 的客户端，连到当前生效的那台权威 server（笔记本或云端），照样看全班状态、控场。
- **连接切换器**：Host Dashboard 上 `Auto | Public | LAN` 开关 + 自动检测；投影只更新二维码。

---

## 🗺️ 开发状态与优先级

**当前重点** → 搭出 Who's Undercover 游戏本体 + 基础动画 + 合适的界面风格。

- **P0（先做）**：合集首页 → 规则引擎（纯逻辑）→ Pass & Play → 词库 → 基础动画/计时反馈
- **P1**：Online Room（LAN + Tunnel + Cloud）、Host Dashboard、Projector View、连接切换、断线重连、PWA
- **P2**：中文界面 + 中文词库、Mr White、更多小游戏、多局积分

详细任务拆解见技术方案文档的「§7 开发顺序与任务拆解」。

---

## 🚀 本地开发

```bash
pnpm install          # 安装全部依赖
pnpm dev              # 前端（Vite，http://localhost:5173）+ 后端，热更新
pnpm test             # 规则引擎单元测试（vitest）
pnpm typecheck        # 全包类型检查
pnpm build            # 生产构建 → packages/client/dist
pnpm start            # 跑打包后的完整应用（默认 3000 端口，可用 PORT=… 覆盖）
```

或者用 Docker（生产构建，单容器）：

```bash
docker compose up --build    # http://localhost:3000
```

> server 会读环境变量 `PORT`——如果 3000 被其他项目占用，换个端口即可。
