// Orbits "Solar System" view: Leo's ink sprites on a dark or Paper sky, accent orbit trails,
// soft puffs for merges. Distances are squeezed (screen radius ~ r^0.4) and sizes are not to scale.
import { PLANETS, SUN, toScreen, toWorld, DIST_POWER } from "./so-model.js";
export const CAPTION_GAP = 12;
const ART = "orbits/assets/solar/";
const FILES = ["sun", "mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus-disk", "uranus-rings", "neptune"];

export function palettes(theme) {
  return theme === "light"
    ? { sky: "#f3efe4", ink: "#1f2328", dim: "#5b6168", accent: "#2f7d7a", ring: "rgba(31,35,40,0.14)", ghost: "rgba(47,125,122,0.75)", puff: "47,125,122" }
    : { sky: "#0f1418", ink: "#e9eef0", dim: "#a3afb5", accent: "#5fb3ad", ring: "rgba(233,238,240,0.12)", ghost: "rgba(95,179,173,0.8)", puff: "95,179,173" };
}

export function createScene(canvas, base = "") {
  const ctx = canvas.getContext("2d");
  const img = {}; let loaded = 0;
  const ready = new Promise((res) => { for (const f of FILES) { const i = new Image(); i.onload = i.onerror = () => { if (++loaded === FILES.length) res(); }; i.src = base + ART + f + ".webp"; img[f] = i; } });
  let pal = palettes("dark"), dpr = 1;
  const view = { cx: 0, cy: 0, k: 60, s: 1, box: { x: 0, y: 0, w: 0, h: 0 } };
  const puffs = [];
  function resize() { dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr); }
  // Fit the orbit of the farthest planet (at least Neptune's 30 AU) inside the box, leaving room
  // under the lowest body for its caption.
  function setBox(box, rMax, capRoom) {
    const s = Math.max(0.7, Math.min(1.3, Math.min(box.w, box.h) / 560)), pad = 22 * s;
    const R = Math.max(60, Math.min(box.w / 2 - pad, (box.h - capRoom - 2 * pad) / 2));
    Object.assign(view, { s, box, k: R / Math.pow(rMax, DIST_POWER), cx: box.x + box.w / 2, cy: box.y + pad + R });
    return view;
  }
  const scr = (x, y) => { const p = toScreen(x, y, view.k); return { x: view.cx + p.x, y: view.cy + p.y }; };
  const world = (px, py) => toWorld(px - view.cx, py - view.cy, view.k);
  // Half height of a body's art on screen: captions sit CAPTION_GAP below this.
  const radius = (key) => (key === "sun" ? SUN.px : PLANETS[key].px) * view.s;
  const artHalfH = (key) => key === "uranus" ? radius(key) * 512 / 280 / 1 : key === "saturn" ? radius(key) * 2.2 * 245 / 512 : radius(key);
  function sprite(key, x, y) {
    const r = radius(key);
    if (key === "saturn") { const w = r * 4.4, h = w * 245 / 512; ctx.drawImage(img.saturn, x - w / 2, y - h / 2, w, h); return; }
    if (key === "uranus") { // disk + rings on one canvas, both centered on the disk center, same scale
      const d = 2 * r, sc = d / 280; ctx.drawImage(img["uranus-disk"], x - r, y - r, d, d);
      ctx.drawImage(img["uranus-rings"], x - 146.5 * sc, y - 256 * sc, 293 * sc, 512 * sc); return;
    }
    ctx.drawImage(img[key], x - r, y - r, 2 * r, 2 * r);
  }
  function puff(x, y) { puffs.push({ x, y, t: 0 }); }
  function draw(sys, o) {
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.sky; ctx.fillRect(0, 0, W, H);
    // faint reference rings at the real planets' distances
    ctx.lineWidth = 1; ctx.strokeStyle = pal.ring;
    for (const k of Object.keys(PLANETS)) { ctx.beginPath(); ctx.arc(view.cx, view.cy, view.k * Math.pow(PLANETS[k].a, DIST_POWER), 0, Math.PI * 2); ctx.stroke(); }
    // trails in accent, fading toward the tail
    ctx.lineCap = "round";
    for (const [id, t] of o.trails) {
      const n = t.length / 2; if (n < 2) continue;
      for (let i = 1; i < n; i++) { const a = scr(t[2 * i - 2], t[2 * i - 1]), b = scr(t[2 * i], t[2 * i + 1]); ctx.globalAlpha = 0.7 * i / n; ctx.strokeStyle = pal.accent; ctx.lineWidth = id === o.selected ? 2.2 : 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    if (o.ghost && o.ghost.length > 3) {
      ctx.setLineDash([4, 5]); ctx.strokeStyle = pal.ghost; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < o.ghost.length; i += 2) { const p = scr(o.ghost[i], o.ghost[i + 1]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (o.sling) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.sling.x, o.sling.y); ctx.lineTo(o.sling.px, o.sling.py); ctx.stroke(); ctx.globalAlpha = 0.6; sprite(o.sling.key, o.sling.x, o.sling.y); ctx.globalAlpha = 1; }
    sprite("sun", view.cx, view.cy);
    for (const b of sys.bodies) {
      const p = scr(b.x, b.y);
      if (b.id === o.selected) { ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, radius(b.key) + 6, 0, Math.PI * 2); ctx.stroke(); }
      sprite(b.key, p.x, p.y);
      if (b.key === "earth") { // the Moon rides along on a drawn circle (its real orbit is far too small to show)
        const th = o.moonAngle || 0, mr = radius("earth") * 1.9, d = radius("earth") * 0.9;
        ctx.drawImage(img.moon, p.x + mr * Math.cos(th) - d / 2, p.y - mr * Math.sin(th) - d / 2, d, d);
      }
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const f = puffs[i]; f.t += o.dt; if (f.t > 0.9) { puffs.splice(i, 1); continue; }
      const p = scr(f.x, f.y), k = f.t / 0.9;
      ctx.fillStyle = `rgba(${pal.puff},${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 8 + 26 * k * view.s, 0, Math.PI * 2); ctx.fill();
    }
  }
  return { resize, setBox, draw, puff, scr, world, radius, artHalfH, view, ready, setTheme(t) { pal = palettes(t); }, get pal() { return pal; }, get puffs() { return puffs.length; } };
}
