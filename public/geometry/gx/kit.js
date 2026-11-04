// Shared bits for the Geometry interactives (gx/u01.js to gx/u12.js).
export { createSteps, M } from "../gx-core.js";
export { P, lab, txt, avg, shape, lineArrows, parMark, clipLine, grid } from "../geo-fig-kit.js";
import * as M from "../geo-math.js";
export const d1 = (x) => M.round(x, 1).toFixed(1);
export const deg = (x) => `${Math.round(x)}\u00b0`;
export const num = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace("-", "\u2212");
// keep a point on a circle
export const onCircle = (c, r) => (q) => M.add(c, M.mul(M.unit(M.sub(q, c)), r));
// keep a point on a line through a and b
export const onLine = (a, b) => (q) => M.foot(q, a, b);
// the far end of an arc sweep around both points of interest, in degrees: [start, end]
export function span(c, pts, pad = 14) {
  const ds = pts.map((p) => M.dirDeg(c, p)).sort((a, b) => a - b);
  let best = [ds[0], ds[ds.length - 1]], gap = 360 - (ds[ds.length - 1] - ds[0]);
  for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] > gap) { gap = ds[i] - ds[i - 1]; best = [ds[i], ds[i - 1] + 360]; }
  return [best[0] - pad, best[1] + pad];
}
// a short arc through point p on circle (c, r)
export const tick = (g, c, r, p, t = 1, half = 14) => { const d = M.dirDeg(c, p); g.sweep(c, r, d - half, d + half, t); };
