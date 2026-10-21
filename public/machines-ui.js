/**
 * Simple Machines sandbox UI.
 *
 * Designer hook (read this, not the internals):
 *   machines.state = {
 *     machine, mode,
 *     appliedForce, outputForce,          // N
 *     inputDisplacement, outputDisplacement, // m
 *     inputWork, outputWork,               // J
 *     idealMA, actualMA, efficiency        // efficiency is a percent
 *   }
 *   Updated every frame from the same model the picture uses.
 *   On the workbench, state.lever / state.pulley / state.plane are those snapshots.
 *   machines.addEventListener("dragstart", ...)
 *   machines.addEventListener("released", ...)
 *   machines.registerMachine(id, analyzer)  // later phases
 *
 * Canvas and SVG colors are read every frame from machines-theme.css:
 *   --effort, --load, --ideal-ghost, --work-lost, --tension-low, --tension-high.
 */
import {
  G, MODES, MODE_ALIASES, LATER_PHASES, LEVER_PRESETS,
  analyzeLever, analyzePulley, analyzePlane, analyzeWorkbench,
  leverGeometry, snapshot, registerMachine
} from "./machines-physics.js";

const FONT = "JetBrains Mono, ui-monospace, monospace";
const $ = (id) => document.getElementById(id);

const INITIAL = {
  lever: {
    leverClass: 1, barLength: 2.4, fulcrum: 1.6, loadAt: 0.4, effortAt: 0.2,
    loadMass: 10, angleDeg: 0, lift: 0.4, friction: 0, push: 50, pushLocked: true
  },
  pulley: {
    segments: 4, loadMass: 10, liftHeight: 0.4, frictionOn: true, frictionRatio: 1.2,
    massOn: false, linearDensity: 0.12, pulleyMass: 0.4
  },
  plane: {
    length: 2.5, angleDeg: 30, mu: 0.25, mass: 10, push: 70, pushLocked: true, progress: 0.58
  },
  bench: { mass: 10, height: 0.4 }
};

const ui = {
  mode: "workbench",
  showIdeal: true,
  lever: { ...INITIAL.lever },
  pulley: { ...INITIAL.pulley },
  plane: { ...INITIAL.plane },
  bench: { ...INITIAL.bench }
};

const color = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name, fb) => cs.getPropertyValue(name).trim() || fb;
  color.effort = get("--effort", "#FFB300");
  color.load = get("--load", "#5FD3C4");
  color.idealGhost = get("--ideal-ghost", "#D5DDE6");
  color.workLost = get("--work-lost", "#FF4D4D");
  color.tensionLow = get("--tension-low", "#8C6239");
  color.tensionHigh = get("--tension-high", "#FFC14D");
  color.canvas = get("--canvas", "#0b0e13");
  color.text = get("--text", "#E9E6DE");
  color.textDim = get("--text-dim", "#93A0AC");
  color.border = get("--border", "#2C3742");
  color.panel = get("--panel", "#171C22");
}

const machines = new EventTarget();
machines.state = { machine: "workbench", mode: "workbench" };
machines.result = null;
machines.registerMachine = registerMachine;
window.machines = machines;

let activeSlider = null;
let drag = null;
let model = null;

