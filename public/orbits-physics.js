// Orbital Mechanics & Gravity Playground: physics core.
// Pure: no DOM, no Firebase. Runs in node for tests and in the page.
// Simulation units: G = 1, a star of mass 1 at distance 1 gives a circular
// speed of 1 and a period of 2*pi.
//   node --test tests/orbits-physics.test.mjs

export const G = 1;
export const SOFTENING = 1e-3;     // Plummer softening length
export const ETA = 0.01;           // substep = ETA * shortest pair free-fall time
export const MAX_SUBSTEPS = 400;   // per call to step()
export const EJECT_DISTANCE = 30;  // beyond this, unbound bodies are ejected
export const MAX_BODIES = 64;

export const MODE_ALIASES = Object.freeze({
  sandbox: "sandbox", empty: "sandbox", free: "sandbox",
  sun: "sun-earth", "sun-earth": "sun-earth", earth: "sun-earth",
  inner: "inner", "inner-solar": "inner", solar: "inner",
  binary: "binary", circumbinary: "binary", tatooine: "binary",
  trojans: "trojans", trojan: "trojans", lagrange: "trojans",
  resonance: "resonance", "2:1": "resonance", "resonance-2-1": "resonance",
  chaos: "chaos", unstable: "chaos",
  challenge: "challenge", stable: "challenge"
});

export function modeFromSearch(search) {
  const params = new URLSearchParams(typeof search === "string" ? search : "");
  const raw = (params.get("mode") || "").trim().toLowerCase();
  return MODE_ALIASES[raw] || "sandbox";
}

// ---------- bodies and systems ----------

let nextId = 1;
export function makeBody(o) {
  const m = Number(o.m) || 0;
  const kind = o.kind || (m >= 0.05 ? "star" : "planet");
  return {
    id: o.id != null ? o.id : "b" + (nextId++),
    kind,
    m,
    x: +o.x || 0, y: +o.y || 0,
    vx: +o.vx || 0, vy: +o.vy || 0,
    r: o.r != null ? +o.r : defaultRadius(m, kind),
    name: o.name || ""
  };
}

export function defaultRadius(m, kind) {
  if (kind === "star") return 0.05 * Math.cbrt(Math.max(m, 1e-6));
  return Math.max(0.004, 0.08 * Math.cbrt(Math.max(m, 1e-12)));
}

export function createSystem(bodies, opts = {}) {
  return {
    bodies: (bodies || []).map(makeBody),
    t: 0,
    softening: opts.softening != null ? opts.softening : SOFTENING,
    eta: opts.eta || ETA,
    ejectDistance: opts.ejectDistance || EJECT_DISTANCE,
    collisions: opts.collisions !== false,
    events: []
  };
}

export function cloneSystem(sys) {
  return {
    ...sys,
    bodies: sys.bodies.map((b) => ({ ...b })),
    events: []
  };
}

// ---------- forces ----------

export function accelerations(bodies, eps) {
  const n = bodies.length, e2 = eps * eps;
  const ax = new Float64Array(n), ay = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const bi = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const bj = bodies[j];
      const dx = bj.x - bi.x, dy = bj.y - bi.y;
      const d2 = dx * dx + dy * dy + e2;
      const inv = G / (d2 * Math.sqrt(d2));
      ax[i] += dx * inv * bj.m; ay[i] += dy * inv * bj.m;
      ax[j] -= dx * inv * bi.m; ay[j] -= dy * inv * bi.m;
    }
  }
  return { ax, ay };
}

// Shortest pair free-fall time, sqrt(d^3 / G(mi+mj)). Sets the substep.
export function minDynamicalTime(bodies, eps) {
  let t = Infinity;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const mu = G * (a.m + b.m);
      if (mu <= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy + eps * eps);
      const r2 = (dx * dx + dy * dy);
      const v2 = (b.vx - a.vx) ** 2 + (b.vy - a.vy) ** 2;
      // Free-fall time and crossing time, whichever is shorter.
      const tff = Math.sqrt(d * d * d / mu);
      const tcr = v2 > 0 ? Math.sqrt(r2 / v2) : Infinity;
      t = Math.min(t, tff, tcr);
    }
  }
  return t;
}

