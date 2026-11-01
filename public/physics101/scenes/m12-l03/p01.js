// Pascal: Push the small piston (0.010 m\u00b2) and watch the large one (1.0 m\u00b2) lift.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Push on small piston", min: 0, max: 200, step: 5, value: 100, unit: "N", d: 0 }],
    cuts: [
    { id: "push", label: "Lift: tap to explain", tap: (st, c) => { return "The pressure change spreads undiminished through the fluid."; } }],
    show: (st) => `P = ${F(st.f / 0.01, 0)} Pa everywhere\nlift force = ${F(st.f * 100, 0)} N` + (st.f * 100 >= 14000 ? "\nthe 14,000 N car rises" : ""),
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}
