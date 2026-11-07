# Unit 4: Triangle Congruence (3 weeks, 16 days)
Big idea: Three well-chosen parts are enough to pin down a triangle. Essential question: What is the least information that guarantees two triangles are congruent?
Verified Indiana 2023 standards for this unit (from progression.md, codes checked against the IDOE PDF fetched 2026-11-07): G.T.2 (E), G.T.3, G.T.1b, G.GF.3, G.GF.6
Lessons: 16. Current build: 75 slides total.
Math status: filled by Euclid from /workspace/geometry/math/UNIT04-FILL.md. Euclid's math is quoted as written; Socrates owns the lesson wording around it.

## Euclid's corrections for this unit (applied where they touch wording)
1. In 4.1 misconception, replace figure notation `ABC = FED vs ABC = DEF` with `triangle ABC ≅ triangle FED vs triangle ABC ≅ triangle DEF`; use `=` only for lengths or measures.
2. In 4.3/4.4 replace “follows from the definition of congruence” by “follows from the rigid-motion existence and preservation assumptions and the definition of congruence.” A definition alone proves no existence.
3. In 4.2 describe SSS as conjectured, not established until 4.10; ASA/SAS are established next.
4. In 4.10 qualify “SSS is a postulate” misconception as “SSS is a postulate in this course.” Other valid axiom systems do postulate it.
5. Do not force “first worked example” when the book has no labeled worked example. Use cited conceptual adaptations or original aligned items, as labeled here.
6. Use text labels, not the color-coded proof reference retained at 4.5, to meet black-and-white requirements.
7. In 4.7/4.8 withhold numeric 60-degree and 180-degree deductions until 5.10.
8. In 4.13 keep construction verification distinct from measurement. Define M before using it; see the proof below.
9. A universal 9-to-10-slide cap is incompatible with individually legible full solutions for 3-to-5 practice items and two examples on small screens. Permit subpages/reveals rather than dropping proof steps.

## Reveal rule for this unit
Each worked example shows one step at a time: step text on the left, its reason on the right, Next and Back buttons, and Show all for review. Practice items go one per subpage: Reveal 1 shows the worked solution, Reveal 2 shows the second check. This follows Euclid's note 9: use subpages and reveals instead of cutting steps to fit a 10-slide limit.

## Builder notes for this unit
- Length: a regular lesson is meant to run about 12 to 14 screens counting subpages (10 slide slots, with worked-example reveals and one subpage per practice item). This is intended, not overrun.
- Two layers per lesson. The **Learner layer** (Socrates) is the only text students see. The **Builder and answer-key layer** (Euclid) is for building figures, checking answers and the teacher key; never render it on a student screen. Values in both layers are identical (see /workspace/geometry-v2/CHANGES-unit04.md).
- Structural moves this unit: see CHANGES-unit04.md.

## 4.1 Corresponding Parts
- Jacobs: Jacobs 4.2, pp. 139 to 145 (PDF pp. 159 to 165)
- Euclid source line: Jacobs 4.2, pp. 139 to 141.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can write a congruence statement with matching vertices.
  2. Given a congruence statement such as triangle ABC ≅ triangle EFD, I can list all six pairs of corresponding parts by reading letter positions.
  3. I can explain why triangle ABC ≅ triangle FED and triangle ABC ≅ triangle DEF say different things, and use = only for lengths and angle measures.
- Hook: Two paper cutouts of the same scalene triangle, one flipped and turned. Students tape them together edge to edge and write which corner landed on which, then compare their letter lists with a partner.
- Misconception and how to surface it: Order of letters in a congruence statement doesn't matter. Surface it: triangle ABC ≅ triangle FED vs triangle ABC ≅ triangle DEF (use = only for lengths and measures).
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Line under it: Jacobs 4.2, pp. 139 to 141.
  2. Get started: show the two cutout triangles (one rotated). Prompt: 'Which corner of the left one matches corner A?' Learners commit before reveal.
  3. The big idea: a congruence statement is an ordered matching. Position 1 matches position 1, and so on. Show ≅ for figures and = for lengths and measures, side by side.
  4. Worked example 1 (learner layer): list all six matches from triangle ABC ≅ triangle EFD. Reveal one match per tap, each with its reason ('1st letters', '1st and 2nd letters').
  5. Worked example 2 (learner layer): solve 2x + 1 = 9 from a side match. Steps revealed one at a time: name the match, write the equation, solve, then note what the given facts do NOT tell us (BC and PR).
  6. Try it: drag-and-match. Learner drags each vertex label of one triangle onto its partner; the slide then writes the congruence statement in the order they chose.
  7. Common mistake: 'Jordan' writes triangle ABC ≅ triangle FED for the cutouts. Learner finds the wrong pair and rewrites it.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself: keep current question after Euclid errata pass.
  10. Exit ticket.
- Exit ticket: (1) Triangle KLM ≅ triangle RST. Which angle matches angle M, and which side matches LM? (2) In one sentence: why can't you swap the letters in a congruence statement? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *List the six matching parts (adapted from Jacobs p. 140).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | We are told triangle ABC ≅ triangle EFD. | This is the given. |
    | Match letters by position: A goes with E, B with F, C with D. | 1st with 1st, 2nd with 2nd, 3rd with 3rd. |
    | Sides: AB = EF, BC = FD, AC = ED. | Each side uses the matching pair of letters. |
    | Angles: angle A ≅ angle E, angle B ≅ angle F, angle C ≅ angle D. | Each angle uses its matching letter. |
    | All six come from the statement itself, not from how the picture looks. | The order of letters is part of what congruent means. |
  - Worked example 2:
    *Use a match to find x (original problem).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Triangle ABC ≅ triangle PQR, with AB = 2x + 1 and PQ = 9. | Given. |
    | AB matches PQ, so 2x + 1 = 9. | 1st and 2nd letters match 1st and 2nd letters. |
    | 2x = 8, so x = 4. | Subtract 1, then divide by 2. |
    | BC = 7 matches QR, so QR = 7. PR = 10 matches AC, so AC = 10. | Same position rule. |
    | Nothing says BC equals PR. | BC and PR are not in matching positions. |
  - Practice:
    1. Triangle ABC ≅ triangle XYZ and BC = 12. Find YZ.
       - Reveal 1 (worked solution): B goes with Y and C goes with Z, so YZ = BC = 12.
       - Reveal 2 (second check): Read it backward: YZ matches BC.
    2. Triangle PQR ≅ triangle LMN and angle Q = 37 degrees. Find angle M.
       - Reveal 1 (worked solution): Q is in the middle, and so is M. So angle M = 37 degrees.
       - Reveal 2 (second check): The middle letters match in both lists.
    3. Triangle ABC ≅ triangle DEF, AC = 3x - 2 and DF = 13. Find x.
       - Reveal 1 (worked solution): AC matches DF, so 3x - 2 = 13. Then 3x = 15 and x = 5.
       - Reveal 2 (second check): Plug in: 3(5) - 2 = 13.
  - Common mistake: Jordan wrote triangle ABC ≅ triangle FED. That is not just a new order. It says A matches F, which is false here. Write triangle ABC ≅ triangle DEF only when those letters really match. Use = for lengths and angle measures, and ≅ for figures.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > ABC≅EFD means A↔E, B↔F, C↔D. Figures are congruent; their lengths and angle measures are equal. Correspondence is part of the assertion.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted from the first congruence-correspondence illustration, p. 140. Given ABC≅EFD, list every corresponding part. Read positions: A↔E,B↔F,C↔D. Thus AB=EF,BC=FD,AC=ED and angle A≅E, angle B≅F, angle C≅D. All six follow from the meaning of congruence, not visual position.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original numeric application. ABC≅PQR, AB=2x+1,PQ=9,BC=7,PR=10. First correspondence gives AB=PQ, so 2x+1=9,2x=8,x=4. The other side matches give QR=7 and AC=10. No equation relates BC to PR.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. ABC≅XYZ, BC=12. Find YZ. Correspondence B↔Y,C↔Z gives BC=YZ=12. Second check: inverse correspondence maps YZ back to BC.
    > 2. PQR≅LMN, angle Q=37 degrees. Find angle M. Q↔M, so mM=37. Second check: the middle positions agree in both ordered lists.
    > 3. ABC≅DEF, AC=3x-2,DF=13. Find x. AC=DF, so 3x-2=13,3x=15,x=5. Second check: 3(5)-2=13.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Writing ABC=FED is not a harmless reordering. Use ABC≅DEF only when its matching is correct; use = only for lengths/measures.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Two scalene triangles with six explicit names. Use A=(0,0),B=(5,0),C=(1,2) and E=(9,1),F=(9,6),D=(7,2), a rotated translated copy. One/two/three ticks on corresponding sides, with labels outside triangles.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.2 How Little Information Is Enough?
- Jacobs: Jacobs 4.3, pp. 146 to 150 (PDF pp. 166 to 170)
- Euclid source line: Jacobs 4.3, pp. 146 to 148; SSS is proved in 4.6, p. 164.
- Current: 5 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can test which sets of three parts build only one triangle.
  2. I can build triangles from three given parts and record whether every build comes out the same.
  3. I can name the included angle of two sides and the included side of two angles, and explain why SSA and AAA are not tests.
