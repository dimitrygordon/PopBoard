# PopBoard mathematics errata and audit limits

Read-only audit, 2026-11-07, America/New_York (ET). Live entry https://popboard.us/study-geometry.html. Crawled public catalog, all 180 deck.json files, 829 slides, all 12 interactive modules, static figure modules a/b/c, and empty art override manifest. Source snapshots are in /workspace/geometry/live/ and /workspace/geometry/live-*.js. No login, website edit, repository edit, or Drive edit.

This is a source/content audit, not a screenshot review of every rendered page. Exact text quotations below come from public JSON after HTML-to-text conversion; superscripts may be separated by spaces. Code findings quote the public module. Do not interpret lack of a visual finding as visual sign-off. Python urllib returned 403 for deck files, but public curl downloads returned 200 and all JSON parsed successfully.

## Inventory summary

12 units, 180 lesson routes, 829 slides, 44 interactive placements, 138 distinct static figure references. Unit counts: 14,15,14,16,17,16,14,16,15,16,10,17. Course content spans foundations, angles/constructions, motions, congruence, inequalities/parallels, quadrilaterals, area/Pythagoras/coordinates, similarity, right-triangle trig, circles/concurrence, circle measure and solids. Midterm/final pages have only a cover plus a coverage statement. Full route inventory is /workspace/geometry-v2/CURRENT-INVENTORY.md; complete math text snapshot is /workspace/geometry/audit-readable.txt; interactive route map is /workspace/geometry/live-interactive-inventory.json.

## Priorities

P0: false core content. P1: exact-statement errors, incomplete proof, source-convention conflicts or mathematical interactive states requiring correction before reuse. Not every item is a wrong numeric answer.

## E01. P1 precision

Location: u01-l03, page/section 3. Source: https://popboard.us/geometry/decks/u01-l03/deck.json

Exact current text/code:
> Two lines in the same plane either intersect in exactly one point or never meet.

Issue: Coincident lines share infinitely many points. The omitted distinctness contradicts the literal assertion.

Exact replacement or required change: Two distinct lines in the same plane either intersect in exactly one point or never meet.

Jacobs anchor: 1.1 p. 8; 2.5 p. 61.

## E02. P1 precision

Location: u01-l07, page/section 3. Source: https://popboard.us/geometry/decks/u01-l07/deck.json

Exact current text/code:
> through any two points there is exactly one line.

Issue: A repeated point does not determine a unique line.

Exact replacement or required change: Through any two distinct points there is exactly one line.

Jacobs anchor: 2.5 p. 61.

## E03. P1 precision

Location: u02-l01, page/section 3. Source: https://popboard.us/geometry/decks/u02-l01/deck.json

Exact current text/code:
> division (do the same to both sides)

Issue: Division by zero is undefined. The parenthetical includes unrestricted division.

Exact replacement or required change: division by the same nonzero number

Jacobs anchor: 3.1 pp. 78 to 83.

## E04. P1 false wording and order

Location: u02-l12, page/section 3. Source: https://popboard.us/geometry/decks/u02-l12/deck.json

Exact current text/code:
> It works because the radius fits around a circle exactly six times.

Issue: Stepping equal chords is not laying six radius lengths along the curved circumference. Also 60 degrees invokes the later triangle angle sum.

Exact replacement or required change: The radius used as a chord subtends a 60-degree central angle, so six such chords close a regular hexagon. The circumference is 2π radii, not six. At this point label the 60-degree explanation a preview, proved after Unit 5.

Jacobs anchor: 1.4 pp. 24 to 29; 6.5 p. 237.

## E05. P0 false symmetry

Location: u03-l11, page/section 3. Source: https://popboard.us/geometry/decks/u03-l11/deck.json

Exact current text/code:
> The Koch snowflake has the same 3 lines and 120 degree rotational symmetry as the equilateral triangle it grows from.

Issue: Original vertex tips and first-generation outward tips are interchanged by a 60-degree rotation. Saying only 120-degree symmetry omits the extra symmetry and “same 3 lines” is false.

Exact replacement or required change: The initial equilateral triangle has 3 reflection axes and smallest positive rotation 120 degrees. The standard Koch snowflake from stage 1 onward, and in the limit, has 6 reflection axes and smallest positive rotation 60 degrees.

Jacobs anchor: 8.4 pp. 319 to 324; Koch extension is original.

## E06. P1 incomplete proof

Location: u04-l13, page/section 3. Source: https://popboard.us/geometry/decks/u04-l13/deck.json