// Kick-drift-kick leapfrog (velocity Verlet) for one fixed substep h.
export function leapfrog(bodies, h, eps, acc) {
  let a = acc || accelerations(bodies, eps);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.vx += 0.5 * h * a.ax[i]; b.vy += 0.5 * h * a.ay[i];
    b.x += h * b.vx; b.y += h * b.vy;
  }
  a = accelerations(bodies, eps);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.vx += 0.5 * h * a.ax[i]; b.vy += 0.5 * h * a.ay[i];
  }
  return a;
}

// Advance by dt. Splits dt into equal substeps no longer than eta times the
// shortest dynamical time, so close passes get fine steps and quiet systems
// get coarse ones. Collisions and ejections are checked after each substep.
export function step(sys, dt) {
  const eps = sys.softening;
  let remaining = dt, guard = 0;
  while (remaining > 1e-15 && guard < MAX_SUBSTEPS) {
    const tdyn = minDynamicalTime(sys.bodies, eps);
    const hmax = Math.max(sys.eta * tdyn, dt / MAX_SUBSTEPS);
    const n = Math.max(1, Math.ceil(remaining / hmax - 1e-9));
    const h = remaining / n;
    leapfrog(sys.bodies, h, eps);
    sys.t += h;
    remaining -= h;
    guard++;
    if (sys.collisions) resolveCollisions(sys);
    resolveEjections(sys);
  }
  return sys;
}

// ---------- collisions, star falls, ejections ----------

export function mergeBodies(a, b) {
  const m = a.m + b.m;
  const big = a.m >= b.m ? a : b;
  const kind = a.kind === "star" || b.kind === "star" ? "star" : big.kind;
  return {
    ...big,
    kind,
    m,
    x: (a.m * a.x + b.m * b.x) / m,
    y: (a.m * a.y + b.m * b.y) / m,
    vx: (a.m * a.vx + b.m * b.vx) / m,
    vy: (a.m * a.vy + b.m * b.vy) / m,
    r: Math.cbrt(a.r ** 3 + b.r ** 3)
  };
}

export function resolveCollisions(sys) {
  let merged = true;
  while (merged) {
    merged = false;
    const bs = sys.bodies;
    outer: for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy <= (a.r + b.r) ** 2) {
          const c = mergeBodies(a, b);
          const small = a.m >= b.m ? b : a;
          const big = a.m >= b.m ? a : b;
          const type = big.kind === "star" && small.kind !== "star" ? "star-fall"
            : (a.kind === "star" && b.kind === "star" ? "star-merge" : "merge");
          sys.events.push({ type, t: sys.t, id: c.id, absorbed: small.id });
          bs.splice(j, 1);
          bs[i] = c;
          merged = true;
          break outer;
        }
      }
    }
  }
}

export function barycenter(bodies, skip) {
  let m = 0, x = 0, y = 0, vx = 0, vy = 0;
  for (const b of bodies) {
    if (b === skip) continue;
    m += b.m; x += b.m * b.x; y += b.m * b.y; vx += b.m * b.vx; vy += b.m * b.vy;
  }
  if (m <= 0) return { m: 0, x: 0, y: 0, vx: 0, vy: 0 };
  return { m, x: x / m, y: y / m, vx: vx / m, vy: vy / m };
}

// Specific orbital energy of b relative to the barycenter of everything else.
export function specificEnergy(sys, b) {
  const c = barycenter(sys.bodies, b);
  const dx = b.x - c.x, dy = b.y - c.y;
  const d = Math.hypot(dx, dy);
  const v2 = (b.vx - c.vx) ** 2 + (b.vy - c.vy) ** 2;
  return { energy: 0.5 * v2 - G * c.m / Math.max(d, 1e-12), distance: d };
}

export function isEjected(sys, b) {
  if (sys.bodies.length < 2) return false;
  const { energy, distance } = specificEnergy(sys, b);
  return energy > 0 && distance > sys.ejectDistance;
}

