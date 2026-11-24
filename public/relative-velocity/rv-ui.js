// Relative Velocity Exploration: page wiring. Scenes draw into one SVG; the chosen viewer stays at rest.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import * as P from "./rv-physics.js";
import { STRINGS } from "./rv-strings.js";
import { artUrl, ART } from "./rv-art.js";

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
function sprite(parent, name, w, h, cls) {
  const g = el("g", cls ? { class: cls } : {}, parent);
  const inner = el("g", {}, g);
  const a = ART[name].anchor || [0.5, 0.5];
  const img = el("image", { href: artUrl(name, theme()), width: w, height: h, x: -a[0] * w, y: -a[1] * h, preserveAspectRatio: "xMidYMid meet" }, inner);
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
  if (Math.abs(len) < 3) { el("circle", { cx: x0, cy: y, r: w * 0.9, stroke: "none" }, g); return g; }
  const dir = Math.sign(len), head = Math.min(Math.abs(len), w * 3.2);
  el("line", { x1: x0, y1: y, x2: x1 - dir * head * 0.8, y2: y, "stroke-width": w, "stroke-linecap": "round" }, g);
  el("path", { d: `M${x1} ${y} L${x1 - dir * head} ${y - head * 0.62} L${x1 - dir * head} ${y + head * 0.62} Z`, stroke: "none" }, g);
  return g;
}
// Tail-to-tip: object arrow, then medium arrow from its tip, then the bold sum underneath.
function vectorStack(parent, x, y, vObjMedium, vMediumViewer, scale) {
  const a = vObjMedium * scale, b = vMediumViewer * scale;
  arrow(parent, "rv-a-obj", x, x + a, y, 7);
  arrow(parent, "rv-a-med", x + a, x + a + b, y, 7);
  arrow(parent, "rv-a-sum", x, x + a + b, y + 22, 10);
}
function wrap(v, lo, period) { return ((((v - lo) % period) + period) % period) + lo; }
function patternTile(defs, id, name, w, h, y = 0) {
  const p = el("pattern", { id, patternUnits: "userSpaceOnUse", width: w, height: h, y }, defs);
  const img = el("image", { href: artUrl(name, theme()), width: w, height: h, preserveAspectRatio: "none" }, p);
  img.dataset.art = name;
  return p;
}

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
// Each scene: W,H,ppm (px per m), build(), step(dt), viewerX(frame) in m, render(shiftM), readParams(), action.
const river = {
  // The view spans the channel (at least 2.5 m) so short channels fill the stage; art keeps its aspect ratio.
  W: 1000, x0: 60,
  get ppm() { return 880 / Math.max(lab.length, 2.5); },
  get k() { return this.ppm / 176; },
  get cy() { return 110 + this.chH / 2; },
  get H() { return Math.round(this.chH + 230); },
  t: 0, flow: 0, boat: { x: 0, y: 0, running: false }, beads: [],
  get chH() { return 240 * (5 * this.ppm) / 2000; },
  get flowOn() { return this.flow > 0; },
  reset() {
    this.boat = { x: lab.heading > 0 ? 0 : lab.length, y: 0, running: false };
    const n = C.river.beadCount;
    this.beads = Array.from({ length: n }, (_, i) => ({ x: ((i + 0.5) / n) * lab.length, y: [0.28, -0.3, 0.12, -0.12][i % 4] }));
  },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = patternTile(defs, "bgRiver", "bg-river", this.H * 2400 / 900, this.H);
    this.waterPat = el("pattern", { id: "waterPat", patternUnits: "userSpaceOnUse", width: 60, height: 40 }, defs);
    el("path", { d: "M6 12 q12 -6 24 0 M34 30 q12 -6 24 0", stroke: "#5A8FB0", "stroke-width": 2, fill: "none", opacity: 0.6 }, this.waterPat);
    this.clip = el("clipPath", { id: "chClip" }, defs);
    this.clipRect = el("rect", {}, this.clip);
    this.bgRect = el("rect", { width: this.W, height: this.H, fill: "url(#bgRiver)" }, svg);
    this.world = el("g", {}, svg);
    const ch = el("g", { "clip-path": "url(#chClip)" }, this.world);
    const chImg = el("image", { href: artUrl("channel", theme()), x: this.x0, y: this.cy - this.chH / 2, width: 5 * this.ppm, height: this.chH, preserveAspectRatio: "none" }, ch);
    chImg.dataset.art = "channel";
    this.water = el("rect", { x: this.x0, y: this.cy - this.chH / 3, width: 5 * this.ppm, height: (this.chH * 2) / 3, fill: "url(#waterPat)" }, ch);
    this.endCap = el("rect", { y: this.cy - this.chH / 2, width: 6, height: this.chH, fill: "#7FA9BF" }, this.world);
    this.nums = el("g", {}, this.world);
    this.beadG = this.beads.map((b, i) => {
      const g = sprite(this.world, "bead", 26 * this.k, 26 * this.k, "rv-drag");
      g.dataset.drag = "bead" + i;
      if (i === 0) {
        el("circle", { r: 19 * this.k, fill: "none", stroke: "var(--rv-medium)", "stroke-width": 3, "stroke-dasharray": "5 4" }, g);
        el("text", { class: "rv-svg-small", y: -24 * this.k - 6, "text-anchor": "middle" }, g).textContent = "leaf";
      }
      return g;
    });
    this.boatG = sprite(this.world, "boat", 100 * this.k, 50 * this.k, "rv-drag");
    this.boatG.dataset.drag = "boat";
    this.arrows = el("g", {}, svg);
    this.label = el("text", { class: "rv-svg-small", x: 16, y: this.H - 14 }, svg);
    this.layoutChannel();
  },
  layoutChannel() {
    this.clipRect.setAttribute("x", this.x0); this.clipRect.setAttribute("y", this.cy - this.chH / 2);
    this.clipRect.setAttribute("width", lab.length * this.ppm); this.clipRect.setAttribute("height", this.chH);
    this.endCap.setAttribute("x", this.x0 + lab.length * this.ppm - 3);
    this.nums.replaceChildren();
    for (let m = 0; m <= Math.floor(lab.length + 1e-9); m++) {
      el("text", { class: "rv-svg-text", x: this.x0 + m * this.ppm, y: this.cy + this.chH / 2 + 38, "text-anchor": "middle" }, this.nums).textContent = m + " m";
    }
  },
  sx(xm) { return this.x0 + xm * this.ppm; },
  laneY(f) { return this.cy + f * this.chH * 0.5; },
  vBoat() { return P.boatGround(lab.heading, C.river.boatSpeed, this.flow); },
  step(dt) {
    this.t += dt;
    for (const b of this.beads) { b.x += this.flow * dt; if (b.x > lab.length) b.x -= lab.length; }
    if (this.boat.running) {
      this.boat.x += this.vBoat() * dt;
      if (lab.heading > 0 && this.boat.x >= lab.length) { this.boat.x = lab.length; this.boat.running = false; }
      if (lab.heading < 0 && this.boat.x <= 0) { this.boat.x = 0; this.boat.running = false; }
    }
  },
  viewerX(f) { return f === "leaf" ? this.beads[0].x : f === "boat" ? this.boat.x : 0; },
  render(shift) {
    const sp = shift * this.ppm;
    this.world.setAttribute("transform", `translate(${(-sp).toFixed(2)},0)`);
    this.bg.setAttribute("patternTransform", `translate(${(-sp).toFixed(2)},0)`);
    this.waterPat.setAttribute("patternTransform", `translate(${(this.x0 + this.flow * this.t * this.ppm).toFixed(2)},0)`);
    this.beads.forEach((b, i) => place(this.beadG[i], this.sx(b.x), this.laneY(b.y)));
    place(this.boatG, this.sx(this.boat.x), this.laneY(this.boat.y), lab.heading < 0);
    this.arrows.replaceChildren();
    const r = P.readout("river", this.readParams(), st.frame.river);
    const scale = 360;
    vectorStack(this.arrows, this.sx(this.boat.x) - sp, 46, r.objMedium, r.mediumViewer, scale);
    const lx = this.sx(this.beads[0].x) - sp;
    arrow(this.arrows, "rv-a-med", lx, lx + r.mediumViewer * scale, this.cy + this.chH / 2 + 70, 7);
    this.label.textContent = this.boat.running ? "Boat running" : this.flowOn ? `Water on: ${this.flow.toFixed(2)} m/s` : "Still water";
  },
  readParams() { return { heading: lab.heading, boatSpeed: C.river.boatSpeed, flow: this.flow }; },
  actionLabel() { return this.boat.running ? "Stop boat" : "Run boat"; },
  action() {
    if (this.boat.running) { this.boat.running = false; return; }
    this.boat.x = lab.heading > 0 ? 0 : lab.length;
    this.boat.running = true;
    setPlaying(true);
  },
  drag(id, xm, ym) {
    const f = Math.max(-0.75, Math.min(0.75, (ym - this.cy) / (this.chH * 0.5)));
    const x = Math.max(0, Math.min(lab.length, (xm - this.x0) / this.ppm));
    if (id === "boat") { if (this.boat.running) return null; this.boat.x = x; this.boat.y = f; return "boat"; }
    const b = this.beads[+id.slice(4)];
    b.x = x; b.y = f;
    return id === "bead0" ? "leaf" : null;
  },
  slowNote: () => "Real time",
};

