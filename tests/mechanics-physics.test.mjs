// Mechanics Playground engine checks. No Firebase and no browser.
//   node --test tests/mechanics-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  G, G_MOON, G_MARS, FIXED_DT, SUBSTEPS, MAX_BODIES, VECTOR_KINDS, MATERIALS, BENCH,
  atwoodAcceleration, atwoodTension, springPeriod, pendulumPeriod, inclineAcceleration,
  springForce, springEnergy, kineticEnergy, gravitationalEnergy, magnetForce,
  downwardZeroCrossings, meanPeriod, createTimeAccumulator, snapValue, modeFromSearch,
  buildPreset, parseBuild, serializeBuild, validateBuild, defaultPart, hitBody,
  blockOnWedge, inclineFrame, readSaves, writeSave, SAVE_KEY, surfaceFriction
} from "../public/mechanics-physics.js";
import { createSimulation } from "../public/mechanics-world.js";
import { vectorStyleToken, VECTOR_TOKENS, createCraftDrawLayer } from "../public/mechanics-render.js";

function loadPlanck() {
  const code = readFileSync(new URL("../public/vendor/planck.min.js", import.meta.url), "utf8");
  const context = {
    console, Math, Date, Object, Array, Number, String, Boolean, Error, TypeError, RangeError,
    Float32Array, Float64Array, Uint8Array, Uint16Array, Int32Array, ArrayBuffer, DataView,
    Map, Set, WeakMap, Symbol, Proxy, Reflect, JSON, parseInt, parseFloat, isNaN, isFinite,
    Infinity, NaN, undefined, Promise
  };
  context.globalThis = context;
  context.global = context;
  context.self = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: "planck.min.js" });
  if (!context.planck || typeof context.planck.World !== "function") {
    throw new Error("vendored planck.min.js did not expose planck.World");
  }
  return context.planck;
}

const planck = loadPlanck();
const within = (actual, expected, fraction, label) => {
  const scale = Math.max(Math.abs(expected), 1e-9);
  const error = Math.abs(actual - expected) / scale;
  assert.ok(error <= fraction, `${label}: got ${actual}, expected ${expected}, error ${(100 * error).toFixed(2)}%`);
};

function body(snap, id) {
  return snap.bodies.find((item) => item.id === id);
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}

test("bench formulas match the classroom expressions", () => {
  assert.ok(Math.abs(atwoodAcceleration(3, 1, G) - (2 * G) / 4) < 1e-12);
  assert.ok(Math.abs(atwoodTension(3, 1, G) - (6 * G) / 4) < 1e-12);
  assert.ok(Math.abs(springPeriod(1, 50) - 2 * Math.PI * Math.sqrt(1 / 50)) < 1e-12);
  assert.ok(Math.abs(pendulumPeriod(2, G) - 2 * Math.PI * Math.sqrt(2 / G)) < 1e-12);
  assert.ok(Math.abs(inclineAcceleration(G, Math.PI / 6, 0) - G * 0.5) < 1e-12);
  assert.equal(inclineAcceleration(G, Math.PI / 6, 2), 0);
  assert.equal(springForce(10, 0, 0.2, 0), 2);
  assert.equal(springEnergy(10, 0.2), 0.2);
  assert.equal(kineticEnergy(2, 3, 0, 0), 9);
  assert.equal(gravitationalEnergy(2, 10, 4), 80);
  const attract = magnetForce(1, -2, 3, 0, 0.3);
  assert.ok(attract.x < 0);
  const repel = magnetForce(1, 2, 3, 0, 0.3);
  assert.ok(repel.x > 0);
});

