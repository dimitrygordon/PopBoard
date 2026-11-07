# Geometry template v2 and errata

## Scope and hold

The Unit 4 content build was put on hold at 2:03 AM ET on November 7, 2026. Socrates is revising 4.10 into a two-day lesson, and Euclid is replacing the quiz and both assessment forms. Do not activate the draft pilot or treat its old forms as approved. No merge is authorized by this PR. Final math and pedagogy stamps from Euclid and Socrates are still required.

Work already completed before the hold is preserved in `tools/geometry/drafts/`, the source snapshots in `tools/geometry/spec-src/`, and this directory. The Unit 4 diagram handoff was already drafted before the hold; it is retained as historical draft material, not a current instruction to Leo. No additional Unit 4 content or art work was done after the hold. None of the new pilot worked examples, activities or forms are built into public course routes.

## Active implementation

- Existing reader and plain-JS Geometry renderer extended, not replaced.
- `worked-example`: statement/reason rows, one row per Next step, Back, Show all.
- `common-mistake`: fictional work followed by an explicit correction reveal.
- `practice`: separate solution and second-check reveals, in that order.
- `exit-ticket`: two prompts followed by the fixed last line `What's confusing?`.
- All 180 lessons carry a Jacobs citation on the cover and in catalog/deck metadata. The 141 regular lessons have common-mistake and exit-ticket slides.
- Existing lesson 1.10 is the template demonstration. Its worked proof is the already-existing segment-addition example, not new Unit 4 content.
- Mobile learner pages put the side panel after the page instead of covering the proof controls. Text remains scrollable at every width. Existing non-template reader and all 44 interactive placements are retained.
- Course remains text only, without narration.

## Content boundary and sources

Only explicitly selected learner fields are used in slides and readable HTML. Private builder certificates, coordinates, comments and answer-key sections are never copied wholesale into a public deck. The browser sweep injects builder sentinel fields to verify that the renderer ignores them. Completed pilot draft answers use Euclid's fill file with Socrates' learner wording; the draft is not active during the hold.

`python3 tools/geometry/export-v2.py` regenerates citation metadata from the checked-in `spec-src/data.py` and preserves the held learner draft from the checked-in source snapshots. `node tools/geometry/build.mjs` regenerates the active course. `--check` verifies deterministic outputs.

## Errata status

E05 was applied first. All 20 errata have implementation fixes and regression coverage, pending Euclid's review. Exact prose replacements are used where the erratum supplies prose. E06 and E11 provide builder directions, so their mathematical requirements are implemented as learner statements. E09 takes the inclusive-convention option, retaining rectangles and excluding oblique parallelograms. E18 to E20 are behavioral changes, not text substitutions.

| ID | Status | Correction |
|---|---|---|
| E01 | Applied | Distinct coplanar lines |
| E02 | Applied | Two distinct points |
| E03 | Applied | Division by a nonzero number |
| E04 | Applied | Radius-length chords, not circumference; preview labeled |
| E05 | Applied first | Triangle versus stage-1-and-later Koch symmetry |
| E06 | Applied | M defined, opposite-side intersections and betweenness before use |
| E07 | Applied | Ladder needs its length, one leg and a right angle |
| E08 | Applied | Distinct lines, vertical cases, plus 9.10 qualification |
| E09 | Applied | Inclusive isosceles trapezoid convention |
| E10 | Applied | Image/preimage scale factor |
| E11 | Applied | Explicit dilation postulates and collinear case |
| E12 | Applied | Minor and major circular-segment domains |
| E13 | Applied | Cylinder slice orientation and clipping |
| E14 | Applied | Right circular cone and cylinder hypothesis |
| E15 | Applied | Convex regular polyhedra |
| E16 | Applied | Shorter great-circle arcs, nonantipodal and antipodal cases |
| E17 | Applied | Nondegenerate convex spherical triangles |
| E18 | Applied | Scale-relative exact-diameter predicate; 179 degrees is not exact |
| E19 | Applied | True inside/outside regime, constrained On mode, separate tangents |
| E20 | Applied | Strict skip domain and compound-cycle labeling |

The exact source quotations, requested changes and Jacobs anchors are retained in `tools/geometry/errata.json` and `ERRATA.md`. Regenerated decks keep body and readable HTML duplicates synchronized, including reused review content.

## Decisions and conflicts

- Unit 4 now takes precedence over the earlier full-pilot request: preserved drafts, no activation. Both forms are pending, not just Form B.
- The spec's 10 slide slots and 12 to 14 screen target had been reconciled in the held draft using subpages. The revised two-day SSS spec supersedes that draft; do not use its old counts as acceptance for the new Unit 4.
- `data.py` omits review/assessment mappings and the legacy design lesson 12.12. Review/exam covers use the appropriate Jacobs chapter review ranges, MR/FR for exams; 12.12 is labeled review/assessment scope rather than inventing a book example. Every regular mapping provided by `data.py` is checked exactly.
- Historical Unit 4 4.1 coordinates corrected per Euclid to C=(1,2), D=(7,2), with squared side lengths 25, 5 and 20. No pilot art is activated by that correction.
- Specialized Unit 4 interactions and the learner-specific worked examples are held. The live template demonstration uses only existing 1.10 mathematics.

## Verification commands

```sh
node tools/geometry/build.mjs --check
node --test tests/geometry-course.test.mjs tests/geometry-v2.test.mjs
# In public/: python3 -m http.server 8768 --bind 127.0.0.1
node tests/geometry-v2-browser.mjs
```

Screenshots and the browser result JSON are on the shared box under `/workspace/geometry-v2/template-screenshots/`. The prior Unit 4 screenshots under `screenshots/` predate the hold and are not the active-template evidence.
