# Breaktime Arcade 技术方案（定稿 v1）

> 配套文档：`breaktime-arcade-project-plan-v2.md`（产品规划）。
> 本文只讲 **怎么做**：技术栈、工程结构、数据模型、通信协议、部署、任务拆解。
> 目标：周六课堂展示可用；Pass & Play 保底，局域网 + 公网 Online Room 都正式做。

---

## 0. 决策摘要（TL;DR）

| 项目 | 决定 | 理由 |
|---|---|---|
| 前端框架 | Vue 3 + `<script setup>` | 你的 React 项目太多，换 Vue；对本项目无技术障碍 |
| 语言 | TypeScript **5.x（稳定版）** | TS7（tsgo）仍 preview，`vue-tsc` 生态未稳，deadline 上有风险 |
| 构建 | Vite + `vite-plugin-pwa` | 快；PWA 让 Pass & Play 可离线 |
| 状态管理 | Pinia | Vue 官方推荐，够用 |
| 路由 | Vue Router | 首页 / 模式选择 / 游戏内页面 |
| 后端 | Node.js + Express + Socket.IO | 计划已定；LAN 与公网共用同一 server |
| 数据 | 内存（无数据库） | 第一版房间状态放内存，重启即清，课堂可接受 |
| 工程 | pnpm workspaces monorepo | client / server / shared 三包共享类型与规则逻辑 |
| Docker | 仅 server，用于**公网部署** | 本机 dev / 局域网主机直接原生 node 跑，避免容器网络踩坑 |

---

## 1. 工程结构（monorepo）

```
breaktime-arcade/
  pnpm-workspace.yaml
  package.json                # 根：脚本编排（dev / build / test）
  tsconfig.base.json
  Dockerfile                  # 仅打包 server（公网部署用）
  docker-compose.yml          # 可选：一键起 server
  packages/
    shared/                   # ★ 核心：纯 TS，无框架无网络
      src/
        types.ts              # Room / Player / Group / Phase / Role 等类型
        events.ts             # Socket.IO 事件名 + 载荷类型（前后端共用）
        game/
          roles.ts            # 角色分配（civilian/undercover/mrWhite）
          order.ts            # 随机发言顺序
          voting.ts           # 计票、平票判定
          outcome.ts          # 胜负判定
        wordpacks/
          en-easy.json
          en-medium.json
      test/                   # 纯逻辑单元测试（vitest）
    client/                   # Vue 前端（静态产物）
      src/
        pages/                # 路由页面
        components/           # shared UI：lobby/timer/voting/reveal...
        stores/               # Pinia：session / game / connection
        game/undercover/      # 该游戏的 UI 编排
        i18n/                 # en 文案（预留 zh）
        pwa/                  # service worker 配置
    server/                   # Socket.IO 后端
      src/
        index.ts              # Express + Socket.IO 启动
        rooms.ts              # 内存房间管理（权威状态）
        handlers.ts           # 事件处理，调用 shared/game/*
        secrets.ts            # 秘密信息点对点下发
```

**关键设计：`shared/game/*` 是纯函数规则引擎**（输入状态 → 输出新状态，不碰网络、不碰 Vue）。
- Pass & Play：前端直接 import 调用 → 零服务器、可离线。
- Online Room：server 调用同一份逻辑 → 权威状态在服务器。
- **规则只写一次、两个模式复用**，这是"两个模式都做还能按时"的前提。

---

## 2. 核心数据模型（`shared/src/types.ts` 草图）

```ts
type Role = 'civilian' | 'undercover' | 'mrWhite';
type Phase = 'lobby' | 'reveal' | 'clue' | 'discuss' | 'vote' | 'tiebreak'
           | 'elimination' | 'ended';
type Mode  = 'online' | 'passAndPlay' | 'presenterDemo';

interface Player {
  id: string;
  name: string;
  groupId: string | null;
  role: Role;          // 仅服务器/本地权威侧持有
  word: string;        // 秘密词；绝不广播
  alive: boolean;
  connected: boolean;  // online 模式用
}

interface Group {
  id: 'A' | 'B' | 'C' | 'D' | string;
  players: string[];   // playerId
  phase: Phase;
  round: number;
  speakingOrder: string[];
  currentSpeaker: string | null;
  votes: Record<string, string>;   // voterId -> targetId（服务器侧）
  phaseEndsAt: number | null;      // 时间戳，用于倒计时
  civilianWord: string;
  undercoverWord: string;
}

interface Room {
  code: string;              // 6 位房间码
  hostToken: string;         // Host 权限校验
  mode: Mode;
  groups: Record<string, Group>;
  players: Record<string, Player>;
  config: SessionConfig;     // 组数/每组人数/计时/难度/词库/MrWhite...
}
```

