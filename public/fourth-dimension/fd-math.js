// Beyond 3D: pure math (no DOM, no Three.js). Safe to import in Node tests.
// Points are plain arrays [x, y, z, w]. Matrices are row-major arrays of rows.

export const AXES = ["x", "y", "z", "w"];
export const PLANES = { XY: [0, 1], XZ: [0, 2], YZ: [1, 2], XW: [0, 3], YW: [1, 3], ZW: [2, 3] };

// ---------- counting: n-cubes ----------
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
// Number of k-dimensional faces of an n-cube: C(n,k) * 2^(n-k).
export const cubeFaces = (n, k) => (k < 0 || k > n ? 0 : binom(n, k) * 2 ** (n - k));
export const vertices = (n) => cubeFaces(n, 0);        // 2^n
export const edges = (n) => cubeFaces(n, 1);           // n * 2^(n-1)
export const squares = (n) => cubeFaces(n, 2);         // C(n,2) * 2^(n-2)
export const cubes = (n) => cubeFaces(n, 3);           // C(n,3) * 2^(n-3)
export const NAMES = ["point", "segment", "square", "cube", "tesseract"];
// Euler characteristic of the boundary-plus-interior: sum (-1)^k f_k = 1 for every n-cube.
export const euler = (n) => { let s = 0; for (let k = 0; k <= n; k++) s += (-1) ** k * cubeFaces(n, k); return s; };

// ---------- 4x4 rotations ----------
export function identity(n = 4) { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); }
// Rotation by angle a in the plane spanned by axes i and j (i -> j for positive a).
export function planeRotation(i, j, a, n = 4) {
  const m = identity(n), c = Math.cos(a), s = Math.sin(a);
  m[i][i] = c; m[j][j] = c; m[j][i] = s; m[i][j] = -s;
  return m;
}
export const rot = (plane, a) => planeRotation(PLANES[plane][0], PLANES[plane][1], a);
export function mul(A, B) {
  const n = A.length, m = B[0].length, k = B.length, C = [];
  for (let i = 0; i < n; i++) { C.push(new Array(m).fill(0)); for (let j = 0; j < m; j++) for (let t = 0; t < k; t++) C[i][j] += A[i][t] * B[t][j]; }
  return C;
}
export function transpose(A) { return A[0].map((_, j) => A.map((r) => r[j])); }
export function apply(M, p) { return M.map((r) => r.reduce((s, v, j) => s + v * (p[j] || 0), 0)); }
export function det(A) {
  const n = A.length; if (n === 1) return A[0][0];
  let d = 0;
  for (let j = 0; j < n; j++) d += (-1) ** j * A[0][j] * det(A.slice(1).map((r) => r.filter((_, c) => c !== j)));
  return d;
}
// Re-orthonormalize (Gram-Schmidt on rows) to stop drift after many small rotations.
export function orthonormalize(M) {
  const out = [];
  for (const r of M) {
    let v = r.slice();
    for (const u of out) { const d = v.reduce((s, x, i) => s + x * u[i], 0); v = v.map((x, i) => x - d * u[i]); }
    const l = Math.hypot(...v) || 1; out.push(v.map((x) => x / l));
  }
  return out;
}

// ---------- projection 4D -> 3D ----------
// Perspective: eye on the w axis at w = d, looking toward -w. Scale k / (d - w).
export function projectPerspective(p, d = 3, k = d - 1) {
  const s = k / (d - p[3]);
  return [p[0] * s, p[1] * s, p[2] * s];
}
export function projectOrtho(p) { return [p[0], p[1], p[2]]; }
// Same idea one step down (3D -> 2D), eye on z.
export function projectPerspective3(p, d = 3, k = d - 1) { const s = k / (d - p[2]); return [p[0] * s, p[1] * s]; }
// Shadow of point p from a point light L onto the plane y = h (floor).
export function shadowOnFloor(p, L, h = 0) {
  const t = (L[1] - h) / (L[1] - p[1]);
  return [L[0] + (p[0] - L[0]) * t, h, L[2] + (p[2] - L[2]) * t];
}

