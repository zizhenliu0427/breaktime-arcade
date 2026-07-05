# HANDOFF — Breaktime Arcade

> 给下一个会话的交接文档。最后更新：2026-07-03（晚间会话：solo 体验修复 + 房间容量提到 24 + 现场可编辑卧底数/容量/踢人 + 恢复"玩家自选小组" + 去掉 team 残留文案）。

## ⚠️ 本次会话改动（晚间，尚未 commit——建议一次性提交）

全部 typecheck 三包过、26/26 单测过、生产构建过、socket 冒烟脚本端到端验过（team 自选组+开局后禁止换组、solo 自动分配+用玩家名显示、卧底数 live 改、容量缩容不越占用地板、踢人）。server 已用最新构建在 `PORT=3211` 重启，公网隧道仍在转发。建议 commit message：`feat: live room config editing (undercovers/resize/kick) + player-pick-team + solo UX fixes`。

1. **Simulate 最少人数 4→3**（`AutoSimulate.vue` 滑杆 `min`）——匹配引擎真实下限（1 卧底+2 平民）。
2. **修 solo "幽灵空组"投票 bug**：`rooms.ts` `teamGroupAlive()` 对"从未坐进去的空组"曾错误默认 `alive:true`，导致空组混进投票目标/"N teams in"计数。改成默认 `false`（一处修好投票列表+计数两处）。
3. **Solo 不再叫 "Group N"**：`publicState()` 检测 `groupSize===1` 且组内恰好 1 真人时，显示名用该玩家自己的名字。玩家端（`PlayPage`）+ host 端（`HostRoom`）的"团队"用语在 solo 下切到"个人版"文案 key（`isSolo` 判断，复用已有 en/zh 键）——**team 残留文案已清干净**。
4. **房间容量 6→24**：`GROUP_IDS` 从 A–F 扩到 A–X（24 个），server clamp 跟着放开。solo 人数下拉 3–24；**超过 12 人显示橙色警告**建议改 teams/parallel（`SOLO_COMFORTABLE_MAX=12`）。E 组以后无固定色，用紫色系兜底（`tokens.css`/`HostRoom` 的 `.group-e/.group-f` 仍在，更多组落到默认 `--line`/紫）。
5. **现场可编辑（不重开房间，team 和 groups 都支持）**：新增 `HostAction` 分支——
   - `undercoverCount` 现在可配（`sanitiseConfig` clamp 1–5；HostSetup 建房时 1–3 下拉；HostRoom 设置面板也能改）。**注意**：之前 online 把它硬写死 1，现已解禁；能不能真的坐下由 `startTeamGame/startGroupGame` 的 try/catch 兜底（specials≥seat-1 会 soft-fail 不崩）。
   - `updateConfig` 白名单加了 `undercoverCount/groupCount/groupSize`；`groupCount` 缩容时取 `max(目标, 已占用组数)`——**绝不孤立已有玩家**；扩容立即补建空组 map。设置面板加了对应下拉。
   - **新增 `kickPlayer` 动作**：`removePlayer()` 删玩家 + 给被踢 socket 发 `room:closed`（复用玩家端已有的 closed 界面）。HostRoom 的未分组 chip 和每个组成员列表旁都有 `✕` 按钮（confirm 二次确认）。
6. **恢复"玩家自己选小组"**（team vs team / parallel）：join 时**只有 solo（groupSize===1）自动分配**，其余模式留空 `groupId` → 落到 `PlayPage` 大厅自己选组。加了 statusbar「换组」按钮 + `switchingTeam` 本地态，**开局前**可反复换（当前组高亮 `.current`）；开局后 server 端 `pickGroup` 用 `gameInProgress()` 守卫**禁止换组**（首次选/迟到者补位仍允许）。之前 join 无条件 `pickGroup(null)` 是"为测试省事"，现已改。这也**顺带定了 HANDOFF 之前挂起的组名悬念**。

## 项目是什么

课堂/聚会用的网页小游戏合集，Kahoot 风格，首发游戏 **Who's Undercover?（谁是卧底）**。
用户的场景：**周六（2026-07-04）课堂展示**，约 24 人分 4 组，每组 6 人（5 平民 + 1 卧底，Mr White 关闭）。
用户电脑接投影仪，是永远的 admin/控制端。第一阶段只支持**英式英语**，中文后续再做。

三份文档必读（按优先级）：
1. `breaktime-arcade-tech-plan.md` — 技术方案定稿（架构、事件协议、部署、任务拆解 §7）
2. `breaktime-arcade-project-plan-v2.md` — 用户的产品规划（规则细节、Host Dashboard、词库原则）
3. `README.md`（英式英语）/ `README.zh-CN.md`（中文附属）

## 当前状态：Online Room 双模式（team / groups）端到端可玩 + Presenter Demo 上线 + 部署基础设施就绪 ✅