export function resolveEjections(sys) {
  for (let i = sys.bodies.length - 1; i >= 0; i--) {
    const b = sys.bodies[i];
    if (isEjected(sys, b)) {
      sys.events.push({ type: "ejected", t: sys.t, id: b.id, at: { x: b.x, y: b.y } });
      sys.bodies.splice(i, 1);
    }
  }
}

// ---------- conserved quantities ----------

export function totalEnergy(sys) {
  const bs = sys.bodies, e2 = sys.softening ** 2;
  let k = 0, u = 0;
  for (let i = 0; i < bs.length; i++) {
    k += 0.5 * bs[i].m * (bs[i].vx ** 2 + bs[i].vy ** 2);
    for (let j = i + 1; j < bs.length; j++) {
      const dx = bs[j].x - bs[i].x, dy = bs[j].y - bs[i].y;
      u -= G * bs[i].m * bs[j].m / Math.sqrt(dx * dx + dy * dy + e2);
    }
  }
  return k + u;
}

export function totalMomentum(sys) {
  let px = 0, py = 0;
  for (const b of sys.bodies) { px += b.m * b.vx; py += b.m * b.vy; }
  return { px, py };
}

export function totalAngularMomentum(sys) {
  let l = 0;
  for (const b of sys.bodies) l += b.m * (b.x * b.vy - b.y * b.vx);
  return l;
}

export function totalMass(sys) {
  return sys.bodies.reduce((s, b) => s + b.m, 0);
}

// Shift to the barycenter frame so the system does not drift off screen.
export function centerOfMassFrame(sys) {
  const c = barycenter(sys.bodies);
  for (const b of sys.bodies) { b.x -= c.x; b.y -= c.y; b.vx -= c.vx; b.vy -= c.vy; }
  return sys;
}

// ---------- prediction ----------

// Forward-integrate a copy. Returns { paths: {id: [x0,y0,x1,y1,...]}, events }.
// The live system is untouched.
export function predict(sys, opts = {}) {
  const steps = opts.steps || 300;
  const dt = opts.dt || 0.02;
  const ghost = cloneSystem(sys);
  if (opts.extra) ghost.bodies.push(makeBody(opts.extra));
  const paths = {};
  for (const b of ghost.bodies) paths[b.id] = [b.x, b.y];
  for (let s = 0; s < steps; s++) {
    step(ghost, dt);
    for (const b of ghost.bodies) {
      (paths[b.id] || (paths[b.id] = [])).push(b.x, b.y);
    }
    if (opts.stopOnEvent && ghost.events.length) break;
  }
  return { paths, events: ghost.events, system: ghost };
}

// ---------- helpers ----------

export function potentialAt(sys, x, y, skip) {
  let phi = 0;
  for (const b of sys.bodies) {
    if (b === skip) continue;
    const d = Math.hypot(b.x - x, b.y - y);
    phi -= G * b.m / Math.max(d, sys.softening);
  }
  return phi;
}

// Speed needed at (x, y) to escape the whole system, measured relative to
// the barycenter frame.
export function escapeVelocity(sys, x, y) {
  return Math.sqrt(Math.max(0, -2 * potentialAt(sys, x, y)));
}

// The body whose pull dominates at (x, y): largest m / d^2.
export function dominantBody(sys, x, y, skip) {
  let best = null, score = -1;
  for (const b of sys.bodies) {
    if (b === skip || b.m <= 0) continue;
    const d2 = (b.x - x) ** 2 + (b.y - y) ** 2;
    if (d2 < 1e-18) continue;
    const s = b.m / Math.max(d2, 1e-12);
    if (s > score) { score = s; best = b; }
  }
  return best;
}

// Circular-orbit velocity at (x, y) around the dominant body (or `around`),
// counter-clockwise by default. Includes the central body's own velocity.
export function circularVelocity(sys, x, y, around, clockwise) {
  const c = around || dominantBody(sys, x, y);
  if (!c) return { speed: 0, vx: 0, vy: 0, around: null };
  const dx = x - c.x, dy = y - c.y;
  const d = Math.hypot(dx, dy) || 1e-12;
  const speed = Math.sqrt(G * c.m / d);
  const s = clockwise ? -1 : 1;
  return { speed, vx: c.vx - s * speed * dy / d, vy: c.vy + s * speed * dx / d, around: c.id };
}