function fmt(n, d = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a !== 0 && (a < 0.001 || a >= 100000)) return n.toExponential(2);
  return n.toFixed(d);
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function parseColor(c) {
  const m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  let h = String(c).trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return { r: 255, g: 179, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpColor(a, b, t) {
  const A = parseColor(a);
  const B = parseColor(b);
  const u = clamp(t, 0, 1);
  const r = Math.round(A.r + (B.r - A.r) * u);
  const g = Math.round(A.g + (B.g - A.g) * u);
  const bl = Math.round(A.b + (B.b - A.b) * u);
  return `rgb(${r}, ${g}, ${bl})`;
}

function compute() {
  const lever = analyzeLever({
    leverClass: ui.lever.leverClass,
    barLength: ui.lever.barLength,
    fulcrum: ui.lever.fulcrum,
    loadAt: ui.lever.loadAt,
    effortAt: ui.lever.effortAt,
    loadMass: ui.lever.loadMass,
    g: G,
    effortAngle: ui.lever.angleDeg * Math.PI / 180,
    frictionTorque: ui.lever.friction,
    outputDisplacement: ui.lever.lift,
    appliedForce: ui.lever.pushLocked ? null : ui.lever.push
  });
  const pulley = analyzePulley({
    segments: ui.pulley.segments,
    loadMass: ui.pulley.loadMass,
    liftHeight: ui.pulley.liftHeight,
    g: G,
    pulleyFriction: ui.pulley.frictionOn,
    frictionRatio: ui.pulley.frictionRatio,
    includePulleyMass: ui.pulley.massOn,
    includeRopeMass: ui.pulley.massOn,
    pulleyMass: ui.pulley.pulleyMass,
    linearDensity: ui.pulley.linearDensity,
    span: ui.pulley.liftHeight
  });
  const plane = analyzePlane({
    length: ui.plane.length,
    angle: ui.plane.angleDeg * Math.PI / 180,
    mu: ui.plane.mu,
    mass: ui.plane.mass,
    g: G,
    appliedForce: ui.plane.pushLocked ? null : ui.plane.push
  });
  const bench = analyzeWorkbench({
    mass: ui.bench.mass,
    height: ui.bench.height,
    g: G,
    lever: {
      leverClass: lever.leverClass,
      effortArm: lever.effortArm,
      loadArm: lever.loadArm,
      effortAngle: lever.effortAngle,
      frictionTorque: lever.frictionTorque
    },
    pulley: {
      segments: ui.pulley.segments,
      pulleyFriction: ui.pulley.frictionOn,
      frictionRatio: ui.pulley.frictionRatio,
      includePulleyMass: ui.pulley.massOn,
      includeRopeMass: ui.pulley.massOn,
      pulleyMass: ui.pulley.pulleyMass,
      linearDensity: ui.pulley.linearDensity,
      span: ui.pulley.liftHeight
    },
    plane: { angle: plane.angle, mu: plane.mu }
  });
  return { lever, pulley, plane, bench };
}

function publish(current) {
  if (current) {
    machines.result = current;
    machines.state = snapshot(current, ui.mode);
  } else {
    machines.result = null;
    machines.state = snapshot(null, ui.mode);
    machines.state.ready = false;
  }
}

function emit(name, target) {
  machines.dispatchEvent(new CustomEvent(name, {
    detail: { ...machines.state, target }
  }));
}

function status(title, reason) {
  $("statusType").textContent = title;
  $("statusReason").textContent = reason;
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
  if (!canvas) return null;
  const panel = canvas.closest(".mode");
  if (panel && panel.hidden) return null;
  const box = fitCanvas(canvas);
  if (box.w < 2 || box.h < 2) return null;
  return fn(box);
}

function backdrop(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color.canvas;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = "rgba(233,230,222,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function halo(ctx, text, x, y, fill) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color.canvas;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawArrow(ctx, x, y, ang, len, stroke, width, dashed) {
  if (!(len > 2)) return { x2: x, y2: y };
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  const head = Math.max(11, width * 2.1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return { x2, y2 };
}

function drawRuler(ctx, x, y, ang, len, stroke, text) {
  if (!(len > 3)) return;
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  for (const [px, py] of [[x, y], [x2, y2]]) {
    ctx.beginPath();
    ctx.moveTo(px - nx * 5, py - ny * 5);
    ctx.lineTo(px + nx * 5, py + ny * 5);
    ctx.stroke();
  }
  if (text) {
    ctx.font = "11px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    halo(ctx, text, (x + x2) / 2 + nx * 12, (y + y2) / 2 + ny * 12, stroke);
  }
  ctx.restore();
}

function strokeLine(ctx, x1, y1, x2, y2, stroke, width) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function localToWorld(bx, by, x, y, rot) {
  return {
    x: bx + x * Math.cos(rot) - y * Math.sin(rot),
    y: by + x * Math.sin(rot) + y * Math.cos(rot)
  };
}

function drawLever(ctx, w, h, result, compact) {
  backdrop(ctx, w, h);
  const margin = compact ? 28 : 72;
  const barY = h * (compact ? 0.46 : 0.40);
  const usable = Math.max(20, w - margin * 2);
  const xOf = (meters) => margin + (meters / result.barLength) * usable;
  const xf = xOf(result.fulcrum);
  const xe = xOf(result.effort);
  const xl = xOf(result.load);
  const thick = compact ? 7 : 9;

  if (result.leverClass === 1) {
    strokeLine(ctx, xe, barY, xf, barY, color.effort, thick);
    strokeLine(ctx, xf, barY, xl, barY, color.load, thick);
  } else if (result.leverClass === 2) {
    strokeLine(ctx, xOf(0), barY, xOf(result.barLength), barY, color.effort, thick);
    strokeLine(ctx, xOf(0), barY + 14, xl, barY + 14, color.load, thick);
  } else {
    strokeLine(ctx, xOf(0), barY, xOf(result.barLength), barY, color.load, thick);
    strokeLine(ctx, xOf(0), barY - 14, xe, barY - 14, color.effort, thick);
  }

  ctx.save();
  if (result.leverClass === 2) {
    ctx.strokeStyle = color.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(xf, barY + 26, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = color.text;
    ctx.beginPath();
    ctx.moveTo(xf, barY + 6);
    ctx.lineTo(xf - 16, barY + 32);
    ctx.lineTo(xf + 16, barY + 32);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const maxF = Math.max(result.outputForce, result.appliedForce, result.ideal.appliedForce, 1e-6);
  const maxD = Math.max(result.ideal.inputDisplacement, result.ideal.outputDisplacement, 1e-6);
  const room = Math.min(w, h) * (compact ? 0.18 : 0.22);
  const fLen = (force) => (force / maxF) * room;
  const dLen = (dist) => (dist / maxD) * room;
  const effortDown = result.leverClass === 1;
  const effortAng = (effortDown ? Math.PI / 2 : -Math.PI / 2) + result.effortAngle;
  const idealAng = effortDown ? Math.PI / 2 : -Math.PI / 2;
  const loadAng = Math.PI / 2;
  const dIn = result.lifts ? result.inputDisplacement : 0;
  const dOut = result.lifts ? result.outputDisplacement : 0;
  const side = compact ? 14 : 20;

  const realTip = drawArrow(ctx, xe, barY, effortAng, fLen(result.appliedForce), color.effort, compact ? 5 : 7, false);
  if (ui.showIdeal) {
    drawArrow(ctx, xe, barY, idealAng, fLen(result.ideal.appliedForce), color.idealGhost, 3, true);
  }
  const ox = Math.cos(effortAng + Math.PI / 2) * side;
  const oy = Math.sin(effortAng + Math.PI / 2) * side;
  drawRuler(ctx, xe + ox, barY + oy, effortAng, dLen(dIn), color.effort, compact ? "" : fmt(dIn, 2) + " m");

  drawArrow(ctx, xl, barY, loadAng, fLen(result.outputForce), color.load, compact ? 5 : 7, false);
  const lox = side;
  drawRuler(ctx, xl + lox, barY, loadAng, dLen(dOut), color.load, compact ? "" : fmt(dOut, 2) + " m");

  if (!compact) {
    ctx.font = "12px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (result.leverClass === 1) {
      if (Math.abs(xf - xe) > 64) halo(ctx, "d_in " + fmt(result.effortArm, 2) + " m", (xe + xf) / 2, barY - 18, color.effort);
      if (Math.abs(xl - xf) > 64) halo(ctx, "d_out " + fmt(result.loadArm, 2) + " m", (xl + xf) / 2, barY - 18, color.load);
    } else if (result.leverClass === 2) {
      halo(ctx, "d_in " + fmt(result.effortArm, 2) + " m", (xOf(0) + xOf(result.barLength)) / 2, barY - 18, color.effort);
      halo(ctx, "d_out " + fmt(result.loadArm, 2) + " m", (xOf(0) + xl) / 2, barY + 32, color.load);
    } else {
      halo(ctx, "d_out " + fmt(result.loadArm, 2) + " m", (xOf(0) + xOf(result.barLength)) / 2, barY + 18, color.load);
      halo(ctx, "d_in " + fmt(result.effortArm, 2) + " m", (xOf(0) + xe) / 2, barY - 30, color.effort);
    }
  }

  return { margin, usable, barY, xf, xe, xl, tip: realTip, barLength: result.barLength };
}

function drawPulley(ctx, w, h, result, compact) {
  backdrop(ctx, w, h);
  const n = result.segments;
  const top = compact ? 32 : 48;
  const maxGap = h * (compact ? 0.42 : 0.48);
  const gap = Math.max(54, maxGap * (0.42 + 0.58 * (result.liftHeight / 1.2)));
  const bot = top + gap;
  const left = compact ? 24 : 64;
  const right = w - (compact ? 28 : 108);
  const span = Math.max(36, right - left);
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(left + span * ((i + 0.5) / n));

  ctx.save();
  ctx.strokeStyle = color.textDim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left - 18, top - 18);
  ctx.lineTo(Math.min(w - 16, right + 48), top - 18);
  ctx.stroke();
  ctx.restore();

  if (ui.showIdeal) {
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = color.idealGhost;
    ctx.lineWidth = 2;
    for (const x of xs) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bot);
      ctx.stroke();
    }
    ctx.restore();
  }

  const tensions = result.tensions;
  const tMax = Math.max(...tensions, 1e-6);
  const tMin = Math.min(...tensions);
  tensions.forEach((t, i) => {
    const u = (tMax - tMin) < 1e-3 ? 0.5 : (t - tMin) / (tMax - tMin);
    ctx.save();
    ctx.strokeStyle = lerpColor(color.tensionLow, color.tensionHigh, 0.2 + 0.8 * u);
    ctx.lineWidth = 3 + 8 * (t / tMax);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(xs[i], top);
    ctx.lineTo(xs[i], bot);
    ctx.stroke();
    const y = (top + bot) / 2;
    ctx.beginPath();
    ctx.fillStyle = color.canvas;
    ctx.arc(xs[i], y, compact ? 8 : 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color.effort;
    ctx.stroke();
    ctx.fillStyle = color.text;
    ctx.font = (compact ? 10 : 13) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), xs[i], y + 0.5);
    ctx.restore();
  });

  ctx.fillStyle = color.panel;
  ctx.fillRect(left - 10, top - 8, span + 20, 16);
  ctx.fillStyle = color.load;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(left - 10, bot - 8, span + 20, 16);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color.textDim;
  ctx.lineWidth = 2;
  for (const x of xs) {
    ctx.beginPath();
    ctx.arc(x, top, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, bot, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  const pullX = Math.min(w - 26, right + (compact ? 14 : 34));
  const last = tensions[n - 1];
  const uLast = (tMax - tMin) < 1e-3 ? 0.5 : (last - tMin) / (tMax - tMin);
  ctx.save();
  ctx.strokeStyle = lerpColor(color.tensionLow, color.tensionHigh, 0.2 + 0.8 * uLast);
  ctx.lineWidth = 3 + 8 * (last / tMax);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(xs[n - 1], top);
  ctx.quadraticCurveTo(pullX, top - 10, pullX, top + 8);
  ctx.lineTo(pullX, bot + 18);
  ctx.stroke();
  ctx.restore();

  const loadW = Math.min(84, Math.max(48, span * 0.4));
  const loadX = (xs[0] + xs[n - 1]) / 2 - loadW / 2;
  const loadY = bot + 18;
  const loadH = compact ? 24 : 30;
  ctx.fillStyle = color.load;
  ctx.fillRect(loadX, loadY, loadW, loadH);
  if (!compact) {
    ctx.font = "12px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#10211e";
    ctx.fillText(fmt(result.loadMass, 1) + " kg", loadX + loadW / 2, loadY + loadH / 2);
  }

  const maxF = Math.max(result.outputForce, result.appliedForce, result.ideal.appliedForce, 1e-6);
  const room = compact ? 42 : 64;
  const fLen = (force) => (force / maxF) * room;
  drawArrow(ctx, loadX + loadW / 2, loadY + loadH, Math.PI / 2, fLen(result.outputForce), color.load, compact ? 5 : 6, false);
  const pullTip = drawArrow(ctx, pullX, bot + 18, Math.PI / 2, fLen(result.appliedForce), color.effort, compact ? 5 : 7, false);
  if (ui.showIdeal) {
    drawArrow(ctx, pullX, bot + 18, Math.PI / 2, fLen(result.ideal.appliedForce), color.idealGhost, 3, true);
  }

  if (!compact) {
    const baseY = h - 36;
    const maxD = Math.max(result.ideal.inputDisplacement, result.ideal.outputDisplacement, 1e-6);
    const roomD = Math.max(30, w - left - 24);
    const dpx = roomD / maxD;
    drawRuler(ctx, left, baseY, 0, result.inputDisplacement * dpx, color.effort, "pull " + fmt(result.inputDisplacement, 2) + " m");
    drawRuler(ctx, left, baseY + 16, 0, result.outputDisplacement * dpx, color.load, "lift " + fmt(result.outputDisplacement, 2) + " m");
  }

  return {
    loadX, loadY, loadW, loadH, top, bot, left, right, pullTip,
    pxPerM: maxGap / 1.2
  };
}

function drawPlane(ctx, w, h, result, compact) {
  backdrop(ctx, w, h);
  const angle = result.angle;
  const compare = !compact && w > 620;
  const maxW = (compare ? w - 210 : w - 70);
  const maxH = h * (compact ? 0.46 : 0.50);
  const Lpx = Math.min(maxW / Math.cos(angle), maxH / Math.sin(angle));
  const run = Lpx * Math.cos(angle);
  const rise = Lpx * Math.sin(angle);
  const x0 = compact ? 28 : 56;
  const y0 = h * (compact ? 0.70 : 0.68);
  const x1 = x0 + run;
  const y1 = y0 - rise;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1, y0);
  ctx.closePath();
  ctx.fillStyle = "rgba(233,230,222,0.04)";
  ctx.fill();
  ctx.strokeStyle = color.border;
  ctx.lineWidth = 1;
  ctx.stroke();
  strokeLine(ctx, x0, y0, x1, y1, color.text, 3);
  strokeLine(ctx, x0 - 8, y0, compare ? x1 + 8 : Math.min(w - 16, x1 + 36), y0, color.textDim, 1.5);

  const off = 18;
  drawRuler(ctx, x0 + Math.sin(angle) * off, y0 - Math.cos(angle) * off, -angle, Lpx, color.effort, "");
  if (!compare) drawRuler(ctx, x1 + 16, y0, -Math.PI / 2, rise, color.load, "");

  const p = clamp(ui.plane.progress, 0.12, 0.88);
  const bx = x0 + run * p;
  const by = y0 - rise * p;
  const rot = -angle;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rot);
  ctx.fillStyle = color.load;
  ctx.fillRect(-16, -30, 32, 30);
  ctx.restore();

  const center = localToWorld(bx, by, 0, -15, rot);
  const back = localToWorld(bx, by, -20, -12, rot);
  const maxF = Math.max(result.weight, result.appliedForce, result.ideal.appliedForce, result.parallel, result.perpendicular, result.friction, 1e-6);
  const room = Math.min(h * 0.26, compare ? 78 : 88);
  const fLen = (force) => (force / maxF) * room;
  const up = -angle;
  const down = Math.PI - angle;

  drawArrow(ctx, center.x, center.y, Math.PI / 2, fLen(result.weight), color.load, compact ? 5 : 6, false);
  if (!compact) {
    drawArrow(ctx, center.x + 10, center.y - 4, down, fLen(result.parallel), color.text, 3, true);
    const into = Math.atan2(Math.cos(angle), Math.sin(angle));
    drawArrow(ctx, center.x - 6, center.y, into, fLen(result.perpendicular), color.textDim, 3, true);
    if (result.friction > 0.2) {
      drawArrow(ctx, bx, by, down, fLen(result.friction), color.workLost, 4, false);
    }
    ctx.font = "11px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    halo(ctx, "mg", center.x + 8, center.y + fLen(result.weight) * 0.55, color.load);
    halo(ctx, "mg sinθ", center.x + 14, center.y + 18, color.text);
    halo(ctx, "mg cosθ", center.x + fLen(result.perpendicular) * Math.sin(angle) + 6, center.y + fLen(result.perpendicular) * Math.cos(angle), color.textDim);
  }

  drawArrow(ctx, back.x, back.y, up, fLen(result.appliedForce), color.effort, compact ? 5 : 7, false);
  if (ui.showIdeal) {
    drawArrow(ctx, back.x, back.y, up, fLen(result.ideal.appliedForce), color.idealGhost, 3, true);
  }

  if (compare) {
    const col = Math.min(w - 78, x1 + 78);
    ctx.font = "12px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    halo(ctx, "straight up", col, 28, color.load);
    drawArrow(ctx, col - 16, 46, Math.PI / 2, fLen(result.weight), color.load, 6, false);
    drawRuler(ctx, col + 8, 46, Math.PI / 2, rise, color.load, fmt(result.height, 2) + " m");
    halo(ctx, fmt(result.weight, 0) + " N", col - 16, 46 + fLen(result.weight) + 14, color.load);
    halo(ctx, "along ramp", col, y0 + 22, color.effort);
    halo(ctx, fmt(result.appliedForce, 0) + " N · " + fmt(result.length, 2) + " m", col, y0 + 40, color.effort);
  }

  return { x0, y0, x1, y1, bx, by, angle, run, rise };
}