test("mode deep links and a rejected build stay strict", () => {
  assert.equal(modeFromSearch("?mode=atwood&board=b1"), "pulley");
  assert.equal(modeFromSearch("?mode=RAMP"), "incline");
  assert.equal(modeFromSearch(""), "sandbox");
  assert.equal(modeFromSearch("?mode=nope"), "sandbox");
  assert.equal(parseBuild("{"), null);
  assert.equal(validateBuild({ version: 2, parts: [] }).ok, false);
  assert.equal(validateBuild({ version: 1, parts: [{ id: "a", type: "box" }, { id: "a", type: "box" }] }).ok, false);
  assert.equal(validateBuild({
    version: 1,
    parts: [defaultPart("box", 0, 1)],
    joints: [{ id: "j", type: "rope", bodyA: "missing", bodyB: "p1" }]
  }).ok, false);
  const saved = parseBuild(serializeBuild(buildPreset("sandbox")));
  assert.equal(saved.mode, "sandbox");
  assert.ok(saved.parts.length >= 1);
});

test("accumulator spends fixed steps and drops a hitch", () => {
  const acc = createTimeAccumulator(FIXED_DT, 5);
  let n = 0;
  assert.equal(acc.consume(0, () => { n += 1; }), 0);
  assert.equal(acc.consume(FIXED_DT * 2.2, () => { n += 1; }), 2);
  assert.equal(n, 2);
  assert.ok(acc.pending() > 0 && acc.pending() < FIXED_DT);
  const burst = acc.consume(2, () => { n += 1; });
  assert.equal(burst, 5);
  assert.equal(SUBSTEPS, 4);
});

test("snap, hit testing, and defriction", () => {
  assert.equal(snapValue(0.62, 0.25), 0.5);
  assert.equal(snapValue(0.63, 0.25), 0.75);
  const bodies = [
    { id: "box", shape: "box", x: 0, y: 0, angle: 0, hx: 0.5, hy: 0.25 },
    { id: "ball", shape: "circle", x: 2, y: 0, angle: 0, radius: 0.3 }
  ];
  assert.equal(hitBody(bodies, 0.1, 0.1), "box");
  assert.equal(hitBody(bodies, 2.1, 0), "ball");
  assert.equal(hitBody(bodies, 5, 5), null);
  assert.equal(surfaceFriction({ friction: 0.4 }, true), 0);
  assert.equal(surfaceFriction({ friction: 0.4 }, false), 0.4);
  assert.ok(MATERIALS.ice.friction < 0.05);
  assert.ok(MATERIALS.rubber.friction > 0.8);
  assert.ok(MATERIALS.rubber.restitution > MATERIALS.wood.restitution);
});

test("force arrows use the designer tokens, including thrust as applied", () => {
  assert.equal(vectorStyleToken("gravity"), "--mp-force-gravity");
  assert.equal(vectorStyleToken("normal"), "--mp-force-normal");
  assert.equal(vectorStyleToken("tension"), "--mp-force-tension");
  assert.equal(vectorStyleToken("friction"), "--mp-force-friction");
  assert.equal(vectorStyleToken("applied"), "--mp-force-applied");
  assert.equal(vectorStyleToken("thrust"), "--mp-force-applied");
  assert.equal(vectorStyleToken("velocity"), "--mp-velocity");
  for (const kind of VECTOR_KINDS) assert.ok(VECTOR_TOKENS[kind], kind);
  const css = readFileSync(new URL("../public/mechanics-theme.css", import.meta.url), "utf8");
  assert.match(css, /--mp-force-gravity:\s*red\s*;/);
  assert.match(css, /--mp-force-normal:\s*blue\s*;/);
  assert.match(css, /--mp-force-tension:\s*gold\s*;/);
  assert.match(css, /--mp-force-friction:\s*orange\s*;/);
  assert.match(css, /--mp-force-applied:\s*green\s*;/);
  assert.match(css, /--mp-velocity:\s*cyan\s*;/);
  assert.match(css, /--mp-felt-squash:/);
  assert.match(css, /--mp-paper-flutter:/);
  assert.match(css, /--mp-tape-flap:/);
  assert.match(css, /--mp-crayon-width:/);
  const render = readFileSync(new URL("../public/mechanics-render.js", import.meta.url), "utf8");
  const world = readFileSync(new URL("../public/mechanics-world.js", import.meta.url), "utf8");
  assert.equal(render.includes("planck"), false);
  assert.equal(render.includes("mechanics-world"), false);
  assert.equal(world.includes("mechanics-render"), false);
  assert.equal(typeof createCraftDrawLayer, "function");
  const layer = createCraftDrawLayer({ width: 8, height: 8, getContext() { return null; } });
  assert.equal(typeof layer.draw, "function");
  assert.equal(typeof layer.worldFromScreen, "function");
  const study = readFileSync(new URL("../public/study.html", import.meta.url), "utf8");
  assert.match(study, /study-mechanics\.html/);
  assert.match(study, /Mechanics Playground/);
});

