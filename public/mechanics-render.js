/**
 * Draw layers for the Mechanics Playground.
 *
 * Each layer only reads a plain snapshot and the theme variables. Swap the
 * whole layer: every factory below returns draw(snapshot) and worldFromScreen.
 * The craft layer is the handmade diorama. Its clock is presentational and
 * is never written back onto the world. Pan, zoom, and follow live on the
 * layer as a camera. The world does not know about the view.
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
  "--mp-cap-max-radius", "--mp-tape-size", "--mp-button-holes",
  "--mp-sky", "--mp-hill-far", "--mp-hill-mid", "--mp-hill-near", "--mp-gear", "--mp-wood", "--mp-wood-grain", "--mp-cellophane", "--mp-rubber-mat", "--mp-foil", "--mp-sandpaper", "--mp-flute-light", "--mp-button-felt", "--mp-motor", "--mp-flame-core", "--mp-arrow-halo"
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
  "--mp-button-holes": "4",
  "--mp-sky": "#d8b56a",
  "--mp-hill-far": "#c3b77e",
  "--mp-hill-mid": "#a2ad6b",
  "--mp-hill-near": "#86985a",
  "--mp-gear": "#a77a45",
  "--mp-wood": "#c98f52",
  "--mp-wood-grain": "#8a5527",
  "--mp-cellophane": "#8fcbea",
  "--mp-rubber-mat": "#3a3639",
  "--mp-foil": "#c9ced4",
  "--mp-sandpaper": "#6f6a63",
  "--mp-flute-light": "#c79a5e",
  "--mp-button-felt": "#4f78a8",
  "--mp-motor": "#c8372a",
  "--mp-flame-core": "#f7c948",
  "--mp-arrow-halo": "rgba(35,20,6,0.55)"
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

function bodyPoints(body) {
  if (!body) return [];
  if (body.vertices && body.vertices.length) return body.vertices;
  if (body.radius) {
    const r = body.radius;
    return [
      { x: body.x - r, y: body.y - r },
      { x: body.x + r, y: body.y + r }
    ];
  }
  const hx = body.hx || (body.width || 0) / 2;
  const hy = body.hy || (body.height || 0) / 2;
  if (hx || hy) {
    return [
      { x: body.x - hx, y: body.y - hy },
      { x: body.x + hx, y: body.y + hy }
    ];
  }
  return [{ x: body.x, y: body.y }];
}

function enclose(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

function boundsOf(snapshot) {
  const action = [];
  const floors = [];
  for (const body of snapshot.bodies || []) {
    if (body.type === "ground") floors.push(body);
    else action.push(...bodyPoints(body));
  }
  for (const joint of snapshot.joints || []) {
    action.push({ x: joint.ax, y: joint.ay }, { x: joint.bx, y: joint.by });
    if (joint.groundA) action.push(joint.groundA);
    if (joint.groundB) action.push(joint.groundB);
  }
  let box = enclose(action);
  if (!box) {
    const all = [];
    for (const body of snapshot.bodies || []) all.push(...bodyPoints(body));
    return enclose(all) || { minX: -4, maxX: 4, minY: -1, maxY: 4 };
  }
  // A long floor should not zoom the shot out. Keep its surface under the
  // parts, and let the plank run off the sides of the frame.
  for (const ground of floors) {
    const span = enclose(bodyPoints(ground));
    if (!span) continue;
    const overlaps = span.maxX >= box.minX && span.minX <= box.maxX;
    if (!overlaps) continue;
    box.minY = Math.min(box.minY, span.minY);
    box.maxY = Math.max(box.maxY, span.maxY);
  }
  return box;
}

const PPM_MIN = 20;
const PPM_MAX = 220;

function createCamera() {
  return { cx: 0, cy: 1.5, ppm: 64, shear: 0, framed: false, followId: null };
}

function cameraProjector(width, height, camera) {
  const ppm = camera.ppm || 64;
  const cx = camera.cx;
  const cy = camera.cy;
  const shear = camera.shear || 0;
  const w = width || 1;
  const h = height || 1;
  return {
    ppm,
    worldFromScreen(sx, sy) {
      let px = sx - w / 2;
      const py = sy - h / 2;
      px -= py * shear;
      return { x: cx + px / ppm, y: cy - py / ppm };
    },
    screenFromWorld(x, y) {
      let px = (x - cx) * ppm;
      const py = -(y - cy) * ppm;
      px += py * shear;
      return { x: px + w / 2, y: py + h / 2 };
    }
  };
}

function frameInsetsOf(insets, width, height) {
  const src = insets || {};
  const left = Math.max(0, Number(src.left) || 0);
  const right = Math.max(0, Number(src.right) || 0);
  const top = Math.max(0, Number(src.top) || 0);
  const bottom = Math.max(0, Number(src.bottom) || 0);
  const roomW = Math.max(48, width - left - right);
  const roomH = Math.max(48, height - top - bottom);
  return { left, top, roomW, roomH };
}

function frameCamera(camera, width, height, snapshot, insets) {
  if (!(width >= 2) || !(height >= 2)) return;
  const view = frameInsetsOf(insets, width, height);
  const bounds = boundsOf(snapshot || { bodies: [] });
  const worldW = Math.max(1.6, bounds.maxX - bounds.minX);
  const worldH = Math.max(1.6, bounds.maxY - bounds.minY);
  const margin = 1.22;
  const ppm = Math.min(view.roomW / (worldW * margin), view.roomH / (worldH * margin));
  camera.ppm = Math.max(PPM_MIN, Math.min(PPM_MAX, ppm));
  const wx = (bounds.minX + bounds.maxX) / 2;
  const wy = (bounds.minY + bounds.maxY) / 2;
  const sx = view.left + view.roomW / 2;
  const sy = view.top + view.roomH / 2;
  camera.cx = wx - (sx - width / 2) / camera.ppm;
  camera.cy = wy + (sy - height / 2) / camera.ppm;
  camera.framed = true;
  camera.followId = null;
  camera.userAdjusted = false;
  clampCamera(camera);
}

function clampCamera(camera) {
  camera.cx = Math.max(-48, Math.min(48, camera.cx));
  camera.cy = Math.max(-16, Math.min(40, camera.cy));
  camera.ppm = Math.max(PPM_MIN, Math.min(PPM_MAX, camera.ppm));
}

function easeFollow(camera, snapshot, dt) {
  if (!camera.followId) return;
  const body = (snapshot.bodies || []).find((item) => item.id === camera.followId && !item.isStatic);
  if (!body) return;
  const step = dt > 0 ? dt : 1 / 60;
  const t = 1 - Math.exp(-step * 3.2);
  camera.cx += (body.x - camera.cx) * t;
  camera.cy += (body.y - camera.cy) * t;
  clampCamera(camera);
}

function handlePoint(body) {
  const reach = (body.shape === "circle" ? (body.radius || 0.2) : Math.max(body.hx || 0.2, body.hy || 0.15)) + 0.34;
  return {
    x: body.x + Math.cos(body.angle || 0) * reach,
    y: body.y + Math.sin(body.angle || 0) * reach
  };
}

function crayonArc(ctx, cx, cy, radius, a0, a1, color, theme, unit) {
  const width = num(theme, "--mp-crayon-width", 3.2) * unit;
  const jitter = num(theme, "--mp-crayon-jitter", 1.35) * unit;
  const steps = 12;
  const rand = mulberry((Math.round(cx) * 17) ^ (Math.round(cy) * 31) ^ Math.round(radius));
  const point = (i, wobble) => {
    const t = i / steps;
    const angle = a0 + (a1 - a0) * t;
    const extra = wobble && i && i < steps ? (rand() - 0.5) * jitter : 0;
    return {
      x: cx + Math.cos(angle) * (radius + extra),
      y: cy + Math.sin(angle) * (radius + extra)
    };
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme["--mp-arrow-halo"] || "rgba(35,20,6,0.55)";
  ctx.lineWidth = width * 2.15;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = point(i, false);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 1.35;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = point(i, true);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme["--mp-crayon-grain"] || "rgba(255,255,255,0.45)";
  for (let i = 1; i < steps; i += 2) {
    const p = point(i, false);
    ctx.fillRect(p.x, p.y, 1.1 * unit, 1.1 * unit);
  }
  ctx.restore();
}

function paintGrabHandle(ctx, project, snapshot, theme, u) {
  const body = (snapshot.bodies || []).find((item) => item.selected);
  if (!body) return;
  const unit = u || unitOf(ctx);
  const handle = handlePoint(body);
  const hub = project.screenFromWorld(body.x, body.y);
  const tip = project.screenFromWorld(handle.x, handle.y);
  const dx = tip.x - hub.x;
  const dy = tip.y - hub.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const aim = Math.atan2(dy, dx);
  const felt = 13 * unit;
  ctx.save();
  crayonArc(ctx, hub.x, hub.y, Math.max(22 * unit, len * 0.62), aim - 0.95, aim + 0.35, theme["--mp-yarn"] || "#c8372a", theme, unit);
  ctx.strokeStyle = theme["--mp-twine"] || "#c2a36a";
  ctx.lineWidth = num(theme, "--mp-twine-width", 2.4) * unit;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hub.x + ux * len * 0.42, hub.y + uy * len * 0.42);
  ctx.lineTo(tip.x - ux * (felt + 2 * unit), tip.y - uy * (felt + 2 * unit));
  ctx.stroke();
  softShadow(ctx, () => {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, felt, 0, Math.PI * 2);
  }, 3 * unit, 5 * unit, theme);
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, felt, 0, Math.PI * 2);
  ctx.fillStyle = theme["--mp-button-felt"] || theme["--mp-felt"] || "#4f78a8";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = theme["--mp-felt-fiber"] || "rgba(70,16,12,0.55)";
  ctx.lineWidth = 0.8 * unit;
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(tip.x - felt, tip.y + i * 3.2 * unit);
    ctx.lineTo(tip.x + felt, tip.y + i * 3.2 * unit + 2 * unit);
  }
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, felt - 1.4 * unit, 0, Math.PI * 2);
  ctx.strokeStyle = theme["--mp-stitch"] || "#2a2118";
  ctx.lineWidth = 1.1 * unit;
  ctx.setLineDash([2.2 * unit, 2.4 * unit]);
  ctx.stroke();
  ctx.setLineDash([]);
  paintBrass(ctx, tip, felt * 0.42, theme, unit);
  ctx.restore();
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
  if (isShelf(body)) return "shelf";
  if (body.type === "wedge") return "wedge";
  if (body.type === "wall") return body.isStatic && body.friction <= 0.001 ? "foil" : "wall";
  if (body.material === "rubber") return "felt";
  if (body.material === "ice") return "ice";
  if (body.material === "wood") return "wood";
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

/* ---------------------------------------------------------------------------
 * Paper-craft art. Everything below is presentation only: it reads the
 * snapshot and theme, never the world. Textures are painted once into small
 * offscreen canvases and reused as patterns or sprites, so a frame is only
 * fills, strokes, and drawImage calls (no filters, no shadowBlur).
 * ------------------------------------------------------------------------- */

