# Unit 4: current figure commission from the final spec

Student wording: Socrates. Math: Euclid. Build: PR 170. No builder text or coordinate certificates should be drawn as learner labels. All art is editable SVG, black strokes on white, live labels, separate given and conclusion layers.

Source SHA-256: 90a17907ad0020d3bba6a752c25d314ad37d0021f8c23db6e853d92a38a5571c

Figure slots exist on every worked-example, practice, check and common-mistake screen. Slots without a supplied SVG are omitted from the student DOM until art arrives; text uses the full width. See PLACEHOLDER-SLIDES.md for the missing-art inventory. Fill each planned slot with its own correct givens, not a reused diagram with different letters.

## 4.1

Slots: get-started / big-idea art; List the six matching parts (adapted from Jacobs p. 140)., Use a match to find x.; common mistake; 3 practice figures; check-yourself.

Two scalene triangles with six explicit names. Use A=(0,0),B=(5,0),C=(1,2) and E=(9,1),F=(9,6),D=(7,2) (R2-4: A=(0,0), B=(5,0), C=(1,2); E=(9,1), F=(9,6), D=(7,2). Squared sides 25, 5, 20.) [Sign-off patch R2], a rotated translated copy. One/two/three ticks on corresponding sides, with labels outside triangles.

## 4.2

Slots: get-started / big-idea art; Flashlight beams (informal, adapted from the airplane example on Jacobs p. 146)., Same angles, different size (original counterexample).; common mistake; 3 practice figures; check-yourself.

Aircraft as horizontal segment NT with two downward inward light rays to W, endpoint arcs only. Second SVG: equilateral triangles of side 2 and 5 drawn at the same scale. Sandbox labels SSS/SAS/ASA as pending until proved; SSA and AAA as counterexample tasks.

## 4.3

Slots: get-started / big-idea art; Why SAS works (based on the SAS picture, Jacobs p. 147)., A midpoint proof.; common mistake; 3 practice figures; check-yourself.

For W1 use AB=6,AC=9, included angle 40 degrees and a rotated/reflected copy; three motion frames, mirror DE dashed. W2 intersecting segments AD,BC at M with midpoint ticks and vertical-angle arcs. Preserve distinct vertices.

## 4.4

Slots: get-started / big-idea art; Why ASA works (based on the ASA picture, Jacobs p. 147)., Two triangles sharing a side.; common mistake; 3 practice figures; check-yourself.

Corrected coordinates (Euclid, U4-FIGURE-COORDS.md): A=(0,0), B=(18.3051,0), C=(6.1017,9.1526), D=(12.2034,-9.1526); CA=DB=11. Practice 3, u04-l04-s10, states DB=11. Do not reuse the unscaled shared-side model whose CA=DB=sqrt(13). Ready to draw. The slot stays omitted from the student DOM until the SVG lands.

Two triangles on opposite sides of shared horizontal AB, with C above and D below. Use C=(2,3),D=(4,-3),A=(0,0),B=(6,0). Mark C angle at A matching D angle at B, and vice versa.

## 4.5

Slots: get-started / big-idea art; SAS proof with a shared midpoint (original, in the style of Jacobs 4.4)., ASA proof with angle bisectors (original).; common mistake; 3 practice figures; check-yourself.

W1 crossing lines with A,M,B collinear and C,M,D collinear. W2 lens-shaped quadrilateral A,C,B,D with diagonal AB and separate angle-bisector arc sets; no equal-side conclusion marks until reveal.

## 4.6

Slots: get-started / big-idea art; SAS, then CPCTC (original)., Two equations from one congruence (original).; common mistake; 3 practice figures; check-yourself.

W1 B=(0,0),D=(5,0),A=(2,3),C=(2,-3); AB,CB ticks and ABD,CBD arcs. AD,CD ticks appear only in the answer layer. W2 two scalene corresponding triangles with expressions as live text.

## 4.7

Slots: get-started / big-idea art; Proof of Theorem 9 (adapted from Jacobs p. 158)., Find the base angles.; common mistake; 3 practice figures; check-yourself.

