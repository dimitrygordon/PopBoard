// Pure VR layout for the Spaceships lab. No three.js here so node tests can import it.
// The headset session in ss-vr.js uses these numbers and the same GLB the on-screen viewer loads.

export const MODE_LINE = "3D on this screen, AR in your space, or VR on a Meta Quest.";
export const VR_BUTTON_LABEL = "View in VR";
export const VR_NOTE = "VR needs a Meta Quest.";
export const VR_FAIL = "The headset did not open. 3D on this page still works.";
export const VR_HINT = "Grip turns the model. Thumbstick turns and scales. Closer and Farther slide it. Trigger resets to real size.";

// Classroom scale shrinks the longest side to this. Real size is always scale 1, with no meter cap.
export const COMFORT_SPAN_M = 0.85;
export const VIEW_DISTANCE_M = 1.45;
export const SCALE_MIN = 0.35;
export const SCALE_MAX = 3;
export const STICK_DEAD = 0.18;
export const DEFAULT_REAL = true;

// Nearest surface at the opening view, and how close Closer is allowed to bring it.
export const MIN_CLEAR_M = 1.2;
export const CLOSE_MIN_M = 0.45;
// Half-angle used so the whole craft fits in view, and so Farther can back up to see all of a body.
export const FIT_HALF_FOV = 24 * Math.PI / 180;
// Angular radius of a planet or moon at the opening view, so the limb curves across the headset.
export const HORIZON_LIMB_DEG = 32;
export const DIST_STEP = 1.28;
// Stand this many meters off the hull when a rocket is on the floor.
export const ROCKET_BESIDE_M = 6;
export const ROCKET_AHEAD_M = 8;

export function immersiveVrSupported(xr) {
  const api = xr === undefined && typeof navigator !== "undefined" ? navigator.xr : xr;
  if (!api || typeof api.isSessionSupported !== "function") return Promise.resolve(false);
  return Promise.resolve()
    .then(() => api.isSessionSupported("immersive-vr"))
    .then((ok) => ok === true)
    .catch(() => false);
}

export function vrControlState(supported) {
  if (supported) return { buttonHidden: false, disabled: false, noteHidden: true, note: "" };
  return { buttonHidden: true, disabled: true, noteHidden: false, note: VR_NOTE };
}

// real true: the GLB's own meters. real false: classroom scale. There is no third, capped mode.
export function viewScale(spanMeters, real) {
  const span = Number(spanMeters);
  const safe = Number.isFinite(span) && span > 1e-6 ? span : 1;
  if (!real) {
    return { scale: COMFORT_SPAN_M / safe, mode: "classroom", label: "Classroom scale" };
  }
  return { scale: 1, mode: "real", label: "Real size" };
}

export function clampScale(userScale, limit) {
  const cap = Number.isFinite(limit) && limit > 0 ? Math.min(SCALE_MAX, limit) : SCALE_MAX;
  const s = Number(userScale);
  if (!Number.isFinite(s)) return 1;
  return Math.min(cap, Math.max(SCALE_MIN, s));
}

// Quest thumbstick: x right is positive, y down is positive. Up grows the model. Deadzone holds still.
export function stickDelta(stickX, stickY, dt, opt = {}) {
  const dead = opt.dead ?? STICK_DEAD;
  const yawRate = opt.yawRate ?? 1.5;
  const scaleRate = opt.scaleRate ?? 0.65;
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : 0;
  const x = Number(stickX) || 0;
  const y = Number(stickY) || 0;
  if (step === 0) return { yaw: 0, scale: 1 };
  let yaw = 0;
  let scale = 1;
  // Positive yaw spins the near face to the student's right, the same way a hand yaw to the right does.
  if (Math.abs(x) > dead) yaw = x * yawRate * step;
  if (Math.abs(y) > dead) scale = Math.exp(-y * scaleRate * step);
  return { yaw, scale };
}

export function isRocket(craft) {
  const tags = (craft && craft.tags) || [];
  if (tags.includes("rockets")) return true;
  const blob = [craft && craft.id, craft && craft.name, craft && craft.subtitle].filter(Boolean).join(" ").toLowerCase();
  return blob.includes("rocket") || blob.includes("saturn-v") || blob.includes("falcon") || blob.includes("starship");
}

// horizon: a planet or moon, or anything a kilometer across. ground: a rocket on the floor. fit: the whole craft in view.
export function placementKind(craft, span) {
  const tags = (craft && craft.tags) || [];
  const safe = Number(span) || 0;
  if (tags.includes("planets-moons") || safe >= 1000) return "horizon";
  if (isRocket(craft)) return "ground";
  return "fit";
}

function extents(span, size) {
  const s = Number(span) > 1e-6 ? Number(span) : 1;
  const x = size && size.x > 0 ? size.x : s;
  const y = size && size.y > 0 ? size.y : s;
  const z = size && size.z > 0 ? size.z : s;
  return { x, y, z, half: Math.max(x, y, z) / 2, halfH: Math.max(x, z) / 2 };
}

