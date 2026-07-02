# Breaktime Arcade 项目规划

## 1. 项目概述

计划制作一个适用于电脑、手机和平板的网页端课堂小游戏合集，暂定名：

- **Breaktime Arcade**
- 备选名称：
  - Party Pocket
  - Icebreaker Arcade
  - Classroom Party Games

项目的主要用途是：

- 职业年（Professional Year）课堂 icebreaker
- 朋友聚会
- 小组活动
- 团队建设
- 英语课堂互动

首个完整游戏为：

- **Who’s Undercover? / 谁是卧底**

后续计划加入：

- Last Card（UNO 类原创卡牌游戏）
- Draw & Guess（你画我猜）
- Charades（你演我猜）
- Two Truths and a Lie
- Quick Categories
- 其他适合小组和课堂的小游戏

项目第一阶段以**英式英语**为唯一完整支持语言。简体中文暂缓开发，但在界面右上角预留一个小型语言切换入口，后续再补充中文界面和中文词库。

---

## 2. 第一阶段目标

第一阶段需要在课堂展示前完成一个稳定、易懂、可在多种网络环境下运行的“谁是卧底”。

首页可以先以小游戏合集的形式展示，但只有 Who’s Undercover 可立即游玩，其他游戏显示：

> Coming soon

这样既能展示长期规划，也不会因为一次实现太多游戏而影响稳定性。

---

## 3. 目标设备

网页必须支持：

- Windows 和 macOS 电脑
- iPhone
- Android 手机
- iPad 和 Android 平板
- 横屏和竖屏
- 触摸操作
- 鼠标和键盘操作

页面需要使用响应式设计，不应依赖 hover 才能操作。

---

## 4. 语言设计

### 4.1 第一阶段语言范围

第一阶段只完整实现：

- English
- English word pack
- 英式英语界面文案

简体中文暂缓开发，不纳入本周六必须完成范围。

### 4.2 语言切换入口

页面右上角保留一个小型语言切换控件，例如：

```text
EN ▾
```

或：

```text
EN | 中文
```

设计要求：

- 体积小
- 不抢占主视觉
- 不做成首页的大卡片或主按钮
- 桌面端位于右上角
- 手机端位于顶部导航栏右侧
- 当前只启用 English
- 中文选项可以暂时显示为 `Coming later`，也可以先隐藏，仅保留扩展能力

### 4.3 后续中文支持

中文模式作为后续功能加入，包括：

- 简体中文界面
- 独立中文词库
- 中文规则说明
- 中英文界面切换
- Host 统一设置每局词库语言

中英文词库应相互独立，不应只做机械翻译。

### 4.4 英式英语

英文文案以英式英语为主，例如：

- organise
- favourite
- colour
- centre

推荐用词：

| English | Future Chinese |
|---|---|
| Civilian | 平民 |
| Undercover | 卧底 |
| Mr White | 白板 |
| Secret word | 秘密词语 |
| Give a clue | 给出线索 |
| Discuss | 讨论 |
| Vote | 投票 |
| Voted out | 被淘汰 |
| Join game | 加入游戏 |
| Host game | 创建游戏 |
| Play again | 再玩一局 |


---

## 5. 班级人数与分组方案

预计班级约有 24 人。

推荐方案：

- **4 组**
- **每组 6 人**

第一局每组角色配置：

- 5 名 Civilians
- 1 名 Undercover
- 不加入 Mr White

不建议 24 人同时参加同一局，原因包括：

- 发言时间过长
- 很难记住每个人的线索
- 投票过程复杂
- 玩家参与感降低
- 游戏容易拖延

也不优先推荐 6 组 × 4 人，因为四人局太短，第一次投错后局势可能很快变得明显。

---

## 6. 分组方式

支持两种分组模式。

### 6.1 自动分组

玩家加入后点击：

> Assign me to a group

系统自动平衡 Group A、B、C、D 的人数。

优点：

