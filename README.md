# dsh-layout-customizer（界面布局自定义）

隐藏、调序 DSH 左侧栏与设置面板里的各个控件。

**入口在「设置 → 插件」→ `dsh-layout-customizer` 详情页里**，就在插件自己的
配置卡下方（注册在 `plugins.detail.section`）。**不在左侧栏放按钮**——
用户明确要求不要占左栏位置。布局一旦保存，即使从不打开设置页也一直生效
（浏览器半启动时会自动载入并应用）。

⚠️ **面板只在本插件自己的详情页出现**：`plugins.detail.section` 是宿主给
**每个**插件详情页都渲染的 slot，条目必须自己看 `subject` 判断归属，
对别人的页面返回 `null`（v0.1.2 修的就是这个——旧版忽略了 `subject`，
于是面板挂在了每个插件页的最下面）。

## 能改什么

**左侧栏**

| 控件 | 说明 |
| --- | --- |
| 品牌行 | 最上方 Logo / 本地构建版本那一行 |
| 收起/展开侧边栏按钮 | Ctrl+B 那个折叠按钮 |
| 新会话按钮 | Ctrl+N |
| 插件区 | 插件 / Skill·MCP / 任务看板 / 蔬东坡工作台 等全局面板图标 |
| 对话区 | 搜索、视图选项与全部工作区 / 会话列表 |
| 底部插件区 | 模型用量、微信连接等按钮所在的那一行 |
| 账号区 / 设置入口 | 左栏最底部 |

**设置面板**

| 控件 | 说明 |
| --- | --- |
| 设置面板标题栏 | 含关闭按钮的那一行 |
| 设置左侧导航 | 各 tab 的列表容器 |
| 设置内容区 | 右侧当前 tab 的内容 |
| 设置页内的 tab | 通用 / 模型 / 插件…每个 tab 单独开关 |

## 三种操作方式

1. **开关**：面板里每行右侧的开关，控制显示 / 隐藏，改动即时生效并自动保存。
2. **展开大项**：带箭头的大项（如「底部整块」「插件区」）点箭头可展开，
   看到它内部的细项，细项可单独开关。
3. **面板内拖拽**：按住每行左侧的拖动手柄上下拖，改变顺序。
4. **页面上直接拖动**：点面板顶部「页面上拖动」，然后在真实的左侧栏上：
   - 拖动**大项** → 同层级内换位
   -拖动**细项图标** → 可跨容器搬到「插件区」或「底部插件区」

**改动会立即保存**（没有保存按钮），重启后仍然生效；点「恢复默认」清除全部改动。

---



## 排序层级（level）与界面归属（parentId）是两件事

改排序相关代码前必须分清这两个概念：

| 字段 | 作用 | 例子 |
| --- | --- | --- |
| `level` | **DOM 层级**。同一 level 互为真实兄弟节点，拖动只在这一层内换位 | 四个 level：`sidebarHead` / `sidebarRoot` / `sidebarFoot` / `settingsRoot` |
| `parentId` | 纯**界面**归属。决定它在面板里缩进显示在哪个大项下 | `footerActions` 挂在 `sidebar.footArea` 下 |

典型例子——「底部插件区」：

- 界面上：缩进显示在「底部整块」展开后的细项里（`parentId: 'sidebar.footArea'`）
- DOM 里：是 `footArea` 的直接子元素，和「账号区」**同级**（`level: 'sidebarFoot'`）

所以**它必须能拖动**，而且只跟「账号区」互换，不能和顶层的「插件区」混排。
这也是为什么早期版本把细项设成 `draggable: false` 是错的——
它们在 DOM 里本来就有自己的位置。

四个层级与 DOM 父容器的对应关系（engine 里按这个分层应用排序）：

```
sidebarHead  → logoRow                (brand / toggle)
sidebarRoot  → 侧栏根 .root            (newSession / panels / workspaces / footArea)
sidebarFoot  → footArea               (footerActions / settings)
settingsRoot → 设置面板               (header / nav / content)
```

**改 catalog 时必须同步考虑**：新增目标要指定正确的 `level`，
否则它会被排进错误的父容器，表现为「拖了没反应」或「顺序乱跳」。


## 空容器自动收起 + fixed 元素不参与判断

宿主有些容器带**固定高度**和外边距：

```css
.logoRow { height: 60px; margin-bottom: 4px }   /* 里面装着 brand 和 toggle */
```

