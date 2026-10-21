/**
 * Relativity sandbox UI.
 *
 * Designer hook (read this, not the internals). Updated every frame, SI units:
 *   relativity.state = {
 *     mode, isPaused, simSpeed, secondsPerWallSecond, time,
 *     c, G, v, beta, gamma,
 *     frames: { station, ship },   // v in m/s, properTime in s
 *     clocks: [{ id, role, r, tau, rate, x, y }],
 *     bodies: [{ id, name, mass, surfaceRadius, kind, spin, x, y, rs, photonSphere, isco }],
 *     particles: [{ id, model, x, y, vx, vy, energy, crossedHorizon, r, phi, tau }]
 *   }
 *   relativity.addEventListener("frame", ...)
 *
 * Canvas colors are read every frame from relativity-theme.css:
 *   --rel-bg, --rel-measured, --rel-illus, --rel-light,
 *   --rel-moving, --rel-rest, --rel-horizon, --rel-horizon-rim.
 */
import { forwardStudyQuery } from "./board-return.js?v=20261021i";
import {
  C, G, M_SUN, R_SUN, R_EARTH, BODY_PRESETS, MODES, precessionPerOrbit,
  gamma, gammaMinusOne, betaForGamma, betaOf,
  lightClock, endFlashTimes, twinParadox, lengthContraction,
  restEnergy, totalEnergy, kineticEnergy, newtonianKineticEnergy, momentum,
  velocityAddition, galileanAddition,
  presetBody, schwarzschildRadius, gravitationalField, gravitationalPotential,
  specificMechanicalEnergy, integrateNewtonian,
  circularGeodesic, stepSchwarzschild, advanceSchwarzschild,
  schwarzschildPosition, schwarzschildCoordinateVelocity, coordinateDtDphi,
  staticClockRate, circularOrbitClockRate, orbitingClockRate,
  circularCoordinateAngularSpeed,
  mercuryPrecession, solarLimbDeflection, gpsWeakField, GPS_RADIUS, GPS_ABOUT,
  flammZ, embeddingHeight, weakFieldPotential, weakFieldClockRate,
  needsNumericalRelativity, pointLensImages, weakDeflectionApplies,
  traceNullRay, criticalImpactParameter, photonSphereRadius, iscoRadius,
  modeFromQuery
} from "./relativity-physics.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONT = "JetBrains Mono, ui-monospace, monospace";
const $ = (id) => document.getElementById(id);

const color = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name, fb) => {
    const v = cs.getPropertyValue(name).trim();
    return v || fb;
  };
  color.bg = get("--rel-bg", "#070b18");
  color.measured = get("--rel-measured", "#f4f7ff");
  color.illus = get("--rel-illus", "#9aa6c8");
  color.light = get("--rel-light", "#ffd45c");
  color.moving = get("--rel-moving", "#5ec8ff");
  color.rest = get("--rel-rest", "#ff8a5c");
  color.horizon = get("--rel-horizon", "#000000");
  color.horizonRim = get("--rel-horizon-rim", "#7a5cff");
}

function parseColor(c) {
  const s = String(c).trim();
  const rgb = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  let h = s.replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return { r: 244, g: 247, b: 255 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgba(c, a) {
  const p = parseColor(c);
  return `rgba(${p.r}, ${p.g}, ${p.b}, ${a})`;
}
function mix(a, b, t) {
  const A = parseColor(a);
  const B = parseColor(b);
  const u = Math.max(0, Math.min(1, t));
  return `rgb(${(A.r + (B.r - A.r) * u) | 0}, ${(A.g + (B.g - A.g) * u) | 0}, ${(A.b + (B.b - A.b) * u) | 0})`;
}

const VIRIDIS = [
  [68, 1, 84], [72, 36, 117], [62, 73, 137], [49, 104, 142], [38, 130, 142],
  [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]
];
function viridis(t) {
  const x = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(x));
  const f = x - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[i + 1];
  return `rgb(${(a[0] + (b[0] - a[0]) * f) | 0}, ${(a[1] + (b[1] - a[1]) * f) | 0}, ${(a[2] + (b[2] - a[2]) * f) | 0})`;
}
const DANGER = "rgb(214, 54, 68)";

const relativity = new EventTarget();
relativity.state = {
  mode: "sr",
  isPaused: true,
  simSpeed: 1,
  secondsPerWallSecond: 1,
  time: 0,
  c: C,
  G,
  v: 0,
  beta: 0,
  gamma: 1,
  frames: {
    station: { id: "station", v: 0, beta: 0, gamma: 1, properTime: 0 },
    ship: { id: "ship", v: 0, beta: 0, gamma: 1, properTime: 0 }
  },
  clocks: [],
  bodies: [],
  particles: []
};
window.relativity = relativity;

const world = {
  mode: "sr",
  playing: !reduceMotion,
  simSpeed: 1,
  beta: 0.6,
  lengthLs: 1,
  mass: 1,
  simFrame: "ship",
  addU: 0.9,
  addV: 0.9,
  twinOn: false,
  stationTime: 0,
  shipProper: 0,
  bodies: [presetBody("black-hole", 0, 0)],
  primaryId: "black-hole",
  relativistic: false,
  grBlend: 0,
  showArrows: true,
  orbitKind: "ellipse",
  probe: null,
  gravityTime: 0,
  orbitScale: 1,
  exaggeration: 8,
  cam: { yaw: 0.55, pitch: 0.95, zoom: 1 },
  ripple: null,
  clockKind: "hover",
  ladderRs: 6,
  gpsOn: false,
  clockTau: { near: 0, mid: 0, far: 0, ground: 0, sat: 0 },
  lensBeta: 0.35,
  lensX: 0.35,
  lensY: 0,
  strongLens: false,
  rayCache: null,
  armed: false,
  drag: null,
  solved: { gamma: null, slope: null, deflect: null, gps: null },
  picks: { slope: null, deflect: null, gps: null }
};

function shipLength() { return world.lengthLs * C; }
function primary() { return world.bodies[0]; }

function fmt(n, d = 3) {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a !== 0 && (a < 0.001 || a >= 1e6)) return n.toExponential(2);
  return n.toFixed(d);
}
function fmtC(beta) {
  return `${beta.toFixed(3)} c`;
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function drawIf(canvas, fn) {
  if (!canvas) return;
  const panel = canvas.closest(".mode");
  if (!panel || panel.hidden) return;
  const box = fitCanvas(canvas);
  if (box.w < 8 || box.h < 8) return;
  fn(box);
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawPill(ctx, x, y, text, kind) {
  ctx.save();
  ctx.font = "600 11px Oswald, sans-serif";
  const padX = 8;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const w = tw + padX * 2;
  const h = 18;
  roundRect(ctx, x, y, w, h, 9);
  ctx.fillStyle = rgba(color.bg, 0.88);
  ctx.fill();
  ctx.lineWidth = 1;
  if (kind === "illus") {
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = rgba(color.illus, 0.7);
    ctx.fillStyle = color.illus;
  } else {
    ctx.setLineDash([]);
    ctx.strokeStyle = color.measured;
    ctx.fillStyle = color.measured;
  }
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), x + padX, y + h / 2 + 0.5);
  ctx.restore();
  return w;
}

