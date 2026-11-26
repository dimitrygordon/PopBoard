// Night Sky hit-testing (pure). Stars and planets use a cone (design section 4). Constellations
// use the convex hull of the figure's line stars, or the nearest figure within a tolerance.
// No IAU boundary file is shipped; the hull is the fallback the brief allows.

export const PICK_STAR_DEG = 1.5, PICK_BODY_DEG = 2.0, PICK_CON_TOL_DEG = 4;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angDeg = (a, b) => Math.acos(clamp(dot(a, b), -1, 1)) * R2D;

function tangentFrame(c) {
  let e = [-c[1], c[0], 0];
  if (Math.hypot(...e) < 1e-6) e = [0, 1, 0];
  e = norm(e);
  return { c, e, n: cross(c, e) };
}
function toPlane(v, fr) {
  const d = dot(v, fr.c);
  if (d <= 0.05) return null;
  return [dot(v, fr.e) / d, dot(v, fr.n) / d];
}
function fromPlane(p, fr) {
  return norm([fr.c[0] + p[0] * fr.e[0] + p[1] * fr.n[0], fr.c[1] + p[0] * fr.e[1] + p[1] * fr.n[1], fr.c[2] + p[0] * fr.e[2] + p[1] * fr.n[2]]);
}

/** Monotone-chain convex hull of [x, y] points. Returns vertices in CCW order. */
export function convexHull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length <= 2) return p.slice();
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

