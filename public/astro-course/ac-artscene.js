// Layered hand-drawn pages: the original colored-pencil art split into depth planes (Leo's mockups,
// decks/<deck>/v2/art). The art is never redrawn or filtered at rest; it only shifts in parallax
// (capped at 14 px of a 1600 px page) and a few gentle nudges. Labels stay live text from deck.json.
const CAP = 14, PAGE_W = 1600, PAGE_H = 900;

// box = [x0, y0, x1, y1] in 1600x900 page px (the PNG's trimmed bounds)
export const ART = {
  d01: {
    p01: [
      { id: "bg", src: "p01-bg.webp", box: [0, 0, 1600, 900], f: 0.15, light: true },
      { id: "stars", src: "p01-bg-stars.webp", box: [489, 62, 1445, 263], f: 0.15, twinkle: [2.8, 4.6] },
      // mid split (layers.json mid_split): Sun, then orbit dashes, then Earth
      { id: "sun", src: "p01-sun.webp", box: [0, 8, 463, 900], f: 0.4, draw: true, pulse: { scale: 0.015, period: 6, origin: [40, 470] } },
      { id: "orbit", src: "p01-orbit.webp", box: [1006, 614, 1444, 792], f: 0.45, draw: true, shimmer: { min: 0.85, period: 4 } },
      { id: "earth", src: "p01-earth.webp", box: [1143, 626, 1308, 791], f: 0.5, draw: true, drift: { dx: 1, dy: 2, rot: 1.5, period: 7, origin: [1225, 708] } },
      { id: "moon", src: "p01-mid-moon.webp", box: [1355, 613, 1413, 670], f: 0.45, draw: true, orbit: { c: [1223, 708], a: 215, b: 79, sweep: 6, period: 9 } },
      { id: "fg", src: "p01-fg-art.webp", box: [416, 592, 1217, 837], f: 0.8, late: true },
      { id: "light", travel: { from: [432, 828], to: [1200, 762], period: 8.3 }, f: 0.8 },
    ],
    p05: [
      { id: "bg", src: "p05-bg.webp", box: [0, 0, 1600, 900], f: 0.15, light: true },
      { id: "mid", src: "p05-mid.webp", box: [77, 134, 1484, 802], f: 0.45, draw: true, float: { px: 3, period: 7.5 } },
      { id: "fg", src: "p05-fg-art.webp", box: [77, 111, 804, 223], f: 0.8, late: true },
    ],
  },
};
export const hasArt = (deck, pn) => !!(ART[deck] && ART[deck][pn]);
// reveal order from layers.json: pencil lines draw on, then the hatching colors in, then labels
export const REVEAL = { lines: [0.2, 0.6], hatch: [0.8, 0.4], labels: 1.2 };

function dot() {
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 1, 16, 16, 16);
  r.addColorStop(0, "rgba(246,204,25,0.95)"); r.addColorStop(1, "rgba(246,204,25,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  c.className = "art-dot"; return c;
}
const pct = (v, of) => (v / of * 100) + "%";

export function mountArt(stage, base, deck, pn, { still = false } = {}) {
  const spec = ART[deck][pn], wrap = document.createElement("div");
  wrap.className = "art-scene" + (still ? " still" : ""); wrap.setAttribute("aria-hidden", "true");
  const els = spec.map((L) => {
    const el = L.travel ? dot() : Object.assign(document.createElement("img"), { src: base + "v2/art/" + L.src, alt: "", draggable: false });
    if (!L.travel) Object.assign(el.style, { left: pct(L.box[0], PAGE_W), top: pct(L.box[1], PAGE_H), width: pct(L.box[2] - L.box[0], PAGE_W), height: pct(L.box[3] - L.box[1], PAGE_H) });
    const o = (L.pulse || L.drift || {}).origin; if (o) el.style.transformOrigin = `${(o[0] - L.box[0]) / (L.box[2] - L.box[0]) * 100}% ${(o[1] - L.box[1]) / (L.box[3] - L.box[1]) * 100}%`;
    el.classList.add("art-l", "art-" + L.id); if (L.light) el.classList.add("art-light");
    if (!still) el.classList.add(L.draw ? "art-draw" : L.late ? "art-late" : "art-fade");
    wrap.appendChild(el); return { L, el };
  });
  stage.prepend(wrap);
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0, t0 = performance.now(), last = t0;
  const move = (e) => { const r = stage.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)); ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)); last = performance.now(); };
  if (!still) stage.addEventListener("pointermove", move);
  const frame = (now) => {
    const t = (now - t0) / 1000, k = stage.clientWidth / PAGE_W;
    if (now - last > 5000) { tx = 0; ty = 0; } // idle: drift home
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    for (const { L, el } of els) {
      // offset_px = clamp(pointer_norm * cap * factor, -cap, cap), in page px scaled to the stage
      let x = Math.max(-CAP, Math.min(CAP, px * CAP * L.f)), y = Math.max(-CAP, Math.min(CAP, py * CAP * L.f));
      if (L.orbit) {
        const o = L.orbit, cx = (L.box[0] + L.box[2]) / 2, cy = (L.box[1] + L.box[3]) / 2;
        const a0 = Math.atan2((cy - o.c[1]) / o.b, (cx - o.c[0]) / o.a), a = a0 + Math.sin(t / o.period * Math.PI * 2) * o.sweep * Math.PI / 180;
        x += o.c[0] + Math.cos(a) * o.a - cx; y += o.c[1] + Math.sin(a) * o.b - cy;
      }
      if (L.float) y += Math.sin(t / L.float.period * Math.PI * 2) * L.float.px;
      if (L.travel) {
        const q = (t / L.travel.period) % 1, [a, b] = [L.travel.from, L.travel.to];
        el.style.left = pct(a[0] + (b[0] - a[0]) * q, PAGE_W); el.style.top = pct(a[1] + (b[1] - a[1]) * q, PAGE_H);
        el.style.opacity = t < REVEAL.labels ? 0 : Math.min(1, Math.sin(q * Math.PI) * 1.6);
      }
      if (L.twinkle) el.style.opacity = t < 0.3 ? "" : 0.775 + 0.225 * Math.sin(t / L.twinkle[0] * Math.PI * 2);
      // gentle sine in-out motions from layers.json (all skipped under reduced motion: no frames run)
      const wave = (period) => Math.sin(t / period * Math.PI * 2);
      let extra = "";
      if (L.pulse) extra = ` scale(${1 + L.pulse.scale * (0.5 + 0.5 * wave(L.pulse.period))})`;
      if (L.drift) { x += wave(L.drift.period) * L.drift.dx; y += wave(L.drift.period + 0.9) * L.drift.dy; extra = ` rotate(${wave(L.drift.period) * L.drift.rot}deg)`; }
      if (L.shimmer && t > 1.2) el.style.opacity = L.shimmer.min + (1 - L.shimmer.min) * (0.5 + 0.5 * wave(L.shimmer.period));
      el.style.transform = `translate(${x * k}px, ${y * k}px)${extra}`;
    }
    raf = requestAnimationFrame(frame);
  };
  if (!still) raf = requestAnimationFrame(frame);
  return { destroy() { cancelAnimationFrame(raf); stage.removeEventListener("pointermove", move); wrap.remove(); } };
}
