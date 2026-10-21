/**
 * Wheel, wedge, screw, free-build, identify, and guided labs.
 *
 * Drawings read machines-theme.css every frame through the shared `color`
 * object. A stage card's snap animation is paint only — analyzeBuild()
 * runs on the real stage list the same frame the card appears.
 *
 * Simplifications drawn on purpose:
 * - Wedge MA is the textbook ratio L/t (one equivalent inclined plane),
 *   while the cutaway still shows both faces.
 * - Screw pitch ticks are spaced so a turn is visible. Rulers are labeled
 *   in true meters. The unrolled ramp keeps a visible rise when the true
 *   slope would be a hairline; the ball still tracks the fractional turn.
 */
import {
  G, WHEEL_PRESETS, BUILD_CHALLENGES, IDENTIFY_ITEMS, MACHINE_TYPES, analyzeBuild
} from "./machines-physics.js";

const GUIDED = [
  {
    id: "lever",
    label: "Lever",
    formula: "Ideal MA = d_in / d_out",
    predict: "Read the effort arm and the load arm. Predict the ideal MA for a perpendicular push.",
    choices: [
      ["din", "d_in / d_out, for every class"],
      ["swap", "d_out / d_in"],
      ["class", "1, 2, or 3, the class number"]
    ],
    answer: "din",
    because: "The class only decides which arm is longer. Ideal MA is still the distance ratio."
  },
  {
    id: "pulley",
    label: "Pulley",
    formula: "Ideal MA = n supporting segments",
    predict: "Count the supporting rope segments. That count is the ideal MA.",
    choices: [
      ["n", "the number of supporting segments"],
      ["two", "always 2"],
      ["mass", "the load mass"]
    ],
    answer: "n",
    because: "Each supporting segment shares the load, and the pull is n times the lift."
  },
  {
    id: "plane",
    label: "Inclined plane",
    formula: "Ideal MA = L / h = 1 / sinθ",
    predict: "Predict L/h from the ramp length and the vertical height.",
    choices: [
      ["Lh", "L / h"],
      ["hL", "h / L"],
      ["mu", "the friction coefficient μ"]
    ],
    answer: "Lh",
    because: "A longer slope for the same height multiplies distance and divides force."
  },
  {
    id: "wheel-axle",
    label: "Wheel & axle",
    formula: "Ideal MA = R / r",
    predict: "Predict R/r with the effort on the rim. Reversed mode uses r/R.",
    choices: [
      ["Rr", "R / r when the effort is on the rim"],
      ["add", "R + r"],
      ["Lt", "L / t"]
    ],
    answer: "Rr",
    because: "Both circles turn through the same angle, so the distances — and the ideal MA — are the two radii."
  },
  {
    id: "wedge",
    label: "Wedge",
    formula: "Ideal MA = L / t",
    predict: "Predict L/t from the length and the thickness.",
    choices: [
      ["Lt", "L / t"],
      ["tL", "t / L"],
      ["two", "2L / t"]
    ],
    answer: "Lt",
    because: "Pushing the wedge its own length L separates the block by the thickness t. This lab uses that textbook ratio."
  },
  {
    id: "screw",
    label: "Screw",
    formula: "Ideal MA = 2πR / p",
    predict: "Predict 2πR/p. One turn of the handle lifts the load by one pitch.",
    choices: [
      ["circ", "2πR / p"],
      ["pitch", "p / R"],
      ["n", "the number of threads you can see"]
    ],
    answer: "circ",
    because: "The hand travels the circumference while the load rises one pitch. The ramp on the right is that unrolled turn."
  }
];

const ICONS = {
  scissors: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-lever" d="M24 27 L9 8"/><path class="part-lever" d="M24 27 L39 8"/><path class="part-wedge" d="M11 12 L9 8"/><path class="part-wedge" d="M37 12 L39 8"/><circle cx="24" cy="27" r="2.4"/><path d="M24 27 L15 40"/><path d="M24 27 L33 40"/><circle cx="13" cy="40" r="5"/><circle cx="35" cy="40" r="5"/></svg>`,
  doorknob: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><rect x="8" y="10" width="32" height="28" rx="3"/><circle class="part-wheel" cx="24" cy="24" r="9"/><circle class="part-wheel" cx="24" cy="24" r="2"/></svg>`,
  ramp: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-incline" d="M6 38 H42 V16"/><path class="part-incline" d="M6 38 L42 16"/><rect x="26" y="18" width="9" height="8"/></svg>`,
  "jar-lid": `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><circle cx="24" cy="24" r="14"/><circle class="part-screw" cx="24" cy="24" r="8"/><path class="part-screw" d="M17 20 H31"/><path class="part-screw" d="M16 24 H32"/><path class="part-screw" d="M17 28 H31"/></svg>`,
  axe: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path d="M16 42 L26 12"/><path class="part-wedge" d="M26 8 L38 16 L26 24 Z"/></svg>`,
  flagpole: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path d="M14 42 V8"/><circle class="part-pulley" cx="14" cy="10" r="3.5"/><path class="part-pulley" d="M14 13.5 V32"/><path d="M17.5 10 H38 L31 17 H17.5"/></svg>`,
  "bottle-opener": `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-lever" d="M8 36 L32 14"/><path class="part-lever" d="M28 12 H40 V22"/><circle cx="10" cy="38" r="2.2"/></svg>`,
  tweezers: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-lever" d="M16 42 C16 26 22 16 24 8"/><path class="part-lever" d="M32 42 C32 26 26 16 24 8"/></svg>`,
  screwdriver: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-wheel" d="M6 18 H20 V30 H6 Z"/><path d="M20 24 H40"/><path d="M40 20 V28"/></svg>`,
  wheelbarrow: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><circle cx="14" cy="34" r="6"/><path class="part-lever" d="M14 34 H42"/><path class="part-lever" d="M18 34 L24 18 H36 L42 34"/></svg>`,
  knife: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-wedge" d="M6 32 L34 12 L28 20 Z"/><path d="M30 18 L44 24"/></svg>`,
  stairs: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-incline" d="M8 40 H18 V30 H28 V20 H38 V10 H44"/></svg>`,
  seesaw: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path d="M24 28 L14 40 H34 Z"/><path class="part-lever" d="M6 26 H42"/><circle cx="12" cy="22" r="3"/><circle cx="36" cy="20" r="4"/></svg>`,
  crowbar: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-lever" d="M12 42 L30 16 H42"/><circle cx="28" cy="22" r="2.2"/></svg>`,
  nutcracker: `<svg viewBox="0 0 48 48" class="icon-art" aria-hidden="true"><path class="part-lever" d="M10 14 H32 L42 24 L32 34 H10"/><path class="part-lever" d="M10 14 V34"/><circle cx="24" cy="24" r="3.2"/></svg>`
};

let api = null;
let drag = null;
let stageSerial = 1;
const seenStages = new Set();
let pipelineSig = "";
let guidedMachineDrawn = "";

function $(id) { return api.$(id); }
function fmt(n, d) { return api.fmt(n, d); }
function clamp(x, a, b) { return api.clamp(x, a, b); }

function freshGuided(machine) {
  return {
    machine: machine || "lever",
    locked: false,
    prediction: null,
    measured: false,
    graphed: false,
    justified: false,
    choice: "",
    hint: ""
  };
}

function freshIdentify() {
  return {
    selected: "scissors",
    chosen: {},
    leverClass: 0,
    revealed: false,
    solved: {},
    feedback: "",
    ok: false
  };
}

function stageId() {
  stageSerial += 1;
  return "st" + stageSerial;
}

function normalizeStage(spec, id) {
  const stage = { ...spec, id: id || stageId() };
  if (stage.machine === "plane" && stage.angle != null && stage.angleDeg == null) {
    stage.angleDeg = stage.angle * 180 / Math.PI;
    delete stage.angle;
  }
  if (stage.machine === "pulley" && stage.frictionRatio == null) stage.frictionRatio = 1.15;
  if (stage.machine === "lever" && stage.frictionTorque == null) stage.frictionTorque = 0;
  return stage;
}

function freshBuild(challengeId) {
  const challenge = BUILD_CHALLENGES.find((item) => item.id === challengeId) || BUILD_CHALLENGES[0];
  return {
    challenge: challenge.id,
    stages: challenge.starter.map((spec, index) => normalizeStage(spec, "c-" + challenge.id + "-" + index + "-" + spec.machine))
  };
}

function defaultStage(machine) {
  if (machine === "lever") return normalizeStage({ machine, leverClass: 1, effortArm: 1.2, loadArm: 0.4, effortAngle: 0, frictionTorque: 0 });
  if (machine === "pulley") return normalizeStage({ machine, segments: 4, pulleyFriction: false, frictionRatio: 1.15 });
  if (machine === "plane") return normalizeStage({ machine, angleDeg: 25, mu: 0.1 });
  if (machine === "wheel-axle") return normalizeStage({ machine, wheelRadius: 0.2, axleRadius: 0.05, reversed: false, frictionTorque: 0 });
  if (machine === "wedge") return normalizeStage({ machine, length: 0.24, thickness: 0.06, mu: 0.1, deformation: 0 });
  return normalizeStage({ machine: "screw", handleRadius: 0.12, pitch: 0.01, mu: 0.1 });
}

function clampStage(stage) {
  if (stage.machine === "lever") {
    stage.effortArm = clamp(stage.effortArm, 0.1, 3);
    stage.loadArm = clamp(stage.loadArm, 0.1, 3);
    stage.frictionTorque = clamp(stage.frictionTorque || 0, 0, 40);
    stage.leverClass = [1, 2, 3].includes(stage.leverClass) ? stage.leverClass : 1;
  } else if (stage.machine === "pulley") {
    stage.segments = clamp(Math.round(stage.segments || 1), 1, 6);
    stage.frictionRatio = clamp(stage.frictionRatio || 1, 1, 1.6);
  } else if (stage.machine === "plane") {
    stage.angleDeg = clamp(stage.angleDeg, 8, 65);
    stage.mu = clamp(stage.mu || 0, 0, 1);
  } else if (stage.machine === "wheel-axle") {
    stage.wheelRadius = clamp(stage.wheelRadius, 0.02, 0.6);
    stage.axleRadius = clamp(stage.axleRadius, 0.004, stage.wheelRadius * 0.92);
    stage.frictionTorque = clamp(stage.frictionTorque || 0, 0, 20);
  } else if (stage.machine === "wedge") {
    stage.length = clamp(stage.length, 0.08, 0.5);
    stage.thickness = clamp(stage.thickness, 0.01, stage.length * 0.9);
    stage.mu = clamp(stage.mu || 0, 0, 0.8);
    stage.deformation = clamp(stage.deformation || 0, 0, 0.4);
  } else if (stage.machine === "screw") {
    stage.handleRadius = clamp(stage.handleRadius, 0.04, 0.4);
    const maxPitch = Math.min(0.04, 2 * Math.PI * stage.handleRadius * 0.8);
    stage.pitch = clamp(stage.pitch, 0.002, maxPitch);
    stage.mu = clamp(stage.mu || 0, 0, 0.6);
  }
}

