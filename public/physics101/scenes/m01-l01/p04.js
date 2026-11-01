// Measuring Change: measured points appear one at a time, then the student drags the end of the violet
// ruler to predict (extrapolate) the next value before it is revealed.
import { add, handle, fontPx, svg, path, center } from "../kit.js";
const PTS = [1, 2, 3, 4, 5].map((i) => "point-" + i);
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx, timers = [];
  for (const id of [...PTS, "predicted-point", "trend-line"]) art.show(id, false);
  // axis titles are live text (Leo's note); the graph's axes are drawn in the mid art
  fontPx(add(layer, "div", "live", [92, 120, 260, 150], "distance (m)"), 26);
  fontPx(add(layer, "div", "live", [520, 400, 700, 432], "time (s)"), 26);
  const c = PTS.map((id) => center(art.box(id))), last = c[4], P = center(art.box("predicted-point"));
  let guess = null, revealed = false;
  const s = svg(layer), line = path(s, "", { stroke: "#7b5ea7", "stroke-width": 5, "stroke-dasharray": "10 9" });
  const dot = add(layer, "div", "", null); Object.assign(dot.style, { width: "1.4%", aspectRatio: "1", borderRadius: "50%", border: "3px solid #7b5ea7", transform: "translate(-50%,-50%)", display: "none" });
  const showGuess = (y) => {
    guess = Math.max(60, Math.min(440, y));
    line.setAttribute("d", `M${last[0]} ${last[1]} L${P[0]} ${guess}`);
    Object.assign(dot.style, { left: (P[0] / 16) + "%", top: (guess / 9) + "%", display: "" });
  };
  let shown = 0;
  const next = () => { if (shown < 5) { art.show(PTS[shown++]); say(`Point ${shown} of 5 measured.`); if (shown < 5) timers.push(setTimeout(next, reduce ? 0 : 800)); else ready(); } };
  // the ruler arrives once the data are in, see-through so the points under it stay visible
  const ready = () => { art.show("trend-line"); const r = art.el("trend-line"); if (r) r.style.opacity = "0.7"; art.touchable(["trend-line"]); say("All five points are in. Drag the end of the violet ruler to predict the next value."); };
  timers.push(setTimeout(next, reduce ? 0 : 1600));
  // the handle sits on the ruler's right end; moving it up or down sets the prediction at the next time
  const tip = [588, 150, 640, 205];
  handle(ctx, tip, "Ruler end: move up or down to predict the next value", {
    start: () => art.touched("trend-line"),
    move: (dx, dy, p) => { if (shown < 5) return; showGuess(p ? p[1] : 188 + dy); },
    end: () => { if (guess != null) say("Prediction set. Press Reveal to check it."); },
  });
  ui.button("Reveal the next value", () => {
    if (shown < 5) { while (shown < 5) next(); return; }
    if (guess == null) return say("First drag the ruler's end to make a prediction.");
    art.show("predicted-point"); revealed = true;
    const off = Math.abs(guess - P[1]) / 24.6; // 24.6 page px per grid unit on this graph
    say(off < 0.6 ? "Right on the trend! Extending the line predicted the next value." : `The new value is ${off.toFixed(1)} grid squares from your prediction. Follow the trend of the points.`, off < 0.6);
  });
  ui.button("Start over", () => { for (const id of [...PTS, "predicted-point", "trend-line"]) art.show(id, false); shown = 0; guess = null; revealed = false; line.setAttribute("d", ""); dot.style.display = "none"; next(); });
  return { destroy() { timers.forEach(clearTimeout); } };
}