test("Atwood acceleration matches (m1-m2)g/(m1+m2) within 3%", () => {
  const sim = createSimulation(planck, buildPreset("pulley"));
  const heavyMass = BENCH.atwood.heavy;
  const lightMass = BENCH.atwood.light;
  const expected = atwoodAcceleration(heavyMass, lightMass, G);
  let previous = 0;
  let previousTime = 0;
  const samples = [];
  sim.run(1, (snap) => {
    const heavy = body(snap, BENCH.atwood.heavyId);
    const light = body(snap, BENCH.atwood.lightId);
    const down = -heavy.vy;
    if (snap.time >= 0.25 && snap.time <= 0.9 && previousTime > 0) {
      samples.push((down - previous) / (snap.time - previousTime));
    }
    previous = down;
    previousTime = snap.time;
    if (snap.time > 0.5) {
      assert.ok(heavy.y < light.y);
    }
    return null;
  });
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  within(average, expected, 0.03, "Atwood a");
  sim.select(BENCH.atwood.heavyId);
  const late = sim.snapshot();
  const string = late.joints.find((joint) => joint.id === "string");
  within(string.tension, atwoodTension(heavyMass, lightMass, G), 0.03, "Atwood T");
  const heavy = body(late, BENCH.atwood.heavyId);
  const pull = late.vectors.find((vector) => vector.bodyId === heavy.id && vector.kind === "tension");
  assert.ok(pull && pull.fy > 0, "string pulls the heavy mass upward");
});

test("spring period matches 2π√(m/k) within 3%", () => {
  const sim = createSimulation(planck, buildPreset("springs"));
  const bench = BENCH.spring;
  const expected = springPeriod(bench.mass, bench.stiffness);
  const samples = [];
  sim.run(expected * 4.2, (snap) => {
    samples.push({ t: snap.time, value: body(snap, bench.massId).vy });
  });
  const period = meanPeriod(downwardZeroCrossings(samples));
  assert.ok(period, "spring did not cross zero");
  within(period, expected, 0.03, "spring T");
  const coil = sim.snapshot().joints.find((joint) => joint.type === "spring");
  assert.ok(Math.abs(coil.extension) > 0);
  assert.ok(sim.snapshot().energy.spring >= 0);
});

test("small-angle pendulum period matches 2π√(L/g) within 3%", () => {
  const sim = createSimulation(planck, buildPreset("pendulum"));
  const bench = BENCH.pendulum;
  const expected = pendulumPeriod(bench.length, G);
  const samples = [];
  sim.run(expected * 3.2, (snap) => {
    const pivot = body(snap, bench.pivotId);
    const bob = body(snap, bench.bobId);
    const angle = Math.atan2(bob.x - pivot.x, pivot.y - bob.y);
    samples.push({ t: snap.time, value: angle });
  });
  const period = meanPeriod(downwardZeroCrossings(samples));
  within(period, expected, 0.03, "pendulum T");
});

test("frictionless incline acceleration is g sin θ within 3%", () => {
  const preset = buildPreset("incline");
  const ramp = preset.parts.find((part) => part.id === BENCH.incline.rampId);
  const frame = inclineFrame(ramp.run, ramp.rise);
  within(frame.theta, BENCH.incline.degrees * Math.PI / 180, 0.001, "ramp angle");
  const expected = inclineAcceleration(G, frame.theta, 0);
  const sim = createSimulation(planck, preset);
  let previous = 0;
  let previousTime = 0.35;
  sim.run(0.35);
  previous = speedAlong(sim.snapshot(), frame.down);
  const samples = [];
  sim.run(0.55, (snap) => {
    const speed = speedAlong(snap, frame.down);
    samples.push((speed - previous) / (snap.time - previousTime));
    previous = speed;
    previousTime = snap.time;
  });
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  within(average, expected, 0.03, "incline a");
  const block = body(sim.snapshot(), BENCH.incline.blockId);
  assert.ok(block.vx < 0);
});

