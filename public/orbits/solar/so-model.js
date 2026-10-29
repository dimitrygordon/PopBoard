// Orbits: "Solar System" mode model. Fling planets around a star, keep the system stable.
// Units: AU, years, solar masses, so G = 4 pi^2 and a 1 AU circular orbit around 1 Msun takes 1 year.
// Pure functions only (no DOM), so tests run in Node. Every value: Cleared by Tesla 2026-10-29.
export const MODULE_ID = "orbits-solar";
export const G = 4 * Math.PI * Math.PI;   // AU^3 / (Msun yr^2) (Cleared by Tesla 2026-10-29)
export const STAR_MASS = { min: 0.5, max: 2, dflt: 1 }; // Msun, sandbox slider (Cleared by Tesla 2026-10-29)
export const SPEEDS = [0.25, 1, 5, 20, 50, 100];        // simulated years per real second
export const DEFAULT_SPEED = 2;                          // index into SPEEDS: 5 yr/s
export const MAX_PLANETS = 12;
export const SOFTENING = 1e-4;            // AU, Plummer softening for close passes
export const STEPS_PER_ORBIT = 150;       // leapfrog steps per orbit of the innermost body
export const MAX_SUBSTEPS = 1500;         // per frame; past this the sim falls behind real time
export const SUN_CONTACT_AU = 0.15;       // closer than this to the star counts as falling in (display size, Cleared by Tesla 2026-10-29)
export const EJECT_AU = 80;               // unbound and past this distance counts as ejected (Cleared by Tesla 2026-10-29)
export const DIST_POWER = 0.4;            // screen radius ~ r^0.4: "Not to scale." (display only)
export const CONTACT_K = 0.08;            // planets merge closer than CONTACT_K * r^(1 - DIST_POWER) AU (display contact)
export const PULL_PX = 70;                // a 70 px pull launches at the local circular speed
export const NOT_TO_SCALE = "Not to scale.";
export const MODEL_NOTE = "Sizes and distances are not to scale: distances are squeezed so Neptune fits on screen, and every planet is drawn far bigger than it really is. The motion itself uses real gravity in AU, years and solar masses.";

// Real planets (Cleared by Tesla 2026-10-29): semi-major axis a in AU, mass in Msun, display radius in px at the reference scale.
export const PLANETS = Object.freeze({
  mercury: { name: "Mercury", a: 0.387, m: 1.66e-7, px: 7,  caption: "Heavily cratered, a lot like our Moon." },
  venus:   { name: "Venus",   a: 0.723, m: 2.45e-6, px: 10, caption: "Thick clouds hide the surface." },
  earth:   { name: "Earth",   a: 1.000, m: 3.00e-6, px: 10, caption: "Oceans, clouds and a polar cap." },
  mars:    { name: "Mars",    a: 1.524, m: 3.23e-7, px: 8,  caption: "Valles Marineris canyon and a polar cap." },
  jupiter: { name: "Jupiter", a: 5.203, m: 9.55e-4, px: 18, caption: "The Great Red Spot is a storm wider than Earth." },
  saturn:  { name: "Saturn",  a: 9.537, m: 2.86e-4, px: 16, caption: "Rings of ice and rock, with gaps between them." },
  uranus:  { name: "Uranus",  a: 19.19, m: 4.37e-5, px: 13, caption: "Tipped on its side, rings and all." },
  neptune: { name: "Neptune", a: 30.07, m: 5.15e-5, px: 13, caption: "Dark spot as seen by Voyager 2 in 1989." }
});
export const ORDER = Object.keys(PLANETS);
export const SUN = { name: "Sun", px: 26, caption: "Our star, with sunspots on its face." };
export const MOON = { name: "Moon", periodYr: 27.32 / 365.25, caption: "Earth's Moon goes around once every 27.3 days." };

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const periodYears = (a, M = 1) => Math.sqrt(a ** 3 / M);        // Kepler's third law in these units
export const circularSpeed = (r, M = 1) => Math.sqrt(G * M / r);       // AU/yr; 2 pi at 1 AU
export const escapeSpeed = (r, M = 1) => Math.sqrt(2 * G * M / r);
export const contactDistance = (r) => CONTACT_K * Math.pow(Math.max(r, 0.1), 1 - DIST_POWER);