function toSpec(stage) {
  if (stage.machine === "plane") return { machine: "plane", angle: stage.angleDeg * Math.PI / 180, mu: stage.mu || 0 };
  if (stage.machine === "pulley") {
    return {
      machine: "pulley",
      segments: stage.segments,
      pulleyFriction: !!stage.pulleyFriction,
      frictionRatio: stage.pulleyFriction ? stage.frictionRatio : 1
    };
  }
  const copy = { ...stage };
  delete copy.id;
  delete copy.angleDeg;
  return copy;
}

function point(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function bindPointer(canvas, pick, move) {
  if (!canvas) return;
  canvas.addEventListener("pointerdown", (event) => {
    const pt = point(canvas, event);
    const target = pick(pt, canvas._hit);
    if (!target) return;
    event.preventDefault();
    try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* synthetic or lost pointers */ }
    drag = {
      canvas,
      target,
      pointerId: event.pointerId,
      startX: pt.x,
      startY: pt.y,
      startAng: canvas._hit ? Math.atan2(pt.y - (canvas._hit.cy || canvas._hit.hy || 0), pt.x - (canvas._hit.cx || canvas._hit.hx || 0)) : 0,
      startTurns: target === "screw" ? api.ui.screw.revolutions : api.ui.wheel.revolutions,
      startPen: api.ui.wedge.penetration
    };
    if (canvas._hit && target === "screw") {
      drag.startAng = Math.atan2(pt.y - canvas._hit.hy, pt.x - canvas._hit.hx);
    }
    if (canvas._hit && target === "wheel") {
      drag.startAng = Math.atan2(pt.y - canvas._hit.cy, pt.x - canvas._hit.cx);
    }
    api.render();
    api.emit("dragstart", target);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || drag.canvas !== canvas) return;
    move(point(canvas, event), drag, canvas._hit);
  });
  const end = (event) => {
    if (!drag || drag.canvas !== canvas) return;
    const target = drag.target;
    drag = null;
    api.render();
    api.emit("released", target);
    if (event && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

function arcArrow(ctx, cx, cy, radius, start, end, stroke, width) {
  if (!(radius > 4) || !(Math.abs(end - start) > 0.05)) return;
  const color = api.color;
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end, false);
  ctx.stroke();
  const x = cx + Math.cos(end) * radius;
  const y = cy + Math.sin(end) * radius;
  const tx = Math.cos(end + Math.PI / 2);
  const ty = Math.sin(end + Math.PI / 2);
  const head = Math.max(8, width * 2.2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - tx * head + Math.cos(end) * head * 0.45, y - ty * head + Math.sin(end) * head * 0.45);
  ctx.lineTo(x - tx * head - Math.cos(end) * head * 0.45, y - ty * head - Math.sin(end) * head * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return color;
}

function drawSilhouette(ctx, preset, cx, cy, Rpx) {
  const color = api.color;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = color.mWheel;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (preset === "steering") {
    ctx.beginPath();
    ctx.arc(cx, cy, Rpx * 1.08, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * (2 * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * Rpx * 1.08, cy + Math.sin(a) * Rpx * 1.08);
      ctx.stroke();
    }
  } else if (preset === "doorknob") {
    ctx.strokeRect(cx - Rpx * 1.35, cy - Rpx * 1.55, Rpx * 2.7, Rpx * 3.1);
    ctx.beginPath();
    ctx.arc(cx, cy, Rpx * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(cx - Rpx * 0.35, cy - Rpx * 0.9, Rpx * 0.7, Rpx * 1.5);
    ctx.beginPath();
    ctx.moveTo(cx + Rpx * 0.35, cy - Rpx * 0.2);
    ctx.lineTo(cx + Rpx * 1.3, cy - Rpx * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWheel(ctx, w, h, result, compact) {
  const color = api.color;
  api.backdrop(ctx, w, h);
  const cx = w * (compact ? 0.48 : 0.46);
  const cy = h * (compact ? 0.50 : 0.48);
  const Rpx = Math.min(w, h) * (compact ? 0.30 : 0.28);
  const rpx = Math.max(5, Rpx * (result.axleRadius / result.wheelRadius));
  if (!compact) drawSilhouette(ctx, api.ui.wheel.preset, cx, cy, Rpx);

  const effortOnRim = !result.reversed;
  ctx.lineWidth = compact ? 6 : 8;
  ctx.strokeStyle = effortOnRim ? color.effort : color.load;
  ctx.beginPath();
  ctx.arc(cx, cy, Rpx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = compact ? 5 : 7;
  ctx.strokeStyle = effortOnRim ? color.load : color.effort;
  ctx.beginPath();
  ctx.arc(cx, cy, rpx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color.text;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  const rulerAng = -0.85;
  api.strokeLine(ctx, cx, cy, cx + Math.cos(rulerAng) * Rpx, cy + Math.sin(rulerAng) * Rpx, color.radiusRuler, 2);
  ctx.fillStyle = color.radiusRuler;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(rulerAng) * rpx, cy + Math.sin(rulerAng) * rpx, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (!compact) {
    ctx.font = "12px " + "JetBrains Mono, ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    api.halo(ctx, "R " + fmt(result.wheelRadius, 3) + " m", cx + Math.cos(rulerAng) * Rpx + 8, cy + Math.sin(rulerAng) * Rpx, color.radiusRuler);
    api.halo(ctx, "r " + fmt(result.axleRadius, 3) + " m", cx + 10, cy + rpx + 14, color.radiusRuler);
  }

  const tauMax = Math.max(Math.abs(result.tauEffort), Math.abs(result.tauLoad), 1e-6);
  const effortRadiusPx = effortOnRim ? Rpx : rpx;
  const loadRadiusPx = effortOnRim ? rpx : Rpx;
  arcArrow(ctx, cx, cy, effortRadiusPx + 10, -0.2, -0.2 + (0.7 + 1.4 * result.tauEffort / tauMax), color.effort, compact ? 3 : 4);
  arcArrow(ctx, cx, cy, Math.max(8, loadRadiusPx - 8), 0.4, 0.4 + (0.7 + 1.4 * result.tauLoad / tauMax), color.load, compact ? 3 : 4);

  const pxPerM = Rpx / result.wheelRadius;
  const effortLen = result.effortRadius * result.phi * pxPerM;
  const loadLen = result.loadRadius * result.phi * pxPerM;
  const room = compact ? w * 0.22 : Math.min(cx - 28, w - cx - Rpx - 20);
  const scale = Math.min(1, room / Math.max(effortLen, loadLen, 1));
  const eDraw = effortLen * scale;
  const lDraw = loadLen * scale;

  const ex = cx + Math.cos(Math.PI) * effortRadiusPx;
  const ey = cy + Math.sin(Math.PI) * effortRadiusPx;
  ctx.save();
  ctx.strokeStyle = color.effort;
  ctx.lineWidth = compact ? 3 : 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, effortRadiusPx, Math.PI * 0.55, Math.PI, false);
  ctx.stroke();
  ctx.restore();
  api.strokeLine(ctx, ex, ey, ex - eDraw, ey, color.effort, compact ? 3 : 4);
  if (!compact) api.drawRuler(ctx, ex, ey + 16, Math.PI, eDraw, color.effort, fmt(result.inputDisplacement, 2) + " m");

  const loadLeave = Math.PI / 2;
  const lx = cx + Math.cos(loadLeave) * loadRadiusPx;
  const ly = cy + Math.sin(loadLeave) * loadRadiusPx;
  ctx.save();
  ctx.strokeStyle = color.load;
  ctx.lineWidth = compact ? 3 : 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, loadRadiusPx, loadLeave - 0.9, loadLeave, false);
  ctx.stroke();
  ctx.restore();
  api.strokeLine(ctx, lx, ly, lx, ly + lDraw, color.load, compact ? 3 : 4);
  if (!compact) api.drawRuler(ctx, lx + 14, ly, Math.PI / 2, lDraw, color.load, fmt(result.outputDisplacement, 2) + " m");

  const maxF = Math.max(result.appliedForce, result.outputForce, result.ideal.appliedForce, 1e-6);
  const fRoom = compact ? 36 : 54;
  api.drawArrow(ctx, ex, ey - 14, Math.PI, (result.appliedForce / maxF) * fRoom, color.effort, compact ? 4 : 6, false);
  if (api.ui.showIdeal) {
    api.drawArrow(ctx, ex, ey - 28, Math.PI, (result.ideal.appliedForce / maxF) * fRoom, color.idealGhost, 3, true);
  }
  api.drawArrow(ctx, lx + 18, ly, Math.PI / 2, (result.outputForce / maxF) * fRoom, color.load, compact ? 4 : 6, false);

  return { cx, cy, Rpx, rpx };
}

function drawWedge(ctx, w, h, result, compact) {
  const color = api.color;
  api.backdrop(ctx, w, h);
  const pxPerM = Math.min((w * 0.46) / result.length, (h * 0.42) / result.length);
  const gap = Math.max(2, Math.min(w * 0.42, result.separation * pxPerM));
  const mid = w * 0.52;
  const blockTop = h * (compact ? 0.46 : 0.42);
  const blockH = h * (compact ? 0.36 : 0.40);
  const halfW = Math.min(compact ? 70 : 120, w * 0.24);
  const leftX = mid - gap / 2 - halfW;
  const rightX = mid + gap / 2;

  function half(x) {
    ctx.save();
    ctx.fillStyle = color.wood;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(x, blockTop, halfW, blockH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color.wood;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, blockTop + 0.5, halfW - 1, blockH - 1);
    ctx.beginPath();
    ctx.rect(x, blockTop, halfW, blockH);
    ctx.clip();
    ctx.strokeStyle = color.woodGrain;
    ctx.lineWidth = 1.25;
    for (let i = 0; i < 5; i++) {
      const gy = blockTop + 8 + i * (blockH / 6);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(x + halfW * 0.35, gy - 4, x + halfW * 0.65, gy + 4, x + halfW, gy);
      ctx.stroke();
    }
    ctx.restore();
  }
  half(leftX);
  half(rightX);

  const shownPen = Math.min(result.penetration, result.length * 0.92);
  const tipY = blockTop + shownPen * pxPerM;
  const backY = tipY - result.length * pxPerM;
  const halfT = result.thickness * pxPerM / 2;
  ctx.beginPath();
  ctx.moveTo(mid, tipY);
  ctx.lineTo(mid - halfT, backY);
  ctx.lineTo(mid + halfT, backY);
  ctx.closePath();
  ctx.save();
  ctx.fillStyle = color.steel;
  ctx.globalAlpha = 0.38;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = color.steel;
  ctx.lineWidth = compact ? 2 : 3;
  ctx.stroke();

  api.drawRuler(ctx, mid - gap / 2, blockTop - 8, 0, gap, color.load, compact ? "" : fmt(result.separation, 3) + " m");

  const maxF = Math.max(result.appliedForce, result.ideal.appliedForce, result.splitForce, result.friction, result.deformationForce, 1e-6);
  const room = compact ? 42 : 64;
  const pushY = Math.max(18, backY - 8);
  api.drawArrow(ctx, mid, pushY, Math.PI / 2, (result.appliedForce / maxF) * room, color.effort, compact ? 4 : 6, false);
  if (api.ui.showIdeal) {
    api.drawArrow(ctx, mid + 16, pushY, Math.PI / 2, (result.ideal.appliedForce / maxF) * room, color.idealGhost, 3, true);
  }

  const faces = [
    [mid, tipY, mid - halfT, backY],
    [mid, tipY, mid + halfT, backY]
  ];
  for (const [x1, y1, x2, y2] of faces) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    let nx = dy / len;
    let ny = -dx / len;
    const mx = (x1 + x2) / 2;
    if (Math.sign(nx || 1) !== Math.sign(mx - mid || (mx < mid ? -1 : 1))) {
      nx = -nx;
      ny = -ny;
    }
    const ang = Math.atan2(ny, nx);
    api.drawArrow(ctx, mx, (y1 + y2) / 2, ang, (result.splitForce / maxF) * room, color.load, compact ? 3 : 5, false);
    const fx = -dy / len;
    const fy = dx / len;
    const my = (y1 + y2) / 2;
    if (result.friction > 0.05) {
      const frictionLen = Math.max(12, (result.friction / maxF) * len * 0.55);
      api.strokeLine(ctx, mx - fx * frictionLen / 2 + nx * 8, my - fy * frictionLen / 2 + ny * 8, mx + fx * frictionLen / 2 + nx * 8, my + fy * frictionLen / 2 + ny * 8, color.workLost, compact ? 4 : 6);
    }
    if (result.deformationForce > 0.05) {
      const deformLen = Math.max(8, (result.deformationForce / maxF) * len * 0.4);
      api.strokeLine(ctx, mx - fx * deformLen / 2 + nx * 16, my - fy * deformLen / 2 + ny * 16, mx + fx * deformLen / 2 + nx * 16, my + fy * deformLen / 2 + ny * 16, color.workLost, compact ? 2 : 3);
    }
  }
  if (!compact) {
    ctx.font = "11px " + "JetBrains Mono, ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    api.halo(ctx, "friction", mid - halfT - 78, (tipY + backY) / 2, color.workLost);
    api.halo(ctx, "deformation", mid + halfT + 22, (tipY + backY) / 2, color.workLost);
    api.halo(ctx, "L " + fmt(result.length, 2) + " m", mid + halfT + 8, backY + 14, color.steel);
    api.drawRuler(ctx, mid - halfT, backY - 6, 0, halfT * 2, color.steel, "t " + fmt(result.thickness, 3) + " m");
  }
  return { mid, tipY, backY, blockTop, pxPerM, leftX, rightX };
}

function drawScrew(ctx, w, h, result, compact) {
  const color = api.color;
  api.backdrop(ctx, w, h);
  const split = w * (compact ? 0.56 : 0.50);
  if (!compact) api.strokeLine(ctx, split, 28, split, h - 14, color.border, 1);

  const Rpx = Math.min(compact ? 26 : split * 0.36, h * 0.2);
  const tick = clamp(result.pitch / result.handleRadius * Rpx * 6, compact ? 10 : 16, compact ? 22 : 34);
  const lift = result.revolutions * tick;
  const axisX = split * (compact ? 0.46 : 0.40);
  const nutH = Math.min(h * (compact ? 0.28 : 0.36), compact ? 64 : 140);
  const nutTop = h * (compact ? 0.50 : 0.48);
  const headY = Math.max(compact ? 16 : 42, nutTop - (compact ? 20 : 34) - lift);
  const nutW = compact ? 52 : Math.min(118, split * 0.46);

  ctx.save();
  ctx.fillStyle = color.wood;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(axisX - nutW / 2, nutTop, nutW, nutH);
  ctx.restore();
  ctx.strokeStyle = color.wood;
  ctx.lineWidth = 2;
  ctx.strokeRect(axisX - nutW / 2 + 0.5, nutTop + 0.5, nutW - 1, nutH - 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(axisX - nutW / 2, nutTop, nutW, nutH);
  ctx.clip();
  ctx.strokeStyle = color.woodGrain;
  ctx.lineWidth = 1.4;
  const grainRows = compact ? 3 : 6;
  for (let i = 0; i < grainRows; i++) {
    const gy = nutTop + 8 + i * ((nutH - 12) / grainRows);
    ctx.beginPath();
    ctx.moveTo(axisX - nutW / 2, gy);
    ctx.bezierCurveTo(axisX - nutW * 0.12, gy - 4, axisX + nutW * 0.16, gy + 4, axisX + nutW / 2, gy);
    ctx.stroke();
  }
  ctx.restore();

  const shaftTop = headY + (compact ? 10 : 14);
  const shaftBot = Math.min(h - (compact ? 8 : 14), nutTop + nutH - 6);
  const shaftHalf = compact ? 4 : 7;
  api.strokeLine(ctx, axisX - shaftHalf, shaftTop, axisX - shaftHalf, shaftBot, color.steel, compact ? 2 : 3);
  api.strokeLine(ctx, axisX + shaftHalf, shaftTop, axisX + shaftHalf, shaftBot, color.steel, compact ? 2 : 3);
  ctx.save();
  ctx.strokeStyle = color.pitchTick;
  ctx.lineWidth = compact ? 1.5 : 2.5;
  ctx.lineCap = "round";
  const ticks = Math.max(3, Math.ceil(result.revolutions) + 4);
  for (let i = 0; i < ticks; i++) {
    const y = shaftBot - i * tick;
    if (y < shaftTop + 2) break;
    ctx.beginPath();
    ctx.moveTo(axisX - shaftHalf - (compact ? 4 : 7), y);
    ctx.lineTo(axisX + shaftHalf + (compact ? 4 : 7), y - tick * 0.42);
    ctx.stroke();
  }
  ctx.restore();

  api.strokeLine(ctx, axisX, headY, axisX + Rpx, headY, color.effort, compact ? 3 : 5);
  ctx.fillStyle = color.effort;
  ctx.beginPath();
  ctx.arc(axisX + Rpx, headY, compact ? 5 : 8, 0, Math.PI * 2);
  ctx.fill();
  const shown = result.revolutions <= 0 ? 0 : (result.revolutions % 1 === 0 ? 1 : result.revolutions % 1);
  arcArrow(ctx, axisX, headY, Math.max(12, Rpx * 0.62), -Math.PI / 2, -Math.PI / 2 + shown * Math.PI * 2, color.effort, compact ? 2.5 : 3.5);
  if (!compact) {
    api.drawRuler(ctx, axisX, headY - 20, 0, Rpx, color.radiusRuler, "R " + fmt(result.handleRadius, 3) + " m");
    api.drawRuler(ctx, axisX + shaftHalf + 18, shaftBot, -Math.PI / 2, tick, color.load, "p " + fmt(result.pitch, 3) + " m");
  }

  ctx.fillStyle = color.load;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(axisX - (compact ? 14 : 26), headY - (compact ? 9 : 15), compact ? 22 : 40, compact ? 7 : 11);
  ctx.globalAlpha = 1;

  const maxF = Math.max(result.appliedForce, result.ideal.appliedForce, 1e-6);
  const fRoom = compact ? 18 : 34;
  api.drawArrow(ctx, axisX + Rpx + 2, headY + 12, Math.PI / 2, 8 + (result.appliedForce / maxF) * fRoom, color.effort, compact ? 3 : 4, false);
  if (api.ui.showIdeal) {
    api.drawArrow(ctx, axisX + Rpx + 14, headY + 12, Math.PI / 2, 8 + (result.ideal.appliedForce / maxF) * fRoom, color.idealGhost, 3, true);
  }

  const padL = compact ? 8 : 16;
  const padR = compact ? 8 : 36;
  const x0 = split + padL;
  const y0 = h * (compact ? 0.74 : 0.76);
  const runPx = Math.max(28, w - x0 - padR);
  const risePx = Math.max(compact ? 26 : 78, Math.min(h * 0.48, y0 - (compact ? 14 : 40)));
  api.strokeLine(ctx, x0, y0, x0 + runPx, y0, color.textDim, 1.5);
  api.strokeLine(ctx, x0 + runPx, y0, x0 + runPx, y0 - risePx, color.load, compact ? 2 : 4);
  api.strokeLine(ctx, x0, y0, x0 + runPx, y0 - risePx, color.effort, compact ? 3 : 5);
  const bx = x0 + shown * runPx;
  const by = y0 - shown * risePx;
  ctx.beginPath();
  ctx.fillStyle = color.load;
  ctx.arc(bx, by, compact ? 4.5 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.canvas;
  ctx.stroke();
  if (!compact) {
    ctx.font = "11px " + "JetBrains Mono, ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    api.halo(ctx, "2πR " + fmt(result.circumference, 3) + " m", x0 + runPx / 2, y0 + 16, color.effort);
    ctx.textAlign = "left";
    api.halo(ctx, "p " + fmt(result.pitch, 3) + " m", Math.min(w - 8, x0 + runPx + 8), y0 - risePx / 2, color.load);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    api.halo(ctx, "cutaway", 14, 8, color.textDim);
    api.halo(ctx, "unrolled thread", split + 12, 8, color.textDim);
  }
  return { hx: axisX, hy: headY, Rpx };
}

function machineTint(id) {
  const color = api.color;
  if (id === "lever") return color.mLever;
  if (id === "pulley") return color.mPulley;
  if (id === "plane") return color.mIncline;
  if (id === "wheel-axle") return color.mWheel;
  if (id === "wedge") return color.mWedge;
  if (id === "screw") return color.mScrew;
  return color.text;
}

function drawMini(ctx, w, h, stage) {
  const color = api.color;
  api.backdrop(ctx, w, h);
  const ink = machineTint(stage.machine);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const midY = h * 0.62;
  if (stage.machine === "lever") {
    ctx.beginPath();
    ctx.moveTo(18, midY);
    ctx.lineTo(w - 18, midY);
    ctx.stroke();
    ctx.fillStyle = color.text;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, midY);
    ctx.lineTo(w * 0.42 - 10, midY + 16);
    ctx.lineTo(w * 0.42 + 10, midY + 16);
    ctx.fill();
    api.drawArrow(ctx, 28, midY, Math.PI / 2, 28, color.effort, 4, false);
    api.drawArrow(ctx, w - 28, midY, Math.PI / 2, 18, color.load, 4, false);
  } else if (stage.machine === "pulley") {
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.34, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.62, 16, 0, Math.PI * 2);
    ctx.stroke();
    api.strokeLine(ctx, w * 0.5 - 16, h * 0.34, w * 0.5 - 16, h * 0.62, color.effort, 2);
    api.strokeLine(ctx, w * 0.5 + 16, h * 0.34, w * 0.5 + 16, h * 0.9, color.load, 2);
  } else if (stage.machine === "plane") {
    ctx.beginPath();
    ctx.moveTo(16, h - 18);
    ctx.lineTo(w - 16, h - 18);
    ctx.lineTo(w - 16, 24);
    ctx.stroke();
    api.drawArrow(ctx, w * 0.45, h * 0.45, -0.6, 26, color.effort, 4, false);
  } else if (stage.machine === "wheel-axle") {
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color.load;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  } else if (stage.machine === "wedge") {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h - 16);
    ctx.lineTo(28, 20);
    ctx.lineTo(w - 28, 20);
    ctx.closePath();
    ctx.stroke();
    api.drawArrow(ctx, w * 0.5, 8, Math.PI / 2, 18, color.effort, 4, false);
  } else {
    api.strokeLine(ctx, w * 0.42, 16, w * 0.42, h - 16, color.steel, 4);
    ctx.beginPath();
    ctx.moveTo(w * 0.42, 28);
    ctx.lineTo(w * 0.72, 28);
    ctx.stroke();
    ctx.strokeStyle = color.pitchTick;
    for (let y = 36; y < h - 16; y += 12) {
      ctx.beginPath();
      ctx.moveTo(w * 0.42 - 8, y);
      ctx.lineTo(w * 0.42 + 8, y - 4);
      ctx.stroke();
    }
  }
}

function sliderRow(stage, key, min, max, step, label) {
  const row = document.createElement("div");
  row.className = "panel-row";
  const lab = document.createElement("div");
  lab.className = "panel-label";
  lab.dataset.key = key;
  lab.dataset.name = label;
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(stage[key]);
  input.dataset.stage = stage.id;
  input.dataset.key = key;
  input.setAttribute("aria-label", label);
  input.addEventListener("pointerdown", () => api.setActiveSlider(input));
  const clear = () => api.clearActiveSlider(input);
  input.addEventListener("pointerup", clear);
  input.addEventListener("pointercancel", clear);
  input.addEventListener("blur", clear);
  input.addEventListener("input", () => {
    stage[key] = Number(input.value);
    clampStage(stage);
  });
  row.append(lab, input);
  return row;
}

function rebuildPipeline() {
  const root = $("buildPipeline");
  if (!root) return;
  const stages = api.ui.build.stages;
  pipelineSig = stages.map((stage) => stage.id + ":" + stage.machine).join("|");
  root.replaceChildren();
  const fresh = [];
  const live = new Set(stages.map((stage) => stage.id));
  for (const id of [...seenStages]) if (!live.has(id)) seenStages.delete(id);
  root.append(makeJoint("in"));
  for (const stage of stages) {
    if (!seenStages.has(stage.id)) fresh.push(stage.id);
    seenStages.add(stage.id);
    root.append(makeCard(stage));
    root.append(makeJoint(stage.id));
  }
  root.append(makeTotal());
  for (const id of fresh) {
    const card = root.querySelector(`[data-card="${id}"]`);
    if (!card) continue;
    card.classList.add("snap");
    card.addEventListener("animationend", () => card.classList.remove("snap"), { once: true });
  }
}

function makeJoint(id) {
  const link = document.createElement("div");
  link.className = "stage-link";
  link.dataset.joint = id;
  const track = document.createElement("div");
  track.className = "stage-track";
  const arrow = document.createElement("div");
  arrow.className = "stage-arrow";
  track.append(arrow);
  const force = document.createElement("div");
  force.className = "stage-force";
  link.append(track, force);
  return link;
}

function makeTotal() {
  const card = document.createElement("section");
  card.className = "total-card";
  card.dataset.total = "yes";
  const h = document.createElement("h3");
  h.textContent = "Overall";
  const product = document.createElement("div");
  product.className = "product";
  product.dataset.product = "yes";
  const stack = document.createElement("div");
  stack.className = "loss-stack";
  stack.dataset.stack = "yes";
  const key = document.createElement("div");
  key.className = "loss-key";
  key.dataset.losskey = "yes";
  card.append(h, product, stack, key);
  return card;
}

function makeCard(stage) {
  const card = document.createElement("article");
  card.className = "stage-card";
  card.dataset.card = stage.id;
  const head = document.createElement("div");
  head.style.display = "flex";
  head.style.justifyContent = "space-between";
  head.style.gap = "6px";
  head.style.alignItems = "center";
  const h = document.createElement("h3");
  h.textContent = MACHINE_TYPES.find((type) => type.id === stage.machine).label;
  h.style.color = "var(--text)";
  const chip = document.createElement("span");
  chip.className = "ma-chip";
  chip.dataset.ma = stage.id;
  chip.textContent = "MA —";
  head.append(h, chip);
  const canvas = document.createElement("canvas");
  canvas.className = "view view-mini";
  canvas.dataset.mini = stage.id;
  canvas.setAttribute("aria-hidden", "true");
  card.append(head, canvas);
  if (stage.machine === "lever") {
    const chips = document.createElement("div");
    chips.className = "chips";
    for (const cls of [1, 2, 3]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = "Class " + cls;
      btn.dataset.cls = String(cls);
      btn.addEventListener("click", () => { stage.leverClass = cls; });
      chips.append(btn);
    }
    card.append(chips);
    card.append(sliderRow(stage, "effortArm", 0.1, 3, 0.05, "Effort arm"));
    card.append(sliderRow(stage, "loadArm", 0.1, 3, 0.05, "Load arm"));
    card.append(sliderRow(stage, "frictionTorque", 0, 30, 0.1, "Pivot friction"));
  } else if (stage.machine === "pulley") {
    card.append(sliderRow(stage, "segments", 1, 6, 1, "Segments"));
    const check = document.createElement("label");
    check.className = "check";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = !!stage.pulleyFriction;
    box.addEventListener("change", () => { stage.pulleyFriction = box.checked; });
    check.append(box, document.createTextNode("Pulley friction"));
    card.append(check);
    card.append(sliderRow(stage, "frictionRatio", 1, 1.6, 0.01, "Tension ratio"));
  } else if (stage.machine === "plane") {
    card.append(sliderRow(stage, "angleDeg", 8, 65, 0.5, "Angle"));
    card.append(sliderRow(stage, "mu", 0, 1, 0.01, "Friction μ"));
  } else if (stage.machine === "wheel-axle") {
    card.append(sliderRow(stage, "wheelRadius", 0.05, 0.5, 0.005, "Wheel R"));
    card.append(sliderRow(stage, "axleRadius", 0.005, 0.2, 0.001, "Axle r"));
    card.append(sliderRow(stage, "frictionTorque", 0, 12, 0.1, "Bearing friction"));
  } else if (stage.machine === "wedge") {
    card.append(sliderRow(stage, "length", 0.08, 0.5, 0.005, "Length L"));
    card.append(sliderRow(stage, "thickness", 0.01, 0.3, 0.005, "Thickness t"));
    card.append(sliderRow(stage, "mu", 0, 0.8, 0.01, "Friction μ"));
  } else {
    card.append(sliderRow(stage, "handleRadius", 0.04, 0.4, 0.005, "Handle R"));
    card.append(sliderRow(stage, "pitch", 0.002, 0.04, 0.001, "Pitch p"));
    card.append(sliderRow(stage, "mu", 0, 0.6, 0.01, "Friction μ"));
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    if (api.ui.build.stages.length <= 1) return;
    api.ui.build.stages = api.ui.build.stages.filter((item) => item.id !== stage.id);
  });
  card.append(remove);
  return card;
}

function syncBuild(result) {
  const root = $("buildPipeline");
  if (!root) return;
  const sig = api.ui.build.stages.map((stage) => stage.id + ":" + stage.machine).join("|");
  if (sig !== pipelineSig) rebuildPipeline();
  const stages = api.ui.build.stages;
  for (const input of root.querySelectorAll("input[type=range]")) {
    if (api.isActiveSlider(input)) continue;
    const stage = stages.find((item) => item.id === input.dataset.stage);
    if (!stage) continue;
    input.value = String(stage[input.dataset.key]);
    const lab = input.parentElement.querySelector(".panel-label");
    if (!lab) continue;
    const key = input.dataset.key;
    const digits = key === "segments" ? 0 : key === "angleDeg" ? 1 : key === "mu" || key === "frictionRatio" ? 2 : 3;
    lab.textContent = (lab.dataset.name || key) + " " + fmt(stage[key], digits);
  }
  for (const stage of stages) {
    const card = root.querySelector(`[data-card="${stage.id}"]`);
    if (!card) continue;
    for (const btn of card.querySelectorAll("[data-cls]")) {
      btn.classList.toggle("active", Number(btn.dataset.cls) === stage.leverClass);
    }
    const ratio = card.querySelector("input[data-key=frictionRatio]");
    if (ratio) ratio.disabled = !stage.pulleyFriction;
  }
  if (!result) return;
  const forces = [result.appliedForce, ...result.stages.map((stage) => stage.outputForce)];
  const maxForce = Math.max(...forces, 1e-6);
  const joints = [...root.querySelectorAll("[data-joint]")];
  joints.forEach((joint, index) => {
    const force = forces[Math.min(index, forces.length - 1)];
    const t = joints.length <= 1 ? 1 : index / (joints.length - 1);
    const mixed = lerpCss(api.color.effort, api.color.load, t);
    const arrow = joint.querySelector(".stage-arrow");
    const track = joint.querySelector(".stage-track");
    if (arrow) arrow.style.borderLeftColor = mixed;
    if (arrow) arrow.style.borderTopWidth = (4 + 8 * force / maxForce) + "px";
    if (arrow) arrow.style.borderBottomWidth = (4 + 8 * force / maxForce) + "px";
    if (track) track.style.height = (2 + 8 * force / maxForce) + "px";
    if (track) track.style.background = mixed;
    joint.querySelector(".stage-force").textContent = fmt(force, 0) + " N";
  });
  for (let i = 0; i < result.stages.length; i++) {
    const chip = root.querySelector(`[data-ma="${stages[i].id}"]`);
    if (chip) chip.textContent = "MA " + fmt(result.stages[i].idealMA, 2);
    const canvas = root.querySelector(`canvas[data-mini="${stages[i].id}"]`);
    if (canvas) api.drawIf(canvas, ({ ctx, w, h }) => drawMini(ctx, w, h, stages[i]));
  }
  const product = root.querySelector("[data-product]");
  if (product) {
    product.textContent = result.stages.map((stage) => fmt(stage.idealMA, 2)).join(" × ") + " = " + fmt(result.idealMA, 2) +
      "\nActual MA " + fmt(result.actualMA, 2) + " · η " + fmt(result.efficiency, 1) + "%";
  }
  const stack = root.querySelector("[data-stack]");
  const key = root.querySelector("[data-losskey]");
  if (stack && key) {
    stack.replaceChildren();
    key.replaceChildren();
    let remaining = 1;
    result.stages.forEach((stage, index) => {
      const eff = clamp(stage.efficiency / 100, 0, 1);
      const loss = remaining * (1 - eff);
      remaining *= eff;
      if (loss > 0.004) {
        const bit = document.createElement("i");
        bit.className = "lost";
        bit.style.width = (loss * 100) + "%";
        bit.title = stages[index].machine;
        stack.append(bit);
      }
      const note = document.createElement("span");
      note.textContent = MACHINE_TYPES.find((type) => type.id === stages[index].machine).label + " lost " + fmt(loss * 100, 1) + "%";
      key.append(note);
    });
    const useful = document.createElement("i");
    useful.className = "useful";
    useful.style.width = (clamp(remaining, 0, 1) * 100) + "%";
    stack.append(useful);
    const note = document.createElement("span");
    note.textContent = "Useful " + fmt(remaining * 100, 1) + "%";
    key.append(note);
  }
  for (const btn of document.querySelectorAll("#buildAdd [data-add]")) {
    btn.disabled = stages.length >= 4;
  }
  for (const btn of root.querySelectorAll(".stage-card .btn")) {
    btn.disabled = stages.length <= 1;
  }
}

function lerpCss(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  const u = clamp(t, 0, 1);
  const r = Math.round(A.r + (B.r - A.r) * u);
  const g = Math.round(A.g + (B.g - A.g) * u);
  const bl = Math.round(A.b + (B.b - A.b) * u);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(c) {
  let h = String(c).trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return { r: 255, g: 179, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mountBuild() {
  const chips = $("buildChallenges");
  for (const challenge of BUILD_CHALLENGES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.challenge = challenge.id;
    btn.textContent = challenge.title;
    btn.addEventListener("click", () => {
      seenStages.clear();
      api.ui.build = freshBuild(challenge.id);
    });
    chips.append(btn);
  }
  for (const btn of document.querySelectorAll("#buildAdd [data-add]")) {
    btn.addEventListener("click", () => {
      if (api.ui.build.stages.length >= 4) return;
      api.ui.build.stages.push(defaultStage(btn.dataset.add));
    });
  }
  rebuildPipeline();
}

function mountIdentify() {
  const grid = $("identifyGrid");
  for (const item of IDENTIFY_ITEMS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "id-card";
    btn.dataset.item = item.id;
    btn.innerHTML = ICONS[item.id];
    const name = document.createElement("span");
    name.className = "id-name";
    name.textContent = item.name;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.dataset.badge = item.id;
    badge.hidden = true;
    btn.append(name, badge);
    btn.addEventListener("click", () => selectItem(item.id));
    grid.append(btn);
  }
  const types = $("identifyTypes");
  for (const type of MACHINE_TYPES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.type = type.id;
    btn.textContent = type.label;
    btn.addEventListener("click", () => {
      const chosen = api.ui.identify.chosen;
      chosen[type.id] = !chosen[type.id];
    });
    types.append(btn);
  }
  for (const btn of document.querySelectorAll("#identifyClass [data-class]")) {
    btn.addEventListener("click", () => {
      api.ui.identify.leverClass = Number(btn.dataset.class);
    });
  }
  $("identifyCheck").addEventListener("click", () => {
    const item = IDENTIFY_ITEMS.find((entry) => entry.id === api.ui.identify.selected);
    const grade = gradeItem(item);
    api.ui.identify.revealed = true;
    api.ui.identify.ok = grade.ok;
    if (grade.ok) api.ui.identify.solved[item.id] = true;
    api.ui.identify.feedback = (grade.ok ? "Matched. " : "Not yet. ") + item.explanation;
  });
}

function selectItem(id) {
  const item = IDENTIFY_ITEMS.find((entry) => entry.id === id);
  api.ui.identify.selected = id;
  api.ui.identify.revealed = true;
  if (api.ui.identify.solved[id]) {
    api.ui.identify.ok = true;
    api.ui.identify.chosen = {};
    for (const type of item.types) api.ui.identify.chosen[type] = true;
    api.ui.identify.leverClass = item.leverClass == null ? 0 : item.leverClass;
    api.ui.identify.feedback = "Matched. " + item.explanation;
  } else {
    api.ui.identify.ok = false;
    api.ui.identify.chosen = {};
    api.ui.identify.leverClass = 0;
    api.ui.identify.feedback = "";
  }
}

function gradeItem(item) {
  const chosen = MACHINE_TYPES.map((type) => type.id).filter((id) => api.ui.identify.chosen[id]);
  const missing = item.types.filter((id) => !api.ui.identify.chosen[id]);
  const extra = chosen.filter((id) => !item.types.includes(id));
  const classOk = item.types.includes("lever")
    ? api.ui.identify.leverClass === item.leverClass
    : api.ui.identify.leverClass === 0;
  return { ok: missing.length === 0 && extra.length === 0 && classOk, missing, extra, classOk };
}

function syncIdentify() {
  const idn = api.ui.identify;
  const item = IDENTIFY_ITEMS.find((entry) => entry.id === idn.selected) || IDENTIFY_ITEMS[0];
  $("identifyName").textContent = item.name;
  $("identifyScore").textContent = Object.keys(idn.solved).length + " of " + IDENTIFY_ITEMS.length + " identified";
  $("identifyFeedback").textContent = idn.feedback || "";
  $("identifyFeedback").classList.toggle("bad", !!idn.feedback && !idn.ok);
  const badge = $("identifyBadge");
  badge.hidden = !idn.revealed;
  badge.textContent = idn.revealed ? item.badge : "";
  badge.className = "badge" + (idn.revealed ? " tint-" + item.tint : "");
  for (const card of document.querySelectorAll("#identifyGrid [data-item]")) {
    const on = card.dataset.item === item.id;
    const solved = !!idn.solved[card.dataset.item];
    card.classList.toggle("selected", on);
    card.classList.toggle("revealed", (on && idn.revealed) || solved);
    card.setAttribute("aria-pressed", on ? "true" : "false");
    const mark = card.querySelector("[data-badge]");
    const entry = IDENTIFY_ITEMS.find((row) => row.id === card.dataset.item);
    if (mark) {
      mark.hidden = !((on && idn.revealed) || solved);
      mark.textContent = mark.hidden ? "" : entry.badge;
      mark.className = "badge tint-" + entry.tint;
    }
  }
  for (const btn of document.querySelectorAll("#identifyTypes [data-type]")) {
    btn.classList.toggle("active", !!idn.chosen[btn.dataset.type]);
  }
  for (const btn of document.querySelectorAll("#identifyClass [data-class]")) {
    btn.classList.toggle("active", Number(btn.dataset.class) === idn.leverClass);
  }
}

function mountGuided() {
  const list = $("guidedSteps");
  const steps = [
    ["Predict", "1"],
    ["Measure", "2"],
    ["Graph", "3"],
    ["Justify", "4"]
  ];
  for (const [title, n] of steps) {
    const li = document.createElement("li");
    li.className = "step";
    li.dataset.step = n;
    const head = document.createElement("div");
    head.className = "step-h";
    const name = document.createElement("span");
    const num = document.createElement("span");
    num.className = "n";
    num.textContent = n;
    name.append(num, document.createTextNode("  " + title));
    const mark = document.createElement("span");
    mark.className = "check-mark";
    mark.dataset.check = n;
    mark.textContent = "";
    head.append(name, mark);
    li.append(head);
    if (n === "1") {
      const p = document.createElement("p");
      p.id = "guidedPredictHelp";
      const input = document.createElement("input");
      input.id = "guidedPredict";
      input.type = "number";
      input.inputMode = "decimal";
      input.step = "0.01";
      input.setAttribute("aria-label", "Predicted ideal mechanical advantage");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn primary";
      btn.id = "guidedLock";
      btn.textContent = "Lock prediction";
      btn.addEventListener("click", () => {
        const value = Number($("guidedPredict").value);
        if (!Number.isFinite(value)) {
          api.ui.guided.hint = "Enter a number for the ideal MA.";
          return;
        }
        api.ui.guided.prediction = value;
        api.ui.guided.locked = true;
        api.ui.guided.hint = "";
      });
      li.append(p, input, btn);
    } else if (n === "2") {
      const p = document.createElement("p");
      p.textContent = "The dashed value is the prediction you locked. The solid value is the machine's ideal MA right now.";
      const row = document.createElement("div");
      row.className = "ghost-row";
      const ghost = document.createElement("div");
      ghost.className = "ghost-val";
      ghost.innerHTML = "<span>Predicted</span><b id='guidedPred'>—</b>";
      const measured = document.createElement("div");
      measured.className = "measured-val";
      measured.innerHTML = "<span>Measured</span><b id='guidedMeas'>—</b>";
      row.append(ghost, measured);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.id = "guidedMeasure";
      btn.textContent = "Record measurement";
      btn.addEventListener("click", () => {
        if (!api.ui.guided.locked) return;
        api.ui.guided.measured = true;
      });
      li.append(p, row, btn);
    } else if (n === "3") {
      const p = document.createElement("p");
      p.textContent = "The rectangles are W = Fd. Amber is the input. Cyan is useful output. Red is work lost.";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.id = "guidedGraph";
      btn.textContent = "The areas show W = Fd";
      btn.addEventListener("click", () => {
        if (!api.ui.guided.measured) return;
        api.ui.guided.graphed = true;
      });
      li.append(p, btn);
    } else {
      const p = document.createElement("p");
      p.textContent = "Check for understanding. Which statement is the ideal MA?";
      const box = document.createElement("div");
      box.id = "guidedChoices";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn primary";
      btn.id = "guidedJustify";
      btn.textContent = "Check answer";
      btn.addEventListener("click", () => {
        if (!api.ui.guided.graphed) return;
        const spec = GUIDED.find((item) => item.id === api.ui.guided.machine);
        if (api.ui.guided.choice === spec.answer) {
          api.ui.guided.justified = true;
          api.ui.guided.hint = spec.because;
        } else {
          api.ui.guided.hint = "Not that one. Use the formula above the machine.";
        }
      });
      const hint = document.createElement("p");
      hint.id = "guidedHint";
      li.append(p, box, btn, hint);
    }
    list.append(li);
  }
  const machines = $("guidedMachines");
  for (const spec of GUIDED) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.guided = spec.id;
    btn.textContent = spec.label;
    btn.addEventListener("click", () => {
      api.ui.guided = freshGuided(spec.id);
      const input = $("guidedPredict");
      if (input) {
        input.value = "";
        input.disabled = false;
      }
      fillJustify();
      buildGuidedControls();
    });
    machines.append(btn);
  }
  const compare = $("guidedCompare");
  const ghost = document.createElement("div");
  ghost.className = "ghost-val";
  ghost.innerHTML = "<span>Predicted MA</span><b id='guidedPredLive'>—</b>";
  const measured = document.createElement("div");
  measured.className = "measured-val";
  measured.innerHTML = "<span>Measured MA</span><b id='guidedMeasLive'>—</b>";
  compare.append(ghost, measured);
  fillJustify();
  buildGuidedControls();
}

function fillJustify() {
  const spec = GUIDED.find((item) => item.id === api.ui.guided.machine) || GUIDED[0];
  const box = $("guidedChoices");
  if (!box) return;
  box.replaceChildren();
  for (const [id, label] of spec.choices) {
    const lab = document.createElement("label");
    lab.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "guidedChoice";
    input.value = id;
    input.addEventListener("change", () => { api.ui.guided.choice = id; });
    lab.append(input, document.createTextNode(label));
    box.append(lab);
  }
  const help = $("guidedPredictHelp");
  if (help) help.textContent = spec.predict;
}

function buildGuidedControls() {
  const root = $("guidedControls");
  const machine = api.ui.guided.machine;
  if (guidedMachineDrawn === machine && root.childElementCount) return;
  guidedMachineDrawn = machine;
  root.replaceChildren();
  const h = document.createElement("h2");
  h.textContent = "Change the machine after you lock a prediction";
  root.append(h);
  const add = (id, min, max, step, label, onInput) => {
    const row = document.createElement("div");
    row.className = "panel-row";
    const lab = document.createElement("div");
    lab.className = "panel-label";
    lab.id = id + "Label";
    lab.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.setAttribute("aria-label", label);
    row.append(lab, input);
    root.append(row);
    api.bindRange(id, onInput);
  };
  if (machine === "lever") {
    add("gFulcrum", 0.08, 0.92, 0.005, "Fulcrum", (value) => api.applyFraction(value));
    add("gMass", 0.2, 40, 0.1, "Load mass", (value) => { api.ui.lever.loadMass = value; });
    add("gFriction", 0, 40, 0.1, "Pivot friction", (value) => { api.ui.lever.friction = value; });
  } else if (machine === "pulley") {
    const chips = document.createElement("div");
    chips.className = "chips";
    chips.id = "gSegments";
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = String(n);
      btn.dataset.n = String(n);
      btn.addEventListener("click", () => { api.ui.pulley.segments = n; });
      chips.append(btn);
    }
    root.append(chips);
    const check = document.createElement("label");
    check.className = "check";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.id = "gFrictionOn";
    box.addEventListener("change", () => { api.ui.pulley.frictionOn = box.checked; });
    check.append(box, document.createTextNode("Pulley friction"));
    root.append(check);
  } else if (machine === "plane") {
    add("gAngle", 8, 65, 0.5, "Angle", (value) => { api.ui.plane.angleDeg = value; });
    add("gMu", 0, 1, 0.01, "Friction μ", (value) => { api.ui.plane.mu = value; });
  } else if (machine === "wheel-axle") {
    add("gR", 0.05, 0.5, 0.005, "Wheel radius", (value) => { api.ui.wheel.R = value; api.ui.wheel.preset = ""; });
    add("gr", 0.005, 0.2, 0.001, "Axle radius", (value) => { api.ui.wheel.r = value; api.ui.wheel.preset = ""; });
    add("gBearing", 0, 12, 0.1, "Bearing friction", (value) => { api.ui.wheel.friction = value; });
  } else if (machine === "wedge") {
    add("gL", 0.08, 0.5, 0.005, "Length L", (value) => { api.ui.wedge.L = value; });
    add("gT", 0.01, 0.3, 0.005, "Thickness t", (value) => { api.ui.wedge.t = value; });
    add("gWmu", 0, 0.8, 0.01, "Friction μ", (value) => { api.ui.wedge.mu = value; });
  } else {
    add("gHandle", 0.04, 0.4, 0.005, "Handle radius", (value) => { api.ui.screw.R = value; });
    add("gPitch", 0.002, 0.04, 0.001, "Pitch", (value) => { api.ui.screw.pitch = value; });
    add("gSmu", 0, 0.6, 0.01, "Friction μ", (value) => { api.ui.screw.mu = value; });
  }
}

function guidedResult(model) {
  const id = api.ui.guided.machine;
  if (id === "lever") return model.lever;
  if (id === "pulley") return model.pulley;
  if (id === "plane") return model.plane;
  if (id === "wheel-axle") return model.wheel;
  if (id === "wedge") return model.wedge;
  return model.screw;
}

function syncGuided(model) {
  const guided = api.ui.guided;
  const spec = GUIDED.find((item) => item.id === guided.machine) || GUIDED[0];
  const result = guidedResult(model);
  $("guidedTitle").textContent = spec.label;
  $("guidedFormula").textContent = spec.formula;
  for (const btn of document.querySelectorAll("#guidedMachines [data-guided]")) {
    btn.classList.toggle("active", btn.dataset.guided === guided.machine);
  }
  const input = $("guidedPredict");
  if (input) input.disabled = guided.locked;
  const lockBtn = $("guidedLock");
  if (lockBtn) lockBtn.disabled = guided.locked;
  const measureBtn = $("guidedMeasure");
  if (measureBtn) measureBtn.disabled = !guided.locked || guided.measured;
  const graphBtn = $("guidedGraph");
  if (graphBtn) graphBtn.disabled = !guided.measured || guided.graphed;
  const justifyBtn = $("guidedJustify");
  if (justifyBtn) justifyBtn.disabled = !guided.graphed || guided.justified;
  const flags = [guided.locked, guided.measured, guided.graphed, guided.justified];
  const current = flags.findIndex((flag) => !flag) + 1 || 4;
  document.querySelectorAll("#guidedSteps .step").forEach((step) => {
    const n = Number(step.dataset.step);
    step.classList.toggle("done", flags[n - 1]);
    step.classList.toggle("current", n === current);
    const mark = step.querySelector("[data-check]");
    if (mark) mark.textContent = flags[n - 1] ? "✓" : "";
  });
  const pred = guided.locked ? fmt(guided.prediction, 2) : "—";
  const meas = fmt(result.idealMA, 3);
  for (const id of ["guidedPred", "guidedPredLive"]) {
    const el = $(id);
    if (el) el.textContent = pred;
  }
  for (const id of ["guidedMeas", "guidedMeasLive"]) {
    const el = $(id);
    if (el) el.textContent = meas;
  }
  const hint = $("guidedHint");
  if (hint) hint.textContent = guided.justified ? spec.because : (guided.hint || "");
  const controls = $("guidedControls");
  for (const el of controls.querySelectorAll("input, button")) {
    if (el.id === "gFrictionOn") continue;
    el.disabled = !guided.locked;
  }
  const frictionOn = $("gFrictionOn");
  if (frictionOn) {
    frictionOn.disabled = !guided.locked;
    frictionOn.checked = api.ui.pulley.frictionOn;
  }
  for (const btn of document.querySelectorAll("#gSegments [data-n]")) {
    btn.disabled = !guided.locked;
    btn.classList.toggle("active", Number(btn.dataset.n) === api.ui.pulley.segments);
  }
  if (guided.machine === "lever") {
    api.syncSlider("gFulcrum", api.leverFraction());
    api.syncSlider("gMass", api.ui.lever.loadMass);
    api.syncSlider("gFriction", api.ui.lever.friction);
    const a = $("gFulcrumLabel");
    if (a) a.textContent = "Fulcrum fraction " + fmt(api.leverFraction(), 2);
    const b = $("gMassLabel");
    if (b) b.textContent = "Load mass " + fmt(api.ui.lever.loadMass, 1) + " kg";
    const c = $("gFrictionLabel");
    if (c) c.textContent = "Pivot friction " + fmt(api.ui.lever.friction, 1) + " N·m";
  } else if (guided.machine === "plane") {
    api.syncSlider("gAngle", api.ui.plane.angleDeg);
    api.syncSlider("gMu", api.ui.plane.mu);
  } else if (guided.machine === "wheel-axle") {
    api.syncSlider("gR", api.ui.wheel.R);
    api.syncSlider("gr", api.ui.wheel.r);
    api.syncSlider("gBearing", api.ui.wheel.friction);
  } else if (guided.machine === "wedge") {
    api.syncSlider("gL", api.ui.wedge.L);
    api.syncSlider("gT", api.ui.wedge.t);
    api.syncSlider("gWmu", api.ui.wedge.mu);
  } else if (guided.machine === "screw") {
    api.syncSlider("gHandle", api.ui.screw.R);
    api.syncSlider("gPitch", api.ui.screw.pitch);
    api.syncSlider("gSmu", api.ui.screw.mu);
  }
  api.drawIf($("guidedCanvas"), ({ ctx, w, h }) => {
    if (guided.machine === "lever") api.drawLever(ctx, w, h, result, false);
    else if (guided.machine === "pulley") api.drawPulley(ctx, w, h, result, false);
    else if (guided.machine === "plane") api.drawPlane(ctx, w, h, result, false);
    else if (guided.machine === "wheel-axle") $("guidedCanvas")._hit = drawWheel(ctx, w, h, result, false);
    else if (guided.machine === "wedge") $("guidedCanvas")._hit = drawWedge(ctx, w, h, result, false);
    else $("guidedCanvas")._hit = drawScrew(ctx, w, h, result, false);
  });
  api.drawIf($("guidedWork"), ({ ctx, w, h }) => api.drawWork(ctx, w, h, result));
  const caption = $("guidedWorkCaption");
  if (caption) caption.textContent = api.workCaption(result);
  return result;
}

function syncWheel(result) {
  const wheel = api.ui.wheel;
  api.syncSlider("wheelR", wheel.R);
  api.syncSlider("wheelr", wheel.r);
  api.syncSlider("wheelMass", wheel.loadMass);
  api.syncSlider("wheelTurns", wheel.revolutions);
  api.syncSlider("wheelFriction", wheel.friction);
  api.syncSlider("wheelPush", result.appliedForce, Math.max(20, result.requiredForce * 2.5));
  $("wheelRLabel").textContent = "Wheel radius R " + fmt(result.wheelRadius, 3) + " m";
  $("wheelrLabel").textContent = "Axle radius r " + fmt(result.axleRadius, 3) + " m";
  $("wheelMassLabel").textContent = "Load mass " + fmt(wheel.loadMass, 1) + " kg";
  $("wheelTurnsLabel").textContent = "Turns " + fmt(result.revolutions, 2);
  $("wheelFrictionLabel").textContent = "Bearing friction " + fmt(wheel.friction, 1) + " N·m";
  $("wheelPushLabel").textContent = "Your effort " + fmt(result.appliedForce, 2) + " N";
  $("wheelReversed").checked = wheel.reversed;
  $("wheelIdeal").checked = api.ui.showIdeal;
  for (const btn of document.querySelectorAll("#wheelPresets [data-wheel]")) {
    btn.classList.toggle("active", btn.dataset.wheel === wheel.preset);
  }
  $("wheelEq").textContent =
    (wheel.reversed ? "Reversed. Ideal MA = r/R" : "Ideal MA = R/r") + " = " + fmt(result.idealMA, 3) +
    "\nτ_net = " + fmt(result.tauEffort, 2) + " − " + fmt(result.tauLoad, 2) + " − " + fmt(result.tauFriction, 2) +
    " = " + fmt(result.tauNet, 2) + " N·m\nDistance ratio s_in/s_out = " + fmt(result.distanceRatio, 3);
  api.fillReadout("wheel", result);
  api.fillDist("wheel", result);
  $("wheelWorkCaption").textContent = api.workCaption(result);
  api.drawIf($("wheelCanvas"), ({ ctx, w, h }) => {
    $("wheelCanvas")._hit = drawWheel(ctx, w, h, result, false);
  });
  api.drawIf($("wheelWork"), ({ ctx, w, h }) => api.drawWork(ctx, w, h, result));
}

function syncWedge(result) {
  const wedge = api.ui.wedge;
  api.syncSlider("wedgeL", wedge.L);
  api.syncSlider("wedgeT", wedge.t, wedge.L * 0.9);
  api.syncSlider("wedgeLoad", wedge.loadForce);
  api.syncSlider("wedgePen", wedge.penetration, wedge.L);
  api.syncSlider("wedgeMu", wedge.mu);
  api.syncSlider("wedgeDef", wedge.deformation);
  api.syncSlider("wedgePush", result.appliedForce, Math.max(50, result.requiredForce * 2.2));
  $("wedgeLLabel").textContent = "Length L " + fmt(wedge.L, 3) + " m";
  $("wedgeTLabel").textContent = "Thickness t " + fmt(result.thickness, 3) + " m";
  $("wedgeLoadLabel").textContent = "Splitting resistance " + fmt(wedge.loadForce, 0) + " N";
  $("wedgePenLabel").textContent = "Penetration " + fmt(result.penetration, 3) + " m";
  $("wedgeMuLabel").textContent = "Face friction μ " + fmt(wedge.mu, 2);
  $("wedgeDefLabel").textContent = "Deformation k " + fmt(wedge.deformation, 2);
  $("wedgePushLabel").textContent = "Your push " + fmt(result.appliedForce, 1) + " N";
  $("wedgeIdeal").checked = api.ui.showIdeal;
  $("wedgeEq").textContent =
    "Ideal MA = L/t = " + fmt(result.idealMA, 3) +
    "\nF_ideal = F_split · t/L = " + fmt(result.ideal.appliedForce, 1) + " N" +
    "\nFriction " + fmt(result.friction, 1) + " N · deformation " + fmt(result.deformationForce, 1) + " N";
  api.fillReadout("wedge", result);
  api.fillDist("wedge", result);
  $("wedgeWorkCaption").textContent = api.workCaption(result);
  api.drawIf($("wedgeCanvas"), ({ ctx, w, h }) => {
    $("wedgeCanvas")._hit = drawWedge(ctx, w, h, result, false);
  });
  api.drawIf($("wedgeWork"), ({ ctx, w, h }) => api.drawWork(ctx, w, h, result));
}

function syncScrew(result) {
  const screw = api.ui.screw;
  api.syncSlider("screwR", screw.R);
  api.syncSlider("screwP", screw.pitch);
  api.syncSlider("screwMass", screw.loadMass);
  api.syncSlider("screwTurns", screw.revolutions);
  api.syncSlider("screwMu", screw.mu);
  api.syncSlider("screwPush", result.appliedForce, Math.max(5, result.requiredForce * 2.5));
  $("screwRLabel").textContent = "Handle radius R " + fmt(result.handleRadius, 3) + " m";
  $("screwPLabel").textContent = "Pitch p " + fmt(result.pitch, 3) + " m";
  $("screwMassLabel").textContent = "Load mass " + fmt(screw.loadMass, 1) + " kg";
  $("screwTurnsLabel").textContent = "Turns " + fmt(result.revolutions, 2);
  $("screwMuLabel").textContent = "Thread friction μ " + fmt(screw.mu, 2);
  $("screwPushLabel").textContent = "Your effort " + fmt(result.appliedForce, 2) + " N";
  $("screwIdeal").checked = api.ui.showIdeal;
  $("screwEq").textContent =
    "Ideal MA = 2πR/p = " + fmt(result.idealMA, 2) +
    "\nOne turn: handle " + fmt(result.circumference, 3) + " m, load rises " + fmt(result.pitch, 3) + " m" +
    "\nThis motion: " + fmt(result.revolutions, 2) + " turns, lift " + fmt(result.outputDisplacement, 3) + " m";
  api.fillReadout("screw", result);
  api.fillDist("screw", result);
  $("screwWorkCaption").textContent = api.workCaption(result);
  api.drawIf($("screwCanvas"), ({ ctx, w, h }) => {
    $("screwCanvas")._hit = drawScrew(ctx, w, h, result, false);
  });
  api.drawIf($("screwWork"), ({ ctx, w, h }) => api.drawWork(ctx, w, h, result));
}

function statusFor(mode, model, build) {
  if (mode === "wheel-axle") {
    const result = model.wheel;
    return {
      title: (result.reversed ? "Reversed wheel & axle" : "Wheel & axle") + " — ideal MA " + fmt(result.idealMA, 3),
      reason: "R " + fmt(result.wheelRadius, 3) + " m, r " + fmt(result.axleRadius, 3) + " m. Distance ratio " +
        fmt(result.distanceRatio, 3) + ". τ_net " + fmt(result.tauNet, 2) + " N·m. Efficiency " + fmt(result.efficiency, 1) +
        "%." + (result.frictionTorque > 0 ? " Bearing friction makes the real effort larger than the ghost." : " Bearing friction is off.")
    };
  }
  if (mode === "wedge") {
    const result = model.wedge;
    return {
      title: "Wedge — ideal MA " + fmt(result.idealMA, 3),
      reason: "L/t = " + fmt(result.length, 3) + "/" + fmt(result.thickness, 3) + ". Separation " +
        fmt(result.separation, 3) + " m. Friction " + fmt(result.friction, 1) + " N and deformation " +
        fmt(result.deformationForce, 1) + " N are the red slivers. Efficiency " + fmt(result.efficiency, 1) + "%."
    };
  }
  if (mode === "screw") {
    const result = model.screw;
    return {
      title: "Screw — ideal MA " + fmt(result.idealMA, 2),
      reason: "2πR/p = " + fmt(result.circumference, 3) + "/" + fmt(result.pitch, 3) + ". " +
        fmt(result.revolutions, 2) + " turns lift the load " + fmt(result.outputDisplacement, 3) + " m. Efficiency " +
        fmt(result.efficiency, 1) + "%." + (result.mu > 0 ? " Thread friction is the loss." : " Friction is off, so the areas match.")
    };
  }
  if (mode === "build" && build) {
    const goal = BUILD_CHALLENGES.find((item) => item.id === api.ui.build.challenge);
    const forceOk = build.appliedForce < goal.maxForce;
    const effOk = build.efficiency + 1e-9 >= goal.minEfficiency;
    return {
      title: (forceOk && effOk ? "Goal met — " : "Build — ") + goal.title,
      reason: "Ideal MA " + fmt(build.idealMA, 2) + " = " + build.stages.map((stage) => fmt(stage.idealMA, 2)).join(" × ") +
        ". Efficiency " + fmt(build.efficiency, 1) + "% = product of the stage efficiencies. Effort " +
        fmt(build.appliedForce, 1) + " N."
    };
  }
  if (mode === "identify") {
    return {
      title: "Identify — " + Object.keys(api.ui.identify.solved).length + " of " + IDENTIFY_ITEMS.length,
      reason: "Tap an object to light its machine part and read the class badge. Then choose the type and lever class and check your answer."
    };
  }
  if (mode === "guided") {
    const spec = GUIDED.find((item) => item.id === api.ui.guided.machine);
    const step = !api.ui.guided.locked ? "Predict" : !api.ui.guided.measured ? "Measure" : !api.ui.guided.graphed ? "Graph" : !api.ui.guided.justified ? "Justify" : "Done";
    return {
      title: "Guided " + spec.label + " — " + step,
      reason: spec.formula + ". The dashed number is your locked prediction. The measured ideal MA comes from the same model as the picture."
    };
  }
  return null;
}

export function mountLabs(next) {
  api = next;
  if (!api.ui.wheel) api.ui.wheel = { ...api.INITIAL.wheel };
  if (!api.ui.wedge) api.ui.wedge = { ...api.INITIAL.wedge };
  if (!api.ui.screw) api.ui.screw = { ...api.INITIAL.screw };
  if (!api.ui.build) api.ui.build = freshBuild("lift-200");
  if (!api.ui.identify) api.ui.identify = freshIdentify();
  if (!api.ui.guided) api.ui.guided = freshGuided("lever");

  for (const btn of document.querySelectorAll("#wheelPresets [data-wheel]")) {
    btn.addEventListener("click", () => {
      const preset = WHEEL_PRESETS[btn.dataset.wheel];
      api.ui.wheel.preset = btn.dataset.wheel;
      api.ui.wheel.R = preset.wheelRadius;
      api.ui.wheel.r = preset.axleRadius;
      api.ui.wheel.loadMass = preset.loadMass;
      api.ui.wheel.reversed = false;
      api.ui.wheel.friction = 0;
      api.ui.wheel.pushLocked = true;
    });
  }
  api.bindRange("wheelR", (value) => { api.ui.wheel.R = value; api.ui.wheel.preset = ""; });
  api.bindRange("wheelr", (value) => { api.ui.wheel.r = value; api.ui.wheel.preset = ""; });
  api.bindRange("wheelMass", (value) => { api.ui.wheel.loadMass = value; });
  api.bindRange("wheelTurns", (value) => { api.ui.wheel.revolutions = value; });
  api.bindRange("wheelFriction", (value) => { api.ui.wheel.friction = value; });
  api.bindRange("wheelPush", (value) => { api.ui.wheel.pushLocked = false; api.ui.wheel.push = value; });
  $("wheelBalance").addEventListener("click", () => { api.ui.wheel.pushLocked = true; });
  $("wheelReversed").addEventListener("change", () => { api.ui.wheel.reversed = $("wheelReversed").checked; api.ui.wheel.pushLocked = true; });
  $("wheelIdeal").addEventListener("change", () => { api.ui.showIdeal = $("wheelIdeal").checked; });

  api.bindRange("wedgeL", (value) => { api.ui.wedge.L = value; });
  api.bindRange("wedgeT", (value) => { api.ui.wedge.t = value; });
  api.bindRange("wedgeLoad", (value) => { api.ui.wedge.loadForce = value; });
  api.bindRange("wedgePen", (value) => { api.ui.wedge.penetration = value; });
  api.bindRange("wedgeMu", (value) => { api.ui.wedge.mu = value; });
  api.bindRange("wedgeDef", (value) => { api.ui.wedge.deformation = value; });
  api.bindRange("wedgePush", (value) => { api.ui.wedge.pushLocked = false; api.ui.wedge.push = value; });
  $("wedgeBalance").addEventListener("click", () => { api.ui.wedge.pushLocked = true; });
  $("wedgeIdeal").addEventListener("change", () => { api.ui.showIdeal = $("wedgeIdeal").checked; });

  api.bindRange("screwR", (value) => { api.ui.screw.R = value; });
  api.bindRange("screwP", (value) => { api.ui.screw.pitch = value; });
  api.bindRange("screwMass", (value) => { api.ui.screw.loadMass = value; });
  api.bindRange("screwTurns", (value) => { api.ui.screw.revolutions = value; });
  api.bindRange("screwMu", (value) => { api.ui.screw.mu = value; });
  api.bindRange("screwPush", (value) => { api.ui.screw.pushLocked = false; api.ui.screw.push = value; });
  $("screwBalance").addEventListener("click", () => { api.ui.screw.pushLocked = true; });
  $("screwIdeal").addEventListener("change", () => { api.ui.showIdeal = $("screwIdeal").checked; });

  bindPointer($("wheelCanvas"), (pt, hit) => {
    if (!hit) return null;
    const dx = pt.x - hit.cx;
    const dy = pt.y - hit.cy;
    return dx * dx + dy * dy <= (hit.Rpx + 28) * (hit.Rpx + 28) ? "wheel" : null;
  }, (pt, state) => {
    let delta = Math.atan2(pt.y - state.canvas._hit.cy, pt.x - state.canvas._hit.cx) - state.startAng;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    api.ui.wheel.revolutions = clamp(state.startTurns + delta / (2 * Math.PI), 0.05, 2);
    api.ui.wheel.preset = "";
  });
  bindPointer($("wedgeCanvas"), (pt, hit) => {
    if (!hit) return null;
    if (pt.y > hit.backY - 28 && pt.y < hit.tipY + 30 && Math.abs(pt.x - hit.mid) < 100) return "wedge";
    return null;
  }, (pt, state, hit) => {
    if (!hit) return;
    api.ui.wedge.penetration = clamp(state.startPen + (pt.y - state.startY) / hit.pxPerM, 0.02, api.ui.wedge.L);
  });
  bindPointer($("screwCanvas"), (pt, hit) => {
    if (!hit) return null;
    const dx = pt.x - hit.hx;
    const dy = pt.y - hit.hy;
    return dx * dx + dy * dy <= (hit.Rpx + 36) * (hit.Rpx + 36) ? "screw" : null;
  }, (pt, state, hit) => {
    if (!hit) return;
    let delta = Math.atan2(pt.y - hit.hy, pt.x - hit.hx) - state.startAng;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    api.ui.screw.revolutions = clamp(state.startTurns + delta / (2 * Math.PI), 0.05, 3);
  });

  mountBuild();
  mountIdentify();
  mountGuided();
}

export function resetLabMode(mode) {
  if (!api) return false;
  if (mode === "wheel-axle") {
    api.ui.wheel = { ...api.INITIAL.wheel };
    return true;
  }
  if (mode === "wedge") {
    api.ui.wedge = { ...api.INITIAL.wedge };
    return true;
  }
  if (mode === "screw") {
    api.ui.screw = { ...api.INITIAL.screw };
    return true;
  }
  if (mode === "build") {
    const challenge = api.ui.build.challenge;
    seenStages.clear();
    api.ui.build = freshBuild(challenge);
    return true;
  }
  if (mode === "identify") {
    api.ui.identify = freshIdentify();
    return true;
  }
  if (mode === "guided") {
    const machine = api.ui.guided.machine;
    api.ui.guided = freshGuided(machine);
    const input = $("guidedPredict");
    if (input) {
      input.value = "";
      input.disabled = false;
    }
    fillJustify();
    return true;
  }
  return false;
}

export function syncLabs(model) {
  const empty = { build: null, status: null, guidedResult: null };
  if (!api) return empty;
  syncWheel(model.wheel);
  api.drawIf($("wbWheel"), ({ ctx, w, h }) => drawWheel(ctx, w, h, model.bench.wheel, true));
  syncWedge(model.wedge);
  api.drawIf($("wbWedge"), ({ ctx, w, h }) => drawWedge(ctx, w, h, model.bench.wedge, true));
  syncScrew(model.screw);
  api.drawIf($("wbScrew"), ({ ctx, w, h }) => drawScrew(ctx, w, h, model.bench.screw, true));

  let build = null;
  let buildError = "";
  try {
    for (const stage of api.ui.build.stages) clampStage(stage);
    const goal = BUILD_CHALLENGES.find((item) => item.id === api.ui.build.challenge) || BUILD_CHALLENGES[0];
    build = analyzeBuild({
      loadMass: goal.loadMass,
      outputDisplacement: goal.outputDisplacement,
      g: G,
      stages: api.ui.build.stages.map(toSpec)
    });
    const goalEl = $("buildGoal");
    if (goalEl) {
      const forceOk = build.appliedForce < goal.maxForce;
      const effOk = build.efficiency + 1e-9 >= goal.minEfficiency;
      goalEl.classList.toggle("met", forceOk && effOk);
      goalEl.replaceChildren();
      const h = document.createElement("h3");
      h.textContent = goal.title;
      const p = document.createElement("p");
      p.textContent = goal.detail + " Load " + fmt(goal.loadMass, 0) + " kg, distance " + fmt(goal.outputDisplacement, 2) + " m.";
      const verdict = document.createElement("div");
      verdict.className = "verdict";
      const effText = goal.minEfficiency > 0 ? " · efficiency " + fmt(build.efficiency, 1) + "% (need " + goal.minEfficiency + "%)" : "";
      verdict.textContent = (forceOk && effOk ? "Goal met. " : "Not yet. ") +
        "Effort " + fmt(build.appliedForce, 1) + " N (under " + goal.maxForce + " N)" + effText +
        ". Ideal MA " + fmt(build.idealMA, 2) + ".";
      goalEl.append(h, p, verdict);
    }
    for (const btn of document.querySelectorAll("#buildChallenges [data-challenge]")) {
      btn.classList.toggle("active", btn.dataset.challenge === goal.id);
    }
    syncBuild(build);
  } catch (err) {
    buildError = err.message;
    syncBuild(null);
  }

  syncIdentify();
  const guidedLive = syncGuided(model);
  const status = statusFor(api.ui.mode, model, build);
  if (buildError && api.ui.mode === "build") {
    return {
      build: null,
      guidedResult: guidedLive,
      status: { title: "Build — check the stages", reason: buildError }
    };
  }
  return { build, guidedResult: guidedLive, status };
}
