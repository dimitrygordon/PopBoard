// a-F graph: each tap of the chip runs the cart (mass 0.80 kg, so the book's slope of 1.25 per kg) at 0.4,
// 0.8 and 1.2 N and plots a on a 0-1.6 N, 0-2.0 m/s^2 grid. After three runs a line through the origin is fit.
import { svg, path, caption, tapCut, graphMap, RED, NAVY, VIOLET, f2 } from "../kit.js";
const FS = [0.4, 0.8, 1.2], NOISE = [0.02, -0.03, 0.01], M = 0.8, G = graphMap(1160, 680, 1540, 880, 1.6, 2);
export default function build(ctx) {
  const { say, layer } = ctx;
  const s = svg(layer);
  path(s, `M ${G.fx(0)} ${G.fy(2)} V ${G.fy(0)} H ${G.fx(1.6)}`, { stroke: NAVY, "stroke-width": 3 });
  const pts = path(s, "", { stroke: RED, "stroke-width": 16 }), fit = path(s, "", { stroke: VIOLET, "stroke-width": 4 });
  const cap = caption(layer, [1160, 650, 1580, 680], 18, "0 of 3 runs");
  let n = 0, d = "";
  const tap = () => {
    if (n === 3) { n = 0; d = ""; pts.setAttribute("d", ""); fit.setAttribute("d", ""); cap.textContent = "0 of 3 runs"; return; }
    const F = FS[n], a = F / M + NOISE[n]; d += `M ${G.fx(F)} ${G.fy(a)} h 0.1 `; pts.setAttribute("d", d); n++;
    cap.textContent = `${n} of 3 runs: F = ${f2(F, 1)} N, a = ${f2(a, 2)} m/s\u00b2`;
    if (n === 3) {
      const k = FS.reduce((u, f, i) => u + f * (f / M + NOISE[i]), 0) / FS.reduce((u, f) => u + f * f, 0);
      fit.setAttribute("d", `M ${G.fx(0)} ${G.fy(0)} L ${G.fx(1.6)} ${G.fy(1.6 * k)}`); cap.textContent = `slope k = ${f2(k, 2)} per kg, a = kF`;
      say(`The points fall on a straight line through the origin, slope ${f2(k, 2)}. Double the force, double the acceleration.`, true);
    } else say(`Run ${n}: ${f2(F, 1)} newtons gives ${f2(a, 2)} meters per second squared.`, true);
  };
  tapCut(ctx, "slopes", "Plot a run", tap);
  ctx.art.touchable(["slopes"]);
  return { destroy() {} };
}
