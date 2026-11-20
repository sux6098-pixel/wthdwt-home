/* ============================================================
   wth & dwt — 一条时间线
   - 从 content.json 读取 moments / plans / trips / about
   - 渲染一条连续时间线：故事、照片、旅行、留言、计划
   - 灯箱、地图、关于弹层、滚动进度
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PHOTOS = Array.isArray(window.PHOTOS) ? window.PHOTOS.filter(function (p) { return p && p.src; }) : [];
  var PHOTO_MAP = {};
  PHOTOS.forEach(function (p) { PHOTO_MAP[p.src] = p; });

  var START_STR = window.START_DATE || "2026-05-21";
  var START = new Date(START_STR + "T00:00:00");

  var KIND_LABEL = {
    story: "故事",
    photo: "照片",
    trip: "旅行",
    message: "留言",
    milestone: "纪念",
    map: "路线",
    plan: "计划"
  };

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function fmtDate(d) {
    if (!d) return "";
    var s = String(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g, ".");
    if (/^\d{4}-\d{2}$/.test(s)) return s.replace(/-/g, ".");
    return s;
  }

  function dateValue(d) {
    if (!d) return 0;
    var s = String(d);
    if (/^\d{4}$/.test(s)) s += "-01-01";
    else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
    var t = new Date(s + "T00:00:00").getTime();
    return isNaN(t) ? 0 : t;
  }

  function displayDateLabel(m) {
    var label = m.label == null ? "" : String(m.label);
    var d = m.date ? String(m.date).split("-") : [];
    if (!label) return fmtDate(m.date);
    /* 日期样式的标签跟着 date 走；「最开始」「现在」这种叙述标签保留 */
    if (!/^\d{4}([.\-/]\d{1,2}){1,2}$/.test(label)) return label;
    if (d.length >= 2) {
      var parts = label.split(/[.\-/]/);
      if (parts.length === 2) return d[0] + "." + d[1];
      if (d.length >= 3) return fmtDate(m.date);
    }
    return label;
  }

  function dayCount() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.floor((today - START) / 86400000);
    if (isNaN(diff)) return 0;
    return Math.max(1, diff + 1);
  }

  function ageOf(born) {
    var b = new Date(born + "T00:00:00");
    if (isNaN(b.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }

  function nextBirthday(born) {
    var p = String(born || "").split("-");
    if (p.length !== 3) return null;
    var y = +p[0], m = +p[1], d = +p[2];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var next = new Date(today.getFullYear(), m - 1, d);
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
    return {
      days: Math.round((next - today) / 86400000),
      date: next,
      turning: next.getFullYear() - y,
      month: m,
      day: d
    };
  }

  /* ---------------- counters ---------------- */
  var days = dayCount();
  ["days", "top-days", "outro-days", "about-days"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(days);
  });
  document.querySelectorAll('[data-stat="days"]').forEach(function (el) {
    el.textContent = String(days);
  });

  var sinceEls = [document.getElementById("since-date"), document.getElementById("about-since")];
  sinceEls.forEach(function (el) {
    if (el) {
      el.textContent = START_STR.replace(/-/g, ".");
      el.setAttribute("datetime", START_STR);
    }
  });

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- photos ---------------- */
  function resolvePhoto(ref, place) {
    if (!ref) return null;
    var src = typeof ref === "string" ? ref : ref.src;
    if (!src) return null;
    var meta = PHOTO_MAP[src] || {};
    return {
      src: src,
      alt: ref.alt != null ? ref.alt : (meta.alt || ""),
      note: ref.note != null ? ref.note : (meta.note || ""),
      width: ref.width || meta.width || 0,
      height: ref.height || meta.height || 0,
      city: ref.city || meta.city || "",
      place: place || ref.place || meta.city || ""
    };
  }

  function uniquePhotos(refs, place) {
    var seen = {};
    var out = [];
    (refs || []).forEach(function (ref) {
      var p = resolvePhoto(ref, place);
      if (!p || seen[p.src]) return;
      seen[p.src] = true;
      out.push(p);
    });
    return out;
  }

  /* ---------------- lightbox ---------------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCap = document.getElementById("lb-cap");
  var lbCount = document.getElementById("lb-count");
  var btnClose = document.getElementById("lb-close");
  var btnPrev = document.getElementById("lb-prev");
  var btnNext = document.getElementById("lb-next");
  var lbPhotos = [];
  var lbIndex = 0;
  var lastFocused = null;

  function show(index) {
    if (!lbPhotos.length || !lbImg) return;
    lbIndex = (index + lbPhotos.length) % lbPhotos.length;
    var p = lbPhotos[lbIndex];
    lbImg.src = p.src;
    lbImg.alt = p.alt || "";
    if (lbCap) {
      var html = "";
      if (p.alt) html += '<span class="lb-cap">' + esc(p.alt) + "</span>";
      if (p.note) html += '<span class="lb-note">' + esc(p.note) + "</span>";
      if (p.place) html += '<span class="lb-place">' + esc(p.place) + "</span>";
      lbCap.innerHTML = html;
    }
    if (lbCount) lbCount.textContent = (lbIndex + 1) + " / " + lbPhotos.length;
  }

  function cityLayerOpen() {
    var layer = document.getElementById("city-layer");
    return !!(layer && layer.classList.contains("is-open"));
  }

  function openLightbox(photos, index) {
    if (!lb || !photos || !photos.length) return;
    lbPhotos = photos.filter(function (p) { return p && p.src; });
    if (!lbPhotos.length) return;
    lastFocused = document.activeElement;
    show(index || 0);
    lb.hidden = false;
    lb.classList.toggle("is-single", lbPhotos.length < 2);
    document.body.style.overflow = "hidden";
    if (btnClose) btnClose.focus();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    lbPhotos = [];
    if (!cityLayerOpen()) document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (lb) {
    if (btnClose) btnClose.addEventListener("click", closeLightbox);
    if (btnPrev) btnPrev.addEventListener("click", function () { show(lbIndex - 1); });
    if (btnNext) btnNext.addEventListener("click", function () { show(lbIndex + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") show(lbIndex - 1);
      else if (e.key === "ArrowRight") show(lbIndex + 1);
    });
  }

  /* 供地图图层调用 */
  window.WTHLightbox = {
    open: function (photo) {
      if (!photo) return;
      openLightbox([resolvePhoto(photo)], 0);
    }
  };

  /* ---------------- render: about ---------------- */
  function renderAbout(list) {
    var grid = document.getElementById("about-grid");
    if (!grid) return;
    if (!list || !list.length) {
      grid.innerHTML = "";
      return;
    }
    grid.innerHTML = list.map(function (person) {
      var nb = nextBirthday(person.born);
      var age = ageOf(person.born);
      var year = person.born ? String(person.born).slice(0, 4) : "";
      var md = person.born ? String(person.born).slice(5).replace("-", ".") : "";
      var rows = [];
      if (md) rows.push(["生日", md]);
      if (age != null) rows.push(["年龄", age + " 岁"]);
      if (nb) {
        rows.push(["下一个生日", nb.days === 0 ? "今天 · 满 " + nb.turning + " 岁" : nb.days + " 天后 · 满 " + nb.turning + " 岁"]);
      }
      return '<article class="about-card">' +
        '<h3 class="about-name">' + esc(person.name) + "</h3>" +
        '<p class="about-zodiac">' + esc([year, person.zodiac].filter(Boolean).join(" · ")) + "</p>" +
        '<ul class="about-rows">' + rows.map(function (r) {
          return '<li class="about-row"><span class="about-k">' + esc(r[0]) +
            '</span><span class="about-v">' + esc(r[1]) + "</span></li>";
        }).join("") + "</ul></article>";
    }).join("");
  }

  /* ---------------- render: timeline ---------------- */
  function normalizeMoment(m, i) {
    return {
      id: m.id || "m-" + i,
      date: m.date || "",
      label: displayDateLabel(m),
      sub: m.sub || (m.date ? String(m.date).slice(0, 4) : ""),
      title: m.title || "",
      text: m.text || "",
      kind: m.kind || (m.map ? "map" : (m.message ? "message" : (m.photos && m.photos.length ? "photo" : "story"))),
      place: m.place || "",
      photos: m.photos || [],
      message: m.message || null,
      map: !!m.map,
      future: !!m.future
    };
  }

  function getMoments(data) {
    var raw = Array.isArray(data.moments) ? data.moments : [];
    var list = raw.filter(Boolean).map(normalizeMoment);

    /* 兼容旧版 content.json：timeline 数组 */
    if (!raw.length && Array.isArray(data.timeline)) {
      list = data.timeline.filter(Boolean).map(function (t, i) {
        return normalizeMoment({
          date: t.date || "",
          label: t.when || "",
          title: t.title || "",
          text: t.text || "",
          kind: "story"
        }, i);
      });
      if (data.note && data.note.text) {
        list.push(normalizeMoment({
          date: "",
          label: "留言",
          title: "写给彼此",
          kind: "message",
          message: data.note
        }, list.length));
      }
    }

    /* 未来的计划接在线尾 */
    (data.plans || []).filter(Boolean).forEach(function (p, i) {
      list.push(normalizeMoment({
        id: "plan-" + i,
        date: p.date || "",
        label: fmtDate(p.date) || "计划",
        sub: "还没发生",
        title: p.title || "",
        text: p.note || "",
        place: p.place || "",
        kind: "plan",
        future: true
      }, list.length));
    });

    list.sort(function (a, b) {
      var af = a.future ? 1 : 0;
      var bf = b.future ? 1 : 0;
      if (af !== bf) return af - bf;
      return dateValue(a.date) - dateValue(b.date);
    });
    return list;
  }

  function yearMarker(year) {
    var div = document.createElement("div");
    div.className = "year-marker";
    var span = document.createElement("span");
    span.textContent = year;
    div.appendChild(span);
    return div;
  }

  function photoCaption(p) {
    var cap = document.createElement("figcaption");
    if (p.alt) {
      var a = document.createElement("span");
      a.className = "m-cap";
      a.textContent = p.alt;
      cap.appendChild(a);
    }
    if (p.note) {
      var n = document.createElement("span");
      n.className = "m-note";
      n.textContent = p.note;
      cap.appendChild(n);
    }
    return cap;
  }

  function photoGrid(photos) {
    var n = photos.length;
    var size = n === 1 ? "1" : n === 2 ? "2" : n === 3 ? "3" : "many";
    var grid = document.createElement("div");
    grid.className = "m-photos m-photos--" + size;

    photos.forEach(function (p, i) {
      var fig = document.createElement("figure");
      fig.className = "m-photo";
      fig.tabIndex = 0;
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", "放大查看：" + (p.alt || "照片 " + (i + 1)));
      fig.__photo = p;

      var frame = document.createElement("div");
      frame.className = "m-photo-frame";
      if (p.width && p.height) frame.style.setProperty("--ar", p.width + " / " + p.height);

      var img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt || "";
      img.loading = i < 3 ? "eager" : "lazy";
      img.decoding = "async";
      if (p.width && p.height) { img.width = p.width; img.height = p.height; }
      img.addEventListener("load", function () { img.classList.add("is-loaded"); });
      img.addEventListener("error", function () { fig.classList.add("is-missing"); });
      if (img.complete && img.naturalWidth) img.classList.add("is-loaded");

      frame.appendChild(img);
      fig.appendChild(frame);

      if (p.alt || p.note) fig.appendChild(photoCaption(p));

      function activate() {
        var parent = fig.parentNode;
        if (!parent) return;
        var figs = Array.prototype.slice.call(parent.querySelectorAll(".m-photo:not(.is-missing)"));
        var index = figs.indexOf(fig);
        openLightbox(figs.map(function (f) { return f.__photo; }), Math.max(0, index));
      }
      fig.addEventListener("click", activate);
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
      });

      grid.appendChild(fig);
    });

    return grid;
  }

  function momentEl(m, index) {
    var article = document.createElement("article");
    article.className = "moment moment--" + m.kind + (m.future ? " moment--future" : "") + " reveal";
    article.id = "moment-" + m.id;

    var rail = document.createElement("div");
    rail.className = "m-rail";

    var time = document.createElement("time");
    time.className = "m-date";
    if (m.date) time.setAttribute("datetime", m.date);
    time.textContent = m.label || fmtDate(m.date) || "某一天";
    rail.appendChild(time);

    if (m.sub) {
      var sub = document.createElement("span");
      sub.className = "m-date-sub";
      sub.textContent = m.sub;
      rail.appendChild(sub);
    }

    var node = document.createElement("span");
    node.className = "m-node";
    node.setAttribute("aria-hidden", "true");
    rail.appendChild(node);

    var body = document.createElement("div");
    body.className = "m-body";

    var meta = document.createElement("div");
    meta.className = "m-meta";

    var tag = document.createElement("span");
    tag.className = "tag tag--" + (m.kind === "plan" ? "plan" : m.kind);
    tag.textContent = KIND_LABEL[m.kind] || "故事";
    meta.appendChild(tag);

    if (m.message && m.kind !== "message") {
      var msgTag = document.createElement("span");
      msgTag.className = "tag tag--message";
      msgTag.textContent = "留言";
      meta.appendChild(msgTag);
    }

    if (m.place) {
      var place = document.createElement("span");
      place.className = "m-place";
      place.textContent = m.place;
      meta.appendChild(place);
    }
    body.appendChild(meta);

    if (m.title) {
      var h3 = document.createElement("h3");
      h3.className = "m-title";
      h3.textContent = m.title;
      body.appendChild(h3);
    }

    if (m.text) {
      var text = document.createElement("p");
      text.className = "m-text";
      text.textContent = m.text;
      body.appendChild(text);
    }

    var photos = uniquePhotos(m.photos, m.place);
    if (photos.length) body.appendChild(photoGrid(photos));

    if (m.message && m.message.text) {
      var quote = document.createElement("blockquote");
      quote.className = "m-message";
      var qp = document.createElement("p");
      qp.textContent = m.message.text;
      quote.appendChild(qp);
      if (m.message.by) {
        var cite = document.createElement("cite");
        cite.textContent = "—— " + m.message.by;
        quote.appendChild(cite);
      }
      body.appendChild(quote);
    }

    if (m.map) {
      var mapWrap = document.createElement("div");
      mapWrap.className = "m-map";
      var host = document.createElement("div");
      host.className = "map-host";
      host.id = "travel-map";
      mapWrap.appendChild(host);
      var mapNote = document.createElement("p");
      mapNote.className = "m-map-note";
      mapNote.textContent = "点地图上的点，打开那一次的相册";
      mapWrap.appendChild(mapNote);
      body.appendChild(mapWrap);
      article.__mapHost = host;
    }

    if (m.future) {
      var futureNote = document.createElement("span");
      futureNote.className = "m-future-note";
      futureNote.textContent = "还没有发生 · 先记在这里";
      body.appendChild(futureNote);
    }

    article.appendChild(rail);
    article.appendChild(body);
    return article;
  }

  var mapHost = null;
  var searchEntries = [];

  function renderTimeline(moments) {
    var stream = document.getElementById("stream");
    if (!stream) return;
    var frag = document.createDocumentFragment();
    var lastYear = "";

    moments.forEach(function (m, i) {
      var year = m.date ? String(m.date).slice(0, 4) : "";
      if (year && year !== lastYear) {
        frag.appendChild(yearMarker(year));
        lastYear = year;
      }
      var el = momentEl(m, i);
      if (el.__mapHost) mapHost = el.__mapHost;
      searchEntries.push({ el: el, m: m });
      frag.appendChild(el);
    });

    stream.appendChild(frag);
  }

  function setStats(moments, data) {
    var seen = {};
    moments.forEach(function (m) {
      (m.photos || []).forEach(function (ref) {
        var src = typeof ref === "string" ? ref : (ref && ref.src);
        if (src) seen[src] = true;
      });
    });
    var photoCount = Object.keys(seen).length || PHOTOS.length;
    document.querySelectorAll('[data-stat="photos"]').forEach(function (el) {
      el.textContent = String(photoCount);
    });

    var places = (data.trips || []).filter(function (t) {
      return t && t.status !== "planning";
    }).length;
    document.querySelectorAll('[data-stat="places"]').forEach(function (el) {
      el.textContent = String(places);
    });
  }

  /* ---------------- search / jump to a date ---------------- */
  var CN_MONTHS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

  function setupSearch() {
    var box = document.getElementById("search");
    var input = document.getElementById("tl-search");
    var list = document.getElementById("search-results");
    var openBtn = document.getElementById("search-open");
    if (!box || !input || !list) return;

    var current = [];
    var active = -1;

    function norm(s) {
      return String(s == null ? "" : s).toLowerCase().replace(/[\s.\-\/]/g, "");
    }

    function aliases(m) {
      var out = [];
      var d = String(m.date || "");
      var p = d.split("-");
      if (p[0]) out.push(p[0]);
      if (p.length >= 2) {
        var mm = parseInt(p[1], 10);
        if (!isNaN(mm)) {
          out.push(p[0] + "." + p[1]);
          out.push(p[0] + "年" + mm + "月");
          out.push(mm + "月");
          if (mm >= 1 && mm <= 12) out.push(CN_MONTHS[mm - 1] + "月");
        }
      }
      if (p.length >= 3) out.push(d, d.replace(/-/g, "."));
      return out;
    }

    function haystack(m) {
      return norm([
        aliases(m).join(" "),
        m.label, m.sub, m.title, m.place, m.text, KIND_LABEL[m.kind]
      ].join(" "));
    }

    function find(q) {
      var n = norm(q);
      if (!n) return searchEntries.slice();
      return searchEntries.filter(function (e) {
        return haystack(e.m).indexOf(n) !== -1;
      });
    }

    function close() {
      list.hidden = true;
      active = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }

    function setActive(i) {
      active = i;
      Array.prototype.forEach.call(list.children, function (node, n) {
        if (!node.classList) return;
        node.classList.toggle("is-active", n === i);
        if (n === i) {
          node.setAttribute("aria-selected", "true");
          input.setAttribute("aria-activedescendant", node.id);
          if (node.offsetTop < list.scrollTop ||
              node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTop = node.offsetTop - list.clientHeight / 2;
          }
        } else {
          node.setAttribute("aria-selected", "false");
        }
      });
    }

    function choose(i) {
      var entry = current[i];
      if (!entry) return;
      close();
      var target = entry.el;
      target.classList.remove("is-target");
      void target.offsetWidth;
      target.classList.add("is-target");
      window.setTimeout(function () { target.classList.remove("is-target"); }, 2800);
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center"
      });
      input.blur();
    }

    function render(q) {
      current = find(q).slice(0, 9);
      list.innerHTML = "";

      if (!current.length) {
        var empty = document.createElement("p");
        empty.className = "sr-empty";
        empty.textContent = "没有找到这一天。试试 2026.08、福州，或八月。";
        list.appendChild(empty);
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
        active = -1;
        return;
      }

      current.forEach(function (entry, i) {
        var m = entry.m;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sr-item";
        btn.id = "sr-item-" + i;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", i === 0 ? "true" : "false");

        var date = document.createElement("span");
        date.className = "sr-date";
        date.textContent = m.label || fmtDate(m.date) || "某一天";

        var main = document.createElement("span");
        var title = document.createElement("span");
        title.className = "sr-title";
        title.textContent = m.title || "没有标题";
        var meta = document.createElement("span");
        meta.className = "sr-meta";
        var bits = [KIND_LABEL[m.kind] || "记录"];
        if (m.date && !/\d/.test(String(m.label || ""))) bits.push(fmtDate(m.date));
        if (m.place) bits.push(m.place);
        var count = (m.photos || []).length;
        if (count) bits.push(count + " 张照片");
        meta.textContent = bits.join(" · ");
        main.appendChild(title);
        main.appendChild(meta);

        btn.appendChild(date);
        btn.appendChild(main);
        btn.addEventListener("click", function () { choose(i); });
        btn.addEventListener("mouseenter", function () { setActive(i); });
        list.appendChild(btn);
      });

      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      setActive(0);
    }

    function openSearch() {
      box.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center"
      });
      window.setTimeout(function () {
        input.focus();
        render(input.value);
      }, reduceMotion ? 0 : 320);
    }

    input.addEventListener("input", function () { render(input.value); });
    input.addEventListener("focus", function () { render(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        choose(active >= 0 ? active : 0);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.hidden) { render(input.value); return; }
        if (!current.length) return;
        var step = e.key === "ArrowDown" ? 1 : -1;
        setActive((active + step + current.length) % current.length);
      }
    });

    if (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openSearch();
      });
    }

    document.addEventListener("click", function (e) {
      if (!box.contains(e.target) && e.target !== openBtn) close();
    });

    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openSearch();
      }
    });
  }

  /* ---------------- reveal ---------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.05 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ---------------- scroll chrome ---------------- */
  var topbar = document.getElementById("topbar");
  var streamEl = document.getElementById("stream");
  var streamFill = document.getElementById("stream-fill");

  function onScroll() {
    if (topbar) topbar.classList.toggle("is-solid", window.scrollY > 32);
    if (streamEl && streamFill) {
      var rect = streamEl.getBoundingClientRect();
      var passed = window.innerHeight * 0.56 - rect.top;
      var height = Math.max(0, Math.min(rect.height, passed));
      streamFill.style.height = height + "px";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* ---------------- about dialog ---------------- */
  var dialog = document.getElementById("about-dialog");
  var aboutOpen = document.getElementById("about-open");
  if (aboutOpen && dialog) {
    aboutOpen.addEventListener("click", function () {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  }

  /* ---------------- boot ---------------- */
  function showLoadError() {
    var stream = document.getElementById("stream");
    if (!stream) return;
    var p = document.createElement("p");
    p.className = "load-error";
    p.textContent = "时间线没有加载出来。请刷新，或检查 /assets/content.json 是否存在。";
    stream.appendChild(p);
  }

  fetch("/assets/content.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("no content");
      return r.json();
    })
    .then(function (data) {
      if (data.hero) {
        var en = document.querySelector(".hero-en");
        var cn = document.querySelector(".hero-cn");
        if (en && data.hero.en != null) en.textContent = data.hero.en;
        if (cn && data.hero.cn != null) cn.textContent = data.hero.cn;
      }

      renderAbout(data.about || []);
      var moments = getMoments(data);
      setStats(moments, data);
      renderTimeline(moments);
      setupSearch();
      initReveal();
      onScroll();

      if (mapHost && window.TravelMap) {
        window.TravelMap.render(mapHost, data.trips || []);
      }
    })
    .catch(function () {
      initReveal();
      showLoadError();
    });
})();
