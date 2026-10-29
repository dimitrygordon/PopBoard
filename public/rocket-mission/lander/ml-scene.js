// Rocket & Mission "Mars Lander" view: Leo's lander, plume, pad and Mars terrain on a dark or
// Paper sky. Glows use createRadialGradient only. World y points up; metres map to pixels by view.k.
import { WORLD, LANDER, ART, PAD, PAD_TOP, PAD_H, feetDrop } from "./ml-model.js";
export const CAPTION_GAP = 12;
// Leo: the lander and pad are drawn 1.5 times their model size so they read on every screen.
// Draw scale only: the lander's feet and the pad's top stay where the physics puts them.
export const DRAW_SCALE = 1.5;
// After touchdown the view pans so the ground sits at this fraction of the stage height
// (terrain fills the lower third). PAN_RATE is the easing speed per second.
export const GROUND_AT = 2 / 3, PAN_RATE = 4;
const DIR = "rocket-mission/lander/assets/";
const FILES = ["lander", "engine-plume", "landing-pad", "terrain-strip"];

export function palettes(theme) {
  return theme === "light"
    ? { sky: "#f3efe4", skyLow: "#efe2d3", ink: "#1f2328", dim: "#5b6168", accent: "#a94f2e", guide: "rgba(169,79,46,0.55)", dust: "150,105,80", glow: "232,140,80", star: null }
    : { sky: "#14100f", skyLow: "#2a1914", ink: "#f1ebe6", dim: "#b9aca5", accent: "#e08a66", guide: "rgba(224,138,102,0.6)", dust: "190,140,110", glow: "255,170,110", star: "rgba(241,235,230,0.55)" };
}

