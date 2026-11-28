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
export const KIND = { PLAIN: 0, DISK: 1, LANE: 2, STREAK: 3, WIND: 4, PULL: 5, FLAT: 6 };   // FLAT: a disk stroke lying in the disk plane

export class Builder {
  constructor(seg = SEG) { this.seg = seg; this.pos = []; this.tan = []; this.uvk = []; this.a = []; this.col = []; this.par = []; this.starts = []; this.cent = []; this.omega = []; this.kinds = []; this.nv = 0; this.n = 0; }
  add(pts, { width, rgb, alpha, kind = 0, bristles = 5, boil = 0, omega = 0, layer = 0, seed, dab = false, raw = null }) {
    const P = []; const SG = this.seg; for (let i = 0; i <= SG; i++) { const f = i / SG * (pts.length - 1), j = Math.min(pts.length - 2, Math.floor(f)), t = f - j; P.push([0, 1, 2].map((k) => pts[j][k] + (pts[j + 1][k] - pts[j][k]) * t)); }
    let cx = 0, cy = 0, cz = 0; for (const p of P) { cx += p[0]; cy += p[1]; cz += p[2]; }
    this.cent.push(cx / P.length, cy / P.length, cz / P.length); this.omega.push(omega); this.kinds.push(kind);
    this.starts.push(this.nv);
    const c4 = raw || [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
    for (let i = 0; i <= SG; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(SG, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const L = Math.hypot(tx, ty, tz) || 1; tx /= L; ty /= L; tz /= L;
      const t = i / SG; const w = dab ? width * (0.55 + 0.45 * Math.sin(Math.PI * t)) : width * tap(t);
      for (let s = 0; s < 2; s++) {
        this.pos.push(P[i][0], P[i][1], P[i][2]); this.tan.push(tx, ty, tz);
        this.uvk.push(s, t, kind); this.a.push(s ? 1 : -1, w, width, seed);
        this.col.push(c4[0], c4[1], c4[2], alpha); this.par.push(omega, boil, bristles, layer);
      }
    }
    this.nv += 2 * (SG + 1); this.n++;
  }
  geometry(THREE) {
    const g = new THREE.BufferGeometry(); const F = (arr, n, name) => g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(arr), n));
    F(this.pos, 3, "position"); F(this.tan, 3, "aTan"); F(this.uvk, 3, "aUvK"); F(this.a, 4, "aA"); F(this.col, 4, "aColor"); F(this.par, 4, "aParam");
    const SG = this.seg, per = 6 * SG, idx = new Uint32Array(this.n * per);
    for (let s = 0; s < this.n; s++) { const v0 = this.starts[s]; let o = s * per; for (let i = 0; i < SG; i++) { const a = v0 + 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.set([a, b, c, b, d, c], o); o += 6; } }
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

// ---------- F3 to F5: protostar disk, jets and young planets (world units: AU) ----------
// Layout matched to Angelo's hand-placed GP disk v4.1 (approved by Leo; strokes_v4_1.json, not shipped): the same stroke
// count per radial band, arc span, width, height above the plane, opacity and colour (tools/stellar-life/disk-v4-stats.py
// prints this table from his file). The strokes here are generated, not copied. Washes and marks lie flat in the disk
// plane (his ribbons face the disk normal), the jets and the soft nested knots blend with alpha.
// band: [r0, r1, count, arc span (rad), width (AU), opacity, |height| (AU), colour]
// COVER: our ribbons taper at both ends and feather their edges, so a stroke painted at v4 width covers less
// area than a Grease Pencil stroke of the same width. 1.5 brings painted coverage back to the v4.1 still.
const COVER = 1.5;
const V4_WASH = [[1, 2, 17, 2.83, 1.08, 0.46, 0.02, "#F59B3B"], [2, 3, 10, 2.68, 1.19, 0.49, 0.03, "#C9671C"], [3, 4, 5, 3.25, 1.45, 0.45, 0.05, "#C48448"], [4, 6, 12, 2.76, 1.37, 0.47, 0.07, "#97693A"],
  [6, 8, 4, 1.55, 1.43, 0.52, 0.09, "#986432"], [8, 10, 6, 0.94, 0.59, 0.47, 0.17, "#634021"], [10, 12, 6, 1.11, 1.01, 0.46, 0.21, "#674226"], [12, 14, 1, 1.23, 1.16, 0.41, 0.35, "#543722"]];
const V4_MARK = [[0.3, 1, 4, 1.52, 0.30, 0.89, 0.01, "#F7D27B"], [1, 2, 19, 1.33, 0.41, 0.89, 0.03, "#E09340"], [2, 3, 22, 1.34, 0.47, 0.88, 0.04, "#D27E34"], [3, 4, 12, 1.23, 0.60, 0.88, 0.06, "#BD7B40"],
  [4, 6, 14, 1.30, 0.54, 0.88, 0.07, "#B67D46"], [6, 8, 11, 1.27, 0.77, 0.88, 0.12, "#97693C"], [8, 10, 21, 0.44, 0.30, 0.89, 0.19, "#7B5331"], [10, 12, 17, 0.35, 0.41, 0.86, 0.22, "#6B492E"],
  [12, 14, 17, 0.52, 0.48, 0.88, 0.21, "#5F3F27"], [14, 17.5, 8, 0.40, 0.52, 0.88, 0.25, "#543521"]];
export function buildDisk(opts = {}) {
  const T = opts.teff || 4410, seed = opts.seed || 7, ROUT = 17.5, EDGE = 17.5;
  const R = rng(seed); const disk = new Builder(16), add = new Builder(12), wrap = new Builder(); const sprites = [];
  const starRGB = tRGB255(T); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const A_DISK = 0.06, A_JET = 0.09, A_OTHER = 0.03;
  const jit = (v, f) => v * (1 + (R() * 2 - 1) * f);
  const arc = (r0, r1, ph, dph, y, n = 12) => { const pts = []; for (let k = 0; k <= n; k++) { const u = k / n, pp = ph + dph * (u - 0.5), rr = r0 + (r1 - r0) * u; pts.push([rr * Math.cos(pp), y, -rr * Math.sin(pp)]); } return pts; };
  const band = (B, kindName) => { for (const [r0, r1, n, span, w, op, yh, col] of B) for (let i = 0; i < n; i++) {
    const r = r0 + (r1 - r0) * R(), ph = R() * TAU, dph = Math.min(TAU * 0.6, jit(span, 0.35)), dr = (R() - 0.5) * 0.06 * r;
    const y = (R() < 0.5 ? 1 : -1) * yh * (0.5 + R());
    disk.add(arc(r - dr, r + dr, ph, dph, y), { width: jit(w * COVER, 0.3), rgb: jitter(hex2rgb(col), R, 0.015, 0.05, 0.05), alpha: jit(op, 0.06), kind: KIND.FLAT, bristles: kindName === "wash" ? 1 : 2, boil: A_DISK, seed: S() });
  } };
  band(V4_WASH, "wash"); band(V4_MARK, "mark");
  // inner rim (14 bright cream arcs at 0.64 to 0.81 AU, opacity 1) and the frost line (7 arcs near 3.1 AU, opacity 0.9)
  for (let i = 0; i < 14; i++) { const r = 0.64 + R() * 0.17; disk.add(arc(r, r, R() * TAU, jit(2.3, 0.25), (R() - 0.5) * 0.14), { width: jit(0.19, 0.25), rgb: jitter(hex2rgb("#F5C896"), R, 0.01, 0.04, 0.04), alpha: 1, kind: KIND.FLAT, bristles: 3, boil: A_OTHER, seed: S() }); }
  const frost = opts.planets === "solar";
  if (frost) for (let i = 0; i < 7; i++) { const r = 3.02 + R() * 0.18; disk.add(arc(r - 0.1, r + 0.1, (i / 7) * TAU + R() * 0.5, jit(1.45, 0.3), (R() - 0.5) * 0.06), { width: jit(0.2, 0.15), rgb: jitter(hex2rgb("#EBBE84"), R, 0.01, 0.04, 0.04), alpha: 0.9, kind: KIND.FLAT, bristles: 2, boil: A_OTHER, seed: S() }); }
  // ---- young planets (Leo build note 3): v4 places 3 giant-planet cores (5.2, 9.5 and 13.4 AU, four dabs each) and
  // 5 rocky pairs (0.9 to 2.4 AU). Drawn far larger than real; a chip says so.
  const bodies = [];
  if (opts.planets === "solar") {
    for (const r of [5.2, 9.5, 13.4]) bodies.push({ r, rad: 0.42, kind: "giant", cols: ["#EAA461", "#D48E4E", "#B35F2E", "#F5BA79"] });
    for (const r of [0.9, 1.3, 1.75, 2.1, 2.4]) bodies.push({ r, rad: 0.11, kind: "rocky", cols: ["#C67A42", "#A2532D"] });
  } else if (opts.planets === "reddwarf") {
    for (const r of [0.6, 1.1, 1.8]) bodies.push({ r, rad: 0.11, kind: "rocky", cols: ["#C67A42", "#A2532D"] });
  }
  for (const b of bodies) {
    const ph = R() * TAU, cx = b.r * Math.cos(ph), cz = -b.r * Math.sin(ph);
    b.cols.forEach((c, k) => { const L = b.kind === "giant" ? jit(0.85, 0.4) : 0.23; const a = R() * TAU, off = b.rad * 0.25 * k / b.cols.length;
      const p0 = [cx + Math.cos(a) * (off - L / 2), 0, cz + Math.sin(a) * (off - L / 2)], p1 = [cx + Math.cos(a) * (off + L / 2), 0, cz + Math.sin(a) * (off + L / 2)];
      disk.add([p0, [(p0[0] + p1[0]) / 2, 0, (p0[2] + p1[2]) / 2], p1], { width: b.rad * (b.kind === "giant" ? jit(1.0, 0.2) : 1), rgb: hex2rgb(c), alpha: 1, bristles: 2, boil: A_OTHER, seed: S(), dab: true }); });
    sprites.push({ p: [cx, 0, cz], r: b.rad * (b.kind === "giant" ? 2.6 : 2.2), rgb: [255, 196, 130], a: b.kind === "giant" ? 0.22 : 0.14, breath: 0 });
  }
  // ---- jets: 4 up and 4 down, about 8 AU long from about 1 AU out, opacity 0.26 to 0.35 (v4), H-alpha pink
  const jetCols = ["#D86570", "#DE7C89", "#E08391", "#DB707C"];
  for (const up of [true, false]) {
    const dir = up ? 1 : -1;
    for (let k = 0; k < 4; k++) {
      const a = R() * TAU, rr = 0.08 + R() * 0.3, y0 = dir * (1.0 + R() * 0.4), L = jit(8.2, 0.12); const x = Math.cos(a) * rr, z = Math.sin(a) * rr, sw = (R() - 0.5) * 0.5;
      const pts = []; for (let q = 0; q <= 6; q++) { const u = q / 6; pts.push([x * (1 + u) + sw * Math.sin(u * 3) * 0.3, y0 + dir * L * u, z * (1 + u) + sw * Math.cos(u * 3) * 0.3]); }
      add.add(pts, { width: jit(0.5, 0.15), rgb: hex2rgb(jetCols[k]), alpha: lerp(0.26, 0.35, R()), bristles: 3, boil: A_JET, seed: S() });
    }
    // knots: soft stretched blobs at 37, 67 and 90 percent of the jet, 16 nested layers each (length 1.0 to 0.1), opacity 0.034 each
    for (const f of [0.37, 0.67, 0.9]) { const yc = dir * (1.2 + 8.2 * f); const knot = hex2rgb("#E08391");
      for (let l = 0; l < 16; l++) { const k = 1 - l * 0.06, L = 1.44 * k; add.add([[0, yc - L / 2, 0], [0, yc, 0], [0, yc + L / 2, 0]], { width: 0.55 * k, rgb: knot, alpha: 0.034, bristles: 1, boil: A_JET * 0.5, seed: S() + l * 0.01, dab: true }); } }
  }
  // ---- massive stars: still wrapped in their cloud (F4), blown clear at F5
  if (opts.wrap) for (let i = 0; i < 420; i++) {
    const d = randDir(R); const r0 = 6 + R() * 16; const p = d.map((v) => v * r0); const e1 = norm(cross(d, [0.3, 1, 0.2]));
    const L = 3 + R() * 6; const pts = [0, 0.5, 1].map((f) => p.map((v, k) => v + e1[k] * (f - 0.5) * L + d[k] * Math.sin(f * 3) * 0.4));
    wrap.add(pts, { width: 1.5 + R() * 3.5, rgb: jitter(mix(hex2rgb("#120E22"), hex2rgb("#5A3046"), R() * 0.5), R, 0.02, 0.03, 0.04), alpha: 0.35 + R() * 0.35, bristles: 6, boil: A_DISK * 2, seed: S() });
  }
  // Leo build note 2: halo pulled in to 0.8x; the brightest part kept near the core. Every layer is the star's own temperatureToSRGB colour.
  const HALO = 0.8, PX = 1 / 32;
  const core = [[420 * PX * HALO, 0.12], [220 * PX * HALO, 0.26], [88 * PX * HALO, 0.62], [36 * PX * HALO, 0.88], [16 * PX * HALO, 1.05]];
  return { disk, add, wrap, sprites, core, starRGB, bodies, frost: frost ? 3.1 : null, ROUT, OUT0: EDGE * 2 / 3 };
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
export function buildPhotonRing(seed = 91) {   // unit = shadow radius (2.6 horizon radii); thin warm arcs on the ring, brighter on one side
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  for (let i = 0; i < 90; i++) {
    const a0 = R() * TAU, sw = (30 + R() * 110) / 230, rr = 1 + (2 + (R() - 0.5) * 12) / 230; const pts = []; for (let k = 0; k <= 8; k++) { const a = a0 + sw * k / 8; pts.push([rr * Math.cos(a), rr * Math.sin(a), 0]); }
    const asym = 0.55 + 0.45 * Math.cos(a0 - 2.4);
    b.add(pts, { width: (2.5 + R() * 4) / 230, rgb: mix(tRGB255(4200 + R() * 1800), [255, 255, 255], 0.3), alpha: (0.08 + 0.1 * R()) * asym, bristles: 2, boil: 0.004, seed: S() });
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

// ================= round 4: style B v2.3/v2.4 remnants, Earth, outflow shells, lensed stars, Sun activity =================
// Earth land mask, 96 x 96 bits, orthographic view centred on 20 E, 15 N, from the Natural Earth 110m land polygons
// (public domain), downsampled from Leo's style-B mask. Row-major from the top; bit i = row * 96 + column.
const EARTH_N = 96; const EARTH_B64 = "AAAAAAAAAAAAAAAAAAAAAIADAAAAAAAAAAAAAOADAGAAAAAAAAAAwPEPAPgDAAAAAAAAwPyDAPAfAAAAAAAAOP6AgPA/AAAAAAAAwD8AAPj/AAAAAACA4A8AAPD/AwAAAADgeAAABvj/BwAAAAB4CAyAv///HwAAAAA8AAzgn///PwAAAAAeAADg/v//fwAAAAAPAAB8/////wAAAIAFAAB8/v///wEAAMACAAB8/P///wMAAGADADAw/P///wcAABAAACgU/////w8AAAAAADTE/////x8AAAAAAHD//////z8AAAAAAMD//////38AAAAAAPD//////38AAAAAAPj////9//8AAAAAAPD///38//8BAAAAAPD/P/38//8BAAAAgP/tH/D4//8DAAAAgD/MH+Dz//8DAAAAwA8Yn/fz//8HAAAAwAci8//j//8HAAAAwAcA8//n//8PAAAAgAEY4v////8PAAAAwP8DAPj///8fAAAA4P8DAPj///8fAAAA8P8DAPz///8fAAAA+P8PA/z///8fAAAA+P8fv//v//8/AAAA/P/////P//85AAAA//////8fHP8xAACA//////N/AvxxAADA//////d/B/xhAADA/////+f/D/BBAADg/////8//D/AAAQDg/////5//D+AAAQDg/////5//B+AAAQDg/////x//B8BBAQDg/////z/+A8ABAQDw/////3/8AIABAwDw/////398AIAAAwDw//////88AABCBwDw//////8PAACCBwDg///////DAACABwDA///////3AAAABwDA////////AAAABwDA////////AAAADwCA//////9/AAAADwAA//////9/AAAAHgAAAPD///8/AAAAPgAAAPD///8/AAAAfgAAAID///8fAAAA/gAAAID///8HAAAA/gEAAID///8HAAAA/AEAAID///8DAAAA/AEAAID///8BAAAA/AEAAAD///8AAAAA+AEAAAD+//8AAAAA+AAAAAD+/38AAAAA+AAAAAD8//8AAAAA8AAAAAD8//8AAAAA8AEAAAD8//8AAAAA8AEAAAD4//8AAAAA4AEAAAD4//9AAAAAwAEAAAD8//9gAAAAwAAAAAD8//9wAAAAgAAAAAD+/384AAAAgAAAAAD+/x84AAAAAAEAAAD8/w8YAAAAAAAAAAD8/w8cAAAAAAAAAAD4/w8MAAAAAAAAAADw/w8MAAAAAAAAAADw/wMAAAAAAAAAAADw/wEAAAAAAAAAAADg/wEAAAAAAAAAAADA/wAAAAAAAAAAAADAfwAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
let earthBits = null;
function earthLand(X, Y) {
  if (!earthBits) { const s = typeof atob === "function" ? atob(EARTH_B64) : Buffer.from(EARTH_B64, "base64").toString("binary"); earthBits = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) earthBits[i] = s.charCodeAt(i); }
  const px = Math.floor((X + 1) / 2 * EARTH_N), py = Math.floor((1 - Y) / 2 * EARTH_N); if (px < 0 || py < 0 || px >= EARTH_N || py >= EARTH_N) return false;
  const i = py * EARTH_N + px; return ((earthBits[i >> 3] >> (i & 7)) & 1) === 1;
}
/** Earth, unit sphere, local +z toward the viewer (the mask's view centre). Ocean blue, land by region, swirling white clouds.
 * Lit from the -x side (the white dwarf sits to its left). Strokes stay inside the limb (CRISP in the shader). */
export function buildEarth2(seed = 71, light = [-0.52, 0.10, 0.85]) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const lat0 = 15 * Math.PI / 180, lon0 = 20;
  const geo = (X, Y, z) => { const lat = Math.asin(clamp01((z * Math.sin(lat0) + Y * Math.cos(lat0) + 1) / 2) * 2 - 1); const lon = lon0 + Math.atan2(X, z * Math.cos(lat0) - Y * Math.sin(lat0)) * 180 / Math.PI; return { lat: lat * 180 / Math.PI, lon }; };
  const Ln = norm(light);
  const shade = (rgb, d) => { const lam = Math.max(0, d[0] * Ln[0] + d[1] * Ln[1] + d[2] * Ln[2]); const f = 0.16 + 0.84 * Math.pow(lam, 0.6); return rgb.map((v, i) => Math.round(Math.min(255, v * f + [3, 7, 20][i] * (1 - lam)))); };
  const landCol = (g, r) => { const la = g.lat, lo = g.lon;
    if (la > 60 && lo < -15) return mix(hex2rgb("#E9EFF8"), hex2rgb("#FFFFFF"), r);
    if ((la > 15 && la < 32 && lo > -17 && lo < 36) || (la > 12 && la < 33 && lo >= 36 && lo < 60)) return mix(hex2rgb("#D2B574"), hex2rgb("#B98F55"), r);
    if (la > 8 && la <= 15 && lo > -17 && lo < 42) return mix(hex2rgb("#B8AA62"), hex2rgb("#8C9A52"), r);
    if (la > -6 && la <= 8 && lo > -17 && lo < 32) return mix(hex2rgb("#2D6E3E"), hex2rgb("#3F8A4A"), r);
    if (la <= -6 && la > -36 && lo > 8 && lo < 40) return mix(hex2rgb("#8E9E52"), hex2rgb("#B7A55E"), r);
    return mix(hex2rgb("#4F8A48"), hex2rgb("#6E9A55"), r); };
  const front = () => { for (;;) { const d = randDir(R); if (d[2] > -0.05) return d; } };
  // ocean and land dabs, short strokes running east-west; land is sampled on the mask so the continents read as solid shapes
  for (let i = 0; i < 1000; i++) {
    const d = front(); const base = mix(hex2rgb("#164F8E"), hex2rgb("#2570BA"), R());
    const pts = spherePath(d, 1.0, 0.12 + R() * 0.12, () => (R() - 0.5) * 0.2, 4);
    b.add(pts, { width: 0.08 + R() * 0.06, rgb: jitter(shade(base, d), R, 0.01, 0.03, 0.04), alpha: 0.9, bristles: 4, boil: 0.004, seed: S() });
  }
  for (let i = 0, k = 0; i < 1500 && k < 40000; k++) {
    const d = front(); if (!(d[2] > 0 && earthLand(d[0], d[1]))) continue; i++; const g = geo(d[0], d[1], d[2]);
    const pts = spherePath(d, 1.001, 0.05 + R() * 0.08, () => (R() - 0.5) * 0.3, 4);
    b.add(pts, { width: 0.04 + R() * 0.04, rgb: jitter(shade(landCol(g, R()), d), R, 0.01, 0.03, 0.04), alpha: 0.95, bristles: 4, boil: 0.004, seed: S() });
  }
  // clouds: swirls (low-pressure spirals at mid latitudes) and a broken band near the equator
  const swirls = [[0.42, 0.66, 1], [-0.62, 0.42, -1], [0.66, -0.38, -1], [-0.5, -0.62, 1], [0.1, 0.9, 1]];
  for (const [sx, sy, sg] of swirls) { const sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy)); const c = norm([sx, sy, sz]);
    const head = (u, dd) => { const v = dd.map((x, j) => x - c[j]); const t = cross(dd, v).map((x, j) => x * sg - v[j] * 0.45); let e1 = cross([0, 1, 0], dd); e1 = norm(e1); const e2 = cross(dd, e1); return Math.atan2(t[0] * e2[0] + t[1] * e2[1] + t[2] * e2[2], t[0] * e1[0] + t[1] * e1[1] + t[2] * e1[2]); };
    for (let k = 0; k < 22; k++) { const a = R() * TAU, rr = 0.04 + R() * 0.2; const e1 = norm(cross([0, 1, 0], c)), e2 = cross(c, e1);
      const p0 = norm([0, 1, 2].map((j) => c[j] + (e1[j] * Math.cos(a) + e2[j] * Math.sin(a)) * rr));
      b.add(spherePath(p0, 1.006, 0.1 + R() * 0.16, head, 6), { width: 0.025 + R() * 0.035, rgb: shade(hex2rgb("#F2F4F8"), p0), alpha: 0.5 + R() * 0.35, bristles: 3, boil: 0.004, seed: S() }); } }
  for (let i = 0; i < 60; i++) { const lon = (R() - 0.5) * 2.6, lat = 0.04 + (R() - 0.5) * 0.12; const d = norm([Math.sin(lon), lat, Math.cos(lon)]);
    b.add(spherePath(d, 1.006, 0.08 + R() * 0.12, () => (R() - 0.5) * 0.3, 4), { width: 0.02 + R() * 0.03, rgb: shade(hex2rgb("#F2F4F8"), d), alpha: 0.45 + R() * 0.3, bristles: 3, boil: 0.004, seed: S() }); }
  return b;
}

/** AGB and strong-wind outflow: soft expanding shell fragments (tangential arcs on spheres just outside the star), never radial hairs. */
export function buildShells(seed = 31, n = 260) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  for (let i = 0; i < n; i++) { const d = randDir(R); const r0 = 1.06 + R() * 0.12; const e1 = norm(cross(d, [0.3, 1, 0.2])); const e2 = cross(d, e1); const sw = 0.25 + R() * 0.5, ph = R() * TAU;
    const pts = []; for (let k = 0; k <= 6; k++) { const a = ph + sw * (k / 6 - 0.5); const v = norm([0, 1, 2].map((j) => d[j] + (e1[j] * Math.cos(a) + e2[j] * Math.sin(a)) * 0.35)); pts.push(v.map((x) => x * r0)); }
    b.add(pts, { width: 0.07 + R() * 0.12, raw: [0.5 + R() * 0.25, 0.5, 0.55 + R() * 0.25], alpha: 0.10 + R() * 0.14, kind: KIND.WIND, bristles: 5, boil: 0.006, omega: R(), seed: S() }); }
  return b;
}

