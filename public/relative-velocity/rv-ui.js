// Relative Velocity Exploration: page wiring. Scenes draw into one SVG; the chosen viewer stays at rest.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import * as P from "./rv-physics.js";
import { STRINGS } from "./rv-strings.js";
import { ART, artUrl, shown, BEADS } from "./rv-art.js";

const C = P.CONFIG;
const NS = "http://www.w3.org/2000/svg";
const THEME_KEY = "popboard.relative-velocity.theme";
const $ = (id) => document.getElementById(id);
const reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => reducedMQ.matches;
const theme = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

const FRAME_LABEL = {
  shore: "Shore", leaf: "Leaf", boat: "Boat",
  ground: "Ground", truck: "Truck", ball: "Ball",
  floor: "Floor", belt: "Belt", walker: "Walker",
  track: "Track", rival: "Rival", kart: "Kart",
};
const GROUND_FRAME = { river: "shore", truck: "ground", walkway: "floor", kart: "track" };

// ---------- strings (Socrates owns rv-strings.js) ----------
const lab = {
  length: C.river.lengthDefault, step: 1, maxStep: 1, heading: 1,
  trials: { still: [], down: [], up: [] }, pred: { down: NaN, up: NaN },
  valveAngle: 0, complete: false,
};
const knownAngle = () => (270 * C.river.flowRate) / C.river.flowRateMax;
function str(path) { return path.split(".").reduce((o, k) => (o ? o[k] : undefined), STRINGS) || ""; }
function fill(s) {
  return s.replaceAll("{L}", lab.length.toFixed(1)).replaceAll("{u}", C.river.flowRate.toFixed(2)).replaceAll("{vb}", C.river.boatSpeed.toFixed(2));
}
function applyStrings() { document.querySelectorAll("[data-str]").forEach((el) => { el.textContent = fill(str(el.dataset.str)); }); }

// ---------- svg helpers ----------
function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
// A sprite at Leo's display size, positioned by its anchor (SPEC.md). scale shrinks it if needed.
function sprite(parent, name, cls, scale = 1) {
  const g = el("g", cls ? { class: cls } : {}, parent);
  const inner = el("g", {}, g);
  const s = shown(name);
  const img = el("image", { href: artUrl(name, theme()), width: s.w * scale, height: s.h * scale, x: -s.ax * scale, y: -s.ay * scale, preserveAspectRatio: "none" }, inner);
  img.dataset.art = name;
  g.inner = inner;
  return g;
}
function place(g, x, y, flip = false) {
  g.setAttribute("transform", `translate(${x.toFixed(2)},${y.toFixed(2)})`);
  if (g.inner) g.inner.setAttribute("transform", flip ? "scale(-1,1)" : "");
}
// One arrow from x0 to x1 at height y. Zero length draws a dot so "at rest" is visible.
function arrow(parent, cls, x0, x1, y, w) {
  const g = el("g", { class: cls }, parent);
  const len = x1 - x0;
  if (Math.abs(len) < 4) { el("circle", { cx: x0, cy: y, r: w * 0.9, stroke: "none" }, g); return g; }
  const dir = Math.sign(len), head = Math.min(Math.abs(len), w * 3.2);
  el("line", { x1: x0, y1: y, x2: x1 - dir * head * 0.8, y2: y, "stroke-width": w, "stroke-linecap": "round" }, g);
  el("path", { d: `M${x1} ${y} L${x1 - dir * head} ${y - head * 0.62} L${x1 - dir * head} ${y + head * 0.62} Z`, stroke: "none" }, g);
  return g;
}
// Tail-to-tip: object arrow, then medium arrow from its tip, then the bold sum underneath.
function vectorStack(parent, x, y, vObjMedium, vMediumViewer, scale) {
  const a = vObjMedium * scale, b = vMediumViewer * scale;
  arrow(parent, "rv-a-obj", x, x + a, y, 10);
  arrow(parent, "rv-a-med", x + a, x + a + b, y, 10);
  arrow(parent, "rv-a-sum", x, x + a + b, y + 34, 15);
}
function wrap(v, lo, period) { return ((((v - lo) % period) + period) % period) + lo; }
// Leo's backdrops are seamless 1600 x 900 tiles: repeat one copy directly (never mirrored) as the camera moves.
function backdrop(defs, svgRoot, id, name) {
  if (!ART[name].tiles) throw new Error(name + " is not a seamless tile");
  const p = el("pattern", { id, patternUnits: "userSpaceOnUse", width: 1600, height: 900, "data-backdrop": name }, defs);
  const img = el("image", { href: artUrl(name, theme()), width: 1600, height: 900, preserveAspectRatio: "none" }, p);
  img.dataset.art = name;
  el("rect", { width: 1600, height: 900, fill: `url(#${id})` }, svgRoot);
  return p;
}
function tilePattern(defs, id, name, y, scale = 1, gap = 0) {
  const s = shown(name);
  const p = el("pattern", { id, patternUnits: "userSpaceOnUse", width: s.w * scale + gap, height: s.h * scale, y }, defs);
  const img = el("image", { href: artUrl(name, theme()), width: s.w * scale, height: s.h * scale, preserveAspectRatio: "none" }, p);
  img.dataset.art = name;
  return p;
}
const shiftT = (g, px) => g.setAttribute("patternTransform", `translate(${px.toFixed(2)},0)`);

// ---------- state ----------
const params = {
  truck: { truckSpeedMph: C.truck.truckSpeedMph, throwSpeedMph: C.truck.throwSpeedMph, throwDir: C.truck.throwDir },
  walkway: { beltSpeed: C.walkway.beltSpeed, walkSpeed: C.walkway.walkSpeed, walkDir: C.walkway.walkDir },
  kart: { kartSpeedMph: C.kart.kartSpeedMph, boostSpeedMph: C.kart.boostSpeedMph, rivalSpeedMph: C.kart.rivalSpeedMph, boostOn: C.kart.boostOn },
};
const st = {
  scene: "river",
  frame: { river: "shore", truck: "ground", walkway: "floor", kart: "track" },
  playing: !reduced(),
  anchor: 0, glide: 0, shift: 0,
};
const svg = $("sceneSvg");