---

## 3. Socket.IO 事件协议（`shared/src/events.ts` 草图）

前后端引用同一份事件名与载荷类型，杜绝拼写漂移。

**客户端 → 服务器**
```
host:create        { config }               -> { roomCode, hostToken }
host:reclaim       { roomCode, hostToken }   重连/切换后重新认领 admin 身份
player:join        { roomCode, name }        -> { playerId, groupId }
player:assign      { roomCode }              自动分组
host:startAll      { hostToken }
host:startGroup    { hostToken, groupId }
game:nextSpeaker   { groupId }
vote:cast          { playerId, targetId }
host:control       { hostToken, action }     pause/resume/extend/skip/...
```

**服务器 → 客户端（分层下发）**
```
room:state         公开状态（阶段/人数/进度/公开结果）→ 广播给房间
group:state        单组公开状态 → 组内广播
you:secret         { role, word } → 只发给该玩家 socket（★ 私密）
host:fullState     完整状态含答案 → 只发给持 hostToken 的 socket
projector:state    投影专用（绝不含未公开秘密）
projector:endpoint 当前生效入口（label + joinUrl + roomCode）→ 投影更新二维码
```

**安全铁律（对应产品文档 §23）**
- `word` / `role` 只通过 `you:secret` 点对点发；从不进入任何广播。
- Host 完整状态需 `hostToken` 校验，且 `projector:state` 与之物理分离。
- 前端不生成身份、不做完整角色列表。

---

## 4. 三种模式的实现映射

| 模式 | 状态权威方 | 网络 | 复用 shared/game |
|---|---|---|---|
| Pass & Play | 本浏览器 Pinia | 无（可离线/PWA） | ✅ 直接调用 |
| Online（LAN） | 你笔记本 server 内存 | 局域网 IP:3000 | ✅ server 调用 |
| Online（Tunnel 公网） | 你笔记本 server 内存 | Cloudflare 隧道 / WSS | ✅ 同上，**同一房间** |
| Online（Cloud 公网） | 云端 server 内存 | WSS 443 | ✅ 同一份 server 代码，独立房间 |
| Presenter Demo | 本浏览器（模拟数据） | 无 | ✅ 调用逻辑跑假玩家 |

LAN 与 Tunnel **是你笔记本上同一个 server 程序、同一套房间**，只是入口不同；Cloud 是同一份代码另跑一份独立房间。切换细节见 §6。

---

## 5. TypeScript 版本说明

- 采用 **TypeScript 5.x 稳定版**。
- TS7 = 原生 Go 编译器（tsgo），主打编译提速，截至目前仍 preview；`vue-tsc` 等类型检查工具对其适配未稳定。
- Vite 转译走 esbuild，本就不用 tsc，编译速度无瓶颈；类型检查用 `vue-tsc`。
- 结论：**现在别用 TS7**，展示后可另建分支尝鲜。

---

## 6. 部署与连接切换（LAN + 公网都正式做，运行时选）

### 6.0 核心概念：Endpoint（入口）
一个「入口」= `{ label, joinUrl, backend }`。同学**打开哪个 URL，就连到那个 URL 背后的 server**（前端 Socket.IO 连 `window.location.origin`，无需前端判断）。所以"切换"本质是：**投影上换显示哪个入口的二维码/网址**。

本项目支持三个入口，运行时由 Host 选用：

| 入口 | joinUrl 示例 | backend（房间状态在哪） | 与 LAN 是否同一房间 |
|---|---|---|---|
| **LAN** | `http://192.168.x.x:3000` | 你笔记本 server | —（就是它） |
| **Tunnel（公网）** | `https://xxx.trycloudflare.com` / 固定域名 | 你笔记本 server（经 Cloudflare 隧道） | ✅ **同一房间** |
| **Cloud（公网）** | `https://arcade.onrender.com` | 云端独立 server | ❌ 独立房间 |