function speedAlong(snap, direction) {
  const block = body(snap, BENCH.incline.blockId);
  return block.vx * direction.x + block.vy * direction.y;
}

test("rocket thrust lifts, drag slows, and a resting box can sleep", () => {
  const rocket = createSimulation(planck, buildPreset("rocket"));
  rocket.run(0.45);
  const boosted = body(rocket.snapshot(), "rocket");
  assert.ok(boosted.vy > 4, "thrust should beat weight, vy=" + boosted.vy);
  assert.ok(boosted.y > 0.6);

  const coast = createSimulation(planck, buildPreset("sandbox"));
  coast.addPart({ ...defaultPart("ball", 0, 2), vx: 4, vy: 0, material: "ice", friction: 0 });
  coast.setGravity(0);
  coast.setAirDrag(false);
  coast.run(0.5);
  const free = coast.snapshot().bodies.find((item) => item.type === "ball");
  coast.setAirDrag(true);
  const before = Math.hypot(free.vx, free.vy);
  coast.run(0.8);
  const after = coast.snapshot().bodies.find((item) => item.type === "ball");
  assert.ok(Math.hypot(after.vx, after.vy) < before * 0.85);

  const nap = createSimulation(planck, buildPreset("sandbox"));
  nap.addPart({ ...defaultPart("box", 0, 0.3), restitution: 0, material: "wood" });
  nap.run(2.5);
  const settled = nap.snapshot().bodies.find((item) => item.type === "box");
  assert.equal(nap.snapshot().meta.sleeping, true);
  assert.ok(Math.hypot(settled.vx, settled.vy) < 0.05);
});

test("friction race: ice outruns wood, rubber stays put", () => {
  const sim = createSimulation(planck, buildPreset("friction"));
  sim.run(0.7);
  const snap = sim.snapshot();
  const ice = Math.hypot(body(snap, "blockice").vx, body(snap, "blockice").vy);
  const wood = Math.hypot(body(snap, "blockwood").vx, body(snap, "blockwood").vy);
  const rubber = Math.hypot(body(snap, "blockrubber").vx, body(snap, "blockrubber").vy);
  assert.ok(ice > wood + 0.3, `ice ${ice} wood ${wood}`);
  assert.ok(wood > rubber, `wood ${wood} rubber ${rubber}`);
  assert.ok(rubber < 0.25, "rubber should stick, speed " + rubber);
});

test("rube preset passes motion along the chain", () => {
  const sim = createSimulation(planck, buildPreset("rube"));
  const start = body(sim.snapshot(), "cargo").x;
  sim.run(2.2);
  const cargo = body(sim.snapshot(), "cargo");
  assert.ok(cargo.x > start + 0.12, "cargo should be knocked forward, x=" + cargo.x);
});

