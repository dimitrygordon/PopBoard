// Stellar Life Cycle VR: procedural style-B brush strokes (Leo's LOOK-SPEC v2 section 5) as 3D ribbons.
// Builder, sky and the protostar disk are ported from the painted-stroke tech test (branch test/painted-strokes, af0d9fd),
// with Leo's build notes: outer disk packed about 20% tighter and faded over its outer third, halo at 0.8x with the
// brightness kept near the core, and planet bodies in the formation disk.
// Per vertex: position (stroke centre line), aTan, aUvK (u across width, v along length, kind), aA (side, width, nominal width, seed),
// aColor (sRGB 0..1 + alpha; in STAR mode r = brightness k fine, g = (dT + 500) / 1000, b = k giant), aParam (phase, boil amplitude, bristles, layer).
import { temperatureToSRGB } from "../night-sky/ns-astro.js";

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const hex2rgb = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)); }
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export function jitter(rgb, R, dh = 0.02, dl = 0.05, ds = 0.06) { const [h, s, l] = rgb2hsl(rgb); return hsl2rgb([(h + (R() * 2 - 1) * dh + 1) % 1, clamp01(s + (R() * 2 - 1) * ds), clamp01(l + (R() * 2 - 1) * dl)]); }
export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const lerp = (a, b, t) => a + (b - a) * t;
export const tRGB255 = (T) => temperatureToSRGB(T).map((v) => Math.round(clamp01(v) * 255));
const tap = (t) => Math.pow(Math.min(1, t / 0.25, (1 - t) / 0.45), 0.7);
const TAU = Math.PI * 2;

export const SEG = 8;
export const KIND = { PLAIN: 0, DISK: 1, LANE: 2, STREAK: 3, WIND: 4, PULL: 5 };

export class Builder {
  constructor() { this.pos = []; this.tan = []; this.uvk = []; this.a = []; this.col = []; this.par = []; this.starts = []; this.cent = []; this.omega = []; this.kinds = []; this.nv = 0; this.n = 0; }
  add(pts, { width, rgb, alpha, kind = 0, bristles = 5, boil = 0, omega = 0, layer = 0, seed, dab = false, raw = null }) {
    const P = []; for (let i = 0; i <= SEG; i++) { const f = i / SEG * (pts.length - 1), j = Math.min(pts.length - 2, Math.floor(f)), t = f - j; P.push([0, 1, 2].map((k) => pts[j][k] + (pts[j + 1][k] - pts[j][k]) * t)); }
    let cx = 0, cy = 0, cz = 0; for (const p of P) { cx += p[0]; cy += p[1]; cz += p[2]; }
    this.cent.push(cx / P.length, cy / P.length, cz / P.length); this.omega.push(omega); this.kinds.push(kind);
    this.starts.push(this.nv);
    const c4 = raw || [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
    for (let i = 0; i <= SEG; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(SEG, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const L = Math.hypot(tx, ty, tz) || 1; tx /= L; ty /= L; tz /= L;
      const t = i / SEG; const w = dab ? width * (0.55 + 0.45 * Math.sin(Math.PI * t)) : width * tap(t);
      for (let s = 0; s < 2; s++) {
        this.pos.push(P[i][0], P[i][1], P[i][2]); this.tan.push(tx, ty, tz);
        this.uvk.push(s, t, kind); this.a.push(s ? 1 : -1, w, width, seed);
        this.col.push(c4[0], c4[1], c4[2], alpha); this.par.push(omega, boil, bristles, layer);
      }
    }
    this.nv += 2 * (SEG + 1); this.n++;
  }
  geometry(THREE) {
    const g = new THREE.BufferGeometry(); const F = (arr, n, name) => g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(arr), n));
    F(this.pos, 3, "position"); F(this.tan, 3, "aTan"); F(this.uvk, 3, "aUvK"); F(this.a, 4, "aA"); F(this.col, 4, "aColor"); F(this.par, 4, "aParam");
    const per = 6 * SEG, idx = new Uint32Array(this.n * per);
    for (let s = 0; s < this.n; s++) { const v0 = this.starts[s]; let o = s * per; for (let i = 0; i < SEG; i++) { const a = v0 + 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.set([a, b, c, b, d, c], o); o += 6; } }
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    g.userData = { count: this.n, per, cent: new Float32Array(this.cent), omega: new Float32Array(this.omega), kinds: new Uint8Array(this.kinds), baseIndex: idx.slice() };
    return g;
  }
}

