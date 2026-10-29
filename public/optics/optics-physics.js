// Optics: physics and data. Pure functions, no DOM.
// Lengths are in cm and angles in degrees unless a name says rad.
// Sources for every number are in docs/optics-science.md.

// ---------- materials ----------
// Indices for yellow light (OpenStax College Physics 2e, Table 25.1) and for
// six colors (Table 25.2). Air is 1.000293 at 0 C and 1 atm (Table 25.1).
export const N_AIR = 1.000293;
export const BANDS = Object.freeze([
  Object.freeze({ id: "red", name: "Red", nm: 660 }),
  Object.freeze({ id: "orange", name: "Orange", nm: 610 }),
  Object.freeze({ id: "yellow", name: "Yellow", nm: 580 }),
  Object.freeze({ id: "green", name: "Green", nm: 550 }),
  Object.freeze({ id: "blue", name: "Blue", nm: 470 }),
  Object.freeze({ id: "violet", name: "Violet", nm: 410 })
]);
export const YELLOW = 2;
export const MATERIALS = Object.freeze({
  air: Object.freeze({ id: "air", name: "Air", n: N_AIR, bands: null }),
  water: Object.freeze({ id: "water", name: "Water", n: 1.333, bands: Object.freeze([1.331, 1.332, 1.333, 1.335, 1.338, 1.342]) }),
  glass: Object.freeze({ id: "glass", name: "Crown glass", n: 1.52, bands: Object.freeze([1.512, 1.514, 1.518, 1.519, 1.524, 1.530]) }),
  flint: Object.freeze({ id: "flint", name: "Flint glass", n: 1.66, bands: Object.freeze([1.662, 1.665, 1.667, 1.674, 1.684, 1.698]) }),
  diamond: Object.freeze({ id: "diamond", name: "Diamond", n: 2.419, bands: Object.freeze([2.410, 2.415, 2.417, 2.426, 2.444, 2.458]) })
});
export const MEDIA_IDS = Object.freeze(["air", "water", "glass", "diamond"]);
export const SOLID_IDS = Object.freeze(["water", "glass", "diamond"]);
export const PRISM_IDS = Object.freeze(["glass", "flint", "diamond", "water"]);
// Index of a material for one color band (null = the single listed value).
export function indexOf(id, band = null) {
  const m = MATERIALS[id];
  if (!m) return N_AIR;
  return band == null || !m.bands ? m.n : m.bands[band];
}
export const C = 2.99792458e8; // m/s, exact (SI)
export const speedIn = (n) => C / n;

const D = Math.PI / 180;
export const rad = (deg) => deg * D;
export const deg = (r) => r / D;

// ---------- reflection and refraction at one surface ----------
export const reflectAngle = (thetaI) => thetaI;
// Snell's law n1 sin t1 = n2 sin t2. Returns t2 in degrees, or null when
// there is no refracted ray (total internal reflection).
export function snell(n1, n2, theta1) {
  const s = (n1 / n2) * Math.sin(rad(theta1));
  if (s > 1) return null;
  return deg(Math.asin(s));
}
// Critical angle for light going from n1 into n2 (null if n1 <= n2).
export function criticalAngle(n1, n2) {
  if (n1 <= n2) return null;
  return deg(Math.asin(n2 / n1));
}
// Fresnel reflectance for unpolarized light (average of s and p).
export function fresnel(n1, n2, theta1) {
  const ci = Math.cos(rad(theta1)), si = Math.sin(rad(theta1));
  const st = (n1 / n2) * si;
  if (st >= 1) return 1;
  const ct = Math.sqrt(1 - st * st);
  const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
  const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
  return (rs * rs + rp * rp) / 2;
}

