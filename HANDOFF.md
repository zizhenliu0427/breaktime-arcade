# HANDOFF — Breaktime Arcade

> 给下一个会话的交接文档。最后更新：2026-07-03（Online Room 双模式 team/groups + 移动端修复 + 组名）。

## 项目是什么

课堂/聚会用的网页小游戏合集，Kahoot 风格，首发游戏 **Who's Undercover?（谁是卧底）**。
用户的场景：**周六（2026-07-04）课堂展示**，约 24 人分 4 组，每组 6 人（5 平民 + 1 卧底，Mr White 关闭）。
用户电脑接投影仪，是永远的 admin/控制端。第一阶段只支持**英式英语**，中文后续再做。

三份文档必读（按优先级）：
1. `breaktime-arcade-tech-plan.md` — 技术方案定稿（架构、事件协议、部署、任务拆解 §7）
2. `breaktime-arcade-project-plan-v2.md` — 用户的产品规划（规则细节、Host Dashboard、词库原则）
3. `README.md`（英式英语）/ `README.zh-CN.md`（中文附属）

## 当前状态：Online Room 双模式（team / groups）端到端可玩 + Presenter Demo 上线 ✅

Pass & Play 仍可玩；**Online Room 后端 + Host Dashboard + 玩家端全部接通**，单机已验证（typecheck 三包过、26/26 单测过、生产构建过、server 冒烟过、两种模式 smoke 过）。**Presenter Demo** 已上线（`/undercover/demo`），7 步交互式演示，投影友好，无真实秘密。

```
packages/
  shared/   纯 TS 规则引擎 + 词库 + online 类型/事件协议（无框架无网络，两个模式复用）
  client/   Vue 3 + <script setup> + TS 5.x + Pinia + Vue Router + Vite
  server/   Express + Socket.IO，内存房间（rooms.ts/handlers.ts 已写完）
```

**两种游戏模式**（HostSetup 选 `Mode`）：
- **team**（默认）：全班**一场**，每个组 = 一个参赛单位（seat），组内成员**共享同一个词**，组按顺序发言、每组一票（先到先锁），找**卧底组**。`groupSize=1` 退化为「每人独立玩」。
- **groups**：每个组**内部各自玩一局**（组内 1 个卧底），N 组并行，找组内卧底（重构前的旧模型，已作为第二模式加回）。
- 规则引擎零改动复用（seat 抽象）：team 的 seat 是组，groups 的 seat 是组内成员。

**Online Room 全部落地**（Fable 先写 server/shared/Host 端；接力补齐玩家端 + 双模式 + 移动端 + 一堆 bugfix）：
- **shared**：`online.ts`（`RoomConfig.mode` + `groupNames` + 公开快照/HostState/SecretPayload/房间码/平衡自动分组）+ `events.ts`（强类型事件契约；`Ack` 默认泛型修为 `object`，否则无载荷事件 `ack({ok:true})` 报错）+ `test/online.test.ts`（7 测试）。`game/roles.ts` 最小人数 3→2。
- **server**：`rooms.ts`（`RoomManager` 双模式：team 一场 game seat=组 / groups 每 group 一场 game seat=成员；服务器权威计时器；分层快照；`startGame` try/catch 防 throw 崩进程；快照成员用 `groupMembers()` 过滤而非缓存的 `memberIds`）+ `handlers.ts`（`you:secret` 点对点 / `host:fullState` 只进 `:host` 频道；**join 即自动平衡分组**；重连重认领）+ `index.ts`（`/health`、`/api/endpoints` 吐 LAN IP）。
- **client**：`stores/onlineHost.ts`+`onlinePlayer.ts`（后者 getter 全部按 `mode` 分支：team 读 room 级、groups 读 myGroup 级）+ `lib/socket.ts`+`useCountdown.ts` + `HostSetup.vue`（Mode 选择 + 组名默认 Group N，**不**由 host 配置）+ `HostRoom.vue`（QR、team 显示 room 级进度条 / groups 每组卡片含 game 状态 + per-group Skip/Next/Play again、Reveal answers 默认关+确认、阶段字号放大）+ `JoinPage.vue` + `PlayPage.vue`（全阶段：长按看词松手即隐→线索顺序→讨论倒计时→投票→揭晓翻牌→纸屑；team 组票先到先锁 / groups 每人投）。
- **接线**：路由 `/undercover/host`、`/undercover/host/room`、`/join/:code`、`/play`；入口卡 "Host a Live Room" 已开；`vite.config.ts` 代理 `/socket.io`(ws)+`/api`→localhost:3000；新依赖 `qrcode`(+types)、`socket.io-client`；`BaseButton` 加 `type` prop（修了 Join 按钮 form submit 不触发的 bug）。
- **移动端修复**：iOS 不再横向滑动 + Safari 输入框不再出界（`body/html overflow-x:hidden`、flex 链 `min-width:0`、`input/select/textarea width:100%`；去掉 `overflow-x: clip` 双声明坑——不认 clip 的 Safari 会两个都不生效）。
- **改名**：Facilitator reveal → **Reveal answers**（UI + 全部文档 + 代码注释，零残留）。

