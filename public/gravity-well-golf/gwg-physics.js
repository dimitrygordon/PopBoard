// Gravity Well Golf: game physics, course, goals. Pure (no DOM), Node-testable.
// Motion model (label it as such in the UI): each mass pulls the ball with a Newtonian
// inverse-square force, a = G·M / r², softened near the center so the pull stays finite.
// The rubber sheet drawn on screen is only an analogy. Rolling friction and the cup's
// capture are GAME rules, not gravity. All numbers are Cleared by Tesla 2026-10-29 (docs/fun-challenges.md,
// docs/gravity-well-golf-science.md).
export const MODULE_ID = "gravity-well-golf";

export const CAVEAT = "This stretchy sheet is a model, not the real thing. In the model, the ball rolls into the dents because Earth's gravity pulls it down. Real gravity has no 'down' to roll toward: mass curves space and time themselves, and objects follow those curves.";
export const MODEL_LABEL = "Pull: Newtonian, 1/r\u00b2 toward each mass";
export const CUP_LABEL = "The cup's grab and the slow-down are game friction, not gravity.";

// World: a W x H field (arbitrary units, origin at the center). Ball radius BALL_R.
export const W = 16, H = 10, BALL_R = 0.25;
// Mass kinds. scale = display diameter in ball diameters (sprite manifest). gm = G·M (game units).
export const KINDS = {
  moon:   { sprite: "mass-small-moon.webp",   scale: 2,   gm: 2,  name: "Moon" },
  planet: { sprite: "mass-medium-planet.webp", scale: 3.5, gm: 6,  name: "Planet" },
  star:   { sprite: "mass-large-star.webp",   scale: 5,   gm: 14, name: "Star" },
  heavy:  { sprite: "mass-xl-heavy.webp",     scale: 6,   gm: 30, name: "Heavy mass" }
};
export const HOLE_SCALE = 1.5; // cup sprite size in ball diameters
export const P = {
  soften: 0.35,          // softening length: a = gm·r / (r² + s²)^1.5
  friction: 0.18,        // game rolling friction: speed lost per second as a fraction (exp decay)
  stopSpeed: 0.05,       // below this, with friction on, the ball stops
  cupR: 0.36,            // capture radius of the cup
  cupMaxSpeed: 2.6,      // faster than this and the ball lips out over the cup
  restitution: 0.6,      // bounce off walls and mass surfaces
  maxPutt: 9,            // fastest putt (units / s)
  pullToSpeed: 3.2,      // putt speed per unit of pull-back
  maxTime: 25,           // a putt ends after this many seconds
  dt: 1 / 240            // physics substep
};
export const massRadius = (kind) => KINDS[kind].scale * BALL_R * 0.8; // collision radius (inside the sprite halo)

export function accel(x, y, masses, s = P.soften) {
  let ax = 0, ay = 0;
  for (const m of masses) {
    const dx = m.x - x, dy = m.y - y, r2 = dx * dx + dy * dy + s * s, inv = KINDS[m.kind].gm / (r2 * Math.sqrt(r2));
    ax += dx * inv; ay += dy * inv;
  }
  return { ax, ay };
}
// Depth of the drawn sheet at (x, y): the softened potential, scaled. Visual only.
export function depth(x, y, masses, k = 0.09, s = 0.6) {
  let d = 0; for (const m of masses) d -= k * KINDS[m.kind].gm / Math.sqrt((m.x - x) ** 2 + (m.y - y) ** 2 + s * s);
  return Math.max(-2.2, d);
}
// Specific energy (per unit ball mass) for tests: ½v² − Σ gm/√(r²+s²).
export function energy(b, masses, s = P.soften) {
  let u = 0; for (const m of masses) u -= KINDS[m.kind].gm / Math.sqrt((m.x - b.x) ** 2 + (m.y - b.y) ** 2 + s * s);
  return 0.5 * (b.vx * b.vx + b.vy * b.vy) + u;
}
export function puttVelocity(pullX, pullY) {
  // Pull back from the ball; the ball goes the other way.
  let vx = -pullX * P.pullToSpeed, vy = -pullY * P.pullToSpeed;
  const v = Math.hypot(vx, vy); if (v > P.maxPutt) { vx *= P.maxPutt / v; vy *= P.maxPutt / v; }
  return { vx, vy };
}