Exact current text/code:
> so angle APM = angle BPM.

Issue: M has never been introduced. Ray substitution and existence of the intersection need justification.

Exact replacement or required change: First define M=PQ∩AB, with P and Q chosen on opposite sides of AB, and establish M lies between A and B. Then angle APQ=BPQ by SSS; because PM is ray PQ, angle APM=BPM. Continue with SAS as in UNIT04-FILL.md 4.13.

Jacobs anchor: 4.6 pp. 163 to 168; 4.7 pp. 169 to 171.

## E07. P1 underspecified given

Location: u05-l12, page/section 2. Source: https://popboard.us/geometry/decks/u05-l12/deck.json

Exact current text/code:
> Ladder against a wall: why one length and a right angle suffice.

Issue: One length and one right angle leave infinitely many noncongruent right triangles. HL requires hypotenuse and a leg.

Exact replacement or required change: Ladder against a wall: why its length, one leg length and the right angle fix the triangle.

Jacobs anchor: 6.6 p. 244.

## E08. P1 precision

Location: u05-l13, page/section 3. Source: https://popboard.us/geometry/decks/u05-l13/deck.json

Exact current text/code:
> Nonvertical lines are parallel if and only if their slopes are equal.

Issue: Identical lines have equal slopes but are not distinct parallel lines under the course definition. Vertical cases also need explicit coverage. Apply same qualification to course 9.10.

Exact replacement or required change: Two distinct nonvertical lines are parallel if and only if their slopes are equal. Also, two distinct vertical lines are parallel; a vertical and a horizontal line are perpendicular.

Jacobs anchor: 11.6 p. 463.

## E09. P1 source adaptation inconsistency

Location: u06-l06, page/section 3. Source: https://popboard.us/geometry/decks/u06-l06/deck.json

Exact current text/code:
> An isosceles trapezoid has a pair of parallel sides (bases) and equal non-parallel sides (legs).

Issue: Course 6.1 explicitly uses inclusive trapezoid. “Non-parallel sides” then does not define legs for parallelograms. If merely equal legs is used, oblique parallelograms become counterexamples to the claimed base-angle theorem.

Exact replacement or required change: Under this course's inclusive trapezoid convention, define an isosceles trapezoid relative to a chosen base pair by congruent base angles, equivalently reflection symmetry exchanging the base endpoints. Rectangles count; oblique parallelograms do not. Alternatively revert everywhere to Jacobs' exclusive trapezoid convention and retain the equal-leg definition.

Jacobs anchor: 7.5 p. 281 defines trapezoid exclusively.

## E10. P1 notation direction

Location: u08-l05, page/section 3. Source: https://popboard.us/geometry/decks/u08-l05/deck.json

Exact current text/code:
> AB/WX = BC/XY = CD/YZ = DA/ZW = k

Issue: The next answer on this lesson sets k=DE/AB=9/6, reversing the displayed preimage/image convention.

Exact replacement or required change: For a map ABCD to WXYZ with image/preimage scale factor k, use WX/AB=XY/BC=YZ/CD=ZW/DA=k. If using reciprocal ratios, label their common value 1/k.

Jacobs anchor: 10.2 pp. 385 to 391.

## E11. P1 proof dependence

Location: u08-l03, page/section 3. Source: https://popboard.us/geometry/decks/u08-l03/deck.json

Exact current text/code:
> The sides are proportional, giving A'B' = k AB with A'B' parallel to AB.

Issue: The invoked proportional-side similarity result is not yet proved, and the side-splitter proof later depends on these dilation properties. The current acceptance sentence partially signals an assumption, but the preceding “Why” still reads as a proof.

Exact replacement or required change: Explicitly postulate dilation preservation/scaling and line-image properties at this point, or defer their proof until after side-splitter and AA. Do not present proportional sides alone as an already-established similarity argument. Include the collinear O,A,B case separately.

Jacobs anchor: 10.3 p. 393; 10.4 p. 400; 10.5 pp. 407 to 413.

## E12. P1 missing domain

Location: u11-l07, page/section 3. Source: https://popboard.us/geometry/decks/u11-l07/deck.json

Exact current text/code:
> Segment area = sector area minus the area of the triangle formed by the two radii and the chord.

Issue: The unqualified subtraction is wrong for a major segment. For a 270-degree segment of radius 1, correct area is 3π/4+1/2, not 3π/4-1/2.

