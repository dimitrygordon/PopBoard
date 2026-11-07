# Unit 4 math fill

Status: all mathematical slots supplied for the 16 pilot lessons. This is content for merging, not a sign-off on an implementation. No files in geometry-v2 were changed.

## Merge contract

Headings match SPEC-unit04.md. Within each heading, Worked example 1 replaces slide 4, Worked example 2 replaces slide 5, and Practice replaces slide 8. Quiz/review/assessment headings replace their whole pending item bank. All examples marked original are original aligned problems, not claimed reproductions of a Jacobs exercise. Conceptual adaptations cite the actual source page. Many Jacobs sections have no labeled worked example; the source-type exception is explicit rather than inventing one. Printed pages are used; PDF page = printed page + 20.

All figures: editable SVG, black strokes on white, labels as live text, solid given edges, thin dashed construction lines, distinct tick counts for distinct equal-length classes. Do not draw equality or a right angle before it is given or proved. Coordinates below are model coordinates, not necessarily learner-visible. No narration.

## Corrections to Socrates Unit 4 text

1. In 4.1 misconception, replace figure notation `ABC = FED vs ABC = DEF` with `triangle ABC ≅ triangle FED vs triangle ABC ≅ triangle DEF`; use `=` only for lengths or measures.
2. In 4.3/4.4 replace “follows from the definition of congruence” by “follows from the rigid-motion existence and preservation assumptions and the definition of congruence.” A definition alone proves no existence.
3. In 4.2 describe SSS as conjectured, not established until 4.10; ASA/SAS are established next.
4. In 4.10 qualify “SSS is a postulate” misconception as “SSS is a postulate in this course.” Other valid axiom systems do postulate it.
5. Do not force “first worked example” when the book has no labeled worked example. Use cited conceptual adaptations or original aligned items, as labeled here.
6. Use text labels, not the color-coded proof reference retained at 4.5, to meet black-and-white requirements.
7. In 4.7/4.8 withhold numeric 60-degree and 180-degree deductions until 5.10.
8. In 4.13 keep construction verification distinct from measurement. Define M before using it; see the proof below.
9. A universal 9-to-10-slide cap is incompatible with individually legible full solutions for 3-to-5 practice items and two examples on small screens. Permit subpages/reveals rather than dropping proof steps.

## 4.1 Corresponding Parts

Source: Jacobs 4.2, pp. 139 to 141.

### Precise mathematical content
ABC≅EFD means A↔E, B↔F, C↔D. Figures are congruent; their lengths and angle measures are equal. Correspondence is part of the assertion.

### Worked example 1
Adapted from the first congruence-correspondence illustration, p. 140. Given ABC≅EFD, list every corresponding part. Read positions: A↔E,B↔F,C↔D. Thus AB=EF,BC=FD,AC=ED and angle A≅E, angle B≅F, angle C≅D. All six follow from the meaning of congruence, not visual position.

### Worked example 2
Original numeric application. ABC≅PQR, AB=2x+1,PQ=9,BC=7,PR=10. First correspondence gives AB=PQ, so 2x+1=9,2x=8,x=4. The other side matches give QR=7 and AC=10. No equation relates BC to PR.

### Practice with full solutions and independent checks
1. ABC≅XYZ, BC=12. Find YZ. Correspondence B↔Y,C↔Z gives BC=YZ=12. Second check: inverse correspondence maps YZ back to BC.
2. PQR≅LMN, angle Q=37 degrees. Find angle M. Q↔M, so mM=37. Second check: the middle positions agree in both ordered lists.
3. ABC≅DEF, AC=3x-2,DF=13. Find x. AC=DF, so 3x-2=13,3x=15,x=5. Second check: 3(5)-2=13.

### Diagram specifications
Two scalene triangles with six explicit names. Use A=(0,0),B=(5,0),C=(1,3) and E=(9,1),F=(9,6),D=(6,2), a rotated translated copy. One/two/three ticks on corresponding sides, with labels outside triangles.

### Common-mistake correction
Writing ABC=FED is not a harmless reordering. Use ABC≅DEF only when its matching is correct; use = only for lengths/measures.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.2 How Little Information Is Enough?

Source: Jacobs 4.3, pp. 146 to 148; SSS is proved in 4.6, p. 164.

### Precise mathematical content
Treat the three-part tests as conjectures here. Establish SAS and ASA in 4.3/4.4 and SSS in 4.10. Do not silently assume SSS while proving SAS.

