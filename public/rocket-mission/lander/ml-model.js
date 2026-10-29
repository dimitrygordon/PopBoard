// Rocket & Mission "Mars Lander" mode: the physics and the rules, no DOM, so tests run in Node.
// Units: metres, seconds, kilograms, newtons. Every number marked TODO-TESLA waits for Tesla's check
// (see docs/rocket-mission-science.md, "Mars Lander mode").
export const MODULE_ID = "rocket-mars-lander";
export const G0 = 9.80665;                       // standard gravity, for Isp (exact by definition)
export const BODIES = Object.freeze({            // surface gravity m/s^2 and surface air density kg/m^3 (TODO-TESLA)
  mars:  { name: "Mars",  g: 3.71, rho: 0.020 },
  moon:  { name: "Moon",  g: 1.62, rho: 0 },
  earth: { name: "Earth", g: 9.81, rho: 1.225 }
});
export const LANDER = Object.freeze({            // the mission lander (TODO-TESLA)
  dry: 600,        // kg without fuel
  fuel: 200,       // kg of fuel at the start
  thrust: 6000,    // N, one engine, on or off
  isp: 225,        // s, a hydrazine engine like the ones Phoenix and Viking used
  cdA: 12,         // m^2, drag coefficient times area
  w: 24, h: 16,    // m, drawn size: "not to scale", about four times a real lander
  maxTilt: 45,     // degrees either way
  turnRate: 60     // degrees per second
});
// Where the art's features sit, as fractions of Leo's lander.webp (802 x 535 px).
export const ART = Object.freeze({ footX: 0.479, footY: 0.983, nozzleY: 0.837, aspect: 535 / 802, padAspect: 176 / 1198, stripAspect: 382 / 2048 });
export const WORLD = Object.freeze({ w: 240, top: 235 }); // m: the strip spans the width; the view shows 0 to top
export const PAD = Object.freeze({ x: 138, w: 60 });      // m: pad centre and width, on the flattest stretch of the strip
export const START = Object.freeze({ x: 40, alt: 170, vx: 5, vy: -12 }); // mission start, altitude above the ground (TODO-TESLA)
export const LIMITS = Object.freeze({ safeV: 3, softV: 1.5, sideV: 1.5, tilt: 10 }); // touchdown rules, m/s and degrees (TODO-TESLA)
export const FUN = Object.freeze({ goldFuel: 0.25 }); // Gold: at least a quarter of the fuel left (TODO-TESLA)
export const NOT_TO_SCALE = "Lander and pad not to scale.";
export const MODEL_NOTE = "Mars pulls with 3.71 m/s\u00b2, about 38% of Earth's gravity, and its air is about 1% as thick as Earth's, so it barely slows you down. Your engine pushes harder than Mars pulls, so firing it slows your fall. The lander and pad are drawn about four times bigger than real ones.";

// Top edge of Leo's terrain-strip.webp, 128 samples, in strip pixels above its bottom (strip is 382 px tall).
export const PROFILE = Object.freeze([300, 309, 314, 323, 326, 333, 342, 342, 343, 350, 357, 369, 370, 365, 370, 372, 371, 371, 372, 373, 371, 364, 362, 357, 355, 349, 342, 338, 331, 324, 319, 312, 302, 297, 288, 284, 279, 274, 278, 277, 273, 258, 259, 261, 265, 267, 269, 274, 279, 283, 285, 287, 287, 284, 278, 277, 275, 271, 266, 256, 252, 251, 252, 252, 250, 244, 239, 234, 233, 234, 236, 240, 244, 248, 250, 254, 256, 256, 255, 248, 244, 240, 244, 247, 250, 253, 256, 260, 263, 268, 271, 274, 277, 282, 287, 290, 292, 295, 295, 295, 295, 295, 293, 287, 279, 276, 272, 267, 262, 257, 252, 248, 245, 241, 240, 242, 242, 245, 247, 250, 255, 261, 265, 269, 279, 282, 293, 301]);

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const M_PER_PX = WORLD.w / 2048;
// Bare ground height (m above the strip's bottom) at world x, from the art's own outline.
export function terrainAt(x) {
  const n = PROFILE.length, u = ((x / WORLD.w) * n - 0.5 + n) % n, i = Math.floor(u), f = u - i;
  return (PROFILE[i % n] * (1 - f) + PROFILE[(i + 1) % n] * f) * M_PER_PX;
}
export const PAD_H = PAD.w * ART.padAspect;
// The slab rests on the highest rock under it, sunk 1.5 m so its ends do not float.
export const PAD_BASE = (() => { let m = 0; for (let x = PAD.x - PAD.w / 2; x <= PAD.x + PAD.w / 2; x += 0.5) m = Math.max(m, terrainAt(x)); return m - 1.5; })();
export const PAD_TOP = PAD_BASE + PAD_H;
export const onPadX = (x) => Math.abs(x - PAD.x) <= PAD.w / 2;
export const groundAt = (x) => (onPadX(x) ? Math.max(PAD_TOP, terrainAt(x)) : terrainAt(x));