- Hook: Straw-and-pipe-cleaner stations: SSS, SAS, ASA, SSA, AAA. Each pair builds from the card and tries to make a triangle that does not match a neighbor's.
- Misconception and how to surface it: Three matching parts of any kind is always enough. Surface it: SSA and AAA counterexample cards.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.3, pp. 146 to 148.
  2. Get started: prediction poll. 'Which of these five recipes always gives the same triangle?' Lock answers.
  3. The big idea: some three-part recipes pin down a triangle and some don't. SSS, SAS and ASA are conjectures today. They are proved in 4.3, 4.4 and 4.10.
  4. Worked example 1 (learner layer): flashlight beams, informal. No half-plane or rigid-motion language before 4.3. Reveal step by step.
  5. Worked example 2 (learner layer): AAA counterexample with equilateral triangles of side 2 and 5. Reveal step by step.
  6. Try it: sandbox from the plan. Labels read 'pending proof' on SSS, SAS and ASA, and 'find a counterexample' on SSA and AAA.
  7. Common mistake: a student says 'any three matching parts is enough' and cites AAA. Learner supplies the counterexample.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) Sides AB and BC: name their included angle. (2) Give one recipe that does not always make the same triangle, and sketch why. (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Flashlight beams (informal, adapted from the airplane example on Jacobs p. 146).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Tape a segment NT on the floor. Two students stand at N and T and aim flashlights inward at fixed angles. | This fixes one side and the two angles at its ends. |
    | The beams cross at one point. Call it W. | Two straight beams that are not the same line cross at most once. |
    | A second team copies the same segment length and the same two angles, then lays their tape on top of the first. | Same recipe, same starting segment. |
    | Their beams follow the same paths, so they cross at the same W. | The angles point the beams the same way. |
    | So this recipe (two angles and the side between them) seems to give only one triangle. We will prove it in 4.4. | Today it is a conjecture, not a theorem. |
  - Worked example 2:
    *Same angles, different size (original counterexample).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Draw an equilateral triangle with sides 2 and another with sides 5. | Two triangles to compare. |
    | In each one, all three angles are equal. So the angles match. | The isosceles theorem (coming in 4.7 and 4.8) will show this. |
    | But the sides are 2 and 5, so the triangles are not congruent. | Congruent shapes have equal lengths. |
    | So matching all three angles (AAA) is not enough. | One counterexample breaks the rule. |
  - Practice:
    1. Which angle is included between sides AB and AC?
       - Reveal 1 (worked solution): Angle BAC.
       - Reveal 2 (second check): Both sides start at A, and A is the middle letter.
    2. Which side is included between angles A and B?
       - Reveal 1 (worked solution): Side AB.
       - Reveal 2 (second check): Its ends are the two angle corners. AC would sit between angles A and C instead.
    3. Does matching all three angles (AAA) fix the size?
       - Reveal 1 (worked solution): No. The side 2 and side 5 equilateral triangles have matching angles but different lengths.
       - Reveal 2 (second check): A slide, turn or flip keeps a side of length 2 at length 2. It can never become 5.
  - Common mistake: 'Any three matching parts are enough' is false. Where the parts sit matters, and AAA has no length at all.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Treat the three-part tests as conjectures here. Establish SAS and ASA in 4.3/4.4 and SSS in 4.10. Do not silently assume SSS while proving SAS.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted from the two-beam aircraft example, p. 146. A fixed segment NT and fixed inward rays at N,T meet at W. Compare a second construction with equal NT and the same endpoint angles. Align both copies of NT. Their corresponding rays coincide because the endpoint angles and chosen half-plane agree. Their intersection W is unique because two distinct lines cannot meet twice. Thus the three inputs determine the triangle up to rigid motion.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original AAA counterexample. Make two equilateral triangles with sides 2 and 5. Within each, the isosceles theorem will imply all three angles equal, so corresponding angles match. Their side lengths differ, so they cannot be congruent because rigid motions preserve distance. No 60-degree or triangle-sum argument is needed.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. Included angle between AB and AC? angle BAC. Reason: both sides have common endpoint A. Second check: A is the middle angle letter.
    > 2. Included side between angles A and B? AB. Reason: its endpoints are the angle vertices. Second check: AC would instead include angles A and C.
    > 3. Does AAA fix size? No. The side-2 and side-5 equilateral examples have matching angles and different lengths. Second check: any rigid image preserves a side of length 2, not 5.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Three arbitrary matching parts are not enough. The part positions matter, and AAA omits a length.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Aircraft as horizontal segment NT with two downward inward light rays to W, endpoint arcs only. Second SVG: equilateral triangles of side 2 and 5 drawn at the same scale. Sandbox labels SSS/SAS/ASA as pending until proved; SSA and AAA as counterexample tasks.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.3 SAS from Rigid Motions
- Jacobs: Jacobs 4.3, pp. 146 to 150 (PDF pp. 166 to 170)
- Euclid source line: Jacobs 4.3, p. 147, Postulate 6; motion proof is an explicit course adaptation.
- Note: Jacobs takes SAS as Postulate 6 (p. 147); this course justifies it from rigid motions.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can explain why SAS follows from the definition of congruence.
  2. I can describe the three or four motions (translate, rotate, maybe reflect) that carry one triangle onto another when SAS holds.
  3. I can decide whether a marked angle is included before I cite SAS.
- Hook: Two patty-paper triangles with two sides and the included angle marked equal. Students slide, turn and flip one onto the other and narrate each move.
- Misconception and how to surface it: The included angle can be any angle. Surface it: mark a non-included angle and ask if SAS applies.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.3, p. 147 (Postulate 6 there; a theorem here from the Unit 3 motion postulates).
  2. Get started: 'Which motions will you need?' Students list them before touching the patty paper.
  3. The big idea: SAS follows from the rigid-motion postulates (Unit 3), ruler and protractor uniqueness, and the definition of congruence.
  4. Worked example 1 (learner layer): the motion proof. One frame per step (translate, rotate, reflect if needed, the second ray lands, C lands on F), each with its reason.
  5. Worked example 2 (learner layer): the midpoint and vertical-angle proof. Two-column table that fills in one row per tap.
  6. Try it: motion animator. Learner picks the next motion; the slide refuses a move that breaks a stated equality.
  7. Common mistake: a student marks angle B as included between AB and AC. Learner fixes it.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) AB = DE, BC = EF, angle B = angle E. Is this SAS? Why? (2) Which Unit 3 postulate did step 2 of the proof use? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Why SAS works (based on the SAS picture, Jacobs p. 147).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Slide triangle ABC so A lands on D. | A translation. Rigid motions keep lengths and angles (Unit 3 postulates). |
    | Turn it so ray AB lies along ray DE. | A rotation about D. |
    | Because AB = DE, point B lands exactly on E. | Equal lengths along the same ray end at the same point. |
    | If C and F are on different sides of line DE, flip across DE. | A reflection puts C on the same side as F. |
    | The angles at A and D are equal, so ray AC lies along ray DF. Because AC = DF, C lands on F. | Equal angle, then equal length. |
    | All three corners land on D, E, F, so triangle ABC ≅ triangle DEF. | Definition of congruence by rigid motions. We did not use SSS or the triangle angle sum. |
  - Worked example 2:
    *A midpoint proof (original problem).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | M is the midpoint of AD and of BC. | Given. |
    | AM = DM and BM = CM. | Definition of midpoint. |
    | Angle AMB ≅ angle DMC. | Vertical angles are equal (Unit 2). |
    | Triangle AMB ≅ triangle DMC. | SAS. |
    | AB = DC. | Matching sides of congruent triangles. No parallel-line facts needed. |
  - Practice:
    1. AB = DE = 6, AC = DF = 9, and angle A = angle D = 40 degrees. Are the triangles congruent?
       - Reveal 1 (worked solution): Yes, by SAS, because the 40 degree angle is between the two sides.
       - Reveal 2 (second check): The slide, turn, flip steps from Worked example 1 place every corner.
    2. Same sides, but now angle B = angle E. Can you use SAS?
       - Reveal 1 (worked solution): No. Angle B is not between AB and AC.
       - Reveal 2 (second check): Those two sides meet at A, not at B.
    3. In the midpoint example, AM = 3x + 1 and DM = 10. Find x.
       - Reveal 1 (worked solution): 3x + 1 = 10, so x = 3.
       - Reveal 2 (second check): Plug in: 3(3) + 1 = 10.
  - Common mistake: A student calls angle B the included angle for sides AB and AC. The included angle is where the two sides meet: angle BAC.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > SAS: AB=DE,AC=DF and angle BAC≅EDF imply ABC≅DEF, for nondegenerate triangles. Unit 3 must supply independent rigid-motion existence and preservation axioms.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adaptation of the SAS configuration, p. 147. Translate A onto D. Rotate so ray AB maps to ray DE. AB=DE puts B at E. If needed, reflect in DE so C and F lie in the same half-plane. The equal included angles force ray AC onto ray DF, and AC=DF puts C at F. Thus a composition of allowed isometries maps ABC onto DEF. Neither SSS nor triangle-angle sum was used.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original application. M is midpoint of AD and BC, with A,M,D and B,M,C collinear. Then AM=DM and BM=CM by midpoint. angle AMB≅DMC by vertical angles. Thus AMB≅DMC by SAS, and AB=DC. This is valid before parallel-line theorems.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. AB=DE=6,AC=DF=9 and angle A=angle D=40 degrees. Are triangles congruent? Yes, SAS, because the angle is included. Second check: the motion sequence above fixes all vertices.
    > 2. Same side equalities but angle B=angle E: may cite SAS? No. B is not between AB and AC. Second check: those sides share A, not B.
    > 3. In the midpoint example AM=3x+1,DM=10. Find x. 3x+1=10 gives x=3. Second check: 3(3)+1=10.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > A student labels angle B as the included angle for sides AB,AC. Correct to angle BAC. Included means at their common endpoint.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > For W1 use AB=6,AC=9, included angle 40 degrees and a rotated/reflected copy; three motion frames, mirror DE dashed. W2 intersecting segments AD,BC at M with midpoint ticks and vertical-angle arcs. Preserve distinct vertices.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.4 ASA from Rigid Motions
- Jacobs: Jacobs 4.3, pp. 146 to 150 (PDF pp. 166 to 170)
- Euclid source line: Jacobs 4.3, p. 147, Postulate 5; motion proof is an explicit course adaptation.
- Note: Jacobs takes ASA as Postulate 5 (p. 147); this course justifies it from rigid motions.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can explain why ASA follows from rigid motions.
  2. I can explain how two matching endpoint angles force the third vertex to the same spot once the included side is matched.
  3. I can tell ASA from AAS by locating the given side, and say why AAS can't be used yet.