### Worked example 1
Adapted from the two-beam aircraft example, p. 146. A fixed segment NT and fixed inward rays at N,T meet at W. Compare a second construction with equal NT and the same endpoint angles. Align both copies of NT. Their corresponding rays coincide because the endpoint angles and chosen half-plane agree. Their intersection W is unique because two distinct lines cannot meet twice. Thus the three inputs determine the triangle up to rigid motion.

### Worked example 2
Original AAA counterexample. Make two equilateral triangles with sides 2 and 5. Within each, the isosceles theorem will imply all three angles equal, so corresponding angles match. Their side lengths differ, so they cannot be congruent because rigid motions preserve distance. No 60-degree or triangle-sum argument is needed.

### Practice with full solutions and independent checks
1. Included angle between AB and AC? angle BAC. Reason: both sides have common endpoint A. Second check: A is the middle angle letter.
2. Included side between angles A and B? AB. Reason: its endpoints are the angle vertices. Second check: AC would instead include angles A and C.
3. Does AAA fix size? No. The side-2 and side-5 equilateral examples have matching angles and different lengths. Second check: any rigid image preserves a side of length 2, not 5.

### Diagram specifications
Aircraft as horizontal segment NT with two downward inward light rays to W, endpoint arcs only. Second SVG: equilateral triangles of side 2 and 5 drawn at the same scale. Sandbox labels SSS/SAS/ASA as pending until proved; SSA and AAA as counterexample tasks.

### Common-mistake correction
Three arbitrary matching parts are not enough. The part positions matter, and AAA omits a length.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.3 SAS from Rigid Motions

Source: Jacobs 4.3, p. 147, Postulate 6; motion proof is an explicit course adaptation.

### Precise mathematical content
SAS: AB=DE,AC=DF and angle BAC≅EDF imply ABC≅DEF, for nondegenerate triangles. Unit 3 must supply independent rigid-motion existence and preservation axioms.

### Worked example 1
Adaptation of the SAS configuration, p. 147. Translate A onto D. Rotate so ray AB maps to ray DE. AB=DE puts B at E. If needed, reflect in DE so C and F lie in the same half-plane. The equal included angles force ray AC onto ray DF, and AC=DF puts C at F. Thus a composition of allowed isometries maps ABC onto DEF. Neither SSS nor triangle-angle sum was used.

### Worked example 2
Original application. M is midpoint of AD and BC, with A,M,D and B,M,C collinear. Then AM=DM and BM=CM by midpoint. angle AMB≅DMC by vertical angles. Thus AMB≅DMC by SAS, and AB=DC. This is valid before parallel-line theorems.

### Practice with full solutions and independent checks
1. AB=DE=6,AC=DF=9 and angle A=angle D=40 degrees. Are triangles congruent? Yes, SAS, because the angle is included. Second check: the motion sequence above fixes all vertices.
2. Same side equalities but angle B=angle E: may cite SAS? No. B is not between AB and AC. Second check: those sides share A, not B.
3. In the midpoint example AM=3x+1,DM=10. Find x. 3x+1=10 gives x=3. Second check: 3(3)+1=10.

### Diagram specifications
For W1 use AB=6,AC=9, included angle 40 degrees and a rotated/reflected copy; three motion frames, mirror DE dashed. W2 intersecting segments AD,BC at M with midpoint ticks and vertical-angle arcs. Preserve distinct vertices.

### Common-mistake correction
A student labels angle B as the included angle for sides AB,AC. Correct to angle BAC. Included means at their common endpoint.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.4 ASA from Rigid Motions

Source: Jacobs 4.3, p. 147, Postulate 5; motion proof is an explicit course adaptation.

### Precise mathematical content
ASA: angles A,D and B,E match and included sides AB,DE match. The nondegenerate triangles then are congruent.

### Worked example 1
Adaptation of the ASA configuration, p. 147. Map segment AB onto DE by translation and rotation. Reflect across DE if necessary to put third vertices in the same open half-plane. Matching endpoint angles place the third vertex on both rays DF and EF. These rays lie on distinct lines and their common point is F. Hence C maps to F, proving congruence without SSS or angle sum.

### Worked example 2
Original overlapping proof. C and D lie on opposite sides of AB. Given angle CAB≅DBA and angle CBA≅DAB, compare CAB and DBA. Shared AB=BA is the included side between the marked angles. Thus CAB≅DBA by ASA and CA=DB,CB=DA by CPCTC.

### Practice with full solutions and independent checks
1. Angles A=30,B=70 and included side AB=8 match D=30,E=70,DE=8. Criterion? ASA. Second check: AB and DE each join the marked-angle vertices.
2. Angles A,B match D,E, but side AC matches DF. Is that ASA as stated? No, the side is not included; it is AAS, proved later. Second check: included side for A,B is AB.
3. In W2 CA=2x+3,DB=11. Find x. ASA gives CA=DB, hence 2x+3=11,x=4. Second check: 2(4)+3=11.