export function randDir(R) { const z = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
function spherePath(p, Rs, len, headingFn, n = 10) {
  let pos = [p[0] * Rs, p[1] * Rs, p[2] * Rs]; const pts = [pos.slice()]; const step = len / n;
  for (let i = 0; i < n; i++) {
    const d = norm(pos); let e1 = cross([0, 1, 0], d); if (Math.hypot(...e1) < 1e-3) e1 = [1, 0, 0]; e1 = norm(e1); const e2 = cross(d, e1); const ang = headingFn(i / n, d);
    const mv = [0, 1, 2].map((k) => e1[k] * Math.cos(ang) + e2[k] * Math.sin(ang));
    pos = norm([0, 1, 2].map((k) => pos[k] + mv[k] * step)).map((v) => v * Rs); pts.push(pos.slice());
  }
  return pts;
}

// ---------- shared painted sky: wash, sketch lines, star dabs on a far sphere (static, no boil) ----------
export function buildSky(seed = 7) {
  const R = rng(seed); const sky = new Builder(); const sprites = []; let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const RS = 2200, SKYPX = 2.0;
  for (let i = 0; i < 160; i++) {
    const d = randDir(R); const t = clamp01(0.75 * (0.5 - 0.5 * d[1]) + 0.25 * ((Math.atan2(d[2], d[0]) / Math.PI + 1) / 2));
    const base = t < 0.6 ? mix(hex2rgb("#04081A"), hex2rgb("#0C143A"), t / 0.6) : mix(hex2rgb("#0C143A"), hex2rgb("#2E1E5C"), (t - 0.6) / 0.4);
    const col = jitter(mix(base, hex2rgb("#3A3C8C"), 0.18), R, 0.02, 0.03, 0.05); const len = (260 + R() * 520) * SKYPX;
    sky.add(spherePath(d, RS, len, (u) => 0.18 * Math.sin(u * 5 + d[0] * 9)), { width: (18 + R() * 30) * SKYPX, rgb: col, alpha: 0.154, bristles: 7, seed: S() });
  }
  for (let i = 0; i < 34; i++) {
    const d = randDir(R); const col = jitter(hex2rgb(["#4B4FA8", "#6A5AC0", "#3E5BA8"][i % 3]), R, 0.02, 0.05, 0.05); const len = (150 + R() * 380) * SKYPX; const ph = R() * 9;
    sky.add(spherePath(d, RS, len, (u) => Math.sin(u * 4 + ph) * 1.4 + Math.cos(u * 3 + ph * 1.7)), { width: (1.6 + R() * 1.4) * SKYPX, rgb: col, alpha: 0.10 + R() * 0.12, bristles: 1, seed: S() });
  }
  for (let i = 0; i < 700; i++) {
    const d = randDir(R); const Tk = Math.pow(10, 3.6 + R() * 0.6); const col = mix(tRGB255(Tk), [255, 255, 255], 0.4); const big = R() < 0.02;   // same 40% to white rule as Night Sky
    const s = (big ? 3 + R() * 2 : 1.1 + R() * 1.3) * SKYPX; const e1 = norm(cross([0, 1, 0], d)); const L = s * 1.4;
    const c = d.map((v) => v * RS); const pts = [[0, 1, 2].map((k) => c[k] - e1[k] * L * 0.5), c, [0, 1, 2].map((k) => c[k] + e1[k] * L * 0.5)];
    sky.add(pts, { width: s * 1.5, rgb: col, alpha: 0.55 + R() * 0.45, bristles: 1, seed: S(), dab: true });
    if (big) sprites.push({ p: c, r: s * 3, rgb: col, a: 0.25, breath: 0 });
  }
  return { sky, sprites };
}

// ---------- F1/F2: cold cloud (visible: black silhouette; infrared: glows orange-red) and collapse filaments ----------
export function buildCloud(seed = 11) {
  const R = rng(seed); const vis = new Builder(), ir = new Builder(), fil = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const blob = (p) => { const [x, y, z] = p; return Math.exp(-(x * x + y * y * 2.2 + z * z) / (2 * 14 * 14)) * (0.6 + 0.4 * Math.sin(x * 0.21 + z * 0.17) * Math.cos(y * 0.3)); };
  for (let i = 0; i < 620; i++) {
    let p; do { p = [(R() * 2 - 1) * 34, (R() * 2 - 1) * 20, (R() * 2 - 1) * 34]; } while (R() > blob(p) * 1.6);
    const ang = R() * TAU, len = 4 + R() * 9, dir = [Math.cos(ang), (R() - 0.5) * 0.5, Math.sin(ang)];
    const pts = [0, 0.5, 1].map((f) => [p[0] + dir[0] * len * f, p[1] + dir[1] * len * f + Math.sin(f * 3 + i) * 0.8, p[2] + dir[2] * len * f]);
    const dens = blob(p);
    vis.add(pts, { width: 3 + R() * 6, rgb: jitter(hex2rgb("#0B0918"), R, 0.02, 0.02, 0.04), alpha: 0.35 + 0.5 * dens, bristles: 6, boil: 0.25, seed: S() });
    ir.add(pts, { width: 3 + R() * 6, rgb: jitter(mix(hex2rgb("#FF7A3A"), hex2rgb("#B8342A"), 1 - dens), R, 0.02, 0.05, 0.05), alpha: 0.10 + 0.35 * dens, bristles: 6, boil: 0.25, seed: S() });
  }
  for (let i = 0; i < 220; i++) {
    const d = randDir(R); const r0 = 8 + R() * 22; const p = d.map((v) => v * r0); const L = 3 + R() * 5;
    const pts = [0, 0.5, 1].map((f) => p.map((v, k) => v * (1 - f * L / r0) + (k === 1 ? Math.sin(f * 4 + i) * 0.4 : 0)));
    fil.add(pts, { width: 1.2 + R() * 2.2, rgb: jitter(hex2rgb("#C97A58"), R, 0.02, 0.06, 0.05), alpha: 0.25 + R() * 0.25, kind: KIND.PULL, bristles: 3, boil: 0.15, omega: R(), seed: S() });
  }
  return { vis, ir, fil };
}

// ---------- F3 to F5: protostar disk, jets, rays, planets (world units: AU) ----------
export function buildDisk(opts = {}) {
  const T = opts.teff || 4410, seed = opts.seed || 7, AUPX = 32, PX = 1 / AUPX, ROUT = 18.5;
  const R = rng(seed); const disk = new Builder(), add = new Builder(), wrap = new Builder(); const sprites = [];
  const starRGB = tRGB255(T); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const h = (r) => 0.045 * Math.pow(Math.max(r, 0.02), 1.22);
  const gaps = [[5.2, 0.55, 0.88], [9.0, 0.75, 0.65], [12.5, 0.9, 0.45], [15.5, 1.0, 0.35]], rings = [[7.0, 0.8, 0.35], [10.8, 0.7, 0.25], [14.0, 0.8, 0.2]];
  const innerRings = [[1.3, 0.28, 0.70], [2.2, 0.32, 0.60], [3.8, 0.38, 0.50]];
  const sig = (r) => { let s = Math.pow(Math.max(r, 0.15), -0.55) * Math.exp(-Math.pow(r / ROUT, 6)); for (const [rg, wg, dg] of gaps) s *= 1 - dg * Math.exp(-0.5 * ((r - rg) / (wg * 0.5)) ** 2); for (const [rr, wr, ar] of rings) s *= 1 + ar * Math.exp(-0.5 * ((r - rr) / (wr * 0.5)) ** 2); for (const [rr, wr, ar] of innerRings) s *= 1 + ar * Math.exp(-0.5 * ((r - rr) / (wr * 0.5)) ** 2); return s; };
  // Leo build note 1: outer third (r > 2/3 of the edge) packed about 20% tighter (1.25x stroke density, so spacing is 0.8x),
  // and every stroke there fades gradually toward the edge so it does not break off into loose dashes.
  const OUT0 = (ROUT + 2) * 2 / 3, EDGE = ROUT + 2;
  const pack = (r) => (r > OUT0 ? 1.25 : 1);
  const edgeFade = (r) => (r <= OUT0 ? 1 : Math.pow(clamp01(1 - (r - OUT0) / (EDGE - OUT0)), 1.4) * 0.85 + 0.15 * clamp01(1 - (r - OUT0) / (EDGE - OUT0)));
  const pal = [starRGB, hex2rgb("#E9B98A"), hex2rgb("#C98E62"), hex2rgb("#8E5C46")];
  const colAt = (r) => { const t = Math.min(1, Math.log(1 + r) / Math.log(1 + ROUT)); const i = Math.min(2, Math.floor(t * 3)); return mix(pal[i], pal[i + 1], t * 3 - i); };
  const A_DISK = 2.2 * PX, A_JET = 3.0 * PX, A_RAY = 1.6 * PX, A_OTHER = 1.0 * PX;
  const ringPts = (r, ph, dph, z, pitchDeg = 0) => { const pts = []; for (let k = 0; k <= 10; k++) { const pp = ph + dph * k / 10; const rr = r * (1 - Math.tan(pitchDeg * Math.PI / 180) * dph * k / 10); pts.push([rr * Math.cos(pp), z, -rr * Math.sin(pp)]); } return pts; };
  const nDisk = 2200, nUnder = 330;
  let wmax = 0; for (let r = 0.3; r < EDGE; r += 0.05) wmax = Math.max(wmax, sig(r) * r * pack(r));
  let made = 0, tries = 0; const total = nDisk + nUnder;
  while (made < total && tries < 4000000) {
    tries++; const r = 0.3 + R() * (ROUT + 2); if (R() * wmax > sig(r) * r * pack(r)) continue;
    const under = made < nUnder; const ph = R() * TAU;
    const len = (lerp(1.15, 3.2, R())) * (0.45 + r / 9) * (under ? 1.6 : 1); const dph = Math.min(1.2, len / r);
    const z = (R() < 0.5 ? 1 : -1) * h(r) * (1.6 + R() * 0.8);
    const wpx = (under ? 3 : 1) * lerp(4.5, 15, R()) * (0.55 + 0.45 * Math.min(1, r / 8)) * (r > OUT0 ? 0.9 : 1);
    const col = jitter(colAt(r), R, 0.02, 0.06, 0.06);
    disk.add(ringPts(r, ph, dph, z, 5), { width: wpx * PX, rgb: col, alpha: (under ? 0.22 : lerp(0.45, 0.9, R())) * edgeFade(r), kind: KIND.DISK, bristles: 6, boil: A_DISK, seed: S() });
    made++;
  }
  for (const [rr] of rings) for (let i = 0; i < 30; i++) {
    const ph = R() * TAU, d = (0.5 + R() * 0.9) * 0.9, rj = rr + (R() - 0.5) * 0.4;
    disk.add(ringPts(rj, ph, d, (R() < 0.5 ? 1 : -1) * h(rj) * 2), { width: lerp(4.5, 10.5, R()) * PX, rgb: jitter(mix(colAt(rr), [255, 240, 225], 0.25), R, 0.01, 0.05, 0.04), alpha: (0.55 + R() * 0.3) * edgeFade(rj), kind: KIND.DISK, bristles: 4, boil: A_DISK, seed: S() });
  }
  for (const [rr] of innerRings) for (let i = 0; i < 52; i++) {
    const ph = R() * TAU, d = (0.7 + R() * 1.1) * 0.9, rj = rr + (R() - 0.5) * 0.18;
    disk.add(ringPts(rj, ph, d, (R() < 0.5 ? 1 : -1) * h(rj) * 2.2), { width: lerp(6, 14, R()) * PX, rgb: jitter(mix(colAt(rr), [255, 236, 214], 0.45), R, 0.01, 0.05, 0.04), alpha: 0.70 + R() * 0.25, kind: KIND.DISK, bristles: 5, boil: A_DISK, seed: S() });
  }
  for (const [rg, wg] of gaps) for (let i = 0; i < 28; i++) {
    const ph = R() * TAU, d = (0.5 + R() * 0.9) * 0.9, rj = rg + (R() - 0.5) * wg * 0.5;
    disk.add(ringPts(rj, ph, d, (R() < 0.5 ? 1 : -1) * h(rj) * 1.6), { width: lerp(3, 7.5, R()) * (1 + wg) * PX, rgb: jitter(hex2rgb("#2A1E3C"), R, 0.01, 0.03, 0.04), alpha: (0.5 + R() * 0.3) * edgeFade(rj), kind: KIND.DISK, bristles: 4, boil: A_DISK, seed: S() });
  }
  for (let i = 0; i < 340; i++) {
    const r = 1.2 + Math.pow(R(), 0.8) * (ROUT - 1), ph = R() * TAU, dph = (0.6 + R()) / r;
    disk.add(ringPts(r, ph, dph, -h(r) * 0.2), { width: lerp(4.5, 12, R()) * PX, rgb: jitter(hex2rgb("#1A1230"), R, 0.02, 0.03, 0.05), alpha: (0.35 + R() * 0.35) * edgeFade(r), kind: KIND.LANE, bristles: 4, boil: A_DISK, seed: S() });
  }
  for (let i = 0; i < 240; i++) {
    let r; do { r = 0.5 + R() * 15.5; } while (R() * wmax > sig(r) * r);
    const ph = R() * TAU, dph = (24 * PX) / r, z = (R() < 0.5 ? 1 : -1) * h(r) * (1.6 + R() * 0.8);
    disk.add(ringPts(r, ph, dph, z), { width: lerp(3.75, 7.5, R()) * PX, rgb: mix(colAt(r), hex2rgb("#FFF4E8"), 0.35), alpha: edgeFade(r), kind: KIND.STREAK, bristles: 3, boil: A_OTHER, omega: R(), seed: S() });
  }
  // ---- planet bodies (Leo build note 3; LOOK-SPEC 3.1). Drawn far larger than real; a chip says so. Lit from the star side only.
  const bodies = [];
  if (opts.planets === "solar") {
    for (const [r, px] of [[5.2, 6.5], [9.0, 5.5], [12.5, 5.0], [15.5, 4.5]]) bodies.push({ r, rad: px * 2.2 * PX, col: "#C9A27E", kind: "giant" });
    for (const [r, px] of [[0.6, 2.4], [0.9, 2.7], [1.3, 3.0], [1.9, 2.6], [2.5, 2.4]]) bodies.push({ r, rad: px * 2.2 * PX, col: "#A88E7A", kind: "rocky" });
  } else if (opts.planets === "reddwarf") {
    for (const [r, px] of [[0.6, 2.6], [1.1, 2.9], [1.8, 2.5]]) bodies.push({ r, rad: px * 2.2 * PX, col: "#A88E7A", kind: "rocky" });
  }
  for (const b of bodies) {
    const ph = R() * TAU, cx = b.r * Math.cos(ph), cz = -b.r * Math.sin(ph); const toStar = norm([-cx, 0, -cz]);
    const base = hex2rgb(b.col);
    for (let k = 0; k < (b.kind === "giant" ? 22 : 12); k++) {
      const d = randDir(R); const lit = Math.max(0, d[0] * toStar[0] + d[2] * toStar[2]) * 0.85 + 0.15;
      const c = [cx + d[0] * b.rad * 0.6, d[1] * b.rad * 0.6, cz + d[2] * b.rad * 0.6]; const e1 = norm(cross([0, 1, 0], d)); const L = b.rad * 0.9;
      const pts = [[0, 1, 2].map((q) => c[q] - e1[q] * L * 0.5), c, [0, 1, 2].map((q) => c[q] + e1[q] * L * 0.5)];
      disk.add(pts, { width: b.rad * 0.9, rgb: mix([20, 16, 34], jitter(base, R, 0.02, 0.05, 0.05), lit), alpha: 0.95, bristles: 3, boil: A_OTHER, seed: S(), dab: true });
    }
    sprites.push({ p: [cx, 0, cz], r: b.rad * 2.2, rgb: mix(base, [255, 240, 220], 0.4), a: 0.16, breath: 0 });
  }
  // ---- jets (Leo v2: thick, H-alpha knots #FF5A6A to #FF7A8E) and protostar rays (additive)
  const jetA = hex2rgb("#FF5A6A"), jetB = hex2rgb("#FF7A8E"); const jetCol = () => mix(jetA, jetB, R());
  for (const up of [true, false]) {
    const dir = up ? 1 : -1, tip = (up ? 260 : 300) * PX, dim = up ? 1 : 0.55;
    for (let k = 0; k < 4; k++) {
      const a = R() * TAU, rr = R() * 3 * PX; const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      add.add([[x, dir * 10 * PX, z], [x * 1.6, dir * tip * 0.45, z * 1.6], [x * 2.4, dir * tip, z * 2.4]], { width: lerp(9, 15, R()) * PX, rgb: jitter(jetCol(), R, 0.015, 0.05, 0.04), alpha: lerp(0.22, 0.40, R()) * dim, bristles: 3, boil: A_JET, seed: S() });
    }
  }
  for (let i = 0; i < 60; i++) {
    const up = i % 2 === 0; const L = lerp(40, 120, R()) * PX; const y0 = (up ? 1 : -1) * (14 + R() * (up ? 250 : 210)) * PX;
    const a = R() * TAU, rr = R() * (3 * PX + Math.abs(y0) * 0.06); const x0 = Math.cos(a) * rr, z0 = Math.sin(a) * rr, dir = up ? 1 : -1;
    add.add([[x0, y0, z0], [x0 + (R() - 0.5) * 0.25, y0 + dir * L * 0.5, z0 + (R() - 0.5) * 0.25], [x0 + (R() - 0.5) * 0.4, y0 + dir * L, z0 + (R() - 0.5) * 0.4]], { width: lerp(6, 14, R()) * PX, rgb: jitter(jetCol(), R, 0.02, 0.08, 0.05), alpha: lerp(0.18, 0.42, R()) * (up ? 1 : 0.55), bristles: 3, boil: A_JET, seed: S() });
  }
  for (const up of [true, false]) {
    const dir = up ? 1 : -1, dim = up ? 1 : 0.55;
    for (const ypx of [95, 175, 250]) for (let k = 0; k < 8; k++) {
      const y = dir * (ypx + (R() - 0.5) * 10) * PX; const a = R() * TAU, rad = (R() * 6) * PX; const x = Math.cos(a) * rad, z = Math.sin(a) * rad, L = (6 + R() * 10) * PX;
      add.add([[x, y - dir * L * 0.3, z], [x + (R() - 0.5) * 0.08, y + dir * L * 0.2, z + (R() - 0.5) * 0.08], [x + (R() - 0.5) * 0.12, y + dir * L * 0.7, z + (R() - 0.5) * 0.12]], { width: lerp(8, 16, R()) * PX, rgb: jitter(jetCol(), R, 0.015, 0.06, 0.04), alpha: lerp(0.35, 0.70, R()) * dim, bristles: 3, boil: A_JET, seed: S(), dab: true });
    }
    const tip = up ? 260 : 300;
    for (let k = 0; k < 6; k++) {
      const y = dir * (tip + (R() - 0.5) * 8) * PX, spread = (8 + R() * 14) * PX, a0 = R() * TAU, dph = 0.8 + R() * 1.2; const pts = [];
      for (let s = 0; s <= 6; s++) { const a = a0 + dph * (s / 6 - 0.5), rad = spread * (0.6 + 0.4 * Math.sin(Math.PI * s / 6)); pts.push([Math.cos(a) * rad, y + dir * (s / 6) * 6 * PX, Math.sin(a) * rad]); }
      add.add(pts, { width: lerp(5, 11, R()) * PX, rgb: jitter(jetCol(), R, 0.02, 0.06, 0.04), alpha: lerp(0.22, 0.45, R()) * dim, bristles: 2, boil: A_JET, seed: S() });
    }
  }
  for (let i = 0; i < 150; i++) {
    const d = randDir(R); const L = (6 + Math.pow(R(), 2) * 40) * PX, r0 = R() * 4 * PX; const tw = norm([d[0] + 0.12 * d[2], d[1], d[2] - 0.12 * d[0]]);
    add.add([d.map((v) => v * r0), d.map((v, k) => v * (r0 + L * 0.5) * 0.5 + tw[k] * (r0 + L * 0.5) * 0.5), tw.map((v) => v * (r0 + L))], { width: lerp(1.5, 4.5, R()) * PX, rgb: mix(starRGB, [255, 255, 255], R() * 0.6), alpha: 0.35 + R() * 0.4, bristles: 2, boil: A_RAY, seed: S() });
  }
  // ---- massive stars: still wrapped in their cloud (F4), blown clear at F5
  if (opts.wrap) for (let i = 0; i < 420; i++) {
    const d = randDir(R); const r0 = 6 + R() * 16; const p = d.map((v) => v * r0); const e1 = norm(cross(d, [0.3, 1, 0.2]));
    const L = 3 + R() * 6; const pts = [0, 0.5, 1].map((f) => p.map((v, k) => v + e1[k] * (f - 0.5) * L + d[k] * Math.sin(f * 3) * 0.4));
    wrap.add(pts, { width: 1.5 + R() * 3.5, rgb: jitter(mix(hex2rgb("#120E22"), hex2rgb("#5A3046"), R() * 0.5), R, 0.02, 0.03, 0.04), alpha: 0.35 + R() * 0.35, bristles: 6, boil: A_DISK * 2, seed: S() });
  }
  // Leo build note 2: halo pulled in to 0.8x its v2 size; the brightest part kept near the core (inner layers keep their strength,
  // the two outer layers are dimmer). Every layer is the star's own temperatureToSRGB colour, summed in one shader with the equal bleed.
  const HALO = 0.8;
  const core = [[420 * PX * HALO, 0.12], [220 * PX * HALO, 0.26], [88 * PX * HALO, 0.62], [36 * PX * HALO, 0.88], [16 * PX * HALO, 1.05]];
  return { disk, add, wrap, sprites, core, starRGB, bodies, frost: 3.0, ROUT, OUT0 };
}

// ---------- a star's painted surface on a unit sphere (STAR mode: colour from the live Teff) ----------
// k fine: granulation-like cells (Sun), k giant: 8 giant cells (LOOK-SPEC 5, RSG rows). dT is a giant-cell temperature swing.
export function buildStar(seed = 21, counts = { broad: 420, medium: 1150, hi: 520 }) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const cells = []; while (cells.length < 8) { const d = randDir(R); if (cells.every((c) => Math.acos(Math.min(1, c.d[0] * d[0] + c.d[1] * d[1] + c.d[2] * d[2])) > 0.55)) cells.push({ d, rad: 0.34 + R() * 0.18, h: 0.45 + R() * 0.55, sgn: R() < 0.5 ? -1 : 1 }); }
  const fine = []; for (let i = 0; i < 90; i++) fine.push(randDir(R));
  const heat = (p) => { let m = 0; for (const c of cells) { const d = Math.acos(Math.max(-1, Math.min(1, c.d[0] * p[0] + c.d[1] * p[1] + c.d[2] * p[2]))); m = Math.max(m, c.h * Math.exp(-2.0 * (d / c.rad) ** 2)); } return m; };
  const gran = (p) => { let best = 9, second = 9; for (const f of fine) { const d = 1 - (f[0] * p[0] + f[1] * p[1] + f[2] * p[2]); if (d < best) { second = best; best = d; } else if (d < second) second = d; } return Math.min(1, (second - best) * 18); };
  const swirl = (p) => { let best = cells[0], bd = 9; for (const c of cells) { const d = 1 - (c.d[0] * p[0] + c.d[1] * p[1] + c.d[2] * p[2]); if (d < bd) { bd = d; best = c; } } return best; };
  const layer = (n, len0, len1, w0, w1, a0, a1, minHeat, brist) => {
    for (let i = 0; i < n; i++) {
      let d = randDir(R); let hh = heat(d); if (minHeat > 0 && hh < minHeat) { i--; if (R() < 0.02) continue; continue; }
      const c = swirl(d); const len = lerp(len0, len1, R()), w = lerp(w0, w1, R());
      const pts = spherePath(d, 1.0, len, (u, dd) => { const t = cross(c.d, dd); return Math.atan2(t[1], t[0]) * c.sgn + 0.45; }, 6);
      const kGiant = clamp01(0.62 + 0.55 * (hh - 0.5) + (R() - 0.5) * 0.12);
      const kFine = clamp01(0.86 + 0.10 * (gran(d) - 0.5) + (R() - 0.5) * 0.06);
      const dT = minHeat > 0 ? 150 : 0;
      const dTg = 1000 * (hh - 0.5) * 0.6 + dT;   // +/- about 300 K, folded into the shader; kept small so the disc mean stays on Teff
      b.add(pts, { width: w, raw: [kFine, clamp01((dTg + 500) / 1000), kGiant], alpha: lerp(a0, a1, R()), bristles: brist, boil: 0.006, seed: S() });
    }
  };
  layer(counts.broad, 0.22, 0.48, 0.16, 0.30, 0.55, 0.80, 0, 8);
  layer(counts.medium, 0.12, 0.28, 0.06, 0.12, 0.60, 0.90, 0, 6);
  layer(counts.hi, 0.06, 0.16, 0.03, 0.05, 0.50, 0.85, 0.55, 4);
  return b;
}