- Hook: Flashlight beams: two students hold flashlights at the ends of a taped segment at fixed angles. Where can the beams cross? Try to make them cross somewhere else.
- Misconception and how to surface it: ASA and AAS are the same test. Surface it: mark which side is between the angles.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.3, p. 147 (Postulate 5 there; proved here).
  2. Get started: 'Can two beams at fixed angles cross in two places?' Commit yes or no.
  3. The big idea: match the side, match the two rays, and two lines meet in at most one point.
  4. Worked example 1 (learner layer): ASA motion proof, one step per reveal with reasons.
  5. Worked example 2 (learner layer): two triangles sharing AB on opposite sides. Proof table revealed row by row.
  6. Try it: drag the included side's endpoints; both rays move with it and the crossing point tracks.
  7. Common mistake: a student cites ASA when the side is not between the angles. Learner relabels it as AAS and notes that AAS waits until 5.12.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) Angles P and Q and side PR match. ASA or not? Explain. (2) Draw a quick sketch of ASA with the included side marked. (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Why ASA works (based on the ASA picture, Jacobs p. 147).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Slide and turn triangle ABC so side AB lies on side DE. | AB = DE, and rigid motions keep lengths. |
    | If C and F are on different sides of DE, flip across DE. | Now C and F are on the same side. |
    | The angle at A matches the angle at D, so C is somewhere on ray DF. | Equal angles point the same way. |
    | The angle at B matches the angle at E, so C is also on ray EF. | Same reason at the other end. |
    | Rays DF and EF cross at only one point, F. So C lands on F. | Two different lines cross at most once. |
    | So triangle ABC ≅ triangle DEF, without SSS or the angle sum. | Definition of congruence. |
  - Worked example 2:
    *Two triangles sharing a side (original problem).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | C and D are on opposite sides of AB. Angle CAB ≅ angle DBA and angle CBA ≅ angle DAB. | Given. |
    | AB = BA. | A segment equals itself. |
    | AB is the side between the two marked angles in each triangle. | So the side is included. |
    | Triangle CAB ≅ triangle DBA. | ASA. |
    | CA = DB and CB = DA. | Matching parts of congruent triangles (CPCTC). |
  - Practice:
    1. Angles A = 30 and B = 70 with side AB = 8 match angles D = 30, E = 70 and DE = 8. Which test?
       - Reveal 1 (worked solution): ASA.
       - Reveal 2 (second check): AB and DE each join the two marked corners.
    2. Angles A and B match angles D and E, but the matching side is AC and DF. Is that ASA?
       - Reveal 1 (worked solution): No. The side is not between the angles. That is AAS, which we prove later.
       - Reveal 2 (second check): The side between angles A and B is AB.
    3. In Worked example 2, CA = 2x + 3 and DB = 11. Find x.
       - Reveal 1 (worked solution): ASA gives CA = DB, so 2x + 3 = 11 and x = 4.
       - Reveal 2 (second check): Plug in: 2(4) + 3 = 11.
  - Common mistake: ASA and AAS put the given side in different places. Both will be valid tests, but AAS is not proved until 5.12, so you can't use it yet.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > ASA: angles A,D and B,E match and included sides AB,DE match. The nondegenerate triangles then are congruent.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adaptation of the ASA configuration, p. 147. Map segment AB onto DE by translation and rotation. Reflect across DE if necessary to put third vertices in the same open half-plane. Matching endpoint angles place the third vertex on both rays DF and EF. These rays lie on distinct lines and their common point is F. Hence C maps to F, proving congruence without SSS or angle sum.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original overlapping proof. C and D lie on opposite sides of AB. Given angle CAB≅DBA and angle CBA≅DAB, compare CAB and DBA. Shared AB=BA is the included side between the marked angles. Thus CAB≅DBA by ASA and CA=DB,CB=DA by CPCTC.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. Angles A=30,B=70 and included side AB=8 match D=30,E=70,DE=8. Criterion? ASA. Second check: AB and DE each join the marked-angle vertices.
    > 2. Angles A,B match D,E, but side AC matches DF. Is that ASA as stated? No, the side is not included; it is AAS, proved later. Second check: included side for A,B is AB.
    > 3. In W2 CA=2x+3,DB=11. Find x. ASA gives CA=DB, hence 2x+3=11,x=4. Second check: 2(4)+3=11.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > ASA and AAS have different given-side positions. Both later yield congruence, but citing a result not yet established breaks the proof order.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Two triangles on opposite sides of shared horizontal AB, with C above and D below. Use C=(2,3),D=(4,-3),A=(0,0),B=(6,0). Mark C angle at A matching D angle at B, and vice versa.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.5 Congruence Proofs
- Jacobs: Jacobs 4.4, pp. 151 to 156 (PDF pp. 171 to 176)
- Euclid source line: Jacobs 4.4, pp. 151 to 156; original applications of its proof format.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can write a proof using SAS or ASA.
  2. I can plan a congruence proof in four moves: mark the givens, find the hidden equal parts (vertical angles, shared side), choose SAS or ASA, then conclude.
  3. I can spot a circular step, one that uses the goal as a reason, and replace it.
- Hook: Proof-strip puzzle: each pair gets a cut-up proof (statements and reasons on separate strips) and rebuilds it. One strip is circular and must be thrown out.
- Misconception and how to surface it: You can use what you're proving as a reason. Surface it: a proof that cites the goal.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.4, pp. 151 to 156.
  2. Get started: the strips, shuffled. 'Which line has to come first?'
  3. The big idea: the four-move plan, shown as a reusable checklist with text labels only (no color coding).
  4. Worked example 1 (learner layer): crossing segments with a shared midpoint. Rows reveal one at a time, statement then reason.
  5. Worked example 2 (learner layer): AB bisects two angles. Same row-by-row reveal.
  6. Try it: drag-to-order proof builder with the plan's strips; feedback names the first out-of-order line.
  7. Common mistake: a proof that cites AC = AD to prove AC = AD. Learner deletes the line and names what replaces it.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) Name two 'hidden' equal parts you can use without being told. (2) Why can't the conclusion appear as a reason? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *SAS proof with a shared midpoint (original, in the style of Jacobs 4.4).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | AB and CD cross at M. M is the midpoint of AB and of CD. | Given. |
    | AM = BM and CM = DM. | Definition of midpoint. |
    | Angle AMC ≅ angle BMD. | Vertical angles. |
    | Triangle AMC ≅ triangle BMD. | SAS. A matches B, M matches M, C matches D. |
    | AC = BD and angle ACM ≅ angle BDM. | CPCTC. |
  - Worked example 2:
    *ASA proof with angle bisectors (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | AB bisects angle CAD and angle CBD. C and D are on opposite sides of AB. | Given. |
    | Angle CAB ≅ angle DAB and angle CBA ≅ angle DBA. | Definition of angle bisector. |
    | AB = AB. | A segment equals itself. |
    | Triangle CAB ≅ triangle DAB. | ASA. |
    | AC = AD and BC = BD. | CPCTC. We did not assume any kite facts. |
  - Practice:
    1. In Worked example 1, AM = 7 and CM = 4. Find BM and DM.
       - Reveal 1 (worked solution): BM = 7 and DM = 4, because M is the midpoint.
       - Reveal 2 (second check): So AB = 14 and CD = 8, each split in half.
    2. In Worked example 1, AC = 3x - 1 and BD = 14. Find x.
       - Reveal 1 (worked solution): The triangles are congruent, so 3x - 1 = 14 and x = 5.
       - Reveal 2 (second check): Plug in: 15 - 1 = 14.
    3. In Worked example 2, can AC = AD be your first reason?
       - Reveal 1 (worked solution): No. That is what you are trying to prove. Start with the two bisected angle pairs and AB = AB.
       - Reveal 2 (second check): Without that line, the ASA facts are still all there.
  - Common mistake: A proof uses AC = AD to prove AC = AD. That is going in a circle. Delete the line and start from the givens.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Unpack givens, find missing equal parts, cite SAS or ASA, then CPCTC. Never assume the desired conclusion.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original SAS proof in the style of Jacobs 4.4. AB and CD cross at M, M midpoint of AB and CD. AM=BM and CM=DM (midpoint); angle AMC=BMD (vertical). Thus AMC≅BMD (SAS). Therefore AC=BD and angle ACM=BDM (CPCTC). Correspondence A↔B,M↔M,C↔D is explicit.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original ASA proof. AB bisects both angle CAD and angle CBD, with C,D on opposite sides of AB. Thus angle CAB=DAB and CBA=DBA (bisectors). AB=AB (reflexive). CAB≅DAB by ASA. Hence AC=AD and BC=BD (CPCTC). No kite theorem is being assumed.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. W1 AM=7,CM=4: BM,DM? 7,4 by midpoint. Second check: full AB=14 and CD=8 each split equally.
    > 2. W1 AC=3x-1,BD=14: find x. Congruence gives 3x-1=14,so x=5. Second check: 15-1=14.
    > 3. W2 may AC=AD be used as the initial reason? No, it is the goal. Use two bisected-angle pairs and AB first. Second check: deleting the proposed conclusion leaves ASA premises sufficient.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > If a proof cites AC=AD to establish the triangles whose congruence would prove AC=AD, delete that circular line and use givens instead.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > W1 crossing lines with A,M,B collinear and C,M,D collinear. W2 lens-shaped quadrilateral A,C,B,D with diagonal AB and separate angle-bisector arc sets; no equal-side conclusion marks until reveal.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.6 CPCTC
- Jacobs: Jacobs 4.4, pp. 151 to 156 (PDF pp. 171 to 176)
- Euclid source line: Jacobs 4.4, pp. 151 to 156; definition of congruence p. 140.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can use congruent triangles to prove parts equal.
  2. I can use CPCTC to get a side or angle only after the triangles are proved congruent.
  3. I can solve for a variable from a corresponding-part equation and check it.
- Hook: 'Twin detectives': once two triangles are proven twins, what else must match? Pairs list every consequence from one marked diagram.
- Misconception and how to surface it: CPCTC can be used before the triangles are proved congruent. Surface it: reorder a flawed proof.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.4, pp. 151 to 156; definition of congruence, p. 140.
  2. Get started: a proven congruence and a list of six claims. Which are guaranteed?
  3. The big idea: CPCTC is a consequence, never a test. It always sits below the congruence line.
  4. Worked example 1 (learner layer): SAS then CPCTC. Reveal rows; the answer marks on AD and CD appear only at the last step.
  5. Worked example 2 (learner layer): two equations from one congruence. Reveal equation, solve, check.
  6. Try it: proof table where the CPCTC row is locked until a congruence row is filled.
  7. Common mistake: CPCTC placed above the congruence line. Learner moves it.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) Triangle ABC ≅ triangle RST and AB = 7. What else do you know? (2) Where in a proof can CPCTC first appear? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *SAS, then CPCTC (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | AB = CB and angle ABD ≅ angle CBD. | Given. |
    | BD = BD. | A segment equals itself. |
    | Triangle ABD ≅ triangle CBD. | SAS. The marked angle is at B, between AB and BD. |
    | A matches C, B matches B, D matches D. | Read the letters in order. |
    | AD = CD. | CPCTC. |
  - Worked example 2:
    *Two equations from one congruence (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Triangle ABC ≅ triangle DEF, BC = 4x - 3, EF = 13, angle A = (2y + 5) degrees, angle D = 35 degrees. | Given. |
    | BC = EF, so 4x - 3 = 13 and x = 4. | CPCTC, then solve. |
    | Angle A = angle D, so 2y + 5 = 35 and y = 15. | CPCTC, then solve. |
    | So BC = 13 and angle A = 35 degrees. | Substitute back. |
  - Practice:
    1. In Worked example 1, which side matches AD?
       - Reveal 1 (worked solution): CD, because A matches C and D matches D.
       - Reveal 2 (second check): Read ABD and CBD letter by letter.
    2. Triangle ABC ≅ triangle RST and AC = 8. Find RT.
       - Reveal 1 (worked solution): RT = 8 by CPCTC.
       - Reveal 2 (second check): 1st and 3rd letters match 1st and 3rd letters.
    3. Triangle ABC ≅ triangle DEF, AB = 5x + 2 and DE = 22. Find x.
       - Reveal 1 (worked solution): 5x + 2 = 22, so 5x = 20 and x = 4.
       - Reveal 2 (second check): Plug in: 5(4) + 2 = 22.
  - Common mistake: CPCTC can't come before the line that proves the triangles congruent. Move it below.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > CPCTC expands to corresponding parts of congruent triangles are congruent. It is a consequence of established congruence, not a congruence criterion.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original SAS-to-CPCTC example. Given AB=CB and angle ABD=CBD. BD=BD by reflexivity. Thus ABD≅CBD by SAS. A↔C,B↔B,D↔D, so AD=CD by CPCTC. The marked angle must be at B, between AB and BD, not at A.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original numeric consequence. Given ABC≅DEF, BC=4x-3,EF=13 and angle A=(2y+5) degrees,angle D=35 degrees. CPCTC gives 4x-3=13,x=4 and 2y+5=35,y=15. Thus BC=13 and angle A=35 degrees.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. In W1 which side matches AD? CD by A↔C,D↔D. Second check: read ABD and CBD position by position.
    > 2. ABC≅RST, AC=8: RT? 8 by CPCTC. Second check: first-third vertices correspond.
    > 3. ABC≅DEF,AB=5x+2,DE=22: x? 4. Solve 5x=20. Second check: 5(4)+2=22.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > CPCTC cannot be placed above the line establishing triangle congruence.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > W1 B=(0,0),D=(5,0),A=(2,3),C=(2,-3); AB,CB ticks and ABD,CBD arcs. AD,CD ticks appear only in the answer layer. W2 two scalene corresponding triangles with expressions as live text.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.7 Isosceles Triangle Theorem
- Jacobs: Jacobs 4.5, pp. 157 to 162 (PDF pp. 177 to 182)
- Euclid source line: Jacobs 4.5, p. 158, Theorem 9.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can prove that base angles of an isosceles triangle are equal.
  2. I can find the base angles of an isosceles triangle in any orientation by looking opposite the equal legs.
  3. I can follow the bisector-and-SAS proof of Theorem 9 and solve base-angle equations without using the 180 degree sum.
- Hook: Paper folding: cut out an isosceles triangle, fold so the equal legs match, and see which angles land on each other. Then turn the triangle upside down and ask again.
- Misconception and how to surface it: Base angles are the angles at the bottom of the picture. Surface it: an isosceles triangle drawn upside down.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.5, p. 158, Theorem 9.
  2. Get started: three isosceles triangles at different tilts. 'Tap the base angles.'
  3. The big idea: the base angles are the angles opposite the equal sides, wherever the triangle points.
  4. Worked example 1 (learner layer): proof of Theorem 9 by angle bisector and SAS, one row per reveal.
  5. Worked example 2 (learner layer): 3x + 5 = 5x - 17 on a sideways figure. Reveal steps; stop before the apex angle.
  6. Try it: drag the apex; leg ticks stay equal and the two base-angle readouts move together.
  7. Common mistake: a student calls the bottom angles 'base angles' on a tipped triangle. Learner corrects it.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) XY = XZ. Name the equal angles. (2) Base angles are 4x + 2 and 6x - 10. Find x. (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Proof of Theorem 9 (adapted from Jacobs p. 158).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | In triangle ABC, AB = AC. | Given. |
    | Draw AD, the bisector of angle A, meeting BC at D. | Every angle has a bisector (Protractor Postulate). |
    | Angle BAD ≅ angle CAD. | Definition of bisector. |
    | AD = AD. | A segment equals itself. |
    | Triangle ABD ≅ triangle ACD. | SAS. |
    | Angle B ≅ angle C. | CPCTC. |
  - Worked example 2:
    *Find the base angles (original problem).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | AB = AC, angle B = (3x + 5) degrees, angle C = (5x - 17) degrees. | Given. The figure is turned sideways. |
    | 3x + 5 = 5x - 17. | Theorem 9: base angles are equal. |
    | 2x = 22, so x = 11. | Solve. |
    | Both base angles are 38 degrees. | Substitute: 3(11) + 5 = 38. |
    | We stop here. We don't find the top angle yet. | The 180 degree angle sum comes in Unit 5. |
  - Practice:
    1. PQ = PR. Which angles are equal?
       - Reveal 1 (worked solution): Angles Q and R, by Theorem 9.
       - Reveal 2 (second check): Each is across from one of the equal sides.
    2. Base angles are 2x + 7 and 4x - 9. Find x.
       - Reveal 1 (worked solution): 2x + 7 = 4x - 9, so 2x = 16 and x = 8. Each angle is 23.
       - Reveal 2 (second check): 2(8) + 7 = 23 and 4(8) - 9 = 23.
    3. AB = AC and angle A = 40 degrees. What do we know right now?
       - Reveal 1 (worked solution): Angle B = angle C. We can't find their size yet.
       - Reveal 2 (second check): Theorem 9 says the angles are equal. It says nothing about a sum.
  - Common mistake: The base angles are not 'the bottom ones'. They are the angles across from the equal sides, wherever the triangle points. And no 180 degree math until Unit 5.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > If AB=AC then angle ABC≅BCA. Isosceles includes equilateral. The base is the side opposite the selected equal-leg vertex, regardless of page orientation.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted proof of Theorem 9, p. 158, using an angle bisector. In ABC with AB=AC, let AD bisect angle A and meet BC at D. AB=AC (given),BAD=CAD (bisector),AD=AD (reflexive). ABD≅ACD by SAS. Therefore B=C by CPCTC. Existence of the bisector ray comes from protractor postulate; its meeting BC uses ordinary triangle interior incidence.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original algebra application. AB=AC,angle B=(3x+5) degrees,angle C=(5x-17) degrees. Theorem 9 gives 3x+5=5x-17,so 2x=22,x=11. Both base angles are 38 degrees. Do not compute the apex angle yet.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. PQ=PR. Which angles equal? Q and R by Theorem 9. Second check: each is opposite an equal leg.
    > 2. Base angles 2x+7 and 4x-9: x? 8, each angle 23. Solve 2x=16. Second check: 2(8)+7=4(8)-9=23.
    > 3. AB=AC, angle A=40: what is established now? B=C, not yet their numeric value from angle sum. Second check: theorem statement has equality, not a sum.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Bottom of drawing is not a definition of base. Identify base angles by the sides opposite equal legs. Do not use 180 degrees before Unit 5.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Proof SVG is isosceles ABC with A=(0,4),B=(-3,0),C=(3,0),D=(0,0). W2 rotate the figure 90 degrees so base is vertical; retain leg ticks and expression labels at B,C.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.8 Converse and Equilateral Corollaries
- Jacobs: Jacobs 4.5, pp. 157 to 162 (PDF pp. 177 to 182)
- Euclid source line: Jacobs 4.5, p. 159, Theorem 10 and corollaries.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can prove the converse of the Isosceles Triangle Theorem and its corollaries.
  2. I can prove the converse of Theorem 9 (Theorem 10) by comparing the triangle with itself using ASA.
  3. I can explain why equilateral and equiangular mean the same thing for triangles, with no 60 degree value yet.
- Hook: Converse check: students write the converse of Theorem 9 and vote on whether it is true just because Theorem 9 is. Then they flip a paper triangle over onto itself.
- Misconception and how to surface it: Equiangular and equilateral are separate facts to memorize. Surface it: ask which theorem gives each.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.5, p. 159, Theorem 10 and corollaries.
  2. Get started: the vote. Does a true theorem make its converse true? (Recall 1.8.)
  3. The big idea: the converse needs its own proof. The self-comparison trick: triangle ABC and triangle ACB.
  4. Worked example 1 (learner layer): Theorem 10 by ASA self-comparison, one step per reveal with the correspondence arrows.
  5. Worked example 2 (learner layer): equiangular gives equilateral; solve 2x + 1 = 9.
  6. Try it: flip animation of triangle ABC onto triangle ACB, step by step.
  7. Common mistake: 'Theorem 9 is true, so Theorem 10 is true.' Learner names the logic error.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) Angle P = angle Q. Which sides are equal? (2) Why is 'flip the if and then' not a proof? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Proof of Theorem 10 (adapted from Jacobs p. 159).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | In triangle ABC, angle B ≅ angle C. | Given. |
    | Compare triangle ABC with triangle ACB, the same triangle read in a different order. | The self-comparison trick. |
    | Angle ABC ≅ angle ACB and angle ACB ≅ angle ABC. | Given, read both ways. |
    | BC = CB. | A segment equals itself. |
    | Triangle ABC ≅ triangle ACB. | ASA. |
    | AB = AC. | CPCTC. No AAS and no angle sum needed. |
  - Worked example 2:
    *Equal angles give equal sides (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Angle A = angle B = angle C. | Given. |
    | AB = AC = BC. | Theorem 10, used on two pairs of angles. |
    | AB = 2x + 1 and BC = 9, so 2x + 1 = 9 and x = 4. | Solve. |
    | Every side is 9. | Substitute. |
    | Going the other way, equal sides give equal angles. | Theorem 9. We still don't name a number of degrees. |
  - Practice:
    1. In triangle PQR, angle P = angle Q. Which sides are equal?
       - Reveal 1 (worked solution): QR = PR, the sides across from those angles.
       - Reveal 2 (second check): The side across from P doesn't use the letter P, and the same for Q.
    2. Angle B = angle C, AB = 5x - 4, AC = 2x + 11. Find x.
       - Reveal 1 (worked solution): 5x - 4 = 2x + 11, so 3x = 15 and x = 5. Both sides are 21.
       - Reveal 2 (second check): 25 - 4 = 21 and 10 + 11 = 21.
    3. Why does equilateral mean equiangular?
       - Reveal 1 (worked solution): Use Theorem 9 on two different pairs of equal sides.
       - Reveal 2 (second check): That gives A = B and B = C, so all three are equal.
  - Common mistake: Flipping the if and then does not prove the converse. Theorem 10 needs its own proof (the ASA self-comparison).
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > If angle B=angle C then AB=AC. Equilateral iff equiangular follows by applying Theorems 9 and 10 to all pairs. The converse needs its own proof.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted proof of Theorem 10, p. 159. Compare ABC and ACB. Angle ABC=ACB by given and angle ACB=ABC by symmetry. BC=CB by reflexivity. These are ASA facts, so ABC≅ACB. CPCTC yields AB=AC. This proof does not require AAS or angle sum.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original equilateral consequence. If angle A=angle B=angle C, Theorem 10 gives AB=AC=BC. Given AB=2x+1 and BC=9,2x+1=9,x=4. Every side is 9. Conversely equal sides give equal angles by Theorem 9. No numeric angle measure is invoked.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. Angle P=angle Q in PQR: equal sides? QR=PR, opposite those angles. Second check: side opposite P omits P, and side opposite Q omits Q.
    > 2. B=C,AB=5x-4,AC=2x+11: x? 5, both 21. Solve 3x=15. Second check: 25-4=10+11=21.
    > 3. Equilateral implies equiangular: why? Apply Theorem 9 to two different equal-side pairs. Second check: this makes A=B and B=C, so transitivity gives all equal.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Flipping an implication does not prove its converse. Supply the ASA self-comparison proof.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > One triangle with arrows showing correspondence ABC↔ACB, side BC common. Second SVG equiangular triangle with three equal-angle marks and side expressions. Do not mark 60 degrees.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.9 Quiz and Reteach
- Current: 6 slides (auto-generated from other lessons' checks).
- Build: 10-item quiz (mixed from the lessons since the last checkpoint, at least 2 proof or justification items), answer key per item, then a reveal-on-demand reteach branch: one slide per lesson target linking back to its worked example, and an exit line "What's confusing?"
- Learner layer (Socrates, student-facing prompts; answers are in the builder layer below):
    1. Triangle ABC ≅ triangle PQR. Which side matches CA?
    2. Triangle ABC ≅ triangle DEF, BC = 2x + 3 and EF = 15. Find x.
    3. AB = DE, AC = DF and angle A = angle D. Which test?
    4. Angle A = angle D, angle B = angle E and AB = DE. Which test?
    5. Two segments AD and BC cross at M, and M is the midpoint of both. Prove triangle AMB ≅ triangle DMC.
    6. Once triangle AMB ≅ triangle DMC, which side matches AB?
    7. AB = AC, angle B = (3x + 2) degrees and angle C = (5x - 16) degrees. Find x and the base angles.
    8. In triangle ABC, angle B = angle C. Prove AB = AC.
    9. Does matching all three angles (AAA) prove two triangles congruent?
    10. A proof uses CPCTC before it proves the triangles congruent. Fix the order.
- Builder and answer-key layer, item bank *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)* (not shown to students):

    > Original aligned item bank. Source scope: Jacobs 4.2 to 4.5 for quiz, Chapter 4 Summary and Review pp. 176 to 180 for review. No claim that these are verbatim book items.
    >
    > 1. **Prompt:** ABC≅PQR. Which side matches CA?
    >    **Worked solution and second check:** RP, by C↔R,A↔P. Check: third-first positions match.
    >
    > 2. **Prompt:** ABC≅DEF,BC=2x+3,EF=15. Find x.
    >    **Worked solution and second check:** 2x+3=15,2x=12,x=6. Check: 2(6)+3=15.
    >
    > 3. **Prompt:** AB=DE,AC=DF,A=D. Name the test.
    >    **Worked solution and second check:** SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.
    >
    > 4. **Prompt:** A=D,B=E,AB=DE. Name the test.
    >    **Worked solution and second check:** ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.
    >
    > 5. **Prompt:** Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
    >    **Worked solution and second check:** AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.
    >
    > 6. **Prompt:** Once AMB≅DMC, what matches AB?
    >    **Worked solution and second check:** DC, so AB=DC by CPCTC. Check: first-third positions agree.
    >
    > 7. **Prompt:** AB=AC, B=3x+2,C=5x-16 degrees. Find x and the base angles.
    >    **Worked solution and second check:** 3x+2=5x-16 gives x=9 and both angles 29. Check: 27+2=45-16=29.
    >
    > 8. **Prompt:** Angle B=angle C in ABC. Prove AB=AC.
    >    **Worked solution and second check:** Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.
    >
    > 9. **Prompt:** Does AAA prove congruence?
    >    **Worked solution and second check:** No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.
    >
    > 10. **Prompt:** A proof cites CPCTC before congruence. Fix the ordering.
    >    **Worked solution and second check:** First give SAS/ASA facts, then conclude congruence, then use CPCTC. Check: CPCTC hypothesis is now established.
    >
    > Reteach links: items 1 to 2 → 4.1; 3 → 4.3; 4 → 4.4; 5 → 4.5; 6 → 4.6; 7 → 4.7; 8 → 4.8; 9 to 10 → criteria/proof order. For review items 11 to 16 use 4.10 to 4.13. Diagram specs reuse the named lesson SVG with givens only, then reveal conclusion marks. End with “What's confusing?”

## 4.10 SSS Proved from SAS
- Jacobs: Jacobs 4.6, pp. 163 to 168 (PDF pp. 183 to 188)
- Euclid source line: Jacobs 4.6, pp. 163 to 164, Theorem 11.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can follow and explain a proof of SSS using SAS and isosceles triangles, covering every case of where the joining segment falls.
  2. I can explain the plan of the SSS proof: build a SAS copy on the other side, then use two isosceles triangles.
  3. I can say why SSS is a theorem in this course, and why its proof may not use SSS.
- Hook: Rigid frames: a triangle of straws stays rigid but a square frame wobbles. Why? Students push on both.
- Misconception and how to surface it: SSS is a postulate (it is a theorem in this course). Surface it: ask what SSS was proved from (SAS plus isosceles theorems, p. 164).
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.6, pp. 163 to 164, Theorem 11.
  2. Get started: the frame demo. 'Is a triangle rigid because of a rule we assumed, or one we can prove?'
  3. The big idea: SSS is proved from SAS and the isosceles theorems. In this course it is a theorem, not a postulate.
  4. Worked example 1: the SSS proof, main case only (CG crosses AB between A and B), one row per reveal. The exterior and endpoint cases move to the 4.15 Proof clinic; the kite example moves to 4.14.
  5. Try it: the main-case figure with C draggable only while CG still crosses inside AB; a note says the other cases are in 4.15.
  6. Common mistake: a proof that covers only the interior case. Learner names the missing cases.
  7. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  8. Check yourself.
  9. Exit ticket.
- Exit ticket: (1) Which earlier theorems does the SSS proof use? (2) Why does a triangle frame not wobble? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Proof of SSS, main case (adapted from Theorem 11, Jacobs p. 164).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Goal: triangle ABC ≅ triangle DEF, where AB = DE, BC = EF and CA = FD. | Given. |
    | On the other side of AB from C, build triangle ABG ≅ triangle DEF, so AC = AG and BC = BG. | Copy angle D at A and mark AG = DF, then use SAS. |
    | Draw CG. In this case, CG crosses AB between A and B. | The main case, taught today. |
    | Triangles ACG and BCG are isosceles. | AC = AG and BC = BG. |
    | Their base angles at C and G are equal. Add the two pairs: angle ACB = angle AGB. | Theorem 9, then angle addition. |
    | Triangle ABC ≅ triangle ABG. | SAS: AC = AG, angle C = angle G, BC = BG. |
    | Triangle ABG ≅ triangle DEF, so triangle ABC ≅ triangle DEF. | Two triangles congruent to the same triangle are congruent to each other. |
  - Practice:
    1. Two triangles both have sides 3, 4 and 5. Are they congruent?
       - Reveal 1 (worked solution): Yes, by SSS.
       - Reveal 2 (second check): A flip may change which way it faces, but not the lengths.
    2. Can the SSS proof use SSS for its helper triangles?
       - Reveal 1 (worked solution): No. It uses the isosceles base-angle theorem, which came from SAS.
       - Reveal 2 (second check): Nothing in the proof leans on SSS itself.
  - Common mistake: SSS is a theorem in this course, not an assumption. A complete proof also covers the other two cases (see 4.15).
  - Moved out: The exterior and endpoint cases of Worked example 1 go to 4.15 Review (Proof clinic slide). Worked example 2 (the kite) and Practice 2 go to 4.14 as Worked example 3 and Practice 4.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Three corresponding sides determine congruence. In Jacobs this is Theorem 11, not a postulate. Other axiom systems may postulate SSS, so the correction is course-specific.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted from Theorem 11 proof, p. 164, with full case coverage added. Align AB of ABC with an equal side of a SAS-constructed triangle ABG on the opposite side of AB from C. Let AC=AG and BC=BG. If A,C,G or B,C,G are collinear, the other isosceles triangle supplies angle ACB=AGB directly. Otherwise ACG and BCG are isosceles. If line CG meets AB between A,B, ray CG splits both apex angles, so add equal isosceles base angles. If it meets outside AB, take differences instead. Thus angle ACB=AGB. AC=AG and BC=BG now give ABC≅ABG by SAS. Transitivity with the constructed copy proves SSS.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original SSS application. Quadrilateral ABCD has AB=AD and CB=CD. Shared AC=AC gives ABC≅ADC by SSS. Thus angle BAC=DAC and angle BCA=DCA by CPCTC. This proves AC bisects both named angles; perpendicular diagonal claims require an additional argument.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. 3,4,5 and 3,4,5: congruent? Yes, SSS. Second check: a reflection may change orientation but not these lengths.
    > 2. W2 AB=2x+1,AD=11: x? 5. Equal legs give 2x+1=11. Second check: 2(5)+1=11.
    > 3. Can SSS proof use SSS for the auxiliary triangles? No. Use isosceles base-angle equalities proved via SAS. Second check: dependency graph contains no edge back from SSS to itself.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > SSS is a theorem in this course. Do not call it an assumption, and do not cover only the interior joining-line case.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Three proof SVG panels with A=(-2,0),B=(2,0),C=(t,h),G=(t,-h),h>0: t=0 interior, t=4 exterior, t=2 endpoint. AC=AG,BC=BG. CG is vertical and meets AB or its extension at x=t. W2 kite with A=(0,4),B=(-3,0),C=(0,-2),D=(3,0).
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.11 Why SSA Fails
- Jacobs: Jacobs 4.6, pp. 163 to 168 (PDF pp. 183 to 188)
- Euclid source line: Jacobs 4.6, pp. 163 to 168, congruence-test context; counterexamples below are original.
- Current: 5 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can give a counterexample showing SSA is not a congruence test.
  2. I can build two different triangles from the same SSA data with compass and ruler.
  3. I can explain why SSA is not a congruence test even when the sides are long.
- Hook: Swinging door: fix side AB and the angle at A, then swing a fixed-length 'door' BC from B. It hits the ray in two places.
- Misconception and how to surface it: SSA works if the sides are long. Surface it: build two triangles from the same SSA data.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.6, pp. 163 to 168 (test context); counterexamples are Euclid's originals.
  2. Get started: 'Will this SSA recipe make one triangle or two?' Commit.
  3. The big idea: SSA can give two, one or no triangles, so it is not a test.
  4. Worked example 1 (learner layer): swinging-door compass arc from B meets the ray twice. No coordinates or sqrt(10) on any student screen.
  5. Worked example 2 (learner layer): the same picture twice as big; still two triangles.
  6. Try it: plan's sandbox. Slider for BC length shows 0, 1 or 2 intersections.
  7. Common mistake: 'SSA works if the sides are long.' Learner uses the doubled example.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself: replace the trig-based answer per Euclid.
  10. Exit ticket.
- Exit ticket: (1) Sketch SSA data that makes two triangles. (2) Does making every length bigger fix SSA? Why? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Swinging door: one SSA recipe, two triangles (student version of Euclid's example).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Draw a ray from A. Mark B above it so that AB = 5 and the angle at A is fixed. | These are the given side and angle. |
    | Open the compass to the given length BC. Put the point on B and swing an arc. | Every point on the arc is that distance from B. |
    | The arc hits the ray twice. Call the points C1 and C2. | A circle can cross a line in two places. |
    | Triangles ABC1 and ABC2 have the same angle A, the same AB, and the same BC. | Same ray, same side, same compass setting. |
    | But AC1 = 3 and AC2 = 5, so the triangles are not congruent. | Their third sides are different. |
    | So SSA is not a congruence test. | One counterexample is enough. |
  - Worked example 2:
    *Bigger doesn't fix it (student version).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Draw the same picture twice as big. AB is now 10, and the angle at A doesn't change. | The rays from A point the same way, so angle A is the same. |
    | The compass arc from B still hits the ray twice. | Same picture, just larger. |
    | The two third sides are still different. | So long sides don't rescue SSA. |
  - Practice:
    1. In Worked example 1, which angle is included between AB and BC?
       - Reveal 1 (worked solution): Angle ABC, not angle BAC.
       - Reveal 2 (second check): The two sides share the point B.
    2. Do the two triangles in Worked example 1 have the same angle A?
       - Reveal 1 (worked solution): Yes. Both use ray AB and the same ray from A.
       - Reveal 2 (second check): The two rays are exactly the same in both triangles.
    3. Why does AC1 = 3 and AC2 = 5 prove the triangles are not congruent?
       - Reveal 1 (worked solution): The other two sides match, but the third sides differ.
       - Reveal 2 (second check): One triangle has sides 3, BC and 5 (all different). The other has sides 5, BC and 5, so it is isosceles.
  - Common mistake: SSA sometimes gives one triangle, but not always, so it is never a test. If the arc just touches the ray, you get one right triangle (we prove lengths for that later).
  - Builder-only: Euclid's coordinate version (A = (0,0), B = (4,3), circle radius sqrt(10)) and the doubled-coordinate version stay builder-only, for checking the diagram. Students never see coordinates or sqrt(10) in 4.11.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > SSA does not guarantee congruence for all triangles. Some SSA data determine one triangle, some two and some none. Show two noncongruent triangles for one fixed data set. No trig or Pythagoras is available yet as a student proof.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original exact coordinate certificate for builder verification; student-facing version uses compass intersections. A=(0,0),B=(4,3); ray AC is positive x-axis. Fix AB=5 and BC=sqrt(10). The circle (x-4)²+(y-3)²=10 meets y=0 where (x-4)²=1,so C1=(3,0),C2=(5,0). Both ABC1,ABC2 have the same angle A because AC1,AC2 are the same ray; AB=5 and BC=sqrt(10) match. But AC1=3 and AC2=5, so the triangles are not congruent. Algebraic distance computation is a backend check, not a proof to assign before Pythagoras.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original scaling counterexample. Double every coordinate above. A=(0,0),B=(8,6),C1=(6,0),C2=(10,0). AB=10,BC=sqrt(40), and angle A is unchanged. The two third sides remain different. Thus making the given sides long does not repair SSA.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. For W1 name the included angle of AB and BC. Angle ABC, not angle BAC. Second check: the common side endpoint is B.
    > 2. Do W1 triangles have equal angle A? Yes, both use identical rays AB and positive x-axis. Second check: unit direction vectors of the rays coincide.
    > 3. Why do unequal AC values prove noncongruence here? The other two sides match with fixed labels, and the third side differs. Even without correspondence their side multisets {3,sqrt(10),5} and {5,sqrt(10),5} differ. Second check: first is scalene, second is isosceles.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > SSA sometimes fixes a triangle, but is not a universal criterion. Replace current trig-based check answer with: a circle tangent to the ray at the perpendicular foot gives one right triangle; numerical length proof is deferred.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Use A=(0,0),B=(4,3),C1=(3,0),C2=(5,0), uniform scale. Draw full radius-sqrt(10) circle at B, label two intersections distinctly, angle arc at A shared. For W2 draw doubled copy at same screen scale or label scale factor. Reject tangent/no-intersection cases if UI says two triangles.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.12 Constructing Congruent Triangles
- Jacobs: Jacobs 4.7, pp. 169 to 175 (PDF pp. 189 to 195)
- Euclid source line: Jacobs 4.7, pp. 170 to 171, Constructions 3 to 5.
- Current: 5 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can construct a congruent triangle and justify it with SSS or SAS.
  2. I can copy a triangle with compass and straightedge by SSS and by SAS.
  3. I can justify each copy by naming the three equalities and the test.
- Hook: Blueprint copy: each student gets a triangle and must make an exact copy for a partner across the room using only compass and straightedge. No rulers.
- Misconception and how to surface it: A construction is correct if it looks right. Surface it: name the congruence test behind each step.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.7, pp. 170 to 171, Constructions 3 to 5.
  2. Get started: 'How could you copy this without measuring?'
  3. The big idea: a compass carries lengths, so congruence tests become recipes.
  4. Worked example 1 (learner layer): SSS copy (Construction 5). The construction animates one arc per step, each with its reason.
  5. Worked example 2 (learner layer): SAS copy (Constructions 3 and 4), same reveal.
  6. Try it: construction interactive from the plan.
  7. Common mistake: copying with a ruler reading and calling it exact. Learner explains the difference.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) After copying AB, which two radii locate the third vertex? (2) Name the test that proves your copy is congruent. (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Copy a triangle by SSS (adapted from Construction 5, Jacobs p. 171).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Draw a ray and mark DE equal to AB. | Compass copy of a segment. |
    | Draw a circle centered at D with radius AC. | DF will equal AC. |
    | Draw a circle centered at E with radius BC. | EF will equal BC. |
    | Pick one crossing point and call it F. | Either one works. |
    | DE = AB, DF = AC, EF = BC, so triangle DEF ≅ triangle ABC. | SSS. The other crossing gives a flipped copy that is also congruent. |
  - Worked example 2:
    *Copy a triangle by SAS (adapted from Constructions 3 and 4, Jacobs p. 170).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Copy AB onto DE. | Compass copy of a segment. |
    | Copy angle BAC at D, on one side of DE. | Angle-copy construction. |
    | Mark DF = AC along the new ray. | Compass copy. |
    | DE = AB, DF = AC, angle EDF = angle BAC, so triangle DEF ≅ triangle ABC. | SAS. The angle copy itself works because of SSS. |
  - Practice:
    1. AB = 5, AC = 4, BC = 3. After DE = 5, what radii do you use?
       - Reveal 1 (worked solution): Radius 4 at D and radius 3 at E.
       - Reveal 2 (second check): Each radius is the side that touches that corner.
    2. Do the top and bottom crossing points give different triangles?
       - Reveal 1 (worked solution): No. Flipping across DE swaps them and keeps every length.
       - Reveal 2 (second check): SSS works for both.
    3. Can you mark a ruler reading instead of using the compass and still call it an exact construction?
       - Reveal 1 (worked solution): No. Measuring adds error and uses a different tool.
       - Reveal 2 (second check): Constructions copy lengths with the compass, not with numbers.
  - Common mistake: 'It looks equal' is not a reason. Name the three equal parts, then cite SSS or SAS.
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Copy lengths with compass; locate third vertex by intersections of two circles. SSS proves correctness, not drawing appearance. Keep both intersections until selecting a half-plane.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted from Construction 5, p. 171. Given triangle ABC, draw ray DE and copy AB to DE. Draw circle centered D radius AC and circle centered E radius BC. Select intersection F. Then DE=AB,DF=AC,EF=BC by the copied radii. Thus DEF≅ABC by SSS. Either intersection makes a reflected congruent copy.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted from Constructions 3 and 4, p. 170. To copy ABC by SAS, copy AB to DE, copy angle BAC at D on selected side of DE, then mark DF=AC along that new ray. Now DE=AB,DF=AC, angle EDF=BAC. SAS proves DEF≅ABC. Angle-copy correctness rests on SSS for the two radius-and-chord triangles.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. Given AB=5,AC=4,BC=3, which two radii after DE=5? D radius 4 and E radius 3. Second check: each radius matches the side incident to its corresponding endpoint.
    > 2. Are the upper and lower circle intersections different congruence classes? No. Reflection in DE interchanges them and preserves all lengths. Second check: SSS applies to both.
    > 3. Can you replace a compass copy by marking a ruler reading and call it exact compass-and-straightedge construction? No. A measured sketch introduces measurement error and a different tool. Second check: construction steps require radius transfer, not unit marks.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Looks equal is insufficient. Name the three equalities, then cite SSS or SAS.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > D=(0,0),E=(5,0), circles radii 4 and 3; F=(3.2,2.4), other intersection (3.2,-2.4). Dashed unused reflected solution. Stage diagrams keep center labels and radius connections. W2 copy a 40-degree included angle without a protractor icon.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.13 Justifying Earlier Constructions
- Jacobs: Jacobs 4.7, pp. 169 to 175 (PDF pp. 189 to 195)
- Euclid source line: Jacobs 4.6, pp. 163 to 168; 4.7, pp. 169 to 171.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can use congruent triangles to prove why bisector constructions work.
  2. I can prove the perpendicular-bisector construction works by SSS and then SAS.
  3. I can state when the construction circles fail to cross twice and why that breaks the proof.
- Hook: 'Why did that work?' Students redo the 2.5 bisector construction, then try a small radius on purpose and watch it fail.
- Misconception and how to surface it: Old constructions were already proved. Surface it: ask why the bisector construction from 2.5 works.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs 4.6, pp. 163 to 168; 4.7, pp. 169 to 171.
  2. Get started: the failed small-radius drawing. 'What went wrong?'
  3. The big idea: constructions are proved, not eyeballed. Name every point (define M) before using it.
  4. In class: Worked example 2, the angle-bisector proof (one SSS step), one row per reveal.
  5. Optional extension (collapsed by default, labeled Optional): Worked example 1, the three-stage perpendicular-bisector proof.
  6. Try it: radius slider showing 0, 1 or 2 crossings, with the proof steps graying out when they no longer apply.
  7. Common mistake: a proof that uses M without defining it. Learner adds the definition line.
  8. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  9. Check yourself.
  10. Exit ticket.
- Exit ticket: (1) Segment length 12. Give a radius that works and one that fails. (2) Which test proves the angle-bisector construction? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1 (OPTIONAL EXTENSION):
    *Optional extension: the perpendicular bisector construction, proved in three stages.* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Circles of the same radius at A and B cross at P and Q, on opposite sides of AB. Let M be the point where PQ meets AB. | Define M before using it. |
    | AP = BP, AQ = BQ, PQ = PQ, so triangle APQ ≅ triangle BPQ. | SSS. |
    | So angle APM = angle BPM. | CPCTC, and PM lies along PQ. |
    | AP = BP and PM = PM, so triangle APM ≅ triangle BPM. | SAS. |
    | AM = BM, and angles AMP and BMP are equal. | CPCTC. |
    | Those two angles add to 180, so each is 90. PQ is the perpendicular bisector of AB. | Linear pair. |
  - Worked example 2:
    *In class: the angle bisector construction (adapted from Jacobs p. 171).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Mark U and V on the two rays of the angle so that OU = OV. | First compass step. |
    | Draw equal arcs from U and V that meet at X inside the angle. | Second compass step. |
    | OU = OV, UX = VX, OX = OX. | Compass settings and a shared side. |
    | Triangle OUX ≅ triangle OVX. | SSS. |
    | Angle UOX = angle VOX, so OX bisects the angle. | CPCTC. X must be inside the angle and not at O. |
  - Practice:
    1. AB = 10 and the radius is 4. Do the circles cross twice?
       - Reveal 1 (worked solution): No. 4 + 4 = 8, which is less than 10.
       - Reveal 2 (second check): The two circles can't reach each other.
    2. Why isn't radius 5 enough?
       - Reveal 1 (worked solution): The circles only touch once, at the midpoint, so there aren't two points to draw a line through.
       - Reveal 2 (second check): The radius has to be more than half of AB.
    3. In the angle bisector proof, what is the third SSS fact?
       - Reveal 1 (worked solution): OX = OX.
       - Reveal 2 (second check): The shared side is in both triangles.
  - Common mistake: A proof that uses M without saying what M is, is not finished. Define M as the point where PQ meets AB. The radius must be more than half of AB, not equal to it.
  - Optional: Worked example 1 (three-stage perpendicular bisector proof) is an optional extension. Class time goes to Worked example 2 (the angle bisector, one SSS step).
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Equal-radius intersections give SSS congruence. Name every auxiliary point and prove that the joining line meets the segment between its endpoints. For two equal-radius circle intersections P,Q, the symmetric opposite-side intersections guarantee this.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original expanded bisector proof. Equal-radius circles centered A,B intersect in P,Q on opposite sides of AB; let M=PQ∩AB. AP=BP,AQ=BQ,PQ=PQ,so APQ≅BPQ by SSS. Their equal angles APQ,BPQ imply APM=BPM because PM is ray PQ. AP=BP and PM=PM now give APM≅BPM by SAS. Hence AM=BM and AMP=BMP. These adjacent angles sum to 180 degrees, so each is 90. Thus PQ is perpendicular bisector of AB.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted angle-copy justification, p. 171, also usable for angle bisection. For bisection, mark U,V on the angle rays with OU=OV. Draw equal-radius arcs centered U,V meeting at interior X. OU=OV,UX=VX,OX=OX give OUX≅OVX by SSS. CPCTC gives UOX=VOX, so interior ray OX is the angle bisector. Require X not O and strictly inside the angle.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. AB=10 and construction radius 4: two crossings? No, since 2r<AB. Second check: centers distance 10 exceeds diameter sum 8.
    > 2. Radius 5: why not enough? Circles touch once at midpoint, so there are not two distinct P,Q to define a line. Second check: height sqrt(25-25)=0 is a backend coordinate check only.
    > 3. Which third SSS fact in angle-bisector proof? OX=OX, reflexivity. Second check: the shared side appears in both triangles, unlike an unproved angle equality.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > An undefined M makes a proof incomplete. Define M=PQ∩AB and state P,Q are on opposite sides. Strictly greater than half is needed, not greater than or equal.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > A=(-5,0),B=(5,0), radius 6, P=(0,sqrt(11)),Q=(0,-sqrt(11)),M=(0,0). Add M label before any proof mentions it. W2 rays at 0 and 70 degrees, U,V at radius 4, choose X on interior angle bisector farther than O. Wrong-case SVG uses tangent circles with just one crossing.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.14 Mixed Proof Practice
- Jacobs: Jacobs 4R, pp. 176 to 180 (PDF pp. 196 to 200)
- Euclid source line: Jacobs Chapter 4 Summary and Review, pp. 176 to 180; original review items.
- Current: 4 slides (one Key idea paragraph, one figure, one Check yourself). No Jacobs page refs, no worked examples from the book, no practice set, no exit ticket.
- Learning goals:
  1. I can choose a strategy for a congruence proof.
  2. I can choose the shortest valid route: a direct angle theorem when it is enough, and SSS, SAS or ASA only when it is needed.
  3. I can reject a proof whose premises are SSA.
- Hook: Proof menu: four diagrams, four routes (vertical angles, SAS, ASA, SSS). Teams match each diagram to its fastest route before proving anything.
- Misconception and how to surface it: Every proof needs triangles congruent first. Surface it: a proof solvable by vertical angles alone.
- Slide list (text only, black and white line art; subpages allowed):
  1. Title and target. Jacobs Ch 4 Summary and Review, pp. 176 to 180.
  2. Get started: the menu match.
  3. The big idea: not every proof needs congruent triangles.
  4. Worked example 1 (learner layer): quadrilateral diagonal by SSS, row by row.
  5. Worked example 2 (learner layer): vertical angles only, step by step.
  6. Worked example 3 (moved from 4.10): kite diagonal by SSS, then CPCTC.
  7. Try it: proof builder with a 'choose your test' step first.
  8. Common mistake: a student forces SSS with only two sides known. Learner identifies it as SSA.
  9. Practice: one item per subpage. Reveal 1 shows the worked solution; Reveal 2 shows the second check.
  10. Check yourself.
  11. Exit ticket.
- Exit ticket: (1) Name the fastest route for one diagram from today and why. (2) What is missing when you only have SSA? (3) What's confusing?
- **Learner layer** (Socrates; student-facing, 9th to 10th grade reading level; same math and values as the builder layer):
  - Worked example 1:
    *Diagonal of a quadrilateral, by SSS (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | In quadrilateral ABCD, AB = CD and BC = DA. Draw diagonal AC. | Given, plus a helper segment. |
    | AC = CA. | A segment equals itself. |
    | Triangle ABC ≅ triangle CDA. | SSS. A matches C, B matches D, C matches A. |
    | Angle ABC = angle CDA. | CPCTC. No parallel lines assumed. |
  - Worked example 2:
    *Vertical angles only (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Lines AB and CD cross at O. Angle AOC = (3x + 4) degrees and angle BOD = (5x - 20) degrees. | Given. |
    | 3x + 4 = 5x - 20. | Vertical angles are equal. |
    | x = 12, so both angles are 40 degrees. | Solve and substitute. |
    | No triangles needed. | Pick the shortest route. |
  - Worked example 3 (moved from 4.10):
    *Worked example 3, moved from 4.10: the kite (original).* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Quadrilateral ABCD has AB = AD and CB = CD. | Given. |
    | AC = AC. | A segment equals itself. |
    | Triangle ABC ≅ triangle ADC. | SSS. |
    | Angle BAC = angle DAC and angle BCA = angle DCA. | CPCTC. So AC bisects both angles. Saying the diagonals are perpendicular would need more proof. |
  - Practice:
    1. In Worked example 1, which shared side gives the third equal pair?
       - Reveal 1 (worked solution): AC = CA.
       - Reveal 2 (second check): The same segment, named in the other order.
    2. In Worked example 2, what is the angle next to the 40 degree angle?
       - Reveal 1 (worked solution): 140 degrees, because a linear pair adds to 180.
       - Reveal 2 (second check): 40 + 140 = 180.
    3. Two sides and a non-included angle match. Can you use SSS?
       - Reveal 1 (worked solution): No. The third side is not known.
       - Reveal 2 (second check): That is SSA, and 4.11 showed SSA can fail.
    4. (Moved from 4.10) in the kite, AB = 2x + 1 and AD = 11. Find x.
       - Reveal 1 (worked solution): The equal sides give 2x + 1 = 11, so x = 5.
       - Reveal 2 (second check): Plug in: 2(5) + 1 = 11.
  - Common mistake: Not every proof needs congruent triangles. Vertical angles alone solve Worked example 2.
  - Moved in: From 4.10: Worked example 3 (the kite, SSS then CPCTC) and Practice 4 (AB = 2x + 1, AD = 11).
- **Builder and answer-key layer** (Euclid; not shown to students):
- Precise math *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Choose a direct angle theorem if it suffices. Use SAS,ASA,SSS only with their full hypotheses; finish with CPCTC only when necessary.
- Worked example 1 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original mixed proof. Given AB=CD,BC=DA in simple quadrilateral ABCD, draw AC. AC=CA by reflexivity, so ABC≅CDA by SSS. CPCTC gives angle ABC=CDA. The ordering is A↔C,B↔D,C↔A. No parallel lines have been assumed.
- Worked example 2 *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original direct-angle proof. Lines AB and CD cross at O. Given angle AOC=(3x+4) degrees and BOD=(5x-20) degrees. Vertical angles are equal, so 3x+4=5x-20,x=12. Both angles are 40 degrees. No triangle congruence is needed.
- Practice and answer key *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. W1 which shared side gives third equality? AC=CA by reflexivity. Second check: same endpoints, opposite order.
    > 2. W2 adjacent angle? 140 degrees, because linear pair sum 180 and 180-40=140. Second check: 40+140=180.
    > 3. Triangles have just two equal sides and a nonincluded equal angle. Can you choose SSS? No, third side is not established. Second check: SSA counterexample satisfies exactly these incomplete premises.
- Common-mistake correction *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Not every proof is a triangle-congruence proof. Vertical angles already solve W2.
- Diagram specs for Leo *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > W1 draw convex quadrilateral with unequal adjacent sides, opposite-side tick pairs and AC diagonal. W2 crossing lines with A,O,B collinear and C,O,D collinear, opposite angles labeled 3x+4 and 5x-20.
- Interactive acceptance *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Drag only free parameters while preserving every stated constraint. Do not infer a theorem from rounded measurements. Show undefined for coincident vertices or collinear triangles, not a false equality. A rigid-motion animation must preserve all pairwise distances and vertex correspondence.
- 4.10 Worked example 2 (kite), moved here *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Original SSS application. Quadrilateral ABCD has AB=AD and CB=CD. Shared AC=AC gives ABC≅ADC by SSS. Thus angle BAC=DAC and angle BCA=DCA by CPCTC. This proves AC bisects both named angles; perpendicular diagonal claims require an additional argument.
- 4.10 Practice (item 2 moved here) *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > 1. 3,4,5 and 3,4,5: congruent? Yes, SSS. Second check: a reflection may change orientation but not these lengths.
    > 2. W2 AB=2x+1,AD=11: x? 5. Equal legs give 2x+1=11. Second check: 2(5)+1=11.
    > 3. Can SSS proof use SSS for the auxiliary triangles? No. Use isosceles base-angle equalities proved via SAS. Second check: dependency graph contains no edge back from SSS to itself.
- Acceptance: every book-derived item cites a Jacobs page; worked examples reveal one step at a time with a reason per step; no practice without a worked solution; exit ticket ends with "What's confusing?"; no em dashes; renders at 1280 and 844 with no overlap; Euclid signs off math, Socrates signs off pedagogy.

## 4.15 Review
- Current: 7 slides (auto-generated from other lessons' checks).
- Build: 'What to know' list keyed to Jacobs section numbers; a mixed practice set of 12 to 20 items, each with a worked-solution reveal; a 'Common traps' slide that reuses each lesson's misconception line; for Review days, Jacobs' chapter Summary and Review pages as the item source (cite pages); for Assessment and Exam days, printable form A and form B with answer keys.
- Learner layer (Socrates, student-facing prompts; answers are in the builder layer below):
    1. Triangle ABC ≅ triangle PQR. Which side matches CA?
    2. Triangle ABC ≅ triangle DEF, BC = 2x + 3 and EF = 15. Find x.
    3. AB = DE, AC = DF and angle A = angle D. Which test?
    4. Angle A = angle D, angle B = angle E and AB = DE. Which test?
    5. Two segments AD and BC cross at M, and M is the midpoint of both. Prove triangle AMB ≅ triangle DMC.
    6. Once triangle AMB ≅ triangle DMC, which side matches AB?
    7. AB = AC, angle B = (3x + 2) degrees and angle C = (5x - 16) degrees. Find x and the base angles.
    8. In triangle ABC, angle B = angle C. Prove AB = AC.
    9. Does matching all three angles (AAA) prove two triangles congruent?
    10. A proof uses CPCTC before it proves the triangles congruent. Fix the order.
    11. In ABCD, AB = AD and BC = DC. Prove AC bisects angle BAD.
    12. Three pairs of equal sides are given, and no angles. Can you use SAS right away?
    13. Circles centered at D and E are 5 apart, with radii 4 and 3. Why do both crossing points copy the same triangle?
    14. Circles of the same radius at A and B cross at P and Q. What must you define before you talk about M?
    15. AB = 10 and the radius is 5. Can the crossing points give a perpendicular bisector?
    16. Use the swinging-door picture from 4.11 (AB = 5, the same angle at A, AC1 = 3 and AC2 = 5). Explain why SSA fails, without trig.
- Proof clinic slide (moved from 4.10), learner layer:
    *Proof clinic, moved from 4.10: the other two SSS cases.* Reveal one row per tap:

    | Step | Reason |
    |---|---|
    | Case 2: CG meets line AB outside segment AB. | Same setup as the 4.10 proof. |
    | Subtract the equal base angles instead of adding them. You still get angle ACB = angle AGB. | Theorem 9, then angle subtraction. |
    | Case 3: CG passes through A or B, so A, C, G (or B, C, G) are on one line. | Only one isosceles triangle remains. |
    | That one isosceles triangle gives angle ACB = angle AGB directly. | Theorem 9. |
    | In every case, SAS finishes the proof. | So SSS holds for all triangles. |
- Proof clinic, builder layer (4.10 Worked example 1, all cases) *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)*:

    > Adapted from Theorem 11 proof, p. 164, with full case coverage added. Align AB of ABC with an equal side of a SAS-constructed triangle ABG on the opposite side of AB from C. Let AC=AG and BC=BG. If A,C,G or B,C,G are collinear, the other isosceles triangle supplies angle ACB=AGB directly. Otherwise ACG and BCG are isosceles. If line CG meets AB between A,B, ray CG splits both apex angles, so add equal isosceles base angles. If it meets outside AB, take differences instead. Thus angle ACB=AGB. AC=AG and BC=BG now give ABC≅ABG by SAS. Transitivity with the constructed copy proves SSS.
- Builder and answer-key layer, item bank *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)* (not shown to students):

    > Original aligned item bank. Source scope: Jacobs 4.2 to 4.5 for quiz, Chapter 4 Summary and Review pp. 176 to 180 for review. No claim that these are verbatim book items.
    >
    > 1. **Prompt:** ABC≅PQR. Which side matches CA?
    >    **Worked solution and second check:** RP, by C↔R,A↔P. Check: third-first positions match.
    >
    > 2. **Prompt:** ABC≅DEF,BC=2x+3,EF=15. Find x.
    >    **Worked solution and second check:** 2x+3=15,2x=12,x=6. Check: 2(6)+3=15.
    >
    > 3. **Prompt:** AB=DE,AC=DF,A=D. Name the test.
    >    **Worked solution and second check:** SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.
    >
    > 4. **Prompt:** A=D,B=E,AB=DE. Name the test.
    >    **Worked solution and second check:** ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.
    >
    > 5. **Prompt:** Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
    >    **Worked solution and second check:** AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.
    >
    > 6. **Prompt:** Once AMB≅DMC, what matches AB?
    >    **Worked solution and second check:** DC, so AB=DC by CPCTC. Check: first-third positions agree.
    >
    > 7. **Prompt:** AB=AC, B=3x+2,C=5x-16 degrees. Find x and the base angles.
    >    **Worked solution and second check:** 3x+2=5x-16 gives x=9 and both angles 29. Check: 27+2=45-16=29.
    >
    > 8. **Prompt:** Angle B=angle C in ABC. Prove AB=AC.
    >    **Worked solution and second check:** Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.
    >
    > 9. **Prompt:** Does AAA prove congruence?
    >    **Worked solution and second check:** No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.
    >
    > 10. **Prompt:** A proof cites CPCTC before congruence. Fix the ordering.
    >    **Worked solution and second check:** First give SAS/ASA facts, then conclude congruence, then use CPCTC. Check: CPCTC hypothesis is now established.
    >
    > 11. **Prompt:** AB=AD,BC=DC in ABCD. Prove AC bisects angle BAD.
    >    **Worked solution and second check:** AB=AD,BC=DC,AC=AC imply ABC≅ADC by SSS; BAC=DAC by CPCTC. Check: A↔A,B↔D,C↔C is the ordered match.
    >
    > 12. **Prompt:** Three equal side pairs are given, no angles. Is SAS immediate?
    >    **Worked solution and second check:** No. Use SSS. Check: SAS requires an included-angle equality not among the givens.
    >
    > 13. **Prompt:** Circle centers D,E are 5 apart; radii 4,3. Why do both intersections copy the same triangle?
    >    **Worked solution and second check:** Both give DF=4,EF=3,DE=5; SSS proves congruence. Check: reflection in DE exchanges intersections.
    >
    > 14. **Prompt:** Equal-radius circles at A,B meet at P,Q. What must be defined before referring to M?
    >    **Worked solution and second check:** M=PQ∩AB. With P,Q opposite sides and common radius>AB/2,M lies between A,B. Check: coordinate midpoint model yields M on both lines.
    >
    > 15. **Prompt:** AB=10,r=5. Can two crossing points define a perpendicular bisector?
    >    **Worked solution and second check:** No. Tangency yields one point. Check: radius must strictly exceed half of 10.
    >
    > 16. **Prompt:** A=(0,0),B=(4,3),C1=(3,0),C2=(5,0). State the SSA failure without trig.
    >    **Worked solution and second check:** Same rays give equal angle A,AB common,and circle centered B through both C vertices gives BC1=BC2. But AC1=3≠5=AC2. Check: side multisets differ.
    >
    > Reteach links: items 1 to 2 → 4.1; 3 → 4.3; 4 → 4.4; 5 → 4.5; 6 → 4.6; 7 → 4.7; 8 → 4.8; 9 to 10 → criteria/proof order. For review items 11 to 16 use 4.10 to 4.13. Diagram specs reuse the named lesson SVG with givens only, then reveal conclusion marks. End with “What's confusing?”

## 4.16 Unit 4 Assessment
- Current: 7 slides (auto-generated from other lessons' checks).
- Build: 'What to know' list keyed to Jacobs section numbers; a mixed practice set of 12 to 20 items, each with a worked-solution reveal; a 'Common traps' slide that reuses each lesson's misconception line; for Review days, Jacobs' chapter Summary and Review pages as the item source (cite pages); for Assessment and Exam days, printable form A and form B with answer keys.
- Learner layer (Socrates, student-facing prompts; answers are in the builder layer below):
  - Form A:
    1. Triangle ABC ≅ triangle PQR. Which side matches CA?
    2. Triangle ABC ≅ triangle DEF, BC = 2x + 3 and EF = 15. Find x.
    3. AB = DE, AC = DF and angle A = angle D. Which test?
    4. Angle A = angle D, angle B = angle E and AB = DE. Which test?
    5. Two segments AD and BC cross at M, and M is the midpoint of both. Prove triangle AMB ≅ triangle DMC.
    6. Once triangle AMB ≅ triangle DMC, which side matches AB?
    7. AB = AC, angle B = (3x + 2) degrees and angle C = (5x - 16) degrees. Find x and the base angles.
    8. In triangle ABC, angle B = angle C. Prove AB = AC.
    9. Does matching all three angles (AAA) prove two triangles congruent?
    10. A proof uses CPCTC before it proves the triangles congruent. Fix the order.
    11. In ABCD, AB = AD and BC = DC. Prove AC bisects angle BAD.
    12. Three pairs of equal sides are given, and no angles. Can you use SAS right away?
  - Form B:
    1. Triangle ABC ≅ triangle PQR. Which side matches CA?
    2. Triangle ABC ≅ triangle DEF, BC = 3x - 2 and EF = 19. Find x.
    3. Angle A = angle D, angle B = angle E and AB = DE. Which test?
    4. AB = DE, AC = DF and angle A = angle D. Which test?
    5. In triangle ABC, angle B = angle C. Prove AB = AC.
    6. Two segments AD and BC cross at M, and M is the midpoint of both. Prove triangle AMB ≅ triangle DMC.
    7. AB = AC, angle B = (4x - 3) degrees and angle C = (2x + 13) degrees. Find x and the base angles.
    8. Does matching all three angles (AAA) prove two triangles congruent?
    9. In ABCD, AB = AD and BC = DC. Prove AC bisects angle BAD.
    10. Circles centered at D and E are 5 apart, with radii 4 and 3. Why do both crossing points copy the same triangle?
    11. AB = 10 and the radius is 5. Can the crossing points give a perpendicular bisector?
    12. Use the swinging-door picture from 4.11 (AB = 5, the same angle at A, AC1 = 3 and AC2 = 5). Explain why SSA fails, without trig.
- Builder and answer-key layer, item bank *(Math by Euclid, /workspace/geometry/math/UNIT04-FILL.md)* (not shown to students):

    > Original assessment forms, 12 items each. Teacher answer keys below are separate from learner printable forms. Source scope: Jacobs 4.2 to 4.7, pp. 139 to 175, review pp. 176 to 180. A renderer must make the printable forms; no PDF file is being claimed as delivered. Each keyed solution is sufficient for a reveal copy after assessment.
    >
    > ### Form A
    >
    > 1. ABC≅PQR. Which side matches CA?
    >    Key: RP, by C↔R,A↔P. Check: third-first positions match.
    >
    > 2. ABC≅DEF,BC=2x+3,EF=15. Find x.
    >    Key: 2x+3=15,2x=12,x=6. Check: 2(6)+3=15.
    >
    > 3. AB=DE,AC=DF,A=D. Name the test.
    >    Key: SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.
    >
    > 4. A=D,B=E,AB=DE. Name the test.
    >    Key: ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.
    >
    > 5. Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
    >    Key: AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.
    >
    > 6. Once AMB≅DMC, what matches AB?
    >    Key: DC, so AB=DC by CPCTC. Check: first-third positions agree.
    >
    > 7. AB=AC, B=3x+2,C=5x-16 degrees. Find x and the base angles.
    >    Key: 3x+2=5x-16 gives x=9 and both angles 29. Check: 27+2=45-16=29.
    >
    > 8. Angle B=angle C in ABC. Prove AB=AC.
    >    Key: Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.
    >
    > 9. Does AAA prove congruence?
    >    Key: No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.
    >
    > 10. A proof cites CPCTC before congruence. Fix the ordering.
    >    Key: First give SAS/ASA facts, then conclude congruence, then use CPCTC. Check: CPCTC hypothesis is now established.
    >
    > 11. AB=AD,BC=DC in ABCD. Prove AC bisects angle BAD.
    >    Key: AB=AD,BC=DC,AC=AC imply ABC≅ADC by SSS; BAC=DAC by CPCTC. Check: A↔A,B↔D,C↔C is the ordered match.
    >
    > 12. Three equal side pairs are given, no angles. Is SAS immediate?
    >    Key: No. Use SSS. Check: SAS requires an included-angle equality not among the givens.
    >
    > ### Form B
    >
    > 1. ABC≅PQR. Which side matches CA?
    >    Key: RP, by C↔R,A↔P. Check: third-first positions match.
    >
    > 2. ABC≅DEF,BC=3x-2,EF=19. Find x.
    >    Key: 3x-2=19,3x=21,x=7. Check: 21-2=19.
    >
    > 3. A=D,B=E,AB=DE. Name the test.
    >    Key: ASA, since AB,DE join the given-angle vertices. Check: two endpoint rays have one intersection.
    >
    > 4. AB=DE,AC=DF,A=D. Name the test.
    >    Key: SAS, since A,D are between the given sides. Check: ray-alignment motion fixes both endpoints.
    >
    > 5. Angle B=angle C in ABC. Prove AB=AC.
    >    Key: Compare ABC with ACB; B=C,C=B,BC=CB imply ASA,then AB=AC by CPCTC. Check: all used results precede SSS.
    >
    > 6. Two lines cross at M; M bisects AD,BC. Prove AMB≅DMC.
    >    Key: AM=DM,BM=CM by midpoint; AMB=DMC by vertical angles; SAS. Check: A↔D,M↔M,B↔C makes all three facts corresponding.
    >
    > 7. AB=AC,B=4x-3,C=2x+13 degrees. Find x and base angles.
    >    Key: 4x-3=2x+13,2x=16,x=8; both 29. Check: 32-3=16+13=29.
    >
    > 8. Does AAA prove congruence?
    >    Key: No. Side-2 and side-5 equilateral triangles have matching angles but unequal sides. Check: isometries cannot map length 2 to 5.
    >
    > 9. AB=AD,BC=DC in ABCD. Prove AC bisects angle BAD.
    >    Key: AB=AD,BC=DC,AC=AC imply ABC≅ADC by SSS; BAC=DAC by CPCTC. Check: A↔A,B↔D,C↔C is the ordered match.
    >
    > 10. Circle centers D,E are 5 apart; radii 4,3. Why do both intersections copy the same triangle?
    >    Key: Both give DF=4,EF=3,DE=5; SSS proves congruence. Check: reflection in DE exchanges intersections.
    >
    > 11. AB=10,r=5. Can two crossing points define a perpendicular bisector?
    >    Key: No. Tangency yields one point. Check: radius must strictly exceed half of 10.
    >
    > 12. A=(0,0),B=(4,3),C1=(3,0),C2=(5,0). State the SSA failure without trig.
    >    Key: Same rays give equal angle A,AB common,and circle centered B through both C vertices gives BC1=BC2. But AC1=3≠5=AC2. Check: side multisets differ.
    >
    > ### Assessment acceptance
    > Form A and B each contain 12 fully keyed items. At least two require proofs, not merely naming a test. For figure-based questions use the exact lesson diagram references above. The backend coordinate check in SSA keys must not become an assigned distance-formula calculation before Unit 7. Grade correspondence as well as criterion. Numeric items need equations and substitution checks, not just final x.