### Diagram specifications
Two triangles on opposite sides of shared horizontal AB, with C above and D below. Use C=(2,3),D=(4,-3),A=(0,0),B=(6,0). Mark C angle at A matching D angle at B, and vice versa.

### Common-mistake correction
ASA and AAS have different given-side positions. Both later yield congruence, but citing a result not yet established breaks the proof order.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.5 Congruence Proofs

Source: Jacobs 4.4, pp. 151 to 156; original applications of its proof format.

### Precise mathematical content
Unpack givens, find missing equal parts, cite SAS or ASA, then CPCTC. Never assume the desired conclusion.

### Worked example 1
Original SAS proof in the style of Jacobs 4.4. AB and CD cross at M, M midpoint of AB and CD. AM=BM and CM=DM (midpoint); angle AMC=BMD (vertical). Thus AMC≅BMD (SAS). Therefore AC=BD and angle ACM=BDM (CPCTC). Correspondence A↔B,M↔M,C↔D is explicit.

### Worked example 2
Original ASA proof. AB bisects both angle CAD and angle CBD, with C,D on opposite sides of AB. Thus angle CAB=DAB and CBA=DBA (bisectors). AB=AB (reflexive). CAB≅DAB by ASA. Hence AC=AD and BC=BD (CPCTC). No kite theorem is being assumed.

### Practice with full solutions and independent checks
1. W1 AM=7,CM=4: BM,DM? 7,4 by midpoint. Second check: full AB=14 and CD=8 each split equally.
2. W1 AC=3x-1,BD=14: find x. Congruence gives 3x-1=14,so x=5. Second check: 15-1=14.
3. W2 may AC=AD be used as the initial reason? No, it is the goal. Use two bisected-angle pairs and AB first. Second check: deleting the proposed conclusion leaves ASA premises sufficient.

### Diagram specifications
W1 crossing lines with A,M,B collinear and C,M,D collinear. W2 lens-shaped quadrilateral A,C,B,D with diagonal AB and separate angle-bisector arc sets; no equal-side conclusion marks until reveal.

### Common-mistake correction
If a proof cites AC=AD to establish the triangles whose congruence would prove AC=AD, delete that circular line and use givens instead.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.6 CPCTC

Source: Jacobs 4.4, pp. 151 to 156; definition of congruence p. 140.

### Precise mathematical content
CPCTC expands to corresponding parts of congruent triangles are congruent. It is a consequence of established congruence, not a congruence criterion.

### Worked example 1
Original SAS-to-CPCTC example. Given AB=CB and angle ABD=CBD. BD=BD by reflexivity. Thus ABD≅CBD by SAS. A↔C,B↔B,D↔D, so AD=CD by CPCTC. The marked angle must be at B, between AB and BD, not at A.

### Worked example 2
Original numeric consequence. Given ABC≅DEF, BC=4x-3,EF=13 and angle A=(2y+5) degrees,angle D=35 degrees. CPCTC gives 4x-3=13,x=4 and 2y+5=35,y=15. Thus BC=13 and angle A=35 degrees.

### Practice with full solutions and independent checks
1. In W1 which side matches AD? CD by A↔C,D↔D. Second check: read ABD and CBD position by position.
2. ABC≅RST, AC=8: RT? 8 by CPCTC. Second check: first-third vertices correspond.
3. ABC≅DEF,AB=5x+2,DE=22: x? 4. Solve 5x=20. Second check: 5(4)+2=22.

### Diagram specifications
W1 B=(0,0),D=(5,0),A=(2,3),C=(2,-3); AB,CB ticks and ABD,CBD arcs. AD,CD ticks appear only in the answer layer. W2 two scalene corresponding triangles with expressions as live text.

### Common-mistake correction
CPCTC cannot be placed above the line establishing triangle congruence.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.7 Isosceles Triangle Theorem

Source: Jacobs 4.5, p. 158, Theorem 9.

### Precise mathematical content
If AB=AC then angle ABC≅BCA. Isosceles includes equilateral. The base is the side opposite the selected equal-leg vertex, regardless of page orientation.

### Worked example 1
Adapted proof of Theorem 9, p. 158, using an angle bisector. In ABC with AB=AC, let AD bisect angle A and meet BC at D. AB=AC (given),BAD=CAD (bisector),AD=AD (reflexive). ABD≅ACD by SAS. Therefore B=C by CPCTC. Existence of the bisector ray comes from protractor postulate; its meeting BC uses ordinary triangle interior incidence.

