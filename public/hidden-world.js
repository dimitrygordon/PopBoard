/* Hidden Patoka Valley: overscroll rubber-band, ink blooms, and cloud dive.
   World JS/assets load only after a pull begins, or when the URL is #world. */
(function () {
  "use strict";

  var THRESHOLD_FRAC = 0.33;
  var RUBBER = 0.4;
  var BLOOM_MAX_FRAC = 0.25;
  var SNAP_MS = 350;
  var HOME_SLIDE_MS = 600;
  var DIVE_MS = 1800;
  var FADE_MS = 400;
  var PAPER = "#EDE6D6";
  var GRAPHITE = [58, 54, 47]; /* #3A362F */
  var PENCIL = "#3A362F";

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var qs = new URLSearchParams(location.search);
  if (qs.get("pbReduce") === "1") reduce = true;

  var pull = 0;
  var pulling = false;
  var mode = "home"; /* home | pull | snap | dive | world | exit */
  var worldReady = false;
  var worldLanded = false;
  var worldLoading = false;
  var frame = null;
  var ink, grain, line, hint, edge, sheetEls = [];
  var blooms = [];
  var startTouches = null;
  var crossedThreshold = false;
  var pushedHash = false;
  var ignorePop = false;
  var freezePull = false;
  var loadStartedAt = 0;

  function vh() {
    return (window.visualViewport && window.visualViewport.height) || window.innerHeight || 800;
  }
  function thresholdPx() { return vh() * THRESHOLD_FRAC; }
  function onLogin() {
    var b = document.body;
    if (b && b.classList.contains("la-on")) return true;
    var login = document.getElementById("login");
    return !!(login && !login.classList.contains("hidden"));
  }
  function atPageBottom() {
    var slop = 4;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    return y + window.innerHeight >= document.documentElement.scrollHeight - slop;
  }
  function isFormTarget(t) {
    if (!t || !t.closest) return false;
    return !!t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
  }
  function skyBot() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--la-sky-bot").trim();
    return c || "#16303e";
  }
  function skyBlue() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--la-sky-top").trim();
    var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
    if (m) return [+m[1], +m[2], +m[3]];
    /* World's noon zenith-ish blue, used if the CSS variable is not ready. */
    return [70, 140, 230];
  }
  function parseRgba(str) {
    var s = (str || "").trim();
    var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
    if (m) return [+m[1], +m[2], +m[3]];
    m = /^#([0-9a-f]{6})$/i.exec(s);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    return null;
  }
  function isNightSky() {
    var c = parseRgba(skyBot());
    if (!c) return false;
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < 90;
  }

  function $(id) { return document.getElementById(id); }

  function ensureDom() {
    if ($("pb-valley-hint")) return;
    var edgeEl = document.createElement("div");
    edgeEl.id = "pb-valley-edge";
    edgeEl.setAttribute("aria-hidden", "true");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "pb-valley-hint";
    btn.textContent = "the valley is below";
    btn.setAttribute("aria-label", "Open the valley below the page");
    var inkEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    inkEl.id = "pb-valley-ink";
    inkEl.setAttribute("aria-hidden", "true");
    inkEl.setAttribute("preserveAspectRatio", "none");
    var grainEl = document.createElement("div");
    grainEl.id = "pb-valley-grain";
    grainEl.setAttribute("aria-hidden", "true");
    var lineEl = document.createElement("div");
    lineEl.id = "pb-valley-line";
    lineEl.setAttribute("aria-hidden", "true");
    var iframe = document.createElement("iframe");
    iframe.id = "pb-valley-world";
    iframe.title = "Patoka Valley";
    iframe.setAttribute("aria-hidden", "true");
    var host = document.body;
    host.appendChild(edgeEl);
    host.appendChild(btn);
    host.appendChild(inkEl);
    host.appendChild(grainEl);
    host.appendChild(lineEl);
    host.appendChild(iframe);
  }

  function cacheEls() {
    ink = $("pb-valley-ink");
    grain = $("pb-valley-grain");
    line = $("pb-valley-line");
    hint = $("pb-valley-hint");
    edge = $("pb-valley-edge");
    frame = $("pb-valley-world");
  }

  /* One wrapper so the card, pill, and sky translate together. Individual
     transforms lose to the login enter animation and the study-pill bob. */
  function ensureHomeSheet() {
    var sheet = $("pb-valley-sheet");
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.id = "pb-valley-sheet";
    var body = document.body;
    var nodes = [];
    ["la-sky", "login", "teacherLogin", "teacherSignup", "boardNameEntry"].forEach(function (id) {
      var el = $(id);
      if (el) nodes.push(el);
    });
    document.querySelectorAll("a.study-pill").forEach(function (el) { nodes.push(el); });
    nodes.sort(function (a, b) {
      var pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    if (nodes.length) body.insertBefore(sheet, nodes[0]);
    else body.insertBefore(sheet, body.firstChild);
    nodes.forEach(function (el) { sheet.appendChild(el); });
    return sheet;
  }

  function markHomeSlide() { ensureHomeSheet(); }

  function setHomeY(px, opacity) {
    var sheet = ensureHomeSheet();
    sheet.style.transform = px ? ("translateY(" + (-px) + "px)") : "";
    if (opacity != null) sheet.style.opacity = String(opacity);
  }
  function clearHomeSlide() {
    var sheet = $("pb-valley-sheet");
    if (!sheet) return;
    sheet.style.transform = "";
    sheet.style.opacity = "";
  }

  function seedBlooms() {
    /* 4 uneven watercolor washes — irregular placement and size, not a row. */
    blooms = [
      { x: 0.16, lift: 0.42, rx: 0.22, ry: 0.38, rot: -18, graphite: true,  seed: 11, verts: 11 },
      { x: 0.44, lift: 0.22, rx: 0.13, ry: 0.28, rot:  22, graphite: false, seed: 27, verts: 9 },
      { x: 0.61, lift: 0.55, rx: 0.20, ry: 0.36, rot:  -8, graphite: true,  seed: 41, verts: 12 },
      { x: 0.86, lift: 0.30, rx: 0.14, ry: 0.32, rot:  16, graphite: false, seed: 59, verts: 10 }
    ];
  }

  function hash11(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function washPath(cx, cy, rx, ry, rot, seed, n) {
    var i, pts = [];
    var cr = Math.cos(rot * Math.PI / 180);
    var sr = Math.sin(rot * Math.PI / 180);
    for (i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var jx = 0.68 + 0.42 * hash11(seed + i * 1.7);
      var jy = 0.62 + 0.48 * hash11(seed + i * 2.9 + 4.2);
      var wob = (hash11(seed + i * 5.3) - 0.5) * 0.45;
      var ang = t + wob;
      var x = Math.cos(ang) * rx * jx;
      var y = Math.sin(ang) * ry * jy;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n];
      var p1 = pts[i];
      var p2 = pts[(i + 1) % n];
      var p3 = pts[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " +
           c2x.toFixed(1) + "," + c2y.toFixed(1) + " " +
           p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d + "Z";
  }

  function softSky(rgb) {
    /* World's soft sky blue mixed toward paper — not a saturated disc. */
    var paper = [237, 230, 214];
    return [
      Math.round(rgb[0] * 0.42 + paper[0] * 0.58),
      Math.round(rgb[1] * 0.42 + paper[1] * 0.58),
      Math.round(rgb[2] * 0.42 + paper[2] * 0.58)
    ];
  }

  function clearInk() {
    if (!ink) return;
    while (ink.firstChild) ink.removeChild(ink.firstChild);
  }

  function progress() {
    return Math.max(0, Math.min(1, pull / Math.max(1, thresholdPx())));
  }

  function paintInk(fillFrac) {
    if (!ink) return;
    var w = window.innerWidth, h = window.innerHeight;
    ink.setAttribute("viewBox", "0 0 " + w + " " + h);
    ink.setAttribute("width", String(w));
    ink.setAttribute("height", String(h));
    ink.style.width = w + "px";
    ink.style.height = h + "px";
    clearInk();
    var p = fillFrac == null ? progress() : fillFrac;
    if (p <= 0.001) return;

    var maxH;
    if (p <= 1) {
      maxH = Math.min(BLOOM_MAX_FRAC * h, p * BLOOM_MAX_FRAC * h * 1.05);
      /* Stay below the pencil line, which sits at `pull` from the bottom. */
      if (pull > 0) maxH = Math.min(maxH, Math.max(0, pull - 4));
    } else {
      maxH = Math.min(h, BLOOM_MAX_FRAC * h + (p - 1) * h);
    }
    if (maxH < 4) return;

    var blue = softSky(skyBlue());
    var night = isNightSky();
    var nightBlue = softSky([150, 176, 210]);
    if (!blooms.length) seedBlooms();

    var NS = "http://www.w3.org/2000/svg";
    var defs = document.createElementNS(NS, "defs");
    var clip = document.createElementNS(NS, "clipPath");
    clip.setAttribute("id", "pb-wash-clip");
    var clipRect = document.createElementNS(NS, "rect");
    clipRect.setAttribute("x", "0");
    clipRect.setAttribute("y", String(Math.max(0, h - maxH)));
    clipRect.setAttribute("width", String(w));
    clipRect.setAttribute("height", String(maxH));
    clip.appendChild(clipRect);
    defs.appendChild(clip);

    var root = document.createElementNS(NS, "g");
    root.setAttribute("clip-path", "url(#pb-wash-clip)");

    var i;
    for (i = 0; i < blooms.length; i++) {
      var b = blooms[i];
      var grow = Math.min(1, 0.35 + p * 0.85);
      var rx = b.rx * w * grow;
      var ry = Math.min(b.ry * maxH * 1.15, maxH * 0.48) * (0.75 + 0.25 * grow);
      var cx = b.x * w;
      var cy = h - Math.max(ry * 0.85, Math.min(maxH - 4, b.lift * maxH + ry * 0.15));
      if (cy - ry < h - maxH + 2) cy = h - maxH + ry + 2;
      if (cy + ry > h - 2) cy = h - 2 - ry;

      var filt = document.createElementNS(NS, "filter");
      filt.setAttribute("id", "pb-wash-" + i);
      filt.setAttribute("x", "-45%");
      filt.setAttribute("y", "-45%");
      filt.setAttribute("width", "190%");
      filt.setAttribute("height", "190%");
      filt.setAttribute("color-interpolation-filters", "sRGB");
      var turb = document.createElementNS(NS, "feTurbulence");
      turb.setAttribute("type", "fractalNoise");
      turb.setAttribute("baseFrequency", (0.018 + 0.01 * (i % 3)).toFixed(3) + " " + (0.026 + 0.008 * ((i + 1) % 3)).toFixed(3));
      turb.setAttribute("numOctaves", "3");
      turb.setAttribute("seed", String(b.seed));
      turb.setAttribute("result", "turb");
      var disp = document.createElementNS(NS, "feDisplacementMap");
      disp.setAttribute("in", "SourceGraphic");
      disp.setAttribute("in2", "turb");
      disp.setAttribute("scale", String(16 + i * 5));
      disp.setAttribute("xChannelSelector", "R");
      disp.setAttribute("yChannelSelector", "G");
      filt.appendChild(turb);
      filt.appendChild(disp);
      defs.appendChild(filt);

      var col = night
        ? (b.graphite ? GRAPHITE : nightBlue)
        : (b.graphite ? GRAPHITE : blue);
      var aFill = (b.graphite ? 0.18 : 0.16) * Math.min(1, 0.45 + p * 0.7);
      aFill = Math.max(0.10, Math.min(0.25, aFill));
      var aEdge = Math.max(0.16, Math.min(0.28, aFill * 1.35));

      var d = washPath(cx, cy, rx, ry, b.rot, b.seed, b.verts);
      var g = document.createElementNS(NS, "g");
      g.setAttribute("filter", "url(#pb-wash-" + i + ")");
      var body = document.createElementNS(NS, "path");
      body.setAttribute("d", d);
      body.setAttribute("fill", "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + aFill.toFixed(3) + ")");
      var pool = document.createElementNS(NS, "path");
      pool.setAttribute("d", d);
      pool.setAttribute("fill", "none");
      pool.setAttribute("stroke", "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + aEdge.toFixed(3) + ")");
      pool.setAttribute("stroke-width", String(Math.max(6, Math.min(rx, ry) * 0.14)));
      pool.setAttribute("stroke-linejoin", "round");
      g.appendChild(body);
      g.appendChild(pool);
      root.appendChild(g);
    }

    ink.appendChild(defs);
    ink.appendChild(root);

    if (grain) {
      grain.classList.add("is-on");
      var pct = (maxH / h) * 100;
      grain.style.webkitMaskImage = "linear-gradient(to top, #000 0%, #000 " + pct + "%, transparent " + (pct + 4) + "%)";
      grain.style.maskImage = grain.style.webkitMaskImage;
    }
  }

  function setLine(p) {
    if (!line) return;
    if (p <= 0.001) {
      line.classList.remove("is-on");
      line.style.transform = "translateX(-50%) scaleX(0)";
      line.style.bottom = "0px";
      return;
    }
    /* Sit on the lifted sheet's bottom edge so the line stays clearly
       above the blooms in the revealed gap. */
    line.classList.add("is-on");
    line.style.bottom = Math.max(0, pull) + "px";
    line.style.transform = "translateX(-50%) scaleX(" + Math.max(0, Math.min(1, p)) + ")";
  }

  function syncSheetPadding() {
    var sheet = document.getElementById("pb-valley-sheet");
    if (!sheet) return;
    sheet.style.padding = getComputedStyle(document.body).padding;
  }

  function setActive(on) {
    document.documentElement.classList.toggle("pb-valley-active", !!on);
    if (on) {
      try { window.scrollTo(0, 0); } catch (err) {}
      syncSheetPadding();
    } else {
      var sheet = document.getElementById("pb-valley-sheet");
      if (sheet) sheet.style.padding = "";
    }
    if (ink) ink.classList.toggle("is-on", !!on);
    if (grain) grain.classList.toggle("is-on", !!on);
  }

  function applyPullVisual() {
    var p = progress();
    setActive(p > 0.001 || mode === "dive" || mode === "exit");
    setHomeY(pull, 1);
    setLine(p);
    paintInk(p);
  }

  function worldSrc() {
    var u = new URL("/world/?embed=1", location.origin);
    ["sky", "wx", "at", "season"].forEach(function (k) {
      if (qs.get(k)) u.searchParams.set(k, qs.get(k));
    });
    u.searchParams.set("v", "20261113r");
    return u.pathname + u.search;
  }

  function beginLoad() {
    if (worldLoading || worldReady) return;
    worldLoading = true;
    loadStartedAt = performance.now();
    cacheEls();
    if (!frame) return;
    frame.classList.add("is-on");
    frame.style.opacity = "0";
    frame.src = worldSrc();
  }

  function postWorld(type, extra) {
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage(Object.assign({ source: "pb-home", type: type }, extra || {}), location.origin);
    } catch (err) {}
  }

  function vibrate() {
    try {
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (err) {}
  }

  function addPull(delta) {
    if (mode === "world" || mode === "dive" || mode === "exit") return;
    if (freezePull) return;
    if (mode === "snap") return;
    if (!onLogin() && location.hash !== "#world") return;
    beginLoad();
    pulling = true;
    mode = "pull";
    document.documentElement.classList.add("pb-valley-active");
    pull = Math.max(0, pull + delta * RUBBER);
    var th = thresholdPx();
    if (pull >= th && !crossedThreshold) {
      crossedThreshold = true;
      vibrate();
    }
    if (pull < th * 0.85) crossedThreshold = false;
    applyPullVisual();
  }

  function releasePull() {
    if (mode !== "pull") return;
    pulling = false;
    if (pull >= thresholdPx()) commitDive();
    else snapBack();
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function animate(duration, fn, done) {
    var t0 = performance.now();
    function tick(now) {
      var u = Math.min(1, (now - t0) / duration);
      fn(u, now);
      if (u < 1) requestAnimationFrame(tick);
      else if (done) done();
    }
    requestAnimationFrame(tick);
  }

  function snapBack() {
    mode = "snap";
    var from = pull;
    animate(SNAP_MS, function (u) {
      pull = from * (1 - easeOutCubic(u));
      applyPullVisual();
    }, function () {
      pull = 0;
      applyPullVisual();
      setActive(false);
      clearHomeSlide();
      if (grain) grain.classList.remove("is-on");
      mode = "home";
      crossedThreshold = false;
    });
  }

  function enterHash() {
    if (location.hash === "#world") return;
    pushedHash = true;
    history.pushState({ pbWorld: 1 }, "", "#world");
  }
  function leaveHash() {
    if (pushedHash) {
      pushedHash = false;
      ignorePop = true;
      history.back();
      setTimeout(function () { ignorePop = false; }, 100);
      return;
    }
    if (location.hash === "#world") {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function showWorldFrame(opacity) {
    if (!frame) return;
    frame.classList.add("is-on");
    frame.style.opacity = String(opacity);
    frame.setAttribute("aria-hidden", opacity > 0.5 ? "false" : "true");
  }

  function waitWorld(kind) {
    return new Promise(function (resolve) {
      if (kind === "ready" && worldReady) return resolve();
      if (kind === "landed" && worldLanded) return resolve();
      var t0 = performance.now();
      var id = setInterval(function () {
        if (kind === "ready" && worldReady) { clearInterval(id); resolve(); }
        else if (kind === "landed" && worldLanded) { clearInterval(id); resolve(); }
        else if (performance.now() - t0 > 60000) { clearInterval(id); resolve(); }
      }, 50);
    });
  }

  function commitDive() {
    if (mode === "dive" || mode === "world") return;
    mode = "dive";
    pulling = false;
    beginLoad();
    enterHash();
    setActive(true);
    if (reduce) {
      reducedEnter();
      return;
    }
    var fromPull = pull;
    var h = vh();
    /* 0-600ms: home slides up and away, blooms fill the screen, morph into world clouds. */
    animate(HOME_SLIDE_MS, function (u) {
      var e = easeInOut(u);
      pull = fromPull + (h - fromPull) * e;
      setHomeY(h * e + fromPull * (1 - e), 1 - e * 0.15);
      setLine(1);
      paintInk(1 + e * 3);
      if (worldReady) showWorldFrame(e);
    }, function () {
      setHomeY(h, 0);
      setLine(0);
      function beginDrop() {
        showWorldFrame(1);
        postWorld("start-dive");
        animate(280, function (u) {
          if (ink) ink.style.opacity = String(1 - u);
          if (grain) grain.style.opacity = String(0.28 * (1 - u));
        }, function () {
          if (ink) { ink.classList.remove("is-on"); ink.style.opacity = ""; }
          if (grain) { grain.classList.remove("is-on"); grain.style.opacity = ""; }
        });
      }
      if (worldReady) beginDrop();
      else waitWorld("ready").then(beginDrop);
    });
    /* Landing is announced by the iframe after the 1.8s drop. */
  }


  /* App-wide CSS sets transition-duration to 0.01ms !important under
     prefers-reduced-motion, so the required 400ms crossfade is driven here
     on a wall clock (rAF plus a 16ms interval, same idea as the embed dive). */
  function fadeClock(ms, step, done) {
    /* Start the clock on the first tick so a delayed first frame cannot
       jump u straight to 1 and snap the crossfade. */
    var t0 = null;
    var finished = false;
    function tick(now) {
      if (finished) return;
      if (t0 == null) {
        t0 = now;
        step(0);
        return;
      }
      var u = Math.min(1, (now - t0) / ms);
      step(u);
      if (u >= 1) {
        finished = true;
        clearInterval(id);
        if (done) done();
      }
    }
    var id = setInterval(function () { tick(performance.now()); }, 16);
    requestAnimationFrame(tick);
  }

  function fadeSheets(from, to, ms, done) {
    var sheet = ensureHomeSheet();
    fadeClock(ms, function (u) {
      var v = from + (to - from) * u;
      sheet.style.transition = "none";
      sheet.style.opacity = String(v);
    }, done);
  }

  function fadeFrame(from, to, ms, done) {
    if (!frame) { if (done) done(); return; }
    frame.style.transition = "none";
    fadeClock(ms, function (u) {
      frame.style.opacity = String(from + (to - from) * u);
    }, done);
  }

  function reducedEnter() {
    beginLoad();
    enterHash();
    waitWorld("ready").then(function () {
      postWorld("start-dive");
      /* Start the iframe transparent and fade it in over the home. Setting
         it to 1 immediately would cover the card (iframe z-index is 4). */
      showWorldFrame(0);
      fadeFrame(0, 1, FADE_MS);
      fadeSheets(1, 0, FADE_MS, function () {
        document.documentElement.classList.add("pb-in-world");
        document.documentElement.classList.remove("pb-valley-active");
        setActive(false);
        mode = "world";
      });
    });
  }

  function onLanded() {
    worldLanded = true;
    if (mode !== "dive" && mode !== "world") return;
    document.documentElement.classList.add("pb-in-world");
    document.documentElement.classList.remove("pb-valley-active");
    showWorldFrame(1);
    setActive(false);
    pull = 0;
    if (ink) {
      clearInk();
      ink.classList.remove("is-on");
    }
    if (grain) grain.classList.remove("is-on");
    setLine(0);
    mode = "world";
  }

  function startExit() {
    if (mode !== "world" && mode !== "dive") return;
    if (mode === "exit") return;
    mode = "exit";
    worldLanded = false;
    document.documentElement.classList.remove("pb-in-world");
    document.documentElement.classList.add("pb-valley-active");
    setActive(true);
    if (reduce) {
      reducedExit();
      return;
    }
    postWorld("start-exit");
    var h = vh();
    setHomeY(h, 0);
    showWorldFrame(1);
    /* Clouds lift for 1.8s; in the last 600ms home slides back and ink drains. */
    var liftDone = false;
    var t0 = performance.now();
    function tick(now) {
      var t = now - t0;
      var liftU = Math.min(1, t / DIVE_MS);
      var slideStart = DIVE_MS - HOME_SLIDE_MS;
      if (t >= slideStart) {
        var s = easeInOut(Math.min(1, (t - slideStart) / HOME_SLIDE_MS));
        var remain = h * (1 - s);
        setHomeY(remain, s);
        paintInk((1 - s) * 3);
        setLine(1 - s);
        showWorldFrame(1 - s);
      } else {
        setHomeY(h, 0);
        paintInk(3);
        showWorldFrame(1);
      }
      if (t < DIVE_MS && !liftDone) requestAnimationFrame(tick);
      else finishExit();
    }
    function finishExit() {
      if (liftDone) return;
      liftDone = true;
      pull = 0;
      applyPullVisual();
      setActive(false);
      clearHomeSlide();
      showWorldFrame(0);
      if (frame) {
        frame.classList.remove("is-on");
        /* Keep the iframe so a return trip is instant; park it in the clouds. */
        postWorld("hold-clouds");
        worldReady = true;
        worldLanded = false;
      }
      leaveHash();
      mode = "home";
      crossedThreshold = false;
    }
    requestAnimationFrame(tick);
    /* If the world never answers, still finish on the 2.5s clock. */
    setTimeout(function () { if (mode === "exit") finishExit(); }, DIVE_MS + 80);
  }

  function reducedExit() {
    markHomeSlide();
    showWorldFrame(1);
    fadeSheets(0, 1, FADE_MS, function () {
      document.documentElement.classList.remove("pb-in-world", "pb-valley-active");
      if (frame) frame.classList.remove("is-on");
      clearHomeSlide();
      postWorld("hold-clouds");
      worldLanded = false;
      leaveHash();
      mode = "home";
    });
    fadeFrame(1, 0, FADE_MS);
  }

  function onWheel(e) {
    if (mode === "world" || mode === "dive" || mode === "exit") return;
    if (freezePull) return;
    if (isFormTarget(e.target)) return;
    if (!onLogin()) return;
    var down = e.deltaY > 0;
    if (!down && pull <= 0 && mode === "home") return;
    if (!down && (mode === "pull" || pull > 0)) {
      e.preventDefault();
      addPull(e.deltaY);
      return;
    }
    if (down && (atPageBottom() || pull > 0)) {
      e.preventDefault();
      addPull(e.deltaY);
    }
  }
  function onWheelEnd() {
    if (mode === "pull" && !pulling) return;
    /* Wheel has no pointerup; debounce release. */
  }
  var wheelIdle = 0;
  function onWheelDebounced(e) {
    onWheel(e);
    if (mode !== "pull") return;
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(function () {
      pulling = false;
      releasePull();
    }, 120);
  }

  function onTouchStart(e) {
    if (mode === "world" || mode === "dive" || mode === "exit") return;
    if (isFormTarget(e.target)) return;
    if (!onLogin()) return;
    if (!atPageBottom() && pull <= 0) return;
    if (e.touches.length !== 1) return;
    startTouches = { y: e.touches[0].clientY, t: performance.now() };
  }
  function onTouchMove(e) {
    if (!startTouches) return;
    if (mode === "world" || mode === "dive" || mode === "exit") return;
    var y = e.touches[0].clientY;
    var dy = startTouches.y - y; /* finger up = scroll down = positive */
    startTouches.y = y;
    if (dy > 0 || pull > 0) {
      e.preventDefault();
      addPull(dy);
    }
  }
  function onTouchEnd() {
    startTouches = null;
    if (mode === "pull") releasePull();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      if (mode === "world" || mode === "dive") startExit();
      return;
    }
    if (isFormTarget(e.target)) return;
    if (mode !== "home" && mode !== "pull") return;
    if (!onLogin() && location.hash !== "#world") return;
    if (e.key === "ArrowDown" && (atPageBottom() || pull > 0)) {
      e.preventDefault();
      addPull(28);
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(function () { pulling = false; releasePull(); }, 160);
    }
  }

  function onMessage(e) {
    if (e.origin !== location.origin) return;
    var d = e.data || {};
    if (d.source !== "pb-world") return;
    if (d.type === "ready") {
      worldReady = true;
      if (mode === "dive" && !worldLanded) postWorld("start-dive");
    } else if (d.type === "landed") {
      worldLanded = true;
      /* During the reduced-motion fade, do not raise the iframe over the
         fading home; reducedEnter finishes that sequence itself. */
      if (!(reduce && mode === "dive")) onLanded();
    } else if (d.type === "exit-gesture") {
      if (mode === "world") startExit();
    } else if (d.type === "exit-done") {
      /* Visual exit is already timed on the parent. */
    }
  }

  function openFromHint(e) {
    if (e) e.preventDefault();
    if (mode === "world" || mode === "dive") return;
    beginLoad();
    if (reduce) {
      mode = "dive";
      reducedEnter();
      return;
    }
    /* Keyboard/click: treat as a commit past the threshold. */
    pull = thresholdPx();
    applyPullVisual();
    commitDive();
  }

  /* ---- capture / preview helpers ---- */
  function gotoState(name) {
    return new Promise(function (resolve) {
      freezePull = true;
      if (name !== "hint") beginLoad();
      if (name === "hint") {
        pull = 0;
        mode = "home";
        setActive(false);
        clearHomeSlide();
        applyPullVisual();
        resolve();
        return;
      }
      if (name === "pull20") {
        mode = "pull";
        pull = thresholdPx() * 0.2;
        applyPullVisual();
        resolve();
        return;
      }
      if (name === "threshold") {
        mode = "pull";
        pull = thresholdPx();
        applyPullVisual();
        resolve();
        return;
      }
      if (name === "snapback") {
        mode = "pull";
        pull = thresholdPx() * 0.6;
        freezePull = false;
        applyPullVisual();
        snapBack();
        setTimeout(resolve, SNAP_MS + 40);
        return;
      }
      if (name === "midcloud" || name === "landing") {
        mode = "dive";
        pull = vh();
        setActive(true);
        setHomeY(vh(), 0);
        setLine(0);
        waitWorld("ready").then(function () {
          showWorldFrame(1);
          if (name === "midcloud") {
            try {
              var w = frame && frame.contentWindow && frame.contentWindow.__world;
              if (w && w.holdDiveAt) w.holdDiveAt(0.5);
            } catch (err) {}
            setTimeout(resolve, 120);
            return;
          }
          postWorld("start-dive");
          waitWorld("landed").then(function () {
            onLanded();
            var waited = 0;
            var id = setInterval(function () {
              waited += 200;
              var ready = false;
              try {
                var w2 = frame && frame.contentWindow && frame.contentWindow.__world;
                ready = !!(w2 && w2.jhsModelReady);
              } catch (err) {}
              if (ready || waited >= 8000) { clearInterval(id); resolve(); }
            }, 200);
          });
        });
        return;
      }
      resolve();
    });
  }

  function init() {
    ensureDom();
    cacheEls();
    if (hint) hint.addEventListener("click", openFromHint);
    window.addEventListener("wheel", onWheelDebounced, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("message", onMessage);
    window.addEventListener("popstate", function () {
      if (ignorePop) return;
      if (mode === "world" || mode === "dive") startExit();
      else if (location.hash === "#world") openDirect();
    });
    if (location.hash === "#world") openDirect();
    /* Sky canvas is inserted on DOMContentLoaded; wrap after it exists. */
    ensureHomeSheet();
    setTimeout(ensureHomeSheet, 0);
    var want = qs.get("pbValley");
    if (want) {
      /* Used by the frame-capture script. */
      if (document.readyState === "complete") gotoState(want);
      else window.addEventListener("load", function () { gotoState(want); });
    }
    window.__hiddenWorld = {
      mode: function () { return mode; },
      pull: function () { return pull; },
      progress: progress,
      threshold: thresholdPx,
      goto: gotoState,
      commit: commitDive,
      exit: startExit,
      reduce: reduce
    };
  }

  function openDirect() {
    beginLoad();
    if (reduce) {
      mode = "dive";
      reducedEnter();
    } else {
      pull = thresholdPx();
      applyPullVisual();
      commitDive();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
