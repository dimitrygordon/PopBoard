// Time cursor on Figure 21 (v = 20 - 9.8t, up is +). Drag it to read t and v; the ball beside the graph rises
// and falls. Near 2.04 s the velocity crosses zero.
import { svg, path, handle, follow, caption, graphMap, clamp, NAVY, f2 } from "../kit.js";
const g = graphMap(380, 120, 900, 720, 4, 20, -20), T0 = 1, BX = 1520, Y = (h) => 780 - h * 28;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const s = svg(layer); const ball = path(s, "", { stroke: "#D98B6A", "stroke-width": 40 }), pt = path(s, "", { stroke: NAVY, "stroke-width": 18 });
  const cap = caption(layer, [960, 560, 1440, 680], 24);
  let t = T0, x0;
  const draw = (done) => {
    const v = 20 - 9.8 * t, h = 20 * t - 4.9 * t * t;
    ball.setAttribute("d", `M ${BX} ${Y(h)} h 0.1`); pt.setAttribute("d", `M ${g.fx(t)} ${g.fy(v)} h 0.1`);
    cap.textContent = `t = ${f2(t)} s   v = ${v >= 0 ? "+" : ""}${f2(v, 1)} m/s\n${Math.abs(v) < 0.5 ? "v is crossing zero: the top" : v > 0 ? "rising, slowing down" : "falling, speeding up"}`;
    if (done) say(Math.abs(v) < 0.5 ? "Right at the top the velocity crosses zero, about 2.04 seconds. The slope, the acceleration, is still negative 9.8." : `At ${f2(t)} seconds the ball is ${v > 0 ? "rising" : "falling"} at ${f2(Math.abs(v), 1)} meters per second.`, true);
  };
  const home = art.box("cursor");
  const h = handle(ctx, home, "Time cursor: drag along the time axis", {
    start: () => { art.touched("cursor"); x0 = g.fx(t); },
    move: (dx) => { t = clamp(Math.round(g.tx(x0 + dx) * 100) / 100, 0, 4); art.set("cursor", { dx: g.fx(t) - g.fx(T0) }); draw(false); },
    end: () => { follow(h, home, g.fx(t) - g.fx(T0), 0); draw(true); },
  });
  art.touchable(["cursor"]); draw(false);
  return { destroy() {} };
}