// ---------- display mapping (screen radius ~ r^DIST_POWER) ----------
export const squash = (r, k) => k * Math.pow(Math.max(0, r), DIST_POWER);
export const unsquash = (rho, k) => Math.pow(Math.max(0, rho) / k, 1 / DIST_POWER);
export function toScreen(x, y, k) { const r = Math.hypot(x, y); if (r === 0) return { x: 0, y: 0 }; const s = squash(r, k) / r; return { x: x * s, y: -y * s }; }
export function toWorld(sx, sy, k) { const rho = Math.hypot(sx, sy); if (rho === 0) return { x: 0, y: 0 }; const s = unsquash(rho, k) / rho; return { x: sx * s, y: -sy * s }; }

// ---------- system ----------
let nextId = 1;
export function createSystem(starMass = STAR_MASS.dflt) { return { M: clamp(starMass, STAR_MASS.min, STAR_MASS.max), t: 0, bodies: [], events: [], stableSince: 0 }; }
export function makePlanet(key, x, y, vx, vy) { const p = PLANETS[key]; return { id: nextId++, key, name: p.name, m: p.m, x, y, vx, vy }; }
// Circular orbit, counterclockwise, around the star (plus the planets' small pull ignored).
export function circularAt(sys, x, y) { const r = Math.hypot(x, y), v = circularSpeed(r, sys.M); return { vx: -y / r * v, vy: x / r * v }; }
// Fling: tap (pull under 8 px) gives a circular orbit; a pull of PULL_PX gives the local circular
// speed, aimed opposite the pull (slingshot), capped at twice that.
export function flingVelocity(sys, x, y, pullX, pullY) {
  const L = Math.hypot(pullX, pullY);
  if (L < 8) return circularAt(sys, x, y);
  const v = circularSpeed(Math.hypot(x, y), sys.M) * Math.min(2, L / PULL_PX);
  return { vx: -pullX / L * v, vy: pullY / L * v }; // screen y points down
}
export function addPlanet(sys, key, x, y, vx, vy) {
  if (!PLANETS[key] || sys.bodies.length >= MAX_PLANETS) return null;
  if (vx === undefined) ({ vx, vy } = circularAt(sys, x, y));
  const b = makePlanet(key, x, y, vx, vy); sys.bodies.push(b); touch(sys); return b;
}
export function removePlanet(sys, id) { const n = sys.bodies.length; sys.bodies = sys.bodies.filter((b) => b.id !== id); if (sys.bodies.length !== n) touch(sys); }
export const touch = (sys) => { sys.stableSince = sys.t; };
export function realSystem(starMass = 1) {
  const sys = createSystem(starMass);
  ORDER.forEach((k, i) => { const th = i * 2.4, a = PLANETS[k].a; addPlanet(sys, k, a * Math.cos(th), a * Math.sin(th)); });
  return sys;
}