占流的子元素全隐藏后容器仍占 60px → 留一块空白。修法：给容器打
`data-lc-empty`，样式表把它连同 height / margin / padding / border 一并收掉。

⚠️ **关键：只有占流（position: static/relative）的子元素才决定容器高度。**

`toggle`（收起侧栏按钮）是 **`position: fixed`**，浮在窗口左上角、
**根本不占 logoRow 的高度**。如果把它也算进「是否全隐藏」，
就会出现这种错误行为：

> 只隐藏「收起/展开侧边栏按钮」→ `logoRow` 被判断为空、整个收掉 →
> 下方的「新会话 / 插件区 / 对话区」莫名上移。

这是用户明确报过的 bug。所以判断时把子元素分两类：

| 类别 | 处理 |
| --- | --- |
| 占流元素 | 参与「是否全隐藏」判断，全没了容器才收起 |
| 悬浮元素（fixed） | **忽略**；它们隐藏不该导致容器收起 |

## 底部插件的浮层不能被遮挡

插件自己渲染的浮层（如 dsh-model-usage 的 `.dsh-mu-footer-layer`）定位逻辑是：

```js
position: fixed
left:   按钮右边 + 8
bottom: window.innerHeight - 按钮底 - 4   // ← 按【按钮】位置算
z-index: 100
```

待在「底部插件区」时没事（按钮本来就在下面）。但一旦把按钮**拖到上方插件区**：

| 问题 | 原因 |
| --- | --- |
| 浮层被盖住 | z-index 只有 100，低于右侧内容列 |
| 浮层顶出窗口、被标题栏切掉上半部分 | `bottom` 按按钮算，按钮离顶部近 → `bottom` 变得很大 → 浮层向上冲出视口 |

修法：**不依赖插件算的 bottom**，直接把浮层钉在视口垂直居中，
横向仍保留插件算好的 `left`：

```css
[class*="-footer-layer"] {
  z-index: 2000 !important;
  top: 50% !important;
  bottom: auto !important;
  transform: translateY(-50%) !important;
  max-height: 74vh !important;
  overflow-y: auto !important;
}
```

**关键：用通配后缀匹配，不写死具体插件名，也完全不动插件源码** ——
否则插件自动更新会把改动冲掉。这样其他插件、以及它们将来更新版本，
都能自动受益。

## 统一底部插件区按钮的样式

底部插件区里的按钮由**各自的插件渲染**（模型用量、微信连接…），
它们的图标尺寸 / 内边距 / 字号 / 圆角 / 文字色全不相同，
和上面的插件区放在一起显得参差。

做法：**不改那些插件的代码**，只在侧栏注入覆盖样式，把
`[class*="_footerActions"] button` 对齐插件区 `.panelRow` 的规格。

### 高度相关四件套必须整组一起改

| 属性 | 插件区 .panelRow | 插件默认（model-usage） |
| --- | --- | --- |
| min-height | **36px** | 38px ← 高 2px |
| padding | **7px 8px** | 8px 12px |
| gap | **8px** | 10px |
| line-height | **22px** | 20px |

⚠️ **只改其中几个就会出现「底部行比插件区高/矮几像素」**
（用户报过：底部插件比插件区高）。必须整组对齐。

其余观感属性：border-radius `var(--dsw-radius-md)`、文字色 `label-primary`、
hover `interactive-bg-hover`、图标 `svg` 缩到 16px。

### ⚠️ 同时：只改观感，绝不碰布局结构（踩过两个坑）

| 错误做法 | 后果 |
| --- | --- |
| 给容器加 `flex-direction:column` | 底部横排布局崩掉，第二个按钮被挤出可视区（**微信连接不见了**） |
| 给图标外层 span 定死 `width/height:16px` | 里面的 20px svg 撑破容器，图标反而显得**超级大** |

所以规则是：

- 容器保持原样（**不指定 flex-direction**）
- 图标只缩 `svg` 本身，**不给外层 span 定尺寸**
- 去掉插件自带的 `opacity`（只调 opacity，不碰尺寸）
- **必须用 `!important`**：那些插件把样式写在 inline style 上
- 用容器作用域限定（`_footerActions`），不影响页面其他按钮

测试 15 同时验证「高度四件套齐全」与「没有破坏布局」。

## 幂等写入：防自触发闪烁（重要）

