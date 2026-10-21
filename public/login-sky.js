/* login-sky.js — decorative real-sky backdrop for the login screens.
   Sun altitude (inline solar algorithm), sunrise/sunset, lunar phase, sidereal
   star field with constellations, and Open-Meteo weather. Purely visual: it
   exposes window.__laSky.frame(now, dt), which login-alive.js calls from its
   single rAF loop. Debug: ?sky=dawn|day|dusk|night&wx=clear|partly|cloudy|rain|storm|snow|fog */
(function () {
  "use strict";
  if (window.__laSky) return;
  var doc = document, win = window, RAD = Math.PI / 180;
  var reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var qs = new URLSearchParams(location.search), dbgSky = qs.get("sky"), dbgWx = qs.get("wx");
  var loc = { lat: 38.3914, lon: -86.9311, src: "fallback" }; // Jasper, IN 47546
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- astronomy (after SunCalc / Meeus, low precision) ---------- */
  function jd2000(t) { return t / 86400000 - 10957.5; } // days since J2000.0
  function lst(d, lon) { return (280.46061837 + 360.98564736629 * d + lon) % 360; }
  function altAz(raDeg, decDeg, d, lat, lon) {
    var H = (lst(d, lon) - raDeg) * RAD, de = decDeg * RAD, la = lat * RAD;
    var alt = Math.asin(Math.sin(de) * Math.sin(la) + Math.cos(de) * Math.cos(la) * Math.cos(H));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(de) * Math.cos(la)); // from south, westward
    return [alt / RAD, az];
  }
  function sunRaDec(d) {
    var M = (357.5291 + 0.98560028 * d) * RAD;
    var C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD;
    var L = M + C + Math.PI + 102.9372 * RAD, e = 23.4397 * RAD;
    return [Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L)) / RAD, Math.asin(Math.sin(e) * Math.sin(L)) / RAD];
  }
  function sunAlt(t) { var d = jd2000(t), s = sunRaDec(d); return altAz(s[0], s[1], d, loc.lat, loc.lon); }
  function sunTimes(t) { // scan local day for -0.833° crossings
    var day = new Date(t); day.setHours(0, 0, 0, 0); var t0 = day.getTime(), rise = null, set = null, prev = sunAlt(t0)[0];
    for (var m = 2; m <= 1440; m += 2) { var a = sunAlt(t0 + m * 6e4)[0], f = (prev + .833) / (prev - a); if (prev < -0.833 && a >= -0.833) rise = t0 + (m - 2 + 2 * f) * 6e4; if (prev >= -0.833 && a < -0.833) set = t0 + (m - 2 + 2 * f) * 6e4; prev = a; }
    return { rise: rise, set: set };
  }
  function moonPhase(t) { var syn = 29.530588853, p = ((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / syn) % 1; return p < 0 ? p + 1 : p; } // 0 new, .5 full
  function moonRaDec(d) {
    var L = (218.316 + 13.176396 * d) * RAD, M = (134.963 + 13.064993 * d) * RAD, F = (93.272 + 13.22935 * d) * RAD;
    var l = L + 6.289 * RAD * Math.sin(M), b = 5.128 * RAD * Math.sin(F), e = 23.4397 * RAD;
    return [Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)) / RAD, Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)) / RAD];
  }

  /* ---------- star catalogue: [RA h, Dec °, mag] ---------- */
  var CONST = {
    orion: { s: [[5.919, 7.41, .5], [5.418, 6.35, 1.6], [5.679, -1.94, 1.7], [5.603, -1.2, 1.7], [5.533, -.3, 2.2], [5.796, -9.67, 2.1], [5.242, -8.2, .1], [5.588, 9.93, 3.4]], l: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1], [0, 7], [1, 7]] },
    dipper: { s: [[11.062, 61.75, 1.8], [11.031, 56.38, 2.4], [11.897, 53.69, 2.4], [12.257, 57.03, 3.3], [12.9, 55.96, 1.8], [13.399, 54.93, 2.2], [13.792, 49.31, 1.9]], l: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
    cassiopeia: { s: [[.153, 59.15, 2.3], [.675, 56.54, 2.2], [.945, 60.72, 2.4], [1.43, 60.24, 2.7], [1.907, 63.67, 3.4]], l: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    cygnus: { s: [[20.69, 45.28, 1.3], [20.37, 40.26, 2.2], [19.51, 27.96, 3.1], [20.77, 33.97, 2.5], [19.75, 45.13, 2.9]], l: [[0, 1], [1, 2], [3, 1], [1, 4]] },
    polaris: { s: [[2.53, 89.26, 2]], l: [] }
  };
  var field = [];
  (function () { var seed = 7; function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 420; i++) field.push([r() * 24, Math.asin(r() * 2 - 1) / RAD, 3.4 + r() * 2.6, r() * 6.28]);
    Object.keys(CONST).forEach(function (k) { CONST[k].s.forEach(function (s) { s.push(r() * 6.28); }); }); })();

  /* ---------- weather ---------- */
  var wx = { kind: dbgWx || "clear", cloud: 0, src: dbgWx ? "debug" : "default" };
  var WXCLOUD = { clear: 0, partly: .45, cloudy: .9, fog: .6, rain: .85, storm: 1, snow: .8 };
  function wmo(c) { if (c <= 1) return "clear"; if (c === 2) return "partly"; if (c === 3) return "cloudy"; if (c === 45 || c === 48) return "fog";
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain"; if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow"; if (c >= 95) return "storm"; return "clear"; }
  function fetchWx() {
    if (dbgWx || !win.fetch) return;
    var u = "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat.toFixed(3) + "&longitude=" + loc.lon.toFixed(3) + "&current=weather_code,cloud_cover,is_day";
    var ctl = win.AbortController ? new AbortController() : null; if (ctl) setTimeout(function () { ctl.abort(); }, 6000);
    fetch(u, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.current) return; wx.kind = wmo(j.current.weather_code | 0); wx.src = "open-meteo"; setupWx(); paintStatic();
    }).catch(function () {});
  }
  function geo() {
    if (!navigator.geolocation) return;
    function ask() { navigator.geolocation.getCurrentPosition(function (p) { loc = { lat: p.coords.latitude, lon: p.coords.longitude, src: "geolocation" }; update(true); fetchWx(); }, function () {}, { timeout: 8000, maximumAge: 36e5 }); }
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(function (s) { if (s.state !== "denied") ask(); }, ask); else ask();
  }

  /* ---------- sky state ---------- */
  var st = { alt: 30, rising: true, night: 0, twi: 0, times: null };
  function update(force) {
    var now = Date.now(), sa = sunAlt(now), alt = sa[0], rising = sunAlt(now + 6e5)[0] > alt;
    if (dbgSky) { alt = { dawn: 1.5, day: 42, dusk: 1.5, night: -30 }[dbgSky]; rising = dbgSky === "dawn"; if (alt == null) alt = sa[0]; }
    st.alt = alt; st.rising = rising; st.sunAz = dbgSky ? (rising ? -1.75 : 1.75) * (dbgSky === "day" ? .25 : 1) : sa[1];
    st.night = clamp((-alt - 4) / 10, 0, 1);                 // 0 above -4°, 1 below -14°
    st.twi = clamp(1 - Math.abs(alt - 1) / 9, 0, 1);         // peak near the horizon
    if (force || !st.times || now - st.times.at > 36e5) { st.times = sunTimes(now); st.times.at = now; }
    var root = doc.documentElement, g = grad();
    root.style.setProperty("--la-sky-top", g[0]); root.style.setProperty("--la-sky-bot", g[2]);
    root.style.setProperty("--la-mood-glow", st.night > .5 ? "rgba(140,160,255,.16)" : "rgba(255,190,100,.24)");
    root.style.setProperty("--la-mood-kernel-a", st.night > .5 ? "rgba(255,200,120,.30)" : "rgba(232,165,70,.62)");
    root.style.setProperty("--la-mood-kernel-b", st.night > .5 ? "rgba(255,240,210,.24)" : "rgba(255,244,218,.92)");
    var dark = st.night > .35 || (wx.kind === "storm" && st.alt < 20);
    root.setAttribute("data-la-mood", dark ? "night" : "day");
    root.setAttribute("data-la-sky", dbgSky || (st.night > .5 ? "night" : st.twi > .4 ? (rising ? "dawn" : "dusk") : "day"));
    root.setAttribute("data-la-wx", wx.kind);
  }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function css(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  // [top, mid, horizon] by sun altitude
  var SKY = [[-18, [6, 10, 28], [12, 18, 44], [22, 28, 62]], [-9, [16, 20, 56], [48, 40, 96], [120, 70, 110]],
    [-3, [40, 52, 112], [150, 96, 150], [255, 128, 96]], [2, [70, 110, 180], [230, 150, 170], [255, 170, 100]],
    [8, [96, 156, 226], [170, 200, 236], [255, 214, 170]], [25, [70, 140, 230], [140, 190, 245], [210, 230, 252]], [90, [50, 120, 220], [120, 175, 240], [196, 222, 250]]];
  function grad() {
    var a = st.alt, i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= a) i++;
    var A = SKY[i], B = SKY[i + 1], t = clamp((a - A[0]) / (B[0] - A[0]), 0, 1); t = t * t * (3 - 2 * t);
    var c = [mixc(A[1], B[1], t), mixc(A[2], B[2], t), mixc(A[3], B[3], t)];
    var gray = WXCLOUD[wx.kind] * (wx.kind === "partly" ? .25 : .7), dim = wx.kind === "storm" ? .45 : wx.kind === "rain" ? .25 : 0;
    for (var k = 0; k < 3; k++) { var l = (c[k][0] + c[k][1] + c[k][2]) / 3; c[k] = mixc(c[k], [l, l, l + 6], gray); c[k] = mixc(c[k], [20, 22, 30], dim); }
    return c.map(function (x) { return css(x); });
  }

  /* ---------- canvas ---------- */
  var cv, ctx, W, H, dpr, clouds = [], drops = [], flash = 0, bolt = null, nextBolt = 0, cloudLight, cloudDark;
  function cloudSprite(col) {
    var c = doc.createElement("canvas"); c.width = 360; c.height = 220; var g = c.getContext("2d");
    [[90, 120, 58], [150, 96, 72], [215, 108, 62], [268, 126, 46], [180, 134, 56], [120, 138, 46]].forEach(function (b) {
      var r = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]); r.addColorStop(0, col); r.addColorStop(.6, col.replace(/[\d.]+\)$/, ".55)")); r.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
      g.fillStyle = r; g.beginPath(); g.arc(b[0], b[1], b[2], 0, 6.283); g.fill(); });
    return c;
  }
  function setupWx() {
    var cov = WXCLOUD[wx.kind] || 0, n = Math.round(cov * 14), area = (win.innerWidth * win.innerHeight) / (1280 * 820);
    clouds = []; for (var i = 0; i < n; i++) clouds.push({ x: Math.random() * 1.4 - .2, y: Math.random() * .55, s: .6 + Math.random() * 1.1, v: .004 + Math.random() * .008, ox: 0, oy: 0, vx: 0, vy: 0 });
    drops = []; var m = Math.round((wx.kind === "rain" ? 220 : wx.kind === "storm" ? 300 : wx.kind === "snow" ? 160 : wx.kind === "fog" ? 14 : 0) * clamp(area, .4, 1.4));
    for (var j = 0; j < m; j++) drops.push({ x: Math.random(), y: Math.random(), z: .4 + Math.random() * .6, ph: Math.random() * 6.28, ox: 0, oy: 0, vx: 0, vy: 0 });
  }
  // velocity-aware push around the pointer; returns nothing, mutates o.vx/vy/ox/oy
  function swoosh(o, x, y, R, gain, back, dt) {
    if (ptr.on && !reduce) { var dx = x + o.ox - ptr.x, dy = y + o.oy - ptr.y, d2 = dx * dx + dy * dy;
      if (d2 < R * R) { var d = Math.sqrt(d2) || 1, f = 1 - d / R, sp = Math.min(2200, Math.hypot(ptr.vx, ptr.vy));
        o.vx += (dx / d * (260 + sp * .9) + ptr.vx * .9) * f * gain * dt; o.vy += (dy / d * (260 + sp * .9) + ptr.vy * .9) * f * gain * dt; } }
    o.vx += -o.ox * back * dt; o.vy += -o.oy * back * dt; var damp = Math.pow(.05, dt); o.vx *= damp; o.vy *= damp; o.ox += o.vx * dt; o.oy += o.vy * dt;
  }
  function resize() { dpr = Math.min(win.devicePixelRatio || 1, 1.5); W = win.innerWidth; H = win.innerHeight; cv.width = W * dpr; cv.height = H * dpr; paintStatic(); }
  // zenith-centred fisheye, south at the bottom
  function proj(alt, az) { var R = Math.hypot(W, H) * .5, r = (90 - alt) / 90 * R; return [W / 2 + Math.sin(az) * r, H * .5 + Math.cos(az) * r]; } // looking up: N top, S bottom, W right
  function drawSky(now) {
    var g = grad(), lg = ctx.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, g[0]); lg.addColorStop(.6, g[1]); lg.addColorStop(1, g[2]); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    // horizon glow at dawn/dusk on the sun's side
    if (st.twi > 0) {
      var sx = W / 2 - Math.sin(st.sunAz) * W * .45, rg = ctx.createRadialGradient(sx, H * 1.02, 0, sx, H * 1.02, W * .7);
      rg.addColorStop(0, css([255, 170, 90], .65 * st.twi * (1 - WXCLOUD[wx.kind] * .6))); rg.addColorStop(.35, css([255, 120, 140], .32 * st.twi)); rg.addColorStop(1, "rgba(255,120,140,0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    // sun
    if (st.alt > -2 && WXCLOUD[wx.kind] < .8) {
      var sp = [W / 2 - Math.sin(st.sunAz) * W * .45, H * (1.02 - clamp(st.alt, -2, 60) / 60 * .95)], sr = 26 + 30 * st.twi;
      var sg = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], sr * 5); sg.addColorStop(0, "rgba(255,250,230,.95)"); sg.addColorStop(.18, "rgba(255,236,190,.7)"); sg.addColorStop(1, "rgba(255,220,160,0)");
      ctx.globalAlpha = 1 - WXCLOUD[wx.kind]; ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sp[0], sp[1], sr * 5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  /* ---------- pointer (mouse + touch), shared by stars and weather ---------- */
  var ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, on: 0, t: 0 }, lens = { x: -1e4, y: -1e4, s: 0 };
  function onPtr(x, y) { var now = performance.now(), dt = Math.max(8, now - (ptr.t || now - 16)) / 1000;
    if (ptr.on) { ptr.vx = ptr.vx * .5 + (x - ptr.x) / dt * .5; ptr.vy = ptr.vy * .5 + (y - ptr.y) / dt * .5; }
    ptr.x = x; ptr.y = y; ptr.on = 1; ptr.t = now; }
  if (!reduce) {
    win.addEventListener("pointermove", function (e) { onPtr(e.clientX, e.clientY); }, { passive: true });
    win.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (t) onPtr(t.clientX, t.clientY); }, { passive: true });
    win.addEventListener("touchend", function () { ptr.on = 0; }, { passive: true });
    doc.addEventListener("pointerleave", function () { ptr.on = 0; });
  }

  /* ---------- star catalogue (d3-celestial, BSD-3) ---------- */
  var CAT = null, t0 = performance.now(), DRIFT = 4; // extra °/min of sidereal rotation, purely for liveliness
  function loadCat() { if (!win.fetch) return; fetch("/login-sky-data.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j) return; j.s.forEach(function (s, i) { s.push((i * 2.39996) % 6.283); }); CAT = j; paintStatic(); }).catch(function () {}); }
  function starFrame(now) { // precompute per-frame trig for the current (drifted) sidereal angle
    var d = jd2000(Date.now()), L = lst(d, loc.lon) + (reduce ? 0 : (now - t0) / 6e4 * DRIFT), la = loc.lat * RAD;
    return { L: L, sl: Math.sin(la), cl: Math.cos(la), R: Math.hypot(W, H) * .5 };
  }
  function pj(F, ra, dec, out) {
    var H_ = (F.L - ra) * RAD, de = dec * RAD, sd = Math.sin(de), cd = Math.cos(de), ch = Math.cos(H_);
    var sa = sd * F.sl + cd * F.cl * ch; if (sa < -0.03) return false;
    var alt = Math.asin(sa) / RAD, az = Math.atan2(Math.sin(H_), ch * F.sl - sd / cd * F.cl), r = (90 - alt) / 90 * F.R;
    var x = W / 2 + Math.sin(az) * r, y = H * .5 + Math.cos(az) * r;
    if (lens.s > .01) { var dx = x - lens.x, dy = y - lens.y, dd = Math.sqrt(dx * dx + dy * dy), LR = 150;
      if (dd < LR && dd > .1) { var f = (1 - dd / LR); f = f * f * 22 * lens.s; x += dx / dd * f; y += dy / dd * f; } }
    out[0] = x; out[1] = y; out[2] = alt; return true;
  }
  var P = [0, 0, 0], Q = [0, 0, 0];
  function drawStars(now, dt) {
    var vis = st.night * (1 - (WXCLOUD[wx.kind] || 0) * .85); if (vis < .02) return;
    // lens eases toward the pointer and back out when it leaves
    if (!reduce) { var k = 1 - Math.pow(.002, dt || .016); lens.x += (ptr.x - lens.x) * k; lens.y += (ptr.y - lens.y) * k; lens.s += ((ptr.on ? 1 : 0) - lens.s) * k * .6; }
    var F = starFrame(now), t = now / 1000;
    if (!CAT) return drawStarsFallback(now);
    ctx.lineWidth = .8; ctx.strokeStyle = "rgba(180,200,255," + (.16 * vis).toFixed(3) + ")"; ctx.beginPath();
    for (var c = 0; c < CAT.c.length; c++) { var ls = CAT.c[c].l;
      for (var i = 0; i < ls.length; i++) { var l = ls[i], have = false;
        for (var j = 0; j < l.length; j += 2) { var ok = pj(F, l[j], l[j + 1], P);
          if (ok && have) ctx.lineTo(P[0], P[1]); else if (ok) ctx.moveTo(P[0], P[1]); have = ok; } } }
    ctx.stroke();
    var S = CAT.s;
    for (var n = 0; n < S.length; n++) { var s = S[n]; if (!pj(F, s[0], s[1], P)) continue;
      if (P[0] < -6 || P[0] > W + 6 || P[1] < -6 || P[1] > H + 6) continue;
      var tw = reduce ? 1 : .7 + .3 * Math.sin(t * (1.1 + (s[3] % 1.9)) + s[3]), ext = clamp(P[2] / 10, .35, 1);
      var b = clamp((5.6 - s[2]) / 4, .18, 1) * vis * tw * ext, r = clamp(2.6 - s[2] * .38, .6, 2.8);
      if (s[2] < 2.2) { var g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], r * 4); g.addColorStop(0, "rgba(255,255,255," + b.toFixed(3) + ")"); g.addColorStop(.3, "rgba(210,225,255," + (b * .35).toFixed(3) + ")"); g.addColorStop(1, "rgba(200,220,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P[0], P[1], r * 4, 0, 6.283); ctx.fill(); }
      else { ctx.fillStyle = "rgba(235,240,255," + b.toFixed(3) + ")"; ctx.beginPath(); ctx.arc(P[0], P[1], r, 0, 6.283); ctx.fill(); } }
    // very faint names, only well above the horizon
    ctx.font = "500 10.5px Fredoka, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.letterSpacing = "1.5px";
    for (var m = 0; m < CAT.c.length; m++) { var C = CAT.c[m]; if (!C.c || !pj(F, C.c[0], C.c[1], Q) || Q[2] < 18) continue;
      ctx.fillStyle = "rgba(190,205,255," + (.2 * vis * clamp((Q[2] - 18) / 12, 0, 1)).toFixed(3) + ")"; ctx.fillText(C.n.toUpperCase(), Q[0], Q[1] + 16); }
    ctx.letterSpacing = "0px";
  }
  function drawStarsFallback(now) {
    var vis = st.night * (1 - (WXCLOUD[wx.kind] || 0) * .85);
    var d = jd2000(Date.now()), t = now / 1000;
    for (var i = 0; i < field.length; i++) { var s = field[i], aa = altAz(s[0] * 15, s[1], d, loc.lat, loc.lon); if (aa[0] < 0) continue;
      var p = proj(aa[0], aa[1]); if (p[0] < -5 || p[0] > W + 5 || p[1] < -5 || p[1] > H + 5) continue;
      var tw = reduce ? 1 : .65 + .35 * Math.sin(t * (1.3 + s[3] % 1.7) + s[3]), b = clamp((6.4 - s[2]) / 2.6, .25, 1) * vis * tw * clamp(aa[0] / 12, .3, 1);
      ctx.fillStyle = "rgba(235,240,255," + b.toFixed(3) + ")"; ctx.fillRect(p[0], p[1], s[2] < 4.4 ? 1.6 : 1.1, s[2] < 4.4 ? 1.6 : 1.1); }
    Object.keys(CONST).forEach(function (k) {
      var C = CONST[k], pts = C.s.map(function (s) { var aa = altAz(s[0] * 15, s[1], d, loc.lat, loc.lon); return aa[0] > -2 ? proj(aa[0], aa[1]) : null; });
      ctx.strokeStyle = "rgba(180,200,255," + (.34 * vis).toFixed(3) + ")"; ctx.lineWidth = 1;
      C.l.forEach(function (l) { var a = pts[l[0]], b = pts[l[1]]; if (a && b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } });
      C.s.forEach(function (s, i) { var p = pts[i]; if (!p) return; var r = clamp(3.8 - s[2] * .6, 1.5, 3.6), tw = reduce ? 1 : .8 + .2 * Math.sin(t * 2.1 + s[3]);
        var gg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 4); gg.addColorStop(0, "rgba(255,255,255," + (vis * tw).toFixed(3) + ")"); gg.addColorStop(.3, "rgba(210,225,255," + (.35 * vis * tw).toFixed(3) + ")"); gg.addColorStop(1, "rgba(200,220,255,0)");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p[0], p[1], r * 4, 0, 6.283); ctx.fill(); });
    });
  }
  function drawMoon() {
    var vis = clamp(st.night * 1.2 + st.twi * .3, 0, 1) * (1 - WXCLOUD[wx.kind] * .7); if (vis < .03) return;
    var d = jd2000(Date.now()), m = moonRaDec(d), aa = altAz(m[0], m[1], d, loc.lat, loc.lon), x, y;
    if (aa[0] > 8 && !dbgSky) { var p = proj(aa[0], aa[1]); x = p[0]; y = p[1]; } else { x = W * .8; y = H * .18; } // keep it on screen
    x = clamp(x, 60, W - 60); y = clamp(y, 60, H * .5);
    var r = 22, ph = moonPhase(Date.now());
    var halo = ctx.createRadialGradient(x, y, r * .8, x, y, r * 6); halo.addColorStop(0, "rgba(255,246,220," + (.28 * vis * (.3 + Math.abs(Math.cos(ph * 6.283 / 2)) * .7)).toFixed(3) + ")"); halo.addColorStop(1, "rgba(255,246,220,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 6, 0, 6.283); ctx.fill();
    ctx.save(); ctx.globalAlpha = vis;
    ctx.fillStyle = "rgba(40,44,70,.85)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();            // earthshine side
    // lit portion: half-disc + terminator ellipse (waxing lit on the right, northern hemisphere)
    var waxing = ph < .5, k = Math.cos(ph * 6.283); // 1 new → -1 full
    ctx.fillStyle = "#f6efd9"; ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
    ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing ? true : false);
    ctx.fill();
    ctx.fillStyle = "rgba(170,160,140,.25)"; [[-6, -5, 4], [5, 6, 3], [7, -8, 2.2], [-3, 9, 2.5]].forEach(function (c) { ctx.beginPath(); ctx.arc(x + c[0], y + c[1], c[2], 0, 6.283); ctx.fill(); });
    ctx.restore();
  }
  function drawWx(now, dt) {
    var dark = st.night * .8 + (wx.kind === "storm" ? .5 : wx.kind === "rain" ? .3 : 0), sc = Math.max(1, W / 1280);
    ptr.vx *= Math.pow(.02, dt); ptr.vy *= Math.pow(.02, dt);
    for (var i = 0; i < clouds.length; i++) { var c = clouds[i]; if (!reduce) { c.x += c.v * dt * (wx.kind === "storm" ? 2 : 1); if (c.x > 1.25) c.x = -.35; }
      var w = 360 * c.s * sc, h = 220 * c.s * sc;
      swoosh(c, c.x * W, c.y * H, w * .45, .55, 2.2, dt);
      var cx = c.x * W + c.ox - w / 2, cy = c.y * H + c.oy - h / 2;
      ctx.globalAlpha = .85 * (1 - dark * .5); ctx.drawImage(cloudLight, cx, cy, w, h);
      if (dark > .05) { ctx.globalAlpha = clamp(dark, 0, .9); ctx.drawImage(cloudDark, cx, cy, w, h); } }
    ctx.globalAlpha = 1;
    if (wx.kind === "fog") { var fg = ctx.createLinearGradient(0, H * .3, 0, H); fg.addColorStop(0, "rgba(220,224,230,0)"); fg.addColorStop(1, css([220, 224, 230], .7 - st.night * .4)); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      for (var f = 0; f < drops.length; f++) { var q = drops[f]; if (!reduce) { q.x += .006 * q.z * dt; if (q.x > 1.3) q.x = -.3; }
        var fx = q.x * W, fy = (.35 + q.y * .6) * H; swoosh(q, fx, fy, 220, .7, 1.6, dt);
        var gr = ctx.createRadialGradient(fx + q.ox, fy + q.oy, 0, fx + q.ox, fy + q.oy, 260 * q.z); gr.addColorStop(0, css([232, 234, 240], .16)); gr.addColorStop(1, "rgba(232,234,240,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(fx + q.ox, fy + q.oy, 260 * q.z * 1.8, 260 * q.z * .5, 0, 0, 6.283); ctx.fill(); } }
    if (wx.kind === "rain" || wx.kind === "storm") {
      ctx.strokeStyle = st.night > .5 ? "rgba(170,190,220,.35)" : "rgba(200,215,235,.55)"; ctx.lineWidth = 1.1; ctx.beginPath();
      for (var j = 0; j < drops.length; j++) { var r = drops[j]; if (!reduce) { r.y += (1.4 + r.z) * dt; r.x -= .12 * dt; if (r.y > 1.05) { r.y = -.05; r.x = Math.random() * 1.2; r.ox = r.oy = r.vx = r.vy = 0; } }
        var px = r.x * W, py = r.y * H; swoosh(r, px, py, 120, 1.4, 1.2, dt);
        var len = 14 * r.z + 6, sx = -len * .18 + clamp(r.vx * .02, -10, 10); px += r.ox; py += r.oy; ctx.moveTo(px, py); ctx.lineTo(px + sx, py + len); } ctx.stroke();
    }
    if (wx.kind === "snow") { ctx.fillStyle = "rgba(255,255,255,.85)";
      for (var s = 0; s < drops.length; s++) { var q2 = drops[s]; if (!reduce) { q2.y += .06 * q2.z * dt; q2.ph += dt; if (q2.y > 1.02) { q2.y = -.02; q2.ox = q2.oy = 0; } }
        var nx = q2.x * W + Math.sin(q2.ph) * 12 * q2.z, ny = q2.y * H; swoosh(q2, nx, ny, 130, 1.1, .6, dt);
        ctx.beginPath(); ctx.arc(nx + q2.ox, ny + q2.oy, 1.2 + q2.z * 1.8, 0, 6.283); ctx.fill(); } }
    if (wx.kind === "storm" && !reduce) {
      if (now > nextBolt) { flash = 1; nextBolt = now + 2500 + Math.random() * 5000; var bx = W * (.15 + Math.random() * .7), by = 0, pts = [[bx, by]]; while (by < H * .6) { by += 20 + Math.random() * 30; bx += (Math.random() - .5) * 50; pts.push([bx, by]); } bolt = { pts: pts, t: now }; }
      if (flash > 0) { ctx.fillStyle = "rgba(235,240,255," + (flash * .35).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * (flash > .5 ? 2.5 : 4)); if (flash < .55 && flash > .45 && Math.random() < .3) flash = .9; }
      if (bolt && now - bolt.t < 180) { ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.shadowColor = "#bcd"; ctx.shadowBlur = 14; ctx.beginPath(); bolt.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.shadowBlur = 0; }
    }
  }
  var lastUpd = 0;
  function frame(now, dt) {
    if (!cv) return;
    if (now - lastUpd > 30000) { update(); lastUpd = now; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dt = dt || 0; drawSky(now); drawStars(now, dt); drawMoon(); drawWx(now, dt);
  }
  function paintStatic() { if (reduce && cv) frame(performance.now(), 0); }
  function init() {
    cv = doc.createElement("canvas"); cv.id = "la-sky"; cv.setAttribute("aria-hidden", "true");
    doc.body.insertBefore(cv, doc.body.firstChild); ctx = cv.getContext("2d"); if (!ctx) { cv.remove(); cv = null; return; }
    doc.documentElement.classList.add("la-sky-on");
    cloudLight = cloudSprite("rgba(255,255,255,.95)"); cloudDark = cloudSprite("rgba(70,76,92,.95)");
    setupWx(); loadCat(); update(true); lastUpd = performance.now(); resize(); win.addEventListener("resize", resize);
    setTimeout(function () { geo(); fetchWx(); }, 400); // never block first paint on permission/network
  }
  win.__laSky = { show: function () { if (cv) { resize(); } }, frame: frame, update: update, state: st, weather: wx, loc: function () { return loc; }, moonPhase: moonPhase, sunTimes: sunTimes };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
