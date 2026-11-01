// Example Problem 1: tau = 35 N m, r = 0.25 m, theta = 60.0 deg: L = 0.22 m, F = 1.6e2 N.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Pull angle", min: 15, max: 90, step: 5, value: 60, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "ex1", label: "Ex1: tap for the next step", tap: (st, c) => { return "F = \u03c4 / (r sin\u03b8): a smaller angle needs a bigger pull."; } }],
    show: (st) => `L = 0.25 sin ${st.a}\u00b0 = ${F(0.25 * Math.sin(st.a * Math.PI / 180), 2)} m\nF = 35 / L = ${F(35 / (0.25 * Math.sin(st.a * Math.PI / 180)), 0)} N`,
  });
  ctx.art.touchable(["ex1"]);
  return { destroy() {} };
}