// Lagrange points of the pair (primary a, secondary b), absolute positions
// at the current instant. Collinear points solve the rotating-frame balance
// with Newton's method; L4 leads b by 60 degrees, L5 trails.
export function lagrangePoints(a, b) {
  const M = a.m + b.m;
  const mu = b.m / M;
  const dx = b.x - a.x, dy = b.y - a.y;
  const R = Math.hypot(dx, dy);
  const ux = dx / R, uy = dy / R;
  // Orbit direction: sign of relative angular momentum.
  const lz = dx * (b.vy - a.vy) - dy * (b.vx - a.vx);
  const sgn = lz >= 0 ? 1 : -1;
  const cx = (a.m * a.x + b.m * b.x) / M, cy = (a.m * a.y + b.m * b.y) / M;
  // Dimensionless rotating frame: primary at -mu, secondary at 1-mu.
  const f = (x) => {
    const r1 = x + mu, r2 = x - 1 + mu;
    return x - (1 - mu) * r1 / Math.abs(r1) ** 3 - mu * r2 / Math.abs(r2) ** 3;
  };
  const solve = (x0) => {
    let x = x0;
    for (let k = 0; k < 60; k++) {
      const h = 1e-7, fx = f(x);
      const d = (f(x + h) - f(x - h)) / (2 * h);
      const nx = x - fx / d;
      if (!Number.isFinite(nx)) break;
      if (Math.abs(nx - x) < 1e-13) { x = nx; break; }
      x = nx;
    }
    return x;
  };
  const hill = Math.cbrt(mu / 3);
  const xs = {
    L1: solve(1 - mu - hill),
    L2: solve(1 - mu + hill),
    L3: solve(-1 - mu + (5 / 12) * mu)
  };
  const out = {};
  for (const k of ["L1", "L2", "L3"]) out[k] = { x: cx + R * xs[k] * ux, y: cy + R * xs[k] * uy };
  // L4 leads (ahead in the orbit direction), L5 trails.
  const px = 0.5 - mu, py = (Math.sqrt(3) / 2) * sgn;
  out.L4 = { x: cx + R * (px * ux - py * uy), y: cy + R * (px * uy + py * ux) };
  out.L5 = { x: cx + R * (px * ux + py * uy), y: cy + R * (px * uy - py * ux) };
  return out;
}

// Keplerian elements of b around central c (two-body approximation).
export function orbitalElements(b, c) {
  const mu = G * (b.m + c.m);
  const rx = b.x - c.x, ry = b.y - c.y;
  const vx = b.vx - c.vx, vy = b.vy - c.vy;
  const r = Math.hypot(rx, ry);
  const v2 = vx * vx + vy * vy;
  const energy = 0.5 * v2 - mu / r;
  const h = rx * vy - ry * vx;
  // Eccentricity vector: (v x h)/mu - r_hat
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.hypot(ex, ey);
  const bound = energy < 0;
  const a = bound ? -mu / (2 * energy) : Infinity;
  const period = bound ? 2 * Math.PI * Math.sqrt(a ** 3 / mu) : Infinity;
  return {
    a, e, period, energy, h, bound,
    periapsis: bound ? a * (1 - e) : (h * h / mu) / (1 + e),
    apoapsis: bound ? a * (1 + e) : Infinity,
    argPeriapsis: Math.atan2(ey, ex)
  };
}

export function circularPeriod(r, M) {
  return 2 * Math.PI * Math.sqrt(r ** 3 / (G * M));
}