- 避免某组人数过多
- 鼓励不熟悉的同学交流
- 更符合 icebreaker 的目的

### 6.2 手动选组

适合教室已经按桌子分组的情况。

玩家可以选择：

- Group A
- Group B
- Group C
- Group D

每组达到人数上限后自动锁定。

Host 可以使用：

> Auto-balance groups

重新平衡各组人数。

---

## 7. 谁是卧底基础规则

### 7.1 Civilian

大多数玩家获得相同的秘密词语。

目标：

- 找出拿到不同词语的 Undercover

### 7.2 Undercover

获得一个与 Civilian 相似但不同的词语。

目标：

- 根据自己的词语给出合理线索
- 隐藏身份
- 生存到最后

游戏开始时不要直接告诉玩家自己的身份。

只显示：

> Your secret word is: TRAIN

这样即使是 Undercover，也不一定马上知道自己是卧底。

### 7.3 Mr White

Mr White 没有秘密词语，只能根据其他人的发言临场伪装。

如果 Mr White 被淘汰，可以获得一次猜 Civilian word 的机会。

第一局默认关闭 Mr White，后续再作为可选角色加入。

---

## 8. 游戏流程

### 8.1 查看秘密词语

每位玩家只在自己的设备上查看词语。

建议交互：

> Press and hold to reveal

松手后自动隐藏。

需要避免旁边玩家看到屏幕。

### 8.2 给出线索

系统随机选择第一位发言者，并显示顺序。

每人用一句简短的话描述自己的词语，但不能：

- 直接说出词语
- 拼写词语
- 说首字母
- 说字母数量
- 翻译成另一种语言
- 使用过于直接的同义词

推荐每人发言时间：

- 约 10 秒

网页不需要记录语音或文字线索，线索应面对面说出来，避免大家一直低头看手机。

### 8.3 讨论

所有玩家讨论谁最可疑。

建议时间：

- 45 秒

### 8.4 投票

每位存活玩家选择一名其他玩家。

限制：

- 不能投自己
- 投票匿名
- 只显示投票是否完成，不立即公开具体选择

### 8.5 淘汰

得票最多的玩家被淘汰。

可以公布身份：

> Alex was a Civilian.

但在游戏结束前，不公布该玩家的词语。

### 8.6 平票

如果出现平票：

1. 平票玩家各给出一个新线索
2. 其他玩家只能在平票玩家中重新投票
3. 如果再次平票，本轮无人淘汰

### 8.7 胜负条件

Civilians 获胜：

- Undercover 被淘汰

Undercover 获胜：

- 游戏只剩 Undercover 和一名 Civilian

---

## 9. Mr White 设计

Mr White 作为后续局的可选角色。

### Beginner

- 1 Undercover
- 无 Mr White
- 无特殊角色

### Standard

- 1 Undercover
- 可选 Mr White

### Advanced

- 自定义角色数量
- 可加入多个特殊角色

推荐六人局后续配置：

- 4 Civilians
- 1 Undercover
- 1 Mr White

第一局结束后可以提示：

> Ready for a harder round? Add Mr White, who receives no secret word.

---

## 10. 运行模式

系统需要支持三种主要模式。

### 10.1 Online Room

每位玩家使用自己的设备，Host 使用电脑控制整场游戏。

流程：

1. Host 在电脑上创建 Session
2. Host 页面生成 Room code 和 QR code
3. 玩家使用手机、平板或电脑扫码加入
4. 玩家输入姓名
5. 系统自动或手动分组
6. Host 在电脑端确认成员和分组
7. Host 点击 Start all groups
8. 各组独立查看词语、发言、讨论和投票
9. Host 电脑持续显示全班各组的游戏状态

在公网模式中：

- 玩家设备和 Host 电脑都连接公网服务器
- Host 电脑是游戏主持人和控制端
- 公网服务器负责实时通信和权威游戏状态
- Host 可以控制流程，但不应仅依赖 Host 浏览器保存所有状态

