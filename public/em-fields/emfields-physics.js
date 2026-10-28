// E&M Field Sandbox: physics, data tables and formatting.
// Pure: no DOM, no Firebase. Runs in node for tests and in the page.
// SI units inside (m, C, A, T, V/m, kg, s). Every formula and value here is
// listed in docs/em-fields-science.md.
//   node --test tests/emfields-physics.test.mjs

// ---------- constants (CODATA 2018; e is exact in SI 2019) ----------
export const E_CHARGE = 1.602176634e-19;     // C, exact
export const EPS0 = 8.8541878128e-12;        // F/m
export const MU0 = 1.25663706212e-6;         // N/A^2
export const K = 1 / (4 * Math.PI * EPS0);   // ~8.98755e9 N m^2/C^2
export const NC = 1e-9;                      // 1 nC in C
export const PARTICLES = Object.freeze({
  proton: Object.freeze({ id: "proton", name: "Proton", q: E_CHARGE, m: 1.67262192369e-27, art: "test-charge" }),
  alpha: Object.freeze({ id: "alpha", name: "Alpha particle", q: 2 * E_CHARGE, m: 6.6446573357e-27, art: "test-charge" }),
  electron: Object.freeze({ id: "electron", name: "Electron", q: -E_CHARGE, m: 9.1093837015e-31, art: "electron" })
});
export const PARTICLE_IDS = Object.freeze(Object.keys(PARTICLES));

// ---------- electric field and potential of point charges ----------
// charges: [{ x, y, q }] with x, y in m and q in C. Field lines live in the
// page plane; each charge is a point in that plane.
export function eFieldFrom(c, x, y) {
  const dx = x - c.x, dy = y - c.y;
  const r2 = dx * dx + dy * dy;
  if (r2 === 0) return { x: 0, y: 0 };
  const s = K * c.q / (r2 * Math.sqrt(r2));
  return { x: s * dx, y: s * dy };
}
export function eField(charges, x, y) {
  let ex = 0, ey = 0;
  for (const c of charges) { const e = eFieldFrom(c, x, y); ex += e.x; ey += e.y; }
  return { x: ex, y: ey };
}
export function potentialFrom(c, x, y) {
  const r = Math.hypot(x - c.x, y - c.y);
  return r === 0 ? (c.q >= 0 ? Infinity : -Infinity) : K * c.q / r;
}
export function potential(charges, x, y) {
  let v = 0;
  for (const c of charges) v += potentialFrom(c, x, y);
  return v;
}
export function coulombMagnitude(q1, q2, r) { return K * Math.abs(q1 * q2) / (r * r); }

// ---------- magnetic field of long straight wires (perpendicular to page) ----------
// wires: [{ x, y, I }], I in A, positive I flows out of the page (+z).
// B = mu0 I / (2 pi r), circling the wire counterclockwise for +I (right-hand rule).
export function bFieldFrom(w, x, y) {
  const dx = x - w.x, dy = y - w.y;
  const r2 = dx * dx + dy * dy;
  if (r2 === 0) return { x: 0, y: 0 };
  const s = MU0 * w.I / (2 * Math.PI * r2);
  return { x: -s * dy, y: s * dx };
}
export function bField(wires, x, y) {
  let bx = 0, by = 0;
  for (const w of wires) { const b = bFieldFrom(w, x, y); bx += b.x; by += b.y; }
  return { x: bx, y: by };
}
export function wireBMagnitude(I, r) { return MU0 * Math.abs(I) / (2 * Math.PI * r); }
// z part of the vector potential; B field lines are its contour lines.
export function vectorPotentialZ(wires, x, y) {
  let a = 0;
  for (const w of wires) a -= MU0 * w.I / (2 * Math.PI) * Math.log(Math.max(1e-9, Math.hypot(x - w.x, y - w.y)));
  return a;
}
// Force per meter between two long parallel wires. Same direction attracts.
export function wireForcePerLength(I1, I2, d) {
  return { perMeter: MU0 * Math.abs(I1 * I2) / (2 * Math.PI * d), attract: I1 * I2 > 0 };
}

