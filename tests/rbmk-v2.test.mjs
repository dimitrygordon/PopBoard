import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nominalState, cloneState, advance } from "../public/rbmk-physics.js";
import {
  applyLookGesture, lookForward, poseSnapshot, glidePose, restorePose, walkStep,
  autoRodCommand, rodDriveStatus, awayFromDesk, neutronDisplayMap, LOOK_SENS,
  DESK_POSE, GLIDE_MS, DOLLY_MAX, WALK_SPEED, SPRINT_SPEED, EYE_HEIGHT,
  RU_LABELS, FAUX_MARKS, COLLIDERS
} from "../public/rbmk-look.js";
import {
  createLattice, resolveEncounter, stepParticles, stepPoisonClock, assignVoid,
  waterPaint, fuelPaint, neutronDot, macroXeCount, poissonMeanTrial,
  U235_COUNT, TILES, NEUTRON_CAP, COOLDOWN, STARTUP_LAMBDA, HALF_I_H, HALF_XE_H,
  DIRECT_XE, ILLUSTRATIVE_NOTE, COLORS
} from "../public/rbmk-particles.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seqRand(list) {
  let i = 0;
  return () => (i < list.length ? list[i++] : 0.5);
}

test("particle layer cannot change physics state", () => {
  const sim = nominalState();
  const before = JSON.stringify(sim);
  const lattice = createLattice(7);
  const snap = {
    power: 3200, alpha: sim.alpha, xenon: sim.Xe, iodine: sim.I,
    rod: sim.rod, failed: false, refuel: true, t: sim.t
  };
  const snapBefore = JSON.stringify(snap);
  for (let i = 0; i < 40; i++) stepParticles(lattice, snap, 0.05);
  stepPoisonClock(lattice, 6.6);
  assert.equal(JSON.stringify(sim), before);
  assert.equal(JSON.stringify(snap), snapBefore);

  const live = nominalState();
  advance(live, 2);
  const mid = JSON.stringify(cloneState(live));
  stepParticles(lattice, live, 0.05);
  stepPoisonClock(lattice, 1);
  assert.equal(JSON.stringify(cloneState(live)), mid);
  assert.equal(readFileSync(new URL("../public/rbmk-particles.js", import.meta.url), "utf8").includes("rbmk-physics"), false);
});

test("lattice is a thousand tiles, 15 percent U-235, one startup source", () => {
  const lattice = createLattice(20260426);
  assert.equal(lattice.tiles.length, TILES);
  assert.equal(lattice.tiles.length, 1000);
  const u235 = lattice.tiles.filter((t) => t.kind === "u235").length;
  assert.equal(u235, U235_COUNT);
  assert.ok(Math.abs(u235 / TILES - 0.15) < 1e-9);
  const sources = lattice.tiles.filter((t) => t.kind === "source");
  assert.equal(sources.length, 1);
  assert.equal(lattice.neutrons.length, 0);
  assert.ok(lattice.tiles.some((t) => t.kind === "graphite"));
  assert.ok(lattice.tiles.some((t) => t.kind === "water"));
  assert.ok(lattice.tiles.some((t) => t.kind === "rod"));
  assert.match(ILLUSTRATIVE_NOTE, /not to scale/);
  assert.match(ILLUSTRATIVE_NOTE, /2% U-235/);
  assert.match(ILLUSTRATIVE_NOTE, /2\.6 million barns/);
  assert.equal(COLORS.xe, "#9b3dff");
});