### 10.2 Local Network Room

Host 电脑同时承担：

- 本地服务器
- Host Dashboard
- 投影展示端
- 游戏管理端

玩家连接同一局域网后，通过二维码或局域网地址加入。

这种模式下，Host 电脑是真正的本地主机，但仍需准备公网和 Pass & Play 备用方案。

### 10.3 Pass & Play

每组共用一台设备。

流程：

1. 输入本组玩家姓名
2. 页面提示将设备交给指定玩家
3. 玩家点击 I’m ready
4. 私下查看词语
5. 点击 I’ve memorised my word
6. 页面出现隐私遮罩
7. 将设备传给下一位玩家

这是最重要的网络故障备用模式。

推荐：

- 4 个小组各使用一台手机
- 每组独立进行一局
- Host 电脑可以仅展示规则、计时和总体流程

Pass & Play 应尽量支持离线运行。

### 10.4 Presenter Demo

仅用于投影和展示规则。

可以提供：

- 模拟玩家
- 自动生成一局
- 展示游戏流程
- 模拟投票和淘汰
- 不真正分发秘密信息

适合网络和设备都不方便时进行课堂演示。


---

## 11. 学校局域网风险

即使所有人连接同一个学校 Wi-Fi，也可能无法互相访问设备。

常见原因：

- Client Isolation / AP Isolation
- 不同 VLAN
- Windows Firewall
- 非标准端口被阻止
- 手机和电脑连接了不同的访客网络
- WebSocket 被代理限制
- 局域网 IP 变化

因此不应该只依赖学校局域网。

---

## 12. 网络与备用方案

### 首选方案：公网 Online Room

所有设备连接公网服务器。

优点：

- 不依赖设备之间直接互访
- 不受学校 Wi-Fi Client Isolation 影响
- 玩家只需扫码打开网址

推荐部署方式：

- 前端：静态托管平台
- 后端：支持 Node.js 和 WebSocket 的服务器
- 通信：Socket.IO
- 使用 HTTPS 443

### 第二方案：学校局域网

电脑运行本地服务器，玩家通过局域网 IP 访问。

示例：

```text
http://192.168.x.x:3000
```

上课前必须至少用两台不同设备测试。

### 第三方案：每组一台设备

4 个小组分别使用 4 台手机运行 Pass & Play。

不需要实时房间和服务器。

### 第四方案：只有一台电脑

所有玩家依次到电脑前查看词语。

流程：

1. 页面显示当前玩家姓名
2. 其他人远离屏幕
3. 当前玩家查看词语
4. 隐藏页面
5. 换下一位玩家

注意：

- 电脑不能把秘密词语投影出去
- 使用扩展显示优于复制显示
- 如果无法关闭投影，应先断开投影

这种方式速度较慢，只适合作为紧急备用。

### 最终展示备用

只选择 6 名志愿者演示一局，其余同学观看。

---

## 13. PWA 和离线能力

建议将 Pass & Play 做成 PWA。

目标：

- 网页首次打开后缓存资源
- 网络断开后仍可进入 Pass & Play
- 缓存 HTML、CSS、JavaScript 和本地词库
- 可添加到手机主屏幕

需要注意：

- 通常至少成功打开过一次网页后，离线缓存才能生效
- 上课前应提前测试离线模式

---

## 14. Host 创建游戏

Host 主要使用电脑创建和控制游戏。

Host 设置：

- Session name
- Number of groups
- Players per group
- Auto-assign or manual groups
- Word pack
- Difficulty
- Undercover count
- Include Mr White
- Discussion timer
- Voting timer
- Automatic or manual phase progression
- Projector mode
- Sound effects
- Animation intensity

推荐默认值：

- Session name: PY Icebreaker
- Groups: 4
- Players per group: 6
- Auto-assign
- English word pack
- Easy
- 1 Undercover
- Mr White off
- Discussion: 45 seconds
- Voting: 20 seconds
- Projector mode: on
- Sound effects: low
- Animations: standard