// ---------- thin lenses and spherical mirrors (paraxial) ----------
// Sign rules (OpenStax): do > 0 for a real object. di > 0 means a real
// image (behind a lens, in front of a mirror); di < 0 means virtual.
// f > 0 converging lens or concave mirror; f < 0 diverging lens or convex mirror.
export function imageDistance(f, dObj) {
  const inv = 1 / f - 1 / dObj;
  if (Math.abs(inv) < 1e-12) return Infinity;
  return 1 / inv;
}
export const magnification = (dObj, di) => -di / dObj;
export const mirrorFocal = (R) => R / 2;
// Three principal rays from the tip of an object of height h at distance dObj.
// Each ray: { t: slope before, y: height at the element, t2: slope after }.
// Slopes are per cm of travel away from the object side (the thin-element
// rule t2 = t - y/f holds for a lens and, unfolded, for a mirror).
export function principalRays(f, dObj, h) {
  const out = [];
  const add = (t) => { const y = h + t * dObj; out.push({ t, y, t2: t - y / f }); };
  add(0);                       // parallel ray, then through (or from) F
  add(-h / dObj);               // through the center (vertex for a mirror, unfolded)
  if (Math.abs(f - dObj) > 1e-9) add((h * f / (f - dObj) - h) / dObj); // toward (or from) F, then parallel
  return out;
}
// Where the image is shown. Beyond IMAGE_CAP the image is "far away" and
// the page shows words, not a number, so no shown number jumps or flips.
export const IMAGE_CAP = 150;
export function imageInfo(f, dObj, h = 1) {
  const di = imageDistance(f, dObj);
  const far = !isFinite(di) || Math.abs(di) > IMAGE_CAP;
  const m = isFinite(di) ? magnification(dObj, di) : Infinity;
  return {
    di, m, far, real: di > 0, upright: m > 0, height: m * h,
    size: !isFinite(m) ? "far" : Math.abs(m) > 1.0005 ? "larger" : Math.abs(m) < 0.9995 ? "smaller" : "same size"
  };
}

// ---------- prism ----------
// A prism with apex angle A: incidence i on the first face, refracted r1,
// r2 = A - r1 inside at the second face, exit angle e, deviation i + e - A.
export function prismPath(n, A, i, nOut = N_AIR) {
  const r1 = snell(nOut, n, i);
  const r2 = A - r1;
  if (r2 < 0) return { r1, r2, e: null, dev: null, tir: false };
  const e = snell(n, nOut, r2);
  if (e === null) return { r1, r2, e: null, dev: null, tir: true };
  return { r1, r2, e, dev: i + e - A, tir: false };
}
export function minDeviation(n, A, nOut = N_AIR) {
  return 2 * deg(Math.asin((n / nOut) * Math.sin(rad(A / 2)))) - A;
}
export const PRISM_APEX = 60;
// Exits within GRAZING of 90 degrees are shown in words ("grazing").
export const GRAZING = 87;

