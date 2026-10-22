/**
 * Placeholder draw layer for the Mechanics Playground.
 *
 * The art direction is not chosen. This file only reads a plain snapshot
 * and the theme variables. It does not import the simulation. Swap the
 * whole layer: both layers below honor the same draw(snapshot) contract.
 *
 * Force arrows and the free-body diagram take their colors from
 * --mp-force-* and --mp-velocity. Thrust is an applied force, so it uses
 * --mp-force-applied. Those variables are read again on every frame.
 */
"use strict";

export const VECTOR_TOKENS = Object.freeze({
  gravity: "--mp-force-gravity",
  normal: "--mp-force-normal",
  tension: "--mp-force-tension",
  friction: "--mp-force-friction",
  applied: "--mp-force-applied",
  thrust: "--mp-force-applied",
  velocity: "--mp-velocity"
});

const THEME_NAMES = Object.freeze([
  "--mp-bg", "--mp-far", "--mp-mid", "--mp-near",
  "--mp-body", "--mp-body-side", "--mp-shadow",
  "--mp-rope", "--mp-spring", "--mp-ice", "--mp-rubber", "--mp-thrust",
  "--mp-vector-force", "--mp-vector-velocity", "--mp-grid", "--mp-ui-card",
  "--mp-force-gravity", "--mp-force-normal", "--mp-force-tension",
  "--mp-force-friction", "--mp-force-applied", "--mp-velocity"
]);

const FALLBACK = Object.freeze({
  "--mp-bg": "#14181f",
  "--mp-far": "#1c2430",
  "--mp-mid": "#2a3544",
  "--mp-near": "#3d4d62",
  "--mp-body": "#d7c4a3",
  "--mp-body-side": "#8d7352",
  "--mp-shadow": "rgba(0,0,0,0.35)",
  "--mp-rope": "#e6d7a2",
  "--mp-spring": "#c5d4de",
  "--mp-ice": "#b9e4ff",
  "--mp-rubber": "#e07a5f",
  "--mp-thrust": "#ff7a3c",
  "--mp-vector-force": "#f4f4f4",
  "--mp-vector-velocity": "cyan",
  "--mp-grid": "rgba(255,255,255,0.08)",
  "--mp-ui-card": "#1a212b",
  "--mp-force-gravity": "red",
  "--mp-force-normal": "blue",
  "--mp-force-tension": "gold",
  "--mp-force-friction": "orange",
  "--mp-force-applied": "green",
  "--mp-velocity": "cyan"
});

export function vectorStyleToken(kind) {
  return VECTOR_TOKENS[kind] || "--mp-vector-force";
}

export function readTheme(element) {
  const style = element && typeof getComputedStyle === "function" ? getComputedStyle(element) : null;
  const theme = {};
  for (const name of THEME_NAMES) {
    const value = style ? style.getPropertyValue(name).trim() : "";
    theme[name] = value || FALLBACK[name];
  }
  return theme;
}

function colorFor(theme, kind) {
  return theme[vectorStyleToken(kind)] || theme["--mp-vector-force"];
}

function boundsOf(snapshot) {
  let minX = -4;
  let maxX = 4;
  let minY = -1;
  let maxY = 4;
  const visit = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const body of snapshot.bodies || []) {
    visit(body.x, body.y);
    if (body.vertices) body.vertices.forEach((vertex) => visit(vertex.x, vertex.y));
    if (body.radius) {
      visit(body.x - body.radius, body.y - body.radius);
      visit(body.x + body.radius, body.y + body.radius);
    }
  }
  for (const joint of snapshot.joints || []) {
    visit(joint.ax, joint.ay);
    visit(joint.bx, joint.by);
    if (joint.groundA) visit(joint.groundA.x, joint.groundA.y);
    if (joint.groundB) visit(joint.groundB.x, joint.groundB.y);
  }
  return { minX, maxX, minY, maxY };
}

function createProjector(width, height, snapshot, tilt) {
  const bounds = boundsOf(snapshot);
  const worldW = Math.max(2.5, bounds.maxX - bounds.minX);
  const worldH = Math.max(2.5, bounds.maxY - bounds.minY);
  const ppm = Math.min(width / (worldW * 1.28), height / (worldH * 1.28));
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const shear = Math.tan(tilt || 0);
  return {
    ppm,
    worldFromScreen(sx, sy) {
      let px = sx - width / 2;
      const py = sy - height / 2;
      px -= py * shear;
      return { x: cx + px / ppm, y: cy - py / ppm };
    },
    screenFromWorld(x, y) {
      let px = (x - cx) * ppm;
      const py = -(y - cy) * ppm;
      px += py * shear;
      return { x: px + width / 2, y: py + height / 2 };
    }
  };
}