// wind streaks leaving a star (unit sphere), radial drift in the vertex shader
export function buildWind(seed = 31, n = 300) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  for (let i = 0; i < n; i++) { const d = randDir(R); const r0 = 1.0 + R() * 0.08, L = 0.15 + R() * 0.3; b.add([d.map((v) => v * r0), d.map((v) => v * (r0 + L * 0.5)), d.map((v) => v * (r0 + L))], { width: 0.02 + R() * 0.04, raw: [0.55 + R() * 0.3, 0.5, 0.6 + R() * 0.3], alpha: 0.25 + R() * 0.3, kind: KIND.WIND, bristles: 3, boil: 0.01, omega: R(), seed: S() }); }
  return b;
}

// core cutaway layers: flat disc of ring strokes in the x/y plane (billboarded by the caller). layer index in aParam.w (1..7)
// Fuel colours are a key, not real colours (the chip says so).
export const ONION = [["hydrogen", "#7FA6FF"], ["helium", "#FFD27F"], ["carbon", "#C9C2B8"], ["neon", "#FF8FB8"], ["oxygen", "#7FE0C8"], ["silicon", "#B79BFF"], ["iron", "#E07A4F"]];
export function buildOnion(seed = 41) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const radii = [1.0, 0.72, 0.52, 0.38, 0.28, 0.19, 0.11];
  for (let L = 0; L < radii.length; L++) {
    const r1 = radii[L], r0 = L + 1 < radii.length ? radii[L + 1] : 0; const n = Math.round(60 + 220 * (r1 * r1 - r0 * r0));
    for (let i = 0; i < n; i++) {
      const r = lerp(r0 + 0.01, r1 - 0.01, Math.sqrt(R())); const ph = R() * TAU, dph = (0.25 + R() * 0.5) / Math.max(r, 0.1) * 0.25;
      const pts = []; for (let k = 0; k <= 6; k++) { const a = ph + dph * k / 6; pts.push([r * Math.cos(a), r * Math.sin(a), 0.001 * L]); }
      b.add(pts, { width: (r1 - r0) * (0.35 + R() * 0.4), rgb: jitter(hex2rgb(ONION[L][1]), R, 0.01, 0.05, 0.05), alpha: 0.65 + R() * 0.3, bristles: 5, boil: 0.006, layer: L + 1, seed: S() });
    }
  }
  return { b, radii };
}