// ---------- scenes ----------
// Every scene is a 1600 x 900 stage (Leo's backdrops). Each: ppm (px per m), build(), step(dt),
// viewerX(frame) in m, render(shiftM), readParams(), action, drag.
const river = {
  // Channel at x 200, y 392, 1200 x 178; water 0 m at x 223, 5 m at x 1376.5 (SPEC.md).
  W: 1600, H: 900, x0: 223, ppm: (1376.5 - 223) / 5, cy: 392 + (176.5 * 178) / 355, half: (129.5 * 178) / 355,
  span: 5, t: 0, flow: 0, boat: { x: 0, y: 0, running: false }, beads: [],
  get flowOn() { return this.flow > 0; },
  // The boat is anchored at its bow: boat.x is the bow tip on the ruler (m). Gates are centered so the
  // hull fits behind the start gate going either way. Timing runs on the scene clock from the moment
  // the bow crosses the start gate to the moment it crosses the finish gate.
  get hull() { const a = ART.boat, s = shown("boat"); return ((a.anchor[0] - a.stern) * s.w) / a.png[0] / this.ppm; },
  gates() { const a = (this.span - lab.length) / 2; return lab.heading > 0 ? [a, a + lab.length] : [a + lab.length, a]; },
  startX() { return this.gates()[0]; },
  resetBoat() { this.boat = { x: this.startX(), y: 0, running: false, clock: 0, t0: null, t1: null }; },
  reset() {
    this.resetBoat();
    this.beads = BEADS.map((name, i) => ({ name, x: ((i + 0.5) / BEADS.length) * this.span, y: [0.45, -0.5, 0.2, -0.15][i] }));
  },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = backdrop(defs, svg, "bgRiver", "bg-river");
    this.waterPat = el("pattern", { id: "waterPat", patternUnits: "userSpaceOnUse", width: 90, height: 60 }, defs);
    el("path", { d: "M8 18 q18 -9 36 0 M50 46 q18 -9 36 0", stroke: "#4E86AA", "stroke-width": 3, fill: "none", opacity: 0.45 }, this.waterPat);
    this.world = el("g", {}, svg);
    const ch = shown("channel"), ru = shown("ruler");
    el("image", { href: artUrl("channel", theme()), x: 200, y: 392, width: ch.w, height: ch.h, "data-art": "channel" }, this.world);
    el("image", { href: artUrl("ruler", theme()), x: 200, y: 584, width: ru.w, height: ru.h, "data-art": "ruler" }, this.world);
    this.water = el("rect", { x: this.x0, y: this.cy - this.half, width: this.span * this.ppm, height: this.half * 2, fill: "url(#waterPat)" }, this.world);
    this.gatesG = el("g", {}, this.world);
    this.beadG = this.beads.map((b, i) => {
      const g = sprite(this.world, b.name, "rv-drag");
      g.dataset.drag = "bead" + i;
      if (i === 0) {
        el("circle", { r: 30, fill: "none", stroke: "var(--rv-medium)", "stroke-width": 4, "stroke-dasharray": "8 6" }, g);
        el("text", { class: "rv-svg-small", y: -40, "text-anchor": "middle" }, g).textContent = "leaf";
      }
      return g;
    });
    this.boatG = sprite(this.world, "boat", "rv-drag");
    this.boatG.dataset.drag = "boat";
    this.arrows = el("g", {}, svg);
    this.label = el("text", { class: "rv-svg-small rv-svg-chip", x: 30, y: 870 }, svg);
    this.layoutChannel();
  },
  // Start and finish gates mark the timed run, 0 m to L on the ruler.
  layoutChannel() {
    this.gatesG.replaceChildren();
    const [g0, g1] = this.gates();
    for (const [x, t] of [[g0, "start"], [g1, "finish"]]) {
      const px = this.sx(x), left = x === Math.min(g0, g1);
      el("line", { x1: px, y1: this.cy - this.half - 6, x2: px, y2: this.cy + this.half + 6, stroke: "var(--rv-sum)", "stroke-width": 4, "stroke-dasharray": "12 8", "data-gate": t }, this.gatesG);
      el("text", { class: "rv-svg-small", x: px, y: this.cy - this.half - 18, "text-anchor": left ? "end" : "start" }, this.gatesG).textContent = t;
    }
  },
  sx(xm) { return this.x0 + xm * this.ppm; },
  laneY(f) { return this.cy + f * this.half; },
  vBoat() { return P.boatGround(lab.heading, C.river.boatSpeed, this.flow); },
  step(dt) {
    this.t += dt;
    for (const b of this.beads) { b.x += this.flow * dt; if (b.x > this.span) b.x -= this.span; }
    const b = this.boat;
    if (b.running) {
      const v = this.vBoat(), [g0, g1] = this.gates(), h = lab.heading, x = b.x;
      b.x += v * dt;
      // past(g): the bow is at or beyond gate g in the direction of travel. Crossings are interpolated
      // inside the frame, so the time is exact whatever the frame rate.
      const past = (p, g) => h * (p - g) >= -1e-12;
      if (b.t0 == null && past(b.x, g0)) b.t0 = b.clock + (v ? Math.max(0, (g0 - x) / v) : 0);
      if (b.t0 != null && past(b.x, g1)) {
        b.t1 = b.clock + (g1 - x) / v; b.x = g1; b.running = false; b.clock = b.t1;
        gateStop(b.t1 - b.t0);
      } else b.clock += dt;
    }
  },
  // Frames follow the boat's middle so the Boat view does not jump when the heading flips.
  boatMid() { return this.boat.x - lab.heading * this.hull / 2; },
  viewerX(f) { return f === "leaf" ? this.beads[0].x : f === "boat" ? this.boatMid() : 0; },
  render(shift) {
    const sp = shift * this.ppm;
    this.world.setAttribute("transform", `translate(${(-sp).toFixed(2)},0)`);
    shiftT(this.bg, -sp);
    shiftT(this.waterPat, this.x0 + this.flow * this.t * this.ppm);
    this.beads.forEach((b, i) => place(this.beadG[i], this.sx(b.x), this.laneY(b.y)));
    place(this.boatG, this.sx(this.boat.x), this.laneY(this.boat.y), lab.heading < 0);
    this.arrows.replaceChildren();
    const r = P.readout("river", this.readParams(), st.frame.river);
    const scale = 420;
    vectorStack(this.arrows, this.sx(this.boatMid()) - sp, 300, r.objMedium, r.mediumViewer, scale);
    const lx = this.sx(this.beads[0].x) - sp;
    // The water's velocity at the leaf, under the ruler. Hidden when it is zero (still water, or the Leaf view),
    // so there is no stray dot.
    if (Math.abs(r.mediumViewer * scale) >= 4) arrow(this.arrows, "rv-a-med", lx, lx + r.mediumViewer * scale, 690, 10);
    this.label.textContent = this.boat.running ? "Boat running" : this.flowOn ? `Water on: ${this.flow.toFixed(2)} m/s` : "Still water";
  },
  readParams() { return { heading: lab.heading, boatSpeed: C.river.boatSpeed, flow: this.flow }; },
  actionLabel() { return this.boat.running ? "Stop boat" : "Run boat"; },
  action() {
    if (this.boat.running) { this.boat.running = false; gateAbort(); return; }
    Object.assign(this.boat, { x: this.startX(), running: true, clock: 0, t0: null, t1: null });
    gateStart();
    setPlaying(true);
  },
  drag(id, xm, ym) {
    const f = Math.max(-0.7, Math.min(0.7, (ym - this.cy) / this.half));
    if (id === "boat") {
      if (this.boat.running) return null;
      // The finger holds the middle of the hull; the whole hull stays in the water.
      const lo = lab.heading > 0 ? this.hull : 0, hi = lab.heading > 0 ? this.span : this.span - this.hull;
      const bow = (xm - this.x0) / this.ppm + (lab.heading * this.hull) / 2;
      this.boat.x = Math.max(lo, Math.min(hi, bow)); this.boat.y = f; return "boat";
    }
    const b = this.beads[+id.slice(4)];
    b.x = Math.max(0, Math.min(this.span, (xm - this.x0) / this.ppm)); b.y = f;
    return id === "bead0" ? "leaf" : null;
  },
  slowNote: () => "Real time",
};

