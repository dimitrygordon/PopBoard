// RBMK classroom-physics checks. No Firebase, no build step.
//   node --test tests/rbmk-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  PARAMS, nominalState, cloneState, advance, reactivity, powerOf, ormOf,
  stateSavePoint1, stateSavePoint2, stateExcursion, shutdownAndWait, abortTest,
  scramExcursion, solveXeForCritical, thermalTargets, displayPower, noisy,
  tripCoastingPumps, simulateStoryTo, rodFrac, tipShape, setPumpCount
} from "../public/rbmk-physics.js";

const results = [];
const note = (row) => { results.push(row); console.log(row); };

test("stable at 3200 MWt", () => {
  const s = nominalState();
  const p0 = powerOf(s);
  assert.ok(Math.abs(p0 - 3200) < 1);
  assert.ok(Math.abs(reactivity(s).total) < 1);
  advance(s, 600);
  const p1 = powerOf(s);
  const rho = reactivity(s).total;
  note(`STABILITY  P0=${p0.toFixed(2)} MWt  P600s=${p1.toFixed(2)} MWt  drift=${((p1 - p0) / p0 * 100).toFixed(3)}%  rho=${rho.toFixed(2)} pcm  ORM=${ormOf(s.rod).toFixed(1)}  alpha=${s.alpha.toFixed(3)}`);
  assert.ok(Math.abs(p1 - p0) / p0 < 0.02, "power drifted more than 2%");
  assert.ok(Math.abs(rho) < 8, "reactivity not near zero");
  assert.equal(s.failed, false);
  assert.equal(s.offscale, false);
});

test("xenon peaks 8–11 h after a power cut", () => {
  const s = nominalState();
  s.scram = true;
  advance(s, 90);
  const tCut = s.t;
  const xe0 = s.Xe;
  let peak = { Xe: -1, hours: 0 };
  for (let i = 0; i < 200; i++) {
    advance(s, 0.1 * 3600);
    const hours = (s.t - tCut) / 3600;
    if (s.Xe > peak.Xe) peak = { Xe: s.Xe, hours, I: s.I };
  }
  const hours36 = 36;
  // continue from wherever we are (20 h) out to 36 h after the cut
  const more = Math.max(0, hours36 - (s.t - tCut) / 3600);
  advance(s, more * 3600);
  note(`XENON  peak=${peak.Xe.toFixed(3)} x eq at t=${peak.hours.toFixed(2)} h after cut  Xe(36h)=${s.Xe.toFixed(3)}  I(36h)=${s.I.toFixed(4)}  P=${powerOf(s).toFixed(3)} MWt  (I-135 6.6 h, Xe-135 9.2 h, psi=${PARAMS.psi})`);
  assert.ok(peak.hours >= 8 && peak.hours <= 11, `peak at ${peak.hours} h`);
  assert.ok(peak.Xe > xe0 * 1.4, "xenon did not rise after the cut");
  assert.ok(s.Xe < peak.Xe * 0.55, "xenon had not decayed by 36 h");
  assert.ok(powerOf(s) < 5);
  assert.equal(s.failed, false);
});

test("AZ-5 graphite tip: fully withdrawn versus partly inserted", () => {
  function scramFrom(x0, power) {
    const s = nominalState();
    s.nL = power / 2;
    s.nU = power / 2;
    s.rod = x0;
    s.rodTarget = x0;
    s.Tf = 360;
    const th = thermalTargets(s);
    s.alpha = th.alpha;
    s.Tout = th.Tout;
    solveXeForCritical(s);
    s.scram = true;
    let maxTip = 0;
    let maxLowerGap = -1e9;
    let maxP = powerOf(s);
    for (let i = 0; i < 900; i++) {
      advance(s, 0.05);
      const r = reactivity(s);
      if (r.tip > maxTip) maxTip = r.tip;
      maxLowerGap = Math.max(maxLowerGap, r.lower - r.upper);
      maxP = Math.max(maxP, powerOf(s));
      if (s.rod > 0.98) break;
    }
    return { maxTip, maxLowerGap, maxP, failed: s.failed, endP: powerOf(s), orm0: ormOf(x0) };
  }
  const withdrawn = scramFrom(0.012, 200);
  const partial = scramFrom(0.55, 1600);
  note(`AZ-5 TIP  withdrawn ORM≈${withdrawn.orm0.toFixed(1)} maxTip=${withdrawn.maxTip.toFixed(1)} pcm  lower-upper=${withdrawn.maxLowerGap.toFixed(1)} pcm  maxP=${withdrawn.maxP.toFixed(1)}  partly-inserted maxTip=${partial.maxTip.toFixed(1)} pcm  endP=${partial.endP.toFixed(1)}  tipShape(0)=${tipShape(0)} tipShape(peak)=${tipShape(PARAMS.tipEnd / 2).toFixed(3)}`);
  assert.ok(withdrawn.maxTip >= 300 && withdrawn.maxTip <= 600, "withdrawn tip not in 300–600 pcm");
  assert.ok(partial.maxTip < 40, "partly inserted rods still showed a tip");
  assert.ok(withdrawn.maxLowerGap > 40, "tip did not prefer the lower zone");
  assert.equal(partial.failed, false);
  assert.ok(partial.endP < 400, "partial scram did not shut down");
  // The geometric tip is zero once the absorber bank is already past the window.
  assert.equal(tipShape(0.55), 0);
  assert.ok(rodFrac(0.55) > rodFrac(0.012));
});