宿主是 React 应用，**界面一有动作就会改 class**（打字、发送、停止、会话高亮、
hover…），触发我们的 `MutationObserver`。如果每次 `applyConfig` 都无条件
写属性 / 移动节点，就会形成：

> 改 DOM → 观察器 → 再改 → …… **自触发循环**

表现为：**侧栏持续闪烁**（用户报过：发送/停止时闪）。

### 三道防线

1. **幂等写入**：统一用 `lcSetAttr` / `lcRemoveAttr`（值没变就不碰 DOM）。
   所有 17 处属性写入都走这两个助手。
2. **移动节点前先判位置**：排序里 `previousElementSibling !== ref` 才插；
   无锚点分支先比对「尾部顺序是否已正确」，对就什么都不做
   （早期这里无条件 detach + append，是主要闪烁源）。
3. **观察器粗筛**：`class` 变化时先看是否含我们关心的语义后缀
   （`lcClassMatters`）——会话高亮、hover 之类的改动直接忽略，
   不做全量重排。

### ❌ 不要用 selfWriting 抑制

早期用「标记位 + 微任务恢复」来屏蔽自己写的 mutation，但
**MutationObserver 回调是宏任务**，微任务先把标记清掉了 → 抑制失效。
现在靠幂等写入，不靠标记。

### 测试：零变动断言

`_engine_test.mjs` 测试 14 用真的 MutationObserver 监听，断言
「同配置连续 apply 两次，第二次 **0 个** mutation」。
改这部分代码后这个测试必须保持绿。

## 容器收起分两级：收占位 vs 整体隐藏

这是最容易搞混的一点——**「不收占位」和「整体 display:none」是两件事**。

用两个属性区分：

| 属性 | 样式 | 判据 | 用途 |
| --- | --- | --- | --- |
| `data-lc-empty` | 只把 `height / margin / padding / border` 收为 0，**元素保留在文档流** | **占流**子元素全被隐藏 | 消除固定高度留下的空白 |
| `data-lc-gone` | 整个容器 `display:none` | **所有**子元素（含 fixed）都不可见 | 彻底移除 |

### 为什么必须分开

`logoRow` 里 `brand` 占流、`toggle` 是 `position:fixed`：

- **只隐藏 brand**：`toggle` 还浮在窗口左上角 → 它**不占 logoRow 高度**，
  所以 logoRow 的 60px 是纯浪费，该收掉 → 打 `data-lc-empty`。
  但**绝不能** `display:none` → 否则把 toggle 一起弄没。
- **两个都隐藏**：没有任何可见子元素 → 可以安全 `display:none` → 再打 `data-lc-gone`。

早先只用一个 `data-lc-empty`（且直接 `display:none`），导致两种错法都出现过：

| 错法 | 症状 |
| --- | --- |
| 全隐藏才收 | 只隐藏品牌行 → **顶部留 60px 空白**，下方不上移 |
| 占流没了就 `display:none` | 只隐藏品牌行 → **收起侧栏按钮也被连坐隐藏** |

## 容器内细项的显隐必须单独处理（会漏）

两个「可搬家容器」里的图标（`sidebar.icon:插件`、`sidebar.icon:模型用量` …）
是**运行时发现的**，不在 `SIDEBAR_TARGETS` 里。

⚠️ `applyConfig` 的主循环只遍历 `SIDEBAR_TARGETS` / `SETTINGS_TARGETS`，
**遍历不到这些图标**。早期就漏了这一步，结果：

> 面板里给图标打开关 → 配置里 `hidden` 写了 `sidebar.icon:插件` →
> **没人执行** → 图标不消失、**原位留一块空白**（用户报过）

修法：`lcApplyContainerChildVisibility(config)` 单独处理，并在 `lcApplyConfig` 里
**紧跟搬家之后**调用（先搬到位，再按最终归属判显隐）。

### 面板区 / 底部插件区自己也可能变空

图标全被隐藏后，容器自身的 `margin-bottom: 8px`、内边距仍占位 → 留空白。
所以这两个容器也登记进空容器列表，用 `childFromContainer` 标记
（它们的子项不在 `LC_SELECTORS` 体系里，要用 `lcDiscoverContainerChildren()` 收集）。

**新增可自定义目标时自查**：它属于
① `SIDEBAR_TARGETS`/`SETTINGS_TARGETS`（主循环管），
还是 ② 运行时发现的容器细项（必须单独处理）？
分错了就会出现「开关能点但没效果」。

