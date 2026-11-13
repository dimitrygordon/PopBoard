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
  var GRAPHITE = [42, 33, 24];
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
    var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(str || "");
    return m ? [+m[1], +m[2], +m[3]] : null;
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
    var inkEl = document.createElement("canvas");
    inkEl.id = "pb-valley-ink";
    inkEl.setAttribute("aria-hidden", "true");
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

  function markHomeSlide() {
    if (sheetEls.length) return;
    var ids = ["login", "teacherLogin", "teacherSignup", "boardNameEntry", "la-sky"];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) { el.classList.add("pb-home-slide"); sheetEls.push(el); }
    });
    document.querySelectorAll("a.study-pill").forEach(function (el) {
      el.classList.add("pb-home-slide");
      sheetEls.push(el);
    });
  }

  function setHomeY(px, opacity) {
    markHomeSlide();
    var t = "translateY(" + (-px) + "px)";
    for (var i = 0; i < sheetEls.length; i++) {
      sheetEls[i].style.transform = t;
      if (opacity != null) sheetEls[i].style.opacity = String(opacity);
    }
  }
  function clearHomeSlide() {
    for (var i = 0; i < sheetEls.length; i++) {
      sheetEls[i].style.transform = "";
      sheetEls[i].style.opacity = "";
    }
  }

  function seedBlooms() {
    blooms = [];
    var n = 7;
    for (var i = 0; i < n; i++) {
      blooms.push({
        x: 0.08 + (i / (n - 1)) * 0.84 + (Math.sin(i * 2.7) * 0.04),
        r: 0.16 + (i % 3) * 0.05,
        phase: i * 1.3,
        graphite: i % 2 === 0
      });
    }
  }

  function progress() {
    return Math.max(0, Math.min(1, pull / Math.max(1, thresholdPx())));
  }

  function paintInk(fillFrac) {
    if (!ink) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    if (ink.width !== Math.round(w * dpr) || ink.height !== Math.round(h * dpr)) {
      ink.width = Math.round(w * dpr);
      ink.height = Math.round(h * dpr);
      ink.style.width = w + "px";
      ink.style.height = h + "px";
    }
    var ctx = ink.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var p = fillFrac == null ? progress() : fillFrac;
    if (p <= 0.001) return;
    /* Blooms stay at most 25% of the viewport during the pull; on the dive they fill. */
    var maxH = (p > 1 ? p : Math.min(1, p)) * (p > 1 ? h : (BLOOM_MAX_FRAC * h));
    if (p <= 1) maxH = Math.min(BLOOM_MAX_FRAC * h, p * BLOOM_MAX_FRAC * h * 1.05);
    else maxH = Math.min(h, BLOOM_MAX_FRAC * h + (p - 1) * h);
    var blue = skyBlue();
    if (!blooms.length) seedBlooms();
    for (var i = 0; i < blooms.length; i++) {
      var b = blooms[i];
      var cx = b.x * w;
      var rise = maxH * (0.65 + 0.35 * Math.sin(b.phase + p * 2));
      var cy = h - rise * 0.45;
      var rad = Math.max(24, (0.28 + 0.55 * p) * b.r * w);
      var col = b.graphite ? GRAPHITE : blue;
      var a = (b.graphite ? 0.28 : 0.34) * Math.min(1, 0.35 + p);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + a + ")");
      g.addColorStop(0.55, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (a * 0.45) + ")");
      g.addColorStop(1, "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Soft wet-paper darkening near the bottom. */
    var wet = ctx.createLinearGradient(0, h - maxH, 0, h);
    wet.addColorStop(0, "rgba(42,33,24,0)");
    wet.addColorStop(1, "rgba(42,33,24," + (0.10 + 0.10 * Math.min(1, p)) + ")");
    ctx.fillStyle = wet;
    ctx.fillRect(0, h - maxH, w, maxH);

    if (grain) {
      grain.classList.add("is-on");
      var maskH = Math.max(8, maxH);
      grain.style.webkitMaskImage = "linear-gradient(to top, #000 0%, #000 " + Math.max(0, (1 - maskH / h) * 100) + "%, transparent 100%)";
      grain.style.maskImage = grain.style.webkitMaskImage;
      /* Keep grain only over the bloom band (from the bottom). */
      grain.style.webkitMaskImage = "linear-gradient(to top, #000 0%, #000 " + (maskH / h * 100) + "%, transparent " + (maskH / h * 140) + "%)";
      grain.style.maskImage = grain.style.webkitMaskImage;
    }
  }

  function setLine(p) {
    if (!line) return;
    if (p <= 0.001) {
      line.classList.remove("is-on");
      line.style.transform = "translateX(-50%) scaleX(0)";
      return;
    }
    line.classList.add("is-on");
    line.style.transform = "translateX(-50%) scaleX(" + Math.max(0, Math.min(1, p)) + ")";
  }

  function setActive(on) {
    document.documentElement.classList.toggle("pb-valley-active", !!on);
    if (ink) ink.classList.toggle("is-on", !!on);
    if (grain) grain.classList.toggle("is-on", !!on);
  }

  function applyPullVisual() {
    var p = progress();
    setActive(p > 0.001 || mode === "dive" || mode === "exit");
    setHomeY(pull, 1);
    setLine(p);
    paintInk(p);
    if (edge) edge.style.background = "linear-gradient(to bottom, " + PAPER + ", " + skyBot() + ")";
  }

  function worldSrc() {
    var u = new URL("/world/?embed=1", location.origin);
    ["sky", "wx", "at", "season"].forEach(function (k) {
      if (qs.get(k)) u.searchParams.set(k, qs.get(k));
    });
    u.searchParams.set("v", "20261113e");
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
    var t0 = performance.now();
    var finished = false;
    function tick(now) {
      if (finished) return;
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
    markHomeSlide();
    fadeClock(ms, function (u) {
      var v = from + (to - from) * u;
      for (var i = 0; i < sheetEls.length; i++) {
        sheetEls[i].style.transition = "none";
        sheetEls[i].style.opacity = String(v);
      }
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
      var ctx = ink.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, ink.width, ink.height);
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
      beginLoad();
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
