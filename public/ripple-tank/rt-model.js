// Ripple Tank model: a cheap 2D wave-equation grid plus the numbers the page shows.
// Sim coordinates are "landscape": X runs along the tank's long side (waves from a straight
// dipper travel +X), Y across it. All lengths in cm, times in s. Every value: TODO-TESLA.
export const MODULE_ID = "ripple-tank";
export const TANK_CM = 40;            // long side of the tank (TODO-TESLA)
export const WAVE_SPEED = 24;         // cm/s, shallow-water ripples (TODO-TESLA)
export const F_MIN = 3, F_MAX = 10;   // Hz; lambda 8 cm down to 2.4 cm (TODO-TESLA)
export const MAX_SOURCES = 4;
export const SLOW = 4;                // slow motion shows the tank 4x slower
export const COURANT = 0.5;           // v dt / dx; stable in 2D up to 1/sqrt(2)
export const LEVELS = [200, 150, 110, 80]; // grid cells along the long side, best first
export const WALL_X = 12;             // barrier position for slit scenes, cm from the dipper side
export const SLIT_A = { min: 1, max: 8 }, SLIT_D = { min: 3, max: 16 };
export const TANK_CAPTION = "Top view of a ripple tank, 40 cm long. Light bands are crests, dark bands are troughs.";
export const MODEL_NOTE = "Waves on real water also spread out and fade; this tank keeps the speed fixed so only the frequency changes the wavelength.";

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const wavelength = (f, v = WAVE_SPEED) => v / f;
// Two in-phase point sources d apart: dark (nodal) lines sit where the path difference is
// (m + 1/2) lambda, and a path difference can never exceed d. So the count is 2 floor(d/lambda + 1/2).
export const nodalLines = (d, lambda) => (d > 0 ? 2 * Math.floor(d / lambda + 0.5) : 0);
// Bright (antinodal) lines: path difference m lambda, |m| lambda < d (the m = 0 centre line always).
export const antinodalLines = (d, lambda) => (d > 0 ? 2 * Math.ceil(d / lambda - 1e-9) - 1 : 0);
// Time for a wave to cross most of the tank, so a pattern has formed.
export const settleTime = (L = TANK_CM, v = WAVE_SPEED) => (0.8 * L) / v;

// ---------- configuration ----------
// st: { f, sources: [{x, y}], line: bool, barrier: "none"|"one"|"two", a, d, blocks: [{x,y}], nodal, slow }
export function sanitizeConfig(raw = {}, W = TANK_CM, H = TANK_CM * 0.6) {
  const num = (v, a, b, dflt) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, a, b) : dflt);
  const pts = (l, max) => (Array.isArray(l) ? l : []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)).slice(0, max).map((p) => ({ x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) }));
  return {
    f: num(raw.f, F_MIN, F_MAX, 6), sources: pts(raw.sources, MAX_SOURCES), line: !!raw.line,
    barrier: ["none", "one", "two"].includes(raw.barrier) ? raw.barrier : "none",
    a: num(raw.a, SLIT_A.min, SLIT_A.max, 3), d: num(raw.d, SLIT_D.min, SLIT_D.max, 8), blocks: pts(raw.blocks, 200),
    nodal: !!raw.nodal, slow: !!raw.slow
  };
}
// Barrier wall as rects {x0,y0,x1,y1} (cm): a wall across the tank at WALL_X with 1 or 2 gaps.
export function wallRects(st, H) {
  if (st.barrier === "none") return [];
  const x0 = WALL_X, x1 = WALL_X + 0.8, c = H / 2, gaps = st.barrier === "one" ? [[c - st.a / 2, c + st.a / 2]] : [[c - st.d / 2 - st.a / 2, c - st.d / 2 + st.a / 2], [c + st.d / 2 - st.a / 2, c + st.d / 2 + st.a / 2]];
  const rects = []; let y = 0;
  for (const [g0, g1] of gaps) { if (g0 > y) rects.push({ x0, y0: y, x1, y1: g0 }); y = Math.max(y, g1); }
  if (y < H) rects.push({ x0, y0: y, x1, y1: H });
  return rects;
}
export const BLOCK_CM = 1.6;
export const blockRects = (st) => st.blocks.map((b) => ({ x0: b.x - BLOCK_CM / 2, y0: b.y - BLOCK_CM / 2, x1: b.x + BLOCK_CM / 2, y1: b.y + BLOCK_CM / 2 }));

