/* Interactive travel map: actual coordinates, no invented travel order or itinerary. */
(function () {
  "use strict";
  var host = document.getElementById("journey-map");
  if (!host) return;
  var places = {
    fuzhou: { name: "福州", region: "福建 · 中国", status: "已到访", lat: 26.0745, lng: 119.2965, text: "这座城市，已经成为你们共同走过的足迹。" },
    changsha: { name: "长沙", region: "湖南 · 中国", status: "已到访", lat: 28.2282, lng: 112.9388, text: "这座城市，已经成为你们共同走过的足迹。" },
    lushan: { name: "庐山", region: "江西 · 元旦计划", status: "计划中", lat: 29.55, lng: 115.99, text: "计划在 2027 年元旦一起出发。等旅程真正完成，再把它收进回忆。" }
  };
  var detail = document.getElementById("place-detail");
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-place]"));
  function selectPlace(id) {
    var p = places[id]; if (!p) return;
    cards.forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-place") === id); });
    if (detail) detail.innerHTML = '<span class="detail-label">' + (p.status === "已到访" ? "A PLACE TO REMEMBER" : "SOMEDAY, SOON") + '</span><h3>' + p.name + '</h3><p>' + p.text + '</p>';
    if (window.__journeyMap && window.__journeyMarkers && window.__journeyMarkers[id]) {
      window.__journeyMap.flyTo([p.lat, p.lng], 7, { duration: 0.65 }); window.__journeyMarkers[id].openPopup();
    }
  }
  cards.forEach(function (b) { b.addEventListener("click", function () { selectPlace(b.getAttribute("data-place")); }); });
  if (!window.L) { host.innerHTML = '<div class="map-fallback"><strong>地图暂时无法加载</strong><span>请检查网络后刷新页面；地点信息仍可通过右侧卡片查看。</span></div>'; return; }
  var map = L.map(host, { scrollWheelZoom: false, zoomControl: false, attributionControl: false }).setView([27.8, 116.2], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  /* A non-directional dotted footprint link; it does not claim travel order or a transport route. */
  L.polyline([[28.2282, 112.9388], [26.0745, 119.2965]], { color: "#b9a98e", weight: 1.5, opacity: 0.72, dashArray: "4 8", interactive: false }).addTo(map);
  var markers = {};
  Object.keys(places).forEach(function (id) {
    var p = places[id], kind = p.status === "已到访" ? "visited" : "planned";
    var icon = L.divIcon({ className: "map-pin-wrap", html: '<span class="map-pin ' + kind + '"><i></i></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
    var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
    marker.bindPopup('<div class="map-popup"><small>' + p.status + '</small><strong>' + p.name + '</strong><span>' + p.region + '</span></div>');
    marker.on("click", function () { selectPlace(id); }); markers[id] = marker;
  });
  window.__journeyMap = map; window.__journeyMarkers = markers;
  setTimeout(function () { map.invalidateSize(); }, 250);
  window.addEventListener("resize", function () { map.invalidateSize(); });
})();
