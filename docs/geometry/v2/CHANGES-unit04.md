# Unit 4 changes for Euclid's verification (Socrates, 2026-11-07)

Scope: pedagogy and presentation only. Euclid's text in /workspace/geometry/math/UNIT04-FILL.md is quoted verbatim in SPEC-unit04.md as the **Builder and answer-key layer**. A script check (below) confirmed that every Euclid subsection appears there unchanged. The new **Learner layer** rewords the same math for students. No value, answer or proof step was changed on purpose. Please check the items marked VERIFY.

Source files (all generated through spec-src/gen.py):
- spec-src/learner_u04.py: learner wording (L per lesson, MOVED, BANK)
- spec-src/ovr_u04.py: goals, hooks, slide lists, exit tickets
- spec-src/check_u04.py: value check. Every number in the learner layer must appear in the matching Euclid section, or in the source section of a moved item. Result: PASS.

## Structural moves
1. **4.10 SSS.** Only the interior case (line CG crosses AB between A and B) is taught in class, as learner Worked example 1.
   - The exterior case and the collinear (endpoint) case are now the "Proof clinic" slide in **4.15 Review**. That slide has a learner version, and Euclid's full 4.10 Worked example 1 is quoted beside it as its builder layer.
   - 4.10 Worked example 2 (kite: AB = AD, CB = CD, SSS, then CPCTC) is now **4.14 Worked example 3**.
   - 4.10 Practice item 2 (kite, AB = 2x + 1, AD = 11, x = 5) is now **4.14 Practice 4**.
   - 4.10 keeps Practice items 1 and 3, so learners see 2 practice items there.
   - Euclid's 4.10 builder layer is still quoted whole in 4.10 for the answer key. The moved pieces are also quoted under 4.14.
2. **4.11 SSA.** Students see only a compass-arc ("swinging door") version.
   - It keeps AB = 5, AC1 = 3 and AC2 = 5. BC is called "the given length BC", with no value shown.
   - Worked example 2 becomes "the same picture twice as big" (AB = 10, the angle at A unchanged, still two triangles).
   - The coordinate version (A = (0,0), B = (4,3), radius sqrt(10)) and the doubled-coordinate version are builder-only.
   - Practice 3's second check is reworded from "side multisets differ" to "one triangle has three different sides; the other has two sides of 5, so it is isosceles". VERIFY that this matches {3, sqrt(10), 5} vs {5, sqrt(10), 5}.
3. **4.2 Worked example 1** is now an informal flashlight-beam version of the p. 146 airplane example. There is no half-plane or rigid-motion language, and it ends with "a conjecture, proved in 4.4".
   - Worked example 2 (AAA, sides 2 and 5) keeps its forward reference to the isosceles theorem.
   - VERIFY that "the angles match" in the learner version is acceptable before 4.7 and 4.8, since it cites those lessons as where it is shown.
4. **4.13.** Worked example 2 (angle bisector, one SSS step, then CPCTC) is the in-class proof.
   - Worked example 1 (perpendicular bisector: SSS, then SAS, then linear pair) is marked OPTIONAL EXTENSION, collapsed by default.
   - Practice items 1 and 2 (radius 4 and radius 5 with AB = 10) stay. They are about whether the circles cross, which the class still needs for the construction.
5. **Practice reveals.** On every regular Unit 4 lesson, Reveal 1 shows the worked solution and Reveal 2 shows Euclid's "second check".
6. **Quiz, review and forms (4.9, 4.15, 4.16).** These have learner prompts only, keyed Q1 to Q16 plus Form B variants B2 and B7. Keys stay in Euclid's builder layer.
   - Q16 and Form B item 12 replace the coordinate prompt with "Use the swinging-door picture from 4.11 (AB = 5, the same angle at A, AC1 = 3 and AC2 = 5)". VERIFY that this is equivalent for grading.
7. **Builder note** added to the Unit 4 header: a regular lesson runs about 12 to 14 screens counting subpages. The builder layer is never shown to students.

## Wording-level changes that touch math phrasing (VERIFY)
- 4.3 and 4.4: "rigid motions keep lengths and angles (Unit 3 postulates)" stands in for "rigid-motion existence and preservation assumptions". "Two different lines cross at most once" stands in for "distinct lines meet at most once".
- 4.7: "Every angle has a bisector (Protractor Postulate)". Euclid's interior-incidence remark is builder-only.
- 4.10 learner proof: the steps "build triangle ABG ≅ triangle DEF on the other side of AB by SAS (copy angle D at A, AG = DF)" and "two triangles congruent to the same triangle are congruent to each other" stand in for "SAS-constructed triangle ABG ... transitivity".
- 4.11 common mistake: "If the arc just touches the ray, you get one right triangle (we prove lengths for that later)" stands in for "a circle tangent to the ray at the perpendicular foot gives one right triangle; numerical length proof is deferred".
- 4.12 Practice 2's second check: "Flipping across DE swaps them" stands in for "reflection in DE interchanges them".
- 4.13 Practice 1: "4 + 4 = 8, which is less than 10" stands in for "2r < AB; diameter sum 8 < 10". Practice 2: "The radius has to be more than half of AB" stands in for the sqrt(25 - 25) = 0 backend check, which is now builder-only.

## Not changed
All values, answers, worked-solution logic, diagram coordinates (builder layer), and Euclid's corrections 1 to 9 at the top of SPEC-unit04.md.

## Open pedagogy note for Euclid
- The 4.9 quiz items 1 to 10 are the same as review items 1 to 10, and Forms A and B reuse them. Form B differs only in items 2 and 7 and in the order. Students would see test items in advance. Could you supply a fresh set of 10 quiz items and new Form B variants?