function drawWork(ctx, w, h, result) {
  backdrop(ctx, w, h);
  const ideal = result.ideal;
  const lifts = result.lifts;
  const dIn = lifts ? result.inputDisplacement : ideal.inputDisplacement;
  const dOut = ideal.outputDisplacement;
  const fIn = lifts ? result.appliedForce : 0;
  const usefulForce = lifts && result.inputDisplacement > 0 ? result.outputWork / result.inputDisplacement : 0;
  const lostForce = lifts ? Math.max(0, fIn - usefulForce) : 0;
  const maxD = Math.max(dIn, dOut, ideal.inputDisplacement, 1e-6);
  const maxF = Math.max(fIn, usefulForce + lostForce, result.outputForce, ideal.appliedForce, ideal.outputForce, 1e-6);
  const left = 18;
  const gap = 20;
  const bottom = h - 26;
  const colW = (w - left * 2 - gap) / 2;
  const plotH = bottom - 14;
  const pxM = (colW - 10) / maxD;
  const pxN = (plotH - 6) / maxF;
  const xIn = left;
  const xOut = left + colW + gap;

  ctx.strokeStyle = color.border;
  ctx.beginPath();
  ctx.moveTo(10, bottom + 0.5);
  ctx.lineTo(w - 10, bottom + 0.5);
  ctx.stroke();

  const inW = Math.max(0, dIn * pxM);
  const usefulH = Math.max(0, usefulForce * pxN);
  const lostH = Math.max(0, lostForce * pxN);
  ctx.fillStyle = color.effort;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(xIn, bottom - usefulH, inW, usefulH);
  ctx.globalAlpha = 1;
  if (lostH > 0.4) {
    ctx.fillStyle = color.workLost;
    ctx.fillRect(xIn, bottom - usefulH - lostH, inW, lostH);
    if (lostH > 12 && inW > 26) {
      ctx.font = "12px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      halo(ctx, "lost", xIn + Math.max(inW, 28) / 2, bottom - usefulH - lostH / 2, color.workLost);
    }
  }
  if (ui.showIdeal) {
    ctx.save();
    ctx.strokeStyle = color.idealGhost;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(xIn + 0.5, bottom - ideal.appliedForce * pxN + 0.5, Math.max(0, ideal.inputDisplacement * pxM), ideal.appliedForce * pxN);
    ctx.strokeRect(xOut + 0.5, bottom - ideal.outputForce * pxN + 0.5, Math.max(0, ideal.outputDisplacement * pxM), ideal.outputForce * pxN);
    ctx.restore();
  }
  const outW = (lifts ? result.outputDisplacement : 0) * pxM;
  const outH = (lifts ? result.outputForce : 0) * pxN;
  ctx.fillStyle = color.load;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(xOut, bottom - outH, outW, outH);
  ctx.globalAlpha = 1;

  ctx.font = "11px " + FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  halo(ctx, "input", xIn + colW / 2, h - 8, color.effort);
  halo(ctx, "output", xOut + colW / 2, h - 8, color.load);
}

