// Ball in a tube: tossed at +20 m/s, h = 20t - 4.9t^2. The ball moves straight up and down in the tube while
// a gold trace draws the upside-down parabola on Figure 22 (top just over 20.4 m at about 2.04 s).
import { svg, path, tween, caption, tapCut, graphMap, GOLD, f2 } from "../kit.js";
const g = graphMap(430, 120, 950, 720, 4, 25), H = (t) => 20 * t - 4.9 * t * t, TE = 40 / 9.8;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); const tr = path(s, "", { stroke: GOLD, "stroke-width": 7 });
  const cap = caption(layer, [1030, 560, 1430, 640], 24);
  const run = async () => {
    await tween(4000, (u) => {
      const t = u * TE, n = Math.max(2, Math.round(u * 80)); let d = "";
      for (let i = 0; i <= n; i++) { const ti = (t * i) / n; d += `${i ? "L" : "M"} ${g.fx(ti)} ${g.fy(H(ti))} `; }
      tr.setAttribute("d", d); art.set("ball", { dy: g.fy(H(t)) - g.fy(15) }); cap.textContent = `t = ${f2(t)} s   height ${f2(H(t), 1)} m`;
    }, reduce);
    say("The ball only went straight up and down, but its position-time graph is an upside-down parabola.", true);
  };
  tapCut(ctx, "ball", "Ball: tap to toss it", run);
  art.touchable(["ball"]);
  return { destroy() {} };
}