// ---------- polytopes ----------
// n-cube with coordinates +-1. Vertex index bits = sign pattern (bit i set -> +1 on axis i).
export function hypercube(n) {
  const V = [], E = [], F = [];
  for (let i = 0; i < 2 ** n; i++) V.push(Array.from({ length: 4 }, (_, a) => (a < n ? ((i >> a) & 1 ? 1 : -1) : 0)));
  for (let i = 0; i < V.length; i++) for (let a = 0; a < n; a++) { const j = i ^ (1 << a); if (j > i) E.push([i, j]); }
  // 2-faces: fix all but axes a<b.
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let i = 0; i < V.length; i++) {
    if ((i >> a) & 1 || (i >> b) & 1) continue;
    F.push([i, i | (1 << a), i | (1 << a) | (1 << b), i | (1 << b)]);
  }
  return { V, E, F };
}
// The 8 cells (3-faces) of the tesseract: axis a fixed at sign s. Returns vertex index lists.
export function tesseractCells() {
  const out = [];
  for (let a = 0; a < 4; a++) for (const s of [-1, 1]) {
    const ids = []; for (let i = 0; i < 16; i++) if ((((i >> a) & 1) ? 1 : -1) === s) ids.push(i);
    out.push({ axis: a, sign: s, ids });
  }
  return out;
}
function byMinDistance(V) {
  let m = Infinity;
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) m = Math.min(m, dist(V[i], V[j]));
  const E = [];
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) if (Math.abs(dist(V[i], V[j]) - m) < 1e-6) E.push([i, j]);
  const adj = V.map(() => new Set()); for (const [i, j] of E) { adj[i].add(j); adj[j].add(i); }
  const F = [];
  for (const [i, j] of E) for (const k of adj[i]) if (k > j && adj[j].has(k)) F.push([i, j, k]);
  return { V, E, F };
}
export const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
// 16-cell: the 8 points +-1 on each axis.
export function cell16() {
  const V = []; for (let a = 0; a < 4; a++) for (const s of [-1, 1]) { const p = [0, 0, 0, 0]; p[a] = s; V.push(p); }
  return byMinDistance(V);
}
// 24-cell: the 24 permutations of (+-1, +-1, 0, 0), scaled by 1/sqrt2 so the radius is 1.
export function cell24() {
  const V = [], r = Math.SQRT1_2;
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (const s of [-1, 1]) for (const t of [-1, 1]) { const p = [0, 0, 0, 0]; p[a] = s * r; p[b] = t * r; V.push(p); }
  return byMinDistance(V);
}
export function shape(name) {
  if (name === "cube") return hypercube(3);
  if (name === "tesseract") return hypercube(4);
  if (name === "16-cell") return cell16();
  if (name === "24-cell") return cell24();
  throw new Error("unknown shape " + name);
}

