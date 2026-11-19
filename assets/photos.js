/* ============================================================
   照片清单
   ------------------------------------------------------------
   加照片：把图片放进 images/，在下面数组里加一行。
   cat 可选："daily"（日常）或 "trip"（旅行），默认 daily。
   alt 会显示在照片下方，也是读屏文字。
   ============================================================ */
window.PHOTOS = [
  { src: "/images/01.jpg", alt: "车窗边，比了个耶", cat: "daily", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/02.jpg", alt: "商场外，帽子挡着风", cat: "trip", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/03.jpg", alt: "旅行途中，雕像前的合影", cat: "trip", city: "长沙", width: 1279, height: 1706 },
  { src: "/images/04.jpg", alt: "街边坐着聊了很久", cat: "daily", width: 1279, height: 1706 },
  { src: "/images/05.jpg", alt: "黑白合影，嘴里还叼着糖", cat: "daily", width: 949, height: 1259 },
  { src: "/images/06.jpg", alt: "抬头看天，风很大", cat: "daily", width: 1706, height: 1279 },
  { src: "/images/p-20261115-120319-1.jpg", alt: "马甲第一次出门亮相", cat: "trip", width: 1200, height: 1600 },
  { src: "/images/p-20261115-132614-1.jpg", alt: "乐子照片", cat: "daily", width: 960, height: 1280 },
  { src: "/images/p-20261115-150538-1.jpg", alt: "回归坐地铁", cat: "daily", width: 1600, height: 1200 },
  { src: "/images/p-20261115-232549-1.jpg", alt: "聪明蛋来也", cat: "daily", width: 720, height: 1280 },
  { src: "/images/p-20261115-232549-2.jpg", alt: "", cat: "daily", width: 1200, height: 1600 },
  { src: "/images/p-20261115-232549-3.jpg", alt: "", cat: "daily", width: 1200, height: 1600 },
  { src: "/images/p-20261117-123332-1.jpg", alt: "猪", cat: "daily", width: 1200, height: 1600 },
  { src: "/images/p-20261117-172631-1.jpg", alt: "傻子吃面", cat: "daily", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-1.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-2.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-3.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-4.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-5.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-6.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-181908-7.jpg", alt: "", cat: "trip", city: "福州", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-1.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-2.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-3.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-4.jpg", alt: "", cat: "trip", city: "长沙", width: 1600, height: 1200 },
  { src: "/images/p-20261117-185547-5.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-6.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-7.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-8.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-9.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-10.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-11.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261117-185547-12.jpg", alt: "", cat: "trip", city: "长沙", width: 1200, height: 1600 },
  { src: "/images/p-20261118-101232-1.jpg", alt: "11.18 ootd", cat: "daily", width: 1200, height: 1600 },
  { src: "/images/p-20261119-101058-1.jpg", alt: "芝士鸡肉帕尼尼配热豆浆 美好的一天开始", cat: "daily", width: 1600, height: 1200 },
];

/* 封面大图 */
window.HERO_IMAGE = "/images/05.jpg";

/* 在一起的日期，用来算天数。格式 YYYY-MM-DD */
window.START_DATE = "2026-05-21";