// Placement numbers are in a view frame: the eye is the origin, forward is -Z, Y is up.
// distance is how far the object center sits along the view. side is meters to the student's right.
// centerY is the world height of the center when the eye is at eyeY (the floor is y = 0).
export function initialPlacement(span, size, kind, eyeY = 1.35) {
  const eye = Number.isFinite(eyeY) && eyeY > 0.4 ? eyeY : 1.35;
  const box = extents(span, size);
  if (kind === "horizon") {
    const beta = HORIZON_LIMB_DEG * Math.PI / 180;
    const distance = box.half / Math.sin(beta);
    return {
      kind,
      distance,
      side: 0,
      centerY: eye,
      nearest: distance - box.half,
      floor: false,
    };
  }
  if (kind === "ground") {
    const distance = box.halfH + ROCKET_AHEAD_M;
    const side = box.halfH + ROCKET_BESIDE_M;
    return {
      kind,
      distance,
      side,
      centerY: box.y / 2 + 0.02,
      nearest: ROCKET_AHEAD_M,
      floor: true,
    };
  }
  const distFit = box.half / Math.tan(FIT_HALF_FOV);
  const distance = Math.max(distFit, box.half + MIN_CLEAR_M);
  return {
    kind: "fit",
    distance,
    side: 0,
    centerY: eye - Math.min(0.12, box.half * 0.15),
    nearest: distance - box.half,
    floor: false,
  };
}

export function classroomPlacement(eyeY = 1.35) {
  const eye = Number.isFinite(eyeY) && eyeY > 0.4 ? eyeY : 1.35;
  return {
    kind: "fit",
    distance: VIEW_DISTANCE_M,
    side: 0,
    centerY: eye - 0.08,
    nearest: VIEW_DISTANCE_M - COMFORT_SPAN_M / 2,
    floor: false,
  };
}

export function distanceLimits(span, size, kind) {
  const box = extents(span, size);
  if (kind === "ground") {
    const min = box.halfH + CLOSE_MIN_M;
    const seeAll = (box.y / 2) / Math.tan(FIT_HALF_FOV);
    return { min, max: Math.max(seeAll, min * 2, 40) };
  }
  const min = box.half + CLOSE_MIN_M;
  const seeAll = box.half / Math.sin(FIT_HALF_FOV);
  return { min, max: Math.max(seeAll * 1.2, min * 1.5, 8) };
}

// dir -1 brings the object closer. dir +1 pushes it farther. The camera never moves.
export function stepDistance(distance, dir, limits) {
  const min = limits && limits.min > 0 ? limits.min : CLOSE_MIN_M;
  const max = limits && limits.max > min ? limits.max : min * 8;
  const base = Number(distance) > 0 ? Number(distance) : min;
  const next = dir < 0 ? base / DIST_STEP : base * DIST_STEP;
  return Math.min(max, Math.max(min, next));
}

// Ease the object toward a target distance. Returns the new distance. No camera motion.
export function easeDistance(current, target, dt) {
  const goal = Number(target);
  const now = Number(current);
  if (!Number.isFinite(goal) || !Number.isFinite(now)) return goal || 0;
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : 0;
  if (step === 0) return now;
  const k = 1 - Math.exp(-3.5 * step);
  const next = now + (goal - now) * k;
  if (Math.abs(goal - next) <= Math.max(1e-4, Math.abs(goal) * 1e-5)) return goal;
  return next;
}

// Logarithmic depth still needs a far plane past the far side of the body.
export function depthRange(span) {
  const safe = Number(span) > 1e-6 ? Number(span) : 1;
  return { near: 0.05, far: Math.min(1e12, Math.max(500, safe * 6)) };
}

export function placementNote(kind) {
  if (kind === "horizon") return "True size. The curve ahead is this body's horizon.";
  if (kind === "ground") return "True size. It stands on the floor beside you.";
  return "";
}

// Button rectangles in the 1024x768 panel texture. drawPanel uses this same list.
export const PANEL_W = 1024;
export const PANEL_H = 768;
export function panelButtons(real) {
  const rows = [
    { y: 572, h: 80, labels: [["closer", "Closer"], ["farther", "Farther"]] },
    { y: 664, h: 80, labels: [["prev", "Previous"], ["next", "Next"], ["real", real ? "Classroom" : "Real size"], ["reset", "Reset"], ["exit", "Exit VR"]] },
  ];
  const rects = [];
  for (const row of rows) {
    const gap = 12;
    const x0 = 28;
    const bw = (PANEL_W - x0 * 2 - gap * (row.labels.length - 1)) / row.labels.length;
    row.labels.forEach(([id, label], i) => {
      rects.push({ id, label, x: x0 + i * (bw + gap), y: row.y, w: bw, h: row.h });
    });
  }
  return rects;
}

export function buttonAt(px, py, rects) {
  if (!rects) return null;
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.id;
  }
  return null;
}

// A trigger on the panel never rotates the model. A trigger that misses the panel resets.
export function resolveSelect(hit) {
  if (hit && hit.button) return { action: hit.button, rotate: false };
  if (hit && hit.panel) return { action: null, rotate: false };
  return { action: "reset", rotate: false };
}

function qMul(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}
function qInv(q) {
  const n = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w || 1;
  return { x: -q.x / n, y: -q.y / n, z: -q.z / n, w: q.w / n };
}

// Controller forward is local -Z. Tipping that forward down is a negative rotation about X,
// which would lift the object's near face (+Z, the side toward the student) if applied directly.
// Return the inverse so the near face follows the hand.
export function grabTurn(prev, next) {
  const delta = qMul(next, qInv(prev));
  return qInv(delta);
}

export function shortFact(craft, max = 180) {
  const facts = (craft && craft.facts) || [];
  const row = facts.find((f) => f.label === "Fun fact")
    || facts.find((f) => f.label === "About")
    || facts[0];
  if (!row || !row.value) return "";
  const text = String(row.value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut).trim() + "...";
}

export function realSizeFact(craft) {
  const row = ((craft && craft.facts) || []).find((f) => f.label === "Real size");
  return row && row.value ? String(row.value).replace(/\s+/g, " ").trim() : "";
}

export function realSizeLine(craft) {
  const fact = realSizeFact(craft);
  return fact ? "Real size: " + fact : "Real size";
}