### Worked example 2
Original algebra application. AB=AC,angle B=(3x+5) degrees,angle C=(5x-17) degrees. Theorem 9 gives 3x+5=5x-17,so 2x=22,x=11. Both base angles are 38 degrees. Do not compute the apex angle yet.

### Practice with full solutions and independent checks
1. PQ=PR. Which angles equal? Q and R by Theorem 9. Second check: each is opposite an equal leg.
2. Base angles 2x+7 and 4x-9: x? 8, each angle 23. Solve 2x=16. Second check: 2(8)+7=4(8)-9=23.
3. AB=AC, angle A=40: what is established now? B=C, not yet their numeric value from angle sum. Second check: theorem statement has equality, not a sum.

### Diagram specifications
Proof SVG is isosceles ABC with A=(0,4),B=(-3,0),C=(3,0),D=(0,0). W2 rotate the figure 90 degrees so base is vertical; retain leg ticks and expression labels at B,C.

### Common-mistake correction
Bottom of drawing is not a definition of base. Identify base angles by the sides opposite equal legs. Do not use 180 degrees before Unit 5.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.8 Converse and Equilateral Corollaries

Source: Jacobs 4.5, p. 159, Theorem 10 and corollaries.

### Precise mathematical content
If angle B=angle C then AB=AC. Equilateral iff equiangular follows by applying Theorems 9 and 10 to all pairs. The converse needs its own proof.

### Worked example 1
Adapted proof of Theorem 10, p. 159. Compare ABC and ACB. Angle ABC=ACB by given and angle ACB=ABC by symmetry. BC=CB by reflexivity. These are ASA facts, so ABC≅ACB. CPCTC yields AB=AC. This proof does not require AAS or angle sum.

### Worked example 2
Original equilateral consequence. If angle A=angle B=angle C, Theorem 10 gives AB=AC=BC. Given AB=2x+1 and BC=9,2x+1=9,x=4. Every side is 9. Conversely equal sides give equal angles by Theorem 9. No numeric angle measure is invoked.

### Practice with full solutions and independent checks
1. Angle P=angle Q in PQR: equal sides? QR=PR, opposite those angles. Second check: side opposite P omits P, and side opposite Q omits Q.
2. B=C,AB=5x-4,AC=2x+11: x? 5, both 21. Solve 3x=15. Second check: 25-4=10+11=21.
3. Equilateral implies equiangular: why? Apply Theorem 9 to two different equal-side pairs. Second check: this makes A=B and B=C, so transitivity gives all equal.

### Diagram specifications
One triangle with arrows showing correspondence ABC↔ACB, side BC common. Second SVG equiangular triangle with three equal-angle marks and side expressions. Do not mark 60 degrees.

### Common-mistake correction
Flipping an implication does not prove its converse. Supply the ASA self-comparison proof.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.10 SSS Proved from SAS

Source: Jacobs 4.6, pp. 163 to 164, Theorem 11.

### Precise mathematical content
Three corresponding sides determine congruence. In Jacobs this is Theorem 11, not a postulate. Other axiom systems may postulate SSS, so the correction is course-specific.

### Worked example 1
Adapted from Theorem 11 proof, p. 164, with full case coverage added. Align AB of ABC with an equal side of a SAS-constructed triangle ABG on the opposite side of AB from C. Let AC=AG and BC=BG. If A,C,G or B,C,G are collinear, the other isosceles triangle supplies angle ACB=AGB directly. Otherwise ACG and BCG are isosceles. If line CG meets AB between A,B, ray CG splits both apex angles, so add equal isosceles base angles. If it meets outside AB, take differences instead. Thus angle ACB=AGB. AC=AG and BC=BG now give ABC≅ABG by SAS. Transitivity with the constructed copy proves SSS.

### Worked example 2
Original SSS application. Quadrilateral ABCD has AB=AD and CB=CD. Shared AC=AC gives ABC≅ADC by SSS. Thus angle BAC=DAC and angle BCA=DCA by CPCTC. This proves AC bisects both named angles; perpendicular diagonal claims require an additional argument.

### Practice with full solutions and independent checks
1. 3,4,5 and 3,4,5: congruent? Yes, SSS. Second check: a reflection may change orientation but not these lengths.
2. W2 AB=2x+1,AD=11: x? 5. Equal legs give 2x+1=11. Second check: 2(5)+1=11.
3. Can SSS proof use SSS for the auxiliary triangles? No. Use isosceles base-angle equalities proved via SAS. Second check: dependency graph contains no edge back from SSS to itself.

