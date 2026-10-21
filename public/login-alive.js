/* login-alive.js — purely decorative motion layer for the login screens.
   Never touches auth logic; every hook is defensive and no-ops when its
   elements are missing. */
(function () {
  "use strict";
  if (window.__loginAlive) return; window.__loginAlive = true;
  var doc = document, win = window;
  var reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PANELS = ["login", "teacherLogin", "teacherSignup"];
  var LOGOS = { login: "login-logo-img", teacherLogin: "teacher-logo-img", teacherSignup: "teacher-signup-logo-img" };
  var BASE = "/login-alive/";
  // part rects in source-PNG pixels (3000x3000), produced by tools/slice.py
  var S = 3000;
  var PARTS = {
    tassel: [700, 640, 260, 750], browL: [982, 1200, 183, 125], browR: [1678, 1183, 194, 125],
    eyeL: [979, 1385, 238, 315], eyeR: [1632, 1369, 238, 315], mouth: [1209, 1633, 420, 317]
  };
  var mouse = { x: -9999, y: -9999, vx: 0, vy: 0, has: false, t: 0 };
  var rigs = [];
  var lastSubmit = 0;

  function $(id) { return doc.getElementById(id); }
  function visible(el) { return !!el && !el.classList.contains("hidden") && el.offsetParent !== null; }
  function activePanel() { for (var i = 0; i < PANELS.length; i++) { var p = $(PANELS[i]); if (visible(p)) return p; } return null; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function spring(k, d) { return { x: 0, v: 0, t: 0, k: k, d: d, step: function (dt) { var a = -this.k * (this.x - this.t) - this.d * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; } }; }

  /* ---------------- mascot rig ---------------- */
  function buildRig(panel, img) {
    if (!img || img.closest(".la-logo")) return null;
    var wrap = doc.createElement("span");
    wrap.className = "la-logo"; wrap.tabIndex = -1;
    img.parentNode.insertBefore(wrap, img); wrap.appendChild(img); img.classList.add("la-src");
    if (reduce) return null;
    var rig = doc.createElement("div"); rig.className = "la-rig"; rig.setAttribute("aria-hidden", "true");
    var base = new Image(); base.className = "la-base"; base.alt = ""; base.src = BASE + "base.png"; rig.appendChild(base);
    var els = {}, pending = 1;
    Object.keys(PARTS).forEach(function (k) {
      var r = PARTS[k], el = new Image(); el.alt = ""; el.src = BASE + k + ".png";
      el.style.left = (r[0] / S * 100) + "%"; el.style.top = (r[1] / S * 100) + "%";
      el.style.width = (r[2] / S * 100) + "%"; el.style.height = (r[3] / S * 100) + "%";
      if (k === "tassel") el.style.transformOrigin = "82.7% 5.3%";
      if (k === "mouth") el.style.transformOrigin = "50% 30%";
      if (k.indexOf("eye") === 0) el.style.transformOrigin = "50% 55%";
      pending++; el.onload = done; el.onerror = fail; rig.appendChild(el); els[k] = el;
    });
    [[29.5, 57.5], [62.5, 57]].forEach(function (p) { var b = doc.createElement("i"); b.className = "la-blush"; b.style.left = p[0] + "%"; b.style.top = p[1] + "%"; rig.appendChild(b); });
    base.onload = done; base.onerror = fail;
    var failed = false;
    function done() { if (--pending === 0 && !failed) { wrap.classList.add("la-ready"); } }
    function fail() { failed = true; wrap.classList.remove("la-ready"); }
    wrap.appendChild(rig);
    var R = {
      panel: panel, wrap: wrap, rig: rig, els: els,
      tiltX: spring(120, 14), tiltY: spring(120, 14), tassel: spring(60, 4.5),
      hopY: spring(260, 11), sq: spring(300, 12), shake: spring(400, 9),
      eyeX: spring(260, 22), eyeY: spring(260, 22), brow: spring(200, 18), worry: spring(150, 14),
      smile: spring(220, 14), lid: spring(900, 40), nod: spring(320, 16), yawn: spring(140, 15),
      idle: null, juggler: null,
      nextBlink: performance.now() + 1500 + Math.random() * 3000, blinkUntil: 0, dbl: false,
      nextKernel: performance.now() + 4000 + Math.random() * 4000, hover: false, shy: false, peek: false
    };
    R.lid.x = R.lid.t = 1; R.sq.x = R.sq.t = 1;
    rig.addEventListener("pointerenter", function () { R.hover = true; });
    rig.addEventListener("pointerleave", function () { R.hover = false; });
    rig.addEventListener("click", function () { hop(R, 1); popKernel(R); });
    return R;
  }
  function hop(R, s) { R.hopY.v -= 260 * s; R.sq.v -= 5 * s; }

  function popKernel(R, burst) {
    var n = burst ? 14 : 1;
    for (var i = 0; i < n; i++) (function () {
      var k = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      k.setAttribute("viewBox", "0 0 20 20"); k.setAttribute("class", "la-kernel");
      k.innerHTML = '<path d="M10 2c2 0 3 1.5 3.4 2.6 1.6-.6 3.6.4 3.6 2.5 0 1-.4 1.6-1 2 1.2.6 1.8 1.7 1.4 3-.4 1.4-1.8 2-3 1.7-.3 1.7-1.7 2.7-3.4 2.7S6.9 15.5 6.6 13.8c-1.2.3-2.6-.3-3-1.7-.4-1.3.2-2.4 1.4-3-.6-.4-1-1-1-2C4 5 6 4 7.6 4.6 8 3.5 8.9 2 10 2z" fill="#fff6dc" stroke="#2a2118" stroke-width="1.3"/><path d="M8 15.5c.8 1.3 3.2 1.3 4 0l-.4 2.3c-.8.6-2.4.6-3.2 0z" fill="#f2c46b" stroke="#2a2118" stroke-width="1"/>';
      R.rig.appendChild(k);
      var a = burst ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - .5) * 1.4;
      var sp = burst ? 120 + Math.random() * 160 : 140 + Math.random() * 60;
      var vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - (burst ? 60 : 40), x = 0, y = 0, rot = 0, vr = (Math.random() - .5) * 720, t0 = performance.now(), last = t0;
      function f(now) {
        var dt = Math.min(.05, (now - last) / 1000); last = now;
        vy += 520 * dt; x += vx * dt; y += vy * dt; rot += vr * dt;
        var life = (now - t0) / 1000, o = clamp(1.4 - life * 1.3, 0, 1);
        k.style.transform = "translate(" + x + "px," + y + "px) rotate(" + rot + "deg) scale(" + Math.min(1, life * 6) + ")";
        k.style.opacity = o;
        if (o > 0) requestAnimationFrame(f); else k.remove();
      }
      requestAnimationFrame(f);
    })();
  }

  function updateRig(R, now, dt) {
    if (!visible(R.panel)) return;
    var b = R.wrap.getBoundingClientRect();
    var cx = b.left + b.width / 2, cy = b.top + b.height * 0.5;
    var dx = mouse.has ? mouse.x - cx : 0, dy = mouse.has ? mouse.y - cy : 0;
    var dist = Math.hypot(dx, dy) || 1;
    var near = clamp(1 - (dist - 60) / 220, 0, 1);
    // tilt toward cursor
    R.tiltX.t = clamp(dx / 40, -9, 9); R.tiltY.t = clamp(dy / 60, -6, 6);
    // eyes (whole eye shifts: pupils)
    var r = b.width * 0.022, ang = Math.atan2(dy, dx), m = Math.min(1, dist / 160);
    var ex = mouse.has ? Math.cos(ang) * r * m : 0, ey = mouse.has ? Math.sin(ang) * r * 0.8 * m : 0;
    if (R.shy && !R.peek) { ex = -r * 1.1; ey = r * 0.6; }
    R.eyeX.t = ex; R.eyeY.t = ey;
    R.brow.t = R.shy ? 0 : near; R.smile.t = R.hover ? 1 : near * 0.35;
    // tassel lags fast horizontal mouse motion
    R.tassel.t = R.tiltX.x * -1.2; R.tassel.v += clamp(-mouse.vx * 0.0025, -30, 30);
    // typing energy feeds the tassel
    if (typing.energy > 0.02) R.tassel.v += (Math.random() - .5) * typing.energy * 60 * dt * 60 * 0.15;
    // idle personality overrides
    var yawnT = 0;
    if (R.idle) {
      var I = R.idle, u = (now - I.t0) / I.dur;
      if (u >= 1) { endIdle(R); R.idleNext = now + 1500 + Math.random() * 2000; }
      else if (I.kind === "look") {
        var sweep = Math.sin(u * Math.PI * 3) * (u < .85 ? 1 : (1 - u) / .15);
        R.eyeX.t = sweep * r * 1.2; R.eyeY.t = -r * 0.3; R.tiltX.t = sweep * 7; R.brow.t = 0.4 + 0.4 * Math.abs(sweep);
      } else if (I.kind === "yawn") {
        yawnT = Math.sin(clamp(u, 0, 1) * Math.PI); yawnT = yawnT * yawnT;
        R.yawn.t = yawnT; R.lid.t = 1 - yawnT * 0.8; R.tiltY.t = -yawnT * 5; R.brow.t = yawnT * 0.8; R.eyeX.t = 0; R.eyeY.t = 0;
      } else if (I.kind === "juggle") {
        var jt = (now - I.t0) / 1000, ph = (jt % 0.75) / 0.75, jy = -Math.sin(ph * Math.PI) * b.width * 0.55, jx = Math.sin(jt * 4.2) * b.width * 0.05;
        if (R.juggler) R.juggler.style.transform = "translate(" + jx + "px," + (jy - b.width * 0.12) + "px) rotate(" + (jt * 400) + "deg)";
        R.eyeX.t = jx * 0.15; R.eyeY.t = clamp(jy / b.width, -1, 0) * r * 1.4; R.brow.t = 0.6; R.smile.t = 0.7;
        if (ph < 0.08 && !I.bumped) { I.bumped = true; R.sq.v -= 1.6; } if (ph > 0.5) I.bumped = false;
      }
    } else if (!R.shy && visible(R.panel) && now - lastInput > IDLE_MS && now > (R.idleNext || 0)) startIdle(R, now);
    // blink scheduling
    if (now > R.nextBlink) { R.blinkUntil = now + 110; R.dbl = Math.random() < 0.22; R.nextBlink = now + (R.dbl ? 230 : 3000 + Math.random() * 3000); if (R.dbl) R.dbl = false; }
    var closed = now < R.blinkUntil || (R.shy && !R.peek);
    R.lid.t = closed ? 0.08 : 1;
    if (yawnT) R.lid.t = Math.min(R.lid.t, 1 - yawnT * 0.8);
    if (now > R.nextKernel) { popKernel(R); R.nextKernel = now + 5000 + Math.random() * 6000; }
    ["tiltX", "tiltY", "tassel", "hopY", "sq", "shake", "eyeX", "eyeY", "brow", "worry", "smile", "lid", "nod", "yawn"].forEach(function (k) { R[k].step(dt); });
    var sq = R.sq.x, s = b.width / 150;
    R.rig.style.transform = "translate(" + (R.shake.x * s) + "px," + (Math.min(0, R.hopY.x) * 0.1 * s) + "px) perspective(500px) rotateY(" + R.tiltX.x + "deg) rotateX(" + (-R.tiltY.x - R.nod.x * 9) + "deg) rotate(" + (R.tiltX.x * 0.35 + R.shake.x * 0.3) + "deg) scale(" + (2 - sq) + "," + sq + ")";
    var e = R.els, lid = clamp(R.lid.x, 0.06, 1.05);
    var peekL = R.shy && R.peek ? 1 : lid;
    if (e.eyeL) e.eyeL.style.transform = "translate(" + R.eyeX.x + "px," + R.eyeY.x + "px) scaleY(" + peekL + ")";
    if (e.eyeR) e.eyeR.style.transform = "translate(" + R.eyeX.x + "px," + R.eyeY.x + "px) scaleY(" + (R.shy && R.peek ? 0.08 : lid) + ")";
    var lift = -R.brow.x * b.width * 0.03, w = R.worry.x;
    if (e.browL) e.browL.style.transform = "translateY(" + (lift + w * 2) + "px) rotate(" + (w * -14 + R.brow.x * -4) + "deg)";
    if (e.browR) e.browR.style.transform = "translateY(" + (lift + w * 2) + "px) rotate(" + (w * 14 + R.brow.x * 4) + "deg)";
    var yw = clamp(R.yawn.x, 0, 1.2);
    if (e.mouth) e.mouth.style.transform = "scale(" + (1 + R.smile.x * 0.16 - w * 0.12 - yw * 0.22) + "," + (1 + R.smile.x * 0.1 - w * 0.3 + yw * 0.85) + ")";
    if (e.tassel) e.tassel.style.transform = "rotate(" + clamp(R.tassel.x, -28, 28) + "deg)";
  }

  /* ---------------- idle personality ---------------- */
  var IDLE_MS = 10000, lastInput = performance.now();
  var IDLE_KINDS = [["yawn", 2200], ["look", 2600], ["juggle", 3000]];
  function startIdle(R, now) {
    var pick = IDLE_KINDS[Math.random() * IDLE_KINDS.length | 0];
    if (R.lastIdle === pick[0]) pick = IDLE_KINDS[(IDLE_KINDS.indexOf(pick) + 1) % IDLE_KINDS.length];
    R.lastIdle = pick[0]; R.idle = { kind: pick[0], t0: now, dur: pick[1] };
    R.wrap.setAttribute("data-la-idle", pick[0]);
    if (pick[0] === "juggle") { var k = kernelSvg(); k.classList.add("la-juggle"); R.rig.appendChild(k); R.juggler = k; }
  }
  function endIdle(R) {
    R.idle = null; R.wrap.removeAttribute("data-la-idle"); R.yawn.t = 0; R.lid.t = 1;
    if (R.juggler) { R.juggler.remove(); R.juggler = null; }
  }
  function poke() { lastInput = performance.now(); for (var i = 0; i < rigs.length; i++) if (rigs[i].idle) { endIdle(rigs[i]); rigs[i].idleNext = 0; } }
  ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "focusin"].forEach(function (ev) { win.addEventListener(ev, poke, { passive: true, capture: true }); });

  /* ---------------- typing reactions ---------------- */
  var typing = { last: 0, energy: 0 };
  doc.addEventListener("keydown", function (e) {
    var t = e.target; if (!t || t.tagName !== "INPUT" || t.type === "password" || t.__laPw) return;
    if (e.key && e.key.length !== 1 && e.key !== "Backspace") return;
    var R = rigFor(t); if (!R) return;
    var now = performance.now(), gap = now - typing.last; typing.last = now;
    var rate = clamp(1 - (gap - 60) / 440, 0, 1); // fast typing (<~100ms gaps) → 1
    typing.energy = clamp(typing.energy * 0.6 + rate * 0.6, 0, 1.2);
    R.nod.v += 5 + rate * 4; R.tassel.v += (Math.random() < .5 ? -1 : 1) * (40 + 220 * typing.energy);
  }, true);

  /* ---------------- time-of-day mood ---------------- */
  // stops: [hour, skyTop, skyBottom, glow, kernelA, kernelB]
  var MOOD = [
    [0,  [12, 18, 42], [24, 30, 66], [255, 170, 80, .20], [255, 196, 110, .32], [255, 236, 200, .26]],
    [5,  [24, 28, 60], [70, 52, 82], [255, 170, 90, .20], [255, 190, 110, .38], [255, 230, 200, .34]],
    [7,  [255, 214, 160], [255, 238, 214], [255, 180, 80, .30], [232, 150, 50, .65], [255, 244, 214, .95]],
    [10, [255, 236, 200], [252, 248, 240], [255, 196, 92, .24], [232, 170, 70, .66], [255, 240, 205, .95]],
    [14, [214, 234, 255], [246, 249, 255], [255, 205, 110, .22], [225, 170, 80, .58], [255, 246, 222, .95]],
    [17, [255, 200, 150], [250, 224, 210], [255, 160, 80, .28], [236, 140, 60, .62], [255, 236, 206, .9]],
    [19, [80, 56, 96], [150, 92, 96], [255, 160, 80, .22], [255, 180, 100, .45], [255, 228, 196, .5]],
    [21, [14, 20, 48], [28, 34, 72], [255, 170, 80, .20], [255, 196, 110, .32], [255, 236, 200, .26]],
    [24, [12, 18, 42], [24, 30, 66], [255, 170, 80, .20], [255, 196, 110, .32], [255, 236, 200, .26]]
  ];
  function mix(a, b, t) { var o = []; for (var i = 0; i < a.length; i++) o.push(a[i] + (b[i] - a[i]) * t); return o; }
  function rgb(c) { return (c.length > 3 ? "rgba(" : "rgb(") + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + (c.length > 3 ? "," + c[3].toFixed(3) : "") + ")"; }
  function moodHour() {
    var q = /[?&]la-hour=([\d.]+)/.exec(location.search);
    if (q) return parseFloat(q[1]) % 24;
    if (typeof win.__laHour === "number") return win.__laHour % 24;
    var d = new Date(); return d.getHours() + d.getMinutes() / 60;
  }
  function applyMood() {
    if (win.__laSky) { win.__laSky.update(); css = null; return; } // real sky system owns the palette
    var h = moodHour(), i = 0; while (i < MOOD.length - 2 && MOOD[i + 1][0] <= h) i++;
    var A = MOOD[i], B = MOOD[i + 1], t = (h - A[0]) / (B[0] - A[0]);
    t = t * t * (3 - 2 * t); // smoothstep between stops
    var top = mix(A[1], B[1], t), bot = mix(A[2], B[2], t), lum = (top[0] * .3 + top[1] * .59 + top[2] * .11) / 255;
    var st = doc.documentElement.style;
    st.setProperty("--la-sky-top", rgb(top)); st.setProperty("--la-sky-bot", rgb(bot));
    st.setProperty("--la-mood-glow", rgb(mix(A[3], B[3], t)));
    st.setProperty("--la-mood-kernel-a", rgb(mix(A[4], B[4], t))); st.setProperty("--la-mood-kernel-b", rgb(mix(A[5], B[5], t)));
    var night = lum < 0.42; doc.documentElement.setAttribute("data-la-mood", night ? "night" : "day");
    st.setProperty("--la-hour", h.toFixed(2)); css = null;
  }
  win.__laApplyMood = applyMood;

  /* ---------------- sign-in send-off ---------------- */
  var lastRect = null, sendoffUntil = 0;
  function kernelSvg() {
    var k = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    k.setAttribute("viewBox", "0 0 20 20"); k.setAttribute("class", "la-kernel"); k.setAttribute("aria-hidden", "true");
    k.innerHTML = '<path d="M10 2c2 0 3 1.5 3.4 2.6 1.6-.6 3.6.4 3.6 2.5 0 1-.4 1.6-1 2 1.2.6 1.8 1.7 1.4 3-.4 1.4-1.8 2-3 1.7-.3 1.7-1.7 2.7-3.4 2.7S6.9 15.5 6.6 13.8c-1.2.3-2.6-.3-3-1.7-.4-1.3.2-2.4 1.4-3-.6-.4-1-1-1-2C4 5 6 4 7.6 4.6 8 3.5 8.9 2 10 2z" fill="#fff6dc" stroke="#2a2118" stroke-width="1.3"/><path d="M8 15.5c.8 1.3 3.2 1.3 4 0l-.4 2.3c-.8.6-2.4.6-3.2 0z" fill="#f2c46b" stroke="#2a2118" stroke-width="1"/>';
    return k;
  }
  function sendOff(panel) {
    if (!lastRect || !lastRect.el) return;
    var src = lastRect.el, rc = lastRect.r;
    var ghost = src.cloneNode(true);
    [ghost].concat([].slice.call(ghost.querySelectorAll("[id]"))).forEach(function (n) { n.removeAttribute("id"); });
    ghost.querySelectorAll("input,button,a").forEach(function (n) { n.setAttribute("tabindex", "-1"); n.disabled = true; });
    ghost.classList.remove("hidden", "la-enter"); ghost.classList.add("la-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.cssText += ";position:fixed;left:" + rc.left + "px;top:" + rc.top + "px;width:" + rc.width + "px;height:" + rc.height + "px;margin:0 !important;";
    doc.body.appendChild(ghost);
    var rig = ghost.querySelector(".la-rig"), logo = ghost.querySelector(".la-logo");
    if (logo) logo.classList.add("la-cheer");
    // big DOM kernel burst from the mascot
    if (rig) {
      for (var i = 0; i < 26; i++) (function (i) {
        var k = kernelSvg(); k.classList.add("la-burst"); rig.appendChild(k);
        var a = (i / 26) * 6.283 + Math.random() * .3, sp = 260 + Math.random() * 380;
        k.__v = [Math.cos(a) * sp, Math.sin(a) * sp - 220, 0, 0, (Math.random() - .5) * 900, 0];
        burstEls.push({ k: k, t0: performance.now() });
      })(i);
    }
    sendoffUntil = performance.now() + 1600;
    doc.body.classList.add("la-sendoff");
    requestAnimationFrame(function () { ghost.classList.add("la-ghost-go"); });
    setTimeout(function () { ghost.remove(); burstEls.length = 0; doc.body.classList.remove("la-sendoff"); }, 1600);
  }
  var burstEls = [];
  function stepBurst(now, dt) {
    for (var i = 0; i < burstEls.length; i++) {
      var B = burstEls[i], v = B.k.__v, life = (now - B.t0) / 1000;
      v[1] += 700 * dt; v[2] += v[0] * dt; v[3] += v[1] * dt; v[5] += v[4] * dt;
      B.k.style.transform = "translate(" + v[2] + "px," + v[3] + "px) rotate(" + v[5] + "deg) scale(" + (1.6 - life * .4) + ")";
      B.k.style.opacity = clamp(1.5 - life * 1.2, 0, 1);
    }
  }

  var css = null; // mood cache (background kernel canvas removed)

  /* ---------------- card / button ---------------- */
  function decoratePanel(p) {
    if (!p || p.classList.contains("la-card")) return;
    p.classList.add("la-card", "la-enter");
    p.addEventListener("pointermove", function (e) { var b = p.getBoundingClientRect(); p.style.setProperty("--mx", (e.clientX - b.left) + "px"); p.style.setProperty("--my", (e.clientY - b.top) + "px"); });
    var btn = p.querySelector(".login-buttons button");
    if (btn && !reduce) {
      var bx = spring(170, 13), by = spring(170, 13), bs = spring(400, 16); bs.x = bs.t = 1;
      btn.__la = { bx: bx, by: by, bs: bs };
      p.addEventListener("pointermove", function (e) { var b = btn.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2); var d = Math.hypot(dx, dy); if (d < 110) { bx.t = dx * .28; by.t = dy * .35; } else { bx.t = by.t = 0; } });
      p.addEventListener("pointerleave", function () { bx.t = by.t = 0; });
      btn.addEventListener("pointerdown", function () { bs.t = .9; });
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { btn.addEventListener(ev, function () { bs.t = 1; if (ev === "pointerup") bs.v += 3; }); });
    }
    if (btn) btn.addEventListener("click", function () { lastSubmit = performance.now(); }, true);
    p.addEventListener("keydown", function (e) { if (e.key === "Enter") lastSubmit = performance.now(); }, true);
    p.addEventListener("animationend", function () { p.classList.remove("la-enter"); });
  }
  function stepButtons(dt) {
    doc.querySelectorAll(".la-card .login-buttons button").forEach(function (b) { var s = b.__la; if (!s) return; s.bx.step(dt); s.by.step(dt); s.bs.step(dt); b.style.transform = "translate(" + s.bx.x + "px," + s.by.x + "px) scale(" + s.bs.x + ")"; });
  }

  /* ---------------- state hooks ---------------- */
  function rigFor(el) { var p = el && el.closest && el.closest(".la-card"); for (var i = 0; i < rigs.length; i++) if (rigs[i].panel === p) return rigs[i]; return null; }
  function setShy(R, input) { if (!R) return; R.shy = !!input; R.peek = !!(input && input.type === "text"); R.wrap.classList.toggle("la-shy", R.shy); }
  doc.addEventListener("focusin", function (e) { var t = e.target; if (t && t.tagName === "INPUT" && (t.type === "password" || t.__laPw)) { t.__laPw = true; setShy(rigFor(t), t); } else setShy(rigFor(t), null); });
  doc.addEventListener("focusout", function (e) { var R = rigFor(e.target); if (R) setTimeout(function () { var a = doc.activeElement; if (!(a && a.__laPw && rigFor(a) === R)) setShy(R, null); }, 0); });
  // peek: watch password inputs whose type is toggled to text by a show-password control
  new MutationObserver(function (ms) { ms.forEach(function (m) { var t = m.target; if (t.__laPw && doc.activeElement === t) setShy(rigFor(t), t); }); })
    .observe(doc.body, { attributes: true, attributeFilter: ["type"], subtree: true });

  function worried() {
    var R = null; for (var i = 0; i < rigs.length; i++) if (visible(rigs[i].panel)) R = rigs[i];
    if (!R) return;
    R.shake.v += 260; R.worry.t = 1; setTimeout(function () { R.worry.t = 0; }, 2200);
  }
  // Errors in app.js surface via alert(); observe them by passing straight through.
  try {
    var _alert = win.alert;
    if (typeof _alert === "function") {
      win.alert = function () { if (activePanel()) setTimeout(worried, 0); return _alert.apply(this, arguments); };
    }
  } catch (e) {}

  var wasVisible = null;
  function watchPanels() {
    var p = activePanel();
    doc.body.classList.toggle("la-on", !!p);
    if (wasVisible && !p && lastSubmit && performance.now() - lastSubmit < 15000) {
      // signed in: celebratory burst on the background
      if (!reduce) sendOff();
    }
    if (p && p !== wasVisible) { p.classList.add("la-enter"); var R = rigFor(p); if (R) setTimeout(function () { hop(R, 1.2); }, 260); }
    wasVisible = p;
  }

  /* ---------------- loop ---------------- */
  var last = performance.now(), running = true;
  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.033, (now - last) / 1000); last = now;
    mouse.vx *= Math.pow(0.001, dt);
    var ap = activePanel();
    if (ap) { var br = ap.getBoundingClientRect(); if (br.width) lastRect = { el: ap, r: br }; }
    typing.energy *= Math.pow(0.25, dt);
    if ((ap || now < sendoffUntil || doc.documentElement.hasAttribute("data-astro")) && win.__laSky) win.__laSky.frame(now, dt);
    if (now < sendoffUntil) stepBurst(now, dt);
    else if (ap) {
      for (var i = 0; i < rigs.length; i++) updateRig(rigs[i], now, dt);
      stepButtons(dt);
    }
    requestAnimationFrame(loop);
  }
  doc.addEventListener("visibilitychange", function () { if (doc.hidden) running = false; else if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } });
  win.addEventListener("pointermove", function (e) {
    var now = performance.now(), dt = Math.max(8, now - (mouse.t || now - 16));
    if (mouse.has) { mouse.vx = (e.clientX - mouse.x) / dt * 1000; mouse.vy = (e.clientY - mouse.y) / dt * 1000; }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true; mouse.t = now;
  }, { passive: true });
  doc.addEventListener("pointerleave", function () { mouse.has = false; });

  function init() {
    PANELS.forEach(function (id) {
      var p = $(id); if (!p) return;
      decoratePanel(p);
      var R = buildRig(p, $(LOGOS[id])); if (R) { rigs.push(R); }
    });
    applyMood(); setInterval(applyMood, 60000);
    new MutationObserver(watchPanels).observe(doc.body, { attributes: true, attributeFilter: ["class"], subtree: true });
    watchPanels();
    rigs.forEach(function (R) { if (visible(R.panel)) setTimeout(function () { hop(R, 1.3); }, 350); });
    if (!reduce) requestAnimationFrame(loop);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
