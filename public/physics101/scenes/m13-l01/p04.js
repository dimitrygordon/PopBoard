// F vs. x: Stretch a spring (k = 50 N/m) and a rubber band and compare the graphs.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Stretch", min: 0, max: 0.4, step: 0.02, value: 0.1, unit: "m", d: 2 }],
    cuts: [
    { id: "plot", label: "Shape: tap to explain", tap: (st, c) => { return "The spring's graph is a straight line; the rubber band's curves, so it doesn't obey Hooke's law."; } }],
    show: (st) => `spring: F = kx = ${F(50 * st.x, 1)} N (straight line)\nrubber band: not proportional`,
  });
  ctx.art.touchable(["plot"]);
  return { destroy() {} };
}
