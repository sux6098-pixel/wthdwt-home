/* ============================================================
   旅行地图
   - 真实中国省界（assets/china.json，GeoJSON）
   - 城市按真实经纬度打点，去过的连线，计划中的用虚线
   - 点击城市展开照片与故事
   ============================================================ */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var W = 1000;

  /* 墨卡托投影 */
  function project(lon, lat) {
    var x = lon * Math.PI / 180;
    var r = lat * Math.PI / 180;
    var y = Math.log(Math.tan(Math.PI / 4 + r / 2));
    return [x, -y];
  }

  function pathFromGeometry(geom, scale, offset) {
    var rings = [];
    if (geom.type === "Polygon") rings = [geom.coordinates];
    else if (geom.type === "MultiPolygon") rings = geom.coordinates;
    else return "";

    var d = "";
    rings.forEach(function (poly) {
      poly.forEach(function (ring) {
        var started = false;
        for (var i = 0; i < ring.length; i++) {
          var p = project(ring[i][0], ring[i][1]);
          var x = (p[0] - offset[0]) * scale;
          var y = (p[1] - offset[1]) * scale;
          d += (started ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
          started = true;
        }
        d += "Z";
      });
    });
    return d;
  }

  function el(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var cache = null;

  function loadGeo() {
    if (cache) return Promise.resolve(cache);
    return fetch("/assets/china.json", { cache: "force-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { cache = j; return j; });
  }

  /* ---------------- 主渲染 ---------------- */
  function render(host, trips) {
    if (!host) return;
    trips = trips || [];

    loadGeo().then(function (geo) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      geo.features.forEach(function (f) {
        if (!f.geometry) return;
        var rings = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        rings.forEach(function (poly) {
          poly.forEach(function (ring) {
            for (var i = 0; i < ring.length; i++) {
              var p = project(ring[i][0], ring[i][1]);
              if (p[0] < minX) minX = p[0];
              if (p[0] > maxX) maxX = p[0];
              if (p[1] < minY) minY = p[1];
              if (p[1] > maxY) maxY = p[1];
            }
          });
        });
      });

      var pad = 0.9;
      var scale = W / (maxX - minX + pad * 2);
      var H = Math.round((maxY - minY + pad * 2) * scale);
      var offset = [minX - pad, minY - pad];

      host.innerHTML = "";
      var svg = el("svg", {
        viewBox: "0 0 " + W + " " + H,
        class: "map-svg",
        role: "img",
        "aria-label": "去过的城市地图"
      });

      var gProv = el("g", { class: "map-prov" });
      geo.features.forEach(function (f) {
        if (!f.geometry) return;
        var d = pathFromGeometry(f.geometry, scale, offset);
        if (!d) return;
        var p = el("path", { d: d });
        p.setAttribute("data-name", (f.properties && f.properties.name) || "");
        gProv.appendChild(p);
      });
      svg.appendChild(gProv);

      function pt(lon, lat) {
        var p = project(lon, lat);
        return [(p[0] - offset[0]) * scale, (p[1] - offset[1]) * scale];
      }

      /* 路线：只连去过的，按日期排序 */
      var visited = trips.filter(function (t) {
        return t.status !== "planning" && typeof t.lon === "number" && typeof t.lat === "number";
      });
      visited.sort(function (a, b) {
        return String(a.date || "").localeCompare(String(b.date || ""));
      });
      if (visited.length > 1) {
        var d = visited.map(function (t, i) {
          var q = pt(t.lon, t.lat);
          return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
        }).join("");
        svg.appendChild(el("path", { d: d, class: "map-route" }));
      }

      /* 城市点位 */
      var gPins = el("g", { class: "map-pins" });
      trips.forEach(function (t) {
        if (typeof t.lon !== "number" || typeof t.lat !== "number") return;
        var q = pt(t.lon, t.lat);
        var planned = t.status === "planning";
        var g = el("g", {
          class: "pin" + (planned ? " pin-planned" : ""),
          transform: "translate(" + q[0].toFixed(1) + "," + q[1].toFixed(1) + ")",
          role: "button",
          tabindex: "0",
          "aria-label": t.city + (planned ? "（计划中）" : "")
        });

        g.appendChild(el("circle", { r: planned ? 22 : 20, class: "pin-halo" }));
        g.appendChild(el("circle", { r: planned ? 8 : 7, class: "pin-dot" }));

        var label = el("text", { class: "pin-label", y: -30, "text-anchor": "middle" });
        label.textContent = t.city;
        g.appendChild(label);

        function activate() {
          Array.prototype.forEach.call(svg.querySelectorAll(".pin"), function (p) {
            p.classList.remove("is-active");
          });
          g.classList.add("is-active");
          showDetail(t);
        }
        g.addEventListener("click", activate);
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
        });

        gPins.appendChild(g);
      });
      svg.appendChild(gPins);
      host.appendChild(svg);

      var first = trips.filter(function (t) { return t.status !== "planning"; })[0] || trips[0];
      if (first) showDetail(first);
    }).catch(function () {
      host.innerHTML = '<p class="map-fail">地图加载失败</p>';
    });
  }

  /* ---------------- 城市详情 ---------------- */
  function showDetail(t) {
    var box = document.getElementById("city-detail");
    if (!box) return;
    var planned = t.status === "planning";
    var statusText = planned ? "计划中" : (t.status === "done" ? "已去过" : "");
    var date = t.date ? String(t.date).replace(/-/g, ".") : "";

    /* 这个城市的照片：手动挂的 + 相册里 city 字段匹配的 */
    var linked = (window.PHOTOS || []).filter(function (p) {
      return p && p.city && p.city === t.city;
    }).map(function (p) {
      return { src: p.src, alt: p.alt || "" };
    });
    var merged = (t.photos || []).concat(linked);

    var photos = merged.map(function (p) {
      return '<figure class="city-ph"><img src="' + p.src + '" alt="' + esc(p.alt || "") + '" loading="lazy"></figure>';
    }).join("");

    var empty = '<p class="city-empty">这个地方的照片还没整理。</p>';

    box.innerHTML =
      '<div class="city-head">' +
        '<h3>' + esc(t.city) + '</h3>' +
        '<span class="city-badge' + (planned ? " is-planned" : "") + '">' + esc(statusText) + '</span>' +
      '</div>' +
      (date ? '<p class="city-meta">' + esc(date) + '</p>' : "") +
      (t.story ? '<p class="city-story">' + esc(t.story) + '</p>' : "") +
      (photos ? '<div class="city-photos">' + photos + '</div>' : empty);
  }

  window.TravelMap = { render: render };
})();
