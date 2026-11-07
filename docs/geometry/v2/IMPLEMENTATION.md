# Geometry v2: round 2 and final Unit 4

## Review and release boundary

Round 2 was completed and pushed as three review-specific commits, ending at `c465bb005f5e108953669d5616454f2132aa99da`. Euclid R1 to R5, Socrates 1 to 4 and Leo's notebook styles are implemented. PR 170 stays draft and unmerged. Implementation evidence is not a math, pedagogy or design stamp.

Unit 4 was subsequently released from its content hold by the coordinator. The final shared SPEC-unit04.md was snapshotted into this directory without modifying Socrates' shared source. The final spec supersedes the original parked draft and both old assessment forms.

## Active implementation

- Plain-JS shared reader and Geometry page renderer are extended, not replaced. No narration.
- Worked examples reveal one statement/reason row per tap, with a prediction prompt in the next row, Back and Show all.
- Every worked-example, practice and common-mistake screen has an explicit figure slot. Figures sit beside text on desktop and landscape and above it on 390 portrait.
- Practice has separate solution and second-check reveals plus the paper-first instruction. The fixed final exit question is a numbered item.
- Leo's self-hosted title/body/math fonts, wobble buttons, ruled/circled proof rows, reduced-motion-safe reveals, index cards, red strikes, notched exits and dark tokens are in use.
- All 180 lesson covers carry Jacobs metadata. Short public source relationships distinguish related review scope, the inclusive trapezoid adaptation and the tangent-angle corollary.
- All 20 original errata remain corrected. Round 2 completed the reflection incidence argument, identity-dilation exception, tiny-tolerance intercepted-arc selection, repeated secant-intersection guards, approximate calculations and source corrections.

## Final Unit 4

- Thirteen regular lessons have 12 to 14 screens, including subpages. All regular lessons have the final learner worked examples, individual practice solutions/checks, common mistake and exit ticket.
- 4.10 has 14 screens across two class days: Day 1 covers the interior case; Day 2 covers exterior and endpoint cases, including the A/B and D/E relabeling justification. It is completed before later lessons use SSS.
- 4.14 includes the moved convex-kite proof and fourth practice item, then launches the 4.15 self-paced review. The class-day budget remains 16 days.
- 4.13 puts the angle-bisector proof in class and keeps the longer perpendicular-bisector proof collapsed as an optional extension. The final approved half-turn incidence proof supersedes the round-2 reflection exposition on this active route; it proves the midpoint/betweenness and ray statements explicitly.
- 4.9 uses ten new independently keyed quiz items and eight reveal-on-demand reteach links to worked examples. 4.15 retains its 16-item review bank. Both assessment forms are replaced with 12 new items each, not reused review items.
- Standalone learner forms at `geometry/forms/unit04-a.html` and `unit04-b.html` contain all 24 given-only SVGs and no answer keys. The two SSA item-12 figures and review item 16 carry their own full inline ray/circle/ticks/dimensions, without coordinate or radical labels.
- Teacher keys are separate in UNIT04-KEYS.md. No private coordinate certificate, staff instruction or builder blob is exported into student DOM. Explicit student solutions are revealed on request.
- 4.1 uses C=(1,2), D=(7,2), with squared corresponding side lengths 25, 5 and 20.
- Guided tasks add drag/keyboard correspondence matching, exact rigid-motion frames, draggable ASA rays, drag-to-order proofs, CPCTC locking, isosceles apex/turn exploration, exact reflected frames, constrained/all-case SSS exploration and a radius/crossing guard. All 44 existing interactive placements remain.
- SSA counts use distinct strictly forward nondegenerate triangles. The slider rejects a hit at A, backward intersections, flat triangles and duplicate tangent roots. One valid hit does not imply tangency.

## Source and art boundary

The exporter uses an explicit learner-field allowlist. Regular worked solutions use Socrates' learner paraphrases of Euclid's mathematics. Quiz/review/form answers and independent checks are selected individually from the final builder bank and matched to the final learner prompt ids. Staff labels and backend certificates are removed, never copied wholesale.