Host 创建后，电脑端进入一个类似 Kahoot 的主控制页面。


---

## 15. Host Dashboard 与投影视图

Host 电脑作为整场游戏的“上帝视角”和控制中心，交互风格参考 Kahoot 的课堂主持体验。

### 15.1 Host Dashboard 显示内容

Host Dashboard 需要显示：

- Session name
- Room code
- QR code
- 已加入总人数
- 每组成员
- 每组人数
- Ready 状态
- 各组当前阶段
- 当前发言者
- 各组倒计时
- 已完成投票人数
- 是否出现平票
- 已淘汰玩家
- 各组胜负状态
- 玩家在线和断线状态
- 当前轮次

建议使用四张大组卡片：

```text
Group A     Group B
Group C     Group D
```

每张组卡片显示：

- 6/6 players
- Round 1
- Giving clues / Discussing / Voting
- 4/6 votes submitted
- Remaining time
- 当前存活人数

### 15.2 Host 控制权限

Host 可以：

- Start all groups
- Start one selected group
- Pause all groups
- Resume
- Extend timer
- Skip current phase
- Restart round
- Remove player
- Move player
- Auto-balance groups
- Force reconnect
- Resolve a stuck vote
- End one group
- End all games
- Start another round
- Enable Mr White for the next round

Host 是流程管理者，但系统仍应防止误操作，例如对 End all games 增加确认。

### 15.3 上帝视角与秘密信息

Host 可以查看当前游戏的完整管理状态，但秘密信息应分层处理。

默认投影安全模式：

- 不显示玩家具体词语
- 不显示谁是 Undercover
- 不显示 Mr White
- 只显示阶段、进度、人数和公开结果

Host 私密管理面板可以提供：

> Facilitator reveal

打开后才可查看：

- 每组 Civilian word
- Undercover word
- 玩家角色
- 当前答案

Facilitator reveal 必须：

- 默认关闭
- 与投影视图分离
- 打开前显示警告
- 避免在镜像投影时泄露答案

### 15.4 Projector View

提供专门的全屏投影视图，类似 Kahoot 主屏。

投影视图可以显示：

- 大型 Room code
- QR code
- 玩家加入动画
- 当前 Session 状态
- 四组进度
- 全班统一倒计时
- 投票提交进度
- 淘汰结果
- 每组获胜阵营
- 下一轮提示

投影视图不显示任何未公开的秘密信息。


---

## 16. 玩家页面

玩家页面只显示当前阶段需要的信息，并与 Host Dashboard 实时同步。

### Lobby

显示：

- 玩家姓名
- 所在 Group
- 当前人数
- 等待状态
- Host 是否已准备开始

示例：

> You are in Group B  
> 4 of 6 players joined  
> Waiting for the host to start...

### Secret word

> Your secret word  
> Press and hold to reveal

建议使用卡片翻转或遮罩揭示动画，但必须快速且不影响隐私。

### Clue phase

如果不是自己：

> It is Jamie’s turn. Listen carefully.

如果轮到自己：

> It’s your turn. Give one short clue without saying your word.

页面可以使用轻微聚光、头像放大或脉冲动画强调当前发言者。

### Discussion phase

> Discuss who might be Undercover  
> 00:45

倒计时最后 10 秒可以增加轻微提示动画。

### Voting phase

显示仍在游戏中的其他玩家姓名。

选择玩家后：

- 显示确认状态
- 不立即公开投票结果
- 显示 Waiting for the others...

### Elimination

> Sam received the most votes.  
> Sam was a Civilian.

可以使用短暂的揭晓动画，但不要过度戏剧化。

### Final result

> The Civilians win!  
> The Undercover was Jamie.  
> Civilian word: Train  
> Undercover word: Tram

胜利页面可以使用纸屑、角色卡揭示或组徽章动画。


