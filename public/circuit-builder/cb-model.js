// Circuit Builder model: parts, wires, a nodal-analysis solver (Kirchhoff's current law at every
// node), and the challenge logic. No DOM here, so tests run it in Node.
export const MODULE_ID = "circuit-builder";
export const BOARD_W = 24, BOARD_H = 16;     // board size in grid units
export const PART_U = 4;                      // a part's art is 4 x 4 units; leads leave at the left and right edge centres
export const MAX_PARTS = 12, MAX_WIRES = 24;
export const KINDS = ["battery", "bulb", "resistor", "switch", "ammeter", "voltmeter"];
export const NAMES = { battery: "Battery", bulb: "Bulb", resistor: "Resistor", switch: "Switch", ammeter: "Ammeter", voltmeter: "Voltmeter" };
export const BATTERY_V = { min: 1.5, max: 9, step: 1.5, def: 6 };   // volts (TODO-TESLA)
export const RESISTOR_R = { min: 1, max: 100, step: 1, def: 10 };   // ohms (TODO-TESLA)
export const BULB_R = 10;            // ohms, treated as a fixed resistor (TODO-TESLA: real filaments are not ohmic)
export const BULB_P_FULL = 3.6;      // watts for full glow: one bulb straight across 6 V (TODO-TESLA)
export const R_INTERNAL = 0.1;       // battery internal resistance, ohms (TODO-TESLA)
export const R_WIRE = 1e-3;          // a wire or closed switch, ohms
export const R_AMMETER = 0.01;       // an ammeter is almost a wire (TODO-TESLA)
export const R_VOLTMETER = 1e6;      // a voltmeter is almost a gap (TODO-TESLA)
export const G_MIN = 1e-9;           // tiny leak to ground at every node so open circuits stay solvable
export const SHORT_OHMS = 0.5;       // outside resistance below this across a battery counts as a short (TODO-TESLA)
export const LIT = 0.2;              // glow at or above this counts as lit
export const FUN = { targetA: 0.3, tolA: 0.01, fullGlow: 0.9 }; // (TODO-TESLA)
export const BOARD_CAPTION = "Dots show the current, flowing from the + end of the battery round to the other end.";
export const MODEL_NOTE = "Wires are treated as perfect, bulbs as fixed 10 \u03a9 resistors, and each battery has a small internal resistance of 0.1 \u03a9. The meters are almost ideal: the ammeter is nearly a wire and the voltmeter nearly a gap.";

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const snapTo = (v, s) => Math.round(v / s) * s;

// ---------- parts and wires ----------
// A part: { kind, x, y (centre, grid units), v (volts or ohms), closed (switch) }.
// Terminal index t = 2 * part + side, side 0 = left lead, 1 = right lead. A battery's + end is on the right.
export const terminal = (p, side) => ({ x: p.x + (side ? PART_U / 2 : -PART_U / 2), y: p.y });
export function makePart(kind, x, y, extra = {}) {
  const v = kind === "battery" ? BATTERY_V.def : kind === "resistor" ? RESISTOR_R.def : 0;
  return { kind, x, y, v, closed: false, ...extra };
}
export function sanitizeCircuit(c = {}) {
  const parts = (Array.isArray(c.parts) ? c.parts : []).filter((p) => p && KINDS.includes(p.kind)).slice(0, MAX_PARTS).map((p) => {
    const q = { kind: p.kind, x: clamp(Math.round(num(p.x, BOARD_W / 2)), PART_U / 2, BOARD_W - PART_U / 2), y: clamp(Math.round(num(p.y, BOARD_H / 2)), 2, BOARD_H - 2), v: 0, closed: !!p.closed };
    if (p.kind === "battery") q.v = clamp(snapTo(num(p.v, BATTERY_V.def), BATTERY_V.step), BATTERY_V.min, BATTERY_V.max);
    if (p.kind === "resistor") q.v = clamp(Math.round(num(p.v, RESISTOR_R.def)), RESISTOR_R.min, RESISTOR_R.max);
    return q;
  });
  const n = parts.length * 2, seen = new Set(), wires = [];
  for (const w of Array.isArray(c.wires) ? c.wires : []) {
    if (!w || !Number.isInteger(w.a) || !Number.isInteger(w.b) || w.a === w.b || w.a < 0 || w.b < 0 || w.a >= n || w.b >= n) continue;
    const key = Math.min(w.a, w.b) + "-" + Math.max(w.a, w.b); if (seen.has(key)) continue;
    seen.add(key); wires.push({ a: w.a, b: w.b }); if (wires.length >= MAX_WIRES) break;
  }
  return { parts, wires };
}
// Removing a part renumbers the terminals after it, and drops its wires.
export function removePart(c, i) {
  const fix = (t) => (t >= 2 * i + 2 ? t - 2 : t);
  return { parts: c.parts.filter((_, k) => k !== i), wires: c.wires.filter((w) => w.a >> 1 !== i && w.b >> 1 !== i).map((w) => ({ a: fix(w.a), b: fix(w.b) })) };
}
// Clip voltmeter vi across part i: its left lead to the part's own left lead and its right lead to
// the part's own right lead, so it reads that part's voltage alone. Any old wires on the
// voltmeter are dropped first, so it never ends up across a neighbour as well.
export function clipAcross(c, vi, i) {
  const mine = (t) => t >> 1 === vi;
  const wires = c.wires.filter((w) => !mine(w.a) && !mine(w.b));
  wires.push({ a: 2 * vi, b: 2 * i }, { a: 2 * vi + 1, b: 2 * i + 1 });
  return { parts: c.parts, wires };
}
export function partR(p) {
  switch (p.kind) {
    case "bulb": return BULB_R;
    case "resistor": return p.v;
    case "switch": return p.closed ? R_WIRE : Infinity;
    case "ammeter": return R_AMMETER;
    case "voltmeter": return R_VOLTMETER;
    case "battery": return R_INTERNAL;
  }
  return Infinity;
}

