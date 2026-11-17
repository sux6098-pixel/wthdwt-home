# wthdwt-home

两个人的照片与故事。纯静态站点，零构建，部署在 Cloudflare Pages。

- 线上地址：https://wthdwt-home.pages.dev （正式域名 `wthdwt.cc.cd` 待绑定）
- 技术栈：HTML + CSS + 原生 JavaScript
- 风格：黑场、衬线斜体、大图卡、电影感

## 目录结构

```
.
├── index.html          # 封面 / 四张分类卡 / 相册 / 时间线 / 留言
├── 404.html            # 自定义 404
├── favicon.svg         # 心形图标
├── _headers            # Cloudflare Pages 响应头
├── images/             # 照片放这里
├── admin/              # 手机上传应用（PWA）
│   ├── index.html
│   ├── app.js
│   ├── admin.css
│   ├── manifest.webmanifest
│   └── icon-180/192/512.png
└── assets/
    ├── styles.css      # 全部样式，颜色字体变量在顶部 :root
    ├── main.js         # 相册渲染、分类筛选、灯箱、天数、入场动画
    └── photos.js       # ★ 照片清单，加照片改这里
```

## 手机上传（不需要电脑）

正式站默认写入 `main`。预览分支测试时，在后台地址末尾添加 `?branch=preview-v2`，例如 `/admin/?branch=preview-v2`；确认正式发布后，普通后台地址仍默认写入 `main`。

手机浏览器打开 `https://wthdwt-home.pages.dev/admin/`：

1. 第一次要粘贴一个 GitHub 令牌（生成方法见页面里的说明，90 天过期，只授本仓库 Contents 读写）
2. 选照片 → 每张填一句说明、选日常/旅行 → 点上传
3. 约 1 分钟自动上线

想当 App 用：Safari 打开该地址 → 分享 → **添加到主屏幕**，桌面会出现心形图标，全屏运行。

令牌只存在手机本地（localStorage），不会上传到任何服务器，也不会出现在代码里。换手机或点「退出」要重新粘贴。

> iPhone 如果选照片失败：设置 → 相机 → 格式 → 改成「兼容性最佳」，把 HEIC 转成 JPEG。上传时也会自动把图压到 1600px、约 300KB。


## 加照片（两步）

1. 把图片放进 `images/`，文件名用英文或数字，例如 `01.jpg`
2. 打开 `assets/photos.js`，加一行：

```js
window.PHOTOS = [
  { src: "/images/01.jpg", alt: "第一次一起看海", cat: "trip" },
  { src: "/images/02.jpg", alt: "周末的早餐",   cat: "daily" },
];
```

- `cat`：`daily`（日常）或 `trip`（旅行），用来生成相册顶部的筛选按钮；不加默认 `daily`
- `alt`：显示在照片下方，也是读屏文字，写具体一点
- `window.START_DATE`：在一起的日期（`YYYY-MM-DD`），首页自动算天数

照片建议宽度压到 1600px 以内、单张 300KB 左右。

## 改文字

| 想改什么 | 位置 |
| --- | --- |
| 名字 | `index.html` 的 `.mark`、`.hero-title`、`<title>`、页脚，共 4 处 `wth & dwt` |
| 封面英文句 | `.hero-en` |
| 封面中文行 | `.hero-cn` |
| 四张卡片标题 / 副标题 | `.cards` 里每个 `.card-body` |
| 时间线 | `#timeline` 下每个 `<li>` |
| 留言 | `#notes` 里 `.note` 的 `<p>` 和 `<cite>` |
| 主题色 | `assets/styles.css` 顶部 `--accent`（现在 #e8dfd2 米白） |

改完提交到对应分支，Cloudflare Pages 会自动生成该分支的预览部署；确认无误后再合并到 `main`。

## 本地预览

```bash
python -m http.server 8000
```

打开 <http://localhost:8000>。直接双击 `file://` 会丢样式（`/assets/` 是绝对路径）。

## 注意

仓库是 **public**：照片原图任何人都能从 GitHub 直接下载。要限制访问可套 **Cloudflare Access**（免费 50 用户，邮箱验证码登录，QQ 邮箱和 Gmail 都支持）。