// planetary nebula: inner [O III] teal shell, outer H-alpha red lobes (emission-line colours, LOOK-SPEC 2). Units: 0.01 light-year.
export function buildNebula(seed = 51) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const teal = hex2rgb("#4FD8C0"), red = hex2rgb("#FF5A6A"), red2 = hex2rgb("#FF7A8E");
  for (let i = 0; i < 1500; i++) {
    const d = randDir(R); const lobe = 1 + 0.55 * Math.pow(Math.abs(d[1]), 2); const outer = R() < 0.55;
    const r = (outer ? 1.0 + R() * 0.35 : 0.55 + R() * 0.3) * lobe; const e1 = norm(cross(d, [0, 1, 0.001])); const L = 0.08 + R() * 0.18;
    const c = d.map((v) => v * r); const pts = [0, 0.5, 1].map((f) => c.map((v, k) => v + e1[k] * (f - 0.5) * L + d[k] * Math.sin(f * Math.PI) * 0.02));
    b.add(pts, { width: 0.03 + R() * 0.06, rgb: jitter(outer ? mix(red, red2, R()) : teal, R, 0.015, 0.06, 0.05), alpha: (outer ? 0.16 : 0.12) + R() * 0.16, bristles: 4, boil: 0.006, seed: S() });
  }
  return b;
}