Corrected coordinates (Euclid, U4-FIGURE-COORDS.md): A=(0,2.3439), B=(-3,0), C=(3,0); base angles 38 degrees, apex 104. Worked example 2, u04-l07-s05, solves both base angles as 38 degrees. Do not reuse the rotated 3-4-5 model, whose base angles are about 53.13 degrees. Ready to draw. The slot stays omitted from the student DOM until the SVG lands.

Proof SVG is isosceles ABC with A=(0,4),B=(-3,0),C=(3,0),D=(0,0). W2 rotate the figure 90 degrees so base is vertical; retain leg ticks and expression labels at B,C.

## 4.8

Slots: get-started / big-idea art; Proof of Theorem 10 (adapted from Jacobs p. 159)., Equal angles give equal sides (original).; common mistake; 3 practice figures; check-yourself.

One triangle with arrows showing correspondence ABC↔ACB, side BC common. Second SVG equiangular triangle with three equal-angle marks and side expressions. Do not mark 60 degrees.

## 4.9

One independent inline figure per bank item, with prompt givens only. Solutions and second checks are separate reveals.

item 1: Two separated scalene triangles JKL and VUW. Use J=(0,0), K=(6,0), L=(2,4); V=(12,1), U=(12,7), W=(8,3). Display the congruence statement, not answer arrows.

item 2: Draw NOP with N=(0,0), P=(37,0), O=(12,16), and a rotated congruent ZYX copy. Label NP with the expression and ZX with 37.

item 3: Construct RST from RS=7, RT=11, included angle 46 degrees and a rotated/reflected XYZ copy. Mark two side pairs and the included angle only.

item 4: Use base FG=9 with inward angles 52 at F and 61 at G; intersect the rays at E. Draw a congruent rotated LMN copy with matching endpoint arcs.

item 5: H=(0,0), P=(-6,0), R=(6,0), Q=(6,8), S=(-6,-8). Draw both crossing segments, midpoint ticks and givens 6,10. No conclusion marks.

item 6: U=(0,0), W=(35,0), V=(13,12), with a translated rotated KML copy. Label corresponding UW and KL only.

item 7: Isosceles triangle with base EF horizontal, E=(-1,0), F=(1,0), D=(0,tan(46 degrees)). Mark DE=DF; label base-angle expressions.

item 8: J=(0,40), L=(-9,0), K=(9,0). Mark only the two base angles equal and label the leg expressions. The 9,40 coordinates remain builder-only.

item 9: Draw BCD on base CD=4 with endpoint angles C=67,D=82; draw a separate 2.5-times enlarged RST copy. Label the corresponding angles as GIVEN, not derived from the equilateral theorem.

item 10: C=(0,0), D=(8,0), A=(3,4), B=(3,-4). Mark AC=BC and the two angle arcs at C. Withhold AD=BD marks until reveal.

## 4.10

Slots: get-started / big-idea art; Day 1. Proof of SSS, interior case (adapted from Theorem 11, Jacobs p. 164)., Day 2. The exterior and endpoint cases (same setup as Day 1, rows 1 to 5).; common mistake; 2 practice figures; check-yourself.

Day 1: interior only. Day 2: exterior plus endpoint, including the A/B and D/E representative relabeling. Do not reveal SSS as a postulate.

Three proof SVG panels with A=(-2,0),B=(2,0),C=(t,h),G=(t,-h),h>0: t=0 interior, t=4 exterior, t=2 endpoint. AC=AG,BC=BG. CG is vertical and meets AB or its extension at x=t. Representative-case rule (R2-2): The exterior intersection can be past A or past B, and the endpoint can be A or B. It is enough to show the past-B and through-B versions: the other versions follow by exchanging A with B and, in the matching target triangle, D with E. All side correspondences and SAS steps stay matched under that exchange. [Sign-off patch R2] W2 kite with A=(0,4),B=(-3,0),C=(0,-2),D=(3,0).

## 4.11

Slots: get-started / big-idea art; Swinging door: one SSA recipe, two triangles., Bigger doesn't fix it.; common mistake; 3 practice figures; check-yourself.

