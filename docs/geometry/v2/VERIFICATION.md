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
