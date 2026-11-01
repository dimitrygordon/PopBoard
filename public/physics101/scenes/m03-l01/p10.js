// Instantaneous acceleration: slide the tangent along the Figure 7 curve (v = t^2); its slope is 2t m/s^2.
import { caption, graphMap, tangentTool, f2 } from "../kit.js";
const g = graphMap(420, 120, 1000, 720, 5, 20), f = (t) => t * t, df = (t) => 2 * t;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [1030, 440, 1480, 560], 26, "Drag the tangent along the curve.");
  tangentTool(ctx, "tangent", g, f, df, 3, [0.2, 4.4], "Tangent line: drag along the curve", (t, m, done) => {
    cap.textContent = `at t = ${f2(t)} s\nslope of the tangent = ${f2(m, 1)} m/s\u00b2`;
    if (done) say(`At ${f2(t)} seconds the tangent's slope, the instantaneous acceleration, is ${f2(m, 1)} meters per second squared.`, true);
  });
  art.touchable(["tangent"]);
  return { destroy() {} };
}