// supernova debris shell (unit radius; the caller scales it to v x t)
export function buildDebris(seed = 61, n = 1700) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const cols = [hex2rgb("#FFF4E8"), hex2rgb("#FF7A8E"), hex2rgb("#4FD8C0"), hex2rgb("#8FA8FF"), hex2rgb("#FFC483")];
  for (let i = 0; i < n; i++) {
    const d = randDir(R); const r0 = 0.55 + Math.pow(R(), 0.5) * 0.45; const L = 0.06 + R() * 0.2;
    const pts = [0, 0.5, 1].map((f) => d.map((v, k) => v * (r0 + L * f) + (k === 1 ? 0.01 * Math.sin(f * 3 + i) : 0)));
    b.add(pts, { width: 0.012 + R() * 0.03, rgb: jitter(cols[Math.floor(R() * cols.length)], R, 0.01, 0.05, 0.05), alpha: 0.18 + R() * 0.3, bristles: 3, boil: 0.004, seed: S() });
  }
  return b;
}

// Earth beside the white dwarf at the same scale (unit sphere, painted, lit from the viewer's left)
export function buildEarth(seed = 71) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const ocean = hex2rgb("#2B5FAE"), land = hex2rgb("#5E8A4E"), cloud = hex2rgb("#F2F4F8");
  for (let i = 0; i < 260; i++) {
    const d = randDir(R); const isLand = Math.sin(d[0] * 3.1 + d[1] * 1.7) * Math.cos(d[2] * 2.3) > 0.25; const isCloud = R() < 0.22;
    const lit = clamp01(0.25 + 0.75 * Math.max(0, -d[0] * 0.7 + d[1] * 0.3 + d[2] * 0.6));
    const base = isCloud ? cloud : isLand ? land : ocean;
    b.add(spherePath(d, 1.0, 0.2 + R() * 0.3, () => 0.2 + R() * 0.4, 4), { width: 0.12 + R() * 0.12, rgb: mix([8, 10, 24], jitter(base, R, 0.01, 0.05, 0.05), lit), alpha: 0.85, bristles: 4, boil: 0.006, seed: S() });
  }
  return b;
}