test("encounter table, slowing stages, fission yield, and heat only on fission", () => {
  const rand = mulberry32(11);
  const tally = (stage, kind, poison, n = 8000) => {
    const out = { fission: 0, capture: 0, absorb: 0, scatter: 0, slow: 0, clearXe: 0, heat: 0, emit: 0 };
    for (let i = 0; i < n; i++) {
      const res = resolveEncounter({ stage, kind, poison, rand });
      out[res.outcome] += 1;
      out.heat += res.heat;
      out.emit += res.emit;
    }
    return out;
  };
  const within = (got, p, n, tol = 0.012) => assert.ok(Math.abs(got / n - p) < tol, got / n + " vs " + p);
  let t = tally(0, "u235", null);
  within(t.fission, 0.08, 8000);
  within(t.capture, 0.02, 8000);
  t = tally(0, "u238", null);
  within(t.fission, 0.02, 8000);
  within(t.capture, 0.03, 8000);
  t = tally(1, "u235", null);
  within(t.fission, 0.15 * 0.85, 8000);
  within(t.capture, 0.15 * 0.15, 8000);
  t = tally(2, "u235", null);
  within(t.fission, 0.35 * 0.85, 8000, 0.02);
  within(t.capture, 0.35 * 0.15, 8000, 0.015);
  t = tally(2, "u238", null);
  assert.equal(t.fission, 0);
  within(t.capture, 0.05, 8000);
  t = tally(2, "u235", "Xe");
  within(t.clearXe, 0.7, 8000, 0.02);
  assert.equal(t.fission, 0);
  t = tally(0, "graphite", null);
  within(t.capture, 0.005, 8000, 0.004);
  within(t.slow, 0.995, 8000, 0.008);
  t = tally(0, "water", null);
  within(t.capture, 0.03, 8000, 0.01);
  t = tally(0, "rod", null);
  within(t.absorb, 0.9, 8000, 0.02);

  let stage = 0;
  for (let hit = 0; hit < 2; hit++) {
    const res = resolveEncounter({ stage, kind: "graphite", poison: null, rand: () => 0.5 });
    assert.equal(res.outcome, "slow");
    assert.equal(res.heat, 0);
    assert.equal(res.stage, stage + 1);
    stage = res.stage;
  }
  const thermal = resolveEncounter({ stage, kind: "graphite", poison: null, rand: () => 0.5 });
  assert.equal(stage, 2);
  assert.equal(thermal.stage, 2);
  assert.equal(thermal.outcome, "scatter");
  assert.equal(neutronDot(0).core, true);
  assert.ok(neutronDot(0).radius > neutronDot(1).radius);
  assert.ok(neutronDot(1).radius > neutronDot(2).radius);

  let emits = 0;
  let fiss = 0;
  let direct = 0;
  const yieldRand = mulberry32(3);
  for (let i = 0; i < 6000; i++) {
    const res = resolveEncounter({ stage: 0, kind: "u235", poison: null, rand: yieldRand });
    if (res.outcome !== "fission") continue;
    fiss += 1;
    emits += res.emit;
    if (res.poison === "Xe") direct += 1;
    assert.ok(res.emit === 2 || res.emit === 3);
    assert.equal(res.heat, 1);
  }
  assert.ok(Math.abs(emits / fiss - 2.4) < 0.05, emits / fiss);
  assert.ok(Math.abs(direct / fiss - DIRECT_XE) < 0.04, direct / fiss);

  const scatter = resolveEncounter({ stage: 0, kind: "u235", poison: null, rand: seqRand([0.5]) });
  assert.equal(scatter.outcome, "scatter");
  assert.equal(scatter.heat, 0);
  const cleared = resolveEncounter({ stage: 2, kind: "fp", poison: "Xe", rand: seqRand([0.5]) });
  assert.equal(cleared.clearXe, true);
  assert.equal(cleared.heat, 0);
  assert.equal(cleared.neutronDies, true);
});