function leverFraction() {
  const bar = ui.lever.barLength;
  if (ui.lever.leverClass === 1) return ui.lever.fulcrum / bar;
  if (ui.lever.leverClass === 2) return ui.lever.loadAt / bar;
  return ui.lever.effortAt / bar;
}

function applyFraction(frac) {
  const f = clamp(frac, 0.08, 0.92);
  const bar = ui.lever.barLength;
  if (ui.lever.leverClass === 1) ui.lever.fulcrum = f * bar;
  else if (ui.lever.leverClass === 2) ui.lever.loadAt = f * bar;
  else ui.lever.effortAt = f * bar;
}

function matchingPreset(lever) {
  for (const [key, preset] of Object.entries(LEVER_PRESETS)) {
    const geo = leverGeometry(preset);
    if (geo.leverClass !== lever.leverClass) continue;
    if (Math.abs(geo.effortArm - lever.effortArm) > 0.03) continue;
    if (Math.abs(geo.loadArm - lever.loadArm) > 0.03) continue;
    if (Math.abs(preset.loadMass - lever.loadMass) > 0.05) continue;
    if (Math.abs(lever.effortAngle) > 0.02) continue;
    if (lever.frictionTorque > 0.05) continue;
    return key;
  }
  return "";
}

function applyPreset(key) {
  const preset = LEVER_PRESETS[key];
  if (!preset) return;
  ui.lever.leverClass = preset.leverClass;
  ui.lever.barLength = preset.barLength;
  if (preset.fulcrum != null) ui.lever.fulcrum = preset.fulcrum;
  if (preset.loadAt != null) ui.lever.loadAt = preset.loadAt;
  if (preset.effortAt != null) ui.lever.effortAt = preset.effortAt;
  ui.lever.loadMass = preset.loadMass;
  ui.lever.angleDeg = 0;
  ui.lever.friction = 0;
  ui.lever.lift = 0.4;
  ui.lever.pushLocked = true;
}

const CLASS_NAME = { 1: "First class", 2: "Second class", 3: "Third class" };

function syncSlider(id, value, max) {
  const el = $(id);
  if (!el || activeSlider === el) return;
  if (max != null) el.max = String(max);
  el.value = String(value);
}

function fillReadout(name, result) {
  const root = document.querySelector(`[data-readout="${name}"]`);
  if (!root) return;
  const set = (key, text) => {
    const el = root.querySelector(`[data-k="${key}"]`);
    if (el) el.textContent = text;
  };
  set("appliedForce", fmt(result.appliedForce, 2) + " N");
  set("outputForce", fmt(result.outputForce, 2) + " N");
  set("inputDisplacement", fmt(result.inputDisplacement, 3) + " m");
  set("outputDisplacement", fmt(result.outputDisplacement, 3) + " m");
  set("inputWork", fmt(result.inputWork, 2) + " J");
  set("outputWork", fmt(result.outputWork, 2) + " J");
  set("idealMA", fmt(result.idealMA, 3));
  set("actualMA", result.actualMA == null ? "—" : fmt(result.actualMA, 3));
  set("efficiency", fmt(result.efficiency, 1) + "%");
}

function fillDist(name, result) {
  const root = document.querySelector(`[data-dist="${name}"]`);
  if (!root) return;
  const maxD = Math.max(result.ideal.inputDisplacement, result.ideal.outputDisplacement, 1e-6);
  root.querySelector('[data-bar="in"]').style.width = (result.inputDisplacement / maxD * 100) + "%";
  root.querySelector('[data-bar="out"]').style.width = (result.outputDisplacement / maxD * 100) + "%";
  root.querySelector('[data-k="din"]').textContent = fmt(result.inputDisplacement, 2) + " m";
  root.querySelector('[data-k="dout"]').textContent = fmt(result.outputDisplacement, 2) + " m";
}