// city skyline at the neutron star's scale (km). LOOK-SPEC 3.4: 20 km wide, buildings 0.05 to 0.16 km wide, heights to about 0.45 km.
export function buildCity(seed = 81, groundY = -15) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  let x = -10; const sil = hex2rgb("#060918");
  while (x < 10) {
    const w = 0.05 + R() * 0.11; const near = Math.exp(-((((x + 10) / 20 - 0.55) / 0.12) ** 2));
    const hgt = 0.02 + (-Math.log(1 - R() * 0.95)) * 0.03 * 1.6 + near * R() * 0.41;
    b.add([[x + w / 2, groundY, 0], [x + w / 2, groundY + hgt, 0]], { width: Math.max(w, 0.06), rgb: sil, alpha: 1, bristles: 1, boil: 0, seed: S() });
    x += w;
  }
  b.add([[-10.2, groundY, 0], [0, groundY, 0], [10.2, groundY, 0]], { width: 0.08, rgb: hex2rgb("#3A4B8C"), alpha: 0.9, bristles: 1, boil: 0, seed: S() });
  return b;
}

// photon ring around a black hole (unit = horizon radius); bright thin ring of bent light, additive
export function buildPhotonRing(seed = 91) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  for (let i = 0; i < 520; i++) {
    const r = 1.5 * 1.732 * (1 + (R() - 0.5) * 0.06 + (R() < 0.3 ? R() * 0.25 : 0)); const ph = R() * TAU, dph = 0.15 + R() * 0.35;
    const pts = []; for (let k = 0; k <= 6; k++) { const a = ph + dph * k / 6; pts.push([r * Math.cos(a), r * Math.sin(a), 0]); }
    const warm = 0.5 + 0.5 * Math.sin(ph);
    b.add(pts, { width: 0.04 + R() * 0.1, rgb: jitter(mix(hex2rgb("#C8D8FF"), hex2rgb("#FFE6C8"), warm), R, 0.01, 0.05, 0.04), alpha: 0.18 + R() * 0.35, bristles: 3, boil: 0.006, seed: S() });
  }
  return b;
}