### Diagram specifications
Three proof SVG panels with A=(-2,0),B=(2,0),C=(t,h),G=(t,-h),h>0: t=0 interior, t=4 exterior, t=2 endpoint. AC=AG,BC=BG. CG is vertical and meets AB or its extension at x=t. W2 kite with A=(0,4),B=(-3,0),C=(0,-2),D=(3,0).

### Common-mistake correction
SSS is a theorem in this course. Do not call it an assumption, and do not cover only the interior joining-line case.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.11 Why SSA Fails

Source: Jacobs 4.6, pp. 163 to 168, congruence-test context; counterexamples below are original.

### Precise mathematical content
SSA does not guarantee congruence for all triangles. Some SSA data determine one triangle, some two and some none. Show two noncongruent triangles for one fixed data set. No trig or Pythagoras is available yet as a student proof.

### Worked example 1
Original exact coordinate certificate for builder verification; student-facing version uses compass intersections. A=(0,0),B=(4,3); ray AC is positive x-axis. Fix AB=5 and BC=sqrt(10). The circle (x-4)²+(y-3)²=10 meets y=0 where (x-4)²=1,so C1=(3,0),C2=(5,0). Both ABC1,ABC2 have the same angle A because AC1,AC2 are the same ray; AB=5 and BC=sqrt(10) match. But AC1=3 and AC2=5, so the triangles are not congruent. Algebraic distance computation is a backend check, not a proof to assign before Pythagoras.

### Worked example 2
Original scaling counterexample. Double every coordinate above. A=(0,0),B=(8,6),C1=(6,0),C2=(10,0). AB=10,BC=sqrt(40), and angle A is unchanged. The two third sides remain different. Thus making the given sides long does not repair SSA.

### Practice with full solutions and independent checks
1. For W1 name the included angle of AB and BC. Angle ABC, not angle BAC. Second check: the common side endpoint is B.
2. Do W1 triangles have equal angle A? Yes, both use identical rays AB and positive x-axis. Second check: unit direction vectors of the rays coincide.
3. Why do unequal AC values prove noncongruence here? The other two sides match with fixed labels, and the third side differs. Even without correspondence their side multisets {3,sqrt(10),5} and {5,sqrt(10),5} differ. Second check: first is scalene, second is isosceles.

### Diagram specifications
Use A=(0,0),B=(4,3),C1=(3,0),C2=(5,0), uniform scale. Draw full radius-sqrt(10) circle at B, label two intersections distinctly, angle arc at A shared. For W2 draw doubled copy at same screen scale or label scale factor. Reject tangent/no-intersection cases if UI says two triangles.

### Common-mistake correction
SSA sometimes fixes a triangle, but is not a universal criterion. Replace current trig-based check answer with: a circle tangent to the ray at the perpendicular foot gives one right triangle; numerical length proof is deferred.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.12 Constructing Congruent Triangles

Source: Jacobs 4.7, pp. 170 to 171, Constructions 3 to 5.

### Precise mathematical content
Copy lengths with compass; locate third vertex by intersections of two circles. SSS proves correctness, not drawing appearance. Keep both intersections until selecting a half-plane.

### Worked example 1
Adapted from Construction 5, p. 171. Given triangle ABC, draw ray DE and copy AB to DE. Draw circle centered D radius AC and circle centered E radius BC. Select intersection F. Then DE=AB,DF=AC,EF=BC by the copied radii. Thus DEF≅ABC by SSS. Either intersection makes a reflected congruent copy.

### Worked example 2
Adapted from Constructions 3 and 4, p. 170. To copy ABC by SAS, copy AB to DE, copy angle BAC at D on selected side of DE, then mark DF=AC along that new ray. Now DE=AB,DF=AC, angle EDF=BAC. SAS proves DEF≅ABC. Angle-copy correctness rests on SSS for the two radius-and-chord triangles.

### Practice with full solutions and independent checks
1. Given AB=5,AC=4,BC=3, which two radii after DE=5? D radius 4 and E radius 3. Second check: each radius matches the side incident to its corresponding endpoint.
2. Are the upper and lower circle intersections different congruence classes? No. Reflection in DE interchanges them and preserves all lengths. Second check: SSS applies to both.
3. Can you replace a compass copy by marking a ruler reading and call it exact compass-and-straightedge construction? No. A measured sketch introduces measurement error and a different tool. Second check: construction steps require radius transfer, not unit marks.

### Diagram specifications
D=(0,0),E=(5,0), circles radii 4 and 3; F=(3.2,2.4), other intersection (3.2,-2.4). Dashed unused reflected solution. Stage diagrams keep center labels and radius connections. W2 copy a 40-degree included angle without a protractor icon.

### Common-mistake correction
Looks equal is insufficient. Name the three equalities, then cite SSS or SAS.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.13 Justifying Earlier Constructions

