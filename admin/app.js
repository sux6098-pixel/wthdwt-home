/* ============================================================
   上传应用
   把照片压缩后直接写进 GitHub 仓库，Cloudflare Pages 自动部署。
   令牌只存在本机 localStorage，不经过任何第三方服务器。
   ============================================================ */
(function () {
  "use strict";

  var OWNER = "sux6098-pixel";
  var REPO = "wthdwt-home";
  var BRANCH = "main";
  var API = "https://api.github.com";
  var TOKEN_KEY = "wthdwt_pat";
  var MAX_EDGE = 1600;
  var QUALITY = 0.82;

  var token = localStorage.getItem(TOKEN_KEY) || "";
  var queue = [];
  var seq = 0;
  var busy = false;

  var el = {
    setup: document.getElementById("view-setup"),
    upload: document.getElementById("view-upload"),
    tokenInput: document.getElementById("input-token"),
    btnConnect: document.getElementById("btn-connect"),
    setupStatus: document.getElementById("setup-status"),
    whoName: document.getElementById("who-name"),
    btnLogout: document.getElementById("btn-logout"),
    btnSettings: document.getElementById("btn-settings"),
    fileInput: document.getElementById("file-input"),
    queueBox: document.getElementById("queue"),
    submitBar: document.getElementById("submit-bar"),
    btnSubmit: document.getElementById("btn-submit"),
    count: document.getElementById("count"),
    uploadStatus: document.getElementById("upload-status"),
    result: document.getElementById("result")
  };

  /* ---------------- 基础工具 ---------------- */
  function setStatus(node, text, kind) {
    if (!node) return;
    node.textContent = text || "";
    node.className = "status" + (kind ? " " + kind : "");
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });

    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var msg = (data && data.message) || (res.status + " " + res.statusText);
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        var s = String(fr.result);
        resolve(s.slice(s.indexOf(",") + 1));
      };
      fr.onerror = function () { reject(new Error("读取文件失败")); };
      fr.readAsDataURL(blob);
    });
  }

  /* ---------------- 压缩 ---------------- */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("这张图读不出来，可能是 HEIC 格式"));
      };
      img.src = url;
    });
  }

  function compress(file) {
    return loadImage(file).then(function (img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      var k = Math.min(1, MAX_EDGE / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * k));
      var ch = Math.max(1, Math.round(h * k));
      var canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          resolve({ blob: blob, width: cw, height: ch });
        }, "image/jpeg", QUALITY);
      });
    });
  }

  /* ---------------- 视图 ---------------- */
  function showSetup() {
    el.setup.hidden = false;
    el.upload.hidden = true;
    el.tokenInput.value = "";
    setStatus(el.setupStatus, "");
    syncShell(false);
  }

  function showUpload(name) {
    el.setup.hidden = true;
    el.upload.hidden = false;
    if (name) el.whoName.textContent = "已连接 · " + name;
    syncShell(true);
  }

  function connect() {
    var t = (el.tokenInput.value || "").trim();
    if (!t) { setStatus(el.setupStatus, "先粘贴令牌", "err"); return; }
    if (!/^(github_pat_|ghp_)/.test(t)) {
      setStatus(el.setupStatus, "看起来不是 GitHub 令牌（应以 github_pat_ 或 ghp_ 开头）", "err");
      return;
    }
    token = t;
    el.btnConnect.disabled = true;
    setStatus(el.setupStatus, "验证中…");
    api("/user").then(function (user) {
      return api("/repos/" + OWNER + "/" + REPO).then(function (repo) {
        if (!repo.permissions || !repo.permissions.push) {
          throw new Error("这个令牌没有写权限，Contents 权限要设成 Read and write");
        }
        localStorage.setItem(TOKEN_KEY, token);
        showUpload(user.login);
      });
    }).catch(function (err) {
      token = "";
      var msg = err.message;
      if (err.status === 401) msg = "令牌无效或已过期";
      if (err.status === 404) msg = "找不到仓库，或令牌没勾选这个仓库";
      setStatus(el.setupStatus, msg, "err");
    }).then(function () {
      el.btnConnect.disabled = false;
    });
  }

  /* ---------------- 队列 ---------------- */
  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    setStatus(el.uploadStatus, "正在压缩 " + files.length + " 张…");

    files.reduce(function (chain, file) {
      return chain.then(function () {
        return compress(file).then(function (out) {
          if (!out.blob) throw new Error("压缩失败");
          var item = {
            id: ++seq,
            blob: out.blob,
            width: out.width,
            height: out.height,
            preview: URL.createObjectURL(out.blob),
            caption: "",
            cat: "daily"
          };
          queue.push(item);
          renderQueue();
        }).catch(function (err) {
          setStatus(el.uploadStatus, (file.name || "文件") + "：" + err.message, "err");
        });
      });
    }, Promise.resolve()).then(function () {
      setStatus(el.uploadStatus, "");
      el.fileInput.value = "";
    });
  }

  function renderQueue() {
    el.queueBox.innerHTML = "";
    queue.forEach(function (item) {
      var wrap = document.createElement("div");
      wrap.className = "item";

      var img = document.createElement("img");
      img.src = item.preview;
      img.alt = "";
      wrap.appendChild(img);

      var fields = document.createElement("div");
      fields.className = "fields";

      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = "这张照片写点什么（可留空）";
      input.value = item.caption;
      input.addEventListener("input", function () { item.caption = input.value; });

      var row = document.createElement("div");
      row.className = "row";

      var seg = document.createElement("div");
      seg.className = "seg";
      [["daily", "日常"], ["trip", "旅行"]].forEach(function (pair) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = pair[1];
        b.setAttribute("aria-pressed", item.cat === pair[0] ? "true" : "false");
        b.addEventListener("click", function () {
          item.cat = pair[0];
          renderQueue();
        });
        seg.appendChild(b);
      });

      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = item.width + "×" + item.height + " · " + Math.round(item.blob.size / 1024) + "KB";

      var del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "删除";
      del.addEventListener("click", function () {
        URL.revokeObjectURL(item.preview);
        queue = queue.filter(function (q) { return q.id !== item.id; });
        renderQueue();
      });

      row.appendChild(seg);
      row.appendChild(meta);
      row.appendChild(del);

      fields.appendChild(input);
      fields.appendChild(row);
      wrap.appendChild(fields);
      el.queueBox.appendChild(wrap);
    });

    el.count.textContent = String(queue.length);
    el.submitBar.hidden = queue.length === 0;
    el.btnSubmit.disabled = busy || queue.length === 0;
  }

  /* ---------------- 提交 ---------------- */
  function stamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, "0"); }
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function putImage(name, base64) {
    return api("/repos/" + OWNER + "/" + REPO + "/contents/images/" + encodeURIComponent(name), {
      method: "PUT",
      body: JSON.stringify({
        message: "photo: 新增 " + name,
        content: base64,
        branch: BRANCH
      })
    });
  }

  function appendToPhotos(entries) {
    return api("/repos/" + OWNER + "/" + REPO + "/contents/assets/photos.js?ref=" + BRANCH)
      .then(function (meta) {
        var text = b64ToUtf8(meta.content);
        var lines = entries.map(function (e) {
          return '  { src: "/images/' + e.name + '", alt: ' + JSON.stringify(e.caption) +
            ', cat: "' + e.cat + '", width: ' + e.width + ", height: " + e.height + " },";
        }).join("\n");

        var start = text.indexOf("window.PHOTOS");
        var open = text.indexOf("[", start);
        var close = text.indexOf("];", open);
        if (start < 0 || open < 0 || close < 0) {
          throw new Error("photos.js 结构被改过了，请手动加一行");
        }
        var head = text.slice(0, close).replace(/\s*$/, "\n");
        var tail = text.slice(close);
        var updated = head + lines + "\n" + tail;

        return api("/repos/" + OWNER + "/" + REPO + "/contents/assets/photos.js", {
          method: "PUT",
          body: JSON.stringify({
            message: "photos: 新增 " + entries.length + " 张",
            content: utf8ToB64(updated),
            sha: meta.sha,
            branch: BRANCH
          })
        });
      });
  }

  function submit() {
    if (busy || !queue.length) return;
    busy = true;
    el.btnSubmit.disabled = true;

    var batch = queue.slice();
    var prefix = stamp();
    var uploaded = [];
    var failed = [];

    var chain = Promise.resolve();

    batch.forEach(function (item, i) {
      chain = chain.then(function () {
        setStatus(el.uploadStatus, "上传中 " + (i + 1) + " / " + batch.length + "…");
        var name = "p-" + prefix + "-" + (i + 1) + ".jpg";
        return blobToBase64(item.blob).then(function (b64) {
          return putImage(name, b64);
        }).then(function () {
          uploaded.push({
            name: name,
            caption: item.caption.trim(),
            cat: item.cat,
            width: item.width,
            height: item.height
          });
        }).catch(function (err) {
          failed.push({ name: name, reason: err.message });
        });
      });
    });

    chain.then(function () {
      if (!uploaded.length) {
        throw new Error("一张也没上传成功：" + (failed[0] ? failed[0].reason : "未知错误"));
      }
      setStatus(el.uploadStatus, "写入照片清单…");
      return appendToPhotos(uploaded);
    }).then(function () {
      batch.forEach(function (item) { URL.revokeObjectURL(item.preview); });
      queue = queue.filter(function (q) { return batch.indexOf(q) === -1; });
      renderQueue();

      setStatus(el.uploadStatus, "完成，约 1 分钟后上线", "ok");
      el.result.hidden = false;
      var extra = failed.length ? "，" + failed.length + " 张失败" : "";
      el.result.innerHTML =
        "<b>已上传 " + uploaded.length + " 张" + extra + "</b><br>" +
        "Cloudflare 正在构建，稍等刷新。<br>" +
        '<a href="https://wthdwt-home.pages.dev/" target="_blank" rel="noopener">打开网站 →</a>';
    }).catch(function (err) {
      setStatus(el.uploadStatus, err.message, "err");
      el.result.hidden = false;
      el.result.innerHTML =
        "<b>图片传上去了，但清单没写成功</b><br>" +
        "原因是：" + err.message + "<br>" +
        "可以去 GitHub 手动在 <code>assets/photos.js</code> 里加这几行：" +
        uploaded.map(function (u) {
          return "<br><code>  { src: \"/images/" + u.name + "\", alt: \"\", cat: \"" + u.cat + "\" }</code>";
        }).join("");
    }).then(function () {
      busy = false;
      el.btnSubmit.disabled = queue.length === 0;
    });
  }

  /* ---------------- 事件绑定 ---------------- */
  el.btnConnect.addEventListener("click", connect);
  el.tokenInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") connect();
  });

  el.btnLogout.addEventListener("click", function () {
    if (!confirm("清除这台手机上的令牌？下次要重新粘贴。")) return;
    localStorage.removeItem(TOKEN_KEY);
    token = "";
    queue.forEach(function (q) { URL.revokeObjectURL(q.preview); });
    queue = [];
    renderQueue();
    showSetup();
  });

  el.btnSettings.addEventListener("click", function () {
    if (token && !confirm("更换令牌？会清除当前令牌。")) return;
    localStorage.removeItem(TOKEN_KEY);
    token = "";
    showSetup();
  });

  el.fileInput.addEventListener("change", function () { addFiles(el.fileInput.files); });
  el.btnSubmit.addEventListener("click", submit);

  /* ================= 文字编辑（assets/content.json） ================= */
  function $(id) { return document.getElementById(id); }

  function syncShell(connected) {
    var tabs = $("tabs");
    if (tabs) tabs.hidden = !connected;
    if (!connected) {
      if ($("view-text")) $("view-text").hidden = true;
      if ($("view-upload")) $("view-upload").hidden = true;
    }
  }

  function switchTab(which) {
    var isPhoto = which === "photo";
    $("view-upload").hidden = !isPhoto;
    $("view-text").hidden = isPhoto;
    $("tab-photo").setAttribute("aria-pressed", isPhoto ? "true" : "false");
    $("tab-text").setAttribute("aria-pressed", isPhoto ? "false" : "true");
    if (!isPhoto) loadText(); else setStatus($("text-status"), "");
  }

  var contentState = { data: null, sha: null };

  function field(labelText, value, onchange, isArea) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var lab = document.createElement("label");
    lab.textContent = labelText;
    var input = isArea ? document.createElement("textarea") : document.createElement("input");
    if (!isArea) input.type = "text";
    input.value = value == null ? "" : value;
    input.addEventListener("input", function () { onchange(input.value); });
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  function selectField(labelText, value, options, onchange) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var lab = document.createElement("label");
    lab.textContent = labelText;
    var sel = document.createElement("select");
    options.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o[0];
      opt.textContent = o[1];
      if (o[0] === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () { onchange(sel.value); });
    wrap.appendChild(lab);
    wrap.appendChild(sel);
    return wrap;
  }

  function section(title) {
    var s = document.createElement("div");
    s.className = "sec";
    var h = document.createElement("p");
    h.className = "sec-title";
    h.textContent = title;
    s.appendChild(h);
    return s;
  }

  function renderTextForm(d) {
    var form = $("text-form");
    form.innerHTML = "";

    /* 封面 */
    var s1 = section("封面");
    s1.appendChild(field("英文那句话", d.hero && d.hero.en, function (v) { d.hero.en = v; }, false));
    s1.appendChild(field("中文那一行", d.hero && d.hero.cn, function (v) { d.hero.cn = v; }, false));
    form.appendChild(s1);

    /* 时间线 */
    var s2 = section("时间线");
    (d.timeline || []).forEach(function (item, i) {
      var block = document.createElement("div");
      block.className = "tl-block";
      var head = document.createElement("div");
      head.className = "tl-head";
      head.textContent = "第 " + (i + 1) + " 条";
      var del = document.createElement("button");
      del.type = "button";
      del.className = "tl-del";
      del.textContent = "删除";
      del.addEventListener("click", function () {
        d.timeline.splice(i, 1);
        renderTextForm(d);
      });
      head.appendChild(del);
      block.appendChild(head);
      block.appendChild(field("小字（日期/阶段）", item.when, function (v) { item.when = v; }));
      block.appendChild(field("标题", item.title, function (v) { item.title = v; }));
      block.appendChild(field("内容", item.text, function (v) { item.text = v; }, true));
      s2.appendChild(block);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "add";
    add.textContent = "+ 添加一条";
    add.addEventListener("click", function () {
      d.timeline = d.timeline || [];
      d.timeline.push({ when: "", title: "", text: "" });
      renderTextForm(d);
    });
    s2.appendChild(add);
    form.appendChild(s2);

    /* 留言 */
    var s3 = section("写给彼此");
    s3.appendChild(field("那句话", d.note && d.note.text, function (v) { d.note.text = v; }, true));
    s3.appendChild(field("署名", d.note && d.note.by, function (v) { d.note.by = v; }));
    form.appendChild(s3);

    /* 结尾 */
    var s4 = section("结尾");
    s4.appendChild(field("最后一句", d.end && d.end.line, function (v) { d.end.line = v; }));
    s4.appendChild(field("署名", d.end && d.end.sign, function (v) { d.end.sign = v; }));
    form.appendChild(s4);

    /* 关于我们 */
    var s5 = section("关于我们");
    (d.about || []).forEach(function (p) {
      var block = document.createElement("div");
      block.className = "tl-block";
      var head = document.createElement("div");
      head.className = "tl-head";
      head.textContent = p.name || "成员";
      block.appendChild(head);
      block.appendChild(field("名字", p.name, function (v) { p.name = v; }));
      block.appendChild(field("生日（YYYY-MM-DD）", p.born, function (v) { p.born = v; }));
      block.appendChild(field("星座", p.zodiac, function (v) { p.zodiac = v; }));
      s5.appendChild(block);
    });
    form.appendChild(s5);

    /* 旅行地图 */
    var s6 = section("旅行 · 地图上的城市");
    d.trips = d.trips || [];
    d.trips.forEach(function (t, i) {
      var block = document.createElement("div");
      block.className = "tl-block";
      var head = document.createElement("div");
      head.className = "tl-head";
      head.textContent = t.city || ("城市 " + (i + 1));
      var del = document.createElement("button");
      del.type = "button";
      del.className = "tl-del";
      del.textContent = "删除";
      del.addEventListener("click", function () {
        d.trips.splice(i, 1);
        renderTextForm(d);
      });
      head.appendChild(del);
      block.appendChild(head);
      block.appendChild(field("城市名", t.city, function (v) { t.city = v; }));
      block.appendChild(selectField("状态", t.status || "done",
        [["done", "已去过"], ["planning", "计划中"]],
        function (v) { t.status = v; }));
      block.appendChild(field("经度（如 119.296）", t.lon, function (v) { t.lon = parseFloat(v); }));
      block.appendChild(field("纬度（如 26.074）", t.lat, function (v) { t.lat = parseFloat(v); }));
      block.appendChild(field("日期（可留空）", t.date, function (v) { t.date = v; }));
      block.appendChild(field("这段旅行的故事", t.story, function (v) { t.story = v; }, true));
      s6.appendChild(block);
    });
    var addTrip = document.createElement("button");
    addTrip.type = "button";
    addTrip.className = "add";
    addTrip.textContent = "+ 添加城市";
    addTrip.addEventListener("click", function () {
      d.trips.push({ city: "", lon: 0, lat: 0, date: "", status: "planning", story: "", photos: [] });
      renderTextForm(d);
    });
    s6.appendChild(addTrip);
    form.appendChild(s6);

    /* 未来计划 */
    var s7 = section("未来计划");
    d.plans = d.plans || [];
    d.plans.forEach(function (p, i) {
      var block = document.createElement("div");
      block.className = "tl-block";
      var head = document.createElement("div");
      head.className = "tl-head";
      head.textContent = p.title || ("计划 " + (i + 1));
      var del = document.createElement("button");
      del.type = "button";
      del.className = "tl-del";
      del.textContent = "删除";
      del.addEventListener("click", function () {
        d.plans.splice(i, 1);
        renderTextForm(d);
      });
      head.appendChild(del);
      block.appendChild(head);
      block.appendChild(field("计划名称", p.title, function (v) { p.title = v; }));
      block.appendChild(field("地点", p.place, function (v) { p.place = v; }));
      block.appendChild(field("日期", p.date, function (v) { p.date = v; }));
      block.appendChild(selectField("状态", p.status || "planning",
        [["planning", "计划中"], ["done", "已完成"], ["paused", "暂停"]],
        function (v) { p.status = v; }));
      block.appendChild(field("说明", p.note, function (v) { p.note = v; }, true));
      s7.appendChild(block);
    });
    var addPlan = document.createElement("button");
    addPlan.type = "button";
    addPlan.className = "add";
    addPlan.textContent = "+ 添加计划";
    addPlan.addEventListener("click", function () {
      d.plans.push({ title: "", place: "", date: "", status: "planning", note: "" });
      renderTextForm(d);
    });
    s7.appendChild(addPlan);
    form.appendChild(s7);

    $("text-bar").hidden = false;
    $("btn-save-text").disabled = false;
  }

  function loadText() {
    if (!token) return;
    setStatus($("text-status"), "读取中…");
    api("/repos/" + OWNER + "/" + REPO + "/contents/assets/content.json?ref=" + BRANCH)
      .then(function (meta) {
        contentState.sha = meta.sha;
        contentState.data = JSON.parse(b64ToUtf8(meta.content));
        renderTextForm(contentState.data);
        setStatus($("text-status"), "");
      })
      .catch(function (err) {
        setStatus($("text-status"), "读取失败：" + err.message, "err");
      });
  }

  function saveText() {
    if (!contentState.data) return;
    var btn = $("btn-save-text");
    btn.disabled = true;
    setStatus($("text-status"), "保存中…");
    var json = JSON.stringify(contentState.data, null, 2) + "\n";
    api("/repos/" + OWNER + "/" + REPO + "/contents/assets/content.json", {
      method: "PUT",
      body: JSON.stringify({
        message: "content: 更新文字",
        content: utf8ToB64(json),
        sha: contentState.sha,
        branch: BRANCH
      })
    }).then(function (res) {
      contentState.sha = res.content.sha;
      setStatus($("text-status"), "已保存，约 1 分钟后生效", "ok");
    }).catch(function (err) {
      setStatus($("text-status"), "保存失败：" + err.message, "err");
    }).then(function () { btn.disabled = false; });
  }

  if ($("tab-photo")) $("tab-photo").addEventListener("click", function () { switchTab("photo"); });
  if ($("tab-text")) $("tab-text").addEventListener("click", function () { switchTab("text"); });
  if ($("btn-reload")) $("btn-reload").addEventListener("click", loadText);
  if ($("btn-save-text")) $("btn-save-text").addEventListener("click", saveText);

  /* 启动：有令牌验证一下，没有就进设置 */
  if (token) {
    showUpload();
    api("/user").then(function (user) {
      el.whoName.textContent = "已连接 · " + user.login;
    }).catch(function () {
      token = "";
      localStorage.removeItem(TOKEN_KEY);
      showSetup();
      setStatus(el.setupStatus, "令牌失效了，重新粘贴一个", "err");
    });
  } else {
    showSetup();
  }
})();