// What the student has built, for the readout and the challenges.
export function analyze(st) {
  const lambda = wavelength(st.f), out = { lambda, kind: "free", text: "" };
  const pts = st.sources;
  if (!st.line && st.barrier === "none" && pts.length === 2) {
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    Object.assign(out, { kind: "two-source", d, ratio: d / lambda, nodal: nodalLines(d, lambda), antinodal: antinodalLines(d, lambda) });
  } else if (st.line && st.barrier === "one") Object.assign(out, { kind: "one-slit", ratio: st.a / lambda });
  else if (st.line && st.barrier === "two") Object.assign(out, { kind: "two-slit", ratio: st.a / lambda, dRatio: st.d / lambda, fringes: antinodalLines(st.d, lambda) });
  return out;
}

// ---------- challenges (TODO-TESLA) ----------
export const FUN = { slitMax: 1, dMin: 2 }; // narrow slit: a <= 1 lambda; double slit: d >= 2 lambda
export const GOALS = [
  { tier: "bronze", title: "Make exactly 2 dark lines with two dippers", check: (e) => e.type === "tank" && e.settled && e.kind === "two-source" && e.nodal === 2 },
  { tier: "silver", title: "Diffract a straight wave through one slit narrower than a wavelength", check: (e) => e.type === "tank" && e.settled && e.kind === "one-slit" && e.ratio <= FUN.slitMax },
  { tier: "gold", title: "Make a double-slit pattern: narrow slits at least 2 wavelengths apart", check: (e) => e.type === "tank" && e.settled && e.kind === "two-slit" && e.ratio <= FUN.slitMax && e.dRatio >= FUN.dMin }
];
// Prediction: before the next change, more / fewer / same dark lines?
export const PREDICT = [{ id: "more", label: "More" }, { id: "fewer", label: "Fewer" }, { id: "same", label: "Same" }];
export const trend = (before, after) => (after > before ? "more" : after < before ? "fewer" : "same");
export const judgePrediction = (guess, outcome) => guess === outcome;

export const SCENES = [
  { id: "two", name: "Two dippers", hint: "Make exactly 2 dark lines. Change the frequency or drag a dipper.", cfg: (H) => ({ sources: [{ x: 8, y: H / 2 - 3 }, { x: 8, y: H / 2 + 3 }], nodal: true, f: 8 }) },
  { id: "one", name: "One slit", hint: "Make the slit narrower than one wavelength and watch the waves spread out behind it.", cfg: () => ({ line: true, barrier: "one", a: 6, f: 6 }) },
  { id: "double", name: "Two slits", hint: "Narrow slits, at least 2 wavelengths apart: look for bright and dark bands fanning out.", cfg: () => ({ line: true, barrier: "two", a: 5, d: 6, f: 5, nodal: true }) }
];

export const SHARE_SCHEMA = {
  f: { type: "num", min: F_MIN, max: F_MAX }, line: { type: "bool" }, barrier: { type: "enum", values: ["none", "one", "two"] },
  a: { type: "num", min: SLIT_A.min, max: SLIT_A.max }, d: { type: "num", min: SLIT_D.min, max: SLIT_D.max }, nodal: { type: "bool" }, slow: { type: "bool" },
  s0x: { type: "num", min: 0, max: TANK_CM }, s0y: { type: "num", min: 0, max: TANK_CM }, s1x: { type: "num", min: 0, max: TANK_CM }, s1y: { type: "num", min: 0, max: TANK_CM },
  s2x: { type: "num", min: 0, max: TANK_CM }, s2y: { type: "num", min: 0, max: TANK_CM }, s3x: { type: "num", min: 0, max: TANK_CM }, s3y: { type: "num", min: 0, max: TANK_CM }
};
export function toShare(st) { const o = { f: st.f, line: st.line, barrier: st.barrier, a: st.a, d: st.d, nodal: st.nodal, slow: st.slow }; st.sources.forEach((p, i) => { o[`s${i}x`] = +p.x.toFixed(2); o[`s${i}y`] = +p.y.toFixed(2); }); return o; }
export function fromShare(o) { const sources = []; for (let i = 0; i < MAX_SOURCES; i++) if (Number.isFinite(o[`s${i}x`]) && Number.isFinite(o[`s${i}y`])) sources.push({ x: o[`s${i}x`], y: o[`s${i}y`] }); return { ...o, sources }; }