Source: Jacobs 4.6, pp. 163 to 168; 4.7, pp. 169 to 171.

### Precise mathematical content
Equal-radius intersections give SSS congruence. Name every auxiliary point and prove that the joining line meets the segment between its endpoints. For two equal-radius circle intersections P,Q, the symmetric opposite-side intersections guarantee this.

### Worked example 1
Original expanded bisector proof. Equal-radius circles centered A,B intersect in P,Q on opposite sides of AB; let M=PQ∩AB. AP=BP,AQ=BQ,PQ=PQ,so APQ≅BPQ by SSS. Their equal angles APQ,BPQ imply APM=BPM because PM is ray PQ. AP=BP and PM=PM now give APM≅BPM by SAS. Hence AM=BM and AMP=BMP. These adjacent angles sum to 180 degrees, so each is 90. Thus PQ is perpendicular bisector of AB.

### Worked example 2
Adapted angle-copy justification, p. 171, also usable for angle bisection. For bisection, mark U,V on the angle rays with OU=OV. Draw equal-radius arcs centered U,V meeting at interior X. OU=OV,UX=VX,OX=OX give OUX≅OVX by SSS. CPCTC gives UOX=VOX, so interior ray OX is the angle bisector. Require X not O and strictly inside the angle.

### Practice with full solutions and independent checks
1. AB=10 and construction radius 4: two crossings? No, since 2r<AB. Second check: centers distance 10 exceeds diameter sum 8.
2. Radius 5: why not enough? Circles touch once at midpoint, so there are not two distinct P,Q to define a line. Second check: height sqrt(25-25)=0 is a backend coordinate check only.
3. Which third SSS fact in angle-bisector proof? OX=OX, reflexivity. Second check: the shared side appears in both triangles, unlike an unproved angle equality.

### Diagram specifications
A=(-5,0),B=(5,0), radius 6, P=(0,sqrt(11)),Q=(0,-sqrt(11)),M=(0,0). Add M label before any proof mentions it. W2 rays at 0 and 70 degrees, U,V at radius 4, choose X on interior angle bisector farther than O. Wrong-case SVG uses tangent circles with just one crossing.

### Common-mistake correction
An undefined M makes a proof incomplete. Define M=PQ∩AB and state P,Q are on opposite sides. Strictly greater than half is needed, not greater than or equal.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.14 Mixed Proof Practice

Source: Jacobs Chapter 4 Summary and Review, pp. 176 to 180; original review items.

### Precise mathematical content
Choose a direct angle theorem if it suffices. Use SAS,ASA,SSS only with their full hypotheses; finish with CPCTC only when necessary.

### Worked example 1
Original mixed proof. Given AB=CD,BC=DA in simple quadrilateral ABCD, draw AC. AC=CA by reflexivity, so ABC≅CDA by SSS. CPCTC gives angle ABC=CDA. The ordering is A↔C,B↔D,C↔A. No parallel lines have been assumed.

### Worked example 2
Original direct-angle proof. Lines AB and CD cross at O. Given angle AOC=(3x+4) degrees and BOD=(5x-20) degrees. Vertical angles are equal, so 3x+4=5x-20,x=12. Both angles are 40 degrees. No triangle congruence is needed.

### Practice with full solutions and independent checks
1. W1 which shared side gives third equality? AC=CA by reflexivity. Second check: same endpoints, opposite order.
2. W2 adjacent angle? 140 degrees, because linear pair sum 180 and 180-40=140. Second check: 40+140=180.
3. Triangles have just two equal sides and a nonincluded equal angle. Can you choose SSS? No, third side is not established. Second check: SSA counterexample satisfies exactly these incomplete premises.

### Diagram specifications
W1 draw convex quadrilateral with unequal adjacent sides, opposite-side tick pairs and AC diagonal. W2 crossing lines with A,O,B collinear and C,O,D collinear, opposite angles labeled 3x+4 and 5x-20.

### Common-mistake correction
Not every proof is a triangle-congruence proof. Vertical angles already solve W2.

### Interactive acceptance
Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.

## 4.9 Quiz and Reteach

Original aligned item bank. Source scope: Jacobs 4.2 to 4.5 for quiz, Chapter 4 Summary and Review pp. 176 to 180 for review. No claim that these are verbatim book items.

1. **Prompt:** ABC≅PQR. Which side matches CA?
   **Worked solution and second check:** RP, by C↔R,A↔P. Check: third-first positions match.

2. **Prompt:** ABC≅DEF,BC=2x+3,EF=15. Find x.
   **Worked solution and second check:** 2x+3=15,2x=12,x=6. Check: 2(6)+3=15.

