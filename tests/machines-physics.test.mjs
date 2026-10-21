// Simple machines checks. No Firebase, no build step.
//   node --test tests/machines-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  G, LEVER_PRESETS, WHEEL_PRESETS, BUILD_CHALLENGES, IDENTIFY_ITEMS, MACHINE_TYPES,
  analyzeLever, analyzePulley, analyzePlane, analyzeWorkbench,
  analyzeWheelAxle, analyzeWedge, analyzeScrew, analyzeBuild, analyzeMachine, getMachine,
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

test("wheel and axle ideal MA is R/r, with torque balance and the distance ratio", () => {
  const R = 0.24;
  const r = 0.06;
  const mass = 8;
  const turns = 0.5;
  const ideal = analyzeWheelAxle({
    wheelRadius: R, axleRadius: r, loadMass: mass, revolutions: turns, frictionTorque: 0, g: G
  });
  const phi = turns * 2 * Math.PI;
  const load = mass * G;
  note(
    `WHEEL R=${R} r=${r}  idealMA=${ideal.idealMA.toFixed(6)}  R/r=${(R / r).toFixed(6)}  ` +
    `distance=${ideal.distanceRatio.toFixed(6)}  s_in=${ideal.inputDisplacement.toFixed(6)} m  s_out=${ideal.outputDisplacement.toFixed(6)} m  ` +
    `τ_E=${ideal.tauEffort.toFixed(4)}  τ_L=${ideal.tauLoad.toFixed(4)}  τ_net=${ideal.tauNet.toExponential(2)}  ` +
    `W_in=${ideal.inputWork.toFixed(6)} J  W_out=${ideal.outputWork.toFixed(6)} J  η=${ideal.efficiency.toFixed(4)}%`
  );
  assert.ok(close(ideal.idealMA, R / r));
  assert.ok(close(ideal.distanceRatio, R / r));
  assert.ok(close(ideal.inputDisplacement, R * phi));
  assert.ok(close(ideal.outputDisplacement, r * phi));
  assert.ok(close(ideal.inputDisplacement / ideal.outputDisplacement, ideal.idealMA));
  assert.ok(close(ideal.appliedForce, load * r / R));
  assert.ok(close(ideal.actualMA, ideal.idealMA));
  assert.ok(Math.abs(ideal.tauNet) < 1e-9);
  assert.equal(ideal.balanced, true);
  assert.ok(close(ideal.tauEffort, ideal.appliedForce * R));
  assert.ok(close(ideal.tauLoad, load * r));
  assert.ok(close(ideal.inputWork, ideal.outputWork));
  assert.ok(close(ideal.ideal.inputWork, ideal.ideal.outputWork));
  assert.ok(Math.abs(ideal.efficiency - 100) < 1e-6);
  assert.equal(getMachine("wheel-axle"), analyzeWheelAxle);
  assert.ok(close(analyzeMachine("wheel-axle", {
    wheelRadius: R, axleRadius: r, loadForce: load, revolutions: 1, g: G
  }).idealMA, R / r));

  for (const [key, preset] of Object.entries(WHEEL_PRESETS)) {
    const sample = analyzeWheelAxle({ ...preset, revolutions: 1, frictionTorque: 0, g: G });
    note(`WHEEL PRESET ${key}  R=${preset.wheelRadius}  r=${preset.axleRadius}  MA=${sample.idealMA.toFixed(4)}`);
    assert.ok(close(sample.idealMA, preset.wheelRadius / preset.axleRadius));
    assert.ok(close(sample.distanceRatio, sample.idealMA));
  }

  const reversed = analyzeWheelAxle({
    wheelRadius: R, axleRadius: r, loadForce: 40, revolutions: 1, reversed: true, frictionTorque: 0, g: G
  });
  note(
    `WHEEL REVERSED  idealMA=${reversed.idealMA.toFixed(6)}  r/R=${(r / R).toFixed(6)}  ` +
    `s_in=${reversed.inputDisplacement.toFixed(4)}  s_out=${reversed.outputDisplacement.toFixed(4)}  ` +
    `F_in=${reversed.appliedForce.toFixed(4)} N  τ_net=${reversed.tauNet.toExponential(2)}`
  );
  assert.ok(close(reversed.idealMA, r / R));
  assert.ok(close(reversed.distanceRatio, r / R));
  assert.ok(close(reversed.appliedForce, 40 * R / r));
  assert.ok(close(reversed.inputWork, reversed.outputWork));
  assert.ok(Math.abs(reversed.tauNet) < 1e-8);
});