// ---------- gravity (star fixed at the origin, planets pull on each other) ----------
function accel(sys) {
  const bs = sys.bodies, n = bs.length, ax = new Float64Array(n), ay = new Float64Array(n), e2 = SOFTENING * SOFTENING;
  for (let i = 0; i < n; i++) {
    const r2 = bs[i].x ** 2 + bs[i].y ** 2, r3 = Math.pow(r2 + e2, 1.5);
    ax[i] -= G * sys.M * bs[i].x / r3; ay[i] -= G * sys.M * bs[i].y / r3;
    for (let j = i + 1; j < n; j++) {
      const dx = bs[j].x - bs[i].x, dy = bs[j].y - bs[i].y, d3 = Math.pow(dx * dx + dy * dy + e2, 1.5);
      ax[i] += G * bs[j].m * dx / d3; ay[i] += G * bs[j].m * dy / d3; ax[j] -= G * bs[i].m * dx / d3; ay[j] -= G * bs[i].m * dy / d3;
    }
  }
  return { ax, ay };
}
export function stepSize(sys) {
  let h = 0.05;
  const bs = sys.bodies;
  for (let i = 0; i < bs.length; i++) {
    const r = Math.max(SUN_CONTACT_AU, Math.hypot(bs[i].x, bs[i].y));
    h = Math.min(h, periodYears(r, sys.M) / STEPS_PER_ORBIT);
    for (let j = i + 1; j < bs.length; j++) {
      const d = Math.max(SOFTENING, Math.hypot(bs[j].x - bs[i].x, bs[j].y - bs[i].y));
      h = Math.min(h, 0.02 * Math.sqrt(d ** 3 / (G * (bs[i].m + bs[j].m))));
    }
  }
  return Math.max(h, 1e-6);
}
// Advance by dt years (kick-drift-kick leapfrog). Returns the years actually simulated.
export function step(sys, dt, maxSub = MAX_SUBSTEPS) {
  let done = 0, n = 0;
  while (done < dt - 1e-12 && n < maxSub && sys.bodies.length) {
    const h = Math.min(stepSize(sys), dt - done);
    let a = accel(sys);
    for (let i = 0; i < sys.bodies.length; i++) { const b = sys.bodies[i]; b.vx += 0.5 * h * a.ax[i]; b.vy += 0.5 * h * a.ay[i]; b.x += h * b.vx; b.y += h * b.vy; }
    a = accel(sys);
    for (let i = 0; i < sys.bodies.length; i++) { const b = sys.bodies[i]; b.vx += 0.5 * h * a.ax[i]; b.vy += 0.5 * h * a.ay[i]; }
    done += h; n++; sys.t += h;
    resolve(sys);
  }
  if (!sys.bodies.length) done = dt; // an empty sky does not run the clock
  return done;
}
export const energy = (sys, b) => 0.5 * (b.vx ** 2 + b.vy ** 2) - G * sys.M / Math.hypot(b.x, b.y);
export const isBound = (sys, b) => energy(sys, b) < 0;
export function totalEnergy(sys) {
  let e = 0; const bs = sys.bodies;
  for (let i = 0; i < bs.length; i++) { e += bs[i].m * energy(sys, bs[i]); for (let j = i + 1; j < bs.length; j++) e -= G * bs[i].m * bs[j].m / Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y); }
  return e;
}
// Merges, falls into the star, ejections. Each one resets the stability timer.
export function resolve(sys) {
  const bs = sys.bodies;
  for (let i = bs.length - 1; i >= 0; i--) {
    const b = bs[i], r = Math.hypot(b.x, b.y);
    if (r < SUN_CONTACT_AU) { bs.splice(i, 1); sys.events.push({ type: "star", id: b.id, name: b.name, x: b.x, y: b.y }); touch(sys); }
    else if (r > EJECT_AU && isBound(sys, b) === false) { bs.splice(i, 1); sys.events.push({ type: "eject", id: b.id, name: b.name, x: b.x, y: b.y }); touch(sys); }
  }
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < contactDistance(Math.hypot(a.x, a.y))) {
      const [big, small] = a.m >= b.m ? [a, b] : [b, a], m = big.m + small.m;
      big.x = (big.x * big.m + small.x * small.m) / m; big.y = (big.y * big.m + small.y * small.m) / m;
      big.vx = (big.vx * big.m + small.vx * small.m) / m; big.vy = (big.vy * big.m + small.vy * small.m) / m; big.m = m;
      bs.splice(bs.indexOf(small), 1);
      sys.events.push({ type: "merge", id: big.id, gone: small.id, name: big.name, other: small.name, x: big.x, y: big.y }); touch(sys);
      return resolve(sys);
    }
  }
}
// Years the system has run with no merge, fall, ejection or edit, and every planet bound.
export const stableYears = (sys) => (sys.bodies.length && sys.bodies.every((b) => isBound(sys, b)) ? sys.t - sys.stableSince : 0);