// One substep (semi-implicit Euler: symplectic, so on a frictionless orbit the energy drift stays bounded: it wobbles slightly, never grows).
// Returns a list of events: {type:"wall"|"hit"|"cup"|"lip"|"stop", ...}.
export function step(b, hole, opts) {
  const { masses, friction = true, dt = P.dt } = opts;
  const ev = [];
  const { ax, ay } = accel(b.x, b.y, masses);
  b.vx += ax * dt; b.vy += ay * dt;
  if (friction) { const f = Math.exp(-P.friction * dt); b.vx *= f; b.vy *= f; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  // walls: rubber-band bounce
  const mx = W / 2 - BALL_R, my = H / 2 - BALL_R;
  if (b.x < -mx || b.x > mx) { b.x = Math.max(-mx, Math.min(mx, b.x)); b.vx = -b.vx * P.restitution; ev.push({ type: "wall" }); }
  if (b.y < -my || b.y > my) { b.y = Math.max(-my, Math.min(my, b.y)); b.vy = -b.vy * P.restitution; ev.push({ type: "wall" }); }
  // mass surfaces: reflect the normal component
  for (const m of masses) {
    const R = massRadius(m.kind) + BALL_R, dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy);
    if (d < R && d > 1e-9) {
      const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
      b.x = m.x + nx * R; b.y = m.y + ny * R;
      if (vn < 0) { b.vx -= (1 + P.restitution) * vn * nx; b.vy -= (1 + P.restitution) * vn * ny; ev.push({ type: "hit", x: b.x - nx * BALL_R, y: b.y - ny * BALL_R, speed: -vn }); }
    }
  }
  // cup (game rule)
  if (hole) {
    const d = Math.hypot(b.x - hole.x, b.y - hole.y), v = Math.hypot(b.vx, b.vy);
    if (d < P.cupR) { if (v <= P.cupMaxSpeed) ev.push({ type: "cup" }); else if (!b.lipped) { ev.push({ type: "lip" }); b.lipped = true; } }
    else b.lipped = false;
  }
  if (friction && Math.hypot(b.vx, b.vy) < P.stopSpeed && Math.hypot(ax, ay) < 0.5) ev.push({ type: "stop" });
  return ev;
}
// Simulate a whole putt (used by tests and by the aim preview's "will it go in?" check).
export function simulate(start, v, hole, opts = {}) {
  const b = { x: start.x, y: start.y, vx: v.vx, vy: v.vy };
  const path = [];
  for (let t = 0; t < (opts.maxTime ?? P.maxTime); t += P.dt) {
    const ev = step(b, hole, { masses: opts.masses || [], friction: opts.friction ?? true });
    if (path.length === 0 || t - path[path.length - 1].t > 0.02) path.push({ x: b.x, y: b.y, t });
    if (ev.some((e) => e.type === "cup")) return { result: "cup", path, t };
    if (ev.some((e) => e.type === "stop")) return { result: "stop", path, t };
  }
  return { result: "time", path, t: opts.maxTime ?? P.maxTime };
}

