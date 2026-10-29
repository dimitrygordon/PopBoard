// Powers of Ten: canvas renderer. Draws the plates (crossfaded, zoomed about an anchor point)
// and an optional scale bar. Captions are live DOM text placed by the UI under the plate rect
// this returns; nothing is baked into the images. Plates carry their own white halos, so no
// glow or outline is added here.
import { PLATES, plateWeights, plateFraction, FILL, formatPower } from "./p10-logic.js";

export function loadPlates(base = "powers-of-ten/plates/") {
  return PLATES.map((p) => { const img = new Image(); img.decoding = "async"; img.src = base + p.file; return img; });
}

export function createRenderer(canvas, imgs) {
  const ctx = canvas.getContext("2d");
  let dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  // opts: { z, anchor:{x,y} (CSS px, the point zoom is centered on), box:{top,bottom} free area, palette, ruler }
  function draw({ z, anchor, box, palette, ruler, reserve = 0 }) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // reserve: space kept free under the plate for its caption, so plates sit higher than the panel.
    const top = box?.top ?? 0, bottom = box?.bottom ?? H, avail = Math.max(80, bottom - reserve - top);
    const cx = W / 2, cy = top + avail / 2, side = Math.min(W * 0.92, avail);
    const ax = anchor?.x ?? cx, ay = anchor?.y ?? cy;
    const w = plateWeights(z);
    let main = null, best = -1;
    PLATES.forEach((p, i) => {
      if (w[i] <= 0.002) return;
      const f = plateFraction(p, z) / FILL, s = side * f;      // f = 1 when the plate is in focus
      // Zoom about the anchor: the plate's center slides toward or away from it as it scales.
      // Plain zoom about the anchor (the anchor point stays put on the plate), damped so plates never fly off.
      const g = Math.min(1.6, Math.max(0.6, f));
      const px = ax + (cx - ax) * g, py = ay + (cy - ay) * g;
      const img = imgs[i];
      ctx.globalAlpha = w[i];
      if (img.complete && img.naturalWidth) ctx.drawImage(img, px - s / 2, py - s / 2, s, s);
      if (w[i] > best) { best = w[i]; main = { i, x: px - s / 2, y: py - s / 2, s, alpha: w[i] }; }
    });
    ctx.globalAlpha = 1;
    if (ruler) drawRuler(z, side, palette, bottom);
    return main;
  }
  // Scale bar: a bar 1/10 of the view's height is 10^(z-1) m when z is whole.
  function drawRuler(z, side, pal, bottom) {
    const n = Math.round(z) - 1, len = side * Math.pow(10, n - z);
    const x = 16, y = bottom - 18;
    ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.moveTo(x + len, y - 6); ctx.lineTo(x + len, y + 6); ctx.stroke();
    ctx.font = "600 13px system-ui, sans-serif"; ctx.textBaseline = "bottom";
    ctx.fillText(formatPower(n), x, y - 8);
  }
  return { resize, draw, get size() { return { W, H }; } };
}
