/* Snag — grab video/audio from the web straight into AE / Premiere. Windows + macOS. */
(function () {
  "use strict";

  var cs = new CSInterface();
  var R = Runtime;
  var fs = R.fs, path = R.path, cp = R.cp;

  var EXT_ROOT = cs.getSystemPath(SystemPath.EXTENSION);
  var APP = "Snag";
  var PROJECT_BIN = "Snag";

  // bundled binaries → per-user folder (yt-dlp can self-update there; mac exec bits fixed)
  var BINS = R.ensureBins(EXT_ROOT, APP, ["yt-dlp", "ffmpeg", "deno"]);
  var YTDLP = BINS.bins["yt-dlp"];
  var FFMPEG = R.findTool("ffmpeg", BINS.bins.ffmpeg) || "ffmpeg";
  var JS_RUNTIME = detectJsRuntime(); // "deno:<path>" | "node:<path>" | null
  var DEFAULT_DEST = R.defaultMediaDir(APP);

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    url: $("url"), pasteBtn: $("pasteBtn"), modeSeg: $("modeSeg"),
    videoOpts: $("videoOpts"), audioOpts: $("audioOpts"),
    quality: $("quality"), vcontainer: $("vcontainer"), aformat: $("aformat"),
    trimChk: $("trimChk"), inPt: $("inPt"), outPt: $("outPt"),
    dest: $("dest"), browseBtn: $("browseBtn"), importChk: $("importChk"),
    cookies: $("cookies"), cookieFileRow: $("cookieFileRow"), cookieFile: $("cookieFile"),
    cookieBrowseBtn: $("cookieBrowseBtn"), goBtn: $("goBtn"), cancelBtn: $("cancelBtn"),
    fill: $("fill"), status: $("status"), log: $("log"), logDetails: $("logDetails"),
    ver: $("ver"), updateBtn: $("updateBtn"), openBtn: $("openBtn"),
    folderInfo: $("folderInfo"), emptyBtn: $("emptyBtn")
  };

  var state = { mode: "video", child: null, cancelled: false };

  /* ---------- settings ---------- */
  var SETTINGS_KEY = "snag.settings.v1";
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function saveSettings() {
    var s = {
      mode: state.mode, quality: el.quality.value, vcontainer: el.vcontainer.value,
      aformat: el.aformat.value, trim: el.trimChk.checked, dest: el.dest.value,
      importIt: el.importChk.checked, cookies: el.cookies.value, cookieFile: el.cookieFile.value
    };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function applySettings() {
    var s = loadSettings();
    setMode(s.mode || "video");
    if (s.quality) el.quality.value = s.quality;
    if (s.vcontainer) el.vcontainer.value = s.vcontainer;
    if (s.aformat) el.aformat.value = s.aformat;
    el.trimChk.checked = !!s.trim;
    el.dest.value = s.dest || DEFAULT_DEST;
    el.importChk.checked = (s.importIt === undefined) ? true : !!s.importIt;
    el.cookies.value = s.cookies || "";
    el.cookieFile.value = s.cookieFile || "";
    syncTrim();
    syncCookies();
  }

  /* ---------- ui helpers ---------- */
  function setMode(m) {
    state.mode = m;
    Array.prototype.forEach.call(el.modeSeg.querySelectorAll(".seg-btn"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-mode") === m);
    });
    el.videoOpts.classList.toggle("hidden", m !== "video");
    el.audioOpts.classList.toggle("hidden", m !== "audio");
  }
  function syncTrim() {
    var on = el.trimChk.checked;
    el.inPt.disabled = !on;
    el.outPt.disabled = !on;
  }
  function syncCookies() {
    el.cookieFileRow.classList.toggle("hidden", el.cookies.value !== "file");
  }
  function setBusy(busy) {
    el.goBtn.classList.toggle("hidden", busy);
    el.cancelBtn.classList.toggle("hidden", !busy);
    el.updateBtn.disabled = busy;
    el.emptyBtn.disabled = busy;
    el.url.disabled = busy;
    if (!busy) refreshFolderInfo();
  }
  function setProgress(pct, cls) {
    el.fill.style.width = Math.max(0, Math.min(100, pct)) + "%";
    el.fill.className = "fill" + (cls ? " " + cls : "");
  }
  function status(msg) { el.status.textContent = msg; el.status.title = msg; }
  function log(line) {
    el.log.textContent += String(line).replace(/\s+$/, "") + "\n";
    el.log.scrollTop = el.log.scrollHeight;
  }
  function clearLog() { el.log.textContent = ""; }
  function fail(msg) {
    status(msg);
    setProgress(100, "err");
    log("ERROR: " + msg);
    el.logDetails.open = true;
    setBusy(false);
  }

  /* ---------- env ---------- */
  function detectJsRuntime() {
    var deno = BINS.bins.deno || R.which("deno");
    if (deno) return "deno:" + deno;
    var node = R.findTool("node", null);
    if (node) return "node:" + node;
    return null;
  }
  function safeUnlink(p) { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {} }
  function run(exe, args, onLine) {
    return new Promise(function (resolve) {
      var out = "", err = "";
      var child;
      try {
        child = cp.spawn(exe, args, { windowsHide: true, env: R.spawnEnv() });
      } catch (e) { return resolve({ code: -1, out: "", err: String(e) }); }
      state.child = child;
      var bufs = { o: "", e: "" };
      function feed(chunk, isErr) {
        var s = chunk.toString();
        if (isErr) err += s; else out += s;
        var k = isErr ? "e" : "o";
        bufs[k] += s;
        var lines = bufs[k].split(/\r?\n|\r/);
        bufs[k] = lines.pop();
        lines.forEach(function (l) { if (l.trim() && onLine) onLine(l, isErr); });
      }
      child.stdout.on("data", function (c) { feed(c, false); });
      child.stderr.on("data", function (c) { feed(c, true); });
      child.on("error", function (e) { err += String(e); });
      child.on("close", function (code) {
        if (bufs.o.trim() && onLine) onLine(bufs.o, false);
        if (bufs.e.trim() && onLine) onLine(bufs.e, true);
        state.child = null;
        resolve({ code: code, out: out, err: err });
      });
    });
  }
  function killChild() { R.killTree(state.child); }

  /* ---------- time parsing ---------- */
  function parseTime(s) {
    s = (s || "").trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    var parts = s.split(":").map(function (p) { return parseFloat(p); });
    if (parts.some(isNaN)) return NaN;
    var secs = 0;
    for (var i = 0; i < parts.length; i++) secs = secs * 60 + parts[i];
    return secs;
  }
  function secStr(n) { return String(Math.round(n * 1000) / 1000); }
  function tagForTrim(inSec, outSec) {
    return "[" + (inSec != null ? secStr(inSec) : "0") + "s-" + (outSec != null ? secStr(outSec) : "end") + "s]";
  }

  /* ---------- yt-dlp args ---------- */
  function buildArgs(opts) {
    var a = [
      "--newline", "--progress", "--no-playlist", "--windows-filenames",
      "--no-mtime", "-N", "4",
      "-P", opts.dest,
      "-o", "%(title).80s [%(id)s].%(ext)s",
      "--print", "after_move:filepath"
    ];
    if (FFMPEG && path.isAbsolute(FFMPEG)) a.push("--ffmpeg-location", path.dirname(FFMPEG));
    if (JS_RUNTIME) a.push("--js-runtimes", JS_RUNTIME);
    if (opts.cookies === "file") {
      if (opts.cookieFile) a.push("--cookies", opts.cookieFile);
    } else if (opts.cookies) {
      a.push("--cookies-from-browser", opts.cookies);
    }

    if (opts.mode === "audio") {
      a.push("-f", "ba/b", "-x", "--audio-format", opts.aformat);
      a.push("--audio-quality", opts.aformat === "mp3" ? "320K" : "0");
    } else {
      var sort = [];
      if (opts.maxRes > 0) sort.push("res:" + opts.maxRes);
      sort.push("vcodec:h264", "acodec:m4a", "ext:mp4:m4a");
      a.push("-f", "bv*+ba/b", "-S", sort.join(","), "--merge-output-format", "mp4");
    }
    a.push(opts.url);
    return a;
  }

  /* ---------- ffmpeg post pass (trim and/or prores) ---------- */
  function needsPost(opts) {
    return opts.trim || (opts.mode === "video" && opts.vcontainer === "prores");
  }
  function postProcess(src, opts) {
    var base = src.replace(/\.[^.]+$/, "");
    var ext = path.extname(src);
    var tag = opts.trim ? " " + tagForTrim(opts.inSec, opts.outSec) : "";
    var prores = opts.mode === "video" && opts.vcontainer === "prores";
    var dst = base + tag + (prores ? " [ProRes].mov" : ext);
    if (dst === src) dst = base + " [snag]" + ext;

    var args = ["-y", "-hide_banner", "-nostats", "-progress", "pipe:1", "-loglevel", "error"];
    if (opts.trim && opts.inSec != null) args.push("-ss", secStr(opts.inSec));
    if (opts.trim && opts.outSec != null) args.push("-to", secStr(opts.outSec));
    args.push("-i", src);

    if (opts.mode === "audio") {
      // lossless formats re-encode (still lossless) for sample-accurate cuts; lossy ones stream-copy
      if (opts.aformat === "wav") args.push("-c:a", "pcm_s16le");
      else if (opts.aformat === "flac") args.push("-c:a", "flac");
      else args.push("-c", "copy");
    } else if (prores) {
      args.push("-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", "-vendor", "apl0",
        "-c:a", "pcm_s16le");
    } else {
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart");
    }
    args.push(dst);

    var span = (opts.trim && opts.inSec != null && opts.outSec != null) ? (opts.outSec - opts.inSec) : null;
    var label = prores ? "ProRes" : (opts.trim ? "Trimming" : "Encoding");
    log("> ffmpeg " + args.join(" "));

    return run(FFMPEG, args, function (line, isErr) {
      if (isErr) { log(line); return; }
      var m = /^out_time_us=(\d+)/.exec(line) || /^out_time_ms=(\d+)/.exec(line);
      if (m) {
        var t = parseInt(m[1], 10) / 1e6;
        if (span) { setProgress(100 * t / span); status(label + " " + Math.round(100 * t / span) + "%"); }
        else status(label + " " + t.toFixed(1) + "s");
      }
    }).then(function (r) {
      if (state.cancelled) return null;
      if (r.code !== 0 || !fs.existsSync(dst)) {
        var e = (r.err.trim().split(/\r?\n/).pop() || "").trim();
        throw new Error("ffmpeg failed" + (e ? ": " + e : " (exit " + r.code + ")"));
      }
      safeUnlink(src); // intermediate full download
      return dst;
    });
  }

  /* ---------- host import ---------- */
  function importToHost(filePath) {
    return new Promise(function (resolve) {
      var script = "snagImport(" + JSON.stringify(filePath) + "," + JSON.stringify(PROJECT_BIN) + ")";
      cs.evalScript(script, function (res) { resolve(String(res || "")); });
    });
  }

  /* ---------- yt-dlp download (with cookie-lock retry) ---------- */
  var COOKIE_LOCK_RE = /Could not copy (Chrome|Chromium|Edge|Brave|Opera|Vivaldi) cookie database/i;

  function friendlyError(raw, opts) {
    if (COOKIE_LOCK_RE.test(raw)) {
      return "Browser is locking its cookie DB. Close " + (opts.cookies || "the browser") + " fully, or use a cookies.txt file.";
    }
    if (/Sign in to confirm you.re not a bot/i.test(raw)) return "YouTube wants a login. Set Login cookies (Firefox or cookies.txt).";
    if (/login required|requested content is not available|rate-limit reached/i.test(raw)) return "Site needs a login. Set Login cookies.";
    if (/Private video|This video is private/i.test(raw)) return "Private video. Needs cookies from an account with access.";
    if (/Unsupported URL/i.test(raw)) return "yt-dlp does not support this URL.";
    if (/HTTP Error 4(03|29)/i.test(raw)) return "Blocked by site (" + raw.match(/HTTP Error \d+/)[0] + "). Try cookies or wait.";
    return raw;
  }

  function download(opts, isRetry) {
    var args = buildArgs(opts);
    log("> yt-dlp " + args.map(function (x) { return /\s/.test(x) ? JSON.stringify(x) : x; }).join(" "));
    var finalPath = null;

    return run(YTDLP, args, function (line, isErr) {
      log(line);
      var m = /\[download\]\s+([\d.]+)%/.exec(line);
      if (m) { setProgress(parseFloat(m[1])); status("Downloading " + m[1] + "%"); return; }
      if (/^\[Merger\]/.test(line)) { status("Merging audio + video…"); return; }
      if (/^\[ExtractAudio\]/.test(line)) { status("Extracting audio…"); return; }
      if (/Extracting URL/.test(line)) { status("Resolving URL…"); return; }
      if (!isErr && R.isAbsPathLine(line)) finalPath = line.trim();
    }).then(function (r) {
      if (state.cancelled) return null;
      if (r.code !== 0) {
        var errLine = (r.err.match(/ERROR:.*$/m) || [])[0] || ("yt-dlp exited with code " + r.code);
        errLine = errLine.replace(/^ERROR:\s*/, "");
        if (!isRetry && COOKIE_LOCK_RE.test(errLine) && opts.cookies && opts.cookies !== "file") {
          log("NOTE: " + opts.cookies + " is locking its cookie DB. Retrying without cookies…");
          status("Cookie DB locked, retrying without cookies…");
          var o2 = {}; for (var k in opts) o2[k] = opts[k];
          o2.cookies = "";
          return download(o2, true).catch(function (e2) {
            throw new Error(friendlyError(errLine, opts) + " (Retry without cookies also failed: " + e2.message + ")");
          });
        }
        throw new Error(friendlyError(errLine, opts));
      }
      if (!finalPath) {
        var mm = /\[(?:Merger|ExtractAudio)\][^"]*"([^"]+)"/.exec(r.out) || /Destination:\s+(.+)$/m.exec(r.out);
        if (mm) finalPath = mm[1].trim();
      }
      if (!finalPath || !fs.existsSync(finalPath)) throw new Error("Download finished but output file not found.");
      return finalPath;
    });
  }

  /* ---------- main action ---------- */
  function go() {
    var url = el.url.value.trim();
    if (!/^https?:\/\//i.test(url)) return fail("Paste a valid http(s) URL first.");
    if (!YTDLP || !fs.existsSync(YTDLP)) return fail("yt-dlp is missing from " + R.bundledBinDir(EXT_ROOT) + " (run get-bins)");

    var dest = el.dest.value.trim() || DEFAULT_DEST;
    if (!R.mkdirp(dest)) return fail("Cannot create folder: " + dest);

    var opts = {
      url: url, dest: dest, mode: state.mode,
      maxRes: parseInt(el.quality.value, 10) || 0,
      vcontainer: el.vcontainer.value, aformat: el.aformat.value,
      cookies: el.cookies.value, cookieFile: el.cookieFile.value.trim(), trim: el.trimChk.checked,
      inSec: null, outSec: null, importIt: el.importChk.checked
    };
    if (opts.cookies === "file" && !fs.existsSync(opts.cookieFile)) return fail("cookies.txt not found: " + (opts.cookieFile || "(empty)"));
    if (opts.trim) {
      opts.inSec = parseTime(el.inPt.value);
      opts.outSec = parseTime(el.outPt.value);
      if (isNaN(opts.inSec) || isNaN(opts.outSec)) return fail("In/Out must be seconds or h:mm:ss.");
      if (opts.inSec != null && opts.outSec != null && opts.outSec <= opts.inSec) return fail("Out must be after In.");
      if (opts.inSec == null && opts.outSec == null) opts.trim = false;
      if (opts.inSec === 0 && opts.outSec == null) opts.trim = false;
    }
    saveSettings();

    clearLog();
    state.cancelled = false;
    setBusy(true);
    setProgress(0);
    status("Starting…");
    if (!JS_RUNTIME) log("NOTE: no deno/node found; YouTube downloads may be slow or missing formats.");

    download(opts).then(function (finalPath) {
      if (state.cancelled || !finalPath) return null;
      log("Saved: " + finalPath);

      if (needsPost(opts)) {
        setProgress(0);
        return postProcess(finalPath, opts);
      }
      return finalPath;
    }).then(function (outPath) {
      if (state.cancelled) { status("Cancelled."); setProgress(0); setBusy(false); return; }
      if (!outPath) return;
      log("Output: " + outPath);
      if (!opts.importIt) {
        status("Done: " + path.basename(outPath));
        setProgress(100, "done");
        setBusy(false);
        return;
      }
      status("Importing into project…");
      return importToHost(outPath).then(function (res) {
        if (/^OK/.test(res)) {
          status("Imported: " + path.basename(outPath));
          setProgress(100, "done");
        } else {
          log("Import: " + res);
          status("Saved, but import failed. See log.");
          setProgress(100, "err");
          el.logDetails.open = true;
        }
        setBusy(false);
      });
    }).catch(function (e) {
      fail(e && e.message ? e.message : String(e));
    });
  }

  function cancel() {
    state.cancelled = true;
    status("Cancelling…");
    killChild();
  }

  /* ---------- misc buttons ---------- */
  function refreshVersion() {
    if (!YTDLP || !fs.existsSync(YTDLP)) { el.ver.textContent = "yt-dlp missing"; return; }
    run(YTDLP, ["--version"]).then(function (r) {
      var bits = ["yt-dlp " + (r.out.trim() || "?")];
      if (!path.isAbsolute(FFMPEG)) bits.push("ffmpeg NOT FOUND");
      if (!JS_RUNTIME) bits.push("no JS runtime");
      bits.push(R.platformLabel);
      el.ver.textContent = bits.join(" · ");
      el.ver.title = "yt-dlp: " + YTDLP + "\nffmpeg: " + FFMPEG + "\nJS runtime: " + (JS_RUNTIME || "none") + "\nbin: " + BINS.dir + "\next: " + EXT_ROOT;
    });
  }
  function updateYtdlp() {
    if (state.child) return;
    el.updateBtn.disabled = true;
    status("Updating yt-dlp…");
    clearLog();
    run(YTDLP, ["-U"], function (l) { log(l); }).then(function (r) {
      el.updateBtn.disabled = false;
      status(r.code === 0 ? "yt-dlp update finished." : "Update failed (exit " + r.code + ")");
      refreshVersion();
    });
  }
  function browse() {
    var start = el.dest.value.trim() || DEFAULT_DEST;
    var res = window.cep.fs.showOpenDialogEx(false, true, "Choose download folder", start, []);
    if (res && res.err === 0 && res.data && res.data.length) {
      el.dest.value = R.toNative(res.data[0]);
      saveSettings();
      refreshFolderInfo();
    }
  }
  function browseCookieFile() {
    var cur = el.cookieFile.value.trim();
    var start = cur ? path.dirname(cur) : R.os.homedir();
    var res = window.cep.fs.showOpenDialogEx(false, false, "Choose cookies.txt", start, ["txt"]);
    if (res && res.err === 0 && res.data && res.data.length) {
      el.cookieFile.value = R.toNative(res.data[0]);
      saveSettings();
    }
  }
  function destDir() { return el.dest.value.trim() || DEFAULT_DEST; }
  function openFolder() { R.openFolder(destDir(), log); }

  /* ---------- folder housekeeping ---------- */
  function fmtBytes(n) {
    if (n < 1024) return n + " B";
    var u = ["KB", "MB", "GB", "TB"], i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return n.toFixed(n >= 100 ? 0 : 1) + " " + u[i];
  }
  function deletableFiles(d) {
    var cookiePath = el.cookieFile.value.trim().toLowerCase();
    var out = [];
    try {
      fs.readdirSync(d).forEach(function (name) {
        var p = path.join(d, name);
        var st; try { st = fs.statSync(p); } catch (e) { return; }
        if (!st.isFile()) return;
        if (/\.txt$/i.test(name)) return;                 // cookies.txt and notes stay
        if (name === ".DS_Store") return;
        if (p.toLowerCase() === cookiePath) return;
        out.push({ path: p, size: st.size });
      });
    } catch (e) {}
    return out;
  }
  function refreshFolderInfo() {
    var files = deletableFiles(destDir());
    var bytes = files.reduce(function (s, f) { return s + f.size; }, 0);
    el.folderInfo.textContent = files.length ? files.length + " file" + (files.length === 1 ? "" : "s") + " · " + fmtBytes(bytes) : "folder empty";
    el.folderInfo.title = destDir();
    el.emptyBtn.disabled = files.length === 0;
  }
  var emptyArmed = null;
  function disarmEmpty() {
    if (emptyArmed) { clearTimeout(emptyArmed); emptyArmed = null; }
    el.emptyBtn.textContent = "Empty folder";
    el.emptyBtn.classList.remove("confirm");
  }
  function emptyFolder() {
    var files = deletableFiles(destDir());
    if (!files.length) { refreshFolderInfo(); return; }
    if (!emptyArmed) {
      el.emptyBtn.textContent = "Delete " + files.length + " file" + (files.length === 1 ? "" : "s") + "?";
      el.emptyBtn.classList.add("confirm");
      emptyArmed = setTimeout(disarmEmpty, 4000);
      return;
    }
    disarmEmpty();
    var n = 0, bytes = 0, failed = 0;
    files.forEach(function (f) {
      try { fs.unlinkSync(f.path); n++; bytes += f.size; } catch (e) { failed++; log("Could not delete: " + f.path); }
    });
    status("Deleted " + n + " file" + (n === 1 ? "" : "s") + " (" + fmtBytes(bytes) + ")" + (failed ? ", " + failed + " in use" : "") + ". Imported footage in open projects is now offline.");
    setProgress(0);
    refreshFolderInfo();
  }
  function pasteUrl() {
    el.url.focus();
    el.url.select();
    try { document.execCommand("paste"); } catch (e) {}
    setTimeout(function () { el.url.value = el.url.value.trim(); }, 0);
  }

  /* ---------- wire up ---------- */
  el.modeSeg.addEventListener("click", function (e) {
    var b = e.target.closest(".seg-btn");
    if (b) { setMode(b.getAttribute("data-mode")); saveSettings(); }
  });
  el.trimChk.addEventListener("change", function () { syncTrim(); saveSettings(); });
  [el.quality, el.vcontainer, el.aformat, el.importChk].forEach(function (x) { x.addEventListener("change", saveSettings); });
  el.cookies.addEventListener("change", function () { syncCookies(); saveSettings(); });
  el.cookieFile.addEventListener("change", saveSettings);
  el.cookieBrowseBtn.addEventListener("click", browseCookieFile);
  el.dest.addEventListener("change", function () { saveSettings(); refreshFolderInfo(); });
  el.emptyBtn.addEventListener("click", emptyFolder);
  el.goBtn.addEventListener("click", go);
  el.cancelBtn.addEventListener("click", cancel);
  el.pasteBtn.addEventListener("click", pasteUrl);
  el.browseBtn.addEventListener("click", browse);
  el.openBtn.addEventListener("click", openFolder);
  el.updateBtn.addEventListener("click", updateYtdlp);
  el.url.addEventListener("keydown", function (e) { if (e.key === "Enter" && !state.child) go(); });

  applySettings();
  if (BINS.copied.length) log("Installed bundled binaries to " + BINS.dir + ": " + BINS.copied.join(", "));
  refreshVersion();
  refreshFolderInfo();
})();