PR170 Euclid re-review R2: Worked example 2 uses A=(0,0), B=(8,6), C1=(6,0), C2=(10,0), AB=10, AC1=6, AC2=10, with the common circle centered at B. Round 5 caption: Not to scale. Both examples are fitted to the same screen bounds. U4-13 common-mistake figure (u04-l11-s07) is Leo's delivered SVG, wired as public/geometry/figures/u04/u04-l11-s07.svg. Construction (staff only, not printed): A=(0,0), B=(8,6), circle centered at B through (6,0) has radius squared 40 and meets the ray at x=6 and x=10. In the SVG, AB=10 and BC1=BC2=sqrt(40) in its own coordinates, both C points lie on the ray, and no coordinates or numbers are on screen. This is not the old tangent case (A=(0,0), B=(4,3), C=(4,0)).

Use A=(0,0),B=(4,3),C1=(3,0),C2=(5,0), uniform scale. Draw full radius-sqrt(10) circle at B, label two intersections distinctly, angle arc at A shared. For W2 draw doubled copy at same screen scale or label scale factor. Reject tangent/no-intersection cases if UI says two triangles.

## 4.12

Slots: get-started / big-idea art; Copy a triangle by SSS (adapted from Construction 5, Jacobs p. 171)., Copy a triangle by SAS (adapted from Constructions 3 and 4, Jacobs p. 170).; common mistake; 3 practice figures; check-yourself.

D=(0,0),E=(5,0), circles radii 4 and 3; F=(3.2,2.4), other intersection (3.2,-2.4). Dashed unused reflected solution. Stage diagrams keep center labels and radius connections. W2 copy a 40-degree included angle without a protractor icon.

## 4.13

Slots: get-started / big-idea art; The angle bisector construction (adapted from Jacobs p. 171)., Optional extension: the perpendicular bisector construction, proved in three stages.; common mistake; 3 practice figures; check-yourself.

A=(-5,0),B=(5,0), radius 6, P=(0,sqrt(11)),Q=(0,-sqrt(11)),M=(0,0). Add M label before any proof mentions it. W2 rays at 0 and 70 degrees, U,V at radius 4, choose X on interior angle bisector farther than O. Wrong-case SVG uses tangent circles with just one crossing.

## 4.14

Slots: get-started / big-idea art; Diagonal of a quadrilateral, by SSS (original)., Vertical angles only (original)., The kite.; common mistake; 4 practice figures; check-yourself.

Include the convex kite moved from 4.10. Review bank is launched here, not a separate class day.

Corrected coordinates (Euclid, U4-FIGURE-COORDS.md): kite A=(0,8.8), B=(-6.6,0), C=(0,-4.4), D=(6.6,0); AB=AD=11, CB=CD=7.932. Practice 4, u04-l14-s12, states AD=11. Do not reuse the unscaled kite with AB=AD=5. Ready to draw. The slot stays omitted from the student DOM until the SVG lands.

W1 draw convex quadrilateral with unequal adjacent sides, opposite-side tick pairs and AC diagonal. W2 crossing lines with A,O,B collinear and C,O,D collinear, opposite angles labeled 3x+4 and 5x-20.

## 4.15

One independent inline figure per bank item, with prompt givens only. Solutions and second checks are separate reveals.

Use the named lesson diagram per item. Item 16 must have its own inline SSA figure with ray AC2, C1/C2, circle centered B, equal-radius ticks, AB=5, AC1=3, AC2=5 on separate dimension brackets, and angle A. No coordinate or radical labels.

## 4.16

One independent inline figure per bank item, with prompt givens only. Solutions and second checks are separate reveals.

Form A item 1: Two separated scalene triangles, model coordinates T=(0,0), U=(7,0), V=(2,5); H=(15,2), J=(15,9), K=(10,4). Show the given congruence statement; do not draw answer arrows.

Form A item 2: L=(0,0), M=(57,0), N=(18,24), with a rotated CBA copy. Expression on LM, 57 on CB.