test("wheel bearing friction keeps efficiency at or below 100%", () => {
  const load = 50;
  const R = 0.3;
  const r = 0.05;
  const turns = 1;
  for (const torque of [0, 1.5, 6, 12]) {
    const result = analyzeWheelAxle({
      wheelRadius: R, axleRadius: r, loadForce: load, revolutions: turns,
      frictionTorque: torque, g: G
    });
    const expected = torque === 0 ? 100 : 100 * result.tauLoad / (result.tauLoad + torque);
    note(
      `WHEEL FRICTION τ_f=${torque}  F_in=${result.appliedForce.toFixed(4)} N  ` +
      `η=${result.efficiency.toFixed(6)}%  analytic=${expected.toFixed(6)}%  ` +
      `lost=${result.lostWork.toFixed(4)} J  τ_net=${result.tauNet.toExponential(2)}  ideal η=${result.ideal.efficiency.toFixed(4)}%`
    );
    assert.ok(Math.abs(result.tauNet) < 1e-8);
    assert.ok(result.efficiency <= 100 + 1e-9);
    assert.ok(close(result.efficiency, expected));
    assert.ok(Math.abs(result.ideal.efficiency - 100) < 1e-6);
    assert.ok(close(result.ideal.inputWork, result.ideal.outputWork));
    if (torque > 0) {
      assert.ok(result.efficiency < 100);
      assert.ok(result.actualMA < result.idealMA);
      assert.ok(result.lostWork > 0);
    }
  }
});

test("wedge ideal MA is L/t and friction plus deformation stay at or below 100%", () => {
  const L = 0.3;
  const t = 0.06;
  const load = 500;
  const ideal = analyzeWedge({ length: L, thickness: t, loadForce: load, mu: 0, deformation: 0, penetration: L, g: G });
  const theta = Math.asin(t / L);
  const plane = analyzePlane({ length: L, angle: theta, mu: 0, mass: load / G, g: G });
  note(
    `WEDGE L=${L} t=${t}  idealMA=${ideal.idealMA.toFixed(6)}  L/t=${(L / t).toFixed(6)}  ` +
    `separation=${ideal.separation.toFixed(6)} m  F_in=${ideal.appliedForce.toFixed(4)} N  ` +
    `W_in=${ideal.inputWork.toFixed(6)} J  W_out=${ideal.outputWork.toFixed(6)} J  planeMA=${plane.idealMA.toFixed(6)}`
  );
  assert.ok(close(ideal.idealMA, L / t));
  assert.ok(close(ideal.idealMA, plane.idealMA));
  assert.ok(close(ideal.separation, t));
  assert.ok(close(ideal.penetration, L));
  assert.ok(close(ideal.appliedForce, load * t / L));
  assert.ok(close(ideal.appliedForce, plane.appliedForce));
  assert.ok(close(ideal.inputWork, ideal.outputWork));
  assert.ok(close(ideal.outputWork, load * t));
  assert.ok(close(ideal.ideal.inputWork, ideal.ideal.outputWork));
  assert.ok(Math.abs(ideal.efficiency - 100) < 1e-6);

  const partial = analyzeWedge({ length: L, thickness: t, loadForce: load, penetration: 0.12, g: G });
  assert.ok(close(partial.idealMA, L / t));
  assert.ok(close(partial.separation, 0.12 * t / L));
  assert.ok(close(partial.inputWork, partial.outputWork));

  const mu = 0.25;
  const k = 0.08;
  const real = analyzeWedge({ length: L, thickness: t, loadForce: load, mu, deformation: k, penetration: L, g: G });
  const friction = mu * load * Math.cos(theta);
  const deform = k * load;
  const expectedForce = load * t / L + friction + deform;
  const expectedEff = 100 * (load * t / L) / expectedForce;
  const rubbed = analyzePlane({ length: L, angle: theta, mu, mass: load / G, g: G });
  note(
    `WEDGE LOSS μ=${mu} k=${k}  F=${real.appliedForce.toFixed(4)} N  formula=${expectedForce.toFixed(4)} N  ` +
    `friction=${real.friction.toFixed(4)} N  deformation=${real.deformationForce.toFixed(4)} N  ` +
    `η=${real.efficiency.toFixed(6)}%  analytic=${expectedEff.toFixed(6)}%  plane η=${rubbed.efficiency.toFixed(4)}%  ` +
    `lost=${real.lostWork.toFixed(4)} J  ideal W_in=${real.ideal.inputWork.toFixed(4)} J`
  );
  assert.ok(close(real.appliedForce, expectedForce));
  assert.ok(close(real.friction, friction));
  assert.ok(close(real.deformationForce, deform));
  assert.ok(close(real.efficiency, expectedEff));
  assert.ok(real.efficiency < rubbed.efficiency);
  assert.ok(real.efficiency < 100);
  assert.ok(real.efficiency > 0);
  assert.ok(close(real.ideal.inputWork, real.ideal.outputWork));
  assert.ok(close(real.outputWork, load * t));
  assert.ok(close(real.lostWork, real.inputWork - real.outputWork));
  assert.equal(analyzeMachine("wedge", { length: L, thickness: t, loadForce: load, g: G }).machine, "wedge");
});

