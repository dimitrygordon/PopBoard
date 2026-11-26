// Night Sky: constellation art placement (pure). design_v1 section 6.4, "Constellation art".
// Three anchor pixels per illustration are tied to three Hipparcos stars (Stellarium modern sky culture).
// We take the tangent plane at the anchors' mean direction, project the stars gnomonically, solve the exact
// 2D affine map pixel -> plane from the 3 pairs, then lift a subdivided image grid back onto the sphere.
// Any stretch is real: 3 anchors fix only an affine map. Mirroring is handled by the sign of the determinant.

const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Tangent frame at the mean of three unit vectors: c (center), e (east, increasing RA), n (north). */
export function tangentFrame(s) {
  const c = norm([s[0][0] + s[1][0] + s[2][0], s[0][1] + s[1][1] + s[2][1], s[0][2] + s[1][2] + s[2][2]]);
  let e = cross([0, 0, 1], c);
  if (Math.hypot(...e) < 1e-6) e = [0, 1, 0]; // at a celestial pole any east works
  e = norm(e);
  return { c, e, n: cross(c, e) };
}
/** Solve [u, w] = A * [x, y, 1] from 3 point pairs. Returns {A: [a,b,c,d,e,f], det}. */
export function solveAffine(px, uw) {
  const [p1, p2, p3] = px;
  const det = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
  if (Math.abs(det) < 1e-9) return { A: null, det: 0 };
  const solve = (k) => { // k = 0 for u, 1 for w: value = a x + b y + c
    const v1 = uw[0][k], v2 = uw[1][k], v3 = uw[2][k];
    const a = ((v2 - v1) * (p3[1] - p1[1]) - (v3 - v1) * (p2[1] - p1[1])) / det;
    const b = ((p2[0] - p1[0]) * (v3 - v1) - (p3[0] - p1[0]) * (v2 - v1)) / det;
    return [a, b, v1 - a * p1[0] - b * p1[1]];
  };
  const [a, b, c] = solve(0), [d, e, f] = solve(1);
  return { A: [a, b, c, d, e, f], det: a * e - b * d };
}
/** Build the mapping for one art entry. starVec(i) returns the J2000 unit vector of star index i. */
export function artMapping(art, starVec) {
  const s = art.anchors.map((a) => starVec(a.star));
  const fr = tangentFrame(s);
  const uw = s.map((v) => [dot(v, fr.e) / dot(v, fr.c), dot(v, fr.n) / dot(v, fr.c)]);
  const { A, det } = solveAffine(art.anchors.map((a) => [a.px, a.py]), uw);
  const toSky = (x, y) => {
    const u = A[0] * x + A[1] * y + A[2], w = A[3] * x + A[4] * y + A[5];
    return norm([fr.c[0] + u * fr.e[0] + w * fr.n[0], fr.c[1] + u * fr.e[1] + w * fr.n[1], fr.c[2] + u * fr.e[2] + w * fr.n[2]]);
  };
  return { frame: fr, A, det, toSky };
}
/** Grid mesh (cells x cells) for one art entry: positions (unit vectors), atlas UVs, indices.
 *  UVs use the manifest's uvRect [u0, v0, u1, v1] (three.js flipY = true, so v0 is the BOTTOM edge of the picture);
 *  without uvRect they are derived from atlasRect. */
export function artMesh(art, starVec, atlasSize, cells = 8) {
  const m = artMapping(art, starVec);
  const [W, H] = art.size, [AW, AH] = atlasSize;
  const [u0, v0, u1, v1] = art.uvRect || [art.atlasRect[0] / AW, 1 - (art.atlasRect[1] + art.atlasRect[3]) / AH, (art.atlasRect[0] + art.atlasRect[2]) / AW, 1 - art.atlasRect[1] / AH];
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
    const x = (i / cells) * W, y = (j / cells) * H; // y down from the picture's top edge
    pos.push(...m.toSky(x, y));
    uv.push(u0 + (x / W) * (u1 - u0), v1 - (y / H) * (v1 - v0));
  }
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * (cells + 1) + i, b = a + 1, c = a + cells + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { pos, uv, idx, det: m.det, mapping: m };
}