## 空容器收起的双向陷阱（两个方向都踩过）

`logoRow` 里 `brand` 占流、`toggle` 是 `position: fixed`。判断「容器是否该收起」
时，两个方向都出过 bug：

| 错误做法 | 症状 |
| --- | --- |
| 把 fixed 元素也算作占位 → 隐藏 toggle 时判定为空 | `logoRow` 被收掉 → **下方内容莫名上移** |
| 只看「占流子元素是否全隐藏」→ 隐藏 brand 后占流者只剩 0 个 | `logoRow` 被收掉 → **fixed 的 toggle 被父元素 `display:none` 连坐隐藏** |

**正确规则（两条必须同时满足才收容器）**：

1. 容器内**所有**我们关心的子元素（含 fixed）都已不可见
   —— 否则会把可见的 fixed 子元素连坐隐藏
2. 且容器内**存在占流子元素**（它们被隐藏后才留下固定高度需要收）

只满足其一都不收。

## 主题 token 只能用真实存在的（面板样式）

DSH 主题实际只提供这些 alias token：

```
--dsw-alias-bg-base / bg-layer-1 / bg-layer-2 / bg-overlay
--dsw-alias-border-l1 / border-l2
--dsw-alias-brand-primary
--dsw-alias-label-primary / label-secondary
--dsw-alias-state-error/idle/success/warn-primary
--dsw-specific-sidebar-fill
--dsw-shadow-lv2
```

⚠️ **没有** `--dsw-alias-label-tertiary`、`--dsw-alias-border-l3`、`border-l4`。
早先面板里误用了这些名字（靠 fallback 兜住，但会丢主题色）。用之前先
`cordis_inspect_query(Theme, listTokens)` 核对。

### 开关（switch）的颜色

关态轨道**不能**用 `bg-layer-2`：卡片本身就是 `bg-layer-1`，浅色主题下
`layer-2` 比它更浅、几乎融进背景，整个开关看起来「发白」只剩圆点。

现用：轨道 `label-secondary` + `opacity: .55`（明暗主题都有对比度），
开态切到 `brand-primary` 且 `opacity: 1`，圆点恒为白色加阴影。

## 隐藏 fixed 图标时让窗口菜单左移

Windows 标题栏布局下，`toggle` 与（收起态的）`newSession` 都是
`position: fixed`，浮在窗口左上角、会盖住菜单区。宿主为此用
`--dsh-windows-menu-start` 把菜单（应用 / 编辑）往右推：

```css
html[data-windows-titlebar]:has([data-sidebar-collapsed=true]) {
  --dsh-windows-menu-start: 84px;   /* 收起态：toggle 占 12~40，newSession 占 48~76 */
}
```

**隐藏「收起/展开侧边栏按钮」时，菜单应该左移补位**（那个 fixed 图标不再挡着了）。

`lcSyncMenuOffset()` 数左上角还剩几个 fixed 占位图标，据此设变量的值：

| 状态 | 菜单起点 |
| --- | --- |
| 收起态，两个图标都在 | 不设（用宿主默认 84） |
| 收起态，只有 toggle 没了 | 48 |
| 收起态，只有 newSession 没了 | 12 |
| 收起态，两个都没了 | 12 |
| 展开态，toggle 没了 | **12**（与窗口左边距对齐；停 48 会余一段空隙） |
| 展开态，toggle 在 | 不设（宿主默认就对） |

都可见时**不设变量**，把控制权还给宿主——避免影响它原本正常的布局。

## 跨容器搬家（插件区 ↔ 底部插件区）

上方「插件区」的图标（插件 / Skill·MCP / 任务看板…）和下方
「底部插件区」的按钮（模型用量 / 微信连接…）**可以互相拖到对方区域**。

- 实现：`config.moved = { '<细项 id>': '<目标容器 key>' }`，
  engine 的 `lcApplyMoves` 把 DOM 节点真的挪过去（幂等）
- 容器定义在 `LC_MOVABLE_CONTAINERS`（panelList / footerActions）

⚠️ **细项的 id 只由标签决定（统一前缀 `sidebar.icon:`），绝不含容器信息。**
早期版本用「容器前缀 + 标签」当 id，结果图标搬到另一个容器后 id 跟着变，
配置里记的旧 id 就对不上，搬家随即失效——踩过这个坑。
**元素身份不该因为它在哪个容器而改变。**

