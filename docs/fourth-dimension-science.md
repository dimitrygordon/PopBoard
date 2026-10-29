# Beyond 3D module: science reference

Every number, formula and claim the Beyond 3D module (`public/study-fourth-dimension.html`, slug `fourth-dimension`) shows to students, with sources. Math: `public/fourth-dimension/fd-math.js`. Narration (placeholder, Socrates to finalize): `public/fourth-dimension/pages.js`. Tests: `tests/fourth-dimension-math.test.mjs` (`npm run test:fourthdimension`). Everything here is pure geometry; no physical constants.

Status: all claims Cleared by Tesla 2026-10-29.

## Sources

- [ABBOTT] E. A. Abbott, *Flatland: A Romance of Many Dimensions* (1884), public domain. Source of the "flatlander meets a sphere" thought experiment. Our character (Flick, a paper figure) and all wording are original.
- [COXETER] H. S. M. Coxeter, *Regular Polytopes*, 3rd ed., Dover (1973): face counts of the n-cube (measure polytope), 16-cell and 24-cell (Table I); 4D rotations in two orthogonal planes.
- [BANCHOFF] T. F. Banchoff, *Beyond the Third Dimension*, Scientific American Library (1990): shadows (projections) and slices of the hypercube, the hypercube unfolding.
- [MW-HYPERCUBE] Wolfram MathWorld, "Hypercube": number of k-faces of the n-cube is C(n,k) 2^(n−k). https://mathworld.wolfram.com/Hypercube.html
- [MW-24] Wolfram MathWorld, "24-Cell" and "16-Cell": 24 vertices / 96 edges / 96 triangles / 24 octahedral cells; 8 / 24 / 32 / 16. https://mathworld.wolfram.com/24-Cell.html
- [DALI] Salvador Dalí, *Corpus Hypercubus* (1954), Metropolitan Museum of Art: the cross of 8 cubes is a tesseract net.
- [HYPERSPHERE] Any calculus text: the slice of a ball of radius R at distance h from its center is a ball of radius √(R² − h²) (one dimension lower), the same rule in every dimension.

## Claims