Exact replacement or required change: For a minor segment with central angle 0≤θ≤180 degrees, area=(θ/360)πr² minus its triangle area. A major segment has area πr² minus the complementary minor-segment area, equivalently major-sector area plus the small triangle area.

Jacobs anchor: 14.6 pp. 605 to 611.

## E13. P1 missing slice qualification

Location: u12-l02, page/section 3. Source: https://popboard.us/geometry/decks/u12-l02/deck.json

Exact current text/code:
> Slicing a cylinder parallel to its base gives a circle; tilting the plane gives an ellipse.

Issue: A vertical plane is tilted relative to the base yet produces a rectangle, not an ellipse. Finite cylinder end clipping also matters.

Exact replacement or required change: A plane perpendicular to a right circular cylinder's axis gives a disk. An oblique, nonaxial plane gives a full elliptical disk only when the intersection is not clipped by either finite end. A plane parallel to the axis through the interior gives a rectangle; tangent/supporting positions can be degenerate.

Jacobs anchor: 15.6 pp. 654 to 661.

## E14. P1 missing solid hypothesis

Location: u12-l08, page/section 3. Source: https://popboard.us/geometry/decks/u12-l08/deck.json

Exact current text/code:
> Cone, πr 2 + πrℓ.

Issue: A general oblique cone has no single constant slant height around its rim. The visual cylinder/cone examples are right solids but text should state that hypothesis.

Exact replacement or required change: For a right circular cone, total surface area is πr²+πrℓ. For a right circular cylinder use 2πr²+2πrh. Do not apply these simple lateral formulas to arbitrary oblique solids.

Jacobs anchor: 15.6 pp. 654 to 661.

## E15. P1 convexity needed

Location: u12-l11, page/section 3. Source: https://popboard.us/geometry/decks/u12-l11/deck.json

Exact current text/code:
> A regular polyhedron has congruent regular polygon faces with the same number meeting at each vertex. There are exactly five

Issue: Without convexity, regular star polyhedra invalidate the literal five-only claim. Keep Euler and angle-deficit arguments explicitly convex.

Exact replacement or required change: A convex regular polyhedron has congruent regular polygon faces with the same number meeting at each vertex. There are exactly five convex regular polyhedra

Jacobs anchor: 15.9 pp. 677 to 682.

## E16. P1 arc qualification

Location: u12-l14, page/section 3. Source: https://popboard.us/geometry/decks/u12-l14/deck.json

Exact current text/code:
> They give the shortest path between two points along the surface.

Issue: Longer arcs around the same great circle are not shortest, and antipodal points break uniqueness.

Exact replacement or required change: For two distinct nonantipodal points on a sphere, the shorter great-circle arc is the unique shortest surface path. Antipodal points have infinitely many shortest semicircles. A whole great circle is not itself a shortest path.

Jacobs anchor: 16.1 pp. 690 to 695.

## E17. P1 model qualification

Location: u12-l14, page/section 3. Source: https://popboard.us/geometry/decks/u12-l14/deck.json

Exact current text/code:
> On a sphere every triangle's angles add to more than 180 degrees

Issue: “Every triangle” must exclude degenerate, self-intersecting and major-region conventions. The parallel postulate is not the only planar axiom that changes in the sphere model.

Exact replacement or required change: For a nondegenerate convex spherical triangle bounded by shorter great-circle arcs, the angle sum exceeds 180 degrees. A sphere model also differs from Euclidean incidence: antipodal points lie on infinitely many great circles.

Jacobs anchor: 16.1 pp. 690 to 695; 16.3 pp. 702 to 706.

## E18. P1 false exact interactive claim

Location: gx/u10.js, page/section inscribed. Source: https://popboard.us/geometry/gx/u10.js

Exact current text/code:
> Math.abs(arc - 180) < 1.5

Issue: At arc=179 degrees the current code appends “AB is a diameter, so the angle is 90°.” The true angle is 89.5 degrees. Rounded integer formatting does not make the chord a diameter.

Exact replacement or required change: Use a scale-relative numerical equality test for an exact diameter, or say “nearly a diameter, so nearly 90 degrees.” The display must not assert exact diameter from a 1.5-degree tolerance.

Jacobs anchor: 12.4 p. 505.

## E19. P1 wrong regime interactive

Location: gx/u10.js, page/section secant. Source: https://popboard.us/geometry/gx/u10.js

Exact current text/code:
> Math.abs(d - r) < 12

Issue: A vertex at distance r+6 is outside but is currently labeled on, and the inscribed-angle formula is substituted for an exterior secant formula. The arc formula and measured angle can disagree.

