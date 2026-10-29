// Momentum & Collisions: physics, data tables and formatting.
// Pure: no DOM, no Firebase. Runs in node for tests and in the page.
// SI units inside (kg, m, s, N). Every formula and value here is listed in
// docs/momentum-collisions-science.md.
//   node --test tests/momentum-physics.test.mjs

// ---------- 1D collisions ----------
// Velocities after a 1D collision with coefficient of restitution e:
//   e = 1 elastic, 0 < e < 1 inelastic, e = 0 perfectly inelastic (stick).
// From m1 v1 + m2 v2 = m1 v1' + m2 v2' and v2' - v1' = -e (v2 - v1).
export function collide1D(m1, v1, m2, v2, e) {
  const M = m1 + m2, p = m1 * v1 + m2 * v2;
  return { v1: (p + m2 * e * (v2 - v1)) / M, v2: (p + m1 * e * (v1 - v2)) / M };
}
export const momentum = (m, v) => m * v;
export const kinetic = (m, v) => 0.5 * m * v * v;
export const centerOfMassVelocity = (m1, v1, m2, v2) => (m1 * v1 + m2 * v2) / (m1 + m2);
export const reducedMass = (m1, m2) => (m1 * m2) / (m1 + m2);
// Kinetic energy turned into heat, sound and deformation: (1/2) mu (1 - e^2) (v1 - v2)^2.
export const keLost = (m1, v1, m2, v2, e) => 0.5 * reducedMass(m1, m2) * (1 - e * e) * (v1 - v2) ** 2;
// Kinetic energy measured in the center-of-mass frame: (1/2) mu (v1 - v2)^2.
export const keInternal = (m1, v1, m2, v2) => 0.5 * reducedMass(m1, m2) * (v1 - v2) ** 2;
export function collisionType(e) {
  if (e >= 0.9995) return "elastic";
  if (e <= 0.0005) return "perfectly inelastic";
  return "inelastic";
}

// Full before/after summary for two carts.
export function summary(m1, v1, m2, v2, e) {
  const a = collide1D(m1, v1, m2, v2, e);
  const pB = [momentum(m1, v1), momentum(m2, v2)], pA = [momentum(m1, a.v1), momentum(m2, a.v2)];
  const kB = [kinetic(m1, v1), kinetic(m2, v2)], kA = [kinetic(m1, a.v1), kinetic(m2, a.v2)];
  const vcm = centerOfMassVelocity(m1, v1, m2, v2);
  return {
    after: a, vcm,
    pBefore: pB, pAfter: pA, pTotBefore: pB[0] + pB[1], pTotAfter: pA[0] + pA[1],
    keBefore: kB, keAfter: kA, keTotBefore: kB[0] + kB[1], keTotAfter: kA[0] + kA[1],
    keLost: keLost(m1, v1, m2, v2, e), impulseOnB: m2 * (a.v2 - v2), impulseOnA: m1 * (a.v1 - v1),
    type: collisionType(e), willCollide: v1 > v2
  };
}

// ---------- track simulation ----------
// Carts are points at their centers; they touch when the gap between centers
// equals CONTACT (two half-lengths plus bumpers). The collision is treated as
// instantaneous (contact time much shorter than a frame).
export const CART = Object.freeze({ half: 0.25, bumper: 0.05 });
export const CONTACT = 2 * (CART.half + CART.bumper);
export const TRACK = Object.freeze({ x0: -1.6, x1: 1.6 });
export function newRun(c) {
  return { t: 0, x1: c.x1 ?? -0.9, x2: c.x2 ?? 0.3, v1: c.v1, v2: c.v2, m1: c.m1, m2: c.m2, e: c.e, hit: false, tHit: null, stuck: false, ended: false };
}
// Advance by dt seconds. Returns the same object, updated.
export function stepRun(r, dt) {
  if (r.ended) return r;
  let left = dt;
  if (!r.hit && r.v1 > r.v2) {
    const tc = (r.x2 - r.x1 - CONTACT) / (r.v1 - r.v2);
    if (tc <= left) {
      const t0 = Math.max(0, tc);
      r.x1 += r.v1 * t0; r.x2 += r.v2 * t0; left -= t0; r.t += t0;
      const a = collide1D(r.m1, r.v1, r.m2, r.v2, r.e);
      r.v1 = a.v1; r.v2 = a.v2; r.hit = true; r.tHit = r.t; r.stuck = r.e <= 0.0005;
    }
  }
  r.x1 += r.v1 * left; r.x2 += r.v2 * left; r.t += left;
  const lim = (x) => x < TRACK.x0 + CART.half || x > TRACK.x1 - CART.half;
  if (r.t > 20 || ((r.hit || r.v1 <= r.v2) && (lim(r.x1) || lim(r.x2)))) r.ended = true;
  return r;
}

