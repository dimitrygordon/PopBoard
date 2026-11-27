// Flight-plane frames, floating origin, model scale and horizon geometry (spec 7.4). Pure, double precision.
// Sim plane: Earth centre at (0, 0), cannon at (R + h, 0), launch velocity along +y.
// MOUNTAIN world (metres, y up, local-floor): origin of the flight plane is the muzzle M. world = M + u*(x-(R+h)) + f*y,
//   u = up (0,1,0), f = barrel direction (0,0,-1). The out-of-plane axis is +x (to the student's right).
// MODEL world: Earth centre C, uniform scale s. world = C + s*(x * ex + y * ey), ex = (1,0,0), ey = (0,0,-1), out-of-plane +y.

const D2R = Math.PI / 180;

export const horizonDipDeg = (R, h) => Math.acos(R / (R + h)) / D2R;
/** Straight-line (line-of-sight) distance from the muzzle to the horizon: sqrt(r^2 - R^2). */
export const horizonStraightM = (R, h) => Math.sqrt((R + h) ** 2 - R * R);
/** Distance along the ground to the horizon point: R * acos(R / r). Shorter than the straight line. */
export const horizonGroundM = (R, h) => R * Math.acos(R / (R + h));
export const modelScale = (sizeM, R) => sizeM / (2 * R);

/** Basis vectors for each view, plus where the plane origin sits. */
export function mountainFrame(rig, R, h) {
  return { kind: "mountain", u: [0, 1, 0], f: [0, 0, -1], side: [1, 0, 0],
    muzzle: [rig.cannonX, rig.muzzleY, rig.muzzleZ], earthCentre: [rig.cannonX, rig.muzzleY - (R + h), rig.muzzleZ], scale: 1 };
}
export function modelFrame(centre, sizeM, R) {
  return { kind: "model", ex: [1, 0, 0], ey: [0, 0, -1], out: [0, 1, 0], earthCentre: centre.slice(), scale: modelScale(sizeM, R) };
}

/** Sim point to world, subtracting the origin in doubles first. Returns a plain [x, y, z] of JS numbers. */
export function simToWorld(frame, R, h, x, y) {
  if (frame.kind === "mountain") {
    const dx = x - (R + h);
    return [frame.muzzle[0] + frame.u[0] * dx + frame.f[0] * y, frame.muzzle[1] + frame.u[1] * dx + frame.f[1] * y, frame.muzzle[2] + frame.u[2] * dx + frame.f[2] * y];
  }
  const s = frame.scale;
  return [frame.earthCentre[0] + s * (x * frame.ex[0] + y * frame.ey[0]), frame.earthCentre[1] + s * (x * frame.ex[1] + y * frame.ey[1]), frame.earthCentre[2] + s * (x * frame.ex[2] + y * frame.ey[2])];
}
/** What the GPU gets for a trail point: a float32 position relative to the frame's origin (muzzle or Earth centre). */
export function toGpuRelative(frame, R, h, x, y) {
  if (frame.kind === "mountain") return [Math.fround(frame.u[0] * (x - (R + h)) + frame.f[0] * y), Math.fround(frame.u[1] * (x - (R + h)) + frame.f[1] * y), Math.fround(frame.u[2] * (x - (R + h)) + frame.f[2] * y)];
  return [Math.fround(x * frame.ex[0] + y * frame.ey[0]), Math.fround(x * frame.ex[1] + y * frame.ey[1]), Math.fround(x * frame.ex[2] + y * frame.ey[2])];
}

/** Distance along a ray (unit dir) to a sphere, or null. Used for picking the Earth and the predict pin (B3) and in tests. */
export function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}
/** Direction (unit) dipped `deg` below level along the barrel, in the mountain frame. */
export function dippedDir(deg) { const a = deg * D2R; return [0, -Math.sin(a), -Math.cos(a)]; }

/** Moon at model scale: distance and diameter in metres for a globe `sizeM` across. */
export function moonAtScale(sizeM, R, moonDistM, moonRadiusM) { const s = modelScale(sizeM, R); return { distM: moonDistM * s, diameterM: 2 * moonRadiusM * s }; }

/** Latitude and longitude (degrees) to a unit vector in the texture frame (y = north, z through lon 0 prime meridian at +x?). */
export function latLonToVec(latDeg, lonDeg) { const la = latDeg * D2R, lo = lonDeg * D2R; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; }

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** The plane axes in world coordinates for a frame: radial up at the cannon, flight direction, and u x f (out of the plane). */
export function planeAxes(frame) {
  const u = frame.kind === "mountain" ? frame.u : frame.ex, f = frame.kind === "mountain" ? frame.f : frame.ey;
  return { u, f, o: cross(u, f) };
}
/** Fixed Sun direction in world coordinates from the plane-frame triple (up, along the barrel, out of the plane). */
export function sunWorld(frame, sunPlane) {
  const { u, f, o } = planeAxes(frame), s = norm(sunPlane);
  return norm([0, 1, 2].map((i) => s[0] * u[i] + s[1] * f[i] + s[2] * o[i]));
}
/** 3x3 row-major, world to texture frame (y = north pole, +z at longitude 0). The cannon sits over (lat, lon), the flight goes east. */
export function texRotation(frame, latDeg, lonDeg) {
  const P = latLonToVec(latDeg, lonDeg), E = norm(cross([0, 1, 0], P)), N = cross(P, E);
  const { u, f, o } = planeAxes(frame);
  // texture->world M has columns M*P = u, M*E = f, M*N = o, so M = W * T^T with W = [u f o] and T = [P E N] as columns
  const W = [[u[0], f[0], o[0]], [u[1], f[1], o[1]], [u[2], f[2], o[2]]], T = [[P[0], E[0], N[0]], [P[1], E[1], N[1]], [P[2], E[2], N[2]]];
  const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => W[i][0] * T[j][0] + W[i][1] * T[j][1] + W[i][2] * T[j][2]));
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => M[j][i])); // transpose = inverse for a rotation
}
/** Equatorial J2000 (z = pole) to the texture frame (y = pole): (x, y, z) -> (x, z, -y). Row-major. */
export const EQ_TO_TEX = [[1, 0, 0], [0, 0, 1], [0, -1, 0]];
export function mat3mul(a, b) { return [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])); }
export function mat3vec(m, v) { return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]]; }
export const transpose3 = (m) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));