function bodyFill(theme, body) {
  if (body.material === "ice") return theme["--mp-ice"];
  if (body.material === "rubber") return theme["--mp-rubber"];
  return theme["--mp-body"];
}

function drawArrow(ctx, x0, y0, x1, y1, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(12, length * 0.35);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * head - uy * head * 0.45, y1 - uy * head + ux * head * 0.45);
  ctx.lineTo(x1 - ux * head + uy * head * 0.45, y1 - uy * head - ux * head * 0.45);
  ctx.closePath();
  ctx.fill();
}

function paintVectors(ctx, snapshot, theme, project) {
  const vectors = snapshot.vectors || [];
  let maxForce = 1;
  for (const vector of vectors) {
    if (vector.kind === "velocity") continue;
    maxForce = Math.max(maxForce, Math.hypot(vector.fx, vector.fy));
  }
  const forcePx = (0.22 * Math.min(ctx.canvas.width, ctx.canvas.height)) / maxForce;
  const velPx = 16;
  for (const vector of vectors) {
    const origin = project.screenFromWorld(vector.x, vector.y);
    const scale = vector.kind === "velocity" ? velPx : forcePx;
    const tipX = origin.x + vector.fx * scale;
    const tipY = origin.y - vector.fy * scale;
    drawArrow(ctx, origin.x, origin.y, tipX, tipY, colorFor(theme, vector.kind));
  }
}

function paintEnergy(ctx, snapshot, theme) {
  const energy = snapshot.energy || {};
  const parts = [
    ["KE", energy.kinetic || 0, theme["--mp-near"]],
    ["PE", Math.max(0, energy.gravitational || 0), theme["--mp-body"]],
    ["spring", energy.spring || 0, theme["--mp-spring"]],
    ["heat", energy.thermal || 0, theme["--mp-force-friction"]]
  ];
  const sum = parts.reduce((total, part) => total + part[1], 0) || 1;
  const x = 12;
  let y = 16;
  ctx.font = "12px sans-serif";
  for (const [label, value, color] of parts) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(2, (140 * value) / sum), 8);
    ctx.fillStyle = theme["--mp-vector-force"];
    ctx.fillText(label, x + 146, y + 8);
    y += 14;
  }
}

function traceBody(ctx, project, body) {
  if (body.shape === "circle") {
    const center = project.screenFromWorld(body.x, body.y);
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.max(2, body.radius * project.ppm), 0, Math.PI * 2);
    return;
  }
  const points = body.vertices && body.vertices.length
    ? body.vertices.map((vertex) => project.screenFromWorld(vertex.x, vertex.y))
    : [];
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function drawGrid(ctx, project, color, spacing, shift) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const left = project.worldFromScreen(0, 0);
  const right = project.worldFromScreen(ctx.canvas.width, ctx.canvas.height);
  const minX = Math.min(left.x, right.x) - 1;
  const maxX = Math.max(left.x, right.x) + 1;
  const minY = Math.min(left.y, right.y) - 1;
  const maxY = Math.max(left.y, right.y) + 1;
  const startX = Math.floor((minX + shift) / spacing) * spacing - shift;
  const startY = Math.floor((minY + shift) / spacing) * spacing - shift;
  for (let x = startX; x <= maxX; x += spacing) {
    const a = project.screenFromWorld(x, minY);
    const b = project.screenFromWorld(x, maxY);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let y = startY; y <= maxY; y += spacing) {
    const a = project.screenFromWorld(minX, y);
    const b = project.screenFromWorld(maxX, y);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
}

