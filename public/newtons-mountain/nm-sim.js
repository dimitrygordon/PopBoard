// Newton's Mountain: the physics. Pure and node-testable, no DOM, no three.js.
// 2D motion in the flight plane, inverse-square gravity, velocity Verlet in kick-drift-kick form, fixed dt = 0.5 s of
// sim time, double precision (spec_v1 section 8). Earth does not rotate. The ball is a point mass. The sim is the truth
// the student sees. classify() only supplies words.
import { NM_CONFIG } from "./nm-config.js";

export const DT = NM_CONFIG.dt;
export const consts = (name) => NM_CONFIG.CONSTS[name] || NM_CONFIG.CONSTS[NM_CONFIG.consts];

// ---------- derived values, always computed, never typed (8.2) ----------
export const vCirc = (GM, r) => Math.sqrt(GM / r);
export const vEsc = (GM, r) => Math.sqrt((2 * GM) / r);
export const gAt = (GM, r) => GM / (r * r);
export const periodAt = (GM, r) => 2 * Math.PI * Math.sqrt((r * r * r) / GM);
/** How far below v_circ a horizontal shot can be and still miss the ground. */
export function landsWindow({ GM, R }, h) { const r = R + h, q = R / r; return vCirc(GM, r) * (1 - Math.sqrt((2 * q) / (1 + q))); }
export function derived(c, h) {
  const r = c.R + h;
  return { r, vCirc: vCirc(c.GM, r), vEsc: vEsc(c.GM, r), period: periodAt(c.GM, r), g: gAt(c.GM, r), gRatio: gAt(c.GM, r) / gAt(c.GM, c.R), window: landsWindow(c, h) };
}

// ---------- analytic classifier (8.3), words only ----------
/** Lowest altitude (m) on the path of a horizontal launch, from conic geometry. */
export function periapsisAlt({ GM, R }, h, v) {
  const r0 = R + h, vc = vCirc(GM, r0);
  if (v >= vc) return h;
  const x = (v / vc) ** 2;
  return (r0 * x) / (2 - x) - R;
}
/** "lands" | "bound" | "escapes" */
export function classify({ GM, R }, h, v) {
  const r0 = R + h;
  if (0.5 * v * v - GM / r0 >= 0) return "escapes";
  return periapsisAlt({ GM, R }, h, v) < 0 ? "lands" : "bound";
}

// ---------- shots ----------
/** drag: null | { rho(altM), beta } where beta = m / (Cd A). gdial: percent of GM (B2). */
export function makeShot({ GM, R, h, v, drag = null, gdial = 100 }) {
  const s = { GM, R, h, v0: v, drag, gdial, x: R + h, y: 0, vx: 0, vy: v, t: 0, ax: 0, ay: 0, swept: 0,
    minR: R + h, maxR: R + h, status: "flying", lapped: false, landing: null, speedNow: v };
  accel(s); return s;
}
function accel(s) {
  const r = Math.hypot(s.x, s.y), gm = s.GM * (s.gdial / 100);
  let ax = (-gm * s.x) / (r * r * r), ay = (-gm * s.y) / (r * r * r);
  if (s.drag) { const sp = Math.hypot(s.vx, s.vy), k = (0.5 * s.drag.rho(r - s.R) * sp) / s.drag.beta; ax -= k * s.vx; ay -= k * s.vy; }
  s.ax = ax; s.ay = ay;
}
/** One fixed step. Sets status to "landed", "left" (past 100 R) or "timeout" (7 days) when the shot ends. */
export function stepShot(s, dt = DT) {
  if (s.status !== "flying") return s;
  const xo = s.x, yo = s.y;
  s.vx += 0.5 * dt * s.ax; s.vy += 0.5 * dt * s.ay;
  s.x += dt * s.vx; s.y += dt * s.vy;
  accel(s);
  s.vx += 0.5 * dt * s.ax; s.vy += 0.5 * dt * s.ay;
  s.t += dt;
  const r = Math.hypot(s.x, s.y);
  s.swept += Math.atan2(xo * s.y - yo * s.x, xo * s.x + yo * s.y);
  if (r < s.minR) s.minR = r; if (r > s.maxR) s.maxR = r;
  s.speedNow = Math.hypot(s.vx, s.vy);
  if (r <= s.R) { // interpolate the impact linearly in r between the last two states
    const r1 = Math.hypot(xo, yo), f = (r1 - s.R) / (r1 - r);
    const ix = xo + (s.x - xo) * f, iy = yo + (s.y - yo) * f;
    const part = Math.atan2(xo * iy - yo * ix, xo * ix + yo * iy);
    const angle = s.swept - Math.atan2(xo * s.y - yo * s.x, xo * s.x + yo * s.y) + part;
    s.status = "landed"; s.landing = { t: s.t - dt + dt * f, x: ix, y: iy, angle, range: s.R * angle };
    s.x = ix; s.y = iy; s.swept = angle; s.t = s.landing.t; s.speedNow = Math.hypot(s.vx, s.vy);
  } else if (r >= NM_CONFIG.endRadii * s.R) s.status = "left";
  else if (s.t >= NM_CONFIG.endDays * 86400) s.status = "timeout";
  if (!s.lapped && s.swept >= 2 * Math.PI) s.lapped = true;
  return s;
}
export const altitudeNow = (s) => (s.status === "landed" ? 0 : Math.hypot(s.x, s.y) - s.R);
export const lapsNow = (s) => s.swept / (2 * Math.PI);
/** Ground distance under the ball: great-circle arc at Earth's surface. */
export const groundDistanceNow = (s) => s.R * s.swept;

