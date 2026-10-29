/* PopBoard force notation. Write a subscript as X_{sub} in any string, e.g. "F_{N}", "F_{f,static,max}",
   "F_{net}", "μ_{s}". This script renders those markers as real subscripts:
   - in the page: text nodes are turned into X<sub>sub</sub> as they appear or change;
   - on canvases: fillText, strokeText and measureText draw and measure the subscript smaller and lower.
   Strings without the marker are untouched. Load it as a classic script before the module's own scripts. */
(function () {
  "use strict";
  if (window.PopBoardNotation) return;
  var RE = /_\{([^}]*)\}/;
  function parts(text) {
    var out = [], s = String(text), m;
    while ((m = RE.exec(s))) {
      if (m.index) out.push({ t: s.slice(0, m.index), sub: false });
      out.push({ t: m[1], sub: true });
      s = s.slice(m.index + m[0].length);
    }
    if (s) out.push({ t: s, sub: false });
    return out;
  }
  function plain(text) { return String(text).replace(/_\{([^}]*)\}/g, "$1"); }

  /* ---------- canvas ---------- */
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) {
    var fill = C.fillText, stroke = C.strokeText, measure = C.measureText;
    function subFont(font) {
      return font.replace(/(\d+(?:\.\d+)?)px/, function (_, n) { return (parseFloat(n) * 0.72).toFixed(1) + "px"; });
    }
    function sizeOf(font) { var m = /(\d+(?:\.\d+)?)px/.exec(font); return m ? parseFloat(m[1]) : 10; }
    function widthOf(ctx, ps) {
      var font = ctx.font, small = subFont(font), w = 0;
      for (var i = 0; i < ps.length; i++) { ctx.font = ps[i].sub ? small : font; w += measure.call(ctx, ps[i].t).width; }
      ctx.font = font; return w;
    }
    function draw(fn) {
      return function (text, x, y, maxWidth) {
        if (typeof text !== "string" || !RE.test(text)) return fn.apply(this, arguments);
        var ps = parts(text), font = this.font, small = subFont(font), align = this.textAlign, dir = this.direction;
        var w = widthOf(this, ps), x0 = x;
        if (align === "center") x0 = x - w / 2;
        else if (align === "right" || (align === "end" && dir !== "rtl") || (align === "start" && dir === "rtl")) x0 = x - w;
        var drop = sizeOf(font) * 0.28;
        this.textAlign = "left";
        for (var i = 0; i < ps.length; i++) {
          this.font = ps[i].sub ? small : font;
          fn.call(this, ps[i].t, x0, ps[i].sub ? y + drop : y);
          x0 += measure.call(this, ps[i].t).width;
        }
        this.font = font; this.textAlign = align;
      };
    }
    C.fillText = draw(fill);
    C.strokeText = draw(stroke);
    C.measureText = function (text) {
      if (typeof text !== "string" || !RE.test(text)) return measure.apply(this, arguments);
      var m = measure.call(this, plain(text)), w = widthOf(this, parts(text));
      var o = {}; for (var k in m) o[k] = m[k];
      o.width = w; o.actualBoundingBoxRight = w - (m.actualBoundingBoxLeft || 0) * 0; return o;
    };
  }

  /* ---------- page text ---------- */
  function convert(node) {
    if (node.nodeType !== 3 || !RE.test(node.nodeValue)) return;
    var p = node.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|TITLE)$/.test(p.nodeName) || p.isContentEditable) return;
    var frag = document.createDocumentFragment(), ps = parts(node.nodeValue);
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].sub) { var s = document.createElement("sub"); s.textContent = ps[i].t; frag.appendChild(s); }
      else frag.appendChild(document.createTextNode(ps[i].t));
    }
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (root.nodeType === 3) return convert(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], n;
    while ((n = tw.nextNode())) if (RE.test(n.nodeValue)) list.push(n);
    list.forEach(convert);
    // attributes people read: aria-label and title get the plain form
    if (root.querySelectorAll) [].forEach.call(root.querySelectorAll("[aria-label*='_{'],[title*='_{']"), function (el) {
      ["aria-label", "title"].forEach(function (a) { var v = el.getAttribute(a); if (v && RE.test(v)) el.setAttribute(a, plain(v)); });
    });
  }
  function start() {
    walk(document.body);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === "characterData") convert(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, characterData: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
  window.PopBoardNotation = { parts: parts, plain: plain };
})();