---

## 17. 题库规划

第一版不需要特别大的题库。

第一阶段建议：

- English Easy：40 对
- English Medium：40 对

总计约 80 对。

中文词库暂缓，后续单独制作。

### 推荐分类

- Everyday objects
- Food and drink
- Animals
- Transport
- Places
- Technology
- Work and study
- Sport
- Entertainment

第一场优先使用：

- Everyday objects
- Food and drink
- Transport
- Technology

### 英文 Easy 示例

- Train / Tram
- Bus / Coach
- Beach / Swimming pool
- Laptop / Tablet
- Coffee / Tea
- Burger / Sandwich
- Hospital / Clinic
- Cat / Tiger
- Tennis / Badminton
- Zoom / Microsoft Teams

### 英文 Medium 示例

- Park / Garden
- Hotel / Motel
- Pub / Bar
- Museum / Art gallery
- Router / Modem
- Headphones / Earbuds
- Pasta / Noodles
- Pancake / Waffle
- Rabbit / Hare
- Turtle / Tortoise

### 题库筛选原则

避免：

- 完全同义词
- 一个词包含另一个词的类别关系
- 强文化背景词
- 宗教、政治、疾病等容易引起不适的话题
- 存在明显英美澳语义差异的词

### 题库数据字段

每个词对可包含：

- id
- locale
- category
- difficulty
- civilianWord
- undercoverWord
- enabled
- classroomSafe
- optionalNote

后续加入中文时，中英文应当是两套独立词库，不要只做机械翻译。

---

## 18. 小游戏合集首页

首页建议展示：

### Who’s Undercover?

状态：

> Available now

标签：

- 4–10 players
- 5–10 minutes
- Online or one device
- English

### Last Card

状态：

> Coming soon

标签：

- 2–8 players
- Turn-based
- Online devices recommended

### Draw & Guess

状态：

> Coming soon

### Charades

状态：

> Coming soon

### Two Truths and a Lie

状态：

> Coming soon

### Quick Categories

状态：

> Coming soon

---

## 19. UNO 类游戏规划

不建议公开产品直接使用 UNO 名称、Logo 或官方卡面设计。

推荐原创名称：

- Last Card
- Colour Clash
- Match & Drop
- One Left
- Final Card

核心规则可以是：

> Match a card by colour, number or symbol. Be the first player to empty your hand.

需要使用原创：

- 卡面
- 卡背
- 图标
- 动画
- 特殊牌名称
- 音效
- 配色体系

Last Card 的技术复杂度高于谁是卧底，需要处理：

- 私密手牌
- 洗牌和发牌
- 抽牌堆
- 弃牌堆
- 出牌合法性
- 当前回合
- Skip
- Reverse
- Draw cards
- Wild colour
- 断线重连
- 玩家退出
- 服务器随机数和状态同步

因此不纳入本周六必须完成范围。

---

## 20. 动画与视听反馈

小游戏合集应比普通工具型网站更活泼，适当加入动画和音效，但不能影响课堂效率或秘密信息安全。

### 20.1 推荐动画

首页：

- 游戏卡片轻微浮起
- Coming soon 卡片柔和锁定动画
- 页面进入时的分层淡入

Lobby：

- 玩家加入时头像或姓名气泡出现
- 每组人数变化时平滑更新
- Group 卡片在满员时显示 Ready 动画

秘密词语：

- Press and hold 时卡片逐渐揭示
- 卡片翻转或遮罩滑开
- 松手后立即重新隐藏

发言阶段：

- 当前玩家头像轻微放大
- 发言顺序移动
- 阶段切换使用短暂过渡

讨论和倒计时：

- 圆形或横向计时动画
- 最后 10 秒轻微脉冲
- 时间结束时短促提示音

投票：

- 选择玩家时卡片下压
- 投票提交后出现勾号
- Host 投影显示匿名投票进度条
- 不在投票结束前展示具体票数

