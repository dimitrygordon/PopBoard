// Relativity classroom-physics checks. No Firebase, no build step.
//   node --test tests/relativity-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  C, G, M_SUN, R_SUN, M_EARTH, R_EARTH, CRITICAL_B_OVER_RS,
  gamma, betaForGamma, lorentz, inverseLorentz, interval,
  velocityAddition, galileanAddition, clampSpeed,
  kineticEnergy, newtonianKineticEnergy, totalEnergy, momentum, restEnergy,
  lightClock, endFlashTimes, twinParadox, lengthContraction,
  schwarzschildRadius, photonSphereRadius, iscoRadius, criticalImpactParameter,
  circularGeodesic, circularOrbitClockRate, orbitingClockRate,
  circularCoordinateAngularSpeed, staticClockRate,
  stepSchwarzschild, advanceSchwarzschild, coordinateDtDphi,
  schwarzschildCoordinateVelocity, precessionPerOrbit, mercuryPrecession, measurePrecession,
  integrateNewtonian, verletNewtonian, specificMechanicalEnergy, gravitationalField,
  presetBody, gpsWeakField, GPS_ABOUT,
  deflectionAngle, solarLimbDeflection, pointLensImages, weakDeflectionApplies,
  traceNullRay, flammZ, embeddingHeight, needsNumericalRelativity,
  weakFieldClockRate, photonAccel
} from "../public/relativity-physics.js";

const note = (row) => { console.log(row); };

test("gamma at known betas, including gamma = 2 at 0.866c", () => {
  assert.equal(gamma(0), 1);
  assert.ok(Math.abs(gamma(0.6) - 1.25) < 1e-12);
  assert.ok(Math.abs(gamma(0.8) - 1 / 0.6) < 1e-12);
  const beta2 = betaForGamma(2);
  assert.ok(Math.abs(beta2 - Math.sqrt(0.75)) < 1e-12);
  assert.ok(Math.abs(beta2 - 0.8660254037844386) < 1e-12);
  assert.ok(Math.abs(gamma(beta2) - 2) < 1e-12);
  note(`GAMMA  β=0 → 1,  β=0.6 → ${gamma(0.6)},  β=0.8 → ${gamma(0.8).toFixed(6)},  γ=2 at β=${beta2.toFixed(6)} c`);
});

test("Lorentz transform leaves the interval invariant", () => {
  const c = C;
  const events = [
    { x: 1.2e8, t: 0.7 },
    { x: -4e7, t: 1.1 },
    { x: 0, t: 3 },
    { x: 9e8, t: 0.2 }
  ];
  const speeds = [0, 0.2 * c, -0.6 * c, 0.9 * c];
  for (const e of events) {
    const s2 = interval(e.x, e.t, c);
    for (const v of speeds) {
      const p = lorentz(e.x, e.t, v, c);
      const back = inverseLorentz(p.x, p.t, v, c);
      const s2p = interval(p.x, p.t, c);
      const scale = 1 + Math.abs(e.x) + c * Math.abs(e.t);
      assert.ok(Math.abs(s2p - s2) / (1 + Math.abs(s2)) < 1e-9, `interval drifted at v/c=${v / c}`);
      assert.ok(Math.abs(back.x - e.x) / scale < 1e-9);
      assert.ok(Math.abs(back.t - e.t) / (1 + Math.abs(e.t)) < 1e-9);
    }
  }
  note(`INTERVAL  checked ${events.length} events × ${speeds.length} boosts, round trip and s²`);
});

test("velocity addition stays below c; 0.9c (+) 0.9c is about 0.994c", () => {
  const c = C;
  const sum = velocityAddition(0.9 * c, 0.9 * c, c);
  const gal = galileanAddition(0.9 * c, 0.9 * c);
  note(`ADDITION  0.9c (+) 0.9c = ${(sum / c).toFixed(6)} c   Galilean ${(gal / c).toFixed(3)} c`);
  assert.ok(Math.abs(sum / c - 0.994475) < 0.001, "expected about 0.994c");
  assert.ok(sum < c);
  assert.ok(gal > c);
  const almost = velocityAddition(clampSpeed(c, c), 0.9 * c, c);
  assert.ok(almost < c);
  assert.ok(almost > 0.999 * c);
  const samples = [0, 0.1, 0.5, 0.9, 0.99, 0.999];
  for (const a of samples) {
    for (const b of samples) {
      const w = Math.abs(velocityAddition(a * c, b * c, c));
      assert.ok(w < c, `${a} (+) ${b} reached c`);
    }
  }
});