const LIGHT = Object.freeze({ x: -0.7071, y: -0.7071 });

function makeCanvas(w, h) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function cached(key, build) {
  if (patternCache.has(key)) return patternCache.get(key);
  const value = build();
  patternCache.set(key, value || null);
  return value || null;
}

function tilePattern(key, w, h, paint) {
  return cached("pat|" + key, () => {
    const tile = makeCanvas(w, h);
    if (!tile) return null;
    const g = tile.getContext("2d");
    if (!g) return null;
    paint(g, w, h);
    return g.createPattern(tile, "repeat");
  });
}

function speckle(g, w, h, rand, count, color, size, alpha) {
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    g.globalAlpha = alpha * (0.4 + rand() * 0.6);
    const s = size * (0.5 + rand());
    g.fillRect(rand() * w, rand() * h, s, s);
  }
  g.globalAlpha = 1;
}

function fibers(g, w, h, rand, count, color, len, alpha, width) {
  g.strokeStyle = color;
  g.lineWidth = width || 0.6;
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI * 2;
    const l = len * (0.4 + rand());
    g.globalAlpha = alpha * (0.4 + rand() * 0.6);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function kraftPattern(theme, base) {
  const color = base || theme["--mp-cardboard"];
  return tilePattern("kraft|" + color, 128, 128, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    const rand = mulberry(31);
    speckle(g, w, h, rand, 520, "#5a3a18", 1.1, 0.16);
    speckle(g, w, h, rand, 260, "#fff3d8", 1.1, 0.2);
    fibers(g, w, h, rand, 70, "#6b4520", 7, 0.18);
    fibers(g, w, h, rand, 40, "#fff0d0", 6, 0.22);
  });
}

function corrugatedPattern(theme) {
  const pitch = Math.max(4, Math.round(num(theme, "--mp-corrugation-pitch", 6)));
  const color = theme["--mp-cardboard"];
  return tilePattern("corr|" + color + "|" + pitch, pitch * 20, 128, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += pitch) {
      const band = g.createLinearGradient(x, 0, x + pitch, 0);
      band.addColorStop(0, "rgba(255,240,210,0.16)");
      band.addColorStop(0.5, "rgba(0,0,0,0)");
      band.addColorStop(1, "rgba(80,45,15,0.14)");
      g.fillStyle = band;
      g.fillRect(x, 0, pitch, h);
    }
    const rand = mulberry(47);
    speckle(g, w, h, rand, 600, "#5a3a18", 1, 0.14);
    speckle(g, w, h, rand, 240, "#fff3d8", 1, 0.18);
    fibers(g, w, h, rand, 60, "#6b4520", 6, 0.14);
  });
}

function flutePattern(theme) {
  const edge = theme["--mp-cardboard-edge"];
  const light = theme["--mp-flute-light"] || "#c79a5e";
  return tilePattern("flute|" + edge + "|" + light, 6, 8, (g) => {
    g.fillStyle = edge;
    g.fillRect(0, 0, 6, 8);
    g.fillStyle = light;
    g.beginPath();
    g.ellipse(3, 4.6, 2.1, 2.6, 0, Math.PI, 0);
    g.lineTo(5.1, 7);
    g.lineTo(0.9, 7);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(40,22,8,0.55)";
    g.fillRect(0, 0, 6, 1.1);
    g.fillRect(0, 7, 6, 1);
  });
}

function woodPattern(theme) {
  const base = theme["--mp-wood"] || "#c98f52";
  const grain = theme["--mp-wood-grain"] || "#8a5527";
  return tilePattern("wood|" + base + "|" + grain, 220, 90, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const rand = mulberry(77);
    for (let i = 0; i < 26; i++) {
      const y0 = rand() * h;
      const amp = 1 + rand() * 3;
      const freq = (Math.PI * 2 * (1 + Math.floor(rand() * 3))) / w;
      g.strokeStyle = rand() < 0.65 ? grain : "#f2c890";
      g.globalAlpha = 0.18 + rand() * 0.3;
      g.lineWidth = 0.6 + rand() * 1.6;
      g.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = y0 + Math.sin(x * freq + i) * amp;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 0.35;
    g.strokeStyle = grain;
    for (let r = 2; r < 9; r += 2.2) {
      g.beginPath();
      g.ellipse(150, 40, r * 2.2, r * 0.8, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    speckle(g, w, h, rand, 200, grain, 0.9, 0.12);
  });
}

function feltPattern(color, key) {
  return tilePattern("felt|" + key + "|" + color, 96, 96, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    const rand = mulberry(hashId(key) + 3);
    fibers(g, w, h, rand, 420, "#000", 4, 0.14, 0.5);
    fibers(g, w, h, rand, 380, "#fff", 4, 0.12, 0.5);
    speckle(g, w, h, rand, 300, "#000", 1, 0.08);
  });
}

function cellophanePattern(theme) {
  const base = theme["--mp-cellophane"] || "#8fcbea";
  return tilePattern("cello|" + base, 160, 160, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const rand = mulberry(91);
    for (let i = 0; i < 9; i++) {
      const x = rand() * w * 1.4 - w * 0.2;
      const grad = g.createLinearGradient(x, 0, x + 26, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255," + (0.18 + rand() * 0.3).toFixed(2) + ")");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.save();
      g.translate(x, 0);
      g.transform(1, 0, -0.6, 1, 0, 0);
      g.fillStyle = grad;
      g.fillRect(-x, 0, 2 * w, h);
      g.restore();
    }
    g.strokeStyle = "#ffffff";
    g.lineWidth = 0.8;
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.25 + rand() * 0.4;
      const x = rand() * w;
      const y = rand() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand() - 0.5) * 30, y + (rand() - 0.5) * 30);
      g.lineTo(x + (rand() - 0.5) * 40, y + (rand() - 0.5) * 40);
      g.stroke();
    }
    g.globalAlpha = 0.22;
    g.strokeStyle = "#2c6f99";
    for (let i = 0; i < 12; i++) {
      const x = rand() * w;
      const y = rand() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand() - 0.5) * 24, y + (rand() - 0.5) * 24);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

function rubberPattern(theme) {
  const base = theme["--mp-rubber-mat"] || "#3a3639";
  return tilePattern("rubber|" + base, 12, 12, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 12, 12);
    const rand = mulberry(13);
    fibers(g, 12, 12, rand, 30, "#fff", 2.5, 0.08, 0.4);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.arc(6.6, 6.6, 2.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.beginPath();
    g.arc(6, 6, 2.2, 0, Math.PI * 2);
    g.fill();
  });
}

function foilPattern(theme) {
  const base = theme["--mp-foil"] || "#c9ced4";
  return tilePattern("foil|" + base, 120, 120, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const rand = mulberry(29);
    for (let i = 0; i < 70; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 6 + rand() * 16;
      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = rand() * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      const v = rand();
      g.fillStyle = v > 0.5 ? "rgba(255,255,255," + (0.25 + v * 0.4).toFixed(2) + ")" : "rgba(70,78,90," + (0.12 + v * 0.3).toFixed(2) + ")";
      g.fill();
    }
  });
}

function sandpaperPattern(theme) {
  const base = theme["--mp-sandpaper"] || "#6f6a63";
  return tilePattern("sand|" + base, 64, 64, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const rand = mulberry(17);
    speckle(g, w, h, rand, 900, "#1d1b19", 1.1, 0.5);
    speckle(g, w, h, rand, 700, "#d8d2c6", 1, 0.45);
  });
}

function skyPattern(theme) {
  const base = theme["--mp-sky"] || "#d8b56a";
  return tilePattern("sky|" + base, 256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(120,80,20,0.045)";
      g.fillRect(x, 0, 3, h);
    }
    const rand = mulberry(61);
    speckle(g, w, h, rand, 1600, "#6a4612", 1, 0.1);
    speckle(g, w, h, rand, 900, "#fff6dc", 1, 0.14);
    fibers(g, w, h, rand, 160, "#7a5420", 9, 0.12);
  });
}

