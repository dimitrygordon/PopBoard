// Spring scale: pick a constant force (0.25 to 2.0 N) on the sandbox cart (mass 1.0 kg) and tap the scale.
// The v-t line plots live on a 0-3.0 s, 0-4.0 m/s grid, and its slope is the acceleration F / m.
import { svg, path, tween, caption, tapCut, graphMap, RED, NAVY, f2 } from "../kit.js";
const M = 1.0, G = graphMap(1160, 110, 1540, 420, 3, 4);
export default function build(ctx) {
  const { ui, say, layer, reduce } = ctx;
  const s = svg(layer);
  let grid = ""; for (let t = 0; t <= 3; t += 0.5) grid += `M ${G.fx(t)} ${G.fy(0)} V ${G.fy(4)} `; for (let v = 0; v <= 4; v++) grid += `M ${G.fx(0)} ${G.fy(v)} H ${G.fx(3)} `;
  path(s, grid, { stroke: "#9BB0C9", "stroke-width": 1.5 }); path(s, `M ${G.fx(0)} ${G.fy(4)} V ${G.fy(0)} H ${G.fx(3)}`, { stroke: NAVY, "stroke-width": 3 });
  caption(layer, [1060, 90, 1160, 130], 18, "4.0 m/s"); caption(layer, [1480, 425, 1590, 460], 18, "3.0 s");
  const ln = path(s, "", { stroke: RED, "stroke-width": 5 }); const cap = caption(layer, [1160, 820, 1580, 880], 22);
  let F = 1.0;
  const run = async () => { const a = F / M, T = Math.min(3, 4 / a); await tween(1500, (u) => ln.setAttribute("d", `M ${G.fx(0)} ${G.fy(0)} L ${G.fx(T * u)} ${G.fy(a * T * u)}`), reduce); cap.textContent = `F = ${f2(F, 2)} N, slope = a = ${f2(a, 2)} m/s\u00b2`; say(`A constant ${f2(F, 2)} newton pull gives a straight line with slope ${f2(a, 2)} meters per second squared: constant acceleration.`, true); };
  ui.slider({ label: "Force", min: 0.25, max: 2, step: 0.25, value: 1, fmt: (v) => f2(v, 2) + " N" }, (v) => (F = v));
  tapCut(ctx, "scale", "Spring scale: tap to pull and plot", run);
  ctx.art.touchable(["scale"]);
  return { destroy() {} };
}
