# HANDOFF — Breaktime Arcade

> 给下一个会话的交接文档。最后更新：2026-07-02（Online Room LAN 端到端打通）。

## 项目是什么

课堂/聚会用的网页小游戏合集，Kahoot 风格，首发游戏 **Who's Undercover?（谁是卧底）**。
用户的场景：**周六（2026-07-04）课堂展示**，约 24 人分 4 组，每组 6 人（5 平民 + 1 卧底，Mr White 关闭）。
用户电脑接投影仪，是永远的 admin/控制端。第一阶段只支持**英式英语**，中文后续再做。

三份文档必读（按优先级）：
1. `breaktime-arcade-tech-plan.md` — 技术方案定稿（架构、事件协议、部署、任务拆解 §7）
2. `breaktime-arcade-project-plan-v2.md` — 用户的产品规划（规则细节、Host Dashboard、词库原则）
3. `README.md`（英式英语）/ `README.zh-CN.md`（中文附属）

## 当前状态：Online Room（LAN）端到端可玩 ✅

Pass & Play 仍可玩；**Online Room 后端 + Host Dashboard + 玩家端全部接通**，单机 dev 已验证（typecheck 三包过、25/25 单测过、生产构建过、server 冒烟过）。

```
packages/
  shared/   纯 TS 规则引擎 + 词库 + online 类型/事件协议（无框架无网络，两个模式复用）
  client/   Vue 3 + <script setup> + TS 5.x + Pinia + Vue Router + Vite
  server/   Express + Socket.IO，内存房间（rooms.ts/handlers.ts 已写完）
```

**Online Room 本次落地**（Fable 先写了 server/shared/Host 端；接力补齐玩家端 + 修通联调）：
- **shared**：`online.ts`（RoomConfig/公开快照/HostState/SecretPayload/房间码/自动分组）+ `events.ts`（Socket.IO 强类型事件契约）+ `test/online.test.ts`（6 测试）。⚠️ 修了 `Ack` 默认泛型：`Record<string,never>` 会让 `{ok:true}&T` 把 `ok` 收窄成 `never`，已改为 `object`。
- **server**：`rooms.ts`（`RoomManager`：房间生命周期/分组/服务器权威计时器/复用 `game/engine`，房间码+词对+角色秘密分层快照）+ `handlers.ts`（事件处理：`you:secret` 点对点发词、`host:fullState` 只进 `<code>:host` 频道、host/player 重连重认领、断线标记）+ `index.ts` 加 `/api/endpoints`（吐 LAN IP 给二维码）。
- **client**：`stores/onlineHost.ts`+`onlinePlayer.ts`（Pinia，localStorage 存 hostToken/playerToken，刷新/重连自动 reclaim/rejoin）+ `lib/socket.ts`（单连接）+ `lib/useCountdown.ts`（按服务器 `phaseEndsAt` 倒计时）+ `pages/undercover/HostSetup.vue`+`HostRoom.vue`（QR、四组卡片、answer reveal（按钮 Reveal answers）默认关+确认、per-group 控制）+ `pages/JoinPage.vue`（`/join/:code`）+ **`pages/PlayPage.vue`（`/play`，玩家全阶段：选组→长按看词松手即隐→线索顺序+轮到你才可推进→讨论倒计时环→匿名投票+已投等待→揭晓翻牌→纸屑结局）**。
- **接线**：路由 `/undercover/host`、`/undercover/host/room`、`/join/:code`、`/play` 已注册；入口卡 "Host a Live Room" 已开。`vite.config.ts` 代理 `/socket.io`(ws)+`/api`→localhost:3000。新依赖：`qrcode`(+@types)、`socket.io-client`。

**Pass & Play**（仍可玩）：合集首页 → `/undercover` 模式选择 → 全流程（建组→传设备+隐私遮罩→长按看词松手即隐→线索顺序→45s 讨论→传设备匿名投票→翻牌揭晓→纸屑+Play again）。状态只在内存，刷新即回设置页（防泄词，§23）。

