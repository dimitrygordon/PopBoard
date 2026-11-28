// Gravity Force sim. Teaching spec v1.2, section 12, T1-T14, T16, T19.
//   node --test tests/gf-sim.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  GF, pull, surfaceG, weighN, lbFromN, issAt, wellDepth, stepMarble, marbleAccel,
  distanceFactor, massFactor, accelOf, pairForce, s2Arrows, s1ArrowLength,
  timesEarth, moonDistanceRatio, sameMassTwin, worldsBySurfaceG, s3NewtonText,
} from "../public/gravity-force/gf-sim.js";

const near = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg || ""} got ${got} want ${want} tol ${tol}`);
const rel = (got, want, tol, msg) => assert.ok(Math.abs(got - want) / Math.abs(want) <= tol, `${msg || ""} got ${got} want ${want}`);

test("T1 pull ratio at 2x, 3x, 0.5x, 4x distance", () => {
  const m1 = GF.worlds.earth.massKg;
  const m2 = GF.worlds.moon.massKg;
  const r = GF.earthMoonM;
  const f0 = pull(m1, m2, r);
  const cases = [[2, 1 / 4], [3, 1 / 9], [0.5, 4], [4, 1 / 16]];
  for (const [times, want] of cases) {
    near(pull(m1, m2, r * times) / f0, want, 1e-12, `distance x${times}`);
    near(distanceFactor(times), want, 1e-12, `factor x${times}`);
  }
});

test("T2 pull ratio when masses change", () => {
  const m = 10;
  const r = 3;
  const f0 = pull(m, m, r);
  near(pull(2 * m, m, r) / f0, 2, 1e-12);
  near(pull(2 * m, 2 * m, r) / f0, 4, 1e-12);
  near(pull(3 * m, 0.5 * m, r) / f0, 1.5, 1e-12);
  near(massFactor(2, 1), 2, 1e-12);
  near(massFactor(2, 2), 4, 1e-12);
  near(massFactor(3, 0.5), 1.5, 1e-12);
});

test("T3 traveler on Earth is 491.0 N", () => {
  near(weighN("earth", GF.travelerKg), 491.0, 0.1);
  near(pull(GF.travelerKg, GF.worlds.earth.massKg, GF.worlds.earth.radiusM), 491.0, 0.1);
});

test("T4 surface g for Earth, Moon, Mars, Jupiter", () => {
  const got = ["earth", "moon", "mars", "jupiter"].map(surfaceG);
  const want = [9.820, 1.624, 3.728, 24.79];
  got.forEach((g, i) => near(g, want[i], 0.005, want[i]));
});

test("T5 pull on the 50 kg traveler", () => {
  const got = ["earth", "moon", "mars", "jupiter"].map((w) => weighN(w, 50));
  near(got[0], 491.0, 0.1);
  near(got[1], 81.2, 0.05);
  near(got[2], 186.4, 0.1);
  near(got[3], 1239, 1);
});

test("T6 neutron star, 1.4 Suns, 12 km radius, to 1 percent", () => {
  assert.equal(GF.worlds.ns.massKg, 1.4 * GF.sunMassKg);
  assert.equal(GF.worlds.ns.radiusM, 12000);
  rel(surfaceG("ns"), 1.29e12, 0.01);
  rel(weighN("ns", 50), 6.45e13, 0.01);
  assert.ok(GF.nsRadiusM * 2 === 24000);
});

test("T7 ISS at 400 km", () => {
  const iss = issAt(400);
  near(iss.ratio, 0.8853, 0.0001);
  near(iss.g, 8.694, 0.001);
  near(iss.pull, 434.7, 0.1);
  near(iss.speedKms, 7.673, 0.001);
  near(iss.periodMin, 92.4, 0.1);
  assert.equal(GF.issAltKm, 400);
});

test("T8 Earth and Moon force", () => {
  const f = pull(GF.worlds.earth.massKg, GF.worlds.moon.massKg, GF.earthMoonM);
  rel(f, 1.982e20, 5e-4);
});

test("T9 Sun and Earth force", () => {
  const f = pull(GF.sunMassKg, GF.worlds.earth.massKg, GF.auM);
  rel(f, 3.542e22, 5e-4);
});

test("T10 two students, 50 kg and 60 kg, 1.0 m", () => {
  const f = pull(GF.studentAKg, GF.studentBKg, GF.studentSeparationM);
  rel(f, 2.002e-7, 5e-4);
});

test("T11 Earth and Moon accelerations", () => {
  const d = GF.earthMoonM;
  const earth = accelOf(GF.worlds.earth.massKg, GF.worlds.moon.massKg, d);
  const moon = accelOf(GF.worlds.moon.massKg, GF.worlds.earth.massKg, d);
  rel(earth, 3.318e-5, 1e-3);
  rel(moon, 2.698e-3, 1e-3);
});

test("T12 Moon-distance pull ratio", () => {
  const want = (6.371e6 / 3.844e8) ** 2;
  near(moonDistanceRatio(), want, 0);
  near(moonDistanceRatio(), 2.747e-4, 1e-7);
});

test("T13 equal pull on both bodies", () => {
  const samples = [
    [1, 2, 3],
    [GF.travelerKg, GF.worlds.earth.massKg, GF.worlds.earth.radiusM],
    [GF.ballKg, GF.sunMassKg, 1e10],
    [1e-3, 1e30, 0.5],
    [GF.worlds.moon.massKg, GF.worlds.earth.massKg, GF.earthMoonM],
  ];
  for (const [a, b, r] of samples) {
    assert.equal(pull(a, b, r), pull(b, a, r));
    const pair = pairForce(a, b, r);
    assert.equal(pair.on1, pair.on2);
  }
});

test("T14 S2 arrows on A and B have the same drawn length", () => {
  const samples = [
    [GF.ballKg, GF.worlds.earth.massKg, 1e10],
    [GF.chips.wd.massKg, GF.sunMassKg, 1e10],
    [1, 1e24, 4],
    [7, 3, 2],
  ];
  for (const [a, b, r] of samples) {
    const arrows = s2Arrows(a, b, r);
    assert.equal(arrows.a, arrows.b);
    assert.equal(s2Arrows(b, a, r).a, arrows.a);
    assert.ok(arrows.a !== 0);
  }
});

test("T16 marble motion ignores mass, and the same-mass twin matches above the Sun", () => {
  const base = { x: 1.2, y: -0.4, vx: 0.15, vy: -0.05, s: 8, e: 0.02 };
  let light = { ...base, mass: 1 };
  let heavy = { ...base, mass: 1e9 };
  let none = { ...base };
  for (let i = 0; i < 300; i++) {
    light = stepMarble(light, 0.02);
    heavy = stepMarble(heavy, 0.02);
    none = stepMarble(none, 0.02);
  }
  assert.equal(light.x, heavy.x);
  assert.equal(light.y, heavy.y);
  assert.equal(light.vx, heavy.vx);
  assert.equal(light.vy, heavy.vy);
  assert.equal(light.x, none.x);
  assert.equal(light.mass, 1);
  assert.equal(heavy.mass, 1e9);
  assert.notEqual(light.x, base.x);

  const R = GF.sunRadiusM;
  for (const r of [R * 1.001, R * 2, 1e10, GF.auM]) {
    const twin = sameMassTwin(r, 50);
    assert.equal(twin.aboveSurface, true);
    assert.equal(twin.sun, twin.twin);
    assert.equal(twin.sun, pull(GF.sunMassKg, 50, r));
  }
  assert.equal(GF.twinMassKg, GF.sunMassKg);
});

test("T19 S3 spring-scale pounds from unrounded newtons", () => {
  const labeled = [
    [491, "about 110 lb", 110],
    [81.2, "about 18 lb", 18],
    [186.4, "about 42 lb", 42],
    [1240, "about 279 lb", 279],
    [6.45e13, "about 15 trillion pounds", 1.5e13],
  ];
  for (const [n, text, pounds] of labeled) {
    const lb = lbFromN(n);
    assert.equal(lb.text, text);
    assert.equal(lb.lbf, n / 4.4482216152605);
    rel(lb.pounds, pounds, 1e-12);
  }
  const fromWorlds = {
    earth: "about 110 lb",
    moon: "about 18 lb",
    mars: "about 42 lb",
    jupiter: "about 279 lb",
    ns: "about 15 trillion pounds",
  };
  for (const [world, text] of Object.entries(fromWorlds)) {
    assert.equal(lbFromN(weighN(world, 50)).text, text, world);
  }
});

test("Verlet step matches the softened inward acceleration, and depth matches the spec", () => {
  const s = 2;
  const e = 1;
  const dt = 0.1;
  const st = { x: 3, y: 4, vx: 0, vy: 0, s, e, mass: 9 };
  const a0 = marbleAccel(3, 4, s, e);
  const denom = (9 + 16 + 1) ** 1.5;
  near(a0.ax, -s * 3 / denom, 1e-12);
  near(a0.ay, -s * 4 / denom, 1e-12);
  const next = stepMarble(st, dt);
  near(next.x, 3 + 0.5 * a0.ax * dt * dt, 1e-12);
  near(next.y, 4 + 0.5 * a0.ay * dt * dt, 1e-12);
  assert.equal(next.mass, 9);
  assert.equal(wellDepth(s, 5, e), -s / Math.sqrt(25 + 1));
  assert.ok(next.x < 3 && next.y < 4);
});

test("S1 arrow is 5 cm at twice the distance and caps at 4 times the start", () => {
  near(s1ArrowLength(2, 0.2), 0.05, 1e-12);
  near(s1ArrowLength(0.25, 0.2), 0.8, 1e-12);
});

test("world order and S3 newton captions", () => {
  assert.deepEqual(worldsBySurfaceG(), ["moon", "mars", "earth", "jupiter", "ns"]);
  near(timesEarth("moon"), 0.165, 0.001);
  assert.equal(s3NewtonText("earth"), "491 N");
  assert.equal(s3NewtonText("moon"), "81 N");
  assert.equal(s3NewtonText("mars"), "186 N");
  assert.equal(s3NewtonText("jupiter"), "1,240 N");
  assert.equal(s3NewtonText("ns"), "about 6.5 x 10^13 N");
});