const truck = {
  W: 1600, H: 900, ppm: 1600 / C.truck.viewWidth, groundY: 700, bedBack: -1.55,
  // The truck starts fully in frame (its middle at startX, the back of the 5.5 m sprite 0.35 m in) and
  // reaches the flag after lead s. Its arrows ride in the sky band (y 40 to 140), above the trees.
  t: 0, marker: 9.5, released: false, trail: [], done: 0, startHome: 3.1, startX: 3.1, arrowY: 70,
  get lead() { const v = this.vt(); return v > 0 ? Math.max(0, this.marker - Math.min(this.startX, this.marker)) / v : 1.0; },
  anchorRange: { truck: [0.65, 0.8], ball: [0.3, 0.7] },
  vt() { return P.toMs(params.truck.truckSpeedMph); },
  vball() { return P.add(params.truck.throwDir * P.toMs(params.truck.throwSpeedMph), this.vt()); },
  reset() { this.t = 0; this.released = false; this.trail = []; this.done = 0; this.startX = this.startHome; },
  truckX() { return this.marker - this.vt() * this.lead + this.vt() * this.t; },
  ball() {
    const h = C.truck.releaseHeight;
    if (!this.released) return { x: this.truckX() + this.bedBack, y: h, landed: false };
    return P.ballAfterRelease(this.t - this.lead, this.marker + this.bedBack, this.vball(), h);
  },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = backdrop(defs, svg, "bgTruck", "bg-truck");
    this.world = el("g", {}, svg);
    this.markerG = el("g", { class: "rv-drag" }, this.world);
    this.markerG.dataset.drag = "marker";
    el("path", { d: "M0 0 V-74 L42 -61 L0 -48", fill: "var(--rv-medium)", stroke: "var(--rv-ink-svg)", "stroke-width": 3 }, this.markerG);
    el("rect", { x: -26, y: -80, width: 74, height: 86, fill: "transparent" }, this.markerG);
    this.trailG = el("g", {}, svg);
    this.truckG = sprite(svg, "truck", "rv-drag");
    this.truckG.dataset.drag = "truck";
    this.ballG = sprite(svg, "basketball");
    this.arrows = el("g", {}, svg);
    this.label = el("text", { class: "rv-svg-small rv-svg-chip", x: 30, y: 870 }, svg);
  },
  step(dt) {
    this.t += dt;
    if (!this.released && this.t >= this.lead) this.released = true;
    if (this.released) {
      const b = this.ball();
      const last = this.trail[this.trail.length - 1];
      if (!last || !last.landed) this.trail.push({ x: b.x, y: b.y, landed: b.landed, v: { ground: 0, truck: this.truckX(), ball: b.x } });
      if (b.landed) this.done += dt;
      if (this.done > 1.4) this.reset();
    }
  },
  viewerX(f) { return f === "truck" ? this.truckX() : f === "ball" ? this.ball().x : 0; },
  sy(ym) { return this.groundY - ym * this.ppm; },
  render(shift) {
    const sp = shift * this.ppm, f = st.frame.truck;
    this.world.setAttribute("transform", `translate(${(-sp).toFixed(2)},0)`);
    shiftT(this.bg, -sp);
    place(this.markerG, this.marker * this.ppm, this.groundY);
    let tx = this.truckX() * this.ppm - sp;
    if (f !== "truck" && !this.released) tx = wrap(tx, -300, this.W + 600);
    place(this.truckG, tx, this.groundY);
    const b = this.ball();
    const ballR = shown("basketball").h / 2;
    const bx = b.x * this.ppm - sp, by = this.sy(b.y) - ballR;
    place(this.ballG, bx, by);
    this.trailG.replaceChildren();
    for (const p of this.trail) {
      const x = (p.x - (p.v[f] - st.anchor) - st.glide) * this.ppm;
      el("circle", { class: "rv-trail", cx: x.toFixed(1), cy: (this.sy(p.y) - ballR).toFixed(1), r: 6 }, this.trailG);
    }
    this.arrows.replaceChildren();
    const r = P.readout("truck", this.readParams(), f);
    const scale = 14;
    const objMedium = this.released && !b.landed ? r.objMedium : 0;
    if (this.released && b.landed) arrow(this.arrows, "rv-a-sum", bx, bx - r.viewerGround * scale, this.arrowY + 74, 15);
    else vectorStack(this.arrows, bx, this.arrowY + 40, objMedium, r.mediumViewer, scale);
    arrow(this.arrows, "rv-a-med", tx, tx + r.mediumViewer * scale, this.arrowY, 10);
    this.label.textContent = !this.released ? "Truck coming up to the flag" : b.landed ? "Ball landed" : "Ball in the air";
  },
  readParams() { return { ...params.truck, released: true }; },
  actionLabel: () => "Throw again",
  action() { this.reset(); setPlaying(true); },
  drag(id, xm) {
    const x = xm / this.ppm;
    if (id === "marker") { this.marker = Math.max(this.startHome, Math.min(C.truck.viewWidth - 2, x)); this.reset(); return null; }
    // Dragging the truck before the throw carries the flag (the release point) with it.
    if (id === "truck" && !this.released) { const d = x - this.truckX(); this.startX += d; this.marker += d; return "truck"; }
    return null;
  },
  slowNote: () => `Slow motion x${C.truck.timeScale}`,
};