function workCaption(result) {
  if (!result.lifts) return "Not enough force. The load stays put. The dashed rectangle is the ideal lift.";
  if (result.lostWork < 1e-3) {
    return `Areas match. W = (${fmt(result.appliedForce, 2)} N)(${fmt(result.inputDisplacement, 2)} m) = ${fmt(result.inputWork, 2)} J.`;
  }
  return `Useful ${fmt(result.outputWork, 2)} J. Input ${fmt(result.inputWork, 2)} J. Lost ${fmt(result.lostWork, 2)} J.`;
}

function setMeter(id, kind, real, max, ideal, lost) {
  const track = document.querySelector(`[data-wb="${id}"][data-kind="${kind}"]`);
  if (!track || !(max > 0)) return;
  const fill = track.querySelector(".meter-fill.effort");
  const lostEl = track.querySelector(".meter-lost");
  const ghost = track.querySelector(".meter-ghost");
  const load = track.querySelector(".meter-fill.load");
  if (kind === "work") {
    const useful = Math.max(0, real - (lost || 0));
    if (fill) fill.style.width = (useful / max * 100) + "%";
    if (lostEl) {
      lostEl.style.left = (useful / max * 100) + "%";
      lostEl.style.width = ((lost || 0) / max * 100) + "%";
    }
  } else if (fill) {
    fill.style.width = (real / max * 100) + "%";
  }
  if (ghost && ideal != null && kind !== "distance") ghost.style.left = (ideal / max * 100) + "%";
  if (kind === "distance" && ideal != null) {
    const bar = load || track.appendChild(Object.assign(document.createElement("div"), { className: "meter-fill load" }));
    bar.style.width = (ideal / max * 100) + "%";
  }
}

function fillStats(id, result) {
  const el = $(id);
  if (!el) return;
  el.replaceChildren();
  const rows = [
    ["Ideal MA", fmt(result.idealMA, 2)],
    ["Actual MA", result.actualMA == null ? "—" : fmt(result.actualMA, 2)],
    ["Efficiency", fmt(result.efficiency, 1) + "%"],
    ["Output", fmt(result.outputForce, 1) + " N"]
  ];
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.append(document.createTextNode(label + " "));
    const b = document.createElement("b");
    b.textContent = value;
    div.append(b);
    el.append(div);
  }
}

function updateTorque(result) {
  const scale = Math.max(Math.abs(result.tauLoad), Math.abs(result.tauEffort), 1);
  const deg = clamp(result.tauNet / scale, -1, 1) * 70;
  $("torqueNeedle").setAttribute("transform", `rotate(${deg} 180 120)`);
  $("torqueArc").setAttribute("stroke", color.border);
  $("torqueZero").setAttribute("stroke", color.idealGhost);
  $("torqueNeedleLine").setAttribute("stroke", color.effort);
  $("torqueHub").setAttribute("fill", color.load);
  $("torqueLeft").setAttribute("fill", color.load);
  $("torqueRight").setAttribute("fill", color.effort);
  $("torqueReadout").setAttribute("fill", color.text);
  $("torqueReadout").textContent = Math.abs(result.tauNet) < 0.005 ? "τ_net = 0" : "τ_net = " + fmt(result.tauNet, 2) + " N·m";
}

function updateCompare(lever) {
  const root = $("classCompare");
  const active = matchingPreset(lever);
  for (const btn of root.querySelectorAll("[data-preset]")) {
    const preset = LEVER_PRESETS[btn.dataset.preset];
    const sample = analyzeLever({ ...preset, g: G, effortAngle: 0, frictionTorque: 0, outputDisplacement: 0.2 });
    btn.classList.toggle("active", btn.dataset.preset === active);
    btn.querySelector(".k").textContent = CLASS_NAME[preset.leverClass];
    btn.querySelector(".nm").textContent = preset.name;
    btn.querySelector(".ma").textContent = "MA " + fmt(sample.idealMA, 2);
    btn.querySelector(".bl").textContent = `d_in ${fmt(sample.effortArm, 2)} m · d_out ${fmt(sample.loadArm, 2)} m`;
  }
  for (const btn of document.querySelectorAll("#leverPresets [data-preset]")) {
    btn.classList.toggle("active", btn.dataset.preset === active);
  }
}

