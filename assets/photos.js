/* ============================================================
   照片清单
   ------------------------------------------------------------
   加照片：把图片放进 images/，在下面数组里加一行。

     { src: "/images/07.jpg", alt: "二〇二四年春，海边", cat: "trip" }

   cat 可选："daily"（日常）或 "trip"（旅行），默认 daily。
   alt 会显示在照片下方，也是读屏文字。
   ============================================================ */
window.PHOTOS = [
  { src: "/images/01.jpg", alt: "车窗边，比了个耶", cat: "daily", width: 1279, height: 1706 },
  { src: "/images/02.jpg", alt: "商场外，帽子挡着风", cat: "trip", width: 1279, height: 1706 },
  { src: "/images/03.jpg", alt: "旅行途中，雕像前的合影", cat: "trip", width: 1279, height: 1706 },
  { src: "/images/04.jpg", alt: "街边坐着聊了很久", cat: "daily", width: 1279, height: 1706 },
  { src: "/images/05.jpg", alt: "黑白合影，嘴里还叼着糖", cat: "daily", width: 949, height: 1259 },
  { src: "/images/06.jpg", alt: "抬头看天，风很大", cat: "daily", width: 1706, height: 1279 },
  { src: "/images/p-20261115-120319-1.jpg", alt: "马甲第一次出门亮相", cat: "trip", width: 1200, height: 1600 },
];

/* 封面大图 */
window.HERO_IMAGE = "/images/05.jpg";

/* 在一起的日期，用来算天数。格式 YYYY-MM-DD */
window.START_DATE = "2026-05-21";
