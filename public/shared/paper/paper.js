/* Paper theme for the older Study modules (the app's "light" theme).
   Load in <head> before anything draws:
     <link rel="stylesheet" href="shared/paper/paper.css">
     <script src="shared/paper/paper.js" data-module="vectors"></script>
   The theme is read before first paint: the module's own key (popboard.<module>.theme) wins,
   else the app's saved "theme". Dark mode is left exactly as it was.
   In Paper the colors come from the --pp-* variables in paper.css. These modules were written
   with literal colors, so each literal (stylesheets, inline styles, SVG, canvas) is mapped onto
   that palette: dark grounds become cream, light linework and text become near-black, hues keep
   their hue but darken, glows become soft radial-gradient tints, and every text color is pushed
   to at least 4.5:1. A canvas or element inside [data-paper="keep"] (a night-sky or space view)
   is left dark. */
(function () {
  "use strict";
  var root = document.documentElement;
  var me = document.currentScript, mod = me && me.getAttribute("data-module");
  var t = null;
  try { t = (mod && localStorage.getItem("popboard." + mod + ".theme")) || localStorage.getItem("theme"); } catch (e) {}
  if (t !== "light") return;
  root.setAttribute("data-theme", "light");
  var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", "#f4efe4");

  // ---------- palette (from paper.css) ----------
  function hex(h) { h = h.trim().replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  var cs = getComputedStyle(root);
  function tok(n, d) { var v = cs.getPropertyValue(n).trim(); return hex(/^#[0-9a-f]{3,6}$/i.test(v) ? v : d); }
  var PAPER = tok("--pp-paper", "#f4efe4"), PANEL = tok("--pp-panel", "#fbf8f1"), INK = tok("--pp-ink", "#1f1a14");

  // ---------- color math ----------
  var scratch = document.createElement("canvas").getContext("2d");
  var FS = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "fillStyle");
  var cache = new Map();
  function parse(s) {
    if (typeof s !== "string") return null;
    var k = s.trim().toLowerCase(), m;
    if (cache.has(k)) return cache.get(k);
    var out = null;
    if ((m = /^#([0-9a-f]{3,8})$/.exec(k))) {
      var h = m[1]; if (h.length <= 4) h = h.replace(/./g, "$&$&");
      out = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    } else if ((m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(k))) {
      var a = m[4] == null ? 1 : (m[4].slice(-1) === "%" ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      out = [+m[1], +m[2], +m[3], a];
    } else if (k && k !== "transparent" && !/^(none|inherit|initial|unset|currentcolor)$/.test(k) && k.indexOf("var(") < 0) {
      FS.set.call(scratch, "#010203"); FS.set.call(scratch, k);
      var n = FS.get.call(scratch);
      if (n !== "#010203" || k === "#010203") out = n.charAt(0) === "#" ? parse(n) : parse(n);
    }
    cache.set(k, out); return out;
  }
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0, h = 0, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function rgb(h, s, l) {
    if (!s) return [l * 255, l * 255, l * 255];
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function lum(c) { return [0, 1, 2].map(function (i) { var v = c[i] / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function fmt(c) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + Math.round(c[3] * 1000) / 1000 + ")"; }

  // role: "fill" (grounds and shapes), "line", "text", "shadow", "glow"
  function map(c, role) {
    var r = c[0], g = c[1], b = c[2], a = c[3], H = hsl(r, g, b), h = H[0], s = H[1], l = H[2], o;
    if (role === "shadow" && l < 0.35) return [60, 45, 20, a * 0.45];
    if (s < 0.22 || l < 0.2 || l > 0.94) {
      // Neutral: flip lightness onto the ink to paper ramp (dark ground -> cream, white line -> ink).
      var tt = 1 - l;
      o = tt > 0.9 ? mix(PANEL, PAPER, (tt - 0.9) * 10) : mix(INK, PANEL, tt / 0.9);
      if (s >= 0.22) {
        // Tinted: dark grounds become a faint tint of their hue on paper; light tints become a dark ink of the hue.
        if (l < 0.2 && role === "fill") o = mix(o, rgb(h, Math.min(s, 0.5), 0.86), 0.18);
        else if (l > 0.94 || role !== "fill") o = rgb(h, Math.min(s, 0.6), 0.32);
      }
    } else {
      // A hue: keep it, darken it so it reads on cream.
      o = rgb(h, Math.min(1, s * 0.95), Math.max(0.2, Math.min(l, 0.4)));
    }
    o[3] = a;
    if (role === "glow") o[3] = a * 0.5;
    return o;
  }
  // Text: at least 4.5:1 against what it sits on (paper unless told otherwise).
  function legible(c, bg) {
    bg = bg || PAPER;
    var flat = mix(bg, c, c[3]);
    if (ratio(flat, bg) >= 4.5) return c;
    if (bg !== PAPER && ratio(PANEL, bg) > ratio(INK, bg) && ratio(PANEL, bg) >= 4.5) return PANEL.concat(1);
    var lb = lum(bg) > 0.4, H = hsl(c[0], c[1], c[2]), l = H[2], o = c;
    for (var i = 0; i < 40; i++) {
      l = lb ? l - 0.025 : l + 0.025; if (l < 0 || l > 1) break;
      o = rgb(H[0], H[1], Math.max(0, Math.min(1, l))); o[3] = 1;
      if (ratio(o, bg) >= 4.5) break;
    }
    if (ratio(o, bg) < 4.5) o = ratio(INK, bg) >= ratio(PANEL, bg) ? INK.concat(1) : PANEL.concat(1);
    o[3] = 1; return o;
  }
  // Colors that are already Paper (our own outputs and the Paper tokens) pass through, so a value read
  // back from CSS and painted on a canvas is not flipped twice.
  var DONE = new Set();
  function key(c) { return Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]); }
  function isDone(c) { return DONE.has(key(c)); }
  function mark(o) { DONE.add(key(o)); return o; }
  function mapStr(s, role) { var c = parse(s); if (!c) return s; if (isDone(c)) return s; return fmt(mark(map(c, role))); }
  function learnTokens() {
    var cs = getComputedStyle(root);
    for (var i = 0; i < cs.length; i++) { var p = cs[i]; if (p.indexOf("--") !== 0) continue; var c = parse(cs.getPropertyValue(p).trim()); if (c) mark(c); }
  }

  // ---------- canvas ----------
  var P = CanvasRenderingContext2D.prototype;
  var RAW = {};
  ["fillStyle", "strokeStyle"].forEach(function (n) { RAW[n] = Object.getOwnPropertyDescriptor(P, n); });
  function kept(ctx) {
    var cv = ctx.canvas; if (!cv || !cv.closest) return false;
    if (cv.__ppKeep !== undefined) return cv.__ppKeep;
    var k = !!cv.closest('[data-paper="keep"]');
    if (cv.isConnected) cv.__ppKeep = k;
    return k;
  }
  function wrap(name, fn) {
    var d = Object.getOwnPropertyDescriptor(P, name); if (!d || !d.set) return;
    Object.defineProperty(P, name, { configurable: true, enumerable: d.enumerable, get: d.get,
      set: function (v) { d.set.call(this, kept(this) ? v : fn.call(this, v)); } });
  }
  wrap("fillStyle", function (v) { return typeof v === "string" ? mapStr(v, "fill") : v; });
  wrap("strokeStyle", function (v) { return typeof v === "string" ? mapStr(v, "line") : v; });
  wrap("shadowColor", function (v) { return mapStr(v, "shadow"); });
  wrap("shadowBlur", function () { return 0; }); // glows are radial-gradient tints in Paper, never blurred neon
  wrap("globalCompositeOperation", function (v) { return /^(lighter|screen|plus-lighter|color-dodge)$/.test(v) ? "source-over" : v; });
  ["fillText", "strokeText"].forEach(function (fnName) {
    var orig = P[fnName], prop = fnName === "fillText" ? "fillStyle" : "strokeStyle";
    P[fnName] = function () {
      if (kept(this)) return orig.apply(this, arguments);
      var cur = RAW[prop].get.call(this), c = typeof cur === "string" ? parse(cur) : null;
      if (!c) return orig.apply(this, arguments);
      var ga = this.globalAlpha, eff = c.slice(); eff[3] = c[3] * ga;
      var fixed = legible(eff);
      if (fixed === eff) return orig.apply(this, arguments);
      RAW[prop].set.call(this, fmt(fixed)); this.globalAlpha = 1;
      try { return orig.apply(this, arguments); } finally { RAW[prop].set.call(this, cur); this.globalAlpha = ga; }
    };
  });
  ["createRadialGradient", "createLinearGradient", "createConicGradient"].forEach(function (n) {
    var orig = P[n]; if (!orig) return;
    P[n] = function () { var g = orig.apply(this, arguments); g.__ppKeep = kept(this); g.__ppRadial = n === "createRadialGradient"; return g; };
  });
  var addStop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (o, c) {
    return addStop.call(this, o, this.__ppKeep ? c : mapStr(c, this.__ppRadial ? "glow" : "fill"));
  };
  // ---------- stylesheets, inline styles, SVG ----------
  var TOK = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black)\b/g;
  var PROPS = { "color": "text", "-webkit-text-fill-color": "text", "caret-color": "text",
    "background-color": "fill", "background-image": "fill", "background": "fill",
    "border-color": "line", "border-top-color": "line", "border-right-color": "line", "border-bottom-color": "line", "border-left-color": "line",
    "outline-color": "line", "column-rule-color": "line", "text-decoration-color": "line",
    "fill": "fill", "stroke": "line", "stop-color": "fill", "flood-color": "fill",
    "box-shadow": "shadow", "text-shadow": "shadow" };
  function rootVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  function solid(v) {
    if (!v) return null;
    var vm = /^var\((--[\w-]+)/.exec(v.trim()); if (vm) v = rootVar(vm[1]);
    var m = v.match(TOK); if (!m || m.length !== 1) return null;
    var c = parse(m[0]); return c && c[3] > 0.6 ? c : null;
  }
  function mapValue(v, role, bg) {
    if (!v || !TOK.test(v)) { TOK.lastIndex = 0; return null; }
    TOK.lastIndex = 0;
    var glowy = role === "shadow";
    return v.replace(TOK, function (tk) {
      var c = parse(tk); if (!c) return tk;
      if (isDone(c)) return tk;
      if (role === "text") return fmt(mark(legible(map(c, "line"), bg)));
      if (glowy) { var H = hsl(c[0], c[1], c[2]); return fmt(mark(H[2] < 0.35 ? map(c, "shadow") : map(c, "glow"))); }
      return fmt(mark(map(c, role)));
    });
  }
  function bgOf(style) {
    var b = style.getPropertyValue("background-color") || style.getPropertyValue("background");
    var c = solid(b); if (!c) return null;
    if (/var\(/.test(b)) return c; // already a Paper token
    return map(c, "fill");
  }
  function restyle(style, keepIt) {
    if (keepIt) return;
    var bg = bgOf(style), todo = [];
    for (var i = 0; i < style.length; i++) {
      var p = style[i];
      if (p.indexOf("--") === 0) { var cv = style.getPropertyValue(p); if (TOK.test(cv)) todo.push([p, mapValue(cv, /text|ink|fg/.test(p) ? "text" : "fill")]); TOK.lastIndex = 0; continue; }
      var role = PROPS[p]; if (!role) continue;
      var nv = mapValue(style.getPropertyValue(p), role, role === "text" ? bg : null);
      if (nv != null) todo.push([p, nv]);
    }
    todo.forEach(function (x) { if (x[1] != null) style.setProperty(x[0], x[1], style.getPropertyPriority(x[0])); });
  }
  var doneRules = new WeakSet();
  function walk(rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (doneRules.has(r)) continue;
      if (r.cssRules && !r.style) { walk(r.cssRules); continue; }
      doneRules.add(r);
      if (!r.style || !r.selectorText) continue;
      if (/data-theme|data-paper/.test(r.selectorText)) continue;
      if (/^:root$|^html$/.test(r.selectorText.trim())) { // module tokens: only those Paper does not already set
        for (var j = 0; j < r.style.length; j++) { var p = r.style[j]; if (p.indexOf("--") !== 0 || p.indexOf("--pp-") === 0) continue;
          var mine = getComputedStyle(root).getPropertyValue(p).trim(), orig = r.style.getPropertyValue(p).trim();
          if (mine !== orig) continue; var nv = mapValue(orig, /text|ink|fg/.test(p) ? "text" : "fill"); if (nv) r.style.setProperty(p, nv); }
        var keepRoot = r.style; ["background", "background-color", "color"].forEach(function (q) { var v = keepRoot.getPropertyValue(q); if (v) { var nv = mapValue(v, q === "color" ? "text" : "fill"); if (nv) keepRoot.setProperty(q, nv); } });
        continue;
      }
      restyle(r.style, false);
    }
  }
  function sheets() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sh = document.styleSheets[i], rules;
      if (sh.href && /shared\/paper\/paper\.css/.test(sh.href)) continue;
      try { rules = sh.cssRules; } catch (e) { continue; }
      if (rules) walk(rules);
    }
    learnTokens();
  }
  var written = new WeakMap();
  function inKeep(el) { return !!(el.closest && el.closest('[data-paper="keep"]')); }
  function inline(el) {
    if (el.nodeType !== 1 || inKeep(el)) return;
    var st = el.getAttribute("style");
    var w = written.get(el); if (!w) { w = {}; written.set(el, w); }
    if (st && w.style !== st) { restyle(el.style, false); w.style = el.getAttribute("style"); }
    ["fill", "stroke", "stop-color"].forEach(function (a) {
      var v = el.getAttribute(a); if (!v || w[a] === v) return;
      var nv = mapValue(v, a === "stroke" ? "line" : "fill"); w[a] = nv || v; if (nv && nv !== v) el.setAttribute(a, nv);
    });
  }
  function sweep(node) { inline(node); if (node.querySelectorAll) { var l = node.querySelectorAll("[style],[fill],[stroke],[stop-color]"); for (var i = 0; i < l.length; i++) inline(l[i]); } }
  var mo = new MutationObserver(function (list) {
    var again = false;
    list.forEach(function (m) {
      if (m.type === "attributes") inline(m.target);
      else m.addedNodes.forEach(function (n) { if (n.nodeType !== 1) return; if (n.tagName === "STYLE" || n.tagName === "LINK") { again = true; n.addEventListener("load", sheets); } sweep(n); });
    });
    if (again) sheets();
  });
  mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "fill", "stroke", "stop-color"] });
  sheets();
  document.addEventListener("DOMContentLoaded", function () { sheets(); sweep(document.body); });
  addEventListener("load", sheets);

  window.PB_PAPER = { on: true, map: function (s, role) { return mapStr(s, role || "fill"); }, text: function (s) { var c = parse(s); return c ? fmt(legible(map(c, "line"))) : s; } };
})();