// ---------- impulse: cart into a barrier ----------
// Contact force is modeled as a half-sine pulse of duration dt:
//   F(t) = Fpk sin(pi t / dt), 0 <= t <= dt.
// Impulse J = integral F dt = 2 Fpk dt / pi = change in momentum = m (1 + e) v.
export function barrierPulse(m, v, e, dt) {
  const J = m * (1 + e) * v;
  const Fpk = Math.PI * J / (2 * dt);
  // the cart's velocity during contact: v(t) = v - (J / 2m)(1 - cos(pi t / dt))
  const vt = (t) => v - (J / (2 * m)) * (1 - Math.cos(Math.PI * Math.min(dt, Math.max(0, t)) / dt));
  // crush (how far the front moves while in contact) peaks when v(t) = 0
  const tStop = (dt / Math.PI) * Math.acos(1 - (2 * m * v) / J);
  const crush = v * tStop - (J / (2 * m)) * (tStop - (dt / Math.PI) * Math.sin(Math.PI * tStop / dt));
  return { J, Fpk, Favg: J / dt, vAfter: -e * v, force: (t) => (t < 0 || t > dt ? 0 : Fpk * Math.sin(Math.PI * t / dt)), vt, tStop, crush, dt };
}
export const G = 9.80665;   // standard gravity, m/s^2, exact by definition (for "times the cart's weight")

// ---------- 2D glancing collision of two pucks ----------
// Puck 1 moves along +x at speed v; puck 2 is at rest. b is the impact
// parameter (sideways offset of the centers) as a fraction of 2R. The impulse
// acts along the line of centers at the moment of contact; the components
// along the contact tangent do not change (frictionless pucks).
export const PUCK_R = 0.04;   // m
export function glancing(m1, m2, v, bFrac, e) {
  const s = Math.min(0.999, Math.max(0, bFrac));
  const phi = Math.asin(s);                         // angle of the line of centers below +x
  const nx = Math.cos(phi), ny = -Math.sin(phi);    // from puck 1 to puck 2 at contact
  const vn = v * nx, vt = v * -ny;                  // puck 1 normal and tangential parts (tangent = (sin phi, cos phi))
  const a = collide1D(m1, vn, m2, 0, e);
  const tx = -ny, ty = nx;
  const v1 = { x: a.v1 * nx + vt * tx, y: a.v1 * ny + vt * ty };
  const v2 = { x: a.v2 * nx, y: a.v2 * ny };
  const deg = (o) => (Math.hypot(o.x, o.y) < 1e-9 ? 0 : (Math.atan2(o.y, o.x) * 180) / Math.PI);
  const p0 = m1 * v;
  return {
    phi, v1, v2, angle1: deg(v1), angle2: deg(v2), speed1: Math.hypot(v1.x, v1.y), speed2: Math.hypot(v2.x, v2.y),
    p: { x: m1 * v1.x + m2 * v2.x, y: m1 * v1.y + m2 * v2.y }, p0,
    keBefore: kinetic(m1, v), keAfter: kinetic(m1, Math.hypot(v1.x, v1.y)) + kinetic(m2, Math.hypot(v2.x, v2.y)),
    contact: { x: 2 * PUCK_R * nx, y: 2 * PUCK_R * ny }
  };
}

