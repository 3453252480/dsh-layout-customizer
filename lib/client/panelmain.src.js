/**
 * 主页插件区入口：「布局自定义」图标 + 主内容区页面。
 *
 * 形态与插件区其他图标完全一致（左侧栏 `sidebar.panellist` 提供按钮，
 * 点击后由宿主按同一个 id 选中 `main` 里的面板）：
 *   左侧栏插件区 → 点「布局自定义」图标 → 主内容区显示布局管理面板。
 *
 * ⚠️ 两条不能改的约定：
 *
 * 1. **id / key 必须带 `layout-customizer:` 前缀。**
 *    `lcInstallMainSettings` 用「main 的 key 是否以 `layout-customizer:` 开头」
 *    来区分「本插件自己镜像出来的 main 条目」与「宿主原生插件面板」。
 *    我们的条目必须落进前者，否则会被当成「可搬到设置导航的原生面板」——
 *    而它并没有对应的镜像 key，搬过去就是一个点了没反应的坏入口。
 * 2. **`sidebar.panellist` 的 id 与 `main` 的 key 必须完全相同**，
 *    宿主靠这个配对把图标与页面连起来。
 *
 * 片段文件——不含 import/export。
 */

const LC_MAIN_PANEL_ID = 'layout-customizer:panel'
const LC_MAIN_PANEL_LABEL = '布局自定义'
/* 现役插件区图标：插件 0 / Skill·MCP 1 / 任务看板 10 / 蔬东坡 30 —— 排在最后。 */
const LC_MAIN_PANEL_ORDER = 50

/** layout 服务（「返回对话」要用）。拿不到时按钮退化为提示，不影响面板。 */
let lcLayoutService = null

/**
 * 插件区图标：单色描边，尺寸随宿主传入（展开态与收起态不同），
 * 不用外部图片，也就不用管主题与 DPI。
 */
function LayoutCustomizerMainIcon(props) {
  const size = props && typeof props.size === 'number' ? props.size : 18
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    /* 三条调节滑杆 + 两个滑块：一眼看出是「调布局」的入口。 */
    React.createElement('path', {
      key: 'lanes',
      d: 'M4 7h5M13 7h7M4 17h7M15 17h5M4 12h16',
    }),
    React.createElement('circle', { key: 'knob1', cx: 11, cy: 7, r: 2 }),
    React.createElement('circle', { key: 'knob2', cx: 13, cy: 17, r: 2 }),
  )
}

/** 返回对话：宿主没有「关掉主面板」的对外 API，唯一途径是选中 null。 */
function lcCloseMainPanel() {
  if (!lcLayoutService || typeof lcLayoutService.selectPanel !== 'function') {
    lcToast('布局服务不可用，点左侧栏的会话即可返回')
    return
  }
  try {
    lcLayoutService.selectPanel(null)
  } catch (error) {
    lcToast('返回对话失败：' + (error && error.message ? error.message : error))
  }
}

/**
 * 「布局自定义」主内容区页面。
 * 面板本体直接复用 `LayoutCustomizerPanelInner`（设置详情页里那个），
 * 所以两处入口的功能与保存行为完全一致。
 */
function LayoutCustomizerMainPage() {
  /* 直接进主页（从未打开设置页）时也要有面板样式。 */
  React.useEffect(() => lcEnsurePanelStyle(), [])
  return React.createElement(
    'div',
    { className: 'lc_mainPage', 'data-lc-main-page': LC_MAIN_PANEL_ID },
    React.createElement(
      'div',
      { className: 'lc_mainHead' },
      React.createElement(
        'div',
        { className: 'lc_mainTitleWrap' },
        React.createElement('div', { className: 'lc_mainTitle' }, '界面布局自定义'),
        React.createElement(
          'div',
          { className: 'lc_mainSub' },
          '隐藏或调整左侧栏、设置面板、头像菜单里的控件；改动立即保存，重启后仍然生效。',
        ),
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'lc_btn',
          title: '返回对话（也可以直接点左侧栏里的会话）',
          onClick: lcCloseMainPanel,
        },
        '返回对话',
      ),
    ),
    React.createElement(
      'div',
      { className: 'lc_mainBody' },
      React.createElement(LayoutCustomizerPanelInner, { key: 'lc-main-body' }),
    ),
  )
}

/**
 * 注册插件区图标与它的主面板。
 * 必须拿到 layout 服务才装：否则「返回对话」点了没反应，等于半个坏入口。
 */
function lcInstallMainPanel(ctx, layout) {
  lcLayoutService = layout
  const slots = ctx.slots
  const disposers = []

  disposers.push(
    slots.inject('sidebar.panellist', () =>
      slots.register(
        {
          name: 'sidebar.panellist',
          id: LC_MAIN_PANEL_ID,
          order: LC_MAIN_PANEL_ORDER,
          label: LC_MAIN_PANEL_LABEL,
        },
        LayoutCustomizerMainIcon,
      ),
    ),
  )

  disposers.push(
    slots.inject('main', () =>
      slots.register({ name: 'main', key: LC_MAIN_PANEL_ID }, LayoutCustomizerMainPage),
    ),
  )

  return () => {
    if (lcLayoutService === layout) lcLayoutService = null
    for (const dispose of disposers.reverse()) if (typeof dispose === 'function') dispose()
  }
}