const truck = {
  W: 1000, H: 400, ppm: 1000 / C.truck.viewWidth, groundY: 372,
  t: 0, marker: 11, released: false, trail: [], done: 0,
  anchorRange: { truck: [0.65, 0.8], ball: [0.3, 0.7] },
  vt() { return P.toMs(params.truck.truckSpeedMph); },
  vball() { return P.add(params.truck.throwDir * P.toMs(params.truck.throwSpeedMph), this.vt()); },
  lead: 1.0,
  reset() { this.t = 0; this.released = false; this.trail = []; this.done = 0; },
  truckX() { return this.marker - this.vt() * this.lead + this.vt() * this.t; },
  ball() {
    const h = C.truck.releaseHeight;
    if (!this.released) return { x: this.truckX() - 1.2, y: h, landed: false };
    const xr = this.marker - 1.2;
    return P.ballAfterRelease(this.t - this.lead, xr, this.vball(), h);
  },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = patternTile(defs, "bgTruck", "bg-truck", 1066.67, 400);
    el("rect", { width: this.W, height: this.H, fill: "url(#bgTruck)" }, svg);
    this.world = el("g", {}, svg);
    this.markerG = el("g", { class: "rv-drag" }, this.world);
    this.markerG.dataset.drag = "marker";
    el("path", { d: "M0 0 V-46 L26 -38 L0 -30", fill: "var(--rv-medium)", stroke: "var(--rv-ink)", "stroke-width": 2 }, this.markerG);
    el("rect", { x: -16, y: -50, width: 44, height: 56, fill: "transparent" }, this.markerG);
    this.trailG = el("g", {}, svg);
    this.truckG = sprite(svg, "truck", 250, 125, "rv-drag");
    this.truckG.dataset.drag = "truck";
    this.ballG = sprite(svg, "basketball", 30, 30);
    this.arrows = el("g", {}, svg);
    this.label = el("text", { class: "rv-svg-small", x: 16, y: 30 }, svg);
  },
  step(dt) {
    this.t += dt;
    if (!this.released && this.t >= this.lead) { this.released = true; }
    if (this.released) {
      const b = this.ball();
      const last = this.trail[this.trail.length - 1];
      if (!last || !last.landed) this.trail.push({ x: b.x, y: b.y, landed: b.landed, v: { ground: 0, truck: this.truckX(), ball: b.x } });
      if (b.landed) this.done += dt;
      if (this.done > 1.4) this.reset();
    }
  },
  viewerX(f) { return f === "truck" ? this.truckX() : f === "ball" ? this.ball().x : 0; },
  sy(ym) { return this.groundY - ym * this.ppm * 1.0; },
  render(shift) {
    const sp = shift * this.ppm;
    this.world.setAttribute("transform", `translate(${(-sp).toFixed(2)},0)`);
    this.bg.setAttribute("patternTransform", `translate(${(-sp).toFixed(2)},0)`);
    place(this.markerG, this.marker * this.ppm, this.groundY);
    const f = st.frame.truck;
    let tx = this.truckX() * this.ppm - sp;
    if (f !== "truck" && !this.released) tx = wrap(tx, -200, this.W + 400);
    place(this.truckG, tx, this.groundY);
    const b = this.ball();
    const bx = b.x * this.ppm - sp, by = this.sy(b.y) - 12;
    place(this.ballG, bx, by);
    this.trailG.replaceChildren();
    for (const p of this.trail) {
      const x = (p.x - (p.v[f] - st.anchor) - st.glide) * this.ppm;
      el("circle", { cx: x.toFixed(1), cy: (this.sy(p.y) - 12).toFixed(1), r: 3.2, fill: "var(--rv-obj)", opacity: 0.85 }, this.trailG);
    }
    this.arrows.replaceChildren();
    const r = P.readout("truck", this.readParams(), f);
    const scale = 12;
    const objMedium = this.released && !b.landed ? r.objMedium : 0;
    const objViewer = this.released && b.landed ? -r.viewerGround : objMedium + r.mediumViewer;
    if (this.released && b.landed) arrow(this.arrows, "rv-a-sum", bx, bx + objViewer * scale, by - 70, 10);
    else vectorStack(this.arrows, bx, by - 92, objMedium, r.mediumViewer, scale);
    arrow(this.arrows, "rv-a-med", tx, tx + r.mediumViewer * scale, this.groundY - 150, 7);
    this.label.textContent = !this.released ? "Truck coming up to the flag" : b.landed ? "Ball landed" : "Ball in the air";
  },
  readParams() { return { ...params.truck, released: true }; },
  actionLabel: () => "Throw again",
  action() { this.reset(); setPlaying(true); },
  drag(id, xm) {
    const x = xm / this.ppm;
    if (id === "marker") { this.marker = Math.max(2, Math.min(C.truck.viewWidth - 2, x)); this.reset(); return null; }
    if (id === "truck" && !this.released) { this.marker = x + this.vt() * (this.lead - this.t); return "truck"; }
    return null;
  },
  slowNote: () => `Slow motion x${C.truck.timeScale}`,
};