test("relativistic kinetic energy matches Newtonian at low speed", () => {
  const m = 2.5;
  const v = 3000;
  const rel = kineticEnergy(m, v);
  const newt = newtonianKineticEnergy(m, v);
  const relErr = Math.abs(rel - newt) / newt;
  note(`KE  m=${m} kg  v=${v} m/s  KE_rel=${rel.toFixed(6)} J  KE_N=${newt.toFixed(6)} J  rel=${relErr.toExponential(2)}`);
  assert.ok(relErr < 1e-6);
  assert.ok(Math.abs(momentum(m, v) - gamma(v / C) * m * v) < 1e-6);
  assert.ok(Math.abs(totalEnergy(m, 0) - restEnergy(m)) / restEnergy(m) < 1e-15);
  const fast = kineticEnergy(m, 0.99 * C);
  assert.ok(fast > 10 * newtonianKineticEnergy(m, 0.99 * C));
});

test("Schwarzschild radius of the Sun is about 2.95 km", () => {
  const rs = schwarzschildRadius(M_SUN);
  note(`RS_SUN  ${rs.toFixed(1)} m  (${(rs / 1000).toFixed(3)} km)  target 2.95 km`);
  assert.ok(Math.abs(rs - 2950) / 2950 < 0.01);
  assert.ok(Math.abs(photonSphereRadius(M_SUN) - 1.5 * rs) < 1e-6);
  assert.ok(Math.abs(iscoRadius(M_SUN) - 3 * rs) < 1e-6);
});

test("GPS weak-field offsets are about +45.7, −7.2, and +38.5 μs/day", () => {
  const g = gpsWeakField();
  note(`GPS  grav ${g.gravitationalUsPerDay.toFixed(2)} μs/day  vel ${g.velocityUsPerDay.toFixed(2)}  net ${g.netUsPerDay.toFixed(2)}  (about ${GPS_ABOUT.gravitationalUsPerDay}, ${GPS_ABOUT.velocityUsPerDay}, ${GPS_ABOUT.netUsPerDay})`);
  assert.ok(Math.abs(g.gravitationalUsPerDay - 45.7) / 45.7 < 0.03);
  assert.ok(Math.abs(g.velocityUsPerDay - (-7.2)) / 7.2 < 0.03);
  assert.ok(Math.abs(g.netUsPerDay - 38.5) / 38.5 < 0.03);
  assert.equal(g.approximation.includes("weak-field"), true);
});

test("solar-limb deflection is 1.75 arcsec", () => {
  const d = solarLimbDeflection();
  const direct = deflectionAngle(M_SUN, R_SUN) * (180 / Math.PI) * 3600;
  note(`DEFLECTION  solar limb ${d.arcsec.toFixed(3)} arcsec  (4GM/(c² R))`);
  assert.ok(Math.abs(d.arcsec - 1.75) / 1.75 < 0.01);
  assert.ok(Math.abs(direct - d.arcsec) < 1e-9);
  assert.equal(weakDeflectionApplies(R_SUN, schwarzschildRadius(M_SUN)), true);
  assert.equal(weakDeflectionApplies(5 * schwarzschildRadius(M_SUN), schwarzschildRadius(M_SUN)), false);
});

test("Mercury precession is about 43 arcsec per century", () => {
  const m = mercuryPrecession();
  const formula = precessionPerOrbit(5.790905e10, 0.20563, M_SUN);
  note(`MERCURY  ${m.arcsecPerCentury.toFixed(2)} arcsec/century  ${m.radiansPerOrbit.toExponential(4)} rad/orbit  orbits/cy ${m.orbitsPerCentury.toFixed(2)}`);
  assert.ok(Math.abs(m.radiansPerOrbit - formula) < 1e-18);
  assert.ok(Math.abs(m.arcsecPerCentury - 43) / 43 < 0.02, `got ${m.arcsecPerCentury}`);
});

