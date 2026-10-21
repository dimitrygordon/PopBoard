// Simple machines checks. No Firebase, no build step.
//   node --test tests/machines-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  G, LEVER_PRESETS,
  analyzeLever, analyzePulley, analyzePlane, analyzeWorkbench,
  leverGeometry, pulleyTensions, movablePulleyCount, work
} from "../public/machines-physics.js";

const note = (row) => { console.log(row); };
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test("lever balances at τ_net = 0 and MA = d_in/d_out for all three classes", () => {
  const cases = [
    { key: "seesaw", name: "first / seesaw" },
    { key: "wheelbarrow", name: "second / wheelbarrow" },
    { key: "tweezers", name: "third / tweezers" }
  ];
  for (const c of cases) {
    const preset = LEVER_PRESETS[c.key];
    const geo = leverGeometry(preset);
    const r = analyzeLever({
      ...geo,
      loadMass: preset.loadMass,
      g: G,
      effortAngle: 0,
      frictionTorque: 0,
      outputDisplacement: 0.2
    });
    const armMA = r.effortArm / r.loadArm;
    note(
      `LEVER ${c.name}  class=${r.leverClass}  d_in=${r.effortArm.toFixed(4)} m  d_out=${r.loadArm.toFixed(4)} m  ` +
      `MA=${r.idealMA.toFixed(6)}  τ_net=${r.tauNet.toExponential(2)} N·m  ` +
      `F_in=${r.appliedForce.toFixed(4)} N  F_out=${r.outputForce.toFixed(4)} N  ` +
      `s_in=${r.inputDisplacement.toFixed(4)} m  s_out=${r.outputDisplacement.toFixed(4)} m  ` +
      `W_in=${r.inputWork.toFixed(6)} J  W_out=${r.outputWork.toFixed(6)} J  ` +
      `η=${r.efficiency.toFixed(4)}%`
    );
    assert.equal(r.leverClass, preset.leverClass);
    assert.ok(Math.abs(r.tauNet) < 1e-9, c.name + " τ_net");
    assert.equal(r.balanced, true);
    assert.ok(close(r.idealMA, armMA), c.name + " MA");
    assert.ok(close(r.idealMA, r.dIn / r.dOut));
    assert.ok(close(r.inputDisplacement / r.outputDisplacement, r.idealMA));
    assert.ok(close(r.actualMA, r.idealMA));
    assert.ok(close(r.inputWork, work(r.appliedForce, r.inputDisplacement)));
    assert.ok(close(r.outputWork, work(r.outputForce, r.outputDisplacement)));
    assert.ok(close(r.ideal.inputWork, r.ideal.outputWork));
    assert.ok(close(r.inputWork, r.outputWork));
  }

  const unequal = [
    { leverClass: 1, effortArm: 2, loadArm: 0.5, loadForce: 80 },
    { leverClass: 2, effortArm: 1.5, loadArm: 0.3, loadForce: 100 },
    { leverClass: 3, effortArm: 0.25, loadArm: 1, loadForce: 12 }
  ];
  for (const spec of unequal) {
    const r = analyzeLever({ ...spec, g: G, effortAngle: 0, frictionTorque: 0, deltaPhi: 0.15 });
    note(
      `LEVER arms class=${spec.leverClass}  d_in=${spec.effortArm}  d_out=${spec.loadArm}  ` +
      `MA=${r.idealMA.toFixed(6)}  τ_E=${r.tauEffort.toFixed(4)}  τ_L=${r.tauLoad.toFixed(4)}  τ_net=${r.tauNet.toExponential(2)}`
    );
    assert.ok(Math.abs(r.tauNet) < 1e-9);
    assert.ok(close(r.idealMA, spec.effortArm / spec.loadArm));
    assert.ok(close(r.appliedForce, spec.loadForce * spec.loadArm / spec.effortArm));
  }
});

test("ideal pulley MA equals supporting segments and pull distance is MA times lift", () => {
  const h = 0.35;
  const mass = 6;
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const r = analyzePulley({
      segments: n,
      loadMass: mass,
      liftHeight: h,
      g: G,
      pulleyFriction: false
    });
    const idealForce = mass * G / n;
    note(
      `PULLEY n=${n}  idealMA=${r.idealMA}  supports=${r.supportingSegments}  ` +
      `pull=${r.inputDisplacement.toFixed(4)} m  lift=${r.outputDisplacement.toFixed(4)} m  ` +
      `F_in=${r.appliedForce.toFixed(4)} N  T=${r.tensions.map((t) => t.toFixed(3)).join(",")}  ` +
      `W_in=${r.inputWork.toFixed(6)} J  W_out=${r.outputWork.toFixed(6)} J  movables=${r.movablePulleys}`
    );
    assert.equal(r.idealMA, n);
    assert.equal(r.supportingSegments, n);
    assert.equal(r.movablePulleys, movablePulleyCount(n));
    assert.ok(close(r.inputDisplacement, n * h));
    assert.ok(close(r.outputDisplacement, h));
    assert.ok(close(r.pullDistance, r.idealMA * h));
    assert.ok(close(r.appliedForce, idealForce));
    assert.ok(close(r.actualMA, n));
    const sumT = r.tensions.reduce((a, b) => a + b, 0);
    assert.ok(close(sumT, mass * G));
    assert.ok(r.tensions.every((t) => close(t, idealForce)));
    assert.ok(close(r.ideal.inputWork, r.ideal.outputWork));
    assert.ok(close(r.inputWork, r.outputWork));
    assert.ok(close(r.inputWork, work(r.appliedForce, r.inputDisplacement)));
  }
});