### 6.1 两种公网法的关键差异（务必理解）
- **Tunnel + LAN = 你笔记本上同一个 server、同一套房间。** 在这两个入口间切换：已加入的同学 socket 不断、房间不丢，只有**新扫码的人**走新入口。→ **无痛切换**。
- **Cloud = 云端另一台机器、另一套房间码。** 它的价值是**你笔记本断网/断电它也活着**；代价是它和 LAN 是两套房间，从 Cloud 切到 LAN 等于换局，已加入的人要重进。
- 结论：**默认用 Tunnel 做公网**（配合 LAN 实现无痛切换）；**Cloud 作为"笔记本整体挂掉"的独立保险**，赛前可预部署好、现场按需启用。

### 6.1b Host/Admin 始终是客户端（任何模式都能控场）
Host Dashboard 与 Projector View 本质是**带 `hostToken` 的浏览器客户端**，连到**当前生效的那台权威 server**：
- LAN / Tunnel 模式 → 连你笔记本上的 server。
- **Cloud 模式 → 你笔记本连云端 server 当 admin**，一样能看全班状态、控场、投影。
- 换句话说：**不管权威状态在笔记本还是云端，你的电脑永远是 admin/投影端**，只是它连的后端不同。
- 实现要点：`host:create` 返回 `hostToken`；Host 端把 token 存 localStorage，切换/重连时凭 token 重新认领 admin 身份（`host:reclaim`）。

### 6.2 局域网主机（你的保底）
- 你笔记本**原生**跑 `node server`（不套 Docker，避免容器网络挡住扫码连接）。
- 前端 `vite build` 出静态文件，由同一 server 托管。
- 玩家连同一 Wi-Fi，扫码打开 `http://<局域网IP>:3000`。
- 课前务必：查局域网 IP、放行 Windows 防火墙端口、两台真机实测扫码。
- 已知风险（产品 §11）：AP/Client Isolation、VLAN 会让它失效 → 所以有 Tunnel/Cloud/Pass&Play。

### 6.3 Tunnel 公网（推荐公网法）
- 你笔记本装 `cloudflared`，把本地 `:3000` 暴露成公网 HTTPS 域名。
- **命名隧道**可拿**固定 URL** → 二维码课前就能生成/打印。
- 公网 Tunnel 模式**依赖你笔记本自己有网**（隧道要连出去）；这点接受即可。
- 优点：不受校园网 Client Isolation 影响（公网就是公网）；与 LAN 共用同一房间。

### 6.4 Cloud 公网（独立保险）
- **server 容器化**，`Dockerfile` 部署到 Render / Railway / VPS，走 WSS 443。
- 独立房间、独立房间码；不依赖你笔记本。
- CORS / 证书部署时配好。前端静态产物同源托管或走 Netlify/Vercel/CF Pages。

### 6.5 连接切换器（自动检测 + 手动开关）
**放在 Host Dashboard（笔记本自己那块屏，不投影），不放投影视图。**

连接面板显示与控制：
```
Public method:  ( Tunnel | Cloud )        ← 本场用哪种公网，运行时选
Mode:           ( Auto | Public | LAN )   ← 你的开关，手动可强制覆盖
Tunnel:  🟢 up  https://xxx...            LAN:  192.168.1.23:3000
Cloud:   🔴 down                          Active endpoint: Tunnel
```

**自动检测逻辑**（Host 浏览器定时探测，约每 5–10s）：
- 探测 = `fetch(<入口URL>/health)` 带超时；通过=🟢，超时/失败=🔴。
- 反直觉但重要：**笔记本探测不了"同学手机能否连 LAN"**（取决于校园网隔离），但**能探测公网入口是否可达**。
- Auto 策略：`选定的公网入口 🟢 → 用公网`；`公网 🔴（现场无网/隧道没起来）→ 回退 LAN`。
- 手动开关随时覆盖 Auto（强制 Public / 强制 LAN）。

**切换生效**：Host 改变 Active endpoint → 通过 `projector:endpoint` 事件推给投影视图 → 投影**只更新二维码/网址**。Tunnel↔LAN 切换不影响已连接的同学；涉及 Cloud 的切换会提示"将开始新一局房间"。

