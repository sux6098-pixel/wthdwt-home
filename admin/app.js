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
  }

  function showUpload(name) {
    el.setup.hidden = true;
    el.upload.hidden = false;
    if (name) el.whoName.textContent = "已连接 · " + name;
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