3. **Prompt:** AB=DE,AC=DF,A=D. Name the test.
   **Worked solution and second check:** SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.

4. **Prompt:** A=D,B=E,AB=DE. Name the test.
   **Worked solution and second check:** ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.

5. **Prompt:** Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
   **Worked solution and second check:** AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.

6. **Prompt:** Once AMB≅DMC, what matches AB?
   **Worked solution and second check:** DC, so AB=DC by CPCTC. Check: first-third positions agree.

7. **Prompt:** AB=AC, B=3x+2,C=5x-16 degrees. Find x and the base angles.
   **Worked solution and second check:** 3x+2=5x-16 gives x=9 and both angles 29. Check: 27+2=45-16=29.

8. **Prompt:** Angle B=angle C in ABC. Prove AB=AC.
   **Worked solution and second check:** Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.

9. **Prompt:** Does AAA prove congruence?
   **Worked solution and second check:** No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.

10. **Prompt:** A proof cites CPCTC before congruence. Fix the ordering.
   **Worked solution and second check:** First give SAS/ASA facts, then conclude congruence, then use CPCTC. Check: CPCTC hypothesis is now established.

Reteach links: items 1 to 2 → 4.1; 3 → 4.3; 4 → 4.4; 5 → 4.5; 6 → 4.6; 7 → 4.7; 8 → 4.8; 9 to 10 → criteria/proof order. For review items 11 to 16 use 4.10 to 4.13. Diagram specs reuse the named lesson SVG with givens only, then reveal conclusion marks. End with “What's confusing?”

## 4.15 Review

Original aligned item bank. Source scope: Jacobs 4.2 to 4.5 for quiz, Chapter 4 Summary and Review pp. 176 to 180 for review. No claim that these are verbatim book items.

1. **Prompt:** ABC≅PQR. Which side matches CA?
   **Worked solution and second check:** RP, by C↔R,A↔P. Check: third-first positions match.

2. **Prompt:** ABC≅DEF,BC=2x+3,EF=15. Find x.
   **Worked solution and second check:** 2x+3=15,2x=12,x=6. Check: 2(6)+3=15.

3. **Prompt:** AB=DE,AC=DF,A=D. Name the test.
   **Worked solution and second check:** SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.

4. **Prompt:** A=D,B=E,AB=DE. Name the test.
   **Worked solution and second check:** ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.

5. **Prompt:** Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
   **Worked solution and second check:** AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.

6. **Prompt:** Once AMB≅DMC, what matches AB?
   **Worked solution and second check:** DC, so AB=DC by CPCTC. Check: first-third positions agree.

7. **Prompt:** AB=AC, B=3x+2,C=5x-16 degrees. Find x and the base angles.
   **Worked solution and second check:** 3x+2=5x-16 gives x=9 and both angles 29. Check: 27+2=45-16=29.

8. **Prompt:** Angle B=angle C in ABC. Prove AB=AC.
   **Worked solution and second check:** Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.

9. **Prompt:** Does AAA prove congruence?
   **Worked solution and second check:** No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.

10. **Prompt:** A proof cites CPCTC before congruence. Fix the ordering.
   **Worked solution and second check:** First give SAS/ASA facts, then conclude congruence, then use CPCTC. Check: CPCTC hypothesis is now established.

11. **Prompt:** AB=AD,BC=DC in ABCD. Prove AC bisects angle BAD.
   **Worked solution and second check:** AB=AD,BC=DC,AC=AC imply ABC≅ADC by SSS; BAC=DAC by CPCTC. Check: A↔A,B↔D,C↔C is the ordered match.

12. **Prompt:** Three equal side pairs are given, no angles. Is SAS immediate?
   **Worked solution and second check:** No. Use SSS. Check: SAS requires an included-angle equality not among the givens.

13. **Prompt:** Circle centers D,E are 5 apart; radii 4,3. Why do both intersections copy the same triangle?
   **Worked solution and second check:** Both give DF=4,EF=3,DE=5; SSS proves congruence. Check: reflection in DE exchanges intersections.

14. **Prompt:** Equal-radius circles at A,B meet at P,Q. What must be defined before referring to M?
   **Worked solution and second check:** M=PQ∩AB. With P,Q opposite sides and common radius>AB/2,M lies between A,B. Check: coordinate midpoint model yields M on both lines.

15. **Prompt:** AB=10,r=5. Can two crossing points define a perpendicular bisector?
   **Worked solution and second check:** No. Tangency yields one point. Check: radius must strictly exceed half of 10.

