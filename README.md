# wthdwt-home

个人主页，纯静态站点，零构建步骤，部署在 Cloudflare Pages。

- 线上地址：https://wthdwt.cc.cd
- 技术栈：HTML + CSS + 原生 JavaScript（无框架、无依赖）
- 托管：GitHub（代码） + Cloudflare Pages（托管与 HTTPS）

## 目录结构

```
.
├── index.html        # 首页：Hero / 关于 / 项目 / 联系
├── 404.html          # 自定义 404
├── favicon.svg       # 站点图标
├── _headers          # Cloudflare Pages 响应头（安全头 + 缓存策略）
└── assets/
    ├── styles.css    # 全部样式（设计变量集中在文件顶部 :root）
    └── main.js       # 滚动入场、导航高亮、卡片光斑
```

## 本地预览

任选一种，不需要安装依赖：

```bash
# Python 3
python -m http.server 8000

# 或 Node.js
npx serve .
```

然后打开 <http://localhost:8000>。

> 直接用 `file://` 打开会因为 `/assets/...` 是绝对路径而丢样式，请走本地服务器。

## 修改内容清单

| 想改什么 | 位置 |
| --- | --- |
| 名字 | `index.html` 中 `Your Name`（Hero 标题、`<title>`、OG 标签、页脚） |
| 一句话介绍 | `.hero-sub` 段落 |
| 专注方向 / 所在地 | `.hero-stats` 里的 `___` |
| 自我介绍正文 | `#about` 下 `.prose` 的两段 |
| 技能标签 | `#about` 下 `.skill-list` |
| 项目卡片 | `#projects` 下每个 `article.card` |
| 邮箱 | `mailto:you@example.com`（两处）与 `.social-row` |
| 社交链接 | `.social-row` 里各 `<a href>` |
| 主题色 | `assets/styles.css` 顶部 `:root` 的 `--accent-*` |

改完提交，Cloudflare Pages 会自动重新构建，通常一两分钟内生效。

## 部署

Cloudflare Pages → 连接到 Git → 选择本仓库：

- 框架预设：`None`
- 构建命令：留空
- 输出目录：`/`
- 生产分支：`main`

## 许可

内容为个人所有；页面结构与样式可自由参考。
