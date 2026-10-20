// Pendulum classroom-physics checks. No Firebase, no build step.
//   node --test tests/pendulum-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  SUBSTEP, smallAnglePeriod, ellipticPeriodRatio, seriesPeriodRatio,
  createPendulum, integrate, mechanicalEnergy, measurePeriod,
  createCycleCounter, linearFit, dragToAngularRate, angularAccel
} from "../public/pendulum-physics.js";

const note = (row) => { console.log(row); };

const G = 9.80665;
const L = 1;

test("small-angle period matches 2π√(L/g) within 0.5%", () => {
  const theta = 5 * Math.PI / 180;
  const theory = smallAnglePeriod(L, G);
  const { period, meter } = measurePeriod({ theta, L, g: G, m: 1, b: 0, cycles: 8 });
  const err = Math.abs(period - theory) / theory;
  note(`SMALL-ANGLE  L=${L} m  g=${G}  θ₀=5°  T_sim=${period.toFixed(6)} s  T_theory=${theory.toFixed(6)} s  err=${(err * 100).toFixed(4)}%  cycles=${meter.cycles}  substep=${SUBSTEP}`);
  assert.ok(period > 0);
  assert.ok(err < 0.005, `period error ${(err * 100).toFixed(3)}%`);
});

test("mass has no effect on the undamped period", () => {
  const theta = 40 * Math.PI / 180;
  const light = measurePeriod({ theta, L, g: G, m: 0.2, b: 0, cycles: 6 });
  const heavy = measurePeriod({ theta, L, g: G, m: 50, b: 0, cycles: 6 });
  const a = createPendulum({ theta, omega: 0.3, L, m: 0.2, g: G, b: 0 });
  const b = createPendulum({ theta, omega: 0.3, L, m: 50, g: G, b: 0 });
  integrate(a, 12.345);
  integrate(b, 12.345);
  const rel = Math.abs(light.period - heavy.period) / light.period;
  note(`MASS  m=0.2 kg T=${light.period.toFixed(6)} s  m=50 kg T=${heavy.period.toFixed(6)} s  rel=${(rel * 100).toExponential(2)}%  θ(12.3s) light=${a.theta.toExponential(8)} heavy=${b.theta.toExponential(8)} Δθ=${Math.abs(a.theta - b.theta).toExponential(2)}`);
  assert.ok(rel < 1e-9, "periods differed");
  assert.ok(Math.abs(a.theta - b.theta) < 1e-12, "trajectory depended on mass");
  assert.ok(Math.abs(a.omega - b.omega) < 1e-12);
  assert.equal(angularAccel(0.4, -0.5, L, G, 0), -(G / L) * Math.sin(0.4));
});

test("undamped mechanical energy stays constant over many periods", () => {
  const theta = Math.PI / 2;
  const state = createPendulum({ theta, omega: 0, L, m: 1.7, g: G, b: 0 });
  const e0 = mechanicalEnergy(state.theta, state.omega, state.m, state.L, state.g);
  const T = smallAnglePeriod(L, G) * ellipticPeriodRatio(theta);
  const periods = 30;
  let maxAbs = 0;
  const steps = 600;
  const chunk = (T * periods) / steps;
  for (let i = 0; i < steps; i++) {
    integrate(state, chunk);
    const e = mechanicalEnergy(state.theta, state.omega, state.m, state.L, state.g);
    maxAbs = Math.max(maxAbs, Math.abs(e - e0));
  }
  const rel = maxAbs / e0;
  note(`ENERGY  θ₀=90°  m=1.7 kg  E0=${e0.toFixed(6)} J  max|ΔE|=${maxAbs.toExponential(3)} J  rel=${rel.toExponential(3)}  over ${periods} periods (${(T * periods).toFixed(2)} s)  E_end=${mechanicalEnergy(state.theta, state.omega, state.m, state.L, state.g).toFixed(6)} J`);
  assert.ok(rel < 1e-8, `energy drifted by ${(rel * 100).toExponential(2)}%`);
});

