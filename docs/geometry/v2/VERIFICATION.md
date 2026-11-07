# Verification: template v2 and errata

Verified locally on November 7, 2026 (ET), against a Python HTTP server serving `public/` on port 8768.

- Deterministic build: `node tools/geometry/build.mjs --check`, zero stale outputs.
- Regression suite: `node --test tests/geometry-course.test.mjs tests/geometry-v2.test.mjs`, 16 passed, zero failed or skipped. Includes every one of the 44 existing interactive placements mounting, drawing and responding to input.
- Browser sweep: `node tests/geometry-v2-browser.mjs`, 1,113 generated page mounts, 194 local links/decks/cover assets returning HTTP 200, and 552 screenshots.
- Every generated page was exercised through the real Geometry page renderer. Worked-example Next/Back/Show all, correction reveals and both practice reveals were checked. Builder sentinel fields never reached the student DOM. No renderer/page-mount errors were observed.
- E18 and E19 actual interactive modules were also exercised with near/exact diameter, radius-plus-six outside, constrained On, and separate tangent scenarios. E20 has exhaustive selectable-skip tests for n=5 to 12, including compound-cycle cases.
- Every lesson cover was opened in the full story reader at 1440x900, 844x390 and 390x844. All cover citations were present. Template states at those widths have no horizontal overflow.
- Reviewed the template screenshots and code diff. Found and fixed the phone sheet covering the proof rows; the panel now follows the new learner page on small screens. Readable text and reveal controls remain available without overlap.
- `git diff --check` passed. Geometry dash/art constraints passed. No production deployment or merge was performed.

## Screenshot paths on the shared box

Root: `/workspace/geometry-v2/template-screenshots/`

For each size `1440x900`, `844x390`, `390x844`:

- `<size>-worked-example.png`: existing lesson 1.10, two of four proof rows shown.
- `<size>-common-mistake.png`: fictional work, correction not yet revealed.
- `<size>-practice.png`: solution and second check both revealed.
- `<size>-exit-ticket.png`: two prompts ending with `What's confusing?`.
- `<size>-uNN-lNN-cover.png`: all 180 course covers, including the unchanged legacy Unit 4 content plus template-wide additions and errata.

Machine-readable results: `/workspace/geometry-v2/template-screenshots/verification.json`.

Unit 4 pilot-specific screen counts and replacement assessments are intentionally not acceptance targets in this PR: the revised spec is pending. The completed pre-hold pilot work is archived, not activated.

## Round 2: Euclid, Socrates and Leo

Verified November 7, 2026 (ET), local Python HTTP server on port 8772.

- Full Geometry suite: 22 passed, zero failed or skipped, including all 44 interactive mounts and drags.
- Browser sweep: 1,113 page mounts, 197 links/assets, no builder sentinel leaks or renderer errors.
- Focused template evidence: 15 settled screenshots, five states at 1440x900, 844x390 and 390x844. Checked side-by-side versus stacked figure layout, Literata math, prediction visibility, separate practice reveals, reduced motion and horizontal overflow.
- Personally inspected the 390 and 1440 worked-example screenshots after animations settled. Both proof rows, the segment figure and prediction prompt are readable, with no overlap.
- Screenshot root: `/workspace/geometry-v2/template-screenshots/r2/`. Files: `<size>-cover.png`, `<size>-worked-example.png`, `<size>-practice.png`, `<size>-common-mistake.png`, `<size>-exit-ticket.png`. Full cover sweep and `verification.json` are beside them.
- R1: reflection incidence lemma completed. R2: identity dilation and k=3 supporting-line answer corrected. R3: tiny-tolerance arc order, distinct secant intersections/rays and approximate rounding tested through the actual modules. R4: curated public source relationships and correct tangent/design/review anchors. R5: corrected historical scalene coordinates; shared final spec already carries the corrected coordinates, so it was not overwritten.
- Socrates: next-row prediction, explicit figure slots, paper-first practice instruction and numbered final exit question implemented. Leo: self-hosted fonts, math spans, wobble buttons, ruled/circled/fading proof rows, index-card reveals, red strikes and notched exits implemented. Literata is bundled with its OFL license.
- No merge, undraft or production deployment. This is implementation evidence, not reviewer approval.

## Final Unit 4 implementation

Verified locally November 7, 2026 (ET). Final source snapshot, not the held draft, is active.

