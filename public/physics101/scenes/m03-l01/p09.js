// Average acceleration on the Figure 7 curve (v = t^2): the pickers set the interval, and the sandbox
// shows change in v over change in t, with the dashed rise and run.
import { svg, path, caption, graphMap, onCurve, GOLD, f2 } from "../kit.js";
const g = graphMap(420, 120, 1000, 720, 5, 20), f = (t) => t * t;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const s = svg(layer); const tri = path(s, "", { stroke: GOLD, "stroke-width": 5, "stroke-dasharray": "14 10" }), ch = path(s, "", { stroke: GOLD, "stroke-width": 3 });
  const cap = caption(layer, [1030, 440, 1500, 600], 24);
  const P = {};
  const calc = (_, done) => {
    const [a, b] = [P.pick1.t, P.pick2.t].sort((m, n) => m - n), run = b - a, dv = f(b) - f(a);
    tri.setAttribute("d", `M ${g.fx(a)} ${g.fy(f(a))} H ${g.fx(b)} V ${g.fy(f(b))}`); ch.setAttribute("d", `M ${g.fx(a)} ${g.fy(f(a))} L ${g.fx(b)} ${g.fy(f(b))}`);
    cap.textContent = `${f2(a)} s to ${f2(b)} s\n\u0394v = ${f2(f(b), 1)} m/s \u2212 ${f2(f(a), 1)} m/s = ${f2(dv, 1)} m/s\na\u0304 = \u0394v / \u0394t = ${run > 0.001 ? f2(dv / run, 1) + " m/s\u00b2" : "?"}`;
    if (done && run > 0.001) say(`Average acceleration from ${f2(a)} to ${f2(b)} seconds: ${f2(dv / run, 1)} meters per second squared. A later interval on this curve gives a bigger value.`, true);
  };
  P.pick1 = onCurve(ctx, "pick1", g, f, 2, [0, 4.4], "Point picker 1: drag along the curve", calc, 0.1);
  P.pick2 = onCurve(ctx, "pick2", g, f, 4, [0, 4.4], "Point picker 2: drag along the curve", calc, 0.1);
  P.pick1.set(0); art.touchable(["pick1", "pick2"]); calc(0, false);
  return { destroy() {} };
}
