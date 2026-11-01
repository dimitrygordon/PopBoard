// Ball on a driveway: v_i = +2.50 m/s up the slope, a = -0.500 m/s^2. It rolls up, stops at 5.00 s,
// and rolls back, while its v-t line draws on the inset graph (0 to 10 s, -3 to 3 m/s).
import { svg, path, tween, caption, tapCut, graphMap, GOLD, f2 } from "../kit.js";
const g = graphMap(170, 80, 560, 400, 10, 3, -3), U = [0.943, -0.334], PXM = 66;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); const tr = path(s, "", { stroke: GOLD, "stroke-width": 7 });
  const cap = caption(layer, [900, 420, 1400, 480], 26);
  const run = async () => {
    await tween(5000, (u) => {
      const t = u * 10, x = 2.5 * t - 0.25 * t * t, v = 2.5 - 0.5 * t;
      art.set("ball", { dx: U[0] * x * PXM, dy: U[1] * x * PXM });
      tr.setAttribute("d", `M ${g.fx(0)} ${g.fy(2.5)} L ${g.fx(t)} ${g.fy(v)}`); cap.textContent = `t = ${f2(t)} s   v = ${f2(v)} m/s`;
    }, reduce);
    say("The line drops 2.50 meters per second every 5.00 seconds: a slope of negative 0.500 meters per second squared, down the driveway, the whole time.", true);
  };
  tapCut(ctx, "ball", "Ball: tap to roll it up the driveway", run);
  art.touchable(["ball"]);
  return { destroy() {} };
}
