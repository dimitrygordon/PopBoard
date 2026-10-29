// Projectile Motion: pure physics, data and formatting. No DOM.
// Every equation, value and source is in docs/projectile-science.md.

// ---------- constants ----------
export const G_STANDARD = 9.80665;          // m/s^2, standard gravity (CGPM 1901)
export const RHO_SEA_LEVEL = 1.225;         // kg/m^3, ISA sea-level air density
export const CD_SPHERE = 0.47;              // drag coefficient of a smooth sphere, subcritical Reynolds number
export const IRON_DENSITY = 7870;           // kg/m^3

// Surface gravity (m/s^2). Earth uses standard gravity; the rest are from the
// NASA NSSDCA Planetary Fact Sheet (gas giants: at the 1 bar level).
export const WORLDS = Object.freeze({
  earth: Object.freeze({ name: "Earth", g: G_STANDARD }),
  moon: Object.freeze({ name: "Moon", g: 1.6 }),
  mars: Object.freeze({ name: "Mars", g: 3.7 }),
  mercury: Object.freeze({ name: "Mercury", g: 3.7 }),
  venus: Object.freeze({ name: "Venus", g: 8.9 }),
  jupiter: Object.freeze({ name: "Jupiter", g: 23.1 }),
  saturn: Object.freeze({ name: "Saturn", g: 9.0 }),
  uranus: Object.freeze({ name: "Uranus", g: 8.7 }),
  neptune: Object.freeze({ name: "Neptune", g: 11.0 }),
  pluto: Object.freeze({ name: "Pluto", g: 0.7 })
});
export const WORLD_IDS = Object.freeze(Object.keys(WORLDS));

function ironBall(m) { return Math.cbrt(6 * m / (Math.PI * IRON_DENSITY)); }
// Projectiles: mass (kg) and diameter (m).
export const BALLS = Object.freeze({
  cannonball: Object.freeze({ name: "Cannonball", m: 2.72, d: ironBall(2.72), art: "cannonball" }),   // 6 lb iron shot
  basketball: Object.freeze({ name: "Basketball", m: 0.62, d: 0.239, art: "basketball" }),           // size 7
  soccer: Object.freeze({ name: "Soccer ball", m: 0.43, d: 0.22, art: "soccer-ball" })                // size 5
});
export const BALL_IDS = Object.freeze(Object.keys(BALLS));

const RAD = Math.PI / 180;

// ---------- ideal (no air) ----------
// Launch from (0, h) at speed v and angle theta (deg) above horizontal, constant g down.
export function components(v, angleDeg) {
  return { vx: v * Math.cos(angleDeg * RAD), vy: v * Math.sin(angleDeg * RAD) };
}
export function ideal({ v, angle, h = 0, g = G_STANDARD }) {
  const { vx, vy } = components(v, angle);
  const tFlight = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
  const tApex = Math.max(0, vy / g);
  const maxHeight = h + (vy > 0 ? vy * vy / (2 * g) : 0);
  const range = vx * tFlight;
  const vyLand = vy - g * tFlight;
  return { vx, vy, tFlight, tApex, maxHeight, range, vLand: Math.hypot(vx, vyLand), vyLand,
    landAngle: Math.atan2(-vyLand, vx) / RAD };
}
export function idealAt({ v, angle, h = 0, g = G_STANDARD }, t) {
  const { vx, vy } = components(v, angle);
  return { x: vx * t, y: h + vy * t - 0.5 * g * t * t, vx, vy: vy - g * t };
}
// Level ground range formula R = v^2 sin(2 theta) / g.
export function levelRange(v, angle, g = G_STANDARD) { return v * v * Math.sin(2 * angle * RAD) / g; }
export function idealPath(p, n = 120) {
  const r = ideal(p), out = [];
  for (let i = 0; i <= n; i++) { const s = idealAt(p, r.tFlight * i / n); out.push({ t: r.tFlight * i / n, x: s.x, y: Math.max(0, s.y) }); }
  return out;
}

// ---------- with quadratic air drag ----------
// F = 1/2 rho Cd A v^2, opposite the velocity. k/m is the drag per unit mass factor.
export function dragK({ rho = RHO_SEA_LEVEL, cd = CD_SPHERE, d, m }) { return 0.5 * rho * cd * Math.PI * d * d / 4 / m; }
export function terminalSpeed({ g = G_STANDARD, ...b }) { return Math.sqrt(g / dragK(b)); }

