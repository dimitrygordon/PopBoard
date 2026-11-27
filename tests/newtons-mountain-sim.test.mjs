// Newton's Mountain acceptance tests T1 to T11 (spec_v1 section 11.1), with Tesla's fixes applied:
//   T3 lowest altitude at 7,762 m/s is 1.54 km; T10 horizon distance is the STRAIGHT-LINE distance;
//   T6 runs 4+ days to reach apoapsis (3.83 d) at 0.99 v_esc.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NM_CONFIG } from "../public/newtons-mountain/nm-config.js";
import { consts, derived, runShot, stepShot, makeShot, periapsisAlt, classify, smartPace, nearestRung, fallCheck, stepsFor, bracketOf, DT, landsWindow } from "../public/newtons-mountain/nm-sim.js";
import { makeDensity, ballistic } from "../public/newtons-mountain/nm-atmos.js";
import * as F from "../public/newtons-mountain/nm-frames.js";
import { flight, periodAt as olPeriod } from "../public/orbit-lab/ol-model.js";
import { GM_E, R_E } from "../public/newtons-cannonball-fire/ncf-config.js";

const L = consts("lesson"), RL = consts("real");
const km = (m) => m / 1e3;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} got ${a}, want ${b} +/- ${tol}`);

test("config imports the Tesla-cleared constants, never retypes them", () => {
  assert.equal(L.GM, GM_E); assert.equal(L.R, R_E);
  const orb = JSON.parse(readFileSync(new URL("../public/orbit-lab/assets/orbits.json", import.meta.url)));
  assert.equal(orb.constants.GM_E, L.GM); assert.equal(orb.constants.R_E, L.R);
  assert.equal(NM_CONFIG.defaultHeightKm, 150); assert.equal(NM_CONFIG.consts, "lesson"); assert.equal(NM_CONFIG.helpDefault, 0);
});

test("T1 derived values (table 8.2) and the real-constants set", () => {
  const rows = [ // h km, v_circ, v_esc, period min, g, g ratio %, window, dip deg, straight-line horizon km
    [0, 7898.3, 11169.8, 84.59, 9.778, 100, 0, 0, 0],
    [8, 7893.3, 11162.8, 84.75, 9.753, 99.7, 2.47, 2.87, 320],
    [50, 7867.5, 11126.3, 85.59, 9.626, 98.5, 15.37, 7.15, 800],
    [100, 7837.1, 11083.3, 86.59, 9.478, 96.9, 30.53, 10.08, 1134],
    [150, 7807.0, 11040.8, 87.59, 9.334, 95.5, 45.49, 12.30, 1392],
    [250, 7747.9, 10957.2, 89.61, 9.054, 92.6, 74.80, 15.78, 1803],
    [400, 7661.7, 10835.3, 92.67, 8.658, 88.5, 117.34, 19.78, 2294],
    [1000, 7343.7, 10385.5, 105.24, 7.308, 74.7, 271.88, 30.17, 3709]];
  for (const [h, vc, ve, T, g, gr, w, dip, hor] of rows) {
    const d = derived(L, h * 1e3);
    near(d.vCirc, vc, 0.1, `vc ${h}`); near(d.vEsc, ve, 0.1, `ve ${h}`); near(d.period / 60, T, 0.5 / 60 + 0.005, `T ${h}`);
    near(d.g, g, 0.001, `g ${h}`); near(d.gRatio * 100, gr, 0.06, `g ratio ${h}`); near(d.window, w, 0.01, `window ${h}`);
    near(F.horizonDipDeg(L.R, h * 1e3), dip, 0.01, `dip ${h}`); near(km(F.horizonStraightM(L.R, h * 1e3)), hor, 1, `straight-line horizon ${h}`);
  }
  const s0 = derived(RL, 0), s150 = derived(RL, 150e3);
  near(s0.vCirc, 7909.8, 0.1); near(s0.vEsc, 11186.1, 0.1);
  near(s150.vCirc, 7818.3, 0.1); near(s150.vEsc, 11056.7, 0.1); near(s150.period, 5241, 0.5);
});

test("T2 landing shots from 150 km, against the table and Orbit Lab's exact flight()", () => {
  const rows = [[0, 178.6, 0, 0], [2000, 184.8, 366.7, 3.29], [4000, 208.1, 826.0, 7.42], [6000, 279.9, 1666.6, 14.97], [7000, 406.6, 2824.5, 25.37], [7500, 659.1, 4906.4, 44.06]];
  for (const [v, t, range, deg] of rows) {
    const s = runShot({ ...L, h: 150e3, v });
    assert.equal(s.status, "landed", `v=${v}`);
    near(s.landing.t, t, 0.5, `t ${v}`); near(km(s.landing.range), range, 0.5, `range ${v}`); near(s.landing.angle * 180 / Math.PI, deg, 0.01, `deg ${v}`);
    const fl = flight(v, 150e3, L.GM, L.R);
    near(s.landing.t, fl.t, 0.1, `Orbit Lab t ${v}`); near(km(s.landing.range), km(fl.range), 0.1, `Orbit Lab range ${v}`);
  }
  const a = runShot({ ...RL, h: 150e3, v: 2000 }), b = runShot({ ...RL, h: 150e3, v: 7500 });
  near(a.landing.t, 184.4, 0.5); near(km(a.landing.range), 365.9, 0.5);
  near(b.landing.t, 646.0, 0.5); near(km(b.landing.range), 4809.2, 0.5);
});

test("T3 the edge: 7,761 lands, 7,762 does not, lowest altitude 1.54 km (Tesla fix)", () => {
  const a = runShot({ ...L, h: 150e3, v: 7761 });
  assert.equal(a.status, "landed"); near(a.landing.t, 2409.2, 0.5); near(km(a.landing.range), 18669.4, 0.6);
  // analytic lowest altitude from x = (v / v_circ)^2 and r_p = r0 x / (2 - x)
  const r0 = L.R + 150e3, vc = Math.sqrt(L.GM / r0), x = (7762 / vc) ** 2, rp = (r0 * x) / (2 - x);
  near(km(rp - L.R), 1.54, 0.01, "analytic");
  near(km(periapsisAlt(L, 150e3, 7762)), 1.54, 0.01, "periapsisAlt");
  const b = runShot({ ...L, h: 150e3, v: 7762 }, { tmax: 6000 });
  assert.notEqual(b.status, "landed"); near(km(b.minR - L.R), 1.54, 0.1, "sim lowest altitude");
  const c = runShot({ ...L, h: 150e3, v: 7807 }, { stop: (s) => s.swept >= 20 * Math.PI });
  assert.notEqual(c.status, "landed"); assert.ok(c.swept >= 20 * Math.PI, "10 laps");
  assert.equal(runShot({ ...L, h: 8e3, v: 7890 }).status, "landed");
  assert.notEqual(runShot({ ...L, h: 8e3, v: 7891 }, { tmax: 20000 }).status, "landed");
  near(landsWindow(L, 8e3), 2.47, 0.01);
  assert.equal(runShot({ ...RL, h: 150e3, v: 7772 }).status, "landed");
  assert.notEqual(runShot({ ...RL, h: 150e3, v: 7773 }, { tmax: 20000 }).status, "landed");
});

function closure(dt, laps) {
  const r0 = L.R + 150e3, vc = Math.sqrt(L.GM / r0), T = 2 * Math.PI * Math.sqrt(r0 ** 3 / L.GM);
  const s = makeShot({ ...L, h: 150e3, v: vc }); const E0 = 0.5 * vc * vc - L.GM / r0, L0 = r0 * vc;
  let dmin = 1e99, dmax = -1e99;
  while (s.t < T * laps) { stepShot(s, dt); const r = Math.hypot(s.x, s.y); dmin = Math.min(dmin, r - r0); dmax = Math.max(dmax, r - r0); }
  const r = Math.hypot(s.x, s.y), E = 0.5 * (s.vx ** 2 + s.vy ** 2) - L.GM / r, Lz = s.x * s.vy - s.y * s.vx;
  return { dev: Math.max(Math.abs(dmin), Math.abs(dmax)), dE: Math.abs((E - E0) / E0), dL: Math.abs((Lz - L0) / L0) };
}
test("T4 circular closure over 10 periods at dt 0.5, 1 and 2 s", () => {
  const a = closure(0.5, 10); assert.ok(a.dev < 2.0, "radius " + a.dev); assert.ok(a.dE < 1e-12, "energy " + a.dE); assert.ok(a.dL < 1e-12, "L " + a.dL);
  assert.ok(closure(1, 10).dev < 5); assert.ok(closure(2, 10).dev < 20);
});

test("T5 ellipse at 1.1 v_circ: apoapsis 3,621.6 km, period 124.7 min", () => {
  const r0 = L.R + 150e3, v = 1.1 * Math.sqrt(L.GM / r0), eps = 0.5 * v * v - L.GM / r0, a = -L.GM / (2 * eps);
  near(v, 8587.7, 0.1);
  near(km(2 * a - r0 - L.R), 3621.6, 0.2, "analytic apoapsis altitude");
  const Ta = 2 * Math.PI * Math.sqrt(a ** 3 / L.GM); near(Ta / 60, 124.7, 0.05);
  const s = makeShot({ ...L, h: 150e3, v }); let maxR = 0, tAp = 0;
  while (s.t < Ta) { stepShot(s); const r = Math.hypot(s.x, s.y); if (r > maxR) maxR = r; }
  near(km(maxR - L.R), 3621.6, 0.2, "sim apoapsis"); near(s.t, Ta, 1, "period over one lap");
  const back = Math.hypot(s.x - r0, s.y); assert.ok(back < 10e3, "back near the launch point " + back); // one 0.5 s step at periapsis is about 4.3 km
});

test("T6 escape and near-escape: run 4+ days, apoapsis at 3.83 d (Tesla fix)", () => {
  const r0 = L.R + 150e3, ve = Math.sqrt(2 * L.GM / r0), DAY = 86400;
  // 0.99 v_esc: bound, apoapsis altitude 315,231 km, period 7.66 days
  const v = 0.99 * ve; near(v, 10930.4, 0.1);
  const eps = 0.5 * v * v - L.GM / r0, a = -L.GM / (2 * eps), Ta = 2 * Math.PI * Math.sqrt(a ** 3 / L.GM);
  near(Ta / DAY, 7.66, 0.005, "period days"); near(km(2 * a - r0 - L.R), 315231, 5, "analytic apoapsis");
  const s = makeShot({ ...L, h: 150e3, v }); let maxR = 0, tAp = 0;
  while (s.t < 4 * DAY) { stepShot(s); const r = Math.hypot(s.x, s.y); if (r > maxR) { maxR = r; tAp = s.t; } }
  assert.notEqual(s.status, "landed");
  near(tAp / DAY, 3.83, 0.01, "apoapsis time (days)");
  assert.ok(Math.abs(km(maxR - L.R) - 315231) / 315231 < 0.005, "apoapsis within 0.5%: " + km(maxR - L.R));
  // v_esc: parabola, r after 3 days from Barker's equation
  const par = runShot({ ...L, h: 150e3, v: ve }, { tmax: 3 * DAY });
  near(km(Math.hypot(par.x, par.y)), 487248, 487248 * 0.002, "parabola r after 3 d");
  // 1.01 v_esc: hyperbolic, excess speed 1,565 m/s
  const hy = runShot({ ...L, h: 150e3, v: 1.01 * ve }, { tmax: 3 * DAY });
  near(1.01 * ve, 11151.2, 0.1); near(km(Math.hypot(hy.x, hy.y)), 621707, 621707 * 0.002, "hyperbola r after 3 d");
  const vinf = Math.sqrt((1.01 * ve) ** 2 - 2 * L.GM / r0); near(vinf, 1565, 1);
  for (const sh of [par, hy]) assert.notEqual(sh.status, "landed");
});

test("T7 fall check: g, the 1 s fall and the ground curve agree for a circular shot", () => {
  const r0 = L.R + 150e3, vc = Math.sqrt(L.GM / r0), f = fallCheck(L, r0, vc);
  near(f.g, 9.334, 0.001); near(f.fall, 4.667, 0.001); near(f.curve, 4.667, 0.001); near(f.fall, f.curve, 0.001); assert.equal(f.match, true);
  assert.equal(fallCheck(L, r0, 2000).match, false);
});

const table = JSON.parse(readFileSync(new URL("../public/newtons-mountain/data/ussa76-density-5km.json", import.meta.url))).table;
const rho = makeDensity(table), beta = ballistic(NM_CONFIG.ball);
test("T8 drag with the default ball, v = v_circ at each height", () => {
  near(beta, 2235, 3, "m/(Cd A)");
  const run = (h, laps) => { const r = L.R + h, T = 2 * Math.PI * Math.sqrt(r ** 3 / L.GM); return runShot({ ...L, h, v: Math.sqrt(L.GM / r), drag: { rho, beta } }, { tmax: T * laps, stop: null }); };
  const within = (a, b, p = 0.03) => Math.abs(a - b) <= p * Math.abs(b);
  const r8 = run(8e3, 20); assert.equal(r8.status, "landed"); assert.ok(within(r8.landing.t, 61), "8 km t " + r8.landing.t); assert.ok(within(km(r8.landing.range), 29), "8 km range " + km(r8.landing.range));
  const r50 = run(50e3, 20); assert.equal(r50.status, "landed"); assert.ok(within(r50.landing.t, 273), "50 t " + r50.landing.t); assert.ok(within(km(r50.landing.range), 1191), "50 range " + km(r50.landing.range));
  const r100 = run(100e3, 20); assert.equal(r100.status, "landed"); assert.ok(within(r100.landing.t, 2366), "100 t " + r100.landing.t); assert.ok(within(km(r100.landing.range), 17359), "100 range " + km(r100.landing.range));
  const r150 = run(150e3, 20); assert.notEqual(r150.status, "landed"); near(km(r150.minR - L.R), 144.1, 144.1 * 0.03, "150 low");
  const r200 = run(200e3, 20); assert.notEqual(r200.status, "landed"); near(km(r200.minR - L.R), 199.4, 199.4 * 0.03, "200 low");
  const r400 = run(400e3, 20); assert.notEqual(r400.status, "landed"); near(km(r400.minR - L.R), 400.0, 0.1, "400 low");
  // with air off, mass changes nothing
  const a = runShot({ ...L, h: 150e3, v: 7000 }), b = runShot({ ...L, h: 150e3, v: 7000, drag: null });
  assert.deepEqual([a.landing.t, a.landing.range], [b.landing.t, b.landing.range]);
  assert.ok(ballistic({ ...NM_CONFIG.ball, massKg: 1 }) < beta && ballistic({ ...NM_CONFIG.ball, massKg: 1000 }) > beta);
  assert.equal(rho(0), 1.225); near(rho(100e3), 5.6044e-7, 1e-10); near(rho(150e3), 2.0752e-9, 1e-13); assert.equal(rho(1000e3 + 1), 0); assert.equal(rho(-5), 1.225);
});

test("T9 smart pace: 20x, 50x, 500x, 500x at 150 km", () => {
  const p = (v) => smartPace({ ...L, h: 150e3, v });
  assert.equal(p(2000).warp, 20); assert.equal(p(7500).warp, 50);
  const r = p(7807); assert.equal(r.warp, 500); near(r.tEvent, 5255, 1);
  const e = p(11041); assert.equal(e.warp, 500); near(e.tEvent, 6000, 1);
  assert.equal(nearestRung(12 / 12), 1); assert.equal(nearestRung(1000), 1000);
  // the step budget: a capped frame falls behind rather than taking bigger steps
  assert.equal(stepsFor(0, 1000, 1 / 72).n, 27); assert.equal(stepsFor(0, 1000, 1000).capped, true); assert.equal(DT, 0.5);
});

test("T10 frames: dip, straight-line horizon, grazing ray, model scale, Moon, floating origin", () => {
  for (const [h, d] of [[8e3, 2.87], [150e3, 12.30], [400e3, 19.78], [1000e3, 30.17]]) near(F.horizonDipDeg(L.R, h), d, 0.01);
  near(km(F.horizonStraightM(L.R, 150e3)), 1392, 1, "straight-line distance to the horizon at 150 km");
  // Tesla fix 2: the same horizon measured along the ground is shorter
  for (const [h, g] of [[150e3, 1370], [8e3, 319], [400e3, 2202], [1000e3, 3360]]) near(km(F.horizonGroundM(L.R, h)), g, 1, "ground distance " + h);
  const fr = F.mountainFrame(NM_CONFIG.rig, L.R, 150e3);
  const o = fr.muzzle, c = fr.earthCentre, dip = F.horizonDipDeg(L.R, 150e3), graze = F.raySphere(o, F.dippedDir(dip + 1e-4), c, L.R), dn = F.raySphere(o, [0, -1, 0], c, L.R);
  near(km(graze), 1392, 15, "grazing ray at the 12.30 deg dip (12.3044 exactly)"); near(km(dn), 150.0, 0.01, "straight down");
  assert.equal(F.raySphere(o, F.dippedDir(12.0), c, L.R), null); // shallower than the dip misses
  near(F.modelScale(0.30, L.R), 2.3511e-8, 1e-12); near(150e3 * F.modelScale(0.30, L.R) * 1e3, 3.53, 0.01); near(400e3 * F.modelScale(0.30, L.R) * 1e3, 9.40, 0.01);
  const m = F.moonAtScale(0.30, L.R, 384400e3, NM_CONFIG.moonRadiusM); near(m.distM, 9.04, 0.01); near(m.diameterM, 0.082, 0.001);
  // floating origin: subtract in doubles, cast once
  const h = 1000e3, r0 = L.R + h, mf = F.mountainFrame(NM_CONFIG.rig, L.R, h);
  const s = makeShot({ ...L, h, v: Math.sqrt(L.GM / r0) }); let maxE = 0, maxRel = 0;
  for (let i = 0; i < 2000; i++) {
    stepShot(s); const g = F.toGpuRelative(mf, L.R, h, s.x, s.y);
    maxE = Math.max(maxE, Math.abs(Math.abs(s.x) - 0), Math.abs(s.y)); maxRel = Math.max(maxRel, Math.hypot(s.x, s.y));
    const want = [ (s.x - r0), -s.y ]; assert.ok(Math.abs(g[1] - want[0]) <= 1e-7 * Math.max(1, Math.abs(want[0])) + 1e-9); assert.ok(Math.abs(g[2] - want[1]) <= 1e-7 * Math.max(1, Math.abs(want[1])) + 1e-9);
  }
  assert.ok(maxE < 1e7, "Earth-centred coordinates stay under 1e7 m at h=1000 km: " + maxE);
  const x = r0 + 1.2345, sub = x - r0; assert.ok(Math.abs(sub - 1.2345) < 1e-6, "double subtraction error under 1e-6 m");
  const near32 = F.toGpuRelative(mf, L.R, h, r0 + 0.5, 0.25); assert.ok(Math.abs(near32[1] - 0.5) < 1e-6 && Math.abs(near32[2] + 0.25) < 1e-6);
});

test("T11 the analytic classifier agrees with the simulation", () => {
  for (const hk of [8, 150, 400]) {
    const h = hk * 1e3, r0 = L.R + h, vc = Math.sqrt(L.GM / r0);
    for (const f of [0.5, 0.9, 0.99, 0.999, 1.001, 1.1, 1.3, 1.41, 1.42]) {
      const v = f * vc, ve = Math.sqrt(2) * vc;
      if (Math.abs(v - vc) < 0.5 || Math.abs(v - ve) < 0.5) continue;
      // skip speeds within 0.5 m/s of the landing boundary too
      const vEdge = vc * Math.sqrt(2 * (L.R / r0) / (1 + L.R / r0)); if (Math.abs(v - vEdge) < 0.5) continue;
      const cls = classify(L, h, v);
      if (cls === "lands") { const s = runShot({ ...L, h, v }, { tmax: 600 * 40 }); assert.equal(s.status, "landed", `${hk} km ${f}`); }
      else if (cls === "bound") { const s = runShot({ ...L, h, v }, { tmax: 3 * 5400 }); assert.notEqual(s.status, "landed", `${hk} km ${f}`); }
      else { const s = runShot({ ...L, h, v }, { tmax: 7 * 86400 }); assert.notEqual(s.status, "landed", `${hk} km ${f}`); assert.ok(Math.hypot(s.x, s.y) > 20 * L.R, `${hk} km ${f} escapes`); }
    }
  }
});

test("bracket lines come from the student's own shots", () => {
  const b = bracketOf([{ v: 7000, landed: true }, { v: 7761, landed: true }, { v: 7762, landed: false }, { v: 7900, landed: false }]);
  assert.deepEqual(b, { highestLanded: 7761, lowestNotLanded: 7762, gap: 1 });
  assert.deepEqual(bracketOf([{ v: 7000, landed: true }]), { highestLanded: 7000, lowestNotLanded: null, gap: null });
  assert.deepEqual(bracketOf([{ v: 9000, landed: false }]), { highestLanded: null, lowestNotLanded: 9000, gap: null });
  assert.deepEqual(bracketOf([{ v: 7500, landed: null }]), { highestLanded: null, lowestNotLanded: null, gap: null });
});

test("frames: the Earth texture frame puts the cannon over its lat/lon, flight goes east, north is up in Model view", () => {
  const { texRotation, planeAxes, latLonToVec, mat3vec, transpose3, sunWorld } = F;
  for (const fr of [F.mountainFrame(NM_CONFIG.rig, L.R, 150e3), F.modelFrame([0, 1.2, -0.9], 0.5, L.R)]) {
    const R3 = texRotation(fr, 30, -40), { u, f, o } = planeAxes(fr), P = latLonToVec(30, -40);
    const back = mat3vec(transpose3(R3), P); for (let i = 0; i < 3; i++) near(back[i], u[i], 1e-12);
    const det = R3[0][0] * (R3[1][1] * R3[2][2] - R3[1][2] * R3[2][1]) - R3[0][1] * (R3[1][0] * R3[2][2] - R3[1][2] * R3[2][0]) + R3[0][2] * (R3[1][0] * R3[2][1] - R3[1][1] * R3[2][0]);
    near(det, 1, 1e-12);
    const sun = sunWorld(fr, NM_CONFIG.sunPlane); near(Math.hypot(...sun), 1, 1e-12); assert.ok(sun[0] * u[0] + sun[1] * u[1] + sun[2] * u[2] > 0, "cannon is on the day side");
  }
  const mdl = F.modelFrame([0, 0, 0], 0.5, L.R), north = mat3vec(transpose3(texRotation(mdl, 30, -40)), [0, 1, 0]);
  assert.ok(north[1] > 0.4, "north is up in Model view"); // tilted by the 30 degree latitude
});