/** Starlight bent around a black hole (point-lens mapping, Leo's bh params: theta_E = 0.92 of the shadow radius).
 * Stars behind are pushed outward and stretched along the ring; anything mapped inside the shadow is hidden. Unit = shadow radius, z = 0 plane. */
export function buildLensedStars(seed = 41, n = 520, thetaE = 0.92) {
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  for (let i = 0; i < n; i++) { const a = R() * TAU; const bb = i < 160 ? thetaE * (0.35 + 2.6 * R()) : 0.2 + R() * 6.5;
    const th = 0.5 * (bb + Math.sqrt(bb * bb + 4 * thetaE * thetaE)); if (th < 1.02) continue;
    const st = Math.min(2.6, 1 + Math.max(0, th / bb - 1) * 1.6); const Tk = Math.pow(10, 3.6 + R() * 0.6); const col = mix(tRGB255(Tk), [255, 255, 255], 0.4);
    const s = (R() < 0.03 ? 0.014 : 0.005 + R() * 0.005); const L = s * (0.35 + 0.9 * (st - 1)) / th; const pts = [-1, 0, 1].map((k) => [Math.cos(a + k * L) * th, Math.sin(a + k * L) * th, 0]);
    b.add(pts, { width: s, rgb: col, alpha: 0.35 + R() * 0.5, bristles: 1, seed: S(), dab: true }); }
  return b;
}