const walkway = {
  // Walkway base on y 760 (SPEC.md). The tile is shown 1.8x SPEC's size (499 x 351) so the handrail is about
  // 1 m above the belt next to the 1.75 m walker; the belt surface is 220.5 px below the tile top.
  // Leo's seamless airport: floor from about y 510, walkway base on y 760, so the base sits on the floor.
  W: 1600, H: 900, ppm: 1600 / C.walkway.viewWidth, baseY: 760, floorY: 510,
  get tileTop() { return this.baseY - shown("walkway").h; },
  get beltY() { return this.tileTop + shown("walkway").ay; },
  t: 0, w0: 1.5, m0: 4,
  reset() { this.t = 0; this.w0 = 1.5; this.m0 = 4; },
  vw() { return P.add(params.walkway.walkDir * params.walkway.walkSpeed, params.walkway.beltSpeed); },
  walkerX() { return this.w0 + this.vw() * this.t; },
  markX() { return this.m0 + params.walkway.beltSpeed * this.t; },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = backdrop(defs, svg, "bgWalk", "bg-walkway");
    const tile = shown("walkway");
    this.tiles = tilePattern(defs, "walkTile", "walkway", this.tileTop);
    this.treads = el("pattern", { id: "treads", patternUnits: "userSpaceOnUse", width: 48, height: 24, y: this.beltY - 2 }, defs);
    el("rect", { x: 6, y: 0, width: 8, height: 24, fill: "var(--rv-tread)" }, this.treads);
    el("rect", { x: 0, y: this.tileTop, width: this.W, height: tile.h, fill: "url(#walkTile)" }, svg);
    el("rect", { x: 0, y: this.beltY - 2, width: this.W, height: 24, fill: "url(#treads)" }, svg);
    this.markG = el("g", { class: "rv-drag" }, svg);
    this.markG.dataset.drag = "mark";
    el("path", { d: "M-18 0 L0 -34 L18 0 Z", fill: "var(--rv-medium)", stroke: "var(--rv-ink-svg)", "stroke-width": 3 }, this.markG);
    el("text", { class: "rv-svg-small", y: -44, "text-anchor": "middle" }, this.markG).textContent = "belt";
    el("rect", { x: -34, y: -46, width: 68, height: 52, fill: "transparent" }, this.markG);
    this.walkerG = sprite(svg, "walker", "rv-drag");
    this.walkerG.dataset.drag = "walker";
    this.arrows = el("g", {}, svg);
  },
  step(dt) { this.t += dt; },
  viewerX(f) { return f === "belt" ? this.markX() : f === "walker" ? this.walkerX() : 0; },
  render(shift) {
    const sp = shift * this.ppm, f = st.frame.walkway;
    shiftT(this.bg, -sp);
    shiftT(this.tiles, -sp);
    shiftT(this.treads, params.walkway.beltSpeed * this.t * this.ppm - sp);
    let wx = this.walkerX() * this.ppm - sp; if (f !== "walker") wx = wrap(wx, -120, this.W + 240);
    let mx = this.markX() * this.ppm - sp; if (f !== "belt") mx = wrap(mx, -60, this.W + 120);
    place(this.walkerG, wx, this.beltY, params.walkway.walkDir < 0);
    place(this.markG, mx, this.beltY);
    this.arrows.replaceChildren();
    const r = P.readout("walkway", params.walkway, f);
    vectorStack(this.arrows, wx, 190, r.objMedium, r.mediumViewer, 150);
    arrow(this.arrows, "rv-a-med", mx, mx + r.mediumViewer * 150, 830, 10);
  },
  readParams: () => params.walkway,
  actionLabel: () => "Start over",
  action() { this.reset(); setPlaying(true); },
  drag(id, xm) {
    const x = xm / this.ppm;
    if (id === "walker") { this.w0 = x - this.vw() * this.t; return "walker"; }
    if (id === "mark") { this.m0 = x - params.walkway.beltSpeed * this.t; return "belt"; }
    return null;
  },
  slowNote: () => "Real time",
};

const kart = {
  // Asphalt y 591 to 755 between the curbs: rival lane wheels on y 655, player (boost) lane wheels on y 725.
  // The player's arrows sit below the lower curb (y 777), clear of the boost chevrons.
  W: 1600, H: 900, ppm: 1600 / C.kart.viewWidth, laneY: 725, rivalY: 655, arrowY: 812,
  t: 0, k0: 10, r0: 18,
  // Start: player kart at 10 m, rival at 18 m. With the viewer in the middle of the 40 m view (20 m),
  // the other kart sits 8 m (320 px) to one side, fully inside the view in every frame.
  reset() { this.t = 0; this.k0 = 10; this.r0 = 18; },
  vk() { return P.add(P.toMs(params.kart.kartSpeedMph), params.kart.boostOn ? P.toMs(params.kart.boostSpeedMph) : 0); },
  vr() { return P.toMs(params.kart.rivalSpeedMph); },
  kartX() { return this.k0 + this.vk() * this.t; },
  rivalX() { return this.r0 + this.vr() * this.t; },
  laneOffset() { return params.kart.boostOn ? P.toMs(params.kart.boostSpeedMph) * this.t : 0; },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = backdrop(defs, svg, "bgKart", "bg-kart");
    const pad = shown("boost-pad");
    this.pad = tilePattern(defs, "padPat", "boost-pad", this.laneY - 22, 1, 120);
    this.padRect = el("rect", { x: 0, y: this.laneY - 22, width: this.W, height: pad.h, fill: "url(#padPat)" }, svg);
    this.rivalG = sprite(svg, "kart-rival", "rv-drag", 0.9);
    this.rivalG.dataset.drag = "rival";
    el("text", { class: "rv-svg-small", x: 0, y: -150, "text-anchor": "middle" }, this.rivalG).textContent = "rival";
    this.kartG = sprite(svg, "kart", "rv-drag");
    this.kartG.dataset.drag = "kart";
    this.arrows = el("g", {}, svg);
    this.laneText = el("text", { class: "rv-svg-small rv-svg-chip", x: 30, y: 70 }, svg);
  },
  step(dt) { this.t += dt; },
  viewerX(f) { return f === "kart" ? this.kartX() : f === "rival" ? this.rivalX() : 0; },
  render(shift) {
    const sp = shift * this.ppm, f = st.frame.kart;
    shiftT(this.bg, -sp);
    shiftT(this.pad, this.laneOffset() * this.ppm - sp);
    this.padRect.setAttribute("opacity", params.kart.boostOn ? 1 : 0.35);
    let kx = this.kartX() * this.ppm - sp; if (f !== "kart") kx = wrap(kx, -200, this.W + 400);
    let rx = this.rivalX() * this.ppm - sp; if (f !== "rival") rx = wrap(rx, -200, this.W + 400);
    place(this.kartG, kx, this.laneY);
    place(this.rivalG, rx, this.rivalY);
    this.laneText.textContent = params.kart.boostOn ? "Boost lane on" : "Boost lane off";
    this.arrows.replaceChildren();
    const r = P.readout("kart", this.readParams(), f);
    const scale = 8;
    vectorStack(this.arrows, kx, this.arrowY, r.objMedium, r.mediumViewer, scale);
    arrow(this.arrows, "rv-a-sum", rx, rx + r.viewers.rival * scale, this.rivalY - 190, 12);
  },
  readParams: () => params.kart,
  actionLabel: () => "Start over",
  // Start over puts both karts back where Reset does, with the viewer back in the middle of the view.
  action() { this.reset(); setFrame(st.frame.kart, { instant: true, anchor: startAnchor("kart", st.frame.kart) }); setPlaying(true); },
  drag(id, xm) {
    const x = xm / this.ppm;
    if (id === "kart") { this.k0 = x - this.vk() * this.t; return "kart"; }
    if (id === "rival") { this.r0 = x - this.vr() * this.t; return "rival"; }
    return null;
  },
  slowNote: () => `Slow motion x${C.kart.timeScale}`,
};

const SCENES = { river, truck, walkway, kart };
const TIME_SCALE = { river: C.river.timeScale, truck: C.truck.timeScale, walkway: C.walkway.timeScale, kart: C.kart.timeScale };
const cur = () => SCENES[st.scene];

