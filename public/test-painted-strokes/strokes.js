// THROWAWAY tech test. Procedural "style B" brush strokes (Leo's LOOK-SPEC section 5) as 3D ribbons.
// World units are AU. Disk lies in the x/z plane, spin axis is +y. Strokes are merged into a few BufferGeometries.
// Per vertex: position (stroke centre line), aTan (tangent), aUvK (u across width, v along length, kind),
// aA (side, width here, nominal width, seed), aColor (sRGB 0..1 + alpha), aParam (streak phase, boil amplitude in AU, bristles, nearMix).
// Motion follows LOOK-SPEC v2 5.1: boil = 8 steps/s over a 32-step (4 s) periodic loop, shear-wave flow, orbital streaks, glow breathing.
import { temperatureToSRGB } from "../night-sky/ns-astro.js";

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hex2rgb = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)); }
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function jitter(rgb, R, dh = 0.02, dl = 0.05, ds = 0.06) { const [h, s, l] = rgb2hsl(rgb); return hsl2rgb([(h + (R() * 2 - 1) * dh + 1) % 1, clamp01(s + (R() * 2 - 1) * ds), clamp01(l + (R() * 2 - 1) * dl)]); }
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const lerp = (a, b, t) => a + (b - a) * t;
const tRGB255 = (T) => temperatureToSRGB(T).map((v) => Math.round(clamp01(v) * 255));
const tap = (t) => Math.pow(Math.min(1, t / 0.25, (1 - t) / 0.45), 0.7);

export const SEG = 8;       // segments per ribbon (9 centre points)
export const KIND = { PLAIN: 0, DISK: 1, LANE: 2, STREAK: 3 };

class Builder {
  constructor() { this.pos = []; this.tan = []; this.uvk = []; this.a = []; this.col = []; this.par = []; this.starts = []; this.cent = []; this.omega = []; this.kinds = []; this.nv = 0; this.n = 0; }
  // pts: array of [x,y,z] with length >= 2 (resampled to SEG+1). widths: optional per point width array (after resample).
  add(pts, { width, rgb, alpha, kind = 0, bristles = 5, boil = 0, omega = 0, nearMix = 0, seed, dab = false }) {
    const P = []; for (let i = 0; i <= SEG; i++) { const f = i / SEG * (pts.length - 1), j = Math.min(pts.length - 2, Math.floor(f)), t = f - j; P.push([0, 1, 2].map((k) => pts[j][k] + (pts[j + 1][k] - pts[j][k]) * t)); }
    let cx = 0, cy = 0, cz = 0; for (const p of P) { cx += p[0]; cy += p[1]; cz += p[2]; }
    this.cent.push(cx / P.length, cy / P.length, cz / P.length); this.omega.push(omega); this.kinds.push(kind);
    this.starts.push(this.nv);
    for (let i = 0; i <= SEG; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(SEG, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const L = Math.hypot(tx, ty, tz) || 1; tx /= L; ty /= L; tz /= L;
      const t = i / SEG; const w = dab ? width * (0.55 + 0.45 * Math.sin(Math.PI * t)) : width * tap(t);
      for (let s = 0; s < 2; s++) {
        this.pos.push(P[i][0], P[i][1], P[i][2]); this.tan.push(tx, ty, tz);
        this.uvk.push(s, t, kind); this.a.push(s ? 1 : -1, w, width, seed);
        this.col.push(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alpha); this.par.push(omega, boil, bristles, nearMix);
      }
    }
    this.nv += 2 * (SEG + 1); this.n++;
  }
  geometry(THREE) {
    const g = new THREE.BufferGeometry(); const F = (arr, n, name) => g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(arr), n));
    F(this.pos, 3, "position"); F(this.tan, 3, "aTan"); F(this.uvk, 3, "aUvK"); F(this.a, 4, "aA"); F(this.col, 4, "aColor"); F(this.par, 4, "aParam");
    const per = 6 * SEG, idx = new Uint32Array(this.n * per);
    for (let s = 0; s < this.n; s++) { const v0 = this.starts[s]; let o = s * per; for (let i = 0; i < SEG; i++) { const a = v0 + 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.set([a, b, c, b, d, c], o); o += 6; } }
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    g.userData = { count: this.n, per, cent: new Float32Array(this.cent), omega: new Float32Array(this.omega), kinds: new Uint8Array(this.kinds), baseIndex: idx.slice() };
    return g;
  }
}