test("void runaway at 200 MWt and low flow", () => {
  const s = stateSavePoint1();
  assert.ok(Math.abs(powerOf(s) - 200) < 5);
  assert.ok(ormOf(s.rod) < 15);
  s.pumps = [0, 0, 0, 0, 0, 0, 0, 0];
  s.coast = [0, 0, 0, 0, 0, 0, 0, 0];
  s.flow = 8;
  const p0 = powerOf(s);
  const void0 = reactivity(s).void;
  let maxVoid = void0;
  let maxP = p0;
  for (let i = 0; i < 80 && !s.failed; i++) {
    advance(s, 0.5);
    maxP = Math.max(maxP, powerOf(s));
    maxVoid = Math.max(maxVoid, reactivity(s).void);
  }
  const r = reactivity(s);
  note(`VOID RUNAWAY  P0=${p0.toFixed(1)} MWt flow→${s.flow.toFixed(1)}%  void0=${void0.toFixed(1)} pcm  maxVoid=${maxVoid.toFixed(1)} pcm  fuel=${r.fuel.toFixed(1)} pcm  maxP=${maxP.toFixed(0)}  failed=${s.failed}  display=${displayPower(s).text}`);
  assert.ok(maxP > p0 * 8, "power did not run away");
  assert.ok(maxVoid > 250, "void reactivity did not grow");
  assert.ok(maxVoid > Math.abs(r.fuel) || s.offscale, "Doppler swallowed the void surge");
  assert.equal(s.offscale, true);
  assert.equal(displayPower(s).known, false);
  assert.equal(displayPower(s).text, "OFF SCALE");
});

test("Chernobyl save point 1 — shut down and wait out xenon", () => {
  const s0 = stateSavePoint1();
  note(`SAVE1 START  P=${powerOf(s0).toFixed(1)} MWt  ORM=${ormOf(s0.rod).toFixed(2)}  Xe=${s0.Xe.toFixed(3)}  alpha=${s0.alpha.toFixed(3)}  flow=${s0.flow.toFixed(1)}%`);
  assert.ok(powerOf(s0) > 150 && powerOf(s0) < 280);
  assert.ok(ormOf(s0.rod) < PARAMS.ormSafe);
  assert.ok(s0.alpha < 0.2, "save point 1 should still be a low-void core");
  const s = shutdownAndWait(s0, 36);
  note(`SAVE1 AFTER 36 h  P=${powerOf(s).toFixed(3)} MWt  ORM=${ormOf(s.rod).toFixed(1)}  Xe=${s.Xe.toFixed(3)} (was ${s0.Xe.toFixed(3)})  saved=${s.saved}  failed=${s.failed}  display=${displayPower(s).text}`);
  assert.equal(s.failed, false);
  assert.equal(s.offscale, false);
  assert.equal(s.saved, true);
  assert.ok(powerOf(s) < 10);
  assert.ok(s.rod > 0.95);
  assert.ok(s.Xe < s0.Xe * 0.75, "xenon was not waited out");
  assert.equal(displayPower(s).known, true);

  const lived = simulateStoryTo("save1");
  const livedShut = shutdownAndWait(lived, 30);
  note(`SAVE1 STORY  arrived P=${powerOf(lived).toFixed(1)} ORM=${ormOf(lived.rod).toFixed(1)} Xe=${lived.Xe.toFixed(2)} fail=${lived.failed}  after shutdown saved=${livedShut.saved} Xe=${livedShut.Xe.toFixed(2)} P=${powerOf(livedShut).toFixed(2)}`);
  assert.equal(lived.failed, false);
  assert.ok(ormOf(lived.rod) < PARAMS.ormSafe);
  assert.ok(powerOf(lived) < 700);
  assert.equal(livedShut.failed, false);
  assert.equal(livedShut.saved, true);
});