export function spriteGeometry(THREE, sprites) {
  const n = sprites.length, pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), col = new Float32Array(n * 16), sz = new Float32Array(n * 8), idx = new Uint16Array(n * 6);
  sprites.forEach((s, i) => {
    for (let c = 0; c < 4; c++) { const o = i * 4 + c; pos.set(s.p, o * 3); corner.set([c & 1 ? 1 : -1, c & 2 ? 1 : -1], o * 2); col.set([s.rgb[0] / 255, s.rgb[1] / 255, s.rgb[2] / 255, s.a], o * 4); sz.set([s.r, s.breath], o * 2); }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aCorner", new THREE.BufferAttribute(corner, 2)); g.setAttribute("aColor", new THREE.BufferAttribute(col, 4)); g.setAttribute("aSz", new THREE.BufferAttribute(sz, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); return g;
}

// lookup table for the shaders: temperatureToSRGB at 512 log-spaced temperatures, 1,000 K to 1,000,000 K (sRGB encoded bytes)
export function lutData() {
  const N = 512, data = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) { const T = Math.pow(10, 3 + 3 * i / (N - 1)); const c = temperatureToSRGB(T); data.set([Math.round(clamp01(c[0]) * 255), Math.round(clamp01(c[1]) * 255), Math.round(clamp01(c[2]) * 255), 255], i * 4); }
  return { data, N };
}
