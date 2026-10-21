/* portal-moon.js — Da Vinci. Draws tonight's real moon phase into the
   portal moons and plays the grow / shrink animations on studyPortal. */
(function () {
  "use strict";
  var doc = document, win = window;
  var reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function phase(t) { var p = ((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1; return p < 0 ? p + 1 : p; }
  function moonSVG(p) {
    var r = 8, k = Math.cos(2 * Math.PI * p), s = p < 0.5 ? 1 : -1;
    var rx = Math.max(0.01, Math.abs(k) * r);
    var sw1 = s > 0 ? 1 : 0, sw2 = (s > 0) === (k > 0) ? 0 : 1;
    var lit = Math.abs(p - 0.5) < 0.015 ? '<circle cx="12" cy="12" r="8" fill="#fff6dc"/>'
      : Math.min(p, 1 - p) < 0.015 ? ""
      : '<path fill="#fff6dc" d="M12 4A8 8 0 0 ' + sw1 + ' 12 20A' + rx.toFixed(2) + ' 8 0 0 ' + sw2 + ' 12 4Z"/>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="rgba(120,120,150,.35)" stroke="rgba(255,246,220,.55)" stroke-width="1"/>' + lit + '</svg>';
  }
  function paint() {
    var svg = moonSVG(phase(Date.now()));
    [].forEach.call(doc.querySelectorAll(".study-pill-moon, .study-portal-moon"), function (el) { el.innerHTML = svg; });
  }
  var ROCKET = '<svg viewBox="0 0 40 220" width="40" height="220" aria-hidden="true">' +
    '<path d="M20 0 L26 18 L14 18 Z" fill="#d9d9d9"/><rect x="18.5" y="-6" width="3" height="8" fill="#bbb"/>' +
    '<path d="M14 18 L26 18 L27 40 L13 40 Z" fill="#f4f4f2"/>' +
    '<rect x="13" y="40" width="14" height="46" fill="#f7f7f5"/><rect x="13" y="58" width="14" height="5" fill="#1c1c1c"/>' +
    '<path d="M13 86 L27 86 L30 96 L10 96 Z" fill="#e8e8e4"/>' +
    '<rect x="10" y="96" width="20" height="54" fill="#f7f7f5"/><rect x="10" y="104" width="20" height="6" fill="#1c1c1c"/>' +
    '<rect x="10" y="150" width="20" height="54" fill="#fafaf8"/><rect x="10" y="150" width="10" height="16" fill="#1c1c1c"/><rect x="20" y="182" width="10" height="16" fill="#1c1c1c"/>' +
    '<path d="M10 186 L2 214 L10 206 Z M30 186 L38 214 L30 206 Z" fill="#1c1c1c"/>' +
    '<path d="M12 204 L28 204 L30 214 L10 214 Z" fill="#333"/>' +
    '<text x="20" y="140" font-size="7" font-family="Arial,sans-serif" font-weight="700" fill="#1c1c1c" text-anchor="middle" transform="rotate(-90 20 140)">USA</text></svg>';
  function launch() {
    return new Promise(function (done) {
      var finished = false; function end() { if (finished) return; finished = true; done(); }
      var W = innerWidth, H = innerHeight, dpr = Math.min(2, win.devicePixelRatio || 1);
      var cv = doc.createElement("canvas"); cv.className = "pm-smoke";
      cv.width = W * dpr; cv.height = H * dpr; doc.body.appendChild(cv);
      var g = cv.getContext("2d"); g.scale(dpr, dpr);
      var rk = doc.createElement("div"); rk.className = "pm-rocket"; rk.innerHTML = ROCKET; doc.body.appendChild(rk);
      doc.documentElement.classList.add("pm-leaving");
      var scale = Math.max(0.7, Math.min(1.25, H / 800)), rh = 220 * scale;
      rk.style.transform = "translate(-50%, 0) scale(" + scale + ")";
      var lastNz = null, parts = [], t0 = performance.now(), DUR = 1500;
      function ease(t) { return t * t * (3 - 2 * t) * 0.35 + t * t * 0.65; }
      function frame(now) {
        if (finished) return;
        var t = Math.min(1, (now - t0) / DUR);
        var y = H + 10 - ease(t) * (H + rh + 80);
        var shake = t < 0.25 ? (Math.random() - 0.5) * 2.2 : 0;
        rk.style.transform = "translate(calc(-50% + " + shake.toFixed(1) + "px), " + y.toFixed(1) + "px) scale(" + scale + ")";
        var nz = y + rh, cx = W / 2;
        var fromNz = lastNz == null ? nz : lastNz; lastNz = nz; var n = Math.max(6, Math.ceil((fromNz - nz) / 4)); for (var i = 0; i < n; i++) parts.push({ x: cx + (Math.random() - 0.5) * 14 * scale, y: Math.min(H + 40, nz + (fromNz - nz) * (i / n)), vx: (Math.random() - 0.5) * (t < 0.3 ? 9 : 3.2), vy: 0.6 + Math.random() * 1.6, r: 10 + Math.random() * 14, gr: 1.4 + Math.random() * 1.6, a: 0.55 + Math.random() * 0.3, hot: 1 });
        if (t > 0.55) for (var j = 0; j < 6; j++) parts.push({ x: Math.random() * W, y: H * (0.35 + Math.random() * 0.75), vx: (Math.random() - 0.5) * 1.5, vy: -0.4 - Math.random(), r: 40 + Math.random() * 60, gr: 3 + Math.random() * 3, a: 0.4, hot: 0 });
        g.clearRect(0, 0, W, H);
        for (var k = 0; k < parts.length; k++) {
          var p = parts[k]; p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.r += p.gr; p.hot *= 0.86;
          var col = p.hot > 0.15 ? "255," + (200 + 55 * (1 - p.hot) | 0) + "," + (150 + 100 * (1 - p.hot) | 0) : "238,236,232";
          var gd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          gd.addColorStop(0, "rgba(" + col + "," + p.a + ")"); gd.addColorStop(0.6, "rgba(" + col + "," + (p.a * 0.55) + ")"); gd.addColorStop(1, "rgba(" + col + ",0)");
          g.fillStyle = gd; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill();
        }
        if (parts.length > 1400) parts.splice(0, parts.length - 1400);
        var flame = Math.max(0, 1 - t * 1.1);
        if (flame > 0 && nz < H + 60) { var fg = g.createRadialGradient(cx, nz + 8, 0, cx, nz + 8, 40 * scale); fg.addColorStop(0, "rgba(255,250,220," + flame + ")"); fg.addColorStop(0.4, "rgba(255,170,60," + (flame * 0.8) + ")"); fg.addColorStop(1, "rgba(255,120,30,0)"); g.fillStyle = fg; g.beginPath(); g.ellipse(cx, nz + 20 * scale, 12 * scale, 46 * scale, 0, 0, 6.2832); g.fill(); }
        if (t > 0.8) { g.fillStyle = "rgba(238,236,232," + ((t - 0.8) / 0.2).toFixed(3) + ")"; g.fillRect(0, 0, W, H); }
        if (t < 1) requestAnimationFrame(frame); else setTimeout(end, 60);
      }
      requestAnimationFrame(frame);
      setTimeout(end, DUR + 600);
      win.addEventListener("pageshow", function (e) { if (e.persisted) { cv.remove(); rk.remove(); doc.documentElement.classList.remove("pm-leaving"); } }, { once: true });
    });
  }
  function shrink() {
    return new Promise(function (done) {
      doc.documentElement.classList.add("pm-closing");
      setTimeout(done, 560);
      win.addEventListener("pageshow", function (e) { if (e.persisted) doc.documentElement.classList.remove("pm-closing"); }, { once: true });
    });
  }
  function hook() {
    paint();
    var P = win.studyPortal; if (!P || reduce) return;
    if (doc.querySelector("a.study-pill")) P.onOpen = launch;
    if (doc.getElementById("studyBackBtn")) P.onClose = shrink;
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", hook); else hook();
  win.__portalMoon = { phase: phase, svg: moonSVG };
})();