const prefers = () => !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
export function createScene(canvas, base = "") {
  const ctx = canvas.getContext("2d");
  const img = {}; let loaded = 0;
  const ready = new Promise((res) => { for (const f of FILES) { const i = new Image(); i.onload = i.onerror = () => { if (++loaded === FILES.length) res(); }; i.src = base + DIR + f + ".webp"; img[f] = i; } });
  let pal = palettes("dark"), dpr = 1;
  const view = { k: 2, ox: 0, oy: 0, base: 0, pan: 0, panTarget: 0, box: { x: 0, y: 0, w: 0, h: 0 } };
  let panGround = null;
  const puffs = [];
  const stars = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97.3) % 1, y: (i * 61.7) % 1 * 0.8, r: (i % 3) * 0.4 + 0.5 }));
  function resize() { dpr = Math.min(2, globalThis.devicePixelRatio || 1); canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr); }
  // Fit the whole world (WORLD.w wide, 0 to WORLD.top tall) in the box, ground on the box bottom.
  function setBox(box) {
    const k = Math.max(0.5, Math.min(box.w / WORLD.w, box.h / WORLD.top));
    Object.assign(view, { box, k, ox: box.x + (box.w - WORLD.w * k) / 2, base: box.y + box.h });
    view.panTarget = targetPan(); view.oy = view.base + view.pan;
    return view;
  }
  // Pan target in px (negative moves the world up): put the ground at GROUND_AT of the box.
  function targetPan() { return panGround == null ? 0 : Math.min(0, panGround * view.k - view.box.h * (1 - GROUND_AT)); }
  // on: pan to the ground (groundY in metres) or back to the full sky; snap skips the easing.
  function panTo(on, snap = false, groundY = 0) {
    panGround = on ? groundY : null; view.panTarget = targetPan();
    if (snap) view.pan = view.panTarget;
    view.oy = view.base + view.pan;
  }
  function easePan(dt) { view.pan += (view.panTarget - view.pan) * Math.min(1, dt * PAN_RATE); if (Math.abs(view.panTarget - view.pan) < 0.5) view.pan = view.panTarget; view.oy = view.base + view.pan; }
  const scr = (x, y) => ({ x: view.ox + x * view.k, y: view.oy - y * view.k });
  const world = (px, py) => ({ x: (px - view.ox) / view.k, y: (view.oy - py) / view.k });
  // Screen rectangles of the art, for captions (CAPTION_GAP below the bottom edge).
  // The lander art in its own rotated frame (origin at the model centre, y down), scaled about the feet line.
  function landerBox() {
    const w = LANDER.w * view.k * DRAW_SCALE, h = LANDER.h * view.k * DRAW_SCALE, feetY = feetDrop() * view.k;
    return { w, h, left: -w / 2, top: feetY - ART.footY * h };
  }
  function landerRect(L) {
    const c = scr(L.x, L.y), b = landerBox(), a = L.tilt * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
    const ys = [[b.left, b.top], [-b.left, b.top], [b.left, b.top + b.h], [-b.left, b.top + b.h]].map(([x, y]) => c.y + x * sn + y * cs);
    return { x: c.x, w: b.w, h: b.h, top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  // The pad art keeps its top on the model's pad surface and grows downward and outward.
  function padRect() { const c = scr(PAD.x, PAD_TOP), w = PAD.w * view.k * DRAW_SCALE, h = PAD_H * view.k * DRAW_SCALE; return { x: c.x, w, h, top: c.y, bottom: c.y + h }; }

  function glow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.45, `rgba(${rgb},${a * 0.4})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function puff(x, y, big = false) { puffs.push({ x, y, t: 0, big }); }

  function draw(L, o = {}) {
    const W = canvas.width / dpr, H = canvas.height / dpr, k = view.k;
    if (prefers()) { view.pan = view.panTarget; view.oy = view.base + view.pan; } else easePan(o.dt || 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, pal.sky); sky.addColorStop(1, pal.skyLow);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (pal.star) { ctx.fillStyle = pal.star; for (const s of stars) { ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill(); } }
    // terrain: Leo's strip tiles across the whole canvas width, one strip per world width
    const sw = WORLD.w * k, sh = sw * ART.stripAspect, sy = view.oy - sh;
    if (img["terrain-strip"].naturalWidth) for (let x = view.ox - Math.ceil(view.ox / sw) * sw; x < W; x += sw) {
      ctx.drawImage(img["terrain-strip"], x, sy, sw, sh);
    }
    // when the view pans up, plain rock continues under the strip down to the canvas bottom
    if (view.oy < H) { const gr = ctx.createLinearGradient(0, view.oy, 0, H); gr.addColorStop(0, "rgb(143,121,110)"); gr.addColorStop(1, "rgb(112,94,86)"); ctx.fillStyle = gr; ctx.fillRect(0, view.oy - 1, W, H - view.oy + 1); }
    // pad, with a dashed guide up to the sky so it is easy to find
    const pr = padRect(), p = { x: pr.x - pr.w / 2, y: pr.top };
    if (o.guide) { ctx.setLineDash([4, 6]); ctx.strokeStyle = pal.guide; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(scr(PAD.x, 0).x, p.y - 6); ctx.lineTo(scr(PAD.x, 0).x, view.box.y + 6); ctx.stroke(); ctx.setLineDash([]); }
    if (img["landing-pad"].naturalWidth) ctx.drawImage(img["landing-pad"], p.x, p.y, pr.w, pr.h);
    if (o.lights) { for (const e of [-1, 1]) { const q = { x: pr.x + e * pr.w * 0.44, y: pr.top + pr.h * 0.08 }; glow(q.x, q.y, 9 * Math.max(0.8, k / 2.5), pal.glow, 0.7); } }
    // lander, plume under its nozzle (rotated with it)
    if (L) {
      const c = scr(L.x, L.y), b = landerBox(), w = b.w;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(L.tilt * Math.PI / 180);
      const nozzleY = b.top + ART.nozzleY * b.h;
      if (o.firing) {
        const flick = o.flicker ?? 1, pw = w * 0.34 * (0.9 + 0.1 * flick), ph = pw * (1029 / 492) * (0.85 + 0.25 * flick);
        glow(0, nozzleY + ph * 0.25, ph * 0.55, pal.glow, 0.35);
        if (img["engine-plume"].naturalWidth) ctx.drawImage(img["engine-plume"], -pw / 2, nozzleY - pw * 0.02, pw, ph);
      }
      if (img.lander.naturalWidth) ctx.drawImage(img.lander, b.left, b.top, b.w, b.h);
      ctx.restore();
      if (o.firing) { // dust kicked up when the plume reaches the ground
        const alt = o.alt ?? 999, reach = LANDER.w * 1.2;
        if (alt < reach) { const g = scr(L.x, L.y - feetDrop() - alt); glow(g.x, g.y, (reach - alt) / reach * 46 * Math.max(0.7, k / 2.5), pal.dust, 0.4); }
      }
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const f = puffs[i]; f.t += o.dt || 0; const life = f.big ? 1.6 : 1; if (f.t > life) { puffs.splice(i, 1); continue; }
      const q = scr(f.x, f.y), u = f.t / life;
      glow(q.x, q.y - 10 * u * k, (f.big ? 60 : 30) * (0.4 + u) * Math.max(0.7, k / 2.5), pal.dust, 0.55 * (1 - u));
    }
  }
  return { resize, setBox, draw, puff, scr, world, landerRect, padRect, panTo, view, ready, setTheme(t) { pal = palettes(t); }, get pal() { return pal; }, get puffs() { return puffs.length; } };
}
