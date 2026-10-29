import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/circuit-builder/cb-model.js";
import { route, routeWire, boxHitsSeg, circuitExtent, ART_BOTTOM, ART_TOP, CAPTION_GAP, LABEL_BOX, FIT_PAD, partLabel } from "../public/circuit-builder/cb-scene.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const FILES = ["study-circuit-builder.html", "circuit-builder/cb-ui.js", "circuit-builder/cb-model.js", "circuit-builder/cb-scene.js", "circuit-builder/circuit-builder-theme.css"];
const P = M.makePart, W = (a, b) => ({ a, b });
const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;
// Battery (terminals 0 -, 1 +) with one part (2, 3) in a loop.
const loop = (part) => M.sanitizeCircuit({ parts: [P("battery", 12, 13), part], wires: [W(1, 3), W(2, 0)] });

test("Ohm's law: one resistor on a battery, internal resistance included", () => {
  const c = loop(P("resistor", 12, 5, { v: 20 })), s = M.solve(c), I = 6 / (20 + M.R_INTERNAL + 2 * M.R_WIRE);
  assert.ok(near(Math.abs(s.parts[1].I), I, 1e-6)); assert.ok(near(Math.abs(s.parts[1].V), 20 * I, 1e-5));
  assert.ok(near(Math.abs(s.parts[0].I), I, 1e-6)); assert.equal(s.short, false); assert.equal(s.open, false);
});
test("Kirchhoff's current law holds at every node of a parallel circuit", () => {
  const c = M.sanitizeCircuit(M.SCENES[0].build("parallel")), s = M.solve(c), net = new Float64Array(c.parts.length * 2);
  s.parts.forEach((r, i) => { net[2 * i] -= r.I; net[2 * i + 1] += r.I; });
  c.wires.forEach((w, k) => { net[w.a] -= s.wires[k].I; net[w.b] += s.wires[k].I; });
  for (const x of net) assert.ok(Math.abs(x) < 1e-6, `node imbalance ${x}`);
});
test("series and parallel bulbs: currents, glow and detection", () => {
  const ser = M.sanitizeCircuit(M.SCENES[0].build("series")), par = M.sanitizeCircuit(M.SCENES[0].build("parallel"));
  const a = M.solve(ser), b = M.solve(par);
  assert.equal(M.bulbPair(ser, a), "series"); assert.equal(M.bulbPair(par, b), "parallel");
  assert.ok(near(Math.abs(a.parts[1].I), 0.3, 0.005)); assert.ok(near(a.parts[1].glow, 0.5, 0.01));
  assert.ok(near(Math.abs(b.parts[1].I) + Math.abs(b.parts[2].I), Math.abs(b.parts[0].I), 1e-6)); assert.ok(b.parts[1].glow > 0.95);
});
test("short circuits are finite and flagged; an ammeter across a battery is a short", () => {
  const wire = M.sanitizeCircuit({ parts: [P("battery", 12, 13)], wires: [W(0, 1)] }), s = M.solve(wire);
  assert.ok(s.short && Number.isFinite(s.parts[0].I) && Math.abs(s.parts[0].I) < 6 / M.R_INTERNAL + 1);
  assert.ok(M.solve(loop(P("ammeter", 12, 5))).short); assert.equal(M.describe(wire, s).kind, "short");
  assert.ok(!M.solve(loop(P("resistor", 12, 5, { v: 1 }))).short);
});
test("open circuits: an open switch or missing wire carries no current, the switch holds the voltage", () => {
  const c = loop(P("switch", 12, 5)), s = M.solve(c);
  assert.ok(s.open); assert.ok(Math.abs(s.parts[1].I) < 1e-6); assert.ok(near(Math.abs(s.parts[1].V), 6, 1e-3));
  const gap = M.sanitizeCircuit({ parts: [P("battery", 12, 13), P("bulb", 12, 5)], wires: [W(1, 3)] }), g = M.solve(gap);
  assert.ok(g.open && g.parts.every((r) => Number.isFinite(r.I) && Number.isFinite(r.V))); assert.equal(M.describe(gap, g).kind, "open");
});
test("meters: voltmeter in parallel reads V, voltmeter inline blocks the loop, ammeter in series reads I", () => {
  const t = M.sanitizeCircuit(M.SCENES[1].build()), s = M.solve(t), R = t.parts[1], I = Math.abs(s.parts[1].I);
  assert.ok(near(Math.abs(s.parts[3].reading), R.v * I, 1e-3)); assert.ok(near(Math.abs(s.parts[2].reading), I, 1e-4));
  assert.equal(M.describe(t, s).kind, "closed");
  const inl = loop(P("voltmeter", 12, 5)), si = M.solve(inl);
  assert.ok(Math.abs(si.parts[1].I) < 1e-4); assert.equal(M.describe(inl, si).kind, "voltmeter-inline");
  const bulbInl = M.sanitizeCircuit({ parts: [P("battery", 12, 13), P("voltmeter", 8, 5), P("bulb", 16, 5)], wires: [W(1, 5), W(4, 3), W(2, 0)] });
  assert.ok(M.solve(bulbInl).parts[2].glow < 0.01);
});
test("the broken-circuit puzzle starts dark and can be fixed", () => {
  let c = M.sanitizeCircuit(M.SCENES[2].build()), s = M.solve(c);
  assert.ok(s.parts[3].glow < M.LIT); const [, , gold] = M.GOALS;
  assert.ok(!gold.check({ type: "circuit", scene: "fix", short: s.short, maxGlow: s.parts[3].glow }));
  c.parts[1].closed = true; c.wires.push(W(7, 1)); c = M.removePart(c, 2); c.wires.push(W(3, 4)); s = M.solve(c);
  assert.ok(gold.check({ type: "circuit", scene: "fix", short: s.short, maxGlow: s.parts[2].glow }));
});
test("goals: bronze needs both arrangements, silver hits 0.30 A with a resistor inside its range", () => {
  const [b, si] = M.GOALS, ev = { type: "circuit", short: false, ammeters: [], sawSeries: true, sawParallel: false };
  assert.ok(!b.check(ev)); assert.ok(b.check({ ...ev, sawParallel: true }));
  const t = M.sanitizeCircuit(M.SCENES[1].build()); t.parts[1].v = 20; const r = M.solve(t);
  assert.ok(si.check({ ...ev, ammeters: [r.parts[2].reading] }), `reads ${r.parts[2].reading}`);
  assert.ok(!si.check({ ...ev, ammeters: [0.5] })); assert.ok(!si.check({ ...ev, short: true, ammeters: [0.3] }));
  assert.equal(M.glowTrend(0.5, 1), "brighter"); assert.equal(M.glowTrend(1, 0.5), "dimmer"); assert.equal(M.glowTrend(0.5, 0.52), "same");
});
test("sanitizing, removing parts and share links", () => {
  const c = M.sanitizeCircuit({ parts: [P("battery", -9, 99, { v: 50 }), { kind: "laser" }, P("resistor", 5, 5, { v: 0.2 }), 7], wires: [W(0, 3), W(3, 0), W(1, 1), W(0, 9), { a: "x", b: 1 }] });
  assert.equal(c.parts.length, 2); assert.equal(c.parts[0].v, M.BATTERY_V.max); assert.equal(c.parts[1].v, M.RESISTOR_R.min);
  assert.deepEqual(c.parts[0].x, M.PART_U / 2); assert.equal(c.wires.length, 1);
  const s = M.sanitizeCircuit(M.SCENES[2].build()), r = M.removePart(s, 1);
  assert.equal(r.parts.length, 3); assert.ok(r.wires.every((w) => w.a < 6 && w.b < 6)); assert.deepEqual(r.wires, [W(3, 4)]);
  for (const sc of M.SCENES) { const x = M.sanitizeCircuit(sc.build()); x.parts[0].v = 4.5; assert.deepEqual(M.fromShare(M.toShare(x)), x, sc.id); }
});
test("wires leave each lead sideways and avoid part bodies", () => {
  const a = { x: 5, y: 5 }, b = { x: 10, y: 13 }, rect = { x0: 3.5, x1: 6.5, y0: 3, y1: 6 };
  const pts = route(a, b, 0, 0, [rect]);
  assert.deepEqual(pts[0], a); assert.deepEqual(pts.at(-1), b); assert.equal(pts[1].x, 4);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y, "right angles only");
  assert.deepEqual(route({ x: 9, y: 5 }, { x: 15, y: 5 }, 1, 0), [{ x: 9, y: 5 }, { x: 15, y: 5 }]);
});
test("Leo's notes: gray resistor bands with a live value, meters labelled, leads at the edge centres", () => {
  assert.equal(partLabel(P("resistor", 0, 0, { v: 10 })), "10 \u03a9"); assert.equal(partLabel(P("ammeter", 0, 0)), "Ammeter"); assert.equal(partLabel(P("voltmeter", 0, 0)), "Voltmeter");
  const t = M.terminal(P("bulb", 10, 6), 0), u = M.terminal(P("bulb", 10, 6), 1); assert.deepEqual([t, u], [{ x: 8, y: 6 }, { x: 12, y: 6 }]);
  const scene = read("circuit-builder/cb-scene.js");
  assert.match(scene, /fillText\(p\.kind === "voltmeter" \? "V" : "A"/); assert.match(scene, /reading/);
  assert.match(scene, /bulbGlow/); for (const k of ["battery", "bulb", "resistor", "voltmeter", "ammeter"]) assert.ok(ART_BOTTOM[k] > 128);
  for (const n of ["battery", "bulb-off", "bulb-on", "resistor", "switch-open", "switch-closed", "voltmeter", "ammeter", "board-tile"]) assert.ok(existsSync(new URL(`circuit-builder/art/${n}.webp`, pub)), n);
});
test("house rules: files, card, test script, no em-dashes, no mascot, toasts in the panel", () => {
  for (const f of FILES) { const s = read(f); assert.ok(!s.includes("\u2014"), f + " has an em-dash"); assert.ok(!/jasper/i.test(s), f); }
  const html = read("study-circuit-builder.html");
  assert.match(html, /<section class="controls"[^]*id="toast"[^]*<\/section>/);
  assert.match(read("study.html"), /id: "circuit-builder"[^]*file: "study-circuit-builder.html"/);
  assert.match(readFileSync(new URL("./package.json", import.meta.url), "utf8"), /"test:circuitbuilder": "node --test circuit-builder.test.mjs"/);
  assert.match(read("circuit-builder/cb-ui.js"), /start: 1/);
  for (const d of ["../docs/circuit-builder-science.md", "../docs/fun-challenges.md"]) { const s = read(d); assert.ok(s.includes("Cleared by Tesla 2026-10-29")); assert.ok(!s.includes("\u2014") || d.includes("fun-challenges")); }
});

// Leo's second round and Tesla's check.
const SHOTS = { series: () => M.SCENES[0].build("series"), parallel: () => M.SCENES[0].build("parallel"), target: () => M.SCENES[1].build(), fix: () => M.SCENES[2].build(),
  clip: () => M.clipAcross({ parts: [P("battery", 4, 3), P("bulb", 9, 3), P("ammeter", 14, 3), P("voltmeter", 9, 8)], wires: [W(1, 2), W(3, 4), W(5, 0)] }, 3, 1) };
// The same label rule the scene uses, in board units at the phone scale (u px per unit).
function labelBoxes(c, u = 20.875) {
  const segs = []; for (const w of c.wires) { const p = routeWire(c, w); for (let i = 1; i < p.length; i++) segs.push([p[i - 1], p[i]].map((q) => ({ x: q.x * u, y: q.y * u }))); }
  c.parts.forEach((p) => { const y = p.y * u, l = (p.x - 2) * u, r = (p.x + 2) * u; segs.push([{ x: l, y }, { x: l + 0.56 * u, y }], [{ x: r - 0.56 * u, y }, { x: r, y }]); });
  return { segs, boxes: c.parts.map((p) => {
    const k = p.kind === "switch" ? (p.closed ? "switch-closed" : "switch-open") : p.kind, w = partLabel(p).length * 7, h = LABEL_BOX, cx = p.x * u;
    const top = (p.y - 2 + (ART_TOP[k] / 256) * 4) * u, bot = (p.y - 2 + (ART_BOTTOM[k] / 256) * 4) * u, s = 4 * u;
    const at = (x, y) => ({ left: x - w / 2, right: x + w / 2, top: y, bottom: y + h });
    const cands = [at(cx, bot + CAPTION_GAP), at(cx, top - CAPTION_GAP - h), at(cx + s / 2 + 4 + w / 2, p.y * u - h / 2 - s * 0.42), at(cx - s / 2 - 4 - w / 2, p.y * u - h / 2 - s * 0.42)];
    return cands.find((b) => !segs.some(([a, z]) => boxHitsSeg(b, a, z, 3))) || cands[0];
  }) };
}
test("Leo: no part label box crosses a wire or a lead in the shot scenes", () => {
  for (const [id, build] of Object.entries(SHOTS)) {
    const c = M.sanitizeCircuit(build()), { segs, boxes } = labelBoxes(c);
    boxes.forEach((b, i) => assert.ok(!segs.some(([a, z]) => boxHitsSeg(b, a, z)), `${id}: label ${partLabel(c.parts[i])} crosses a wire`));
  }
  assert.ok(boxHitsSeg({ left: 0, right: 10, top: 0, bottom: 10 }, { x: -5, y: 5 }, { x: 15, y: 5 })); assert.ok(!boxHitsSeg({ left: 0, right: 10, top: 0, bottom: 10 }, { x: -5, y: 12 }, { x: 15, y: 12 }));
});
test("Leo: on a 390 px phone the circuit fits the board with 16 px padding, parts well over the old 61 px", () => {
  const c = M.sanitizeCircuit(SHOTS.clip()), e = circuitExtent(c), bw = 390 - 24, u0 = bw / M.BOARD_W;
  const u = Math.min((bw - 2 * FIT_PAD) / (e.x1 - e.x0), u0 * 2); assert.equal(FIT_PAD, 16);
  assert.ok(u * M.PART_U > 1.3 * u0 * M.PART_U, `part ${u * M.PART_U} px`);
});
test("Leo: Clip voltmeter across a bulb uses the bulb's own leads and reads the bulb's I*R", () => {
  const c = M.sanitizeCircuit(SHOTS.clip()), s = M.solve(c);
  assert.deepEqual(c.wires.slice(-2), [W(6, 2), W(7, 3)]);
  const IR = Math.abs(s.parts[1].I) * M.BULB_R, amm = Math.abs(s.parts[2].V);
  assert.ok(Math.abs(Math.abs(s.parts[3].reading) - IR) < 1e-6, `reads ${s.parts[3].reading}, bulb I*R ${IR}`);
  assert.ok(Math.abs(Math.abs(s.parts[3].reading) - (IR + amm)) > amm / 2, "not bulb plus ammeter");
  const again = M.clipAcross(M.clipAcross(c, 3, 2), 3, 1); assert.equal(again.wires.filter((w) => w.a >> 1 === 3 || w.b >> 1 === 3).length, 2);
  const pts = routeWire(c, c.wires.at(-1)); assert.deepEqual(pts.at(-1), M.terminal(c.parts[1], 1)); assert.equal(pts.at(-2).x, pts.at(-1).x, "arrives straight onto the bulb's lead");
});
test("Tesla: the Fix the circuit puzzle has a 6 V battery and its fix leaves one bulb in the loop, so Gold is reachable", () => {
  const start = M.sanitizeCircuit(M.SCENES[2].build()), bat = start.parts.find((p) => p.kind === "battery");
  assert.ok(bat.v >= 6); assert.equal(start.parts.filter((p) => p.kind === "bulb").length, 1);
  let c = start; c.parts[1].closed = true; c.wires.push(W(7, 1)); c = M.removePart(c, 2); c.wires.push(W(3, 4));
  const s = M.solve(c), bi = c.parts.findIndex((p) => p.kind === "bulb");
  assert.equal(c.parts.filter((p) => p.kind === "bulb").length, 1); assert.ok(s.parts[bi].P >= 2.92, `P ${s.parts[bi].P}`);
  assert.ok(s.parts[bi].glow >= M.FUN.fullGlow); assert.ok(M.GOALS[2].check({ type: "circuit", scene: "fix", short: s.short, maxGlow: s.parts[bi].glow }));
});