宿主是 React 应用，重渲染时可能把图标放回原位；MutationObserver 会
重新按配置搬一次（幂等），所以最终状态稳定。

## 已修的 4 个 bug（别再踩）

| 现象 | 根因 | 修法 |
| --- | --- | --- |
| 账号区拖动位置不对，还搞乱底部插件区 | 排序时给父容器强行加了 `display:flex` + `flex-direction:column`，破坏了宿主原有布局 | **排序改成移动 DOM 节点顺序**，只动同层兄弟，绝不给父容器加任何样式 |
| 收起品牌行时把折叠按钮也收起了 | `toggle` 是 `position:fixed`，视觉上在品牌行里，实际不在同一布局流；隐藏 `logoRow` 时把它一起干掉了 | 分别识别 `brand` 与 `toggle`，各自独立开关 |
| 隐藏新会话后收起左栏，窗口顶部的新建按钮没了 | 折叠态下宿主用 CSS 把同一个 `.newSession` 节点改成 `position:fixed` 挪到标题栏（DOM 不变）。我打 `display:none` 把它一起藏了 | 折叠态下**跳过** `newSession` / `toggle` / `brand` |
| 设置面板的设置完全没生效 | 设置面板由主应用内联渲染、类名不稳定，之前用「相邻关系」猜选择器，猜错了 | 改按**结构特征**发现：以「关闭」按钮为锚点往上找标题栏，再依次定位导航与内容区；找不到就返回空，宁可不生效也不误伤 |

另外修了一个排序自身的 bug：当一整组元素**全部**都有排序值时没有锚点，
原实现每个都插到最前，导致顺序正好反过来——改成按 order 依次追加到末尾。

### 测试策略的教训

最初自造了一个极简 DOM 桩来测引擎，结果反复出现「手工逐步算对、
函数却返回错」的诡异现象，排查了很多轮，最后发现是**桩本身**让
`querySelectorAll` 返回了错误结果——与被测代码无关的假警报。

现在改用 **jsdom**（真实 DOM 实现）做行为测试，结论才可信。
教训：**测 DOM 行为就用真实 DOM 实现，别自造轮子。**

## 两处注册位置的取舍（改代码前先看）

| 位置 | 形态 | 本项目 |
| --- | --- | --- |
| `sidebar.footer.action` | 左栏底部按钮 + 浮层 | ❌ 不用（用户要求不占左栏） |
| `plugins.detail.section` | 插件详情页配置卡**下方**的分类区块 | ✅ 用这个 |

`plugins.detail.section` 的契约是「Sections under a detail page's own content:
after the rows on a bundle's page, **after the configuration** on a row's or an
official plugin's page」——正好是配置卡下方，所以配置卡（总开关）在上、
布局面板在下，两者并存不冲突。

### 🔴 slot 的 `subject`：必须自己判断归属（v0.1.2 踩过的坑）

这个 slot 是**全插件共用**的：宿主对**每一个**插件详情页都渲染它的全部条目，
文档写得很直白——「An entry draws its own section chrome and **renders null for
a subject it has nothing for**」。忽略 `subject` 的后果就是面板出现在每个插件页
最下面（用户 2026-10-06 报的问题）。

宿主渲染条目时传入的 owner props 只有一个 `subject`，三种形态：

| kind | 形状 | 出现在 |
| --- | --- | --- |
| `bundle` | `{ kind:'bundle', pkg }` | 组合包页（组件列表之后） |
| `row` | `{ kind:'row', pkg, row }` | 行页（配置之后） |
| `item` | `{ kind:'item', id }` | 官方插件页（配置之后） |

`pkg` 携带 `name / version / installed / enabled / rows`。2026-10-06 从运行中的
GUI 实际读到的样本（官方组合包页）：

```json
{"kind":"bundle","pkg":{"name":"@deepseek-ai/dsh-experimental-agent-team-profile",
 "version":"0.2.0-rc.2","installed":false,"enabled":true,
 "rows":[{"rowId":"agent-team","moduleName":"@deepseek-ai/dsh-experimental-agent-team","enabled":true}]}}
```

实现要点（见 `lib/client/panel.src.js` 的 `lcSubjectIsSelf`）：