test("fission heats the fuel tile, a passing neutron does not, water stays blue", () => {
  const lattice = createLattice(4);
  const idx = lattice.tiles.findIndex((t) => t.kind === "u235");
  lattice.tiles[idx].kind = "u235";
  const c = idx % lattice.cols;
  const r = Math.floor(idx / lattice.cols);
  lattice.neutrons = [{ x: c + 0.5, y: r + 0.5, stage: 0, cool: 0, vx: 0, vy: 0 }];
  lattice.rand = seqRand([0.5, 0.2]);
  stepParticles(lattice, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 0.05);
  assert.equal(lattice.tiles[idx].heat, 0);
  assert.equal(lattice.tiles[idx].kind, "u235");

  lattice.neutrons = [{ x: c + 0.5, y: r + 0.5, stage: 0, cool: 1, vx: 4, vy: 0 }];
  const moved = lattice.tiles[idx].heat;
  stepParticles(lattice, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 0.05);
  assert.equal(lattice.tiles[idx].heat, moved);

  lattice.neutrons = [{ x: c + 0.5, y: r + 0.5, stage: 0, cool: 0, vx: 0, vy: 0 }];
  lattice.rand = seqRand([0.01, 0.5, 0.5, 0.1, 0.2]);
  stepParticles(lattice, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 0.05);
  assert.equal(lattice.tiles[idx].kind, "fp");
  assert.ok(lattice.tiles[idx].heat > 0);
  assert.equal(lattice.tiles[idx].poison, "I");
  assert.equal(lattice.tiles[idx].flash, 1);
  assert.ok(lattice.neutrons.length >= 1);
  assert.ok(lattice.neutrons.length <= NEUTRON_CAP);

  const hot = fuelPaint("u235", 1, null);
  assert.ok(hot.r > hot.b);
  for (const voided of [false, true]) {
    for (const heat of [0, 0.4, 1]) {
      const paint = waterPaint(voided, heat);
      assert.ok(paint.b > paint.r, JSON.stringify(paint));
      assert.ok(paint.b >= paint.g);
    }
  }
  assert.ok(waterPaint(true, 1).a < waterPaint(false, 0).a);
  const xe = fuelPaint("fp", 0, "Xe");
  assert.ok(xe.b > xe.r && xe.b > xe.g);
});