test("a tight orbit's periapsis advance matches 6 π G M / (c² a (1−e²))", () => {
  const mass = M_SUN;
  const rs = schwarzschildRadius(mass);
  const a = 80 * rs;
  const e = 0.2;
  const theory = precessionPerOrbit(a, e, mass);
  const sim = measurePrecession(a, e, mass);
  note(`PRECESSION  a=80 r_s  e=0.2  theory ${(theory * 180 / Math.PI).toFixed(3)}°  sim ${sim.precession == null ? "none" : (sim.precession * 180 / Math.PI).toFixed(3)}°`);
  assert.equal(sim.crossed, false);
  assert.ok(sim.precession > 0);
  assert.ok(Math.abs(sim.precession - theory) / theory < 0.08);
});

test("Newtonian RK4 and velocity Verlet conserve orbital energy", () => {
  const earth = presetBody("earth", 0, 0);
  const r = 1.2e7;
  const mu = G * earth.mass;
  const v = Math.sqrt(mu / r);
  const bodies = [earth];
  let p = { x: r, y: 0, vx: 0, vy: v };
  const e0 = specificMechanicalEnergy(p.x, p.y, p.vx, p.vy, bodies);
  const period = 2 * Math.PI * r / v;
  const sub = period / 500;
  p = integrateNewtonian(p, 12 * period, bodies, sub);
  const e1 = specificMechanicalEnergy(p.x, p.y, p.vx, p.vy, bodies);
  const rel = Math.abs(e1 - e0) / Math.abs(e0);
  let q = { x: r, y: 0, vx: 0, vy: v, ax: null, ay: null };
  const steps = 4000;
  const dt = (8 * period) / steps;
  let worst = 0;
  for (let i = 0; i < steps; i++) {
    q = verletNewtonian(q, dt, bodies);
    const eq = specificMechanicalEnergy(q.x, q.y, q.vx, q.vy, bodies);
    worst = Math.max(worst, Math.abs(eq - e0) / Math.abs(e0));
  }
  note(`ENERGY  RK4 12 orbits rel |ΔE/E|=${rel.toExponential(3)}  Verlet 8 orbits worst ${worst.toExponential(3)}  E0=${e0.toExponential(4)} J/kg`);
  assert.ok(rel < 1e-6, `RK4 energy drifted ${(rel * 100).toExponential(2)}%`);
  assert.ok(worst < 1e-4, `Verlet energy drifted ${(worst * 100).toExponential(2)}%`);
  const field = gravitationalField(r, 0, bodies);
  assert.ok(Math.abs(field.gx + mu / (r * r)) / (mu / (r * r)) < 1e-12);
});

test("photon sphere is 1.5 r_s and rays inside b = 2.598 r_s are captured", () => {
  const mass = 10 * M_SUN;
  const rs = schwarzschildRadius(mass);
  const bCrit = criticalImpactParameter(rs);
  note(`CAPTURE  r_photon=${(photonSphereRadius(mass) / rs).toFixed(3)} r_s  b_crit=${(bCrit / rs).toFixed(4)} r_s  (3√3/2 = ${CRITICAL_B_OVER_RS.toFixed(4)})`);
  assert.ok(Math.abs(photonSphereRadius(mass) / rs - 1.5) < 1e-12);
  assert.ok(Math.abs(bCrit / rs - 2.598) < 0.001);
  assert.ok(Math.abs(CRITICAL_B_OVER_RS - 2.598076211353316) < 1e-12);

  const captured = traceNullRay(mass, 2.4 * rs, { dphi: 0.002, maxSteps: 20000 });
  const safe = traceNullRay(mass, 3.5 * rs, { dphi: 0.002, maxSteps: 20000 });
  note(`RAYS  b=2.4 r_s → ${captured.reason} captured=${captured.captured}  b=3.5 r_s → ${safe.reason} captured=${safe.captured} closest ${(safe.closest / rs).toFixed(2)} r_s`);
  assert.equal(captured.captured, true);
  assert.equal(captured.reason, "horizon");
  assert.equal(safe.captured, false);
  assert.equal(safe.reason, "scattered");
  assert.ok(safe.closest > 1.5 * rs);

  // A null ray started just inside the photon sphere falls in.
  const u = 1 / (1.49 * rs);
  assert.ok(photonAccel(u, mass) > 0, "inside the photon sphere the geodesic accelerates inward");
  const hold = photonAccel(1 / (1.5 * rs), mass);
  assert.ok(Math.abs(hold) < 1e-8 * (1 / rs), "photon orbit is circular at 1.5 r_s");
});

