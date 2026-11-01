// Capillary rise: Change the tube's radius and compare how high water climbs.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Tube radius", min: 0.1, max: 2, step: 0.1, value: 0.5, unit: "mm", d: 1 }],
    cuts: [
    { id: "cap", label: "Rise height: tap to explain", tap: (st, c) => { return "Narrower tube, higher climb."; } }],
    show: (st) => `height \u2248 ${F(14.9 / st.r, 1)} mm\nh = 2\u03b3/(\u03c1gr) for water in clean glass`,
  });
  ctx.art.touchable(["cap"]);
  return { destroy() {} };
}
