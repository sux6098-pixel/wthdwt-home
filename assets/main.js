/* ============================================================
   照片站交互
   - 相册渲染 + 分类筛选（数据来自 assets/photos.js）
   - 灯箱：方向键 / Esc / 点背景
   - 在一起天数、滚动入场
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ALL = Array.isArray(window.PHOTOS) ? window.PHOTOS.filter(function (p) { return p && p.src; }) : [];
  var activeCat = "all";

  var CAT_LABEL = { all: "全部", daily: "日常", trip: "旅行" };

  /* ---------------- year ---------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- days ---------------- */
  var daysEl = document.getElementById("days");
  var dateEl = document.getElementById("since-date");
  var start = window.START_DATE ? new Date(window.START_DATE + "T00:00:00") : null;
  if (daysEl && start && !isNaN(start.getTime())) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.floor((today - start) / 86400000);
    daysEl.textContent = diff >= 0 ? String(diff) : "0";
    if (dateEl) {
      dateEl.textContent = window.START_DATE.replace(/-/g, ".");
      dateEl.setAttribute("datetime", window.START_DATE);
    }
  }

  /* ---------------- filters ---------------- */
  var filtersEl = document.getElementById("filters");
  var grid = document.getElementById("gallery-grid");
  var emptyNote = document.getElementById("empty-note");

  function currentPhotos() {
    return activeCat === "all" ? ALL : ALL.filter(function (p) { return (p.cat || "daily") === activeCat; });
  }

  function buildFilters() {
    if (!filtersEl) return;
    var cats = ["all"];
    ALL.forEach(function (p) {
      var c = p.cat || "daily";
      if (cats.indexOf(c) === -1) cats.push(c);
    });
    filtersEl.innerHTML = "";
    if (cats.length <= 1) return; // 没照片时不显示分类
    cats.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = CAT_LABEL[cat] || cat;
      btn.setAttribute("aria-pressed", cat === activeCat ? "true" : "false");
      btn.addEventListener("click", function () {
        activeCat = cat;
        Array.prototype.forEach.call(filtersEl.children, function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        renderGallery();
      });
      filtersEl.appendChild(btn);
    });
  }

  /* ---------------- placeholder tiles ---------------- */
  function placeholderTile(i) {
    var ratios = ["3 / 4", "4 / 5", "3 / 4", "1 / 1", "3 / 4", "4 / 5"];
    var figure = document.createElement("figure");
    figure.className = "gallery-item";
    figure.style.cursor = "default";
    var ph = document.createElement("div");
    ph.className = "ph";
    ph.style.aspectRatio = ratios[i % ratios.length];
    ph.setAttribute("data-label", "照片 " + String(i + 1).padStart(2, "0"));
    figure.appendChild(ph);
    return figure;
  }

  /* ---------------- gallery ---------------- */
  var view = []; // 当前展示的照片（供灯箱使用）

  function renderGallery() {
    if (!grid) return;
    grid.innerHTML = "";
    view = currentPhotos();

    if (!view.length) {
      for (var i = 0; i < 6; i++) grid.appendChild(placeholderTile(i));
      if (emptyNote) emptyNote.hidden = false;
      return;
    }
    if (emptyNote) emptyNote.hidden = true;

    view.forEach(function (photo, index) {
      var figure = document.createElement("figure");
      figure.className = "gallery-item";
      figure.setAttribute("role", "button");
      figure.setAttribute("tabindex", "0");
      figure.setAttribute("aria-label", "放大查看：" + (photo.alt || "照片 " + (index + 1)));

      var img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.alt || "";
      img.loading = index < 6 ? "eager" : "lazy";
      img.decoding = "async";
      if (photo.width && photo.height) { img.width = photo.width; img.height = photo.height; }
      img.addEventListener("load", function () { img.classList.add("is-loaded"); });
      figure.appendChild(img);

      if (photo.alt) {
        var cap = document.createElement("figcaption");
        cap.textContent = photo.alt;
        figure.appendChild(cap);
      }

      figure.addEventListener("click", function () { openLightbox(index); });
      figure.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(index); }
      });

      grid.appendChild(figure);
    });
  }

  /* ---------------- lightbox ---------------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCap = document.getElementById("lb-cap");
  var lbCount = document.getElementById("lb-count");
  var btnClose = document.getElementById("lb-close");
  var btnPrev = document.getElementById("lb-prev");
  var btnNext = document.getElementById("lb-next");
  var current = 0;
  var lastFocused = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function show(index) {
    if (!view.length || !lbImg) return;
    current = (index + view.length) % view.length;
    var photo = view[current];
    lbImg.src = photo.src;
    lbImg.alt = photo.alt || "";
    if (lbCap) {
      var html = "";
      if (photo.alt) html += '<span class="lb-cap">' + escapeHtml(photo.alt) + "</span>";
      if (photo.note) html += '<span class="lb-note">' + escapeHtml(photo.note) + "</span>";
      lbCap.innerHTML = html;
    }
    if (lbCount) lbCount.textContent = (current + 1) + " / " + view.length;
  }

  function openLightbox(index) {
    if (!lb || !view.length) return;
    lastFocused = document.activeElement;
    show(index);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    if (btnClose) btnClose.focus();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (lb) {
    if (btnClose) btnClose.addEventListener("click", closeLightbox);
    if (btnPrev) btnPrev.addEventListener("click", function () { show(current - 1); });
    if (btnNext) btnNext.addEventListener("click", function () { show(current + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* 供旅行图层调用：打开单张照片 */
  window.WTHLightbox = {
    open: function (photo) {
      if (!lb || !photo) return;
      view = [photo];
      lastFocused = document.activeElement;
      show(0);
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      if (btnClose) btnClose.focus();
    }
  };

  /* ---------------- category cards -> filter ---------------- */
  document.querySelectorAll(".card[data-filter]").forEach(function (card) {
    card.addEventListener("click", function () {
      activeCat = card.getAttribute("data-filter");
      buildFilters();
      renderGallery();
    });
  });

  buildFilters();
  renderGallery();

  /* ---------------- reveal ---------------- */
  var revealItems = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    revealItems.forEach(function (el) { io.observe(el); });
  }
})();