// ---------- sliders ----------
// Every slider is logarithmic over STEPS steps, so a slider value never
// jumps by 2x or more between adjacent steps (ratio = (max / min)^(1 / STEPS)).
// e = 0 and b = 0 are buttons ("Stick together", "Head-on"), not slider ends.
export const STEPS = 200;
export const SLIDERS = Object.freeze({
  m1: Object.freeze({ min: 0.25, max: 4, unit: "kg" }),
  m2: Object.freeze({ min: 0.25, max: 4, unit: "kg" }),
  v1: Object.freeze({ min: 0.1, max: 3, unit: "m/s" }),
  v2: Object.freeze({ min: 0.1, max: 3, unit: "m/s" }),
  e: Object.freeze({ min: 0.05, max: 1, unit: "" }),
  dt: Object.freeze({ min: 0.005, max: 0.5, unit: "s" }),
  bm: Object.freeze({ min: 0.25, max: 4, unit: "kg" }),
  bv: Object.freeze({ min: 0.1, max: 3, unit: "m/s" }),
  impact: Object.freeze({ min: 0.05, max: 0.95, unit: "" })
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

// ---------- presets and deep links ----------
export const PRESETS = Object.freeze({
  elastic: Object.freeze({ m1: 1, v1: 2, m2: 2, v2: 0, e: 1 }),
  inelastic: Object.freeze({ m1: 1, v1: 2, m2: 2, v2: 0, e: 0.5 }),
  sticky: Object.freeze({ m1: 1, v1: 2, m2: 2, v2: 0, e: 0 }),
  equal: Object.freeze({ m1: 1, v1: 2, m2: 1, v2: 0, e: 1 }),
  headon: Object.freeze({ m1: 1, v1: 1.5, m2: 1, v2: -1.5, e: 1 }),
  heavy: Object.freeze({ m1: 4, v1: 1, m2: 0.25, v2: 0, e: 1 })
});
export const MODES = Object.freeze(["carts", "impulse", "com", "glancing", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  carts: "carts", collisions: "carts", collision: "carts", "1d": "carts", momentum: "carts", conservation: "carts",
  impulse: "impulse", barrier: "impulse", crumple: "impulse", force: "impulse", "force-time": "impulse",
  com: "com", cm: "com", "center-of-mass": "com", frame: "com", "cm-frame": "com",
  glancing: "glancing", "2d": "glancing", pucks: "glancing", oblique: "glancing",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const mode = MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "carts";
  let preset = (p.get("preset") || p.get("type") || "").trim().toLowerCase();
  if (preset === "perfectly-inelastic" || preset === "stick") preset = "sticky";
  if (!PRESETS[preset]) preset = null;
  return { mode, preset };
}

// ---------- formatting ----------
const MINUS = "\u2212";
export function num(x, d = 2) {
  if (!Number.isFinite(x)) return "n/a";
  const s = x.toFixed(d);
  if (Number(s) === 0) return (0).toFixed(d);
  return x < 0 ? MINUS + s.slice(1) : s;
}
// 3 significant figures for values that span decades (forces, times).
export function sig(x, unit) {
  if (!Number.isFinite(x)) return "n/a";
  if (x === 0) return `0 ${unit}`;
  const a = Math.abs(x);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return `${x < 0 ? MINUS : ""}${a.toFixed(d)} ${unit}`;
}
export function fmtTime(s) { return s < 1 ? `${+(s * 1000).toPrecision(3)} ms` : `${+s.toPrecision(3)} s`; }

// ---------- art anchors (from assets/MANIFEST.md) ----------
export const ART = Object.freeze({
  cart: Object.freeze({ w: 1024, h: 512, bodyX: [112, 912], bodyY: [200, 360], mountY: 300, contactY: 490 }),
  track: Object.freeze({ w: 1024, h: 128, railTop: 40 }),
  barrier: Object.freeze({ w: 512, h: 1024, face: 60, base: 1000 }),
  puck: Object.freeze({ size: 256, r: 118 })
});
// Which cart sprite shows a mass: no blocks, one block, two blocks.
export function cartSprite(m) { return m < 0.75 ? "cart-light" : m < 1.75 ? "cart-medium" : "cart-heavy"; }