test("ideal input work equals output work for every machine", () => {
  const rows = [];
  const lever = analyzeLever({
    leverClass: 1, effortArm: 1.6, loadArm: 0.8, loadMass: 10, g: G,
    effortAngle: 0, frictionTorque: 0, outputDisplacement: 0.25
  });
  const leverAngle = analyzeLever({
    leverClass: 2, effortArm: 1.2, loadArm: 0.4, loadForce: 50, g: G,
    effortAngle: Math.PI / 6, frictionTorque: 0, deltaPhi: 0.3
  });
  const pulley = analyzePulley({ segments: 5, loadMass: 8, liftHeight: 0.22, g: G });
  const plane = analyzePlane({
    length: 3, angle: 20 * Math.PI / 180, mu: 0, mass: 4, g: G
  });
  const bench = analyzeWorkbench({
    mass: 9,
    height: 0.3,
    g: G,
    lever: { leverClass: 1, effortArm: 2, loadArm: 0.5 },
    pulley: { segments: 3 },
    plane: { angle: 35 * Math.PI / 180, mu: 0 }
  });
  const machines = [
    ["lever", lever],
    ["lever 30°", leverAngle],
    ["pulley n=5", pulley],
    ["plane μ=0", plane],
    ["bench lever", bench.lever],
    ["bench pulley", bench.pulley],
    ["bench plane", bench.plane]
  ];
  for (const [name, r] of machines) {
    const rel = Math.abs(r.ideal.inputWork - r.ideal.outputWork) / r.ideal.outputWork;
    note(
      `IDEAL WORK ${name}  W_in=${r.ideal.inputWork.toFixed(8)} J  W_out=${r.ideal.outputWork.toFixed(8)} J  ` +
      `rel=${rel.toExponential(2)}  F_ideal=${r.ideal.appliedForce.toFixed(4)} N  ` +
      `d_in=${r.ideal.inputDisplacement.toFixed(4)} m  d_out=${r.ideal.outputDisplacement.toFixed(4)} m  η=${r.ideal.efficiency.toFixed(6)}%`
    );
    rows.push(rel);
    assert.ok(rel < 1e-9, name);
    assert.ok(Math.abs(r.ideal.efficiency - 100) < 1e-6, name + " efficiency");
    assert.ok(close(r.ideal.inputWork, work(r.ideal.appliedForce, r.ideal.inputDisplacement)));
    assert.ok(close(r.ideal.outputWork, work(r.outputForce, r.ideal.outputDisplacement)));
  }
  note(`IDEAL WORK max relative error ${Math.max(...rows).toExponential(2)}`);
});