const walkway = {
  W: 1000, H: 380, ppm: 1000 / C.walkway.viewWidth, beltY: 318,
  t: 0, w0: 3, m0: 8,
  reset() { this.t = 0; this.w0 = 3; this.m0 = 8; },
  vw() { return P.add(params.walkway.walkDir * params.walkway.walkSpeed, params.walkway.beltSpeed); },
  walkerX() { return this.w0 + this.vw() * this.t; },
  markX() { return this.m0 + params.walkway.beltSpeed * this.t; },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = patternTile(defs, "bgWalk", "bg-walkway", 1013.33, 380);
    this.belt = patternTile(defs, "beltPat", "walkway", 375, 50, this.beltY - 10);
    el("rect", { width: this.W, height: this.H, fill: "url(#bgWalk)" }, svg);
    el("rect", { x: 0, y: this.beltY - 10, width: this.W, height: 50, fill: "url(#beltPat)" }, svg);
    el("rect", { x: 0, y: this.beltY - 18, width: this.W, height: 8, fill: "var(--rv-line)" }, svg);
    this.markG = el("g", { class: "rv-drag" }, svg);
    this.markG.dataset.drag = "mark";
    el("path", { d: "M-12 0 L0 -22 L12 0 Z", fill: "var(--rv-medium)", stroke: "var(--rv-ink)", "stroke-width": 2 }, this.markG);
    el("text", { class: "rv-svg-small", y: -28, "text-anchor": "middle" }, this.markG).textContent = "belt";
    el("rect", { x: -22, y: -30, width: 44, height: 34, fill: "transparent" }, this.markG);
    this.walkerG = sprite(svg, "walker", 64, 128, "rv-drag");
    this.walkerG.dataset.drag = "walker";
    this.arrows = el("g", {}, svg);
  },
  step(dt) { this.t += dt; },
  viewerX(f) { return f === "belt" ? this.markX() : f === "walker" ? this.walkerX() : 0; },
  render(shift) {
    const sp = shift * this.ppm, f = st.frame.walkway;
    this.bg.setAttribute("patternTransform", `translate(${(-sp).toFixed(2)},0)`);
    this.belt.setAttribute("patternTransform", `translate(${(params.walkway.beltSpeed * this.t * this.ppm - sp).toFixed(2)},0)`);
    let wx = this.walkerX() * this.ppm - sp; if (f !== "walker") wx = wrap(wx, -80, this.W + 160);
    let mx = this.markX() * this.ppm - sp; if (f !== "belt") mx = wrap(mx, -40, this.W + 80);
    place(this.walkerG, wx, this.beltY - 10, params.walkway.walkDir < 0);
    place(this.markG, mx, this.beltY - 10);
    this.arrows.replaceChildren();
    const r = P.readout("walkway", params.walkway, f);
    vectorStack(this.arrows, wx, this.beltY - 190, r.objMedium, r.mediumViewer, 110);
    arrow(this.arrows, "rv-a-med", mx, mx + r.mediumViewer * 110, this.beltY + 48, 6);
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
  W: 1000, H: 400, ppm: 1000 / C.kart.viewWidth, laneY: 368, rivalY: 262,
  t: 0, k0: 8, r0: 14,
  reset() { this.t = 0; this.k0 = 8; this.r0 = 14; },
  vk() { return P.add(P.toMs(params.kart.kartSpeedMph), params.kart.boostOn ? P.toMs(params.kart.boostSpeedMph) : 0); },
  vr() { return P.toMs(params.kart.rivalSpeedMph); },
  kartX() { return this.k0 + this.vk() * this.t; },
  rivalX() { return this.r0 + this.vr() * this.t; },
  laneOffset() { return params.kart.boostOn ? P.toMs(params.kart.boostSpeedMph) * this.t : 0; },
  build() {
    const defs = el("defs", {}, svg);
    this.bg = patternTile(defs, "bgKart", "bg-kart", 1066.67, 400);
    this.pad = patternTile(defs, "padPat", "boost-pad", 200, 40, this.laneY - 28);
    el("rect", { width: this.W, height: this.H, fill: "url(#bgKart)" }, svg);
    el("rect", { x: 0, y: this.laneY - 28, width: this.W, height: 40, fill: "url(#padPat)" }, svg);
    this.laneText = el("text", { class: "rv-svg-small", x: 16, y: this.laneY + 26 }, svg);
    this.rivalG = sprite(svg, "kart-rival", 120, 68, "rv-drag");
    this.rivalG.dataset.drag = "rival";
    el("text", { class: "rv-svg-small", x: 0, y: -74, "text-anchor": "middle" }, this.rivalG).textContent = "rival";
    this.kartG = sprite(svg, "kart", 120, 68, "rv-drag");
    this.kartG.dataset.drag = "kart";
    this.arrows = el("g", {}, svg);
  },
  step(dt) { this.t += dt; },
  viewerX(f) { return f === "kart" ? this.kartX() : f === "rival" ? this.rivalX() : 0; },
  render(shift) {
    const sp = shift * this.ppm, f = st.frame.kart;
    this.bg.setAttribute("patternTransform", `translate(${(-sp).toFixed(2)},0)`);
    this.pad.setAttribute("patternTransform", `translate(${(this.laneOffset() * this.ppm - sp).toFixed(2)},0)`);
    let kx = this.kartX() * this.ppm - sp; if (f !== "kart") kx = wrap(kx, -120, this.W + 240);
    let rx = this.rivalX() * this.ppm - sp; if (f !== "rival") rx = wrap(rx, -120, this.W + 240);
    place(this.kartG, kx, this.laneY);
    place(this.rivalG, rx, this.rivalY);
    this.laneText.textContent = params.kart.boostOn ? "Boost lane on" : "Boost lane off";
    this.arrows.replaceChildren();
    const r = P.readout("kart", this.readParams(), f);
    const scale = 6;
    vectorStack(this.arrows, kx, this.laneY - 112, r.objMedium, r.mediumViewer, scale);
    arrow(this.arrows, "rv-a-sum", rx, rx + r.viewers.rival * scale, this.rivalY - 100, 8);
  },
  readParams: () => params.kart,
  actionLabel: () => "Start over",
  action() { this.reset(); setPlaying(true); },
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

// ---------- scene switch ----------
function setScene(name, frame) {
  st.scene = name;
  document.querySelectorAll(".rv-tab").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === name)));
  document.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name || (p.id === "results" && !lab.complete); });
  $("stopwatch").hidden = name !== "river";
  const s = cur();
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${s.W} ${s.H}`);
  if (name === "river" && !river.beads.length) river.reset();
  s.build();
  buildFrameBar();
  st.shift = 0;
  const f = frame && P.FRAMES[name].includes(frame) ? frame : st.frame[name];
  st.anchor = 0;
  const mid = name === "truck" ? 0.7 : 0.5;
  setFrame(f, { instant: true, anchor: f === GROUND_FRAME[name] ? 0 : (s.W / s.ppm) * mid - (name === "river" ? river.x0 / river.ppm : 0) });
  $("slowNote").textContent = s.slowNote();
  syncAction();
  syncQuery();
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
  const T = lab.trials;
  const rows = Math.min(6, Math.max(C.river.trialsPerCondition, T.still.length, T.down.length, T.up.length));
  let h = `<p class="rv-cap">Channel length L = ${lab.length.toFixed(1)} m</p><table aria-label="Trial times"><thead><tr><th>Trial</th><th>Still (s)</th><th>Down (s)</th><th>Up (s)</th></tr></thead><tbody>`;
  for (let i = 0; i < rows; i++) h += `<tr><td>${i + 1}</td><td>${sec(T.still[i])}</td><td>${sec(T.down[i])}</td><td>${sec(T.up[i])}</td></tr>`;
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
    lab.length = +ls.value; syncLen(); river.reset(); applyStrings(); renderTable(); setScene("river");
  });
  syncLen();
  document.querySelectorAll("[data-heading]").forEach((b) => b.addEventListener("click", () => {
    if (river.boat.running) return;
    lab.heading = +b.dataset.heading;
    document.querySelectorAll("[data-heading]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    river.boat.x = lab.heading > 0 ? 0 : lab.length;
    syncValve(); renderReadout();
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
const sw = { running: false, start: 0, elapsed: 0 };
function swNow() { return sw.running ? (performance.now() - sw.start) / 1000 : sw.elapsed; }
function wireStopwatch() {
  const box = $("stopwatch");
  $("swImg").src = artUrl("stopwatch", theme());
  $("swStart").addEventListener("click", () => {
    if (!sw.running) { sw.running = true; sw.start = performance.now() - sw.elapsed * 1000; $("swStart").textContent = "Stop"; return; }
    sw.elapsed = swNow(); sw.running = false; $("swStart").textContent = "Start";
    const k = condition();
    if (k && sw.elapsed > 0.1) { lab.trials[k].push(+sw.elapsed.toFixed(2)); syncSteps(); }
  });
  $("swReset").addEventListener("click", () => { sw.running = false; sw.elapsed = 0; $("swStart").textContent = "Start"; });
  let d = null;
  box.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    const r = box.getBoundingClientRect();
    d = { dx: e.clientX - r.left, dy: e.clientY - r.top, pid: e.pointerId };
    box.classList.add("dragging");
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener("pointermove", (e) => {
    if (!d || e.pointerId !== d.pid) return;
    const w = box.offsetWidth, h = box.offsetHeight;
    const x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - d.dx));
    const y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - d.dy));
    Object.assign(box.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
  });
  const end = () => { d = null; box.classList.remove("dragging"); };
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
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#1F1D1A" : "#FBF6EA");
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
  if (st.scene === "river") $("swTime").textContent = swNow().toFixed(2) + " s";
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
  setFrame(st.frame[st.scene], { instant: true });
});

applyStrings();
wireLab();
wireStopwatch();
wireSandboxes();
syncTheme();
const q = new URLSearchParams(location.search);
const startScene = SCENES[q.get("scene")] ? q.get("scene") : "river";
river.reset();
setPlaying(!reduced());
setScene(startScene, q.get("frame"));
syncSteps();
// test hook: read-only snapshot for the browser test
window.__rv = { st, lab, params, river, truck, walkway, kart, P };
requestAnimationFrame(frame);