/** A supernova remnant shell: torn and lopsided, uneven brightness, one blown-out sector, knots, and jets on one side only (LOOK-SPEC v2.3).
 * Unit sphere (R0). Emission-line colours (labelled as such): H-alpha pinks, [O III] teal, white-hot knots, synchrotron violet-blue. */
export function buildRemnant(seed = 63, n = 1500) {   // drawn facing the viewer (+z): limb-brightened, lopsided, torn, with a blown-out sector
  const R = rng(seed); const b = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const pink = hex2rgb("#FF7A8E"), rose = hex2rgb("#FF5A6A"), white = hex2rgb("#FFF4F6"), teal = hex2rgb("#4FD8C0"), syn = hex2rgb("#8FA8FF"), mag = hex2rgb("#D27AE0");
  const blow = norm([0.62, -0.72, 0.15]), jet = norm([-0.72, 0.62, 0.1]);
  const lumps = Array.from({ length: 7 }, () => ({ d: randDir(R), k: (R() - 0.4) * 0.22 }));
  const shape = (d) => { let r = 1 + 0.1 * d[0] - 0.05 * d[1]; for (const l of lumps) r += l.k * Math.exp(-3 * (1 - (l.d[0] * d[0] + l.d[1] * d[1] + l.d[2] * d[2]))); const bo = blow[0] * d[0] + blow[1] * d[1] + blow[2] * d[2]; return r + 0.22 * Math.max(0, bo - 0.55) / 0.45; };
  const bright = (d) => 0.45 + 0.55 * clamp01(0.5 + 0.5 * (0.8 * d[0] + 0.4 * d[1]) + 0.25 * Math.sin(d[0] * 5 + d[2] * 3));
  const rim = (d) => Math.pow(1 - Math.abs(d[2]), 2.2);   // seen face on, the shell is brightest where we look along it
  for (let i = 0; i < n; i++) {
    const d = randDir(R); const bo = blow[0] * d[0] + blow[1] * d[1] + blow[2] * d[2]; if (bo > 0.7 && R() < 0.85) continue;
    const rm = rim(d); if (R() > 0.25 + 0.75 * rm) continue;
    const r = shape(d) * (0.9 + R() * 0.12); const tg = norm(cross(d, [0, 0, 1])); const rn = norm(cross(d, [R() - 0.5, 1, R() - 0.5])); const e1 = norm(tg.map((v, k) => v * rm + rn[k] * (1 - rm) * 0.8 + (R() - 0.5) * 0.5));
    const L = 0.08 + R() * 0.3; const c = d.map((v) => v * r);
    const curl = (R() - 0.5) * 0.12; const pts = [0, 0.25, 0.5, 0.75, 1].map((f) => c.map((v, k) => v + e1[k] * (f - 0.5) * L + d[k] * Math.sin(f * Math.PI) * curl));
    const pick = R(); const col = pick < 0.4 ? mix(pink, rose, R()) : pick < 0.66 ? mix(pink, white, 0.6 + 0.4 * R()) : pick < 0.82 ? mag : pick < 0.93 ? syn : teal;
    b.add(pts, { width: 0.014 + R() * 0.036, rgb: jitter(col, R, 0.01, 0.05, 0.05), alpha: Math.min(0.85, (0.2 + R() * 0.45) * bright(d) * (0.3 + 1.1 * rm)), bristles: 3, boil: 0.004, seed: S() });
  }
  for (let i = 0; i < 28; i++) { const d = randDir(R); if (Math.abs(d[2]) > 0.5) d[2] *= 0.4; const dn = norm(d); const r = shape(dn) * (0.97 + R() * 0.06); const c = dn.map((v) => v * r); const e1 = norm(cross(dn, [0, 0, 1])); b.add([-1, 0, 1].map((f) => c.map((v, k) => v + e1[k] * f * 0.018)), { width: 0.04 + R() * 0.05, rgb: mix(white, pink, R() * 0.5), alpha: 0.18 + R() * 0.25, bristles: 3, seed: S(), dab: true }); }   // bright knots
  for (let i = 0; i < 160; i++) { const toJet = i < 50; const base = toJet ? jet : norm([R() - 0.5, R() - 0.5, (R() - 0.5) * 0.3]); const sp = norm(base.map((v) => v + (R() - 0.5) * (toJet ? 0.35 : 0.1)));
    const r0 = shape(sp) * (0.95 + R() * 0.1), r1 = r0 + (toJet ? 0.25 + R() * 0.4 : 0.08 + R() * 0.25); const bend = norm(cross(sp, [0, 0, 1])).map((v) => v * (R() - 0.5) * 0.12);
    b.add([0, 0.5, 1].map((f) => sp.map((v, k) => v * (r0 + (r1 - r0) * f) + bend[k] * Math.sin(f * Math.PI))), { width: 0.006 + R() * 0.012, rgb: jitter(mix(pink, white, R() * 0.7), R, 0.01, 0.05, 0.05), alpha: 0.08 + R() * 0.14, bristles: 2, seed: S() }); }   // outward wisps, more on one side
  for (let i = 0; i < 220; i++) { const d = randDir(R); const r = 0.3 + R() * 0.6; const c = d.map((v) => v * r); const e1 = norm(cross(d, [0, 1, 0.01])); const L = 0.1 + R() * 0.2; b.add([0, 0.5, 1].map((f) => c.map((v, k) => v + e1[k] * (f - 0.5) * L)), { width: 0.02 + R() * 0.04, rgb: jitter(mix(syn, mag, R()), R, 0.01, 0.05, 0.05), alpha: 0.025 + R() * 0.04, bristles: 3, seed: S() }); }   // faint inner haze
  return b;
}