function newsprintPattern() {
  return tilePattern("news", 120, 90, (g, w, h) => {
    g.fillStyle = "#ece6d5";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3b3833";
    g.globalAlpha = 0.8;
    g.fillRect(6, 6, w - 12, 6);
    g.globalAlpha = 0.65;
    for (let y = 18; y < h - 4; y += 4) {
      g.fillRect(6, y, 50 + ((y * 7) % 9), 1.4);
      g.fillRect(64, y, 46 + ((y * 5) % 7), 1.4);
    }
    g.globalAlpha = 0.5;
    for (let y = 20; y < 52; y += 3) for (let x = 8; x < 54; x += 3) {
      g.beginPath();
      g.arc(x + (y % 6 ? 1.5 : 0), y, 0.6 + ((x * y) % 5) * 0.12, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

function setPatternFrame(pattern, cx, cy, angle, scale) {
  if (!pattern || typeof pattern.setTransform !== "function" || typeof DOMMatrix === "undefined") return;
  const m = new DOMMatrix();
  m.translateSelf(cx, cy);
  if (angle) m.rotateSelf((-angle * 180) / Math.PI);
  if (scale && scale !== 1) m.scaleSelf(scale, scale);
  pattern.setTransform(m);
}

/* ---- cached unit-space gradients ---------------------------------------
 * Gradients are built once in a 0..1 box and placed with a transform at
 * fill time. The path is already in device space, so only the style moves. */

function unitGradient(ctx, key, build) {
  const hit = patternCache.get("grad|" + key);
  if (hit) return hit;
  const grad = build(ctx);
  patternCache.set("grad|" + key, grad);
  return grad;
}

function fillInBox(ctx, style, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.001, w), Math.max(0.001, h));
  ctx.fillStyle = style;
  ctx.fill();
  ctx.restore();
}

function litGradient(ctx, k) {
  return unitGradient(ctx, "lit|" + k.toFixed(2), (g) => {
    const grad = g.createLinearGradient(0, 0, 1, 1);
    grad.addColorStop(0, "rgba(255,248,230," + (0.26 * k).toFixed(3) + ")");
    grad.addColorStop(0.45, "rgba(255,248,230,0)");
    grad.addColorStop(1, "rgba(50,25,5," + (0.22 * k).toFixed(3) + ")");
    return grad;
  });
}

function discGradient(ctx) {
  return unitGradient(ctx, "disc", (g) => {
    const grad = g.createLinearGradient(-1, -1, 1, 1);
    grad.addColorStop(0, "rgba(255,248,230,0.3)");
    grad.addColorStop(0.5, "rgba(255,248,230,0)");
    grad.addColorStop(1, "rgba(40,20,5,0.25)");
    return grad;
  });
}

function metalUnit(ctx) {
  return unitGradient(ctx, "metal", (g) => {
    const grad = g.createRadialGradient(-0.4, -0.45, 0.05, 0, 0, 1.05);
    grad.addColorStop(0, "#fbfcfd");
    grad.addColorStop(0.45, "#c3c9cf");
    grad.addColorStop(1, "#6c747b");
    return grad;
  });
}

function brassUnit(ctx, theme) {
  const mid = theme["--mp-brad"] || "#c9a35d";
  return unitGradient(ctx, "brass|" + mid, (g) => {
    const grad = g.createRadialGradient(-0.4, -0.4, 0.05, 0, 0, 1);
    grad.addColorStop(0, "#fff1c4");
    grad.addColorStop(0.5, mid);
    grad.addColorStop(1, "#7a5a28");
    return grad;
  });
}

/* ---- geometry helpers -------------------------------------------------- */

function polyNormals(pts) {
  const c = centroid(pts);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = dy / len;
    let ny = -dx / len;
    const mx = (p.x + q.x) / 2 - c.x;
    const my = (p.y + q.y) / 2 - c.y;
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    return { p, q, nx, ny, len };
  });
}

function depthFor(project, u, scale) {
  return Math.max(2.5 * u, Math.min(9 * u, project.ppm * 0.075)) * (scale || 1);
}

function softShadow(ctx, trace, dx, dy, theme) {
  ctx.save();
  ctx.fillStyle = theme["--mp-shadow"];
  const steps = [[1.25, 0.32], [0.9, 0.38], [0.55, 0.42]];
  for (const [k, a] of steps) {
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(dx * k, dy * k);
    trace();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Side walls of an extruded cutout: one quad per edge that faces the extrusion. */
function paintExtrusion(ctx, pts, ex, ey, edgeFill, edgeLine) {
  ctx.save();
  ctx.translate(ex, ey);
  tracePoly(ctx, pts);
  ctx.restore();
  ctx.fillStyle = edgeLine;
  ctx.fill();
  for (const e of polyNormals(pts)) {
    if (e.nx * ex + e.ny * ey <= 0) continue;
    ctx.beginPath();
    ctx.moveTo(e.p.x, e.p.y);
    ctx.lineTo(e.q.x, e.q.y);
    ctx.lineTo(e.q.x + ex, e.q.y + ey);
    ctx.lineTo(e.p.x + ex, e.p.y + ey);
    ctx.closePath();
    ctx.fillStyle = edgeFill;
    ctx.fill();
    ctx.strokeStyle = edgeLine;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function paintLighting(ctx, pts, strength) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const k = strength == null ? 1 : strength;
  tracePoly(ctx, pts);
  fillInBox(ctx, litGradient(ctx, k), minX, minY, maxX - minX, maxY - minY);
}

function paintRims(ctx, pts, u, light, dark) {
  ctx.save();
  ctx.lineCap = "round";
  for (const e of polyNormals(pts)) {
    const facing = e.nx * LIGHT.x + e.ny * LIGHT.y;
    if (Math.abs(facing) < 0.15) continue;
    ctx.strokeStyle = facing > 0 ? light : dark;
    ctx.globalAlpha = Math.min(1, Math.abs(facing) + 0.2);
    ctx.lineWidth = (facing > 0 ? 1.4 : 1.1) * u;
    const ix = -e.nx * 0.8 * u;
    const iy = -e.ny * 0.8 * u;
    ctx.beginPath();
    ctx.moveTo(e.p.x + ix, e.p.y + iy);
    ctx.lineTo(e.q.x + ix, e.q.y + iy);
    ctx.stroke();
  }
  ctx.restore();
}

function stitchPath(ctx, trace, color, u, gap) {
  ctx.save();
  ctx.setLineDash([3 * u, (gap || 3) * u]);
  ctx.lineCap = "round";
  ctx.lineWidth = 1.3 * u;
  ctx.strokeStyle = "rgba(25,14,4,0.45)";
  ctx.translate(0.7 * u, 0.9 * u);
  trace();
  ctx.stroke();
  ctx.translate(-0.7 * u, -0.9 * u);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2 * u;
  trace();
  ctx.stroke();
  ctx.restore();
}

function paintTape(ctx, x, y, angle, length, width, theme, u, seed) {
  const rand = mulberry(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const hw = length / 2;
  const hh = width / 2;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh);
  ctx.lineTo(hw, -hh);
  for (let i = 1; i < 5; i++) ctx.lineTo(hw + (rand() - 0.5) * 2.4 * u, -hh + (2 * hh * i) / 5);
  ctx.lineTo(hw, hh);
  ctx.lineTo(-hw, hh);
  for (let i = 1; i < 5; i++) ctx.lineTo(-hw + (rand() - 0.5) * 2.4 * u, hh - (2 * hh * i) / 5);
  ctx.closePath();
  ctx.fillStyle = "rgba(40,25,8,0.16)";
  ctx.save();
  ctx.translate(0.8 * u, 1.2 * u);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = theme["--mp-tape"];
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = theme["--mp-tape-shine"];
  ctx.lineWidth = 0.7 * u;
  for (let i = 0; i < 3; i++) {
    const wx = (rand() - 0.5) * length * 0.8;
    ctx.beginPath();
    ctx.moveTo(wx, -hh + 1);
    ctx.lineTo(wx + (rand() - 0.5) * 6 * u, hh - 1);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#5a4320";
  ctx.beginPath();
  ctx.moveTo(-hw + 2, hh - 1.5 * u);
  ctx.lineTo(hw - 2, hh - 1 * u);
  ctx.stroke();
  ctx.restore();
}

/* ---- backdrop ------------------------------------------------------------ */

function gearSprite(theme, radius, teeth) {
  const r = Math.round(radius);
  return cached("gear|" + r + "|" + teeth + "|" + theme["--mp-gear"], () => {
    const size = r * 2 + 16;
    const c = makeCanvas(size, size);
    if (!c) return null;
    const g = c.getContext("2d");
    if (!g) return null;
    const cx = size / 2 - 3;
    const cy = size / 2 - 3;
    const trace = (ox, oy) => {
      g.beginPath();
      const n = teeth * 4;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const phase = i % 4;
        const rr = phase === 1 || phase === 2 ? r : r * 0.82;
        const x = cx + ox + Math.cos(a) * rr;
        const y = cy + oy + Math.sin(a) * rr;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.moveTo(cx + ox + r * 0.3, cy + oy);
      g.arc(cx + ox, cy + oy, r * 0.3, 0, Math.PI * 2, true);
    };
    g.fillStyle = "rgba(60,35,10,0.25)";
    trace(5, 6);
    g.fill("evenodd");
    g.fillStyle = theme["--mp-cardboard-edge"];
    trace(2.5, 3);
    g.fill("evenodd");
    const pat = g.createPattern(corrugatedSource(theme), "repeat");
    g.fillStyle = pat || theme["--mp-gear"];
    trace(0, 0);
    g.fill("evenodd");
    g.fillStyle = theme["--mp-gear"] || "#a77a45";
    g.globalAlpha = 0.55;
    trace(0, 0);
    g.fill("evenodd");
    g.globalAlpha = 1;
    g.setLineDash([3, 3]);
    g.strokeStyle = "rgba(60,35,10,0.45)";
    g.beginPath();
    g.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    g.stroke();
    return c;
  });
}

function corrugatedSource(theme) {
  return cached("corrsrc|" + theme["--mp-cardboard"], () => {
    const c = makeCanvas(96, 96);
    if (!c) return null;
    const g = c.getContext("2d");
    g.fillStyle = theme["--mp-cardboard"];
    g.fillRect(0, 0, 96, 96);
    const rand = mulberry(5);
    for (let x = 0; x < 96; x += 6) {
      g.fillStyle = "rgba(80,45,15,0.12)";
      g.fillRect(x + 3, 0, 3, 96);
    }
    speckle(g, 96, 96, rand, 300, "#5a3a18", 1, 0.15);
    return c;
  });
}

function hillSprite(theme, layer) {
  const colors = ["--mp-hill-far", "--mp-hill-mid", "--mp-hill-near"];
  const color = theme[colors[layer]] || ["#b9b27a", "#97a565", "#7f9455"][layer];
  return cached("hill|" + layer + "|" + color, () => {
    const W = 1600;
    const H = 360;
    const c = makeCanvas(W, H);
    if (!c) return null;
    const g = c.getContext("2d");
    if (!g) return null;
    const rand = mulberry(101 + layer * 37);
    const humps = 3 + layer;
    const top = (x) => {
      let y = 0;
      for (let k = 1; k <= humps; k++) y += Math.sin((x / W) * Math.PI * 2 * k + layer * 1.7 + k) * (40 / k);
      return 120 - layer * 18 + y;
    };
    const trace = (dx, dy, amp) => {
      g.beginPath();
      g.moveTo(dx, H);
      for (let x = 0; x <= W; x += 5) g.lineTo(x + dx, top(x) + dy + (rand() - 0.5) * amp);
      g.lineTo(W + dx, H);
      g.closePath();
    };
    g.fillStyle = "rgba(60,40,15,0.22)";
    trace(0, 7, 1.5);
    g.fill();
    g.fillStyle = "#f3e7c9";
    trace(0, -1.5, 3.2);
    g.fill();
    g.fillStyle = color;
    trace(0, 0, 1.4);
    g.fill();
    g.save();
    trace(0, 0, 0);
    g.clip();
    const pat = g.createPattern(feltSource(color, "hill" + layer), "repeat");
    g.globalAlpha = 0.9;
    g.fillStyle = pat || color;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    const shade = g.createLinearGradient(0, 60, 0, H);
    shade.addColorStop(0, "rgba(255,250,225,0.18)");
    shade.addColorStop(1, "rgba(40,30,10,0.18)");
    g.fillStyle = shade;
    g.fillRect(0, 0, W, H);
    g.restore();
    g.setLineDash([5, 4]);
    g.strokeStyle = "rgba(255,248,225,0.55)";
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = 10; x <= W - 10; x += 5) {
      const y = top(x) + 9;
      if (x === 10) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    return c;
  });
}

function feltSource(color, key) {
  return cached("feltsrc|" + key + "|" + color, () => {
    const c = makeCanvas(96, 96);
    if (!c) return null;
    const g = c.getContext("2d");
    g.fillStyle = color;
    g.fillRect(0, 0, 96, 96);
    const rand = mulberry(hashId(key));
    fibers(g, 96, 96, rand, 380, "#000", 4, 0.12, 0.5);
    fibers(g, 96, 96, rand, 320, "#fff", 4, 0.1, 0.5);
    return c;
  });
}

let backdropCache = null;

/**
 * The backdrop only depends on canvas size, camera, and theme, so it is
 * painted once into an offscreen canvas and blitted. It repaints when the
 * view pans, zooms, or resizes. Gears sit still in the cached plate.
 */
function paintBackdrop(ctx, theme, project, clock, reduced, u, extraKey, paintExtra) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const center = project.worldFromScreen(w / 2, h / 2);
  const key = [w, h, u, Math.round(center.x * project.ppm * 2), Math.round(center.y * project.ppm * 2),
    project.ppm.toFixed(3), theme["--mp-sky"], theme["--mp-desk"], theme["--mp-hill-near"], theme["--mp-cardboard"], theme["--mp-grid"], extraKey || ""].join("|");
  if (!backdropCache || backdropCache.key !== key) {
    const plate = (backdropCache && backdropCache.canvas && backdropCache.canvas.width === w && backdropCache.canvas.height === h)
      ? backdropCache.canvas : makeCanvas(w, h);
    const g = plate && plate.getContext("2d");
    if (!g) {
      renderBackdrop(ctx, theme, project, u);
      if (paintExtra) paintExtra(ctx);
      return;
    }
    g.clearRect(0, 0, w, h);
    renderBackdrop(g, theme, project, u);
    if (paintExtra) paintExtra(g);
    backdropCache = { key, canvas: plate };
  }
  ctx.drawImage(backdropCache.canvas, 0, 0);
  void clock; void reduced;
}

function renderBackdrop(ctx, theme, project, u) {
  const clock = 0;
  const reduced = true;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const sky = skyPattern(theme);
  ctx.fillStyle = sky || theme["--mp-sky"] || "#d8b56a";
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createLinearGradient(0, 0, 0, h);
  glow.addColorStop(0, "rgba(255,244,214,0.32)");
  glow.addColorStop(0.6, "rgba(255,244,214,0)");
  glow.addColorStop(1, "rgba(90,55,15,0.12)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const center = project.worldFromScreen(w / 2, h / 2);
  const groundY = project.screenFromWorld(center.x, 0).y;
  const panX = center.x * project.ppm;

  const gears = [
    { fx: 0.12, fy: 0.2, r: 46, teeth: 10, spin: 0.06, par: 0.05 },
    { fx: 0.86, fy: 0.16, r: 60, teeth: 12, spin: -0.045, par: 0.07 },
    { fx: 0.93, fy: 0.42, r: 34, teeth: 8, spin: 0.08, par: 0.07 },
    { fx: 0.3, fy: 0.08, r: 26, teeth: 8, spin: -0.1, par: 0.04 }
  ];
  for (const gear of gears) {
    const radius = gear.r * u * Math.max(0.7, Math.min(1.3, Math.min(w, h) / (700 * u)));
    const sprite = gearSprite(theme, radius, gear.teeth);
    if (!sprite) continue;
    let x = (gear.fx * w - panX * gear.par) % (w + sprite.width);
    if (x < -sprite.width / 2) x += w + sprite.width;
    const y = gear.fy * h;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(x, y);
    ctx.rotate(reduced ? 0 : clock * gear.spin);
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    ctx.restore();
  }

  const news = newsprintPattern();
  if (news) {
    const scraps = [{ fx: 0.62, fy: 0.1, a: -0.08, par: 0.1 }, { fx: 0.18, fy: 0.24, a: 0.06, par: 0.12 }];
    for (const s of scraps) {
      const sw = Math.min(110 * u, w * 0.2);
      const sh = sw * 0.64;
      let x = (s.fx * w - panX * s.par) % (w + sw);
      if (x < -sw) x += w + sw;
      ctx.save();
      ctx.translate(x, s.fy * h);
      ctx.rotate(s.a);
      const pts = [];
      const rand = mulberry(Math.round(s.fx * 1000));
      for (let i = 0; i <= 10; i++) pts.push({ x: (i / 10) * sw, y: (rand() - 0.5) * 3 * u });
      for (let i = 0; i <= 6; i++) pts.push({ x: sw + (rand() - 0.5) * 3 * u, y: (i / 6) * sh });
      for (let i = 10; i >= 0; i--) pts.push({ x: (i / 10) * sw, y: sh + (rand() - 0.5) * 3 * u });
      for (let i = 6; i >= 0; i--) pts.push({ x: (rand() - 0.5) * 3 * u, y: (i / 6) * sh });
      softShadow(ctx, () => tracePoly(ctx, pts), 3 * u, 4 * u, theme);
      tracePoly(ctx, pts);
      ctx.fillStyle = "#f6f1e3";
      ctx.fill();
      ctx.save();
      ctx.translate(1.5 * u, 1.5 * u);
      ctx.scale(u * 0.9, u * 0.9);
      ctx.fillStyle = news;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, 0, (sw - 3 * u) / (u * 0.9), (sh - 3 * u) / (u * 0.9));
      ctx.restore();
      paintTape(ctx, sw * 0.5, -1 * u, 0.1, 30 * u, 10 * u, theme, u, 7);
      ctx.restore();
    }
  }

  const horizon = Math.max(h * 0.3, Math.min(h * 0.92, groundY));
  const layers = [{ par: 0.12, lift: 0.5 }, { par: 0.22, lift: 0.3 }, { par: 0.34, lift: 0.12 }];
  const hillScale = Math.max(0.45, Math.min(1.4, w / 1600)) * Math.max(1, u * 0.75);
  layers.forEach((layer, index) => {
    const sprite = hillSprite(theme, index);
    if (!sprite) return;
    const sw = sprite.width * hillScale;
    const sh = sprite.height * hillScale;
    const top = horizon - sh * (0.42 + layer.lift * 0.45);
    let x = -((panX * layer.par) % sw);
    if (x > 0) x -= sw;
    for (; x < w; x += sw) ctx.drawImage(sprite, x, top, sw, sh);
    ctx.fillStyle = theme[["--mp-hill-far", "--mp-hill-mid", "--mp-hill-near"][index]] || "#8a9a5b";
    if (top + sh < h) ctx.fillRect(0, top + sh - 2, w, h - top - sh + 2);
  });
  // tabletop: the diorama sits on a kraft board below the horizon
  const floorTop = horizon + 18 * u;
  if (floorTop < h) {
    const kraft = kraftPattern(theme, theme["--mp-desk"]);
    setPatternFrame(kraft, -panX * 0.5, 0, 0, u);
    ctx.fillStyle = kraft || theme["--mp-desk"];
    ctx.fillRect(0, floorTop, w, h - floorTop);
    const fade = ctx.createLinearGradient(0, floorTop, 0, Math.min(h, floorTop + 120 * u));
    fade.addColorStop(0, "rgba(60,35,10,0.28)");
    fade.addColorStop(1, "rgba(60,35,10,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, floorTop, w, h - floorTop);
    ctx.strokeStyle = "rgba(255,244,214,0.5)";
    ctx.lineWidth = 1.2 * u;
    ctx.beginPath();
    ctx.moveTo(0, floorTop + 0.5);
    ctx.lineTo(w, floorTop + 0.5);
    ctx.stroke();
  }
  const haze = ctx.createLinearGradient(0, 0, 0, h);
  haze.addColorStop(0, "rgba(216,181,106,0)");
  haze.addColorStop(1, "rgba(216,181,106,0.18)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
}

/* ---- materials & bodies -------------------------------------------------- */

function surfaceKind(body) {
  if (body.isStatic && Number.isFinite(body.friction) && body.friction <= 0.001) return "foil";
  const id = String(body.id || "").toLowerCase();
  const match = /(ice|wood|rubber)$/.exec(id);
  if (match && body.type === "wedge") return match[1];
  if (body.material === "ice" || body.material === "wood" || body.material === "rubber") return body.material;
  return body.type === "wedge" ? "sandpaper" : "cardboard";
}

function materialFill(kind, theme) {
  if (kind === "ice") return cellophanePattern(theme) || theme["--mp-cellophane"];
  if (kind === "wood") return woodPattern(theme) || theme["--mp-wood"];
  if (kind === "rubber") return rubberPattern(theme) || theme["--mp-rubber-mat"];
  if (kind === "foil") return foilPattern(theme) || theme["--mp-foil"];
  if (kind === "sandpaper") return sandpaperPattern(theme) || theme["--mp-sandpaper"];
  if (kind === "felt") return feltPattern(theme["--mp-felt"], "felt") || theme["--mp-felt"];
  return corrugatedPattern(theme) || theme["--mp-cardboard"];
}

function materialEdge(kind, theme) {
  if (kind === "ice") return "#5d9fc4";
  if (kind === "wood") return theme["--mp-wood-grain"] || "#8a5527";
  if (kind === "rubber") return "#1f1c1e";
  if (kind === "foil") return "#878e97";
  if (kind === "sandpaper") return "#3d3935";
  if (kind === "felt") return theme["--mp-felt-fiber"] || "#7a2219";
  return flutePattern(theme) || theme["--mp-cardboard-edge"];
}

function edgeLine(kind, theme) {
  if (kind === "ice") return "#3b7fa6";
  if (kind === "felt") return "#5e1a12";
  if (kind === "rubber") return "#121012";
  if (kind === "foil") return "#5f666e";
  return "#4a2e12";
}

function isShelf(body) {
  if (body.type === "ground") return true;
  return body.isStatic && body.type === "box" && (body.hx || 0) > (body.hy || 0) * 4;
}

function paintSlab(ctx, pts, kind, theme, u, depth, body, opts) {
  const o = opts || {};
  const ex = depth * 0.62;
  const ey = depth * 0.82;
  const trace = () => tracePoly(ctx, pts);
  if (!o.noShadow) softShadow(ctx, trace, ex * 1.6 + 2 * u, ey * 1.6 + 2 * u, theme);
  paintExtrusion(ctx, pts, ex, ey, materialEdge(kind, theme), edgeLine(kind, theme));
  const c = centroid(pts);
  const fill = materialFill(kind, theme);
  setPatternFrame(fill, c.x, c.y, body ? body.angle || 0 : 0, kind === "rubber" ? u : u * 0.8);
  trace();
  ctx.globalAlpha = kind === "ice" ? 0.9 : 1;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = 1;
  paintLighting(ctx, pts, kind === "foil" || kind === "ice" ? 1.5 : 1);
  if (kind === "ice" || kind === "foil") {
    ctx.save();
    trace();
    ctx.clip();
    const b = pts.reduce((m, p) => ({ x: Math.min(m.x, p.x), y: Math.min(m.y, p.y) }), { x: Infinity, y: Infinity });
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(b.x + 4 * u, b.y + 14 * u);
    ctx.lineTo(b.x + 14 * u, b.y + 4 * u);
    ctx.stroke();
    ctx.restore();
  }
  paintRims(ctx, pts, u, kind === "rubber" ? "rgba(255,255,255,0.35)" : "rgba(255,248,226,0.85)", "rgba(40,20,5,0.55)");
  if (kind === "felt") stitchPath(ctx, () => tracePoly(ctx, insetPoints(pts, 4.5 * u)), "#ffe3d6", u, 2.6);
  if (kind === "rubber") stitchPath(ctx, () => tracePoly(ctx, insetPoints(pts, 4 * u)), "#9a948f", u, 3);
}

function hypotenuse(pts) {
  let best = 0;
  let idx = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const l = Math.hypot(q.x - p.x, q.y - p.y);
    if (l > best) { best = l; idx = i; }
  });
  return [pts[idx], pts[(idx + 1) % pts.length]];
}

function paintSurfaceStrip(ctx, a, b, c, kind, theme, u, thick) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (nx * (c.x - a.x) + ny * (c.y - a.y) < 0) { nx = -nx; ny = -ny; }
  const inset = 2 * u;
  const strip = [
    { x: a.x + dx / len * inset, y: a.y + dy / len * inset },
    { x: b.x - dx / len * inset, y: b.y - dy / len * inset },
    { x: b.x - dx / len * inset + nx * thick, y: b.y - dy / len * inset + ny * thick },
    { x: a.x + dx / len * inset + nx * thick, y: a.y + dy / len * inset + ny * thick }
  ];
  const lift = [ -nx * 2 * u, -ny * 2 * u ];
  const raised = strip.map((p) => ({ x: p.x + lift[0], y: p.y + lift[1] }));
  softShadow(ctx, () => tracePoly(ctx, raised), 1.5 * u, 2 * u, theme);
  paintExtrusion(ctx, raised, 1.2 * u, 1.6 * u, materialEdge(kind, theme), edgeLine(kind, theme));
  const fill = materialFill(kind, theme);
  setPatternFrame(fill, a.x, a.y, -Math.atan2(dy, dx), kind === "rubber" ? u : u * 0.8);
  tracePoly(ctx, raised);
  ctx.fillStyle = fill;
  ctx.fill();
  paintLighting(ctx, raised, kind === "ice" || kind === "foil" ? 1.6 : 1);
  if (kind === "ice" || kind === "foil") {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.4 * u;
    ctx.beginPath();
    ctx.moveTo(raised[0].x + nx * 1.5 * u, raised[0].y + ny * 1.5 * u);
    ctx.lineTo(raised[1].x + nx * 1.5 * u, raised[1].y + ny * 1.5 * u);
    ctx.stroke();
    ctx.restore();
  }
  paintRims(ctx, raised, u, "rgba(255,250,235,0.8)", "rgba(30,15,5,0.5)");
}

function paintShelf(ctx, pts, body, theme, u, project) {
  const c = centroid(pts);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const tray = /tray|catch/i.test(String(body.id || ""));
  const back = Math.max(8 * u, project.ppm * 0.22);
  const bx = back * 0.55;
  const by = -back;
  const topEdge = hypotTop(pts);
  const surface = surfaceKind(body);
  const kind = surface === "wood" ? "cardboard" : surface;
  softShadow(ctx, () => tracePoly(ctx, pts), 6 * u, 9 * u, theme);
  // top plane receding into the diorama
  const plane = [topEdge[0], topEdge[1], { x: topEdge[1].x + bx, y: topEdge[1].y + by }, { x: topEdge[0].x + bx, y: topEdge[0].y + by }];
  const kraft = kind === "cardboard" || kind === "wood" ? kraftPattern(theme) : materialFill(kind, theme);
  setPatternFrame(kraft, c.x, c.y, 0, u * 0.8);
  tracePoly(ctx, plane);
  ctx.fillStyle = kraft || theme["--mp-cardboard"];
  ctx.fill();
  const planeShade = ctx.createLinearGradient(0, topEdge[0].y + by, 0, topEdge[0].y);
  planeShade.addColorStop(0, "rgba(60,35,10,0.22)");
  planeShade.addColorStop(1, "rgba(255,245,220,0.18)");
  ctx.fillStyle = planeShade;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,246,222,0.8)";
  ctx.lineWidth = 1.4 * u;
  ctx.beginPath();
  ctx.moveTo(topEdge[0].x, topEdge[0].y);
  ctx.lineTo(topEdge[1].x, topEdge[1].y);
  ctx.stroke();
  // corrugated cut-edge front with liners
  const flute = flutePattern(theme);
  setPatternFrame(flute, minX, minY, 0, u * 1.25);
  tracePoly(ctx, pts);
  ctx.fillStyle = flute || theme["--mp-cardboard-edge"];
  ctx.fill();
  const liner = Math.max(2 * u, (maxY - minY) * 0.12);
  ctx.save();
  tracePoly(ctx, pts);
  ctx.clip();
  ctx.fillStyle = theme["--mp-cardboard"];
  ctx.fillRect(minX - 2, minY - 1, maxX - minX + 4, liner);
  ctx.fillRect(minX - 2, maxY - liner + 1, maxX - minX + 4, liner);
  const shade = ctx.createLinearGradient(0, minY, 0, maxY);
  shade.addColorStop(0, "rgba(255,240,210,0.1)");
  shade.addColorStop(1, "rgba(40,20,5,0.35)");
  ctx.fillStyle = shade;
  ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  ctx.restore();
  ctx.strokeStyle = "rgba(40,22,6,0.6)";
  ctx.lineWidth = 1 * u;
  tracePoly(ctx, pts);
  ctx.stroke();
  if (kind !== "cardboard") {
    paintSurfaceStrip(ctx, topEdge[1], topEdge[0], { x: c.x, y: c.y + 1000 }, kind, theme, u, Math.min(6 * u, (maxY - minY) * 0.3));
  }
  if (tray) {
    const lipH = Math.max(10 * u, (maxY - minY) * 1.2);
    for (const side of [0, 1]) {
      const p = topEdge[side];
      const dir = side === 0 ? 1 : -1;
      const lip = [
        { x: p.x, y: p.y }, { x: p.x + dir * 4 * u, y: p.y },
        { x: p.x + dir * 4 * u + bx * 0.3, y: p.y - lipH }, { x: p.x + bx * 0.3, y: p.y - lipH }
      ];
      paintSlab(ctx, lip, "cardboard", theme, u, 3 * u, null, { noShadow: true });
    }
  }
  const rand = mulberry(hashId(body.id));
  const tapes = Math.max(1, Math.floor((maxX - minX) / (260 * u)));
  for (let i = 0; i < tapes; i++) {
    const x = minX + (maxX - minX) * ((i + 0.5) / tapes) + (rand() - 0.5) * 40 * u;
    paintTape(ctx, x, topEdge[0].y + ((x - topEdge[0].x) / ((topEdge[1].x - topEdge[0].x) || 1)) * (topEdge[1].y - topEdge[0].y), Math.PI / 2 + (rand() - 0.5) * 0.3, 22 * u, 11 * u, theme, u, hashId(body.id) + i);
  }
}

function hypotTop(pts) {
  // highest (smallest screen y) long edge
  let best = null;
  let bestScore = Infinity;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 4) return;
    const score = (p.y + q.y) / 2 - len * 0.02;
    if (Math.abs(q.x - p.x) > Math.abs(q.y - p.y) && score < bestScore) { bestScore = score; best = [p, q]; }
  });
  if (!best) best = [pts[0], pts[1]];
  return best[0].x <= best[1].x ? best : [best[1], best[0]];
}