test("inclined plane ideal MA is L/h = 1/sinθ and friction matches the analytic efficiency", () => {
  const theta = 25 * Math.PI / 180;
  const mu = 0.35;
  const L = 2.5;
  const mass = 7;
  const ideal = analyzePlane({ length: L, angle: theta, mu: 0, mass, g: G });
  const real = analyzePlane({ length: L, angle: theta, mu, mass, g: G });
  const h = L * Math.sin(theta);
  const expectedMA = L / h;
  const expectedFromAngle = 1 / Math.sin(theta);
  const expectedEff = 100 * Math.sin(theta) / (Math.sin(theta) + mu * Math.cos(theta));
  const expectedForce = mass * G * (Math.sin(theta) + mu * Math.cos(theta));
  const expectedIdealForce = mass * G * Math.sin(theta);
  note(
    `PLANE θ=${(theta * 180 / Math.PI).toFixed(2)}°  L=${L} m  h=${h.toFixed(6)} m  ` +
    `idealMA=${ideal.idealMA.toFixed(6)}  L/h=${expectedMA.toFixed(6)}  1/sinθ=${expectedFromAngle.toFixed(6)}  ` +
    `F_parallel=${ideal.parallel.toFixed(4)} N  F_perp=${ideal.perpendicular.toFixed(4)} N  ` +
    `F_ideal=${ideal.appliedForce.toFixed(4)} N  straight-up=${ideal.verticalLift.force.toFixed(4)} N over ${ideal.verticalLift.distance.toFixed(4)} m`
  );
  note(
    `PLANE FRICTION μ=${mu}  F_real=${real.appliedForce.toFixed(4)} N  formula=${expectedForce.toFixed(4)} N  ` +
    `F_friction=${real.friction.toFixed(4)} N  η=${real.efficiency.toFixed(6)}%  analytic=${expectedEff.toFixed(6)}%  ` +
    `W_in=${real.inputWork.toFixed(4)} J  W_out=${real.outputWork.toFixed(4)} J  lost=${real.lostWork.toFixed(4)} J  ` +
    `ideal η=${real.ideal.efficiency.toFixed(4)}%  ideal W_in=${real.ideal.inputWork.toFixed(4)} J`
  );
  assert.ok(close(ideal.idealMA, expectedMA));
  assert.ok(close(ideal.idealMA, expectedFromAngle));
  assert.ok(close(ideal.height, h));
  assert.ok(close(ideal.appliedForce, expectedIdealForce));
  assert.ok(close(ideal.parallel, mass * G * Math.sin(theta)));
  assert.ok(close(ideal.perpendicular, mass * G * Math.cos(theta)));
  assert.ok(close(ideal.inputWork, ideal.outputWork));
  assert.ok(close(ideal.verticalLift.work, mass * G * h));
  assert.ok(close(real.appliedForce, expectedForce));
  assert.ok(close(real.friction, mu * mass * G * Math.cos(theta)));
  assert.ok(close(real.efficiency, expectedEff, 1e-9));
  assert.ok(real.efficiency < 100);
  assert.ok(close(real.ideal.inputWork, real.ideal.outputWork));
  assert.ok(close(real.outputWork, mass * G * h));
  assert.ok(close(real.inputWork, expectedForce * L));
  assert.ok(Math.abs(real.idealMA - expectedMA) < 1e-12);
});

test("efficiency stays at or below 100% whenever friction is on", () => {
  const samples = [];
  for (const mu of [0, 0.05, 0.2, 0.45, 0.9]) {
    const r = analyzePlane({ length: 2, angle: 32 * Math.PI / 180, mu, mass: 5, g: G });
    samples.push(["plane μ=" + mu, r.efficiency]);
    assert.ok(r.efficiency <= 100 + 1e-9);
    if (mu > 0) assert.ok(r.efficiency < 100);
    assert.ok(r.ideal.efficiency <= 100 + 1e-9);
  }
  for (const torque of [0, 2, 10, 25]) {
    const r = analyzeLever({
      leverClass: 1, effortArm: 1.5, loadArm: 0.5, loadForce: 40, g: G,
      frictionTorque: torque, effortAngle: 0, deltaPhi: 0.2
    });
    samples.push(["lever τ_f=" + torque, r.efficiency]);
    assert.ok(Math.abs(r.tauNet) < 1e-8);
    assert.ok(r.efficiency <= 100 + 1e-9);
    if (torque > 0) {
      assert.ok(r.efficiency < 100);
      const expected = 100 * r.tauLoad / (r.tauLoad + torque);
      assert.ok(close(r.efficiency, expected));
    }
  }
  for (const ratio of [1, 1.05, 1.2, 1.5]) {
    const n = 4;
    const h = 0.3;
    const mass = 8;
    const r = analyzePulley({
      segments: n, loadMass: mass, liftHeight: h, g: G,
      pulleyFriction: ratio > 1, frictionRatio: ratio
    });
    const tensions = pulleyTensions(n, mass * G, ratio > 1 ? ratio : 1);
    samples.push(["pulley r=" + ratio, r.efficiency]);
    assert.ok(close(r.appliedForce, tensions[n - 1]));
    assert.ok(r.efficiency <= 100 + 1e-9);
    assert.equal(r.idealMA, n);
    assert.ok(close(r.inputDisplacement, n * h));
    if (ratio > 1) {
      assert.ok(r.efficiency < 100);
      assert.ok(r.actualMA < r.idealMA);
      const eff = 100 * (mass * G * h) / (tensions[n - 1] * n * h);
      assert.ok(close(r.efficiency, eff));
    }
  }
  const over = analyzeLever({
    leverClass: 2, effortArm: 1.2, loadArm: 0.4, loadForce: 30, g: G,
    frictionTorque: 4, appliedForce: 40, deltaPhi: 0.25
  });
  samples.push(["lever over-push", over.efficiency]);
  assert.ok(over.efficiency < 100);
  assert.ok(over.efficiency > 0);
  note("EFFICIENCY " + samples.map(([name, eff]) => `${name}=${eff.toFixed(4)}%`).join("  "));
  assert.ok(samples.every(([, eff]) => eff <= 100 + 1e-9));
});