// ---------- frame switch ----------
function viewerShift() { return cur().viewerX(st.frame[st.scene]) - st.anchor; }
function setFrame(f, opts = {}) {
  const s = cur();
  const before = st.shift;
  st.frame[st.scene] = f;
  if (f === GROUND_FRAME[st.scene]) st.anchor = 0;
  else {
    const now = s.viewerX(f) - before; // where the new viewer sits on screen right now (m)
    const viewW = s.W / s.ppm;
    const [lo, hi] = (s.anchorRange && s.anchorRange[f]) || [0.25, 0.75];
    st.anchor = opts.anchor != null ? opts.anchor : Math.max(viewW * lo, Math.min(viewW * hi, now));
  }
  st.glide = reduced() || opts.instant ? 0 : before - viewerShift();
  // A looping object can sit far off its drawn spot; past half a screen, cut instead of gliding.
  if (Math.abs(st.glide) > (s.W / s.ppm) * 0.5) st.glide = 0;
  $("frameBar").querySelectorAll("button[data-frame]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.frame === f)));
  syncQuery();
  renderReadout();
}
function buildFrameBar() {
  const bar = $("frameBar");
  bar.replaceChildren();
  const lbl = document.createElement("span");
  lbl.className = "rv-fb-label"; lbl.textContent = "Watch from:";
  bar.appendChild(lbl);
  for (const f of P.FRAMES[st.scene]) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.frame = f; b.textContent = FRAME_LABEL[f];
    b.setAttribute("aria-pressed", String(st.frame[st.scene] === f));
    b.addEventListener("click", () => setFrame(f));
    bar.appendChild(b);
  }
}

// ---------- readout ----------
function val(v, unit) {
  if (unit === "mph") return `${P.fmt(P.toMph(v), 1)} mph (${P.fmt(v, 2)} m/s)`;
  return `${P.fmt(v, 2)} m/s`;
}
function renderReadout() {
  const s = cur(), f = st.frame[st.scene];
  const g = GROUND_FRAME[st.scene];
  const r = P.readout(st.scene, s.readParams(), f);
  const n = r.names;
  const sub = (a, b) => `v<sub>${a}/${b}</sub>`;
  let h = `<h2>Vector addition</h2>`;
  h += `<p class="rv-eq">${sub(n.obj, n.ground)} = <span class="o">${sub(n.obj, n.medium)}</span> + <span class="m">${sub(n.medium, n.ground)}</span></p>`;
  h += `<p class="rv-eq" data-eq="ground"><span class="s">${val(r.objGround, r.unit)}</span> = <span class="o">${val(r.objMedium, r.unit)}</span> + <span class="m">${val(r.mediumGround, r.unit)}</span></p>`;
  if (f !== g) {
    const fl = FRAME_LABEL[f].toLowerCase();
    h += `<p class="rv-eq">Seen by the ${fl}: ${sub(n.obj, fl)} = <span class="o">${sub(n.obj, n.medium)}</span> + <span class="m">${sub(n.medium, fl)}</span></p>`;
    h += `<p class="rv-eq" data-eq="frame"><span class="s">${val(r.objViewer, r.unit)}</span> = <span class="o">${val(r.objMedium, r.unit)}</span> + <span class="m">${val(r.mediumViewer, r.unit)}</span></p>`;
  }
  const seen = P.FRAMES[st.scene].map((k) => `<li>${FRAME_LABEL[k]}: <b data-seen="${k}">${val(r.viewers[k], r.unit)}</b></li>`).join("");
  h += `<ul class="rv-seen" aria-label="Velocities seen by the ${FRAME_LABEL[f].toLowerCase()}"><li>Seen by the ${FRAME_LABEL[f].toLowerCase()}:</li>${seen}</ul>`;
  $("readout").innerHTML = h;
}

// Where a moving viewer sits on screen at the start (m from the left edge): the middle of the view
// (truck a bit right). The start positions in each scene keep every object inside the view from there.
function startAnchor(name, f) {
  const s = SCENES[name];
  if (f === GROUND_FRAME[name]) return 0;
  return (s.W / s.ppm) * (name === "truck" ? 0.7 : 0.5) - (name === "river" ? river.x0 / river.ppm : 0);
}

