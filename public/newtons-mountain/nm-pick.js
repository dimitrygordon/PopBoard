// Newton's Mountain: picking. A ray (tap on a screen, controller ray, or a hand pinch) against the flags, balls and trail points.
// Pure. Points are [{ n, p: [x,y,z] }] in world metres; the nearest one within tolDeg of the ray wins.
export function angleDeg(o, d, p) {
  const vx = p[0] - o[0], vy = p[1] - o[1], vz = p[2] - o[2], l = Math.hypot(vx, vy, vz);
  if (l < 1e-9) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, (vx * d[0] + vy * d[1] + vz * d[2]) / l))) * 180) / Math.PI;
}
export function pickNearest(points, o, d, tolDeg = 3) {
  let best = null, bestA = tolDeg;
  for (const q of points) { const a = angleDeg(o, d, q.p); if (a < bestA) { bestA = a; best = q.n; } }
  return best;
}
/** Distance from a ray to a point (metres), for the FIRE button on the cannon. */
export function rayPointDistance(o, d, p) {
  const vx = p[0] - o[0], vy = p[1] - o[1], vz = p[2] - o[2], t = Math.max(0, vx * d[0] + vy * d[1] + vz * d[2]);
  return Math.hypot(vx - d[0] * t, vy - d[1] * t, vz - d[2] * t);
}