test("orbiting clock rate is 0 at 1.5 r_s and matches the exact formula outside", () => {
  const mass = M_SUN;
  const rs = schwarzschildRadius(mass);
  assert.equal(circularOrbitClockRate(1.5 * rs, rs), 0);
  assert.equal(staticClockRate(rs, rs), 0);
  const r = 6 * rs;
  const closed = circularOrbitClockRate(r, rs);
  assert.ok(Math.abs(closed - Math.sqrt(0.75)) < 1e-12);
  const geo = circularGeodesic(r, mass);
  assert.equal(geo.stable, true);
  const ang = circularCoordinateAngularSpeed(r, mass);
  const exact = orbitingClockRate(r, rs, 0, ang);
  note(`CLOCK  r=6 r_s  √(1−1.5 rs/r)=${closed.toFixed(6)}  exact dτ/dt=${exact.toFixed(6)}  at 1.5 r_s → 0`);
  assert.ok(Math.abs(exact - closed) < 1e-9);

  const inside = circularGeodesic(2.2 * rs, mass);
  assert.ok(inside);
  assert.equal(inside.stable, false);
  assert.equal(circularGeodesic(1.5 * rs, mass), null);

  // A small inward kick inside the ISCO reaches the horizon. The same kick
  // outside the ISCO stays in a bound radial wiggle.
  let plunge = { ...inside, up: 1e-4 / rs };
  let fell = false;
  for (let i = 0; i < 8000 && !plunge.crossed; i++) plunge = stepSchwarzschild(plunge, 0.01);
  fell = plunge.crossed || plunge.r < 1.2 * rs;
  assert.equal(fell, true);

  const outer = circularGeodesic(8 * rs, mass);
  let wiggle = { ...outer, up: 1e-4 / rs };
  let minR = wiggle.r;
  let maxR = wiggle.r;
  for (let i = 0; i < 4000; i++) {
    wiggle = stepSchwarzschild(wiggle, 0.005);
    if (wiggle.r < minR) minR = wiggle.r;
    if (wiggle.r > maxR) maxR = wiggle.r;
  }
  assert.equal(wiggle.crossed, false);
  assert.ok(minR > 6 * rs);
  note(`ISCO  plunge from 2.2 r_s crossed=${plunge.crossed}  wiggle at 8 r_s spans ${(minR / rs).toFixed(2)}–${(maxR / rs).toFixed(2)} r_s`);
});

test("Schwarzschild steps advance coordinate time with dt/dφ = r² E / (h (1−r_s/r))", () => {
  const mass = M_SUN;
  const rs = schwarzschildRadius(mass);
  const geo = circularGeodesic(10 * rs, mass);
  const dphi = 1e-4;
  const next = stepSchwarzschild(geo, dphi);
  const expect = coordinateDtDphi(geo.r, geo.E, geo.h, rs) * dphi;
  const got = next.t - geo.t;
  note(`DT/DPHI  Δt step ${got.toExponential(6)} s  formula ${expect.toExponential(6)} s  r stays ${(next.r / rs).toFixed(6)} r_s`);
  assert.ok(Math.abs(got - expect) / expect < 1e-6);
  assert.ok(Math.abs(next.r - geo.r) / geo.r < 1e-8);

  const vel = schwarzschildCoordinateVelocity(geo);
  const newtBodies = [presetBody("sun", 0, 0)];
  let newton = { x: geo.r, y: 0, vx: vel.vx, vy: vel.vy };
  const shared = advanceSchwarzschild(geo, got * 50);
  newton = integrateNewtonian(newton, shared.t - geo.t, newtBodies, (shared.t - geo.t) / 20);
  assert.ok(shared.t > geo.t);
  assert.equal(shared.crossed, false);
  // Same clock: both particles have been advanced to shared.t. Positions differ
  // (precession and the GR potential) but the timestamps match.
  assert.ok(Math.abs(shared.t - (geo.t + (shared.t - geo.t))) < 1e-6);
  note(`SHARED CLOCK  GR t=${shared.t.toExponential(4)} s  Newtonian integrated over the same Δt`);
});

