// Sprinter tangents on Leo's curve v = 10.3(1 - e^(-t/1.14)). The readout is the slope of this curve;
// near 1.00 s and 5.00 s it also shows the book's estimates from its hand-drawn tangents.
import { caption, graphMap, tangentTool, f2 } from "../kit.js";
const g = graphMap(380, 140, 1000, 700, 10, 12), f = (t) => 10.3 * (1 - Math.exp(-t / 1.14)), df = (t) => (10.3 / 1.14) * Math.exp(-t / 1.14);
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [1040, 560, 1560, 690], 24, "Drag the gold point along the curve.");
  tangentTool(ctx, "tangentpt", g, f, df, 3, [0.2, 9.8], "Tangent point: drag along the curve", (t, m, done) => {
    const book = Math.abs(t - 1) < 0.06 ? "\nbook's tangent estimate: 2.9 m/s\u00b2" : Math.abs(t - 5) < 0.06 ? "\nbook's tangent estimate: 0.030 m/s\u00b2" : "";
    cap.textContent = `at t = ${f2(t)} s, v = ${f2(f(t), 1)} m/s\nslope of the tangent = ${f2(m, m < 1 ? 2 : 1)} m/s\u00b2${book}`;
    if (done) say(`The tangent is ${m > 1 ? "steep" : "nearly flat"} at ${f2(t)} seconds. Both slopes are positive: the acceleration is in the positive direction, and it gets smaller as the sprinter nears top speed.`, true);
  }, 1.4, 0.05);
  art.touchable(["tangentpt"]);
  return { destroy() {} };
}