test("xenon path timing, macro purple count, refuel tally, startup cap", () => {
  const iodine = { tiles: Array.from({ length: 4000 }, () => ({ kind: "fp", poison: "I", heat: 0, flash: 0, voided: false })), rand: mulberry32(9) };
  stepPoisonClock(iodine, HALF_I_H);
  const stillI = iodine.tiles.filter((t) => t.poison === "I").length;
  const becameXe = iodine.tiles.filter((t) => t.poison === "Xe").length;
  assert.ok(Math.abs(stillI / 4000 - 0.5) < 0.04, stillI);
  assert.equal(stillI + becameXe, 4000);

  const xenon = { tiles: Array.from({ length: 4000 }, () => ({ kind: "fp", poison: "Xe", heat: 0, flash: 0, voided: false })), rand: mulberry32(8) };
  stepPoisonClock(xenon, HALF_XE_H);
  const stillXe = xenon.tiles.filter((t) => t.poison === "Xe").length;
  assert.ok(Math.abs(stillXe / 4000 - 0.5) < 0.04, stillXe);

  const lattice = createLattice(5);
  const fp = lattice.tiles.findIndex((t) => t.kind === "u238");
  lattice.tiles[fp].kind = "fp";
  lattice.tiles[fp].poison = "Xe";
  lattice.neutrons = [{ x: (fp % 40) + 0.5, y: Math.floor(fp / 40) + 0.5, stage: 2, cool: 0, vx: 0, vy: 0 }];
  lattice.rand = seqRand([0.5, 0.2]);
  stepParticles(lattice, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 0.05);
  assert.equal(lattice.tiles[fp].poison, null);
  assert.equal(lattice.tiles[fp].heat, 0);
  assert.equal(lattice.tiles[fp].kind, "fp");

  assert.equal(macroXeCount(0), 0);
  assert.equal(macroXeCount(3), 40);
  assert.ok(macroXeCount(1) > 0);
  const marked = createLattice(2);
  const poisonBefore = marked.tiles.map((t) => t.poison);
  stepParticles(marked, { alpha: 0, xenon: 2, rod: 0.2, refuel: false }, 0);
  assert.deepEqual(marked.tiles.map((t) => t.poison), poisonBefore);
  assert.equal(marked.macroXe.length, macroXeCount(2));

  const refuel = createLattice(6);
  refuel.tiles.forEach((t) => { if (t.kind === "u235" || t.kind === "u238") t.kind = "graphite"; });
  refuel.tiles[10].kind = "fp";
  refuel.tiles[10].poison = "Xe";
  refuel.neutrons = [{ x: 1, y: 1, stage: 0, cool: 2, vx: 0, vy: 0 }, { x: 2, y: 1, stage: 0, cool: 2, vx: 0, vy: 0 }, { x: 3, y: 1, stage: 0, cool: 2, vx: 0, vy: 0 }];
  stepParticles(refuel, { alpha: 0, xenon: 0, rod: 0, refuel: true }, 3);
  assert.equal(refuel.replaced, 1);
  assert.equal(refuel.spent, 1);
  assert.notEqual(refuel.tiles[10].kind, "fp");
  assert.equal(refuel.tiles[10].poison, null);

  const quiet = createLattice(12);
  quiet.tiles.forEach((t) => { t.kind = t.kind === "source" ? "source" : "fp"; t.poison = null; });
  for (let i = 0; i < 10; i++) quiet.neutrons.push({ x: 3.5, y: 3.5, stage: 0, cool: 5, vx: 0, vy: 0 });
  stepParticles(quiet, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 2);
  assert.equal(quiet.neutrons.length, 10);

  const cold = createLattice(13);
  cold.tiles.forEach((t) => { if (t.kind !== "source") t.kind = "fp"; });
  stepParticles(cold, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 0.1);
  for (let i = 0; i < 80; i++) stepParticles(cold, { alpha: 0, xenon: 0, rod: 0, refuel: false }, 0.1);
  assert.ok(cold.neutrons.length > 0);
  assert.ok(cold.neutrons.length <= NEUTRON_CAP);
  assert.ok(cold.neutrons.every((n) => n.fromSource));
  assert.ok(STARTUP_LAMBDA >= 0.2 && STARTUP_LAMBDA <= 0.5);
  const mean = poissonMeanTrial(STARTUP_LAMBDA, 4000, mulberry32(21));
  assert.ok(mean > 0.28 && mean < 0.42, mean);
  assert.equal(COOLDOWN, 0.3);
});

test("void follows the macro fraction and clusters on the hot channel", () => {
  const lattice = createLattice(1);
  lattice.tiles.forEach((t) => { t.heat = 0; t.voided = false; });
  for (let r = 0; r < lattice.rows; r++) {
    const tile = lattice.tiles[r * lattice.cols + 1];
    if (tile.kind === "u235" || tile.kind === "u238") tile.heat = 1;
  }
  const n = assignVoid(lattice, 0.25);
  const waters = lattice.tiles.map((t, i) => ({ t, c: i % lattice.cols })).filter((x) => x.t.kind === "water");
  const voided = waters.filter((x) => x.t.voided);
  assert.equal(voided.length, n);
  assert.ok(Math.abs(n / waters.length - 0.25) < 0.02);
  const mean = (list) => list.reduce((s, x) => s + x.c, 0) / list.length;
  assert.ok(mean(voided) < mean(waters));
  const far = voided.filter((x) => x.c > 20).length;
  const near = voided.filter((x) => x.c < 10).length;
  assert.ok(near > far);
});