/** Sun surface activity, placed in code to match Angelo's Leo-approved v5 layouts (reference only; his files are not used).
 * Local frame: unit = 1 solar radius, origin at the footpoint centre on the photosphere, +y radially out.
 * Prominence: 3 braided arches, apex heights 0.200, 0.105 and 0.062 R (the tall one is 139,000 km), feet as in v5, glow nested and faint.
 * Flare arcade: 8 ribs along 0.13 R; rib with birth b has half-span 0.020 + 0.012 b R and apex 0.029 to 0.033 R; newer ribs are higher and wider. */
export const PROM_ARCHES = [
  { a: [-0.134, -0.009, 0.0], b: [0.135, -0.009, 0.0], h: 0.200, strands: 8, w: 0.012, thick: 0.30, kink: 0.62 },
  { a: [0.222, -0.025, -0.012], b: [0.376, -0.078, -0.087], h: 0.105, strands: 6, w: 0.009, thick: -0.22, kink: 0.35 },
  { a: [-0.316, -0.052, 0.029], b: [-0.204, -0.024, 0.07], h: 0.062, strands: 5, w: 0.0075, thick: 0.15, kink: 0.70 },
];
export const FLARE_RIBS = [[-0.065, 0.06], [-0.005, 0.19], [-0.030, 0.31], [0.009, 0.44], [0.042, 0.56], [-0.048, 0.69], [0.028, 0.81], [0.065, 0.94]];   // [x along the polarity line (R), birth]
export function buildProminence(seed = 101, wk = 1) {   // wk widens the strands (style B frames draw them bolder than Angelo's true widths)
  const R = rng(seed); const core = new Builder(); const glow = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const pink = hex2rgb("#FF7A8E"), rose = hex2rgb("#FF5A6A"), pale = mix(pink, hex2rgb("#FFF4F6"), 0.15);
  for (const A of PROM_ARCHES) {
    const arch = (u, ph, amp) => { const p = [0, 1, 2].map((k) => A.a[k] + (A.b[k] - A.a[k]) * u); const hgt = A.h * Math.sin(Math.PI * u) * (1 + 0.06 * Math.exp(-(((u - A.kink) / 0.06) ** 2))); p[1] += hgt; p[2] += amp * Math.sin(2 * Math.PI * 2.4 * u + ph); p[0] += amp * 0.5 * Math.cos(2 * Math.PI * 2.4 * u + ph); return p; };
    for (let s = 0; s < A.strands; s++) { const ph = s / A.strands * TAU; const pts = []; for (let k = 0; k <= 24; k++) pts.push(arch(k / 24, ph, A.w * 0.9));
      const heavy = s === 2 ? 1.6 : 1; core.add(pts, { width: A.w * wk * heavy * (1 + A.thick * 0.5), rgb: jitter(mix(rose, pink, R()), R, 0.01, 0.04, 0.04), alpha: 0.6 + R() * 0.25, bristles: 3, boil: 0.004, seed: S() }); }
    for (let L = 0; L < 14; L++) { const pts = []; for (let k = 0; k <= 24; k++) pts.push(arch(k / 24, 0, 0)); glow.add(pts, { width: A.w * wk * (3 + L * 1.6), rgb: pale, alpha: 0.004 + 0.016 * (1 - L / 14), bristles: 1, seed: S() }); }
  }
  return { core, glow };
}
export function buildFlare(seed = 111) {
  const R = rng(seed); const core = new Builder(); const glow = new Builder(); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;
  const pink = hex2rgb("#FF7A8E"), white = hex2rgb("#FFF4F6");
  const ribs = FLARE_RIBS.map(([x, birth], rank) => ({ x, birth, rank, half: 0.020 + 0.012 * birth, h: 0.029 + 0.004 * birth + (R() - 0.5) * 0.001, tilt: (R() < 0.5 ? -1 : 1) * (0.03 + R() * 0.06) }));
  for (const r of ribs) {
    for (const nest of [1, 0.86]) { const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; const z = -r.half * nest + 2 * r.half * nest * u; pts.push([r.x + r.tilt * z, r.h * nest * Math.sin(Math.PI * u), z]); }
      // layer carries the rib's birth (0..1) so the shader can grow ribs in order
      core.add(pts, { width: 0.004 * nest, rgb: mix(pink, white, 0.5), alpha: nest === 1 ? 0.95 : 0.75, bristles: 2, boil: 0.003, seed: S(), layer: 0, omega: r.birth });
      for (let L = 0; L < 4; L++) glow.add(pts, { width: 0.008 + L * 0.006, rgb: pink, alpha: 0.03 - L * 0.005, bristles: 1, seed: S(), omega: r.birth }); }
    for (const side of [-1, 1]) for (let k = 0; k < 2; k++) { const z = side * r.half; const c = [r.x + r.tilt * z + (R() - 0.5) * 0.004, 0.001, z]; glow.add([[c[0] - 0.006, c[1], c[2]], c, [c[0] + 0.006, c[1], c[2]]], { width: 0.006, rgb: mix(pink, white, 0.4 + 0.4 * r.birth), alpha: 0.25 + 0.3 * r.birth, bristles: 1, seed: S(), dab: true, omega: r.birth }); }
  }
  return { core, glow, ribs };
}