export function elements(sys, b) {
  const r = Math.hypot(b.x, b.y), v2 = b.vx ** 2 + b.vy ** 2, mu = G * sys.M, eps = v2 / 2 - mu / r;
  const h = b.x * b.vy - b.y * b.vx, a = eps < 0 ? -mu / (2 * eps) : Infinity, e = Math.sqrt(Math.max(0, 1 + 2 * eps * h * h / (mu * mu)));
  return { r, v: Math.sqrt(v2), a, e, period: Number.isFinite(a) ? periodYears(a, sys.M) : Infinity, bound: eps < 0 };
}
// Predicted path (for the fling ghost), star only: cheap Kepler-free leapfrog.
export function predictPath(sys, x, y, vx, vy, years = 2, n = 240) {
  const out = [x, y]; let h = years / n;
  for (let i = 0; i < n * 4; i++) {
    const hh = Math.min(h, periodYears(Math.max(SUN_CONTACT_AU, Math.hypot(x, y)), sys.M) / STEPS_PER_ORBIT);
    let r3 = Math.hypot(x, y) ** 3; vx -= 0.5 * hh * G * sys.M * x / r3; vy -= 0.5 * hh * G * sys.M * y / r3;
    x += hh * vx; y += hh * vy;
    r3 = Math.hypot(x, y) ** 3; vx -= 0.5 * hh * G * sys.M * x / r3; vy -= 0.5 * hh * G * sys.M * y / r3;
    if (i % 4 === 3) out.push(x, y);
    const r = Math.hypot(x, y); if (r < SUN_CONTACT_AU || r > EJECT_AU) break;
  }
  return out;
}

// ---------- challenges (Build tab only) ----------
export const FUN = { bronze: { n: 2, yr: 10 }, silver: { n: 4, yr: 100 }, gold: { n: 4, yr: 1000 } }; // Cleared by Tesla 2026-10-29
export const GOALS = [
  { tier: "bronze", title: "Keep 2 planets stable for 10 years", check: (e) => e.type === "solar" && e.n >= FUN.bronze.n && e.stable >= FUN.bronze.yr },
  { tier: "silver", title: "Keep 4 planets stable for 100 years", check: (e) => e.type === "solar" && e.n >= FUN.silver.n && e.stable >= FUN.silver.yr },
  { tier: "gold", title: "Keep 4 planets stable for 1,000 simulated years", check: (e) => e.type === "solar" && e.n >= FUN.gold.n && e.stable >= FUN.gold.yr }
];

// ---------- share link (Sandbox) ----------
const AU = { type: "num", min: -EJECT_AU, max: EJECT_AU }, VEL = { type: "num", min: -60, max: 60 };
export const SHARE_SCHEMA = { sm: { type: "num", min: STAR_MASS.min, max: STAR_MASS.max }, sp: { type: "num", min: 0, max: SPEEDS.length - 1 } };
for (let i = 0; i < MAX_PLANETS; i++) Object.assign(SHARE_SCHEMA, { [`p${i}k`]: { type: "enum", values: ORDER }, [`p${i}x`]: AU, [`p${i}y`]: AU, [`p${i}u`]: VEL, [`p${i}v`]: VEL });
export function toShare(sys, speed) {
  const o = { sm: sys.M, sp: speed }; const r = (v) => +v.toFixed(4);
  sys.bodies.forEach((b, i) => Object.assign(o, { [`p${i}k`]: b.key, [`p${i}x`]: r(b.x), [`p${i}y`]: r(b.y), [`p${i}u`]: r(b.vx), [`p${i}v`]: r(b.vy) }));
  return o;
}
export function fromShare(o) {
  const sys = createSystem(o.sm ?? 1);
  for (let i = 0; i < MAX_PLANETS; i++) {
    const k = o[`p${i}k`], f = [o[`p${i}x`], o[`p${i}y`], o[`p${i}u`], o[`p${i}v`]];
    if (k && f.every(Number.isFinite) && Math.hypot(f[0], f[1]) >= SUN_CONTACT_AU) addPlanet(sys, k, ...f);
  }
  touch(sys);
  return { sys, speed: Math.round(clamp(o.sp ?? DEFAULT_SPEED, 0, SPEEDS.length - 1)) };
}