test("undo, body cap, serialization, and a thrown body keep their velocity", () => {
  const sim = createSimulation(planck, buildPreset("sandbox"));
  const startCount = sim.snapshot().bodies.length;
  const added = sim.addPart(defaultPart("box", 1, 2));
  assert.equal(added.ok, true);
  assert.equal(sim.snapshot().bodies.length, startCount + 1);
  assert.equal(sim.undo(), true);
  assert.equal(sim.snapshot().bodies.length, startCount);
  assert.equal(sim.redo(), true);
  assert.equal(sim.snapshot().bodies.length, startCount + 1);

  const round = parseBuild(JSON.stringify(sim.document()));
  const again = createSimulation(planck, round);
  assert.equal(again.snapshot().bodies.length, sim.snapshot().bodies.length);

  while (sim.addPart(defaultPart("ball", 0, 3)).ok) { /* fill */ }
  const refused = sim.addPart(defaultPart("ball", 0, 4));
  assert.equal(refused.ok, false);
  assert.ok(sim.snapshot().bodies.length <= MAX_BODIES);

  const toss = createSimulation(planck, buildPreset("sandbox"));
  toss.setGravity(0);
  const id = toss.addPart(defaultPart("box", 0, 1)).id;
  toss.beginDrag(id, 0, 1);
  toss.drag(0.8, 1);
  toss.run(0.25);
  toss.endDrag();
  const moving = body(toss.snapshot(), id);
  assert.ok(Math.hypot(moving.vx, moving.vy) > 0.2, "mouse joint should throw");
  toss.reset();
  const home = body(toss.snapshot(), id);
  assert.ok(Math.hypot(home.vx, home.vy) < 0.05);
  assert.ok(Math.abs(home.x - moving.x) < 0.35);
});

test("saves stay in the caller storage and moon gravity is weaker", () => {
  const storage = memoryStorage();
  const doc = buildPreset("pendulum");
  assert.equal(writeSave(storage, "demo", doc).ok, true);
  assert.equal(writeSave(storage, "  ", doc).ok, false);
  const loaded = readSaves(storage);
  assert.equal(loaded.demo.mode, "pendulum");
  assert.ok(storage.getItem(SAVE_KEY).includes("pendulum"));

  const moon = createSimulation(planck, buildPreset("incline"));
  moon.setGravity(G_MOON);
  const frame = inclineFrame(BENCH.incline.run, BENCH.incline.run * Math.tan(BENCH.incline.degrees * Math.PI / 180));
  moon.run(0.4);
  let previous = speedAlong(moon.snapshot(), frame.down);
  let previousTime = moon.snapshot().time;
  const samples = [];
  moon.run(0.5, (snap) => {
    const speed = speedAlong(snap, frame.down);
    samples.push((speed - previous) / (snap.time - previousTime));
    previous = speed;
    previousTime = snap.time;
  });
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  within(average, inclineAcceleration(G_MOON, frame.theta, 0), 0.05, "moon incline");
  assert.ok(G_MARS < G && G_MARS > G_MOON);
});

test("blockOnWedge sits above the ramp, and a rope holds its weight", () => {
  const pose = blockOnWedge({ x: 0, y: 0 }, 4, 2, 2, 0.2, 0);
  assert.ok(pose.y > 0);
  const doc = buildPreset("sandbox");
  doc.parts.push(defaultPart("ball", 0, 2));
  doc.parts[doc.parts.length - 1].id = "bob";
  doc.parts[doc.parts.length - 1].mass = 2;
  doc.joints.push({
    id: "line",
    type: "rope",
    bodyA: "ground",
    bodyB: "bob",
    anchorA: { x: 0, y: 0.25 },
    anchorB: { x: 0, y: 0 },
    maxLength: 2
  });
  const parsed = parseBuild(doc);
  const sim = createSimulation(planck, parsed);
  sim.run(1.2);
  const line = sim.snapshot().joints.find((joint) => joint.id === "line");
  within(line.tension, 2 * G, 0.08, "rope tension");
});

test("snapshot is plain data and fixed steps advance time", () => {
  const sim = createSimulation(planck, buildPreset("sandbox"));
  sim.setPaused(true);
  assert.equal(sim.advance(1), 0);
  sim.setPaused(false);
  assert.equal(sim.advance(FIXED_DT), 1);
  const snap = sim.snapshot();
  assert.equal(snap.time, FIXED_DT);
  assert.equal(JSON.parse(JSON.stringify(snap)).time, snap.time);
  assert.equal(typeof snap.bodies[0].x, "number");
  const crossings = downwardZeroCrossings([
    { t: 0, value: 1 },
    { t: 1, value: -1 },
    { t: 2, value: 1 },
    { t: 3, value: -1 }
  ]);
  assert.equal(meanPeriod(crossings), 2);
});