Exact replacement or required change: Constrain the vertex to the circle for an explicit On mode. Classify free-drag inside/outside by the true signed radius difference, except tiny scale-relative numerical tolerance. Require a separate tangent construction or limiting demonstration.

Jacobs anchor: 12.4 p. 505;12.5 p. 511.

## E20. P1 star domain interactive

Location: gx/u06.js, page/section pentagon. Source: https://popboard.us/geometry/gx/u06.js

Exact current text/code:
> min: 1, max: 5, value: sk

Issue: At n=5,k=5 every edge joins a vertex to itself. At n=6,k=3 the diagram is three diameters, not a six-pointed simple star circuit. Also qualify the static 6.10 vertex-angle formula by 1≤k<n/2 and single circuit gcd(n,k)=1.

Exact replacement or required change: Restrict 1≤k<n/2. If gcd(n,k)>1 describe a compound of gcd(n,k) cycles, not one n-pointed star; otherwise normalize traversal to the equivalent smaller skip.

Jacobs anchor: 14.1 pp. 572 to 578; star extension original.

## Additional dependency and specification corrections, not counted as confirmed false text

- Course 2.12 uses equilateral 60-degree angles before 5.10. Course 3.9/3.11 uses regular-polygon angles and tessellation classification early. Mark previews explicitly or postpone numeric angle proofs.
- Early 4.11 check answer uses sin 30 degrees before trigonometry. Use the tangent-circle/perpendicular-foot explanation, with numeric verification deferred. The number 5 is correct.
- Early slope use is admitted as computational in the plan, which conflicts with the blanket no-unproved-results rule. Explicitly postulate a provisional coordinate rule or defer proof-dependent uses.
- The live 4.10 SSS paragraph needs three diagrams for sum/difference/endpoint cases. Its result is correct.
- The 5.2 exterior-angle paragraph proves only the comparison with angle A and leaves the other remote angle implicit. Add the corresponding second construction.
- The 7.7 acute/obtuse Pythagorean comparisons are correct but their justifications are missing. Supply an altitude comparison or defer the comparison proof to cosine law; do not cite the right-triangle converse alone as proof of both inequalities.
- Finite wedge rearrangement in 11.5 is suggestive, not exactly a parallelogram. The text also provides a polygon-limit argument; retain it and state the limiting-area assumption.
- The static cross-section classifier in gx/u12.js labels equal-sided quadrilaterals square and equal-sided hexagons regular without checking angles. Current preset normals happen to avoid the general rhombus/equiangular failure, but this predicate is unsafe if arbitrary slicing directions are added. Test side equality AND angles before assigning regularity.
- “Napoleon's theorem” is not a concurrence theorem. Change the 10.14 target to an equilateral-center-triangle result. Its standard outward construction is valid; do not claim dragging proves it.
- libs/liberties assertions about transformed code were not accepted as evidence of correctness. In particular pentagon AN computed from the midpoint construction does have the correct side length, r·sqrt((5-sqrt(5))/2), verified independently; its construction ordering still previews later proof tools in Unit 6.

## Top 10 mathematical expansion gaps

1. Explicit axiom ledger for the transformation-first congruence foundation.
2. Full labeled SAS/ASA/isosceles/SSS proofs with all nondegenerate cases.
3. A worked-solution practice bank, rather than one short check per regular lesson.
4. Actual midterm/final mathematics; existing pages only say what is covered.
5. Consistent quadrilateral conventions, especially inclusive trapezoid and isosceles tests.
6. Independent dilation foundation or Jacobs area → side-splitter → AA order, with no hidden cycle.
7. Complete circle-theorem hypotheses, tangent boundary cases and major-segment formulas.
8. Missing Jacobs 13.5 Ceva, with a proof and oriented/inside-domain ratio convention.
9. Solid-geometry assumptions and volume proofs, separating right/oblique solids and equal-height slice conditions.
10. Jacobs 16.2 to 16.4 neutral/hyperbolic comparison so the angle-sum dependence on parallel assumptions is explained rather than a one-page sphere teaser.

## Acceptance for every correction

Update both body and HTML duplicates in each deck record and all reused review/quiz copies. Add invariant tests using underlying unrounded quantities. Separate exact from approximate labels. Reject coincident points and zero-area configurations instead of reporting a theorem value. Every diagram must contain all named points, put right-angle markers at genuinely perpendicular joins, and preserve the stated correspondence. Pixel tolerance may support a UI decision but must not turn near-equality into an exact mathematical assertion.