// Is the period ratio close to p:q with small integers? Returns the best
// match or null. tol is relative.
export function detectResonance(p1, p2, opts = {}) {
  const maxInt = opts.maxInt || 5;
  const tol = opts.tol != null ? opts.tol : 0.02;
  if (!(p1 > 0 && p2 > 0) || !Number.isFinite(p1) || !Number.isFinite(p2)) return null;
  const ratio = Math.max(p1, p2) / Math.min(p1, p2);
  let best = null;
  for (let q = 1; q <= maxInt; q++) {
    for (let p = q; p <= maxInt; p++) {
      if (gcd(p, q) !== 1) continue;
      const err = Math.abs(ratio - p / q) / (p / q);
      if (err <= tol && (!best || err < best.error)) best = { p, q, ratio, error: err, label: p + ":" + q };
    }
  }
  return best;
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// ---------- presets ----------

function orbiter(name, m, r, around, opts = {}) {
  const ang = opts.angle || 0;
  const x = around.x + r * Math.cos(ang), y = around.y + r * Math.sin(ang);
  const v = Math.sqrt(G * (around.m + m) / r) * (opts.vfactor || 1);
  return {
    name, m, kind: opts.kind || "planet",
    x, y,
    vx: (around.vx || 0) - v * Math.sin(ang),
    vy: (around.vy || 0) + v * Math.cos(ang),
    r: opts.r
  };
}

export const PRESETS = Object.freeze({
  sandbox: { label: "Empty sky", build: () => [{ id: "sun", name: "Star", kind: "star", m: 1, x: 0, y: 0 }] },
  "sun-earth": {
    label: "Sun + Earth",
    build: () => {
      const sun = { id: "sun", name: "Sun", kind: "star", m: 1, x: 0, y: 0 };
      return [sun, { id: "earth", ...orbiter("Earth", 3e-6, 1, sun) }];
    }
  },
  inner: {
    label: "Inner solar system",
    build: () => {
      const sun = { id: "sun", name: "Sun", kind: "star", m: 1, x: 0, y: 0 };
      return [
        sun,
        { id: "mercury", ...orbiter("Mercury", 1.66e-7, 0.387, sun, { angle: 0.4 }) },
        { id: "venus", ...orbiter("Venus", 2.45e-6, 0.723, sun, { angle: 2.1 }) },
        { id: "earth", ...orbiter("Earth", 3e-6, 1, sun, { angle: 4.0 }) },
        { id: "mars", ...orbiter("Mars", 3.2e-7, 1.524, sun, { angle: 5.3 }) }
      ];
    }
  },
  binary: {
    label: "Binary star + circumbinary planet",
    build: () => {
      const m = 0.5, d = 0.4, v = Math.sqrt(G * (2 * m) / d) / 2;
      return [
        { id: "starA", name: "Star A", kind: "star", m, x: -d / 2, y: 0, vx: 0, vy: -v },
        { id: "starB", name: "Star B", kind: "star", m, x: d / 2, y: 0, vx: 0, vy: v },
        { id: "planet", ...orbiter("Planet", 3e-6, 1.6, { x: 0, y: 0, m: 1, vx: 0, vy: 0 }) }
      ];
    }
  },
  trojans: {
    label: "Jupiter and the Trojans (L4/L5)",
    build: () => {
      const sun = { id: "sun", name: "Sun", kind: "star", m: 1, x: 0, y: 0 };
      const mj = 0.001, R = 1;
      const out = [sun, { id: "jupiter", ...orbiter("Jupiter", mj, R, sun) }];
      // Co-rotating test bodies near L4 (+60 deg) and L5 (-60 deg), about
      // the barycenter, with the pair's angular speed.
      const M = 1 + mj, w = Math.sqrt(G * M / R ** 3), cx = mj * R / M;
      const spots = [[60, "t4a", 0], [64, "t4b", 0.01], [-60, "t5a", 0], [-56, "t5b", -0.01]];
      for (const [deg, id, dr] of spots) {
        const a = deg * Math.PI / 180, rr = R + dr;
        const x = rr * Math.cos(a), y = rr * Math.sin(a);
        out.push({ id, name: "Trojan", m: 1e-10, x, y, vx: -w * y, vy: w * (x - cx) + 0 });
      }
      return out;
    }
  },
  resonance: {
    label: "2:1 resonance pair",
    build: () => {
      const sun = { id: "sun", name: "Star", kind: "star", m: 1, x: 0, y: 0 };
      const r1 = 1, r2 = Math.cbrt(4) * r1; // P2 / P1 = 2
      return [
        sun,
        { id: "inner", ...orbiter("Inner", 1e-5, r1, sun) },
        { id: "outer", ...orbiter("Outer", 1e-5, r2, sun, { angle: Math.PI }) }
      ];
    }
  },
  chaos: {
    label: "Unstable chaos",
    build: () => [
      { id: "s1", name: "Star", kind: "star", m: 1, x: 0, y: 0 },
      { id: "s2", name: "Red dwarf", kind: "star", m: 0.3, x: 1.4, y: 0.3, vx: -0.15, vy: 0.75 },
      { id: "p1", name: "Planet 1", m: 0.003, x: -0.7, y: 0, vx: 0, vy: -1.15 },
      { id: "p2", name: "Planet 2", m: 0.002, x: 0, y: 1.0, vx: -0.95, vy: 0.1 },
      { id: "p3", name: "Planet 3", m: 0.001, x: 0.5, y: -0.9, vx: 0.85, vy: 0.5 }
    ]
  },
  challenge: {
    label: "Challenge: stable for 10 orbits",
    build: () => [
      { id: "sun", name: "Star", kind: "star", m: 1, x: 0, y: 0 },
      { id: "giant", ...orbiter("Giant", 0.003, 1.6, { x: 0, y: 0, m: 1, vx: 0, vy: 0 }, { angle: 1 }) }
    ]
  }
});

export function buildPreset(name, opts) {
  const p = PRESETS[name] || PRESETS.sandbox;
  const sys = createSystem(p.build(), opts);
  centerOfMassFrame(sys);
  return sys;
}

// ---------- stability challenge ----------

// Tracks whether `bodyId` keeps orbiting `centralId` for `orbits` orbits.
// Fails on merge, ejection, or drift of a / e beyond the tolerances.
// Call update(sys) after each step. status: "running" | "passed" | "failed".
export function createStabilityTracker(sys, bodyId, centralId, opts = {}) {
  const goal = opts.orbits || 10;
  const aTol = opts.aTol != null ? opts.aTol : 0.25;
  const eMax = opts.eMax != null ? opts.eMax : 0.9;
  const find = (s, id) => s.bodies.find((b) => b.id === id);
  const b0 = find(sys, bodyId), c0 = find(sys, centralId);
  if (!b0 || !c0) return { status: "failed", reason: "missing body", orbits: 0, update() { return this; } };
  const el0 = orbitalElements(b0, c0);
  let lastAng = Math.atan2(b0.y - c0.y, b0.x - c0.x), swept = 0;
  const tr = {
    status: el0.bound ? "running" : "failed",
    reason: el0.bound ? "" : "not bound",
    orbits: 0, goal, a0: el0.a,
    update(s) {
      if (this.status !== "running") return this;
      const b = find(s, bodyId), c = find(s, centralId);
      if (!b || !c) { this.status = "failed"; this.reason = b ? "star gone" : "planet lost (merged or ejected)"; return this; }
      const el = orbitalElements(b, c);
      if (!el.bound) { this.status = "failed"; this.reason = "unbound"; return this; }
      if (Math.abs(el.a - this.a0) / this.a0 > aTol) { this.status = "failed"; this.reason = "orbit drifted"; return this; }
      if (el.e > eMax) { this.status = "failed"; this.reason = "too eccentric"; return this; }
      const ang = Math.atan2(b.y - c.y, b.x - c.x);
      let d = ang - lastAng;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      swept += d; lastAng = ang;
      this.orbits = Math.abs(swept) / (2 * Math.PI);
      if (this.orbits >= goal) this.status = "passed";
      return this;
    }
  };
  return tr;
}

// Convenience: run a stability check offline (for tests and quick previews).
export function checkStability(sys, bodyId, centralId, opts = {}) {
  const s = cloneSystem(sys);
  const tr = createStabilityTracker(s, bodyId, centralId, opts);
  const dt = opts.dt || 0.01, maxT = opts.maxTime || 1e4;
  while (tr.status === "running" && s.t < maxT) { step(s, dt); tr.update(s); }
  return tr;
}