// ---------- the 9-hole course ----------
// tee, cup, fixed masses, tray (masses the student may drag on), par.
export const COURSE = [
  { n: 1, name: "First putt", par: 1, tee: { x: -5, y: 0 }, cup: { x: 5, y: 0 }, masses: [], tray: [] },
  { n: 2, name: "Around the moon", par: 2, tee: { x: -5.5, y: 0 }, cup: { x: 5.5, y: 0 }, masses: [{ kind: "moon", x: 0, y: 0 }], tray: [] },
  { n: 3, name: "Planet bend", par: 2, tee: { x: -6, y: -3 }, cup: { x: 5.5, y: -3 }, masses: [{ kind: "planet", x: 0, y: -0.6 }], tray: [] },
  { n: 4, name: "Two moons", par: 2, tee: { x: -6, y: 0 }, cup: { x: 6, y: 0 }, masses: [{ kind: "moon", x: -1.5, y: 1.2 }, { kind: "moon", x: 1.5, y: -1.2 }], tray: [] },
  { n: 5, name: "Bring a planet", par: 2, tee: { x: -6, y: 3.5 }, cup: { x: 2, y: -3.5 }, masses: [{ kind: "star", x: 2, y: 2 }], tray: ["planet"] },
  { n: 6, name: "Star corner", par: 3, tee: { x: -6.5, y: -3.8 }, cup: { x: 6.3, y: 3.8 }, masses: [{ kind: "star", x: 0, y: 0 }], tray: ["moon"] },
  { n: 7, name: "Slingshot", par: 3, tee: { x: -6, y: 3 }, cup: { x: -6, y: -3 }, masses: [{ kind: "planet", x: 2, y: 0 }, { kind: "moon", x: -3, y: 0 }], tray: ["planet"] },
  { n: 8, name: "Heavy middle", par: 3, tee: { x: -6.5, y: 0 }, cup: { x: 6.5, y: 0.5 }, masses: [{ kind: "heavy", x: 0, y: 0 }], tray: [] },
  { n: 9, name: "Grand tour", par: 4, tee: { x: -6.5, y: -4 }, cup: { x: 6, y: 4 }, masses: [{ kind: "star", x: -2, y: 1.5 }, { kind: "planet", x: 2.5, y: -1.5 }, { kind: "moon", x: 4, y: 2.5 }], tray: ["moon", "planet"] }
];
export const TRAY_KINDS = Object.keys(KINDS);
// Strokes vs par in golf words.
export function scoreName(strokes, par) {
  if (strokes === 1) return "Hole in one";
  const d = strokes - par;
  return d <= -2 ? "Eagle" : d === -1 ? "Birdie" : d === 0 ? "Par" : d === 1 ? "Bogey" : `${d} over par`;
}
// A placed mass must stay on the field and clear of the tee, cup and other masses.
export function canPlace(kind, x, y, hole) {
  const r = massRadius(kind);
  if (Math.abs(x) > W / 2 - r || Math.abs(y) > H / 2 - r) return false;
  for (const p of [hole.tee, hole.cup]) if (Math.hypot(p.x - x, p.y - y) < r + 0.6) return false;
  for (const m of hole.masses) if (Math.hypot(m.x - x, m.y - y) < r + massRadius(m.kind) + 0.05) return false;
  return true;
}

// ---------- challenges (Cleared by Tesla 2026-10-29) ----------
export const FUN = { silverParHoles: 3, goldMinHole: 2 };
export const GOALS = [
  { tier: "bronze", title: "Sink a ball in any cup", check: (e) => e.type === "sunk" },
  { tier: "silver", title: `Make par or better on ${FUN.silverParHoles} holes`, check: (e) => e.type === "sunk" && e.parHoles >= FUN.silverParHoles },
  { tier: "gold", title: `Hole in one on hole ${FUN.goldMinHole} or later`, check: (e) => e.type === "sunk" && e.mode === "course" && e.strokes === 1 && e.hole >= FUN.goldMinHole }
];
export const judgePrediction = (guess, sunk) => guess === sunk;

// ---------- sandbox share link ----------
// Layout packed as a short string: "k,x,y;k,x,y" with k = first letter of the kind.
const CODE = { m: "moon", p: "planet", s: "star", h: "heavy" };
export function packMasses(ms) { return ms.slice(0, 12).map((m) => `${m.kind[0]},${m.x.toFixed(2)},${m.y.toFixed(2)}`).join(";"); }
export function unpackMasses(str) {
  if (typeof str !== "string") return [];
  return str.split(";").slice(0, 12).map((t) => t.split(",")).filter((a) => a.length === 3 && CODE[a[0]] && a.slice(1).every((v) => Number.isFinite(Number(v))))
    .map(([k, x, y]) => ({ kind: CODE[k], x: clamp(Number(x), -W / 2, W / 2), y: clamp(Number(y), -H / 2, H / 2) }));
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const SHARE_SCHEMA = {
  tx: { type: "num", min: -W / 2, max: W / 2 }, ty: { type: "num", min: -H / 2, max: H / 2 },
  cx: { type: "num", min: -W / 2, max: W / 2 }, cy: { type: "num", min: -H / 2, max: H / 2 },
  friction: { type: "bool" }, trail: { type: "bool" }
};