| # | Where (page id) | Claim | Formula / code | Source |
|---|---|---|---|---|
| 1 | `point` | A point has zero dimensions (no length, width or height). | — | [COXETER] |
| 2 | `line`, `square`, `cube`, `extrude-4d` | Sweeping an n-cube one edge length in a new perpendicular direction gives an (n+1)-cube. | `hypercube(n)`; extrude scene moves the last coordinate from −1 to −1+2t | [BANCHOFF] |
| 3 | `flatland`, `sphere-visit` | A ball crossing a plane appears to the plane's inhabitant as a point, then a circle that grows and shrinks, then nothing. Circle radius √(R² − z²), R = 1.2. | `sliceRadius(R, h)` | [ABBOTT], [HYPERSPHERE] |
| 4 | `cube-visit`, `slice-cube` | Plane sections of a cube can be triangles, quadrilaterals, pentagons and hexagons. Perpendicular to a main diagonal through the center, the section is a regular hexagon. | `slice(V, F, axis, c)` (each square face crossing the plane gives one edge of the section) | [BANCHOFF]; test "slices" |
| 5 | `shadow`, `shadow-gold` | A point light casts a central (perspective) projection of the cube onto the floor; lengths and angles of the shadow change with orientation. Shadow = convex hull of the 8 projected corners. | `shadowOnFloor(p, L, h)`: p' = L + (p − L)·(L_y − h)/(L_y − p_y); `hull2` | standard projective geometry |
| 6 | `counting`, `recap` | k-faces of the n-cube: C(n,k)·2^(n−k). Corners 2^n (1, 2, 4, 8, 16), edges n·2^(n−1) (0, 1, 4, 12, 32), squares (0, 0, 1, 6, 24), cubes (0, 0, 0, 1, 8). "Each new direction doubles the corners" because the shape is copied and the copies joined. | `cubeFaces(n, k)` | [MW-HYPERCUBE] |
| 7 | `cells` | A tesseract's boundary is made of 8 cubes (cells): for each of the 4 axes, the cells where that coordinate is +1 or −1. | `tesseractCells()` | [COXETER] |
| 8 | `tesseract*` | The "shadow" is a perspective projection 4D→3D with the eye on the w axis at w = d = 3: (x, y, z)·k/(d − w), k = 2. The w = −1 cell looks half the size of the w = +1 cell (ratio (d+1)/(d−1) = 2), which is why one cube appears inside another. | `projectPerspective(p, 3, 2)` | spec tech note; [BANCHOFF] |
| 9 | `tesseract-4d` | 4D rotations act in a plane (XW, YW, ZW, …) rather than about an axis; a rotation in XW leaves y and z unchanged. Rotating 90° in XW swaps the roles of x and w, so the inner cell becomes an outer one ("inside out"); the object is rigid. | `planeRotation(i, j, a)`; tests check RRᵀ = I and det = +1 | [COXETER] |
| 10 | `tesseract-ortho` | With orthographic ("flat light") projection, the unrotated tesseract's 16 corners land on 8 points: it looks like a single cube. | `projectOrtho`; `distinctCount` | test "perspective projection" |
| 11 | `slice-tesseract` | Slicing the axis-aligned tesseract by the hyperplane w = c (|c| < 1) gives a cube of the same size; |c| > 1 gives nothing. | `slice(..., 3, c)`: 8 corners, 12 edges | [BANCHOFF] |
| 12 | `slice-tilted` | Slicing a tilted tesseract gives other solids. Their faces can be triangles, four-sided shapes, pentagons or hexagons, just like the slices of a cube. Slices perpendicular to the long diagonal go tetrahedron, then a triangle-and-hexagon solid, then an octahedron at the center. | `slice` after `rot(XW,0.7)·rot(YW,0.5)·rot(ZW,0.6)` | [BANCHOFF]. Cleared by Tesla 2026-10-29 |
| 13 | `hypersphere` | A 4D ball (radius 1.5) passing through 3D space appears as a ball that grows from a point, reaches radius 1.5, then shrinks and vanishes; radius √(R² − c²). | `sliceRadius` | [HYPERSPHERE] |
| 14 | `net-cube` | A cube unfolds into a cross of 6 squares. | `unfoldCells(3, t)` | standard |
| 15 | `net-tesseract`, `net-tesseract-turn` | A tesseract unfolds into 8 cubes in 3D: a column of 4 with 4 more around the second cube (Dalí's cross). Each side cell turns 90° about its shared square face in a plane containing w; the far cell rides on one of them and turns again. During unfolding the cubes never pass through each other in 4D; any overlap you see is only in the shadow. | `unfoldCells(4, t)`; tests check rigid edges and the cross shape at t = 1 | [DALI], [BANCHOFF]. Cleared by Tesla 2026-10-29 |
| 16 | `sandbox` | 16-cell: 8 vertices, 24 edges, 32 triangles. 24-cell: 24 vertices, 96 edges, 96 triangles; The 24-cell is the only regular shape, in any dimension, with no matching shape in any other dimension. | `cell16()`, `cell24()` (edges = closest vertex pairs, faces = mutually adjacent triples) | [MW-24], [COXETER]. Cleared by Tesla 2026-10-29 |
| 17 | narration, page `extrude-4d` | Here w is a fourth direction of space, not time. Relativity's spacetime is a different idea. | — | Cleared by Tesla 2026-10-29 |

## Display conventions (not claims)

- Shapes use coordinates ±1 (edge 2), scaled for display. Projection d = 3, k = 2.
- Gold marks the tracked face (cube: x = +1) or cell (tesseract: w = −1, the inner cube at the start).
- Floor shadows of the tesseract page are a decorative shadow of the 3D projection from the room's spotlight.