function paintJoints(ctx, snapshot, theme, project) {
  for (const joint of snapshot.joints || []) {
    const a = project.screenFromWorld(joint.ax, joint.ay);
    const b = project.screenFromWorld(joint.bx, joint.by);
    ctx.lineWidth = joint.selected ? 3 : 1.5;
    if (joint.type === "spring") {
      ctx.strokeStyle = theme["--mp-spring"];
      ctx.beginPath();
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        const wobble = i % 2 === 0 ? 6 : -6;
        const px = i === 0 || i === steps ? x : x + (nx / len) * wobble;
        const py = i === 0 || i === steps ? y : y + (ny / len) * wobble;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (joint.type === "pulley" && joint.groundA && joint.groundB) {
      ctx.strokeStyle = theme["--mp-rope"];
      const gA = project.screenFromWorld(joint.groundA.x, joint.groundA.y);
      const gB = project.screenFromWorld(joint.groundB.x, joint.groundB.y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(gA.x, gA.y);
      ctx.lineTo(gB.x, gB.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = joint.type === "rope" ? theme["--mp-rope"] : theme["--mp-mid"];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

function paintBodies(ctx, snapshot, theme, project, extruded) {
  for (const body of snapshot.bodies || []) {
    if (extruded) {
      ctx.save();
      ctx.translate(8, 10);
      traceBody(ctx, project, body);
      ctx.fillStyle = theme["--mp-shadow"];
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(5, 6);
      traceBody(ctx, project, body);
      ctx.fillStyle = theme["--mp-body-side"];
      ctx.fill();
      ctx.restore();
    }
    traceBody(ctx, project, body);
    ctx.fillStyle = bodyFill(theme, body);
    ctx.fill();
    if (body.selected) {
      ctx.strokeStyle = theme["--mp-force-applied"];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (body.thrustOn) paintPlume(ctx, project, body, theme);
  }
}

function paintPlume(ctx, project, body, theme) {
  const nose = body.width ? body.width / 2 : body.radius || 0.3;
  const back = project.screenFromWorld(
    body.x - Math.cos(body.angle) * nose,
    body.y - Math.sin(body.angle) * nose
  );
  const tip = project.screenFromWorld(
    body.x - Math.cos(body.angle) * (nose + 0.45),
    body.y - Math.sin(body.angle) * (nose + 0.45)
  );
  ctx.strokeStyle = theme["--mp-thrust"];
  ctx.fillStyle = theme["--mp-thrust"];
  ctx.beginPath();
  ctx.moveTo(back.x, back.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineWidth = 4;
  ctx.stroke();
}

function paintTrails(ctx, snapshot, theme, project) {
  ctx.strokeStyle = theme["--mp-near"];
  ctx.lineWidth = 1;
  for (const trail of snapshot.trails || []) {
    if (!trail.points || trail.points.length < 2) continue;
    ctx.beginPath();
    trail.points.forEach((point, index) => {
      const screen = project.screenFromWorld(point.x, point.y);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.stroke();
  }
}

function paintRuler(ctx, snapshot, theme, project) {
  if (!snapshot.ruler) return;
  const a = project.screenFromWorld(snapshot.ruler.x1, snapshot.ruler.y1);
  const b = project.screenFromWorld(snapshot.ruler.x2, snapshot.ruler.y2);
  ctx.strokeStyle = theme["--mp-velocity"];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function prepare(canvas, snapshot, tilt) {
  const ctx = canvas.getContext("2d");
  const theme = readTheme(typeof document !== "undefined" ? document.documentElement : null);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme["--mp-bg"];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const project = createProjector(canvas.width, canvas.height, snapshot || { bodies: [] }, tilt);
  return { ctx, theme, project };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ reducedMotion?: boolean }} [options]
 * A draw layer. Call draw with a snapshot. worldFromScreen maps pixels
 * back into meters using the same camera as the last draw.
 */
export function createPlaceholderDrawLayer(canvas, options) {
  const reducedMotion = !!(options && options.reducedMotion);
  let project = createProjector(canvas.width || 1, canvas.height || 1, { bodies: [] }, reducedMotion ? 0 : 0.08);
  return {
    id: "placeholder",
    draw(snapshot) {
      const view = prepare(canvas, snapshot, reducedMotion ? 0 : 0.08);
      project = view.project;
      const { ctx, theme } = view;
      drawGrid(ctx, project, theme["--mp-far"], 1.5, 0.2);
      drawGrid(ctx, project, theme["--mp-mid"], 1, 0);
      drawGrid(ctx, project, theme["--mp-grid"], 0.5, 0);
      paintTrails(ctx, snapshot, theme, project);
      paintJoints(ctx, snapshot, theme, project);
      paintBodies(ctx, snapshot, theme, project, true);
      paintRuler(ctx, snapshot, theme, project);
      paintVectors(ctx, snapshot, theme, project);
      paintEnergy(ctx, snapshot, theme);
    },
    worldFromScreen(x, y) {
      return project.worldFromScreen(x, y);
    },
    resize() {}
  };
}

/** Flat schematic. Same snapshot contract, no extrusion and no tilt. */
export function createSchematicDrawLayer(canvas) {
  let project = createProjector(canvas.width || 1, canvas.height || 1, { bodies: [] }, 0);
  return {
    id: "schematic",
    draw(snapshot) {
      const view = prepare(canvas, snapshot, 0);
      project = view.project;
      const { ctx, theme } = view;
      drawGrid(ctx, project, theme["--mp-grid"], 1, 0);
      paintJoints(ctx, snapshot, theme, project);
      paintBodies(ctx, snapshot, theme, project, false);
      paintVectors(ctx, snapshot, theme, project);
    },
    worldFromScreen(x, y) {
      return project.worldFromScreen(x, y);
    },
    resize() {}
  };
}