// ---------- slicing ----------
// Slice a polytope (vertices already transformed) by the hyperplane coord[axis] = c.
// Every 2-face crossing the plane contributes one segment between its two crossing points.
// Returns { points, segments: [[p, q], ...] }. For a 3D solid sliced at z=c this is the
// cross-section polygon's outline; for a 4D solid sliced at w=c it is the 3D slice's wireframe.
export function slice(V, F, axis, c) {
  const segments = [], points = [];
  const cross = (p, q) => { const t = (c - p[axis]) / (q[axis] - p[axis]); return p.map((x, i) => x + (q[i] - x) * t); };
  for (const f of F) {
    const hits = [];
    for (let k = 0; k < f.length; k++) {
      const p = V[f[k]], q = V[f[(k + 1) % f.length]];
      const dp = p[axis] - c, dq = q[axis] - c;
      if ((dp < 0 && dq >= 0) || (dp >= 0 && dq < 0)) hits.push(cross(p, q));
    }
    if (hits.length === 2) { segments.push([hits[0], hits[1]]); points.push(hits[0], hits[1]); }
  }
  return { points: dedupe(points), segments };
}
export function dedupe(pts, eps = 1e-6) {
  const out = [];
  for (const p of pts) if (!out.some((q) => dist(p, q) < eps)) out.push(p);
  return out;
}
// Order coplanar 3D points around their centroid (for filling a cross-section). n = plane normal axis.
export function orderPolygon(pts, axis) {
  const [u, v] = [0, 1, 2].filter((a) => a !== axis);
  const cx = pts.reduce((s, p) => s + p[u], 0) / pts.length, cy = pts.reduce((s, p) => s + p[v], 0) / pts.length;
  return pts.slice().sort((a, b) => Math.atan2(a[v] - cy, a[u] - cx) - Math.atan2(b[v] - cy, b[u] - cx));
}
// Ball of radius R sliced at distance h from its center: radius sqrt(R^2 - h^2), or 0.
export const sliceRadius = (R, h) => (Math.abs(h) >= R ? 0 : Math.sqrt(R * R - h * h));

// ---------- 2D convex hull (shadows) ----------
export function hull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export function polyArea(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }

// ---------- unfolding (nets) ----------
// Net of an n-cube (n = 3 or 4), unfolded into the hyperplane last = -1.
// The cell with last = -1 stays put. Each side cell (axis a, sign s) hinges about the shared
// face at (a = s, last = -1), turning in the (a, last) plane. The cell with last = +1 rides on
// the (axis 1, sign -1) cell and hinges again about their shared face. At t = 1 (90 degrees):
// a cross of 6 squares (cube) or Dali's cross of 8 cubes (tesseract).
export function unfoldCells(n, t) {
  const L = n - 1, th = t * Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
  const C = hypercube(n);
  const hinge = (p, a, sg, pivotA, pivotL, dir) => {
    // rotate (p[a]-pivotA, p[L]-pivotL): +last direction turns toward dir*sg along a
    const da = p[a] - pivotA, dl = p[L] - pivotL, q = p.slice();
    q[a] = pivotA + da * c + dir * sg * dl * s;
    q[L] = pivotL - dir * sg * da * s + dl * c;
    return q;
  };
  const cells = [];
  const pick = (a, sg) => C.V.map((_, i) => i).filter((i) => C.V[i][a] === sg);
  cells.push({ key: "base", ids: pick(L, -1), map: (p) => p });
  for (let a = 0; a < L; a++) for (const sg of [-1, 1]) {
    cells.push({ key: `${AXES[a]}${sg > 0 ? "+" : "-"}`, ids: pick(a, sg), map: (p) => hinge(p, a, sg, sg, -1, 1) });
  }
  // top cell: first hinge onto the y- cell at (y=-1, last=+1), +y toward +last, then ride the y- cell.
  const yMinus = (p) => hinge(p, 1, -1, -1, -1, 1);
  cells.push({ key: "top", ids: pick(L, 1), map: (p) => {
    const da = p[1] + 1, dl = p[L] - 1, q = p.slice();
    q[1] = -1 + da * c - dl * s; q[L] = 1 + da * s + dl * c;
    return yMinus(q);
  } });
  return cells.map((cell) => ({ key: cell.key, points: cell.ids.map((i) => cell.map(C.V[i])), ids: cell.ids }))
    .map((cell) => ({ ...cell, edges: C.E.filter(([i, j]) => cell.ids.includes(i) && cell.ids.includes(j)).map(([i, j]) => [cell.ids.indexOf(i), cell.ids.indexOf(j)]) }));
}

// ---------- challenge predicates ----------
// Distinct 3D points after projection (tolerance in world units).
export function distinctCount(pts, eps = 0.04) { return dedupe(pts, eps).length; }
