/* observatory.js - "The Jasper Observatory" homepage (art direction: Leo).
   The real sky above Jasper is revealed through an opening dome slit, inked over
   like an antique engraved star atlas, the moon rises at its real phase, and a
   brass astrolabe assembles around the sign-in card.
   Purely decorative: it never reads or writes auth state, inputs, or app.js data.
   login-alive.js calls window.__obsFrame(now, dt) from its single rAF loop.
   Debug: ?obsT=<seconds> freezes the intro clock, ?at=<ISO date> sets the sky time,
   and login-sky.js's ?sky=day|night|dawn|dusk and ?wx=clear|partly|cloudy|rain|storm|snow|fog apply. */
(function () {
  "use strict";
  var doc = document, win = window, root = doc.documentElement;
  if (win.__obs || !root.classList.contains("obs")) return;

  var RAD = Math.PI / 180, TAU = Math.PI * 2, EPS = 23.4397 * RAD;
  var qs = new URLSearchParams(location.search);
  var reduce = !!(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var freezeT = qs.has("obsT") ? parseFloat(qs.get("obsT")) : NaN;
  var dbgSky = qs.get("sky");
  var shiftMs = 0;
  (function () { var a = qs.get("at"), t = a ? Date.parse(a) : NaN; if (!isNaN(t)) shiftMs = t - Date.now(); })();
  function nowMs() { return Date.now() + shiftMs; }
  var JASPER = { lat: 38.3914, lon: -86.9311, src: "fallback" }, JASPER_TZ = "America/Indiana/Vincennes";

  /* Intro timeline in desktop seconds. Phones play the same score at 9/14 speed. */
  var TL = {
    seam: [0, 1.2], shut: [1.2, 3.5], stars: [1.6, 3.7], ink: [3.5, 6.5], moon: [4.5, 8], card: [2, 2.5],
    ringO: [6, 7.8], ringM: [6.5, 8.4], ringI: [7, 8.9], rete: [7.3, 10], hand: [7.6, 8.8], eye: [8.4, 9.6],
    focus: [9, 12], shoot: [12.1, 13.1], plaque: [12, 14], end: 14
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(t) { return t * t * (3 - 2 * t); }
  function inOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function outBack(t, s) { var u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : +a.toFixed(3)) + ")"; }
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  var CREAM = [237, 230, 214], BRASS = "#D9A441", BRASS_HI = "#F2C46B", BRASS_LO = "#8A6420";

  /* ---------------- astronomy (low precision, after Meeus / SunCalc) ---------------- */
  function jd(t) { return t / 864e5 - 10957.5; }
  function sunLam(d) {
    var M = (357.5291 + .98560028 * d) * RAD, C = (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)) * RAD;
    return M + C + Math.PI + 102.9372 * RAD;
  }
  function moonEcl(d) {
    var L = (218.316 + 13.176396 * d) * RAD, M = (134.963 + 13.064993 * d) * RAD, F = (93.272 + 13.22935 * d) * RAD;
    return [L + 6.289 * RAD * Math.sin(M), 5.128 * RAD * Math.sin(F)];
  }
  function eqOf(l, b) {
    return [Math.atan2(Math.sin(l) * Math.cos(EPS) - Math.tan(b) * Math.sin(EPS), Math.cos(l)) / RAD,
      Math.asin(Math.sin(b) * Math.cos(EPS) + Math.cos(b) * Math.sin(EPS) * Math.sin(l)) / RAD];
  }
  function phaseOf(t) { var p = ((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1; return p < 0 ? p + 1 : p; }
  function frameOf(t, lc, extra) {
    var d = jd(t), L = ((280.46061837 + 360.98564736629 * d + lc.lon + (extra || 0)) % 360 + 360) % 360, la = lc.lat * RAD;
    return { d: d, L: L, sl: Math.sin(la), cl: Math.cos(la) };
  }
  // RA/Dec (degrees) to an east-north-up unit vector for the observer
  function enu(ra, dec, F, o) {
    var h = (F.L - ra) * RAD, de = dec * RAD, sd = Math.sin(de), cd = Math.cos(de), ch = Math.cos(h);
    o[0] = -cd * Math.sin(h); o[1] = sd * F.cl - cd * ch * F.sl; o[2] = sd * F.sl + cd * ch * F.cl; return o;
  }
  function sunAltAt(t, lc) { var F = frameOf(t, lc), s = eqOf(sunLam(F.d), 0), v = enu(s[0], s[1], F, [0, 0, 0]); return Math.asin(v[2]) / RAD; }
  function crossing(t0, lc, alt, down, hours) { // next time the sun crosses alt (going down or up)
    var prev = sunAltAt(t0, lc), step = 5 * 6e4;
    for (var t = t0 + step; t <= t0 + hours * 36e5; t += step) {
      var a = sunAltAt(t, lc);
      if (down ? (prev >= alt && a < alt) : (prev < alt && a >= alt)) return t - step + step * (prev - alt) / (prev - a);
      prev = a;
    }
    return null;
  }
  function loc() {
    var S = win.__laSky, l = S && S.loc ? S.loc() : null;
    return l && isFinite(l.lat) && isFinite(l.lon) ? l : JASPER;
  }
  function tz(lc) { return lc.src === "fallback" ? JASPER_TZ : undefined; }
  function fmtTime(t, lc) {
    try { return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz(lc) }).format(new Date(t)).replace(/\u202f/g, " "); }
    catch (e) { var d = new Date(t); return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); }
  }
  function localHMS(t, lc) {
    try {
      var p = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23", timeZone: tz(lc) }).formatToParts(new Date(t)), o = {};
      p.forEach(function (x) { o[x.type] = +x.value; }); return [o.hour % 24, o.minute, o.second];
    } catch (e) { var d = new Date(t); return [d.getHours(), d.getMinutes(), d.getSeconds()]; }
  }

  /* ---------------- state ---------------- */
  var obsEl, cv, ctx, leafL, leafR, seamEl, astroEl;
  var W = 0, H = 0, dpr = 1, phone = false, leafVis = 96;
  var cam = { cx: 0, cy: 0, f: 1, ct: 1, st: 0, hy: 0 };
  var T = 0, perf0 = 0, speed = 1, done = false, lastT = -1, active = true;
  var CAT = null, NAMED = [], inkPlan = null, POLARIS = [37.95, 89.26];
  var sky = null, skyAt = 0, ringText = "", ringText2 = "", ringKey = "", ringAt = 0, cardFloor = 0;
  var ptr = { tx: 0, ty: 0, x: 0, y: 0 };
  var wxKey = "", clouds = [], drops = [], beads = [], flakes = [], cloudSprites = [], hillCv = null, hillKey = "";
  var shoot = null, nextShoot = 0, sat = null, nextSat = 0, flash = null, nextFlash = 0;
  var astro = null, hub = { x: 0, y: 0, r: 0, top: 0, bottom: 0 }, plaqueBox = null;
  var V = [0, 0, 0], P = [0, 0, 0], Q = [0, 0, 0];

  function te() { return T / (phone ? 9 / 14 : 1); }        // desktop-equivalent intro time
  function seg(k) { var r = TL[k]; return clamp((te() - r[0]) / (r[1] - r[0]), 0, 1); }
  function drift() { return reduce ? 0 : (performance.now() / 1000 - perf0) * (360 / 86164) * 2; } // gentle extra sidereal drift

  function weather() {
    var S = win.__laSky, w = (S && S.weather) || {};
    return { kind: w.kind || "clear", temp: w.temp, hum: w.hum, wind: w.windDir };
  }
  var WXCLOUD = { clear: 0, partly: .45, cloudy: .9, fog: .6, rain: .85, storm: 1, snow: .8 };

  function computeSky() {
    var t = nowMs(), lc = loc(), F = frameOf(t, lc, drift()), sv = [0, 0, 0], mv = [0, 0, 0];
    var ls = sunLam(F.d), se = eqOf(ls, 0); enu(se[0], se[1], F, sv);
    var me = moonEcl(F.d), mq = eqOf(me[0], me[1]); enu(mq[0], mq[1], F, mv);
    var real = Math.asin(sv[2]) / RAD, alt = real;
    if (dbgSky) { var o = { dawn: 1.5, day: 42, dusk: 1.5, night: -30 }[dbgSky]; if (o != null) alt = o; }
    var ph = phaseOf(t);
    sky = {
      t: t, lc: lc, F: F, sunVec: sv, sunAlt: alt, night: clamp((-alt - 4) / 10, 0, 1), twi: clamp(1 - Math.abs(alt - 1) / 9, 0, 1),
      rising: sunAltAt(t + 6e5, lc) > real, moonVec: mv, moonAlt: Math.asin(mv[2]) / RAD, phase: ph, illum: (1 - Math.cos(ph * TAU)) / 2,
      lamSun: ls / RAD, lamMoon: me[0] / RAD
    };
    skyAt = performance.now();
    var w = weather(), rk = w.kind + "|" + w.temp + "|" + (sky.night > .3 ? 1 : 0);
    if (rk !== ringKey || skyAt - ringAt > 30000) { ringKey = rk; ringAt = skyAt; updateRingText(); }
  }

  /* ---------------- camera: rectilinear view facing south through the slit ---------------- */
  function setupCam() {
    cam.cx = W / 2; cam.cy = H / 2; cam.hy = H * (phone ? .86 : .88); cam.f = H * .62;
    var tilt = Math.atan((cam.hy - cam.cy) / cam.f); cam.ct = Math.cos(tilt); cam.st = Math.sin(tilt);
  }
  function project(v, o) {
    var Z = -v[1] * cam.ct + v[2] * cam.st; if (Z < .08) return false;
    var X = -v[0], Y = v[1] * cam.st + v[2] * cam.ct;
    o[0] = cam.cx + cam.f * X / Z; o[1] = cam.cy - cam.f * Y / Z; o[2] = v[2]; return true;
  }
  function slit() { // current left/right edges of the open slit, in px
    var open = shutterOpen(), half = W / 2 - leafVis;
    return [W / 2 - open * half, W / 2 + open * half, open];
  }
  function shutterOpen() {
    var t = te();
    if (t < 1.2) return 0;
    if (t < 1.5) { var u = (t - 1.2) / .3; return .02 * u + Math.sin(t * 90) * .004 * (1 - u); } // mechanical judder
    if (t < 2.3) return lerp(.02, .45, inOut((t - 1.5) / .8));
    if (t < 2.55) return .45 + Math.sin((t - 2.3) / .25 * Math.PI) * .004;                     // first stop
    if (t < 3.5) return lerp(.45, 1, inOut((t - 2.55) / .95));
    return 1;
  }

  /* ---------------- sky colours ---------------- */
  var SKY = [[-18, [6, 10, 28], [12, 18, 44], [22, 28, 62]], [-9, [16, 20, 56], [48, 40, 96], [120, 70, 110]],
    [-3, [40, 52, 112], [150, 96, 150], [255, 128, 96]], [2, [70, 110, 180], [230, 150, 170], [255, 170, 100]],
    [8, [96, 156, 226], [170, 200, 236], [255, 214, 170]], [25, [34, 92, 192], [122, 172, 228], [228, 234, 236]], [90, [26, 80, 180], [112, 164, 226], [222, 230, 236]]];
  function skyColors(wk) {
    var a = sky.sunAlt, i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= a) i++;
    var A = SKY[i], B = SKY[i + 1], t = sstep(clamp((a - A[0]) / (B[0] - A[0]), 0, 1));
    var c = [mixc(A[1], B[1], t), mixc(A[2], B[2], t), mixc(A[3], B[3], t)];
    var night = [[7, 11, 20], [10, 17, 30], [14, 26, 43]];
    var gray = (WXCLOUD[wk] || 0) * (wk === "partly" ? .25 : .7), dim = wk === "storm" ? .45 : wk === "rain" ? .25 : 0;
    for (var k = 0; k < 3; k++) {
      c[k] = mixc(c[k], night[k], sky.night);
      var l = (c[k][0] + c[k][1] + c[k][2]) / 3; c[k] = mixc(c[k], [l, l, l + 6], gray); c[k] = mixc(c[k], [16, 19, 26], dim);
    }
    return c;
  }

  /* ---------------- catalogue ---------------- */
  var NAMED_SET = { "Orion": 1, "Taurus": 1, "Gemini": 1, "Canis Major": 1, "Canis Minor": 1, "Auriga": 1, "Perseus": 1, "Cassiopeia": 1,
    "Andromeda": 1, "Pegasus": 1, "Cygnus": 1, "Lyra": 1, "Aquila": 1, "Ursa Major": 1, "Ursa Minor": 1, "Leo": 1, "Boötes": 1,
    "Scorpius": 1, "Sagittarius": 1, "Aries": 1, "Pisces": 1, "Aquarius": 1, "Capricornus": 1, "Cetus": 1, "Virgo": 1, "Hercules": 1,
    "Corona Borealis": 1, "Draco": 1, "Cepheus": 1, "Delphinus": 1, "Hydra": 1, "Lepus": 1, "Eridanus": 1, "Piscis Austrinus": 1 };
  function loadCat() {
    if (!win.fetch) return;
    fetch("/login-sky-data.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.s) return;
      j.s.forEach(function (s, i) { s[3] = (i * 2.39996) % TAU; });
      CAT = j; NAMED = [];
      j.c.forEach(function (c, ci) {
        if (!NAMED_SET[c.n] || NAMED.some(function (x) { return x.n === c.n; })) return;
        var sx = 0, sy = 0, sz = 0, n = 0, segs = [];
        c.l.forEach(function (l) {
          for (var k = 0; k + 3 < l.length; k += 2) segs.push([l[k], l[k + 1], l[k + 2], l[k + 3]]);
          for (var m = 0; m < l.length; m += 2) { var ra = l[m] * RAD, de = l[m + 1] * RAD; sx += Math.cos(de) * Math.cos(ra); sy += Math.cos(de) * Math.sin(ra); sz += Math.sin(de); n++; }
        });
        if (!n) return;
        var ar = Math.atan2(sy, sx) / RAD, ad = Math.atan2(sz, Math.hypot(sx, sy)) / RAD;
        NAMED.push({ n: c.n, segs: segs, ra: (ar + 360) % 360, dec: ad, seed: ci * 7.31 });
      });
    }).catch(function () {});
  }

  /* ---------------- canvas setup ---------------- */
  function resize() {
    var w = win.innerWidth, h = win.innerHeight, d = Math.min(win.devicePixelRatio || 1, 2);
    var wasPhone = phone; phone = w < 700;
    if (w === W && h === H && d === dpr) return;
    W = w; H = h; dpr = d; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    leafVis = phone ? 24 : clamp(Math.round(W * .075), 56, 120);
    setupCam(); buildLeaves(); hillKey = ""; wxKey = "";
    if (!astro || wasPhone !== phone) buildAstro();
    measureHub();
  }
  function measureHub() {
    if (!astroEl) return;
    var b = astroEl.getBoundingClientRect();
    hub.x = b.left + b.width / 2; hub.y = b.top + b.height / 2; hub.r = b.width / 2; hub.top = b.top; hub.bottom = b.bottom;
    var pq = doc.querySelector("a.study-pill"), pb = pq && pq.getBoundingClientRect(); plaqueBox = pb && pb.width ? { left: pb.left, right: pb.right, top: pb.top, bottom: pb.bottom } : null;
  }

  /* ---------------- the dome shutters (SVG, regenerated on resize) ---------------- */
  function leafSVG(side, w, h) {
    var L = side === "l", id = "obsL" + side, s = [];
    var inner = L ? w : 0, dir = L ? -1 : 1, n = Math.max(3, Math.round(w / 120)), trim = 9;
    s.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">');
    s.push('<defs><pattern id="' + id + 'r" width="6" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="9" r="1.3" fill="' + BRASS_LO + '"/><circle cx="2.6" cy="8.6" r=".5" fill="' + BRASS_HI + '" opacity=".75"/></pattern>');
    s.push('<pattern id="' + id + 'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(' + (L ? 35 : -35) + ')"><path d="M0 0V5" stroke="#EDE6D6" stroke-width=".6" opacity=".11"/></pattern>');
    s.push('<linearGradient id="' + id + 'm" x1="' + (L ? 0 : 1) + '" x2="' + (L ? 1 : 0) + '" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>');
    s.push('<mask id="' + id + 'k"><rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'm)"/></mask></defs>');
    s.push('<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'h)" mask="url(#' + id + 'k)"/>');
    // dome ribs: curved, as if arching over the viewer
    for (var j = 1; j < 8; j++) {
      var y = h * j / 8, bow = h * .03;
      s.push('<path d="M0 ' + (y + 2).toFixed(1) + 'Q' + (w / 2) + ' ' + (y + 2 - bow).toFixed(1) + ' ' + w + ' ' + (y + 2).toFixed(1) + '" stroke="#06100b" stroke-width="2" fill="none" opacity=".55"/>');
      s.push('<path d="M0 ' + y.toFixed(1) + 'Q' + (w / 2) + ' ' + (y - bow).toFixed(1) + ' ' + w + ' ' + y.toFixed(1) + '" stroke="' + BRASS_LO + '" stroke-width=".9" fill="none" opacity=".8"/>');
    }
    // riveted panel seams
    for (var i = 1; i < n; i++) {
      var x = Math.round(L ? i * (w - trim) / n : trim + i * (w - trim) / n);
      s.push('<path d="M' + x + ' 0V' + h + '" stroke="#06100b" stroke-width="1.4"/><path d="M' + (x + 1) + ' 0V' + h + '" stroke="#EDE6D6" stroke-width=".6" opacity=".12"/>');
      s.push('<rect x="' + (x - 8) + '" y="0" width="6" height="' + h + '" fill="url(#' + id + 'r)"/><rect x="' + (x + 3) + '" y="9" width="6" height="' + h + '" fill="url(#' + id + 'r)"/>');
    }
    // brass trim along the slit edge, with bolts, and the dark weather seal
    var tx = L ? w - trim : 0;
    s.push('<rect x="' + tx + '" y="0" width="' + trim + '" height="' + h + '" fill="#4a3612"/>');
    s.push('<path d="M' + (L ? tx + .5 : trim - .5) + ' 0V' + h + '" stroke="' + BRASS + '" stroke-width=".9"/>');
    s.push('<path d="M' + (L ? w - 1 : 1) + ' 0V' + h + '" stroke="#04070c" stroke-width="2"/>');
    for (var b = 23; b < h; b += 46) s.push('<circle cx="' + (tx + trim / 2) + '" cy="' + b + '" r="1.6" fill="' + BRASS + '"/><circle cx="' + (tx + trim / 2 - .5) + '" cy="' + (b - .5) + '" r=".6" fill="' + BRASS_HI + '"/>');
    s.push('</svg>');
    return s.join("");
  }
  function buildLeaves() {
    var w = Math.ceil(W / 2) + 2, h = H + 4;
    leafL.innerHTML = leafSVG("l", w, h); leafR.innerHTML = leafSVG("r", w, h);
  }

  /* ---------------- the astrolabe (SVG) ---------------- */
  var ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  var SIGNS = ["ARIES", "TAVRVS", "GEMINI", "CANCER", "LEO", "VIRGO", "LIBRA", "SCORPIO", "SAGITTARIVS", "CAPRICORNVS", "AQVARIVS", "PISCES"];
  var RETE_STARS = [["Sirius", 101.29, -16.72], ["Rigel", 78.63, -8.2], ["Betelgeuse", 88.79, 7.41], ["Procyon", 114.83, 5.22],
    ["Aldebaran", 68.98, 16.51], ["Regulus", 152.09, 11.97], ["Spica", 201.3, -11.16], ["Arcturus", 213.92, 19.18],
    ["Altair", 297.7, 8.87], ["Alphard", 141.9, -8.66], ["Deneb Kaitos", 10.9, -17.99], ["Markab", 346.19, 15.21], ["Antares", 247.35, -26.43]];
  function f1(v) { return (+v).toFixed(1); }
  function pt(r, a) { a *= RAD; return [r * Math.sin(a), -r * Math.cos(a)]; } // a: degrees clockwise from top
  function arcD(r, a0, a1) { // arc path from a0 to a1 (degrees clockwise from top), direction by sign
    var p0 = pt(r, a0), p1 = pt(r, a1), big = Math.abs(a1 - a0) > 180 ? 1 : 0, sw = a1 > a0 ? 1 : 0;
    return "M" + f1(p0[0]) + " " + f1(p0[1]) + "A" + r + " " + r + " 0 " + big + " " + sw + " " + f1(p1[0]) + " " + f1(p1[1]);
  }
  function band(r0, r1) { var m = (r0 + r1) / 2; return '<circle class="obs-band" r="' + m + '" fill="none" stroke-width="' + (r1 - r0) + '"/>'; }
  function ring(r, w, c, o) { return '<circle r="' + r + '" fill="none" stroke="' + (c || BRASS) + '" stroke-width="' + (w || .9) + '"' + (o ? ' opacity="' + o + '"' : "") + "/>"; }
  function lamAngle(l) { return 270 - l; } // ecliptic longitude to dial angle: Aries at 9 o'clock, eastward counter-clockwise
  function retePos(ra, dec, Req) { var r = Req * Math.tan((90 - dec) / 2 * RAD); return pt(r, -ra); }

  function buildAstro() {
    var R = phone ? 180 : 310, s = [], G = {};
    G.R = R; G.hIn = R - (phone ? 20 : 28);
    G.zOut = G.hIn; G.zIn = phone ? G.hIn : R - 54;
    G.tOut = G.zIn; G.tIn = G.tOut - (phone ? 22 : 24);
    G.cap = G.tIn - 5; G.Req = G.cap / Math.tan((90 + 23.44) / 2 * RAD);
    G.eye = phone ? 44 : G.tIn - 4;
    var fs = phone ? 8.5 : 11;
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (-R - 8) + ' ' + (-R - 8) + ' ' + (2 * R + 16) + ' ' + (2 * R + 16) + '" aria-hidden="true" focusable="false">');
    s.push('<defs><path id="obsTxtTop" d="' + arcD(G.tIn + (phone ? 6.5 : 8.5), -88, 88) + '"/><path id="obsTxtBot" d="' + arcD(G.tOut - (phone ? 6 : 8), 268, 92) + '"/></defs>');

    // the face: invisible at night (the sky shows through), warm parchment by day
    s.push('<g id="obsFace" opacity="0"><circle class="obs-face" r="' + R + '"/><circle class="obs-face-in" r="' + G.tIn + '"/></g>');
    // rete: the star-pointer lattice, turned by sidereal time (drawn first, under the rings)
    s.push('<g id="obsRete" opacity="0">');
    s.push(ring(G.cap, 1.1, BRASS, .9) + ring(G.Req, .5, BRASS, .45));
    var ecl = [];
    for (var l = 0; l <= 360; l += 4) { var e = eqOf(l * RAD, 0), p = retePos(e[0], e[1], G.Req); ecl.push((l ? "L" : "M") + f1(p[0]) + " " + f1(p[1])); }
    s.push('<path d="' + ecl.join("") + 'Z" fill="none" stroke="' + BRASS + '" stroke-width="1" opacity=".85"/>');
    // fretwork: four curled bars from the Capricorn circle
    for (var q = 0; q < 4; q++) {
      var a0 = 45 + q * 90, o1 = pt(G.cap, a0), o2 = pt(G.cap * .78, a0 + 14), o3 = pt(G.cap * .62, a0 - 6);
      s.push('<path d="M' + f1(o1[0]) + " " + f1(o1[1]) + "Q" + f1(o2[0]) + " " + f1(o2[1]) + " " + f1(o3[0]) + " " + f1(o3[1]) + '" fill="none" stroke="' + BRASS + '" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>');
      s.push('<circle cx="' + f1(o3[0]) + '" cy="' + f1(o3[1]) + '" r="2.2" fill="none" stroke="' + BRASS + '" stroke-width="1" opacity=".7"/>');
    }
    RETE_STARS.forEach(function (st) {
      var r = G.Req * Math.tan((90 - st[2]) / 2 * RAD); if (r > G.cap + 2) return;
      var a = -st[1], tip = pt(r, a), out = Math.min(G.cap, r + (phone ? 9 : 13)), b1 = pt(out, a - (phone ? 3.4 : 2.6)), b2 = pt(out, a + (phone ? 3.4 : 2.6)), mid = pt((r + out) / 2, a + 1.2);
      s.push('<path d="M' + f1(b1[0]) + " " + f1(b1[1]) + "Q" + f1(mid[0]) + " " + f1(mid[1]) + " " + f1(tip[0]) + " " + f1(tip[1]) + "Q" + f1(mid[0]) + " " + f1(mid[1]) + " " + f1(b2[0]) + " " + f1(b2[1]) + 'Z" fill="' + BRASS + '" stroke="' + BRASS_LO + '" stroke-width=".4"/>');
      s.push('<circle cx="' + f1(tip[0]) + '" cy="' + f1(tip[1]) + '" r="1.1" fill="' + BRASS_HI + '"/>');
      if (!phone) { var lp = pt(r - 9, a); s.push('<text class="obs-it" x="' + f1(lp[0]) + '" y="' + f1(lp[1]) + '" font-size="7.5" fill="' + BRASS + '" opacity=".8" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + f1(a) + " " + f1(lp[0]) + " " + f1(lp[1]) + ')">' + st[0] + "</text>"); }
    });
    s.push("</g>");

    // eyepiece rim around the card (knurled, it turns as the lens focuses)
    s.push('<g id="obsEye" opacity="0">' + ring(G.eye, 1.3) + ring(G.eye - 5, .6, BRASS, .8) + '<g id="obsKnurl">');
    for (var k = 0; k < 360; k += phone ? 6 : 3) { var k0 = pt(G.eye - 5, k), k1 = pt(G.eye, k); s.push('<path d="M' + f1(k0[0]) + " " + f1(k0[1]) + "L" + f1(k1[0]) + " " + f1(k1[1]) + '" stroke="' + BRASS + '" stroke-width=".6" opacity=".7"/>'); }
    s.push('</g><circle id="obsIris" r="' + (G.eye + 2) + '" fill="none" stroke="' + BRASS_HI + '" stroke-width="1.4" stroke-dasharray="' + f1(TAU * (G.eye + 2)) + '" stroke-dashoffset="' + f1(TAU * (G.eye + 2)) + '" transform="rotate(-90)"/></g>');

    // inner ring: engraved readings on a curve
    s.push('<g id="obsRingI" opacity="0">' + band(G.tIn, G.tOut) + ring(G.tIn, .9) + ring(G.tOut, .9));
    s.push('<text font-size="' + (phone ? 9 : 10.5) + '" letter-spacing="' + (phone ? 1.4 : 2.1) + '" fill="#EDE6D6"><textPath id="obsTxt1" href="#obsTxtTop" startOffset="50%" text-anchor="middle"></textPath></text>');
    if (!phone) s.push('<text font-size="10" letter-spacing="2.1" fill="#EDE6D6" opacity=".78"><textPath id="obsTxt2" href="#obsTxtBot" startOffset="50%" text-anchor="middle"></textPath></text>');
    s.push("</g>");

    // middle ring: zodiac / ecliptic degrees with today's sun and moon (desktop)
    if (!phone) {
      s.push('<g id="obsRingM" opacity="0">' + band(G.zIn, G.zOut) + ring(G.zIn, .9) + ring(G.zOut, .9));
      var tk = [];
      for (var dg = 0; dg < 360; dg++) {
        var aa = lamAngle(dg), len = dg % 30 === 0 ? G.zOut - G.zIn : dg % 5 === 0 ? 7 : 3.5, t0 = pt(G.zOut - len, aa), t1 = pt(G.zOut, aa);
        tk.push("M" + f1(t0[0]) + " " + f1(t0[1]) + "L" + f1(t1[0]) + " " + f1(t1[1]));
      }
      s.push('<path d="' + tk.join("") + '" stroke="' + BRASS + '" stroke-width=".55" opacity=".85"/>');
      for (var z = 0; z < 12; z++) {
        var c0 = lamAngle(z * 30), c1 = lamAngle(z * 30 + 30), mida = ((c0 + c1) / 2 + 360) % 360, top = mida >= 270 || mida <= 90;
        var lo = Math.min(c0, c1), hi = Math.max(c0, c1);
        var d = top ? arcD(G.zIn + 6.5, lo, hi) : arcD(G.zIn + 13.5, hi, lo); // upright both ways: clockwise on top, counter-clockwise below
        s.push('<path id="obsZ' + z + '" d="' + d + '" fill="none"/><text font-size="8.6" letter-spacing="2.2" fill="' + BRASS_HI + '" opacity=".9"><textPath href="#obsZ' + z + '" startOffset="50%" text-anchor="middle">' + SIGNS[z] + "</textPath></text>");
      }
      s.push('<g id="obsSun"><circle class="obs-dot" r="6.6"/><circle r="3.4" fill="' + BRASS_HI + '"/>');
      for (var ry = 0; ry < 8; ry++) { var r0 = pt(4.6, ry * 45), r1 = pt(6.8, ry * 45); s.push('<path d="M' + f1(r0[0]) + " " + f1(r0[1]) + "L" + f1(r1[0]) + " " + f1(r1[1]) + '" stroke="' + BRASS_HI + '" stroke-width=".8" stroke-linecap="round"/>'); }
      s.push('</g><g id="obsMoonMark"><circle class="obs-dot" r="6.2"/><path d="M1.6 -4.2A4.4 4.4 0 1 0 1.6 4.2A3.3 3.3 0 1 1 1.6 -4.2Z" fill="#EDE6D6"/></g></g>');
    }

    // outer ring: 24 hours of Jasper time, noon at the top
    s.push('<g id="obsRingO" opacity="0">' + band(G.hIn, R) + ring(R, 1.3) + ring(R - 3, .55, BRASS, .8) + ring(G.hIn, .9));
    var ht = [];
    for (var i = 0; i < 96; i++) {
      var ha = i * 3.75, hl = i % 4 === 0 ? (phone ? 6 : 8) : i % 2 === 0 ? 4.5 : 2.6, h0 = pt(G.hIn, ha), h1 = pt(G.hIn + hl, ha);
      ht.push("M" + f1(h0[0]) + " " + f1(h0[1]) + "L" + f1(h1[0]) + " " + f1(h1[1]));
    }
    s.push('<path d="' + ht.join("") + '" stroke="' + BRASS + '" stroke-width=".7"/>');
    for (var hr = 0; hr < 24; hr++) {
      var na = (hr - 12) * 15, np = pt(R - (phone ? 8.5 : 11.5), na);
      s.push('<text x="' + f1(np[0]) + '" y="' + f1(np[1]) + '" font-size="' + fs + '" fill="' + BRASS_HI + '" text-anchor="middle" dominant-baseline="central" transform="rotate(' + na + " " + f1(np[0]) + " " + f1(np[1]) + ')">' + ROMAN[hr % 12] + "</text>");
    }
    s.push("</g>");

    // time hand and the ticking seconds bead
    var tipR = R + 7, tail = phone ? G.tIn + 2 : G.zIn - 2;
    s.push('<g id="obsHand" opacity="0"><path d="M0 ' + (-tipR) + "L3.2 " + (-(G.hIn - 2)) + "L0 " + (-tail) + "L-3.2 " + (-(G.hIn - 2)) + 'Z" fill="' + BRASS + '" stroke="' + BRASS_LO + '" stroke-width=".7"/><circle cy="' + (-tipR - 2.5) + '" r="2.2" fill="none" stroke="' + BRASS + '" stroke-width="1"/><path d="M0 ' + (-(R - 2)) + "V" + (-(G.hIn + 2)) + '" stroke="' + BRASS_LO + '" stroke-width=".8"/></g>');
    s.push('<g id="obsSec" opacity="0"><circle cy="' + (-(G.hIn + 2.4)) + '" r="1.7" fill="' + BRASS_HI + '"/></g>');
    s.push("</svg>");
    astroEl.innerHTML = s.join("");
    function $(id) { return astroEl.querySelector("#" + id); }
    astro = { G: G, face: $("obsFace"), rete: $("obsRete"), eye: $("obsEye"), knurl: $("obsKnurl"), iris: $("obsIris"), ringI: $("obsRingI"), ringM: $("obsRingM"),
      ringO: $("obsRingO"), hand: $("obsHand"), sec: $("obsSec"), sun: $("obsSun"), moonMark: $("obsMoonMark"), t1: $("obsTxt1"), t2: $("obsTxt2"),
      irisLen: TAU * (G.eye + 2), cache: {}, handA: null, secA: null };
    ringText = ""; updateRingText();
  }

  function phaseName(p) {
    if (p < .03 || p > .97) return "NEW";
    if (p < .22) return "WAXING CRESCENT"; if (p < .28) return "FIRST QUARTER"; if (p < .47) return "WAXING GIBBOUS";
    if (p < .53) return "FULL"; if (p < .72) return "WANING GIBBOUS"; if (p < .78) return "LAST QUARTER"; return "WANING CRESCENT";
  }
  var WXWORD = { clear: "CLEAR", partly: "PARTLY CLOUDY", cloudy: "OVERCAST", rain: "RAIN", storm: "THUNDER", snow: "SNOW", fog: "FOG" };
  function updateRingText() {
    if (!astro || !sky) return;
    var lc = sky.lc, w = weather(), t = sky.t, parts = [];
    parts.push("MOON " + phaseName(sky.phase) + " " + Math.round(sky.illum * 100) + "%");
    // always look ahead: daylight shows when it next gets dark, night shows the next sunrise
    if (sky.night < .3) { var dark = crossing(t, lc, -12, true, 26); if (dark) parts.push("NEXT DARK " + fmtTime(dark, lc)); }
    else { var rise = crossing(t, lc, -.833, false, 26); if (rise) parts.push("SUNRISE " + fmtTime(rise, lc)); }
    parts.push((isFinite(w.temp) ? Math.round(w.temp) + "°F " : "") + (WXWORD[w.kind] || "CLEAR"));
    var txt = parts.join("  ·  ");
    var lat = Math.abs(lc.lat).toFixed(2) + "° " + (lc.lat >= 0 ? "N" : "S"), lon = Math.abs(lc.lon).toFixed(2) + "° " + (lc.lon >= 0 ? "E" : "W");
    var txt2 = (lc.src === "fallback" ? "JASPER  ·  INDIANA  ·  " : "") + lat + "  ·  " + lon;
    if (txt !== ringText) { ringText = txt; if (astro.t1) astro.t1.textContent = txt; }
    if (txt2 !== ringText2 || (astro.t2 && !astro.t2.textContent)) { ringText2 = txt2; if (astro.t2) astro.t2.textContent = txt2; }
    if (astro.sun) setAttr(astro.sun, "transform", "translate(" + pt(astro.G.zIn + 13, lamAngle(sky.lamSun)).map(f1).join(" ") + ")");
    if (astro.moonMark) setAttr(astro.moonMark, "transform", "translate(" + pt(astro.G.zIn + 13, lamAngle(sky.lamMoon)).map(f1).join(" ") + ")");
  }
  function setAttr(el, k, v) { if (!el) return; var c = el.__obs || (el.__obs = {}); if (c[k] !== v) { c[k] = v; el.setAttribute(k, v); } }
  function setOp(el, v) { setAttr(el, "opacity", (+v).toFixed(3)); }
  var cssCache = {};
  function setVar(k, v) { v = (+v).toFixed(3); if (cssCache[k] !== v) { cssCache[k] = v; root.style.setProperty(k, v); } }

  function updateAstro(F) {
    if (!astro) return;
    function assemble(el, key, from) {
      var u = seg(key), e = u >= 1 ? 1 : outBack(u, 1.15);
      setOp(el, clamp(u * 3, 0, 1));
      setAttr(el, "transform", u >= 1 ? "" : "rotate(" + f1(from * (1 - e)) + ") scale(" + (1 + .06 * (1 - e)).toFixed(3) + ")");
    }
    assemble(astro.ringO, "ringO", -80);
    setOp(astro.face, clamp(seg("ringO") * 2, 0, 1));
    if (astro.ringM) assemble(astro.ringM, "ringM", 110);
    assemble(astro.ringI, "ringI", -150);
    var ue = seg("eye"); setOp(astro.eye, ue); setAttr(astro.eye, "transform", ue >= 1 ? "" : "scale(" + (.7 + .3 * outCubic(ue)).toFixed(3) + ")");
    var fz = inOut(seg("focus"));
    setAttr(astro.knurl, "transform", fz >= 1 ? "" : "rotate(" + f1(-70 * (1 - fz)) + ")");
    setAttr(astro.iris, "stroke-dashoffset", f1(astro.irisLen * (1 - fz)));
    setOp(astro.iris, fz >= 1 ? .55 : .9);
    // rete: flies in, then follows local sidereal time (a full turn per sidereal day)
    var ur = seg("rete"), er = ur >= 1 ? 1 : outBack(ur, 1.1);
    setOp(astro.rete, clamp(ur * 2.5, 0, 1) * .95);
    setAttr(astro.rete, "transform", "rotate(" + (F.L + 70 * (1 - er)).toFixed(2) + ")");
    // hand: sweeps into place, then ticks once a minute; the bead ticks each second
    var hms = localHMS(nowMs(), sky.lc), target = ((hms[0] + hms[1] / 60) - 12) * 15, uh = seg("hand");
    if (astro.handA == null || uh < 1) astro.handA = target - 200 * (1 - outBack(uh, 1.2)); else astro.handA += (target - astro.handA) * .25;
    setOp(astro.hand, clamp(uh * 3, 0, 1)); setAttr(astro.hand, "transform", "rotate(" + astro.handA.toFixed(2) + ")");
    setOp(astro.sec, clamp(uh * 3, 0, 1)); setAttr(astro.sec, "transform", "rotate(" + hms[2] * 6 + ")");
  }

  /* ---------------- weather props (sprites + particles) ---------------- */
  function makeCloud(seed, w, h, nightK, heavy) {
    var r = seeded(seed), lobes = [], base = h * (.7 + r() * .08);
    // main heads: uneven sizes and spacing, one or two towering, never a row of equal bubbles
    var n = 3 + (r() * 4 | 0), x = w * (.1 + r() * .06), peak = 1 + (r() * (n - 2) | 0);
    for (var i = 0; i < n; i++) {
      var big = i === peak || (i === peak + 1 && r() < .4), rr = h * (big ? .28 + r() * .14 : .1 + r() * .14);
      x += (i ? rr * (.7 + r() * .5) : 0); if (x > w * .88) break;
      lobes.push([x, base - rr * (.45 + r() * .5), rr]); x += rr * (.35 + r() * .45);
    }
    // a ragged fringe of small curls along the upper edges
    lobes.slice().forEach(function (l) {
      var k = 2 + (r() * 4 | 0);
      for (var j = 0; j < k; j++) { var an = Math.PI * (1.05 + r() * .9), d = l[2] * (.82 + r() * .2), rs = l[2] * (.16 + r() * .24); lobes.push([l[0] + Math.cos(an) * d, l[1] + Math.sin(an) * d, rs]); }
    });
    // a broken, slightly lifted base instead of a smooth ellipse
    var x0 = lobes[0][0] - lobes[0][2] * .6, x1 = 0; lobes.forEach(function (l) { x1 = Math.max(x1, l[0] + l[2] * .5); });
    for (var bx = x0; bx < x1; bx += h * (.06 + r() * .07)) lobes.push([bx, base - h * (.04 + r() * .05), h * (.05 + r() * .06)]);
    // fit the sprite to the drawing: shift so nothing is cut at the top or the sides
    var minX = 1e9, maxX = -1e9, minY = 1e9; lobes.forEach(function (l) { minX = Math.min(minX, l[0] - l[2]); maxX = Math.max(maxX, l[0] + l[2]); minY = Math.min(minY, l[1] - l[2]); });
    var sx = 3 - minX, sy = 3 - minY; lobes.forEach(function (l) { l[0] += sx; l[1] += sy; }); x0 += sx; x1 += sx; base += sy;
    var maxY = base; lobes.forEach(function (l) { maxY = Math.max(maxY, l[1] + l[2]); }); w = Math.ceil(maxX - minX + 6); h = Math.ceil(maxY + 3);
    var c = doc.createElement("canvas"); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    var g = c.getContext("2d"); g.scale(dpr, dpr);
    function shape(cx) { cx.beginPath(); lobes.forEach(function (l) { cx.moveTo(l[0] + l[2], l[1]); cx.arc(l[0], l[1], l[2], 0, TAU); }); cx.rect(x0, base - h * .1, x1 - x0, h * .08); }
    var top = h; lobes.forEach(function (l) { top = Math.min(top, l[1] - l[2]); });
    var line = nightK > .5 ? [196, 204, 216] : [255, 255, 255], shade = nightK > .5 ? [120, 130, 150] : [126, 142, 170];
    var body = nightK > .5 ? [12, 18, 30] : [226, 233, 244];
    if (heavy) { line = mixc(line, [150, 156, 170], .35); body = mixc(body, [70, 76, 92], nightK > .5 ? .2 : .5); }
    // fades from full at the crown to nothing at the base, the way an engraver lifts the burin
    function fade(col, a0, a1) { var lg = g.createLinearGradient(0, top, 0, base); lg.addColorStop(0, rgba(col, a0)); lg.addColorStop(.55, rgba(col, a0 * .6)); lg.addColorStop(1, rgba(col, a1)); return lg; }
    g.save(); shape(g); g.clip();
    g.fillStyle = fade(body, nightK > .5 ? .82 : .78, nightK > .5 ? .5 : .4); g.fillRect(0, 0, w, h);
    g.lineCap = "round"; g.lineWidth = .8;
    g.strokeStyle = fade(line, nightK > .5 ? .5 : .9, 0); g.beginPath();
    for (var hx = -h; hx < w + h; hx += 3.2 + r() * .8) { var y0 = top + r() * 3; g.moveTo(hx, y0); g.lineTo(hx + (base - y0) * .34, base); } g.stroke();
    // cross-hatching only in the shaded crowns' undersides, also fading out downward
    g.strokeStyle = fade(shade, nightK > .5 ? .5 : .6, 0); g.lineWidth = .7; g.beginPath();
    lobes.forEach(function (l) { if (l[2] < h * .14) return; for (var q = -l[2]; q < l[2]; q += 3) { g.moveTo(l[0] + q, l[1] + l[2] * .15); g.lineTo(l[0] + q - l[2] * .35, l[1] + l[2] * .95); } });
    g.stroke();
    g.restore();
    // crisp outer silhouette only, strong on top, dissolving at the base
    var o = doc.createElement("canvas"); o.width = c.width; o.height = c.height; var og = o.getContext("2d"); og.scale(dpr, dpr);
    var ol = og.createLinearGradient(0, top, 0, base); ol.addColorStop(0, rgba(line, nightK > .5 ? .75 : .95)); ol.addColorStop(.7, rgba(line, nightK > .5 ? .45 : .6)); ol.addColorStop(1, rgba(line, .05));
    og.strokeStyle = ol; og.lineWidth = 2; shape(og); og.stroke();
    og.globalCompositeOperation = "destination-out"; shape(og); og.fill();
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(o, 0, 0);
    return { cv: c, w: w, h: h };
  }
  function setupWeather(wk) {
    var nightK = sky.night > .5 ? 1 : 0, heavy = wk === "rain" || wk === "storm" || wk === "snow", r = seeded(29);
    var n = { partly: 5, cloudy: 11, rain: 9, storm: 10, snow: 8, fog: 3 }[wk] || 0, sc = phone ? .62 : 1;
    cloudSprites = []; for (var i = 0; i < Math.min(n, 7); i++) { var cw = 300 * sc * (.55 + r() * 1.0); cloudSprites.push(makeCloud(101 + i * 17, cw, cw * (.36 + r() * .14), nightK, heavy)); }
    clouds = []; for (var j = 0; j < n; j++) clouds.push({ x: r() * 1.3 - .15, y: .1 + r() * (wk === "cloudy" || heavy ? .55 : .45), s: .65 + r() * .8, k: j % Math.max(1, cloudSprites.length), v: .5 + r() });
    clouds.sort(function (a, b) { return a.s - b.s; }); // small, far clouds first
    var area = clamp(W * H / (1280 * 800), .35, 1.6);
    drops = []; var m = Math.round((wk === "rain" ? 170 : wk === "storm" ? 230 : 0) * area);
    for (var d = 0; d < m; d++) drops.push({ x: r(), y: r(), z: .4 + r() * .6 });
    flakes = []; var fsn = wk === "snow" ? Math.round(120 * area) : 0;
    for (var f = 0; f < fsn; f++) flakes.push({ x: r(), y: r(), z: .4 + r() * .6, ph: r() * TAU, rot: r() * TAU });
    beads = []; if (wk === "rain" || wk === "storm") for (var b = 0; b < (phone ? 18 : 34); b++) beads.push({ side: b % 2, dx: Math.pow(r(), 1.6) * (phone ? 26 : 64), y: r(), r: 1.1 + r() * 2.6, v: r() < .3 ? .01 + r() * .03 : 0 });
    nextFlash = 0;
  }
  function windX() { var w = weather().wind; return isFinite(w) ? Math.sin(w * RAD) : -.6; } // facing south: west is screen right

  /* ---------------- hills (pre-rendered) ---------------- */
  function buildHills() {
    var c = hillCv || (hillCv = doc.createElement("canvas")); c.width = Math.ceil((W + 40) * dpr); c.height = Math.ceil(H * .3 * dpr);
    var g = c.getContext("2d"), top = cam.hy - H * .1, r = seeded(5), n = sky.night, day = clamp((sky.sunAlt + 4) / 14, 0, 1);
    g.setTransform(dpr, 0, 0, dpr, 0, -top * dpr); g.translate(20, 0);
    var far = mixc([16, 36, 27], [61, 115, 86], day), near = mixc([9, 22, 16], [47, 93, 70], day);
    function ridge(base, amp, f, ph) { var p = []; for (var x = -24; x <= W + 24; x += 4) p.push([x, base - amp * (.55 + .3 * Math.sin(x * f + ph) + .15 * Math.sin(x * f * 2.7 + ph * 1.9))]); return p; }
    var fr = ridge(cam.hy - H * .012, H * .04, .0042, 1.3), nr = ridge(cam.hy + H * .018, H * .03, .0027, 4.1);
    g.fillStyle = rgba(far); g.beginPath(); g.moveTo(-24, H); fr.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(W + 24, H); g.fill();
    g.strokeStyle = rgba([94, 156, 118], .35 + .2 * n); g.lineWidth = 1; g.beginPath(); fr.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
    // near ridge with a hand-drawn conifer line
    g.fillStyle = rgba(near); g.beginPath(); g.moveTo(-24, H);
    var xi, tw = phone ? .7 : 1;
    nr.forEach(function (p) { g.lineTo(p[0], p[1]); });
    g.lineTo(W + 24, H); g.fill();
    for (var k = 0; k < nr.length; k++) {
      xi = nr[k][0]; if (r() < .55) continue;
      var y = nr[k][1] + 1, th = (5 + r() * 9) * tw, tw2 = th * .36;
      g.beginPath(); g.moveTo(xi - tw2, y); g.lineTo(xi, y - th); g.lineTo(xi + tw2, y); g.fill();
    }
    g.save(); g.beginPath(); g.moveTo(-24, H); nr.forEach(function (p) { g.lineTo(p[0], p[1] + 4); }); g.lineTo(W + 24, H); g.clip();
    g.strokeStyle = rgba(CREAM, .045); g.lineWidth = .7; g.beginPath(); for (var yy = cam.hy - H * .04; yy < H; yy += 3.2) { g.moveTo(-24, yy); g.lineTo(W + 24, yy); } g.stroke(); g.restore();
    hillCv.top = top;
  }
  function hillAt(x) { return cam.hy + H * .018 - H * .03 * (.55 + .3 * Math.sin(x * .0027 + 4.1) + .15 * Math.sin(x * .0027 * 2.7 + 4.1 * 1.9)); }

  /* ---------------- drawing ---------------- */
  function drawBackground(c, wk, t) {
    var lg = ctx.createLinearGradient(0, 0, 0, cam.hy);
    lg.addColorStop(0, rgba(c[0])); lg.addColorStop(.62, rgba(c[1])); lg.addColorStop(1, rgba(c[2]));
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    // slow radial vignette, never a flat sky
    var vx = W / 2 + Math.sin(t / 37) * W * .06, vg = ctx.createRadialGradient(vx, cam.hy, H * .2, vx, cam.hy, Math.max(W, H) * .95);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(2,4,9," + (.5 * sky.night + .08 * sky.night).toFixed(3) + ")");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // daylight haze: the sky pales toward a milky horizon
    var day = clamp((sky.sunAlt + 2) / 12, 0, 1) * (1 - sky.night);
    if (day > .02) { var hz = ctx.createLinearGradient(0, cam.hy * .45, 0, cam.hy); hz.addColorStop(0, "rgba(236,238,234,0)"); hz.addColorStop(.7, "rgba(236,238,234," + (.28 * day).toFixed(3) + ")"); hz.addColorStop(1, "rgba(240,238,228," + (.62 * day).toFixed(3) + ")"); ctx.fillStyle = hz; ctx.fillRect(0, cam.hy * .45, W, cam.hy * .55 + 2); }
    // airglow: a forest-green band at the horizon on clear nights
    var ag = sky.night * (1 - (WXCLOUD[wk] || 0));
    if (ag > .02) { var g2 = ctx.createLinearGradient(0, cam.hy - H * .2, 0, cam.hy); g2.addColorStop(0, "rgba(94,156,118,0)"); g2.addColorStop(1, "rgba(94,156,118," + (.2 * ag).toFixed(3) + ")"); ctx.fillStyle = g2; ctx.fillRect(0, cam.hy - H * .2, W, H * .2); }
    // twilight glow on the sun's side
    if (sky.twi > .02) {
      var sv = sky.sunVec, sx = W / 2 + (-sv[0]) * W * .55;
      var rg = ctx.createRadialGradient(sx, cam.hy, 0, sx, cam.hy, W * .7);
      rg.addColorStop(0, "rgba(242,170,100," + (.5 * sky.twi * (1 - (WXCLOUD[wk] || 0) * .6)).toFixed(3) + ")"); rg.addColorStop(1, "rgba(242,170,100,0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
  }
  function drawGrid(F, vis, ox, oy) {
    var a = vis * seg("ink"); if (a < .01) return;
    ctx.save(); ctx.translate(ox, oy); ctx.setLineDash([1.2, 4.5]); ctx.lineWidth = .7; ctx.strokeStyle = rgba(CREAM, .1 * a);
    function poly(fn, n) { var on = false; ctx.beginPath(); for (var i = 0; i <= n; i++) { var c = fn(i / n); if (project(enu(c[0], c[1], F, V), P) && P[2] > -0.05) { on ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]); on = true; } else on = false; } ctx.stroke(); }
    [-30, 0, 30, 60].forEach(function (dec) { poly(function (u) { return [u * 360, dec]; }, 120); });
    for (var ra = 0; ra < 360; ra += 30) poly(function (u) { return [ra, -70 + u * 155]; }, 60);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = "rgba(217,164,65," + (.22 * a).toFixed(3) + ")";
    poly(function (u) { var e = eqOf(u * TAU, 0); return e; }, 120);
    ctx.restore();
  }
  function starAppear(mag) {
    var t = te(), on = 1.6 + clamp((mag + 1.5) / 7, 0, 1) * 2.1;
    if (t < on) return 0; var d = t - on;
    if (d < 1 / 30) return 1.7;                      // a one-frame twinkle-on
    return Math.min(1, .55 + d / .35 * .45);
  }
  function drawStars(F, vis, t, ox, oy) {
    if (!CAT || vis < .02) return;
    var S = CAT.s, sl = slit(), x0 = sl[0] - 4, x1 = sl[1] + 4;
    if (x1 - x0 < 6) return;
    ctx.save(); ctx.translate(ox, oy);
    for (var i = 0; i < S.length; i++) {
      var s = S[i], ap = starAppear(s[2]); if (!ap) continue;
      if (!project(enu(s[0], s[1], F, V), P) || P[2] < 0) continue;
      var x = P[0], y = P[1]; if (x < x0 - ox || x > x1 - ox || y < -4 || y > cam.hy + 8) continue;
      var alt = P[2], amp = reduce ? .08 : .12 + .5 * Math.pow(1 - alt, 3);
      var tw = reduce ? 1 - amp * (.5 + .5 * Math.sin(t * .35 + s[3])) : 1 - amp * (.5 + .5 * Math.sin(t * (2.2 + (s[3] % 2.6)) + s[3] * 7));
      var b = clamp((6.1 - s[2]) / 4.4, .12, 1) * vis * tw * clamp(alt / .16, .3, 1) * ap, r = clamp(2.3 - s[2] * .36, .55, 2.5);
      if (b < .02) continue;
      if (s[2] < 1.5) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5); g.addColorStop(0, "rgba(250,246,232," + clamp(b, 0, 1).toFixed(3) + ")"); g.addColorStop(.35, "rgba(237,230,214," + (b * .22).toFixed(3) + ")"); g.addColorStop(1, "rgba(237,230,214,0)");
        ctx.fillStyle = g; ctx.fillRect(x - r * 4.5, y - r * 4.5, r * 9, r * 9);
        ctx.strokeStyle = "rgba(250,246,232," + (b * .7).toFixed(3) + ")"; ctx.lineWidth = .7; ctx.beginPath();
        var L = r * 3.4; ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
        var l2 = L * .5; ctx.moveTo(x - l2, y - l2); ctx.lineTo(x + l2, y + l2); ctx.moveTo(x - l2, y + l2); ctx.lineTo(x + l2, y - l2); ctx.stroke();
      } else if (s[2] < 3.4) { ctx.fillStyle = "rgba(246,241,228," + Math.min(1, b).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = "rgba(240,235,222," + Math.min(1, b).toFixed(3) + ")"; ctx.fillRect(x - .6, y - .6, 1.2, 1.2); }
    }
    ctx.restore();
  }
  function wobbleLine(x0, y0, x1, y1, seed, frac) {
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, n = Math.max(2, Math.ceil(len / 7)), m = Math.max(1, Math.round(n * frac));
    ctx.moveTo(x0, y0);
    for (var i = 1; i <= m; i++) {
      var u = Math.min(i / n, frac), s = u * len, w = (i === n) ? 0 : .4 * (Math.sin(s * .21 + seed) * .65 + Math.sin(s * .57 + seed * 1.7) * .35);
      ctx.lineTo(x0 + dx * u + nx * w, y0 + dy * u + ny * w);
    }
  }
  function visibleNamed(F, sl) {
    var out = [];
    for (var i = 0; i < NAMED.length; i++) {
      var c = NAMED[i]; if (!project(enu(c.ra, c.dec, F, V), P) || P[2] < .06) continue;
      if (P[0] < sl[0] + 10 || P[0] > sl[1] - 10 || P[1] < 8 || P[1] > cam.hy - 24) continue;
      out.push({ c: c, x: P[0], y: P[1] });
    }
    return out;
  }
  // true when a label's text box (screen px) touches the astrolabe disc or the nameplate
  function labelHitsAstro(txt, x, y, fsz, align) {
    var w = ctx.measureText(txt).width, x0 = align === "left" ? x : x - w / 2, x1 = x0 + w, y0 = y - fsz * .8, y1 = y + fsz * .25, pad = 6;
    var nx = clamp(hub.x, x0, x1), ny = clamp(hub.y, y0, y1);
    if (hub.r && Math.hypot(nx - hub.x, ny - hub.y) < hub.r + pad) return true;
    var pl = plaqueBox; if (pl && x1 > pl.left - pad && x0 < pl.right + pad && y1 > pl.top - pad && y0 < pl.bottom + pad) return true;
    return y1 > cam.hy - 6 || x0 < leafVis + 8 || x1 > W - leafVis - 8;
  }
  function drawConstellations(F, vis, ox, oy) {
    if (!CAT || !NAMED.length || vis < .03) return;
    var sl = [leafVis, W - leafVis], list = visibleNamed(F, sl);
    if (!inkPlan) { // order is fixed once, left to right, like a quill sweeping the plate
      var ord = list.slice().sort(function (a, b) { return a.x - b.x; }).map(function (o) { return o.c.n; });
      inkPlan = {}; var n = ord.length, step = n > 1 ? 2.0 / (n - 1) : 0;
      ord.forEach(function (nm, i) { inkPlan[nm] = TL.ink[0] + i * step; });
    }
    var t = te();
    ctx.save(); ctx.translate(ox, oy); ctx.lineCap = "round"; ctx.lineJoin = "round";
    var fsz = phone ? 11.5 : 13.5;
    ctx.font = "italic 500 " + fsz + "px 'Cormorant Garamond', Georgia, serif"; ctx.textAlign = "center";
    if ("letterSpacing" in ctx) ctx.letterSpacing = phone ? "1.5px" : "2.2px";
    for (var i = 0; i < list.length; i++) {
      var o = list[i], c = o.c, st = inkPlan[c.n] != null ? inkPlan[c.n] : TL.ink[0] + 1.5, p = clamp((t - st) / 1.0, 0, 1);
      if (p <= 0) continue;
      var segs = [], total = 0;
      for (var k = 0; k < c.segs.length; k++) {
        var sg = c.segs[k]; if (!project(enu(sg[0], sg[1], F, V), P) || !project(enu(sg[2], sg[3], F, Q), Q) || P[2] < -.02 || Q[2] < -.02) continue;
        var len = Math.hypot(Q[0] - P[0], Q[1] - P[1]); if (len > W * .7) continue;
        segs.push([P[0], P[1], Q[0], Q[1], len]); total += len;
      }
      var goal = p * total, acc = 0, pen = null;
      ctx.strokeStyle = rgba(CREAM, .35 * vis); ctx.lineWidth = phone ? .85 : 1; ctx.beginPath();
      var blots = [];
      for (var j = 0; j < segs.length && acc < goal; j++) {
        var q = segs[j], fr = clamp((goal - acc) / q[4], 0, 1);
        wobbleLine(q[0], q[1], q[2], q[3], c.seed + j * 3.1, fr);
        blots.push([q[0], q[1]]); if (fr >= 1) blots.push([q[2], q[3]]); else pen = [q[0] + (q[2] - q[0]) * fr, q[1] + (q[3] - q[1]) * fr];
        acc += q[4];
      }
      ctx.stroke();
      ctx.fillStyle = rgba(CREAM, .5 * vis);
      blots.forEach(function (b) { ctx.beginPath(); ctx.arc(b[0], b[1], 1.5, 0, TAU); ctx.fill(); });
      if (pen && p < 1) { ctx.fillStyle = "rgba(242,196,107," + (.9 * vis).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(pen[0], pen[1], 1.6, 0, TAU); ctx.fill(); }
      var la = clamp((t - st - .85) / .5, 0, 1);
      if (la > 0 && segs.length) {
        var lx = o.x, ly = o.y + (phone ? 20 : 26), inHub = function (x, y) { return Math.hypot(x - hub.x, y - hub.y) < hub.r + 12 || y > cam.hy - 12 || x < leafVis + 30 || x > W - leafVis - 30; };
        if (inHub(lx, ly)) { // try the vertex farthest from the astrolabe
          var best = null, bd = -1;
          segs.forEach(function (q) { [[q[0], q[1]], [q[2], q[3]]].forEach(function (v) { var dd = Math.hypot(v[0] - hub.x, v[1] - hub.y); if (dd > bd && !inHub(v[0], v[1] + 16)) { bd = dd; best = v; } }); });
          if (!best) continue; lx = best[0]; ly = best[1] + (best[1] < hub.y ? -12 : 20);
        }
        var lbl = c.n.toUpperCase();
        if (labelHitsAstro(lbl, lx + ox, ly + oy, fsz, "center")) continue;
        ctx.fillStyle = rgba(CREAM, .62 * vis * la); ctx.fillText(lbl, lx, ly);
      }
    }
    // Polaris, when it is in the slit
    if (project(enu(POLARIS[0], POLARIS[1], F, V), P) && P[2] > .05 && P[0] > sl[0] && P[0] < sl[1] && P[1] > 0) {
      var pa = clamp((t - 5.2) / .6, 0, 1); if (pa > 0) { ctx.fillStyle = rgba(CREAM, .62 * vis * pa); ctx.textAlign = "left"; if (!labelHitsAstro("POLARIS", P[0] + 9 + ox, P[1] + 4 + oy, fsz, "left")) ctx.fillText("POLARIS", P[0] + 9, P[1] + 4); }
    }
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.restore();
  }
  function moonHalo(r, wk) { // halo radius: wider with humidity or cloud
    var cover = WXCLOUD[wk] || 0, hum = isFinite(weather().hum) ? weather().hum / 100 : .5;
    return r * (3.2 + 4 * Math.max(cover, hum * .6));
  }
  function moonPlace(F, wk) {
    var mv = sky.moonVec; if (sky.moonAlt < -.5 || sky.illum < .04) return null; // a new moon is invisible in the real sky too
    var r = phone ? 15 : 25, sl = [leafVis, W - leafVis], x, y, halo = moonHalo(r, wk);
    if (project(mv, P)) { x = P[0]; y = P[1]; } else { x = mv[0] > 0 ? 0 : W; y = cam.hy - sky.moonAlt / 70 * (cam.hy - 40); }
    if (phone) {
      // phones: the slit is narrower than the astrolabe, so the moon lives in the open sky above the ring,
      // disc and halo kept at least 16px inside the slit and clear of the ring
      var M = 16, room = hub.top - M - 4;                          // vertical space above the ring
      halo = Math.min(halo, room / 2, (sl[1] - sl[0]) / 2 - M);
      if (halo < r * 1.4) { r = Math.floor(halo / 1.4); if (r < 8) return null; }
      x = clamp(x, sl[0] + M + halo, sl[1] - M - halo); y = M + halo;
      return finishMoon(mv, x, y, r, halo);
    }
    x = clamp(x, sl[0] + r + 18, sl[1] - r - 18); y = clamp(y, r + 22, cam.hy - r * .2);
    // keep the disc in open sky, clear of the astrolabe: push it out along the radius from the hub
    var need = hub.r + r + 14, dx = x - hub.x, dy = y - hub.y, dd = Math.hypot(dx, dy) || 1;
    if (hub.r && dd < need) {
      x = hub.x + dx / dd * need; y = hub.y + dy / dd * need;
      if (y < r + 22 || y > cam.hy - r) { y = clamp(y, r + 22, cam.hy - r); var hx = Math.sqrt(Math.max(0, need * need - (y - hub.y) * (y - hub.y))); x = hub.x + (dx < 0 ? -hx : hx); }
      x = clamp(x, sl[0] + r + 18, sl[1] - r - 18);
    }
    return finishMoon(mv, x, y, r, halo);
  }
  function finishMoon(mv, x, y, r, halo) {
    // the bright limb faces the sun along the great circle between them
    var sv = sky.sunVec, d = sv[0] * mv[0] + sv[1] * mv[1] + sv[2] * mv[2], tx = sv[0] - d * mv[0], ty = sv[1] - d * mv[1], tz = sv[2] - d * mv[2], tl = Math.hypot(tx, ty, tz) || 1, ang = 0;
    var e = .03, pv = [mv[0] + tx / tl * e, mv[1] + ty / tl * e, mv[2] + tz / tl * e];
    if (project(mv, P) && project(pv, Q)) ang = Math.atan2(Q[1] - P[1], Q[0] - P[0]);
    else ang = Math.atan2(-(tz / tl), -(tx / tl)); // off-screen moon: approximate with the local east/up direction
    return { x: x, y: y, r: r, ang: ang, halo: halo };
  }
  function drawMoon(mp, wk, ox, oy) {
    var u = seg("moon"); if (!mp || u <= 0) return;
    var vis = clamp(sky.night * 1.1 + .55, 0, 1), cover = (WXCLOUD[wk] || 0), r = mp.r;
    var startY = hillAt(mp.x) + r * 1.6, y = lerp(startY, mp.y, outCubic(u)) + oy, x = mp.x + ox;
    var halo = mp.halo;
    var hg = ctx.createRadialGradient(x, y, r * .8, x, y, halo);
    hg.addColorStop(0, "rgba(244,235,211," + (.2 * vis * (.35 + .65 * sky.illum) * (1 - cover * .4)).toFixed(3) + ")"); hg.addColorStop(1, "rgba(244,235,211,0)");
    ctx.fillStyle = hg; ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);
    ctx.save(); ctx.globalAlpha = vis * (1 - cover * .45); ctx.translate(x, y);
    ctx.fillStyle = "#1B2433"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.rotate(mp.ang);
    var k = Math.cos(sky.phase * TAU);
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); ctx.ellipse(0, 0, Math.max(.01, Math.abs(k) * r), r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    ctx.fillStyle = "#F4EBD3"; ctx.fill();
    ctx.save(); ctx.clip(); ctx.rotate(-mp.ang);
    // engraved maria: hatched patches
    ctx.strokeStyle = "rgba(120,110,90,.24)"; ctx.lineWidth = .55;
    [[-.32, -.28, .3, .22], [.18, -.12, .26, .2], [.05, .32, .22, .16], [-.38, .2, .16, .14]].forEach(function (m) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(m[0] * r, m[1] * r, m[2] * r, m[3] * r, .4, 0, TAU); ctx.clip();
      ctx.beginPath(); for (var hx = -r; hx < r; hx += 2.2) { ctx.moveTo(hx, -r); ctx.lineTo(hx + r * .6, r); } ctx.stroke(); ctx.restore();
    });
    ctx.restore();
    ctx.rotate(-mp.ang);
    ctx.strokeStyle = "rgba(237,230,214,.38)"; ctx.lineWidth = .75; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawSun(wk, ox, oy) {
    if (sky.sunAlt < -1 || (WXCLOUD[wk] || 0) > .8 || dbgSky === "night") return;
    if (!project(sky.sunVec, P)) return;
    var x = P[0] + ox, y = Math.min(P[1], cam.hy) + oy, a = 1 - (WXCLOUD[wk] || 0);
    var g = ctx.createRadialGradient(x, y, 0, x, y, 90); g.addColorStop(0, "rgba(255,248,226," + (.85 * a).toFixed(3) + ")"); g.addColorStop(.2, "rgba(255,236,190," + (.4 * a).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 90, y - 90, 180, 180);
    ctx.strokeStyle = "rgba(217,164,65," + (.7 * a).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
    ctx.beginPath(); for (var i = 0; i < 16; i++) { var an = i / 16 * TAU, l = i % 2 ? 20 : 26; ctx.moveTo(x + Math.cos(an) * 16, y + Math.sin(an) * 16); ctx.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); } ctx.stroke();
  }
  function stepFlash(t) {
    if (reduce) return 0;
    if (!nextFlash) nextFlash = t + 2 + Math.random() * 3;
    if (!flash && t > nextFlash) { flash = { t: t, x: .2 + Math.random() * .6 }; nextFlash = t + 8 + Math.random() * 7; }
    if (!flash) return 0;
    var e = t - flash.t, v = e < .12 ? e / .12 : Math.exp(-(e - .12) * 4.5);
    if (e > 1.4) { flash = null; return 0; } return v;
  }
  function drawClouds(wk, t, dt, ox, oy) {
    if (!clouds.length) return;
    var vx = windX() * .006 * (wk === "storm" ? 1.8 : 1), lit = wk === "storm" ? stepFlash(t) : 0;
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i], sp = cloudSprites[c.k]; if (!sp) continue;
      if (!reduce) { c.x += vx * c.v * dt; if (c.x > 1.3) c.x = -.3; if (c.x < -.3) c.x = 1.3; }
      var w = sp.w * c.s, h = sp.h * c.s, x = c.x * W - w / 2 + ox, y = c.y * cam.hy - h / 2 + oy;
      ctx.globalAlpha = .95; ctx.drawImage(sp.cv, x, y, w, h);
      if (lit > .01) {
        var fx = flash.x * W, near = clamp(1 - Math.abs(x + w / 2 - fx) / (W * .6), .25, 1);
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1;
        var g = ctx.createRadialGradient(x + w / 2, y + h * .72, 0, x + w / 2, y + h * .72, w * .6);
        g.addColorStop(0, "rgba(226,222,255," + (lit * .42 * near).toFixed(3) + ")"); g.addColorStop(1, "rgba(226,222,255,0)");
        ctx.fillStyle = g; ctx.fillRect(x - w * .1, y, w * 1.2, h * 1.3); ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.globalAlpha = 1;
    if (wk === "cloudy" || wk === "rain" || wk === "storm") { ctx.fillStyle = sky.night > .5 ? "rgba(14,18,28,.28)" : "rgba(170,178,192,.22)"; ctx.fillRect(0, 0, W, cam.hy); }
  }
  function drawPrecip(wk, dt, sl) {
    var night = sky.night > .5;
    if (drops.length) {
      var wx = windX() * .22;
      ctx.strokeStyle = night ? "rgba(205,214,226,.32)" : "rgba(240,244,250,.55)"; ctx.lineWidth = .8; ctx.beginPath();
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i]; if (!reduce) { d.y += (1.3 + d.z) * dt; d.x += wx * .4 * dt; if (d.y > 1.05) { d.y = -.05; d.x = Math.random(); } if (d.x > 1) d.x -= 1; if (d.x < 0) d.x += 1; }
        var x = d.x * W, y = d.y * H, len = 10 + 12 * d.z; ctx.moveTo(x, y); ctx.lineTo(x + wx * len * 2.2, y + len);
      }
      ctx.stroke();
    }
    if (flakes.length) {
      ctx.strokeStyle = night ? "rgba(236,234,226,.75)" : "rgba(255,255,255,.95)"; ctx.lineWidth = .8; ctx.beginPath();
      for (var f = 0; f < flakes.length; f++) {
        var q = flakes[f]; if (!reduce) { q.y += .045 * q.z * dt; q.ph += dt * .8; q.rot += dt * .4; if (q.y > 1.02) { q.y = -.02; q.x = Math.random(); } }
        var fx = q.x * W + Math.sin(q.ph) * 10 * q.z, fy = q.y * H, s = 1.6 + q.z * 2.2;
        for (var a = 0; a < 3; a++) { var an = q.rot + a * Math.PI / 3, cx = Math.cos(an) * s, cy = Math.sin(an) * s; ctx.moveTo(fx - cx, fy - cy); ctx.lineTo(fx + cx, fy + cy); }
      }
      ctx.stroke();
    }
    if (beads.length && sl[2] > .6) { // droplets beading on the glass at the slit edge
      for (var b = 0; b < beads.length; b++) {
        var e = beads[b]; if (!reduce && e.v) { e.y += e.v * dt; if (e.y > 1.02) e.y = -.02; }
        var bx = e.side ? sl[1] - 3 - e.dx : sl[0] + 3 + e.dx, by = e.y * H;
        ctx.fillStyle = "rgba(8,12,20,.35)"; ctx.beginPath(); ctx.arc(bx, by, e.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(237,230,214,.55)"; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(bx, by, e.r * .7, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
        ctx.strokeStyle = "rgba(237,230,214,.22)"; ctx.beginPath(); ctx.arc(bx, by, e.r, Math.PI * .15, Math.PI * .85); ctx.stroke();
      }
    }
  }
  function drawFog(wk, t) {
    if (wk !== "fog") return;
    var night = sky.night, col = mixc(CREAM, [120, 124, 128], night * .7);
    var g = ctx.createLinearGradient(0, cam.hy - H * .38, 0, H); g.addColorStop(0, rgba(col, 0)); g.addColorStop(.55, rgba(col, .6 - night * .2)); g.addColorStop(1, rgba(col, .88 - night * .25));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 3; i++) {
      var y = cam.hy - H * (.05 + i * .07), x = ((t * (6 + i * 3) / W + i * .37) % 1.6 - .3) * W, bg = ctx.createRadialGradient(x, y, 0, x, y, W * .4);
      bg.addColorStop(0, rgba(col, .2)); bg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = bg; ctx.fillRect(x - W * .4, y - H * .06, W * .8, H * .12);
    }
  }
  function drawShooting(t, vis, sl) {
    var s = shoot; if (!s) return;
    var u = (t - s.t0) / s.dur; if (u > 1.25) { shoot = null; return; } if (u < 0) return;
    var hx = s.x0 + s.dx * Math.min(u, 1), hy = s.y0 + s.dy * Math.min(u, 1), fade = u > 1 ? 1 - (u - 1) / .25 : 1, tl = 150 * fade;
    var dl = Math.hypot(s.dx, s.dy), ux = s.dx / dl, uy = s.dy / dl;
    var g = ctx.createLinearGradient(hx, hy, hx - ux * tl, hy - uy * tl); g.addColorStop(0, "rgba(250,244,226," + (.95 * vis * fade).toFixed(3) + ")"); g.addColorStop(1, "rgba(250,244,226,0)");
    ctx.save(); ctx.beginPath(); ctx.rect(sl[0], 0, sl[1] - sl[0], cam.hy); ctx.clip();
    ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - ux * tl, hy - uy * tl); ctx.stroke();
    ctx.fillStyle = "rgba(255,250,236," + (vis * fade).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(hx, hy, 1.3, 0, TAU); ctx.fill(); ctx.restore();
  }
  function launchShoot(t, intro) {
    var sl = [leafVis, W - leafVis], w = sl[1] - sl[0];
    if (intro) shoot = { intro: true, t0: (TL.shoot[0]) * (phone ? 9 / 14 : 1), dur: .9 * (phone ? .8 : 1), x0: sl[0] + w * .12, y0: H * .1, dx: w * .42, dy: H * .16 };
    else { var dir = Math.random() < .5 ? 1 : -1, x0 = sl[0] + w * (dir > 0 ? .1 + Math.random() * .4 : .5 + Math.random() * .4); shoot = { t0: t, dur: .7 + Math.random() * .5, x0: x0, y0: H * (.06 + Math.random() * .3), dx: dir * w * (.25 + Math.random() * .2), dy: H * (.08 + Math.random() * .12) }; }
  }
  function drawSatellite(t, vis, sl) {
    if (!sat) return; var u = (t - sat.t0) / sat.dur; if (u > 1) { sat = null; return; }
    var x = lerp(sat.x0, sat.x1, u), y = lerp(sat.y0, sat.y1, u); if (x < sl[0] || x > sl[1]) return;
    ctx.fillStyle = "rgba(240,236,224," + (.75 * vis).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(x, y, .9, 0, TAU); ctx.fill();
  }

  /* ---------------- frame ---------------- */
  function frame(now, dt) {
    if (!active || !cv) return false;
    dt = Math.min(dt || 0, .05);
    var endT = TL.end * (phone ? 9 / 14 : 1);
    if (!isNaN(freezeT)) T = freezeT;
    else if (reduce) T = endT;
    else if (T < endT) T = Math.min(endT, T + dt * speed);
    if (performance.now() - skyAt > 1000 || !sky) computeSky();
    var t = now / 1000, wk = weather().kind;
    var key = wk + (sky.night > .5 ? "n" : "d") + W + "x" + H;
    if (key !== wxKey) { wxKey = key; setupWeather(wk); }
    var hk = (sky.night > .5 ? "n" : sky.sunAlt > 8 ? "d" : "t") + W + "x" + H;
    if (hk !== hillKey) { hillKey = hk; buildHills(); }
    if (!reduce) { var k = 1 - Math.pow(.004, dt); ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k; }
    var F = frameOf(nowMs(), sky.lc, drift()), sl = slit();
    var cover = WXCLOUD[wk] || 0, vis = sky.night * (1 - cover * .85);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(skyColors(wk), wk, t);
    drawSun(wk, ptr.x * 3, ptr.y * 1.5);
    drawGrid(F, vis, ptr.x * 2, ptr.y);
    drawStars(F, vis, t, ptr.x * 2, ptr.y);
    drawConstellations(F, sky.night * (1 - cover * .6), ptr.x * 2, ptr.y);
    var mp = moonPlace(F, wk); drawMoon(mp, wk, phone ? 0 : ptr.x * 4, phone ? 0 : ptr.y * 2);
    // shooting stars and the rare satellite
    var night = sky.night > .5 && cover < .7;
    if (night && !reduce) {
      if (!shoot && !nextShoot && te() < TL.shoot[0]) launchShoot(T, true);
      var endTr = endT;
      if (T >= endTr) {
        if (!nextShoot) nextShoot = t + 20 + Math.random() * 20;
        if (!shoot && t > nextShoot) { launchShoot(t, false); nextShoot = t + 20 + Math.random() * 20; }
        if (!nextSat) nextSat = t + 50 + Math.random() * 40;
        if (!sat && t > nextSat) { var yy = H * (.12 + Math.random() * .3); sat = { t0: t, dur: 22 + Math.random() * 8, x0: leafVis - 10, x1: W - leafVis + 10, y0: yy, y1: yy + H * (Math.random() * .2 - .1) }; if (Math.random() < .5) { var tmp = sat.x0; sat.x0 = sat.x1; sat.x1 = tmp; } nextSat = t + 75 + Math.random() * 35; }
      }
      drawShooting(shoot && shoot.intro ? T : t, sky.night, sl);
      drawSatellite(t, sky.night, sl);
    }
    drawClouds(wk, t, dt, ptr.x * 6, ptr.y * 3);
    if (hillCv) ctx.drawImage(hillCv, -20 + ptr.x * 8, hillCv.top + ptr.y * 2, W + 40, H * .3);
    drawFog(wk, t);
    drawPrecip(wk, dt, sl);

    // DOM: shutters, seam, astrolabe, card focus, plaque
    var half = W / 2 - leafVis, open = sl[2];
    var lx = (-open * half).toFixed(1), rx = (open * half).toFixed(1);
    if (leafL.__x !== lx) { leafL.__x = lx; leafL.style.transform = "translateX(" + lx + "px)"; }
    if (leafR.__x !== rx) { leafR.__x = rx; leafR.style.transform = "translateX(" + rx + "px)"; }
    var tt = te(), seamA = tt < 1.2 ? (.35 + .65 * sstep(clamp(tt / .7, 0, 1))) * (.85 + .15 * Math.sin(tt * 9)) : clamp(1 - open * 4, 0, 1);
    setVar("--obs-seam", seamA);
    updateAstro(F);
    setVar("--obs-card", Math.max(cardFloor, seg("card")));
    setVar("--obs-focus", inOut(seg("focus")));
    setVar("--obs-plaque", sstep(seg("plaque")));
    setVar("--obs-shade", tt < 1.2 ? .62 : clamp(.62 * (1 - (tt - 1.2) / 1.9), 0, .62));
    var isDay = sky.night < .3; if (isDay !== root.hasAttribute("data-obs-day")) root.toggleAttribute("data-obs-day", isDay);
    var fin = te() >= TL.end - 1e-3;
    if (fin !== done) { done = fin; root.classList.toggle("obs-done", fin); }
    return true;
  }

  /* ---------------- wiring ---------------- */
  var PANELS = ["login", "teacherLogin", "teacherSignup"], shown = null;
  function activePanel() { for (var i = 0; i < PANELS.length; i++) { var p = doc.getElementById(PANELS[i]); if (p && !p.classList.contains("hidden")) return p; } return null; }
  function watch() {
    var p = activePanel(); active = !!p && !root.classList.contains("pb-restoring");
    doc.body.classList.toggle("obs-off", !active);
    if (p) { var h = p.offsetHeight; if (h) root.style.setProperty("--obs-card-h", h + "px"); }
    if (p && shown && p !== shown) { skip(); root.classList.add("obs-swap"); setTimeout(function () { root.classList.remove("obs-swap"); }, 480); }
    shown = p || shown;
    if (active) requestAnimationFrame(measureHub);
  }
  function skip() { if (isNaN(freezeT)) speed = 14; }
  function selfLoop() { // only when login-alive's loop is not running (reduced motion): a slow twinkle
    var last = performance.now();
    (function tick() {
      setTimeout(function () { requestAnimationFrame(function (now) { if (!doc.hidden) frame(now, (now - last) / 1000); last = now; tick(); }); }, reduce ? 90 : 0);
    })();
  }
  function init() {
    obsEl = doc.getElementById("obs"); astroEl = doc.getElementById("obs-astro");
    if (!obsEl || !astroEl) return;
    cv = doc.getElementById("obs-sky"); ctx = cv && cv.getContext("2d");
    leafL = obsEl.querySelector(".obs-leaf-l"); leafR = obsEl.querySelector(".obs-leaf-r"); seamEl = obsEl.querySelector(".obs-seam");
    if (!ctx || !leafL || !leafR) return;
    perf0 = performance.now() / 1000;
    T = !isNaN(freezeT) ? freezeT : Math.min(perf0, 1.1); // the CSS dome has been on screen since first paint
    if (isNaN(freezeT) && perf0 > 2) cardFloor = 1;          // the CSS fallback already showed the form: never hide it again
    computeSky(); resize(); loadCat(); computeSky();
    root.classList.add("obs-js");
    win.addEventListener("resize", function () { resize(); watch(); });
    win.addEventListener("pointermove", function (e) { ptr.tx = clamp(e.clientX / (W || 1) * 2 - 1, -1, 1); ptr.ty = clamp(e.clientY / (H || 1) * 2 - 1, -1, 1); }, { passive: true });
    ["keydown", "pointerdown", "focusin", "wheel", "touchstart"].forEach(function (ev) { win.addEventListener(ev, skip, { passive: true, capture: true }); });
    var mo = new MutationObserver(watch);
    PANELS.forEach(function (id) { var p = doc.getElementById(id); if (p) mo.observe(p, { attributes: true, attributeFilter: ["class"] }); });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    if (win.ResizeObserver) { var ro = new ResizeObserver(watch); PANELS.forEach(function (id) { var p = doc.getElementById(id); if (p) ro.observe(p); }); }
    watch();
    if (doc.fonts && doc.fonts.load) doc.fonts.load("600 11px 'Cormorant Garamond'").then(function () { measureHub(); }).catch(function () {});
    frame(performance.now(), 0);
    if (reduce || !win.__loginAlive) selfLoop();
  }
  win.__obs = { frame: frame, skip: skip, state: function () { return { T: T, te: te(), phone: phone, sky: sky, done: done }; } };
  win.__obsFrame = function (now, dt) { return frame(now, dt); };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
