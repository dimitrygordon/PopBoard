/**
 * Draw layers for the Mechanics Playground.
 *
 * Each layer only reads a plain snapshot and the theme variables. Swap the
 * whole layer: every factory below returns draw(snapshot) and worldFromScreen.
 * The craft layer is the handmade diorama. Its clock is presentational and
 * is never written back onto the world.
 *
 * Force arrows and the free-body diagram are chalk crayon in the
 * --mp-force-* colors. Thrust is an applied force, so it uses
 * --mp-force-applied. Those variables are read again on every frame.
 * Texture, grain, squash, flutter, and flap amounts are tokens too.
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
  "--mp-force-friction", "--mp-force-applied", "--mp-velocity",
  "--mp-desk", "--mp-paper", "--mp-paper-fiber", "--mp-paper-fold",
  "--mp-cardboard", "--mp-cardboard-edge", "--mp-corrugation",
  "--mp-felt", "--mp-felt-fiber",
  "--mp-tape", "--mp-tape-shine", "--mp-stitch",
  "--mp-twine", "--mp-yarn",
  "--mp-button", "--mp-button-rim", "--mp-button-hole",
  "--mp-cap", "--mp-cap-rim", "--mp-brad",
  "--mp-tissue", "--mp-tissue-hot", "--mp-crayon-grain", "--mp-ruler",
  "--mp-diorama-tilt", "--mp-shadow-x", "--mp-shadow-y",
  "--mp-extrude-x", "--mp-extrude-y",
  "--mp-felt-squash", "--mp-felt-squash-rate", "--mp-felt-breathe",
  "--mp-paper-flutter", "--mp-paper-flutter-rate",
  "--mp-tape-flap", "--mp-tape-flap-rate",
  "--mp-stitch-gap", "--mp-corrugation-pitch", "--mp-torn-amp",
  "--mp-crayon-width", "--mp-crayon-jitter",
  "--mp-yarn-width", "--mp-yarn-wave", "--mp-twine-width",
  "--mp-coil-width", "--mp-coil-pitch", "--mp-coil-stroke",
  "--mp-cap-max-radius", "--mp-tape-size", "--mp-button-holes"
]);

const FALLBACK = Object.freeze({
  "--mp-bg": "#14181f",
  "--mp-far": "#1c2430",
  "--mp-mid": "#2a3544",
  "--mp-near": "#3d4d62",
  "--mp-body": "#d7a15e",
  "--mp-body-side": "#8d5a2b",
  "--mp-shadow": "rgba(0,0,0,0.35)",
  "--mp-rope": "#c2a36a",
  "--mp-spring": "#e0b56a",
  "--mp-ice": "#f7f3e8",
  "--mp-rubber": "#c4493a",
  "--mp-thrust": "#ff7a3c",
  "--mp-vector-force": "#f4f4f4",
  "--mp-vector-velocity": "cyan",
  "--mp-grid": "rgba(90,60,30,0.16)",
  "--mp-ui-card": "#1a212b",
  "--mp-force-gravity": "red",
  "--mp-force-normal": "blue",
  "--mp-force-tension": "gold",
  "--mp-force-friction": "orange",
  "--mp-force-applied": "green",
  "--mp-velocity": "cyan",
  "--mp-desk": "#241910",
  "--mp-paper": "#f3e6c8",
  "--mp-paper-fiber": "rgba(90,60,30,0.16)",
  "--mp-paper-fold": "rgba(120,80,40,0.35)",
  "--mp-cardboard": "#d7a15e",
  "--mp-cardboard-edge": "#8d5a2b",
  "--mp-corrugation": "rgba(90,50,20,0.28)",
  "--mp-felt": "#c4493a",
  "--mp-felt-fiber": "rgba(70,16,12,0.55)",
  "--mp-tape": "#e6d28a",
  "--mp-tape-shine": "rgba(255,255,255,0.65)",
  "--mp-stitch": "#2a2118",
  "--mp-twine": "#c2a36a",
  "--mp-yarn": "#6f8fbf",
  "--mp-button": "#f4f1ea",
  "--mp-button-rim": "#c5bfb2",
  "--mp-button-hole": "#2c2622",
  "--mp-cap": "#d5d8de",
  "--mp-cap-rim": "#8e939c",
  "--mp-brad": "#b08d57",
  "--mp-tissue": "#ffb08a",
  "--mp-tissue-hot": "#ff5a3c",
  "--mp-crayon-grain": "rgba(255,255,255,0.4)",
  "--mp-ruler": "#f7f1dc",
  "--mp-diorama-tilt": "0.06",
  "--mp-shadow-x": "10",
  "--mp-shadow-y": "14",
  "--mp-extrude-x": "5",
  "--mp-extrude-y": "7",
  "--mp-felt-squash": "0.22",
  "--mp-felt-squash-rate": "0.06",
  "--mp-felt-breathe": "0.035",
  "--mp-paper-flutter": "5",
  "--mp-paper-flutter-rate": "4.5",
  "--mp-tape-flap": "0.4",
  "--mp-tape-flap-rate": "3.2",
  "--mp-stitch-gap": "7",
  "--mp-corrugation-pitch": "6",
  "--mp-torn-amp": "2.2",
  "--mp-crayon-width": "3.2",
  "--mp-crayon-jitter": "1.35",
  "--mp-yarn-width": "2.2",
  "--mp-yarn-wave": "3.5",
  "--mp-twine-width": "2.4",
  "--mp-coil-width": "9",
  "--mp-coil-pitch": "11",
  "--mp-coil-stroke": "4.5",
  "--mp-cap-max-radius": "0.12",
  "--mp-tape-size": "16",
  "--mp-button-holes": "4"
});

const patternCache = new Map();

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

function num(theme, name, fallback) {
  const value = parseFloat(theme[name]);
  return Number.isFinite(value) ? value : fallback;
}

function colorFor(theme, kind) {
  return theme[vectorStyleToken(kind)] || theme["--mp-vector-force"];
}

function hashId(id) {
  const text = String(id || "");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
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

function frameTheme(canvas) {
  const ctx = canvas.getContext("2d");
  const theme = readTheme(typeof document !== "undefined" ? document.documentElement : null);
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { ctx, theme };
}

function centroid(pts) {
  let x = 0;
  let y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}

function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function scalePoints(pts, axisX, axisY, along, across) {
  if (pts.length < 3) return pts;
  const c = centroid(pts);
  const len = Math.hypot(axisX, axisY) || 1;
  const ux = axisX / len;
  const uy = axisY / len;
  const px = -uy;
  const py = ux;
  return pts.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const a = dx * ux + dy * uy;
    const b = dx * px + dy * py;
    return { x: c.x + ux * a * along + px * b * across, y: c.y + uy * a * along + py * b * across };
  });
}

function flutterPoints(pts, amount, phase) {
  if (!(amount > 0) || pts.length < 3) return pts;
  const c = centroid(pts);
  let ux = pts[1].x - pts[0].x;
  let uy = pts[1].y - pts[0].y;
  const edge = Math.hypot(ux, uy) || 1;
  ux /= edge;
  uy /= edge;
  const nx = -uy;
  const ny = ux;
  const wave = Math.sin(phase) * amount;
  const bend = Math.sin(phase * 0.8 + 0.6) * amount * 0.45;
  return pts.map((p) => {
    const along = ((p.x - c.x) * ux + (p.y - c.y) * uy) / Math.max(24, edge);
    return {
      x: p.x + nx * (wave + bend * along),
      y: p.y + ny * (wave + bend * along)
    };
  });
}

function insetPoints(pts, amount) {
  const c = centroid(pts);
  return pts.map((p) => {
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * amount, y: p.y + (dy / len) * amount };
  });
}

function paperPattern(theme) {
  const key = "paper|" + theme["--mp-paper"] + "|" + theme["--mp-paper-fiber"];
  if (patternCache.has(key)) return patternCache.get(key);
  if (typeof document === "undefined") return theme["--mp-paper"];
  const tile = document.createElement("canvas");
  tile.width = 96;
  tile.height = 96;
  const g = tile.getContext("2d");
  g.fillStyle = theme["--mp-paper"];
  g.fillRect(0, 0, 96, 96);
  g.strokeStyle = theme["--mp-paper-fiber"];
  g.lineWidth = 1;
  const rand = mulberry(11);
  for (let i = 0; i < 18; i++) {
    const y = rand() * 96;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(96, y + (rand() - 0.5) * 4);
    g.stroke();
  }
  const pattern = g.createPattern(tile, "repeat");
  patternCache.set(key, pattern || theme["--mp-paper"]);
  return patternCache.get(key);
}

function paintSheet(ctx, theme) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = theme["--mp-desk"] || theme["--mp-bg"];
  ctx.fillRect(0, 0, w, h);
  const margin = Math.max(12, Math.min(w, h) * 0.03);
  const rand = mulberry(5);
  const amp = num(theme, "--mp-torn-amp", 3.5);
  const corners = [
    [margin, margin],
    [w - margin, margin],
    [w - margin, h - margin],
    [margin, h - margin]
  ];
  ctx.beginPath();
  for (let i = 0; i < corners.length; i++) {
    const [x0, y0] = corners[i];
    const [x1, y1] = corners[(i + 1) % corners.length];
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const x = x0 + (x1 - x0) * t + (rand() - 0.5) * amp;
      const y = y0 + (y1 - y0) * t + (rand() - 0.5) * amp * 0.6;
      if (i === 0 && s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = paperPattern(theme);
  ctx.fill();
  ctx.strokeStyle = theme["--mp-cardboard-edge"];
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGrid(ctx, project, color, spacing) {
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
  const startX = Math.floor(minX / spacing) * spacing;
  const startY = Math.floor(minY / spacing) * spacing;
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

function yarnAttached(snapshot, body) {
  return (snapshot.joints || []).some((joint) => (
    joint.type === "distance" && (joint.bodyA === body.id || joint.bodyB === body.id)
  ));
}

function craftKind(body, snapshot, theme) {
  if (body.type === "pulley-wheel") return "button";
  if (body.type === "rocket") return "rocket";
  if (body.type === "plank") return "paper";
  if (body.shape === "circle" || body.type === "ball") {
    const capMax = num(theme, "--mp-cap-max-radius", 0.12);
    if (!body.isStatic && yarnAttached(snapshot, body) && (body.radius || 0) <= capMax) return "cap";
    if (body.material === "rubber") return "felt";
    if (body.material === "ice") return "paper";
    if (body.isStatic) return "brad";
    return "disc";
  }
  if (body.material === "rubber") return "felt";
  if (body.material === "ice") return "paper";
  return "cardboard";
}

function screenGeom(project, body) {
  if (body.shape === "circle" || body.type === "ball" || body.type === "pulley-wheel") {
    const c = project.screenFromWorld(body.x, body.y);
    const r = Math.max(4, (body.radius || 0.12) * project.ppm);
    return { kind: "circle", c, r, front: c.y + r };
  }
  const pts = (body.vertices || []).map((vertex) => project.screenFromWorld(vertex.x, vertex.y));
  if (pts.length < 3) return null;
  let front = pts[0].y;
  for (const p of pts) front = Math.max(front, p.y);
  return { kind: "poly", pts, front };
}

function deform(geom, body, kind, theme, clock, reduced) {
  if (!geom || reduced) return geom;
  if (geom.kind === "poly" && kind === "paper") {
    const amount = num(theme, "--mp-paper-flutter", 5);
    const phase = clock * num(theme, "--mp-paper-flutter-rate", 4.5) + hashId(body.id) * 0.001;
    return { ...geom, pts: flutterPoints(geom.pts, amount, phase) };
  }
  if (kind !== "felt") return geom;
  const speed = Math.hypot(body.vx || 0, body.vy || 0);
  const squash = Math.min(
    num(theme, "--mp-felt-squash", 0.22),
    speed * num(theme, "--mp-felt-squash-rate", 0.06)
  );
  const breathe = Math.sin(clock * 2.4 + hashId(body.id) * 0.002) * num(theme, "--mp-felt-breathe", 0.035);
  if (geom.kind === "circle") {
    const along = 1 + Math.max(squash, Math.abs(breathe));
    const across = 1 - Math.max(squash, Math.abs(breathe)) * 0.7;
    return { ...geom, along, across, axisX: body.vx || 1, axisY: -(body.vy || 0) };
  }
  const along = 1 + (squash || breathe);
  const across = 1 - (squash || Math.abs(breathe)) * 0.7;
  const pts = scalePoints(geom.pts, body.vx || 1, -(body.vy || 0.2), along, across);
  return { ...geom, pts };
}

function fillShifted(ctx, drawPath, dx, dy, style) {
  ctx.save();
  ctx.translate(dx, dy);
  drawPath();
  ctx.fillStyle = style;
  ctx.fill();
  ctx.restore();
}

function paintGrain(ctx, theme, seed, span) {
  const rand = mulberry(seed);
  ctx.save();
  ctx.fillStyle = theme["--mp-cardboard-edge"];
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 10; i++) {
    ctx.fillRect((rand() - 0.5) * span, (rand() - 0.5) * span, 1.6, 1.6);
  }
  ctx.restore();
}

function paintCorrugation(ctx, pts, theme, seed) {
  if (pts.length < 2) return;
  const pitch = Math.max(3, num(theme, "--mp-corrugation-pitch", 6));
  ctx.save();
  tracePoly(ctx, pts);
  ctx.clip();
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  ctx.translate(pts[0].x, pts[0].y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.strokeStyle = theme["--mp-corrugation"];
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1;
  for (let y = -240; y <= 240; y += pitch) {
    ctx.beginPath();
    ctx.moveTo(-480, y);
    ctx.lineTo(480, y + Math.sin(y * 0.3) * 0.4);
    ctx.stroke();
  }
  paintGrain(ctx, theme, seed, 180);
  ctx.restore();
}

function paintStitches(ctx, pts, theme) {
  if (pts.length < 3) return;
  const gap = Math.max(3, num(theme, "--mp-stitch-gap", 7));
  const inner = insetPoints(pts, 5);
  ctx.save();
  ctx.strokeStyle = theme["--mp-stitch"];
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, gap]);
  tracePoly(ctx, inner);
  ctx.stroke();
  ctx.restore();
}

function paintTornStroke(ctx, pts, theme, seed) {
  const amp = num(theme, "--mp-torn-amp", 2.2);
  const rand = mulberry(seed ^ 99);
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const n = pts[(i + 1) % pts.length];
    const steps = 3;
    const edge = Math.hypot(n.x - p.x, n.y - p.y) || 1;
    const wobble = Math.min(amp, edge * 0.12);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = p.x + (n.x - p.x) * t + (rand() - 0.5) * wobble;
      const y = p.y + (n.y - p.y) * t + (rand() - 0.5) * wobble;
      if (i === 0 && s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.strokeStyle = theme["--mp-cardboard-edge"];
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function paintTapeCorners(ctx, pts, theme, clock, reduced, seed) {
  const size = num(theme, "--mp-tape-size", 16);
  const flapAmp = reduced ? 0 : num(theme, "--mp-tape-flap", 0.4);
  const rate = num(theme, "--mp-tape-flap-rate", 3.2);
  pts.forEach((corner, index) => {
    const next = pts[(index + 1) % pts.length];
    const angle = Math.atan2(next.y - corner.y, next.x - corner.x);
    const flap = Math.sin(clock * rate + index + seed * 0.0001) * flapAmp;
    ctx.save();
    ctx.translate(corner.x, corner.y);
    ctx.rotate(angle + flap);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = theme["--mp-tape"];
    ctx.fillRect(0, -size * 0.28, size, size * 0.56);
    ctx.strokeStyle = theme["--mp-tape-shine"];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(size - 3, -1);
    ctx.stroke();
    ctx.restore();
  });
}

function paintFeltFace(ctx, drawPath, theme, seed, center, span) {
  drawPath();
  ctx.fillStyle = theme["--mp-felt"] || theme["--mp-rubber"];
  ctx.fill();
  ctx.save();
  drawPath();
  ctx.clip();
  const rand = mulberry(seed);
  ctx.strokeStyle = theme["--mp-felt-fiber"];
  ctx.lineWidth = 1;
  const reach = span || 40;
  for (let i = 0; i < 16; i++) {
    const x = center.x + (rand() - 0.5) * reach;
    const y = center.y + (rand() - 0.5) * reach;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * reach * 0.22, y + (rand() - 0.5) * reach * 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

function withCircleSquash(ctx, geom, draw) {
  const c = geom.c;
  if (!geom.along) {
    draw();
    return;
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  const len = Math.hypot(geom.axisX, geom.axisY) || 1;
  ctx.rotate(Math.atan2(geom.axisY, geom.axisX));
  ctx.scale(geom.along, geom.across);
  ctx.rotate(-Math.atan2(geom.axisY, geom.axisX));
  ctx.translate(-c.x, -c.y);
  draw();
  ctx.restore();
}

function paintButton(ctx, c, r, theme) {
  const holes = Math.max(2, Math.round(num(theme, "--mp-button-holes", 4)));
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  const gloss = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.1, c.x, c.y, r);
  gloss.addColorStop(0, theme["--mp-button"]);
  gloss.addColorStop(1, theme["--mp-button-rim"]);
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.strokeStyle = theme["--mp-button-rim"];
  ctx.stroke();
  ctx.fillStyle = theme["--mp-button-hole"];
  for (let i = 0; i < holes; i++) {
    const a = -Math.PI / 2 + (i / holes) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(a) * r * 0.42, c.y + Math.sin(a) * r * 0.42, Math.max(1.5, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCap(ctx, c, r, theme) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = theme["--mp-cap-rim"];
  ctx.fill();
  ctx.beginPath();
  const n = Math.max(10, Math.min(18, Math.round(r / 1.6)));
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = r * (i % 2 === 0 ? 0.9 : 0.74);
    const x = c.x + Math.cos(a) * rad;
    const y = c.y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = theme["--mp-cap"];
  ctx.fill();
  ctx.strokeStyle = theme["--mp-cap-rim"];
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.38, 0, Math.PI * 2);
  ctx.stroke();
}

function paintBrad(ctx, c, r, theme) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = theme["--mp-cardboard"];
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme["--mp-cardboard-edge"];
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, Math.max(2, r * 0.28), 0, Math.PI * 2);
  ctx.fillStyle = theme["--mp-brad"];
  ctx.fill();
}

function paintDisc(ctx, c, r, theme) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = theme["--mp-cardboard"];
  ctx.fill();
  ctx.strokeStyle = theme["--mp-cardboard-edge"];
  ctx.lineWidth = 2;
  ctx.stroke();
}

function paintPaperDisc(ctx, c, r, theme) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fillStyle = theme["--mp-ice"] || theme["--mp-paper"];
  ctx.fill();
  ctx.strokeStyle = theme["--mp-paper-fold"];
  ctx.beginPath();
  ctx.moveTo(c.x - r, c.y);
  ctx.lineTo(c.x + r, c.y);
  ctx.stroke();
}

function paintRocketNose(ctx, project, body, theme) {
  const length = body.width ? body.width / 2 : 0.4;
  const half = body.height ? body.height / 2 : 0.16;
  const angle = body.angle || 0;
  const tip = project.screenFromWorld(
    body.x + Math.cos(angle) * (length + 0.16),
    body.y + Math.sin(angle) * (length + 0.16)
  );
  const left = project.screenFromWorld(
    body.x + Math.cos(angle) * length * 0.55 + Math.cos(angle + Math.PI / 2) * half,
    body.y + Math.sin(angle) * length * 0.55 + Math.sin(angle + Math.PI / 2) * half
  );
  const right = project.screenFromWorld(
    body.x + Math.cos(angle) * length * 0.55 + Math.cos(angle - Math.PI / 2) * half,
    body.y + Math.sin(angle) * length * 0.55 + Math.sin(angle - Math.PI / 2) * half
  );
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fillStyle = theme["--mp-paper"];
  ctx.fill();
  ctx.strokeStyle = theme["--mp-cardboard-edge"];
  ctx.stroke();
}

function paintTissue(ctx, project, body, theme, clock, reduced) {
  const nose = body.width ? body.width / 2 : body.radius || 0.3;
  const angle = body.angle || 0;
  const origin = project.screenFromWorld(
    body.x - Math.cos(angle) * nose,
    body.y - Math.sin(angle) * nose
  );
  const dirX = -Math.cos(angle);
  const dirY = -Math.sin(angle);
  const flicker = reduced ? 1 : 0.72 + 0.28 * Math.sin(clock * 16 + hashId(body.id));
  const tongues = [
    { len: 0.34, color: "--mp-tissue", spread: 0.12 },
    { len: 0.58, color: "--mp-tissue-hot", spread: 0.05 },
    { len: 0.4, color: "--mp-thrust", spread: -0.1 }
  ];
  tongues.forEach((tongue, index) => {
    const rand = mulberry(hashId(body.id) + index * 19);
    const tip = project.screenFromWorld(
      body.x - Math.cos(angle) * nose + dirX * tongue.len * flicker,
      body.y - Math.sin(angle) * nose + dirY * tongue.len * flicker
    );
    const side = project.screenFromWorld(
      body.x - Math.cos(angle) * nose + Math.cos(angle + Math.PI / 2) * tongue.spread,
      body.y - Math.sin(angle) * nose + Math.sin(angle + Math.PI / 2) * tongue.spread
    );
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(side.x, side.y);
    const steps = 4;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = side.x + (tip.x - side.x) * t + (rand() - 0.5) * num(theme, "--mp-torn-amp", 3.5);
      const y = side.y + (tip.y - side.y) * t + (rand() - 0.5) * num(theme, "--mp-torn-amp", 3.5);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = theme[tongue.color] || theme["--mp-thrust"];
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function paintCraftBody(ctx, project, snapshot, body, theme, clock, reduced) {
  const kind = craftKind(body, snapshot, theme);
  const geom = deform(screenGeom(project, body), body, kind, theme, clock, reduced);
  if (!geom) return;
  const shadowX = num(theme, "--mp-shadow-x", 10);
  const shadowY = num(theme, "--mp-shadow-y", 14);
  const extrudeX = num(theme, "--mp-extrude-x", 5);
  const extrudeY = num(theme, "--mp-extrude-y", 7);
  const seed = hashId(body.id);

  if (geom.kind === "circle") {
    const draw = () => {
      ctx.beginPath();
      ctx.arc(geom.c.x, geom.c.y, geom.r, 0, Math.PI * 2);
    };
    withCircleSquash(ctx, geom, () => {
      fillShifted(ctx, draw, shadowX, shadowY, theme["--mp-shadow"]);
      if (kind === "button") paintButton(ctx, geom.c, geom.r, theme);
      else if (kind === "cap") paintCap(ctx, geom.c, geom.r, theme);
      else if (kind === "brad") paintBrad(ctx, geom.c, geom.r, theme);
      else if (kind === "felt") paintFeltFace(ctx, draw, theme, seed, geom.c, geom.r * 1.8);
      else if (kind === "paper") paintPaperDisc(ctx, geom.c, geom.r, theme);
      else paintDisc(ctx, geom.c, geom.r, theme);
    });
    if (body.selected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(geom.c.x, geom.c.y, geom.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = theme["--mp-stitch"];
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  const pts = geom.pts;
  const draw = () => tracePoly(ctx, pts);
  fillShifted(ctx, draw, shadowX, shadowY, theme["--mp-shadow"]);
  if (kind === "cardboard" || kind === "rocket") {
    fillShifted(ctx, draw, extrudeX, extrudeY, theme["--mp-cardboard-edge"] || theme["--mp-body-side"]);
  }
  draw();
  if (kind === "felt") {
    const c = centroid(pts);
    const span = pts.reduce((max, p) => Math.max(max, Math.hypot(p.x - c.x, p.y - c.y)), 12) * 2;
    paintFeltFace(ctx, draw, theme, seed, c, span);
  }
  else if (kind === "paper") {
    ctx.fillStyle = theme["--mp-ice"] || theme["--mp-paper"];
    ctx.fill();
    ctx.save();
    tracePoly(ctx, pts);
    ctx.clip();
    const c = centroid(pts);
    ctx.strokeStyle = theme["--mp-paper-fold"];
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(pts[2] ? pts[2].x : pts[1].x, pts[2] ? pts[2].y : pts[1].y);
    ctx.stroke();
    ctx.restore();
    paintTornStroke(ctx, pts, theme, seed);
  } else {
    ctx.fillStyle = theme["--mp-cardboard"] || theme["--mp-body"];
    ctx.fill();
    paintCorrugation(ctx, pts, theme, seed);
    paintTornStroke(ctx, pts, theme, seed);
    paintStitches(ctx, pts, theme);
    paintTapeCorners(ctx, pts, theme, clock, reduced, seed);
  }
  if (kind === "rocket") paintRocketNose(ctx, project, body, theme);
  if (body.selected) {
    ctx.save();
    tracePoly(ctx, pts);
    ctx.strokeStyle = theme["--mp-stitch"];
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }
}

function wavySegment(ctx, a, b, waves, amp, width, color, phase) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  ctx.beginPath();
  const steps = Math.max(8, Math.round(length / 6));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const side = Math.sin(t * waves * Math.PI * 2 + phase) * amp;
    const x = a.x + ux * length * t + nx * side;
    const y = a.y + uy * length * t + ny * side;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
}

function paintYarn(ctx, a, b, theme, clock, reduced, selected) {
  const amp = num(theme, "--mp-yarn-wave", 3.5);
  const width = num(theme, "--mp-yarn-width", 2.2) * (selected ? 1.6 : 1);
  const phase = reduced ? 0.4 : clock * 2.2;
  wavySegment(ctx, a, b, 3, amp, width, theme["--mp-yarn"], phase);
  wavySegment(ctx, a, b, 3, amp * 0.45, 1, theme["--mp-paper"], phase + 1);
}

function paintTwine(ctx, points, theme, clock, reduced, selected) {
  const amp = num(theme, "--mp-yarn-wave", 3.5) * 0.55;
  const width = num(theme, "--mp-twine-width", 2.4) * (selected ? 1.5 : 1);
  const phase = reduced ? 0.2 : clock * 1.6;
  for (let i = 0; i < points.length - 1; i++) {
    wavySegment(ctx, points[i], points[i + 1], 5, amp, width, theme["--mp-twine"] || theme["--mp-rope"], phase + i);
    wavySegment(ctx, points[i], points[i + 1], 5, amp, width * 0.45, theme["--mp-paper"], phase + i + 2);
  }
}

function paintCoil(ctx, a, b, theme, selected) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const pitch = Math.max(6, num(theme, "--mp-coil-pitch", 11));
  const amp = num(theme, "--mp-coil-width", 9);
  const turns = Math.max(3, Math.round(length / pitch));
  ctx.beginPath();
  const steps = turns * 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const side = Math.sin(t * turns * Math.PI * 2) * amp;
    const x = a.x + ux * length * t + nx * side;
    const y = a.y + uy * length * t + ny * side;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme["--mp-cardboard-edge"];
  ctx.lineWidth = num(theme, "--mp-coil-stroke", 4.5) + 2;
  ctx.stroke();
  ctx.strokeStyle = theme["--mp-spring"] || theme["--mp-cardboard"];
  ctx.lineWidth = num(theme, "--mp-coil-stroke", 4.5) * (selected ? 1.3 : 1);
  ctx.stroke();
}

function paintTapeBridge(ctx, a, b, theme, clock, reduced) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const flap = reduced ? 0 : Math.sin(clock * num(theme, "--mp-tape-flap-rate", 3.2)) * num(theme, "--mp-tape-flap", 0.4);
  const length = Math.max(18, Math.hypot(b.x - a.x, b.y - a.y));
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle + flap * 0.25);
  ctx.fillStyle = theme["--mp-tape"];
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-length / 2, -6, length, 12);
  ctx.strokeStyle = theme["--mp-tape-shine"];
  ctx.beginPath();
  ctx.moveTo(-length / 2 + 3, -2);
  ctx.lineTo(length / 2 - 3, -2);
  ctx.stroke();
  ctx.restore();
}

function paintCraftJoints(ctx, snapshot, theme, project, clock, reduced) {
  for (const joint of snapshot.joints || []) {
    const a = project.screenFromWorld(joint.ax, joint.ay);
    const b = project.screenFromWorld(joint.bx, joint.by);
    if (joint.type === "spring") paintCoil(ctx, a, b, theme, joint.selected);
    else if (joint.type === "pulley" && joint.groundA && joint.groundB) {
      const gA = project.screenFromWorld(joint.groundA.x, joint.groundA.y);
      const gB = project.screenFromWorld(joint.groundB.x, joint.groundB.y);
      paintTwine(ctx, [a, gA, gB, b], theme, clock, reduced, joint.selected);
    } else if (joint.type === "rope") paintTwine(ctx, [a, b], theme, clock, reduced, joint.selected);
    else if (joint.type === "distance") paintYarn(ctx, a, b, theme, clock, reduced, joint.selected);
    else if (joint.type === "weld") paintTapeBridge(ctx, a, b, theme, clock, reduced);
    else {
      ctx.save();
      ctx.strokeStyle = theme["--mp-stitch"];
      ctx.lineWidth = joint.selected ? 2.4 : 1.4;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function paintTrails(ctx, snapshot, theme, project) {
  ctx.save();
  ctx.fillStyle = theme["--mp-stitch"];
  for (const trail of snapshot.trails || []) {
    (trail.points || []).forEach((point, index) => {
      const screen = project.screenFromWorld(point.x, point.y);
      ctx.globalAlpha = 0.15 + (index / (trail.points.length || 1)) * 0.45;
      ctx.fillRect(screen.x, screen.y, 2.2, 2.2);
    });
  }
  ctx.restore();
}

function paintRuler(ctx, snapshot, theme, project) {
  if (!snapshot.ruler) return;
  const a = project.screenFromWorld(snapshot.ruler.x1, snapshot.ruler.y1);
  const b = project.screenFromWorld(snapshot.ruler.x2, snapshot.ruler.y2);
  ctx.save();
  ctx.strokeStyle = theme["--mp-ruler"];
  ctx.lineWidth = 8;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = theme["--mp-stitch"];
  ctx.lineWidth = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function crayonArrow(ctx, x0, y0, x1, y1, color, theme, reduced) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  if (length < 4) return;
  const ux = dx / length;
  const uy = dy / length;
  const jitter = reduced ? 0 : num(theme, "--mp-crayon-jitter", 1.35);
  const width = num(theme, "--mp-crayon-width", 3.2);
  const seed = (Math.round(x0) * 73856093) ^ (Math.round(y0) * 19349663) ^ (Math.round(x1) * 83492791);
  const rand = mulberry(seed);
  const head = Math.min(16, length * 0.32);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const passes = reduced ? 1 : 3;
  for (let pass = 0; pass < passes; pass++) {
    ctx.globalAlpha = reduced ? 0.9 : 0.4 + pass * 0.18;
    ctx.lineWidth = width * (reduced ? 1.3 : 0.65 + pass * 0.28);
    ctx.beginPath();
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t + (rand() - 0.5) * jitter;
      const y = y0 + dy * t + (rand() - 0.5) * jitter;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.9;
  const tipX = x1 + (rand() - 0.5) * jitter;
  const tipY = y1 + (rand() - 0.5) * jitter;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * head - uy * head * 0.48, tipY - uy * head + ux * head * 0.48);
  ctx.lineTo(tipX - ux * head + uy * head * 0.48, tipY - uy * head - ux * head * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = theme["--mp-crayon-grain"] || "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    ctx.beginPath();
    ctx.moveTo(x - uy * 3, y + ux * 3);
    ctx.lineTo(x + uy * 3, y - ux * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function paintVectors(ctx, snapshot, theme, project, reduced) {
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
    crayonArrow(ctx, origin.x, origin.y, tipX, tipY, colorFor(theme, vector.kind), theme, reduced);
  }
}

function bodyFill(theme, body) {
  if (body.material === "ice") return theme["--mp-ice"];
  if (body.material === "rubber") return theme["--mp-felt"] || theme["--mp-rubber"];
  return theme["--mp-cardboard"] || theme["--mp-body"];
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
  tracePoly(ctx, points);
}

function paintPlainJoints(ctx, snapshot, theme, project) {
  for (const joint of snapshot.joints || []) {
    const a = project.screenFromWorld(joint.ax, joint.ay);
    const b = project.screenFromWorld(joint.bx, joint.by);
    ctx.lineWidth = joint.selected ? 3 : 1.5;
    ctx.beginPath();
    if (joint.type === "pulley" && joint.groundA && joint.groundB) {
      const gA = project.screenFromWorld(joint.groundA.x, joint.groundA.y);
      const gB = project.screenFromWorld(joint.groundB.x, joint.groundB.y);
      ctx.strokeStyle = theme["--mp-twine"] || theme["--mp-rope"];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(gA.x, gA.y);
      ctx.lineTo(gB.x, gB.y);
      ctx.lineTo(b.x, b.y);
    } else {
      ctx.strokeStyle = joint.type === "spring"
        ? (theme["--mp-spring"])
        : (joint.type === "rope" || joint.type === "distance" ? theme["--mp-yarn"] || theme["--mp-rope"] : theme["--mp-mid"]);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
}

function paintPlainBodies(ctx, snapshot, theme, project, extruded) {
  for (const body of snapshot.bodies || []) {
    if (extruded) {
      ctx.save();
      ctx.translate(num(theme, "--mp-shadow-x", 8), num(theme, "--mp-shadow-y", 10));
      traceBody(ctx, project, body);
      ctx.fillStyle = theme["--mp-shadow"];
      ctx.fill();
      ctx.restore();
    }
    traceBody(ctx, project, body);
    ctx.fillStyle = bodyFill(theme, body);
    ctx.fill();
    if (body.selected) {
      ctx.strokeStyle = theme["--mp-stitch"];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function install(canvas, tiltFor, id, paint) {
  let project = createProjector(canvas.width || 1, canvas.height || 1, { bodies: [] }, 0);
  let clock = 0;
  let last = 0;
  return {
    id,
    draw(snapshot) {
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      const reduced = tiltFor.reduced;
      if (!reduced && last) clock += Math.min(0.05, (now - last) / 1000);
      last = now;
      const { ctx, theme } = frameTheme(canvas);
      if (!ctx) return;
      const tilt = reduced ? 0 : tiltFor.tilt(theme);
      project = createProjector(canvas.width, canvas.height, snapshot || { bodies: [] }, tilt);
      paint({ ctx, theme, project, snapshot: snapshot || { bodies: [] }, clock, reduced });
    },
    worldFromScreen(x, y) {
      return project.worldFromScreen(x, y);
    },
    resize() {}
  };
}

/**
 * Handmade collage. Cardboard, felt, paper, buttons, bottle caps,
 * twine, yarn, cardboard coils, torn tissue, and crayon arrows.
 * @param {HTMLCanvasElement} canvas
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function createCraftDrawLayer(canvas, options) {
  const reduced = !!(options && options.reducedMotion);
  return install(canvas, {
    reduced,
    tilt(theme) { return num(theme, "--mp-diorama-tilt", 0.06); }
  }, "craft", ({ ctx, theme, project, snapshot, clock, reduced: still }) => {
    paintSheet(ctx, theme);
    drawGrid(ctx, project, theme["--mp-grid"], 0.5);
    paintTrails(ctx, snapshot, theme, project);
    paintCraftJoints(ctx, snapshot, theme, project, clock, still);
    const bodies = (snapshot.bodies || [])
      .map((body) => ({ body, geom: screenGeom(project, body) }))
      .filter((item) => item.geom)
      .sort((a, b) => a.geom.front - b.geom.front);
    for (const item of bodies) paintCraftBody(ctx, project, snapshot, item.body, theme, clock, still);
    for (const body of snapshot.bodies || []) {
      if (body.thrustOn) paintTissue(ctx, project, body, theme, clock, still);
    }
    paintRuler(ctx, snapshot, theme, project);
    paintVectors(ctx, snapshot, theme, project, still);
  });
}

/** @param {HTMLCanvasElement} canvas */
export function createPlaceholderDrawLayer(canvas, options) {
  const reduced = !!(options && options.reducedMotion);
  return install(canvas, {
    reduced,
    tilt() { return reduced ? 0 : 0.08; }
  }, "placeholder", ({ ctx, theme, project, snapshot, reduced: still }) => {
    ctx.fillStyle = theme["--mp-bg"];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, project, theme["--mp-grid"], 0.5);
    paintPlainJoints(ctx, snapshot, theme, project);
    paintPlainBodies(ctx, snapshot, theme, project, true);
    paintVectors(ctx, snapshot, theme, project, still);
  });
}

/** Flat diagram. Same snapshot contract, no diorama tilt or material motion. */
export function createSchematicDrawLayer(canvas) {
  return install(canvas, {
    reduced: true,
    tilt() { return 0; }
  }, "schematic", ({ ctx, theme, project, snapshot }) => {
    ctx.fillStyle = theme["--mp-bg"];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, project, theme["--mp-grid"], 1);
    paintPlainJoints(ctx, snapshot, theme, project);
    paintPlainBodies(ctx, snapshot, theme, project, false);
    paintVectors(ctx, snapshot, theme, project, true);
  });
}
