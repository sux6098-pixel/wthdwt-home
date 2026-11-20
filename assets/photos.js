/* ============================================================
   照片清单 / 照片元数据
   ------------------------------------------------------------
   加照片：把图片放进 images/，在下面数组里加一行。
   cat 可选："daily"（日常）或 "trip"（旅行），默认 daily。
   alt 会显示在照片下方，也是读屏文字。
   city 填了之后，地图里点开这座城市会看到这张照片。
   时间线里用到的照片，在 content.json 的 moments[].photos 里引用 src。
   ============================================================ */
window.PHOTOS = [
  { src: "/images/01.jpg", alt: "车窗边，比了个耶", cat: "trip", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/02.jpg", alt: "商场外，帽子挡着风", cat: "trip", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/03.jpg", alt: "旅行途中，雕像前的合影", cat: "trip", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/04.jpg", alt: "街边坐着聊了很久", cat: "trip", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/05.jpg", alt: "黑白合影，嘴里还叼着糖", cat: "daily", width: 949, height: 1259 },
  { src: "/images/06.jpg", alt: "抬头看天，风很大", cat: "daily", width: 1706, height: 1279 },
  { src: "/images/p-20261115-120319-1.jpg", alt: "马甲第一次出门亮相", cat: "daily", city: "长沙", width: 1200, height: 1600 },
];

/* 封面大图 */
window.HERO_IMAGE = "/images/05.jpg";

/* 在一起的日期，用来算天数。格式 YYYY-MM-DD */
window.START_DATE = "2026-05-21";