function paintCutCircle(ctx, c, r, theme, u, depth, faceFill, edgeFill, line, angle, noShadow) {
  const ex = depth * 0.62;
  const ey = depth * 0.82;
  const trace = () => { ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); };
  if (!noShadow) softShadow(ctx, trace, ex * 1.6 + 2 * u, ey * 1.6 + 2 * u, theme);
  const steps = 4;
  for (let i = steps; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(c.x + (ex * i) / steps, c.y + (ey * i) / steps, r, 0, Math.PI * 2);
    ctx.fillStyle = edgeFill;
    ctx.fill();
  }
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.8 * u;
  ctx.beginPath();
  ctx.arc(c.x + ex, c.y + ey, r, 0, Math.PI * 2);
  ctx.stroke();
  setPatternFrame(faceFill, c.x, c.y, angle || 0, u * 0.8);
  trace();
  ctx.fillStyle = faceFill;
  ctx.fill();
  trace();
  fillInBox(ctx, discGradient(ctx), c.x, c.y, r, r);
  ctx.save();
  ctx.lineWidth = 1.3 * u;
  ctx.strokeStyle = "rgba(255,248,226,0.8)";
  ctx.beginPath();
  ctx.arc(c.x, c.y, r - 0.8 * u, Math.PI * 0.95, Math.PI * 1.55);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,20,5,0.5)";
  ctx.beginPath();
  ctx.arc(c.x, c.y, r - 0.6 * u, -0.05 * Math.PI, 0.55 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function paintFeltButton(ctx, c, r, theme, u, angle) {
  const felt = theme["--mp-button-felt"] || "#4f78a8";
  const fill = feltPattern(felt, "button");
  paintCutCircle(ctx, c, r, theme, u, Math.max(2.5 * u, r * 0.16), fill || felt, "#2a4770", "#1d3352", angle);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20,40,70,0.28)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c.x - 0.6 * u, c.y - 0.8 * u, r * 0.66, 0, Math.PI * 2);
  ctx.fillStyle = fill || felt;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  if (r > 7 * u) stitchPath(ctx, () => { ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.84, 0, Math.PI * 2); }, "#eef3f8", u, 2.4);
  const holes = Math.max(2, Math.round(num(theme, "--mp-button-holes", 4)));
  const hr = Math.max(1.3 * u, r * 0.11);
  const pos = [];
  for (let i = 0; i < holes; i++) {
    const a = (angle ? -angle : 0) + Math.PI / 4 + (i / holes) * Math.PI * 2;
    pos.push({ x: c.x + Math.cos(a) * r * 0.3, y: c.y + Math.sin(a) * r * 0.3 });
  }
  if (holes === 4) {
    ctx.strokeStyle = theme["--mp-twine"];
    ctx.lineWidth = Math.max(1, hr * 0.8);
    ctx.beginPath();
    ctx.moveTo(pos[0].x, pos[0].y); ctx.lineTo(pos[2].x, pos[2].y);
    ctx.moveTo(pos[1].x, pos[1].y); ctx.lineTo(pos[3].x, pos[3].y);
    ctx.stroke();
  }
  for (const p of pos) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, hr, 0, Math.PI * 2);
    ctx.fillStyle = "#14243b";
    ctx.fill();
    ctx.strokeStyle = "rgba(190,215,240,0.6)";
    ctx.lineWidth = 0.6 * u;
    ctx.beginPath();
    ctx.arc(p.x + 0.4 * u, p.y + 0.5 * u, hr, 0, Math.PI * 0.6);
    ctx.stroke();
  }
}