/** Run a shot headlessly until it ends, or until stop(s) is true, or tmax. Returns the shot. */
export function runShot(params, { tmax = Infinity, stop = null, onStep = null } = {}) {
  const s = makeShot(params);
  while (s.status === "flying" && s.t < tmax) { stepShot(s); if (onStep) onStep(s); if (stop && stop(s)) break; }
  return s;
}

// ---------- readable outcomes (level 0 wording is neutral: never "orbit" or "escape", spec 5.2) ----------
export function outcomeOf(s) {
  if (s.status === "landed") return "landed";
  if (s.status === "timeout") return s.lapped ? "flying-lap" : "left";
  if (s.status === "left") return "left";
  return s.lapped ? "flying-lap" : "flying";
}

// ---------- Smart pace (4.6) ----------
export function nearestRung(w, ladder = NM_CONFIG.warpLadder) {
  let best = ladder[0];
  for (const l of ladder) if (Math.abs(Math.log(l / w)) < Math.abs(Math.log(best / w))) best = l;
  return best;
}
/** Warp rung for a new shot: run headlessly to the first of landing, one full lap, or 6,000 s; pick the rung nearest T/12 s in log distance. */
export function smartPace(params) {
  const s = runShot(params, { tmax: NM_CONFIG.smartPaceCapS, stop: (q) => q.swept >= 2 * Math.PI });
  return { tEvent: s.t, warp: nearestRung(s.t / NM_CONFIG.smartPaceSeconds) };
}
/** How many fixed steps to run this frame. accum carries the fraction. The clock falls behind rather than taking bigger steps. */
export function stepsFor(accum, warp, wallDt) {
  const total = accum + (warp * wallDt) / DT;
  let n = Math.floor(total);
  if (n > NM_CONFIG.stepCapPerFrame) return { n: NM_CONFIG.stepCapPerFrame, accum: 0, capped: true };
  return { n, accum: total - n, capped: false };
}

// ---------- Fall check (B5, help level 2) ----------
export function fallCheck({ GM, R }, r, v) {
  const g = gAt(GM, r), fall = 0.5 * g, curve = r - Math.sqrt(r * r - v * v);
  return { g, fall, curve, match: Math.abs(fall - curve) / fall < 0.005 };
}

// ---------- Brackets (5.2): the student's own shots at this height ----------
/** shots: [{ v, landed }] where landed is true, false (did not land) or null (not decided yet). */
export function bracketOf(shots) {
  let lo = null, hi = null;
  for (const s of shots) {
    if (s.landed === true) lo = lo === null ? s.v : Math.max(lo, s.v);
    else if (s.landed === false) hi = hi === null ? s.v : Math.min(hi, s.v);
  }
  return { highestLanded: lo, lowestNotLanded: hi, gap: lo !== null && hi !== null ? hi - lo : null };
}