### 6.6 Docker 边界
- Docker 只用于 **Cloud 公网部署**。
- 本机 dev、LAN 主机、Tunnel 一律原生 node（Tunnel 只是在原生 server 前面加 cloudflared）。
- 前端不进容器（静态文件）。

---

## 7. 开发顺序与任务拆解

> 原则：**先做出任何时候都能演示的东西（Pass & Play），再往上叠实时房间。**

### 阶段 A — 地基（先做）
- [ ] pnpm workspaces + 三包 tsconfig
- [ ] `shared/types.ts`、`shared/events.ts`
- [ ] Vite + Vue + Pinia + Router 骨架；合集首页（其余游戏 Coming soon）
- [ ] 模式选择页（Host Live / Pass & Play / Presenter Demo / How to Play）

### 阶段 B — 规则引擎（纯逻辑，可测）
- [ ] `roles.ts` 角色分配（1 Undercover / 5 Civilian，Mr White 关闭）
- [ ] `order.ts` 随机发言顺序
- [ ] `voting.ts` 计票 + 平票（对应产品 §8.6）
- [ ] `outcome.ts` 胜负判定（§8.7）
- [ ] vitest 单元测试覆盖上述

### 阶段 C — Pass & Play（保底 demo 达成点）
- [ ] 输入本组玩家姓名
- [ ] 传递设备流程：I'm ready → 长按看词 → I've memorised → 隐私遮罩 → 下一位
- [ ] 讨论/投票计时器 + 投票 UI + 胜负结算
- [ ] 刷新/返回不泄露上一位玩家词语（§23）

### 阶段 D — 词库与文案
- [ ] `en-easy.json`、`en-medium.json`（各先 20 对，够周六；目标 40+40）
- [ ] 英式英语界面文案（organise/colour/centre…），i18n 结构预留 zh

### 阶段 E — Online Room（复用 B 的逻辑）
- [ ] server：Express + Socket.IO + 内存房间
- [ ] Room code + QR code 生成
- [ ] 玩家加入 / 自动分组 / 手动选组
- [ ] Host Dashboard（四组实时卡片，§15.1）
- [ ] Projector View（Kahoot 式，绝不显示秘密，§15.4）
- [ ] `you:secret` 点对点下发词语
- [ ] 连接切换器（§6.5）：Tunnel/Cloud/LAN 入口 + 自动检测 + 手动开关 + `projector:endpoint`
- [ ] LAN 跑通 + Cloudflare 隧道跑通 + 云端 Docker 部署跑通

### 阶段 F — 打磨（有时间）
- [ ] PWA 离线缓存（Pass & Play）
- [ ] 断线重连（localStorage token）
- [ ] Host 暂停/跳过/延时、Reveal answers
- [ ] 动画 + 音效 + `prefers-reduced-motion`（§20）
- [ ] Presenter Demo 模拟一局

### 阶段 G — 课前验收（对应产品 §26）
- [ ] iPhone / Android / iPad / 电脑各测一遍
- [ ] 二维码、断线重连、Pass & Play、离线模式
- [ ] 确认投影不显示秘密词语
- [ ] 局域网两台真机 + 公网各跑一局

---

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 两天内 Online Room 做不完 | Pass & Play 先做完即达标；Online 是叠加项 |
| 校园网 Client Isolation | 公网 Online Room + Pass & Play 双保险 |
| 局域网 Docker 连不上 | 局域网主机原生 node 跑，不套容器 |
| 投影泄露答案 | projector:state 与 host:fullState 分离，默认安全模式 |
| 多人实时边界情况（掉线/并行组） | 逻辑放 shared 可单测；断线重连列入 F 阶段非 P0 |
| TS7 工具链不稳 | 用 TS 5.x 稳定版 |

---

## 9. 待你确认 / 后续可定

- 公网部署平台：Render / Railway / 自有 VPS？（影响 Dockerfile 与 CI）
- 词库先做多少对：周六建议 easy/medium 各 20，目标各 40。
- 首页命名沿用 "Breaktime Arcade"（产品文档已定）。
- 何时开工写代码：本文档确认后即可从阶段 A 开始。
```