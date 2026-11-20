# wthdwt-home

两个人的照片、故事、留言和旅行，收在**一条时间线**里。

- 线上地址：https://wthdwt-home.pages.dev （正式域名 `wthdwt.cc.cd`）
- 技术栈：HTML + CSS + 原生 JavaScript，零构建，部署在 Cloudflare Pages
- 风格：黑场、衬线、电影感；照片是主角，时间线是骨架

## 页面结构

```
封面（一张合影 + 在一起的天数）
  ↓
一句话说明：一条线，串起所有的照片、故事、留言和旅行
  ↓
时间线
  ├─ 2025.11  最开始 · 军训
  ├─ 2026.05.21 · 一场电影，牵了手
  │  2026.08 · 福州（2 张照片）
  │  2026.10 · 长沙（2 张照片）
  │  到目前为止 · 把去过的点连起来（地图）
  │  2026.11.15 · 一些很小的日常（照片）
  │  现在 · 继续往下走（留言）
  └─ 2027.01.01  庐山看雪（计划中，虚线节点）
  ↓
未完待续
```

- 每一条叫一个 **moment**，可以同时有：日期、标题、故事、照片、地点、留言。
- 照片点开是大图，方向键切换，Esc 关闭。
- 地图不是单独一页，而是时间线里的一条；点城市打开那次的相册。
- 顶部「我们」是两个人的生日和年龄。
- 时间线上方有「找一天」搜索栏：输入 `2026.08`、`八月`、`福州` 或标题，回车直接跳到那一天；按 `/` 也能唤起。

## 目录

```
.
├── index.html              # 页面骨架
├── 404.html
├── favicon.svg
├── _headers                # Cloudflare Pages 响应头
├── images/                 # 照片放这里
├── admin/                  # 手机上传 / 编辑文字（PWA）
└── assets/
    ├── styles.css          # 全部样式
    ├── main.js             # 时间线渲染、灯箱、地图、滚动进度、弹层
    ├── map.js              # 中国地图 + 城市相册
    ├── content.json        # ★ 时间线的内容都在这里
    ├── photos.js           # ★ 照片清单与元数据
    └── china.json          # 省界地图数据
```

## 加一条时间线（两种方式）

### 方式 A：手机后台

打开 `https://wthdwt-home.pages.dev/admin/` → 「文字」→「时间线」：

1. 点「+ 添加一条」
2. 填日期、标题、正文，选类型（故事 / 照片 / 旅行 / 留言 / 纪念 / 路线）
3. 有照片就填路径，一行一张，例如 `/images/01.jpg`
4. 保存，约 1 分钟上线

改日期也在这里：找到那一条，改「日期（YYYY-MM-DD，或 YYYY-MM）」。日期样式的「日期上显示的字」会自动跟着改；「最开始」「现在」这种叙述标签会保留。保存后首页的时间线、年份分组和搜索都会跟着变。

### 方式 B：直接改 `assets/content.json`

在 `moments` 数组里加一项：

```json
{
  "date": "2026-12-24",
  "label": "平安夜",
  "sub": "2026",
  "title": "第一次一起过圣诞",
  "text": "街上很吵，我们走了很久。",
  "kind": "photo",
  "place": "福州",
  "photos": ["/images/01.jpg", "/images/02.jpg"],
  "message": { "text": "明年也一起。", "by": "dwt" }
}
```

| 字段 | 说明 |
| --- | --- |
| `date` | `YYYY-MM-DD` 或 `YYYY-MM`，用来排序；可以不精确 |
| `label` | 日期栏上显示的字，例如「最开始」「第一个夏天」；不填就显示日期 |
| `sub` | 日期栏下的小字，例如「2026」「在一起」 |
| `title` | 标题 |
| `text` | 正文，可以换行 |
| `kind` | `story` / `photo` / `trip` / `message` / `milestone` / `map` |
| `place` | 地点，显示在地点小标签里 |
| `photos` | 照片路径数组；留空就是纯文字 |
| `message` | 留言：`{ "text": "...", "by": "wth" }`，会渲染成米色纸条 |
| `map` | `true` 时在这一条里显示地图（整个站点放一条就够） |

未来计划不用写进 `moments`，写在 `plans` 里就会自动接在时间线末尾，节点是虚线的。

## 加照片

### 方式 A：手机后台（推荐）

「照片」→ 选照片 → 在「这批照片接到哪一天」里选一条已有时间线，或者选「＋ 新建一条时间线」并填日期和标题 → 上传。

照片会自动压缩、传进仓库，并接到那一条的 `photos` 里，不用手抄文件名。

### 方式 B：手动

1. 把图片放进 `images/`，文件名用英文或数字，例如 `12.jpg`
2. 打开 `assets/photos.js`，加一行：

```js
{ src: "/images/12.jpg", alt: "海边，风很大", cat: "trip", city: "厦门", width: 1600, height: 1200 }
```

3. 想让这张照片出现在时间线里，再到 `content.json` 对应 moment 的 `photos` 里写上同一个路径。

- `alt`：照片下方的说明，也是读屏文字
- `cat`：`daily` 或 `trip`
- `city`：填了之后，地图里点开这座城市会看到这张照片
- 照片加载失败会自动隐藏，不会出现破图
- 建议宽度压到 1600px 以内、单张 300KB 左右

## 改文字

| 想改什么 | 位置 |
| --- | --- |
| 封面标题 / 名字 | `index.html` 的 `.mark`、`.hero-title`、`<title>` |
| 封面英文句 / 中文行 | `assets/content.json` 的 `hero` |
| 在一起的日子 | `assets/photos.js` 的 `START_DATE` |
| 时间线每一条 | `assets/content.json` 的 `moments` |
| 留言 | moment 里的 `message` |
| 旅行城市 / 地图点位 | `content.json` 的 `trips`（经纬度、状态、故事） |
| 未来计划 | `content.json` 的 `plans` |
| 关于我们 / 生日 | `content.json` 的 `about` |
| 主题色 / 字体 | `assets/styles.css` 顶部 `:root` |

## 本地预览

```bash
python -m http.server 8000
```

打开 <http://localhost:8000>。直接双击 `file://` 会读不到 `content.json`，时间线不会显示。

## 手机上传

手机浏览器打开 `/admin/`，第一次粘贴一个 GitHub 令牌（只授本仓库 Contents 读写，90 天过期）。令牌只存在手机 localStorage。

iPhone 如果选照片失败：设置 → 相机 → 格式 → 改成「兼容性最佳」，把 HEIC 转成 JPEG。

## 注意

- 仓库是 **public**：照片原图任何人都能从 GitHub 直接下载。要限制访问可套 **Cloudflare Access**。
- 地图点是 `trips` 里的经纬度；加新城市时复制一个，改 `city / lon / lat / date / status / story` 即可。
- 如果某张照片只在 `photos.js` 里、没有写进任何 moment，它不会出现在时间线，但仍会出现在对应城市的地图相册里。