function render() {
  let next;
  try {
    next = compute();
  } catch (err) {
    status("Model error", err.message);
    return;
  }
  model = next;
  readColors();
  const { lever, pulley, plane, bench } = model;

  const current = ui.mode === "workbench" ? bench
    : ui.mode === "lever" ? lever
    : ui.mode === "pulley" ? pulley
    : ui.mode === "plane" ? plane
    : null;
  publish(current);

  syncSlider("leverBar", ui.lever.barLength);
  syncSlider("leverSplit", leverFraction());
  syncSlider("leverMass", ui.lever.loadMass);
  syncSlider("leverAngle", ui.lever.angleDeg);
  syncSlider("leverLift", ui.lever.lift);
  syncSlider("leverFriction", ui.lever.friction);
  syncSlider("leverPush", lever.appliedForce, Math.max(20, lever.requiredForce * 2.5));
  syncSlider("pulleyMass", ui.pulley.loadMass);
  syncSlider("pulleyLift", ui.pulley.liftHeight);
  syncSlider("pulleyRatio", ui.pulley.frictionRatio);
  syncSlider("ropeDensity", ui.pulley.linearDensity);
  syncSlider("wheelMass", ui.pulley.pulleyMass);
  syncSlider("planeLength", ui.plane.length);
  syncSlider("planeAngle", ui.plane.angleDeg);
  syncSlider("planeMu", ui.plane.mu);
  syncSlider("planeMass", ui.plane.mass);
  syncSlider("planePush", plane.appliedForce, Math.max(20, plane.requiredForce * 2.5));
  syncSlider("benchMass", ui.bench.mass);
  syncSlider("benchHeight", ui.bench.height);

  $("leverBarLabel").textContent = "Bar length " + fmt(ui.lever.barLength, 2) + " m";
  const splitName = ui.lever.leverClass === 1 ? "Fulcrum from the effort" : ui.lever.leverClass === 2 ? "Load from the wheel" : "Effort from the pivot";
  $("leverSplitLabel").textContent = splitName + " " + fmt(leverFraction() * ui.lever.barLength, 2) + " m";
  $("leverMassLabel").textContent = "Load mass " + fmt(ui.lever.loadMass, 1) + " kg";
  $("leverAngleLabel").textContent = "Effort angle " + fmt(ui.lever.angleDeg, 0) + "° from perpendicular";
  $("leverLiftLabel").textContent = "Load moves " + fmt(ui.lever.lift, 2) + " m";
  $("leverFrictionLabel").textContent = "Pivot friction " + fmt(ui.lever.friction, 1) + " N·m";
  $("leverPushLabel").textContent = "Your push " + fmt(lever.appliedForce, 2) + " N";
  $("pulleyMassLabel").textContent = "Load mass " + fmt(ui.pulley.loadMass, 1) + " kg";
  $("pulleyLiftLabel").textContent = "Lift height " + fmt(ui.pulley.liftHeight, 2) + " m";
  $("pulleyRatioLabel").textContent = "Tension ratio r " + fmt(ui.pulley.frictionRatio, 2);
  $("ropeDensityLabel").textContent = "Rope density " + fmt(ui.pulley.linearDensity, 2) + " kg/m";
  $("wheelMassLabel").textContent = "Each movable pulley " + fmt(ui.pulley.pulleyMass, 2) + " kg";
  $("planeLengthLabel").textContent = "Ramp length " + fmt(plane.length, 2) + " m";
  $("planeAngleLabel").textContent = "Angle " + fmt(ui.plane.angleDeg, 1) + "°";
  $("planeMuLabel").textContent = "Friction μ " + fmt(ui.plane.mu, 2);
  $("planeMassLabel").textContent = "Load mass " + fmt(ui.plane.mass, 1) + " kg";
  $("planePushLabel").textContent = "Your push " + fmt(plane.appliedForce, 2) + " N";
  $("benchMassLabel").textContent = "Shared load " + fmt(ui.bench.mass, 1) + " kg · " + fmt(bench.outputForce, 1) + " N";
  $("benchHeightLabel").textContent = "Shared height " + fmt(ui.bench.height, 2) + " m · " + fmt(bench.outputWork, 1) + " J useful";

  $("pulleyRatio").disabled = !ui.pulley.frictionOn;
  $("ropeDensity").disabled = !ui.pulley.massOn;
  $("wheelMass").disabled = !ui.pulley.massOn;
  $("pulleyFriction").checked = ui.pulley.frictionOn;
  $("pulleyMassOn").checked = ui.pulley.massOn;
  for (const id of ["leverIdeal", "pulleyIdeal", "planeIdeal"]) $(id).checked = ui.showIdeal;
  for (const btn of document.querySelectorAll("[data-segments]")) {
    btn.classList.toggle("active", Number(btn.dataset.segments) === ui.pulley.segments);
  }

  $("leverTitle").textContent = CLASS_NAME[lever.leverClass] + " · " + (lever.leverClass === 1 ? "seesaw" : lever.leverClass === 2 ? "wheelbarrow" : "tweezers");
  $("leverEq").textContent =
    `τ_net = ${fmt(lever.tauEffort, 2)} − ${fmt(lever.tauLoad, 2)} − ${fmt(lever.tauFriction, 2)} = ${fmt(lever.tauNet, 2)} N·m\n` +
    `Ideal MA = d_in/d_out = ${fmt(lever.idealMA, 3)}    W = Fd`;
  $("pulleyEq").textContent =
    `Ideal MA = ${pulley.supportingSegments} supporting segments\n` +
    `Pull ${fmt(pulley.pullDistance, 2)} m = ${pulley.supportingSegments} × ${fmt(pulley.liftHeight, 2)} m    W = Fd`;
  $("planeEq").textContent =
    `Ideal MA = L/h = 1/sinθ = ${fmt(plane.idealMA, 3)}\n` +
    `F = mg sinθ + μ mg cosθ = ${fmt(plane.requiredForce, 2)} N    W = Fd`;

  fillReadout("lever", lever);
  fillReadout("pulley", pulley);
  fillReadout("plane", plane);
  fillDist("lever", lever);
  fillDist("pulley", pulley);
  fillDist("plane", plane);
  $("leverWorkCaption").textContent = workCaption(lever);
  $("pulleyWorkCaption").textContent = workCaption(pulley);
  $("planeWorkCaption").textContent = workCaption(plane);
  updateTorque(lever);
  updateCompare(lever);

  const trio = [bench.lever, bench.pulley, bench.plane];
  const maxF = Math.max(...trio.map((m) => Math.max(m.appliedForce, m.ideal.appliedForce)));
  const maxD = Math.max(...trio.map((m) => Math.max(m.inputDisplacement, m.outputDisplacement)));
  const maxW = Math.max(...trio.map((m) => Math.max(m.inputWork, m.outputWork)));
  for (const m of trio) {
    setMeter(m.machine, "force", m.appliedForce, maxF, m.ideal.appliedForce, 0);
    setMeter(m.machine, "distance", m.inputDisplacement, maxD, m.outputDisplacement, 0);
    setMeter(m.machine, "work", m.inputWork, maxW, null, m.lostWork);
    const val = (kind) => document.querySelector(`[data-wb-val="${m.machine}-${kind}"]`);
    val("force").textContent = fmt(m.appliedForce, 1) + " N  ·  ideal " + fmt(m.ideal.appliedForce, 1) + " N";
    val("distance").textContent = fmt(m.inputDisplacement, 2) + " m in  ·  " + fmt(m.outputDisplacement, 2) + " m out";
    val("work").textContent = fmt(m.inputWork, 1) + " J in  ·  " + fmt(m.outputWork, 1) + " J out";
  }
  fillStats("wbLeverStats", bench.lever);
  fillStats("wbPulleyStats", bench.pulley);
  fillStats("wbPlaneStats", bench.plane);

  drawIf($("leverCanvas"), ({ ctx, w, h }) => {
    $("leverCanvas")._hit = drawLever(ctx, w, h, lever, false);
  });
  drawIf($("pulleyCanvas"), ({ ctx, w, h }) => {
    $("pulleyCanvas")._hit = drawPulley(ctx, w, h, pulley, false);
  });
  drawIf($("planeCanvas"), ({ ctx, w, h }) => {
    $("planeCanvas")._hit = drawPlane(ctx, w, h, plane, false);
  });
  drawIf($("leverWork"), ({ ctx, w, h }) => drawWork(ctx, w, h, lever));
  drawIf($("pulleyWork"), ({ ctx, w, h }) => drawWork(ctx, w, h, pulley));
  drawIf($("planeWork"), ({ ctx, w, h }) => drawWork(ctx, w, h, plane));
  drawIf($("wbLever"), ({ ctx, w, h }) => drawLever(ctx, w, h, bench.lever, true));
  drawIf($("wbPulley"), ({ ctx, w, h }) => drawPulley(ctx, w, h, bench.pulley, true));
  drawIf($("wbPlane"), ({ ctx, w, h }) => drawPlane(ctx, w, h, bench.plane, true));

  if (ui.mode === "workbench") {
    status(
      "Workbench — same load, same height",
      `Every card lifts ${fmt(bench.mass, 1)} kg through ${fmt(bench.height, 2)} m. Useful work ${fmt(bench.outputWork, 2)} J. ` +
      `Lever η ${fmt(bench.lever.efficiency, 1)}% · pulley η ${fmt(bench.pulley.efficiency, 1)}% · plane η ${fmt(bench.plane.efficiency, 1)}%. ` +
      "Dashed marks are the ideal force. A red sliver is work lost to friction or extra mass."
    );
  } else if (ui.mode === "lever") {
    status(
      lever.balanced ? CLASS_NAME[lever.leverClass] + " — balanced, τ_net = 0" : CLASS_NAME[lever.leverClass] + " — not balanced",
      `Ideal MA ${fmt(lever.idealMA, 3)} = d_in/d_out. Actual MA ${lever.actualMA == null ? "—" : fmt(lever.actualMA, 3)} from the forces. ` +
      `Input ${fmt(lever.inputDisplacement, 3)} m, output ${fmt(lever.outputDisplacement, 3)} m. ` +
      (lever.frictionTorque > 0 ? "Pivot friction makes the real push larger than the ghost." : "Friction is off, so the ideal ghost sits on the real arrow.")
    );
  } else if (ui.mode === "pulley") {
    const t0 = pulley.tensions[0];
    const tN = pulley.tensions[pulley.tensions.length - 1];
    status(
      (pulley.segments === 1 ? "Fixed pulley" : pulley.segments === 2 ? "Movable pulley" : "Block and tackle") + " — " + pulley.segments + " supporting segments",
      `Ideal MA = ${pulley.segments}. Pull ${fmt(pulley.pullDistance, 3)} m to lift ${fmt(pulley.liftHeight, 3)} m. ` +
      `Tension ${fmt(t0, 2)} N → ${fmt(tN, 2)} N. Efficiency ${fmt(pulley.efficiency, 1)}%. ` +
      (pulley.pulleyFriction || pulley.extraMass > 0 ? "The solid rope is the real machine. The dashed rope is ideal." : "Friction and extra mass are off, so every segment carries the same tension.")
    );
  } else if (ui.mode === "plane") {
    status(
      fmt(ui.plane.angleDeg, 1) + "° ramp — ideal MA " + fmt(plane.idealMA, 3),
      `L/h = 1/sinθ = ${fmt(plane.length, 3)}/${fmt(plane.height, 3)}. Straight up is ${fmt(plane.weight, 1)} N over ${fmt(plane.height, 3)} m. ` +
      `Along the ramp, a steady lift takes ${fmt(plane.requiredForce, 1)} N over ${fmt(plane.length, 3)} m. ` +
      (plane.mu > 0 ? `μ = ${fmt(plane.mu, 2)} drops efficiency to ${fmt(plane.efficiency, 1)}%.` : "No friction, so the areas match.")
    );
  } else {
    const info = LATER_PHASES[ui.mode];
    status((info ? info.title : ui.mode) + " — later phase", info ? info.hook : "This tab is reserved.");
  }
}

function pointerPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function hitLever(pt, hit, result) {
  if (!hit) return null;
  const near = (x, y, r = 30) => {
    const dx = pt.x - x;
    const dy = pt.y - y;
    return dx * dx + dy * dy <= r * r;
  };
  if (hit.tip && near(hit.tip.x2, hit.tip.y2, 32)) return "angle";
  if (result.leverClass === 1 && (near(hit.xf, hit.barY, 34) || near(hit.xf, hit.barY + 18, 34))) return "fulcrum";
  if (result.leverClass === 2 && near(hit.xl, hit.barY, 34)) return "load";
  if (result.leverClass === 3 && near(hit.xe, hit.barY, 34)) return "effort";
  return null;
}

function hitPulley(pt, hit) {
  if (!hit) return null;
  if (pt.x >= hit.loadX - 12 && pt.x <= hit.loadX + hit.loadW + 12 && pt.y >= hit.loadY - 16 && pt.y <= hit.loadY + hit.loadH + 36) return "load";
  return null;
}

function hitPlane(pt, hit) {
  if (!hit) return null;
  const tipDx = pt.x - hit.x1;
  const tipDy = pt.y - hit.y1;
  if (tipDx * tipDx + tipDy * tipDy <= 34 * 34) return "angle";
  const dx = pt.x - hit.bx;
  const dy = pt.y - hit.by;
  if (dx * dx + dy * dy <= 40 * 40) return "block";
  return null;
}