**Pass & Play**（仍可玩）：合集首页 → `/undercover` → 全流程（建组→传设备+隐私遮罩→长按看词→线索→讨论→投票→揭晓→纸屑）。状态只在内存，刷新回设置页（防泄词 §23）。

- **shared 规则引擎**：`game/`（roles/order/voting/outcome/engine 纯函数状态机）+ `wordpacks/`（en-easy/medium 各 40 对）+ `test/engine.test.ts`（19 测试）。平票：第一次平票→平票者再线索、其他人重投；再平票→无人淘汰。角色词随机换边。
- **设计体系**：`tokens.css` — 紫罗兰主色 + 橙 CTA + 四组固定色（A红 B蓝 C黄 D绿，E/F 紫）。动画尊重 `prefers-reduced-motion`。
- **响应式/动画**：App 壳 flex 填满视口 + footer；radial 渐变底；`.page--wide` 1100px；hero 渐变 + 漂浮 emoji；卡片 hover；顶栏 sticky。

## 常用命令

```bash
pnpm dev          # client(5173) + server 热更新
pnpm test         # shared 单测
pnpm typecheck    # 全包
pnpm build        # client 生产构建
pnpm start        # 跑打包后的应用（PORT 可覆盖）
docker compose up --build   # 单容器生产版
```

⚠️ 用户本机 **3000 端口被另一个 Next.js 项目占用**，测试一律用 `PORT=3211 pnpm start`（3211 单 origin：静态 + socket）。

⚠️ **改了 server/shared 代码必须重启 server 才生效**：`TaskStop`/Ctrl-C 只杀 pnpm 父进程，tsx 的 node 子进程会**残留占端口**（`curl localhost:3211/health` 的 `uptime` 是几千秒就是旧进程在跑旧代码）。用 PowerShell 杀端口再起：
```powershell
Get-NetTCPConnection -LocalPort 3211 -State Listen | Select -ExpandProperty OwningProcess -Unique | % { Stop-Process -Id $_ -Force }
```
然后 `PORT=3211 pnpm start`，再 `curl localhost:3211/health` 确认 `uptime` 是个位数秒。详见 memory `restart-server-windows`。

## 下一步

Online Room 双模式 LAN 单机全通；剩下：

1. **真机 LAN 联调**（最优先）：两台设备扫码跑一整局，两种模式都测。重点验校园网 Client Isolation（§11）。
2. ~~**Presenter Demo**（用户已要求）：投影演示规则 + 模拟一局，不发真实秘密。~~ ✅ 已完成（`/undercover/demo`，7 步交互式演示）。
3. **Projector View**（§15.4）：独立全屏投影页，Kahoot 式，只显公开状态，**绝不泄秘密**——与 host 的 Reveal answers 物理分离。
4. **连接切换器**（§6.5）：`Auto | Public | LAN` 开关 + `/health` 探测 + `projector:endpoint` 换二维码。关键差异：**Tunnel+LAN 同房无痛切换；Cloud 独立房间，回退需重进**。
5. Cloudflare Tunnel + Cloud Docker 部署跑通，固定域名二维码课前打印。
6. 断线重连、PWA 离线、音效。
7. P2：中文界面/词库、Mr White、其他游戏。
8. P3：**架构成熟化**（展示后推进）：
   - **Redis**：房间状态持久化 + Socket.IO Adapter（支持多实例水平扩展、服务器重启不丢房间）。
   - **数据库**（PostgreSQL/MongoDB）：用户系统、游戏历史、词库管理后台。
   - **前后端分离部署**：前端 → CDN/Nginx，后端 → 独立服务，各自扩缩容；当前生产模式 server 兼当静态文件服务器（单进程单端口，LAN 最简但不适合规模化）。
   - **API 规范化**：REST API + OpenAPI 文档，WebSocket 仅做实时推送。
   - **认证**：JWT/OAuth 替换当前的随机 token。
   - **监控**：结构化日志 + 健康检查 + 指标（Prometheus）。

⚠️ **规则变更**：投票允许自投（2026-07-03），选中自己时有虚线边框 + ⚠️ 警告横幅 + confirm 二次确认。改动：`engine.ts`（eligibleTargets 不再过滤自己）、`onlinePlayer.ts`（voteTargets 加 isSelf）、`PlayPage.vue` + `PhaseVote.vue`（警告 UI）。

⚠️ **组名**：当前默认 `Group 1/2/3/4`（host 不配置）。用户提过「每个人加入时自己写组名，默认 group1234」但**意思未最终确认**（疑似指玩家名 JoinPage 已有、组名默认即可），下次会话先问清再动。

## 用户偏好（重要）

- 中文交流；React 项目太多所以选 Vue；**先别急着写代码时会明说**，说"直接开始"就自己干。
- 用户自己执行 git 命令，只找你要 commit message（要求过"就一行"）。
- TS7/tsgo 想用但已说服先用 TS 5.x（vue-tsc 生态未稳），展示后可尝鲜。
- Docker：仅用于 Cloud 部署和 compose 一键跑；本机 dev / LAN 主机原生 node（避免容器网络挡扫码）。
- 周六展示的兜底顺序：公网优先 → 局域网 → Pass & Play → 6 人志愿者演示。
