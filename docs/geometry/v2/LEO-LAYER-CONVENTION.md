# Unit 1 SVG layer convention

Black strokes on white, live text labels, no color coding. Builder coordinates are layout data only and must not appear as learner labels. A supplied file in `tools/geometry/u01-art-wiring.json` as `{slot, file, alt}`, stored at `public/geometry/figures/u01/u01-<slot>.svg`, replaces the generator figure or the clean waiting slot for that id.

The storybook draws each layer when the student taps Next step (worked examples) or Reveal (practice and common mistake). Mark layers as groups, in document order:

1. Given marks, visible when the page opens: wrap in `<g class="given">`. You may also use `data-step="0"`. Ungrouped strokes are treated as given.
2. Worked-example steps: wrap the new marks for that step in `<g data-step="N">`, where N is the 1-based row in the student step table. Several shapes may share the same N. They stay hidden until the student reveals that step, then they draw in, compass and straightedge strokes first, then point marks, then labels.
3. Answer-only marks: wrap in `<g class="conclusion">`. Hidden until Show all on a worked example, or Reveal on practice and common-mistake pages, then they draw in. If a conclusion group also has `data-step`, it still waits for the answer reveal.

Stroke rules, so the draw-in can run:

- Compass arcs and straightedge lines must be `<path>`, `<line>`, `<circle>`, `<ellipse>`, `<rect>` or `<polyline>` with `fill="none"` and a black stroke. Do not convert them to filled outlines.
- Point markers may be small filled circles. Add `data-plot` if you want them to pop in rather than try to stroke-draw. Arrow paths that should grow from the tail take `data-grow`.
- Labels stay as live `<text>`. They fade in after their group's strokes. Do not outline labels as paths.

Until a file is wired, the student page shows a clean empty slot (a dashed frame and a faint unmarked construction). No slot id and no commission text appear on the page.
