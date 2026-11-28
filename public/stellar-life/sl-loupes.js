// Close-up insets ("loupes") for the Sun and the neutron star scenes (style B, Leo's frames 2 and 3b).
// Both are painted in code, deterministic, no image files. They are unlit flat textures on a plate.
//   granulation: a patch 10,440 km wide (cells 1,000 to 1,500 km, dark narrow lanes between them), contrast boosted
//   city: a skyline patch 840 m wide at dusk, under the sky glow
export const GRAN_KM = 10440, CITY_M = 840, CITY_ASPECT = 480 / 840;

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Irregular convective cells (Leo's styleB loupe): a jittered grid of seeds, nearest and second-nearest seed per pixel, so the
 * cells are crisp polygons. Cells about #F5E3D6, mottled and a little darker toward their edges; narrow dark lanes about #BF9F7D
 * with a thin warm rim. Painted per pixel at full texture size with a one-pixel edge, so nothing is blurred. */
export function paintGranulation(cv, seed = 11) {
  const N = cv.width, G = 9, R = rng(seed), ctx = cv.getContext("2d"), img = ctx.createImageData(N, N);
  const pts = []; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.1 + 0.8 * R()) / G, (j + 0.1 + 0.8 * R()) / G, R()]);
  const Rn = rng(seed + 5), M = 48, mot = []; for (let i = 0; i < M * M; i++) mot.push(Rn());
  const vn = (x, y) => { x *= M; y *= M; const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, a = (u, v) => mot[((v % M + M) % M) * M + ((u % M + M) % M)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (a(i, j) * (1 - sx) + a(i + 1, j) * sx) * (1 - sy) + (a(i, j + 1) * (1 - sx) + a(i + 1, j + 1) * sx) * sy; };
  const px1 = 1 / N, lw = 0.0055, rim = 0.011;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const x = (px + 0.5) / N, y = (py + 0.5) / N; let d1 = 9, d2 = 9, id = 0, p1 = null, p2 = null;
    const ci = Math.floor(x * G), cj = Math.floor(y * G);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const ii = ci + di, jj = cj + dj, wi = ((ii % G) + G) % G, wj = ((jj % G) + G) % G, p = pts[wj * G + wi];
      const qx = p[0] + (ii - wi) / G, qy = p[1] + (jj - wj) / G, d = Math.hypot(x - qx, y - qy);
      if (d < d1) { d2 = d1; p2 = p1; d1 = d; p1 = [qx, qy]; id = wj * G + wi; } else if (d < d2) { d2 = d; p2 = [qx, qy]; }
    }
    /* distance to the cell edge: the bisector between the two nearest seeds */
    const ex = p2[0] - p1[0], ey = p2[1] - p1[1], el = Math.hypot(ex, ey), e = ((x - (p1[0] + p2[0]) / 2) * -ex + (y - (p1[1] + p2[1]) / 2) * -ey) / el;
    const lane = 1 - sm(lw - px1 * 0.5, lw + px1 * 0.5, e);       /* crisp: one-pixel edge */
    const rimK = (1 - sm(lw, lw + rim, e)) * (1 - lane);
    const inner = sm(0, 0.5 / G, e);                               /* 0 at the edge, 1 deep in the cell */
    const mo = (vn(x * 1.7, y * 1.7) - 0.5) * 0.07 + (vn(x * 4.1 + 3.3, y * 4.1) - 0.5) * 0.05;
    const k = 0.955 + 0.045 * inner + mo + (pts[id][2] - 0.5) * 0.035;
    let r = 245 * k, g = 227 * k, b = 214 * k;
    r += (236 - r) * rimK * 0.55; g += (196 - g) * rimK * 0.55; b += (160 - b) * rimK * 0.55;   /* thin warm rim along each lane */
    r += (191 - r) * lane; g += (159 - g) * lane; b += (125 - b) * lane;
    const o = (py * N + px) * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
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