test("large-angle period exceeds the small-angle value and matches the elliptic result", () => {
  const theta = Math.PI / 2;
  const theorySmall = smallAnglePeriod(L, G);
  const elliptic = ellipticPeriodRatio(theta);
  const series = seriesPeriodRatio(theta, 20);
  const { period } = measurePeriod({ theta, L, g: G, m: 1, b: 0, cycles: 8 });
  const ratio = period / theorySmall;
  const err = Math.abs(ratio - elliptic) / elliptic;
  note(`LARGE-ANGLE  θ₀=90°  T_sim=${period.toFixed(6)} s  T_small=${theorySmall.toFixed(6)} s  ratio=${ratio.toFixed(5)}  elliptic=${elliptic.toFixed(5)}  series20=${series.toFixed(5)}  vs elliptic ${(err * 100).toFixed(4)}%  (known ~1.180)`);
  assert.ok(period > theorySmall * 1.05, "large-angle period did not exceed small-angle");
  assert.ok(Math.abs(elliptic - 1.18034) < 0.001, "elliptic reference is not the known 90° value");
  assert.ok(err < 0.005, `simulated ratio off elliptic by ${(err * 100).toFixed(3)}%`);
  assert.ok(Math.abs(ratio - 1.180) < 0.008);
});

test("damping reduces energy monotonically", () => {
  const state = createPendulum({
    theta: 70 * Math.PI / 180,
    omega: 0,
    L,
    m: 1,
    g: G,
    b: 0.35
  });
  const e0 = mechanicalEnergy(state.theta, state.omega, state.m, state.L, state.g);
  let prev = e0;
  let worstRise = 0;
  const samples = [];
  for (let i = 0; i < 400; i++) {
    integrate(state, 0.025);
    const e = mechanicalEnergy(state.theta, state.omega, state.m, state.L, state.g);
    worstRise = Math.max(worstRise, e - prev);
    prev = e;
    if (i % 40 === 39) samples.push(e);
  }
  const e1 = prev;
  note(`DAMPING  b=0.35 s⁻¹  E0=${e0.toFixed(5)} J  E10s=${e1.toFixed(5)} J  drop=${((1 - e1 / e0) * 100).toFixed(2)}%  worst sample-to-sample rise=${worstRise.toExponential(2)} J  trail=${samples.map((e) => e.toFixed(3)).join(" → ")}`);
  assert.ok(e1 < e0 * 0.5, "energy did not fall substantially");
  assert.ok(worstRise <= 1e-6, `energy rose by ${worstRise}`);
  assert.equal(dragToAngularRate(0.2, 2), 0.1);
  assert.ok(dragToAngularRate(0.2, 4) < dragToAngularRate(0.2, 1));
});

test("T² vs L is linear with slope 4π²/g", () => {
  const theta = 5 * Math.PI / 180;
  const lengths = [0.4, 0.7, 1, 1.4, 1.8, 2.4, 3];
  const rows = lengths.map((len) => {
    const measured = measurePeriod({ theta, L: len, g: G, m: 1, b: 0, cycles: 5 });
    return { L: len, T: measured.period, T2: measured.period ** 2 };
  });
  const fit = linearFit(rows.map((r) => r.L), rows.map((r) => r.T2));
  const expected = 4 * Math.PI * Math.PI / G;
  const err = Math.abs(fit.slope - expected) / expected;
  note(`T2-VS-L  slope=${fit.slope.toFixed(6)}  4π²/g=${expected.toFixed(6)}  err=${(err * 100).toFixed(4)}%  intercept=${fit.intercept.toExponential(2)}  points=${rows.map((r) => r.L + ":" + r.T2.toFixed(4)).join(" ")}`);
  assert.ok(err < 0.005, `slope error ${(err * 100).toFixed(3)}%`);
  assert.ok(Math.abs(fit.intercept) < 0.02, "intercept should be ~0");
});

test("cycle counter measures the period accurately", () => {
  const Ttrue = 1.37;
  const meter = createCycleCounter();
  const dt = 1 / 120;
  for (let i = 0; i <= Math.round((Ttrue * 7) / dt); i++) {
    const t = i * dt;
    meter.push(Math.cos((2 * Math.PI * t) / Ttrue), t);
  }
  const syntheticErr = Math.abs(meter.mean() - Ttrue) / Ttrue;

  const theta = 55 * Math.PI / 180;
  const run = measurePeriod({ theta, L: 1.25, g: G, m: 3, b: 0, cycles: 7 });
  const expected = smallAnglePeriod(1.25, G) * ellipticPeriodRatio(theta);
  const simErr = Math.abs(run.period - expected) / expected;
  note(`CYCLE  synthetic T=${meter.mean().toFixed(6)} s vs ${Ttrue} (${(syntheticErr * 100).toFixed(5)}%, n=${meter.cycles})  pendulum T=${run.period.toFixed(6)} s vs elliptic ${expected.toFixed(6)} s (${(simErr * 100).toFixed(4)}%, n=${run.meter.cycles})`);
  assert.ok(meter.cycles >= 5);
  assert.ok(syntheticErr < 1e-4, "synthetic zero-crossing period is off");
  assert.ok(simErr < 0.005, "pendulum cycle counter missed the elliptic period");
});