// random unit vector
function randDir(R) { const z = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
// walk along the sphere of radius Rs from p, with heading function (t)->angle in the local tangent frame
function spherePath(p, Rs, len, headingFn, east) {
  let pos = [p[0] * Rs, p[1] * Rs, p[2] * Rs]; const pts = [pos.slice()]; const n = 10, step = len / n;
  for (let i = 0; i < n; i++) {
    const d = norm(pos); const e1 = norm(cross([0, 1, 0], d)), e2 = cross(d, e1); const ang = headingFn(i / n, d);
    const mv = [0, 1, 2].map((k) => e1[k] * Math.cos(ang) + e2[k] * Math.sin(ang));
    pos = norm([0, 1, 2].map((k) => pos[k] + mv[k] * step)).map((v) => v * Rs); pts.push(pos.slice());
  }
  return pts;
}

export function buildScene(THREE, opts = {}) {
  const T = opts.teff || 4410, seed = opts.seed || 7, AUPX = 32, PX = 1 / AUPX, ROUT = 18.5;
  const R = rng(seed); const sky = new Builder(), disk = new Builder(), add = new Builder(); const sprites = [];
  const starRGB = tRGB255(T); let sid = 0; const S = () => R() * 1000 + (sid++) * 0.37;

  // ---------- sky: wash, sketch lines, star dabs (all on a far sphere) ----------
  const RS = 220, SKYPX = 0.2;          // AU per "screen pixel" of sky detail
  const cnt = { wash: 160, sketch: 34, stars: 700, ...(opts.counts || {}) };
  for (let i = 0; i < cnt.wash; i++) {
    const d = randDir(R); const t = clamp01(0.75 * (0.5 - 0.5 * d[1]) + 0.25 * ((Math.atan2(d[2], d[0]) / Math.PI + 1) / 2));
    const base = t < 0.6 ? mix(hex2rgb("#04081A"), hex2rgb("#0C143A"), t / 0.6) : mix(hex2rgb("#0C143A"), hex2rgb("#2E1E5C"), (t - 0.6) / 0.4);
    const col = jitter(mix(base, hex2rgb("#3A3C8C"), 0.18), R, 0.02, 0.03, 0.05); const len = (260 + R() * 520) * SKYPX;
    const pts = spherePath(d, RS, len, (u, dd) => 0.18 * Math.sin(u * 5 + d[0] * 9), null);
    sky.add(pts, { width: (18 + R() * 30) * SKYPX, rgb: col, alpha: 0.07 * (opts.skyBoost ?? 2.2), bristles: 7, boil: 0, seed: S() });
  }
  for (let i = 0; i < cnt.sketch; i++) {
    const d = randDir(R); const col = jitter(hex2rgb(["#4B4FA8", "#6A5AC0", "#3E5BA8"][i % 3]), R, 0.02, 0.05, 0.05); const len = (150 + R() * 380) * SKYPX; const ph = R() * 9;
    const pts = spherePath(d, RS, len, (u) => Math.sin(u * 4 + ph) * 1.4 + Math.cos(u * 3 + ph * 1.7), null);
    sky.add(pts, { width: (1.6 + R() * 1.4) * SKYPX, rgb: col, alpha: 0.10 + R() * 0.12, bristles: 1, boil: 0, seed: S() });
  }
  for (let i = 0; i < cnt.stars; i++) {
    const d = randDir(R); const Tk = Math.pow(10, 3.6 + R() * 0.6); const col = mix(tRGB255(Tk), [255, 255, 255], 0.4); const big = R() < 0.02;
    const s = (big ? 3 + R() * 2 : 1.1 + R() * 1.3) * SKYPX; const e1 = norm(cross([0, 1, 0], d)); const L = s * 1.4;
    const c = d.map((v) => v * RS); const pts = [[0, 1, 2].map((k) => c[k] - e1[k] * L * 0.5), c, [0, 1, 2].map((k) => c[k] + e1[k] * L * 0.5)];
    const alpha = 0.55 + R() * 0.45;
    sky.add(pts, { width: s * 1.5, rgb: col, alpha, bristles: 1, boil: 0, seed: S(), dab: true });
    if (big) sprites.push({ p: c, r: s * 3, rgb: col, a: 0.25, breath: 0 });
  }

  // ---------- disk ----------
  const h = (r) => 0.045 * Math.pow(Math.max(r, 0.02), 1.22);
  const gaps = [[5.2, 0.55, 0.88], [9.0, 0.75, 0.65], [12.5, 0.9, 0.45], [15.5, 1.0, 0.35]], rings = [[7.0, 0.8, 0.35], [10.8, 0.7, 0.25], [14.0, 0.8, 0.2]];
  const sig = (r) => { let s = Math.pow(Math.max(r, 0.15), -0.55) * Math.exp(-Math.pow(r / ROUT, 6)); for (const [rg, wg, dg] of gaps) s *= 1 - dg * Math.exp(-0.5 * ((r - rg) / (wg * 0.5)) ** 2); for (const [rr, wr, ar] of rings) s *= 1 + ar * Math.exp(-0.5 * ((r - rr) / (wr * 0.5)) ** 2); return s; };
  const pal = [starRGB, hex2rgb("#E9B98A"), hex2rgb("#C98E62"), hex2rgb("#8E5C46")];
  const colAt = (r) => { const t = Math.min(1, Math.log(1 + r) / Math.log(1 + ROUT)); const i = Math.min(2, Math.floor(t * 3)); return mix(pal[i], pal[i + 1], t * 3 - i); };
  const nearMixAt = (r) => 0.45 + 0.3 * Math.min(1, Math.log(1 + r) / Math.log(1 + ROUT));
  const A_DISK = 2.2 * PX, A_JET = 3.0 * PX, A_RAY = 1.6 * PX, A_OTHER = 1.0 * PX;   // boil amplitudes from the spec, px converted to AU
  const ringPts = (r, ph, dph, z, pitchDeg = 0) => { const pts = []; for (let k = 0; k <= 10; k++) { const pp = ph + dph * k / 10; const rr = r * (1 - Math.tan(pitchDeg * Math.PI / 180) * dph * k / 10); pts.push([rr * Math.cos(pp), z, -rr * Math.sin(pp)]); } return pts; };
  const nDisk = (opts.counts && opts.counts.disk) || 4200, nUnder = (opts.counts && opts.counts.under) || 600;
  let wmax = 0; for (let r = 0.3; r < ROUT + 2; r += 0.05) wmax = Math.max(wmax, sig(r) * r);
  let made = 0, tries = 0; const total = nDisk + nUnder;
  while (made < total && tries < 4000000) {
    tries++; const r = 0.3 + R() * (ROUT + 2); if (R() * wmax > sig(r) * r) continue;
    const under = made < nUnder; const ph = R() * Math.PI * 2;
    const len = (lerp(0.9, 2.6, R())) * (0.45 + r / 9) * (under ? 1.6 : 1); const dph = Math.min(1.2, len / r);
    const z = (R() < 0.5 ? 1 : -1) * h(r) * (1.6 + R() * 0.8);
    const wpx = (under ? 3 : 1) * lerp(3, 10, R()) * (0.55 + 0.45 * Math.min(1, r / 8));
    const col = jitter(colAt(r), R, 0.02, 0.06, 0.06);
    disk.add(ringPts(r, ph, dph, z, 5), { width: wpx * PX, rgb: col, alpha: under ? 0.22 : lerp(0.45, 0.9, R()), kind: KIND.DISK, bristles: 6, boil: A_DISK, nearMix: nearMixAt(r), seed: S() });
    made++;
  }
  // ring accents (bright arcs on rings, dark arcs in gaps)
  for (const [rr] of rings) for (let i = 0; i < 40; i++) {
    const ph = R() * Math.PI * 2, d = (0.5 + R() * 0.9) * 0.9, rj = rr + (R() - 0.5) * 0.4;
    const col = jitter(mix(colAt(rr), [255, 240, 225], 0.25), R, 0.01, 0.05, 0.04);
    disk.add(ringPts(rj, ph, d, (R() < 0.5 ? 1 : -1) * h(rj) * 2), { width: lerp(3, 7, R()) * PX, rgb: col, alpha: 0.55 + R() * 0.3, kind: KIND.DISK, bristles: 4, boil: A_DISK, nearMix: nearMixAt(rj), seed: S() });
  }
  for (const [rg, wg] of gaps) for (let i = 0; i < 46; i++) {
    const ph = R() * Math.PI * 2, d = (0.5 + R() * 0.9) * 0.9, rj = rg + (R() - 0.5) * wg * 0.5;
    disk.add(ringPts(rj, ph, d, (R() < 0.5 ? 1 : -1) * h(rj) * 1.6), { width: lerp(2, 5, R()) * (1 + wg) * PX, rgb: jitter(hex2rgb("#2A1E3C"), R, 0.01, 0.03, 0.04), alpha: 0.5 + R() * 0.3, kind: KIND.DISK, bristles: 4, boil: A_DISK, nearMix: 0, seed: S() });
  }
  // dark dust lane: midplane, visible on the camera-facing side (shader fades the far half)
  for (let i = 0; i < ((opts.counts && opts.counts.lane) || 520); i++) {
    const r = 1.2 + Math.pow(R(), 0.8) * (ROUT - 1), ph = R() * Math.PI * 2, dph = (0.6 + R()) / r;
    disk.add(ringPts(r, ph, dph, -h(r) * 0.2), { width: lerp(3, 8, R()) * PX, rgb: jitter(hex2rgb("#1A1230"), R, 0.02, 0.03, 0.05), alpha: 0.35 + R() * 0.35, kind: KIND.LANE, bristles: 4, boil: A_DISK, seed: S() });
  }

  // true orbital streaks (v2): born, slide 44 px along the orbit, fade; one life per 4 s loop
  for (let i = 0; i < ((opts.counts && opts.counts.streaks) || 450); i++) {
    let r; do { r = 0.5 + R() * 15.5; } while (R() * wmax > sig(r) * r);
    const ph = R() * Math.PI * 2, dph = (24 * PX) / r, z = (R() < 0.5 ? 1 : -1) * h(r) * (1.6 + R() * 0.8);
    const col = mix(colAt(r), hex2rgb("#FFF4E8"), 0.35);
    disk.add(ringPts(r, ph, dph, z), { width: lerp(2.5, 5, R()) * PX, rgb: col, alpha: 1, kind: KIND.STREAK, bristles: 3, boil: A_OTHER, omega: R(), nearMix: 0, seed: S() });
  }

  // ---------- jets and protostar rays (additive) ----------
  const jetRGB = hex2rgb("#FF7A8E");
  for (let i = 0; i < 64; i++) {
    const up = i % 2 === 0; const L = lerp(40, 120, R()) * PX; const y0 = (up ? 1 : -1) * (14 + R() * (up ? 250 : 210)) * PX;
    const a = R() * Math.PI * 2, rr = (R()) * (3 * PX + Math.abs(y0) * 0.06);
    const x0 = Math.cos(a) * rr, z0 = Math.sin(a) * rr, dir = up ? 1 : -1;
    add.add([[x0, y0, z0], [x0 + (R() - 0.5) * 0.25, y0 + dir * L * 0.5, z0 + (R() - 0.5) * 0.25], [x0 + (R() - 0.5) * 0.4, y0 + dir * L, z0 + (R() - 0.5) * 0.4]],
      { width: lerp(3, 7, R()) * PX, rgb: jitter(jetRGB, R, 0.02, 0.08, 0.05), alpha: lerp(0.18, 0.42, R()) * (up ? 1 : 0.55), bristles: 3, boil: A_JET, seed: S() });
  }
  for (let i = 0; i < 160; i++) {
    const d = randDir(R); const L = (6 + Math.pow(R(), 2) * 40) * PX, r0 = R() * 4 * PX; const tw = norm([d[0] + 0.12 * d[2], d[1], d[2] - 0.12 * d[0]]);
    add.add([d.map((v) => v * r0), d.map((v, k) => v * (r0 + L * 0.5) * 0.5 + tw[k] * (r0 + L * 0.5) * 0.5), tw.map((v) => v * (r0 + L))],
      { width: lerp(1.5, 4.5, R()) * PX, rgb: mix(starRGB, [255, 255, 255], R() * 0.6), alpha: 0.35 + R() * 0.4, bristles: 2, boil: A_RAY, seed: S() });
  }
  // core glow: large soft additive sprites (fake bloom that also works in XR). breath = pulses with the flow clock
  const glow = (r, a, rgb, breath = 1) => sprites.push({ p: [0, 0, 0], r, rgb, a, breath });
  glow(260 * PX, 0.22, starRGB); glow(150 * PX, 0.40, starRGB); glow(52 * PX, 0.80, starRGB); glow(30 * PX, 0.35, [255, 255, 255]); glow(14 * PX, 1.0, [255, 255, 255]);   // v2 glow dabs

  return { sky: sky.geometry(THREE), disk: disk.geometry(THREE), add: add.geometry(THREE), sprites, starRGB, counts: { sky: sky.n, disk: disk.n, add: add.n, sprites: sprites.length }, ROUT };
}

export function spriteGeometry(THREE, sprites) {
  const n = sprites.length, pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), col = new Float32Array(n * 16), sz = new Float32Array(n * 8), idx = new Uint16Array(n * 6);
  sprites.forEach((s, i) => {
    for (let c = 0; c < 4; c++) { const o = i * 4 + c; pos.set(s.p, o * 3); corner.set([c & 1 ? 1 : -1, c & 2 ? 1 : -1], o * 2); col.set([s.rgb[0] / 255, s.rgb[1] / 255, s.rgb[2] / 255, s.a], o * 4); sz.set([s.r, s.breath], o * 2); }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aCorner", new THREE.BufferAttribute(corner, 2)); g.setAttribute("aColor", new THREE.BufferAttribute(col, 4)); g.setAttribute("aSz", new THREE.BufferAttribute(sz, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4); return g;
}
