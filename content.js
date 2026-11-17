/* ============================================================
   文字内容渲染
   从 /assets/content.json 读取文案，替换页面上的默认文字。
   读取失败时什么都不做，页面保留 index.html 里的原文。
   ============================================================ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    var p = String(born).split("-");
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

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  /* ---------------- 各区块渲染 ---------------- */
  function renderSite(d) {
    var mark = document.querySelector(".mark");
    if (mark && d.mark) mark.textContent = d.mark;

    var h1 = document.querySelector(".hero-title");
    if (h1 && (d.titleA || d.titleB)) {
      h1.innerHTML = esc(d.titleA) + ' <em>&amp;</em><br>' + esc(d.titleB);
    }

    if (d.since) {
      var time = document.getElementById("since-date");
      if (time) {
        time.textContent = String(d.since).replace(/-/g, ".");
        time.setAttribute("datetime", d.since);
      }
      var since = document.querySelector(".lt-since");
      if (since) since.textContent = "SINCE " + String(d.since).replace(/-/g, ".");
    }

    var en = document.querySelector(".hero-en");
    if (en && d.hero && d.hero.en != null) en.textContent = d.hero.en;

    var cn = document.querySelector(".hero-cn");
    if (cn && d.hero && d.hero.cn != null) cn.textContent = d.hero.cn;

    var tt = document.querySelector("title");
    if (tt && d.mark) tt.textContent = d.mark;
  }

  function renderAbout(list) {
    var grid = document.querySelector(".ab-grid");
    if (!grid || !list || !list.length) return;
    grid.innerHTML = list.map(function (p) {
      var age = ageOf(p.born);
      var year = p.born ? String(p.born).slice(0, 4) : "";
      var sub = [year, p.zodiac].filter(Boolean).join(" · ");
      function row(k, v) {
        return '<li class="ab-row"><span class="ab-k">' + esc(k) +
          '</span><span class="ab-v">' + esc(v) + "</span></li>";
      }
      return '<article class="ab-card">' +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="ab-sub">' + esc(sub) + "</p>" +
        '<ul class="ab-list">' +
        row("生日", p.born ? String(p.born).replace(/-/g, ".") : "") +
        row("年龄", age == null ? "" : age + " 岁") +
        "</ul></article>";
    }).join("");
  }

  function renderBirthdays(list) {
    var grid = document.querySelector(".bd-grid");
    if (!grid || !list || !list.length) return;
    grid.innerHTML = list.map(function (p) {
      var nb = nextBirthday(p.born);
      var isToday = nb && nb.days === 0;
      var num = isToday ? "今" : (nb ? nb.days : "—");
      var meta = "";
      if (isToday) meta = "生日快乐 · 满 " + nb.turning + " 岁";
      else if (nb) meta = nb.date.getFullYear() + "." + pad(nb.month) + "." + pad(nb.day) + " · 满 " + nb.turning + " 岁";
      return '<article class="bd-card' + (isToday ? " is-today" : "") + '">' +
        '<p class="bd-name">' + esc(p.name) + "</p>" +
        '<p class="bd-num"><span class="bd-days">' + esc(num) + '</span><span class="bd-unit">天</span></p>' +
        '<p class="bd-meta">' + esc(meta) + "</p></article>";
    }).join("");
  }

  function renderCards(list) {
    if (!list || !list.length) return;
    var cards = document.querySelectorAll(".card");
    Array.prototype.forEach.call(cards, function (card, i) {
      var data = list[i];
      if (!data) return;
      var h3 = card.querySelector("h3");
      var p = card.querySelector(".card-body p");
      if (h3 && data.title != null) h3.textContent = data.title;
      if (p && data.sub != null) p.textContent = data.sub;
    });
  }

  function renderTimeline(list) {
    var ol = document.querySelector("ol.timeline");
    if (!ol || !list || !list.length) return;
    ol.innerHTML = list.map(function (t) {
      return "<li><p class=\"tl-date\">" + esc(t.when) + "</p>" +
        "<h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></li>";
    }).join("");
  }

  function renderPlans(list) {
    var host = document.getElementById("plans-list");
    if (!host || !Array.isArray(list)) return;
    host.innerHTML = list.map(function (p) {
      return '<article class="plan-card">' +
        '<div class="plan-meta"><span>' + esc(p.when || "") + '</span><span class="plan-status">' + esc(p.status || "计划中") + '</span></div>' +
        '<h3>' + esc(p.title || "") + '</h3><p>' + esc(p.text || "") + '</p></article>';
    }).join("");
  }

  function renderNote(n) {
    if (!n) return;
    var p = document.querySelector(".note p");
    var cite = document.querySelector(".note cite");
    if (p && n.text != null) p.textContent = n.text;
    if (cite && n.by != null) cite.textContent = "—— " + n.by;
  }

  function renderEnd(e) {
    if (!e) return;
    var line = document.querySelector(".end-line");
    var sign = document.querySelector(".end-sign");
    if (line && e.line != null) line.textContent = e.line;
    if (sign && e.sign != null) sign.innerHTML = esc(e.sign).replace(/(&amp;)/, "<em>&amp;</em>");
  }

  function renderFooter(footer, d) {
    var p = document.querySelector(".footer p");
    if (!p) return;
    var year = new Date().getFullYear();
    var mark = (d && d.mark) || "wth & dwt";
    var extra = footer || "保留所有照片权利";
    p.textContent = "© " + year + " " + mark + " · " + extra;
  }

  /* ---------------- 启动 ---------------- */
  fetch("/assets/content.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("no content");
      return r.json();
    })
    .then(function (d) {
      renderSite(d.site || {});
      renderAbout(d.about || []);
      renderBirthdays(d.about || []);
      renderCards(d.cards || []);
      renderTimeline(d.timeline || []);
      renderPlans(d.plans || []);
      renderNote(d.note || {});
      renderEnd(d.end || {});
      renderFooter(d.footer, d.site);
      document.documentElement.setAttribute("data-content", "json");
    })
    .catch(function () {
      /* 静默失败：保留 index.html 里的默认文字 */
    });
})();