16. **Prompt:** A=(0,0),B=(4,3),C1=(3,0),C2=(5,0). State the SSA failure without trig.
   **Worked solution and second check:** Same rays give equal angle A,AB common,and circle centered B through both C vertices gives BC1=BC2. But AC1=3≠5=AC2. Check: side multisets differ.

Reteach links: items 1 to 2 → 4.1; 3 → 4.3; 4 → 4.4; 5 → 4.5; 6 → 4.6; 7 → 4.7; 8 → 4.8; 9 to 10 → criteria/proof order. For review items 11 to 16 use 4.10 to 4.13. Diagram specs reuse the named lesson SVG with givens only, then reveal conclusion marks. End with “What's confusing?”

## 4.16 Unit 4 Assessment

Original assessment forms, 12 items each. Teacher answer keys below are separate from learner printable forms. Source scope: Jacobs 4.2 to 4.7, pp. 139 to 175, review pp. 176 to 180. A renderer must make the printable forms; no PDF file is being claimed as delivered. Each keyed solution is sufficient for a reveal copy after assessment.

### Form A

1. ABC≅PQR. Which side matches CA?
   Key: RP, by C↔R,A↔P. Check: third-first positions match.

2. ABC≅DEF,BC=2x+3,EF=15. Find x.
   Key: 2x+3=15,2x=12,x=6. Check: 2(6)+3=15.

3. AB=DE,AC=DF,A=D. Name the test.
   Key: SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.

4. A=D,B=E,AB=DE. Name the test.
   Key: ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.

5. Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
   Key: AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.

6. Once AMB≅DMC, what matches AB?
   Key: DC, so AB=DC by CPCTC. Check: first-third positions agree.

7. AB=AC, B=3x+2,C=5x-16 degrees. Find x and the base angles.
   Key: 3x+2=5x-16 gives x=9 and both angles 29. Check: 27+2=45-16=29.

8. Angle B=angle C in ABC. Prove AB=AC.
   Key: Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.

9. Does AAA prove congruence?
   Key: No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.

10. A proof cites CPCTC before congruence. Fix the ordering.
   Key: First give SAS/ASA facts, then conclude congruence, then use CPCTC. Check: CPCTC hypothesis is now established.

11. AB=AD,BC=DC in ABCD. Prove AC bisects angle BAD.
   Key: AB=AD,BC=DC,AC=AC imply ABC≅ADC by SSS; BAC=DAC by CPCTC. Check: A↔A,B↔D,C↔C is the ordered match.

12. Three equal side pairs are given, no angles. Is SAS immediate?
   Key: No. Use SSS. Check: SAS requires an included-angle equality not among the givens.

### Form B

1. ABC≅PQR. Which side matches CA?
   Key: RP, by C↔R,A↔P. Check: third-first positions match.

2. ABC≅DEF,BC=3x-2,EF=19. Find x.
   Key: 3x-2=19,3x=21,x=7. Check: 21-2=19.

3. A=D,B=E,AB=DE. Name the test.
   Key: ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.

4. AB=DE,AC=DF,A=D. Name the test.
   Key: SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.

5. Angle B=angle C in ABC. Prove AB=AC.
   Key: Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.

6. Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
   Key: AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.

7. AB=AC,B=4x-3,C=2x+13 degrees. Find x and base angles.
   Key: 4x-3=2x+13,2x=16,x=8; both 29. Check: 32-3=16+13=29.

8. Does AAA prove congruence?
   Key: No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.

9. AB=AD,BC=DC in ABCD. Prove AC bisects angle BAD.
   Key: AB=AD,BC=DC,AC=AC imply ABC≅ADC by SSS; BAC=DAC by CPCTC. Check: A↔A,B↔D,C↔C is the ordered match.

10. Circle centers D,E are 5 apart; radii 4,3. Why do both intersections copy the same triangle?
   Key: Both give DF=4,EF=3,DE=5; SSS proves congruence. Check: reflection in DE exchanges intersections.

11. AB=10,r=5. Can two crossing points define a perpendicular bisector?
   Key: No. Tangency yields one point. Check: radius must strictly exceed half of 10.

12. A=(0,0),B=(4,3),C1=(3,0),C2=(5,0). State the SSA failure without trig.
   Key: Same rays give equal angle A,AB common,and circle centered B through both C vertices gives BC1=BC2. But AC1=3≠5=AC2. Check: side multisets differ.

### Assessment acceptance
Form A and B each contain 12 fully keyed items. At least two require proofs, not merely naming a test. For figure-based questions use the exact lesson diagram references above. The backend coordinate check in SSA keys must not become an assigned distance-formula calculation before Unit 7. Grade correspondence as well as criterion. Numeric items need equations and substitution checks, not just final x.