function paintBottleCap(ctx, c, r, theme, u, angle) {
  softShadow(ctx, () => { ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); }, 3 * u + r * 0.15, 4 * u + r * 0.2, theme);
  const n = 21;
  const crimp = (ox, oy) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - (angle || 0);
      const rr = i % 2 === 0 ? r : r * 0.88;
      const x = c.x + ox + Math.cos(a) * rr;
      const y = c.y + oy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  crimp(1.2 * u, 1.6 * u);
  ctx.fillStyle = "#4c5359";
  ctx.fill();
  crimp(0, 0);
  fillInBox(ctx, metalUnit(ctx), c.x, c.y, r, r);
  ctx.strokeStyle = "rgba(60,66,72,0.7)";
  ctx.lineWidth = 0.7 * u;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = "#9aa1a8";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.62, 0, Math.PI * 2);
  fillInBox(ctx, metalUnit(ctx), c.x, c.y, r * 0.7, r * 0.7);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.5, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
}

function paintBrass(ctx, c, r, theme, u) {
  softShadow(ctx, () => { ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); }, 2 * u, 3 * u, theme);
  ctx.beginPath();
  ctx.arc(c.x + 0.8 * u, c.y + 1 * u, r, 0, Math.PI * 2);
  ctx.fillStyle = "#6d5226";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  fillInBox(ctx, brassUnit(ctx, theme), c.x, c.y, r, r);
  ctx.strokeStyle = "rgba(80,55,20,0.5)";
  ctx.lineWidth = 0.6 * u;
  ctx.beginPath();
  ctx.moveTo(c.x - r * 0.5, c.y);
  ctx.lineTo(c.x + r * 0.5, c.y);
  ctx.stroke();
}

