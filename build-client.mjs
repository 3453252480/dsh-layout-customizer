/**
 * 把 dsh-layout-customizer 的浏览器半打包成 DSH 客户端加载器要求的单文件格式。
 *
 * 为什么必须打包：DSH 浏览器端用 `window.__ModuleLoader__.load({id, factory})`
 * 加载客户端插件，factory 里只提供 `require`（用于 react 等外置依赖），
 * **不解析相对 import**。多文件 + 裸 ESM 的写法会让插件加载失败，
 * 严重时整个客户端起不来（只能关掉所有插件才能进入应用）。
 *
 * 本脚本把 lib/client/*.src.js 按顺序拼进一个 factory 函数体。
 * 那些 .src.js 是不含 import/export 的「片段」，共享同一作用域，
 * 因此拼接后互相可见，无需模块系统。
 *
 * 用法: node build-client.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* 项目根按脚本自身位置推导，换机器 / 换目录都不会写错地方
   （旧版把根目录写死成 .dsh\plugins-src，迁移后一度把产物写到废弃目录）。 */
const ROOT = dirname(fileURLToPath(import.meta.url))
const SRC = join(ROOT, 'lib', 'client')
const OUT = join(ROOT, 'lib', 'client.js')

/** 按依赖顺序拼接的片段文件。 */
const PARTS = ['catalog.src.js', 'state.src.js', 'engine.src.js', 'panel.src.js', 'entry.src.js']

const chunks = []
for (const name of PARTS) {
  const code = readFileSync(join(SRC, name), 'utf8')
  /* 片段里不允许出现 import/export —— 那是上一版失败的根因。 */
  if (/^\s*(import|export)\s/m.test(code)) {
    throw new Error(`${name} 里还有 import/export，无法保证拼接后可用`)
  }
  chunks.push(`\t\t//#region ${name}\n${code.trimEnd()}\n\t\t//#endregion`)
}

const bundle = `window.__ModuleLoader__.load({
	id: "dsh-layout-customizer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/* 注意：变量名必须和片段里用的写法一致。
		   片段里全部写的是大写 React.createElement，
		   所以这里必须声明 React（小写 react 会导致 ReferenceError）。 */
		const React = require("react");

${chunks.join('\n\n')}

		exports.apply = apply;
		exports.inject = inject;
		/* 测试钩子：把引擎内部函数挂到 __lcInternals 上，
		   仅供离线测试用；运行时不依赖它，也不影响任何行为。 */
		exports.__lcInternals = {
			applyConfig: lcApplyConfig,
			resolveElements: lcResolveElements,
			shouldSkipHide: lcShouldSkipHide,
			discoverSettingsElements: lcDiscoverSettingsElements,
			discoverSettingsTabs: lcDiscoverSettingsTabs,
			isCollapsed: lcSidebarCollapsed,
			levelOf: lcLevelOf,
			discoverContainerChildren: lcDiscoverContainerChildren,
			discoverAccountMenuItems: lcDiscoverAccountMenuItems,
			applyAccountMenuVisibility: lcApplyAccountMenuVisibility,
			applyAccountMenuOrder: lcApplyAccountMenuOrder,
			applySettingsTabOrder: lcApplySettingsTabOrder,
			accountMenuDirect: lcAccountMenuDirect,
			accountDirectKey: LC_ACCOUNT_DIRECT_KEY,
			closeButtons: lcCloseButtons,
			settingsShellOf: lcSettingsShellOf,
			navInShell: lcNavInShell,
			looksLikeNavItem: lcLooksLikeNavItem,
			reportDiag: lcReportDiag,
			describeSettingsPanel: lcDescribeSettingsPanel,
			settingsPanelOpen: lcSettingsPanelOpen,
			settingsPanelRoot: lcSettingsPanelRoot,
			settingsNavList: lcSettingsNavList,
			settingsTabsFromNavList: lcSettingsTabsFromNavList,
			settingsSlotSnapshot: lcSettingsSlotSnapshot,
			openSettingsViaTrigger: lcOpenSettingsViaTrigger,
			accountMenuFallback: ACCOUNT_MENU_FALLBACK,
			settingsTargets: SETTINGS_TARGETS,
			fixFloatingMenuPlacement: lcFixFloatingMenuPlacement,
			floatingMenus: lcFloatingMenus,
			discoverTabProxies: lcDiscoverTabProxies,
			ensureTabProxies: lcEnsureTabProxies,
			isChildTargetId: lcIsChildTargetId,
			isMovableChildId: lcIsMovableChildId,
			elementLabel: lcElementLabel,
			childrenOfItem: lcChildrenOfItem,
			sortValue: lcSortValue,
			getConfig: lcGetConfig,
			setConfig: lcSetConfig,
			blankConfig: lcBlankConfig,
			applyMoves: lcApplyMoves,
			subjectIsSelf: lcSubjectIsSelf,
			subjectNames: LC_SELF_NAMES,
			panel: LayoutCustomizerPanel,
			movableContainers: LC_MOVABLE_CONTAINERS,
			selectors: LC_SELECTORS,
			targets: ALL_TARGETS,
		};
		return module.exports;
	}
});
`

/* 防回归：确认代码里用到的 React 名字，和 factory 里声明的名字一致。
   上一版就是这里大小写不一致（声明 react、使用 React），
   导致组件渲染时 ReferenceError、按钮不显示。 */
const declared = (bundle.match(/const\s+(React|react)\s*=\s*require\("react"\)/) || [])[1]
if (!declared) {
  throw new Error('factory 里没有声明 React/react')
}
const upperUses = (bundle.match(/\bReact\./g) || []).length
const lowerUses = (bundle.match(/\breact\./g) || []).length

if (declared === 'React' && lowerUses > 0) {
  throw new Error(`factory 声明的是 React，但代码里有 ${lowerUses} 处小写 react. 引用（会 ReferenceError）`)
}
if (declared === 'react' && upperUses > 0) {
  throw new Error(`factory 声明的是 react，但代码里有 ${upperUses} 处 React. 引用（会 ReferenceError）`)
}
if (upperUses === 0 && lowerUses === 0) {
  throw new Error('代码里没有使用 React，请确认片段是否正确')
}
console.log(`React 引用检查通过：声明「${declared}」，大写引用 ${upperUses} 处，小写引用 ${lowerUses} 处`)

writeFileSync(OUT, bundle, 'utf8')
console.log(`已生成 ${OUT} (${Buffer.byteLength(bundle)} 字节, ${PARTS.length} 个片段)`)