// ---------- scene switch ----------
function setScene(name, frame) {
  st.scene = name;
  document.querySelectorAll(".rv-tab").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === name)));
  document.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name || (p.id === "results" && !lab.complete); });
  $("stopwatch").hidden = name !== "river";
  $("stage").dataset.view = name;
  const s = cur();
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${s.W} ${s.H}`);
  if (name === "river" && !river.beads.length) river.reset();
  s.build();
  buildFrameBar();
  st.shift = 0;
  const f = frame && P.FRAMES[name].includes(frame) ? frame : st.frame[name];
  st.anchor = 0;
  setFrame(f, { instant: true, anchor: startAnchor(name, f) });
  $("slowNote").textContent = s.slowNote();
  syncAction();
  syncQuery();
  requestAnimationFrame(() => stageFollow(true));
}
// The River status chip stays at the left edge of what is visible while the stage scrolls sideways.
function pinRiverLabel() {
  if (st.scene !== "river" || !river.label) return;
  const sc = $("stageScroll"), k = svg.getBoundingClientRect().width / river.W;
  river.label.setAttribute("x", (30 + (k ? sc.scrollLeft / k : 0)).toFixed(1));
}
$("stageScroll").addEventListener("scroll", pinRiverLabel, { passive: true });
addEventListener("resize", pinRiverLabel);
// When the River stage is wider than the phone, keep the boat in view: center it on a scene switch,
// Reset or heading change, and follow it while it runs. Otherwise the scroller is the user's.
function stageFollow(force) {
  const sc = $("stageScroll");
  pinRiverLabel();
  if (st.scene !== "river" || sc.scrollWidth <= sc.clientWidth + 1) return;
  const k = svg.getBoundingClientRect().width / river.W;
  const x = (river.sx(river.boatMid()) - st.shift * river.ppm) * k;
  const target = Math.max(0, Math.min(sc.scrollWidth - sc.clientWidth, x - sc.clientWidth / 2));
  if (force || reduced()) { sc.scrollLeft = target; return; }
  const rel = x - sc.scrollLeft;
  if (rel < sc.clientWidth * 0.2 || rel > sc.clientWidth * 0.8 || Math.abs(target - sc.scrollLeft) > 1) sc.scrollLeft += (target - sc.scrollLeft) * 0.2;
}
function syncAction() { const t = cur().actionLabel(), b = $("actionBtn"); if (b.textContent !== t) b.textContent = t; }
function syncQuery() {
  const q = new URLSearchParams(location.search);
  q.set("scene", st.scene); q.set("frame", st.frame[st.scene]);
  history.replaceState(null, "", "?" + q.toString());
}
function setPlaying(on) {
  st.playing = on;
  $("playBtn").textContent = on ? "Pause" : "Play";
  $("playBtn").setAttribute("aria-pressed", String(on));
}

// ---------- drag (pointer events cover mouse, pen and touch) ----------
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
let drag = null;
svg.addEventListener("pointerdown", (e) => {
  const g = e.target.closest("[data-drag]");
  if (!g) return;
  e.preventDefault();
  drag = { id: g.dataset.drag, g, pid: e.pointerId };
  g.classList.add("dragging");
  svg.setPointerCapture(e.pointerId);
});
// Touch on a draggable must not scroll the page (SVG children do not honor touch-action everywhere).
svg.addEventListener("touchstart", (e) => { if (e.target.closest("[data-drag]")) e.preventDefault(); }, { passive: false });
svg.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  const p = svgPoint(e);
  const s = cur();
  const shiftPx = st.shift * s.ppm;
  const viewer = s.drag(drag.id, p.x + shiftPx, p.y);
  // Dragging the viewer itself moves where it sits on screen instead.
  if (viewer && viewer === st.frame[st.scene]) {
    st.anchor = (p.x - (st.scene === "river" ? river.x0 : 0)) / s.ppm;
    st.glide = 0;
  }
});
const endDrag = (e) => {
  if (!drag || (e && e.pointerId !== drag.pid)) return;
  drag.g.classList.remove("dragging");
  drag = null;
  renderReadout();
};
svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);

// ---------- river lab ----------
function condition() {
  if (river.flow === 0) return "still";
  if (Math.abs(river.flow - C.river.flowRate) < 1e-9) return lab.heading > 0 ? "down" : "up";
  return null;
}
const COND_LABEL = { still: "Still water", down: "Downstream", up: "Upstream" };
function setFlowFromAngle(a) {
  const valve = $("valve");
  if (valve.getAttribute("aria-disabled") === "true") return;
  a = Math.max(0, Math.min(270, a));
  if (!lab.complete) a = a < knownAngle() / 3 ? 0 : knownAngle();
  lab.valveAngle = a;
  const step = C.river.flowRateStep;
  river.flow = lab.complete ? Math.round(((a / 270) * C.river.flowRateMax) / step) * step : a > 0 ? C.river.flowRate : 0;
  river.flow = +river.flow.toFixed(4);
  syncValve();
  renderReadout();
}
function syncValve() {
  const valve = $("valve");
  const locked = lab.maxStep < 3;
  valve.setAttribute("aria-disabled", String(locked));
  valve.setAttribute("aria-valuenow", String(Math.round(lab.valveAngle)));
  valve.setAttribute("aria-valuetext", river.flow > 0 ? `On, ${river.flow.toFixed(2)} m/s` : "Off");
  $("valveImg").style.transform = `rotate(${lab.valveAngle}deg)`;
  valve.dataset.state = river.flow > 0 ? "on" : "off";
  $("valveTag").textContent = river.flow > 0 ? "On" : "Off";
  $("valveLabel").textContent = locked ? "Valve: off (Step 3 turns the water on)" : river.flow > 0 ? `Valve: on, water ${river.flow.toFixed(2)} m/s` : "Valve: off";
  $("swCond").textContent = condition() ? "Records: " + COND_LABEL[condition()] : "Not recorded at this flow";
}
function wireValve() {
  const v = $("valve");
  let start = null;
  const angleOf = (e) => {
    const r = v.getBoundingClientRect();
    let a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
    a = (a + 360) % 360;
    return a > 315 ? 0 : Math.min(a, 270);
  };
  v.addEventListener("pointerdown", (e) => { e.preventDefault(); start = { x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId }; v.setPointerCapture(e.pointerId); });
  v.addEventListener("pointermove", (e) => {
    if (!start || e.pointerId !== start.pid) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
    if (start.moved) setFlowFromAngle(angleOf(e));
  });
  const up = () => { if (start && !start.moved) setFlowFromAngle(lab.valveAngle > 0 ? 0 : knownAngle()); start = null; };
  v.addEventListener("pointerup", up);
  v.addEventListener("pointercancel", () => { start = null; });
  v.addEventListener("keydown", (e) => {
    const d = lab.complete ? 10 : knownAngle();
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { setFlowFromAngle(lab.valveAngle + d); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { setFlowFromAngle(lab.valveAngle - d); e.preventDefault(); }
    else if (e.key === "Enter" || e.key === " ") { setFlowFromAngle(lab.valveAngle > 0 ? 0 : knownAngle()); e.preventDefault(); }
  });
}
function predsValid() { return Number.isFinite(lab.pred.down) && Number.isFinite(lab.pred.up) && lab.pred.down >= 0 && lab.pred.up >= 0; }
function canAdvance(step) {
  if (step === 2) return lab.trials.still.length >= 1;
  if (step === 3) return predsValid();
  if (step === 4) return lab.trials.down.length >= 1 && lab.trials.up.length >= 1;
  return true;
}
function goStep(n) {
  if (n > lab.maxStep && !canAdvance(n)) return;
  lab.step = n; lab.maxStep = Math.max(lab.maxStep, n);
  if (n === 4) lab.complete = true;
  syncSteps();
}
function syncSteps() {
  document.querySelectorAll("#steps li").forEach((li) => {
    const n = +li.dataset.step;
    li.classList.toggle("current", n === lab.step);
    li.classList.toggle("done", n < lab.maxStep || (n === 4 && lab.complete));
    li.classList.toggle("locked", n > lab.maxStep);
  });
  document.querySelectorAll("#steps .rv-next").forEach((b) => { b.disabled = !canAdvance(+b.dataset.next); });
  $("predNote").hidden = predsValid();
  $("predDown").disabled = $("predUp").disabled = lab.maxStep >= 3;
  $("lenSlider").disabled = Object.values(lab.trials).some((t) => t.length);
  $("results").hidden = !(lab.complete && st.scene === "river");
  syncValve();
  renderTable();
  renderResults();
}
const sec = (t) => (Number.isFinite(t) ? t.toFixed(2) : "");
const spd = (v) => (Number.isFinite(v) ? v.toFixed(2) : "");
function renderTable() {
  // Leo's clipboard grid: a header row, three trial rows, the average and the speed.
  const T = lab.trials;
  const n = Math.max(T.still.length, T.down.length, T.up.length);
  const first = Math.max(1, n - 2); // show the latest three trials; the averages use them all
  let h = `<p class="rv-cap">L = ${lab.length.toFixed(1)} m</p><table aria-label="Trial times"><colgroup><col class="c0"><col class="c1"><col class="c2"><col class="c3"></colgroup>`;
  h += `<thead><tr class="h"><th>Trial</th><th>Still (s)</th><th>Down (s)</th><th>Up (s)</th></tr></thead><tbody>`;
  for (let i = first; i < first + 3; i++) h += `<tr class="r${i - first + 1}"><td>${i}</td><td>${sec(T.still[i - 1])}</td><td>${sec(T.down[i - 1])}</td><td>${sec(T.up[i - 1])}</td></tr>`;
  const avg = { still: P.average(T.still), down: P.average(T.down), up: P.average(T.up) };
  h += `<tr class="avg"><td>Avg</td><td data-avg="still">${sec(avg.still)}</td><td data-avg="down">${sec(avg.down)}</td><td data-avg="up">${sec(avg.up)}</td></tr>`;
  h += `<tr class="spd"><td>m/s</td><td data-spd="still">${spd(P.measuredSpeed(lab.length, avg.still))}</td><td data-spd="down">${spd(P.measuredSpeed(lab.length, avg.down))}</td><td data-spd="up">${spd(P.measuredSpeed(lab.length, avg.up))}</td></tr>`;
  $("dataTable").innerHTML = h + "</tbody></table>";
}
function renderResults() {
  if (!lab.complete) { $("results").innerHTML = ""; return; }
  const T = lab.trials, vb = C.river.boatSpeed, u = C.river.flowRate, L = lab.length;
  const meas = (k) => P.measuredSpeed(L, P.average(T[k]));
  const exact = { still: vb, down: Math.abs(P.boatGround(1, vb, u)), up: Math.abs(P.boatGround(-1, vb, u)) };
  const pct = (p, m) => { const d = P.percentDiff(p, m); return Number.isFinite(d) ? `${P.fmt(d, 0)}%` : ""; };
  let h = `<p class="rv-panel-h">${STRINGS.lab.summaryTitle}</p><table aria-label="Predicted and measured"><thead><tr><th>Run</th><th>Predicted</th><th>Measured</th><th>Exact</th><th>Off by</th></tr></thead><tbody>`;
  h += `<tr data-row="still"><td>Still water</td><td></td><td>${spd(meas("still"))}</td><td>${exact.still.toFixed(2)}</td><td></td></tr>`;
  h += `<tr data-row="down"><td>Downstream</td><td>${spd(lab.pred.down)}</td><td>${spd(meas("down"))}</td><td>${exact.down.toFixed(2)}</td><td>${pct(lab.pred.down, meas("down"))}</td></tr>`;
  h += `<tr data-row="up"><td>Upstream</td><td>${spd(lab.pred.up)}</td><td>${spd(meas("up"))}</td><td>${exact.up.toFixed(2)}</td><td>${pct(lab.pred.up, meas("up"))}</td></tr>`;
  h += `</tbody></table><p class="rv-note">Speeds in m/s, relative to the shore. Off by = (predicted minus measured) / measured. The valve now turns to any flow for free runs.</p>`;
  $("results").innerHTML = h;
}
function wireLab() {
  const ls = $("lenSlider");
  Object.assign(ls, { min: C.river.lengthMin, max: C.river.lengthMax, step: C.river.lengthStep, value: lab.length });
  const syncLen = () => { $("lenOut").textContent = lab.length.toFixed(1) + " m"; };
  ls.addEventListener("input", () => {
    lab.length = +ls.value; syncLen(); river.reset(); river.layoutChannel(); applyStrings(); renderTable(); renderReadout();
  });
  syncLen();
  document.querySelectorAll("[data-heading]").forEach((b) => b.addEventListener("click", () => {
    if (river.boat.running) return;
    lab.heading = +b.dataset.heading;
    document.querySelectorAll("[data-heading]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    river.resetBoat(); river.layoutChannel();
    syncValve(); renderReadout();
    requestAnimationFrame(() => stageFollow(true));
  }));
  document.querySelectorAll("#steps .rv-next").forEach((b) => b.addEventListener("click", () => goStep(+b.dataset.next)));
  document.querySelectorAll("#steps .rv-step-h").forEach((h) => {
    const n = +h.closest("li").dataset.step;
    h.addEventListener("click", () => { if (n <= lab.maxStep) { lab.step = n; syncSteps(); } });
  });
  const readPred = () => {
    lab.pred.down = $("predDown").value === "" ? NaN : +$("predDown").value;
    lab.pred.up = $("predUp").value === "" ? NaN : +$("predUp").value;
    syncSteps();
  };
  $("predDown").addEventListener("input", readPred);
  $("predUp").addEventListener("input", readPred);
  $("undoTrial").addEventListener("click", () => {
    const k = condition() && lab.trials[condition()].length ? condition() : ["up", "down", "still"].find((c) => lab.trials[c].length);
    if (k) lab.trials[k].pop();
    syncSteps();
  });
  $("clearLab").addEventListener("click", () => {
    lab.trials = { still: [], down: [], up: [] }; lab.pred = { down: NaN, up: NaN };
    $("predDown").value = ""; $("predUp").value = "";
    lab.step = 1; lab.maxStep = 1; lab.complete = false; lab.valveAngle = 0; river.flow = 0;
    river.reset();
    syncSteps(); renderReadout();
  });
  $("knownBox").textContent = `Boat label: ${C.river.boatSpeed.toFixed(2)} m/s in still water. Known flow when the valve is on: ${C.river.flowRate.toFixed(2)} m/s.`;
  wireValve();
}

// ---------- stopwatch ----------
// The stopwatch runs by hand, or by the gates: Run boat hands it to the scene clock, which starts it when
// the bow crosses the start gate and stops it (recording the trial) when the bow crosses the finish gate.
const sw = { running: false, auto: false, start: 0, elapsed: 0, condition: null, invalid: false };
function swNow() {
  if (sw.auto) { const b = river.boat; return b.t0 == null ? 0 : Math.max(0, b.clock - b.t0); }
  return sw.running ? (performance.now() - sw.start) / 1000 : sw.elapsed;
}
// Docked beside the valve on wide screens, in the controls row under the stage on phones (max 860 px).
const phoneMQ = matchMedia("(max-width: 860px)");
function swDock() { return $(phoneMQ.matches ? "swDockPhone" : "swDock"); }
function dockStopwatch() {
  const box = $("stopwatch");
  box.classList.remove("floating"); box.style.left = box.style.top = "";
  $("swDock").style.minHeight = $("swDockPhone").style.minHeight = "";
  if (box.parentElement !== swDock()) swDock().appendChild(box);
}
phoneMQ.addEventListener("change", () => { if (!$("stopwatch").classList.contains("floating")) dockStopwatch(); });
function swButtons() { $("swStart").textContent = sw.running ? "Stop" : "Start"; $("swStart").disabled = sw.auto; $("swReset").disabled = sw.auto; }
function gateStart() {
  Object.assign(sw, { running: true, auto: true, elapsed: 0, condition: condition(), invalid: false });
  swButtons();
}
function gateStop(T) {
  if (!sw.auto) return;
  Object.assign(sw, { running: false, auto: false, elapsed: T });
  swButtons();
  recordTrial(T);
}
function gateAbort() { if (!sw.auto) return; sw.elapsed = swNow(); sw.running = false; sw.auto = false; swButtons(); }
function recordTrial(T) {
  const k = condition();
  if (k && k === sw.condition && !sw.invalid && T > 0.1) { lab.trials[k].push(+T.toFixed(2)); syncSteps(); }
}
function wireStopwatch() {
  const box = $("stopwatch");
  $("swImg").src = artUrl("stopwatch", theme());
  $("swStart").addEventListener("click", () => {
    if (sw.auto) return;
    if (!sw.running) {
      Object.assign(sw, { running: true, start: performance.now(), elapsed: 0, condition: condition(), invalid: false });
      swButtons(); return;
    }
    sw.elapsed = swNow(); sw.running = false; swButtons();
    recordTrial(sw.elapsed);
  });
  $("swReset").addEventListener("click", () => { if (sw.auto) return; sw.running = false; sw.elapsed = 0; swButtons(); });
  let d = null;
  box.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    const r = box.getBoundingClientRect();
    if (!box.classList.contains("floating")) {
      // Leave its docked space behind so nothing in the panel jumps, then float it where it is.
      box.parentElement.style.minHeight = r.height + "px";
      box.classList.add("floating");
      Object.assign(box.style, { left: r.left + "px", top: r.top + "px" });
    }
    d = { dx: e.clientX - r.left, dy: e.clientY - r.top, pid: e.pointerId };
    box.classList.add("dragging");
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener("pointermove", (e) => {
    if (!d || e.pointerId !== d.pid) return;
    const w = box.offsetWidth, h = box.offsetHeight;
    const x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - d.dx));
    const y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - d.dy));
    Object.assign(box.style, { left: x + "px", top: y + "px" });
  });
  const end = () => { d = null; box.classList.remove("dragging"); };
  window.addEventListener("resize", () => {
    if (!box.classList.contains("floating")) return;
    const x = Math.max(0, Math.min(window.innerWidth - box.offsetWidth, box.offsetLeft));
    const y = Math.max(0, Math.min(window.innerHeight - box.offsetHeight, box.offsetTop));
    Object.assign(box.style, { left: x + "px", top: y + "px" });
  });
  box.addEventListener("pointerup", end);
  box.addEventListener("pointercancel", end);
}

// ---------- sandbox controls ----------
function wireSandboxes() {
  const ranges = {
    truckSpeedMph: [C.truck.speedMinMph, C.truck.speedMaxMph, C.truck.speedStepMph, "truck", "mph"],
    throwSpeedMph: [C.truck.speedMinMph, C.truck.speedMaxMph, C.truck.speedStepMph, "truck", "mph"],
    beltSpeed: [C.walkway.speedMin, C.walkway.speedMax, C.walkway.speedStep, "walkway", "ms"],
    walkSpeed: [C.walkway.speedMin, C.walkway.speedMax, C.walkway.speedStep, "walkway", "ms"],
    kartSpeedMph: [C.kart.speedMinMph, C.kart.speedMaxMph, C.kart.speedStepMph, "kart", "mph"],
    boostSpeedMph: [C.kart.speedMinMph, C.kart.speedMaxMph, C.kart.speedStepMph, "kart", "mph"],
    rivalSpeedMph: [C.kart.speedMinMph, C.kart.speedMaxMph, C.kart.speedStepMph, "kart", "mph"],
  };
  for (const [key, [min, max, step, scene, unit]] of Object.entries(ranges)) {
    const inp = document.querySelector(`input[data-p="${key}"]`);
    const out = document.querySelector(`output[data-o="${key}"]`);
    Object.assign(inp, { min, max, step, value: params[scene][key] });
    const sync = () => { out.textContent = unit === "mph" ? `${params[scene][key]} mph` : `${params[scene][key].toFixed(2)} m/s`; };
    inp.addEventListener("input", () => {
      params[scene][key] = +inp.value; sync();
      if (scene === "truck") truck.reset();
      renderReadout();
    });
    sync();
  }
  const group = (attr, set) => {
    const btns = document.querySelectorAll(`[${attr}]`);
    const sync = (v) => btns.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(v))));
    btns.forEach((b) => b.addEventListener("click", () => { const v = +b.getAttribute(attr); set(v); sync(v); renderReadout(); }));
    return sync;
  };
  group("data-dir", (v) => { params.truck.throwDir = v; truck.reset(); })(params.truck.throwDir);
  group("data-walk", (v) => { params.walkway.walkDir = v; })(params.walkway.walkDir);
  group("data-boost", (v) => { params.kart.boostOn = v === 1; })(params.kart.boostOn ? 1 : 0);
}

// ---------- theme ----------
function syncTheme() {
  const dark = theme() === "dark";
  $("themeLabel").textContent = dark ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-pressed", String(dark));
  $("themeBtn").setAttribute("aria-label", dark ? "Light mode" : "Dark mode");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#1F1D1A" : "#FCF7EB");
  document.querySelectorAll("[data-art]").forEach((img) => img.setAttribute("href", artUrl(img.dataset.art, theme())));
  $("swImg").src = artUrl("stopwatch", theme());
  $("valveImg").src = artUrl("valve-knob", theme());
  $("clipImg").src = artUrl("clipboard", theme());
}
$("themeBtn").addEventListener("click", () => {
  const next = theme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  syncTheme();
});

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const s = cur();
  if (st.playing) s.step(dt * TIME_SCALE[st.scene]);
  if (st.glide) { st.glide *= Math.exp(-dt / 0.12); if (Math.abs(st.glide) < 1e-3) st.glide = 0; }
  st.shift = viewerShift() + st.glide;
  s.render(st.shift);
  if (st.scene === "river") {
    if (sw.auto && !river.boat.running) gateAbort();
    if (sw.running && condition() !== sw.condition) sw.invalid = true;
    const t = swNow().toFixed(2) + " s";
    if ($("swTime").textContent !== t) $("swTime").textContent = t;
  }
  if (st.scene === "river" && river.boat.running) stageFollow(false);
  syncAction();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
$("studyBackBtn").addEventListener("click", () => {
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
document.querySelectorAll(".rv-tab").forEach((b) => b.addEventListener("click", () => setScene(b.dataset.scene)));
$("playBtn").addEventListener("click", () => setPlaying(!st.playing));
$("actionBtn").addEventListener("click", () => { cur().action(); syncAction(); });
$("resetBtn").addEventListener("click", () => {
  const s = cur();
  s.reset();
  if (s === river) river.layoutChannel();
  setFrame(st.frame[st.scene], { instant: true, anchor: s === kart ? startAnchor("kart", st.frame.kart) : undefined });
  requestAnimationFrame(() => stageFollow(true));
});

applyStrings();
wireLab();
wireStopwatch();
dockStopwatch();
wireSandboxes();
syncTheme();
const q = new URLSearchParams(location.search);
const startScene = SCENES[q.get("scene")] ? q.get("scene") : "river";
river.reset();
setPlaying(!reduced());
setScene(startScene, q.get("frame"));
syncSteps();
// test hook: read-only snapshot for the browser test
window.__rv = { st, lab, params, river, truck, walkway, kart, P, sw, dockStopwatch };
requestAnimationFrame(frame);
