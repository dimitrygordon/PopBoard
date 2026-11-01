// Measuring Change: measured points appear one at a time, then the student predicts the next value and
// reveals it. The animated violet trend-line overlay is off while Leo redraws this graph.
import { add, fontPx } from "../kit.js";
const PTS = [1, 2, 3, 4, 5].map((i) => "point-" + i);
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx, timers = [];
  for (const id of [...PTS, "predicted-point", "trend-line"]) art.show(id, false);
  // axis titles are live text (Leo's note); the graph's axes are drawn in the mid art
  fontPx(add(layer, "div", "live", [92, 120, 260, 150], "distance (m)"), 26);
  fontPx(add(layer, "div", "live", [520, 400, 700, 432], "time (s)"), 26);
  let shown = 0;
  const next = () => {
    if (shown >= 5) return;
    art.show(PTS[shown++]); say(`Point ${shown} of 5 measured.`);
    if (shown < 5) timers.push(setTimeout(next, reduce ? 0 : 800));
    else { art.touchable(PTS); say("All five points are in. Follow their trend: where will the next one land? Then press Reveal."); }
  };
  timers.push(setTimeout(next, reduce ? 0 : 1600));
  ui.button("Reveal the next value", () => {
    if (shown < 5) { while (shown < 5) next(); return; }
    art.show("predicted-point");
    say("Here's the next value. It continues the trend of the points, the same steady rise.", true);
  });
  ui.button("Start over", () => { for (const id of [...PTS, "predicted-point"]) art.show(id, false); shown = 0; next(); });
  return { destroy() { timers.forEach(clearTimeout); } };
}