// ---------- solver ----------
// Every terminal is its own node; wires are tiny resistors so their currents come out too.
// A battery is a Norton source (V / r into its + node, conductance 1/r). Solve G v = J by
// Gaussian elimination with partial pivoting. Part current I runs from its left lead to its
// right lead (through a battery, that is from - to +).
export function solve(c) {
  const P = c.parts, N = P.length * 2;
  const G = Array.from({ length: N }, () => new Float64Array(N)), J = new Float64Array(N);
  const stamp = (a, b, g) => { G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g; };
  for (let k = 0; k < N; k++) G[k][k] += G_MIN;
  P.forEach((p, i) => {
    const R = partR(p); if (!Number.isFinite(R)) return;
    stamp(2 * i, 2 * i + 1, 1 / R);
    if (p.kind === "battery") { const Is = p.v / R; J[2 * i + 1] += Is; J[2 * i] -= Is; }
  });
  for (const w of c.wires) stamp(w.a, w.b, 1 / R_WIRE);
  const v = gauss(G, J);
  const parts = P.map((p, i) => {
    const vl = v[2 * i], vr = v[2 * i + 1], R = partR(p), dv = vl - vr;
    let I = Number.isFinite(R) ? dv / R : 0;
    if (p.kind === "battery") I = (p.v - (vr - vl)) / R;
    const out = { I, V: p.kind === "battery" ? vr - vl : dv, P: Number.isFinite(R) && p.kind !== "battery" ? (dv * dv) / R : 0 };
    if (p.kind === "bulb") out.glow = clamp(Math.sqrt(out.P / BULB_P_FULL), 0, 1.2);
    if (p.kind === "ammeter") out.reading = I;
    if (p.kind === "voltmeter") out.reading = dv;
    return out;
  });
  const wires = c.wires.map((w) => ({ I: (v[w.a] - v[w.b]) / R_WIRE }));
  // A short: a battery driving almost no outside resistance.
  const shorted = P.map((p, i) => p.kind === "battery" && Math.abs(parts[i].I) > p.v / (R_INTERNAL + SHORT_OHMS)).map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  const flowing = parts.some((r, i) => P[i].kind === "battery" && Math.abs(r.I) > 1e-3);
  return { v, parts, wires, shorted, short: shorted.length > 0, open: !flowing };
}
export function gauss(A0, b0) {
  const n = b0.length, A = A0.map((r) => Float64Array.from(r)), b = Float64Array.from(b0);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-300) continue;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = Math.abs(A[r][r]) > 1e-300 ? s / A[r][r] : 0; }
  return x;
}

// ---------- reading the circuit ----------
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-9);
// Two lit bulbs and one battery: series if both carry the battery's whole current, parallel if
// their currents add up to it with the same voltage across each.
export function bulbPair(c, s) {
  const bulbs = c.parts.map((p, i) => i).filter((i) => c.parts[i].kind === "bulb");
  const bats = c.parts.map((p, i) => i).filter((i) => c.parts[i].kind === "battery");
  if (bulbs.length !== 2 || bats.length !== 1 || s.short) return null;
  const [a, b] = bulbs.map((i) => s.parts[i]), Ib = Math.abs(s.parts[bats[0]].I);
  if (a.glow < LIT || b.glow < LIT) return null;
  if (near(Math.abs(a.I), Ib, 0.02) && near(Math.abs(b.I), Ib, 0.02)) return "series";
  if (near(Math.abs(a.I) + Math.abs(b.I), Ib, 0.02) && near(Math.abs(a.V), Math.abs(b.V), 0.02)) return "parallel";
  return null;
}
export function describe(c, s) {
  if (!c.parts.some((p) => p.kind === "battery")) return { kind: "none", text: "Add a battery to push current round a loop." };
  if (s.short) return { kind: "short", text: "Short circuit: the current has an easy path straight back to the battery. Add a bulb or a resistor to that path." };
  const vin0 = c.parts.findIndex((p, i) => p.kind === "voltmeter" && blocksLoop(c, s, i));
  if (vin0 >= 0) return { kind: "voltmeter-inline", text: "A voltmeter is in the loop. It barely lets current through, so connect it across a part instead." };
  if (s.open) return { kind: "open", text: "Open circuit: there is no complete loop, so no current flows." };
  return { kind: "closed", text: "Closed circuit: current flows round the loop." };
}
// A voltmeter is "in the loop" when swapping it for a wire would let a real current flow.
export function blocksLoop(c, s, i) {
  const swapped = { parts: c.parts.map((p, k) => (k === i ? { ...p, kind: "ammeter" } : p)), wires: c.wires };
  const amps = (r) => r.parts.reduce((m, q, k) => (c.parts[k].kind === "battery" ? Math.max(m, Math.abs(q.I)) : m), 0);
  const now = amps(s), then = amps(solve(swapped));
  return now < 1e-3 && then > 1e-3;
}