function paintFlames(ctx, project, body, theme, clock, reduced, u) {
  const length = body.width ? body.width / 2 : body.radius || 0.3;
  const half = body.height ? body.height / 2 : 0.16;
  const angle = body.angle || 0;
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const px = -ay;
  const py = ax;
  const at = (along, across) => project.screenFromWorld(body.x + ax * along + px * across, body.y + ay * along + py * across);
  const tongues = [
    { len: 1.25, w: 0.95, color: theme["--mp-tissue-hot"], rate: 17, phase: 0 },
    { len: 0.95, w: 0.7, color: theme["--mp-thrust"], rate: 23, phase: 1.3 },
    { len: 0.6, w: 0.42, color: theme["--mp-flame-core"] || "#f7c948", rate: 29, phase: 2.1 }
  ];
  for (const t of tongues) {
    const flick = reduced ? 1 : 0.82 + 0.18 * Math.sin(clock * t.rate + t.phase + hashId(body.id) * 0.001) + 0.08 * Math.sin(clock * 41 + t.phase);
    const skew = reduced ? 0 : Math.sin(clock * (t.rate * 0.6) + t.phase) * 0.18;
    const L = half * 2.6 * t.len * flick;
    const W = half * t.w;
    const base = -length;
    const pts = [
      at(base, -W), at(base - L * 0.35, -W * 1.05 + skew * W), at(base - L * 0.7, -W * 0.55 + skew * W * 1.6),
      at(base - L, skew * W * 2.2),
      at(base - L * 0.72, W * 0.5 + skew * W * 1.6), at(base - L * 0.4, W * 1.0 + skew * W), at(base, W)
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.closePath();
    const fill = feltPattern(t.color, "flame");
    setPatternFrame(fill, pts[3].x, pts[3].y, 0, u);
    ctx.fillStyle = fill || t.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(90,20,5,0.35)";
    ctx.lineWidth = 0.8 * u;
    ctx.stroke();
  }
}

function paintRocketParts(ctx, project, body, theme, u, depth) {
  const length = body.width ? body.width / 2 : 0.4;
  const half = body.height ? body.height / 2 : 0.16;
  const angle = body.angle || 0;
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const px = -ay;
  const py = ax;
  const at = (along, across) => project.screenFromWorld(body.x + ax * along + px * across, body.y + ay * along + py * across);
  for (const side of [-1, 1]) {
    const fin = [at(-length * 0.35, side * half), at(-length * 1.02, side * half * 2), at(-length, side * half)];
    paintSlab(ctx, fin, "cardboard", theme, u, depth * 0.7, body, { noShadow: true });
  }
  const nose = [at(length, -half), at(length + half * 1.6, 0), at(length, half)];
  paintSlab(ctx, nose, "felt", theme, u, depth * 0.6, body, { noShadow: true });
  const port = at(length * 0.25, 0);
  const pr = Math.max(3 * u, half * project.ppm * 0.55);
  paintCutCircle(ctx, port, pr, theme, u, 1.5 * u, kraftPattern(theme) || theme["--mp-cardboard"], theme["--mp-cardboard-edge"], "#4a2e12", angle, true);
  ctx.beginPath();
  ctx.arc(port.x, port.y, pr * 0.66, 0, Math.PI * 2);
  ctx.fillStyle = feltPattern(theme["--mp-button-felt"] || "#4f78a8", "port") || "#4f78a8";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.arc(port.x, port.y, pr * 0.42, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
}


function isBakeable(item, snapshot, theme) {
  const body = item.body;
  if (!body.isStatic || body.selected || item.geom.kind !== "poly") return false;
  const kind = craftKind(body, snapshot, theme);
  return kind === "shelf" || kind === "wedge" || kind === "wall" || kind === "foil";
}

function unitOf(ctx) {
  const c = ctx.canvas;
  const css = c && c.clientWidth;
  return css ? Math.max(1, Math.min(3, c.width / css)) : 1;
}

function paintCraftBody(ctx, project, snapshot, body, theme, clock, reduced, u) {
  const kind = craftKind(body, snapshot, theme);
  const geom = deform(screenGeom(project, body), body, kind, theme, clock, reduced);
  if (!geom) return;
  const depth = depthFor(project, u, body.isStatic ? 1.15 : 1);

  if (geom.kind === "circle") {
    const angle = body.angle || 0;
    withCircleSquash(ctx, geom, () => {
      if (kind === "button") paintFeltButton(ctx, geom.c, geom.r, theme, u, angle);
      else if (kind === "cap") paintBottleCap(ctx, geom.c, geom.r, theme, u, angle);
      else if (kind === "brad") paintBrass(ctx, geom.c, Math.max(3 * u, Math.min(geom.r, 9 * u)), theme, u);
      else {
        const mat = kind === "felt" ? "felt" : kind === "paper" ? "ice" : (body.material === "wood" ? "wood" : "cardboard");
        paintCutCircle(ctx, geom.c, geom.r, theme, u, depth, materialFill(mat, theme), mat === "cardboard" ? theme["--mp-cardboard-edge"] : materialEdge(mat, theme), edgeLine(mat, theme), angle);
        if (mat === "felt" && geom.r > 8 * u) stitchPath(ctx, () => { ctx.beginPath(); ctx.arc(geom.c.x, geom.c.y, geom.r * 0.78, 0, Math.PI * 2); }, "#ffe3d6", u, 2.4);
        if (mat === "cardboard" || mat === "wood") paintBrass(ctx, geom.c, Math.max(1.6 * u, geom.r * 0.14), theme, u);
      }
    });
    if (body.selected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(geom.c.x, geom.c.y, geom.r + 5 * u, 0, Math.PI * 2);
      ctx.strokeStyle = theme["--mp-stitch"];
      ctx.lineWidth = 1.6 * u;
      ctx.setLineDash([4 * u, 3 * u]);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  const pts = geom.pts;
  if (kind === "shelf") {
    paintShelf(ctx, pts, body, theme, u, project);
  } else if (kind === "wedge") {
    paintSlab(ctx, pts, "cardboard", theme, u, depth * 1.2, body);
    ctx.save();
    tracePoly(ctx, insetPoints(pts, 9 * u));
    ctx.setLineDash([4 * u, 3 * u]);
    ctx.strokeStyle = "rgba(90,55,20,0.45)";
    ctx.lineWidth = 1 * u;
    ctx.stroke();
    ctx.restore();
    const [a, b] = hypotenuse(pts);
    paintSurfaceStrip(ctx, a, b, centroid(pts), surfaceKind(body), theme, u, Math.max(6 * u, Math.min(13 * u, project.ppm * 0.11)));
  } else if (kind === "rocket") {
    paintRocketParts(ctx, project, body, theme, u, depth);
    paintSlab(ctx, pts, "cardboard", theme, u, depth, body);
    stitchPath(ctx, () => tracePoly(ctx, insetPoints(pts, 4 * u)), "#6e5232", u, 2.5);
    const nosePts = null;
    void nosePts;
  } else if (kind === "paper") {
    softShadow(ctx, () => tracePoly(ctx, pts), 4 * u, 6 * u, theme);
    tracePoly(ctx, pts);
    ctx.fillStyle = "#f4ead2";
    ctx.save();
    ctx.translate(0.5 * u, 0.5 * u);
    ctx.fill();
    ctx.restore();
    paintTornStroke(ctx, pts, { ...theme, "--mp-cardboard-edge": "#fffaf0" }, hashId(body.id));
    const fill = newsprintPattern() || theme["--mp-paper"];
    const c = centroid(pts);
    setPatternFrame(fill, c.x, c.y, body.angle || 0, u * 0.8);
    tracePoly(ctx, insetPoints(pts, 1 * u));
    ctx.fillStyle = fill;
    ctx.fill();
    paintLighting(ctx, pts, 0.8);
  } else {
    const mat = kind === "felt" ? "felt" : kind === "ice" ? "ice" : kind === "wood" ? "wood" : kind === "foil" ? "foil" : "cardboard";
    paintSlab(ctx, pts, mat, theme, u, depth, body);
    if (mat === "cardboard" && kind !== "wall") paintTapeCorners(ctx, pts, theme, clock, reduced, hashId(body.id), u);
  }
  if (body.selected) {
    ctx.save();
    tracePoly(ctx, pts);
    ctx.strokeStyle = theme["--mp-stitch"];
    ctx.lineWidth = 2 * u;
    ctx.setLineDash([5 * u, 3 * u]);
    ctx.stroke();
    ctx.restore();
  }
}

function paintTapeCorners(ctx, pts, theme, clock, reduced, seed, u) {
  const unit = u || 1;
  const size = num(theme, "--mp-tape-size", 16) * unit;
  const flapAmp = reduced ? 0 : num(theme, "--mp-tape-flap", 0.4) * 0.15;
  const rate = num(theme, "--mp-tape-flap-rate", 3.2);
  const c = centroid(pts);
  pts.forEach((corner, index) => {
    if (index % 2) return;
    const angle = Math.atan2(corner.y - c.y, corner.x - c.x) + Math.PI / 2;
    const flap = Math.sin(clock * rate + index + seed * 0.0001) * flapAmp;
    paintTape(ctx, corner.x, corner.y, angle + flap, size * 1.3, size * 0.55, theme, unit, seed + index);
  });
}

/* ---- joints -------------------------------------------------------------- */

function twistedCord(ctx, points, colors, width, u, phase) {
  if (points.length < 2) return;
  const trace = (ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x + ox, points[0].y + oy);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + ox, points[i].y + oy);
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(40,22,6,0.22)";
  ctx.lineWidth = width * 1.1;
  trace(3 * u, 4.5 * u);
  ctx.stroke();
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = width + 1.2 * u;
  trace(0, 0);
  ctx.stroke();
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = width;
  trace(0, 0);
  ctx.stroke();
  // twist: short diagonal strands, batched into two paths per cord
  const step = Math.max(2.6 * u, width * 1.15);
  const dark = new Path2D();
  const light = new Path2D();
  let carry = phase || 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const hw = width * 0.5;
    for (let t = carry; t < len; t += step) {
      const x = a.x + ux * t;
      const y = a.y + uy * t;
      dark.moveTo(x - nx * hw - ux * hw * 0.8, y - ny * hw - uy * hw * 0.8);
      dark.lineTo(x + nx * hw + ux * hw * 0.8, y + ny * hw + uy * hw * 0.8);
      light.moveTo(x - nx * hw * 0.5 + ux * step * 0.35, y - ny * hw * 0.5 + uy * step * 0.35);
      light.lineTo(x + ux * step * 0.6, y + uy * step * 0.6);
    }
    carry = (carry + step - (len % step)) % step;
  }
  ctx.lineWidth = Math.max(0.7, width * 0.32);
  ctx.strokeStyle = colors[2];
  ctx.stroke(dark);
  ctx.strokeStyle = colors[3];
  ctx.globalAlpha = 0.7;
  ctx.stroke(light);
  ctx.globalAlpha = 1;
  ctx.restore();
}

const TWINE = ["#6b4c28", "#c49a5e", "#5a3f20", "#f0d8a8"];
const YARN = ["#5e140c", "#c8372a", "#7e1f16", "#ff9b88"];

function paintTwine(ctx, points, theme, u, selected) {
  const width = num(theme, "--mp-twine-width", 2.4) * u * (selected ? 1.5 : 1.2);
  const base = theme["--mp-twine"] || TWINE[1];
  twistedCord(ctx, points, [TWINE[0], base, TWINE[2], TWINE[3]], width, u, 0);
}

function paintYarn(ctx, a, b, theme, u, selected) {
  const width = num(theme, "--mp-yarn-width", 2.2) * u * (selected ? 1.6 : 1.25);
  twistedCord(ctx, [a, b], [YARN[0], theme["--mp-yarn"] || YARN[1], YARN[2], YARN[3]], width, u, 0);
}

function paintCoil(ctx, a, b, theme, u, selected) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const angle = Math.atan2(dy, dx);
  const pitch = Math.max(5 * u, num(theme, "--mp-coil-pitch", 11) * u);
  const rx = num(theme, "--mp-coil-width", 9) * u * 1.4;
  const ry = Math.min(pitch * 0.45, rx * 0.4);
  const turns = Math.max(4, Math.round(length / pitch));
  const stroke = num(theme, "--mp-coil-stroke", 4.5) * u * (selected ? 1.3 : 1);
  ctx.save();
  ctx.lineCap = "round";
  // shadow
  ctx.strokeStyle = "rgba(40,22,6,0.2)";
  ctx.lineWidth = rx * 2;
  ctx.beginPath();
  ctx.moveTo(a.x + 4 * u, a.y + 6 * u);
  ctx.lineTo(b.x + 4 * u, b.y + 6 * u);
  ctx.stroke();
  // back halves first, then front halves
  for (const pass of ["back", "front"]) {
    for (let i = 0; i <= turns; i++) {
      const t = i / turns;
      const cx = a.x + dx * t;
      const cy = a.y + dy * t;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + Math.PI / 2);
      if (pass === "back") {
        ctx.strokeStyle = "#7a5a34";
        ctx.lineWidth = stroke;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = flutePattern(theme) || theme["--mp-cardboard-edge"];
        ctx.lineWidth = stroke;
        ctx.beginPath();
        ctx.ellipse(0.8 * u, 1.6 * u, rx, ry, 0, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = theme["--mp-spring"] || "#d5b483";
        ctx.lineWidth = stroke * 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,240,205,0.7)";
        ctx.lineWidth = 0.9 * u;
        ctx.beginPath();
        ctx.ellipse(0, -stroke * 0.25, rx * 0.95, ry * 0.85, 0, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  void ux; void uy;
  ctx.restore();
}

function paintTapeBridge(ctx, a, b, theme, clock, reduced, u) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const flap = reduced ? 0 : Math.sin(clock * num(theme, "--mp-tape-flap-rate", 3.2)) * num(theme, "--mp-tape-flap", 0.4) * 0.1;
  const length = Math.max(18 * u, Math.hypot(b.x - a.x, b.y - a.y));
  paintTape(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, angle + flap, length, 12 * u, theme, u, Math.round(a.x * 7 + b.y));
}

function paintMotor(ctx, c, theme, u, clock, joint, reduced) {
  const r = 11 * u;
  const spin = reduced ? 0 : clock * (joint.motorSpeed || 0);
  paintFeltButton(ctx, c, r, { ...theme, "--mp-button-felt": theme["--mp-motor"] || "#c8372a" }, u, spin);
}

function paintCraftJoints(ctx, snapshot, theme, project, clock, reduced, u) {
  for (const joint of snapshot.joints || []) {
    const a = project.screenFromWorld(joint.ax, joint.ay);
    const b = project.screenFromWorld(joint.bx, joint.by);
    if (joint.type === "spring") paintCoil(ctx, a, b, theme, u, joint.selected);
    else if (joint.type === "pulley" && joint.groundA && joint.groundB) {
      const gA = project.screenFromWorld(joint.groundA.x, joint.groundA.y);
      const gB = project.screenFromWorld(joint.groundB.x, joint.groundB.y);
      paintTwine(ctx, [a, gA, gB, b], theme, u, joint.selected);
    } else if (joint.type === "rope") paintTwine(ctx, [a, b], theme, u, joint.selected);
    else if (joint.type === "distance") paintYarn(ctx, a, b, theme, u, joint.selected);
    else if (joint.type === "weld") paintTapeBridge(ctx, a, b, theme, clock, reduced, u);
    else if (joint.type === "revolute") {
      if (joint.motor) paintMotor(ctx, a, theme, u, clock, joint, reduced);
      else paintBrass(ctx, a, 3.5 * u, theme, u);
    } else {
      ctx.save();
      ctx.lineWidth = (joint.selected ? 2.4 : 1.4) * u;
      stitchPath(ctx, () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }, theme["--mp-stitch"], u, 4);
      ctx.restore();
    }
  }
}

function paintTrails(ctx, snapshot, theme, project, u) {
  ctx.save();
  ctx.fillStyle = theme["--mp-stitch"];
  for (const trail of snapshot.trails || []) {
    (trail.points || []).forEach((point, index) => {
      const screen = project.screenFromWorld(point.x, point.y);
      ctx.globalAlpha = 0.15 + (index / (trail.points.length || 1)) * 0.5;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 1.4 * u, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

function paintRuler(ctx, snapshot, theme, project, u) {
  if (!snapshot.ruler) return;
  const a = project.screenFromWorld(snapshot.ruler.x1, snapshot.ruler.y1);
  const b = project.screenFromWorld(snapshot.ruler.x2, snapshot.ruler.y2);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const hw = 7 * u;
  const pts = [
    { x: a.x + nx * hw, y: a.y + ny * hw }, { x: b.x + nx * hw, y: b.y + ny * hw },
    { x: b.x - nx * hw, y: b.y - ny * hw }, { x: a.x - nx * hw, y: a.y - ny * hw }
  ];
  softShadow(ctx, () => tracePoly(ctx, pts), 3 * u, 4 * u, theme);
  tracePoly(ctx, pts);
  ctx.fillStyle = theme["--mp-ruler"];
  ctx.fill();
  paintLighting(ctx, pts, 0.8);
  ctx.save();
  ctx.strokeStyle = theme["--mp-stitch"];
  ctx.lineWidth = 1 * u;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    const k = i % 2 ? 0.4 : 0.8;
    ctx.beginPath();
    ctx.moveTo(x + nx * hw, y + ny * hw);
    ctx.lineTo(x + nx * hw * (1 - k * 2), y + ny * hw * (1 - k * 2));
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- chalk / crayon force arrows ---------------------------------------- */

function crayonArrow(ctx, x0, y0, x1, y1, color, theme, reduced, u) {
  const unit = u || 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  if (length < 4 * unit) return;
  const ux = dx / length;
  const uy = dy / length;
  const jitter = (reduced ? 0 : num(theme, "--mp-crayon-jitter", 1.35)) * unit;
  const width = num(theme, "--mp-crayon-width", 3.2) * unit;
  const seed = (Math.round(x0) * 73856093) ^ (Math.round(y0) * 19349663) ^ (Math.round(x1) * 83492791);
  const rand = mulberry(seed);
  const head = Math.min(18 * unit, Math.max(9 * unit, length * 0.3));
  const shaftEnd = { x: x1 - ux * head * 0.7, y: y1 - uy * head * 0.7 };
  const headPts = [
    { x: x1, y: y1 },
    { x: x1 - ux * head - uy * head * 0.5, y: y1 - uy * head + ux * head * 0.5 },
    { x: x1 - ux * head * 0.78, y: y1 - uy * head * 0.78 },
    { x: x1 - ux * head + uy * head * 0.5, y: y1 - uy * head - ux * head * 0.5 }
  ];
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // dark halo keeps the arrow legible over felt, foil, and the sky
  ctx.strokeStyle = theme["--mp-arrow-halo"] || "rgba(35,20,6,0.55)";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = width * 2.3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(shaftEnd.x, shaftEnd.y);
  ctx.stroke();
  ctx.lineWidth = width * 1.2;
  tracePoly(ctx, headPts);
  ctx.stroke();
  ctx.fill();
  // waxy body
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const passes = reduced ? 1 : 3;
  for (let pass = 0; pass < passes; pass++) {
    ctx.globalAlpha = reduced ? 1 : 0.55 + pass * 0.2;
    ctx.lineWidth = width * (reduced ? 1.35 : 0.8 + pass * 0.25);
    ctx.beginPath();
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (shaftEnd.x - x0) * t + (i && i < steps ? (rand() - 0.5) * jitter : 0);
      const y = y0 + (shaftEnd.y - y0) * t + (i && i < steps ? (rand() - 0.5) * jitter : 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  tracePoly(ctx, headPts);
  ctx.fill();
  // chalk grain: paper tooth showing through the wax
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = theme["--mp-crayon-grain"] || "rgba(255,255,255,0.45)";
  const dots = Math.min(60, Math.round(length / (2.2 * unit)));
  for (let i = 0; i < dots; i++) {
    const t = rand();
    const off = (rand() - 0.5) * width * 0.9;
    const x = x0 + (shaftEnd.x - x0) * t - uy * off;
    const y = y0 + (shaftEnd.y - y0) * t + ux * off;
    ctx.fillRect(x, y, 0.9 * unit, 0.9 * unit);
  }
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 0.8 * unit;
  ctx.beginPath();
  ctx.moveTo(x0 - uy * width * 0.25, y0 + ux * width * 0.25);
  ctx.lineTo(shaftEnd.x - uy * width * 0.25, shaftEnd.y + ux * width * 0.25);
  ctx.stroke();
  ctx.restore();
}

function paintVectors(ctx, snapshot, theme, project, reduced, u) {
  const vectors = snapshot.vectors || [];
  let maxForce = 1;
  for (const vector of vectors) {
    if (vector.kind === "velocity") continue;
    maxForce = Math.max(maxForce, Math.hypot(vector.fx, vector.fy));
  }
  const forcePx = (0.22 * Math.min(ctx.canvas.width, ctx.canvas.height)) / maxForce;
  const velPx = 16 * (u || 1);
  for (const vector of vectors) {
    const origin = project.screenFromWorld(vector.x, vector.y);
    const scale = vector.kind === "velocity" ? velPx : forcePx;
    const tipX = origin.x + vector.fx * scale;
    const tipY = origin.y - vector.fy * scale;
    crayonArrow(ctx, origin.x, origin.y, tipX, tipY, colorFor(theme, vector.kind), theme, reduced, u);
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
  const camera = createCamera();
  let project = cameraProjector(canvas.width || 1, canvas.height || 1, camera);
  let clock = 0;
  let last = 0;

  function size() {
    return { width: canvas.width || 1, height: canvas.height || 1 };
  }

  function refreshProject() {
    const box = size();
    project = cameraProjector(box.width, box.height, camera);
  }

  return {
    id,
    draw(snapshot) {
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      const reduced = tiltFor.reduced;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      if (!reduced && last) clock += dt;
      last = now;
      const snap = snapshot || { bodies: [] };
      const theme = readTheme(typeof document !== "undefined" ? document.documentElement : null);
      camera.shear = reduced ? 0 : Math.tan(tiltFor.tilt(theme) || 0);
      const box = size();
      if (!camera.framed) frameCamera(camera, box.width, box.height, snap, camera.insets);
      easeFollow(camera, snap, dt);
      refreshProject();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paint({ ctx, theme, project, snapshot: snap, clock, reduced });
    },
    worldFromScreen(x, y) {
      return project.worldFromScreen(x, y);
    },
    screenFromWorld(x, y) {
      return project.screenFromWorld(x, y);
    },
    panBy(dx, dy) {
      const box = size();
      const before = project.worldFromScreen(box.width / 2, box.height / 2);
      const after = project.worldFromScreen(box.width / 2 - dx, box.height / 2 - dy);
      camera.cx += after.x - before.x;
      camera.cy += after.y - before.y;
      camera.followId = null;
      camera.userAdjusted = true;
      clampCamera(camera);
      refreshProject();
    },
    zoomAt(sx, sy, factor) {
      if (!(factor > 0)) return;
      const before = project.worldFromScreen(sx, sy);
      camera.ppm = Math.max(PPM_MIN, Math.min(PPM_MAX, camera.ppm * factor));
      refreshProject();
      const after = project.worldFromScreen(sx, sy);
      camera.cx += before.x - after.x;
      camera.cy += before.y - after.y;
      camera.followId = null;
      camera.userAdjusted = true;
      clampCamera(camera);
      refreshProject();
    },
    frame(snapshot, insets) {
      if (insets) camera.insets = insets;
      frameCamera(camera, size().width, size().height, snapshot || { bodies: [] }, camera.insets);
      refreshProject();
    },
    userAdjusted() {
      return !!camera.userAdjusted;
    },
    setFollow(bodyId) {
      camera.followId = bodyId || null;
    },
    handleOf(body) {
      if (!body) return null;
      const world = handlePoint(body);
      return { x: world.x, y: world.y, screen: project.screenFromWorld(world.x, world.y) };
    },
    resize() {
      refreshProject();
    }
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
    const u = unitOf(ctx);
    const all = (snapshot.bodies || [])
      .map((body) => ({ body, geom: screenGeom(project, body) }))
      .filter((item) => item.geom)
      .sort((a, b) => a.geom.front - b.geom.front);
    // Static scenery (shelves, trays, ramps, walls) never moves, so it is
    // baked into the cached backdrop plate together with the grid.
    const baked = [];
    const bodies = [];
    for (const item of all) (isBakeable(item, snapshot, theme) ? baked : bodies).push(item);
    const bakedKey = baked.map((item) => item.body.id + ":" + item.geom.pts.map((p) => Math.round(p.x) + "," + Math.round(p.y)).join(";")).join("/");
    paintBackdrop(ctx, theme, project, clock, still, u, bakedKey, (g) => {
      drawGrid(g, project, theme["--mp-grid"], 0.5);
      for (const item of baked) paintCraftBody(g, project, snapshot, item.body, theme, 0, true, u);
    });
    paintTrails(ctx, snapshot, theme, project, u);
    paintCraftJoints(ctx, snapshot, theme, project, clock, still, u);
    for (const body of snapshot.bodies || []) {
      if (body.thrustOn) paintFlames(ctx, project, body, theme, clock, still, u);
    }
    for (const item of bodies) paintCraftBody(ctx, project, snapshot, item.body, theme, clock, still, u);
    paintRuler(ctx, snapshot, theme, project, u);
    paintVectors(ctx, snapshot, theme, project, still, u);
    paintGrabHandle(ctx, project, snapshot, theme, u);
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
    paintGrabHandle(ctx, project, snapshot, theme);
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
    paintGrabHandle(ctx, project, snapshot, theme);
  });
}