test("screw ideal MA is 2πR/p, one turn lifts one pitch, and friction matches the unrolled plane", () => {
  const R = 0.2;
  const p = 0.01;
  const mass = 5;
  const mu = 0.2;
  const ideal = analyzeScrew({ handleRadius: R, pitch: p, loadMass: mass, revolutions: 1, mu: 0, g: G });
  const real = analyzeScrew({ handleRadius: R, pitch: p, loadMass: mass, revolutions: 1, mu, g: G });
  const circumference = 2 * Math.PI * R;
  const theta = Math.asin(p / circumference);
  const plane = analyzePlane({
    length: circumference, angle: theta, mu, mass, g: G
  });
  const idealPlane = analyzePlane({
    length: circumference, angle: theta, mu: 0, mass, g: G
  });
  note(
    `SCREW R=${R} p=${p}  idealMA=${ideal.idealMA.toFixed(6)}  2πR/p=${(circumference / p).toFixed(6)}  ` +
    `s_in=${ideal.inputDisplacement.toFixed(6)} m  lift=${ideal.outputDisplacement.toFixed(6)} m  ` +
    `F_in=${ideal.appliedForce.toFixed(4)} N  W_in=${ideal.inputWork.toFixed(6)} J  W_out=${ideal.outputWork.toFixed(6)} J`
  );
  note(
    `SCREW FRICTION μ=${mu}  F=${real.appliedForce.toFixed(4)} N  plane F=${plane.appliedForce.toFixed(4)} N  ` +
    `η=${real.efficiency.toFixed(6)}%  plane η=${plane.efficiency.toFixed(6)}%  ` +
    `lost=${real.lostWork.toFixed(4)} J  ideal η=${real.ideal.efficiency.toFixed(4)}%  ` +
    `two turns lift=${analyzeScrew({ handleRadius: R, pitch: p, loadMass: mass, revolutions: 2, g: G }).outputDisplacement.toFixed(4)} m`
  );
  assert.ok(close(ideal.idealMA, circumference / p));
  assert.ok(close(ideal.idealMA, idealPlane.idealMA));
  assert.ok(close(ideal.inputDisplacement, circumference));
  assert.ok(close(ideal.outputDisplacement, p));
  assert.ok(close(ideal.appliedForce, mass * G * p / circumference));
  assert.ok(close(ideal.inputWork, ideal.outputWork));
  assert.ok(close(ideal.outputWork, mass * G * p));
  assert.ok(Math.abs(ideal.efficiency - 100) < 1e-6);
  assert.ok(close(real.appliedForce, plane.appliedForce));
  assert.ok(close(real.efficiency, plane.efficiency));
  assert.ok(real.efficiency < 100);
  assert.ok(real.efficiency > 0);
  assert.ok(real.actualMA < real.idealMA);
  assert.ok(close(real.ideal.inputWork, real.ideal.outputWork));
  assert.ok(close(real.friction, mu * mass * G * Math.cos(theta)));
  const two = analyzeScrew({ handleRadius: R, pitch: p, loadForce: 80, revolutions: 2, mu: 0, g: G });
  assert.ok(close(two.outputDisplacement, 2 * p));
  assert.ok(close(two.inputDisplacement, 2 * circumference));
  assert.ok(close(two.idealMA, circumference / p));
  assert.ok(close(two.inputWork, two.outputWork));
  assert.equal(getMachine("screw"), analyzeScrew);
});