export const mdot = (cfg) => cfg.thrust / (cfg.isp * G0);           // kg/s while firing
export const burnTime = (cfg) => cfg.fuel / mdot(cfg);              // s of full burn
export const twr = (cfg, g) => cfg.thrust / ((cfg.dry + cfg.fuel) * g); // thrust-to-weight at the start

export function missionConfig() { return { body: "mars", ...LANDER, infinite: false, air: true, start: { ...START } }; }

// The lander's centre is the middle of its art; feet and nozzle hang below it.
export function createLander(cfg = missionConfig()) {
  const s = cfg.start || START, x = clamp(s.x, 15, WORLD.w - 15);
  const y = Math.min(WORLD.top - LANDER.h, groundAt(x) + s.alt + feetDrop());
  return { cfg, x, y, vx: s.vx, vy: s.vy, tilt: 0, tiltTarget: 0, fuel: cfg.fuel, firing: false, t: 0, state: "ready", result: null, burned: 0 };
}
export const feetDrop = () => LANDER.h * (ART.footY - 0.5);
// Foot positions after tilting (tilt in degrees, positive leans right, nose to the right).
export function feet(L) {
  const a = L.tilt * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), dx = LANDER.w * ART.footX, dy = -feetDrop();
  return [-1, 1].map((k) => ({ x: L.x + k * dx * c - dy * s, y: L.y + k * dx * s + dy * c }));
}
export function altitude(L) { return Math.min(...feet(L).map((f) => f.y - groundAt(f.x))); }
export const mass = (L) => L.cfg.dry + L.fuel;
export const fuelFrac = (L) => (L.cfg.infinite ? 1 : L.fuel / L.cfg.fuel);

export const DT = 1 / 120;
// One fixed step. Thrust points along the lander's axis; drag opposes motion and scales with air density.
export function stepOnce(L, dt = DT) {
  if (L.state !== "flying") return;
  const body = BODIES[L.cfg.body] || BODIES.mars;
  const turn = L.cfg.turnRate * dt;
  L.tiltTarget = clamp(L.tiltTarget, -L.cfg.maxTilt, L.cfg.maxTilt);
  L.tilt += clamp(L.tiltTarget - L.tilt, -turn, turn);
  const on = L.firing && (L.cfg.infinite || L.fuel > 0);
  let ax = 0, ay = -body.g;
  if (on) {
    const m = mass(L), a = L.tilt * Math.PI / 180, F = L.cfg.thrust;
    ax += F / m * Math.sin(a); ay += F / m * Math.cos(a);
    const used = Math.min(L.cfg.infinite ? Infinity : L.fuel, mdot(L.cfg) * dt);
    if (!L.cfg.infinite) L.fuel -= used; L.burned += mdot(L.cfg) * dt;
  }
  if (L.cfg.air) {
    const v = Math.hypot(L.vx, L.vy), k = 0.5 * body.rho * L.cfg.cdA * v / mass(L);
    ax -= k * L.vx; ay -= k * L.vy;
  }
  L.vx += ax * dt; L.vy += ay * dt; // semi-implicit Euler
  L.x += L.vx * dt; L.y += L.vy * dt; L.t += dt;
  if (L.x < 12 || L.x > WORLD.w - 12) { L.x = clamp(L.x, 12, WORLD.w - 12); L.vx = 0; }
  if (L.y > WORLD.top - LANDER.h / 2) { L.y = WORLD.top - LANDER.h / 2; L.vy = Math.min(0, L.vy); }
  if (altitude(L) <= 0) touchdown(L);
}
export function step(L, seconds) { let left = seconds; while (left > 1e-9 && L.state === "flying") { const d = Math.min(DT, left); stepOnce(L, d); left -= d; } return L; }