// ---------- charged particles ----------
export function cyclotronRadius(m, q, v, B) { return m * v / (Math.abs(q) * B); }
export function cyclotronPeriod(m, q, B) { return 2 * Math.PI * m / (Math.abs(q) * B); }
export function cyclotronFrequency(m, q, B) { return 1 / cyclotronPeriod(m, q, B); }
export function selectorSpeed(E, B) { return E / B; }
export function kineticEnergyJ(m, v) { return 0.5 * m * v * v; }
export function kineticEnergyEV(m, v) { return kineticEnergyJ(m, v) / E_CHARGE; }
// Lorentz force F = q (E + v x B) with B along z (Bz > 0 out of the page).
export function lorentz(q, vx, vy, Ex, Ey, Bz) { return { x: q * (Ex + vy * Bz), y: q * (Ey - vx * Bz) }; }

// One Boris step (the standard particle pusher: exact speed in a pure B field).
// fields(x, y) -> { Ex, Ey, Bz }.
export function borisStep(p, q, m, dt, fields) {
  const f = fields(p.x, p.y);
  const h = q * dt / (2 * m);
  let vx = p.vx + h * f.Ex, vy = p.vy + h * f.Ey;
  const t = h * f.Bz, s = 2 * t / (1 + t * t);
  const ux = vx + vy * t, uy = vy - vx * t;
  vx += uy * s; vy -= ux * s;
  vx += h * f.Ex; vy += h * f.Ey;
  return { x: p.x + vx * dt, y: p.y + vy * dt, vx, vy };
}
// Advance a particle by `time` seconds with substeps small next to the
// gyration period and the distance to the nearest point charge.
export function advance(p, part, time, fields, opts = {}) {
  const maxSteps = opts.maxSteps || 4000;
  const near = opts.near || (() => Infinity);
  let left = time, steps = 0, cur = p;
  while (left > 0 && steps < maxSteps) {
    const f = fields(cur.x, cur.y);
    const v = Math.hypot(cur.vx, cur.vy) || 1;
    let dt = left;
    if (f.Bz) dt = Math.min(dt, cyclotronPeriod(part.m, part.q, Math.abs(f.Bz)) / 80);
    dt = Math.min(dt, 0.01 * Math.max(near(cur.x, cur.y), 1e-4) / v);
    const a = Math.hypot(f.Ex, f.Ey) * Math.abs(part.q) / part.m;
    if (a > 0) dt = Math.min(dt, 0.02 * v / a + 1e-12);
    cur = borisStep(cur, part.q, part.m, dt, fields);
    left -= dt; steps++;
  }
  return { p: cur, done: left <= 0, steps };
}

// ---------- velocity selector ----------
// Plates of length L, gap G, centered on y = 0, the particle enters at x = 0
// moving +x. E points -y (top plate +), B into the page. For a positive charge
// the electric force is down and the magnetic force qvB is up.
export const SELECTOR = Object.freeze({ L: 0.3, gap: 0.06, slit: 0.004 });
export function selectorPath(part, v, E, B, n = 400) {
  const fields = (x) => (x >= 0 && x <= SELECTOR.L ? { Ex: 0, Ey: -E, Bz: -B } : { Ex: 0, Ey: 0, Bz: 0 });
  let p = { x: -0.04, y: 0, vx: v, vy: 0 };
  const pts = [{ x: p.x, y: p.y, t: 0 }];
  const total = (SELECTOR.L + 0.1) / v;
  const dt = total / n;
  let t = 0, hit = false;
  for (let i = 0; i < n; i++) {
    p = advance(p, part, dt, fields, { maxSteps: 400 }).p;
    t += dt;
    pts.push({ x: p.x, y: p.y, t });
    if (p.x >= 0 && p.x <= SELECTOR.L && Math.abs(p.y) >= SELECTOR.gap / 2) { hit = true; break; }
    if (p.x > SELECTOR.L + 0.06) break;
  }
  const passes = !hit && Math.abs(p.y) <= SELECTOR.slit / 2;
  return { pts, hit, passes, exitY: p.y };
}