test("compound ideal MA is the product of the stages and efficiency is the product of the stage efficiencies", () => {
  const height = 0.2;
  const mass = 10;
  const ideal = analyzeBuild({
    loadMass: mass,
    outputDisplacement: height,
    g: G,
    stages: [
      { machine: "lever", leverClass: 1, effortArm: 2, loadArm: 0.5, frictionTorque: 0 },
      { machine: "pulley", segments: 4, pulleyFriction: false },
      { machine: "wheel-axle", wheelRadius: 0.2, axleRadius: 0.1, frictionTorque: 0 }
    ]
  });
  const expectedMA = (2 / 0.5) * 4 * (0.2 / 0.1);
  note(
    `BUILD IDEAL  MA=${ideal.idealMA.toFixed(6)}  product=${expectedMA.toFixed(6)}  ` +
    `s_in/s_out=${(ideal.inputDisplacement / ideal.outputDisplacement).toFixed(6)}  ` +
    `F_in=${ideal.appliedForce.toFixed(4)} N  F_out=${ideal.outputForce.toFixed(4)} N  ` +
    `W_in=${ideal.inputWork.toFixed(6)} J  W_out=${ideal.outputWork.toFixed(6)} J  η=${ideal.efficiency.toFixed(6)}%  ` +
    `stages=${ideal.stages.map((stage) => stage.machine + ":" + stage.idealMA.toFixed(3)).join(" × ")}`
  );
  assert.ok(close(ideal.idealMA, expectedMA));
  assert.ok(close(ideal.idealMA, ideal.stages.reduce((product, stage) => product * stage.idealMA, 1)));
  assert.ok(close(ideal.inputDisplacement / ideal.outputDisplacement, expectedMA));
  assert.ok(close(ideal.actualMA, expectedMA));
  assert.ok(close(ideal.appliedForce, mass * G / expectedMA));
  assert.ok(close(ideal.inputWork, ideal.outputWork));
  assert.ok(close(ideal.ideal.inputWork, ideal.ideal.outputWork));
  assert.ok(Math.abs(ideal.efficiency - 100) < 1e-6);
  assert.ok(close(ideal.outputDisplacement, height));
  assert.equal(analyzeMachine("build", {
    loadForce: 20, outputDisplacement: 0.1, g: G,
    stages: [{ machine: "screw", handleRadius: 0.1, pitch: 0.01, mu: 0 }]
  }).machine, "build");

  const lossy = analyzeBuild({
    loadMass: 6,
    outputDisplacement: 0.3,
    g: G,
    stages: [
      { machine: "lever", leverClass: 2, effortArm: 1.5, loadArm: 0.5, frictionTorque: 4 },
      { machine: "plane", angle: 25 * Math.PI / 180, mu: 0.3 },
      { machine: "screw", handleRadius: 0.15, pitch: 0.012, mu: 0.15 },
      { machine: "wedge", length: 0.2, thickness: 0.05, mu: 0.1, deformation: 0.05 }
    ]
  });
  const productEff = 100 * lossy.stages.reduce((product, stage) => product * (stage.efficiency / 100), 1);
  const productMA = lossy.stages.reduce((product, stage) => product * stage.idealMA, 1);
  note(
    `BUILD LOSSY  idealMA=${lossy.idealMA.toFixed(4)}  productMA=${productMA.toFixed(4)}  ` +
    `η=${lossy.efficiency.toFixed(6)}%  product η=${productEff.toFixed(6)}%  stage η=${lossy.stageEfficiency.toFixed(6)}%  ` +
    `F_in=${lossy.appliedForce.toFixed(4)} N  lost=${lossy.lostWork.toFixed(4)} J  ` +
    lossy.stages.map((stage) => `${stage.machine} η=${stage.efficiency.toFixed(2)}% MA=${stage.idealMA.toFixed(3)}`).join("  ")
  );
  assert.ok(close(lossy.idealMA, productMA));
  assert.ok(close(lossy.efficiency, productEff, 1e-8));
  assert.ok(close(lossy.stageEfficiency, productEff, 1e-9));
  assert.ok(lossy.efficiency < 100);
  assert.ok(lossy.efficiency > 0);
  assert.ok(lossy.stages.every((stage) => stage.efficiency <= 100 + 1e-9));
  assert.ok(close(lossy.ideal.inputWork, lossy.ideal.outputWork));
  assert.ok(lossy.actualMA < lossy.idealMA);
  assert.ok(lossy.lostWork > 0);

  const types = new Set(MACHINE_TYPES.map((type) => type.id));
  assert.ok(IDENTIFY_ITEMS.length >= 10);
  for (const item of IDENTIFY_ITEMS) {
    assert.ok(item.types.length >= 1, item.id);
    assert.ok(item.types.every((type) => types.has(type)), item.id);
    assert.ok(item.explanation.length > 40, item.id);
    if (item.types.includes("lever")) assert.ok([1, 2, 3].includes(item.leverClass), item.id);
  }

  for (const challenge of BUILD_CHALLENGES) {
    const starter = analyzeBuild({
      loadMass: challenge.loadMass,
      outputDisplacement: challenge.outputDisplacement,
      g: G,
      stages: challenge.starter
    });
    const meetsForce = starter.appliedForce < challenge.maxForce;
    const meetsEff = starter.efficiency + 1e-9 >= challenge.minEfficiency;
    note(
      `CHALLENGE ${challenge.id}  starter F=${starter.appliedForce.toFixed(2)} N  ` +
      `goal <${challenge.maxForce} N  η=${starter.efficiency.toFixed(2)}%  min ${challenge.minEfficiency}%  ` +
      `MA=${starter.idealMA.toFixed(3)}  meets=${meetsForce && meetsEff}`
    );
    assert.equal(meetsForce && meetsEff, false, challenge.id + " starter should leave the goal open");
    assert.ok(starter.efficiency <= 100 + 1e-6);
  }

  const solvedLift = analyzeBuild({
    loadMass: 200, outputDisplacement: 0.25, g: G,
    stages: [
      { machine: "lever", leverClass: 1, effortArm: 1.6, loadArm: 0.4, frictionTorque: 0 },
      { machine: "pulley", segments: 4, pulleyFriction: false }
    ]
  });
  assert.ok(solvedLift.appliedForce < 150);
  assert.ok(close(solvedLift.idealMA, 4 * 4));
  const solvedHaul = analyzeBuild({
    loadMass: 80, outputDisplacement: 0.5, g: G,
    stages: [
      { machine: "wheel-axle", wheelRadius: 0.24, axleRadius: 0.04, frictionTorque: 0 },
      { machine: "plane", angle: 15 * Math.PI / 180, mu: 0 }
    ]
  });
  assert.ok(solvedHaul.appliedForce < 40);
  const solvedJack = analyzeBuild({
    loadMass: 500, outputDisplacement: 0.04, g: G,
    stages: [{ machine: "screw", handleRadius: 0.16, pitch: 0.01, mu: 0 }]
  });
  assert.ok(solvedJack.appliedForce < 100);
  assert.ok(close(solvedJack.idealMA, 2 * Math.PI * 0.16 / 0.01));
  const solvedEff = analyzeBuild({
    loadMass: 30, outputDisplacement: 0.4, g: G,
    stages: [{ machine: "pulley", segments: 4, pulleyFriction: false }]
  });
  assert.ok(solvedEff.appliedForce < 80);
  assert.ok(solvedEff.efficiency > 70);
});
