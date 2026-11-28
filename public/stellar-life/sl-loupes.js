// Close-up insets ("loupes") for the Sun and the neutron star scenes (style B, Leo's frames 2 and 3b).
// Both are painted in code, deterministic, no image files. They are unlit flat textures on a plate.
//   granulation: a patch 10,440 km wide (cells 1,000 to 1,500 km, dark narrow lanes between them), contrast boosted
//   city: a skyline patch 840 m wide at dusk, under the sky glow
export const GRAN_KM = 10440, CITY_M = 840, CITY_ASPECT = 480 / 840;

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Irregular convective cells: a jittered grid, nearest and second-nearest seed per pixel, a slight warp so the lanes wander. */
export function paintGranulation(cv, seed = 11) {
  const N = cv.width, G = 8, R = rng(seed), ctx = cv.getContext("2d"), img = ctx.createImageData(N, N);
  const pts = []; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.12 + 0.76 * R()) / G, (j + 0.12 + 0.76 * R()) / G, 0.9 + 0.2 * R()]);
  const warp = (x, y) => [x + 0.012 * Math.sin(y * 23 + 1.3) + 0.007 * Math.sin(y * 57 + x * 31), y + 0.012 * Math.sin(x * 19 + 0.4) + 0.007 * Math.sin(x * 61 - y * 29)];
  const Rn = rng(seed + 5);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const [x, y] = warp(px / N, py / N); let d1 = 9, d2 = 9, id = 0;
    const ci = Math.floor(x * G), cj = Math.floor(y * G);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = ci + di, jj = cj + dj, wi = ((ii % G) + G) % G, wj = ((jj % G) + G) % G, p = pts[wj * G + wi];
      const dx = x - (p[0] + (ii - wi) / G), dy = y - (p[1] + (jj - wj) / G), d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; id = wj * G + wi; } else if (d < d2) d2 = d;
    }
    const gap = (d2 - d1) * G;                    // 0 on a lane, grows toward the cell body
    const lane = 1 - sm(0.04, 0.15, gap);          // narrow dark lane
    const body = 0.93 + 0.07 * sm(0, 0.8, d1 * G) * 0 + 0.07 * (pts[id][2] - 0.9) / 0.2 - 0.05 * sm(0.1, 0.5, d1 * G);   // brighter toward the cell centre
    const sp = (Rn() - 0.5) * 0.045;               // painted speckle
    let r = 252 * body + sp * 255, g = 236 * body + sp * 255, b = 224 * body + sp * 255;
    r += (200 - r) * lane * 0.8; g += (150 - g) * lane * 0.8; b += (110 - b) * lane * 0.8;
    const k = (py * N + px) * 4; img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return cv;
}

/** A dusk skyline, 840 m across: tall tower in the middle, lower blocks either side, a few lit windows, glow low on the left. */
export function paintCity(cv, seed = 3) {
  const W = cv.width, H = cv.height, ctx = cv.getContext("2d"), sx = W / 840, R = rng(seed);
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#080B26"); sky.addColorStop(0.55, "#101A4A"); sky.addColorStop(1, "#3D55A0"); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.6); glow.addColorStop(0, "rgba(120,150,230,0.45)"); glow.addColorStop(1, "rgba(120,150,230,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  const B = [[0, 410, 50], [52, 385, 38], [90, 355, 110], [200, 350, 55], [257, 248, 65], [322, 193, 96], [418, 40, 95], [513, 248, 74], [582, 276, 111], [693, 354, 54], [747, 343, 93]];   // x, roof y, width (840 x 480 frame)
  const gy = 450 * H / 480;
  for (const [x, y, w] of B) {
    const X = x * sx, Y = y * H / 480, Wd = w * sx; ctx.fillStyle = "#05071A"; ctx.fillRect(X, Y, Wd, gy - Y + 2);
    ctx.fillStyle = "rgba(110,140,215,0.55)"; ctx.beginPath(); ctx.ellipse(X + Wd / 2, Y + 1, Wd * 0.45, 2.2 * sx, 0, 0, Math.PI * 2); ctx.fill();   // lit roof edge
    ctx.fillStyle = "rgba(90,115,185,0.35)"; ctx.fillRect(X + 1, Y + 8, 1.5, (gy - Y) * 0.5);   // faint rim on the left wall
    for (let k = 0; k < Math.round(w / 40); k++) { ctx.fillStyle = "#E8AE72"; ctx.fillRect(X + 6 + R() * (Wd - 14), Y + 14 + R() * (gy - Y - 40), 3 * sx, 3 * sx); }
  }
  ctx.fillStyle = "#03041A"; ctx.fillRect(0, gy, W, H - gy); return cv;
}