Pass & Play 仍可玩；**Online Room 后端 + Host Dashboard + 玩家端全部接通**，单机已验证（typecheck 三包过、26/26 单测过、生产构建过、server 冒烟过、两种模式 smoke 过）。**Presenter Demo** 已上线（`/undercover/demo`）。**Auto-Simulate 自动模拟** 已上线（`/undercover/simulate`）。**部署**：`start-tunnel.ps1`（方案 A）+ `render.yaml`（方案 B）就绪。**防护**：创房 5次/分/IP、加入 30次/分/IP 限速（`rateLimiter.ts`）；`trust proxy` 已配。

**2026-07-03 白天会话改动（已并入 commit `94ae639`）：**
- **修复构建 bug**：上一次 i18n 提交（`6110329`）误删了 `PassPlaySetup.vue` 和 `HostRoom.vue` 开头的 `<script setup lang="ts">` 标签，导致 `pnpm build` 直接失败。已补回。
- **语言切换器改为显示当前语言**：右上角按钮从"显示要切换到的目标语言"改为**显示当前语言**（英文界面显 `EN`，中文界面显 `中文`），点击行为不变。`App.vue` 用当前 `locale` 计算标签。顺手删掉了已无引用的 `nav.langSwitch` 翻译键（en/zh）。
- **新增 Auto-Simulate 自动模拟模式**（`/undercover/simulate`，`pages/undercover/AutoSimulate.vue`）：一个人单机、上帝视角，用**真实规则引擎 + 机器人**自动跑完整一局（发词→逐个线索→讨论倒计时→机器人投票带箭头/计票→淘汰揭身份→下一轮→胜负），无需多设备/多人。可播放/暂停/单步、0.5×–4× 调速、重来、返回设置；右侧实时战报日志；可配玩家数(4–10)/卧底数/Mr White/词库；中英双语。机器人策略：卧底投平民、平民约 55% 概率怀疑到卧底。复用 `@arcade/shared` 引擎纯函数，机器人逻辑在页面内。首页(`UndercoverHome.vue`)第 5 张卡片，**Presenter Demo 原样保留**。
- **本地公网部署已跑通**：`PORT=3211 pnpm start` + Cloudflare Quick Tunnel（`cloudflared`，winget 已装）。⚠️ Quick Tunnel 的 URL **每次重启随机、关机即断**，仅临时用；固定短域名需自有域名走 Cloudflare 命名隧道，或方案 B（Render）。用户已确认展示走"Cloudflare 长域名 + 二维码扫码"（无警告页最省事）。
- **HostSetup 改为「意图优先」**：默认会话名 `PY Icebreaker` → **`Undercover Party`**（`DEFAULT_ROOM_CONFIG`，改了 shared 需重启 server）。设置页顶部新增「你们打算怎么玩？」三选一卡片，映射到底层 `mode/groupCount/groupSize`，**小班不再纠结"组数×人数"**：`solo`(每人独立=team+groupSize1) / `teams`(组间对抗=team+size>1) / `parallel`(多组并行=groups)。选 solo 时显示"玩家人数"下拉（**晚间会话已把 solo 上限从 6 提到 24**，>12 有警告）；选 teams/parallel 才显示组数/人数，且标签随之变（队伍/小组）。底部有容量说明句。移除了原来的 `Mode` 下拉（现由 play style 驱动）。底层模型零改动，规则/server 全复用。`host.setup.*` 加了 playStyle/style*/num*/per*/cap*/numPlayers/soloLargeWarning/undercoverCount 一批键（en+zh）。

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
- **server**：`rooms.ts`（`RoomManager` 双模式：team 一场 game seat=组 / groups 每 group 一场 game seat=成员；服务器权威计时器；分层快照；`startGame` try/catch 防 throw 崩进程；快照成员用 `groupMembers()` 过滤而非缓存的 `memberIds`；晚间新增 `removePlayer`/`gameInProgress`/容量地板）+ `handlers.ts`（`you:secret` 点对点 / `host:fullState` 只进 `:host` 频道；**join：solo 自动分组、其余留空让玩家自选**；`kickPlayer` 分支；重连重认领）+ `index.ts`（`/health`、`/api/endpoints` 吐 LAN IP）。
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
5. ~~Cloudflare Tunnel + Cloud Docker 部署跑通，固定域名二维码课前打印。~~ 🔧 **进行中**：
   - **方案 A（Cloudflare Tunnel）**：`start-tunnel.ps1` 已就绪，winget 自动装 cloudflared，跑 `pnpm start` 后执行脚本即可得到公网 URL。不需要账号，URL 每次随机，关机即断。
   - **方案 B（Render）**：`render.yaml` + 精简 Dockerfile（slim runtime）已就绪，push 后去 Render Dashboard → New → Blueprint 一键部署。Region：Singapore（最接近澳洲）。Free tier 闲置 15 min 冷启动；周六前 5 分钟手动开一次暖机。
   - ⚠️ **待完成**：方案 B 需实际在 Render 上部署并验证 WebSocket 连接、生成固定二维码。