Form A item 3: Construct HIJ from base HI=8, HJ=13, included angle 37; a rotated RST copy. Two distinct side-tick sets and included-angle arcs only.

Form A item 4: Base VW=12, inward rays 48 at V and 73 at W meet at U. Draw a congruent rotated DFE copy with the same endpoint arcs.

Form A item 5: O=(0,0), J=(-4,0), K=(4,0), L=(0,9), N=(0,-9). Draw both full segments and midpoint ticks. Do not add right-angle marks as givens.

Form A item 6: Use scalene FGH with angle G=50 and a rotated UTS copy. Put the expression at G and 50 at T, no variable at a different vertex.

Form A item 7: Q=(-1,0), R=(1,0), P=(0,tan(34 degrees)). Turn the whole figure sideways; keep leg ticks and angle expressions at Q,R.

Form A item 8: X=(-2,0), W=(2,0), V=(0,sqrt(2112)). Label only base-angle equality and leg expressions. The height is builder-only.

Form A item 9: Draw base AB=6, angle A=42, angle B=58; rays meet at C. Draw UVW enlarged by 2.5. Label all stated angles as givens and UV=15.

Form A item 10: K=(0,5), L=(-4,0), M=(0,-6), N=(4,0). Draw diagonal KM dashed and the two given side-tick classes. Do not mark equal angles before the last reveal.

Form A item 11: Use those coordinates; show both complete circles, centers, G,H, radii 10 and EF=14. A separate tangent thumbnail for radius 7. Never expose square-root coordinates to students.

Form A item 12: MANDATORY inline figure: O=(0,0), P=(6,8), Q1=(2,0), Q2=(10,0), ray OQ2, circle centered P radius sqrt(80). Draw both PQ segments with equal-radius ticks. Label OP=10, OQ1=2, OQ2=10 on dimension brackets. Show common angle arc at O. Do not print coordinates or radical.

Form B item 1: Two separated scalene triangles, model coordinates W=(0,0), X=(8,0), Y=(3,6); Q=(18,2), P=(18,10), R=(12,5). Show the given congruence statement; do not draw answer arrows.

Form B item 2: E=(0,0), G=(71,0), F=(23,30), with a reflected RQP copy. Expression on EG, 71 on RP.

Form B item 3: Construct KLM with KL=9, KM=14, included angle 43; a reflected VWZ copy. Mark only the stated equalities.

Form B item 4: Base OP=15, endpoint inward angles 56 and 64 meet at N. Draw a congruent reflected LSR copy.

Form B item 5: Z=(0,0), A=(-7,0), C=(7,0), B=(7.2,9.6), D=(-7.2,-9.6). Draw both segments, ticks and lengths.

Form B item 6: Use scalene JMN with angle N=76 and a reflected VUW copy. Label only the corresponding requested angles.

Form B item 7: T=(-1,0), U=(1,0), S=(0,tan(41 degrees)). Rotate to put the base on a slant; mark only equal legs.

Form B item 8: I=(-3,0), K=(3,0), H=(0,sqrt(5920)). Base-angle marks are givens; side ticks appear only on reveal.

Form B item 9: Draw base DE=8 with angle D=36, E=63; a separate 2.5-times enlarged LMN copy. Angle labels are givens.

Form B item 10: R=(0,6), S=(-5,0), T=(0,-3), U=(5,0). Dashed RT, two different given-side tick classes, no conclusion arcs in prompt.

Form B item 11: Draw those two circles, centers, J,K, radius labels 12 and GH=18. Separate tangent thumbnail for radius 9. All coordinates builder-only.

Form B item 12: MANDATORY inline figure: L=(0,0), M=(8,15), N1=(5,0), N2=(11,0), ray LN2, circle centered M radius sqrt(234). Draw equal-radius ticks on MN1,MN2 and common angle arc at L. Dimension labels LM=17, LN1=5, LN2=11. Coordinates and radical are builder-only.

Forms A and B both have 12 new items. Both item-12 SSA figures are mandatory inline, including on printed learner forms; no lesson navigation dependency.