淘汰和结果：

- 淘汰玩家卡片翻转
- 身份揭晓
- 获胜组纸屑动画
- 下一轮按钮出现时平滑上浮

### 20.2 Host 投影动画

参考 Kahoot 的课堂氛围：

- 玩家加入时在大屏出现名字
- 四组状态卡动态更新
- Start game 倒计时：3、2、1
- 投票阶段显示完成进度
- 结果揭晓前短暂悬念
- 各组结束后显示胜利徽章

### 20.3 动画原则

- 动画应短而明确
- 不阻塞游戏操作
- 不延长关键流程
- 不在秘密词语上使用容易残留的动画
- 手机低性能设备也应流畅
- 提供 `Reduce motion` 支持
- 尊重系统的 `prefers-reduced-motion`
- 音效默认较低，可由 Host 关闭
- 不使用令人尴尬或过于吵闹的音效

---

## 21. 平台架构

小游戏合集共用平台层，不应每个游戏重新实现一套房间系统。

### 平台层

负责：

- 英文界面与后续多语言扩展
- 右上角小型语言切换
- 创建房间
- Room code
- QR code
- 玩家姓名
- 分组
- Host Dashboard
- Projector View
- Host 上帝视角与安全揭示
- 断线重连
- 玩家状态
- 倒计时
- 投票组件
- 结果页面
- PWA
- Online Room
- Pass & Play

### 游戏模块

示例结构：

```text
games/
  undercover/
  last-card/
  charades/
  draw-and-guess/
  two-truths/
```

共享组件：

```text
shared/
  lobby/
  groups/
  voting/
  timer/
  player-list/
  private-reveal/
  results/
  host-dashboard/
  projector-view/
  animations/
  translations/
```

---

## 22. 推荐技术栈

### Front end

- React
- TypeScript
- Vite
- Responsive CSS
- PWA support

### Back end

- Node.js
- Express
- Socket.IO

### 数据

第一版不需要数据库。

可以使用：

- 服务器保存权威房间状态
- Host 浏览器保存主持人权限 token
- JSON 保存英文题库
- Local Storage 保存玩家重连 token
- Service Worker 缓存离线资源

服务器重启后房间消失在课堂演示版本中可以接受。

---

## 23. 安全与秘密信息

秘密信息必须由服务器单独发送给对应玩家。

不要：

- 把完整角色列表发送到所有浏览器
- 在前端生成身份
- 将所有玩家词语放入共享状态
- 仅通过 CSS 隐藏秘密词语
- 在 Host 投影界面显示答案

对于 Pass & Play：

- 每次查看后立即清空屏幕
- 使用隐私遮罩
- 下一个玩家必须主动点击 I’m ready
- 页面返回或刷新时避免重新显示上一位玩家的词语

---

## 24. 开发优先级

### P0：课堂展示必须完成

1. 小游戏合集首页
2. 英式英语界面
3. 右上角小型语言入口
4. Who’s Undercover 游戏入口
5. Host 电脑控制端
6. Kahoot 式 Projector View
7. Online Room 或 Local Network Room 至少一种可用
8. Room code 和 QR code
9. 24 人加入
10. 自动分为 4 组
11. Host 查看四组实时状态
12. 玩家私密查看词语
13. 随机角色分配
14. 随机发言顺序
15. 讨论和投票阶段
16. 胜负判断
17. Mr White 默认关闭
18. 响应式设计
19. 英文 Easy 和 Medium 词库
20. 基础动画和倒计时反馈
21. Pass & Play 备用模式
22. Presenter Demo

中文界面和中文词库不属于 P0。

### P1：有时间再完成

1. 公网和局域网双模式
2. 匿名投票完整同步
3. 断线重连
4. Host 暂停、跳过和延长计时
5. Facilitator reveal
6. Group Leader 控制
7. 更完整的淘汰和胜利动画
8. PWA 离线缓存
9. 音效开关
10. Reduce motion

