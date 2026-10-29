// Ripple Tank view, drawn in code (no art delivered): a grayscale water height map at grid
// resolution, scaled up with smoothing, then thin ink outlines for the tank, walls and dippers.
// One muted accent: on crests normally, on the nodal lines when that view is on.
import { NODAL_THRESHOLD } from "./rt-model.js";
export const CAPTION_GAP = 12;
export const ASPECT = 0.7; // tank short side / long side

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const LE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
const pack = ([r, g, b]) => (LE ? (255 << 24) | (b << 16) | (g << 8) | r : (r << 24) | (g << 16) | (b << 8) | 255) >>> 0;

export function palettes(theme) {
  const light = theme === "light";
  const P = light ? { lo: "#7d8790", mid: "#c9ced2", hi: "#f4f5f4", accent: "#2f6690", ink: "#1d232a", paper: "#fbfaf6", node: "#7fa7c8", nodeMax: 0.5 }
    : { lo: "#0d1116", mid: "#38424c", hi: "#aeb8c1", accent: "#6fa3cf", ink: "#e8edf1", paper: "#1b222a", node: "#6fa3cf", nodeMax: 0.6 };
  const lo = hex(P.lo), mid = hex(P.mid), hi = hex(P.hi), ac = hex(P.accent), nd = hex(P.node);
  const wave = new Uint32Array(256), plain = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 127.5 - 1, base = v < 0 ? mix(mid, lo, -v) : mix(mid, hi, v);
    plain[i] = pack(base);
    wave[i] = pack(v > 0.6 ? mix(base, ac, Math.min(1, (v - 0.6) / 0.4) * 0.6) : base); // accent only on the tops of crests
  }
  return { ...P, wave, plain, nodeRGB: nd, wallRGB: pack(hex(P.ink)) };
}

export function createScene(canvas) {
  const ctx = canvas.getContext("2d");
  const off = document.createElement("canvas"), octx = off.getContext("2d");
  let img = null, dpr = 1, pal = palettes("dark");
  const view = { x: 0, y: 0, w: 100, h: 70, L: 40, H: 28, scale: 1 };
  function resize() { dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr); }
  // Fit the tank in a box at a fixed shape, so the grid never has to be rebuilt when the
  // phone sheet moves; leave room for the caption underneath.
  function setBox(b, L, capH, topAlign = false) {
    const bh = b.h - CAPTION_GAP - capH, w = Math.max(80, Math.min(b.w, bh / ASPECT)), h = w * ASPECT;
    Object.assign(view, { x: Math.round(b.x + (b.w - w) / 2), y: Math.round(b.y + (topAlign ? 0 : Math.max(0, (bh - h) / 2))), w: Math.round(w), h: Math.round(h), L, H: L * ASPECT, scale: w / L });
    return view;
  }
  const toScreen = (X, Y) => ({ x: view.x + X * view.scale, y: view.y + Y * view.scale });
  const toSim = (x, y) => ({ X: (x - view.x) / view.scale, Y: (y - view.y) / view.scale });
  const rectScreen = (r) => { const a = toScreen(r.x0, r.y0), b = toScreen(r.x1, r.y1); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; };

  function paintField(g, gain, nodal, avgRef, behind) {
    const W = g.nx, Hh = g.ny;
    if (!img || img.width !== W || img.height !== Hh) { off.width = W; off.height = Hh; img = octx.createImageData(W, Hh); }
    const px = new Uint32Array(img.data.buffer), lut = nodal ? pal.plain : pal.wave, { nx, ny, u, wall, avg } = g;
    const nodeT = nodal ? pal.nodeRGB : null, inv0 = avgRef > 0 ? 1 / avgRef : 0, split = behind ? behind.split : nx;
    const inv1 = behind && behind.avgRef > 0 ? 1 / behind.avgRef : inv0, gain1 = behind ? behind.gain : gain;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, o = k, far = i >= split, inv = far ? inv1 : inv0, gn = far ? gain1 : gain;
      if (wall[k]) { px[o] = pal.wallRGB; continue; }
      let v = u[k] * gn; v = v > 1 ? 1 : v < -1 ? -1 : v;
      let c = lut[(v + 1) * 127.5 | 0];
      if (nodeT && g.sponge[k] > 0.97 && avg[k] * inv < NODAL_THRESHOLD) {
        // Nodal line: the water here barely moves. A light tint, strongest only at the very center,
        // so the bands read as thin guides over the ripples.
        const q = 1 - avg[k] * inv / NODAL_THRESHOLD, t = pal.nodeMax * q * q * Math.min(1, (g.sponge[k] - 0.97) / 0.03); // fades out into the sponge edge
        const r = c & 255, gg = (c >> 8) & 255, b = (c >> 16) & 255;
        c = LE ? ((255 << 24) | ((b + (nodeT[2] - b) * t) << 16) | ((gg + (nodeT[1] - gg) * t) << 8) | (r + (nodeT[0] - r) * t)) >>> 0 : c;
      }
      px[o] = c;
    }
    octx.putImageData(img, 0, 0);
  }

  function draw(g, st, { gain = 1.6, avgRef = 0, behind = null, walls = [], drag = null, lineX = 1.5 } = {}) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintField(g, gain, st.nodal, avgRef, behind);
    const { x, y, w, h } = view;
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low"; ctx.drawImage(off, x, y, w, h);
    // Walls and blocks get crisp ink outlines over the pixel field.
    ctx.lineWidth = 1.5; ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.paper;
    for (const r of walls) { const s = rectScreen(r); ctx.fillRect(s.x, s.y, s.w, s.h); ctx.strokeRect(s.x + 0.75, s.y + 0.75, s.w - 1.5, s.h - 1.5); }
    if (st.line) { // straight dipper: a bar along the near edge
      const a = toScreen(lineX - 0.4, 0.6), b = toScreen(lineX + 0.4, view.H - 0.6), r = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
      ctx.fillStyle = pal.paper; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 3); ctx.fill(); ctx.stroke();
    }
    st.sources.forEach((p, i) => {
      const s = toScreen(p.x, p.y), r = Math.max(7, 0.55 * view.scale);
      ctx.fillStyle = pal.paper; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = drag === i ? 2.5 : 1.5; ctx.strokeStyle = drag === i ? pal.accent : pal.ink; ctx.stroke();
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    ctx.lineWidth = 1.5; ctx.strokeStyle = pal.ink; ctx.beginPath(); ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 10); ctx.stroke();
  }
  return { resize, setBox, draw, toScreen, toSim, view, setTheme(t) { pal = palettes(t); }, get pal() { return pal; } };
}