function pointInConvex(p, hull) {
  if (hull.length === 1) return false;
  if (hull.length === 2) return false;
  const cr = (a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  let sign = 0;
  for (let i = 0, n = hull.length; i < n; i++) {
    const c = cr(hull[i], hull[(i + 1) % n]);
    if (Math.abs(c) < 1e-12) continue;
    if (sign === 0) sign = c > 0 ? 1 : -1;
    else if ((c > 0 ? 1 : -1) !== sign) return false;
  }
  return true;
}

/** Angular degrees from unit vector p to the great-circle segment a-b. */
export function angDegToSegment(p, a, b) {
  const n = cross(a, b);
  const nl = Math.hypot(...n);
  if (nl < 1e-9) return angDeg(p, a);
  const nn = [n[0] / nl, n[1] / nl, n[2] / nl];
  const foot = norm(cross(nn, cross(p, nn)));
  // two intersections; pick the one on the same side as a+b
  const foot2 = [-foot[0], -foot[1], -foot[2]];
  const mid = norm([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  const f = dot(foot, mid) >= dot(foot2, mid) ? foot : foot2;
  const on = dot(cross(a, f), nn) >= -1e-9 && dot(cross(f, b), nn) >= -1e-9;
  return on ? angDeg(p, f) : Math.min(angDeg(p, a), angDeg(p, b));
}

/** Precompute hulls and centers for every figure. starVec(i) is a J2000 unit vector. */
export function buildConstellationIndex(constellations, starVec) {
  return constellations.map((c) => {
    const seen = new Set(), vecs = [];
    for (const line of c.lines) for (const i of line) if (!seen.has(i)) { seen.add(i); vecs.push(starVec(i)); }
    let sx = 0, sy = 0, sz = 0;
    for (const v of vecs) { sx += v[0]; sy += v[1]; sz += v[2]; }
    const center = norm([sx, sy, sz]);
    const fr = tangentFrame(center);
    const pts = [];
    for (const v of vecs) { const p = toPlane(v, fr); if (p) pts.push(p); }
    const hull2 = convexHull2(pts);
    const hull = hull2.map((p) => fromPlane(p, fr));
    const segs = [];
    for (const line of c.lines) for (let k = 0; k + 1 < line.length; k++) segs.push([starVec(line[k]), starVec(line[k + 1])]);
    let area = 0;
    for (let i = 0, n = hull2.length; i < n; i++) { const a = hull2[i], b = hull2[(i + 1) % n]; area += a[0] * b[1] - a[1] * b[0]; }
    return { id: c.id, latin: c.latin, english: c.english, center, frame: fr, hull2, hull, segs, vecs, area: Math.abs(area) / 2, hasArt: !!c.art };
  });
}

function edgeDeg(dir, rec) {
  if (rec.hull.length === 0) return Infinity;
  if (rec.hull.length === 1) return angDeg(dir, rec.hull[0]);
  let best = Infinity;
  for (let i = 0, n = rec.hull.length; i < n; i++) best = Math.min(best, angDegToSegment(dir, rec.hull[i], rec.hull[(i + 1) % n]));
  return best;
}

/** Nearest figure whose hull contains the J2000 ray, or whose hull is within tolDeg. */
export function pickConstellation(dirJ2000, index, tolDeg = PICK_CON_TOL_DEG) {
  let best = null, bestScore = Infinity;
  for (const rec of index) {
    const p = toPlane(dirJ2000, rec.frame);
    const inside = p ? pointInConvex(p, rec.hull2) : false;
    const dEdge = inside ? 0 : edgeDeg(dirJ2000, rec);
    if (!inside && dEdge > tolDeg) continue;
    // Overlapping hulls: the smaller figure wins, then the nearer edge.
    const score = dEdge + rec.area * 1e-6;
    if (score < bestScore) { best = rec; bestScore = score; }
  }
  return best;
}

function aboveHorizon(dir, groundOn) { return !groundOn || dir[1] > -0.0087; }

/** Brightest catalog star within coneDeg of dirJ2000 (stars must be sorted by magnitude, as stars.bin is). */
export function pickStar(dirJ2000, stars, { coneDeg = PICK_STAR_DEG, magLimit = 6.5, groundOn = false, worldDir } = {}) {
  const cosLim = Math.cos(coneDeg * D2R);
  for (let i = 0; i < stars.n; i++) {
    if (stars.mag[i] > magLimit) break;
    if (stars.vec[3 * i] * dirJ2000[0] + stars.vec[3 * i + 1] * dirJ2000[1] + stars.vec[3 * i + 2] * dirJ2000[2] > cosLim) {
      if (worldDir && !aboveHorizon(worldDir(i), groundOn)) continue;
      return i;
    }
  }
  return -1;
}

/** Nearest solar body within coneDeg of a local-frame unit vector. bodies: [{ id, dir, ... }]. */
export function pickBody(local, bodies, { coneDeg = PICK_BODY_DEG, groundOn = false } = {}) {
  let best = null, bestD = coneDeg;
  for (const b of bodies) {
    const d = angDeg(b.dir, local);
    if (d < bestD && aboveHorizon(b.dir, groundOn)) { best = b; bestD = d; }
  }
  return best;
}

/**
 * Full pick in the local frame. applyT(M, unrefractedLocal) takes a local direction to J2000.
 * worldStar(i) is the apparent local direction of star i (for the horizon test).
 */
export function pickSky(local, opts) {
  const { solar = [], planetsOn = true, groundOn = false, stars, magLimit = 6.5, conIndex = [],
    applyT, M, unrefract = (v) => v, worldStar } = opts;
  if (!aboveHorizon(local, groundOn)) return null;
  if (planetsOn && solar.length) {
    const b = pickBody(local, solar, { groundOn });
    if (b) return { kind: "body", id: b.id, body: b };
  }
  const trueLocal = unrefract(local);
  const dirJ = applyT ? applyT(M, trueLocal) : trueLocal;
  const si = stars ? pickStar(dirJ, stars, { magLimit, groundOn, worldDir: worldStar }) : -1;
  if (si >= 0) return { kind: "star", index: si };
  const rec = pickConstellation(dirJ, conIndex);
  if (rec) return { kind: "constellation", id: rec.id, rec };
  return null;
}

export function samePick(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "star") return a.index === b.index;
  if (a.kind === "body" || a.kind === "constellation") return a.id === b.id;
  return false;
}