// ---------- the grid ----------
// Leapfrog finite differences with a sponge border so waves leave instead of bouncing back.
export function createGrid(nx, ny) {
  const n = nx * ny, sponge = new Float32Array(n), S = Math.max(8, Math.round(nx * 0.14)); // about 5 cm of gentle sponge
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const e = Math.min(i, j, nx - 1 - i, ny - 1 - j), k = e < S ? (S - e) / S : 0;
    sponge[j * nx + i] = 1 - 0.15 * k * k;
  }
  return { nx, ny, u: new Float32Array(n), prev: new Float32Array(n), next: new Float32Array(n), wall: new Uint8Array(n), avg: new Float32Array(n), sponge };
}
export function step(g, c2 = COURANT * COURANT) {
  const { nx, ny, u, prev, next, wall, sponge } = g;
  for (let j = 1; j < ny - 1; j++) {
    let k = j * nx + 1;
    for (let i = 1; i < nx - 1; i++, k++) {
      if (wall[k]) { next[k] = 0; continue; }
      // 9-point Laplacian: rings stay round instead of turning square on a coarse grid.
      const lap = (4 * (u[k - 1] + u[k + 1] + u[k - nx] + u[k + nx]) + u[k - nx - 1] + u[k - nx + 1] + u[k + nx - 1] + u[k + nx + 1] - 20 * u[k]) / 6;
      next[k] = u[k] + (u[k] - prev[k]) * sponge[k] + c2 * lap; // sponge damps velocity only
    }
  }
  g.prev = u; g.u = next; g.next = prev;
}
export function fillWalls(g, rects, cmPerCell) {
  g.wall.fill(0);
  for (const r of rects) {
    const i0 = Math.max(0, Math.floor(r.x0 / cmPerCell)), i1 = Math.min(g.nx - 1, Math.ceil(r.x1 / cmPerCell));
    const j0 = Math.max(0, Math.floor(r.y0 / cmPerCell)), j1 = Math.min(g.ny - 1, Math.ceil(r.y1 / cmPerCell) - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i < Math.max(i0 + 1, i1); i++) g.wall[j * g.nx + i] = 1;
  }
}
export function splash(g, ci, cj, r, amp = -1.2) {
  const R = Math.ceil(r * 2);
  for (let j = Math.max(1, cj - R); j < Math.min(g.ny - 1, cj + R); j++) for (let i = Math.max(1, ci - R); i < Math.min(g.nx - 1, ci + R); i++) {
    const k = j * g.nx + i; if (g.wall[k]) continue;
    const w = amp * Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (r * r)); g.u[k] += w; g.prev[k] += w;
  }
}

// ---------- adaptive resolution ----------
// Drop a grid level when frames run slow for a while; step back up only after a long good run.
export function createGovernor({ slowMs = 24, fastMs = 13, window = 45 } = {}) {
  let ema = 16, slowRun = 0, fastRun = 0, level = 0;
  return {
    get level() { return level; }, get ema() { return ema; },
    set level(v) { level = clamp(v, 0, LEVELS.length - 1); slowRun = fastRun = 0; },
    sample(ms) {
      ema += (Math.min(ms, 100) - ema) * 0.1;
      slowRun = ema > slowMs ? slowRun + 1 : 0; fastRun = ema < fastMs ? fastRun + 1 : 0;
      if (slowRun > window && level < LEVELS.length - 1) { level++; slowRun = 0; ema = 16; return "down"; }
      if (fastRun > window * 8 && level > 0) { level--; fastRun = 0; return "up"; }
      return null;
    }
  };
}