Of 143 Unit 4 figure slots, 49 have supplied SVGs and 94 intentionally show `Figure coming` plus the lesson id pending Leo's art. All mandatory standalone assessment and SSA figures are supplied. The current exact-construction art commission is LEO-DIAGRAMS-unit04.md, also regenerated at `/workspace/geometry-v2/LEO-DIAGRAMS-unit04.md`. That handoff, not the old parked draft, is current. Leo's final visual pass and Euclid/Socrates implementation stamps are still required before merge.

`tools/geometry/drafts/` preserves pre-hold history only. It is not imported by the build and the old exporter no longer rewrites it.

## Rebuild and verify

```sh
python3 tools/geometry/export-v2.py
python3 tools/geometry/export-unit04.py
node tools/geometry/build.mjs
python3 tools/geometry/export-v2.py --check
python3 tools/geometry/export-unit04.py --check
node tools/geometry/build.mjs --check
node --test tests/geometry-course.test.mjs tests/geometry-v2.test.mjs tests/geometry-review.test.mjs tests/geometry-unit04.test.mjs
# Serve public/ with python3 -m http.server 8772 --bind 127.0.0.1
GEOMETRY_BASE=http://127.0.0.1:8772 node tests/geometry-v2-browser.mjs
node tests/geometry-template-shots.mjs
node tests/geometry-unit04-browser.mjs
```


## Review round 3: template and learner rebuild

Leo's five template fixes are isolated in f2542359. Missing art now creates no student DOM slot or column. The staff-only PLACEHOLDER-SLIDES.md inventory records 221 pending figures, including 94 in Unit 4. Keep the figure schema for future art.

The Unit 4 exporter now reads proof tables, practice and misconception corrections directly from the checked-in signed-off learner section, rather than relying on stale Python proof snapshots. Eight R2 paraphrase rows are compared verbatim in tests. The 4.14 common-mistake prompt is the narrow allowlisted snapshot from u4-art/slots.json in spec-src/art-prompts-u04.json; its correction comes from the current spec. No other art-slot fields cross that boundary.

All worked-proof viewports use the same sentence-aware because prefix. The SVG helper places live 32-unit labels around exact construction geometry; assessment thumbnails stack at full width. Every label on both forms is audited against other label boxes, actual SVG strokes, viewBox boundaries and the 16px minimum at all three widths. Item 12 can align to the viewport top without preceding empty writing space. Printed writing areas remain intact.


### Euclid re-review R2

4.11 now chooses the original and doubled SSA configurations independently, with consistent numeric labels and alt text. The fitted doubled diagram visibly identifies scale factor 2. The misconception uses its own tangent circle and right-angle contact mark.

4.12 validates source and copied triangle nondegeneracy relative to side scale, and requires two distinct circle intersections. The shared construction stepper accepts an optional notice callback, which suppresses invalid construction steps and their success narration and refreshes on drag; all other constructions keep their original behavior. Three new focused math tests and the actual keyboard-driven browser reproduction cover the fix.


## Review round 4

Socrates' final reason ruling supersedes the round-3 prefix rule: proof reasons render exactly as authored, with original capitalization and no injected word. The capitalization helper was removed. Phone reasons retain their separate color and indentation.

Figure roots lose fixed width/height attributes at mount; a specific full-width, auto-height rule overrides legacy content SVG sizing. The existing 300px desktop minimum remains. Uniformly enlarged SSA layouts leave room for side labels beside OP/LM and point labels beside Q1/N1 without colliding with the circle, angle mark or other strokes. Side-label width hints conservatively reflect measured browser glyph widths, avoiding the old oversized text box that displaced them far from the segment. Exact construction coordinates and givens are unchanged.

The art commission is synced byte-for-byte with the shared LEO-DIAGRAMS-unit04.md and its three approved Euclid coordinate corrections. The exporter reproduces those corrections rather than restoring stale holds. None of those three SVGs was drawn or wired; Leo owns the full redraw. A regression test keeps the slots unpopulated.
