// Tangent to the Figure 11 parabola (x = 2.5 t^2): the tangent's slope is the velocity, 5.0 t m/s, and it grows with time.
import { caption, graphMap, tangentTool, f2 } from "../kit.js";
const g = graphMap(420, 120, 1000, 720, 5, 70), f = (t) => 2.5 * t * t, df = (t) => 5 * t;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [1030, 640, 1500, 760], 24, "Drag the gold point along the parabola.");
  tangentTool(ctx, "tangentpt", g, f, df, 2, [0.2, 5], "Tangent point: drag along the parabola", (t, m, done) => {
    cap.textContent = `at t = ${f2(t)} s, x = ${f2(f(t), 1)} m\nslope of the tangent = v = ${f2(m, 1)} m/s`;
    if (done) say(`At ${f2(t)} seconds the velocity is ${f2(m, 1)} meters per second. The later the time, the steeper the tangent.`, true);
  }, 1.0, 0.1);
  art.touchable(["tangentpt"]);
  return { destroy() {} };
}