function drawClock(ctx, x, y, radius, tau, rim) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#101624";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.strokeStyle = rgba(color.measured, 0.85);
  ctx.lineWidth = 1.25;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const inner = i % 3 === 0 ? radius * 0.72 : radius * 0.82;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * inner, y - Math.cos(a) * inner);
    ctx.lineTo(x + Math.sin(a) * radius * 0.92, y - Math.cos(a) * radius * 0.92);
    ctx.stroke();
  }
  const sec = ((tau % 60) + 60) % 60;
  const ang = (sec / 60) * Math.PI * 2;
  ctx.strokeStyle = color.measured;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(ang) * radius * 0.7, y - Math.cos(ang) * radius * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();
  if (!reduceMotion) {
    const frac = tau - Math.floor(tau);
    if (frac >= 0 && frac < 0.18) {
      ctx.globalAlpha = 0.5 * (1 - frac / 0.18);
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function launchPreset(kind) {
  const body = primary();
  world.orbitKind = kind;
  world.gpsOn = false;
  let geo = null;
  let newton = null;
  let exag = 1;
  let note = "";
  if (kind === "mercury") {
    setPrimary("sun", true);
    const sun = primary();
    const a = 5.790905e10;
    const e = 0.20563;
    const rp = a * (1 - e);
    const h = Math.sqrt(G * sun.mass * a * (1 - e * e));
    const rs = sun.rs;
    const f = 1 - rs / rp;
    const E = Math.sqrt(Math.max(1e-12, f * (1 + (h * h) / (C * C * rp * rp))));
    geo = { u: 1 / rp, up: 0, phi: 0, t: 0, tau: 0, h, E, mass: sun.mass, rs, crossed: false, r: rp };
    exag = 1;
    note = "Mercury";
  } else if (kind === "isco") {
    if (body.kind !== "blackhole") setPrimary("black-hole", true);
    const bh = primary();
    const r = 2.5 * bh.rs;
    const base = circularGeodesic(r, bh.mass);
    geo = { ...base, up: 0.04 / bh.rs };
    note = "Inside the ISCO";
  } else if (kind === "circular") {
    const b = primary();
    const r = b.kind === "blackhole" ? 6 * b.rs : Math.max(6 * b.rs, (b.surfaceRadius || b.rs) * 1.8);
    const base = circularGeodesic(r, b.mass);
    if (base) geo = base;
    else {
      const v = Math.sqrt(G * b.mass / r);
      newton = { x: b.x + r, y: b.y, vx: 0, vy: v };
    }
    note = "Circular";
  } else {
    const b = primary();
    if (b.kind === "blackhole" || (b.surfaceRadius && b.surfaceRadius < 20 * b.rs)) {
      const a = 8 * b.rs;
      const e = 0.45;
      const rp = a * (1 - e);
      const h = Math.sqrt(G * b.mass * a * (1 - e * e));
      const f = 1 - b.rs / rp;
      const E = Math.sqrt(Math.max(1e-12, f * (1 + (h * h) / (C * C * rp * rp))));
      geo = { u: 1 / rp, up: 0, phi: 0.15, t: 0, tau: 0, h, E, mass: b.mass, rs: b.rs, crossed: false, r: rp };
      note = "Zoom-whirl";
    } else {
      const r = (b.surfaceRadius || 1) * 3;
      const v = Math.sqrt(G * b.mass / r);
      newton = { x: b.x + r, y: b.y, vx: 0, vy: v * 0.85 };
      note = "Ellipse";
    }
  }
  const b = primary();
  if (geo) {
    const vel = schwarzschildCoordinateVelocity(geo);
    const pos = schwarzschildPosition(geo, b.x, b.y);
    newton = { x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy };
    const slope = Math.abs(coordinateDtDphi(geo.r, geo.E, geo.h, geo.rs));
    world.orbitScale = Number.isFinite(slope) ? (slope * Math.PI * 2) / 8 : 1;
  } else if (newton) {
    const r = Math.hypot(newton.x - b.x, newton.y - b.y);
    const v = Math.hypot(newton.vx, newton.vy) || 1;
    world.orbitScale = (2 * Math.PI * r / v) / 8;
  }
  world.probe = {
    geo,
    newton,
    exag,
    note,
    crossed: false,
    trailN: [],
    trailG: [],
    rosette: null,
    rosetteFactor: 1
  };
  if (kind === "mercury" && geo) {
    const shown = mercuryRosette(b);
    world.probe.rosette = shown.pts;
    world.probe.rosetteFactor = shown.factor;
    world.probe.exag = shown.factor;
  }
  world.gravityTime = 0;
}

function mercuryRosette(body) {
  const a = 5.790905e10;
  const e = 0.20563;
  const shown = 10 * Math.PI / 180;
  const truth = precessionPerOrbit(a, e, body.mass);
  const factor = shown / truth;
  const pts = [];
  for (let orbit = 0; orbit < 6; orbit++) {
    const rot = orbit * shown;
    for (let k = 0; k <= 90; k++) {
      const phi = (k / 90) * Math.PI * 2;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(phi));
      pts.push({ x: body.x + r * Math.cos(phi + rot), y: body.y + r * Math.sin(phi + rot) });
    }
  }
  return { pts, factor };
}

function setPrimary(id, silent) {
  const prev = world.bodies.length > 1 ? world.bodies.slice(1) : null;
  world.primaryId = id;
  world.bodies = [presetBody(id, 0, 0)];
  world.gpsOn = false;
  world.rayCache = null;
  if (!silent) {
    launchPreset(id === "black-hole" ? "ellipse" : id === "sun" ? "circular" : "circular");
  }
  if (prev && silent === "keep") world.bodies = world.bodies.concat(prev);
  renderBodyChips();
}

function shiftProbe(dx, dy) {
  const p = world.probe;
  if (!p) return;
  if (p.newton) { p.newton.x += dx; p.newton.y += dy; }
  for (const list of [p.trailN, p.trailG, p.rosette || []]) {
    for (const q of list) { q.x += dx; q.y += dy; }
  }
}

function pushTrail(list, x, y) {
  const last = list[list.length - 1];
  if (last && Math.hypot(last.x - x, last.y - y) < 1e-6) return;
  list.push({ x, y });
  if (list.length > 700) list.splice(0, list.length - 700);
}

function stepProbe(dt) {
  const p = world.probe;
  if (!p || !(dt > 0)) return;
  const body = primary();
  if (p.newton && !p.newton.done) {
    const before = { ...p.newton };
    const sub = Math.min(Math.abs(dt) / 24, Math.abs(dt));
    const next = integrateNewtonian(before, dt, world.bodies, sub || dt);
    const r = Math.hypot(next.x - body.x, next.y - body.y);
    if (!(r > body.rs * 0.15) || !Number.isFinite(next.x)) p.newton.done = true;
    else {
      p.newton = next;
      pushTrail(p.trailN, next.x, next.y);
    }
  }
  if (p.geo && !p.geo.crossed) {
    p.geo.mass = body.mass;
    p.geo.rs = body.rs;
    p.geo = advanceSchwarzschild(p.geo, dt);
    if (p.geo.crossed || p.geo.u >= 1 / body.rs || p.geo.r < body.rs * 1.005) {
      p.geo.crossed = true;
      p.crossed = true;
    } else {
      const pos = schwarzschildPosition(p.geo, body.x, body.y);
      pushTrail(p.trailG, pos.x, pos.y);
    }
  }
}

function clockRates() {
  const body = primary();
  const out = [];
  if (world.gpsOn) {
    const ground = R_EARTH;
    const sat = GPS_RADIUS;
    const hoverG = staticClockRate(ground, body.rs);
    const hoverS = staticClockRate(sat, body.rs);
    const ang = circularCoordinateAngularSpeed(sat, body.mass);
    const orbitS = ang == null ? circularOrbitClockRate(sat, body.rs) : orbitingClockRate(sat, body.rs, 0, ang);
    out.push({ id: "ground", role: world.clockKind === "orbit" ? "orbit" : "hover", r: ground, rate: world.clockKind === "orbit" ? staticClockRate(ground, body.rs) : hoverG, x: body.x + ground, y: body.y });
    out.push({ id: "sat", role: world.clockKind === "orbit" ? "orbit" : "hover", r: sat, rate: world.clockKind === "orbit" ? orbitS : hoverS, x: body.x + sat, y: body.y });
    return out;
  }
  const mult = [0.55, 1, 2.4];
  const ids = ["near", "mid", "far"];
  for (let i = 0; i < 3; i++) {
    let r = world.ladderRs * mult[i] * body.rs;
    if (body.kind !== "blackhole" && body.surfaceRadius) r = Math.max(r, body.surfaceRadius * (1 + 0.15 * i));
    if (r <= body.rs * 1.02) r = body.rs * (1.15 + 0.4 * i);
    let rate;
    if (world.clockKind === "orbit") {
      const ang = circularCoordinateAngularSpeed(r, body.mass);
      rate = ang == null ? circularOrbitClockRate(r, body.rs) : orbitingClockRate(r, body.rs, 0, ang);
    } else rate = staticClockRate(r, body.rs);
    out.push({ id: ids[i], role: world.clockKind === "orbit" ? "orbit" : "hover", r, rate, x: body.x + r, y: body.y });
  }
  return out;
}

function publish() {
  const b = world.beta;
  const g = gamma(b);
  const v = b * C;
  const s = relativity.state;
  s.mode = world.mode;
  s.isPaused = !world.playing;
  s.simSpeed = world.simSpeed;
  const scale = world.mode === "gravity" || world.mode === "curvature" ? world.orbitScale : 1;
  s.secondsPerWallSecond = world.simSpeed * scale;
  s.time = world.mode === "sr" || world.mode === "guided" ? world.stationTime : world.gravityTime;
  s.c = C;
  s.G = G;
  s.v = v;
  s.beta = b;
  s.gamma = g;
  s.frames.station.properTime = world.stationTime;
  s.frames.station.v = 0;
  s.frames.station.beta = 0;
  s.frames.station.gamma = 1;
  s.frames.ship.v = v;
  s.frames.ship.beta = b;
  s.frames.ship.gamma = g;
  s.frames.ship.properTime = world.shipProper;
  s.bodies = world.bodies.map((body) => ({
    id: body.id,
    name: body.name,
    mass: body.mass,
    surfaceRadius: body.surfaceRadius,
    kind: body.kind,
    spin: body.spin,
    x: body.x,
    y: body.y,
    rs: body.rs,
    photonSphere: body.photonSphere,
    isco: body.isco
  }));
  const particles = [];
  const probe = world.probe;
  if (probe && probe.newton && !probe.newton.done) {
    const n = probe.newton;
    particles.push({
      id: "newton",
      model: "newtonian",
      x: n.x, y: n.y, vx: n.vx, vy: n.vy,
      energy: specificMechanicalEnergy(n.x, n.y, n.vx, n.vy, world.bodies),
      crossedHorizon: false,
      r: Math.hypot(n.x - primary().x, n.y - primary().y),
      phi: Math.atan2(n.y - primary().y, n.x - primary().x),
      tau: null
    });
  }
  if (probe && probe.geo) {
    const pos = probe.geo.crossed ? { x: primary().x, y: primary().y, r: primary().rs } : schwarzschildPosition(probe.geo, primary().x, primary().y);
    const vel = probe.geo.crossed ? { vx: 0, vy: 0 } : schwarzschildCoordinateVelocity(probe.geo);
    particles.push({
      id: "schwarzschild",
      model: "schwarzschild",
      x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy,
      energy: probe.geo.E,
      crossedHorizon: !!probe.geo.crossed,
      r: pos.r,
      phi: probe.geo.phi,
      tau: probe.geo.tau
    });
  }
  s.particles = particles;
  const rates = clockRates();
  const clocks = [
    { id: "station", role: "station", r: null, tau: world.stationTime, rate: 1, x: 0, y: 0 },
    { id: "ship", role: "ship", r: null, tau: world.shipProper, rate: g > 0 ? 1 / g : 0, x: v, y: 0 }
  ];
  for (const c of rates) {
    clocks.push({ ...c, tau: world.clockTau[c.id] || 0 });
  }
  s.clocks = clocks;
  relativity.dispatchEvent(new Event("frame"));
}

function advance(wall) {
  if (!(wall > 0)) return;
  const speed = world.simSpeed;
  if (world.mode === "sr" || world.mode === "guided") {
    const dt = wall * speed;
    world.stationTime += dt;
    world.shipProper += dt / gamma(world.beta);
  }
  if (world.mode === "gravity" || world.mode === "curvature") {
    const dt = wall * speed * world.orbitScale;
    world.gravityTime += dt;
    stepProbe(dt);
  }
  if (world.mode === "clocks") {
    const dt = wall * speed;
    world.gravityTime += dt;
    for (const c of clockRates()) world.clockTau[c.id] = (world.clockTau[c.id] || 0) + c.rate * dt;
  }
  const target = world.relativistic ? 1 : 0;
  if (reduceMotion) world.grBlend = target;
  else world.grBlend += (target - world.grBlend) * Math.min(1, wall * 3.2);
  if (world.ripple && !world.drag) {
    world.ripple.age += wall;
    if (world.ripple.age > 1.1) world.ripple = null;
  }
}

function resetDynamics() {
  world.stationTime = 0;
  world.shipProper = 0;
  world.gravityTime = 0;
  world.clockTau = { near: 0, mid: 0, far: 0, ground: 0, sat: 0 };
  launchPreset(world.orbitKind || "ellipse");
}

function rows(items) {
  const host = $("dataRows");
  host.replaceChildren();
  for (const [k, val] of items) {
    const row = document.createElement("div");
    row.className = "row";
    const a = document.createElement("span");
    a.className = "k";
    a.textContent = k;
    const b = document.createElement("span");
    b.className = "val";
    b.textContent = val;
    row.append(a, b);
    host.append(row);
  }
}

function updateReadouts() {
  const b = world.beta;
  const g = gamma(b);
  const v = b * C;
  const m = world.mass;
  const L = shipLength();
  const contracted = lengthContraction(L, b);
  const clock = lightClock(L, v);
  const flashes = endFlashTimes(L, v, world.simFrame);
  const other = world.simFrame === "ship" ? flashes.station : flashes.ship;
  const add = velocityAddition(world.addU * C, world.addV * C) / C;
  const gal = galileanAddition(world.addU * C, world.addV * C) / C;
  const items = [
    ["β", fmtC(b)],
    ["γ", fmt(g, 4)],
    ["v", `${fmt(v, 3)} m/s`],
    ["Station t", `${fmt(world.stationTime, 3)} s`],
    ["Ship τ", `${fmt(world.shipProper, 3)} s`],
    ["L parallel", `${fmt(contracted.parallel, 3)} m`],
    ["L transverse", `${fmt(contracted.transverse, 3)} m`],
    ["Light clock c", `${fmt(clock.cStation, 3)} m/s`],
    ["E₀ = mc²", `${fmt(restEnergy(m), 3)} J`],
    ["E = γmc²", `${fmt(totalEnergy(m, v), 3)} J`],
    ["KE", `${fmt(kineticEnergy(m, v), 3)} J`],
    ["½mv²", `${fmt(newtonianKineticEnergy(m, v), 3)} J`],
    ["p = γmv", `${fmt(momentum(m, v), 3)} kg·m/s`]
  ];
  items.push(["Flashes", other.order === "simultaneous" ? "simultaneous" : other.order.replace("-", " ")]);
  items.push(["u (+) v", `${add.toFixed(3)} c`]);
  items.push(["u + v Galilean", `${gal.toFixed(3)} c`]);
  if (world.twinOn) {
    const twin = twinParadox(v, 8);
    items.push(["Twin station", `${fmt(twin.stationTime, 3)} s`]);
    items.push(["Twin traveler", `${fmt(twin.travelerProper, 3)} s`]);
    items.push(["Simultaneity jump", `${fmt(twin.simultaneityJump, 3)} s`]);
  }
  const body = primary();
  items.push(["Primary", body.spin ? `${body.name} · ${body.spin}` : body.name]);
  items.push(["r_s", `${fmt(body.rs, 3)} m`]);
  items.push(["Photon sphere", `${fmt(body.photonSphere, 3)} m`]);
  items.push(["ISCO", `${fmt(body.isco, 3)} m`]);
  if (world.probe && world.probe.geo) {
    items.push(["GR r", world.probe.geo.crossed ? "crossed the horizon" : `${fmt(world.probe.geo.r, 3)} m`]);
    items.push(["Coordinate t", `${fmt(world.gravityTime, 3)} s`]);
  }
  if (world.mode === "curvature" || world.mode === "gravity") {
    const sampleR = body.kind === "blackhole" ? body.rs * 6 : (body.surfaceRadius || body.rs * 4);
    const emb = embeddingHeight(sampleR, body);
    if (emb.z != null) {
      items.push(["Flamm z true", `${fmt(emb.z, 3)} m`]);
      items.push(["Drawn depth", `×${world.exaggeration}`]);
    }
  }
  if (world.gpsOn || world.mode === "clocks") {
    const gps = gpsWeakField();
    items.push(["GPS grav about", `+${GPS_ABOUT.gravitationalUsPerDay} μs/day`]);
    items.push(["GPS velocity about", `${GPS_ABOUT.velocityUsPerDay} μs/day`]);
    items.push(["GPS net about", `+${GPS_ABOUT.netUsPerDay} μs/day`]);
    items.push(["GPS computed net", `${fmt(gps.netUsPerDay, 2)} μs/day`]);
  }
  const sunDef = solarLimbDeflection();
  items.push(["Sun limb", `${sunDef.arcsec.toFixed(2)} arcsec`]);
  const merc = mercuryPrecession();
  items.push(["Mercury", `${merc.arcsecPerCentury.toFixed(2)} arcsec/cy`]);
  if (world.mode === "lensing") {
    const th = pointLensImages(world.lensBeta, 1);
    items.push(["θ+ / θ_E", fmt(th.plus, 3)]);
    items.push(["θ− / θ_E", fmt(th.minus, 3)]);
    items.push(["Capture b", `${criticalImpactParameter(1).toFixed(3)} r_s`]);
  }
  const lead = {
    sr: ["β", "γ", "u (+) v", "p = γmv", "E = γmc²"],
    guided: ["β", "γ", "u (+) v", "p = γmv", "E = γmc²"],
    gravity: ["Primary", "GR r", "r_s", "Photon sphere", "ISCO", "Mercury", "Coordinate t"],
    curvature: ["Primary", "Flamm z true", "Drawn depth", "r_s"],
    clocks: ["GPS net about", "GPS grav about", "GPS velocity about", "GPS computed net"],
    lensing: ["Sun limb", "Capture b", "θ+ / θ_E", "θ− / θ_E"]
  }[world.mode] || [];
  const lifted = [];
  for (const key of lead) {
    const i = items.findIndex((row) => row[0] === key);
    if (i >= 0) lifted.push(items.splice(i, 1)[0]);
  }
  items.unshift(...lifted);
  rows(items);

  $("betaLabel").textContent = fmtC(b);
  $("gammaRead").textContent = fmt(g, 3);
  const span = Math.log(30);
  const pos = Math.max(0, Math.min(1, Math.log(Math.max(g, 1)) / span));
  $("gammaFill").style.width = `${pos * 100}%`;
  $("gammaMark").style.left = `${(Math.log(2) / span) * 100}%`;
  $("lengthLabel").textContent = `${world.lengthLs.toFixed(2)} light-second`;
  $("massLabel").textContent = `${world.mass.toFixed(1)} kg`;
  $("addULabel").textContent = fmtC(world.addU);
  $("addVLabel").textContent = fmtC(world.addV);
  $("chBetaLabel").textContent = fmtC(b);
  $("exagLabel").textContent = `×${world.exaggeration}`;
  $("ladderLabel").textContent = world.gpsOn ? "GPS radii" : `${world.ladderRs.toFixed(1)} r_s`;
  $("betaLensLabel").textContent = world.lensBeta.toFixed(2);
  $("twinNote").hidden = !world.twinOn;
  $("twinBtn").classList.toggle("primary", world.twinOn);
  $("pauseBtn").textContent = world.playing ? "Pause" : "Play";

  const gNow = gamma(b);
  let title = "Special relativity";
  let reason = `β = ${b.toFixed(3)} · γ = ${gNow.toFixed(3)} · both light-clock frames measure c`;
  if (world.mode === "gravity") {
    title = world.relativistic ? "Schwarzschild orbits" : "Newtonian field";
    reason = world.probe && world.probe.crossed
      ? "Crossed the horizon. Inside the ISCO there is no stable circular orbit."
      : world.orbitKind === "isco"
        ? `${body.name} · non-rotating (Schwarzschild). Inside the ISCO there is no stable circular orbit. This one falls in.`
        : `${body.name}${body.spin ? " · " + body.spin : ""} · r_s ${fmt(body.rs)} m · photon sphere 1.5 r_s · ISCO 3 r_s`;
  } else if (world.mode === "curvature") {
    const nr = needsNumericalRelativity(world.bodies);
    title = nr ? "Numerical relativity" : (world.bodies.length > 1 ? "Weak-field map" : "Flamm embedding");
    reason = nr
      ? "Requires numerical relativity. No simple picture exists. LIGO listens for the waves from mergers like this."
      : "Spatial curvature on a constant-time slice. Slow-object gravity is mostly time curvature. The sheet is not pulled down by gravity.";
  } else if (world.mode === "clocks") {
    title = world.gpsOn ? "GPS clocks" : (world.clockKind === "orbit" ? "Orbiting clocks" : "Hovering clocks");
    reason = world.gpsOn
      ? "Weak-field comparison, labeled about: +45.7 gravitational, −7.2 velocity, +38.5 net μs/day."
      : "Hovering rate √(1 − r_s/r). A circular orbit is √(1 − 1.5 r_s/r), and that is 0 at 1.5 r_s.";
  } else if (world.mode === "lensing") {
    title = world.strongLens ? "Null geodesics" : "Point lens";
    reason = world.strongLens
      ? "Modeled photon paths. Rays with b below about 2.598 r_s are captured. Point-lens images stay off."
      : `Solar limb ${sunDef.arcsec.toFixed(2)} arcsec. The star field uses a teaching Einstein radius.`;
  } else if (world.mode === "guided") {
    const keys = Object.values(world.solved);
    const tried = keys.filter((v) => v !== null).length;
    const ok = keys.filter((v) => v === true).length;
    title = "Challenges";
    reason = `${ok} correct out of ${tried} checked. γ = 2 is 0.866c. The Sun deflects starlight by 1.75 arcsec.`;
    $("scoreLine").textContent = `${ok} correct · ${tried} checked.`;
  }
  $("statusType").textContent = title;
  $("statusReason").textContent = reason;
}

function drawSR() {
  drawIf($("clocksCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    const r = Math.min(70, h * 0.32, w * 0.16);
    const y = h * 0.56;
    drawClock(ctx, w * 0.28, y, r, world.stationTime, color.rest);
    drawClock(ctx, w * 0.72, y, r, world.shipProper, color.moving);
    ctx.fillStyle = color.rest;
    ctx.font = `600 13px Oswald, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("STATION", w * 0.28, y - r - 12);
    ctx.fillStyle = color.moving;
    ctx.fillText("SHIP", w * 0.72, y - r - 12);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = color.measured;
    ctx.fillText(`${fmt(world.stationTime, 2)} s`, w * 0.28, y + r + 18);
    ctx.fillText(`${fmt(world.shipProper, 2)} s`, w * 0.72, y + r + 18);
  });

  drawIf($("lightCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    const L = shipLength();
    const v = world.beta * C;
    const g = gamma(world.beta);
    const halfW = w * 0.46;
    function panel(x0, label, ship) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 0, halfW, h);
      ctx.clip();
      ctx.fillStyle = color.measured;
      ctx.font = `600 12px Oswald, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(label, x0 + 10, 18);
      const period = ship ? (2 * L) / C : g * (2 * L) / C;
      const now = ship ? world.shipProper : world.stationTime;
      const spanT = Math.max(period * 3.2, 1e-6);
      const t0 = Math.max(0, now - spanT);
      const samples = 80;
      let maxX = L;
      let minX = 0;
      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const t = t0 + (spanT * i) / samples;
        const phase = (t / period) % 1;
        const up = phase < 0.5 ? phase / 0.5 : 1 - (phase - 0.5) / 0.5;
        const yy = up * L;
        const xx = ship ? 0 : v * (t - t0);
        pts.push({ x: xx, y: yy });
        maxX = Math.max(maxX, xx);
      }
      const pad = 28;
      const scale = Math.min((halfW - 36) / Math.max(maxX - minX, L), (h - 58) / L);
      const ox = x0 + 24;
      const oy = h - 24;
      ctx.strokeStyle = rgba(color.measured, 0.35);
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy - L * scale, 8, L * scale);
      ctx.beginPath();
      ctx.strokeStyle = color.light;
      ctx.lineWidth = 1.75;
      pts.forEach((p, i) => {
        const X = ox + 16 + p.x * scale;
        const Y = oy - p.y * scale;
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.stroke();
      const last = pts[pts.length - 1];
      ctx.fillStyle = color.light;
      ctx.beginPath();
      ctx.arc(ox + 16 + last.x * scale, oy - last.y * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    panel(8, "SHIP  ·  VERTICAL", true);
    panel(w * 0.5, "STATION  ·  DIAGONAL", false);
    ctx.fillStyle = rgba(color.illus, 0.9);
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("Equal scale. The stretch is the measured path, and both frames get c.", 12, h - 8);
  });

  drawIf($("gridCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    const g = gamma(world.beta);
    const cell = Math.min(28, (h - 70) / 5);
    function grid(ox, oy, sx, sy, stroke, label) {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + i * sy);
        ctx.lineTo(ox + 4 * sx, oy + i * sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox + i * sx, oy);
        ctx.lineTo(ox + i * sx, oy + 4 * sy);
        ctx.stroke();
      }
      ctx.fillStyle = stroke;
      ctx.font = `600 12px Oswald, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(label, ox, oy - 10);
      ctx.restore();
    }
    const top = 36;
    grid(24, top, cell, cell, color.rest, "STATION");
    const shipCellX = cell / g;
    grid(w * 0.52, top, shipCellX, cell, color.moving, "SHIP  ·  ALONG MOTION ONLY");
    ctx.fillStyle = color.measured;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "left";
    const text = "Measured shape, not what you'd see (light delay / Terrell rotation).";
    wrapText(ctx, text, 16, h - 28, w - 32, 14);
  });

  drawIf($("minkowskiCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    const origin = { x: w * 0.32, y: h * 0.72 };
    const unit = Math.min(w, h) * 0.085;
    const X = (x, ct) => ({ x: origin.x + x * unit, y: origin.y - ct * unit });
    const reach = Math.max(w, h) * 1.4;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + reach, origin.y - reach);
    ctx.lineTo(origin.x - reach, origin.y - reach);
    ctx.closePath();
    ctx.fillStyle = rgba(color.light, 0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + reach, origin.y + reach);
    ctx.lineTo(origin.x - reach, origin.y + reach);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color.light;
    ctx.setLineDash([]);
    line(ctx, X(0, 0), X(reach / unit, reach / unit));
    line(ctx, X(0, 0), X(-reach / unit, reach / unit));
    ctx.setLineDash([7, 5]);
    line(ctx, X(0, 0), X(reach / unit, -reach / unit));
    line(ctx, X(0, 0), X(-reach / unit, -reach / unit));
    ctx.setLineDash([]);
    ctx.fillStyle = color.light;
    ctx.font = `11px ${FONT}`;
    ctx.fillText("future", origin.x + 8, 18);
    ctx.fillText("past", origin.x + 8, h - 12);

    const beta = world.beta;
    const gma = gamma(beta);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color.rest;
    line(ctx, X(0, -1.2), X(0, 8.5));
    ctx.fillStyle = color.rest;
    ctx.fillText("station", origin.x + 6, origin.y - 8.2 * unit);
    for (let n = 0; n <= 8; n++) tick(ctx, X(0, n), 7, 0, color.rest);

    if (world.twinOn) {
      const T = 8;
      const tTurn = T / 2;
      const xTurn = beta * tTurn;
      ctx.strokeStyle = color.moving;
      ctx.lineWidth = 2;
      line(ctx, X(0, 0), X(xTurn, tTurn));
      line(ctx, X(xTurn, tTurn), X(0, T));
      const twin = twinParadox(beta * C, T);
      ctx.save();
      ctx.strokeStyle = color.illus;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.25;
      const before = (x) => twin.turnaround.t + beta * (x - xTurn);
      const after = (x) => twin.turnaround.t - beta * (x - xTurn);
      line(ctx, X(-0.2, before(-0.2)), X(xTurn + 0.3, before(xTurn + 0.3)));
      line(ctx, X(-0.2, after(-0.2)), X(xTurn + 0.3, after(xTurn + 0.3)));
      ctx.restore();
      ctx.fillStyle = color.illus;
      ctx.fillText("simultaneity jumps", X(xTurn, tTurn).x + 8, X(xTurn, tTurn).y - 8);
      const playT = world.stationTime % (T + 0.8);
      let px;
      let py;
      if (playT <= tTurn) { px = beta * playT; py = playT; }
      else if (playT <= T) { px = xTurn - beta * (playT - tTurn); py = playT; }
      else { px = 0; py = T; }
      const dot = X(px, py);
      ctx.fillStyle = color.moving;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
      ctx.fill();
      for (let tau = 1; tau < T / gma; tau++) {
        const t = tau * gma;
        const onOut = t <= tTurn;
        const x = onOut ? beta * t : xTurn - beta * (t - tTurn);
        tickAlong(ctx, X(x, t), onOut ? beta : -beta, color.moving);
      }
      ctx.fillStyle = color.measured;
      ctx.font = `12px ${FONT}`;
      wrapText(ctx, "Age gap: different spacetime paths. The turnaround joins two inertial legs. Acceleration is not what ages the twin.", 12, h - 36, w * 0.46, 14);
    } else {
      ctx.strokeStyle = color.moving;
      ctx.lineWidth = 2;
      line(ctx, X(0, 0), X(beta * 8, 8));
      ctx.save();
      ctx.strokeStyle = rgba(color.moving, 0.85);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.25;
      line(ctx, X(-1, -beta), X(6, beta * 6));
      ctx.restore();
      ctx.fillStyle = color.moving;
      ctx.fillText("ship  ·  ct′", X(beta * 7.2, 7.2).x + 4, X(beta * 7.2, 7.2).y);
      ctx.fillText("x′", X(3.2, beta * 3.2).x, X(3.2, beta * 3.2).y + 14);
      for (let tau = 1; tau < 8 / gma; tau++) {
        const t = tau * gma;
        tickAlong(ctx, X(beta * t, t), beta, color.moving);
      }
    }
    ctx.restore();
  });

  drawIf($("energyCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    const mL = 46;
    const mR = 12;
    const mT = 16;
    const mB = 28;
    const plotW = w - mL - mR;
    const plotH = h - mT - mB;
    const yMax = 3;
    ctx.strokeStyle = color.measured;
    ctx.lineWidth = 1;
    ctx.strokeRect(mL, mT, plotW, plotH);
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = color.measured;
    ctx.textAlign = "right";
    ctx.fillText("3 mc²", mL - 6, mT + 4);
    ctx.fillText("0", mL - 6, mT + plotH);
    ctx.textAlign = "center";
    ctx.fillText("β → 1", mL + plotW - 18, h - 8);
    ctx.beginPath();
    ctx.strokeStyle = rgba(color.rest, 0.9);
    ctx.setLineDash([4, 3]);
    for (let i = 0; i <= 60; i++) {
      const beta = (i / 60) * 0.999;
      const y = (beta * beta) / 2;
      const X = mL + (beta / 0.999) * plotW;
      const Y = mT + plotH - Math.min(y, yMax) / yMax * plotH;
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.strokeStyle = color.measured;
    ctx.lineWidth = 2;
    let left = false;
    for (let i = 0; i <= 80; i++) {
      const beta = (i / 80) * 0.999;
      const y = gammaMinusOne(beta);
      const X = mL + (beta / 0.999) * plotW;
      const Y = mT + plotH - Math.min(y, yMax) / yMax * plotH;
      if (y > yMax && !left) {
        ctx.lineTo(X, mT);
        left = true;
      }
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    const yb = gammaMinusOne(world.beta);
    const xb = mL + (world.beta / 0.999) * plotW;
    const ybPx = mT + plotH - Math.min(yb, yMax) / yMax * plotH;
    ctx.fillStyle = color.light;
    ctx.beginPath();
    ctx.arc(xb, ybPx, 4, 0, Math.PI * 2);
    ctx.fill();
    drawPill(ctx, 8, 8, "Measured", "measured");
    ctx.fillStyle = color.measured;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("White: (γ−1)mc²    coral dash: ½mv²    leaves the frame as v → c", mL, h - 8);
  });
}

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
function tick(ctx, p, len, axis, stroke) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (axis === 0) { ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y); }
  else { ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y + len); }
  ctx.stroke();
}
function tickAlong(ctx, p, beta, stroke) {
  const dx = beta;
  const dy = -1;
  const mag = Math.hypot(dx, dy) || 1;
  const px = -dy / mag;
  const py = dx / mag;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x - px * 6, p.y - py * 6);
  ctx.lineTo(p.x + px * 6, p.y + py * 6);
  ctx.stroke();
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  ctx.textAlign = "left";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = trial;
  }
  if (line) ctx.fillText(line, x, yy);
}

function gravityView(w, h) {
  const body = primary();
  let span = body.kind === "blackhole" ? body.rs * 16 : (body.surfaceRadius || body.rs) * 4;
  const p = world.probe;
  if (p && p.newton) span = Math.max(span, Math.hypot(p.newton.x - body.x, p.newton.y - body.y) * 2.5);
  if (p && p.geo && !p.geo.crossed) span = Math.max(span, p.geo.r * 2.5);
  if (world.orbitKind === "mercury") span = 5.790905e10 * 2.4;
  for (const extra of world.bodies) {
    span = Math.max(span, Math.hypot(extra.x - body.x, extra.y - body.y) * 1.4);
  }
  const scale = Math.min(w, h) * 0.42 / span;
  return { cx: w * 0.5, cy: h * 0.52, scale, span, ox: body.x, oy: body.y, w, h };
}
function toScreen(view, x, y) {
  return { x: view.cx + (x - view.ox) * view.scale, y: view.cy - (y - view.oy) * view.scale };
}

function drawGravity() {
  drawIf($("gravityCanvas"), ({ ctx, w, h }) => {
    const view = gravityView(w, h);
    $("gravityCanvas")._view = view;
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = rgba(color.measured, 0.08);
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo((w / 6) * i, 0);
      ctx.lineTo((w / 6) * i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (h / 6) * i);
      ctx.lineTo(w, (h / 6) * i);
      ctx.stroke();
    }
    const blend = world.grBlend;
    if (world.showArrows && blend < 0.92) {
      ctx.globalAlpha = 1 - blend;
      drawField(ctx, view);
      ctx.globalAlpha = 1;
    }
    drawMarkers(ctx, view);
    for (const body of world.bodies) drawBody(ctx, view, body);
    const probe = world.probe;
    if (probe) {
      ctx.globalAlpha = 1 - blend * 0.85;
      strokeTrail(ctx, view, probe.trailN, color.rest);
      if (probe.newton && !probe.newton.done) dot(ctx, toScreen(view, probe.newton.x, probe.newton.y), color.rest);
      ctx.globalAlpha = 0.25 + blend * 0.75;
      if (probe.rosette) {
        strokeTrail(ctx, view, probe.rosette, rgba(color.illus, 0.9));
      }
      strokeTrail(ctx, view, probe.trailG, color.moving);
      if (probe.geo && !probe.geo.crossed) {
        const pos = schwarzschildPosition(probe.geo, primary().x, primary().y);
        dot(ctx, toScreen(view, pos.x, pos.y), color.moving);
      }
      ctx.globalAlpha = 1;
    }
    if (world.drag && world.drag.kind === "launch") {
      const a = toScreen(view, world.drag.x, world.drag.y);
      const b = toScreen(view, world.drag.x + world.drag.vx, world.drag.y + world.drag.vy);
      ctx.strokeStyle = color.light;
      ctx.lineWidth = 1.5;
      line(ctx, a, b);
    }
    drawRipple(ctx, view);
    const factor = probe && probe.exag > 1 ? probe.exag : null;
    const shown = probe && probe.rosetteFactor > 1 ? probe.rosetteFactor : factor;
    const arrowsOn = world.showArrows && blend < 0.85;
    const exaggerated = shown && shown > 1;
    const label = exaggerated
      ? `Illustrative  ×${shown >= 100 ? shown.toExponential(1) : Math.round(shown)} exaggerated`
      : "Illustrative  ·  arrow scale fitted";
    if (exaggerated || arrowsOn) drawPill(ctx, 10, 10, label, "illus");
    if (probe && probe.crossed) drawPill(ctx, 10, 34, "Crossed the horizon", "measured");
    ctx.restore();
  });
}

function drawField(ctx, view) {
  const cols = 11;
  const rows = 8;
  let maxG = 0;
  const samples = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = view.ox + ((i + 0.5) / cols - 0.5) * view.span * 2;
      const y = view.oy + ((j + 0.5) / rows - 0.5) * view.span * 2;
      const f = gravitationalField(x, y, world.bodies);
      samples.push({ x, y, f });
      if (f.g > maxG && f.g < 1e8) maxG = f.g;
    }
  }
  ctx.strokeStyle = rgba(color.illus, 0.85);
  ctx.fillStyle = rgba(color.illus, 0.85);
  ctx.lineWidth = 1;
  for (const s of samples) {
    if (!(s.f.g > 0) || !(maxG > 0)) continue;
    const len = 8 + 18 * Math.sqrt(s.f.g / maxG);
    const p = toScreen(view, s.x, s.y);
    const ang = Math.atan2(-s.f.gy, s.f.gx);
    const x2 = p.x + Math.cos(ang) * len;
    const y2 = p.y + Math.sin(ang) * len;
    line(ctx, p, { x: x2, y: y2 });
  }
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = rgba(color.illus, 0.45);
  const body = primary();
  for (const mul of [2.2, 4, 7, 11]) {
    const r = (body.kind === "blackhole" ? body.rs : (body.surfaceRadius || body.rs)) * mul;
    circle(ctx, view, body.x, body.y, r);
  }
  ctx.setLineDash([]);
}

function drawMarkers(ctx, view) {
  const body = primary();
  const rings = [
    [body.rs, "horizon  r_s", color.horizonRim],
    [body.photonSphere, "photon  1.5 r_s", color.light],
    [body.isco, "ISCO  3 r_s", color.moving]
  ];
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "left";
  for (const [r, label, stroke] of rings) {
    const px = r * view.scale;
    if (px < 6 || px > Math.max(view.w, view.h)) continue;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = r === body.rs ? 1.5 : 1;
    ctx.setLineDash(r === body.rs ? [] : [4, 3]);
    circle(ctx, view, body.x, body.y, r);
    ctx.setLineDash([]);
    const p = toScreen(view, body.x + r, body.y);
    ctx.fillStyle = stroke;
    ctx.fillText(label, p.x + 4, p.y - 4);
  }
}

function circle(ctx, view, x, y, r) {
  const p = toScreen(view, x, y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(1, r * view.scale), 0, Math.PI * 2);
  ctx.stroke();
}
function dot(ctx, p, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
}
function strokeTrail(ctx, view, pts, stroke) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  let open = false;
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i];
    const p = toScreen(view, q.x, q.y);
    const prev = pts[i - 1];
    const jump = prev && Math.hypot(q.x - prev.x, q.y - prev.y) > view.span * 0.45;
    if (!open || jump) {
      ctx.moveTo(p.x, p.y);
      open = true;
    } else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function drawBody(ctx, view, body) {
  const p = toScreen(view, body.x, body.y);
  if (body.kind === "blackhole") {
    const rad = Math.max(8, body.rs * view.scale);
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = color.horizon;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color.horizonRim;
    ctx.stroke();
  } else {
    const rad = Math.max(7, (body.surfaceRadius || body.rs) * view.scale);
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color.rest, 0.85);
    ctx.fill();
  }
  ctx.fillStyle = color.measured;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(body.spin ? `${body.name}` : body.name, p.x, p.y + Math.max(16, (body.surfaceRadius || body.rs) * view.scale + 14));
  if (body.spin) {
    ctx.fillStyle = color.illus;
    ctx.fillText(body.spin, p.x, p.y + Math.max(28, (body.rs) * view.scale + 28));
  }
}
function drawRipple(ctx, view) {
  const rip = world.ripple;
  if (!rip) return;
  const p = toScreen(view, rip.x, rip.y);
  const n = reduceMotion ? 1 : 3;
  for (let i = 0; i < n; i++) {
    const age = reduceMotion ? 0.4 : rip.age - i * 0.18;
    if (age < 0 || age > 1.1) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + age * 46, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(color.illus, reduceMotion ? 0.45 : 0.35 * (1 - age / 1.1));
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawCurvature() {
  drawIf($("curveCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    if (needsNumericalRelativity(world.bodies)) {
      ctx.fillStyle = "rgba(80, 86, 104, 0.55)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color.measured;
      ctx.font = `14px ${FONT}`;
      ctx.textAlign = "center";
      wrapTextCentered(ctx, "Requires numerical relativity. No simple picture exists. LIGO listens for the waves from mergers like this.", w / 2, h / 2 - 20, w - 48, 18);
      drawPill(ctx, 10, 10, "Illustrative", "illus");
      return;
    }
    const bodies = world.bodies;
    const single = bodies.length === 1;
    const body = primary();
    const outer = single
      ? (body.kind === "blackhole" ? body.rs * 14 : (body.surfaceRadius || body.rs) * 3.2)
      : Math.max(...bodies.map((b) => Math.hypot(b.x - body.x, b.y - body.y) + (b.surfaceRadius || b.rs * 8)), body.rs * 10);
    const N = 34;
    const heights = [];
    let zMin = Infinity;
    let zMax = -Infinity;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const x = body.x + ((i / N) - 0.5) * 2 * outer;
        const y = body.y + ((j / N) - 0.5) * 2 * outer;
        const sample = sampleHeight(x, y, bodies, outer);
        heights.push(sample);
        if (sample && sample.zDraw != null) {
          zMin = Math.min(zMin, sample.zDraw);
          zMax = Math.max(zMax, sample.zDraw);
        }
      }
    }
    if (!Number.isFinite(zMin)) { zMin = 0; zMax = 1; }
    const spanZ = Math.max(1e-9, zMax - zMin);
    function proj(i, j) {
      const s = heights[j * (N + 1) + i];
      if (!s || s.zDraw == null) return null;
      const nx = (i / N - 0.5) * 2;
      const ny = (j / N - 0.5) * 2;
      const nz = embedZ(s.zDraw, zMin, spanZ);
      return { ...project(nx, ny, nz, w, h), sample: s, t: (s.zDraw - zMin) / spanZ };
    }
    const idx = (i, j) => j * (N + 1) + i;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = proj(i, j);
        const b = proj(i + 1, j);
        const c = proj(i, j + 1);
        if (!a) continue;
        const depth = (a.depth + 1.4) / 3;
        const hole = a.sample.danger;
        ctx.strokeStyle = fog(hole ? DANGER : viridis(a.t), depth);
        ctx.lineWidth = 1;
        if (b) line(ctx, a, b);
        if (c) line(ctx, a, c);
      }
    }
    if (single && body.kind === "blackhole") drawThroat(ctx, w, h, body, outer, zMin, spanZ);
    drawSurfaceOrbit(ctx, w, h, outer, zMin, spanZ);
    drawRippleScreen(ctx, w, h, outer);
    const tag = single
      ? `Illustrative  ×${world.exaggeration} exaggerated`
      : `Illustrative  ×${world.exaggeration}  ·  weak-field approximation`;
    drawPill(ctx, 10, 10, tag, "illus");
    ctx.fillStyle = color.illus;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = "left";
    const cap = single && body.kind !== "blackhole" ? "Interior capped at the surface. " : "";
    const throat = single && body.kind === "blackhole" ? "Stops at the horizon. " : "";
    ctx.fillText(`${cap}${throat}True z is in the measured panel.`, 12, h - 12);
  });
}

function sampleHeight(x, y, bodies, outer) {
  if (bodies.length === 1) {
    const b = bodies[0];
    const r = Math.hypot(x - b.x, y - b.y);
    const emb = embeddingHeight(r, b);
    if (emb.z == null) return { zDraw: null, danger: true, r };
    const danger = b.kind === "blackhole" && r < b.rs * 2.2;
    return { zDraw: emb.z * world.exaggeration, zTrue: emb.z, danger, r, region: emb.region };
  }
  let phi = 0;
  let danger = false;
  for (const b of bodies) {
    const r = Math.hypot(x - b.x, y - b.y);
    const soften = Math.max(b.surfaceRadius || 0, b.rs);
    phi += -G * b.mass / Math.max(r, soften * 0.35);
    if (b.kind === "blackhole" && r < b.rs * 2.2) danger = true;
  }
  const rate = weakFieldClockRate(phi);
  return { zDraw: -phi * world.exaggeration, phi, rate, danger, r: 0, weak: true };
}

function embedZ(zDraw, zMin, spanZ) {
  return (0.15 - (zDraw - zMin) / spanZ) * 0.95;
}
function project(nx, ny, nz, w, h) {
  const yaw = world.cam.yaw;
  const pitch = world.cam.pitch;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = nx * cy - ny * sy;
  const y1 = nx * sy + ny * cy;
  const y2 = y1 * cp - nz * sp;
  const z2 = y1 * sp + nz * cp;
  const f = world.cam.zoom * Math.min(w, h) * 0.46 / (2.15 + z2 * 0.35);
  return { x: w / 2 + x1 * f, y: h * 0.58 - y2 * f, depth: z2 };
}
function fog(rgb, depth01) {
  return mix(rgb, color.bg, Math.max(0, Math.min(1, depth01)) * 0.78);
}
function drawThroat(ctx, w, h, body, outer, zMin, spanZ) {
  const r = body.rs * 1.02;
  const emb = embeddingHeight(r, body);
  if (!emb.z) return;
  const nz = embedZ(emb.z * world.exaggeration, zMin, spanZ);
  const pts = [];
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const nx = Math.cos(a) * (r / outer);
    const ny = Math.sin(a) * (r / outer);
    pts.push(project(nx, ny, nz, w, h));
  }
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.closePath();
  ctx.fillStyle = color.horizon;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.horizonRim;
  ctx.stroke();
}
function drawSurfaceOrbit(ctx, w, h, outer, zMin, spanZ) {
  const probe = world.probe;
  if (!probe) return;
  const trail = world.relativistic ? probe.trailG : probe.trailN;
  if (!trail || trail.length < 2) return;
  ctx.save();
  if (!reduceMotion) {
    ctx.shadowColor = color.moving;
    ctx.shadowBlur = 14;
  }
  ctx.beginPath();
  ctx.strokeStyle = color.moving;
  ctx.lineWidth = 2;
  trail.forEach((q, i) => {
    const dx = q.x - primary().x;
    const dy = q.y - primary().y;
    const r = Math.hypot(dx, dy);
    const sample = sampleHeight(q.x, q.y, world.bodies, outer);
    if (!sample || sample.zDraw == null) return;
    const nz = embedZ(sample.zDraw, zMin, spanZ);
    const p = project(dx / outer, dy / outer, nz, w, h);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}
function drawRippleScreen(ctx, w, h, outer) {
  if (!world.ripple) return;
  const dx = world.ripple.x - primary().x;
  const dy = world.ripple.y - primary().y;
  const p = project(dx / outer, dy / outer, 0.2, w, h);
  const age = world.ripple.age || 0;
  ctx.beginPath();
  ctx.arc(p.x, p.y, reduceMotion ? 16 : 12 + age * 40, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(color.illus, 0.7);
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}
function wrapTextCentered(ctx, text, x, y, maxW, lh) {
  ctx.textAlign = "center";
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxW && line) { lines.push(line); line = word; }
    else line = trial;
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh));
}

function drawClocks() {
  drawIf($("ladderCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    const body = primary();
    const clocks = clockRates();
    const margin = 36;
    ctx.strokeStyle = rgba(color.measured, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, h * 0.62);
    ctx.lineTo(w - margin, h * 0.62);
    ctx.stroke();
    const bx = margin + 8;
    ctx.beginPath();
    ctx.arc(bx, h * 0.62, body.kind === "blackhole" ? 11 : 14, 0, Math.PI * 2);
    ctx.fillStyle = body.kind === "blackhole" ? color.horizon : color.rest;
    ctx.fill();
    ctx.strokeStyle = body.kind === "blackhole" ? color.horizonRim : color.rest;
    ctx.lineWidth = 2;
    ctx.stroke();
    clocks.forEach((c, i) => {
      const x = margin + ((i + 1) / (clocks.length + 0.3)) * (w - margin * 2);
      const radius = Math.min(48, h * 0.16);
      const rim = i === 0 ? color.rest : color.moving;
      drawClock(ctx, x, h * 0.4, radius, world.clockTau[c.id] || 0, rim);
      ctx.strokeStyle = rgba(rim, 0.8);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.4 + radius);
      ctx.lineTo(x, h * 0.62);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color.measured;
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = "center";
      const label = world.gpsOn ? (c.id === "ground" ? "ground" : "GPS") : `${fmt(c.r / body.rs, 2)} r_s`;
      ctx.fillText(label, x, h * 0.62 + 18);
      const stopped = world.clockKind === "orbit" && !(c.rate > 0);
      const atPhoton = stopped && Math.abs(c.r / body.rs - 1.5) < 0.06;
      ctx.fillText(stopped ? (atPhoton ? "dτ/dt 0 · photon sphere" : "dτ/dt 0 · no circular orbit") : `dτ/dt ${fmt(c.rate, 4)}`, x, h * 0.62 + 34);
    });
    if (world.gpsOn) {
      drawPill(ctx, 10, 10, "Measured  ·  about", "measured");
      ctx.fillStyle = color.measured;
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "left";
      wrapText(ctx, "about +45.7 μs/day grav,  about −7.2 velocity,  about +38.5 net", 12, h - 28, w - 24, 14);
    } else if (world.clockKind === "orbit") {
      ctx.fillStyle = color.measured;
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText("Circular orbit: √(1 − 1.5 r_s/r). Zero at the photon sphere.", 12, 22);
    }
  });
}

const STARFIELD = (() => {
  let s = 123456789;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < 70; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = 0.15 + rnd() * 1.7;
    stars.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, r: 0.6 + rnd() * 1.4 });
  }
  return stars;
})();

function drawLensing() {
  drawIf($("lensCanvas"), ({ ctx, w, h }) => {
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97) % 100) / 100 * w;
      const sy = ((i * 53) % 100) / 100 * h;
      ctx.fillStyle = rgba(color.measured, 0.25);
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }
    if (world.strongLens) {
      drawPhotonBundle(ctx, w, h);
      drawPill(ctx, 10, 10, "Illustrative  ·  null geodesic, modeled", "illus");
      return;
    }
    const cx = w / 2;
    const cy = h / 2;
    const thetaE = Math.min(w, h) * 0.22;
    const src = { x: cx + world.lensX * thetaE, y: cy - world.lensY * thetaE };
    ctx.strokeStyle = rgba(color.light, 0.35);
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, thetaE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const star of STARFIELD) {
      const beta = Math.hypot(star.x, star.y);
      const ang = Math.atan2(star.y, star.x);
      ctx.fillStyle = rgba(color.measured, 0.25);
      ctx.beginPath();
      ctx.arc(cx + star.x * thetaE, cy - star.y * thetaE, star.r, 0, Math.PI * 2);
      ctx.fill();
      if (beta < 0.04) continue;
      const img = pointLensImages(beta, 1);
      for (const th of [img.plus, img.minus]) {
        const mag = Math.min(8, Math.abs(th / (beta - th)));
        const spread = Math.min(0.55, 0.04 + 0.02 * mag);
        ctx.strokeStyle = rgba(color.measured, 0.85);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.abs(th) * thetaE, -ang - spread, -ang + spread);
        ctx.stroke();
      }
    }
    const betaS = Math.hypot(world.lensX, world.lensY);
    if (betaS < 0.06) {
      ctx.strokeStyle = color.light;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, thetaE, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const img = pointLensImages(betaS, 1);
      const ang = Math.atan2(world.lensY, world.lensX);
      for (const th of [img.plus, img.minus]) {
        ctx.fillStyle = color.light;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * th * thetaE, cy - Math.sin(ang) * th * thetaE, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = color.light;
    ctx.beginPath();
    ctx.arc(src.x, src.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color.horizonRim;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    drawPill(ctx, 10, 10, "Illustrative  ·  point-lens teaching field", "illus");
    $("lensCanvas")._lens = { cx, cy, thetaE };
  });
}

function drawPhotonBundle(ctx, w, h) {
  if (!world.rayCache) world.rayCache = buildRays();
  const body = world.rayCache;
  const rs = body.rs;
  const scale = Math.min(w, h) * 0.045 / rs;
  const cx = w * 0.55;
  const cy = h * 0.52;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(6, rs * scale), 0, Math.PI * 2);
  ctx.fillStyle = color.horizon;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.horizonRim;
  ctx.stroke();
  for (const ray of body.rays) {
    ctx.beginPath();
    ctx.strokeStyle = ray.captured ? color.rest : color.light;
    ctx.lineWidth = 1.5;
    ray.points.forEach((p, i) => {
      const x = cx + p.r * Math.cos(p.phi + ray.rot) * scale;
      const y = cy - p.r * Math.sin(p.phi + ray.rot) * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.fillStyle = color.measured;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("b < 2.598 r_s captured · photon sphere at 1.5 r_s", 12, h - 14);
}

function buildRays() {
  const mass = 8 * M_SUN;
  const rs = schwarzschildRadius(mass);
  const factors = [2.3, 2.55, 2.9, 3.4, 4.5, 6.5];
  const rays = factors.map((f, i) => {
    const traced = traceNullRay(mass, f * rs, { dphi: 0.01, maxSteps: 6000, recordEvery: 6, rStart: 28 * rs });
    return { captured: traced.captured, points: traced.points, rot: Math.PI * 0.85 + i * 0.04 };
  });
  return { rs, rays };
}

function renderBodyChips() {
  for (const id of ["bodyChips", "bodyChips2"]) {
    const host = $(id);
    if (!host) continue;
    host.replaceChildren();
    for (const key of Object.keys(BODY_PRESETS)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (world.primaryId === key && world.bodies.length === 1 ? " active" : "");
      btn.textContent = BODY_PRESETS[key].name;
      btn.addEventListener("click", () => { setPrimary(key); });
      host.append(btn);
    }
  }
}

function setMode(id, pushUrl) {
  if (!MODES.some((m) => m.id === id)) id = "sr";
  world.mode = id;
  document.querySelectorAll(".mode").forEach((el) => { el.hidden = el.id !== `mode-${id}`; });
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === id);
    el.setAttribute("aria-selected", el.dataset.mode === id ? "true" : "false");
  });
  const side = document.querySelector(`#mode-${id} .side`);
  const panel = $("dataPanel");
  if (side && panel) side.insertBefore(panel, side.firstChild);
  if (pushUrl) {
    const params = new URLSearchParams(location.search);
    params.set("mode", id);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }
}

function score(id, ok) {
  world.solved[id] = ok;
}

function bind() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode, true));
  });
  $("pauseBtn").addEventListener("click", () => { world.playing = !world.playing; });
  $("resetBtn").addEventListener("click", resetDynamics);
  document.querySelectorAll("#speedChips button").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.simSpeed = Number(btn.dataset.speed);
      document.querySelectorAll("#speedChips button").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  $("controlsJumpBtn").addEventListener("click", () => {
    const el = document.querySelector(".mode:not([hidden]) .controls");
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
  const syncBeta = (value) => {
    world.beta = Number(value);
    $("betaRange").value = String(world.beta);
    $("chBeta").value = String(world.beta);
  };
  $("betaRange").addEventListener("input", () => syncBeta($("betaRange").value));
  $("chBeta").addEventListener("input", () => syncBeta($("chBeta").value));
  $("lengthRange").addEventListener("input", () => { world.lengthLs = Number($("lengthRange").value); });
  $("massRange").addEventListener("input", () => { world.mass = Number($("massRange").value); });
  document.querySelectorAll("#simChips .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.simFrame = btn.dataset.sim;
      document.querySelectorAll("#simChips .chip").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  $("addU").addEventListener("input", () => { world.addU = Number($("addU").value); });
  $("addV").addEventListener("input", () => { world.addV = Number($("addV").value); });
  $("addPreset").addEventListener("click", () => {
    world.addU = 0.9;
    world.addV = 0.9;
    $("addU").value = "0.9";
    $("addV").value = "0.9";
  });
  $("twinBtn").addEventListener("click", () => { world.twinOn = !world.twinOn; });
  document.querySelectorAll("#gravToggle .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.relativistic = btn.dataset.grav === "gr";
      if (reduceMotion) world.grBlend = world.relativistic ? 1 : 0;
      document.querySelectorAll("#gravToggle .chip").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  document.querySelectorAll("#orbitChips .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      launchPreset(btn.dataset.orbit);
      document.querySelectorAll("#orbitChips .chip").forEach((b) => b.classList.toggle("active", b.dataset.orbit === world.orbitKind));
    });
  });
  $("armLaunch").addEventListener("click", () => {
    world.armed = !world.armed;
    $("armLaunch").classList.toggle("primary", world.armed);
  });
  $("clearParticles").addEventListener("click", () => { world.probe = null; });
  $("showArrows").addEventListener("change", () => { world.showArrows = $("showArrows").checked; });
  const addCompanion = () => {
    const b = primary();
    const far = b.kind === "blackhole" ? b.rs * 28 : (b.id === "sun" ? 1.5e11 : (b.surfaceRadius || 1) * 6);
    const id = b.kind === "blackhole" ? "black-hole" : (b.id === "sun" ? "earth" : "sun");
    const extra = presetBody(id, b.x + far, b.y);
    world.bodies = [b, extra];
    world.rayCache = null;
    renderBodyChips();
  };
  const closeHoles = () => {
    if (primary().kind !== "blackhole") setPrimary("black-hole", true);
    const a = primary();
    const extra = presetBody("black-hole", a.x + a.rs * 3, a.y);
    world.bodies = [a, extra];
    world.rayCache = null;
    renderBodyChips();
  };
  $("addCompanion").addEventListener("click", addCompanion);
  $("addCompanionCurve").addEventListener("click", addCompanion);
  $("closeHoles").addEventListener("click", closeHoles);
  $("closeHolesCurve").addEventListener("click", closeHoles);
  $("exagRange").addEventListener("input", () => { world.exaggeration = Number($("exagRange").value); });
  $("camReset").addEventListener("click", () => { world.cam = { yaw: 0.55, pitch: 0.95, zoom: 1 }; });
  $("zoomIn").addEventListener("click", () => { world.cam.zoom = Math.min(3, world.cam.zoom * 1.15); });
  $("zoomOut").addEventListener("click", () => { world.cam.zoom = Math.max(0.4, world.cam.zoom / 1.15); });
  document.querySelectorAll("#clockMode .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.clockKind = btn.dataset.clock;
      document.querySelectorAll("#clockMode .chip").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  $("ladderRange").addEventListener("input", () => { world.ladderRs = Number($("ladderRange").value); });
  $("gpsPreset").addEventListener("click", () => {
    setPrimary("earth", true);
    launchPreset("circular");
    world.gpsOn = true;
    world.clockKind = "hover";
    world.clockTau.ground = 0;
    world.clockTau.sat = 0;
  });
  $("betaLens").addEventListener("input", () => {
    world.lensBeta = Number($("betaLens").value);
    world.lensX = world.lensBeta;
    world.lensY = 0;
    world.strongLens = false;
  });
  $("alignBtn").addEventListener("click", () => {
    world.lensBeta = 0;
    world.lensX = 0;
    world.lensY = 0;
    world.strongLens = false;
    $("betaLens").value = "0";
  });
  $("strongBtn").addEventListener("click", () => {
    world.strongLens = !world.strongLens;
    $("strongBtn").classList.toggle("primary", world.strongLens);
    if (world.strongLens) world.rayCache = null;
  });

  $("chGamma").addEventListener("click", () => {
    const target = betaForGamma(2);
    const ok = Math.abs(world.beta - target) < 0.012;
    score("gamma", ok);
    const msg = $("chGammaMsg");
    msg.className = "feedback " + (ok ? "ok" : "no");
    msg.textContent = ok
      ? "Yes. γ = 2 at β = √(1 − 1/4) = 0.866c."
      : `Not yet. γ is ${gamma(world.beta).toFixed(3)}. Keep going toward 0.866c.`;
  });
  document.querySelectorAll("#chSlope .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.picks.slope = btn.dataset.pick;
      document.querySelectorAll("#chSlope .chip").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  $("chSlopeBtn").addEventListener("click", () => {
    const rs = schwarzschildRadius(M_SUN);
    const slope = (R) => Math.sqrt(rs / (R - rs));
    const sun = slope(R_SUN);
    const compact = slope(4 * rs);
    const ok = world.picks.slope === "compact";
    score("slope", ok);
    const msg = $("chSlopeMsg");
    msg.className = "feedback " + (ok ? "ok" : "no");
    msg.textContent = ok
      ? `Yes. Slope at the Sun’s surface is ${sun.toExponential(2)}. At 4 r_s it is ${compact.toFixed(3)}. Same mass, smaller radius, steeper surface.`
      : `The compact surface is steeper: ${compact.toFixed(3)} versus ${sun.toExponential(2)} at the Sun. Mass sets r_s. Radius decides how close the surface sits.`;
  });
  document.querySelectorAll("#chDeflect .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.picks.deflect = btn.dataset.pick;
      document.querySelectorAll("#chDeflect .chip").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  $("chDeflectBtn").addEventListener("click", () => {
    const arc = solarLimbDeflection().arcsec;
    const ok = world.picks.deflect === "1.75";
    score("deflect", ok);
    const msg = $("chDeflectMsg");
    msg.className = "feedback " + (ok ? "ok" : "no");
    msg.textContent = ok
      ? `Yes. 4GM/(c²R) gives ${arc.toFixed(2)} arcsec at the solar limb.`
      : `The formula gives ${arc.toFixed(2)} arcsec, about 1.75, not a tenth of that and not degrees.`;
  });
  document.querySelectorAll("#chGps .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      world.picks.gps = btn.dataset.pick;
      document.querySelectorAll("#chGps .chip").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  $("chGpsBtn").addEventListener("click", () => {
    const ok = world.picks.gps === "38.5";
    score("gps", ok);
    const msg = $("chGpsMsg");
    msg.className = "feedback " + (ok ? "ok" : "no");
    msg.textContent = ok
      ? "Yes. About +45.7 plus about −7.2 leaves about +38.5 μs/day. That sum is the weak-field comparison."
      : "Add the two about-numbers: +45.7 and −7.2. The net is about +38.5 μs/day.";
  });

  bindPointer($("gravityCanvas"), gravityPointer);
  bindPointer($("curveCanvas"), curvePointer);
  bindPointer($("lensCanvas"), lensPointer);
  $("curveCanvas").addEventListener("wheel", (e) => {
    e.preventDefault();
    world.cam.zoom = Math.max(0.4, Math.min(3, world.cam.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
  }, { passive: false });

  document.addEventListener("click", (e) => {
    const back = e.target.closest && e.target.closest("[data-study-back]");
    if (!back) return;
    e.preventDefault();
    // The gallery's board-return.js reads board / student / pbreturn from
    // this query and ignores mode=. forwardStudyQuery is that key list.
    forwardStudyQuery(location.search);
    location.href = "study.html" + location.search;
  });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (e.target && e.target.closest && e.target.closest("input, textarea, select, button, a")) return;
    e.preventDefault();
    world.playing = !world.playing;
  });
}

function bindPointer(canvas, handler) {
  if (!canvas) return;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    handler("down", e, canvas);
  });
  canvas.addEventListener("pointermove", (e) => handler("move", e, canvas));
  canvas.addEventListener("pointerup", (e) => handler("up", e, canvas));
  canvas.addEventListener("pointercancel", (e) => handler("up", e, canvas));
}
function localPoint(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function gravityPointer(phase, e, canvas) {
  const view = canvas._view;
  if (!view) return;
  const p = localPoint(e, canvas);
  const mx = view.ox + (p.x - view.cx) / view.scale;
  const my = view.oy - (p.y - view.cy) / view.scale;
  if (phase === "down") {
    const hit = hitBody(p, view);
    if (hit) {
      world.drag = { kind: "body", index: world.bodies.indexOf(hit), lx: p.x, ly: p.y };
      world.ripple = { x: hit.x, y: hit.y, age: 0 };
    } else if (world.armed) {
      world.drag = { kind: "launch", x: mx, y: my, vx: 0, vy: 0 };
    }
  } else if (phase === "move" && world.drag) {
    if (world.drag.kind === "body") {
      const body = world.bodies[world.drag.index] || primary();
      const nx = view.ox + (p.x - view.cx) / view.scale;
      const ny = view.oy - (p.y - view.cy) / view.scale;
      const dx = nx - body.x;
      const dy = ny - body.y;
      body.x = nx;
      body.y = ny;
      if (body === primary()) shiftProbe(dx, dy);
      world.ripple = { x: nx, y: ny, age: reduceMotion ? 0.3 : 0 };
    } else if (world.drag.kind === "launch") {
      const body = primary();
      const r = Math.max(body.rs * 3, Math.hypot(world.drag.x - body.x, world.drag.y - body.y));
      const circ = Math.sqrt(G * body.mass / r);
      world.drag.vx = ((p.x - toScreen(view, world.drag.x, world.drag.y).x) / 70) * circ;
      world.drag.vy = (-(p.y - toScreen(view, world.drag.x, world.drag.y).y) / 70) * circ;
    }
  } else if (phase === "up" && world.drag) {
    if (world.drag.kind === "launch") {
      const d = world.drag;
      world.probe = {
        geo: null,
        newton: { x: d.x, y: d.y, vx: d.vx, vy: d.vy },
        exag: 1,
        note: "Launched",
        crossed: false,
        trailN: [],
        trailG: [],
        rosette: null
      };
      const r = Math.hypot(d.x - primary().x, d.y - primary().y) || 1;
      const speed = Math.hypot(d.vx, d.vy) || Math.sqrt(G * primary().mass / r);
      world.orbitScale = (2 * Math.PI * r / speed) / 8;
      world.orbitKind = "custom";
      world.armed = false;
      $("armLaunch").classList.remove("primary");
    }
    world.drag = null;
  }
}
function hitBody(p, view) {
  let best = null;
  let bestD = 28;
  for (const body of world.bodies) {
    const s = toScreen(view, body.x, body.y);
    const rad = Math.max(18, ((body.surfaceRadius && body.kind !== "blackhole") ? body.surfaceRadius : body.rs) * view.scale);
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d < Math.max(bestD, rad)) { best = body; bestD = d; }
  }
  return best;
}

let curvePointers = [];
function curvePointer(phase, e, canvas) {
  const p = localPoint(e, canvas);
  if (phase === "down") {
    curvePointers.push({ id: e.pointerId, x: p.x, y: p.y });
    world.drag = { kind: "cam", x: p.x, y: p.y, yaw: world.cam.yaw, pitch: world.cam.pitch };
    const body = primary();
    const center = project(0, 0, 0, canvas.clientWidth, canvas.clientHeight);
    if (Math.hypot(p.x - center.x, p.y - center.y) < 36) {
      world.drag.kind = "mass";
      world.ripple = { x: body.x, y: body.y, age: 0 };
    }
  } else if (phase === "move" && world.drag) {
    const rec = curvePointers.find((q) => q.id === e.pointerId);
    if (rec) { rec.x = p.x; rec.y = p.y; }
    if (curvePointers.length >= 2) {
      const a = curvePointers[0];
      const b = curvePointers[1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (world.drag.pinch) world.cam.zoom = Math.max(0.4, Math.min(3, world.drag.zoom0 * dist / world.drag.pinch));
      else { world.drag.pinch = dist; world.drag.zoom0 = world.cam.zoom; }
      return;
    }
    if (world.drag.kind === "cam") {
      world.cam.yaw = world.drag.yaw + (p.x - world.drag.x) * 0.008;
      world.cam.pitch = Math.max(0.2, Math.min(1.4, world.drag.pitch + (p.y - world.drag.y) * 0.006));
    } else if (world.drag.kind === "mass") {
      const body = primary();
      const scale = (body.kind === "blackhole" ? body.rs * 14 : (body.surfaceRadius || body.rs) * 3) / (canvas.clientWidth * 0.4);
      body.x += (p.x - world.drag.x) * scale;
      body.y -= (p.y - world.drag.y) * scale;
      world.drag.x = p.x;
      world.drag.y = p.y;
      world.ripple = { x: body.x, y: body.y, age: reduceMotion ? 0.3 : 0 };
    }
  } else if (phase === "up") {
    curvePointers = curvePointers.filter((q) => q.id !== e.pointerId);
    if (!curvePointers.length) world.drag = null;
  }
}

function lensPointer(phase, e, canvas) {
  if (world.strongLens) return;
  const box = canvas._lens;
  if (!box) return;
  const p = localPoint(e, canvas);
  if (phase === "down" || phase === "move") {
    world.lensX = (p.x - box.cx) / box.thetaE;
    world.lensY = -(p.y - box.cy) / box.thetaE;
    world.lensBeta = Math.hypot(world.lensX, world.lensY);
    $("betaLens").value = String(Math.max(0, Math.min(1.6, world.lensBeta)));
  }
}

function boot() {
  readColors();
  renderBodyChips();
  launchPreset("ellipse");
  bind();
  const params = new URLSearchParams(location.search);
  const initial = params.has("mode") ? modeFromQuery(params.get("mode")) : "sr";
  setMode(initial, false);
  document.body.dataset.relativity = "ready";
  let last = 0;
  function frame(now) {
    if (!last) last = now;
    const wall = Math.min(0.05, (now - last) / 1000);
    last = now;
    readColors();
    if (world.playing) advance(wall);
    else {
      const target = world.relativistic ? 1 : 0;
      if (reduceMotion) world.grBlend = target;
      else world.grBlend += (target - world.grBlend) * Math.min(1, wall * 3.2);
    }
    publish();
    updateReadouts();
    if (world.mode === "sr") drawSR();
    else if (world.mode === "gravity") drawGravity();
    else if (world.mode === "curvature") drawCurvature();
    else if (world.mode === "clocks") drawClocks();
    else if (world.mode === "lensing") drawLensing();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();

window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
  if (e.matches) world.playing = false;
});
