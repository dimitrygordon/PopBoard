// Half-life: Step half-lives.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "k", label: "Half-lives", min: 0, max: 5, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Grid: tap to explain", tap: (st, c) => { return "Half remain each half-life."; } }],
    show: (st) => `${F(1000 / 2 ** st.k, 0)} of 1000 remain`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
