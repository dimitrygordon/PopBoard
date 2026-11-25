// PopBoard corners, Safari half. See corners.css for the whole rule.
// Browsers with corner-shape draw squircles natively and this file does nothing.
// Elsewhere (iPhone Safari today) every element whose CSS carries `--sq: 1` gets a 9-slice squircle mask
// (-webkit-mask-box-image). The mask depends only on the corner radii, not on the box size, so there is no
// ResizeObserver: one computed-style read per element, cached SVGs, and a MutationObserver for new nodes.
// ?sq=off turns it off, ?sq=mask forces the Safari path (for checks in Chromium).
(() => {
  if (typeof window === "undefined" || window.__pbCorners) return;
  window.__pbCorners = true;
  const d = document, html = d.documentElement;
  const mode = (/[?&]sq=(off|mask)\b/.exec(location.search) || [])[1] || "";
  if (mode === "off" || !window.CSS || !CSS.supports) return;
  if (CSS.supports("corner-shape", "squircle") && mode !== "mask") return;
  if (!CSS.supports("-webkit-mask-box-image", "none")) return;

  const FIT = 0.543; // largest plain arc that still contains the squircle (corners.css --sq-fit)
  const OUT = 48;    // mask reaches at least this far past the box, so focus rings and small overhangs survive
  const OUT_MAX = 240;
  const MIN = 6;     // under this a squircle is invisible
  const STEPS = 24;
  const cache = new Map();
  const state = new WeakMap(); // el -> key it was masked with
  const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "CANVAS", "VIDEO", "IFRAME", "svg", "SVG", "NOSCRIPT", "LINK", "META"]);

  const f = (n) => Math.round(n * 100) / 100;
  // Hole in the mask for one corner: only the thin sliver between the box's own arc (FIT * r, which is what its
  // background, border and shadow follow) and the squircle. Everything outside that arc stays opaque, so the
  // shadow that shows around the arc is untouched. (x0,y0) is the box corner, sx/sy point into the box.
  function sliver(x0, y0, sx, sy, r) {
    if (r < MIN) return "";
    const cx = x0 + sx * r, cy = y0 + sy * r, a = FIT * r;
    let p = `M${f(x0)} ${f(y0 + sy * r)}`;
    for (let i = 1; i <= STEPS; i++) {
      const t = (i / STEPS) * Math.PI / 2;
      const ux = Math.sqrt(Math.cos(t)), uy = Math.sqrt(Math.sin(t)); // superellipse, exponent 4 = CSS squircle
      p += `L${f(cx - sx * r * ux)} ${f(cy - sy * r * uy)}`;
    }
    // back along the box's arc: top edge, quarter circle, left edge
    const sweep = sx * sy > 0 ? 0 : 1;
    return p + `L${f(x0 + sx * a)} ${f(y0)}A${f(a)} ${f(a)} 0 0 ${sweep} ${f(x0)} ${f(y0 + sy * a)}Z`;
  }
  // How far this box's own shadow reaches: offset + blur + spread of the widest layer. Inset shadows stay inside.
  function reach(cs) {
    let out = OUT;
    const bs = cs.boxShadow;
    if (bs && bs !== "none") for (const layer of bs.split(/,(?![^(]*\))/)) {
      if (/\binset\b/.test(layer)) continue;
      const n = (layer.replace(/(rgba?|hsla?|color|oklch|lab|lch)\([^)]*\)/g, "").match(/-?[\d.]+px/g) || []).map(parseFloat);
      const [x = 0, y = 0, b = 0, sp = 0] = n;
      out = Math.max(out, Math.ceil(Math.max(Math.abs(x), Math.abs(y)) + b + Math.max(sp, 0) + 4));
    }
    return Math.min(out, OUT_MAX);
  }
  function maskFor(tl, tr, br, bl, out) {
    const key = `${tl},${tr},${br},${bl},${out}`;
    let v = cache.get(key);
    if (v) return v;
    const T = out + Math.max(tl, tr), B = out + Math.max(bl, br), L = out + Math.max(tl, bl), R = out + Math.max(tr, br);
    const W = L + 2 + R, H = T + 2 + B, x1 = W - out, y1 = H - out;
    const path = `M0 0H${W}V${H}H0Z` + sliver(out, out, 1, 1, tl) + sliver(x1, out, -1, 1, tr) + sliver(x1, y1, -1, -1, br) + sliver(out, y1, 1, -1, bl);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path fill-rule="evenodd" d="${path}"/></svg>`;
    v = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${T} ${R} ${B} ${L} fill / ${T}px ${R}px ${B}px ${L}px / ${out}px stretch`;
    cache.set(key, v);
    return v;
  }
  const px = (s) => (/^[\d.]+px$/.test(s) ? parseFloat(s) : NaN); // "50%" or "12px 8px" (elliptical) -> NaN

  function detach(el) {
    if (!state.has(el)) return;
    state.delete(el);
    el.removeAttribute("data-sq-m");
    el.style.removeProperty("--sq-mbi");
  }
  function check(el) {
    const cs = getComputedStyle(el);
    if (cs.getPropertyValue("--sq").trim() !== "1" || cs.display === "contents") return detach(el);
    const own = (cs.maskImage && cs.maskImage !== "none") || (cs.webkitMaskImage && cs.webkitMaskImage !== "none");
    const glass = (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
    if (own || glass) return detach(el);
    const k = state.has(el) ? 1 / FIT : 1; // a masked box already shows the reduced arc
    const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((s) => f(px(s) * k));
    if (r.some(isNaN) || Math.max(...r) < MIN) return detach(el);
    const out = reach(cs), key = r.join(",") + "," + out;
    if (state.get(el) === key) return;
    state.set(el, key);
    el.style.setProperty("--sq-mbi", maskFor(...r, out));
    el.setAttribute("data-sq-m", "");
  }
  function scan(root) {
    if (!root || root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    check(root);
    const w = d.createTreeWalker(root, 1, { acceptNode: (n) => (SKIP.has(n.nodeName) || n.namespaceURI !== html.namespaceURI ? 2 : 1) });
    for (let n = w.nextNode(); n; n = w.nextNode()) check(n);
  }

  html.classList.add("sq-fb");
  if (mode === "mask") html.classList.add("sq-force");
  const start = () => {
    scan(d.body);
    new MutationObserver((list) => {
      const seen = new Set();
      for (const m of list) {
        if (m.type === "childList") { for (const n of m.addedNodes) if (n.nodeType === 1 && !seen.has(n)) { seen.add(n); scan(n); } }
        else if (m.target !== html && m.target !== d.body && !seen.has(m.target)) {
          // A class swap can change this box's radius (and its children's). Check the box and its direct children.
          seen.add(m.target); check(m.target);
          for (const c of m.target.children) if (!SKIP.has(c.nodeName)) check(c);
        }
      }
    }).observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    // A full rescan is ~2 ms. Run it when radii can change without a DOM mutation: a stylesheet that arrives late
    // (module CSS, links in the body), page load, and media queries on resize.
    let t = 0;
    const later = (ms) => { clearTimeout(t); t = setTimeout(() => scan(d.body), ms); };
    d.addEventListener("load", (e) => { if (e.target && e.target.nodeName === "LINK") later(30); }, true);
    addEventListener("load", () => later(0));
    addEventListener("resize", () => later(250), { passive: true });
  };
  if (d.body && d.readyState !== "loading") start(); else d.addEventListener("DOMContentLoaded", start, { once: true });
  window.__pbCornersScan = () => scan(d.body);
})();
