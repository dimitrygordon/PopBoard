// Slope is acceleration: both pickers ride the Figure 12 line (v = 5t). Rise over run is always 5.00 m/s^2.
import { svg, path, caption, graphMap, onCurve, GOLD, f2 } from "../kit.js";
const g = graphMap(420, 120, 1000, 720, 5, 25), f = (t) => 5 * t;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const s = svg(layer); const tri = path(s, "", { stroke: GOLD, "stroke-width": 5, "stroke-dasharray": "14 10" });
  const cap = caption(layer, [1030, 520, 1500, 680], 26);
  const P = {};
  const calc = (_, done) => {
    const [a, b] = [P.pick1.t, P.pick2.t].sort((m, n) => m - n), run = b - a, rise = f(b) - f(a);
    tri.setAttribute("d", `M ${g.fx(a)} ${g.fy(f(a))} H ${g.fx(b)} V ${g.fy(f(b))}`);
    cap.textContent = `rise = ${f2(f(b), 1)} m/s \u2212 ${f2(f(a), 1)} m/s = ${f2(rise, 1)} m/s\nrun = ${f2(b)} s \u2212 ${f2(a)} s = ${f2(run)} s\nslope = ${run > 0.001 ? f2(rise / run) + " m/s\u00b2" : "?"}`;
    if (done && run > 0.001) say("Anywhere on a straight line, rise over run is the same: 5.00 meters per second squared.", true);
  };
  P.pick1 = onCurve(ctx, "pick1", g, f, 1, [0, 5], "Point picker 1: drag along the line", calc, 0.25);
  P.pick2 = onCurve(ctx, "pick2", g, f, 4, [0, 5], "Point picker 2: drag along the line", calc, 0.25);
  art.touchable(["pick1", "pick2"]); calc(0, false);
  return { destroy() {} };
}
