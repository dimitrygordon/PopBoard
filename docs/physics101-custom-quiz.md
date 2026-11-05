# Physics 101 Custom Quiz

Entry: the Custom Quiz button next to Practice Questions on the Physics 101 library
(`study-physics101.html`). It opens over the library as a side panel on desktop and a bottom sheet on mobile.

## Files
- `public/physics101/cq-core.js`: pure logic. Scope, weights (always 100%), allocation with clamping,
  seeded draw, grading, struggle signal, presets, session record, profile merge and teacher summary.
- `public/physics101/cq-app.js`: builder, player and results. Cards come from `sq-core.js` `renderItem(slug, id)`, the same
  Study Questions card, art pack, draggables and worked-solution expander as the lesson list. There is no new content and no new art pack.
- `public/physics101/cq-account.js`: account save.
- `public/physics101/cq.css`: layout. Leo's art can replace it later.

## Grading
Auto-check runs only when an item has `key: {type: "number", value, tol} | {type: "choice", value}`.
No Study Questions item has a key today, so every question is self-graded and tagged "Self-graded".
Socrates/Tesla: add `key` to items in `sq/<slug>.json` and auto-check turns on with no UI change.
Answers, worked steps and Leo's rich cards stay hidden while quizzing and come back in the review pass.

## Struggle signal (placeholder)
`cq-core.js` `struggle()`: per lesson, `(missed + 0.5*flagged + 0.5*autoLow) / seen`, capped at 1.
A lesson is a weak area when its score is >= 0.5 over 2 or more questions. Socrates/Tesla own the real definition.
To change it, edit only `struggle()` and `mergeProfile()`.

## Storage
- Presets (ticket stubs): `localStorage["p101.customQuiz.presets"]`, at most 24. The last-used preset is starred.
- Local profile: `localStorage["p101.customQuiz.profile"]`. It works logged out.
- Account: when the library has `?board=&student=` (forwarded from PopBoard) and the signed-in Firebase user owns that
  student record, each session merges into `boards/{board}/students/{student}.studyQuiz`. The existing rules already
  let the owning student update their own record (except uid, username, secured and medals). No rules change.

`studyQuiz` shape (bounded):
```
{ sessions: [{at, units, n, right, pct}] (last 20),
  flagged: [questionId] (last 40, "return later"),
  lessons: {slug: {seen, missed, flagged, autoLow, score}},
  modules: [moduleNumber],     // modules worked
  viewed, interacted,          // questions viewed / interacted with
  updatedAt }
```

## Teacher student file (v1)
The student edit popup in the teacher's student list (`app.js` `openStudentEditPopup`) shows one line from
`teacherSummary(studyQuiz)`: sessions, modules worked, questions viewed and interacted, flagged count and struggling lessons.
Teachers already read student records under the existing rules. A fuller view (Leo's heat-tinted notebook) can read the same field.

## Leo's studio art
- `public/physics101/custom-quiz/custom-quiz-ui.json` holds the 27 assets, keyed by id as `{light, dark}`. `custom-quiz-ui.css` holds the tokens.
  There are no loose files. `cq-app.js` `art(id, texts)` picks the light or dark version and fills its `<text>` slots with live labels.
  It makes ids unique per instance and hides the art from screen readers; the buttons carry real labels.
- Wired as art: tickbox (checkmark `.cq-tick` hidden when unchecked), slider (`.cq-knob` moves along x 14..306 over a native range),
  toggle-useall (viewBox crop by translate), btn-start (live N), balance-btn, stub (truncated name), star-lastused,
  eraser-swipe, empty-pick, clamp-note (live N), icon-skip, icon-flag, badge-selfgrade, reveal-scribble (review wipe),
  mark-check, mark-x, btn-review, btn-retry, btn-save, marked-paper (results background), badge-weak, stub-flagged.
- Rebuilt from tokens (dynamic): progress bubbles, score circle (r=62, circumference 389.6), heat notebook rows
  (student "For you" and the teacher popup).
- Reference only: cq-ticket (builder composition), cq-teacher-page and cq-heat-notebook. Per Leo's note, these are drawn as HTML rows rather than scaled SVG.
- Polish for Leo: the slider's ochre fill is static in the art, so it does not follow the knob. The marked-paper slots do not line up with the live mark rows.