// ---------- field lines and contours (pure geometry for the renderer) ----------
// Trace E field lines from positive charges (or back from negative ones when
// the scene has no positive charge). Lines per charge are proportional to |q|.
export const LINES_PER_NC = 6;
export function traceFieldLines(charges, bounds, opts = {}) {
  const r0 = opts.r0 || 0.012, step = opts.step || 0.003, maxN = opts.maxN || 900;
  const pos = charges.filter((c) => c.q > 0), neg = charges.filter((c) => c.q < 0);
  const seeds = pos.length ? pos : neg;
  const dir = pos.length ? 1 : -1;
  const lines = [];
  for (const c of seeds) {
    const n = Math.max(4, Math.min(48, Math.round(LINES_PER_NC * Math.abs(c.q) / NC)));
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * 2 * Math.PI;
      let x = c.x + r0 * Math.cos(a), y = c.y + r0 * Math.sin(a);
      const pts = [[x, y]];
      for (let k = 0; k < maxN; k++) {
        // midpoint (RK2) step along the unit field direction
        const e1 = eField(charges, x, y), m1 = Math.hypot(e1.x, e1.y) || 1;
        const mx = x + dir * 0.5 * step * e1.x / m1, my = y + dir * 0.5 * step * e1.y / m1;
        const e2 = eField(charges, mx, my), m2 = Math.hypot(e2.x, e2.y) || 1;
        x += dir * step * e2.x / m2; y += dir * step * e2.y / m2;
        pts.push([x, y]);
        if (x < bounds.x0 || x > bounds.x1 || y < bounds.y0 || y > bounds.y1) break;
        if (charges.some((o) => o !== c && Math.hypot(x - o.x, y - o.y) < r0 * 0.8)) break;
      }
      lines.push(pts);
    }
  }
  return lines;
}
// Marching squares: segments where the sampled grid crosses `level`.
// grid: Float64Array of nx * ny values at x0 + i dx, y0 + j dy.
export function contourSegments(grid, nx, ny, x0, y0, dx, dy, level) {
  const segs = [];
  const at = (i, j) => grid[j * nx + i];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
    if (v.some((z) => !Number.isFinite(z))) continue;
    const c = [[x0 + i * dx, y0 + j * dy], [x0 + (i + 1) * dx, y0 + j * dy], [x0 + (i + 1) * dx, y0 + (j + 1) * dy], [x0 + i * dx, y0 + (j + 1) * dy]];
    const cross = [];
    for (let e = 0; e < 4; e++) {
      const a = v[e], b = v[(e + 1) % 4];
      if ((a < level) !== (b < level)) {
        const t = (level - a) / (b - a);
        const p = c[e], q = c[(e + 1) % 4];
        cross.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    if (cross.length === 2) segs.push(cross);
    else if (cross.length === 4) { segs.push([cross[0], cross[1]]); segs.push([cross[2], cross[3]]); }
  }
  return segs;
}
export const EQUIPOTENTIAL_STEP_V = 50;   // volts between drawn equipotentials
export function equipotentialLevels(step = EQUIPOTENTIAL_STEP_V, max = 1500) {
  const out = [];
  for (let v = -max; v <= max + 1e-9; v += step) if (v !== 0) out.push(v);
  return out;
}

// ---------- sliders ----------
// Every slider is logarithmic over STEPS steps, so a shown value never jumps
// by 2x or more between adjacent steps (ratio = (max / min)^(1 / STEPS)).
export const STEPS = 200;
export const SLIDERS = Object.freeze({
  charge: Object.freeze({ min: 0.1 * NC, max: 10 * NC, unit: "nC" }),
  testCharge: Object.freeze({ min: 0.1 * NC, max: 10 * NC, unit: "nC" }),
  current: Object.freeze({ min: 0.5, max: 50, unit: "A" }),
  cycB: Object.freeze({ min: 0.05, max: 0.5, unit: "T" }),
  cycV: Object.freeze({ min: 1e5, max: 5e5, unit: "m/s" }),
  selE: Object.freeze({ min: 1e3, max: 1e5, unit: "V/m" }),
  selB: Object.freeze({ min: 0.01, max: 0.5, unit: "T" }),
  selV: Object.freeze({ min: 1e4, max: 1e6, unit: "m/s" }),
  boxE: Object.freeze({ min: 100, max: 1e5, unit: "V/m" }),
  boxB: Object.freeze({ min: 1e-3, max: 1, unit: "T" }),
  boxV: Object.freeze({ min: 1e4, max: 1e6, unit: "m/s" }),
  slowmo: Object.freeze({ min: 1e-8, max: 1e-5, unit: "s per s" })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(STEPS, Math.max(0, Math.round(step))) / STEPS;
  return s.min * (s.max / s.min) ** u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = Math.log(value / s.min) / Math.log(s.max / s.min);
  return Math.min(STEPS, Math.max(0, Math.round(u * STEPS)));
}

// ---------- scenes and presets ----------
// The view always shows at least VIEW wide by VIEW_H tall (m), centered on 0.
export const VIEW = 0.34, VIEW_H = 0.24;
export const CHARGE_R = 0.012;   // drawn radius of a point charge, m
export const PRESETS = Object.freeze({
  single: Object.freeze([{ x: 0, y: 0, q: 2 * NC }]),
  dipole: Object.freeze([{ x: -0.06, y: 0, q: 2 * NC }, { x: 0.06, y: 0, q: -2 * NC }]),
  like: Object.freeze([{ x: -0.06, y: 0, q: 2 * NC }, { x: 0.06, y: 0, q: 2 * NC }]),
  three: Object.freeze([{ x: -0.07, y: -0.03, q: 2 * NC }, { x: 0.07, y: -0.03, q: 2 * NC }, { x: 0, y: 0.06, q: -3 * NC }])
});
export const WIRE_PRESETS = Object.freeze({
  one: Object.freeze([{ x: 0, y: 0, I: 10 }]),
  parallel: Object.freeze([{ x: -0.05, y: 0, I: 10 }, { x: 0.05, y: 0, I: 10 }]),
  opposite: Object.freeze([{ x: -0.05, y: 0, I: 10 }, { x: 0.05, y: 0, I: -10 }])
});
export function clonePreset(list) { return list.map((o) => ({ ...o })); }

// ---------- deep links ----------
export const MODES = Object.freeze(["field", "potential", "magnetic", "cyclotron", "selector", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  field: "field", efield: "field", "e-field": "field", charges: "field", superposition: "field", force: "field",
  potential: "potential", equipotential: "potential", equipotentials: "potential", voltage: "potential",
  magnetic: "magnetic", bfield: "magnetic", "b-field": "magnetic", wires: "magnetic", currents: "magnetic", compass: "magnetic",
  cyclotron: "cyclotron", circular: "cyclotron", circle: "cyclotron",
  selector: "selector", "velocity-selector": "selector", crossed: "selector",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const mode = MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "field";
  let preset = (p.get("preset") || "").trim().toLowerCase();
  if (!PRESETS[preset] && !WIRE_PRESETS[preset]) preset = null;
  let particle = (p.get("particle") || "").trim().toLowerCase();
  if (!PARTICLES[particle]) particle = null;
  return { mode, preset, particle };
}

// ---------- number formatting ----------
const SUP = { "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
export function sci(x, digits = 3) {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return "0";
  let e = Math.floor(Math.log10(Math.abs(x)));
  let m = +(x / 10 ** e).toPrecision(digits);
  if (Math.abs(m) >= 10) { m = +(m / 10).toPrecision(digits); e += 1; }
  if (e === 0) return String(m);
  return `${m} \u00d7 10${String(e).split("").map((ch) => SUP[ch]).join("")}`;
}
const PREFIX = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "\u00b5"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]];
export function fmt(x, unit, digits = 3) {
  if (!Number.isFinite(x)) return "very large";
  if (x === 0) return `0 ${unit}`;
  for (const [s, p] of PREFIX) {
    if (Math.abs(x) >= s * 0.9995) return `${+(x / s).toPrecision(digits)} ${p}${unit}`;
  }
  return `${sci(x, digits)} ${unit}`;
}
export function fmtSpeed(v) { return `${sci(v, 3)} m/s`; }
export function fmtLength(m) { return m >= 1 ? `${+m.toPrecision(3)} m` : m >= 0.01 ? `${+(m * 100).toPrecision(3)} cm` : `${+(m * 1000).toPrecision(3)} mm`; }
export function angleDeg(x, y) { const a = Math.atan2(y, x) * 180 / Math.PI; return Math.round(a < 0 ? a + 360 : a); }

// ---------- art anchors (from assets/MANIFEST.md) ----------
export const ART = Object.freeze({
  charge: Object.freeze({ size: 256, center: [128, 128], r: 96 }),
  testCharge: Object.freeze({ size: 256, center: [128, 128], r: 50 }),
  electron: Object.freeze({ size: 256, center: [128, 128], r: 40 }),
  compass: Object.freeze({ size: 256, pivot: [128, 128] }),
  wire: Object.freeze({ w: 1024, h: 64, centerY: 32, thick: 22 })
});
