# PopBoard Geometry: Expansion Spec (Socrates, pedagogy)

Date: 2026-11-07. Owner: Socrates (pedagogy, sequence, lesson wording). Math owner: Euclid. Builders: Leo (visuals), Turing (code).
Builds on: progression.md (the Jacobs-based plan made with Tesla), liberties.md, CURRENT-INVENTORY.md. Unit and lesson IDs are unchanged.
Source text: Harold R. Jacobs, *Geometry: Seeing, Doing, Understanding*, 3rd ed. (2003; My Father's World printing, 2016). Local PDF: /workspace/geometry/jacobs.pdf (Drive id 1CI7MYA4ddb4fOjUbzp-H3-t8PPLXWJo3, 804 PDF pages).
**Page offset: printed page = PDF page minus 20** (checked on PDF pp. 30, 60, 80, 254, 300, 351, 380, 620). All page numbers in these files are printed pages unless marked PDF.
Standards: 2023 Indiana Academic Standards for Geometry, fetched today from https://media.doe.in.gov/standards/indiana-academic-standards-geometry.pdf (copy: /workspace/geometry/in-geo.pdf). The 26 codes used in the plan (G.GF.1 to 7, G.T.1 to 7, G.QP.1 to 4, G.CI.1 to 3, G.TS.1 to 5) all appear in that document. No other codes are used.
Euclid status: Euclid's math lives in /workspace/geometry/math/ (UNIT04-FILL.md, ANSWERS.md, SCOPE.md, ERRATA.md, VERIFICATION.md). spec-src/gen.py reads /workspace/geometry/math/UNITnn-FILL.md for each unit when the file exists and quotes it, with attribution, in place of the math slots. Unit 4 is filled. Units without a fill file still read "EUCLID: math pending".
Style: black and white line art (Leo's geometry-line-art-2 and geometry-doodle-objects), text only, no narration.

## Files
| Unit | File | Lessons | Days |
|---|---|---|---|
| 1 Seeing and Reasoning | SPEC-unit01.md | 14 | 14 |
| 2 Lines, Angles, and Constructions | SPEC-unit02.md | 15 | 15 |
| 3 Rigid Motions and Symmetry | SPEC-unit03.md | 14 | 14 |
| 4 Triangle Congruence | SPEC-unit04.md | 16 | 16 |
| 5 Inequalities and Parallel Lines | SPEC-unit05.md | 17 | 17 |
| 6 Quadrilaterals and Polygons + Midterm | SPEC-unit06.md | 16 | 16 |
| 7 Area, Pythagoras, and Coordinates | SPEC-unit07.md | 14 | 14 |
| 8 Similarity and Dilations | SPEC-unit08.md | 16 | 16 |
| 9 Right Triangles and Trigonometry | SPEC-unit09.md | 15 | 15 |
| 10 Circles and Concurrence | SPEC-unit10.md | 16 | 16 |
| 11 Regular Polygons and Circle Measure | SPEC-unit11.md | 10 | 10 |
| 12 Solids and Design + Final | SPEC-unit12.md | 17 | 17 |
| Total | | 180 | 180 (S1: Units 1 to 6, 92 days; S2: Units 7 to 12, 88 days) |

Each unit file gives, per lesson: Jacobs section and pages (printed and PDF), any place the course departs from Jacobs, current slide count, 3 learning goals, hook, misconception and how to surface it, a 10-slide build list, worked-example and answer-key slots, interactive, diagram needs for Leo, and acceptance criteria. Review, quiz, assessment, exam, flex and project days have their own templates. Generator: spec-src/gen.py with the lesson-to-Jacobs map in spec-src/data.py (rerun after edits).

## 1. Curriculum shape (pedagogy decisions)
- The order follows progression.md: Jacobs' chapter order with three deliberate moves for Indiana. Ch 8 transformations move up to Unit 3, so congruence (G.T.2) and similarity (G.T.3, G.TS.2) can be defined by transformations. The distance formula (Jacobs 4.1, p. 132) moves after the Pythagorean Theorem (9.5, p. 365). Slope criteria (11.6, p. 461) move up to Unit 5 for G.GF.5.
- Every regular lesson follows the same arc: predict (hook), see it (big idea), watch it (2 worked examples from the book), do it (Try it), catch it (common mistake), practice (worked solutions only), check, exit ticket ending "What's confusing?".
- Beyond-Jacobs lessons, needed for Indiana: 2.3 coordinate midpoint, 5.5 hinge theorem (Supplement), 5.14 line equations, 6.6 kites, 6.8 and 7.10 to 7.12 coordinate proof, 8.7 partitioning, 8.11 angle bisector theorem (Supplement), 8.13 fractals, 12.9 composite solids. (11.8 radians is in Jacobs 14.6, p. 608.) These need Euclid-authored examples, because there is no book page to paraphrase.
- Jacobs material not yet used: 13.5 Ceva (p. 554), 16.2 to 16.4 Saccheri and Lobachevsky (pp. 696 to 712), 15 "Solid Geometry as a Deductive System" (pp. 626 to 627). I suggest Ceva as an optional slide in 10.14, and 16.2 to 16.4 as an optional enrichment page after 12.14.
- Assessment: a 10-item quiz and reteach mid-unit, then review and unit test (forms A and B). Exit tickets feed the next day's warm-up.

## 2. Gap comparison (current course vs. this spec)
Current state: origin/main 1603d7ec (2026-11-06 3:59 AM ET); live at https://popboard.us/study-geometry (HTTP 200). The live site has 180 lessons, but regular lessons have 4 to 5 slides and review days 2 to 7. liberties.md says the lesson text "was written from standard Geometry content" rather than from Jacobs: just 1 Jacobs mention across tools/geometry/content/*.mjs.
| Area | Now | Target |
|---|---|---|
| Book alignment | No Jacobs page refs | Every lesson cites Jacobs section and pages |
| Worked examples | 0 to 1 short example in the Key idea | 2 paraphrased Jacobs examples per lesson, each step with a reason |
| Practice | 1 Check yourself | 3 to 5 practice items with worked solutions, plus the check |
| Misconceptions | Unit-level list only in the plan | One per lesson, surfaced with a "find the error" slide |
| Exit ticket | None | 2 items plus "What's confusing?" |
| Interactives | 44 flagged in the plan (constructions, sandboxes) | Keep them, and add a Try it slide wherever a figure can be dragged |
| Review/assessment days | Auto-built from check questions, no new items | Item banks from Jacobs Summary and Review pages, printable forms A and B, answer keys |
| Midterm/Final | 2 slides each | Jacobs Midterm Review (pp. 330 to 336) and Final Review (pp. 718 to 727) as sources, plus forms |
| Diagrams | 1 figure per lesson | Editable SVG per worked example and per common-mistake slide |
| Standards chips | Only where the coverage section names the lesson | Unchanged; no new codes added |

## 3. Top 10 build priorities (do in this order)
1. **Lesson template v2 (Turing).** Add slide types to the lesson builder: worked-example (steps with reason column, reveal one step at a time), common-mistake (fictional work plus a "find the error" reveal), practice (item plus a solution reveal), exit-ticket (2 items plus a fixed "What's confusing?" line). Accept when one lesson renders all 10 slide types at 1280 and 844 and the content schema in tools/geometry/content accepts the new fields.
2. **Jacobs citation field (Turing).** Add a `jacobs: {section, pages}` field per lesson, shown as a small line on slide 1, filled from spec-src/data.py. Accept when all 141 regular lessons show it and it matches data.py.
3. **Pilot Unit 4, all 16 lessons (Socrates wording, Euclid math, Leo diagrams), in parallel with the 20 errata in section 6.** Unit 4 math is filled and its wording is hand-written (spec-src/ovr_u04.py). This is the proof-heavy core: SAS/ASA from rigid motions, SSS from SAS (Jacobs 4.6, p. 164), SSA failure. Accept when the unit passes Euclid math sign-off and Socrates pedagogy sign-off.
4. **Exit-ticket and "What's confusing?" on every regular lesson.** Accept when there are 141 of 141.
5. **Common-mistake slides from the per-lesson misconception lines in the unit files.** Accept when every regular lesson has one, with a reveal.
6. **Editable diagram kit pass (Leo).** Extend geo-fig-kit.js with figure parameters (vertex coordinates, marks, labels) so worked-example figures are data, not baked images. Accept when a figure can be changed by editing JSON and labels stay as live text.
7. **Units 1, 2, 5 worked examples and practice** (proof foundations, then parallels). Accept the same way as item 3.
8. **Review and assessment rebuild.** Draw items from each Jacobs chapter's Summary and Review pages (cited in the unit files), and add printable forms A and B with answer keys. Accept when every review day has 12 or more items, all with worked solutions.
9. **Units 7 to 12 worked examples and practice**, in course order.
10. **Beyond-Jacobs lessons** (list in section 1). Euclid writes the examples, Socrates writes the wording, and the lesson is labeled "Beyond the textbook" on slide 1.

## 4. Global acceptance rules
- No em dashes anywhere (code, copy, alt text).
- Cite Jacobs pages for anything taken from the book. Paraphrase worked examples, and keep any direct quote to a short excerpt.
- Never include a practice item whose solution is not worked out (Dimitry's rule).
- Graphics are editable SVG where possible. Black and white line art. Text only, no narration.
- No invented standards. Use only the 26 verified codes.
- Euclid signs off math and Socrates signs off pedagogy before merge.

## 5. Open questions and blockers
- Units 1 to 3 and 5 to 12 still wait on Euclid fill files.
- **Ch 15 numbering.** The book's running headers number Ch 15 as Lessons 1 to 9 (for example, "Lesson 6: Cylinders and Cones", p. 655; "Lesson 9: The Regular Polyhedra", p. 677), with "Solid Geometry as a Deductive System" (p. 626) unnumbered. geometry-course/jacobs-structure.md lists 10 lessons. These unit files use the book's numbering.
- Lesson end pages are taken to be the page before the next lesson starts. Chapter-final lesson starts came from OCR'd running headers (for example, 9.3 Triangles p. 351, 16.1 p. 690). Euclid or Turing should spot-check them against the PDF.
- Resolved with Euclid (ANSWERS.md): 5.5 hinge and 8.11 angle bisector theorem are labeled Supplement. 11.8 radians is core, cited to Jacobs 14.6, p. 608, ex. 26 to 30. 10.7 is taught as a corollary of the earlier circle-angle theorems. Unit 3 lesson 3.1 states the rigid-motion postulates before 3.12 and Unit 4 use them. The 11R range includes the Algebra Review (pp. 481 to 482).
- The current Check yourself answers need Euclid's errata pass (section 6) before they are reused.

<!-- ERRATA:BEGIN (generated by spec-src/gen.py from /workspace/geometry/math/ERRATA.md; do not edit by hand) -->
## 6. Errata for the live course (Euclid, /workspace/geometry/math/ERRATA.md)
Turing applies these to the live course as priority items, alongside the Unit 4 pilot (P0 first). The exact current text, the exact replacement and the Jacobs anchor for each are in ERRATA.md; apply the replacement verbatim and keep the anchor.

| ID | Priority and type | Location | Issue (short) |
|---|---|---|---|
| E01 | P1 precision | u01-l03, page/section 3 | Coincident lines share infinitely many points. |
| E02 | P1 precision | u01-l07, page/section 3 | A repeated point does not determine a unique line. |
| E03 | P1 precision | u02-l01, page/section 3 | Division by zero is undefined. |
| E04 | P1 false wording and order | u02-l12, page/section 3 | Stepping equal chords is not laying six radius lengths along the curved circumference. |
| E05 | P0 false symmetry | u03-l11, page/section 3 | Original vertex tips and first-generation outward tips are interchanged by a 60-degree rotation. |
| E06 | P1 incomplete proof | u04-l13, page/section 3 | M has never been introduced. |
| E07 | P1 underspecified given | u05-l12, page/section 2 | One length and one right angle leave infinitely many noncongruent right triangles. |
| E08 | P1 precision | u05-l13, page/section 3 | Identical lines have equal slopes but are not distinct parallel lines under the course definition. |
| E09 | P1 source adaptation inconsistency | u06-l06, page/section 3 | Course 6.1 explicitly uses inclusive trapezoid. |
| E10 | P1 notation direction | u08-l05, page/section 3 | The next answer on this lesson sets k=DE/AB=9/6, reversing the displayed preimage/image convention. |
| E11 | P1 proof dependence | u08-l03, page/section 3 | The invoked proportional-side similarity result is not yet proved, and the side-splitter proof later depends on these dilation properties. |
| E12 | P1 missing domain | u11-l07, page/section 3 | The unqualified subtraction is wrong for a major segment. |
| E13 | P1 missing slice qualification | u12-l02, page/section 3 | A vertical plane is tilted relative to the base yet produces a rectangle, not an ellipse. |
| E14 | P1 missing solid hypothesis | u12-l08, page/section 3 | A general oblique cone has no single constant slant height around its rim. |
| E15 | P1 convexity needed | u12-l11, page/section 3 | Without convexity, regular star polyhedra invalidate the literal five-only claim. |
| E16 | P1 arc qualification | u12-l14, page/section 3 | Longer arcs around the same great circle are not shortest, and antipodal points break uniqueness. |
| E17 | P1 model qualification | u12-l14, page/section 3 | “Every triangle” must exclude degenerate, self-intersecting and major-region conventions. |
| E18 | P1 false exact interactive claim | gx/u10.js, page/section inscribed | At arc=179 degrees the current code appends “AB is a diameter, so the angle is 90°.” The true angle is 89.5 degrees. |
| E19 | P1 wrong regime interactive | gx/u10.js, page/section secant | A vertex at distance r+6 is outside but is currently labeled on, and the inscribed-angle formula is substituted for an exterior secant formula. |
| E20 | P1 star domain interactive | gx/u06.js, page/section pentagon | At n=5,k=5 every edge joins a vertex to itself. |
<!-- ERRATA:END -->
