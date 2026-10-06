/** 与主页原图标一致的 16px 单色描边，不使用外部图片。 */
function lcTabIcon(label) {
  const icons = [
    [/账号|余额|account/i, '<circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>'],
    [/通用|general/i, '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.4"/><circle cx="15" cy="17" r="2.4"/>'],
    [/模型|model/i, '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'],
    [/市场|market/i, '<path d="M4 9h16l-2-5H6L4 9ZM5 9v11h14V9M9 20v-7h6v7"/>'],
    [/插件|plugin/i, '<path d="M9 3v5H4v8h5v5h6v-5h5V8h-5V3H9Z"/>'],
    [/预设|preset|agent/i, '<circle cx="12" cy="8" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4M3 12h3m12 0h3"/>'],
    [/机器人|\bim\b|bot/i, '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"/>'],
    [/icloud|照片|photo/i, '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>'],
    [/微信|wechat/i, '<path d="M20 11a7 7 0 0 1-7 7H8l-5 3 1-5a7 7 0 1 1 16-5Z"/><path d="M8 10h.01M15 10h.01"/>'],
    [/追问|问答|question/i, '<path d="M5 5h14v12H9l-4 4V5Z"/><path d="M10 9a2 2 0 1 1 3 2c-1 0-1 1-1 2m0 2h.01"/>'],
    [/网页|搜索|search|web/i, '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>'],
    [/仓库|github|repository/i, '<path d="M4 5h6l2 3h8v12H4V5Z"/>'],
    [/抖音|视频|video/i, '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/>'],
  ]
  const match = icons.find(([pattern]) => pattern.test(label))
  const shape = match ? match[1] : '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + shape + '</svg>'
}