1. **不写死字段路径**：把 `subject` / `subject.pkg` / `subject.row` 上的
   `name / id / pkg / package / packageName / rowId / moduleName` 都收集起来，
   只要有一个等于 `dsh-layout-customizer`（或短名 `layout-customizer`）就认作自己的页面。
   这样宿主改字段名不会漏判，别人的包名不同也不会误判。
2. **入口拆两层**：外层组件不调用任何 React hooks，只决定「返回 `null`」还是
   「挂载内层」。否则同一实例在页面之间切换时 hooks 数量变化，React 会报
   「Rendered more hooks than during the previous render」。
3. 回归测试：`node _subject_test.mjs`（16 个断言，含上面那个真实样本）。

组件本体只用 React hooks，不依赖详情页给的具体 props，所以将来位置变了也容易搬。

## 怎么让插件出现在「设置 → 插件」列表里（带配置卡）

**host 半必须导出 `Config`**（一个 Schemastery schema）。没有它，
插件在 DSH 的 Config 检查里是 `status: "absent"`，**插件列表里就看不到**；
有它才会变成 `status: "schema"` 并显示配置卡。

最小写法（照 `dsh-notion-mcp` 抄的）：

```js
import z from '@deepseek-ai/schemastery'

const name = 'layout-customizer'      // 列表里的标识
const inject = ['webServer']          // 需要的 Host 服务

const Config = z.object({
  enabled: z.boolean().default(true).description('总开关'),
  storePath: z.string().default('').description('布局文件路径，留空用默认'),
})

function apply(ctx, config) {
  const cfg = config || {}            // ← Config 的解析结果会作为第二参数传进来
  if (cfg.enabled === false) return   // 被禁用时只保留配置卡
  // ...注册路由等
}

export { Config, apply, inject, name }
```

要点：

- `apply(ctx, config)` 的**第二个参数**就是按 Config schema 解析后的配置对象。
- 校验：用 `cordis_inspect_query` 查 `platform=host, provider=Config, method=listConfigs`，
  确认自己的 entry 是 `status: "schema"` 而不是 `absent`。
- 布局明细（哪些控件被隐藏、顺序）**不放进 Config**——否则每个控件都要在插件
  配置页占一行可编辑字段，反而难用。Config 只放几个总开关，
  明细继续由浏览器半的浮层维护在 `layout-customizer.json`。

## ⚠️ 改代码前必读：客户端半必须是单文件

**这是本插件 v0.1.0 崩溃的真正原因，务必理解后再动手。**

DSH 浏览器端加载客户端插件用的是：

```js
window.__ModuleLoader__.load({
  id: "包名",
  factory: (require) => { /* 只能是单文件，require 只有 react 等外置依赖 */ }
})
```

这个 `factory` **不解析相对 import**，也不走 ESM 模块系统。所以：

- ❌ 不能用 `lib/client/index.js` + `import './engine.js'` 这种多文件裸 ESM 写法
- ❌ 不能用 `export function apply` / `export const inject`
- ✅ 必须是**单文件**，通过 `exports.apply = apply; exports.inject = inject` 导出

**v0.1.0 就是这么挂的**：client 用了裸 ESM + 5 个文件互相 import，
DSH 启动时加载客户端失败，整个客户端起不来——症状是「必须关掉所有插件
和配置才能打开应用」。

### ⚠️ 第二个坑：React 变量名大小写必须一致

`factory` 里的 `require("react")` 赋给什么名字，**代码里就必须用那个名字**。
DSH 自己的插件产物用的是小写 `react`，我最初照抄了这个习惯，
但自己代码里全程写的是大写 `React.createElement`：

```js
const react = require("react")   // ← 声明小写
...
React.createElement(...)          // ← 用大写 → ReferenceError: React is not defined
```

后果：组件一渲染就抛错，React 把它当组件错误处理，**按钮静默不显示**，
但应用本身能正常打开（不像 v0.1.0 那样整个崩掉，所以更难发现）。

本项目 `build-client.mjs` 里声明的是 **`React`**（大写），并有一道硬检查：
若声明名与代码里的使用名不一致，构建直接失败。

### 验证必须用真实渲染

`_e2e.mjs` 会模拟 `__ModuleLoader__` 加载产物，并**用 `react-dom/server`
真正渲染组件**：先传**别人的** `subject`（断言渲染成空字符串——面板不该出现），
再传**自己的** `subject`（断言出现 `lc_wrap` 和面板标题文字）。