test("auto rod deadband uses power percent and ignores neutron targets", () => {
  const rod = 0.4;
  assert.equal(autoRodCommand({ rod, powerPct: 100, setpointPct: 100, dt: 1 }), rod);
  assert.equal(autoRodCommand({ rod, powerPct: 103, setpointPct: 100, dt: 1 }), rod);
  assert.equal(autoRodCommand({ rod, powerPct: 97, setpointPct: 100, dt: 1 }), rod);
  assert.ok(Math.abs(autoRodCommand({ rod, powerPct: 110, setpointPct: 100, dt: 1 }) - 0.45) < 1e-12);
  assert.ok(Math.abs(autoRodCommand({ rod, powerPct: 90, setpointPct: 100, dt: 1 }) - 0.35) < 1e-12);
  assert.equal(autoRodCommand({ rod: 0.99, powerPct: 200, setpointPct: 100, dt: 1 }), 1);
  const src = readFileSync(new URL("../public/rbmk-look.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export function autoRodCommand"), src.indexOf("export function rodDriveStatus"));
  assert.equal(body.includes("neutron"), false);
  const map = neutronDisplayMap(40);
  assert.match(map.note, /not to scale/);
  assert.equal(map.band, "40");
  assert.equal(neutronDisplayMap(20).band, "20–40");
  assert.equal(rodDriveStatus(true), "rod drive lost, core damaged (exact sequence uncertain)");
  assert.equal(rodDriveStatus(false), "");
});

test("panning signs: drag right turns right, drag up looks up, wheel up looks up", () => {
  const pose = { x: 0, y: 1.28, z: 0.62, yaw: 0, pitch: 0, dolly: 0 };
  const right = applyLookGesture(pose, { dx: 10, dy: 0 });
  const left = applyLookGesture(pose, { dx: -10, dy: 0 });
  assert.ok(right.yaw > pose.yaw);
  assert.ok(left.yaw < pose.yaw);
  const up = applyLookGesture(pose, { dx: 0, dy: -10 });
  const down = applyLookGesture(pose, { dx: 0, dy: 10 });
  assert.ok(up.pitch > pose.pitch);
  assert.ok(down.pitch < pose.pitch);
  assert.ok(Math.abs(right.yaw - up.pitch) < 1e-12);
  assert.equal(LOOK_SENS, 0.004);
  const inverted = applyLookGesture(pose, { dx: 0, dy: -10, invertY: true });
  assert.ok(inverted.pitch < pose.pitch);
  const wheelUp = applyLookGesture(pose, { wheel: -20 });
  const wheelDown = applyLookGesture(pose, { wheel: 20 });
  assert.ok(wheelUp.pitch > pose.pitch);
  assert.ok(wheelDown.pitch < pose.pitch);
  assert.equal(wheelUp.dolly, 0);
  const limit = 55 * Math.PI / 180;
  const leaned = applyLookGesture({ ...pose, pitch: limit }, { wheel: -80, pitchLimit: limit });
  assert.equal(leaned.pitch, limit);
  assert.ok(leaned.dolly > 0 && leaned.dolly <= DOLLY_MAX);
  const back = applyLookGesture(leaned, { wheel: 40, pitchLimit: limit });
  assert.ok(back.dolly < leaned.dolly);

  const ahead = lookForward(0, 0);
  const turned = lookForward(0.25, 0);
  const raised = lookForward(0, 0.25);
  assert.ok(turned.x > ahead.x);
  assert.ok(ahead.z < 0);
  assert.ok(raised.y > ahead.y);
  assert.ok(Math.abs(ahead.y) < 1e-12);
});

