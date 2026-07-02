# HANDOFF — Breaktime Arcade

> 给下一个会话的交接文档。最后更新：2026-07-02。

## 项目是什么

课堂/聚会用的网页小游戏合集，Kahoot 风格，首发游戏 **Who's Undercover?（谁是卧底）**。
用户的场景：**周六（2026-07-04）课堂展示**，约 24 人分 4 组，每组 6 人（5 平民 + 1 卧底，Mr White 关闭）。
用户电脑接投影仪，是永远的 admin/控制端。第一阶段只支持**英式英语**，中文后续再做。

三份文档必读（按优先级）：
1. `breaktime-arcade-tech-plan.md` — 技术方案定稿（架构、事件协议、部署、任务拆解 §7）
2. `breaktime-arcade-project-plan-v2.md` — 用户的产品规划（规则细节、Host Dashboard、词库原则）
3. `README.md`（英式英语）/ `README.zh-CN.md`（中文附属）

## 当前状态：Pass & Play 已可玩 ✅

pnpm monorepo，三包 + Docker，全部验证通过（typecheck 三包过、19/19 单测过、生产构建过、server 冒烟过）：

```
packages/
  shared/   纯 TS 规则引擎 + 词库（无框架无网络，两个模式复用）
  client/   Vue 3 + <script setup> + TS 5.x + Pinia + Vue Router + Vite
  server/   Express + Socket.IO 骨架（/health 已有，房间逻辑未写）
```

- **shared**：`game/`（roles/order/voting/outcome/engine，纯函数状态机，可注入 seeded rng）+ `wordpacks/`（en-easy、en-medium 各 40 对）+ `test/engine.test.ts`（19 测试）。平票规则：第一次平票→平票者再给线索、其他人只在他们中重投；再平票→本轮无人淘汰。角色词随机换边。
- **client**：合集首页（其余游戏 Coming soon）→ `/undercover` 模式选择 → Pass & Play 全流程（建组→传设备+隐私遮罩→**长按看词松手即隐**→线索顺序→45s 讨论倒计时→传设备匿名投票→翻牌揭晓→纸屑+Play again）。游戏状态只在内存，刷新即回设置页（防泄词，产品 §23）。
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

⚠️ 用户本机 **3000 端口被另一个 Next.js 项目占用**，测试时用 `PORT=3210 pnpm start` 之类。上个会话在 3210 起过一个预览 server（后台），可能还活着。

## 下一步（按 tech-plan §7 的 E/F 阶段）

1. **Online Room**（最大块）：server 内存房间 + Room code + QR code + 玩家加入/自动分组 + Host Dashboard（四组卡片）+ Projector View（绝不显示秘密）。事件协议已在 tech-plan §3 定好（`you:secret` 点对点发词是安全铁律；`host:reclaim` 凭 token 重认领 admin）。
2. **连接切换器**（tech-plan §6.5）：LAN / Tunnel(Cloudflare) / Cloud 三入口，Auto 探测 `/health` + 手动开关。关键差异：**Tunnel+LAN 同一房间可无痛切换；Cloud 是独立房间，回退需重进**——用户明确要求写明此差异。
3. **Presenter Demo**、PWA 离线、断线重连、音效。
4. P2：中文界面/词库、Mr White、其他游戏。

## 用户偏好（重要）

- 中文交流；React 项目太多所以选 Vue；**先别急着写代码时会明说**，说"直接开始"就自己干。
- 用户自己执行 git 命令，只找你要 commit message（要求过"就一行"）。
- TS7/tsgo 想用但已说服先用 TS 5.x（vue-tsc 生态未稳），展示后可尝鲜。
- Docker：仅用于 Cloud 部署和 compose 一键跑；本机 dev / LAN 主机原生 node（避免容器网络挡扫码）。
- 周六展示的兜底顺序：公网优先 → 局域网 → Pass & Play → 6 人志愿者演示。