function bindDrag(canvas, picker) {
  canvas.addEventListener("pointerdown", (event) => {
    if (!model) return;
    const pt = pointerPoint(canvas, event);
    const target = picker(pt, canvas._hit);
    if (!target) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drag = {
      canvas,
      target,
      pointerId: event.pointerId,
      startY: pt.y,
      startLift: ui.pulley.liftHeight,
      pxPerM: canvas._hit && canvas._hit.pxPerM ? canvas._hit.pxPerM : 80
    };
    render();
    emit("dragstart", target);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || drag.canvas !== canvas) return;
    const pt = pointerPoint(canvas, event);
    const hit = canvas._hit;
    if (!hit || !model) return;
    if (canvas.id === "leverCanvas") {
      if (drag.target === "angle") {
        const dx = pt.x - hit.xe;
        const dy = pt.y - hit.barY;
        const screen = Math.atan2(dy, dx);
        const base = model.lever.leverClass === 1 ? Math.PI / 2 : -Math.PI / 2;
        let delta = screen - base;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        ui.lever.angleDeg = clamp(delta * 180 / Math.PI, -70, 70);
      } else {
        const meters = clamp(((pt.x - hit.margin) / hit.usable) * hit.barLength, hit.barLength * 0.08, hit.barLength * 0.92);
        if (drag.target === "fulcrum") ui.lever.fulcrum = meters;
        if (drag.target === "load") ui.lever.loadAt = meters;
        if (drag.target === "effort") ui.lever.effortAt = meters;
      }
    } else if (canvas.id === "pulleyCanvas" && drag.target === "load") {
      ui.pulley.liftHeight = clamp(drag.startLift + (pt.y - drag.startY) / drag.pxPerM, 0.1, 1.2);
    } else if (canvas.id === "planeCanvas") {
      if (drag.target === "angle") {
        const dx = pt.x - hit.x0;
        const dy = hit.y0 - pt.y;
        if (dx > 8) ui.plane.angleDeg = clamp(Math.atan2(dy, dx) * 180 / Math.PI, 8, 65);
      } else if (drag.target === "block") {
        const proj = (pt.x - hit.x0) * Math.cos(hit.angle) + (hit.y0 - pt.y) * Math.sin(hit.angle);
        ui.plane.progress = clamp(proj / Math.max(hit.run, 1), 0.12, 0.88);
      }
    }
  });
  const end = (event) => {
    if (!drag || drag.canvas !== canvas) return;
    const target = drag.target;
    drag = null;
    render();
    emit("released", target);
    if (event && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

function bindRange(id, onInput) {
  const el = $(id);
  el.addEventListener("pointerdown", () => { activeSlider = el; });
  const clear = () => { if (activeSlider === el) activeSlider = null; };
  el.addEventListener("pointerup", clear);
  el.addEventListener("pointercancel", clear);
  el.addEventListener("blur", clear);
  el.addEventListener("input", () => onInput(Number(el.value)));
}

function setMode(id, writeUrl) {
  if (!MODES.some((m) => m.id === id)) id = "workbench";
  ui.mode = id;
  document.querySelectorAll("#tabs [data-mode]").forEach((btn) => {
    const on = btn.dataset.mode === id;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
    btn.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll(".mode").forEach((panel) => {
    panel.hidden = panel.id !== "mode-" + id;
  });
  document.body.dataset.mode = id;
  const tab = $("tab-" + id);
  if (tab) tab.scrollIntoView({ inline: "nearest", block: "nearest" });
  if (writeUrl) {
    const url = new URL(location.href);
    url.searchParams.set("mode", id);
    history.replaceState(null, "", url);
  }
}

function buildTabs() {
  const tabs = $("tabs");
  for (const def of MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (def.phase > 1 ? " later" : "");
    btn.dataset.mode = def.id;
    btn.id = "tab-" + def.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", "mode-" + def.id);
    btn.append(document.createTextNode(def.label));
    if (def.phase > 1) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Later";
      btn.append(badge);
    }
    btn.addEventListener("click", () => setMode(def.id, true));
    tabs.append(btn);
  }
  tabs.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const buttons = [...tabs.querySelectorAll("[data-mode]")];
    const index = Math.max(0, buttons.findIndex((btn) => btn.dataset.mode === ui.mode));
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const next = buttons[(index + dir + buttons.length) % buttons.length];
    next.focus();
    setMode(next.dataset.mode, true);
    event.preventDefault();
  });
}

function buildReadouts() {
  const tiles = [
    ["appliedForce", "Applied force", "N", "effort"],
    ["outputForce", "Output force", "N", "load"],
    ["inputDisplacement", "Input distance", "m", ""],
    ["outputDisplacement", "Output distance", "m", ""],
    ["inputWork", "Input work", "J = F d", "effort"],
    ["outputWork", "Useful output", "J = F d", "load"],
    ["idealMA", "Ideal MA", "geometry", "ideal"],
    ["actualMA", "Actual MA", "forces", ""],
    ["efficiency", "Efficiency", "out / in × 100%", ""]
  ];
  for (const name of ["lever", "pulley", "plane"]) {
    const root = document.querySelector(`[data-readout="${name}"]`);
    for (const [key, label, sub, kind] of tiles) {
      const tile = document.createElement("div");
      tile.className = "tile" + (kind === "ideal" ? " tile-ideal" : "");
      const l = document.createElement("div");
      l.className = "l";
      l.textContent = label;
      const v = document.createElement("div");
      v.className = "v" + (kind === "effort" || kind === "load" ? " " + kind : "");
      v.dataset.k = key;
      v.textContent = "—";
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = sub;
      tile.append(l, v, s);
      root.append(tile);
    }
  }
}

function buildCompare() {
  const root = $("classCompare");
  for (const key of ["seesaw", "wheelbarrow", "tweezers"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.preset = key;
    btn.innerHTML = '<div class="k"></div><div class="nm"></div><div class="ma"></div><div class="bl"></div>';
    btn.addEventListener("click", () => applyPreset(key));
    root.append(btn);
  }
}

function buildLater() {
  const row = $("laterRow");
  for (const id of ["wheel-axle", "wedge", "screw"]) {
    const info = LATER_PHASES[id];
    const card = document.createElement("article");
    card.className = "card later-mini";
    const h = document.createElement("h2");
    h.textContent = info.title;
    const p = document.createElement("p");
    p.textContent = info.hook;
    card.append(h, p);
    row.append(card);
  }
  for (const [id, info] of Object.entries(LATER_PHASES)) {
    const hook = document.querySelector(`#mode-${id} .hook`);
    if (hook) hook.textContent = info.hook;
  }
}

function wire() {
  buildTabs();
  buildReadouts();
  buildCompare();
  buildLater();

  document.addEventListener("click", (event) => {
    const back = event.target.closest && event.target.closest("[data-study-back]");
    if (!back) return;
    event.preventDefault();
    location.href = "study.html" + location.search;
  });
  $("controlsJumpBtn").addEventListener("click", () => {
    const panel = document.querySelector(`#mode-${ui.mode} .controls, #mode-${ui.mode} .wb-controls`);
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("resetBtn").addEventListener("click", () => {
    if (ui.mode === "lever") ui.lever = { ...INITIAL.lever };
    else if (ui.mode === "pulley") ui.pulley = { ...INITIAL.pulley };
    else if (ui.mode === "plane") ui.plane = { ...INITIAL.plane };
    else ui.bench = { ...INITIAL.bench };
    if (ui.mode === "workbench") {
      ui.lever = { ...INITIAL.lever };
      ui.pulley = { ...INITIAL.pulley };
      ui.plane = { ...INITIAL.plane };
    }
  });

  for (const btn of document.querySelectorAll("#leverPresets [data-preset]")) {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  }
  for (const btn of document.querySelectorAll("[data-segments]")) {
    btn.addEventListener("click", () => { ui.pulley.segments = Number(btn.dataset.segments); });
  }

  bindRange("leverBar", (value) => {
    const frac = leverFraction();
    ui.lever.barLength = value;
    applyFraction(frac);
  });
  bindRange("leverSplit", (value) => applyFraction(value));
  bindRange("leverMass", (value) => { ui.lever.loadMass = value; });
  bindRange("leverAngle", (value) => { ui.lever.angleDeg = value; });
  bindRange("leverLift", (value) => { ui.lever.lift = value; });
  bindRange("leverFriction", (value) => { ui.lever.friction = value; });
  bindRange("leverPush", (value) => { ui.lever.pushLocked = false; ui.lever.push = value; });
  $("leverBalance").addEventListener("click", () => { ui.lever.pushLocked = true; });
  $("leverIdeal").addEventListener("change", () => { ui.showIdeal = $("leverIdeal").checked; });

  bindRange("pulleyMass", (value) => { ui.pulley.loadMass = value; });
  bindRange("pulleyLift", (value) => { ui.pulley.liftHeight = value; });
  bindRange("pulleyRatio", (value) => { ui.pulley.frictionRatio = value; });
  bindRange("ropeDensity", (value) => { ui.pulley.linearDensity = value; });
  bindRange("wheelMass", (value) => { ui.pulley.pulleyMass = value; });
  $("pulleyFriction").addEventListener("change", () => { ui.pulley.frictionOn = $("pulleyFriction").checked; });
  $("pulleyMassOn").addEventListener("change", () => { ui.pulley.massOn = $("pulleyMassOn").checked; });
  $("pulleyIdeal").addEventListener("change", () => { ui.showIdeal = $("pulleyIdeal").checked; });

  bindRange("planeLength", (value) => { ui.plane.length = value; });
  bindRange("planeAngle", (value) => { ui.plane.angleDeg = value; });
  bindRange("planeMu", (value) => { ui.plane.mu = value; });
  bindRange("planeMass", (value) => { ui.plane.mass = value; });
  bindRange("planePush", (value) => { ui.plane.pushLocked = false; ui.plane.push = value; });
  $("planeBalance").addEventListener("click", () => { ui.plane.pushLocked = true; });
  $("planeIdeal").addEventListener("change", () => { ui.showIdeal = $("planeIdeal").checked; });

  bindRange("benchMass", (value) => { ui.bench.mass = value; });
  bindRange("benchHeight", (value) => { ui.bench.height = value; });

  bindDrag($("leverCanvas"), (pt, hit) => hitLever(pt, hit, model.lever));
  bindDrag($("pulleyCanvas"), (pt, hit) => hitPulley(pt, hit));
  bindDrag($("planeCanvas"), (pt, hit) => hitPlane(pt, hit));

  const params = new URLSearchParams(location.search);
  const raw = (params.get("mode") || "").toLowerCase();
  if (raw === "wheelbarrow" || raw === "tweezers" || raw === "seesaw") applyPreset(raw);
  if (raw === "fixed") ui.pulley.segments = 1;
  if (raw === "movable") ui.pulley.segments = 2;
  if (raw === "tackle" || raw === "block" || raw === "block-and-tackle") ui.pulley.segments = 4;
  setMode(MODE_ALIASES[raw] || "workbench", false);
}

wire();
window.addEventListener("resize", () => render());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
function loop() {
  try {
    render();
  } catch (err) {
    console.error(err);
    status("Sandbox error", err.message);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