6. 断线重连、PWA 离线、音效。
7. P2：中文界面/词库、其他游戏：
   - **德州扑克 (Texas Hold'em)** — 多人对战，公共牌 + 下注轮
   - **梭哈 (Stud Poker)** — 5 张牌比大小
   - **21 点 (Blackjack)** — 玩家 vs 庄家
   - **德国心脏病 (Halli Galli)** — 实时反应抢拍，适合课堂暖场
   - **骗子酒吧 (Liar's Bar)** — 两个子模式：
     - **Liar's Deck**：20 张牌（6K/6Q/6A/2 Joker），每人 5 张，宣称出牌类型，质疑者猜对则出牌者受罚（俄罗斯轮盘淘汰），猜错则质疑者受罚。Joker 为万能牌
     - **Liar's Dice**：掷骰子后隐藏，轮流叫全场某点数的总数，越叫越高，质疑后翻开验证。类似大话骰
     - 非常适合社交欺骗类课堂活动，与 Who's Undercover 同类型
   - **斗地主 (Dou Di Zhu)** — 3 人对战，地主 vs 2 农民，经典抢地主 + 出牌博弈，需实现牌型判断引擎（单/对/三带/顺子/炸弹等）
   - **麻将 (Mahjong)** — 4 人对战，复杂度最高（136 张牌、吃碰杠胡、番数计算），建议先做简化版（国标/广东规则二选一），后期再加地方规则
   - **狼人杀 (Werewolf)** — 经典社交推理，日夜轮转，狼人/预言家/女巫/猎人等角色，需要主持人或系统代替主持
   - **阿瓦隆 (Avalon)** — 5-10 人，好人阵营 vs 莫德雷德阵营，任务投票 + 身份推理，规则比狼人杀更紧凑
   - **一夜狼人 (One Night Ultimate Werewolf)** — 单夜制快速版狼人杀，每局 10 分钟，无淘汰，适合课堂快速暖场
8. P2/P3：**微信小程序客户端**（展示后推进）—— 新增一个客户端平台，**复用现有 server + `@arcade/shared` 纯逻辑引擎**（最大卖点，规则/词库零重写）。重点：
   - **Socket.IO ↔ 微信 WebSocket**：小程序只有 `wx.connectSocket`（裸 WebSocket），Socket.IO 客户端不能直接用。两条路：(a) `weapp.socket.io` / `socket.io-client` 的 wx 适配器（小改）；(b) server 端加一个裸 WS 入口、小程序直连（更干净，但要重做事件封装）。
   - **客户端实现选型**：`uni-app`（把现有 Vue 3 代码编译成小程序，复用度最高）/ `Taro` / 原生 WXML 重写。倾向 uni-app，能保留大量组件 + 路由。
   - **分发优势**：扫一扫进房（小程序码替代普通二维码）、微信群/朋友圈分享拉人、免浏览器、国内无墙。可能比网页版更适合国内课堂。
   - **配套**：注册小程序主体（个人/企业）+ 类目备案、`wss://` 域名白名单（公网隧道/云部署必须 HTTPS）、把投影页的房间二维码换成「小程序码」。
9. P3：**架构成熟化**（展示后推进）：
   - **Redis**：房间状态持久化 + Socket.IO Adapter（支持多实例水平扩展、服务器重启不丢房间）。
   - **数据库**（PostgreSQL/MongoDB）：用户系统、游戏历史、词库管理后台。
   - **前后端分离部署**：前端 → CDN/Nginx，后端 → 独立服务，各自扩缩容；当前生产模式 server 兼当静态文件服务器（单进程单端口，LAN 最简但不适合规模化）。
   - **API 规范化**：REST API + OpenAPI 文档，WebSocket 仅做实时推送。
   - **认证**：JWT/OAuth 替换当前的随机 token。
   - **监控**：结构化日志 + 健康检查 + 指标（Prometheus）。

⚠️ **规则变更**：投票允许自投（2026-07-03），选中自己时有虚线边框 + ⚠️ 警告横幅 + confirm 二次确认。改动：`engine.ts`（eligibleTargets 不再过滤自己）、`onlinePlayer.ts`（voteTargets 加 isSelf）、`PlayPage.vue` + `PhaseVote.vue`（警告 UI）。

✅ **组名悬念已解决**（晚间会话）：solo 直接用玩家自己的名字当"组名"；team/parallel 组名仍默认 `Group N`，但玩家加入时**自己选进哪个组**（不是自己命名组）。原来那条"未最终确认"到此作废。

## 用户偏好（重要）

- 中文交流；React 项目太多所以选 Vue；**先别急着写代码时会明说**，说"直接开始"就自己干。
- 用户自己执行 git 命令，只找你要 commit message（要求过"就一行"）。
- TS7/tsgo 想用但已说服先用 TS 5.x（vue-tsc 生态未稳），展示后可尝鲜。
- Docker：仅用于 Cloud 部署和 compose 一键跑；本机 dev / LAN 主机原生 node（避免容器网络挡扫码）。
- 周六展示的兜底顺序：公网优先 → 局域网 → Pass & Play → 6 人志愿者演示。