// ---------- 2D ray tracer (used by every scene and the sandbox) ----------
// Elements:
//   { type: "lens", c: [x, y], ang, half, f }      ideal thin lens, axis along ang
//   { type: "mirror", c, ang, half, f }            reflecting face points along ang; f = Infinity for plane
//   { type: "poly", pts: [[x, y], ...], mat }       transparent block of a material
//   { type: "screen", c, ang, half }               absorbs light
// Rays: { p: [x, y], d: [dx, dy], band: 0..5 or null, w: 0..1 }
const EPS = 1e-7;
function hitSeg(p, d, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1];
  const den = d[0] * ey - d[1] * ex;
  if (Math.abs(den) < 1e-14) return null;
  const qx = a[0] - p[0], qy = a[1] - p[1];
  const t = (qx * ey - qy * ex) / den;
  const u = (qx * d[1] - qy * d[0]) / den;
  if (t <= EPS || u < 0 || u > 1) return null;
  return { t, u };
}
export function thinEnds(el) {
  const ex = -Math.sin(el.ang), ey = Math.cos(el.ang);
  return [[el.c[0] - ex * el.half, el.c[1] - ey * el.half], [el.c[0] + ex * el.half, el.c[1] + ey * el.half]];
}
export function polyContains(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function indexAt(els, x, y, band) {
  for (const el of els) if (el.type === "poly" && polyContains(el.pts, x, y)) return indexOf(el.mat, band);
  return N_AIR;
}
const norm = (x, y) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
export function trace(els, rays, bounds, opts = {}) {
  const minW = opts.minW ?? 0.03, maxDepth = opts.maxDepth ?? 24, maxSegs = opts.maxSegs ?? 4000;
  const segs = [];
  const stack = rays.map((r) => ({ ...r, w: r.w ?? 1, depth: 0 }));
  while (stack.length && segs.length < maxSegs) {
    const r = stack.pop();
    let best = null;
    for (const el of els) {
      if (el.type === "poly") {
        for (let i = 0; i < el.pts.length; i++) {
          const a = el.pts[i], b = el.pts[(i + 1) % el.pts.length];
          const h = hitSeg(r.p, r.d, a, b);
          if (h && (!best || h.t < best.t)) best = { t: h.t, el, a, b };
        }
      } else {
        const [a, b] = thinEnds(el);
        const h = hitSeg(r.p, r.d, a, b);
        if (h && (!best || h.t < best.t)) best = { t: h.t, el, a, b, u: h.u };
      }
    }
    // the bounds box
    let tb = Infinity;
    const [x0, y0, x1, y1] = bounds;
    if (r.d[0] > 0) tb = Math.min(tb, (x1 - r.p[0]) / r.d[0]); else if (r.d[0] < 0) tb = Math.min(tb, (x0 - r.p[0]) / r.d[0]);
    if (r.d[1] > 0) tb = Math.min(tb, (y1 - r.p[1]) / r.d[1]); else if (r.d[1] < 0) tb = Math.min(tb, (y0 - r.p[1]) / r.d[1]);
    tb = Math.max(0, tb);
    if (!best || best.t > tb) {
      segs.push({ a: r.p, b: [r.p[0] + r.d[0] * tb, r.p[1] + r.d[1] * tb], w: r.w, band: r.band ?? null });
      continue;
    }
    const q = [r.p[0] + r.d[0] * best.t, r.p[1] + r.d[1] * best.t];
    segs.push({ a: r.p, b: q, w: r.w, band: r.band ?? null });
    if (r.depth >= maxDepth) continue;
    const el = best.el, next = (d, w) => stack.push({ p: q, d, band: r.band, w, depth: r.depth + 1 });
    if (el.type === "screen") continue;
    if (el.type === "lens" || el.type === "mirror") {
      const ax = Math.cos(el.ang), ay = Math.sin(el.ang), ex = -ay, ey = ax;
      const da = r.d[0] * ax + r.d[1] * ay, de = r.d[0] * ex + r.d[1] * ey;
      const y = (q[0] - el.c[0]) * ex + (q[1] - el.c[1]) * ey;
      const t2 = de / Math.abs(da) - (isFinite(el.f) ? y / el.f : 0);
      if (el.type === "lens") { const s = Math.sign(da); next(norm(s * ax + t2 * ex, s * ay + t2 * ey), r.w); }
      else if (da < 0) next(norm(ax + t2 * ex, ay + t2 * ey), r.w); // front face reflects; the back absorbs
      continue;
    }
    // an interface between two media: sample the index on each side
    let nx = best.b[1] - best.a[1], ny = -(best.b[0] - best.a[0]);
    [nx, ny] = norm(nx, ny);
    if (nx * r.d[0] + ny * r.d[1] > 0) { nx = -nx; ny = -ny; } // n faces the incoming ray
    const k = 1e-5;
    const n1 = indexAt(els, q[0] + nx * k, q[1] + ny * k, r.band);
    const n2 = indexAt(els, q[0] - nx * k, q[1] - ny * k, r.band);
    const cosi = -(nx * r.d[0] + ny * r.d[1]);
    const refl = [r.d[0] + 2 * cosi * nx, r.d[1] + 2 * cosi * ny];
    if (Math.abs(n1 - n2) < 1e-12) { next(r.d, r.w); continue; }
    const thetaI = deg(Math.acos(Math.min(1, cosi)));
    const R = fresnel(n1, n2, thetaI);
    const eta = n1 / n2, kk = 1 - eta * eta * (1 - cosi * cosi);
    if (kk < 0) { next(refl, r.w); continue; }
    const c2 = eta * cosi - Math.sqrt(kk);
    next(norm(eta * r.d[0] + c2 * nx, eta * r.d[1] + c2 * ny), r.w * (1 - R));
    if (r.w * R >= minW) next(refl, r.w * R);
  }
  return segs;
}
// Regular polygon helpers (cm).
export function rectPts(cx, cy, w, h, ang = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
export function prismPts(cx, cy, side, ang = 0) {
  const R = side / Math.sqrt(3), out = [];
  for (const a of [90, 210, 330]) out.push([cx + R * Math.cos(rad(a) + ang), cy + R * Math.sin(rad(a) + ang)]);
  return out;
}
export function halfDiscPts(cx, cy, r, n = 180) {
  const out = [[cx + r, cy]];
  for (let i = 1; i < n; i++) { const a = -Math.PI * i / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  out.push([cx - r, cy]);
  return out;
}

// ---------- the scenes of the guided modes ----------
// World frame: x right, y up, cm.
export const BENCH = Object.freeze({ objH: 6, lensHalf: 8, view: Object.freeze({ lenses: [-95, 95], mirrors: [-112, 28] }) });
export function reflectionScene(thetaI) {
  const d = [Math.sin(rad(thetaI)), -Math.cos(rad(thetaI))];
  const els = [{ type: "mirror", c: [0, 0], ang: Math.PI / 2, half: 18, f: Infinity }];
  return { els, rays: [{ p: [-d[0] * 16, -d[1] * 16], d, band: null }], bounds: [-22, -4, 22, 18], lamp: { p: [-d[0] * 16, -d[1] * 16], d } };
}
export function refractionScene(top, bottom, theta1) {
  const d = [Math.sin(rad(theta1)), -Math.cos(rad(theta1))];
  const els = [];
  if (bottom !== "air") els.push({ type: "poly", pts: rectPts(0, -50, 200, 100), mat: bottom });
  if (top !== "air") els.push({ type: "poly", pts: rectPts(0, 50, 200, 100), mat: top });
  return { els, rays: [{ p: [-d[0] * 15, -d[1] * 15], d, band: null }], bounds: [-22, -15, 22, 15], lamp: { p: [-d[0] * 15, -d[1] * 15], d } };
}
export const TIR_R = 11;
export function tirScene(mat, theta) {
  const d = [Math.sin(rad(theta)), Math.cos(rad(theta))];
  const els = [{ type: "poly", pts: halfDiscPts(0, 0, TIR_R), mat }];
  const p = [-d[0] * 17, -d[1] * 17];
  return { els, rays: [{ p, d, band: null }], bounds: [-22, -15, 22, 15], lamp: { p, d } };
}
export const PRISM_SIDE = 14;
export function prismScene(mat, i, white = true) {
  const pts = prismPts(0, 0, PRISM_SIDE);
  const mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
  const dAng = rad(i - 30);
  const d = [Math.cos(dAng), Math.sin(dAng)];
  const p = [mid[0] - d[0] * 14, mid[1] - d[1] * 14];
  const rays = white ? BANDS.map((b, k) => ({ p, d, band: k })) : [{ p, d, band: YELLOW }];
  return { els: [{ type: "poly", pts, mat }], rays, bounds: [-24, -15, 24, 15], lamp: { p, d } };
}

// ---------- sliders ----------
// Every slider maps steps 0..steps to a value. Log sliders keep each step's
// relative change small; angle sliders start at 5 degrees so no value is 0.
export const SLIDERS = Object.freeze({
  angle: Object.freeze({ min: 5, max: 85, steps: 160, log: false, unit: "deg" }),
  prism: Object.freeze({ min: 20, max: 85, steps: 130, log: false, unit: "deg" }),
  dObj: Object.freeze({ min: 5, max: 80, steps: 240, log: true, unit: "cm" }),
  f: Object.freeze({ min: 5, max: 40, steps: 180, log: true, unit: "cm" })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(s.steps, Math.max(0, Math.round(step))) / s.steps;
  return s.log ? s.min * (s.max / s.min) ** u : s.min + (s.max - s.min) * u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = s.log ? Math.log(value / s.min) / Math.log(s.max / s.min) : (value - s.min) / (s.max - s.min);
  return Math.min(s.steps, Math.max(0, Math.round(u * s.steps)));
}

// ---------- what each mode shows ----------
// Numbers the page prints for a state; null means the page prints words
// instead (no refracted ray, image too far away, light trapped).
export function shown(mode, s) {
  switch (mode) {
    case "reflection": return { thetaI: s.angle, thetaR: reflectAngle(s.angle) };
    case "refraction": {
      const n1 = indexOf(s.top), n2 = indexOf(s.bottom);
      return { theta1: s.angle, theta2: snell(n1, n2, s.angle), reflectPct: n1 === n2 || snell(n1, n2, s.angle) === null ? null : 100 * fresnel(n1, n2, s.angle), n1, n2 };
    }
    case "tir": {
      const n1 = indexOf(s.mat), tc = criticalAngle(n1, N_AIR);
      return { theta: s.angle, critical: tc, theta2: snell(n1, N_AIR, s.angle), reflectPct: snell(n1, N_AIR, s.angle) === null ? null : 100 * fresnel(n1, N_AIR, s.angle), n1 };
    }
    case "lenses": case "mirrors": {
      const f = s.kind === "diverging" || s.kind === "convex" ? -s.f : s.f;
      const im = imageInfo(f, s.dObj, BENCH.objH);
      return { dObj: s.dObj, f, di: im.far ? null : im.di, m: im.far ? null : im.m };
    }
    case "dispersion": {
      const red = prismPath(indexOf(s.mat, 0), PRISM_APEX, s.angle), vio = prismPath(indexOf(s.mat, 5), PRISM_APEX, s.angle);
      const ok = (p) => p.dev !== null && p.e < GRAZING;
      return {
        angle: s.angle,
        devRed: ok(red) ? red.dev : null, devViolet: ok(vio) ? vio.dev : null,
        spread: ok(red) && ok(vio) ? vio.dev - red.dev : null
      };
    }
    default: return { f: s.f };
  }
}

export const MODES = Object.freeze(["reflection", "refraction", "tir", "lenses", "mirrors", "dispersion", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  reflection: "reflection", reflect: "reflection", "plane-mirror": "reflection", "law-of-reflection": "reflection",
  refraction: "refraction", refract: "refraction", snell: "refraction", "snells-law": "refraction",
  tir: "tir", "total-internal-reflection": "tir", critical: "tir", "critical-angle": "tir", fiber: "tir",
  lenses: "lenses", lens: "lenses", "thin-lens": "lenses", converging: "lenses", diverging: "lenses",
  mirrors: "mirrors", mirror: "mirrors", concave: "mirrors", convex: "mirrors", "curved-mirror": "mirrors",
  dispersion: "dispersion", prism: "dispersion", rainbow: "dispersion", spectrum: "dispersion",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox", bench: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const raw = (p.get("mode") || "").trim().toLowerCase();
  const mode = MODE_ALIASES[raw] || "reflection";
  let kind = null;
  if (raw === "diverging" || raw === "converging") kind = raw;
  if (raw === "convex" || raw === "concave") kind = raw;
  return { mode, kind };
}

// ---------- formatting ----------
export function sig(x, d = 3) {
  if (!isFinite(x)) return "\u2013";
  if (x === 0) return "0";
  const s = Number(x.toPrecision(d));
  return String(s);
}
const minus = (s) => s.replace("-", "\u2212");
export const degs = (a, d = 1) => minus(a.toFixed(d)) + "\u00b0";
export const cm = (x) => minus(sig(x)) + " cm";
export const times = (m) => minus(sig(m)) + "\u00d7";