- Full Geometry suite: 30 passed, zero failed or skipped, including all 44 original interactives mounting, drawing and responding to input.
- Whole-course browser sweep: 1,242 generated page mounts, 208 local links/decks/assets, no builder sentinel leaks or page errors.
- Changed Unit 4 pages: 230 pages at each requested width, 690 mounts total. Solutions, checks, corrections and optional proofs were opened while builder sentinel fields remained absent from student DOM. No text horizontal overflow.
- New task behavior checks: wrong/correct and reordered vertex matching; SAS move order; ASA draggable endpoints; both SSS days including both endpoint representatives; radius 4/5/6 crossing regimes; proof-order/CPCTC lock; all five final-spec SSA count fixtures through the actual interactive.
- Final quiz, review, both forms and teacher keys are checked against exact prompt ids and selected answers. Both printable forms have 12 standalone inline SVGs and no answer key or backend coordinate labels. SVG label bounds are checked for both mandatory SSA figures.
- Thirty-three Unit 4 screenshots: three representative lessons (4.1, 4.10 and 4.13), including both 4.10 days and activities, covers and both form-12 SSA items at 1440x900, 844x390 and 390x844. Root: `/workspace/geometry-v2/template-screenshots/u4/`; summary: `verification.json`. Whole-course cover sweep is in `u4/sweep/`.
- Personally inspected desktop and portrait worked examples, the SSS activity and the phone Form A SSA figure. Found a cropped lower dimension label, reserved additional SVG bottom space and retook the evidence. Long desktop SSS proof rows use the existing card's vertical scroll; no proof text is removed.
- `git diff --check`, deterministic citation/content exports and deterministic generated build passed. PR stays draft. No merge, undraft or deployment.

### Remaining review and art work

94 Unit 4 figure slots remain explicit clean placeholders for Leo. All mandatory standalone test diagrams and the required SSA figures are supplied. The regenerated current art commission names every lesson and bank item and includes the final exact constructions. Euclid and Socrates must review this implementation, and Leo must give his visual stamp; these checks do not substitute for their approvals.


## Review round 3, November 7, 2026 (ET)

- Full suite: 38 passed, 0 failed, 0 skipped, including all 44 actual interactive mount/draw/drag checks.
- Course browser sweep: 1242 page mounts, 208 links/assets and 552 screenshots; no builder DOM leaks or renderer errors. All missing figure metadata now corresponds to no student slot, not placeholder text.
- Unit 4 browser sweep: 690 page mounts at 1440x900, 844x390 and 390x844, 33 screenshots; no builder leaks, text overflow or page errors. Matching, SAS motion order, ASA endpoints, both SSS days, radius cases, CPCTC ordering and the five SSA count fixtures pass.
- Template screenshots: 15 settled captures; mid-proof prediction, layout, Literata math and reduced-motion checks pass. Leo's 1.10 worked-example, common-mistake and exit-ticket images were opened at desktop and phone sizes.
- Review browser: 21 primary screenshots plus six full-item companions. Every label in both 12-item forms is checked for label overlap, actual SVG stroke contact, viewBox bounds and a rendered size of at least 16px at all three sizes. The three 4.11 figures receive the same label audit at desktop and phone widths. Item 12 aligns to the viewport top; the full-item companions retain all dimensions in landscape.
- Exact 4.12 flat-input reproduction is driven through the real SVG keyboard handles after Show all. The copied apex and SSS success narration disappear, the undefined/flat-input notice appears, and the successful construction returns after moving C off the line. Node tests also cover coincident vertices, nearby valid triangles on both sides of the line, and scale-aware validity.
- All eight tagged student-paraphrase rows match the current spec without staff tags. The rebuilt spec snapshot matches the shared file byte-for-byte: SHA-256 fa9879ec160e4d856917c71b1394aab2803fc81e7be7c201a2f57772964316a9. The 4.14 art-slot prompt and updated spec correction both discuss unnecessary congruence when vertical angles suffice; the actual page was checked after revealing.
- Citation export, Unit 4 export, build and missing-art inventory checks are deterministic. Diff whitespace checks pass. Teacher keys and builder layers remain outside the student DOM; learner reveal solutions are intentionally present in public deck data.

Evidence directory: /workspace/geometry-v2/template-screenshots/r3/. Main filenames use WIDTHxHEIGHT and worked-example, common-mistake, exit-ticket, 4.13-worked, 4.10-day2-worked, form-a-item12, form-b-item12, 4.11-we1, 4.11-we2, 4.11-common-mistake and 4.12-flat-input. Landscape form companions end in -item12-full.png. The settled 4.14 correction is 390x844-4.14-common-mistake.png. Browser sweep evidence is in course-sweep/ and unit04-sweep/.

Missing-art inventory: /workspace/geometry-v2/PLACEHOLDER-SLIDES.md (also checked in under docs/geometry/v2/), 221 course slots, including 94 Unit 4 slots. The newly supplied external art was not bulk-published. Corrected coordinates for 4.4 Practice 3, 4.7 Worked example 2 and 4.14 Practice 4 were not found in the specified review, art snapshot or commission; existing art flags still describe their conflicts. No replacement coordinates or alt text were guessed. Those three slots remain absent, with explicit holds in the regenerated art commission. No new independent reviewer stamp is claimed.