// Touchdown: judge the speeds and tilt at contact, then rest the lander on the ground.
export function judge(vx, vy, tilt, onPad) {
  const down = -vy, safe = down <= LIMITS.safeV && Math.abs(vx) <= LIMITS.sideV && Math.abs(tilt) <= LIMITS.tilt;
  const why = down > LIMITS.safeV ? "fast" : Math.abs(vx) > LIMITS.sideV ? "sideways" : Math.abs(tilt) > LIMITS.tilt ? "tilted" : null;
  return { safe, soft: safe && down <= LIMITS.softV, onPad: safe && onPad, why };
}
export function touchdown(L) {
  const f = feet(L), onPad = f.every((p) => onPadX(p.x));
  const r = judge(L.vx, L.vy, L.tilt, onPad);
  L.result = { ...r, down: -L.vy, side: L.vx, tilt: L.tilt, fuelFrac: fuelFrac(L), t: L.t };
  L.state = r.safe ? "landed" : "crashed"; L.firing = false;
  if (r.safe) { L.tilt = 0; L.tiltTarget = 0; }
  else { L.tilt = clamp(L.tilt + (L.vx >= 0 ? 1 : -1) * 70, -110, 110); }
  L.vx = 0; L.vy = 0;
  const lift = Math.min(...feet({ ...L, tilt: r.safe ? 0 : L.tilt }).map((p) => p.y - groundAt(p.x)));
  L.y -= r.safe ? lift : Math.max(0, lift - LANDER.h * 0.3);
}
export function headline(L) {
  const r = L.result;
  if (L.state === "ready") return "Ready";
  if (L.state === "flying") return "Descending";
  if (L.state === "landed") return r.onPad ? (r.soft ? "Soft landing on the pad" : "Landed on the pad") : "Landed off the pad";
  return r.why === "sideways" ? "Crashed: sliding sideways" : r.why === "tilted" ? "Crashed: tipped over" : "Crashed: too fast";
}

// A simple autopilot used by the tests and the screenshot hooks: steer over the pad, then
// fire whenever the lander is falling faster than a safe profile for its height.
export function autopilot(L) {
  const alt = altitude(L), dx = PAD.x - L.x;
  const wantVx = clamp(dx * 0.12, -8, 8) * (alt > 8 ? 1 : 0);
  L.tiltTarget = clamp((wantVx - L.vx) * 4, -25, 25) * (alt > 4 ? 1 : 0);
  const wantVy = -Math.max(0.9, Math.min(14, 0.6 + alt * 0.12));
  L.firing = L.vy < wantVy || (alt > 4 && Math.abs(L.tilt) > 3 && L.vy < wantVy * 0.6);
  return L;
}
export function fly(L, seconds, pilot = autopilot) { const end = L.t + seconds; if (L.state === "ready") L.state = "flying"; while (L.state === "flying" && L.t < end) { pilot(L); stepOnce(L); } return L; }

// ---------- medals (Mission tab only) ----------
export const GOALS = [
  { tier: "bronze", title: "Land safely anywhere", check: (e) => e.type === "landing" && e.safe },
  { tier: "silver", title: "Land safely on the pad", check: (e) => e.type === "landing" && e.safe && e.onPad },
  { tier: "gold", title: "Soft landing on the pad with a quarter of the fuel left", check: (e) => e.type === "landing" && e.soft && e.onPad && e.fuelFrac >= FUN.goldFuel }
];

// ---------- sandbox ----------
export const SANDBOX = Object.freeze({
  thrust: { min: 2000, max: 12000, step: 500 }, fuel: { min: 50, max: 400, step: 10 }, alt: { min: 60, max: 190, step: 10 }
});
export function sandboxConfig(o = {}) {
  const c = missionConfig();
  c.body = BODIES[o.body] ? o.body : "mars";
  c.thrust = clamp(o.thrust ?? c.thrust, SANDBOX.thrust.min, SANDBOX.thrust.max);
  c.fuel = clamp(o.fuel ?? c.fuel, SANDBOX.fuel.min, SANDBOX.fuel.max);
  c.infinite = !!o.infinite; c.air = o.air ?? true;
  c.start = { ...START, alt: clamp(o.alt ?? START.alt, SANDBOX.alt.min, SANDBOX.alt.max) };
  return c;
}