test("Chernobyl save point 2 — abort the test, restore ORM, reduce pumps", () => {
  const s0 = stateSavePoint2();
  const pumps0 = s0.pumps.reduce((a, b) => a + b, 0);
  note(`SAVE2 START  P=${powerOf(s0).toFixed(1)}  ORM=${ormOf(s0.rod).toFixed(2)}  pumps=${pumps0}  flow=${s0.flow.toFixed(1)}%  margin=${s0.margin}  alpha=${s0.alpha.toFixed(3)}`);
  assert.equal(pumps0, 8);
  assert.ok(s0.flow > 120);
  assert.ok(ormOf(s0.rod) < PARAMS.ormSafe);
  const s = abortTest(s0);
  const pumps = s.pumps.reduce((a, b) => a + b, 0);
  note(`SAVE2 ABORT  P=${powerOf(s).toFixed(2)}  ORM=${ormOf(s.rod).toFixed(1)}  pumps=${pumps}  flow=${s.flow.toFixed(1)}%  saved=${s.saved}  failed=${s.failed}`);
  assert.equal(s.failed, false);
  assert.equal(s.offscale, false);
  assert.equal(s.saved, true);
  assert.ok(ormOf(s.rod) >= PARAMS.ormSafe);
  assert.ok(pumps <= 6);
  assert.ok(powerOf(s) < PARAMS.forbiddenMWt);

  const lived = simulateStoryTo("save2");
  const livedAbort = abortTest(lived);
  note(`SAVE2 STORY  arrived P=${powerOf(lived).toFixed(1)} ORM=${ormOf(lived.rod).toFixed(1)} flow=${lived.flow.toFixed(0)} fail=${lived.failed}  abort ORM=${ormOf(livedAbort.rod).toFixed(1)} saved=${livedAbort.saved}`);
  assert.equal(lived.failed, false);
  assert.ok(lived.flow > 120);
  assert.equal(livedAbort.saved, true);
  assert.equal(livedAbort.failed, false);
});

test("unsavable once low power, high void, withdrawn rods, and AZ-5 coincide", () => {
  const s0 = stateExcursion();
  const pre = {
    P: powerOf(s0),
    orm: ormOf(s0.rod),
    alpha: s0.alpha,
    rho: reactivity(s0).total,
    tip: reactivity(s0).tip
  };
  note(`EXCURSION BEFORE AZ-5  P=${pre.P.toFixed(1)} MWt (<${PARAMS.forbiddenMWt})  ORM=${pre.orm.toFixed(2)}  alpha=${pre.alpha.toFixed(3)}  rho=${pre.rho.toFixed(1)} pcm  tip=${pre.tip.toFixed(1)} pcm  flow=${s0.flow.toFixed(1)}%`);
  assert.ok(pre.P < PARAMS.forbiddenMWt && pre.P > 50);
  assert.ok(pre.orm < 20);
  assert.ok(pre.alpha > 0.4, "void was not high");
  assert.ok(pre.rho > 200, "core was not already supercritical from void");
  const s = scramExcursion(s0);
  const shown = displayPower(s);
  note(`EXCURSION AFTER AZ-5  failed=${s.failed}  offscale=${s.offscale}  display="${shown.text}"  known=${shown.known}  internalCap=${powerOf(s).toFixed(0)} (not a reported peak)  pressure=${s.pressure.toFixed(2)} MPa`);
  assert.equal(s.failed, true);
  assert.equal(s.offscale, true);
  assert.equal(s.saved, false);
  assert.equal(shown.known, false);
  assert.equal(shown.text, "OFF SCALE");
  assert.equal(Number.isFinite(shown.value), false);

});

test("pump coastdown is 30–60 s, not a step, and noise stays off the physics state", () => {
  const fresh = nominalState();
  setPumpCount(fresh, 8, false);
  fresh.flow = (8 / 6) * 100;
  advance(fresh, 20);
  const f0 = fresh.flow;
  tripCoastingPumps(fresh, 4);
  const flows = {};
  let t = 0;
  flows[0] = fresh.flow;
  for (const mark of [5, 15, 45, 90]) {
    advance(fresh, mark - t);
    t = mark;
    flows[mark] = fresh.flow;
  }
  note(`COASTDOWN  t=0 → ${flows[0].toFixed(1)}%   5s → ${flows[5].toFixed(1)}%   15s → ${flows[15].toFixed(1)}%   45s → ${flows[45].toFixed(1)}%   90s → ${flows[90].toFixed(1)}%   (4 of 8 pumps, tau=${PARAMS.coastTau}s)  start=${f0.toFixed(1)}%`);
  assert.ok(flows[0] > 120);
  assert.ok(flows[5] > flows[45], "flow collapsed too quickly");
  assert.ok(flows[0] - flows[5] < 40, "coastdown was nearly a step");
  assert.ok(flows[45] < flows[0] - 25, "too little flow loss by 45 s");
  assert.equal(fresh.failed, false);

  const a = nominalState();
  const b = cloneState(a);
  advance(a, 3);
  advance(b, 3);
  assert.equal(powerOf(a), powerOf(b));
  let draw = 0;
  const seq = [0.2, 0.85];
  const shown = noisy(powerOf(a), 0.04, () => seq[draw++]);
  assert.notEqual(shown, powerOf(a));
  assert.equal(powerOf(a), powerOf(b));
});

test.after(() => {
  console.log("\n===== RBMK NUMERIC RESULTS =====");
  for (const row of results) console.log(row);
  console.log("===== END RESULTS =====\n");
});