test("fullscreen pose restore glides to the desk and walking stays in the room", () => {
  const walked = { x: 2.2, y: EYE_HEIGHT, z: -2.2, yaw: 0.8, pitch: -0.2, dolly: 0.1 };
  const snap = poseSnapshot({ ...walked, extra: 9 });
  assert.deepEqual(snap, { x: 2.2, y: EYE_HEIGHT, z: -2.2, yaw: 0.8, pitch: -0.2, dolly: 0.1 });
  assert.equal(GLIDE_MS, 600);
  const start = restorePose(walked, 0, false);
  assert.equal(start.x, walked.x);
  assert.equal(start.yaw, walked.yaw);
  const home = restorePose(walked, 600, false);
  assert.deepEqual(home, poseSnapshot(DESK_POSE));
  const mid = restorePose(walked, 300, false);
  assert.ok(mid.x > DESK_POSE.x && mid.x < walked.x);
  assert.ok(mid.z < DESK_POSE.z && mid.z > walked.z);
  assert.deepEqual(restorePose(walked, 0, true), poseSnapshot(DESK_POSE));
  const g0 = glidePose(walked, DESK_POSE, 0);
  const g1 = glidePose(walked, DESK_POSE, 1);
  assert.equal(g0.y, EYE_HEIGHT);
  assert.equal(g1.y, DESK_POSE.y);

  const step = walkStep({ x: 0, y: 1, z: 1, yaw: Math.PI / 2, pitch: 0 }, { forward: 1 }, 1);
  assert.ok(Math.abs(step.x - WALK_SPEED) < 1e-9);
  assert.equal(step.y, EYE_HEIGHT);
  assert.ok(Math.abs(step.z - 1) < 1e-6);
  const sprint = walkStep({ x: 0, y: 1, z: 1, yaw: Math.PI / 2, pitch: 0 }, { forward: 1, sprint: true }, 1);
  assert.ok(Math.abs(sprint.x - SPRINT_SPEED) < 1e-9);
  const diagonal = walkStep({ x: 0, y: 1, z: 1, yaw: 0, pitch: 0 }, { forward: 1, strafe: 1 }, 0.2);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z - 1) - WALK_SPEED * 0.2) < 1e-6);

  const intoDesk = walkStep({ x: 0, y: 1.6, z: 0.5, yaw: 0, pitch: 0 }, { forward: 1 }, 1);
  assert.ok(intoDesk.z > 0.42 && intoDesk.z <= 0.5);
  const hall = walkStep({ x: 0, y: 1.6, z: -4.8, yaw: 0, pitch: 0 }, { forward: 1 }, 1);
  assert.ok(hall.z <= -4.8 && hall.z >= -5.35);
  let aisle = { x: -3.2, y: 1.6, z: 0.8, yaw: 0, pitch: 0, dolly: 0 };
  for (let i = 0; i < 8; i++) aisle = walkStep(aisle, { forward: 1 }, 0.2);
  assert.ok(aisle.z < -1.2);
  assert.ok(Math.abs(aisle.x + 3.2) < 1e-6);
  let door = { x: 2.8, y: 1.6, z: -0.2, yaw: Math.PI / 2, pitch: 0 };
  door = walkStep(door, { forward: 1 }, 0.2);
  assert.ok(door.x > 2.8 && door.x < 3.25);
  door = walkStep(door, { forward: 1 }, 0.5);
  assert.ok(door.x < 3.25);
  assert.equal(COLLIDERS.length, 6);
  assert.equal(awayFromDesk(DESK_POSE), false);
  assert.equal(awayFromDesk({ x: -3.2, z: -2.2 }), true);
});

test("page keeps the v2 hooks and the approved labels", () => {
  const html = readFileSync(new URL("../public/study-rbm.html", import.meta.url), "utf8");
  assert.match(html, /lookForward\(/);
  assert.match(html, /restorePose\(/);
  assert.match(html, /stepParticles\(/);
  assert.match(html, /applyLookGesture\(/);
  assert.match(html, /autoRodCommand\(/);
  assert.doesNotMatch(html, /autoRodCommand\([^)]*neutron/);
  for (const word of Object.values(RU_LABELS)) assert.ok(html.includes(word), word);
  for (const mark of FAUX_MARKS) assert.ok(html.includes(mark));
  assert.equal(/<button\b[^>]*>[^<]*ЯБМК/.test(html), false);
  assert.match(html, /rod drive lost, core damaged/);
  assert.match(html, /OFF SCALE/);
  assert.match(html, /not a nuclear detonation/);
});