function accel(vx, vy, g, k) { const s = Math.hypot(vx, vy); return [-k * s * vx, -g - k * s * vy]; }
// RK4 integration until the projectile comes back to y = 0. Returns the sampled path
// and the same summary numbers as ideal().
export function simulate({ v, angle, h = 0, g = G_STANDARD, drag = true, rho = RHO_SEA_LEVEL, cd = CD_SPHERE, m = 1, d = 0.1 }) {
  const k = drag ? dragK({ rho, cd, d, m }) : 0;
  let { vx, vy } = components(v, angle);
  let x = 0, y = h, t = 0, maxHeight = h, tApex = 0;
  const T0 = ideal({ v, angle, h, g }).tFlight;
  const dt = Math.max(1e-4, T0 / 2000);
  const path = [{ t, x, y }];
  for (let i = 0; i < 400000; i++) {
    const f = (X, Y, VX, VY) => { const [ax, ay] = accel(VX, VY, g, k); return [VX, VY, ax, ay]; };
    const k1 = f(x, y, vx, vy);
    const k2 = f(x + k1[0] * dt / 2, y + k1[1] * dt / 2, vx + k1[2] * dt / 2, vy + k1[3] * dt / 2);
    const k3 = f(x + k2[0] * dt / 2, y + k2[1] * dt / 2, vx + k2[2] * dt / 2, vy + k2[3] * dt / 2);
    const k4 = f(x + k3[0] * dt, y + k3[1] * dt, vx + k3[2] * dt, vy + k3[3] * dt);
    const nx = x + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    const ny = y + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    const nvx = vx + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    const nvy = vy + dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
    if (ny <= 0 && i > 0) {
      const f0 = y / (y - ny);               // linear interpolation to the ground
      x += (nx - x) * f0; t += dt * f0; vx += (nvx - vx) * f0; vy += (nvy - vy) * f0; y = 0;
      path.push({ t, x, y });
      break;
    }
    x = nx; y = ny; vx = nvx; vy = nvy; t += dt;
    if (y > maxHeight) { maxHeight = y; tApex = t; }
    if (i % 10 === 0) path.push({ t, x, y });
  }
  return { path, range: x, tFlight: t, maxHeight, tApex, vLand: Math.hypot(vx, vy), landAngle: Math.atan2(-vy, vx) / RAD, k };
}
export function sampleAt(path, t) {
  if (t <= path[0].t) return path[0];
  for (let i = 1; i < path.length; i++) {
    if (path[i].t >= t) { const a = path[i - 1], b = path[i], f = (t - a.t) / (b.t - a.t || 1);
      return { t, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
  }
  return path[path.length - 1];
}
// Angle (whole degrees, 5..85) that gives the longest range.
export function bestAngle(p) {
  let best = 5, bestR = -1;
  for (let a = 5; a <= 85; a++) { const r = p.drag ? simulate({ ...p, angle: a }).range : ideal({ ...p, angle: a }).range; if (r > bestR) { bestR = r; best = a; } }
  return { angle: best, range: bestR };
}

// ---------- target challenge ----------
// Bullseye: a vertical board. Ring radii from the art (outer r 440 of 1024 px).
export const BULLSEYE_R = 1.5;   // m, outer ring radius in the world
export const RING_FRACTIONS = Object.freeze([440, 360, 280, 200, 120, 50].map((r) => r / 440));
export const RING_POINTS = Object.freeze([1, 2, 3, 5, 8, 10]);
export const CART_HALF = 1.5;    // m, half the width of the cart's catch box
// Height of the path where it crosses x = X (null if it lands first).
export function heightAtX(path, X) {
  for (let i = 1; i < path.length; i++) {
    if (path[i].x >= X) { const a = path[i - 1], b = path[i], f = (X - a.x) / (b.x - a.x || 1); return a.y + (b.y - a.y) * f; }
  }
  return null;
}
export function scoreBullseye(path, X, centerY) {
  const y = heightAtX(path, X);
  if (y == null) return { points: 0, miss: Math.abs(path[path.length - 1].x - X), y: null };
  const off = Math.abs(y - centerY) / BULLSEYE_R;
  let points = 0;
  RING_FRACTIONS.forEach((f, i) => { if (off <= f) points = RING_POINTS[i]; });
  return { points, off: Math.abs(y - centerY), y };
}
export function scoreCart(range, X) { return { caught: Math.abs(range - X) <= CART_HALF, off: range - X }; }
// A new target position from a random number u in [0, 1).
export function newTarget(u, kind) {
  const d = Math.round(12 + u * 48);    // 12 m to 60 m
  return kind === "cart" ? { kind, x: d } : { kind, x: d, y: 1.5 + Math.round(((u * 7919) % 1) * 6) };
}

// ---------- sliders ----------
// Angle is linear in 1 degree steps from 5 to 85 degrees. The rest are logarithmic
// over STEPS steps, so no shown value jumps by 2x or more between adjacent steps.
export const STEPS = 200;
export const SLIDERS = Object.freeze({
  angle: Object.freeze({ min: 5, max: 85, linear: true, step: 1 }),
  speed: Object.freeze({ min: 2, max: 60 }),
  height: Object.freeze({ min: 0.5, max: 100 }),
  g: Object.freeze({ min: 0.5, max: 30 }),
  cd: Object.freeze({ min: 0.1, max: 1.5 }),
  rho: Object.freeze({ min: 0.01, max: 70 }),
  mass: Object.freeze({ min: 0.05, max: 10 }),
  diameter: Object.freeze({ min: 0.02, max: 0.5 })
});
export function sliderSteps(name) { const s = SLIDERS[name]; return s.linear ? Math.round((s.max - s.min) / s.step) : STEPS; }
export function fromSlider(name, step) {
  const s = SLIDERS[name], n = sliderSteps(name), u = Math.min(n, Math.max(0, Math.round(step))) / n;
  return s.linear ? s.min + u * (s.max - s.min) : s.min * (s.max / s.min) ** u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name], n = sliderSteps(name);
  const u = s.linear ? (value - s.min) / (s.max - s.min) : Math.log(value / s.min) / Math.log(s.max / s.min);
  return Math.min(n, Math.max(0, Math.round(u * n)));
}

// ---------- deep links ----------
export const MODES = Object.freeze(["launch", "components", "drag", "target", "planets", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  launch: "launch", basics: "launch", trajectory: "launch", range: "launch",
  components: "components", vectors: "components", velocity: "components",
  drag: "drag", air: "drag", "air-drag": "drag", resistance: "drag",
  target: "target", challenge: "target", bullseye: "target", game: "target",
  planets: "planets", worlds: "planets", gravity: "planets",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const mode = MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "launch";
  let world = (p.get("world") || p.get("planet") || "").trim().toLowerCase();
  if (!WORLDS[world]) world = null;
  let ball = (p.get("ball") || "").trim().toLowerCase();
  if (!BALLS[ball]) ball = null;
  return { mode, world, ball };
}

// ---------- formatting ----------
export function fmtNum(x, digits = 3) {
  if (!Number.isFinite(x)) return "very large";
  if (Math.abs(x) < 1e-9) return "0";
  if (Math.abs(x) >= 1000) return String(Math.round(x));
  return String(+x.toPrecision(digits));
}
export const fmtM = (x) => `${fmtNum(x)} m`;
export const fmtS = (x) => `${fmtNum(x)} s`;
export const fmtV = (x) => `${fmtNum(x)} m/s`;
export const fmtG = (x) => `${fmtNum(x)} m/s\u00b2`;
export const fmtDeg = (x) => `${fmtNum(x)}\u00b0`;
export const fmtKg = (x) => (x < 1 ? `${fmtNum(x * 1000)} g` : `${fmtNum(x)} kg`);
export const fmtD = (x) => `${fmtNum(x * 100)} cm`;
export const fmtRho = (x) => `${fmtNum(x)} kg/m\u00b3`;

// ---------- art anchors (from assets/MANIFEST.md) ----------
export const ART = Object.freeze({
  barrel: Object.freeze({ w: 1024, h: 256, pivot: [300, 128], muzzle: [980, 128] }),
  base: Object.freeze({ w: 1024, h: 512, socket: [420, 170], ground: 500 }),
  ball: Object.freeze({ size: 256, r: 90 }),
  bullseye: Object.freeze({ size: 1024, center: [512, 512], r: 440 }),
  cart: Object.freeze({ size: 1024 }),
  cliff: Object.freeze({ size: 1024, ledgeY: 53, edgeX: 378 }),
  tower: Object.freeze({ size: 1024, topY: 31, feetY: 992 }),
  ground: Object.freeze({ w: 1024, h: 128, surfaceY: 24 })
});