- **shared 规则引擎**：`game/`（roles/order/voting/outcome/engine，纯函数状态机，可注入 seeded rng）+ `wordpacks/`（en-easy、en-medium 各 40 对）+ `test/engine.test.ts`（19 测试）。平票规则：第一次平票→平票者再给线索、其他人只在他们中重投；再平票→本轮无人淘汰。角色词随机换边。Online 房间的 group game 复用同一份 engine（room↔engine 用 `memberIds` 下标做 id 映射）。
- **设计体系**：`client/src/styles/tokens.css` — 紫罗兰主色（--violet-800: #46178f）+ 橙色 CTA（--accent: #ff8a00）+ 四组固定色（A红 B蓝 C黄 D绿）。动画 160/280ms（新增 --t-slow 700ms / --ease-soft），全部尊重 `prefers-reduced-motion`。用户要求"不太素也不太花哨"，已认可现有审美。
- **响应式/动画打磨（2026-07-02）**：App 壳 flex 布局填满视口 + 全站 footer；body 加了柔和 radial 渐变底；`.page--wide`（1100px）用于首页，undercover 模式页 880px 两列；hero 动态渐变 + 漂浮 emoji（float-y）；新增全局 keyframes float-y/wiggle/pulse-soft；卡片 hover 抬升 + emoji wiggle、Available now 徽标呼吸圆点、按钮 hover 抬升、顶栏 sticky。

## 常用命令

```bash
pnpm dev          # client(5173) + server 热更新
pnpm test         # shared 单测
pnpm typecheck    # 全包
pnpm build        # client 生产构建
pnpm start        # 跑打包后的应用（PORT 可覆盖）
docker compose up --build   # 单容器生产版
```

⚠️ 用户本机 **3000 端口被另一个 Next.js 项目占用**，测试时用 `PORT=3210 pnpm start` 之类。**3210 上确实还活着上个会话起的旧版预览 server**（无 `/api/endpoints` 路由的旧代码，访问该路径会返回 index.html），本次冒烟改用 `PORT=3211`。清掉旧进程：`npx kill-port 3210`（Windows）或任务管理器结束 node。

## 下一步（按 tech-plan §7 的 E/F 阶段）

Online Room 的 **LAN 单机链路已全通**；剩下的是多设备/公网/打磨：

1. **真机 LAN 联调**（最优先）：两台不同设备扫码跑一整局——分组→长按看词→线索→讨论→匿名投票→平票重投→揭晓→结束。重点验校园网 Client Isolation（产品 §11）是否让手机连不上笔记本 server。
2. **连接切换器**（tech-plan §6.5）：Host Dashboard 上的 `Auto | Public | LAN` 开关 + 定时 `fetch(/health)` 探测 + `projector:endpoint` 推送换二维码。关键差异（用户要求写明）：**Tunnel+LAN 同一房间可无痛切换；Cloud 是独立房间，回退需重进**。
3. **Projector View**（§15.4）：独立全屏投影页，Kahoot 式，只显示公开状态（阶段/进度/人数/公开结果），**绝不显示秘密**——与 host 的 Reveal answers 物理分离。
4. **Cloudflare Tunnel + Cloud Docker** 部署跑通（§6.3/6.4），生成固定域名二维码课前打印。
5. 断线重连细节、PWA 离线缓存、音效、Presenter Demo。
6. P2：中文界面/词库、Mr White、其他游戏。

## 用户偏好（重要）

- 中文交流；React 项目太多所以选 Vue；**先别急着写代码时会明说**，说"直接开始"就自己干。
- 用户自己执行 git 命令，只找你要 commit message（要求过"就一行"）。
- TS7/tsgo 想用但已说服先用 TS 5.x（vue-tsc 生态未稳），展示后可尝鲜。
- Docker：仅用于 Cloud 部署和 compose 一键跑；本机 dev / LAN 主机原生 node（避免容器网络挡扫码）。
- 周六展示的兜底顺序：公网优先 → 局域网 → Pass & Play → 6 人志愿者演示。