### P2：展示后扩展

1. 简体中文界面
2. 中文词库
3. Mr White
4. 自定义词库
5. 多个 Undercover
6. Draw & Guess
7. Charades
8. Two Truths and a Lie
9. Quick Categories
10. Last Card
11. 多局积分
12. 历史记录


---

## 25. 课堂介绍词

> Today we’re going to play **Who’s Undercover?**, a quick social deduction word game.
>
> In each group, most players will receive the same secret word, while one player will receive a similar but different word. You will not be told whether you are a Civilian or the Undercover player.
>
> One at a time, give a short clue about your word without saying the word itself. After everyone has spoken, your group will discuss the clues and vote for the person you think is Undercover.
>
> The Civilians win by identifying the Undercover player. The Undercover player wins by staying in the game until the end.
>
> Please do not spell, translate or say the first letter of your word. Keep your screen private, listen carefully, and try not to look suspicious!

投影上可以同时显示：

> See your word → Give a clue → Discuss and vote

---

## 26. 周六展示流程

### 展示前

- 部署公网版本
- 准备本地版本
- 测试学校 Wi-Fi
- 用 iPhone、Android、平板和电脑测试
- 测试二维码
- 测试断线重连
- 测试 Pass & Play
- 测试离线模式
- 检查 Windows Firewall
- 提前缓存 PWA
- 准备 English Easy 词库
- Mr White 保持关闭
- 测试 Host Dashboard
- 测试 Projector View
- 确认投影不显示秘密词语
- 测试所有动画不会影响操作

### 课堂上

1. 在电脑上打开 Host Dashboard 和 Projector View
2. 展示小游戏合集首页
3. 简单说明长期规划
4. 打开 Who’s Undercover
5. 用约 40 秒介绍规则
6. 在投影上显示 QR code 和 Room code
7. 24 人加入，投影实时显示加入动画
8. 自动分为 4 组
9. Host 确认各组人数并开始游戏
10. 第一局使用 Easy
11. Host 电脑实时展示四组阶段和投票进度
12. 第一局结束后可再开 Medium
13. 如网络失败，立即切换 Pass & Play
14. 如设备也不方便，选择 6 名志愿者进行演示

---

## 27. 最终课堂版本建议

首页：

```text
Breaktime Arcade

[ Who’s Undercover? ]
Available now
Host a live room or pass one device around

[ Last Card ]
Coming soon

[ Draw & Guess ]
Coming soon

[ Charades ]
Coming soon
```

进入 Who’s Undercover 后：

```text
Choose a mode

Host a Live Room
The presenter controls the game from a computer

Pass & Play
Share one device within your group
Works without a network

Presenter Demo
Demonstrate the game on one screen

How to Play
Learn the rules in under one minute

Top-right navigation:
EN ▾
```

第一局角色：

```text
5 Civilians
1 Undercover
Mr White disabled
```

推荐第一组测试词对：

```text
Train / Tram
```

---

## 28. 核心产品原则

1. Host 电脑是课堂游戏的控制中心
2. Projector View 必须像 Kahoot 一样清楚展示全班状态
3. 投影视图绝不泄露未公开的词语和角色
4. 公网模式中由服务器保存权威状态，Host 负责控制
5. 局域网模式中 Host 电脑可以同时作为本地服务器
6. Pass & Play 必须作为网络故障备用
7. 第一阶段只完整支持英式英语
8. 语言切换只在右上角保留小型入口
9. 简体中文界面和词库后续再做
10. 第一局规则必须简单，Mr White 默认关闭
11. 每组 6 人优于全班 24 人一局
12. 动画应增强课堂气氛，但不能拖慢流程
13. 网页主要处理秘密信息、顺序、计时、投票和状态同步
14. 实际线索和讨论应面对面进行
15. 平台层和游戏模块分离
16. 先完成一个稳定、可展示的游戏，再扩展小游戏合集