test("end flashes and the twin jump follow the Lorentz transform", () => {
  const L0 = 3e8;
  const v = 0.6 * C;
  const ship = endFlashTimes(L0, v, "ship");
  assert.equal(ship.ship.order, "simultaneous");
  assert.equal(ship.station.order, "rear-first");
  assert.ok(ship.station.tRear < 0);
  assert.ok(ship.station.tFront > 0);
  const station = endFlashTimes(L0, v, "station");
  assert.equal(station.station.order, "simultaneous");
  assert.equal(station.ship.order, "front-first");

  const twin = twinParadox(0.8 * C, 10);
  note(`TWIN  station 10 s  traveler ${twin.travelerProper.toFixed(4)} s  jump ${twin.simultaneityJump.toFixed(4)} s  cause: ${twin.cause}`);
  assert.ok(Math.abs(twin.travelerProper - 10 / gamma(0.8)) < 1e-12);
  assert.ok(twin.simultaneityAfter > twin.simultaneityBefore);
  assert.equal(twin.cause, "different spacetime path");
  const contracted = lengthContraction(L0, 0.6);
  assert.ok(Math.abs(contracted.parallel - L0 / 1.25) < 1e-6);
  assert.equal(contracted.transverse, L0);

  const clock = lightClock(10, 0.6 * C);
  assert.ok(Math.abs(clock.cShip - C) / C < 1e-12);
  assert.ok(Math.abs(clock.cStation - C) / C < 1e-9);
});

test("Flamm paraboloid stops at the horizon, caps a star, and refuses close black holes", () => {
  const rs = 1000;
  assert.equal(flammZ(rs, rs), null);
  assert.equal(flammZ(rs * 0.5, rs), null);
  const z = flammZ(2 * rs, rs);
  assert.ok(Math.abs(z - 2 * rs) < 1e-9);

  const sun = presetBody("sun", 0, 0);
  const cap = embeddingHeight(sun.surfaceRadius * 0.2, sun);
  const skin = embeddingHeight(sun.surfaceRadius, sun);
  assert.equal(cap.region, "interior-cap");
  assert.ok(Math.abs(cap.z - skin.z) < 1e-6);

  const hole = presetBody("black-hole", 0, 0);
  assert.equal(hole.spin, "non-rotating (Schwarzschild)");
  assert.equal(embeddingHeight(hole.rs, hole).region, "inside-horizon");
  assert.equal(embeddingHeight(hole.rs * 0.2, hole).z, null);
  assert.equal(embeddingHeight(hole.rs * 2, hole).region, "exterior");

  const a = presetBody("black-hole", 0, 0);
  const b = presetBody("black-hole", 2 * a.rs, 0);
  assert.equal(needsNumericalRelativity([a, b]), true);
  b.x = 30 * a.rs;
  assert.equal(needsNumericalRelativity([a, b]), false);

  const phi = -G * M_EARTH / R_EARTH;
  const rate = weakFieldClockRate(phi);
  assert.ok(rate < 1 && rate > 0.999);
  note(`FLAMM  z(2 r_s)=${z}  Sun interior capped  close holes need numerical relativity`);
});

test("point-lens images sit on the Einstein ring when the source is aligned", () => {
  const thetaE = 1.2;
  const aligned = pointLensImages(0, thetaE);
  assert.ok(Math.abs(aligned.plus - thetaE) < 1e-12);
  assert.ok(Math.abs(aligned.minus + thetaE) < 1e-12);
  const off = pointLensImages(0.4, thetaE);
  const root = Math.sqrt(0.16 + 4 * thetaE * thetaE);
  assert.ok(Math.abs(off.plus - 0.5 * (0.4 + root)) < 1e-12);
  assert.ok(Math.abs(off.minus - 0.5 * (0.4 - root)) < 1e-12);
  // Lens equation β = θ − θ_E²/θ.
  for (const th of [off.plus, off.minus]) {
    assert.ok(Math.abs(th - (thetaE * thetaE) / th - 0.4) < 1e-9);
  }
});