两个必须遵守的细节：

1. **不要在全局注入 `React`**。最初版本注入了全局 `React`，
   结果把「声明小写、使用大写」的 bug 完全掩盖了，测试全绿但真机不出按钮。
2. **不要直接调用组件函数**代替渲染。组件里有 `React.useState`，
   在 React 环境外调用会报 `Invalid hook call`，那是测试方式的问题，不是插件的问题。
   必须走 `ReactDOMServer.renderToStaticMarkup`。

### 本项目的正确结构

```
lib/client/*.src.js     ← 源码片段，禁止出现 import/export（构建脚本会检查）
build-client.mjs        ← 把片段按顺序拼成单文件（项目根按脚本位置推导）
lib/client.js           ← 构建产物（__ModuleLoader__ 格式），真正被加载的就是它
_e2e.mjs                ← 端到端验证（模拟加载 + 真实 SSR 渲染，含归属判断正反例）
_subject_test.mjs       ← slot 归属判断回归测试（16 断言，纯 Node）
_engine_test.mjs        ← 引擎行为测试（jsdom 真实 DOM）
```

三个测试都能独立跑：`node _subject_test.mjs`、`node _e2e.mjs`、`node _engine_test.mjs`
（退出码 0 = 全绿）。改 `panel.src.js` / `entry.src.js` 后**先 `node build-client.mjs`**
再跑测试——测的都是产物 `lib/client.js`，不是片段。

片段之间共享同一个函数作用域，所以互相直接调用即可，无需 import。
所有符号都加了 `lc` 前缀或用 `LC_` 前缀的常量，避免和宿主作用域撞名。

**改完代码跑这个（会先构建、再硬校验、最后同步）：**

```powershell
node $env:USERPROFILE\.dsh\patches\sync-layout-customizer.mjs
```

校验会拦截：非 `__ModuleLoader__` 格式、残留 import/export、残留相对 import、
缺少 apply/inject 导出、语法错误。**任何一条不过都会拒绝同步**。

## 实现要点

- **配置存储**：`~/.dsh/storages/layout-customizer.json`，由 host 半
  （`lib/index.js`）经 `/api/layout-customizer`（GET / POST / DELETE）读写。
- **控件识别**（`catalog.src.js`）：DSH 的 class 是 CSS module 哈希名
  （如 `_2H3hWW_newSession`），哈希随版本变化，所以选择器只用**类名语义后缀**
  匹配，例如 `[class*="_newSession"]`。设置面板 UI 由主应用内联渲染、类名不稳定，
  改用「相邻关系 + 文本」兜底定位（`engine.src.js` 的 `lcResolveByAnchor`）。
- **应用方式**（`engine.src.js`）：
  - 隐藏 = 打 `data-lc-hidden="1"` + 注入 `!important` 样式表，不直接改 inline style；
  - 排序 = flex `order`（父容器强制 `display:flex; flex-direction:column`），
    不动 DOM 节点顺序，React 重渲染不会冲掉；
  - 宿主随时重渲染，所以有 `MutationObserver` 幂等地重新贴规则
    （会忽略本插件自己写的属性，避免自触发循环）；
  - 观察器**等 `document.body` 就绪**才 attach（插件可能在 body 出现前被 apply）。
- **状态共享**（`state.src.js`）：观察器与浮层读写同一份配置，
  否则观察器会拿旧配置把浮层里的改动覆盖回去。

## 兼容性

DSH 升级后若某个控件找不到了，先查该控件的类名后缀是否变了，
改 `catalog.src.js` 里的 `selector` 即可（然后跑同步脚本）。

## 排障

**如果重启后 DSH 起不来、或所有插件都消失了**：

先检查 profile 配置是否被重置（bundles 只剩 base + web-app、patch 缩到 1 KB 左右）：

```powershell
node $env:USERPROFILE\.dsh\patches\restore-desktop-profile.mjs          # 检查
node $env:USERPROFILE\.dsh\patches\restore-desktop-profile.mjs --apply  # 恢复
```

注意：恢复脚本会用快照里的 `llm-pi-ai` 配置覆盖当前的 provider 设置。
如果之后重配过 API，恢复后要核对 `cordis.patch.yml` 的 `llm-pi-ai` 段
和 `.credentials.yaml` 里的 key 名是否一致。