// ---------- challenges ----------
export const GOALS = [
  { tier: "bronze", title: "Light two bulbs in series, then in parallel", check: (e) => e.type === "circuit" && e.sawSeries && e.sawParallel },
  { tier: "silver", title: "Make the ammeter read 0.30 A", check: (e) => e.type === "circuit" && !e.short && e.ammeters.some((a) => Math.abs(Math.abs(a) - FUN.targetA) <= FUN.tolA) },
  { tier: "gold", title: "Fix the broken circuit so its bulb glows brightly", check: (e) => e.type === "circuit" && e.scene === "fix" && !e.short && e.maxGlow >= FUN.fullGlow }
];
export const PREDICT = [{ id: "brighter", label: "Brighter" }, { id: "dimmer", label: "Dimmer" }, { id: "same", label: "Same" }];
export const glowTrend = (before, after) => (after > before + 0.05 ? "brighter" : after < before - 0.05 ? "dimmer" : "same");
export const judgePrediction = (g, actual) => g === actual;

// ---------- guided scenes ----------
const W = (a, b) => ({ a, b });
export const SCENES = [
  { id: "pair", name: "Series vs parallel", hint: "Two bulbs share one battery. Switch between series and parallel and compare how bright they glow.",
    build: (layout = "series") => layout === "series"
      ? { parts: [makePart("battery", 12, 13), makePart("bulb", 7, 5), makePart("bulb", 17, 5)], wires: [W(1, 5), W(4, 3), W(2, 0)] }
      : { parts: [makePart("battery", 12, 13), makePart("bulb", 12, 2), makePart("bulb", 12, 8)], wires: [W(1, 3), W(1, 5), W(2, 0), W(4, 0)] } },
  { id: "target", name: "Target current", hint: "Change the resistor until the ammeter reads 0.30 A. The voltmeter across the resistor shows V = IR.",
    build: () => ({ parts: [makePart("battery", 12, 13), makePart("resistor", 8, 6), makePart("ammeter", 17, 6), makePart("voltmeter", 8, 2)], wires: [W(1, 5), W(3, 4), W(2, 0), W(6, 2), W(7, 3)] }) },
  { id: "fix", name: "Fix the circuit", hint: "This bulb should glow brightly but it is dark. Find the faults: tap the switch, drag between two leads to add a wire, and drag a part off the board to remove it.",
    build: () => ({ parts: [makePart("battery", 12, 13), makePart("switch", 6, 6), makePart("voltmeter", 12, 3), makePart("bulb", 18, 6)], wires: [W(2, 0), W(3, 4), W(5, 6)] }) }
];

// ---------- share links ----------
export const SHARE_SCHEMA = (() => {
  const s = { n: { type: "num", min: 0, max: MAX_PARTS }, m: { type: "num", min: 0, max: MAX_WIRES } };
  for (let i = 0; i < MAX_PARTS; i++) Object.assign(s, { [`k${i}`]: { type: "enum", values: KINDS }, [`x${i}`]: { type: "num", min: 0, max: BOARD_W }, [`y${i}`]: { type: "num", min: 0, max: BOARD_H }, [`v${i}`]: { type: "num", min: 0, max: RESISTOR_R.max }, [`c${i}`]: { type: "bool" } });
  for (let i = 0; i < MAX_WIRES; i++) Object.assign(s, { [`a${i}`]: { type: "num", min: 0, max: MAX_PARTS * 2 - 1 }, [`b${i}`]: { type: "num", min: 0, max: MAX_PARTS * 2 - 1 } });
  return s;
})();
export function toShare(c) {
  const o = { n: c.parts.length, m: c.wires.length };
  c.parts.forEach((p, i) => Object.assign(o, { [`k${i}`]: p.kind, [`x${i}`]: p.x, [`y${i}`]: p.y, [`v${i}`]: p.v, [`c${i}`]: !!p.closed }));
  c.wires.forEach((w, i) => Object.assign(o, { [`a${i}`]: w.a, [`b${i}`]: w.b }));
  return o;
}
export function fromShare(o) {
  const parts = [], wires = [];
  for (let i = 0; i < (o.n | 0); i++) if (o[`k${i}`]) parts.push({ kind: o[`k${i}`], x: o[`x${i}`], y: o[`y${i}`], v: o[`v${i}`], closed: !!o[`c${i}`] });
  for (let i = 0; i < (o.m | 0); i++) wires.push({ a: o[`a${i}`], b: o[`b${i}`] });
  return sanitizeCircuit({ parts, wires });
}
